import type {
  AppModeKey,
  GameDirection,
} from "../../../src/contracts";
import {
  createJsonApiClient,
  type FetchLike,
} from "../../../src/services/api-client";
import {
  loadAccountSession,
  parseAccountSessionEnvelope,
  type AccountSessionV1,
} from "../auth/account-session";
import type { MobileAuthService } from "../auth/auth-service";
import {
  APP_DATABASE_SCHEMA_VERSION,
  type AppDatabase,
  AppDatabaseError,
  type AppOwnerKey,
  type SaveReadResult,
  type StoredDiagnostic,
  type StoredGameRecord,
  type StoredGameSave,
} from "../data/app-database";
import {
  ACCOUNT_SESSION_SECURE_KEY,
  OwnerCleanupWorkGate,
  clearConfirmedOwner,
  restoreOwnerCleanupAtStartup,
  type OwnerCleanupStartupResult,
} from "../data/owner-cleanup";
import type { SecureStorage } from "../platform/secure-storage";
import {
  GUEST_STANDARD_MODE_KEY,
  openGuestStandardSession,
  type GuestGameSession,
  type GuestMoveResult,
  type GuestSessionDatabase,
  type GuestSessionOptions,
  type LocalGameSession,
  openLocalSession,
  type OpenGuestStandardSessionResult,
  type OpenLocalSessionResult,
} from "../game/guest-session";
import {
  RankedSessionOrchestrator,
  type RankedSessionGateway,
  type RankedSessionOrchestrationDatabase,
} from "../game/ranked-session-orchestrator";
import type { SessionClockSources } from "../game/session-clock";
import {
  flushRecordSubmitOutbox,
  prepareRecordSubmitRetry,
  type RecordOutboxSyncResult,
} from "./record-outbox-sync";

export type GuestAppRuntimeDatabase = GuestSessionDatabase &
  Pick<
    AppDatabase,
    | "open"
    | "beginOwnerClear"
    | "listPendingOwnerClears"
    | "completeOwnerClear"
    | "listSaves"
    | "getRecord"
    | "listRecords"
    | "deleteGuestRecord"
    | "addDiagnostic"
    | "updateOutboxAttempt"
    | "applyRecordSubmitOutcome"
  >;

export type AuthenticatedModeRuntimeDatabase = GuestAppRuntimeDatabase &
  RankedSessionOrchestrationDatabase;

export interface GuestAppRuntimeOptions extends Omit<
  GuestSessionOptions,
  "database"
> {
  database: AuthenticatedModeRuntimeDatabase;
  secureStorage: Pick<SecureStorage, "get" | "set" | "delete">;
  workGate?: OwnerCleanupWorkGate;
  recordSync?: {
    enabled: () => boolean;
    getAuthService: () => Promise<Pick<MobileAuthService, "submitRecord">>;
  };
  forceAccountClearAtStartup?: boolean;
}

type AccountOwnerKey = `user:${string}`;

export interface EnterAuthenticatedModeOptions {
  online: boolean;
  gateway?: RankedSessionGateway;
  refreshSession?: () => Promise<AccountSessionV1>;
  requestTimeoutMs?: number;
}

export type EnterAuthenticatedModeResult =
  | ({ gameKind: "normal" | "ranked" } & Extract<
      OpenLocalSessionResult,
      { status: "ready" }
    >)
  | Exclude<OpenLocalSessionResult, { status: "ready" }>;

export interface HttpRankedSessionGatewayOptions {
  apiBase: string;
  fetchLike?: FetchLike;
  timeoutMs?: number;
}

export interface AccountLogoutSummary {
  ownerKey: AccountOwnerKey;
  unfinishedSaves: number;
  pendingRecords: number;
  pendingOperations: number;
  requiresConfirmation: boolean;
  flushTimedOut: boolean;
}

export type AccountLogoutResult =
  | { status: "cleared"; summary: AccountLogoutSummary }
  | { status: "cleanup_pending"; summary: AccountLogoutSummary; error: unknown };

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultClockSources(): SessionClockSources {
  return {
    wallNow: () => Date.now(),
    performanceNow: () => performance.now(),
  };
}

function accountOwnerKey(session: AccountSessionV1): AccountOwnerKey {
  return `user:${session.user.id}`;
}

function assertOwner(
  expectedOwnerKey: AccountOwnerKey,
  actualOwnerKey: string,
): void {
  if (actualOwnerKey !== expectedOwnerKey) {
    throw new AppDatabaseError("owner_mismatch");
  }
}

function invalidEnvelopeDiagnostic(occurredAt: number): StoredDiagnostic {
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    eventId: `account-session-envelope-invalid:${occurredAt}`,
    ownerKey: "guest",
    category: "account_session",
    occurredAt,
    uploadPolicy: "never",
    uploadedAt: null,
    payload: {
      errorType: "invalid_account_session_envelope",
      stack: null,
      appVersion: "unknown",
      buildNumber: "unknown",
      androidVersion: null,
      webViewVersion: null,
    },
  };
}

function requireGatewaySuccess(value: {
  ok: boolean;
  body: Record<string, unknown> | null;
  networkError: string | null;
}): Record<string, unknown> {
  if (value.networkError || !value.ok || value.body?.success !== true) {
    throw new Error("ranked_gateway_request_failed");
  }
  return value.body;
}

export function createHttpRankedSessionGateway(
  options: HttpRankedSessionGatewayOptions,
): RankedSessionGateway {
  const request = async (
    accessToken: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    const client = createJsonApiClient({
      bases: [options.apiBase],
      token: accessToken,
      ...(options.fetchLike ? { fetchLike: options.fetchLike } : {}),
      ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
    });
    return requireGatewaySuccess(
      await client.requestResult(path, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  };

  return {
    start(input) {
      return request(input.accessToken, "/ranked-session/start", {
        operation_id: input.operationId,
        mode_key: input.modeKey,
      });
    },
    async abandon(input) {
      await request(input.accessToken, "/ranked-session/abandon", {
        operation_id: input.operationId,
        challenge_id: input.challengeId,
        ranked_session_id: input.rankedSessionId,
        ranked_session_token: input.rankedSessionToken,
      });
    },
  };
}

export class GuestAppRuntime {
  readonly #database: AuthenticatedModeRuntimeDatabase;
  readonly #secureStorage: Pick<SecureStorage, "get" | "set" | "delete">;
  readonly #sessionOptions: GuestSessionOptions;
  readonly #clockSources: SessionClockSources;
  #workGate: OwnerCleanupWorkGate;
  readonly #startup: OwnerCleanupStartupResult;
  #accountSession: AccountSessionV1 | null;
  #accountSessionError: unknown | null;
  readonly #recordSync: GuestAppRuntimeOptions["recordSync"];
  #guestSave: SaveReadResult;
  #guestRecords: StoredGameRecord[];
  #activeSession: GuestGameSession | null = null;
  #activeRankedOrchestrator: RankedSessionOrchestrator | null = null;
  #lastSummaryError: unknown | null = null;
  #recordFlushInFlight: Promise<RecordOutboxSyncResult | null> | null = null;

  private constructor(
    options: GuestAppRuntimeOptions,
    startup: OwnerCleanupStartupResult,
    accountSession: AccountSessionV1 | null,
    accountSessionError: unknown | null,
    guestSave: SaveReadResult,
    guestRecords: StoredGameRecord[],
  ) {
    this.#database = options.database;
    this.#secureStorage = options.secureStorage;
    this.#clockSources = options.clockSources ?? defaultClockSources();
    this.#workGate = options.workGate ?? new OwnerCleanupWorkGate();
    this.#sessionOptions = {
      database: options.database,
      clockSources: this.#clockSources,
      ...(options.createClientRecordId
        ? { createClientRecordId: options.createClientRecordId }
        : {}),
      ...(options.createSeed ? { createSeed: options.createSeed } : {}),
    };
    this.#startup = startup;
    this.#accountSession = accountSession ? cloneValue(accountSession) : null;
    this.#accountSessionError = accountSessionError;
    this.#recordSync = options.recordSync;
    this.#guestSave = cloneValue(guestSave);
    this.#guestRecords = cloneValue(guestRecords);
  }

  static async bootstrap(
    options: GuestAppRuntimeOptions,
  ): Promise<GuestAppRuntime> {
    let workGate = options.workGate ?? new OwnerCleanupWorkGate();
    let startup = await restoreOwnerCleanupAtStartup({
      database: options.database,
      secureStorage: options.secureStorage,
    });
    if (
      options.forceAccountClearAtStartup &&
      startup.mode === "ready" &&
      startup.sessionEnvelope !== null
    ) {
      try {
        const pendingSession = parseAccountSessionEnvelope(
          startup.sessionEnvelope,
        );
        if (pendingSession) {
          await clearConfirmedOwner({
            ownerKey: accountOwnerKey(pendingSession),
            createdAt: Math.max(
              0,
              Math.floor(options.clockSources?.wallNow() ?? Date.now()),
            ),
            database: options.database,
            secureStorage: options.secureStorage,
            workGate,
            clearMemoryAuth: () => undefined,
          });
          workGate = new OwnerCleanupWorkGate();
        }
        startup = { mode: "ready", sessionEnvelope: null };
      } catch (error) {
        await options.secureStorage
          .delete(ACCOUNT_SESSION_SECURE_KEY)
          .catch(() => undefined);
        startup = { mode: "offline_only", error };
      }
    }

    let accountSession: AccountSessionV1 | null = null;
    let accountSessionError: unknown | null = null;
    if (startup.mode === "ready" && startup.sessionEnvelope !== null) {
      try {
        accountSession = parseAccountSessionEnvelope(startup.sessionEnvelope);
      } catch (error) {
        accountSessionError = error;
        const occurredAt = Math.max(0, Math.ceil(options.clockSources?.wallNow() ?? Date.now()));
        await options.database
          .addDiagnostic(invalidEnvelopeDiagnostic(occurredAt))
          .catch(() => undefined);
      }
    }

    // This local-only summary is intentionally read after owner cleanup. Even
    // when secure storage forces offline-only mode, no auth or HTTP module exists
    // on this stage-5 path and guest IndexedDB data remains usable.
    const [guestSave, guestRecords] = await Promise.all([
      options.database.getSave("guest", GUEST_STANDARD_MODE_KEY),
      options.database.listRecords("guest"),
    ]);
    return new GuestAppRuntime(
      { ...options, workGate },
      startup,
      accountSession,
      accountSessionError,
      guestSave,
      guestRecords,
    );
  }

  get startupMode(): OwnerCleanupStartupResult["mode"] {
    return this.#startup.mode;
  }

  get startupError(): unknown | null {
    return this.#startup.mode === "offline_only" ? this.#startup.error : null;
  }

  get sessionEnvelope(): string | null {
    return this.#startup.mode === "ready"
      ? this.#startup.sessionEnvelope
      : null;
  }

  get accountSession(): AccountSessionV1 | null {
    return this.#accountSession ? cloneValue(this.#accountSession) : null;
  }

  get accountSessionError(): unknown | null {
    return this.#accountSessionError;
  }

  get guestSave(): SaveReadResult {
    return cloneValue(this.#guestSave);
  }

  get guestRecords(): StoredGameRecord[] {
    return cloneValue(this.#guestRecords);
  }

  get activeSession(): GuestGameSession | null {
    return this.#activeSession;
  }

  get lastSummaryError(): unknown | null {
    return this.#lastSummaryError;
  }

  async refreshGuestSummary(): Promise<void> {
    try {
      const [save, records] = await Promise.all([
        this.#database.getSave("guest", GUEST_STANDARD_MODE_KEY),
        this.#database.listRecords("guest"),
      ]);
      this.#guestSave = cloneValue(save);
      this.#guestRecords = cloneValue(records);
      this.#lastSummaryError = null;
    } catch (error) {
      this.#lastSummaryError = error;
      throw error;
    }
  }

  async flushAccountRecordOutbox(
    forceOperationId?: string,
  ): Promise<RecordOutboxSyncResult | null> {
    if (!this.#recordSync?.enabled()) return null;
    if (this.#recordFlushInFlight) {
      if (!forceOperationId) return this.#recordFlushInFlight;
      await this.#recordFlushInFlight.catch(() => undefined);
    }

    const operation = (async () => {
      let session: AccountSessionV1 | null;
      try {
        session = await loadAccountSession(this.#secureStorage);
      } catch {
        return null;
      }
      if (!session) return null;
      const ownerKey = accountOwnerKey(session);
      return this.#workGate.run(ownerKey, async () => {
        const authService = await this.#recordSync!.getAuthService();
        return flushRecordSubmitOutbox({
          ownerKey,
          database: this.#database,
          secureStorage: this.#secureStorage,
          authService,
          ...(forceOperationId ? { forceOperationId } : {}),
        });
      });
    })();
    this.#recordFlushInFlight = operation;
    try {
      return await operation;
    } finally {
      if (this.#recordFlushInFlight === operation) {
        this.#recordFlushInFlight = null;
      }
    }
  }

  async retryAccountRecordSubmit(
    clientRecordId: string,
  ): Promise<RecordOutboxSyncResult | null> {
    if (this.#recordFlushInFlight) {
      await this.#recordFlushInFlight.catch(() => undefined);
    }
    const session = await loadAccountSession(this.#secureStorage);
    if (!session) return null;
    const ownerKey = accountOwnerKey(session);
    const operationId = (
      await this.#database.listOutbox(ownerKey)
    ).find(
      (item) =>
        item.kind === "record.submit" &&
        item.clientRecordId === clientRecordId,
    )?.operationId;
    if (!operationId) return null;
    await this.#workGate.run(ownerKey, () =>
      prepareRecordSubmitRetry(
        { ownerKey, database: this.#database },
        operationId,
      ),
    );
    return this.flushAccountRecordOutbox(operationId);
  }

  async prepareAccountLogout(waitMs = 3_000): Promise<AccountLogoutSummary | null> {
    if (!Number.isSafeInteger(waitMs) || waitMs < 0 || waitMs > 30_000) {
      throw new Error("invalid_logout_wait");
    }
    const session = await loadAccountSession(this.#secureStorage);
    if (!session) return null;
    let flushTimedOut = false;
    if (this.#recordSync?.enabled()) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      await Promise.race([
        this.flushAccountRecordOutbox().catch(() => null),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => {
            flushTimedOut = true;
            resolve(null);
          }, waitMs);
        }),
      ]);
      if (timer !== null) clearTimeout(timer);
    }
    return this.#readAccountLogoutSummary(
      accountOwnerKey(session),
      flushTimedOut,
    );
  }

  async confirmAccountLogout(): Promise<AccountLogoutResult | null> {
    const session = await loadAccountSession(this.#secureStorage);
    if (!session) return null;
    const ownerKey = accountOwnerKey(session);
    let summary = await this.#readAccountLogoutSummary(ownerKey, false);
    try {
      await clearConfirmedOwner({
        ownerKey,
        createdAt: Math.max(0, Math.floor(this.#clockSources.wallNow())),
        database: this.#database,
        secureStorage: this.#secureStorage,
        workGate: this.#workGate,
        clearMemoryAuth: () => {
          if (this.#activeSession?.currentSave.ownerKey === ownerKey) {
            this.#activeSession = null;
            this.#activeRankedOrchestrator = null;
          }
          this.#accountSession = null;
          this.#accountSessionError = null;
        },
      });
      this.#workGate = new OwnerCleanupWorkGate();
      summary = { ...summary, flushTimedOut: false };
      return { status: "cleared", summary };
    } catch (error) {
      const pending = await this.#database
        .listPendingOwnerClears()
        .catch(() => [] as AppOwnerKey[]);
      if (!pending.includes(ownerKey)) throw error;
      return { status: "cleanup_pending", summary, error };
    }
  }

  async clearAccountAfterDeletion(): Promise<AccountLogoutResult | null> {
    try {
      return await this.confirmAccountLogout();
    } catch (error) {
      let session: AccountSessionV1 | null = null;
      try {
        session = await loadAccountSession(this.#secureStorage);
      } catch {
        session = null;
      }
      const summary = session
        ? await this.#readAccountLogoutSummary(
            accountOwnerKey(session),
            false,
          ).catch(() => ({
            ownerKey: accountOwnerKey(session!),
            unfinishedSaves: 0,
            pendingRecords: 0,
            pendingOperations: 0,
            requiresConfirmation: false,
            flushTimedOut: false,
          }))
        : null;
      if (session) {
        const ownerKey = accountOwnerKey(session);
        if (this.#activeSession?.currentSave.ownerKey === ownerKey) {
          this.#activeSession = null;
          this.#activeRankedOrchestrator = null;
        }
        this.#accountSession = null;
        this.#accountSessionError = null;
      }
      await this.#secureStorage
        .delete(ACCOUNT_SESSION_SECURE_KEY)
        .catch(() => undefined);
      return summary
        ? { status: "cleanup_pending", summary, error }
        : null;
    }
  }

  async getAccountRecord(
    clientRecordId: string,
  ): Promise<StoredGameRecord | null> {
    const session = await loadAccountSession(this.#secureStorage);
    if (!session) return null;
    return this.#database.getRecord(
      accountOwnerKey(session),
      clientRecordId,
    );
  }

  async #readAccountLogoutSummary(
    ownerKey: AccountOwnerKey,
    flushTimedOut: boolean,
  ): Promise<AccountLogoutSummary> {
    const [saves, outbox] = await Promise.all([
      this.#database.listSaves(ownerKey),
      this.#database.listOutbox(ownerKey),
    ]);
    const pendingRecords = outbox.filter(
      (item) => item.kind === "record.submit",
    ).length;
    const pendingOperations = outbox.length - pendingRecords;
    return {
      ownerKey,
      unfinishedSaves: saves.length,
      pendingRecords,
      pendingOperations,
      requiresConfirmation:
        saves.length > 0 || pendingRecords > 0 || pendingOperations > 0,
      flushTimedOut,
    };
  }

  async enterGuestStandard(): Promise<OpenGuestStandardSessionResult> {
    if (this.#activeSession) {
      const activeSave = this.#activeSession.currentSave;
      if (
        activeSave.ownerKey !== "guest" ||
        activeSave.modeKey !== GUEST_STANDARD_MODE_KEY
      ) {
        throw new Error("app_session_already_active");
      }
      return {
        status: "ready",
        restored: true,
        session: this.#activeSession,
      };
    }
    const opened = await openGuestStandardSession(this.#sessionOptions);
    if (opened.status === "ready") {
      this.#activateSession(opened.session, null);
      this.#guestSave = {
        status: "ok",
        save: cloneValue(opened.session.currentSave),
      };
    } else {
      this.#guestSave = cloneValue(opened);
    }
    return opened;
  }

  enterAuthenticatedMode(
    modeKey: AppModeKey,
    expectedSession: AccountSessionV1,
    options: EnterAuthenticatedModeOptions,
  ): Promise<EnterAuthenticatedModeResult> {
    const ownerKey = accountOwnerKey(expectedSession);
    return this.#workGate.run(ownerKey, async () => {
      if (this.#activeSession) {
        const activeSave = this.#activeSession.currentSave;
        if (
          activeSave.ownerKey === ownerKey &&
          activeSave.modeKey === modeKey
        ) {
          return {
            status: "ready",
            restored: true,
            session: this.#activeSession,
            gameKind: activeSave.gameKind,
          };
        }
        throw new Error("app_session_already_active");
      }

      let account = await this.#requireAccountSession(expectedSession);
      const nowEpochSeconds = Math.floor(this.#clockSources.wallNow() / 1_000);
      let rankedAvailable = options.online && !!options.gateway;
      if (
        rankedAvailable &&
        options.refreshSession &&
        account.expiresAtEpochSeconds - nowEpochSeconds <= 300
      ) {
        try {
          account = await options.refreshSession();
          this.#assertSameIdentity(expectedSession, account);
        } catch {
          rankedAvailable = false;
        }
      }
      rankedAvailable =
        rankedAvailable && account.expiresAtEpochSeconds > nowEpochSeconds;

      const database = this.#accountDatabase(ownerKey);
      const stored = await database.getSave(ownerKey, modeKey);
      if (stored.status === "corrupt" || stored.status === "future_schema") {
        return stored;
      }
      if (stored.status === "ok") {
        return this.#openStoredAccountSession(
          database,
          stored.save,
          account,
          options,
        );
      }

      let orchestrator: RankedSessionOrchestrator | null = null;
      if (rankedAvailable && options.gateway) {
        orchestrator = this.#createRankedOrchestrator(
          database,
          ownerKey,
          account,
          options.gateway,
          options.requestTimeoutMs,
        );
        try {
          const session = await orchestrator.startNewRankedSession(modeKey);
          this.#activateSession(session, orchestrator);
          return {
            status: "ready",
            restored: false,
            session,
            gameKind: "ranked",
          };
        } catch (startError) {
          const durable = await database.getSave(ownerKey, modeKey);
          if (durable.status === "corrupt" || durable.status === "future_schema") {
            return durable;
          }
          if (durable.status === "ok") {
            const pending = (await orchestrator.listPendingStarts()).find(
              (entry) => entry.modeKey === modeKey,
            );
            if (!pending || pending.resolution !== "confirmation_required") {
              throw startError;
            }
            const session = await orchestrator.confirmPendingStart(
              pending.operationId,
            );
            this.#activateSession(session, orchestrator);
            return {
              status: "ready",
              restored: true,
              session,
              gameKind: "ranked",
            };
          }
        }
      }

      const opened = await openLocalSession({
        ...this.#localSessionOptions(database),
        ownerKey,
        modeKey,
        gameKind: "normal",
        rankedSessionId: null,
        challengeId: null,
        startedAtMs: null,
        serverNowMs: null,
        serverNowReceivedAtMonotonicMs: null,
        terminalPolicy: this.#terminalPolicy(modeKey),
      });
      if (opened.status === "ready") this.#activateSession(opened.session, null);
      return opened.status === "ready"
        ? { ...opened, gameKind: "normal" }
        : opened;
    });
  }

  moveActiveSession(direction: GameDirection): GuestMoveResult {
    const result = this.#requireActiveSession().move(direction);
    if (!result.terminal) return result;
    const terminal = result.terminal.then((record) => {
      this.#applyFinalizedRecord(record);
      return record;
    });
    void terminal.catch(() => undefined);
    return { ...result, terminal };
  }

  async finalizeActiveTerminal(): Promise<StoredGameRecord> {
    const record = await this.#requireActiveSession().finalizeTerminal();
    this.#applyFinalizedRecord(record);
    return record;
  }

  undoActivePendingTerminal() {
    return this.#requireActiveSession().undoPendingTerminal();
  }

  async confirmActivePendingTerminal(): Promise<StoredGameRecord> {
    const record = await this.#requireActiveSession().confirmPendingTerminal();
    this.#applyFinalizedRecord(record);
    return record;
  }

  async flushActiveSession(): Promise<void> {
    await this.#requireActiveSession().flush();
  }

  async pauseActiveSession(): Promise<void> {
    if (!this.#activeSession) return;
    await this.#activeSession.pause();
  }

  resumeActiveSession(): number | null {
    return this.#activeSession ? this.#activeSession.resume() : null;
  }

  async leaveActiveSession(): Promise<void> {
    const session = this.#requireActiveSession();
    const ownerKey = session.currentSave.ownerKey;
    await session.leave();
    this.#activeSession = null;
    this.#activeRankedOrchestrator = null;
    const finalized = session.finalizedRecord;
    if (ownerKey !== "guest") return;
    if (finalized) {
      this.#applyFinalizedRecord(finalized);
    } else {
      this.#guestSave = {
        status: "ok",
        save: cloneValue(session.currentSave),
      };
    }
    await this.#refreshGuestSummaryBestEffort();
  }

  async restartActiveSession(): Promise<GuestGameSession> {
    const active = this.#requireActiveSession();
    const replacement = this.#activeRankedOrchestrator
      ? await this.#activeRankedOrchestrator.restartRankedSession(active)
      : await active.restart();
    this.#activeSession = replacement;
    if (replacement.currentSave.ownerKey === "guest") {
      this.#guestSave = {
        status: "ok",
        save: cloneValue(replacement.currentSave),
      };
    }
    return replacement;
  }

  getGuestRecord(clientRecordId: string): Promise<StoredGameRecord | null> {
    return this.#database.getRecord("guest", clientRecordId);
  }

  async deleteGuestRecord(clientRecordId: string): Promise<boolean> {
    const existing = await this.#database.getRecord("guest", clientRecordId);
    if (!existing) return false;

    let deleted: boolean;
    try {
      deleted = await this.#database.deleteGuestRecord(clientRecordId);
    } catch (error) {
      let remaining: StoredGameRecord | null;
      try {
        remaining = await this.#database.getRecord("guest", clientRecordId);
      } catch {
        throw error;
      }
      if (remaining) throw error;
      deleted = true;
    }
    if (deleted) {
      this.#guestRecords = this.#guestRecords.filter(
        (record) => record.clientRecordId !== clientRecordId,
      );
      await this.#refreshGuestSummaryBestEffort();
    }
    return deleted;
  }

  async #requireAccountSession(
    expected: AccountSessionV1,
  ): Promise<AccountSessionV1> {
    const current = await loadAccountSession(this.#secureStorage);
    if (!current) throw new Error("account_session_missing");
    this.#assertSameIdentity(expected, current);
    return current;
  }

  #assertSameIdentity(
    expected: AccountSessionV1,
    current: AccountSessionV1,
  ): void {
    if (
      current.user.id !== expected.user.id ||
      current.persistentIdentity.userId !== expected.persistentIdentity.userId ||
      current.persistentIdentity.establishedAtMs !==
        expected.persistentIdentity.establishedAtMs
    ) {
      throw new Error("account_session_owner_mismatch");
    }
  }

  #localSessionOptions(database: RankedSessionOrchestrationDatabase) {
    return {
      database,
      clockSources: this.#clockSources,
      ...(this.#sessionOptions.createClientRecordId
        ? { createClientRecordId: this.#sessionOptions.createClientRecordId }
        : {}),
      ...(this.#sessionOptions.createSeed
        ? { createSeed: this.#sessionOptions.createSeed }
        : {}),
    };
  }

  #terminalPolicy(modeKey: AppModeKey): "immediate" | "pending_undo" {
    return modeKey === "classic_4x4_pow2_undo"
      ? "pending_undo"
      : "immediate";
  }

  async #openStoredAccountSession(
    database: RankedSessionOrchestrationDatabase,
    save: StoredGameSave,
    account: AccountSessionV1,
    options: EnterAuthenticatedModeOptions,
  ): Promise<EnterAuthenticatedModeResult> {
    if (save.gameKind === "normal") {
      const opened = await openLocalSession({
        ...this.#localSessionOptions(database),
        ownerKey: save.ownerKey,
        modeKey: save.modeKey,
        gameKind: "normal",
        rankedSessionId: null,
        challengeId: null,
        startedAtMs: null,
        serverNowMs: null,
        serverNowReceivedAtMonotonicMs: null,
        terminalPolicy: this.#terminalPolicy(save.modeKey),
      });
      if (opened.status === "ready") this.#activateSession(opened.session, null);
      return opened.status === "ready"
        ? { ...opened, gameKind: "normal" }
        : opened;
    }

    const challengeId = save.snapshot.state.challengeId;
    const ref = account.challengeRefs.find(
      (candidate) =>
        candidate.challengeId === challengeId &&
        candidate.rankedSessionId === save.rankedSessionId,
    );
    if (!ref || save.snapshot.state.startedAtMs === null) {
      throw new Error("ranked_challenge_missing");
    }
    const opened = await openLocalSession({
      ...this.#localSessionOptions(database),
      ownerKey: save.ownerKey,
      modeKey: save.modeKey,
      gameKind: "ranked",
      rankedSessionId: ref.rankedSessionId,
      challengeId: ref.challengeId,
      startedAtMs: save.snapshot.state.startedAtMs,
      serverNowMs: Math.max(
        save.snapshot.savedAtMs,
        save.snapshot.state.startedAtMs,
      ),
      serverNowReceivedAtMonotonicMs: this.#clockSources.performanceNow(),
      terminalPolicy: this.#terminalPolicy(save.modeKey),
      createSeed: () => save.snapshot.state.seed,
    });
    const orchestrator = options.gateway
      ? this.#createRankedOrchestrator(
          database,
          save.ownerKey as AccountOwnerKey,
          account,
          options.gateway,
          options.requestTimeoutMs,
        )
      : null;
    if (opened.status === "ready") {
      this.#activateSession(opened.session, orchestrator);
    }
    return opened.status === "ready"
      ? { ...opened, gameKind: "ranked" }
      : opened;
  }

  #createRankedOrchestrator(
    database: RankedSessionOrchestrationDatabase,
    ownerKey: AccountOwnerKey,
    account: AccountSessionV1,
    gateway: RankedSessionGateway,
    requestTimeoutMs?: number,
  ): RankedSessionOrchestrator {
    return new RankedSessionOrchestrator({
      ownerKey,
      identityEstablishedAtMs: account.persistentIdentity.establishedAtMs,
      database,
      secureStorage: this.#secureStorage,
      gateway,
      workGate: this.#workGate,
      clockSources: this.#clockSources,
      ...(requestTimeoutMs ? { requestTimeoutMs } : {}),
      ...(this.#sessionOptions.createClientRecordId
        ? { createClientRecordId: this.#sessionOptions.createClientRecordId }
        : {}),
    });
  }

  #accountDatabase(
    ownerKey: AccountOwnerKey,
  ): RankedSessionOrchestrationDatabase {
    const database = this.#database;
    const run = <T>(work: () => T | Promise<T>): Promise<T> =>
      this.#workGate.run(ownerKey, work);
    const scoped: RankedSessionOrchestrationDatabase = {
      name: database.name,
      getSave: (candidateOwnerKey, modeKey) => {
        assertOwner(ownerKey, candidateOwnerKey);
        return run(() => database.getSave(candidateOwnerKey, modeKey));
      },
      startNewGame: (input) => {
        assertOwner(ownerKey, input.ownerKey);
        return run(() => database.startNewGame(input));
      },
      putSave: (save) => {
        assertOwner(ownerKey, save.ownerKey);
        return run(() => database.putSave(save));
      },
      deleteSave: (input) => {
        assertOwner(ownerKey, input.ownerKey);
        return run(() => database.deleteSave(input));
      },
      finalizeTerminal: (input) => {
        assertOwner(ownerKey, input.ownerKey);
        return run(() => database.finalizeTerminal(input));
      },
      enqueueOutbox: (item) => {
        assertOwner(ownerKey, item.ownerKey);
        return run(() => database.enqueueOutbox(item));
      },
      freezeRankedStartIntent: (candidateOwnerKey, operationId, frozen) => {
        assertOwner(ownerKey, candidateOwnerKey);
        return run(() =>
          database.freezeRankedStartIntent(
            candidateOwnerKey,
            operationId,
            frozen,
          ),
        );
      },
      getOrCreateRankedStartIntent: (candidate) => {
        assertOwner(ownerKey, candidate.ownerKey);
        return run(() => database.getOrCreateRankedStartIntent(candidate));
      },
      listOutbox: (candidateOwnerKey) => {
        assertOwner(ownerKey, candidateOwnerKey);
        return run(() => database.listOutbox(candidateOwnerKey));
      },
      removeOutbox: (candidateOwnerKey, operationId) => {
        assertOwner(ownerKey, candidateOwnerKey);
        return run(() => database.removeOutbox(candidateOwnerKey, operationId));
      },
    };
    return scoped;
  }

  #activateSession(
    session: LocalGameSession,
    orchestrator: RankedSessionOrchestrator | null,
  ): void {
    this.#activeSession = session;
    this.#activeRankedOrchestrator = orchestrator;
  }

  #applyFinalizedRecord(record: StoredGameRecord): void {
    if (record.ownerKey !== "guest") {
      void this.flushAccountRecordOutbox().catch(() => undefined);
      return;
    }
    this.#guestSave = { status: "missing" };
    this.#guestRecords = [
      cloneValue(record),
      ...this.#guestRecords.filter(
        (existing) => existing.clientRecordId !== record.clientRecordId,
      ),
    ].sort(
      (left, right) =>
        right.endedAt - left.endedAt ||
        left.clientRecordId.localeCompare(right.clientRecordId),
    );
  }

  async #refreshGuestSummaryBestEffort(): Promise<void> {
    try {
      await this.refreshGuestSummary();
    } catch {
      // The durable operation already succeeded. Keep the local projection and
      // expose lastSummaryError without asking callers to repeat it.
    }
  }

  #requireActiveSession(): GuestGameSession {
    if (!this.#activeSession) throw new Error("guest_app_no_active_session");
    return this.#activeSession;
  }
}

export async function bootstrapGuestAppRuntime(
  options: GuestAppRuntimeOptions,
): Promise<GuestAppRuntime> {
  return GuestAppRuntime.bootstrap(options);
}

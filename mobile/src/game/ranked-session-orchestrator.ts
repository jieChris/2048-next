import {
  APP_MODE_KEYS,
  isAppModeKey,
  type AppModeKey,
} from "../../../src/contracts";
import { randomHex } from "../../../src/utils/crypto-random";
import {
  ACCOUNT_SESSION_TOKEN_MAX_LENGTH,
  loadAccountSession,
  removeAccountChallengeRef,
  updateAccountSession,
  type AccountChallengeRefV1,
  type AccountSessionV1,
} from "../auth/account-session";
import {
  APP_DATABASE_SCHEMA_VERSION,
  type AppDatabase,
  type RankedSessionStartFingerprint,
  type StoredGameSave,
  type StoredOutboxItem,
} from "../data/app-database";
import type { OwnerCleanupWorkGate } from "../data/owner-cleanup";
import type { SecureStorage } from "../platform/secure-storage";
import {
  openLocalSession,
  type LocalGameSession,
  type LocalSessionDatabase,
} from "./guest-session";
import type { SessionClockSources } from "./session-clock";

type AccountOwnerKey = `user:${string}`;
type RankedStartIntent = Extract<
  StoredOutboxItem,
  { kind: "ranked.session_start" }
>;
type RankedAbandonIntent = Extract<
  StoredOutboxItem,
  { kind: "ranked.abandon" }
>;

export type RankedSessionOrchestrationDatabase = LocalSessionDatabase &
  Pick<
    AppDatabase,
    | "enqueueOutbox"
    | "freezeRankedStartIntent"
    | "getOrCreateRankedStartIntent"
    | "listOutbox"
    | "name"
    | "removeOutbox"
  >;

export interface RankedSessionGateway {
  start(input: {
    accessToken: string;
    operationId: string;
    modeKey: AppModeKey;
  }): Promise<unknown>;
  /** Resolve only after the session is abandoned or already expired/abandoned. */
  abandon(input: {
    accessToken: string;
    operationId: string;
    challengeId: string;
    rankedSessionId: string;
    rankedSessionToken: string;
  }): Promise<void>;
}

export interface RankedSessionOrchestratorOptions {
  ownerKey: AccountOwnerKey;
  identityEstablishedAtMs: number;
  database: RankedSessionOrchestrationDatabase;
  secureStorage: Pick<SecureStorage, "get" | "set">;
  gateway: RankedSessionGateway;
  workGate: Pick<OwnerCleanupWorkGate, "run">;
  clockSources: SessionClockSources;
  requestTimeoutMs?: number;
  createOperationId?: () => string;
  createClientRecordId?: () => string;
}

export interface PendingRankedStart {
  operationId: string;
  modeKey: AppModeKey;
  resolution: "confirmation_required" | "abandon_required";
}

export type RankedSessionOrchestrationErrorCode =
  | "invalid_input"
  | "account_session_missing"
  | "owner_mismatch"
  | "ranked_save_exists"
  | "ranked_start_confirmation_required"
  | "ranked_start_intent_conflict"
  | "ranked_start_request_failed"
  | "ranked_start_invalid_response"
  | "ranked_start_intent_write_failed"
  | "ranked_start_inactive"
  | "ranked_challenge_write_failed"
  | "ranked_local_start_failed"
  | "ranked_intent_cleanup_failed"
  | "ranked_pending_start_missing"
  | "ranked_pending_start_abandon_required"
  | "ranked_challenge_missing"
  | "ranked_abandon_failed"
  | "ranked_save_conflict"
  | "ranked_restart_invalid_session";

export class RankedSessionOrchestrationError extends Error {
  readonly code: RankedSessionOrchestrationErrorCode;

  constructor(code: RankedSessionOrchestrationErrorCode) {
    super(code);
    this.name = "RankedSessionOrchestrationError";
    this.code = code;
  }
}

interface RankedStartData {
  rankedSessionId: string;
  challengeId: string;
  seed: number;
  rankedSessionToken: string;
  startedAtMs: number;
  serverNowMs: number;
  expiresAtEpochSeconds: number;
  status: "started" | "consumed" | "expired" | "abandoned";
}

const OPERATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/u;
const CHALLENGE_ID_PATTERN = /^rch_[a-f0-9]{32}$/u;
const ACTIVE_RANKED_STATUS = "started";
const MAX_EPOCH_SECONDS = Math.floor(Number.MAX_SAFE_INTEGER / 1_000);
const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;
const MAX_REQUEST_TIMEOUT_MS = 60_000;
const rankedStatuses = new Set([
  ACTIVE_RANKED_STATUS,
  "consumed",
  "expired",
  "abandoned",
]);
const sharedStartFlights = new Map<string, Promise<LocalGameSession>>();

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : null;
}

function requiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

function parseStartResponse(
  value: unknown,
  operationId: string,
  modeKey: AppModeKey,
): RankedStartData {
  const envelope = record(value);
  const data = envelope?.success === true ? record(envelope.data) : null;
  const rankedSessionId = requiredText(data?.ranked_session_id, 160);
  const challengeId = requiredText(data?.challenge_id, 160);
  const responseOperationId = requiredText(data?.operation_id, 128);
  const responseModeKey = data?.mode_key;
  const seed = safeInteger(data?.seed);
  const token = requiredText(
    data?.ranked_session_token,
    ACCOUNT_SESSION_TOKEN_MAX_LENGTH,
  );
  const issuedAt = safeInteger(data?.issued_at);
  const startedAt = safeInteger(data?.started_at);
  const startedAtMs = safeInteger(data?.started_at_ms);
  const serverNowMs = safeInteger(data?.server_now_ms);
  const expiredAt = safeInteger(data?.expired_at);
  const expiresAt = safeInteger(data?.expires_at);
  const exp = safeInteger(data?.exp);
  const status = data?.status;
  if (
    !rankedSessionId ||
    !challengeId ||
    rankedSessionId !== challengeId ||
    !CHALLENGE_ID_PATTERN.test(challengeId) ||
    responseOperationId !== operationId ||
    responseModeKey !== modeKey ||
    !isAppModeKey(responseModeKey) ||
    seed === null ||
    seed > 0xffffffff ||
    !token ||
    !/^[\x21-\x7e]+$/u.test(token) ||
    issuedAt === null ||
    issuedAt > MAX_EPOCH_SECONDS ||
    startedAt === null ||
    startedAtMs === null ||
    serverNowMs === null ||
    expiredAt === null ||
    expiredAt > MAX_EPOCH_SECONDS ||
    expiresAt !== expiredAt ||
    exp !== expiredAt ||
    startedAt !== Math.floor(startedAtMs / 1_000) ||
    issuedAt * 1_000 > startedAtMs ||
    startedAtMs >= expiredAt * 1_000 ||
    serverNowMs < startedAtMs ||
    typeof status !== "string" ||
    !rankedStatuses.has(status) ||
    (status === ACTIVE_RANKED_STATUS && serverNowMs >= expiredAt * 1_000)
  ) {
    throw new RankedSessionOrchestrationError("ranked_start_invalid_response");
  }
  return {
    rankedSessionId,
    challengeId,
    seed,
    rankedSessionToken: token,
    startedAtMs,
    serverNowMs,
    expiresAtEpochSeconds: expiredAt,
    status: status as RankedStartData["status"],
  };
}

function terminalPolicy(modeKey: AppModeKey): "immediate" | "pending_undo" {
  return modeKey === "classic_4x4_pow2_undo" ? "pending_undo" : "immediate";
}

function challengeRef(data: RankedStartData): AccountChallengeRefV1 {
  return {
    challengeId: data.challengeId,
    rankedSessionId: data.rankedSessionId,
    token: data.rankedSessionToken,
    expiresAtEpochSeconds: data.expiresAtEpochSeconds,
  };
}

function startFingerprint(
  data: RankedStartData,
): RankedSessionStartFingerprint {
  return {
    rankedSessionId: data.rankedSessionId,
    challengeId: data.challengeId,
    seed: data.seed,
    startedAtMs: data.startedAtMs,
    expiresAtEpochSeconds: data.expiresAtEpochSeconds,
  };
}

function sameChallenge(
  left: AccountChallengeRefV1,
  right: AccountChallengeRefV1,
): boolean {
  return (
    left.challengeId === right.challengeId &&
    left.rankedSessionId === right.rankedSessionId &&
    left.token === right.token &&
    left.expiresAtEpochSeconds === right.expiresAtEpochSeconds
  );
}

export class RankedSessionOrchestrator {
  readonly #options: RankedSessionOrchestratorOptions;

  constructor(options: RankedSessionOrchestratorOptions) {
    if (
      !/^user:[1-9]\d*$/u.test(options.ownerKey) ||
      !Number.isSafeInteger(options.identityEstablishedAtMs) ||
      options.identityEstablishedAtMs < 0 ||
      (options.requestTimeoutMs !== undefined &&
        (!Number.isSafeInteger(options.requestTimeoutMs) ||
          options.requestTimeoutMs < 1 ||
          options.requestTimeoutMs > MAX_REQUEST_TIMEOUT_MS))
    ) {
      throw new RankedSessionOrchestrationError("invalid_input");
    }
    this.#options = options;
  }

  startNewRankedSession(modeKey: AppModeKey): Promise<LocalGameSession> {
    return this.#runOwnerWork(() => {
      if (!isAppModeKey(modeKey)) {
        throw new RankedSessionOrchestrationError("invalid_input");
      }
      const flightKey = `${this.#options.database.name}\0${this.#options.ownerKey}\0${this.#options.identityEstablishedAtMs}\0${modeKey}`;
      const existing = sharedStartFlights.get(flightKey);
      if (existing) return existing;
      const operation = this.#start(modeKey);
      sharedStartFlights.set(flightKey, operation);
      void operation.then(
        () => {
          if (sharedStartFlights.get(flightKey) === operation) {
            sharedStartFlights.delete(flightKey);
          }
        },
        () => {
          if (sharedStartFlights.get(flightKey) === operation) {
            sharedStartFlights.delete(flightKey);
          }
        },
      );
      return operation;
    });
  }

  listPendingStarts(): Promise<PendingRankedStart[]> {
    return this.#runOwnerWork(() => this.#listPendingStarts());
  }

  async #listPendingStarts(): Promise<PendingRankedStart[]> {
    await this.#requireAccountSession();
    const outbox = await this.#options.database.listOutbox(
      this.#options.ownerKey,
    );
    const starts = outbox.filter(
      (item): item is RankedStartIntent => item.kind === "ranked.session_start",
    );
    this.#assertUniqueStartModes(starts);
    const abandonChallenges = new Set(
      outbox
        .filter(
          (item): item is RankedAbandonIntent => item.kind === "ranked.abandon",
        )
        .map((item) => item.payload.challengeId),
    );
    return Promise.all(
      starts.map(async (intent) => {
        const stored = await this.#options.database.getSave(
          this.#options.ownerKey,
          intent.payload.modeKey,
        );
        const challengeId =
          stored.status === "ok" && stored.save.gameKind === "ranked"
            ? stored.save.snapshot.state.challengeId
            : null;
        return {
          operationId: intent.operationId,
          modeKey: intent.payload.modeKey,
          resolution:
            stored.status === "ok" &&
            stored.save.gameKind === "ranked" &&
            typeof challengeId === "string" &&
            !abandonChallenges.has(challengeId)
              ? "confirmation_required"
              : "abandon_required",
        };
      }),
    );
  }

  confirmPendingStart(operationId: string): Promise<LocalGameSession> {
    return this.#runOwnerWork(() => this.#confirmPendingStart(operationId));
  }

  async #confirmPendingStart(operationId: string): Promise<LocalGameSession> {
    const account = await this.#requireAccountSession();
    const intent = await this.#requireStartIntent(operationId);
    const stored = await this.#options.database.getSave(
      this.#options.ownerKey,
      intent.payload.modeKey,
    );
    if (stored.status !== "ok" || stored.save.gameKind !== "ranked") {
      throw new RankedSessionOrchestrationError(
        "ranked_pending_start_abandon_required",
      );
    }
    const save = stored.save;
    const challengeId = save.snapshot.state.challengeId;
    if (typeof challengeId !== "string") {
      throw new RankedSessionOrchestrationError("ranked_challenge_missing");
    }
    const outbox = await this.#options.database.listOutbox(
      this.#options.ownerKey,
    );
    if (
      outbox.some(
        (item) =>
          item.kind === "ranked.abandon" &&
          item.payload.challengeId === challengeId,
      )
    ) {
      throw new RankedSessionOrchestrationError(
        "ranked_pending_start_abandon_required",
      );
    }
    const ref = account.challengeRefs.find(
      (candidate) => candidate.challengeId === challengeId,
    );
    if (!ref || ref.rankedSessionId !== save.rankedSessionId) {
      throw new RankedSessionOrchestrationError("ranked_challenge_missing");
    }
    const frozen = intent.payload.frozen;
    if (
      !frozen ||
      frozen.rankedSessionId !== save.rankedSessionId ||
      frozen.challengeId !== challengeId ||
      frozen.seed !== save.snapshot.state.seed ||
      frozen.startedAtMs !== save.snapshot.state.startedAtMs ||
      frozen.expiresAtEpochSeconds !== ref.expiresAtEpochSeconds
    ) {
      throw new RankedSessionOrchestrationError(
        "ranked_start_invalid_response",
      );
    }
    const opened = await openLocalSession(
      this.#rankedLocalOptions(
        save.modeKey,
        save,
        ref,
        Math.max(save.snapshot.savedAtMs, save.snapshot.state.startedAtMs ?? 0),
        this.#readMonotonicClock(),
      ),
    );
    if (opened.status !== "ready") {
      throw new RankedSessionOrchestrationError("ranked_local_start_failed");
    }
    await this.#removeIntent(intent.operationId);
    return opened.session;
  }

  abandonPendingStart(operationId: string): Promise<void> {
    return this.#runOwnerWork(() => this.#abandonPendingStart(operationId));
  }

  async #abandonPendingStart(operationId: string): Promise<void> {
    const account = await this.#requireAccountSession();
    const intent = await this.#requireStartIntent(operationId);
    const stored = await this.#options.database.getSave(
      this.#options.ownerKey,
      intent.payload.modeKey,
    );
    let ref: AccountChallengeRefV1 | null = null;
    if (stored.status === "ok" && stored.save.gameKind === "ranked") {
      const challengeId = stored.save.snapshot.state.challengeId;
      ref =
        account.challengeRefs.find(
          (candidate) => candidate.challengeId === challengeId,
        ) ?? null;
    }
    if (!ref) {
      const response = await this.#requestStart(intent, account);
      if (response.data.status !== ACTIVE_RANKED_STATUS) {
        await this.#cleanInactiveStart(intent, response.data);
        return;
      }
      ref = challengeRef(response.data);
    }
    const abandon = await this.#ensureAbandonIntent(ref.challengeId);
    if (stored.status === "ok" && stored.save.gameKind === "ranked") {
      if (stored.save.rankedSessionId !== ref.rankedSessionId) {
        throw new RankedSessionOrchestrationError("ranked_save_conflict");
      }
      const deleted = await this.#options.database.deleteSave({
        ownerKey: this.#options.ownerKey,
        modeKey: stored.save.modeKey,
        expectedClientRecordId: stored.save.clientRecordId,
        expectedGeneration: stored.save.generation,
        closedAt: this.#readWallClock(),
      });
      if (deleted !== "deleted") {
        throw new RankedSessionOrchestrationError("ranked_save_conflict");
      }
    }
    await this.#requestAbandon(account, abandon, ref);
    await this.#removeChallenge(ref.challengeId);
    await this.#removeIntent(abandon.operationId);
    await this.#removeIntent(intent.operationId);
  }

  restartRankedSession(session: LocalGameSession): Promise<LocalGameSession> {
    return this.#runOwnerWork(() => this.#restartRankedSession(session));
  }

  async #restartRankedSession(
    session: LocalGameSession,
  ): Promise<LocalGameSession> {
    const current = session.currentSave;
    if (
      current.ownerKey !== this.#options.ownerKey ||
      current.gameKind !== "ranked" ||
      typeof current.snapshot.state.challengeId !== "string" ||
      !current.rankedSessionId
    ) {
      throw new RankedSessionOrchestrationError(
        "ranked_restart_invalid_session",
      );
    }
    const account = await this.#requireAccountSession();
    let restartRejected = false;
    try {
      await session.restart();
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== "local_session_ranked_restart_requires_new_session"
      ) {
        throw error;
      }
      restartRejected = true;
    }
    if (!restartRejected) {
      throw new RankedSessionOrchestrationError(
        "ranked_restart_invalid_session",
      );
    }
    const durable = await this.#options.database.getSave(
      this.#options.ownerKey,
      current.modeKey,
    );
    if (
      durable.status !== "ok" ||
      durable.save.clientRecordId !== current.clientRecordId ||
      durable.save.generation !== current.generation
    ) {
      throw new RankedSessionOrchestrationError("ranked_save_conflict");
    }
    await session.leave();
    const ref = account.challengeRefs.find(
      (candidate) =>
        candidate.challengeId === current.snapshot.state.challengeId &&
        candidate.rankedSessionId === current.rankedSessionId,
    );
    if (!ref) {
      throw new RankedSessionOrchestrationError("ranked_challenge_missing");
    }
    const abandon = await this.#ensureAbandonIntent(ref.challengeId);
    const deleted = await this.#options.database.deleteSave({
      ownerKey: this.#options.ownerKey,
      modeKey: current.modeKey,
      expectedClientRecordId: current.clientRecordId,
      expectedGeneration: current.generation,
      closedAt: this.#readWallClock(),
    });
    if (deleted !== "deleted") {
      throw new RankedSessionOrchestrationError("ranked_save_conflict");
    }
    await this.#requestAbandon(account, abandon, ref);
    await this.#removeChallenge(ref.challengeId);
    await this.#removeIntent(abandon.operationId);
    return this.startNewRankedSession(current.modeKey);
  }

  abandonOwnerSessions(): Promise<void> {
    return this.#runOwnerWork(() => this.#abandonOwnerSessions());
  }

  resumePendingAbandons(): Promise<void> {
    return this.#runOwnerWork(async () => {
      const account = await this.#requireAccountSession();
      await this.#resumePendingAbandons(account);
    });
  }

  async #abandonOwnerSessions(): Promise<void> {
    const initialAccount = await this.#requireAccountSession();
    await this.#resumePendingAbandons(initialAccount);
    for (const pending of await this.#listPendingStarts()) {
      await this.#abandonPendingStart(pending.operationId);
    }
    const account = await this.#requireAccountSession();
    for (const ref of account.challengeRefs) {
      const intent = await this.#ensureAbandonIntent(ref.challengeId);
      await this.#deleteRankedSaveForChallenge(ref);
      await this.#requestAbandon(account, intent, ref);
      await this.#removeChallenge(ref.challengeId);
      await this.#removeIntent(intent.operationId);
    }
  }

  async #start(modeKey: AppModeKey): Promise<LocalGameSession> {
    const account = await this.#requireAccountSession();
    await this.#resumePendingAbandons(account);
    const stored = await this.#options.database.getSave(
      this.#options.ownerKey,
      modeKey,
    );
    if (stored.status !== "missing") {
      const existingIntent = await this.#findStartIntent(modeKey);
      throw new RankedSessionOrchestrationError(
        existingIntent
          ? "ranked_start_confirmation_required"
          : "ranked_save_exists",
      );
    }
    const intent = await this.#getOrCreateStartIntent(modeKey);
    const response = await this.#requestStart(intent, account);
    if (response.data.status !== ACTIVE_RANKED_STATUS) {
      await this.#cleanInactiveStart(intent, response.data);
      throw new RankedSessionOrchestrationError("ranked_start_inactive");
    }
    try {
      await this.#persistChallenge(response.data);
    } catch {
      await this.#tryAbandonUnstored(account, intent, response.data);
      throw new RankedSessionOrchestrationError(
        "ranked_challenge_write_failed",
      );
    }

    let opened: Awaited<ReturnType<typeof openLocalSession>>;
    try {
      opened = await openLocalSession({
        database: this.#options.database,
        ownerKey: this.#options.ownerKey,
        modeKey,
        gameKind: "ranked",
        rankedSessionId: response.data.rankedSessionId,
        challengeId: response.data.challengeId,
        startedAtMs: response.data.startedAtMs,
        serverNowMs: response.data.serverNowMs,
        serverNowReceivedAtMonotonicMs: response.receivedAtMonotonicMs,
        terminalPolicy: terminalPolicy(modeKey),
        createSeed: () => response.data.seed,
        clockSources: this.#options.clockSources,
        ...(this.#options.createClientRecordId
          ? { createClientRecordId: this.#options.createClientRecordId }
          : {}),
      });
    } catch {
      throw new RankedSessionOrchestrationError("ranked_local_start_failed");
    }
    if (opened.status !== "ready") {
      throw new RankedSessionOrchestrationError("ranked_local_start_failed");
    }
    await this.#removeIntent(intent.operationId);
    return opened.session;
  }

  async #requestStart(
    intent: RankedStartIntent,
    account: AccountSessionV1,
  ): Promise<{ data: RankedStartData; receivedAtMonotonicMs: number }> {
    let raw: unknown;
    try {
      raw = await this.#boundedGatewayCall(
        this.#options.gateway.start({
          accessToken: account.accessToken,
          operationId: intent.operationId,
          modeKey: intent.payload.modeKey,
        }),
      );
    } catch {
      throw new RankedSessionOrchestrationError("ranked_start_request_failed");
    }
    const receivedAtMonotonicMs = this.#readMonotonicClock();
    const data = parseStartResponse(
      raw,
      intent.operationId,
      intent.payload.modeKey,
    );
    try {
      await this.#options.database.freezeRankedStartIntent(
        this.#options.ownerKey,
        intent.operationId,
        startFingerprint(data),
      );
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? Reflect.get(error, "code")
          : null;
      throw new RankedSessionOrchestrationError(
        code === "ranked_start_response_conflict"
          ? "ranked_start_invalid_response"
          : "ranked_start_intent_write_failed",
      );
    }
    return {
      data,
      receivedAtMonotonicMs,
    };
  }

  async #requestAbandon(
    account: AccountSessionV1,
    intent: RankedAbandonIntent,
    ref: AccountChallengeRefV1,
  ): Promise<void> {
    try {
      await this.#boundedGatewayCall(
        this.#options.gateway.abandon({
          accessToken: account.accessToken,
          operationId: intent.operationId,
          challengeId: ref.challengeId,
          rankedSessionId: ref.rankedSessionId,
          rankedSessionToken: ref.token,
        }),
      );
    } catch {
      throw new RankedSessionOrchestrationError("ranked_abandon_failed");
    }
  }

  async #resumePendingAbandons(account: AccountSessionV1): Promise<void> {
    const outbox = await this.#options.database.listOutbox(
      this.#options.ownerKey,
    );
    const starts = outbox.filter(
      (item): item is RankedStartIntent => item.kind === "ranked.session_start",
    );
    const abandons = outbox.filter(
      (item): item is RankedAbandonIntent => item.kind === "ranked.abandon",
    );
    for (const abandon of abandons) {
      const start = starts.find(
        (intent) =>
          intent.payload.frozen?.challengeId === abandon.payload.challengeId,
      );
      let ref =
        account.challengeRefs.find(
          (candidate) => candidate.challengeId === abandon.payload.challengeId,
        ) ?? null;
      if (!ref && start) {
        const response = await this.#requestStart(start, account);
        if (response.data.status !== ACTIVE_RANKED_STATUS) {
          await this.#cleanInactiveStart(start, response.data);
          continue;
        }
        ref = challengeRef(response.data);
      }
      if (!ref) {
        if (
          !(await this.#hasRankedSaveForChallenge(abandon.payload.challengeId))
        ) {
          await this.#removeIntent(abandon.operationId);
          continue;
        }
        throw new RankedSessionOrchestrationError("ranked_challenge_missing");
      }
      await this.#deleteRankedSaveForChallenge(ref);
      await this.#requestAbandon(account, abandon, ref);
      await this.#removeChallenge(ref.challengeId);
      await this.#removeIntent(abandon.operationId);
      if (start) await this.#removeIntent(start.operationId);
    }
  }

  async #hasRankedSaveForChallenge(challengeId: string): Promise<boolean> {
    for (const modeKey of APP_MODE_KEYS) {
      const stored = await this.#options.database.getSave(
        this.#options.ownerKey,
        modeKey,
      );
      if (stored.status === "missing") continue;
      if (stored.status !== "ok") {
        throw new RankedSessionOrchestrationError("ranked_save_conflict");
      }
      if (
        stored.save.gameKind === "ranked" &&
        stored.save.snapshot.state.challengeId === challengeId
      ) {
        return true;
      }
    }
    return false;
  }

  async #deleteRankedSaveForChallenge(
    ref: AccountChallengeRefV1,
  ): Promise<void> {
    let matched = false;
    for (const modeKey of APP_MODE_KEYS) {
      const stored = await this.#options.database.getSave(
        this.#options.ownerKey,
        modeKey,
      );
      if (stored.status === "missing") continue;
      if (stored.status !== "ok") {
        throw new RankedSessionOrchestrationError("ranked_save_conflict");
      }
      if (stored.save.gameKind !== "ranked") continue;
      const challengeId = stored.save.snapshot.state.challengeId;
      const sameChallenge = challengeId === ref.challengeId;
      const sameSession = stored.save.rankedSessionId === ref.rankedSessionId;
      if (!sameChallenge && !sameSession) continue;
      if (matched || !sameChallenge || !sameSession) {
        throw new RankedSessionOrchestrationError("ranked_save_conflict");
      }
      matched = true;
      const deleted = await this.#options.database.deleteSave({
        ownerKey: this.#options.ownerKey,
        modeKey,
        expectedClientRecordId: stored.save.clientRecordId,
        expectedGeneration: stored.save.generation,
        closedAt: this.#readWallClock(),
      });
      if (deleted === "stale") {
        throw new RankedSessionOrchestrationError("ranked_save_conflict");
      }
    }
  }

  async #tryAbandonUnstored(
    account: AccountSessionV1,
    startIntent: RankedStartIntent,
    data: RankedStartData,
  ): Promise<void> {
    try {
      const ref = challengeRef(data);
      const abandon = await this.#ensureAbandonIntent(ref.challengeId);
      await this.#requestAbandon(account, abandon, ref);
      await this.#removeChallenge(ref.challengeId).catch(() => undefined);
      await this.#removeIntent(abandon.operationId);
      await this.#removeIntent(startIntent.operationId);
    } catch {
      // Both intents remain durable for explicit startup recovery.
    }
  }

  async #cleanInactiveStart(
    intent: RankedStartIntent,
    data: RankedStartData,
  ): Promise<void> {
    if (
      data.status !== "consumed" &&
      data.status !== "expired" &&
      data.status !== "abandoned"
    ) {
      throw new RankedSessionOrchestrationError("ranked_start_inactive");
    }
    const abandon = (
      await this.#options.database.listOutbox(this.#options.ownerKey)
    ).find(
      (item): item is RankedAbandonIntent =>
        item.kind === "ranked.abandon" &&
        item.payload.challengeId === data.challengeId,
    );
    await this.#removeChallenge(data.challengeId);
    if (abandon) await this.#removeIntent(abandon.operationId);
    await this.#removeIntent(intent.operationId);
  }

  async #persistChallenge(data: RankedStartData): Promise<void> {
    const nextRef = challengeRef(data);
    await updateAccountSession(this.#options.secureStorage, (current) => {
      this.#assertAccountSession(current);
      const conflict = current.challengeRefs.find(
        (candidate) =>
          candidate.challengeId === nextRef.challengeId ||
          candidate.rankedSessionId === nextRef.rankedSessionId,
      );
      if (conflict) {
        if (!sameChallenge(conflict, nextRef)) {
          throw new RankedSessionOrchestrationError(
            "ranked_start_invalid_response",
          );
        }
        return current;
      }
      return {
        ...current,
        challengeRefs: [...current.challengeRefs, nextRef],
      };
    });
  }

  async #removeChallenge(challengeId: string): Promise<void> {
    await removeAccountChallengeRef(
      this.#options.secureStorage,
      {
        userId: Number(this.#options.ownerKey.slice("user:".length)),
        establishedAtMs: this.#options.identityEstablishedAtMs,
      },
      challengeId,
    );
  }

  async #requireAccountSession(): Promise<AccountSessionV1> {
    let session: AccountSessionV1 | null;
    try {
      session = await loadAccountSession(this.#options.secureStorage);
    } catch {
      throw new RankedSessionOrchestrationError("account_session_missing");
    }
    this.#assertAccountSession(session);
    return session;
  }

  #assertAccountSession(
    session: AccountSessionV1 | null,
  ): asserts session is AccountSessionV1 {
    if (!session) {
      throw new RankedSessionOrchestrationError("account_session_missing");
    }
    if (
      `user:${session.user.id}` !== this.#options.ownerKey ||
      session.persistentIdentity.establishedAtMs !==
        this.#options.identityEstablishedAtMs
    ) {
      throw new RankedSessionOrchestrationError("owner_mismatch");
    }
  }

  async #getOrCreateStartIntent(
    modeKey: AppModeKey,
  ): Promise<RankedStartIntent> {
    const operationId = (
      this.#options.createOperationId ??
      (() => `ranked.start:${randomHex(16, { requireCrypto: true })}`)
    )();
    if (!OPERATION_ID_PATTERN.test(operationId)) {
      throw new RankedSessionOrchestrationError("invalid_input");
    }
    const atMs = this.#readWallClock();
    const intent: RankedStartIntent = {
      schemaVersion: APP_DATABASE_SCHEMA_VERSION,
      operationId,
      ownerKey: this.#options.ownerKey,
      kind: "ranked.session_start",
      clientRecordId: null,
      payload: { modeKey },
      attemptCount: 0,
      nextAttemptAt: atMs,
      lastErrorCode: null,
      createdAt: atMs,
      updatedAt: atMs,
    };
    try {
      return await this.#options.database.getOrCreateRankedStartIntent(intent);
    } catch {
      throw new RankedSessionOrchestrationError(
        "ranked_start_intent_write_failed",
      );
    }
  }

  async #findStartIntent(
    modeKey: AppModeKey,
  ): Promise<RankedStartIntent | null> {
    const starts = (
      await this.#options.database.listOutbox(this.#options.ownerKey)
    ).filter(
      (item): item is RankedStartIntent =>
        item.kind === "ranked.session_start" &&
        item.payload.modeKey === modeKey,
    );
    if (starts.length > 1) {
      throw new RankedSessionOrchestrationError("ranked_start_intent_conflict");
    }
    return starts[0] ?? null;
  }

  async #requireStartIntent(operationId: string): Promise<RankedStartIntent> {
    if (!OPERATION_ID_PATTERN.test(operationId)) {
      throw new RankedSessionOrchestrationError("invalid_input");
    }
    const intent = (
      await this.#options.database.listOutbox(this.#options.ownerKey)
    ).find(
      (item): item is RankedStartIntent =>
        item.kind === "ranked.session_start" &&
        item.operationId === operationId,
    );
    if (!intent) {
      throw new RankedSessionOrchestrationError("ranked_pending_start_missing");
    }
    return intent;
  }

  #assertUniqueStartModes(starts: RankedStartIntent[]): void {
    if (
      new Set(starts.map((intent) => intent.payload.modeKey)).size !==
      starts.length
    ) {
      throw new RankedSessionOrchestrationError("ranked_start_intent_conflict");
    }
  }

  async #ensureAbandonIntent(
    challengeId: string,
  ): Promise<RankedAbandonIntent> {
    const operationId = `ranked.abandon:${challengeId}`;
    const existing = (
      await this.#options.database.listOutbox(this.#options.ownerKey)
    ).find(
      (item): item is RankedAbandonIntent =>
        item.kind === "ranked.abandon" && item.operationId === operationId,
    );
    if (existing) {
      if (existing.payload.challengeId !== challengeId) {
        throw new RankedSessionOrchestrationError(
          "ranked_start_intent_conflict",
        );
      }
      return existing;
    }
    const atMs = this.#readWallClock();
    const intent: RankedAbandonIntent = {
      schemaVersion: APP_DATABASE_SCHEMA_VERSION,
      operationId,
      ownerKey: this.#options.ownerKey,
      kind: "ranked.abandon",
      clientRecordId: null,
      payload: { challengeId },
      attemptCount: 0,
      nextAttemptAt: atMs,
      lastErrorCode: null,
      createdAt: atMs,
      updatedAt: atMs,
    };
    await this.#options.database.enqueueOutbox(intent);
    return intent;
  }

  async #removeIntent(operationId: string): Promise<void> {
    let removed: boolean;
    try {
      removed = await this.#options.database.removeOutbox(
        this.#options.ownerKey,
        operationId,
      );
    } catch {
      throw new RankedSessionOrchestrationError("ranked_intent_cleanup_failed");
    }
    if (!removed) {
      throw new RankedSessionOrchestrationError("ranked_intent_cleanup_failed");
    }
  }

  #rankedLocalOptions(
    modeKey: AppModeKey,
    save: StoredGameSave,
    ref: AccountChallengeRefV1,
    serverNowMs: number,
    serverNowReceivedAtMonotonicMs: number,
  ) {
    return {
      database: this.#options.database,
      ownerKey: this.#options.ownerKey,
      modeKey,
      gameKind: "ranked" as const,
      rankedSessionId: ref.rankedSessionId,
      challengeId: ref.challengeId,
      startedAtMs: save.snapshot.state.startedAtMs,
      serverNowMs,
      serverNowReceivedAtMonotonicMs,
      terminalPolicy: terminalPolicy(modeKey),
      createSeed: () => save.snapshot.state.seed,
      clockSources: this.#options.clockSources,
      ...(this.#options.createClientRecordId
        ? { createClientRecordId: this.#options.createClientRecordId }
        : {}),
    };
  }

  #readWallClock(): number {
    const value = this.#options.clockSources.wallNow();
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > Number.MAX_SAFE_INTEGER
    ) {
      throw new RankedSessionOrchestrationError("invalid_input");
    }
    return Math.ceil(value);
  }

  #readMonotonicClock(): number {
    const value = this.#options.clockSources.performanceNow();
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > Number.MAX_SAFE_INTEGER
    ) {
      throw new RankedSessionOrchestrationError("invalid_input");
    }
    return value;
  }

  #boundedGatewayCall<T>(operation: Promise<T>): Promise<T> {
    const timeoutMs =
      this.#options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const timeout = globalThis.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("ranked_gateway_timeout"));
      }, timeoutMs);
      void operation.then(
        (value) => {
          if (settled) return;
          settled = true;
          globalThis.clearTimeout(timeout);
          resolve(value);
        },
        (error: unknown) => {
          if (settled) return;
          settled = true;
          globalThis.clearTimeout(timeout);
          reject(error);
        },
      );
    });
  }

  #runOwnerWork<T>(work: () => T | Promise<T>): Promise<T> {
    return this.#options.workGate.run(this.#options.ownerKey, work);
  }
}

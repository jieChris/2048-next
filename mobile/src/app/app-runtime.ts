import type { GameDirection } from "../../../src/contracts";
import {
  type AppDatabase,
  type SaveReadResult,
  type StoredGameRecord,
} from "../data/app-database";
import {
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
  type OpenGuestStandardSessionResult,
} from "../game/guest-session";

export type GuestAppRuntimeDatabase = GuestSessionDatabase &
  Pick<
    AppDatabase,
    | "open"
    | "listPendingOwnerClears"
    | "completeOwnerClear"
    | "getRecord"
    | "listRecords"
    | "deleteGuestRecord"
  >;

export interface GuestAppRuntimeOptions extends Omit<
  GuestSessionOptions,
  "database"
> {
  database: GuestAppRuntimeDatabase;
  secureStorage: Pick<SecureStorage, "get" | "delete">;
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export class GuestAppRuntime {
  readonly #database: GuestAppRuntimeDatabase;
  readonly #sessionOptions: GuestSessionOptions;
  readonly #startup: OwnerCleanupStartupResult;
  #guestSave: SaveReadResult;
  #guestRecords: StoredGameRecord[];
  #activeSession: GuestGameSession | null = null;
  #lastSummaryError: unknown | null = null;

  private constructor(
    options: GuestAppRuntimeOptions,
    startup: OwnerCleanupStartupResult,
    guestSave: SaveReadResult,
    guestRecords: StoredGameRecord[],
  ) {
    this.#database = options.database;
    this.#sessionOptions = {
      database: options.database,
      ...(options.clockSources ? { clockSources: options.clockSources } : {}),
      ...(options.createClientRecordId
        ? { createClientRecordId: options.createClientRecordId }
        : {}),
      ...(options.createSeed ? { createSeed: options.createSeed } : {}),
    };
    this.#startup = startup;
    this.#guestSave = cloneValue(guestSave);
    this.#guestRecords = cloneValue(guestRecords);
  }

  static async bootstrap(
    options: GuestAppRuntimeOptions,
  ): Promise<GuestAppRuntime> {
    const startup = await restoreOwnerCleanupAtStartup({
      database: options.database,
      secureStorage: options.secureStorage,
    });

    // This local-only summary is intentionally read after owner cleanup. Even
    // when secure storage forces offline-only mode, no auth or HTTP module exists
    // on this stage-5 path and guest IndexedDB data remains usable.
    const [guestSave, guestRecords] = await Promise.all([
      options.database.getSave("guest", GUEST_STANDARD_MODE_KEY),
      options.database.listRecords("guest"),
    ]);
    return new GuestAppRuntime(options, startup, guestSave, guestRecords);
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

  async enterGuestStandard(): Promise<OpenGuestStandardSessionResult> {
    if (this.#activeSession) {
      return {
        status: "ready",
        restored: true,
        session: this.#activeSession,
      };
    }
    const opened = await openGuestStandardSession(this.#sessionOptions);
    if (opened.status === "ready") {
      this.#activeSession = opened.session;
      this.#guestSave = {
        status: "ok",
        save: cloneValue(opened.session.currentSave),
      };
    } else {
      this.#guestSave = cloneValue(opened);
    }
    return opened;
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
    await session.leave();
    this.#activeSession = null;
    const finalized = session.finalizedRecord;
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
    const replacement = await this.#requireActiveSession().restart();
    this.#activeSession = replacement;
    this.#guestSave = {
      status: "ok",
      save: cloneValue(replacement.currentSave),
    };
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

  #applyFinalizedRecord(record: StoredGameRecord): void {
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

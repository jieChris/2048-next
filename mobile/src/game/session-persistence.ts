import type { GameSnapshot } from "../../../src/contracts";
import type { AppDatabase, StoredGameSave } from "../data/app-database";

type SaveWriteResult = Awaited<ReturnType<AppDatabase["putSave"]>>;
type PutSavePort = Pick<AppDatabase, "putSave">;

function cloneSave(save: StoredGameSave): StoredGameSave {
  if (typeof structuredClone === "function") return structuredClone(save);
  return JSON.parse(JSON.stringify(save)) as StoredGameSave;
}

function assertTimestamp(atMs: number, lowerBoundMs: number): void {
  if (!Number.isSafeInteger(atMs) || atMs < lowerBoundMs) {
    throw new RangeError("session_persistence_timestamp_rollback");
  }
}

function persistedTimestamp(value: number | null, name: string): number {
  if (value === null) return 0;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
  return value;
}

function addTimestampDuration(startedAtMs: number, durationMs: number): number {
  return durationMs >= Number.MAX_SAFE_INTEGER - startedAtMs
    ? Number.MAX_SAFE_INTEGER
    : startedAtMs + durationMs;
}

const OWNERSHIP_CONFLICT_CODES = new Set([
  "owner_clearing",
  "save_revision_conflict",
  "save_game_conflict",
  "save_game_closed",
]);

function isOwnershipConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const code = Reflect.get(error, "code");
  return typeof code === "string" && OWNERSHIP_CONFLICT_CODES.has(code);
}

function ownershipLostError(cause?: unknown): Error {
  return cause === undefined
    ? new Error("session_persistence_ownership_lost")
    : new Error("session_persistence_ownership_lost", { cause });
}

export class GameSessionPersistence {
  readonly #exportSnapshot: (atMs: number) => GameSnapshot;
  readonly #savePort: PutSavePort;
  #active = true;
  #ownershipLost = false;
  #currentSave: StoredGameSave;
  #idle: Promise<SaveWriteResult | undefined> = Promise.resolve(undefined);
  #latestLogicalAtMs: number;
  #latestWallClockAtMs: number;
  #pendingFlushes = 0;
  #tail: Promise<void> = Promise.resolve();

  constructor(
    initialSave: StoredGameSave,
    exportSnapshot: (atMs: number) => GameSnapshot,
    savePort: PutSavePort,
  ) {
    this.#currentSave = cloneSave(initialSave);
    const startedAtMs = persistedTimestamp(
      initialSave.snapshot.state.startedAtMs,
      "startedAtMs",
    );
    const durationMs = persistedTimestamp(
      initialSave.snapshot.state.durationMs,
      "durationMs",
    );
    this.#latestLogicalAtMs = Math.max(
      persistedTimestamp(initialSave.snapshot.savedAtMs, "savedAtMs"),
      persistedTimestamp(
        initialSave.snapshot.state.lastEventAtMs,
        "lastEventAtMs",
      ),
      initialSave.snapshot.state.startedAtMs === null
        ? 0
        : addTimestampDuration(startedAtMs, durationMs),
    );
    this.#latestWallClockAtMs = persistedTimestamp(
      initialSave.lastClosedAt,
      "lastClosedAt",
    );
    this.#exportSnapshot = exportSnapshot;
    this.#savePort = savePort;
  }

  get currentSave(): Readonly<StoredGameSave> {
    return cloneSave(this.#currentSave);
  }

  get idle(): Promise<SaveWriteResult | undefined> {
    return this.#idle;
  }

  saveAction(
    logicalAtMs: number,
    wallClockAtMs: number,
  ): Promise<SaveWriteResult> {
    this.#assertActive();
    if (this.#pendingFlushes > 0) {
      throw new Error("session_persistence_flushing");
    }
    assertTimestamp(logicalAtMs, this.#latestLogicalAtMs);
    const closedAtMs = Math.max(
      this.#latestWallClockAtMs,
      persistedTimestamp(wallClockAtMs, "wallClockAtMs"),
    );
    if (this.#currentSave.revision === Number.MAX_SAFE_INTEGER) {
      throw new RangeError("session_persistence_revision_exhausted");
    }
    const snapshot = this.#exportSnapshot(logicalAtMs);
    this.#latestLogicalAtMs = logicalAtMs;
    this.#latestWallClockAtMs = closedAtMs;
    const save = {
      ...this.#currentSave,
      revision: this.#currentSave.revision + 1,
      lastClosedAt: closedAtMs,
      snapshot,
    };
    this.#currentSave = save;
    return this.#enqueue(() => this.#savePort.putSave(cloneSave(save)));
  }

  async flush(
    logicalAtMs: number,
    wallClockAtMs: number,
  ): Promise<SaveWriteResult> {
    this.#assertActive();
    assertTimestamp(logicalAtMs, this.#latestLogicalAtMs);
    const closedAtMs = Math.max(
      this.#latestWallClockAtMs,
      persistedTimestamp(wallClockAtMs, "wallClockAtMs"),
    );
    this.#latestLogicalAtMs = logicalAtMs;
    this.#latestWallClockAtMs = closedAtMs;
    this.#pendingFlushes += 1;
    try {
      return await this.#enqueue(() => {
        const snapshot = this.#exportSnapshot(logicalAtMs);
        const save = {
          ...this.#currentSave,
          lastClosedAt: closedAtMs,
          snapshot,
        };
        this.#currentSave = save;
        return this.#savePort.putSave(cloneSave(save));
      });
    } finally {
      this.#pendingFlushes -= 1;
    }
  }

  deactivate(): void {
    this.#active = false;
  }

  #assertActive(): void {
    if (this.#ownershipLost) throw ownershipLostError();
    if (!this.#active) throw new Error("session_persistence_inactive");
  }

  #enqueue(task: () => Promise<SaveWriteResult>): Promise<SaveWriteResult> {
    const operation = this.#tail.then(async () => {
      if (this.#ownershipLost) throw ownershipLostError();
      let result: SaveWriteResult;
      try {
        result = await task();
      } catch (error) {
        if (isOwnershipConflict(error)) {
          this.#ownershipLost = true;
          this.#active = false;
          throw ownershipLostError(error);
        }
        throw error;
      }
      if (result === "stale") {
        this.#ownershipLost = true;
        this.#active = false;
        throw ownershipLostError();
      }
      return result;
    });
    this.#tail = operation.then(
      () => undefined,
      () => undefined,
    );
    this.#idle = operation;
    void operation.catch(() => undefined);
    return operation;
  }
}

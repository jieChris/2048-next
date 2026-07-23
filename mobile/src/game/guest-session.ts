import {
  calculateHistoryBoardSum,
  type AppModeKey,
  type GameDirection,
  type GameSnapshot,
  type GameState,
  type GameTransition,
} from "../../../src/contracts";
import {
  createEngineSession,
  getBestTileValue,
} from "../../../src/core/engine";
import { randomId, randomSeed } from "../../../src/utils/crypto-random";
import {
  APP_DATABASE_SCHEMA_VERSION,
  type AppDatabase,
  type AppOwnerKey,
  type GameKind,
  type SaveReadResult,
  type StartNewGameInput,
  type StoredGameRecord,
  type StoredGameSave,
  type StoredOutboxItem,
} from "../data/app-database";
import {
  createSessionClock,
  type SessionClock,
  type SessionClockSources,
} from "./session-clock";
import { GameSessionPersistence } from "./session-persistence";

export const GUEST_STANDARD_MODE_KEY = "standard_4x4_pow2_no_undo" as const;

export type LocalSessionDatabase = Pick<
  AppDatabase,
  "getSave" | "startNewGame" | "putSave" | "deleteSave" | "finalizeTerminal"
>;

export type GuestSessionDatabase = LocalSessionDatabase;

export type GuestInputFence =
  | "background"
  | "dialog"
  | "closing"
  | "terminal"
  | "storage_error";

export interface GuestSessionOptions {
  database: GuestSessionDatabase;
  clockSources?: SessionClockSources;
  createClientRecordId?: () => string;
  createSeed?: () => number;
}

export type LocalTerminalPolicy = "immediate" | "pending_undo";

export interface LocalSessionOptions extends GuestSessionOptions {
  ownerKey: AppOwnerKey;
  modeKey: AppModeKey;
  gameKind: GameKind;
  rankedSessionId: string | null;
  challengeId: string | null;
  startedAtMs: number | null;
  serverNowMs: number | null;
  serverNowReceivedAtMonotonicMs: number | null;
  terminalPolicy: LocalTerminalPolicy;
}

export type OpenGuestStandardSessionResult =
  | {
      status: "ready";
      restored: boolean;
      session: LocalGameSession;
    }
  | Extract<SaveReadResult, { status: "corrupt" | "future_schema" }>;

export type OpenLocalSessionResult =
  | {
      status: "ready";
      restored: boolean;
      session: LocalGameSession;
    }
  | Extract<SaveReadResult, { status: "corrupt" | "future_schema" }>;

type SaveWriteResult = Awaited<
  ReturnType<GameSessionPersistence["saveAction"]>
>;

interface GuestReplacementPlan {
  input: StartNewGameInput;
  expectedSave: StoredGameSave;
  oldSaveClosed: boolean;
}

export interface GuestMoveResult {
  transition: GameTransition;
  save: Promise<SaveWriteResult> | null;
  terminal: Promise<StoredGameRecord> | null;
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function readWallClock(sources?: SessionClockSources): number {
  const raw = sources?.wallNow() ?? Date.now();
  if (!Number.isFinite(raw) || raw < 0 || raw > Number.MAX_SAFE_INTEGER) {
    throw new RangeError("guest_session_invalid_wall_clock");
  }
  return Math.ceil(raw);
}

function readMonotonicClock(sources: SessionClockSources): number {
  const raw = sources.performanceNow();
  if (!Number.isFinite(raw) || raw < 0 || raw > Number.MAX_SAFE_INTEGER) {
    throw new RangeError("local_session_invalid_monotonic_clock");
  }
  return raw;
}

function createClock(
  save: StoredGameSave,
  sources?: SessionClockSources,
): SessionClock {
  return sources ? createSessionClock(save, sources) : createSessionClock(save);
}

function createDefaultClientRecordId(): string {
  return randomId("game", { length: 16, requireCrypto: true });
}

function createDefaultSeed(): number {
  return randomSeed({ requireCrypto: true });
}

function ownershipLostError(): Error {
  return new Error("guest_session_ownership_lost");
}

function createRecordOutbox(
  record: StoredGameRecord,
): StoredOutboxItem | undefined {
  if (record.ownerKey === "guest") return undefined;
  const operationId = `record.submit:${record.clientRecordId}`;
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    operationId,
    ownerKey: record.ownerKey,
    kind: "record.submit",
    clientRecordId: record.clientRecordId,
    payload: { clientRecordId: record.clientRecordId },
    attemptCount: 0,
    nextAttemptAt: record.endedAt,
    lastErrorCode: null,
    createdAt: record.endedAt,
    updatedAt: record.endedAt,
  };
}

function validateLocalSessionOptions(options: LocalSessionOptions): void {
  const ranked = options.gameKind === "ranked";
  if (
    options.ownerKey === "guest" &&
    (ranked || options.modeKey !== GUEST_STANDARD_MODE_KEY)
  ) {
    throw new Error("local_session_guest_mode_forbidden");
  }
  const hasRankedSessionId =
    typeof options.rankedSessionId === "string" &&
    options.rankedSessionId.trim().length > 0;
  const hasChallengeId =
    typeof options.challengeId === "string" &&
    options.challengeId.trim().length > 0;
  const hasStartedAt =
    Number.isSafeInteger(options.startedAtMs) &&
    Number(options.startedAtMs) >= 0;
  const hasServerNow =
    Number.isSafeInteger(options.serverNowMs) &&
    Number(options.serverNowMs) >= Number(options.startedAtMs);
  const hasServerNowReceipt =
    Number.isFinite(options.serverNowReceivedAtMonotonicMs) &&
    Number(options.serverNowReceivedAtMonotonicMs) >= 0 &&
    Number(options.serverNowReceivedAtMonotonicMs) <= Number.MAX_SAFE_INTEGER;
  if (
    ranked !== hasRankedSessionId ||
    ranked !== hasChallengeId ||
    ranked !== hasStartedAt ||
    ranked !== hasServerNow ||
    ranked !== hasServerNowReceipt ||
    (ranked && typeof options.createSeed !== "function") ||
    (ranked && !options.clockSources) ||
    (!ranked &&
      (options.rankedSessionId !== null ||
        options.challengeId !== null ||
        options.startedAtMs !== null ||
        options.serverNowMs !== null ||
        options.serverNowReceivedAtMonotonicMs !== null))
  ) {
    throw new Error("local_session_invalid_refs");
  }
  if (
    (options.modeKey === "classic_4x4_pow2_undo") !==
    (options.terminalPolicy === "pending_undo")
  ) {
    throw new Error("local_session_invalid_terminal_policy");
  }
}

function createNewLocalSaveInput(
  options: LocalSessionOptions,
): StartNewGameInput {
  validateLocalSessionOptions(options);
  const wallAt = readWallClock(options.clockSources);
  const logicalAt =
    options.gameKind === "ranked"
      ? Math.min(
          Number.MAX_SAFE_INTEGER,
          Number(options.serverNowMs) +
            Math.floor(
              Math.max(
                0,
                readMonotonicClock(options.clockSources!) -
                  Number(options.serverNowReceivedAtMonotonicMs),
              ),
            ),
        )
      : wallAt;
  const seed = (options.createSeed ?? createDefaultSeed)();
  const clientRecordId = (
    options.createClientRecordId ?? createDefaultClientRecordId
  )();
  const engine = createEngineSession({
    modeKey: options.modeKey,
    seed,
    startedAtMs: options.startedAtMs,
    challengeId: options.challengeId,
  });
  engine.init();
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    ownerKey: options.ownerKey,
    modeKey: options.modeKey,
    clientRecordId,
    lifecycle: "active",
    gameKind: options.gameKind,
    revision: 0,
    lastClosedAt: wallAt,
    rankedSessionId: options.rankedSessionId,
    snapshot: engine.exportState(logicalAt),
  };
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || left === null) return false;
  if (typeof right !== "object" || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return (
      left.length === right.length &&
      left.every((value, index) => structurallyEqual(value, right[index]))
    );
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        structurallyEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

function isExpectedReplacementSave(
  save: StoredGameSave,
  expected: StoredGameSave,
): boolean {
  return structurallyEqual(save, expected);
}

async function createNewLocalSession(
  options: LocalSessionOptions,
): Promise<LocalGameSession> {
  const save = await options.database.startNewGame(
    createNewLocalSaveInput(options),
  );
  return LocalGameSession.restore(save, options);
}

export async function openLocalSession(
  options: LocalSessionOptions,
): Promise<OpenLocalSessionResult> {
  validateLocalSessionOptions(options);
  const stored = await options.database.getSave(
    options.ownerKey,
    options.modeKey,
  );
  if (stored.status === "corrupt" || stored.status === "future_schema") {
    return stored;
  }
  if (stored.status === "ok") {
    return {
      status: "ready",
      restored: true,
      session: LocalGameSession.restore(stored.save, options),
    };
  }
  return {
    status: "ready",
    restored: false,
    session: await createNewLocalSession(options),
  };
}

export async function openGuestStandardSession(
  options: GuestSessionOptions,
): Promise<OpenGuestStandardSessionResult> {
  return openLocalSession({
    ...options,
    ownerKey: "guest",
    modeKey: GUEST_STANDARD_MODE_KEY,
    gameKind: "normal",
    rankedSessionId: null,
    challengeId: null,
    startedAtMs: null,
    serverNowMs: null,
    serverNowReceivedAtMonotonicMs: null,
    terminalPolicy: "immediate",
  });
}

export class LocalGameSession {
  readonly #database: LocalSessionDatabase;
  readonly #options: LocalSessionOptions;
  readonly #clock: SessionClock;
  readonly #engine: ReturnType<typeof createEngineSession>;
  #persistence: GameSessionPersistence;
  readonly #inputFences = new Set<GuestInputFence>();
  #closed = false;
  #terminalSave: StoredGameSave | null = null;
  #terminalRecord: StoredGameRecord | null = null;
  #finalizedRecord: StoredGameRecord | null = null;
  #terminalDrain: Promise<void> | null = null;
  #terminalCheckpointConfirmed = false;
  #terminalCheckpointInFlight: Promise<void> | null = null;
  #terminalInFlight: Promise<StoredGameRecord> | null = null;
  #replacementPlan: GuestReplacementPlan | null = null;
  #restartInFlight: Promise<LocalGameSession> | null = null;

  #pendingTerminalSave: StoredGameSave | null = null;
  #pendingTerminalCheckpointConfirmed = false;
  #pendingTerminalCheckpointInFlight: Promise<SaveWriteResult> | null = null;
  #pendingUndoTransition: GameTransition | null = null;
  #pendingUndoSave: StoredGameSave | null = null;
  #pendingUndoInFlight: Promise<GameTransition> | null = null;
  #pendingTerminalResolution: "undo" | "confirm" | null = null;

  private constructor(save: StoredGameSave, options: LocalSessionOptions) {
    this.#database = options.database;
    this.#options = options;
    this.#engine = createEngineSession({
      modeKey: options.modeKey,
      seed: save.snapshot.state.seed,
      startedAtMs: save.snapshot.state.startedAtMs,
      challengeId: save.snapshot.state.challengeId,
    });
    this.#engine.load(save.snapshot);
    this.#clock = createClock(save, options.clockSources);
    this.#persistence = new GameSessionPersistence(
      save,
      (atMs) => this.#engine.exportState(atMs),
      this.#database,
    );
    if (save.lifecycle === "pending_terminal") {
      this.#pendingTerminalSave = cloneValue(save);
      this.#pendingTerminalCheckpointConfirmed = true;
      this.#inputFences.add("terminal");
    }
  }

  static restore(
    save: StoredGameSave,
    options: LocalSessionOptions,
  ): LocalGameSession {
    validateLocalSessionOptions(options);
    if (
      save.ownerKey !== options.ownerKey ||
      save.modeKey !== options.modeKey ||
      save.gameKind !== options.gameKind ||
      save.rankedSessionId !== options.rankedSessionId ||
      save.snapshot.state.challengeId !== options.challengeId ||
      (options.gameKind === "ranked" &&
        save.snapshot.state.startedAtMs !== options.startedAtMs)
    ) {
      throw new Error("guest_session_invalid_save");
    }
    return new LocalGameSession(save, options);
  }

  get state(): GameState {
    return this.#engine.getState();
  }

  get currentSave(): Readonly<StoredGameSave> {
    const pending = this.#pendingUndoSave ?? this.#pendingTerminalSave;
    return pending ? cloneValue(pending) : this.#persistence.currentSave;
  }

  get pendingTerminal(): boolean {
    return this.#pendingTerminalSave !== null;
  }

  get inputFences(): ReadonlySet<GuestInputFence> {
    return new Set(this.#inputFences);
  }

  get inputLocked(): boolean {
    return this.#inputFences.size > 0;
  }

  get hasEffectiveMove(): boolean {
    return this.#engine.getState().steps > 0;
  }

  get terminalRecord(): StoredGameRecord | null {
    return this.#terminalRecord ? cloneValue(this.#terminalRecord) : null;
  }

  get finalizedRecord(): StoredGameRecord | null {
    return this.#finalizedRecord ? cloneValue(this.#finalizedRecord) : null;
  }

  addInputFence(reason: "dialog"): void {
    this.#inputFences.add(reason);
  }

  removeInputFence(reason: "dialog"): void {
    this.#inputFences.delete(reason);
  }

  elapsedMs(): number {
    const state = this.#engine.getState();
    if (state.startedAtMs === null) return 0;
    if (state.gameOver) return state.durationMs;
    return Math.max(state.durationMs, this.#clock.now() - state.startedAtMs);
  }

  move(direction: GameDirection): GuestMoveResult {
    this.#assertInteractive();
    const logicalAt = this.#clock.now();
    const wallAt = readWallClock(this.#options.clockSources);
    const transition = this.#engine.move({ direction, atMs: logicalAt });

    if (transition.gameOver) {
      if (
        this.#options.terminalPolicy === "pending_undo" &&
        transition.state.undoStack.length > 0
      ) {
        const save = this.#preparePendingTerminal(logicalAt, wallAt);
        return { transition, save, terminal: null };
      }
      const terminal = this.#prepareTerminal(logicalAt, wallAt);
      return { transition, save: null, terminal };
    }
    if (!transition.moved) {
      return { transition, save: null, terminal: null };
    }

    let save: Promise<SaveWriteResult>;
    try {
      save = this.#guardPersistence(
        this.#persistence.saveAction(logicalAt, wallAt),
      );
    } catch (error) {
      this.#inputFences.add("storage_error");
      save = Promise.reject(error);
      void save.catch(() => undefined);
    }
    return { transition, save, terminal: null };
  }

  async flush(): Promise<SaveWriteResult | void> {
    if (this.#pendingTerminalSave) {
      await this.#confirmPendingTerminalCheckpoint();
      return;
    }
    if (this.#terminalRecord) {
      await this.finalizeTerminal();
      return;
    }
    if (this.#closed) throw new Error("guest_session_closed");
    try {
      const result = await this.#persistence.flush(
        this.#clock.now(),
        readWallClock(this.#options.clockSources),
      );
      this.#inputFences.delete("storage_error");
      return result;
    } catch (error) {
      this.#inputFences.add("storage_error");
      throw error;
    }
  }

  async pause(): Promise<void> {
    this.#inputFences.add("background");
    await this.flush();
  }

  resume(): number {
    const logicalAt = this.#terminalRecord
      ? this.#clock.now()
      : this.#clock.resume();
    this.#inputFences.delete("background");
    return logicalAt;
  }

  async leave(): Promise<void> {
    this.#inputFences.add("closing");
    try {
      await this.flush();
      this.#persistence.deactivate();
      this.#closed = true;
    } catch (error) {
      this.#inputFences.add("storage_error");
      throw error;
    }
  }

  async restart(): Promise<LocalGameSession> {
    if (this.#closed) throw new Error("guest_session_closed");
    if (this.#options.gameKind === "ranked") {
      throw new Error("local_session_ranked_restart_requires_new_session");
    }
    if (this.#pendingTerminalSave) {
      throw new Error("guest_session_terminal_not_finalized");
    }
    if (this.#terminalRecord && !this.#finalizedRecord) {
      throw new Error("guest_session_terminal_not_finalized");
    }
    if (this.#restartInFlight) return this.#restartInFlight;
    this.#inputFences.add("closing");
    const operation = this.#restartFromFrozenPlan();
    this.#restartInFlight = operation;
    try {
      return await operation;
    } catch (error) {
      this.#inputFences.add("storage_error");
      throw error;
    } finally {
      if (this.#restartInFlight === operation) {
        this.#restartInFlight = null;
      }
    }
  }

  async #restartFromFrozenPlan(): Promise<LocalGameSession> {
    if (this.#persistence.ownershipLost) throw ownershipLostError();
    const current = this.#persistence.currentSave;
    const plan =
      this.#replacementPlan ??
      (this.#replacementPlan = this.#createReplacementPlan(current));

    if (!plan.oldSaveClosed) {
      this.#persistence.deactivate();
      await this.#persistence.idle.catch(() => undefined);
      if (this.#persistence.ownershipLost) throw ownershipLostError();
      const result = await this.#database.deleteSave({
        ownerKey: this.#options.ownerKey,
        modeKey: this.#options.modeKey,
        expectedClientRecordId: current.clientRecordId,
        expectedGeneration: current.generation,
        closedAt: readWallClock(this.#options.clockSources),
      });
      if (result === "stale") throw ownershipLostError();
      plan.oldSaveClosed = true;
    }

    const existing = await this.#database.getSave(
      this.#options.ownerKey,
      this.#options.modeKey,
    );
    if (existing.status === "ok") {
      if (!isExpectedReplacementSave(existing.save, plan.expectedSave)) {
        throw ownershipLostError();
      }
      return this.#activateReplacement(existing.save);
    }
    if (existing.status !== "missing") throw ownershipLostError();

    try {
      const save = await this.#database.startNewGame(cloneValue(plan.input));
      if (!isExpectedReplacementSave(save, plan.expectedSave)) {
        throw ownershipLostError();
      }
      return this.#activateReplacement(save);
    } catch (error) {
      let reconciled: SaveReadResult;
      try {
        reconciled = await this.#database.getSave(
          this.#options.ownerKey,
          this.#options.modeKey,
        );
      } catch {
        throw error;
      }
      if (reconciled.status === "missing") throw error;
      if (
        reconciled.status !== "ok" ||
        !isExpectedReplacementSave(reconciled.save, plan.expectedSave)
      ) {
        throw ownershipLostError();
      }
      return this.#activateReplacement(reconciled.save);
    }
  }

  #createReplacementPlan(current: StoredGameSave): GuestReplacementPlan {
    const input = createNewLocalSaveInput(this.#options);
    return {
      input: cloneValue(input),
      expectedSave: {
        ...cloneValue(input),
        generation: current.generation + 1,
      },
      oldSaveClosed: this.#finalizedRecord !== null,
    };
  }

  #activateReplacement(save: StoredGameSave): LocalGameSession {
    const replacement = LocalGameSession.restore(save, this.#options);
    this.#closed = true;
    this.#replacementPlan = null;
    return replacement;
  }

  async undoPendingTerminal(): Promise<GameTransition> {
    if (this.#closed) throw new Error("guest_session_closed");
    if (!this.#pendingTerminalSave) {
      throw new Error("guest_session_not_pending_terminal");
    }
    if (this.#pendingTerminalResolution === "confirm") {
      throw new Error("guest_session_terminal_resolution_conflict");
    }
    this.#pendingTerminalResolution = "undo";
    if (this.#pendingUndoInFlight) return this.#pendingUndoInFlight;

    const operation = (async () => {
      await this.#confirmPendingTerminalCheckpoint();
      const pendingSave = this.#pendingTerminalSave;
      if (!pendingSave) throw new Error("guest_session_not_pending_terminal");

      if (!this.#pendingUndoTransition || !this.#pendingUndoSave) {
        const logicalAt = this.#clock.now();
        const wallAt = readWallClock(this.#options.clockSources);
        const transition = this.#engine.undo({ atMs: logicalAt });
        if (!transition) throw new Error("guest_session_undo_unavailable");
        this.#pendingUndoTransition = transition;
        this.#pendingUndoSave = {
          ...cloneValue(pendingSave),
          lifecycle: "active",
          revision: pendingSave.revision + 1,
          lastClosedAt: Math.max(pendingSave.lastClosedAt, wallAt),
          snapshot: this.#engine.exportState(logicalAt),
        };
      }

      const result = await this.#database.putSave(
        cloneValue(this.#pendingUndoSave),
      );
      if (result === "stale") throw ownershipLostError();
      const activeSave = this.#pendingUndoSave;
      const transition = this.#pendingUndoTransition;
      this.#persistence = new GameSessionPersistence(
        activeSave,
        (atMs) => this.#engine.exportState(atMs),
        this.#database,
      );
      this.#pendingTerminalSave = null;
      this.#pendingTerminalCheckpointConfirmed = false;
      this.#pendingUndoSave = null;
      this.#pendingUndoTransition = null;
      this.#pendingTerminalResolution = null;
      this.#inputFences.delete("terminal");
      this.#inputFences.delete("storage_error");
      return transition;
    })();
    this.#pendingUndoInFlight = operation;
    try {
      return await operation;
    } catch (error) {
      this.#inputFences.add("storage_error");
      throw error;
    } finally {
      if (this.#pendingUndoInFlight === operation) {
        this.#pendingUndoInFlight = null;
      }
    }
  }

  async confirmPendingTerminal(): Promise<StoredGameRecord> {
    if (!this.#pendingTerminalSave) {
      if (this.#finalizedRecord) return cloneValue(this.#finalizedRecord);
      throw new Error("guest_session_not_pending_terminal");
    }
    if (this.#pendingTerminalResolution === "undo") {
      throw new Error("guest_session_terminal_resolution_conflict");
    }
    this.#pendingTerminalResolution = "confirm";
    await this.#confirmPendingTerminalCheckpoint();
    if (!this.#terminalRecord) {
      const save = this.#pendingTerminalSave;
      this.#terminalSave = cloneValue(save);
      this.#terminalRecord = this.#createTerminalRecord(
        save,
        save.snapshot,
        save.lastClosedAt,
      );
      this.#terminalDrain = Promise.resolve();
      this.#terminalCheckpointConfirmed = true;
      this.#persistence.deactivate();
    }
    return this.finalizeTerminal();
  }

  #preparePendingTerminal(
    logicalAt: number,
    wallAt: number,
  ): Promise<SaveWriteResult> {
    if (!this.#pendingTerminalSave) {
      const current = this.#persistence.currentSave;
      this.#pendingTerminalSave = {
        ...current,
        lifecycle: "pending_terminal",
        revision: current.revision + 1,
        lastClosedAt: Math.max(current.lastClosedAt, wallAt),
        snapshot: this.#engine.exportState(logicalAt),
      };
      this.#inputFences.add("terminal");
      this.#persistence.deactivate();
      this.#terminalDrain = this.#persistence.idle.then(
        () => undefined,
        () => undefined,
      );
    }
    const operation = this.#confirmPendingTerminalCheckpoint();
    void operation.catch(() => undefined);
    return operation;
  }

  #confirmPendingTerminalCheckpoint(): Promise<SaveWriteResult> {
    if (this.#pendingTerminalCheckpointConfirmed) {
      return Promise.resolve("unchanged");
    }
    if (this.#pendingTerminalCheckpointInFlight) {
      return this.#pendingTerminalCheckpointInFlight;
    }
    if (!this.#pendingTerminalSave || !this.#terminalDrain) {
      return Promise.reject(new Error("guest_session_not_pending_terminal"));
    }
    const save = this.#pendingTerminalSave;
    const operation = (async () => {
      await this.#terminalDrain;
      const result = await this.#database.putSave(cloneValue(save));
      if (result === "stale") throw ownershipLostError();
      this.#pendingTerminalCheckpointConfirmed = true;
      this.#inputFences.delete("storage_error");
      return result;
    })();
    this.#pendingTerminalCheckpointInFlight = operation;
    void operation.then(
      () => {
        if (this.#pendingTerminalCheckpointInFlight === operation) {
          this.#pendingTerminalCheckpointInFlight = null;
        }
      },
      () => {
        this.#inputFences.add("storage_error");
        if (this.#pendingTerminalCheckpointInFlight === operation) {
          this.#pendingTerminalCheckpointInFlight = null;
        }
      },
    );
    return operation;
  }

  finalizeTerminal(): Promise<StoredGameRecord> {
    if (this.#finalizedRecord) {
      return Promise.resolve(cloneValue(this.#finalizedRecord));
    }
    if (!this.#terminalRecord || !this.#terminalSave) {
      return Promise.reject(new Error("guest_session_not_terminal"));
    }
    if (this.#terminalInFlight) return this.#terminalInFlight;

    const record = this.#terminalRecord;
    const save = this.#terminalSave;
    const operation = (async () => {
      await this.#confirmTerminalCheckpoint();
      const result = await this.#database.finalizeTerminal({
        ownerKey: this.#options.ownerKey,
        modeKey: this.#options.modeKey,
        expectedSaveRevision: save.revision,
        record,
        outbox: createRecordOutbox(record),
      });
      this.#finalizedRecord = cloneValue(result.record);
      this.#pendingTerminalSave = null;
      this.#inputFences.delete("storage_error");
      return cloneValue(result.record);
    })();
    this.#terminalInFlight = operation;
    void operation.then(
      () => {
        if (this.#terminalInFlight === operation) {
          this.#terminalInFlight = null;
        }
      },
      () => {
        this.#inputFences.add("storage_error");
        if (this.#terminalInFlight === operation) {
          this.#terminalInFlight = null;
        }
      },
    );
    return operation;
  }

  #confirmTerminalCheckpoint(): Promise<void> {
    if (this.#terminalCheckpointConfirmed) return Promise.resolve();
    if (this.#terminalCheckpointInFlight) {
      return this.#terminalCheckpointInFlight;
    }
    if (!this.#terminalSave || !this.#terminalDrain) {
      return Promise.reject(new Error("guest_session_not_terminal"));
    }

    const save = this.#terminalSave;
    const operation = (async () => {
      await this.#terminalDrain;
      const result = await this.#database.putSave(cloneValue(save));
      if (result === "stale") throw ownershipLostError();
      this.#terminalCheckpointConfirmed = true;
    })();
    this.#terminalCheckpointInFlight = operation;
    void operation.then(
      () => {
        if (this.#terminalCheckpointInFlight === operation) {
          this.#terminalCheckpointInFlight = null;
        }
      },
      () => {
        if (this.#terminalCheckpointInFlight === operation) {
          this.#terminalCheckpointInFlight = null;
        }
      },
    );
    return operation;
  }

  #assertInteractive(): void {
    if (this.#closed) throw new Error("guest_session_closed");
    if (this.#inputFences.size > 0) {
      throw new Error("guest_session_input_locked");
    }
  }

  #guardPersistence(
    operation: Promise<SaveWriteResult>,
  ): Promise<SaveWriteResult> {
    const guarded = operation.catch((error: unknown) => {
      this.#inputFences.add("storage_error");
      throw error;
    });
    void guarded.catch(() => undefined);
    return guarded;
  }

  #createTerminalRecord(
    save: StoredGameSave,
    finalSnapshot: GameSnapshot,
    wallAt: number,
  ): StoredGameRecord {
    const state = finalSnapshot.state;
    return {
      schemaVersion: APP_DATABASE_SCHEMA_VERSION,
      clientRecordId: save.clientRecordId,
      ownerKey: this.#options.ownerKey,
      modeKey: this.#options.modeKey,
      source:
        this.#options.gameKind === "ranked"
          ? "ranked"
          : this.#options.ownerKey === "guest"
            ? "guest"
            : "normal",
      endedAt: Math.max(save.lastClosedAt, wallAt),
      score: state.score,
      bestTile: getBestTileValue(state.board),
      steps: state.steps,
      durationMs: state.durationMs,
      boardSum: calculateHistoryBoardSum(state.board),
      replay: this.#engine.exportReplay(),
      finalSnapshot,
      uploadStatus: this.#options.ownerKey === "guest" ? "local" : "pending",
    };
  }

  #prepareTerminal(
    logicalAt: number,
    wallAt: number,
  ): Promise<StoredGameRecord> {
    if (!this.#terminalRecord) {
      const save = this.#persistence.currentSave;
      const finalSnapshot = this.#engine.exportState(logicalAt);
      this.#terminalSave = cloneValue(save);
      this.#terminalRecord = this.#createTerminalRecord(
        save,
        finalSnapshot,
        wallAt,
      );
      this.#inputFences.add("terminal");
      this.#persistence.deactivate();
      this.#terminalDrain = this.#persistence.idle.then(
        () => undefined,
        () => undefined,
      );
    }
    const operation = this.finalizeTerminal();
    void operation.catch(() => undefined);
    return operation;
  }
}

export { LocalGameSession as GuestGameSession };

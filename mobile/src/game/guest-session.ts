import {
  calculateHistoryBoardSum,
  type GameDirection,
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
  type SaveReadResult,
  type StartNewGameInput,
  type StoredGameRecord,
  type StoredGameSave,
} from "../data/app-database";
import {
  createSessionClock,
  type SessionClock,
  type SessionClockSources,
} from "./session-clock";
import { GameSessionPersistence } from "./session-persistence";

export const GUEST_STANDARD_MODE_KEY = "standard_4x4_pow2_no_undo" as const;

export type GuestSessionDatabase = Pick<
  AppDatabase,
  "getSave" | "startNewGame" | "putSave" | "deleteSave" | "finalizeTerminal"
>;

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

export type OpenGuestStandardSessionResult =
  | {
      status: "ready";
      restored: boolean;
      session: GuestGameSession;
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

function createNewGuestSaveInput(
  options: GuestSessionOptions,
): StartNewGameInput {
  const wallAt = readWallClock(options.clockSources);
  const seed = (options.createSeed ?? createDefaultSeed)();
  const clientRecordId = (
    options.createClientRecordId ?? createDefaultClientRecordId
  )();
  const engine = createEngineSession({
    modeKey: GUEST_STANDARD_MODE_KEY,
    seed,
    startedAtMs: null,
    challengeId: null,
  });
  engine.init();
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    ownerKey: "guest",
    modeKey: GUEST_STANDARD_MODE_KEY,
    clientRecordId,
    lifecycle: "active",
    gameKind: "normal",
    revision: 0,
    lastClosedAt: wallAt,
    rankedSessionId: null,
    snapshot: engine.exportState(wallAt),
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

async function createNewGuestSession(
  options: GuestSessionOptions,
): Promise<GuestGameSession> {
  const save = await options.database.startNewGame(
    createNewGuestSaveInput(options),
  );
  return GuestGameSession.restore(save, options);
}

export async function openGuestStandardSession(
  options: GuestSessionOptions,
): Promise<OpenGuestStandardSessionResult> {
  const stored = await options.database.getSave(
    "guest",
    GUEST_STANDARD_MODE_KEY,
  );
  if (stored.status === "corrupt" || stored.status === "future_schema") {
    return stored;
  }
  if (stored.status === "ok") {
    return {
      status: "ready",
      restored: true,
      session: GuestGameSession.restore(stored.save, options),
    };
  }
  return {
    status: "ready",
    restored: false,
    session: await createNewGuestSession(options),
  };
}

export class GuestGameSession {
  readonly #database: GuestSessionDatabase;
  readonly #options: GuestSessionOptions;
  readonly #clock: SessionClock;
  readonly #engine: ReturnType<typeof createEngineSession>;
  readonly #persistence: GameSessionPersistence;
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
  #restartInFlight: Promise<GuestGameSession> | null = null;

  private constructor(save: StoredGameSave, options: GuestSessionOptions) {
    this.#database = options.database;
    this.#options = options;
    this.#engine = createEngineSession({
      modeKey: GUEST_STANDARD_MODE_KEY,
      seed: save.snapshot.state.seed,
      startedAtMs: save.snapshot.state.startedAtMs,
      challengeId: null,
    });
    this.#engine.load(save.snapshot);
    this.#clock = createClock(save, options.clockSources);
    this.#persistence = new GameSessionPersistence(
      save,
      (atMs) => this.#engine.exportState(atMs),
      this.#database,
    );
  }

  static restore(
    save: StoredGameSave,
    options: GuestSessionOptions,
  ): GuestGameSession {
    if (
      save.ownerKey !== "guest" ||
      save.modeKey !== GUEST_STANDARD_MODE_KEY ||
      save.gameKind !== "normal" ||
      save.rankedSessionId !== null ||
      save.snapshot.state.challengeId !== null
    ) {
      throw new Error("guest_session_invalid_save");
    }
    return new GuestGameSession(save, options);
  }

  get state(): GameState {
    return this.#engine.getState();
  }

  get currentSave(): Readonly<StoredGameSave> {
    return this.#persistence.currentSave;
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

  async restart(): Promise<GuestGameSession> {
    if (this.#closed) throw new Error("guest_session_closed");
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

  async #restartFromFrozenPlan(): Promise<GuestGameSession> {
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
        ownerKey: "guest",
        modeKey: GUEST_STANDARD_MODE_KEY,
        expectedClientRecordId: current.clientRecordId,
        expectedGeneration: current.generation,
        closedAt: readWallClock(this.#options.clockSources),
      });
      if (result === "stale") throw ownershipLostError();
      plan.oldSaveClosed = true;
    }

    const existing = await this.#database.getSave(
      "guest",
      GUEST_STANDARD_MODE_KEY,
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
          "guest",
          GUEST_STANDARD_MODE_KEY,
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
    const input = createNewGuestSaveInput(this.#options);
    return {
      input: cloneValue(input),
      expectedSave: {
        ...cloneValue(input),
        generation: current.generation + 1,
      },
      oldSaveClosed: this.#finalizedRecord !== null,
    };
  }

  #activateReplacement(save: StoredGameSave): GuestGameSession {
    const replacement = GuestGameSession.restore(save, this.#options);
    this.#closed = true;
    this.#replacementPlan = null;
    return replacement;
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
        ownerKey: "guest",
        modeKey: GUEST_STANDARD_MODE_KEY,
        expectedSaveRevision: save.revision,
        record,
      });
      this.#finalizedRecord = cloneValue(result.record);
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

  #prepareTerminal(
    logicalAt: number,
    wallAt: number,
  ): Promise<StoredGameRecord> {
    if (!this.#terminalRecord) {
      const save = this.#persistence.currentSave;
      const finalSnapshot = this.#engine.exportState(logicalAt);
      const state = finalSnapshot.state;
      const record: StoredGameRecord = {
        schemaVersion: APP_DATABASE_SCHEMA_VERSION,
        clientRecordId: save.clientRecordId,
        ownerKey: "guest",
        modeKey: GUEST_STANDARD_MODE_KEY,
        source: "guest",
        endedAt: Math.max(save.lastClosedAt, wallAt),
        score: state.score,
        bestTile: getBestTileValue(state.board),
        steps: state.steps,
        durationMs: state.durationMs,
        boardSum: calculateHistoryBoardSum(state.board),
        replay: this.#engine.exportReplay(),
        finalSnapshot,
        uploadStatus: "local",
      };
      this.#terminalSave = cloneValue(save);
      this.#terminalRecord = cloneValue(record);
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

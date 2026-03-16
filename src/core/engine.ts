import { getBestTileValue } from "./grid-scan";
import { normalizeReplaySeekTarget, planReplayStep } from "./replay-lifecycle";
import { parseReplayImportEnvelope } from "./replay-import";
import { decodeBoardV4, encodeBoardV4 } from "./replay-codec";
import { planTileInteraction } from "./move-apply";
import { computePostMoveLifecycle } from "./post-move";
import { computePostMoveScore } from "./scoring";
import { createUndoSnapshot } from "./undo-snapshot";
import { computeUndoRestoreState } from "./undo-restore";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Ruleset = "pow2" | "fibonacci";

export type Direction = 0 | 1 | 2 | 3;

export interface EngineConfig {
  width: number;
  height: number;
  ruleset: Ruleset;
  undoEnabled: boolean;
  maxTile?: number | null;
}

export interface EngineState {
  score: number;
  board: number[][];
  over: boolean;
  won: boolean;
  successfulMoveCount: number;
  undoUsed: number;
  comboStreak: number;
}

export interface MoveResult {
  moved: boolean;
  interactions: import("./move-apply").TileInteractionResult[];
  lifecycle: import("./post-move").PostMoveLifecycleResult;
  scoring: import("./scoring").PostMoveScoreResult;
}

export interface ExportedState {
  version: number;
  config: EngineConfig;
  state: EngineState;
  timestamp: string;
}


// ---------------------------------------------------------------------------
// Facade API — unified callable surface for page/runtime integration
// ---------------------------------------------------------------------------

export interface EngineFacade {
  planTileInteraction: typeof import("./move-apply").planTileInteraction;
  computePostMoveLifecycle: typeof import("./post-move").computePostMoveLifecycle;
  computePostMoveScore: typeof import("./scoring").computePostMoveScore;
  createUndoSnapshot: typeof import("./undo-snapshot").createUndoSnapshot;
  computeUndoRestoreState: typeof import("./undo-restore").computeUndoRestoreState;
  normalizeReplaySeekTarget: typeof import("./replay-lifecycle").normalizeReplaySeekTarget;
  planReplayStep: typeof import("./replay-lifecycle").planReplayStep;
  parseReplayImportEnvelope: typeof import("./replay-import").parseReplayImportEnvelope;
  encodeBoardV4: typeof import("./replay-codec").encodeBoardV4;
  decodeBoardV4: typeof import("./replay-codec").decodeBoardV4;
  getBestTileValue: typeof import("./grid-scan").getBestTileValue;
}

export function createEngineFacade(): EngineFacade {
  return {
    planTileInteraction,
    computePostMoveLifecycle,
    computePostMoveScore,
    createUndoSnapshot,
    computeUndoRestoreState,
    normalizeReplaySeekTarget,
    planReplayStep,
    parseReplayImportEnvelope,
    encodeBoardV4,
    decodeBoardV4,
    getBestTileValue
  };
}

// ---------------------------------------------------------------------------
// Facade API — unified callable surface for page/runtime integration
// ---------------------------------------------------------------------------

export interface EngineFacade {
  planTileInteraction: typeof import("./move-apply").planTileInteraction;
  computePostMoveLifecycle: typeof import("./post-move").computePostMoveLifecycle;
  computePostMoveScore: typeof import("./scoring").computePostMoveScore;
  createUndoSnapshot: typeof import("./undo-snapshot").createUndoSnapshot;
  computeUndoRestoreState: typeof import("./undo-restore").computeUndoRestoreState;
  normalizeReplaySeekTarget: typeof import("./replay-lifecycle").normalizeReplaySeekTarget;
  planReplayStep: typeof import("./replay-lifecycle").planReplayStep;
  parseReplayImportEnvelope: typeof import("./replay-import").parseReplayImportEnvelope;
  encodeBoardV4: typeof import("./replay-codec").encodeBoardV4;
  decodeBoardV4: typeof import("./replay-codec").decodeBoardV4;
  getBestTileValue: typeof import("./grid-scan").getBestTileValue;
}

type UndoSnapshotLike = Record<string, unknown> &
  ReturnType<typeof createUndoSnapshot> & {
    score?: unknown;
    tiles?: unknown;
  };

export interface EngineSession {
  init(initialState?: Partial<EngineState>): EngineState;
  load(snapshot: ExportedState): EngineState;
  move(input: {
    scoreAfterMerge: number;
    hasMovesAvailable: boolean;
    timerStatus: 0 | 1;
    comboMultiplier?: number;
  }): MoveResult & { state: EngineState };
  undo(input: {
    snapshot: UndoSnapshotLike;
    timerStatus: 0 | 1;
    fallbackUndoUsed: number;
  }): EngineState;
  replay(input: Parameters<typeof planReplayStep>[0]): ReturnType<typeof planReplayStep>;
  importReplay(
    input: Parameters<typeof parseReplayImportEnvelope>[0]
  ): ReturnType<typeof parseReplayImportEnvelope>;
  exportState(): ExportedState;
  getState(): EngineState;
}

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => row.slice());
}

function createEmptyBoard(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
}

function createInitialEngineState(config: EngineConfig): EngineState {
  return {
    score: 0,
    board: createEmptyBoard(config.width, config.height),
    over: false,
    won: false,
    successfulMoveCount: 0,
    undoUsed: 0,
    comboStreak: 0
  };
}

function assertBoardShape(board: number[][], config: EngineConfig, context: string): void {
  if (!Array.isArray(board) || board.length !== config.height) {
    throw new Error(`${context}: board row count mismatch`);
  }
  for (const row of board) {
    if (!Array.isArray(row) || row.length !== config.width) {
      throw new Error(`${context}: board column count mismatch`);
    }
  }
}

function sanitizeBoard(board: unknown, fallback: number[][]): number[][] {
  if (!Array.isArray(board)) return cloneBoard(fallback);
  const parsedRows = board.map((row) => {
    if (!Array.isArray(row)) return null;
    return row.map((value) => (Number.isFinite(value) ? Number(value) : 0));
  });
  if (parsedRows.some((row) => row === null)) return cloneBoard(fallback);
  return parsedRows as number[][];
}

function sanitizeStatePatch(patch: Partial<EngineState>, current: EngineState): Partial<EngineState> {
  const sanitized: Partial<EngineState> = { ...patch };
  if (typeof patch.score !== "number" || !Number.isFinite(patch.score)) {
    delete sanitized.score;
  }
  if (
    typeof patch.successfulMoveCount !== "number" ||
    !Number.isInteger(patch.successfulMoveCount) ||
    patch.successfulMoveCount < 0
  ) {
    delete sanitized.successfulMoveCount;
  }
  if (
    typeof patch.undoUsed !== "number" ||
    !Number.isInteger(patch.undoUsed) ||
    patch.undoUsed < 0
  ) {
    delete sanitized.undoUsed;
  }
  if (
    typeof patch.comboStreak !== "number" ||
    !Number.isInteger(patch.comboStreak) ||
    patch.comboStreak < 0
  ) {
    delete sanitized.comboStreak;
  }
  if (typeof patch.over !== "boolean") {
    delete sanitized.over;
  }
  if (typeof patch.won !== "boolean") {
    delete sanitized.won;
  }
  sanitized.board = patch.board ? sanitizeBoard(patch.board, current.board) : current.board;
  return sanitized;
}

function parseSnapshotScore(snapshot: UndoSnapshotLike): number {
  return Number.isFinite(snapshot.score) ? Number(snapshot.score) : 0;
}

export function createEngineSession(config: EngineConfig): EngineSession {
  let state = createInitialEngineState(config);

  function applyStatePatch(patch?: Partial<EngineState>, context = "engine"): EngineState {
    if (patch) {
      const sanitizedPatch = sanitizeStatePatch(patch, state);
      const nextState: EngineState = {
        ...state,
        ...sanitizedPatch,
        board: cloneBoard(sanitizedPatch.board ?? state.board)
      };
      assertBoardShape(nextState.board, config, context);
      state = nextState;
    }
    return {
      ...state,
      board: cloneBoard(state.board)
    };
  }

  return {
    init(initialState) {
      state = createInitialEngineState(config);
      return applyStatePatch(initialState, "engine.init");
    },
    load(snapshot) {
      if (snapshot.version !== 1) {
        throw new Error(`Unsupported engine snapshot version: ${String(snapshot.version)}`);
      }
      if (snapshot.config.width !== config.width || snapshot.config.height !== config.height) {
        throw new Error("Engine snapshot dimensions mismatch");
      }
      if (snapshot.config.ruleset !== config.ruleset) {
        throw new Error("Engine snapshot ruleset mismatch");
      }
      return applyStatePatch(snapshot.state, "engine.load");
    },
    move(input) {
      const lifecycle = computePostMoveLifecycle({
        successfulMoveCount: state.successfulMoveCount,
        hasMovesAvailable: input.hasMovesAvailable,
        timerStatus: input.timerStatus
      });
      const scoring = computePostMoveScore({
        scoreBeforeMove: state.score,
        scoreAfterMerge: input.scoreAfterMerge,
        comboStreak: state.comboStreak,
        comboMultiplier: input.comboMultiplier ?? 1
      });
      const nextState = applyStatePatch(
        {
          score: scoring.score,
          over: lifecycle.over,
          won: state.won,
          successfulMoveCount: lifecycle.successfulMoveCount,
          comboStreak: scoring.comboStreak
        },
        "engine.move"
      );

      return {
        moved: true,
        interactions: [],
        lifecycle,
        scoring,
        state: nextState
      };
    },
    undo(input) {
      const restored = computeUndoRestoreState({
        prev: input.snapshot,
        fallbackUndoUsed: input.fallbackUndoUsed,
        timerStatus: input.timerStatus
      });
      return applyStatePatch(
        {
          score: parseSnapshotScore(input.snapshot),
          over: restored.over,
          won: false,
          successfulMoveCount: restored.successfulMoveCount,
          undoUsed: restored.undoUsed,
          comboStreak: restored.comboStreak,
          board: sanitizeBoard(input.snapshot.tiles, state.board)
        },
        "engine.undo"
      );
    },
    replay(input) {
      return planReplayStep(input);
    },
    importReplay(input) {
      return parseReplayImportEnvelope(input);
    },
    exportState() {
      return {
        version: 1,
        config,
        state: { ...state, board: cloneBoard(state.board) },
        timestamp: new Date().toISOString()
      };
    },
    getState() {
      return { ...state, board: cloneBoard(state.board) };
    }
  };
}

export function createEngineFacade(): EngineFacade {
  return {
    planTileInteraction,
    computePostMoveLifecycle,
    computePostMoveScore,
    createUndoSnapshot,
    computeUndoRestoreState,
    normalizeReplaySeekTarget,
    planReplayStep,
    parseReplayImportEnvelope,
    encodeBoardV4,
    decodeBoardV4,
    getBestTileValue
  };
}

// ---------------------------------------------------------------------------
// Facade API — unified callable surface for page/runtime integration
// ---------------------------------------------------------------------------

export interface EngineFacade {
  planTileInteraction: typeof import("./move-apply").planTileInteraction;
  computePostMoveLifecycle: typeof import("./post-move").computePostMoveLifecycle;
  computePostMoveScore: typeof import("./scoring").computePostMoveScore;
  createUndoSnapshot: typeof import("./undo-snapshot").createUndoSnapshot;
  computeUndoRestoreState: typeof import("./undo-restore").computeUndoRestoreState;
  normalizeReplaySeekTarget: typeof import("./replay-lifecycle").normalizeReplaySeekTarget;
  planReplayStep: typeof import("./replay-lifecycle").planReplayStep;
  parseReplayImportEnvelope: typeof import("./replay-import").parseReplayImportEnvelope;
  encodeBoardV4: typeof import("./replay-codec").encodeBoardV4;
  decodeBoardV4: typeof import("./replay-codec").decodeBoardV4;
  getBestTileValue: typeof import("./grid-scan").getBestTileValue;
}

type UndoSnapshotLike = Record<string, unknown> &
  ReturnType<typeof createUndoSnapshot> & {
    score?: unknown;
    tiles?: unknown;
  };

export interface EngineSession {
  init(initialState?: Partial<EngineState>): EngineState;
  load(snapshot: ExportedState): EngineState;
  move(input: {
    scoreAfterMerge: number;
    hasMovesAvailable: boolean;
    timerStatus: 0 | 1;
    comboMultiplier?: number;
  }): MoveResult & { state: EngineState };
  undo(input: {
    snapshot: UndoSnapshotLike;
    timerStatus: 0 | 1;
    fallbackUndoUsed: number;
  }): EngineState;
  replay(input: Parameters<typeof planReplayStep>[0]): ReturnType<typeof planReplayStep>;
  importReplay(
    input: Parameters<typeof parseReplayImportEnvelope>[0]
  ): ReturnType<typeof parseReplayImportEnvelope>;
  exportState(): ExportedState;
  getState(): EngineState;
}

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => row.slice());
}

function createEmptyBoard(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
}

function createInitialEngineState(config: EngineConfig): EngineState {
  return {
    score: 0,
    board: createEmptyBoard(config.width, config.height),
    over: false,
    won: false,
    successfulMoveCount: 0,
    undoUsed: 0,
    comboStreak: 0
  };
}

function assertBoardShape(board: number[][], config: EngineConfig, context: string): void {
  if (!Array.isArray(board) || board.length !== config.height) {
    throw new Error(`${context}: board row count mismatch`);
  }
  for (const row of board) {
    if (!Array.isArray(row) || row.length !== config.width) {
      throw new Error(`${context}: board column count mismatch`);
    }
  }
}

function sanitizeBoard(board: unknown, fallback: number[][]): number[][] {
  if (!Array.isArray(board)) return cloneBoard(fallback);
  const parsedRows = board.map((row) => {
    if (!Array.isArray(row)) return null;
    return row.map((value) => (Number.isFinite(value) ? Number(value) : 0));
  });
  if (parsedRows.some((row) => row === null)) return cloneBoard(fallback);
  return parsedRows as number[][];
}

function sanitizeStatePatch(patch: Partial<EngineState>, current: EngineState): Partial<EngineState> {
  const sanitized: Partial<EngineState> = { ...patch };
  if (typeof patch.score !== "number" || !Number.isFinite(patch.score)) {
    delete sanitized.score;
  }
  if (
    typeof patch.successfulMoveCount !== "number" ||
    !Number.isInteger(patch.successfulMoveCount) ||
    patch.successfulMoveCount < 0
  ) {
    delete sanitized.successfulMoveCount;
  }
  if (
    typeof patch.undoUsed !== "number" ||
    !Number.isInteger(patch.undoUsed) ||
    patch.undoUsed < 0
  ) {
    delete sanitized.undoUsed;
  }
  if (
    typeof patch.comboStreak !== "number" ||
    !Number.isInteger(patch.comboStreak) ||
    patch.comboStreak < 0
  ) {
    delete sanitized.comboStreak;
  }
  if (typeof patch.over !== "boolean") {
    delete sanitized.over;
  }
  if (typeof patch.won !== "boolean") {
    delete sanitized.won;
  }
  sanitized.board = patch.board ? sanitizeBoard(patch.board, current.board) : current.board;
  return sanitized;
}

function parseSnapshotScore(snapshot: UndoSnapshotLike): number {
  return Number.isFinite(snapshot.score) ? Number(snapshot.score) : 0;
}

export function createEngineSession(config: EngineConfig): EngineSession {
  let state = createInitialEngineState(config);

  function applyStatePatch(patch?: Partial<EngineState>, context = "engine"): EngineState {
    if (patch) {
      const sanitizedPatch = sanitizeStatePatch(patch, state);
      const nextState: EngineState = {
        ...state,
        ...sanitizedPatch,
        board: cloneBoard(sanitizedPatch.board ?? state.board)
      };
      assertBoardShape(nextState.board, config, context);
      state = nextState;
    }
    return {
      ...state,
      board: cloneBoard(state.board)
    };
  }

  return {
    init(initialState) {
      state = createInitialEngineState(config);
      return applyStatePatch(initialState, "engine.init");
    },
    load(snapshot) {
      if (snapshot.version !== 1) {
        throw new Error(`Unsupported engine snapshot version: ${String(snapshot.version)}`);
      }
      if (snapshot.config.width !== config.width || snapshot.config.height !== config.height) {
        throw new Error("Engine snapshot dimensions mismatch");
      }
      if (snapshot.config.ruleset !== config.ruleset) {
        throw new Error("Engine snapshot ruleset mismatch");
      }
      return applyStatePatch(snapshot.state, "engine.load");
    },
    move(input) {
      const lifecycle = computePostMoveLifecycle({
        successfulMoveCount: state.successfulMoveCount,
        hasMovesAvailable: input.hasMovesAvailable,
        timerStatus: input.timerStatus
      });
      const scoring = computePostMoveScore({
        scoreBeforeMove: state.score,
        scoreAfterMerge: input.scoreAfterMerge,
        comboStreak: state.comboStreak,
        comboMultiplier: input.comboMultiplier ?? 1
      });
      const nextState = applyStatePatch(
        {
          score: scoring.score,
          over: lifecycle.over,
          won: state.won,
          successfulMoveCount: lifecycle.successfulMoveCount,
          comboStreak: scoring.comboStreak
        },
        "engine.move"
      );

      return {
        moved: true,
        interactions: [],
        lifecycle,
        scoring,
        state: nextState
      };
    },
    undo(input) {
      const restored = computeUndoRestoreState({
        prev: input.snapshot,
        fallbackUndoUsed: input.fallbackUndoUsed,
        timerStatus: input.timerStatus
      });
      return applyStatePatch(
        {
          score: parseSnapshotScore(input.snapshot),
          over: restored.over,
          won: false,
          successfulMoveCount: restored.successfulMoveCount,
          undoUsed: restored.undoUsed,
          comboStreak: restored.comboStreak,
          board: sanitizeBoard(input.snapshot.tiles, state.board)
        },
        "engine.undo"
      );
    },
    replay(input) {
      return planReplayStep(input);
    },
    importReplay(input) {
      return parseReplayImportEnvelope(input);
    },
    exportState() {
      return {
        version: 1,
        config,
        state: { ...state, board: cloneBoard(state.board) },
        timestamp: new Date().toISOString()
      };
    },
    getState() {
      return { ...state, board: cloneBoard(state.board) };
    }
  };
}

export function createEngineFacade(): EngineFacade {
  return {
    planTileInteraction,
    computePostMoveLifecycle,
    computePostMoveScore,
    createUndoSnapshot,
    computeUndoRestoreState,
    normalizeReplaySeekTarget,
    planReplayStep,
    parseReplayImportEnvelope,
    encodeBoardV4,
    decodeBoardV4,
    getBestTileValue
  };
}

// ---------------------------------------------------------------------------
// Barrel re-exports — pure function delegation
// ---------------------------------------------------------------------------

export { planTileInteraction } from "./move-apply";
export { computePostMoveLifecycle } from "./post-move";
export { computePostMoveScore } from "./scoring";
export { computeUndoRestoreState } from "./undo-restore";
export { createUndoSnapshot } from "./undo-snapshot";
export { normalizeReplaySeekTarget, planReplayStep } from "./replay-lifecycle";
export { parseReplayImportEnvelope } from "./replay-import";
export { encodeBoardV4, decodeBoardV4 } from "./replay-codec";
export { getBestTileValue } from "./grid-scan";

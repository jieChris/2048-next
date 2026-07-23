import {
  APP_GAME_CONTRACT_VERSION,
  isGameSnapshotLike,
  type AppModeKey,
  type GameCell,
  type GameDirection,
  type GameMergeEffect,
  type GameMotionEffect,
  type GameReplayRecord,
  type GameSnapshot,
  type GameSpawnEffect,
  type GameState,
  type GameTransition,
  type GameUndoFrame,
  type ReplayRecord
} from "../contracts";
import { getAvailableCells, getBestTileValue } from "./grid-scan";
import { planTileInteraction } from "./move-apply";
import { buildTraversals, findFarthestPosition, getVector } from "./move-path";
import { movesAvailable, tileMatchesAvailable } from "./move-scan";
import { computePostMoveLifecycle } from "./post-move";
import { normalizeReplaySeekTarget, planReplayStep } from "./replay-lifecycle";
import { parseReplayImportEnvelope } from "./replay-import";
import {
  createReplayV1MoveRecords,
  decodeBoardV4,
  encodeBoardV4,
  encodeReplayV1Base64,
  type ReplayV1InitTile,
  type ReplayV1Record
} from "./replay-codec";
import { getMergedValue, resolveDeterministicSpawn, type SpawnTableItem } from "./rules";
import { computePostMoveScore } from "./scoring";
import { computeUndoRestoreState } from "./undo-restore";
import { createUndoSnapshot } from "./undo-snapshot";

export type Ruleset = "pow2" | "fibonacci";
export type Direction = GameDirection;
export type EngineState = GameState;
export type MoveResult = GameTransition;
export type ExportedState = GameSnapshot;

export interface EngineConfig {
  modeKey: AppModeKey;
  seed: number;
  startedAtMs?: number | null;
  challengeId?: string | null;
}

interface AppModeSpec {
  modeKey: AppModeKey;
  width: number;
  height: number;
  ruleset: "pow2";
  undoEnabled: boolean;
  spawnTable: SpawnTableItem[];
}

const DEFAULT_POW2_SPAWN_TABLE: SpawnTableItem[] = [
  { value: 2, weight: 90 },
  { value: 4, weight: 10 }
];

const APP_MODE_SPECS: Record<AppModeKey, AppModeSpec> = {
  standard_4x4_pow2_no_undo: {
    modeKey: "standard_4x4_pow2_no_undo",
    width: 4,
    height: 4,
    ruleset: "pow2",
    undoEnabled: false,
    spawnTable: DEFAULT_POW2_SPAWN_TABLE
  },
  classic_4x4_pow2_undo: {
    modeKey: "classic_4x4_pow2_undo",
    width: 4,
    height: 4,
    ruleset: "pow2",
    undoEnabled: true,
    spawnTable: DEFAULT_POW2_SPAWN_TABLE
  },
  board_3x3_pow2_no_undo: {
    modeKey: "board_3x3_pow2_no_undo",
    width: 3,
    height: 3,
    ruleset: "pow2",
    undoEnabled: false,
    spawnTable: DEFAULT_POW2_SPAWN_TABLE
  }
};

export interface EngineSession {
  init(initialState?: Partial<GameState>): GameState;
  load(snapshot: GameSnapshot): GameState;
  move(input: { direction: GameDirection; atMs: number }): GameTransition;
  undo(input: { atMs: number }): GameTransition | null;
  exportState(savedAtMs: number): GameSnapshot;
  exportReplay(): ReplayRecord;
  getState(): GameState;
}

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

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => row.slice());
}

function cloneCell(cell: GameCell): GameCell {
  return { x: cell.x, y: cell.y };
}

function cloneUndoFrame(frame: GameUndoFrame): GameUndoFrame {
  return { ...frame, board: cloneBoard(frame.board) };
}

function cloneReplayRecord(record: GameReplayRecord): GameReplayRecord {
  return { ...record };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
    initialTiles: state.initialTiles.map((tile) => ({ ...tile })),
    replayRecords: state.replayRecords.map(cloneReplayRecord),
    undoStack: state.undoStack.map(cloneUndoFrame)
  };
}

function createEmptyBoard(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
}

function assertNonNegativeSafeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function resolveModeSpec(modeKey: AppModeKey): AppModeSpec {
  const spec = APP_MODE_SPECS[modeKey];
  if (!spec) throw new Error(`Unsupported App game mode: ${String(modeKey)}`);
  return spec;
}

function insertOpeningTile(
  state: GameState,
  spec: AppModeSpec,
  stepCount: number
): GameSpawnEffect {
  const spawn = resolveDeterministicSpawn({
    modeKey: spec.modeKey,
    ruleset: spec.ruleset,
    spawnTable: spec.spawnTable,
    board: state.board,
    seed: state.seed,
    stepCount
  });
  state.board[spawn.y][spawn.x] = spawn.value;
  state.initialTiles.push({ cellIndex: spawn.spawnIndex, value: spawn.value });
  return {
    x: spawn.x,
    y: spawn.y,
    spawnIndex: spawn.spawnIndex,
    value: spawn.value,
    rngStep: spawn.stepCount
  };
}

function createInitialState(config: EngineConfig, spec: AppModeSpec): GameState {
  const seed = assertNonNegativeSafeInteger(Number(config.seed), "engine seed");
  const startedAtMs = config.startedAtMs == null
    ? null
    : assertNonNegativeSafeInteger(Number(config.startedAtMs), "engine startedAtMs");
  const challengeId = typeof config.challengeId === "string" && config.challengeId.trim()
    ? config.challengeId.trim()
    : null;
  const state: GameState = {
    version: APP_GAME_CONTRACT_VERSION,
    modeKey: spec.modeKey,
    width: spec.width,
    height: spec.height,
    ruleset: spec.ruleset,
    undoEnabled: spec.undoEnabled,
    seed,
    challengeId,
    board: createEmptyBoard(spec.width, spec.height),
    score: 0,
    steps: 0,
    gameOver: false,
    won: false,
    milestone2048Reached: false,
    undoUsed: 0,
    comboStreak: 0,
    startedAtMs,
    lastEventAtMs: startedAtMs,
    durationMs: 0,
    rngStep: 0,
    initialTiles: [],
    replayRecords: [],
    undoStack: []
  };
  insertOpeningTile(state, spec, 0);
  insertOpeningTile(state, spec, 1);
  return state;
}

function createUndoFrame(state: GameState): GameUndoFrame {
  return {
    board: cloneBoard(state.board),
    score: state.score,
    steps: state.steps,
    gameOver: state.gameOver,
    won: state.won,
    milestone2048Reached: state.milestone2048Reached,
    comboStreak: state.comboStreak,
    undoUsed: state.undoUsed
  };
}

function hasMovesAvailable(board: number[][], spec: AppModeSpec): boolean {
  const availableCellCount = getAvailableCells(
    spec.width,
    spec.height,
    () => false,
    ({ x, y }) => board[y][x] === 0
  ).length;
  const hasTileMatch = tileMatchesAvailable(
    spec.width,
    spec.height,
    () => false,
    ({ x, y }) => board[y]?.[x],
    (left, right) => getMergedValue(left, right, spec.ruleset, Number.POSITIVE_INFINITY) !== null,
    [0, 1, 2, 3]
  );
  return movesAvailable(availableCellCount, hasTileMatch);
}

function applyBoardMove(
  sourceBoard: number[][],
  spec: AppModeSpec,
  direction: GameDirection
): {
  board: number[][];
  moved: boolean;
  mergeScore: number;
  motions: GameMotionEffect[];
  merges: GameMergeEffect[];
} {
  const vector = getVector(direction);
  if (!vector) throw new Error(`Invalid game direction: ${String(direction)}`);
  const board = cloneBoard(sourceBoard);
  const mergedCells = createEmptyBoard(spec.width, spec.height).map((row) => row.map(() => false));
  const traversals = buildTraversals(spec.width, spec.height, vector);
  const motions: GameMotionEffect[] = [];
  const merges: GameMergeEffect[] = [];
  let moved = false;
  let mergeScore = 0;

  for (const x of traversals.x) {
    for (const y of traversals.y) {
      const value = board[y][x];
      if (!Number.isInteger(value) || value <= 0) continue;
      const cell = { x, y };
      const positions = findFarthestPosition(
        cell,
        vector,
        spec.width,
        spec.height,
        () => false,
        ({ x: targetX, y: targetY }) => board[targetY][targetX] === 0
      );
      const nextInBounds =
        positions.next.x >= 0 &&
        positions.next.x < spec.width &&
        positions.next.y >= 0 &&
        positions.next.y < spec.height;
      const nextValue = nextInBounds ? board[positions.next.y][positions.next.x] : 0;
      const mergedValue = nextInBounds
        ? getMergedValue(value, nextValue, spec.ruleset, Number.POSITIVE_INFINITY)
        : null;
      const interaction = planTileInteraction({
        cell,
        farthest: positions.farthest,
        next: positions.next,
        hasNextTile: nextInBounds && nextValue > 0,
        nextMergedFrom: nextInBounds && mergedCells[positions.next.y][positions.next.x],
        mergedValue
      });

      if (interaction.kind === "merge" && mergedValue !== null) {
        board[y][x] = 0;
        board[interaction.target.y][interaction.target.x] = mergedValue;
        mergedCells[interaction.target.y][interaction.target.x] = true;
        motions.push({ from: cloneCell(cell), to: cloneCell(interaction.target), value });
        merges.push({
          from: [cloneCell(cell), cloneCell(interaction.target)],
          to: cloneCell(interaction.target),
          value: mergedValue
        });
        mergeScore += mergedValue;
        moved = true;
        continue;
      }

      if (interaction.moved) {
        board[y][x] = 0;
        board[interaction.target.y][interaction.target.x] = value;
        motions.push({ from: cloneCell(cell), to: cloneCell(interaction.target), value });
        moved = true;
      }
    }
  }

  return { board, moved, mergeScore, motions, merges };
}

function resolveEventTiming(state: GameState, rawAtMs: number): {
  startedAtMs: number;
  lastEventAtMs: number;
  durationMs: number;
  deltaMs: number;
} {
  const atMs = assertNonNegativeSafeInteger(Number(rawAtMs), "engine event atMs");
  const startedAtMs = state.startedAtMs ?? atMs;
  const elapsed = Math.max(0, atMs - startedAtMs);
  const durationMs = Math.max(state.durationMs, elapsed);
  return {
    startedAtMs,
    lastEventAtMs: Math.max(state.lastEventAtMs ?? 0, atMs),
    durationMs,
    deltaMs: durationMs - state.durationMs
  };
}

function applyStatePatchForInit(base: GameState, patch?: Partial<GameState>): GameState {
  if (!patch) return cloneState(base);
  const candidate = {
    ...base,
    ...patch,
    board: cloneBoard(patch.board ?? base.board),
    initialTiles: (patch.initialTiles ?? base.initialTiles).map((tile) => ({ ...tile })),
    replayRecords: (patch.replayRecords ?? base.replayRecords).map(cloneReplayRecord),
    undoStack: (patch.undoStack ?? base.undoStack).map(cloneUndoFrame)
  };
  const snapshot = {
    version: APP_GAME_CONTRACT_VERSION,
    savedAtMs: 0,
    state: candidate
  };
  if (!isGameSnapshotLike(snapshot)) throw new Error("engine.init received an invalid GameState patch");
  if (candidate.modeKey !== base.modeKey || candidate.seed !== base.seed) {
    throw new Error("engine.init cannot change modeKey or seed");
  }
  return cloneState(candidate);
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function createReplayMetadata(state: GameState): ReplayV1Record[] {
  const records: ReplayV1Record[] = [
    { kind: "ext", extType: 1, payload: encodeUtf8(state.modeKey) },
    { kind: "ext", extType: 2, payload: encodeUtf8(state.ruleset) }
  ];
  if (state.challengeId) records.push({ kind: "ext", extType: 3, payload: encodeUtf8(state.challengeId) });
  records.push({ kind: "ext", extType: 4, payload: encodeUtf8(String(state.seed)) });
  return records;
}

function createReplayRecords(state: GameState): ReplayV1Record[] {
  const records = createReplayMetadata(state);
  for (const record of state.replayRecords) {
    if (record.kind === "undo") {
      records.push({ kind: "undo1", deltaMs: record.deltaMs });
      continue;
    }
    records.push(
      ...createReplayV1MoveRecords({
        dir: record.direction,
        spawnIndex: record.spawnIndex,
        spawnValue: record.spawnValue,
        deltaMs: record.deltaMs,
        ruleset: state.ruleset
      })
    );
  }
  return records;
}

function createReplayInitTiles(state: GameState): ReplayV1InitTile[] {
  return state.initialTiles.map((tile) => {
    if (tile.value !== 2 && tile.value !== 4) {
      throw new Error("RPL1 pow2 initial tiles only support values 2 and 4");
    }
    return { cellIndex: tile.cellIndex, valueBit: (tile.value === 4 ? 1 : 0) as 0 | 1 };
  }).sort((left, right) => left.cellIndex - right.cellIndex);
}

export function createEngineSession(config: EngineConfig): EngineSession {
  const spec = resolveModeSpec(config.modeKey);
  let state = createInitialState(config, spec);

  return {
    init(initialState) {
      state = applyStatePatchForInit(createInitialState(config, spec), initialState);
      return cloneState(state);
    },
    load(snapshot) {
      if (!isGameSnapshotLike(snapshot)) throw new Error("Invalid GameSnapshot");
      if (snapshot.state.modeKey !== spec.modeKey) throw new Error("GameSnapshot mode mismatch");
      if (snapshot.state.seed !== Number(config.seed)) throw new Error("GameSnapshot seed mismatch");
      if (
        snapshot.state.width !== spec.width ||
        snapshot.state.height !== spec.height ||
        snapshot.state.ruleset !== spec.ruleset ||
        snapshot.state.undoEnabled !== spec.undoEnabled
      ) {
        throw new Error("GameSnapshot mode contract mismatch");
      }
      state = cloneState(snapshot.state);
      return cloneState(state);
    },
    move(input) {
      if (input.direction !== 0 && input.direction !== 1 && input.direction !== 2 && input.direction !== 3) {
        throw new Error(`Invalid game direction: ${String(input.direction)}`);
      }
      assertNonNegativeSafeInteger(Number(input.atMs), "engine event atMs");
      if (state.gameOver) {
        return {
          state: cloneState(state),
          moved: false,
          scoreDelta: 0,
          motions: [],
          merges: [],
          spawn: null,
          milestone2048: false,
          gameOver: true
        };
      }

      const applied = applyBoardMove(state.board, spec, input.direction);
      if (!applied.moved) {
        const gameOver = !hasMovesAvailable(state.board, spec);
        if (gameOver !== state.gameOver) state = { ...state, gameOver };
        return {
          state: cloneState(state),
          moved: false,
          scoreDelta: 0,
          motions: [],
          merges: [],
          spawn: null,
          milestone2048: false,
          gameOver
        };
      }

      const timing = resolveEventTiming(state, input.atMs);
      const previousScore = state.score;
      const scoring = computePostMoveScore({
        scoreBeforeMove: previousScore,
        scoreAfterMerge: previousScore + applied.mergeScore,
        comboStreak: state.comboStreak,
        comboMultiplier: 1
      });
      const spawn = resolveDeterministicSpawn({
        modeKey: spec.modeKey,
        ruleset: spec.ruleset,
        spawnTable: spec.spawnTable,
        board: applied.board,
        seed: state.seed,
        stepCount: state.rngStep
      });
      applied.board[spawn.y][spawn.x] = spawn.value;
      const spawnEffect: GameSpawnEffect = {
        x: spawn.x,
        y: spawn.y,
        spawnIndex: spawn.spawnIndex,
        value: spawn.value,
        rngStep: spawn.stepCount
      };
      const milestone2048 =
        !state.milestone2048Reached && applied.merges.some((merge) => merge.value >= 2048);
      const gameOver = !hasMovesAvailable(applied.board, spec);
      const replayRecord: GameReplayRecord = {
        kind: "move",
        direction: input.direction,
        spawnIndex: spawn.spawnIndex,
        spawnValue: spawn.value,
        deltaMs: timing.deltaMs,
        rngStep: state.rngStep
      };
      state = {
        ...state,
        board: applied.board,
        score: scoring.score,
        steps: state.steps + 1,
        gameOver,
        won: state.won || milestone2048,
        milestone2048Reached: state.milestone2048Reached || milestone2048,
        comboStreak: scoring.comboStreak,
        startedAtMs: timing.startedAtMs,
        lastEventAtMs: timing.lastEventAtMs,
        durationMs: timing.durationMs,
        rngStep: state.rngStep + 1,
        replayRecords: [...state.replayRecords, replayRecord],
        undoStack: spec.undoEnabled ? [...state.undoStack, createUndoFrame(state)] : []
      };

      return {
        state: cloneState(state),
        moved: true,
        scoreDelta: scoring.score - previousScore,
        motions: applied.motions,
        merges: applied.merges,
        spawn: spawnEffect,
        milestone2048,
        gameOver
      };
    },
    undo(input) {
      if (!spec.undoEnabled || state.undoStack.length === 0) return null;
      const timing = resolveEventTiming(state, input.atMs);
      const previousScore = state.score;
      const frame = state.undoStack[state.undoStack.length - 1];
      const remainingUndoStack = state.undoStack.slice(0, -1).map(cloneUndoFrame);
      state = {
        ...state,
        board: cloneBoard(frame.board),
        score: frame.score,
        steps: frame.steps,
        gameOver: false,
        won: frame.won,
        milestone2048Reached: frame.milestone2048Reached,
        undoUsed: frame.undoUsed + 1,
        comboStreak: frame.comboStreak,
        startedAtMs: timing.startedAtMs,
        lastEventAtMs: timing.lastEventAtMs,
        durationMs: timing.durationMs,
        rngStep: state.rngStep + 1,
        replayRecords: [...state.replayRecords, { kind: "undo", deltaMs: timing.deltaMs }],
        undoStack: remainingUndoStack
      };
      return {
        state: cloneState(state),
        moved: true,
        scoreDelta: state.score - previousScore,
        motions: [],
        merges: [],
        spawn: null,
        milestone2048: false,
        gameOver: false
      };
    },
    exportState(savedAtMs) {
      return {
        version: APP_GAME_CONTRACT_VERSION,
        savedAtMs: assertNonNegativeSafeInteger(Number(savedAtMs), "GameSnapshot savedAtMs"),
        state: cloneState(state)
      };
    },
    exportReplay() {
      return {
        version: APP_GAME_CONTRACT_VERSION,
        kind: "rpl1",
        modeKey: state.modeKey,
        replayString: encodeReplayV1Base64({
          width: state.width,
          height: state.height,
          initTiles: createReplayInitTiles(state),
          records: createReplayRecords(state),
          startUnixMs: state.startedAtMs
        })
      };
    },
    getState() {
      return cloneState(state);
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

export { planTileInteraction } from "./move-apply";
export { computePostMoveLifecycle } from "./post-move";
export { computePostMoveScore } from "./scoring";
export { computeUndoRestoreState } from "./undo-restore";
export { createUndoSnapshot } from "./undo-snapshot";
export { normalizeReplaySeekTarget, planReplayStep } from "./replay-lifecycle";
export { parseReplayImportEnvelope } from "./replay-import";
export { encodeBoardV4, decodeBoardV4 } from "./replay-codec";
export { getBestTileValue } from "./grid-scan";

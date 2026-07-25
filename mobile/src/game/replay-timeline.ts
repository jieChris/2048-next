import {
  isGameSnapshotLike,
  isReplayRecordLike,
  type AppModeKey,
  type GameMergeEffect,
  type GameMotionEffect,
  type GameSnapshot,
  type GameSpawnEffect,
  type GameState,
  type GameTransition,
  type ReplayRecord,
  type ReplayRecordRpl1,
} from "../../../src/contracts";
import { createEngineSession } from "../../../src/core/engine";
import {
  decodeReplayV1Base64,
  replayV1InitTilesToBoard,
  replayV1RecordsToReplayActions,
  type ReplayV1DecodedFile,
} from "../../../src/core/replay-codec";

const STANDARD_4X4_MODE = "standard_4x4_pow2_no_undo" as const;
const MAX_REPLAY_ACTIONS = 50_000;
const MODE_DIMENSIONS: Record<AppModeKey, readonly [number, number]> = {
  standard_4x4_pow2_no_undo: [4, 4],
  classic_4x4_pow2_undo: [4, 4],
  board_3x3_pow2_no_undo: [3, 3],
};

export interface ReplayRecordTimelineSource {
  replay: ReplayRecord;
  finalSnapshot?: GameSnapshot;
}

export interface ReplayTimelineSource extends ReplayRecordTimelineSource {
  finalSnapshot: GameSnapshot;
}

export interface ReplayTimelineFrame {
  index: number;
  board: number[][];
  score: number;
  steps: number;
  durationMs: number;
  scoreDelta: number;
  motions: GameMotionEffect[];
  merges: GameMergeEffect[];
  spawn: GameSpawnEffect | null;
  milestone2048: boolean;
  gameOver: boolean;
}

export interface ReplayTimeline {
  modeKey: AppModeKey;
  frames: ReplayTimelineFrame[];
  totalSteps: number;
  totalDurationMs: number;
}

export interface Standard4x4ReplayTimeline extends ReplayTimeline {
  modeKey: typeof STANDARD_4X4_MODE;
}

export interface ReplayProgress {
  index: number;
  totalSteps: number;
  elapsedMs: number;
  totalDurationMs: number;
  stepRatio: number;
  timeRatio: number;
}

function fail(code: string): never {
  throw new Error(code);
}

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => row.slice());
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function addSafeMilliseconds(left: number, right: number): number {
  if (
    !Number.isSafeInteger(left) ||
    left < 0 ||
    !Number.isSafeInteger(right) ||
    right < 0 ||
    right > Number.MAX_SAFE_INTEGER - left
  ) {
    return fail("replay_timeline_timestamp_overflow");
  }
  return left + right;
}

function initialFrame(state: GameState): ReplayTimelineFrame {
  return {
    index: 0,
    board: cloneBoard(state.board),
    score: state.score,
    steps: state.steps,
    durationMs: state.durationMs,
    scoreDelta: 0,
    motions: [],
    merges: [],
    spawn: null,
    milestone2048: false,
    gameOver: state.gameOver,
  };
}

function transitionFrame(
  transition: GameTransition,
  index: number,
): ReplayTimelineFrame {
  return {
    index,
    board: cloneBoard(transition.state.board),
    score: transition.state.score,
    steps: transition.state.steps,
    durationMs: transition.state.durationMs,
    scoreDelta: transition.scoreDelta,
    motions: transition.motions.map((motion) => ({
      from: { ...motion.from },
      to: { ...motion.to },
      value: motion.value,
    })),
    merges: transition.merges.map((merge) => ({
      from: [{ ...merge.from[0] }, { ...merge.from[1] }],
      to: { ...merge.to },
      value: merge.value,
    })),
    spawn: transition.spawn ? { ...transition.spawn } : null,
    milestone2048: transition.milestone2048,
    gameOver: transition.gameOver,
  };
}

function extensionText(decoded: ReplayV1DecodedFile, extType: number): string {
  const record = decoded.records.find(
    (candidate) => candidate.kind === "ext" && candidate.extType === extType,
  );
  return record?.kind === "ext"
    ? new TextDecoder().decode(record.payload).trim()
    : "";
}

function replaySeed(decoded: ReplayV1DecodedFile): number {
  const raw = extensionText(decoded, 4);
  if (!/^\d+$/u.test(raw)) return fail("replay_timeline_seed_required");
  const seed = Number(raw);
  if (!Number.isSafeInteger(seed) || seed < 0) {
    return fail("replay_timeline_seed_required");
  }
  return seed;
}

function validateReplayEnvelope(
  replay: ReplayRecordRpl1,
  decoded: ReplayV1DecodedFile,
): void {
  const [width, height] = MODE_DIMENSIONS[replay.modeKey];
  if (decoded.width !== width || decoded.height !== height) {
    fail("replay_timeline_dimension_mismatch");
  }
  const extModeKey = extensionText(decoded, 1);
  if (extModeKey && extModeKey !== replay.modeKey) {
    fail("replay_timeline_mode_mismatch");
  }
  const ruleset = extensionText(decoded, 2);
  if (ruleset && ruleset !== "pow2") {
    fail("replay_timeline_ruleset_mismatch");
  }
  if (decoded.startUnixMs === null) {
    fail("replay_timeline_start_required");
  }
}

function assertReplayActionBudget(decoded: ReplayV1DecodedFile): void {
  let count = 0;
  for (const record of decoded.records) {
    if (record.kind === "move" || record.kind === "undo1") count += 1;
    else if (record.kind === "undon") count += record.undoCount;
    if (!Number.isSafeInteger(count) || count > MAX_REPLAY_ACTIONS) {
      fail("replay_timeline_action_limit");
    }
  }
}

export function buildReplayTimeline(
  source: ReplayRecordTimelineSource,
): ReplayTimeline {
  if (source.replay.kind !== "rpl1") fail("replay_timeline_rpl1_required");
  if (!isReplayRecordLike(source.replay)) {
    fail("replay_timeline_invalid_replay");
  }
  if (source.finalSnapshot && !isGameSnapshotLike(source.finalSnapshot)) {
    fail("replay_timeline_invalid_snapshot");
  }

  const decoded = decodeReplayV1Base64(source.replay.replayString);
  validateReplayEnvelope(source.replay, decoded);
  const startedAtMs = decoded.startUnixMs;
  if (startedAtMs === null) fail("replay_timeline_start_required");
  const seed = replaySeed(decoded);
  const challengeId = extensionText(decoded, 3) || null;
  const engine = createEngineSession({
    modeKey: source.replay.modeKey,
    seed,
    startedAtMs,
    challengeId,
  });
  const initialState = engine.init();
  const decodedInitialBoard = replayV1InitTilesToBoard(
    decoded.width,
    decoded.height,
    decoded.initTiles,
    "pow2",
  );
  if (!sameJson(initialState.board, decodedInitialBoard)) {
    fail("replay_timeline_initial_board_mismatch");
  }

  assertReplayActionBudget(decoded);
  const actions = replayV1RecordsToReplayActions(
    decoded.records,
    decoded.width,
    "pow2",
  );
  if (
    actions.replayMoves.length !== actions.replaySpawns.length ||
    actions.replayMoves.length > MAX_REPLAY_ACTIONS
  ) {
    fail("replay_timeline_unsupported_action");
  }

  const frames: ReplayTimelineFrame[] = [initialFrame(initialState)];
  let elapsedMs = 0;
  let actionIndex = 0;
  const applyUndo = (atMs: number): void => {
    if (
      actions.replayMoves[actionIndex] !== -1 ||
      actions.replaySpawns[actionIndex] !== null
    ) {
      fail("replay_timeline_unsupported_action");
    }
    const transition = engine.undo({ atMs });
    if (!transition) fail("replay_timeline_undo_mismatch");
    frames.push(transitionFrame(transition, frames.length));
    actionIndex += 1;
  };

  for (const record of decoded.records) {
    if (record.kind === "move") {
      elapsedMs = addSafeMilliseconds(elapsedMs, record.deltaMs);
      const action = actions.replayMoves[actionIndex];
      const expectedSpawn = actions.replaySpawns[actionIndex];
      if (
        action !== record.dir ||
        (action !== 0 && action !== 1 && action !== 2 && action !== 3) ||
        !expectedSpawn
      ) {
        fail("replay_timeline_unsupported_action");
      }
      const transition = engine.move({
        direction: action,
        atMs: addSafeMilliseconds(startedAtMs, elapsedMs),
      });
      if (!transition.moved || transition.spawn === null) {
        fail("replay_timeline_move_mismatch");
      }
      if (
        transition.spawn.x !== expectedSpawn.x ||
        transition.spawn.y !== expectedSpawn.y ||
        transition.spawn.value !== expectedSpawn.value
      ) {
        fail("replay_timeline_spawn_mismatch");
      }
      frames.push(transitionFrame(transition, frames.length));
      actionIndex += 1;
      continue;
    }
    if (record.kind === "undo1") {
      elapsedMs = addSafeMilliseconds(elapsedMs, record.deltaMs);
      applyUndo(addSafeMilliseconds(startedAtMs, elapsedMs));
      continue;
    }
    if (record.kind === "undon") {
      elapsedMs = addSafeMilliseconds(elapsedMs, record.deltaMs);
      const atMs = addSafeMilliseconds(startedAtMs, elapsedMs);
      for (let count = 0; count < record.undoCount; count += 1) {
        applyUndo(atMs);
      }
    }
  }

  if (actionIndex !== actions.replayMoves.length) {
    fail("replay_timeline_unsupported_action");
  }
  const finalState = engine.getState();
  if (
    source.finalSnapshot &&
    !sameJson(finalState, source.finalSnapshot.state)
  ) {
    fail("replay_timeline_final_snapshot_mismatch");
  }
  return {
    modeKey: source.replay.modeKey,
    frames,
    totalSteps: finalState.steps,
    totalDurationMs: finalState.durationMs,
  };
}

export function buildStandard4x4ReplayTimeline(
  source: ReplayTimelineSource,
): Standard4x4ReplayTimeline {
  if (
    source.replay.modeKey !== STANDARD_4X4_MODE ||
    source.finalSnapshot.state.modeKey !== STANDARD_4X4_MODE
  ) {
    fail("replay_timeline_standard_4x4_required");
  }
  return buildReplayTimeline(source) as Standard4x4ReplayTimeline;
}

export function resolveReplayProgress(
  timeline: ReplayTimeline,
  requestedIndex: number,
): ReplayProgress {
  const lastIndex = Math.max(0, timeline.frames.length - 1);
  const normalized = Number.isNaN(requestedIndex)
    ? 0
    : Number.isFinite(requestedIndex)
      ? Math.floor(requestedIndex)
      : requestedIndex > 0
        ? lastIndex
        : 0;
  const index = Math.min(lastIndex, Math.max(0, normalized));
  const elapsedMs = timeline.frames[index]?.durationMs ?? 0;
  return {
    index,
    totalSteps: lastIndex,
    elapsedMs,
    totalDurationMs: timeline.totalDurationMs,
    stepRatio: lastIndex === 0 ? 0 : index / lastIndex,
    timeRatio:
      timeline.totalDurationMs === 0
        ? 0
        : Math.min(1, elapsedMs / timeline.totalDurationMs),
  };
}

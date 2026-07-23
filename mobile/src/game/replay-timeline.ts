import {
  isGameSnapshotLike,
  isReplayRecordLike,
  type GameMergeEffect,
  type GameMotionEffect,
  type GameSnapshot,
  type GameSpawnEffect,
  type ReplayRecord,
} from "../../../src/contracts";
import { createEngineSession } from "../../../src/core/engine";
import {
  decodeReplayV1Base64,
  replayV1InitTilesToBoard,
  replayV1RecordsToReplayActions,
} from "../../../src/core/replay-codec";

const STANDARD_4X4_MODE = "standard_4x4_pow2_no_undo" as const;

export interface ReplayTimelineSource {
  replay: ReplayRecord;
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

export interface Standard4x4ReplayTimeline {
  modeKey: typeof STANDARD_4X4_MODE;
  frames: ReplayTimelineFrame[];
  totalSteps: number;
  totalDurationMs: number;
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

function initialFrame(snapshot: GameSnapshot): ReplayTimelineFrame {
  const state = snapshot.state;
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

export function buildStandard4x4ReplayTimeline(
  source: ReplayTimelineSource,
): Standard4x4ReplayTimeline {
  if (source.replay.kind !== "rpl1") fail("replay_timeline_rpl1_required");
  if (
    source.replay.modeKey !== STANDARD_4X4_MODE ||
    source.finalSnapshot.state.modeKey !== STANDARD_4X4_MODE
  ) {
    fail("replay_timeline_standard_4x4_required");
  }
  if (!isReplayRecordLike(source.replay))
    fail("replay_timeline_invalid_replay");
  if (!isGameSnapshotLike(source.finalSnapshot))
    fail("replay_timeline_invalid_snapshot");

  const decoded = decodeReplayV1Base64(source.replay.replayString);
  if (decoded.width !== 4 || decoded.height !== 4) {
    fail("replay_timeline_dimension_mismatch");
  }
  if (
    decoded.startUnixMs === null ||
    decoded.startUnixMs !== source.finalSnapshot.state.startedAtMs
  ) {
    fail("replay_timeline_start_mismatch");
  }

  const engine = createEngineSession({
    modeKey: STANDARD_4X4_MODE,
    seed: source.finalSnapshot.state.seed,
    startedAtMs: decoded.startUnixMs,
    challengeId: source.finalSnapshot.state.challengeId,
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

  const actions = replayV1RecordsToReplayActions(
    decoded.records,
    decoded.width,
    "pow2",
  );
  const moveRecords = decoded.records.filter(
    (record) => record.kind === "move",
  );
  if (
    actions.replayMoves.length !== moveRecords.length ||
    actions.replaySpawns.length !== moveRecords.length
  ) {
    fail("replay_timeline_unsupported_action");
  }

  const frames: ReplayTimelineFrame[] = [
    initialFrame({ ...source.finalSnapshot, state: initialState }),
  ];
  let elapsedMs = 0;
  for (let index = 0; index < moveRecords.length; index += 1) {
    const action = actions.replayMoves[index];
    const expectedSpawn = actions.replaySpawns[index];
    if (
      (action !== 0 && action !== 1 && action !== 2 && action !== 3) ||
      expectedSpawn === null ||
      expectedSpawn === undefined
    ) {
      fail("replay_timeline_unsupported_action");
    }
    elapsedMs = addSafeMilliseconds(elapsedMs, moveRecords[index].deltaMs);
    const atMs = addSafeMilliseconds(decoded.startUnixMs, elapsedMs);
    const transition = engine.move({ direction: action, atMs });
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
    frames.push({
      index: frames.length,
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
      spawn: { ...transition.spawn },
      milestone2048: transition.milestone2048,
      gameOver: transition.gameOver,
    });
  }

  if (!sameJson(engine.getState(), source.finalSnapshot.state)) {
    fail("replay_timeline_final_snapshot_mismatch");
  }
  return {
    modeKey: STANDARD_4X4_MODE,
    frames,
    totalSteps: source.finalSnapshot.state.steps,
    totalDurationMs: source.finalSnapshot.state.durationMs,
  };
}

export function resolveReplayProgress(
  timeline: Standard4x4ReplayTimeline,
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

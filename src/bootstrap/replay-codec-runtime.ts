import {
  appendCompactMoveCode,
  appendCompactPracticeAction,
  appendCompactUndo,
  computeCrc32,
  decodeBoardV4,
  decodeReplay128,
  decodeReplayV1Rpl,
  decodeUleb128,
  encodeBoardV4,
  encodeReplay128,
  encodeReplayV1Rpl,
  encodeUleb128,
  REPLAY_V1_FLAG_CONTAINS_CHECKPOINTS,
  REPLAY_V1_FLAG_CONTAINS_UNDO_RECORDS,
  REPLAY_V1_FLAG_EXTENDED_INIT_TILES,
  REPLAY_V1_FLAG_HAS_START_UNIX_MS,
  REPLAY_V1_MAGIC,
  REPLAY_V1_RECORD_CHECKPOINT,
  REPLAY_V1_RECORD_END,
  REPLAY_V1_RECORD_EXT,
  REPLAY_V1_RECORD_MOVE8,
  REPLAY_V1_RECORD_UNDO1,
  REPLAY_V1_RECORD_UNDON,
  replayV1BoardToInitTiles,
  replayV1InitTilesToBoard,
  replayV1RecordsToReplayActions,
  type ReplayV1DecodedActions,
  type ReplayV1DecodedFile,
  type ReplayV1EncodeInput,
  type ReplayV1InitTile,
  type ReplayV1Record,
  type ReplayV1Ruleset
} from "../core/replay-codec";

type BytesLike = ArrayBuffer | ArrayLike<number> | Uint8Array;

export interface ReplayCodecRuntime {
  REPLAY_V1_MAGIC: typeof REPLAY_V1_MAGIC;
  REPLAY_V1_FLAG_HAS_START_UNIX_MS: number;
  REPLAY_V1_FLAG_CONTAINS_UNDO_RECORDS: number;
  REPLAY_V1_FLAG_CONTAINS_CHECKPOINTS: number;
  REPLAY_V1_FLAG_EXTENDED_INIT_TILES: number;
  REPLAY_V1_RECORD_UNDO1: number;
  REPLAY_V1_RECORD_UNDON: number;
  REPLAY_V1_RECORD_CHECKPOINT: number;
  REPLAY_V1_RECORD_EXT: number;
  REPLAY_V1_RECORD_END: number;
  REPLAY_V1_RECORD_MOVE8: number;
  encodeReplay128: (code: number) => string;
  decodeReplay128: (char: string) => number;
  encodeBoardV4: (board: number[][]) => string;
  decodeBoardV4: (encoded: string) => number[][];
  appendCompactMoveCode: (input: { log?: unknown; rawCode?: unknown } | null | undefined) => string;
  appendCompactUndo: (log: unknown) => string;
  appendCompactPracticeAction: (
    input:
      | {
          log?: unknown;
          width?: unknown;
          height?: unknown;
          x?: unknown;
          y?: unknown;
          value?: unknown;
        }
      | null
      | undefined
  ) => string;
  encodeUleb128: (value: number) => number[];
  decodeUleb128: (bytesLike: BytesLike | null | undefined, offset?: unknown) => {
    value: number;
    nextOffset: number;
  };
  computeCrc32: (bytesLike: BytesLike | null | undefined) => number;
  encodeReplayV1Rpl: (input: Partial<ReplayV1EncodeInput> | null | undefined) => Uint8Array;
  decodeReplayV1Rpl: (bytesLike: BytesLike | null | undefined) => ReplayV1DecodedFile;
  replayV1InitTilesToBoard: (
    width: number,
    height: number,
    initTiles: ReplayV1InitTile[] | null | undefined,
    ruleset?: ReplayV1Ruleset | null | undefined
  ) => number[][];
  replayV1BoardToInitTiles: (
    width: number,
    height: number,
    board: number[][],
    ruleset?: ReplayV1Ruleset | null | undefined
  ) => ReplayV1InitTile[];
  replayV1RecordsToReplayActions: (
    records: ReplayV1Record[] | null | undefined,
    width: number,
    ruleset?: ReplayV1Ruleset | null | undefined
  ) => ReplayV1DecodedActions;
}

export interface ReplayCodecRuntimeWindowLike {
  CoreReplayCodecRuntime?: ReplayCodecRuntime;
}

export interface ReplayCodecRuntimeInstallOptions {
  windowLike?: ReplayCodecRuntimeWindowLike | null | undefined;
}

function normalizeBytesLike(bytesLike: BytesLike | null | undefined): BytesLike {
  return bytesLike || [];
}

function normalizeOffset(offset: unknown): number {
  return Number(offset) || 0;
}

function normalizeReplayV1EncodeInput(
  input: Partial<ReplayV1EncodeInput> | null | undefined
): ReplayV1EncodeInput {
  const opts = input || {};
  return {
    width: opts.width as number,
    height: opts.height as number,
    initTiles: opts.initTiles || [],
    records: opts.records || [],
    startUnixMs: opts.startUnixMs,
    flags: opts.flags
  };
}

function normalizeRuleset(ruleset: ReplayV1Ruleset | null | undefined): ReplayV1Ruleset {
  return ruleset === "fibonacci" ? "fibonacci" : "pow2";
}

export function createReplayCodecRuntime(): ReplayCodecRuntime {
  return {
    REPLAY_V1_MAGIC,
    REPLAY_V1_FLAG_HAS_START_UNIX_MS,
    REPLAY_V1_FLAG_CONTAINS_UNDO_RECORDS,
    REPLAY_V1_FLAG_CONTAINS_CHECKPOINTS,
    REPLAY_V1_FLAG_EXTENDED_INIT_TILES,
    REPLAY_V1_RECORD_UNDO1,
    REPLAY_V1_RECORD_UNDON,
    REPLAY_V1_RECORD_CHECKPOINT,
    REPLAY_V1_RECORD_EXT,
    REPLAY_V1_RECORD_END,
    REPLAY_V1_RECORD_MOVE8,
    encodeReplay128,
    decodeReplay128,
    encodeBoardV4,
    decodeBoardV4,
    appendCompactMoveCode: (input) => appendCompactMoveCode(input || {}),
    appendCompactUndo,
    appendCompactPracticeAction: (input) => appendCompactPracticeAction(input || {}),
    encodeUleb128,
    decodeUleb128: (bytesLike, offset) => decodeUleb128(normalizeBytesLike(bytesLike), normalizeOffset(offset)),
    computeCrc32: (bytesLike) => computeCrc32(normalizeBytesLike(bytesLike)),
    encodeReplayV1Rpl: (input) => encodeReplayV1Rpl(normalizeReplayV1EncodeInput(input)),
    decodeReplayV1Rpl: (bytesLike) => decodeReplayV1Rpl(normalizeBytesLike(bytesLike)),
    replayV1InitTilesToBoard: (width, height, initTiles, ruleset) =>
      replayV1InitTilesToBoard(width, height, initTiles || [], normalizeRuleset(ruleset)),
    replayV1BoardToInitTiles: (width, height, board, ruleset) =>
      replayV1BoardToInitTiles(width, height, board, normalizeRuleset(ruleset)),
    replayV1RecordsToReplayActions: (records, width, ruleset) =>
      replayV1RecordsToReplayActions(records || [], width, normalizeRuleset(ruleset))
  };
}

export function installReplayCodecRuntime(
  options: ReplayCodecRuntimeInstallOptions = {}
): ReplayCodecRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ReplayCodecRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayCodecRuntime) {
    windowLike.CoreReplayCodecRuntime = createReplayCodecRuntime();
  }
  return windowLike.CoreReplayCodecRuntime || null;
}

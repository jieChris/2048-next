export interface SpawnInfo {
  x: number;
  y: number;
  value: number;
}

export interface PostMoveRecordInput {
  replayMode: boolean;
  direction: number;
  lastSpawn: SpawnInfo | null;
  width: number;
  height: number;
  isFibonacciMode: boolean;
  hasSessionReplayV3: boolean;
}

export interface PostMoveRecordResult {
  shouldRecordMoveHistory: boolean;
  compactMoveCode: number | null;
  shouldPushSessionAction: boolean;
  sessionAction: [string, number] | null;
  shouldResetLastSpawn: boolean;
}

export function computePostMoveRecord(input: PostMoveRecordInput): PostMoveRecordResult {
  if (input.replayMode) {
    return {
      shouldRecordMoveHistory: false,
      compactMoveCode: null,
      shouldPushSessionAction: false,
      sessionAction: null,
      shouldResetLastSpawn: false
    };
  }

  let compactMoveCode: number | null = null;
  const spawn = input.lastSpawn;
  if (
    spawn &&
    Number.isInteger(input.direction) &&
    Number(input.direction) >= 0 &&
    Number(input.direction) <= 3 &&
    Number.isInteger(input.width) &&
    Number.isInteger(input.height) &&
    Number(input.width) === 4 &&
    Number(input.height) === 4 &&
    !input.isFibonacciMode &&
    (spawn.value === 2 || spawn.value === 4) &&
    Number.isInteger(spawn.x) &&
    Number.isInteger(spawn.y)
  ) {
    const valBit = spawn.value === 4 ? 1 : 0;
    const posIdx = spawn.x + spawn.y * 4;
    compactMoveCode = (Number(input.direction) << 5) | (valBit << 4) | posIdx;
  }

  const shouldPushSessionAction = !!input.hasSessionReplayV3;
  return {
    shouldRecordMoveHistory: true,
    compactMoveCode,
    shouldPushSessionAction,
    sessionAction: shouldPushSessionAction ? ["m", Number(input.direction)] : null,
    shouldResetLastSpawn: true
  };
}

export interface ReplaySeekTargetInput {
  targetIndex: number;
  hasReplayMoves: boolean;
  replayMovesLength: number;
}

export interface ReplayStepPlanInput {
  action: unknown;
  hasReplaySpawns: boolean;
  spawnAtIndex: unknown;
}

export interface ReplayStepPlanResult {
  shouldInjectForcedSpawn: boolean;
  forcedSpawn: unknown;
}

export function normalizeReplaySeekTarget(input: ReplaySeekTargetInput): number {
  let targetIndex = input.targetIndex;
  if (targetIndex < 0) targetIndex = 0;
  if (input.hasReplayMoves && targetIndex > input.replayMovesLength) {
    targetIndex = input.replayMovesLength;
  }
  return targetIndex;
}

export function planReplayStep(input: ReplayStepPlanInput): ReplayStepPlanResult {
  const shouldInjectForcedSpawn = input.hasReplaySpawns && !Array.isArray(input.action);
  return {
    shouldInjectForcedSpawn,
    forcedSpawn: shouldInjectForcedSpawn ? input.spawnAtIndex : undefined
  };
}

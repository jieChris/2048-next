export interface ReplayStepExecutionInput {
  replayMoves: unknown;
  replaySpawns: unknown;
  replayIndex: number;
}

export interface ReplayStepExecutionPlan {
  action: unknown;
  shouldInjectForcedSpawn: boolean;
  forcedSpawn: unknown;
  nextReplayIndex: number;
}

export function planReplayStepExecution(input: ReplayStepExecutionInput): ReplayStepExecutionPlan {
  const moves = Array.isArray(input.replayMoves) ? input.replayMoves : [];
  const spawns = Array.isArray(input.replaySpawns) ? input.replaySpawns : null;
  const action = moves[input.replayIndex];
  const spawnAtIndex = spawns ? spawns[input.replayIndex] : undefined;
  const shouldInjectForcedSpawn = !!spawns && !Array.isArray(action);

  return {
    action,
    shouldInjectForcedSpawn,
    forcedSpawn: shouldInjectForcedSpawn ? spawnAtIndex : undefined,
    nextReplayIndex: input.replayIndex + 1
  };
}

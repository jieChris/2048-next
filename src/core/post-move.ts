export interface PostMoveLifecycleInput {
  successfulMoveCount: number;
  hasMovesAvailable: boolean;
  forcedOver?: boolean;
  timerStatus: number;
}

export interface PostMoveLifecycleResult {
  successfulMoveCount: number;
  over: boolean;
  shouldEndTime: boolean;
  shouldStartTimer: boolean;
}

export function computePostMoveLifecycle(input: PostMoveLifecycleInput): PostMoveLifecycleResult {
  const currentCount =
    Number.isInteger(input.successfulMoveCount) && Number(input.successfulMoveCount) >= 0
      ? Number(input.successfulMoveCount)
      : 0;
  const successfulMoveCount = currentCount + 1;
  const hasMovesAvailable = !!input.hasMovesAvailable;
  const forcedOver = !!input.forcedOver;
  const over = forcedOver || !hasMovesAvailable;
  const timerStatus = Number(input.timerStatus);

  return {
    successfulMoveCount,
    over,
    shouldEndTime: over,
    shouldStartTimer: timerStatus === 0 && !over
  };
}

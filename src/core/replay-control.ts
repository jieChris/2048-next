export interface ReplayTickBoundaryInput {
  shouldStopAtTick: boolean;
  replayEndState?: {
    shouldPause?: boolean;
    replayMode?: boolean;
  };
}

export interface ReplayTickBoundaryPlan {
  shouldStop: boolean;
  shouldPause: boolean;
  shouldApplyReplayMode: boolean;
  replayMode: boolean;
}

export function planReplayTickBoundary(input: ReplayTickBoundaryInput): ReplayTickBoundaryPlan {
  if (!input.shouldStopAtTick) {
    return {
      shouldStop: false,
      shouldPause: false,
      shouldApplyReplayMode: false,
      replayMode: true
    };
  }

  return {
    shouldStop: true,
    shouldPause: input.replayEndState?.shouldPause !== false,
    shouldApplyReplayMode: true,
    replayMode: input.replayEndState?.replayMode === true
  };
}

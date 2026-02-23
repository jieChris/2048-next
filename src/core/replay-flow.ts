export interface ReplayEndState {
  shouldPause: boolean;
  replayMode: boolean;
}

export interface ReplaySeekRewindInput {
  targetIndex: number;
  replayIndex: number;
  hasReplayStartBoard: boolean;
}

export interface ReplaySeekRewindPlan {
  shouldRewind: boolean;
  strategy: "none" | "board" | "seed";
  replayIndexAfterRewind: number;
}

export function computeReplayEndState(): ReplayEndState {
  return {
    shouldPause: true,
    replayMode: false
  };
}

export function planReplaySeekRewind(input: ReplaySeekRewindInput): ReplaySeekRewindPlan {
  const shouldRewind = input.targetIndex < input.replayIndex;
  if (!shouldRewind) {
    return {
      shouldRewind: false,
      strategy: "none",
      replayIndexAfterRewind: input.replayIndex
    };
  }

  return {
    shouldRewind: true,
    strategy: input.hasReplayStartBoard ? "board" : "seed",
    replayIndexAfterRewind: 0
  };
}

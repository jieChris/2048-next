export interface ReplayPauseState {
  isPaused: true;
  shouldClearInterval: true;
}

export interface ReplayResumeStateInput {
  replayDelay: number | null | undefined;
}

export interface ReplayResumeState {
  isPaused: false;
  shouldClearInterval: true;
  delay: number;
}

export interface ReplaySpeedStateInput {
  multiplier: number;
  isPaused: boolean;
  baseDelay?: number;
}

export interface ReplaySpeedState {
  replayDelay: number;
  shouldResume: boolean;
}

export interface ReplayTickStopInput {
  replayIndex: number;
  replayMovesLength: number;
}

export function computeReplayPauseState(): ReplayPauseState {
  return {
    isPaused: true,
    shouldClearInterval: true
  };
}

export function computeReplayResumeState(input: ReplayResumeStateInput): ReplayResumeState {
  return {
    isPaused: false,
    shouldClearInterval: true,
    delay: input.replayDelay || 200
  };
}

export function computeReplaySpeedState(input: ReplaySpeedStateInput): ReplaySpeedState {
  const baseDelay = typeof input.baseDelay === "number" ? input.baseDelay : 200;
  return {
    replayDelay: baseDelay / input.multiplier,
    shouldResume: !input.isPaused
  };
}

export function shouldStopReplayAtTick(input: ReplayTickStopInput): boolean {
  return input.replayIndex >= input.replayMovesLength;
}

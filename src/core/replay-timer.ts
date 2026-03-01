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

export interface DurationMsInput {
  timerStatus?: number | null;
  startTimeMs?: number | null;
  accumulatedTime?: number | null;
  sessionStartedAt?: number | null;
  nowMs?: number | null;
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

export function resolveDurationMs(input: DurationMsInput): number {
  const nowRaw = Number(input.nowMs);
  const nowMs = Number.isFinite(nowRaw) ? nowRaw : Date.now();
  let ms = 0;
  if (input.timerStatus === 1 && Number.isFinite(Number(input.startTimeMs))) {
    ms = nowMs - Number(input.startTimeMs);
  } else {
    ms = Number(input.accumulatedTime) || 0;
  }
  if (!Number.isFinite(ms) || ms < 0) {
    const startedRaw = Number(input.sessionStartedAt);
    const startedAt = Number.isFinite(startedRaw) && startedRaw > 0 ? startedRaw : nowMs;
    ms = nowMs - startedAt;
  }
  ms = Math.floor(ms);
  return ms < 0 ? 0 : ms;
}

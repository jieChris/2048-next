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
  timerElapsedOffsetMs?: number | null;
  timerAnchorLocalMs?: number | null;
  timerAnchorServerMs?: number | null;
  timerServerNowMs?: number | null;
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
  const offsetRaw = Number(input.timerElapsedOffsetMs);
  const offsetMs =
    input.timerElapsedOffsetMs !== undefined && input.timerElapsedOffsetMs !== null && Number.isFinite(offsetRaw) && offsetRaw >= 0
      ? Math.floor(offsetRaw)
      : 0;
  const serverAnchorRaw = Number(input.timerAnchorServerMs);
  const serverNowRaw = Number(input.timerServerNowMs);
  if (
    input.timerStatus === 1 &&
    input.timerAnchorServerMs !== undefined &&
    input.timerAnchorServerMs !== null &&
    Number.isFinite(serverAnchorRaw) &&
    serverAnchorRaw >= 0 &&
    input.timerServerNowMs !== undefined &&
    input.timerServerNowMs !== null &&
    Number.isFinite(serverNowRaw) &&
    serverNowRaw >= 0
  ) {
    return Math.max(0, Math.floor(offsetMs + Math.max(0, serverNowRaw - serverAnchorRaw)));
  }
  const localAnchorRaw = Number(input.timerAnchorLocalMs);
  if (
    input.timerStatus === 1 &&
    input.timerAnchorLocalMs !== undefined &&
    input.timerAnchorLocalMs !== null &&
    Number.isFinite(localAnchorRaw) &&
    localAnchorRaw >= 0
  ) {
    return Math.max(0, Math.floor(offsetMs + Math.max(0, nowMs - localAnchorRaw)));
  }
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

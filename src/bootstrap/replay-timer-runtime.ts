import {
  computeReplayPauseState,
  computeReplayResumeState,
  computeReplaySpeedState,
  resolveDurationMs,
  shouldStopReplayAtTick,
  type DurationMsInput,
  type ReplayPauseState,
  type ReplayResumeState,
  type ReplayResumeStateInput,
  type ReplaySpeedState,
  type ReplaySpeedStateInput,
  type ReplayTickStopInput
} from "../core/replay-timer";

export type ReplayResumeRuntimeInput = Partial<ReplayResumeStateInput> | null | undefined;
export type ReplaySpeedRuntimeInput = Partial<ReplaySpeedStateInput> | null | undefined;
export type ReplayTickStopRuntimeInput = Partial<ReplayTickStopInput> | null | undefined;
export type DurationMsRuntimeInput = Partial<DurationMsInput> | null | undefined;

export interface ReplayTimerRuntime {
  computeReplayPauseState: () => ReplayPauseState;
  computeReplayResumeState: (input: ReplayResumeRuntimeInput) => ReplayResumeState;
  computeReplaySpeedState: (input: ReplaySpeedRuntimeInput) => ReplaySpeedState;
  shouldStopReplayAtTick: (input: ReplayTickStopRuntimeInput) => boolean;
  resolveDurationMs: (input: DurationMsRuntimeInput) => number;
}

export interface ReplayTimerRuntimeWindowLike {
  CoreReplayTimerRuntime?: ReplayTimerRuntime;
}

export interface ReplayTimerRuntimeInstallOptions {
  windowLike?: ReplayTimerRuntimeWindowLike | null | undefined;
}

function normalizeReplayResumeInput(input: ReplayResumeRuntimeInput): ReplayResumeStateInput {
  const opts = input || {};
  return {
    replayDelay: opts.replayDelay
  };
}

function normalizeReplaySpeedInput(input: ReplaySpeedRuntimeInput): ReplaySpeedStateInput {
  const opts = input || {};
  return {
    multiplier: opts.multiplier as number,
    isPaused: Boolean(opts.isPaused),
    baseDelay: opts.baseDelay
  };
}

function normalizeReplayTickStopInput(input: ReplayTickStopRuntimeInput): ReplayTickStopInput {
  const opts = input || {};
  return {
    replayIndex: opts.replayIndex as number,
    replayMovesLength: opts.replayMovesLength as number
  };
}

function normalizeDurationMsInput(input: DurationMsRuntimeInput): DurationMsInput {
  return input || {};
}

export function createReplayTimerRuntime(): ReplayTimerRuntime {
  return {
    computeReplayPauseState,
    computeReplayResumeState: (input) => computeReplayResumeState(normalizeReplayResumeInput(input)),
    computeReplaySpeedState: (input) => computeReplaySpeedState(normalizeReplaySpeedInput(input)),
    shouldStopReplayAtTick: (input) => shouldStopReplayAtTick(normalizeReplayTickStopInput(input)),
    resolveDurationMs: (input) => resolveDurationMs(normalizeDurationMsInput(input))
  };
}

export function installReplayTimerRuntime(
  options: ReplayTimerRuntimeInstallOptions = {}
): ReplayTimerRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ReplayTimerRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayTimerRuntime) {
    windowLike.CoreReplayTimerRuntime = createReplayTimerRuntime();
  }
  return windowLike.CoreReplayTimerRuntime || null;
}

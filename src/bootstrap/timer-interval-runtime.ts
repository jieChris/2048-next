import {
  resolveInvalidatedSecondaryTimerElementIds,
  resolveInvalidatedTimerElementIds,
  resolveMoveInputThrottleMs,
  resolveTimerUpdateIntervalMs
} from "../core/timer-interval";

export interface TimerIntervalRuntime {
  resolveTimerUpdateIntervalMs: typeof resolveTimerUpdateIntervalMs;
  resolveMoveInputThrottleMs: typeof resolveMoveInputThrottleMs;
  resolveInvalidatedTimerElementIds: typeof resolveInvalidatedTimerElementIds;
  resolveInvalidatedSecondaryTimerElementIds: typeof resolveInvalidatedSecondaryTimerElementIds;
}

export interface TimerIntervalRuntimeWindowLike {
  CoreTimerIntervalRuntime?: TimerIntervalRuntime;
}

export interface TimerIntervalRuntimeInstallOptions {
  windowLike?: TimerIntervalRuntimeWindowLike | null | undefined;
}

export function createTimerIntervalRuntime(): TimerIntervalRuntime {
  return {
    resolveTimerUpdateIntervalMs,
    resolveMoveInputThrottleMs,
    resolveInvalidatedTimerElementIds,
    resolveInvalidatedSecondaryTimerElementIds
  };
}

export function installTimerIntervalRuntime(
  options: TimerIntervalRuntimeInstallOptions = {}
): TimerIntervalRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as TimerIntervalRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreTimerIntervalRuntime) {
    windowLike.CoreTimerIntervalRuntime = createTimerIntervalRuntime();
  }
  return windowLike.CoreTimerIntervalRuntime || null;
}

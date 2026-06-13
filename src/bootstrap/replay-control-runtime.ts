import {
  planReplayTickBoundary,
  type ReplayTickBoundaryInput,
  type ReplayTickBoundaryPlan
} from "../core/replay-control";

export type ReplayTickBoundaryRuntimeInput =
  | Partial<ReplayTickBoundaryInput>
  | null
  | undefined;

export interface ReplayControlRuntime {
  planReplayTickBoundary: (input: ReplayTickBoundaryRuntimeInput) => ReplayTickBoundaryPlan;
}

export interface ReplayControlRuntimeWindowLike {
  CoreReplayControlRuntime?: ReplayControlRuntime;
}

export interface ReplayControlRuntimeInstallOptions {
  windowLike?: ReplayControlRuntimeWindowLike | null | undefined;
}

function normalizeReplayTickBoundaryInput(
  input: ReplayTickBoundaryRuntimeInput
): ReplayTickBoundaryInput {
  const opts = input || {};
  return {
    shouldStopAtTick: Boolean(opts.shouldStopAtTick),
    replayEndState: opts.replayEndState || {}
  };
}

export function createReplayControlRuntime(): ReplayControlRuntime {
  return {
    planReplayTickBoundary: (input) =>
      planReplayTickBoundary(normalizeReplayTickBoundaryInput(input))
  };
}

export function installReplayControlRuntime(
  options: ReplayControlRuntimeInstallOptions = {}
): ReplayControlRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ReplayControlRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayControlRuntime) {
    windowLike.CoreReplayControlRuntime = createReplayControlRuntime();
  }
  return windowLike.CoreReplayControlRuntime || null;
}

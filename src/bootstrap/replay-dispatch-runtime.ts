import {
  planReplayDispatch,
  type ReplayDispatchInput,
  type ReplayDispatchPlan
} from "../core/replay-dispatch";

export type ReplayDispatchRuntimeInput = Partial<ReplayDispatchInput> | null | undefined;

export interface ReplayDispatchRuntime {
  planReplayDispatch: (input: ReplayDispatchRuntimeInput) => ReplayDispatchPlan;
}

export interface ReplayDispatchRuntimeWindowLike {
  CoreReplayDispatchRuntime?: ReplayDispatchRuntime;
}

export interface ReplayDispatchRuntimeInstallOptions {
  windowLike?: ReplayDispatchRuntimeWindowLike | null | undefined;
}

function normalizeReplayDispatchInput(input: ReplayDispatchRuntimeInput): ReplayDispatchInput {
  const opts = input || {};
  return {
    kind: opts.kind as string,
    dir: opts.dir,
    x: opts.x,
    y: opts.y,
    value: opts.value
  };
}

export function createReplayDispatchRuntime(): ReplayDispatchRuntime {
  return {
    planReplayDispatch: (input) => planReplayDispatch(normalizeReplayDispatchInput(input))
  };
}

export function installReplayDispatchRuntime(
  options: ReplayDispatchRuntimeInstallOptions = {}
): ReplayDispatchRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as ReplayDispatchRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayDispatchRuntime) {
    windowLike.CoreReplayDispatchRuntime = createReplayDispatchRuntime();
  }
  return windowLike.CoreReplayDispatchRuntime || null;
}

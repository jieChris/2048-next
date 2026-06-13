import {
  computeReplayEndState,
  planReplaySeekRestart,
  planReplaySeekRewind,
  type ReplayEndState,
  type ReplaySeekRestartInput,
  type ReplaySeekRestartPlan,
  type ReplaySeekRewindInput,
  type ReplaySeekRewindPlan
} from "../core/replay-flow";

export type ReplaySeekRewindRuntimeInput = Partial<ReplaySeekRewindInput> | null | undefined;
export type ReplaySeekRestartRuntimeInput = Partial<ReplaySeekRestartInput> | null | undefined;

export interface ReplayFlowRuntime {
  computeReplayEndState: () => ReplayEndState;
  planReplaySeekRewind: (input: ReplaySeekRewindRuntimeInput) => ReplaySeekRewindPlan;
  planReplaySeekRestart: (input: ReplaySeekRestartRuntimeInput) => ReplaySeekRestartPlan;
}

export interface ReplayFlowRuntimeWindowLike {
  CoreReplayFlowRuntime?: ReplayFlowRuntime;
}

export interface ReplayFlowRuntimeInstallOptions {
  windowLike?: ReplayFlowRuntimeWindowLike | null | undefined;
}

function normalizeReplaySeekRewindInput(
  input: ReplaySeekRewindRuntimeInput
): ReplaySeekRewindInput {
  const opts = input || {};
  return {
    targetIndex: opts.targetIndex as number,
    replayIndex: opts.replayIndex as number,
    hasReplayStartBoard: Boolean(opts.hasReplayStartBoard)
  };
}

function normalizeReplaySeekRestartInput(
  input: ReplaySeekRestartRuntimeInput
): ReplaySeekRestartInput {
  const opts = input || {};
  return {
    shouldRewind: Boolean(opts.shouldRewind),
    strategy: opts.strategy as "none" | "board" | "seed",
    replayIndexAfterRewind: opts.replayIndexAfterRewind as number
  };
}

export function createReplayFlowRuntime(): ReplayFlowRuntime {
  return {
    computeReplayEndState,
    planReplaySeekRewind: (input) =>
      planReplaySeekRewind(normalizeReplaySeekRewindInput(input)),
    planReplaySeekRestart: (input) =>
      planReplaySeekRestart(normalizeReplaySeekRestartInput(input))
  };
}

export function installReplayFlowRuntime(
  options: ReplayFlowRuntimeInstallOptions = {}
): ReplayFlowRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ReplayFlowRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayFlowRuntime) {
    windowLike.CoreReplayFlowRuntime = createReplayFlowRuntime();
  }
  return windowLike.CoreReplayFlowRuntime || null;
}

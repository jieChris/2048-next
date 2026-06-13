import {
  normalizeReplaySeekTarget,
  planReplayStep,
  type ReplaySeekTargetInput,
  type ReplayStepPlanInput,
  type ReplayStepPlanResult
} from "../core/replay-lifecycle";

export type ReplaySeekTargetRuntimeInput =
  | (Partial<ReplaySeekTargetInput> & { replayIndex?: unknown; targetIndex?: unknown })
  | null
  | undefined;
export type ReplayStepRuntimeInput = Partial<ReplayStepPlanInput> | null | undefined;

export interface ReplayLifecycleRuntime {
  normalizeReplaySeekTarget: (input: ReplaySeekTargetRuntimeInput) => number;
  planReplayStep: (input: ReplayStepRuntimeInput) => ReplayStepPlanResult;
}

export interface ReplayLifecycleRuntimeWindowLike {
  CoreReplayLifecycleRuntime?: ReplayLifecycleRuntime;
}

export interface ReplayLifecycleRuntimeInstallOptions {
  windowLike?: ReplayLifecycleRuntimeWindowLike | null | undefined;
}

function normalizeSeekTargetNumber(input: ReplaySeekTargetRuntimeInput): number {
  const opts = input || {};
  let targetIndex = Number(opts.targetIndex);
  if (!Number.isFinite(targetIndex)) {
    targetIndex = Number(opts.replayIndex);
  }
  if (!Number.isFinite(targetIndex)) {
    targetIndex = 0;
  }
  return Math.floor(targetIndex);
}

function normalizeReplaySeekTargetInput(
  input: ReplaySeekTargetRuntimeInput
): ReplaySeekTargetInput {
  const opts = input || {};
  return {
    targetIndex: normalizeSeekTargetNumber(input),
    hasReplayMoves: Boolean(opts.hasReplayMoves),
    replayMovesLength: opts.replayMovesLength as number
  };
}

function normalizeReplayStepInput(input: ReplayStepRuntimeInput): ReplayStepPlanInput {
  const opts = input || {};
  return {
    action: opts.action,
    hasReplaySpawns: Boolean(opts.hasReplaySpawns),
    spawnAtIndex: opts.spawnAtIndex
  };
}

export function createReplayLifecycleRuntime(): ReplayLifecycleRuntime {
  return {
    normalizeReplaySeekTarget: (input) =>
      normalizeReplaySeekTarget(normalizeReplaySeekTargetInput(input)),
    planReplayStep: (input) => planReplayStep(normalizeReplayStepInput(input))
  };
}

export function installReplayLifecycleRuntime(
  options: ReplayLifecycleRuntimeInstallOptions = {}
): ReplayLifecycleRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as ReplayLifecycleRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayLifecycleRuntime) {
    windowLike.CoreReplayLifecycleRuntime = createReplayLifecycleRuntime();
  }
  return windowLike.CoreReplayLifecycleRuntime || null;
}

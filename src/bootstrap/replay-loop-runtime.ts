import {
  planReplayStepExecution,
  type ReplayStepExecutionInput,
  type ReplayStepExecutionPlan
} from "../core/replay-loop";

export type ReplayStepExecutionRuntimeInput =
  | Partial<ReplayStepExecutionInput>
  | null
  | undefined;

export interface ReplayLoopRuntime {
  planReplayStepExecution: (input: ReplayStepExecutionRuntimeInput) => ReplayStepExecutionPlan;
}

export interface ReplayLoopRuntimeWindowLike {
  CoreReplayLoopRuntime?: ReplayLoopRuntime;
}

export interface ReplayLoopRuntimeInstallOptions {
  windowLike?: ReplayLoopRuntimeWindowLike | null | undefined;
}

function normalizeReplayStepExecutionInput(
  input: ReplayStepExecutionRuntimeInput
): ReplayStepExecutionInput {
  const opts = input || {};
  return {
    replayMoves: opts.replayMoves,
    replaySpawns: opts.replaySpawns,
    replayIndex: opts.replayIndex as number
  };
}

export function createReplayLoopRuntime(): ReplayLoopRuntime {
  return {
    planReplayStepExecution: (input) =>
      planReplayStepExecution(normalizeReplayStepExecutionInput(input))
  };
}

export function installReplayLoopRuntime(
  options: ReplayLoopRuntimeInstallOptions = {}
): ReplayLoopRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ReplayLoopRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayLoopRuntime) {
    windowLike.CoreReplayLoopRuntime = createReplayLoopRuntime();
  }
  return windowLike.CoreReplayLoopRuntime || null;
}

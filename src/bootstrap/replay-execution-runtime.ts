import {
  computeReplayStepStats,
  getReplayActionKind,
  resolveIpsDisplayText,
  resolveIpsInputCount,
  resolveNextIpsInputCount,
  resolveReplayExecution,
  type IpsDisplayTextInput,
  type IpsDisplayTextResult,
  type IpsInputCountInput,
  type NextIpsInputCountResult,
  type ReplayActionKind,
  type ReplayExecution,
  type ReplayStepStatsInput,
  type ReplayStepStatsResult
} from "../core/replay-execution";

export type ReplayExecutionRuntimeObjectInput<T> = Partial<T> | null | undefined;

export interface ReplayExecutionRuntime {
  getReplayActionKind: (action: unknown) => ReplayActionKind;
  computeReplayStepStats: (
    input: ReplayExecutionRuntimeObjectInput<ReplayStepStatsInput>
  ) => ReplayStepStatsResult;
  resolveIpsInputCount: (input: ReplayExecutionRuntimeObjectInput<IpsInputCountInput>) => number;
  resolveNextIpsInputCount: (
    input: ReplayExecutionRuntimeObjectInput<IpsInputCountInput>
  ) => NextIpsInputCountResult;
  resolveIpsDisplayText: (
    input: ReplayExecutionRuntimeObjectInput<IpsDisplayTextInput>
  ) => IpsDisplayTextResult;
  resolveReplayExecution: (action: unknown) => ReplayExecution;
}

export interface ReplayExecutionRuntimeWindowLike {
  CoreReplayExecutionRuntime?: ReplayExecutionRuntime;
}

export interface ReplayExecutionRuntimeInstallOptions {
  windowLike?: ReplayExecutionRuntimeWindowLike | null | undefined;
}

function normalizeReplayStepStatsInput(
  input: ReplayExecutionRuntimeObjectInput<ReplayStepStatsInput>
): ReplayStepStatsInput {
  const opts = input || {};
  return {
    actions: opts.actions,
    limit: opts.limit
  };
}

function normalizeIpsInputCountInput(
  input: ReplayExecutionRuntimeObjectInput<IpsInputCountInput>
): IpsInputCountInput {
  const opts = input || {};
  return {
    replayMode: opts.replayMode,
    replayIndex: opts.replayIndex,
    ipsInputCount: opts.ipsInputCount,
    ipsInputTimes: opts.ipsInputTimes,
    nowMs: opts.nowMs
  };
}

function normalizeIpsDisplayTextInput(
  input: ReplayExecutionRuntimeObjectInput<IpsDisplayTextInput>
): IpsDisplayTextInput {
  const opts = input || {};
  return {
    durationMs: opts.durationMs,
    ipsInputCount: opts.ipsInputCount
  };
}

export function createReplayExecutionRuntime(): ReplayExecutionRuntime {
  return {
    getReplayActionKind,
    computeReplayStepStats: (input) =>
      computeReplayStepStats(normalizeReplayStepStatsInput(input)),
    resolveIpsInputCount: (input) => resolveIpsInputCount(normalizeIpsInputCountInput(input)),
    resolveNextIpsInputCount: (input) =>
      resolveNextIpsInputCount(normalizeIpsInputCountInput(input)),
    resolveIpsDisplayText: (input) =>
      resolveIpsDisplayText(normalizeIpsDisplayTextInput(input)),
    resolveReplayExecution
  };
}

export function installReplayExecutionRuntime(
  options: ReplayExecutionRuntimeInstallOptions = {}
): ReplayExecutionRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as ReplayExecutionRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayExecutionRuntime) {
    windowLike.CoreReplayExecutionRuntime = createReplayExecutionRuntime();
  }
  return windowLike.CoreReplayExecutionRuntime || null;
}

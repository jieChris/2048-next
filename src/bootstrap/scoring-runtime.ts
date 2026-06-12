import { computePostMoveScore } from "../core/scoring";

export interface ScoringRuntime {
  computePostMoveScore: typeof computePostMoveScore;
}

export interface ScoringRuntimeWindowLike {
  CoreScoringRuntime?: ScoringRuntime;
}

export interface ScoringRuntimeInstallOptions {
  windowLike?: ScoringRuntimeWindowLike | null | undefined;
}

export function createScoringRuntime(): ScoringRuntime {
  return {
    computePostMoveScore
  };
}

export function installScoringRuntime(
  options: ScoringRuntimeInstallOptions = {}
): ScoringRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ScoringRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreScoringRuntime) {
    windowLike.CoreScoringRuntime = createScoringRuntime();
  }
  return windowLike.CoreScoringRuntime || null;
}

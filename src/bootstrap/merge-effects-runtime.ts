import { computeMergeEffects } from "../core/merge-effects";

export interface MergeEffectsRuntime {
  computeMergeEffects: typeof computeMergeEffects;
}

export interface MergeEffectsRuntimeWindowLike {
  CoreMergeEffectsRuntime?: MergeEffectsRuntime;
}

export interface MergeEffectsRuntimeInstallOptions {
  windowLike?: MergeEffectsRuntimeWindowLike | null | undefined;
}

export function createMergeEffectsRuntime(): MergeEffectsRuntime {
  return {
    computeMergeEffects
  };
}

export function installMergeEffectsRuntime(
  options: MergeEffectsRuntimeInstallOptions = {}
): MergeEffectsRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as MergeEffectsRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreMergeEffectsRuntime) {
    windowLike.CoreMergeEffectsRuntime = createMergeEffectsRuntime();
  }
  return windowLike.CoreMergeEffectsRuntime || null;
}

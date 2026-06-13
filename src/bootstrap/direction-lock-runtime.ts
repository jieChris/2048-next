import {
  getLockedDirectionState,
  type LockedDirectionState,
  type LockedDirectionStateInput
} from "../core/direction-lock";

export interface DirectionLockRuntime {
  getLockedDirectionState: (
    input: LockedDirectionStateInput,
    randomFromSeed?: LockedDirectionStateInput["randomFromSeed"]
  ) => LockedDirectionState;
}

export interface DirectionLockRuntimeWindowLike {
  CoreDirectionLockRuntime?: DirectionLockRuntime;
}

export interface DirectionLockRuntimeInstallOptions {
  windowLike?: DirectionLockRuntimeWindowLike | null | undefined;
}

export function createDirectionLockRuntime(): DirectionLockRuntime {
  return {
    getLockedDirectionState: (input, randomFromSeed) =>
      getLockedDirectionState({
        ...input,
        randomFromSeed:
          typeof randomFromSeed === "function" ? randomFromSeed : input.randomFromSeed
      })
  };
}

export function installDirectionLockRuntime(
  options: DirectionLockRuntimeInstallOptions = {}
): DirectionLockRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as DirectionLockRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreDirectionLockRuntime) {
    windowLike.CoreDirectionLockRuntime = createDirectionLockRuntime();
  }
  return windowLike.CoreDirectionLockRuntime || null;
}

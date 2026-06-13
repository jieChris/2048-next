import {
  decodeReplayV4Actions,
  type ReplayV4ActionsResult
} from "../core/replay-v4-actions";

export interface ReplayV4ActionsRuntime {
  decodeReplayV4Actions: (actionsEncoded: string) => ReplayV4ActionsResult;
}

export interface ReplayV4ActionsRuntimeWindowLike {
  CoreReplayV4ActionsRuntime?: ReplayV4ActionsRuntime;
}

export interface ReplayV4ActionsRuntimeInstallOptions {
  windowLike?: ReplayV4ActionsRuntimeWindowLike | null | undefined;
}

export function createReplayV4ActionsRuntime(): ReplayV4ActionsRuntime {
  return {
    decodeReplayV4Actions
  };
}

export function installReplayV4ActionsRuntime(
  options: ReplayV4ActionsRuntimeInstallOptions = {}
): ReplayV4ActionsRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as ReplayV4ActionsRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayV4ActionsRuntime) {
    windowLike.CoreReplayV4ActionsRuntime = createReplayV4ActionsRuntime();
  }
  return windowLike.CoreReplayV4ActionsRuntime || null;
}

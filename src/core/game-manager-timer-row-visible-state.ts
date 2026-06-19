export interface GameManagerTimerRowElementLike {
  removeAttribute?: (name: string) => void;
  style: {
    display: string;
    visibility: string;
    pointerEvents: string;
  };
}

export interface GameManagerTimerRowVisibleStateManager {
  getTimerRowEl: (value: unknown) => GameManagerTimerRowElementLike | null | undefined;
}

export interface GameManagerTimerRowVisibleStateRuntime {
  setTimerRowVisibleState: typeof setTimerRowVisibleState;
}

export interface GameManagerTimerRowVisibleStateWindowLike {
  CoreGameManagerTimerRowVisibleStateRuntime?: GameManagerTimerRowVisibleStateRuntime;
}

export interface GameManagerTimerRowVisibleStateRuntimeInstallOptions {
  windowLike?: GameManagerTimerRowVisibleStateWindowLike | null;
}

export function setTimerRowVisibleState(
  manager: GameManagerTimerRowVisibleStateManager | null | undefined,
  value: unknown,
  visible: boolean,
  keepSpace: boolean
): void {
  if (!manager) return;
  const row = manager.getTimerRowEl(value);
  if (!row) return;
  row.removeAttribute?.("data-scroll-hidden");
  row.style.display = "block";
  if (visible) {
    row.style.visibility = "visible";
    row.style.pointerEvents = "";
    return;
  }
  if (keepSpace) {
    row.style.visibility = "hidden";
    row.style.pointerEvents = "none";
    return;
  }
  row.style.display = "none";
  row.style.visibility = "";
  row.style.pointerEvents = "";
}

export function createGameManagerTimerRowVisibleStateRuntime(): GameManagerTimerRowVisibleStateRuntime {
  return {
    setTimerRowVisibleState
  };
}

export function installGameManagerTimerRowVisibleStateRuntime(
  options: GameManagerTimerRowVisibleStateRuntimeInstallOptions = {}
): GameManagerTimerRowVisibleStateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerTimerRowVisibleStateWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerTimerRowVisibleStateRuntime) {
    target.CoreGameManagerTimerRowVisibleStateRuntime =
      createGameManagerTimerRowVisibleStateRuntime();
  }
  return target.CoreGameManagerTimerRowVisibleStateRuntime;
}

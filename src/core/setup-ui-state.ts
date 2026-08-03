export interface SetupUiStateManagerLike {
  getWindowLike?: () => SetupUiStateWindowLike | null;
  refreshSpawnRateDisplay?: () => void;
  updateItemModeHud?: () => void;
  updateMoveTimeoutHud?: (nowMs?: number) => void;
  startTimer?: () => void;
  updateUndoUiState?: () => void;
  notifyUndoSettingsStateChanged?: () => void;
  applyTimerModuleView?: (preferredTimerModuleView: unknown, skipPersist: boolean) => void;
  actuate?: () => void;
  callWindowMethod?: (name: string) => boolean;
  updateStatsPanel?: (
    totalSteps?: number,
    moveSteps?: number,
    undoSteps?: number,
    validInputs?: number,
    invalidInputs?: number
  ) => void;
  replayMode?: boolean;
  timerStatus?: number;
}

export interface SetupUiStateWindowLike {
  refreshSpawnRateDisplay?: (manager: SetupUiStateManagerLike) => void;
  cappedTimerReset?: () => void;
  updateTimerScroll?: () => void;
  updateItemModeHud?: (manager: SetupUiStateManagerLike) => void;
  resetMoveTimeoutDeadline?: (manager: SetupUiStateManagerLike, nowMs: number) => void;
  hasMoveTimeoutMode?: (manager: SetupUiStateManagerLike) => boolean;
  updateMoveTimeoutHud?: (manager: SetupUiStateManagerLike, nowMs: number) => void;
  CoreNoXSelectionRuntime?: {
    ensureNoXSelectionOverlayForManager?: (manager: SetupUiStateManagerLike) => void;
  } | null;
}

export interface SetupUiStateRuntime {
  finalizeSetupUiAndStatsState: typeof finalizeSetupUiAndStatsState;
}

export interface SetupUiStateRuntimeWindowLike {
  CoreSetupUiStateRuntime?: SetupUiStateRuntime;
}

export interface SetupUiStateRuntimeInstallOptions {
  windowLike?: SetupUiStateRuntimeWindowLike | null;
}

function resolveWindowLike(manager: SetupUiStateManagerLike | null | undefined): SetupUiStateWindowLike | null {
  return manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
}

export function finalizeSetupUiAndStatsState(
  manager: SetupUiStateManagerLike | null | undefined,
  preferredTimerModuleView: unknown,
  restoredFromSavedState: boolean
): void {
  if (!manager) return;
  const windowLike = resolveWindowLike(manager);
  if (typeof manager.refreshSpawnRateDisplay === "function") {
    manager.refreshSpawnRateDisplay();
  } else {
    windowLike?.refreshSpawnRateDisplay?.(manager);
  }
  manager.updateUndoUiState?.();
  manager.notifyUndoSettingsStateChanged?.();
  manager.applyTimerModuleView?.(preferredTimerModuleView, true);
  manager.actuate?.();
  if (restoredFromSavedState) {
    if (!manager.callWindowMethod?.("cappedTimerReset")) {
      manager.callWindowMethod?.("updateTimerScroll");
    }
  }
  if (typeof manager.updateItemModeHud === "function") {
    manager.updateItemModeHud();
  } else {
    windowLike?.updateItemModeHud?.(manager);
  }
  windowLike?.resetMoveTimeoutDeadline?.(manager, Date.now());
  if (
    windowLike?.hasMoveTimeoutMode?.(manager) === true &&
    !manager.replayMode &&
    manager.timerStatus === 0
  ) {
    manager.startTimer?.();
  }
  if (typeof manager.updateMoveTimeoutHud === "function") {
    manager.updateMoveTimeoutHud(Date.now());
  } else {
    windowLike?.updateMoveTimeoutHud?.(manager, Date.now());
  }
  if (restoredFromSavedState) {
    manager.updateStatsPanel?.();
  } else {
    manager.updateStatsPanel?.(0, 0, 0, 0, 0);
  }
  windowLike?.CoreNoXSelectionRuntime?.ensureNoXSelectionOverlayForManager?.(manager);
}

export function createSetupUiStateRuntime(): SetupUiStateRuntime {
  return {
    finalizeSetupUiAndStatsState
  };
}

export function installSetupUiStateRuntime(
  options: SetupUiStateRuntimeInstallOptions = {}
): SetupUiStateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SetupUiStateRuntimeWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSetupUiStateRuntime) {
    target.CoreSetupUiStateRuntime = createSetupUiStateRuntime();
  }
  return target.CoreSetupUiStateRuntime;
}

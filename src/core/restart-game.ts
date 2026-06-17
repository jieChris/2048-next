export interface RestartGameManagerLike {
  modeKey?: unknown;
  modeConfig?: unknown;
  practiceRestartBoardMatrix?: unknown;
  practiceRestartModeConfig?: unknown;
  isTestMode?: boolean;
  actuator?: {
    continue?: () => void;
  } | null;
  setRuntimeUndoStack?: (stack: unknown[]) => void;
  setRuntimeRedoStack?: (stack: unknown[]) => void;
  clearSavedGameState?: (modeKey: unknown) => void;
  setup?: (seed?: unknown, options?: unknown) => void;
}

export interface RestartGameOperations {
  confirmRestart?: (message: string) => boolean;
  resolveRestartConfirmMessage?: (manager: RestartGameManagerLike) => string;
  shouldClearPracticeBoardOnRestart?: (manager: RestartGameManagerLike) => boolean;
  createEmptyPracticeBoardMatrix?: (manager: RestartGameManagerLike) => unknown;
  restartWithBoard?: (
    manager: RestartGameManagerLike,
    board: unknown,
    modeConfig: unknown,
    options: Record<string, boolean>
  ) => void;
}

export interface RestartGameRuntime {
  restartGame: typeof restartGame;
}

export interface RestartGameWindowLike {
  CoreRestartGameRuntime?: RestartGameRuntime;
}

export interface RestartGameRuntimeInstallOptions {
  windowLike?: RestartGameWindowLike | null;
}

function getPracticeModeConfig(manager: RestartGameManagerLike): unknown {
  return manager.practiceRestartModeConfig || manager.modeConfig;
}

function restartPracticeGame(manager: RestartGameManagerLike, operations: RestartGameOperations): boolean {
  if (!(manager.modeKey === "practice" && manager.practiceRestartBoardMatrix)) return false;
  if (operations.shouldClearPracticeBoardOnRestart?.(manager)) {
    operations.restartWithBoard?.(
      manager,
      operations.createEmptyPracticeBoardMatrix?.(manager),
      getPracticeModeConfig(manager),
      { setPracticeRestartBase: true }
    );
    manager.isTestMode = true;
    return true;
  }
  operations.restartWithBoard?.(
    manager,
    manager.practiceRestartBoardMatrix,
    getPracticeModeConfig(manager),
    { preservePracticeRestartBase: true }
  );
  manager.isTestMode = true;
  return true;
}

export function restartGame(
  manager: RestartGameManagerLike | null | undefined,
  operations: RestartGameOperations = {}
): void {
  if (!manager) return;
  const message = operations.resolveRestartConfirmMessage?.(manager) || "";
  if (operations.confirmRestart?.(message) !== true) return;
  manager.actuator?.continue?.();
  manager.setRuntimeUndoStack?.([]);
  manager.setRuntimeRedoStack?.([]);
  manager.clearSavedGameState?.(manager.modeKey);
  if (restartPracticeGame(manager, operations)) return;
  manager.setup?.(undefined, { disableStateRestore: true });
}

export function createRestartGameRuntime(): RestartGameRuntime {
  return {
    restartGame
  };
}

export function installRestartGameRuntime(
  options: RestartGameRuntimeInstallOptions = {}
): RestartGameRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as RestartGameWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreRestartGameRuntime) {
    target.CoreRestartGameRuntime = createRestartGameRuntime();
  }
  return target.CoreRestartGameRuntime;
}

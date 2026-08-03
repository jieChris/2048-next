export interface GameManagerUndoMoveHandlerManagerLike {
  undoStack?: unknown[];
  timerStatus?: number;
  startTimer?: () => void;
  normalizeUndoStackEntry?: (entry: unknown) => unknown;
}

export interface GameManagerUndoMoveHandlerOperations {
  actuate?: (manager: GameManagerUndoMoveHandlerManagerLike) => void;
  canExecuteRedoMove?: (manager: GameManagerUndoMoveHandlerManagerLike) => boolean;
  canExecuteUndoMove?: (manager: GameManagerUndoMoveHandlerManagerLike) => boolean;
  executeRedoRestorePipeline?: (manager: GameManagerUndoMoveHandlerManagerLike) => unknown;
  executeUndoRestorePipeline?: (
    manager: GameManagerUndoMoveHandlerManagerLike,
    direction: number
  ) => unknown;
  pushRedoSnapshotBeforeUndo?: (
    manager: GameManagerUndoMoveHandlerManagerLike,
    upcomingUndoEntry: unknown
  ) => void;
  shouldStartTimerAfterRedoRestore?: (
    manager: GameManagerUndoMoveHandlerManagerLike,
    redoRestore: unknown
  ) => boolean;
  shouldStartTimerAfterUndoRestore?: (
    manager: GameManagerUndoMoveHandlerManagerLike,
    undoRestore: unknown
  ) => boolean;
}

export interface GameManagerUndoMoveResult {
  handled: boolean;
  valid: boolean;
}

export interface GameManagerUndoMoveHandlerRuntime {
  executeUndoMove: typeof executeUndoMove;
  handleUndoMove: typeof handleUndoMove;
}

export interface InstallableGameManagerUndoMoveHandlerRuntime {
  executeUndoMove?: typeof executeUndoMove;
  handleUndoMove: typeof handleUndoMove;
}

export interface GameManagerUndoMoveHandlerWindowLike {
  CoreGameManagerUndoMoveHandlerRuntime?: InstallableGameManagerUndoMoveHandlerRuntime;
}

export interface GameManagerUndoMoveHandlerRuntimeInstallOptions {
  windowLike?: GameManagerUndoMoveHandlerWindowLike | null;
}

function resolveUpcomingUndoEntry(manager: GameManagerUndoMoveHandlerManagerLike): unknown {
  const undoStack = Array.isArray(manager.undoStack) ? manager.undoStack : [];
  const source = undoStack[undoStack.length - 1];
  return typeof manager.normalizeUndoStackEntry === "function"
    ? manager.normalizeUndoStackEntry(source)
    : source;
}

export function executeUndoMove(
  manager: GameManagerUndoMoveHandlerManagerLike | null | undefined,
  direction: number,
  operations: GameManagerUndoMoveHandlerOperations = {}
): GameManagerUndoMoveResult {
  if (!manager || (direction !== -1 && direction !== -2)) {
    return { handled: false, valid: false };
  }

  if (direction === -2) {
    if (!operations.canExecuteRedoMove?.(manager)) return { handled: true, valid: false };
    const redoRestore = operations.executeRedoRestorePipeline?.(manager);
    if (!redoRestore || typeof operations.actuate !== "function") {
      return { handled: true, valid: false };
    }
    operations.actuate(manager);
    if (operations.shouldStartTimerAfterRedoRestore?.(manager, redoRestore)) {
      manager.startTimer?.();
    }
    return { handled: true, valid: true };
  }

  if (!operations.canExecuteUndoMove?.(manager)) return { handled: true, valid: false };
  operations.pushRedoSnapshotBeforeUndo?.(manager, resolveUpcomingUndoEntry(manager));
  const undoRestore = operations.executeUndoRestorePipeline?.(manager, direction);
  if (!undoRestore || typeof operations.actuate !== "function") {
    return { handled: true, valid: false };
  }
  operations.actuate(manager);
  if (operations.shouldStartTimerAfterUndoRestore?.(manager, undoRestore)) {
    manager.startTimer?.();
  }
  return { handled: true, valid: true };
}

export function handleUndoMove(
  manager: GameManagerUndoMoveHandlerManagerLike | null | undefined,
  direction: number,
  operations: GameManagerUndoMoveHandlerOperations = {}
): boolean {
  return executeUndoMove(manager, direction, operations).handled;
}

export function createGameManagerUndoMoveHandlerRuntime(): GameManagerUndoMoveHandlerRuntime {
  return {
    executeUndoMove,
    handleUndoMove
  };
}

export function installGameManagerUndoMoveHandlerRuntime(
  options: GameManagerUndoMoveHandlerRuntimeInstallOptions = {}
): GameManagerUndoMoveHandlerRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerUndoMoveHandlerWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerUndoMoveHandlerRuntime) {
    target.CoreGameManagerUndoMoveHandlerRuntime = createGameManagerUndoMoveHandlerRuntime();
  } else if (typeof target.CoreGameManagerUndoMoveHandlerRuntime.executeUndoMove !== "function") {
    target.CoreGameManagerUndoMoveHandlerRuntime.executeUndoMove = executeUndoMove;
  }
  return target.CoreGameManagerUndoMoveHandlerRuntime as GameManagerUndoMoveHandlerRuntime;
}

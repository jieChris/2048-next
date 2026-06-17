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

export interface GameManagerUndoMoveHandlerRuntime {
  handleUndoMove: typeof handleUndoMove;
}

export interface GameManagerUndoMoveHandlerWindowLike {
  CoreGameManagerUndoMoveHandlerRuntime?: GameManagerUndoMoveHandlerRuntime;
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

export function handleUndoMove(
  manager: GameManagerUndoMoveHandlerManagerLike | null | undefined,
  direction: number,
  operations: GameManagerUndoMoveHandlerOperations = {}
): boolean {
  if (!manager || (direction !== -1 && direction !== -2)) return false;

  if (direction === -2) {
    if (!operations.canExecuteRedoMove?.(manager)) return true;
    const redoRestore = operations.executeRedoRestorePipeline?.(manager);
    if (!redoRestore) return true;
    operations.actuate?.(manager);
    if (operations.shouldStartTimerAfterRedoRestore?.(manager, redoRestore)) {
      manager.startTimer?.();
    }
    return true;
  }

  if (!operations.canExecuteUndoMove?.(manager)) return true;
  operations.pushRedoSnapshotBeforeUndo?.(manager, resolveUpcomingUndoEntry(manager));
  const undoRestore = operations.executeUndoRestorePipeline?.(manager, direction) || {};
  operations.actuate?.(manager);
  if (operations.shouldStartTimerAfterUndoRestore?.(manager, undoRestore)) {
    manager.startTimer?.();
  }
  return true;
}

export function createGameManagerUndoMoveHandlerRuntime(): GameManagerUndoMoveHandlerRuntime {
  return {
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
  }
  return target.CoreGameManagerUndoMoveHandlerRuntime;
}

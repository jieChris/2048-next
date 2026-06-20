export interface GameManagerRedoRestorePipelineManagerLike {
  undoStack: unknown[];
  normalizeUndoStackEntry?: (entry: unknown) => Record<string, unknown> | null | undefined;
}

export interface GameManagerRedoRestorePipelineOperations {
  ensureRedoStack: (manager: GameManagerRedoRestorePipelineManagerLike) => unknown[];
  buildUndoPreviousPositionMapFromRedoEntry: (
    manager: GameManagerRedoRestorePipelineManagerLike,
    redoEntry: Record<string, unknown>
  ) => unknown;
  mergeUndoPositionMap: (baseMap: unknown, extraMap: unknown) => unknown;
  createCurrentUndoStackEntrySnapshot: (
    manager: GameManagerRedoRestorePipelineManagerLike,
    options: { previousPositionByCurrentKey: unknown }
  ) => unknown;
  applyUndoRestoredTiles: (
    manager: GameManagerRedoRestorePipelineManagerLike,
    redoEntry: Record<string, unknown>
  ) => void;
  buildRedoRestoreState: (
    manager: GameManagerRedoRestorePipelineManagerLike,
    redoEntry: Record<string, unknown>
  ) => unknown;
  applyUndoRestoreState: (manager: GameManagerRedoRestorePipelineManagerLike, redoRestore: unknown) => void;
}

export interface GameManagerRedoRestorePipelineRuntime {
  executeRedoRestorePipeline: typeof executeRedoRestorePipeline;
}

export interface GameManagerRedoRestorePipelineWindowLike {
  CoreGameManagerRedoRestorePipelineRuntime?: GameManagerRedoRestorePipelineRuntime;
}

export interface GameManagerRedoRestorePipelineRuntimeInstallOptions {
  windowLike?: GameManagerRedoRestorePipelineWindowLike | null;
}

export function executeRedoRestorePipeline(
  manager: GameManagerRedoRestorePipelineManagerLike | null | undefined,
  operations: GameManagerRedoRestorePipelineOperations
): unknown {
  if (!manager) return null;
  const redoStack = operations.ensureRedoStack(manager);
  const redoEntry = manager.normalizeUndoStackEntry?.(redoStack.pop());
  if (!redoEntry) return null;

  const undoPreviousPositionByCurrentKey = operations.mergeUndoPositionMap(
    operations.buildUndoPreviousPositionMapFromRedoEntry(manager, redoEntry),
    redoEntry.motionMap
  );
  const undoSnapshot = operations.createCurrentUndoStackEntrySnapshot(manager, {
    previousPositionByCurrentKey: undoPreviousPositionByCurrentKey
  });
  if (undoSnapshot) manager.undoStack.push(undoSnapshot);

  operations.applyUndoRestoredTiles(manager, redoEntry);
  const redoRestore = operations.buildRedoRestoreState(manager, redoEntry);
  operations.applyUndoRestoreState(manager, redoRestore);
  return redoRestore;
}

export function createGameManagerRedoRestorePipelineRuntime(): GameManagerRedoRestorePipelineRuntime {
  return {
    executeRedoRestorePipeline
  };
}

export function installGameManagerRedoRestorePipelineRuntime(
  options: GameManagerRedoRestorePipelineRuntimeInstallOptions = {}
): GameManagerRedoRestorePipelineRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerRedoRestorePipelineWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerRedoRestorePipelineRuntime) {
    target.CoreGameManagerRedoRestorePipelineRuntime = createGameManagerRedoRestorePipelineRuntime();
  }
  return target.CoreGameManagerRedoRestorePipelineRuntime;
}

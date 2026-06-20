import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerRedoRestorePipelineRuntime,
  executeRedoRestorePipeline,
  installGameManagerRedoRestorePipelineRuntime,
  type GameManagerRedoRestorePipelineRuntime
} from "../../src/core/game-manager-redo-restore-pipeline";

describe("core game manager redo restore pipeline", () => {
  it("moves one redo entry through undo snapshot creation and restore application", () => {
    const rawRedoEntry = { raw: true };
    const redoEntry = { motionMap: { "1,1": { x: 1, y: 1 } } };
    const undoPreviousPositionMap = { "0,0": { x: 0, y: 0 } };
    const mergedMotionMap = {
      ...undoPreviousPositionMap,
      ...redoEntry.motionMap
    };
    const undoSnapshot = { score: 32 };
    const redoRestore = { shouldStartTimer: true };
    const manager = {
      undoStack: [] as unknown[],
      normalizeUndoStackEntry: vi.fn(() => redoEntry)
    };
    const redoStack = [rawRedoEntry];
    const operations = {
      ensureRedoStack: vi.fn(() => redoStack),
      buildUndoPreviousPositionMapFromRedoEntry: vi.fn(() => undoPreviousPositionMap),
      mergeUndoPositionMap: vi.fn(() => mergedMotionMap),
      createCurrentUndoStackEntrySnapshot: vi.fn(() => undoSnapshot),
      applyUndoRestoredTiles: vi.fn(),
      buildRedoRestoreState: vi.fn(() => redoRestore),
      applyUndoRestoreState: vi.fn()
    };

    expect(executeRedoRestorePipeline(manager, operations)).toBe(redoRestore);

    expect(redoStack).toEqual([]);
    expect(manager.normalizeUndoStackEntry).toHaveBeenCalledWith(rawRedoEntry);
    expect(operations.buildUndoPreviousPositionMapFromRedoEntry).toHaveBeenCalledWith(manager, redoEntry);
    expect(operations.mergeUndoPositionMap).toHaveBeenCalledWith(undoPreviousPositionMap, redoEntry.motionMap);
    expect(operations.createCurrentUndoStackEntrySnapshot).toHaveBeenCalledWith(manager, {
      previousPositionByCurrentKey: mergedMotionMap
    });
    expect(manager.undoStack).toEqual([undoSnapshot]);
    expect(operations.applyUndoRestoredTiles).toHaveBeenCalledWith(manager, redoEntry);
    expect(operations.buildRedoRestoreState).toHaveBeenCalledWith(manager, redoEntry);
    expect(operations.applyUndoRestoreState).toHaveBeenCalledWith(manager, redoRestore);
  });

  it("returns null without mutating undo state when redo entry normalization fails", () => {
    const manager = {
      undoStack: [] as unknown[],
      normalizeUndoStackEntry: vi.fn(() => null)
    };
    const operations = {
      ensureRedoStack: vi.fn(() => [{ raw: true }]),
      buildUndoPreviousPositionMapFromRedoEntry: vi.fn(),
      mergeUndoPositionMap: vi.fn(),
      createCurrentUndoStackEntrySnapshot: vi.fn(),
      applyUndoRestoredTiles: vi.fn(),
      buildRedoRestoreState: vi.fn(),
      applyUndoRestoreState: vi.fn()
    };

    expect(executeRedoRestorePipeline(manager, operations)).toBeNull();
    expect(manager.undoStack).toEqual([]);
    expect(operations.applyUndoRestoredTiles).not.toHaveBeenCalled();
    expect(operations.applyUndoRestoreState).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerRedoRestorePipelineRuntime();
    expect(runtime.executeRedoRestorePipeline).toBe(executeRedoRestorePipeline);

    const windowLike: { CoreGameManagerRedoRestorePipelineRuntime?: GameManagerRedoRestorePipelineRuntime } = {};
    expect(installGameManagerRedoRestorePipelineRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerRedoRestorePipelineRuntime
    );
    expect(windowLike.CoreGameManagerRedoRestorePipelineRuntime?.executeRedoRestorePipeline).toBe(
      executeRedoRestorePipeline
    );

    const existing = { executeRedoRestorePipeline: vi.fn() };
    expect(
      installGameManagerRedoRestorePipelineRuntime({
        windowLike: { CoreGameManagerRedoRestorePipelineRuntime: existing }
      })
    ).toBe(existing);
  });
});

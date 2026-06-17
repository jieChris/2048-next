import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerUndoMoveHandlerRuntime,
  handleUndoMove,
  installGameManagerUndoMoveHandlerRuntime,
  type GameManagerUndoMoveHandlerRuntime
} from "../../src/core/game-manager-undo-move-handler";

describe("core game manager undo move handler", () => {
  it("runs the redo pipeline before actuating and optionally restarting the timer", () => {
    const actuate = vi.fn();
    const startTimer = vi.fn();
    const executeRedoRestorePipeline = vi.fn(() => ({ shouldStartTimer: true }));
    const canExecuteRedoMove = vi.fn(() => true);
    const manager = {
      timerStatus: 0,
      startTimer
    };

    const handled = handleUndoMove(manager, -2, {
      actuate,
      canExecuteRedoMove,
      canExecuteUndoMove: vi.fn(),
      executeRedoRestorePipeline,
      executeUndoRestorePipeline: vi.fn(),
      pushRedoSnapshotBeforeUndo: vi.fn(),
      shouldStartTimerAfterRedoRestore: (_target, redoRestore) => redoRestore.shouldStartTimer,
      shouldStartTimerAfterUndoRestore: vi.fn()
    });

    expect(handled).toBe(true);
    expect(canExecuteRedoMove).toHaveBeenCalledWith(manager);
    expect(executeRedoRestorePipeline).toHaveBeenCalledWith(manager);
    expect(actuate).toHaveBeenCalledWith(manager);
    expect(startTimer).toHaveBeenCalledTimes(1);
  });

  it("runs the undo pipeline before actuating and optionally restarting the timer", () => {
    const actuate = vi.fn();
    const startTimer = vi.fn();
    const pushRedoSnapshotBeforeUndo = vi.fn();
    const executeUndoRestorePipeline = vi.fn(() => ({ shouldStartTimer: true }));
    const canExecuteUndoMove = vi.fn(() => true);
    const manager = {
      undoStack: [{ previousPositionByCurrentKey: {} }],
      timerStatus: 0,
      startTimer
    };

    const handled = handleUndoMove(manager, -1, {
      actuate,
      canExecuteRedoMove: vi.fn(),
      canExecuteUndoMove,
      executeRedoRestorePipeline: vi.fn(),
      executeUndoRestorePipeline,
      pushRedoSnapshotBeforeUndo,
      shouldStartTimerAfterRedoRestore: vi.fn(),
      shouldStartTimerAfterUndoRestore: (_target, undoRestore) => undoRestore.shouldStartTimer
    });

    expect(handled).toBe(true);
    expect(canExecuteUndoMove).toHaveBeenCalledWith(manager);
    expect(pushRedoSnapshotBeforeUndo).toHaveBeenCalledWith(manager, manager.undoStack[0]);
    expect(executeUndoRestorePipeline).toHaveBeenCalledWith(manager, -1);
    expect(actuate).toHaveBeenCalledWith(manager);
    expect(startTimer).toHaveBeenCalledTimes(1);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerUndoMoveHandlerRuntime();
    expect(runtime.handleUndoMove).toBe(handleUndoMove);

    const windowLike: { CoreGameManagerUndoMoveHandlerRuntime?: GameManagerUndoMoveHandlerRuntime } = {};
    expect(installGameManagerUndoMoveHandlerRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerUndoMoveHandlerRuntime
    );
    expect(windowLike.CoreGameManagerUndoMoveHandlerRuntime?.handleUndoMove).toBe(handleUndoMove);

    const existing = { handleUndoMove: vi.fn() };
    expect(
      installGameManagerUndoMoveHandlerRuntime({
        windowLike: { CoreGameManagerUndoMoveHandlerRuntime: existing }
      })
    ).toBe(existing);
  });
});

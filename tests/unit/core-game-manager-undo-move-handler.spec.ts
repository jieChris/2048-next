import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerUndoMoveHandlerRuntime,
  executeUndoMove,
  handleUndoMove,
  installGameManagerUndoMoveHandlerRuntime,
  type GameManagerUndoMoveHandlerRuntime
} from "../../src/core/game-manager-undo-move-handler";

describe("core game manager undo move handler", () => {
  it("distinguishes non-undo input from a recognized but unavailable undo", () => {
    expect(executeUndoMove({}, 0)).toEqual({ handled: false, valid: false });
    expect(
      executeUndoMove({}, -1, {
        canExecuteUndoMove: vi.fn(() => false)
      })
    ).toEqual({ handled: true, valid: false });
  });

  it("does not validate or actuate when an undo restore does not complete", () => {
    const actuate = vi.fn();

    expect(
      executeUndoMove({ undoStack: [{}] }, -1, {
        actuate,
        canExecuteUndoMove: vi.fn(() => true),
        executeUndoRestorePipeline: vi.fn(() => null),
        pushRedoSnapshotBeforeUndo: vi.fn()
      })
    ).toEqual({ handled: true, valid: false });
    expect(actuate).not.toHaveBeenCalled();
  });

  it("runs the redo pipeline before actuating and optionally restarting the timer", () => {
    const actuate = vi.fn();
    const startTimer = vi.fn();
    const executeRedoRestorePipeline = vi.fn(() => ({ shouldStartTimer: true }));
    const canExecuteRedoMove = vi.fn(() => true);
    const manager = {
      timerStatus: 0,
      startTimer
    };

    const result = executeUndoMove(manager, -2, {
      actuate,
      canExecuteRedoMove,
      canExecuteUndoMove: vi.fn(),
      executeRedoRestorePipeline,
      executeUndoRestorePipeline: vi.fn(),
      pushRedoSnapshotBeforeUndo: vi.fn(),
      shouldStartTimerAfterRedoRestore: (_target, redoRestore) => redoRestore.shouldStartTimer,
      shouldStartTimerAfterUndoRestore: vi.fn()
    });

    expect(result).toEqual({ handled: true, valid: true });
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

    const result = executeUndoMove(manager, -1, {
      actuate,
      canExecuteRedoMove: vi.fn(),
      canExecuteUndoMove,
      executeRedoRestorePipeline: vi.fn(),
      executeUndoRestorePipeline,
      pushRedoSnapshotBeforeUndo,
      shouldStartTimerAfterRedoRestore: vi.fn(),
      shouldStartTimerAfterUndoRestore: (_target, undoRestore) => undoRestore.shouldStartTimer
    });

    expect(result).toEqual({ handled: true, valid: true });
    expect(canExecuteUndoMove).toHaveBeenCalledWith(manager);
    expect(pushRedoSnapshotBeforeUndo).toHaveBeenCalledWith(manager, manager.undoStack[0]);
    expect(executeUndoRestorePipeline).toHaveBeenCalledWith(manager, -1);
    expect(actuate).toHaveBeenCalledWith(manager);
    expect(startTimer).toHaveBeenCalledTimes(1);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerUndoMoveHandlerRuntime();
    expect(runtime.handleUndoMove).toBe(handleUndoMove);
    expect(runtime.executeUndoMove).toBe(executeUndoMove);

    const windowLike: { CoreGameManagerUndoMoveHandlerRuntime?: GameManagerUndoMoveHandlerRuntime } = {};
    expect(installGameManagerUndoMoveHandlerRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerUndoMoveHandlerRuntime
    );
    expect(windowLike.CoreGameManagerUndoMoveHandlerRuntime?.handleUndoMove).toBe(handleUndoMove);

    expect(handleUndoMove({}, -1, { canExecuteUndoMove: vi.fn(() => false) })).toBe(true);

    const originalHandleUndoMove = vi.fn();
    const existing: {
      executeUndoMove?: typeof executeUndoMove;
      handleUndoMove: typeof originalHandleUndoMove;
    } = { handleUndoMove: originalHandleUndoMove };
    const installed = installGameManagerUndoMoveHandlerRuntime({
      windowLike: { CoreGameManagerUndoMoveHandlerRuntime: existing }
    });

    expect(installed).toBe(existing);
    expect(existing.handleUndoMove).toBe(originalHandleUndoMove);
    expect(existing.executeUndoMove).toBe(executeUndoMove);
  });
});

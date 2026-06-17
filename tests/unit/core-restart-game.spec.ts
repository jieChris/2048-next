import { describe, expect, it, vi } from "vitest";

import {
  createRestartGameRuntime,
  installRestartGameRuntime,
  restartGame,
  type RestartGameRuntime
} from "../../src/core/restart-game";

function createManager(overrides: Record<string, unknown> = {}) {
  return {
    modeKey: "standard_4x4_pow2_no_undo",
    modeConfig: { id: "standard" },
    actuator: {
      continue: vi.fn()
    },
    setRuntimeUndoStack: vi.fn(),
    setRuntimeRedoStack: vi.fn(),
    clearSavedGameState: vi.fn(),
    setup: vi.fn(),
    ...overrides
  };
}

describe("core restart game runtime", () => {
  it("does nothing when restart confirmation is denied", () => {
    const manager = createManager();
    const operations = {
      confirmRestart: vi.fn(() => false),
      resolveRestartConfirmMessage: vi.fn(() => "Start a new game?"),
      restartWithBoard: vi.fn(),
      createEmptyPracticeBoardMatrix: vi.fn(),
      shouldClearPracticeBoardOnRestart: vi.fn()
    };

    restartGame(manager, operations);

    expect(operations.confirmRestart).toHaveBeenCalledWith("Start a new game?");
    expect(manager.actuator.continue).not.toHaveBeenCalled();
    expect(manager.setRuntimeUndoStack).not.toHaveBeenCalled();
    expect(manager.setup).not.toHaveBeenCalled();
  });

  it("clears transient state and starts a fresh normal game", () => {
    const manager = createManager();
    const operations = {
      confirmRestart: vi.fn(() => true),
      resolveRestartConfirmMessage: vi.fn(() => "Start a new game?"),
      restartWithBoard: vi.fn(),
      createEmptyPracticeBoardMatrix: vi.fn(),
      shouldClearPracticeBoardOnRestart: vi.fn()
    };

    restartGame(manager, operations);

    expect(manager.actuator.continue).toHaveBeenCalledTimes(1);
    expect(manager.setRuntimeUndoStack).toHaveBeenCalledWith([]);
    expect(manager.setRuntimeRedoStack).toHaveBeenCalledWith([]);
    expect(manager.clearSavedGameState).toHaveBeenCalledWith("standard_4x4_pow2_no_undo");
    expect(manager.setup).toHaveBeenCalledWith(undefined, { disableStateRestore: true });
    expect(operations.restartWithBoard).not.toHaveBeenCalled();
  });

  it("clears a practice restart board before the first move when it matches the current board", () => {
    const emptyBoard = [
      [0, 0],
      [0, 0]
    ];
    const modeConfig = { id: "practice" };
    const manager = createManager({
      modeKey: "practice",
      practiceRestartBoardMatrix: [[2, 0]],
      practiceRestartModeConfig: modeConfig,
      isTestMode: false
    });
    const operations = {
      confirmRestart: vi.fn(() => true),
      resolveRestartConfirmMessage: vi.fn(() => "Start a new game?"),
      restartWithBoard: vi.fn(),
      createEmptyPracticeBoardMatrix: vi.fn(() => emptyBoard),
      shouldClearPracticeBoardOnRestart: vi.fn(() => true)
    };

    restartGame(manager, operations);

    expect(operations.restartWithBoard).toHaveBeenCalledWith(manager, emptyBoard, modeConfig, {
      setPracticeRestartBase: true
    });
    expect(manager.isTestMode).toBe(true);
    expect(manager.setup).not.toHaveBeenCalled();
  });

  it("restores the practice restart board when it should not be cleared", () => {
    const practiceBoard = [[2, 0]];
    const modeConfig = { id: "practice" };
    const manager = createManager({
      modeKey: "practice",
      practiceRestartBoardMatrix: practiceBoard,
      practiceRestartModeConfig: modeConfig,
      isTestMode: false
    });
    const operations = {
      confirmRestart: vi.fn(() => true),
      resolveRestartConfirmMessage: vi.fn(() => "Start a new game?"),
      restartWithBoard: vi.fn(),
      createEmptyPracticeBoardMatrix: vi.fn(),
      shouldClearPracticeBoardOnRestart: vi.fn(() => false)
    };

    restartGame(manager, operations);

    expect(operations.restartWithBoard).toHaveBeenCalledWith(manager, practiceBoard, modeConfig, {
      preservePracticeRestartBase: true
    });
    expect(manager.isTestMode).toBe(true);
    expect(operations.createEmptyPracticeBoardMatrix).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createRestartGameRuntime();
    expect(runtime.restartGame).toBe(restartGame);

    const windowLike: { CoreRestartGameRuntime?: RestartGameRuntime } = {};
    expect(installRestartGameRuntime({ windowLike })).toBe(windowLike.CoreRestartGameRuntime);
    expect(windowLike.CoreRestartGameRuntime?.restartGame).toBe(restartGame);

    const existing = { restartGame: vi.fn() };
    expect(installRestartGameRuntime({ windowLike: { CoreRestartGameRuntime: existing } })).toBe(
      existing
    );
  });
});

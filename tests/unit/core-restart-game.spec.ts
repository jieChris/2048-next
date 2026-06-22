import { describe, expect, it, vi } from "vitest";

import {
  createFallbackFreshSetupSeed,
  createRestartGameRuntime,
  installRestartGameRuntime,
  restartGame,
  restartGameAsync,
  resolveRestartConfirmLanguage,
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
  it("resolves restart confirmation language from i18n before storage", () => {
    const manager = createManager({
      getWindowLike: () => ({
        UII18N: {
          getLanguage: () => "en-US"
        },
        localStorage: {
          getItem: () => "zh-CN"
        }
      })
    });

    expect(resolveRestartConfirmLanguage(manager)).toBe("en");
  });

  it("falls back to storage language and defaults to Chinese", () => {
    expect(
      resolveRestartConfirmLanguage(
        createManager({
          getWindowLike: () => ({
            localStorage: {
              getItem: () => "en"
            }
          })
        })
      )
    ).toBe("en");
    expect(
      resolveRestartConfirmLanguage(
        createManager({
          getWindowLike: () => ({
            localStorage: {
              getItem: () => "fr"
            }
          })
        })
      )
    ).toBe("zh");
  });

  it("defaults restart confirmation language when browser access throws", () => {
    const manager = createManager({
      getWindowLike: () => ({
        UII18N: {
          getLanguage: () => {
            throw new Error("i18n unavailable");
          }
        },
        localStorage: {
          getItem: () => {
            throw new Error("storage unavailable");
          }
        }
      })
    });

    expect(resolveRestartConfirmLanguage(manager)).toBe("zh");
  });

  it("creates deterministic fallback fresh setup seeds from mixed timing inputs", () => {
    expect(
      createFallbackFreshSetupSeed({
        nowMs: 1_700_000_000_000,
        performanceNowMicros: 123_456,
        counter: 1
      })
    ).toBe(8_306_243_390_012_204);
  });

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

  it("clears transient state after async restart confirmation is accepted", async () => {
    const manager = createManager();
    const operations = {
      confirmRestartAsync: vi.fn(async () => true),
      resolveRestartConfirmMessage: vi.fn(() => "Start a new game?"),
      restartWithBoard: vi.fn(),
      createEmptyPracticeBoardMatrix: vi.fn(),
      shouldClearPracticeBoardOnRestart: vi.fn()
    };

    await restartGameAsync(manager, operations);

    expect(operations.confirmRestartAsync).toHaveBeenCalledWith("Start a new game?");
    expect(manager.actuator.continue).toHaveBeenCalledTimes(1);
    expect(manager.setRuntimeUndoStack).toHaveBeenCalledWith([]);
    expect(manager.setRuntimeRedoStack).toHaveBeenCalledWith([]);
    expect(manager.clearSavedGameState).toHaveBeenCalledWith("standard_4x4_pow2_no_undo");
    expect(manager.setup).toHaveBeenCalledWith(undefined, { disableStateRestore: true });
  });

  it("does nothing when async restart confirmation is denied", async () => {
    const manager = createManager();
    const operations = {
      confirmRestartAsync: vi.fn(async () => false),
      resolveRestartConfirmMessage: vi.fn(() => "Start a new game?")
    };

    await restartGameAsync(manager, operations);

    expect(operations.confirmRestartAsync).toHaveBeenCalledWith("Start a new game?");
    expect(manager.actuator.continue).not.toHaveBeenCalled();
    expect(manager.setup).not.toHaveBeenCalled();
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
    expect(runtime.restartGameAsync).toBe(restartGameAsync);
    expect(runtime.createFallbackFreshSetupSeed).toBe(createFallbackFreshSetupSeed);
    expect(runtime.resolveRestartConfirmLanguage).toBe(resolveRestartConfirmLanguage);

    const windowLike: { CoreRestartGameRuntime?: RestartGameRuntime } = {};
    expect(installRestartGameRuntime({ windowLike })).toBe(windowLike.CoreRestartGameRuntime);
    expect(windowLike.CoreRestartGameRuntime?.restartGame).toBe(restartGame);
    expect(windowLike.CoreRestartGameRuntime?.restartGameAsync).toBe(restartGameAsync);
    expect(windowLike.CoreRestartGameRuntime?.createFallbackFreshSetupSeed).toBe(
      createFallbackFreshSetupSeed
    );
    expect(windowLike.CoreRestartGameRuntime?.resolveRestartConfirmLanguage).toBe(
      resolveRestartConfirmLanguage
    );

    const existing = {
      restartGame: vi.fn(),
      createFallbackFreshSetupSeed: vi.fn(),
      resolveRestartConfirmLanguage: vi.fn()
    };
    expect(installRestartGameRuntime({ windowLike: { CoreRestartGameRuntime: existing } })).toBe(
      existing
    );
  });
});

import { describe, expect, it, vi } from "vitest";

import {
  applyHomePageBootstrap,
  applyHomePageUndo,
  resolveHomePageDefaults,
  resolveHomePageRuntimes
} from "../../src/bootstrap/home-page-host";

describe("bootstrap home page host", () => {
  it("resolves home page defaults with baseline values", () => {
    const defaults = resolveHomePageDefaults();

    expect(defaults.defaultModeKey).toBe("standard_4x4_pow2_no_undo");
    expect(defaults.defaultBoardWidth).toBe(4);
  });

  it("resolves home page runtimes through runtime contract and startup host runtime", () => {
    const resolveHomeRuntimeContracts = vi.fn(() => ({
      homeModeRuntime: { resolveHomeModeSelectionFromContext: vi.fn() },
      undoActionRuntime: { tryTriggerUndo: vi.fn() },
      bootstrapRuntime: { startGameOnAnimationFrame: vi.fn() }
    }));
    const resolveHomeStartupFromContext = vi.fn();
    const windowLike = {
      CoreHomeRuntimeContractRuntime: {
        resolveHomeRuntimeContracts
      },
      CoreHomeStartupHostRuntime: {
        resolveHomeStartupFromContext
      }
    };

    const result = resolveHomePageRuntimes({
      windowLike
    });

    expect(resolveHomeRuntimeContracts).toHaveBeenCalledWith(windowLike);
    expect(result.homeStartupHostRuntime).toEqual({
      resolveHomeStartupFromContext
    });
  });

  it("applies home bootstrap through startup host on animation frame", () => {
    const startGameOnAnimationFrame = vi.fn((callback: () => unknown) => callback());
    const resolveHomeStartupFromContext = vi.fn(() => ({ modeKey: "standard_4x4_pow2_no_undo" }));
    const resolveHomeModeSelectionFromContext = vi.fn();
    const inputManagerCtor = function FakeKeyboardInputManager() {};
    const result = applyHomePageBootstrap({
      windowLike: {},
      documentLike: {},
      inputManagerCtor,
      homeRuntimes: {
        homeModeRuntime: {
          resolveHomeModeSelectionFromContext
        },
        bootstrapRuntime: {
          startGameOnAnimationFrame
        },
        homeStartupHostRuntime: {
          resolveHomeStartupFromContext
        }
      }
    });

    expect(result.started).toBe(true);
    expect(startGameOnAnimationFrame).toHaveBeenCalledTimes(1);
    expect(resolveHomeStartupFromContext).toHaveBeenCalledWith({
      windowLike: {},
      documentLike: {},
      defaultModeKey: "standard_4x4_pow2_no_undo",
      defaultBoardWidth: 4,
      inputManagerCtor,
      resolveHomeModeSelectionFromContext
    });
  });

  it("returns missing bootstrap runtime when bootstrap api is unavailable", () => {
    const result = applyHomePageBootstrap({
      homeRuntimes: {
        homeModeRuntime: {},
        bootstrapRuntime: {},
        homeStartupHostRuntime: {
          resolveHomeStartupFromContext: vi.fn()
        }
      }
    });

    expect(result).toEqual({
      started: false,
      missingBootstrapRuntime: true
    });
  });

  it("applies home undo through undo runtime", () => {
    const tryTriggerUndo = vi.fn(() => true);
    const gameManager = { marker: true };

    const result = applyHomePageUndo({
      windowLike: {
        game_manager: gameManager
      },
      homeRuntimes: {
        undoActionRuntime: {
          tryTriggerUndo
        }
      }
    });

    expect(result.didUndo).toBe(true);
    expect(tryTriggerUndo).toHaveBeenCalledWith(gameManager, -1);
  });
});

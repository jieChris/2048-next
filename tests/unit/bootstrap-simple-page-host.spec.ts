import { describe, expect, it, vi } from "vitest";

import {
  applySimplePageBootstrap,
  resolveSimplePageDefaults,
  resolveSimplePageRuntimes
} from "../../src/bootstrap/simple-page-host";

describe("bootstrap simple page host", () => {
  it("resolves simple page defaults with baseline values", () => {
    const defaults = resolveSimplePageDefaults();

    expect(defaults.modeKey).toBe("standard_4x4_pow2_no_undo");
    expect(defaults.fallbackModeKey).toBe("standard_4x4_pow2_no_undo");
    expect(defaults.defaultBoardWidth).toBe(4);
    expect(defaults.disableSessionSync).toBe(false);
  });

  it("resolves simple runtimes from runtime contracts", () => {
    const resolveSimpleBootstrapRuntime = vi.fn(() => ({ startGameOnAnimationFrame: vi.fn() }));
    const resolveSimpleStartupPayload = vi.fn();
    const windowLike = {
      CoreSimpleRuntimeContractRuntime: {
        resolveSimpleBootstrapRuntime
      },
      CoreSimpleStartupRuntime: {
        resolveSimpleStartupPayload
      }
    };

    const result = resolveSimplePageRuntimes({
      windowLike
    });

    expect(resolveSimpleBootstrapRuntime).toHaveBeenCalledWith(windowLike);
    expect(result.simpleStartupRuntime).toEqual({
      resolveSimpleStartupPayload
    });
  });

  it("returns missing bootstrap runtime when bootstrap api is unavailable", () => {
    const result = applySimplePageBootstrap({
      simpleRuntimes: {
        simpleStartupRuntime: {
          resolveSimpleStartupPayload: vi.fn()
        }
      }
    });

    expect(result).toEqual({
      started: false,
      missingBootstrapRuntime: true
    });
  });

  it("applies simple bootstrap with startup payload", () => {
    const startGameOnAnimationFrame = vi.fn((payload: unknown) => payload);
    const resolveSimpleStartupPayload = vi.fn((payload: unknown) => payload);
    const windowLike = {
      KeyboardInputManager: function InputManager() {}
    };

    const result = applySimplePageBootstrap({
      windowLike,
      simplePageDefaults: {
        modeKey: "mode_x",
        fallbackModeKey: "mode_fallback",
        defaultBoardWidth: 5,
        disableSessionSync: true
      },
      simpleRuntimes: {
        bootstrapRuntime: {
          startGameOnAnimationFrame
        },
        simpleStartupRuntime: {
          resolveSimpleStartupPayload
        }
      }
    });

    expect(result.started).toBe(true);
    expect(resolveSimpleStartupPayload).toHaveBeenCalledWith({
      modeKey: "mode_x",
      fallbackModeKey: "mode_fallback",
      inputManagerCtor: windowLike.KeyboardInputManager,
      defaultBoardWidth: 5,
      disableSessionSync: true
    });
    expect(startGameOnAnimationFrame).toHaveBeenCalledTimes(1);
  });
});

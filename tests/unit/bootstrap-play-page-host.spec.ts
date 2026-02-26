import { describe, expect, it, vi } from "vitest";

import {
  applyPlayPageBootstrap,
  resolvePlayPageDefaults,
  resolvePlayPageRuntimes
} from "../../src/bootstrap/play-page-host";

describe("bootstrap play page host", () => {
  it("resolves play page defaults with baseline values", () => {
    const defaults = resolvePlayPageDefaults();

    expect(defaults.defaultModeKey).toBe("standard_4x4_pow2_no_undo");
    expect(defaults.invalidModeRedirectUrl).toBe("play.html?mode_key=standard_4x4_pow2_no_undo");
    expect(defaults.invalidModeMessage).toBe("无效模式，已回退到标准模式");
    expect(defaults.defaultBoardWidth).toBe(4);
    expect(defaults.customFourRateStorageKey).toBe("custom_spawn_4x4_four_rate_v1");
  });

  it("supports overriding play page defaults", () => {
    const defaults = resolvePlayPageDefaults({
      defaultModeKey: "custom",
      invalidModeRedirectUrl: "play.html?mode_key=custom",
      invalidModeMessage: "fallback",
      defaultBoardWidth: 5,
      customFourRateStorageKey: "custom_key"
    });

    expect(defaults.defaultModeKey).toBe("custom");
    expect(defaults.invalidModeRedirectUrl).toBe("play.html?mode_key=custom");
    expect(defaults.invalidModeMessage).toBe("fallback");
    expect(defaults.defaultBoardWidth).toBe(5);
    expect(defaults.customFourRateStorageKey).toBe("custom_key");
  });

  it("resolves play runtimes via runtime contract runtime", () => {
    const resolvePlayRuntimeContracts = vi.fn(() => ({ bootstrapRuntime: {} }));
    const windowLike = {
      CorePlayRuntimeContractRuntime: {
        resolvePlayRuntimeContracts
      }
    };

    const result = resolvePlayPageRuntimes({
      windowLike
    });

    expect(resolvePlayRuntimeContracts).toHaveBeenCalledTimes(1);
    expect(resolvePlayRuntimeContracts).toHaveBeenCalledWith(windowLike);
    expect(result).toEqual({ bootstrapRuntime: {} });
  });

  it("returns missing bootstrap runtime when animation bootstrap is unavailable", () => {
    const result = applyPlayPageBootstrap({
      playRuntimes: {
        playStartupHostRuntime: {}
      }
    });

    expect(result).toEqual({
      started: false,
      missingBootstrapRuntime: true
    });
  });

  it("applies play bootstrap through animation-frame startup host", () => {
    const startGameOnAnimationFrame = vi.fn((callback: () => unknown) => callback());
    const resolvePlayStartupFromContext = vi.fn(() => ({ started: true, modeKey: "m" }));
    const resolvePlayCustomSpawnModeConfigFromPageContext = vi.fn(() => ({ mode: true }));
    const applyPlayHeaderFromPageContext = vi.fn(() => ({ applied: true }));
    const playRuntimes = {
      bootstrapRuntime: {
        startGameOnAnimationFrame
      },
      playStartupHostRuntime: {
        resolvePlayStartupFromContext
      },
      playEntryRuntime: {
        resolvePlayEntryPlan: vi.fn()
      },
      playStartupContextRuntime: {
        resolvePlayStartupContext: vi.fn()
      },
      playPageContextRuntime: {
        resolvePlayCustomSpawnModeConfigFromPageContext,
        applyPlayHeaderFromPageContext
      },
      playCustomSpawnRuntime: {},
      playCustomSpawnHostRuntime: {
        PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY: "custom_key"
      },
      playChallengeContextRuntime: {
        resolvePlayChallengeContext: vi.fn()
      },
      playStartGuardRuntime: {
        resolvePlayStartGuardState: vi.fn()
      },
      playStartupPayloadRuntime: {
        resolvePlayStartupPayload: vi.fn()
      },
      playHeaderRuntime: {},
      playHeaderHostRuntime: {},
      playChallengeIntroRuntime: {},
      playChallengeIntroUiRuntime: {},
      playChallengeIntroActionRuntime: {},
      playChallengeIntroHostRuntime: {},
      storageRuntime: {}
    };
    const windowLike = {
      document: {},
      KeyboardInputManager: function KeyboardInputManager() {}
    };

    const result = applyPlayPageBootstrap({
      windowLike,
      playRuntimes
    });

    expect(result.started).toBe(true);
    expect(startGameOnAnimationFrame).toHaveBeenCalledTimes(1);
    expect(resolvePlayStartupFromContext).toHaveBeenCalledTimes(1);

    const payload = resolvePlayStartupFromContext.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.defaultModeKey).toBe("standard_4x4_pow2_no_undo");
    expect(payload.inputManagerCtor).toBe(windowLike.KeyboardInputManager);
    expect(typeof payload.resolveModeConfig).toBe("function");
    expect(typeof payload.applyHeader).toBe("function");

    const resolveModeConfig = payload.resolveModeConfig as (
      modeKey: string,
      modeConfig: Record<string, unknown>
    ) => unknown;
    resolveModeConfig("mode", { key: "value" });
    expect(resolvePlayCustomSpawnModeConfigFromPageContext).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: "custom_key"
      })
    );

    const applyHeader = payload.applyHeader as (modeConfig: Record<string, unknown>) => unknown;
    applyHeader({ key: "value" });
    expect(applyPlayHeaderFromPageContext).toHaveBeenCalledTimes(1);
  });
});

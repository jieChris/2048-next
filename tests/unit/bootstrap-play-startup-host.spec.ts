import { describe, expect, it, vi } from "vitest";

import { resolvePlayStartupFromContext } from "../../src/bootstrap/play-startup-host";

describe("bootstrap play startup host", () => {
  it("aborts with alert and redirect when startup context requests abort", () => {
    const alert = vi.fn();
    const resolveEntryPlan = vi.fn(() => ({
      modeKey: "broken_mode",
      challengeId: "",
      modeConfig: null
    }));
    const resolveStartupContext = vi.fn(() => ({
      kind: "abort" as const,
      shouldAlert: true,
      alertMessage: "无效模式",
      redirectUrl: "play.html?mode_key=standard_4x4_pow2_no_undo"
    }));
    const resolveChallengeContext = vi.fn();
    const applyHeader = vi.fn();
    const resolveStartupPayload = vi.fn();

    const windowLike = {
      location: {
        search: "?mode_key=broken_mode",
        href: "play.html?mode_key=broken_mode"
      },
      ModeCatalog: { k: 1 },
      alert
    };

    const result = resolvePlayStartupFromContext({
      windowLike,
      inputManagerCtor: function FakeInput() {},
      resolveEntryPlan,
      resolveStartupContext,
      resolveModeConfig: () => null,
      resolveGuardState: () => null,
      resolveChallengeContext,
      applyHeader,
      resolveStartupPayload
    });

    expect(result).toBeNull();
    expect(alert).toHaveBeenCalledWith("无效模式");
    expect(windowLike.location.href).toBe("play.html?mode_key=standard_4x4_pow2_no_undo");
    expect(resolveChallengeContext).not.toHaveBeenCalled();
    expect(applyHeader).not.toHaveBeenCalled();
    expect(resolveStartupPayload).not.toHaveBeenCalled();
    expect(resolveEntryPlan).toHaveBeenCalledWith({
      searchLike: "?mode_key=broken_mode",
      modeCatalog: { k: 1 },
      defaultModeKey: "standard_4x4_pow2_no_undo",
      invalidModeRedirectUrl: "play.html?mode_key=standard_4x4_pow2_no_undo"
    });
  });

  it("starts game and returns runtime payload when payload resolver succeeds", () => {
    const resolveModeConfig = vi.fn((modeKey: string, modeConfig: unknown) => ({
      key: modeKey,
      modeConfig
    }));
    const resolveGuardState = vi.fn(() => ({}));
    const resolveEntryPlan = vi.fn(() => ({
      modeKey: "standard_4x4_pow2_no_undo",
      challengeId: "daily-1",
      modeConfig: { key: "raw" }
    }));
    const resolveStartupContext = vi.fn((opts: any) => {
      opts.resolveModeConfig("standard_4x4_pow2_no_undo", { key: "raw" });
      opts.resolveGuardState({ entryModeConfig: { key: "raw" }, resolvedModeConfig: { key: "raw" } });
      return {
        kind: "start" as const,
        modeConfig: { key: "standard_4x4_pow2_no_undo", label: "标准模式" },
        challengeId: "daily-1"
      };
    });
    const resolveChallengeContext = vi.fn(() => ({ id: "daily-1" }));
    const applyHeader = vi.fn();
    const resolveStartupPayload = vi.fn(() => ({ payload: true }));
    const inputManagerCtor = function FakeInput() {};
    const windowLike: {
      location: { search: string; href: string };
      ModeCatalog: { name: string };
      GAME_MODE_CONFIG?: unknown;
      GAME_CHALLENGE_CONTEXT?: unknown;
    } = {
      location: {
        search: "?mode_key=standard_4x4_pow2_no_undo",
        href: "play.html?mode_key=standard_4x4_pow2_no_undo"
      },
      ModeCatalog: { name: "catalog" }
    };

    const result = resolvePlayStartupFromContext({
      windowLike,
      inputManagerCtor,
      resolveEntryPlan,
      resolveStartupContext,
      resolveModeConfig,
      resolveGuardState,
      resolveChallengeContext,
      applyHeader,
      resolveStartupPayload
    });

    expect(result).toEqual({ payload: true });
    expect(resolveModeConfig).toHaveBeenCalledWith("standard_4x4_pow2_no_undo", { key: "raw" });
    expect(resolveGuardState).toHaveBeenCalledWith({
      entryModeConfig: { key: "raw" },
      resolvedModeConfig: { key: "raw" }
    });
    expect(resolveChallengeContext).toHaveBeenCalledWith({
      challengeId: "daily-1",
      modeConfig: { key: "standard_4x4_pow2_no_undo", label: "标准模式" }
    });
    expect(windowLike.GAME_MODE_CONFIG).toEqual({
      key: "standard_4x4_pow2_no_undo",
      label: "标准模式"
    });
    expect(windowLike.GAME_CHALLENGE_CONTEXT).toEqual({ id: "daily-1" });
    expect(applyHeader).toHaveBeenCalledWith({
      key: "standard_4x4_pow2_no_undo",
      label: "标准模式"
    });
    expect(resolveStartupPayload).toHaveBeenCalledWith({
      modeConfig: { key: "standard_4x4_pow2_no_undo", label: "标准模式" },
      inputManagerCtor,
      defaultBoardWidth: 4
    });
  });

  it("returns fallback startup payload when payload runtime returns null", () => {
    const inputManagerCtor = function FakeInput() {};
    const result = resolvePlayStartupFromContext({
      windowLike: {
        location: { search: "", href: "play.html" },
        ModeCatalog: {}
      },
      inputManagerCtor,
      defaultBoardWidth: 6,
      resolveEntryPlan: () => ({
        modeKey: "spawn_custom_4x4_pow2_no_undo",
        challengeId: "",
        modeConfig: {}
      }),
      resolveStartupContext: () => ({
        kind: "start",
        modeConfig: { key: "spawn_custom_4x4_pow2_no_undo" },
        challengeId: ""
      }),
      resolveModeConfig: (_modeKey: string, modeConfig: unknown) => modeConfig,
      resolveGuardState: () => ({}),
      resolveChallengeContext: () => null,
      applyHeader: () => {},
      resolveStartupPayload: () => null
    });

    expect(result).toEqual({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      modeConfig: { key: "spawn_custom_4x4_pow2_no_undo" },
      inputManagerCtor,
      defaultBoardWidth: 6
    });
  });
});

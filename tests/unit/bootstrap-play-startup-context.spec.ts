import { describe, expect, it, vi } from "vitest";

import { resolvePlayStartupContext } from "../../src/bootstrap/play-startup-context";

describe("bootstrap play startup context", () => {
  it("returns abort result from entry guard and skips mode resolution", () => {
    const resolveModeConfig = vi.fn();
    const resolveGuardState = vi.fn(() => ({
      shouldAbort: true,
      shouldAlert: true,
      alertMessage: "entry invalid",
      redirectUrl: "play.html?mode_key=fallback"
    }));

    const result = resolvePlayStartupContext({
      entryPlan: {
        modeKey: "x",
        challengeId: "cid",
        modeConfig: null,
        redirectUrl: "play.html?mode_key=from_entry"
      },
      resolveModeConfig,
      resolveGuardState
    });

    expect(result).toEqual({
      kind: "abort",
      shouldAlert: true,
      alertMessage: "entry invalid",
      redirectUrl: "play.html?mode_key=fallback"
    });
    expect(resolveModeConfig).not.toHaveBeenCalled();
  });

  it("uses default invalid message and redirect when entry guard omits them", () => {
    const result = resolvePlayStartupContext({
      entryPlan: {
        modeKey: "x",
        challengeId: "cid",
        modeConfig: null
      },
      resolveModeConfig: () => null,
      resolveGuardState: () => ({
        shouldAbort: true,
        shouldAlert: true
      })
    });

    expect(result).toEqual({
      kind: "abort",
      shouldAlert: true,
      alertMessage: "无效模式，已回退到标准模式",
      redirectUrl: "play.html?mode_key=standard_4x4_pow2_no_undo"
    });
  });

  it("aborts after mode resolution with modes fallback redirect", () => {
    const resolveGuardState = vi
      .fn()
      .mockReturnValueOnce({
        shouldAbort: false
      })
      .mockReturnValueOnce({
        shouldAbort: true
      });

    const result = resolvePlayStartupContext({
      entryPlan: {
        modeKey: "spawn_custom_4x4_pow2_no_undo",
        challengeId: "",
        modeConfig: { key: "spawn_custom_4x4_pow2_no_undo" }
      },
      resolveModeConfig: () => null,
      resolveGuardState
    });

    expect(result).toEqual({
      kind: "abort",
      shouldAlert: false,
      alertMessage: "",
      redirectUrl: "modes.html"
    });
  });

  it("returns start result with resolved mode config and challenge id", () => {
    const entryModeConfig = { key: "spawn_custom_4x4_pow2_no_undo" };
    const resolvedModeConfig = {
      key: "spawn_custom_4x4_pow2_no_undo",
      spawn_table: [{ value: 2, weight: 75 }, { value: 4, weight: 25 }]
    };
    const resolveModeConfig = vi.fn(() => resolvedModeConfig);
    const resolveGuardState = vi
      .fn()
      .mockReturnValueOnce({ shouldAbort: false })
      .mockReturnValueOnce({ shouldAbort: false });

    const result = resolvePlayStartupContext({
      entryPlan: {
        modeKey: "spawn_custom_4x4_pow2_no_undo",
        challengeId: "challenge-1",
        modeConfig: entryModeConfig
      },
      resolveModeConfig,
      resolveGuardState
    });

    expect(resolveModeConfig).toHaveBeenCalledWith(
      "spawn_custom_4x4_pow2_no_undo",
      entryModeConfig
    );
    expect(result).toEqual({
      kind: "start",
      modeConfig: resolvedModeConfig,
      challengeId: "challenge-1"
    });
  });
});

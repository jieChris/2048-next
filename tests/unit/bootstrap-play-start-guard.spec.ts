import { describe, expect, it } from "vitest";

import { resolvePlayStartGuardState } from "../../src/bootstrap/play-start-guard";

describe("bootstrap play start guard", () => {
  it("aborts and alerts when entry mode config is missing", () => {
    expect(
      resolvePlayStartGuardState({
        entryModeConfig: null,
        resolvedModeConfig: null,
        invalidModeRedirectUrl: "play.html?mode_key=fallback",
        entryRedirectUrl: "play.html?mode_key=from_entry"
      })
    ).toEqual({
      shouldAbort: true,
      shouldAlert: true,
      alertMessage: "无效模式，已回退到标准模式",
      redirectUrl: "play.html?mode_key=from_entry"
    });
  });

  it("falls back to invalid redirect default when redirect urls are empty", () => {
    const result = resolvePlayStartGuardState({
      entryModeConfig: null,
      resolvedModeConfig: null
    });
    expect(result.shouldAbort).toBe(true);
    expect(result.shouldAlert).toBe(true);
    expect(result.redirectUrl).toBe("play.html?mode_key=standard_4x4_pow2_no_undo");
  });

  it("aborts to modes page when resolved mode config is missing", () => {
    expect(
      resolvePlayStartGuardState({
        entryModeConfig: { key: "spawn_custom_4x4_pow2_no_undo" },
        resolvedModeConfig: null
      })
    ).toEqual({
      shouldAbort: true,
      shouldAlert: false,
      alertMessage: "",
      redirectUrl: "modes.html"
    });
  });

  it("allows startup when both configs exist", () => {
    expect(
      resolvePlayStartGuardState({
        entryModeConfig: { key: "standard_4x4_pow2_no_undo" },
        resolvedModeConfig: { key: "standard_4x4_pow2_no_undo" }
      })
    ).toEqual({
      shouldAbort: false,
      shouldAlert: false,
      alertMessage: "",
      redirectUrl: ""
    });
  });
});

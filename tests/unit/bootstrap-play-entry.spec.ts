import { describe, expect, it } from "vitest";

import {
  buildInvalidPlayModeRedirectUrl,
  resolvePlayEntryPlan
} from "../../src/bootstrap/play-entry";

describe("bootstrap play entry", () => {
  it("resolves mode, challenge and mode config when catalog hit exists", () => {
    const modeConfig = { key: "spawn_custom_4x4_pow2_no_undo" };
    const plan = resolvePlayEntryPlan({
      searchLike: "?mode_key=spawn_custom_4x4_pow2_no_undo&challenge_id=abc",
      defaultModeKey: "standard_4x4_pow2_no_undo",
      modeCatalog: {
        getMode(key: string) {
          return key === "spawn_custom_4x4_pow2_no_undo" ? modeConfig : null;
        }
      }
    });

    expect(plan.modeKey).toBe("spawn_custom_4x4_pow2_no_undo");
    expect(plan.challengeId).toBe("abc");
    expect(plan.modeConfig).toBe(modeConfig);
    expect(plan.redirectUrl).toBeNull();
  });

  it("supports challenge alias mode key mapping", () => {
    const modeConfig = { key: "capped_4x4_pow2_64_no_undo" };
    const plan = resolvePlayEntryPlan({
      searchLike: "?mode_key=challenge",
      defaultModeKey: "standard_4x4_pow2_no_undo",
      modeCatalog: {
        getMode(key: string) {
          return key === "capped_4x4_pow2_64_no_undo" ? modeConfig : null;
        }
      }
    });
    expect(plan.modeKey).toBe("capped_4x4_pow2_64_no_undo");
    expect(plan.modeConfig).toBe(modeConfig);
    expect(plan.redirectUrl).toBeNull();
  });

  it("falls back to default redirect when mode is invalid", () => {
    const plan = resolvePlayEntryPlan({
      searchLike: "?mode_key=missing_mode",
      defaultModeKey: "standard_4x4_pow2_no_undo",
      modeCatalog: {
        getMode() {
          return null;
        }
      }
    });

    expect(plan.modeConfig).toBeNull();
    expect(plan.redirectUrl).toBe("play.html?mode_key=standard_4x4_pow2_no_undo");
  });

  it("uses custom invalid mode redirect when provided", () => {
    const plan = resolvePlayEntryPlan({
      searchLike: "?mode_key=missing_mode",
      modeCatalog: null,
      invalidModeRedirectUrl: "modes.html"
    });
    expect(plan.modeConfig).toBeNull();
    expect(plan.redirectUrl).toBe("modes.html");
  });

  it("builds encoded play redirect url", () => {
    expect(buildInvalidPlayModeRedirectUrl("spawn custom")).toBe(
      "play.html?mode_key=spawn%20custom"
    );
  });
});

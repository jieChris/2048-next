import { describe, expect, it } from "vitest";

import {
  isTimerScrollModeKey,
  resolveTimerScrollModeFromContext
} from "../../src/bootstrap/capped-timer-scroll";

describe("bootstrap capped timer scroll", () => {
  it("matches capped/practice mode keys", () => {
    expect(isTimerScrollModeKey("capped_4x4_pow2")).toBe(true);
    expect(isTimerScrollModeKey("Practice_board_mode")).toBe(true);
    expect(isTimerScrollModeKey("standard")).toBe(false);
    expect(isTimerScrollModeKey("")).toBe(false);
    expect(isTimerScrollModeKey(null)).toBe(false);
  });

  it("resolves mode from body data attribute", () => {
    const state = resolveTimerScrollModeFromContext({
      bodyLike: {
        getAttribute(name: string) {
          return name === "data-mode-id" ? "capped_undo_mode" : null;
        }
      }
    });

    expect(state).toEqual({
      modeId: "capped_undo_mode",
      modeConfigKey: "",
      enabled: true
    });
  });

  it("falls back to window mode config key", () => {
    const state = resolveTimerScrollModeFromContext({
      bodyLike: {
        getAttribute() {
          return "";
        }
      },
      windowLike: {
        GAME_MODE_CONFIG: {
          key: "practice_pow2"
        }
      }
    });

    expect(state).toEqual({
      modeId: "",
      modeConfigKey: "practice_pow2",
      enabled: true
    });
  });

  it("returns disabled state for unsupported or broken context", () => {
    const state = resolveTimerScrollModeFromContext({
      bodyLike: {
        getAttribute() {
          throw new Error("dom unavailable");
        }
      },
      windowLike: {
        GAME_MODE_CONFIG: {
          key: "standard"
        }
      }
    });

    expect(state).toEqual({
      modeId: "",
      modeConfigKey: "standard",
      enabled: false
    });
  });
});

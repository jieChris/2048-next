import { describe, expect, it, vi } from "vitest";

import {
  readStorageFlagFromContext,
  readStorageJsonMapFromContext,
  writeStorageFlagFromContext,
  writeStorageJsonMapFromContext,
  writeStorageJsonPayloadFromContext
} from "../../src/core/game-settings-storage";

describe("core game settings storage", () => {
  it("reads boolean flag using configurable true value", () => {
    const getItem = vi.fn(() => "yes");
    const result = readStorageFlagFromContext({
      windowLike: {
        localStorage: {
          getItem
        }
      },
      key: "stats_panel_visible_v1",
      trueValue: "yes"
    });

    expect(getItem).toHaveBeenCalledWith("stats_panel_visible_v1");
    expect(result).toBe(true);
  });

  it("writes boolean flag using true/false marker values", () => {
    const setItem = vi.fn();
    const result = writeStorageFlagFromContext({
      windowLike: {
        localStorage: {
          setItem
        }
      },
      key: "stats_panel_visible_v1",
      enabled: false,
      trueValue: "1",
      falseValue: "0"
    });

    expect(setItem).toHaveBeenCalledWith("stats_panel_visible_v1", "0");
    expect(result).toBe(true);
  });

  it("reads json map from storage safely", () => {
    const getItem = vi.fn(() => '{"standard":"hidden"}');
    const result = readStorageJsonMapFromContext({
      windowLike: {
        localStorage: {
          getItem
        }
      },
      key: "settings_timer_module_view_by_mode_v1"
    });

    expect(result).toEqual({ standard: "hidden" });
  });

  it("writes json map into storage safely", () => {
    const setItem = vi.fn();
    const result = writeStorageJsonMapFromContext({
      windowLike: {
        localStorage: {
          setItem
        }
      },
      key: "settings_undo_enabled_by_mode_v1",
      map: { standard: true }
    });

    expect(setItem).toHaveBeenCalledWith(
      "settings_undo_enabled_by_mode_v1",
      JSON.stringify({ standard: true })
    );
    expect(result).toBe(true);
  });

  it("writes json payload for session submit result", () => {
    const setItem = vi.fn();
    const payload = { ok: false, reason: "replay_mode" };
    const result = writeStorageJsonPayloadFromContext({
      windowLike: {
        localStorage: {
          setItem
        }
      },
      key: "last_session_submit_result_v1",
      payload
    });

    expect(setItem).toHaveBeenCalledWith(
      "last_session_submit_result_v1",
      JSON.stringify(payload)
    );
    expect(result).toBe(true);
  });
});

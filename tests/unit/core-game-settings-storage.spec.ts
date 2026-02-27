import { describe, expect, it, vi } from "vitest";

import {
  normalizeTimerModuleViewMode,
  readUndoEnabledForModeFromMap,
  readTimerModuleViewForModeFromMap,
  resolveSavedGameStateStorageKey,
  shouldUseSavedGameStateFromContext,
  readStorageFlagFromContext,
  readStorageJsonMapFromContext,
  writeUndoEnabledForModeToMap,
  writeTimerModuleViewForModeToMap,
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

  it("resolves saved game state storage key with mode fallbacks", () => {
    expect(
      resolveSavedGameStateStorageKey({
        modeKey: "practice_legacy",
        currentModeKey: "classic_4x4_pow2_undo",
        currentMode: "classic_4x4_pow2_undo",
        defaultModeKey: "standard_4x4_pow2_no_undo",
        keyPrefix: "saved_game_state_v2_"
      })
    ).toBe("saved_game_state_v2_practice_legacy");

    expect(
      resolveSavedGameStateStorageKey({
        modeKey: "",
        currentModeKey: "",
        currentMode: "",
        defaultModeKey: "standard_4x4_pow2_no_undo",
        keyPrefix: "saved_game_state_lite_v2_"
      })
    ).toBe("saved_game_state_lite_v2_standard_4x4_pow2_no_undo");
  });

  it("resolves whether saved game state should be used by context", () => {
    expect(
      shouldUseSavedGameStateFromContext({
        hasWindow: false,
        replayMode: false,
        pathname: "/index.html"
      })
    ).toBe(false);

    expect(
      shouldUseSavedGameStateFromContext({
        hasWindow: true,
        replayMode: true,
        pathname: "/index.html"
      })
    ).toBe(false);

    expect(
      shouldUseSavedGameStateFromContext({
        hasWindow: true,
        replayMode: false,
        pathname: "/replay.html"
      })
    ).toBe(false);

    expect(
      shouldUseSavedGameStateFromContext({
        hasWindow: true,
        replayMode: false,
        pathname: "/play.html"
      })
    ).toBe(true);
  });

  it("normalizes timer module view mode", () => {
    expect(normalizeTimerModuleViewMode("hidden")).toBe("hidden");
    expect(normalizeTimerModuleViewMode("timer")).toBe("timer");
    expect(normalizeTimerModuleViewMode("anything")).toBe("timer");
  });

  it("reads timer module view mode by mode key from map", () => {
    expect(
      readTimerModuleViewForModeFromMap({
        map: { standard: "hidden" },
        mode: "standard"
      })
    ).toBe("hidden");
    expect(
      readTimerModuleViewForModeFromMap({
        map: { standard: "hidden" },
        mode: "fibonacci"
      })
    ).toBe("timer");
  });

  it("writes timer module view mode by mode key into next map", () => {
    expect(
      writeTimerModuleViewForModeToMap({
        map: { standard: "timer" },
        mode: "standard",
        view: "hidden"
      })
    ).toEqual({ standard: "hidden" });
    expect(
      writeTimerModuleViewForModeToMap({
        map: { standard: "hidden" },
        mode: "practice",
        view: "unknown"
      })
    ).toEqual({ standard: "hidden", practice: "timer" });
  });

  it("reads undo enabled state by mode key with fallback", () => {
    expect(
      readUndoEnabledForModeFromMap({
        map: { standard: false },
        mode: "standard",
        fallbackEnabled: true
      })
    ).toBe(false);
    expect(
      readUndoEnabledForModeFromMap({
        map: { standard: false },
        mode: "practice",
        fallbackEnabled: true
      })
    ).toBe(true);
  });

  it("writes undo enabled state by mode key into next map", () => {
    expect(
      writeUndoEnabledForModeToMap({
        map: { standard: true },
        mode: "standard",
        enabled: false
      })
    ).toEqual({ standard: false });
    expect(
      writeUndoEnabledForModeToMap({
        map: { standard: true },
        mode: "practice",
        enabled: true
      })
    ).toEqual({ standard: true, practice: true });
  });
});

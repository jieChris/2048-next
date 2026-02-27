import { describe, expect, it, vi } from "vitest";

import {
  buildLiteSavedGameStatePayload,
  normalizeTimerModuleViewMode,
  readUndoEnabledForModeFromMap,
  readTimerModuleViewForModeFromMap,
  resolveSavedGameStateStorageKey,
  shouldUseSavedGameStateFromContext,
  readStorageFlagFromContext,
  readStorageJsonMapFromContext,
  writeUndoEnabledForModeToMap,
  writeTimerModuleViewForModeToMap,
  writeSavedPayloadToStorages,
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

  it("writes saved payload to first available storage", () => {
    const setItemFail = vi.fn(() => {
      throw new Error("quota");
    });
    const setItemOk = vi.fn();
    const payload = { score: 1024, mode_key: "classic_4x4_pow2_undo" };
    const result = writeSavedPayloadToStorages({
      storages: [{ setItem: setItemFail }, { setItem: setItemOk }],
      key: "saved_game_state_v2_classic_4x4_pow2_undo",
      payload
    });

    expect(result).toBe(true);
    expect(setItemFail).toHaveBeenCalledTimes(1);
    expect(setItemOk).toHaveBeenCalledWith(
      "saved_game_state_v2_classic_4x4_pow2_undo",
      JSON.stringify(payload)
    );
  });

  it("returns false when saved payload cannot be persisted", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(
      writeSavedPayloadToStorages({
        storages: [{ setItem: vi.fn() }],
        key: "saved_game_state_v2_standard_4x4_pow2_no_undo",
        payload: circular
      })
    ).toBe(false);

    expect(
      writeSavedPayloadToStorages({
        storages: [],
        key: "",
        payload: { score: 0 }
      })
    ).toBe(false);
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

  it("builds lite saved-game payload with payload-first values", () => {
    const payload = {
      saved_at: 123,
      mode_key: "practice_legacy",
      board_width: 4,
      board_height: 4,
      ruleset: "pow2",
      board: [
        [2, 0, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      score: 128,
      over: false,
      won: true,
      keep_playing: false,
      initial_seed: 11,
      seed: 17,
      ips_input_count: 4,
      timer_status: 1,
      duration_ms: 6543,
      has_game_started: true,
      initial_board_matrix: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      replay_start_board_matrix: [
        [0, 0, 0, 0],
        [0, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      practice_restart_board_matrix: [
        [0, 0, 0, 0],
        [0, 0, 4, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      practice_restart_mode_config: { key: "practice_legacy", ruleset: "pow2" },
      reached_32k: true,
      capped_milestone_count: 3,
      combo_streak: 2,
      successful_move_count: 10,
      undo_used: 1,
      lock_consumed_at_move_count: 7,
      locked_direction_turn: 5,
      locked_direction: 2,
      challenge_id: "challenge-demo"
    };
    const result = buildLiteSavedGameStatePayload({
      payload,
      savedStateVersion: 2,
      modeKey: "classic_4x4_pow2_undo",
      width: 4,
      height: 4,
      ruleset: "pow2",
      score: 0,
      initialSeed: 1,
      seed: 2,
      durationMs: 0,
      finalBoardMatrix: [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    });

    expect(result).not.toBeNull();
    expect(result?.mode_key).toBe("practice_legacy");
    expect(result?.board).toEqual(payload.board);
    expect(result?.score).toBe(128);
    expect(result?.move_history).toEqual([]);
    expect(result?.undo_stack).toEqual([]);
    expect(result?.replay_compact_log).toBe("");
    expect(result?.spawn_value_counts).toEqual({});
    expect(result?.capped64_unlocked).toBeNull();
    expect(result?.practice_restart_mode_config).toEqual(payload.practice_restart_mode_config);
    expect(result?.practice_restart_mode_config).not.toBe(payload.practice_restart_mode_config);
  });

  it("falls back to context values when lite payload fields are missing", () => {
    const result = buildLiteSavedGameStatePayload({
      payload: {
        saved_at: 88
      },
      savedStateVersion: 2,
      modeKey: "standard_4x4_pow2_no_undo",
      width: 4,
      height: 4,
      ruleset: "pow2",
      score: 256,
      initialSeed: 101,
      seed: 202,
      durationMs: 3456,
      finalBoardMatrix: [
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      initialBoardMatrix: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    });

    expect(result).not.toBeNull();
    expect(result?.mode_key).toBe("standard_4x4_pow2_no_undo");
    expect(result?.board_width).toBe(4);
    expect(result?.score).toBe(256);
    expect(result?.seed).toBe(202);
    expect(result?.duration_ms).toBe(3456);
    expect(result?.board).toEqual([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    expect(result?.initial_board_matrix).toEqual([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
  });

  it("returns null when payload or saved-state version is invalid", () => {
    expect(
      buildLiteSavedGameStatePayload({
        payload: null,
        savedStateVersion: 2
      })
    ).toBeNull();

    expect(
      buildLiteSavedGameStatePayload({
        payload: {},
        savedStateVersion: "invalid"
      })
    ).toBeNull();
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

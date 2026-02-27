import { describe, expect, it } from "vitest";

import {
  canToggleUndoSetting,
  createProgressiveCapped64UnlockedState,
  getCappedTargetValue,
  getForcedUndoSetting,
  isCappedModeState,
  isGameTerminatedState,
  isProgressiveCapped64Mode,
  resolveCappedPlaceholderRowValues,
  resolveCappedPlaceholderSlotByRepeatCount,
  resolveCappedRowVisibilityPlan,
  resolveCappedTimerLegendFontSize,
  resolveProgressiveCapped64Unlock,
  isTimerLeaderboardAvailableByMode,
  isUndoAllowedByMode,
  isUndoSettingFixedForMode,
  normalizeModeConfig,
  resolveLegacyModeFromModeKey,
  resolveModeCatalogAlias,
  normalizeSpecialRules
} from "../../src/core/mode";

const DEFAULT_MODE_CONFIG = {
  key: "standard_4x4_pow2_no_undo",
  board_width: 4,
  board_height: 4,
  ruleset: "pow2",
  undo_enabled: false,
  max_tile: null,
  spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
  ranked_bucket: "standard",
  mode_family: "pow2",
  rank_policy: "ranked",
  special_rules: {}
};

describe("core mode: normalizeSpecialRules", () => {
  it("returns empty object for invalid rules payload", () => {
    expect(normalizeSpecialRules(null)).toEqual({});
    expect(normalizeSpecialRules([])).toEqual({});
    expect(normalizeSpecialRules("x")).toEqual({});
  });

  it("returns a cloned object", () => {
    const raw = { blocked_cells: [[0, 0]], custom_spawn_four_rate: 12.5 };
    const normalized = normalizeSpecialRules(raw);
    raw.custom_spawn_four_rate = 99;
    expect(normalized.custom_spawn_four_rate).toBe(12.5);
  });

  it("builds progressive capped64 unlocked state from raw payload", () => {
    expect(createProgressiveCapped64UnlockedState(null)).toEqual({
      "16": false,
      "32": false,
      "64": false
    });
    expect(
      createProgressiveCapped64UnlockedState({
        "16": true,
        "32": "yes",
        "64": true
      })
    ).toEqual({
      "16": true,
      "32": false,
      "64": true
    });
  });

  it("resolves progressive capped64 unlock decision and next state", () => {
    expect(
      resolveProgressiveCapped64Unlock({
        isProgressiveCapped64Mode: false,
        value: 16,
        unlockedState: { "16": false, "32": false, "64": false }
      })
    ).toEqual({
      nextUnlockedState: { "16": false, "32": false, "64": false },
      unlockedValue: null
    });

    expect(
      resolveProgressiveCapped64Unlock({
        isProgressiveCapped64Mode: true,
        value: 16,
        unlockedState: { "16": false, "32": false, "64": false }
      })
    ).toEqual({
      nextUnlockedState: { "16": true, "32": false, "64": false },
      unlockedValue: 16
    });

    expect(
      resolveProgressiveCapped64Unlock({
        isProgressiveCapped64Mode: true,
        value: 16,
        unlockedState: { "16": true, "32": false, "64": false }
      })
    ).toEqual({
      nextUnlockedState: { "16": true, "32": false, "64": false },
      unlockedValue: null
    });
  });

  it("resolves game termination state", () => {
    expect(
      isGameTerminatedState({
        over: false,
        won: false,
        keepPlaying: false
      })
    ).toBe(false);
    expect(
      isGameTerminatedState({
        over: true,
        won: false,
        keepPlaying: false
      })
    ).toBe(true);
    expect(
      isGameTerminatedState({
        over: false,
        won: true,
        keepPlaying: false
      })
    ).toBe(true);
    expect(
      isGameTerminatedState({
        over: false,
        won: true,
        keepPlaying: true
      })
    ).toBe(false);
  });
});

describe("core mode: normalizeModeConfig", () => {
  it("normalizes width/height/ruleset/rank defaults", () => {
    const cfg = normalizeModeConfig({
      modeKey: "custom_mode",
      rawConfig: {
        key: "",
        board_width: 0,
        board_height: 0,
        ruleset: "unknown",
        undo_enabled: 1,
        ranked_bucket: "",
        mode_family: "",
        rank_policy: "",
        special_rules: null
      },
      defaultModeKey: "standard_4x4_pow2_no_undo",
      defaultModeConfig: DEFAULT_MODE_CONFIG
    });

    expect(cfg.key).toBe("custom_mode");
    expect(cfg.board_width).toBe(4);
    expect(cfg.board_height).toBe(4);
    expect(cfg.ruleset).toBe("pow2");
    expect(cfg.undo_enabled).toBe(true);
    expect(cfg.ranked_bucket).toBe("none");
    expect(cfg.mode_family).toBe("pow2");
    expect(cfg.rank_policy).toBe("unranked");
  });

  it("keeps fibonacci max tile only for capped or enforced modes", () => {
    const uncapped = normalizeModeConfig({
      modeKey: "fib_4x4_undo",
      rawConfig: {
        key: "fib_4x4_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "fibonacci",
        max_tile: 233,
        special_rules: {}
      },
      defaultModeKey: "standard_4x4_pow2_no_undo",
      defaultModeConfig: DEFAULT_MODE_CONFIG
    });
    expect(uncapped.max_tile).toBeNull();

    const cappedByKey = normalizeModeConfig({
      modeKey: "capped_fib",
      rawConfig: {
        key: "capped_fib",
        board_width: 4,
        board_height: 4,
        ruleset: "fibonacci",
        max_tile: 233,
        special_rules: {}
      },
      defaultModeKey: "standard_4x4_pow2_no_undo",
      defaultModeConfig: DEFAULT_MODE_CONFIG
    });
    expect(cappedByKey.max_tile).toBe(233);

    const cappedByRule = normalizeModeConfig({
      modeKey: "fib_4x4_custom",
      rawConfig: {
        key: "fib_4x4_custom",
        board_width: 4,
        board_height: 4,
        ruleset: "fibonacci",
        max_tile: 233,
        special_rules: { enforce_max_tile: true }
      },
      defaultModeKey: "standard_4x4_pow2_no_undo",
      defaultModeConfig: DEFAULT_MODE_CONFIG
    });
    expect(cappedByRule.max_tile).toBe(233);
  });

  it("normalizes custom pow2 four-rate to strict spawn table", () => {
    const cfg = normalizeModeConfig({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      rawConfig: {
        key: "spawn_custom_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        special_rules: { custom_spawn_four_rate: 33.333 }
      },
      defaultModeKey: "standard_4x4_pow2_no_undo",
      defaultModeConfig: DEFAULT_MODE_CONFIG
    });

    expect(cfg.special_rules.custom_spawn_four_rate).toBe(33.33);
    expect(cfg.spawn_table).toEqual([
      { value: 2, weight: 66.67 },
      { value: 4, weight: 33.33 }
    ]);
  });

  it("clamps out-of-range custom four-rate", () => {
    const cfg = normalizeModeConfig({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      rawConfig: {
        key: "spawn_custom_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        special_rules: { custom_spawn_four_rate: 150 }
      },
      defaultModeKey: "standard_4x4_pow2_no_undo",
      defaultModeConfig: DEFAULT_MODE_CONFIG
    });

    expect(cfg.special_rules.custom_spawn_four_rate).toBe(100);
    expect(cfg.spawn_table).toEqual([{ value: 4, weight: 100 }]);
  });
});

describe("core mode: capped policy", () => {
  it("detects capped mode by key and positive max tile", () => {
    expect(
      isCappedModeState({
        modeKey: "capped_4x4_pow2_no_undo",
        maxTile: 64
      })
    ).toBe(true);
    expect(
      isCappedModeState({
        modeKey: "standard_4x4_pow2_no_undo",
        maxTile: 64
      })
    ).toBe(false);
    expect(
      isCappedModeState({
        modeKey: "capped_4x4_pow2_no_undo",
        maxTile: 0
      })
    ).toBe(false);
  });

  it("resolves capped target value and progressive mode defaults", () => {
    expect(
      getCappedTargetValue({
        modeKey: "capped_4x4_pow2_no_undo",
        maxTile: 64
      })
    ).toBe(64);
    expect(
      getCappedTargetValue({
        modeKey: "standard_4x4_pow2_no_undo",
        maxTile: 64
      })
    ).toBeNull();
    expect(
      isProgressiveCapped64Mode({
        modeKey: "capped_4x4_pow2_no_undo",
        maxTile: 64
      })
    ).toBe(false);
  });
});

describe("core mode: capped timer placeholder policy", () => {
  it("resolves capped timer legend font size by capped target value", () => {
    expect(resolveCappedTimerLegendFontSize(64)).toBe("22px");
    expect(resolveCappedTimerLegendFontSize(128)).toBe("18px");
    expect(resolveCappedTimerLegendFontSize(1024)).toBe("14px");
    expect(resolveCappedTimerLegendFontSize(8192)).toBe("13px");
    expect(resolveCappedTimerLegendFontSize(null)).toBe("14px");
  });

  it("resolves capped placeholder rows from timer slots", () => {
    expect(
      resolveCappedPlaceholderRowValues({
        isCappedMode: false,
        cappedTargetValue: 2048,
        timerSlotIds: [16, 32, 64]
      })
    ).toEqual([]);

    expect(
      resolveCappedPlaceholderRowValues({
        isCappedMode: true,
        cappedTargetValue: 64,
        timerSlotIds: [16, 32, 64, 128, 256, 512]
      })
    ).toEqual([128, 256, 512]);
  });

  it("maps repeat count to placeholder slot deterministically", () => {
    expect(
      resolveCappedPlaceholderSlotByRepeatCount({
        repeatCount: 1,
        placeholderRowValues: [128, 256, 512]
      })
    ).toBeNull();
    expect(
      resolveCappedPlaceholderSlotByRepeatCount({
        repeatCount: 2,
        placeholderRowValues: [128, 256, 512]
      })
    ).toBe(128);
    expect(
      resolveCappedPlaceholderSlotByRepeatCount({
        repeatCount: 4,
        placeholderRowValues: [128, 256, 512]
      })
    ).toBe(512);
    expect(
      resolveCappedPlaceholderSlotByRepeatCount({
        repeatCount: 5,
        placeholderRowValues: [128, 256, 512]
      })
    ).toBeNull();
  });

  it("resolves capped row visibility plan", () => {
    expect(
      resolveCappedRowVisibilityPlan({
        isCappedMode: false,
        timerSlotIds: [16, 32]
      })
    ).toEqual([
      { value: 16, visible: true, keepSpace: false },
      { value: 32, visible: true, keepSpace: false }
    ]);

    expect(
      resolveCappedRowVisibilityPlan({
        isCappedMode: true,
        isProgressiveCapped64Mode: true,
        cappedTargetValue: 64,
        timerSlotIds: [16, 32]
      })
    ).toEqual([
      { value: 16, visible: false, keepSpace: true },
      { value: 32, visible: false, keepSpace: true }
    ]);

    expect(
      resolveCappedRowVisibilityPlan({
        isCappedMode: true,
        isProgressiveCapped64Mode: false,
        cappedTargetValue: 64,
        timerSlotIds: [16, 32, 64, 128]
      })
    ).toEqual([
      { value: 16, visible: true, keepSpace: true },
      { value: 32, visible: true, keepSpace: true },
      { value: 64, visible: true, keepSpace: true },
      { value: 128, visible: false, keepSpace: true }
    ]);
  });
});

describe("core mode: undo policy", () => {
  it("resolves forced undo setting by explicit mode config first", () => {
    expect(
      getForcedUndoSetting({
        mode: "capped_4x4_pow2_no_undo",
        modeConfig: { undo_enabled: true }
      })
    ).toBe(true);
    expect(
      getForcedUndoSetting({
        mode: "classic_4x4_pow2_undo",
        modeConfig: { undo_enabled: false }
      })
    ).toBe(false);
  });

  it("resolves forced undo setting by mode naming convention", () => {
    expect(getForcedUndoSetting({ mode: "capped_4x4_pow2_no_undo" })).toBe(false);
    expect(getForcedUndoSetting({ mode: "custom_no-undo_mode" })).toBe(false);
    expect(getForcedUndoSetting({ mode: "custom_undo_only_mode" })).toBe(true);
    expect(getForcedUndoSetting({ mode: "standard_4x4_pow2" })).toBeNull();
  });

  it("derives undo allowed/fixed/toggle states", () => {
    expect(isUndoAllowedByMode({ mode: "standard_4x4_pow2" })).toBe(true);
    expect(isUndoAllowedByMode({ mode: "capped_4x4_pow2_no_undo" })).toBe(false);

    expect(isUndoSettingFixedForMode({ mode: "standard_4x4_pow2" })).toBe(false);
    expect(isUndoSettingFixedForMode({ mode: "custom_undo-only_mode" })).toBe(true);

    expect(
      canToggleUndoSetting({
        mode: "standard_4x4_pow2",
        hasGameStarted: false
      })
    ).toBe(true);
    expect(
      canToggleUndoSetting({
        mode: "standard_4x4_pow2",
        hasGameStarted: true
      })
    ).toBe(false);
    expect(
      canToggleUndoSetting({
        mode: "capped_4x4_pow2_no_undo",
        hasGameStarted: false
      })
    ).toBe(false);
  });
});

describe("core mode: timer leaderboard policy", () => {
  it("keeps timer leaderboard availability enabled", () => {
    expect(isTimerLeaderboardAvailableByMode("standard_4x4_pow2_no_undo")).toBe(true);
    expect(isTimerLeaderboardAvailableByMode("capped_4x4_pow2_no_undo")).toBe(true);
  });
});

describe("core mode: legacy mapping policy", () => {
  it("resolves legacy server mode from explicit map first", () => {
    expect(
      resolveLegacyModeFromModeKey({
        modeKey: "standard_4x4_pow2_no_undo",
        legacyModeByKey: { standard_4x4_pow2_no_undo: "classic" }
      })
    ).toBe("classic");
  });

  it("falls back to capped/practice/classic inference", () => {
    expect(
      resolveLegacyModeFromModeKey({
        modeKey: "capped_4x4_pow2_no_undo"
      })
    ).toBe("capped");
    expect(
      resolveLegacyModeFromModeKey({
        fallbackModeKey: "practice_legacy"
      })
    ).toBe("practice");
    expect(
      resolveLegacyModeFromModeKey({
        mode: "unknown_mode"
      })
    ).toBe("classic");
  });

  it("resolves catalog alias mapping and keeps passthrough values", () => {
    expect(
      resolveModeCatalogAlias({
        modeId: "classic_no_undo",
        defaultModeKey: "standard_4x4_pow2_no_undo",
        legacyAliasToModeKey: {
          classic_no_undo: "standard_4x4_pow2_no_undo"
        }
      })
    ).toBe("standard_4x4_pow2_no_undo");

    expect(
      resolveModeCatalogAlias({
        modeId: "fib_4x4_undo",
        defaultModeKey: "standard_4x4_pow2_no_undo",
        legacyAliasToModeKey: {
          classic_no_undo: "standard_4x4_pow2_no_undo"
        }
      })
    ).toBe("fib_4x4_undo");
  });
});

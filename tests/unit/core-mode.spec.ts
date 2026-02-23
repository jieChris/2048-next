import { describe, expect, it } from "vitest";

import { normalizeModeConfig, normalizeSpecialRules } from "../../src/core/mode";

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

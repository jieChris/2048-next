import { describe, expect, it } from "vitest";

import {
  buildPracticeModeConfigFromSelection,
  buildPracticeModeConfig,
  createPracticeModeRuntime,
  installPracticeModeRuntime,
  parsePracticeModeKey,
  parsePracticeRuleset,
  type PracticeModeRuntime
} from "../../src/bootstrap/practice-mode";
import { normalizeModeConfig } from "../../src/core/mode";

describe("bootstrap practice mode", () => {
  it("creates the legacy CorePracticeModeRuntime shape from TypeScript functions", () => {
    const runtime = createPracticeModeRuntime();

    expect(runtime.parsePracticeRuleset).toBe(parsePracticeRuleset);
    expect(runtime.parsePracticeModeKey).toBe(parsePracticeModeKey);
    expect(runtime.buildPracticeModeConfig).toBe(buildPracticeModeConfig);
    expect(runtime.buildPracticeModeConfigFromSelection).toBe(buildPracticeModeConfigFromSelection);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CorePracticeModeRuntime?: PracticeModeRuntime } = {};

    const installed = installPracticeModeRuntime({ windowLike });

    expect(installed).toBe(windowLike.CorePracticeModeRuntime);
    expect(installed?.buildPracticeModeConfig).toBeTypeOf("function");
  });

  it("does not overwrite an existing practice mode runtime", () => {
    const existing = createPracticeModeRuntime();
    const windowLike = { CorePracticeModeRuntime: existing };

    const installed = installPracticeModeRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CorePracticeModeRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installPracticeModeRuntime({ windowLike: null })).toBeNull();
  });

  it("parses practice ruleset query", () => {
    expect(parsePracticeRuleset("?practice_ruleset=fibonacci")).toBe("fibonacci");
    expect(parsePracticeRuleset("?practice_ruleset=pow2")).toBe("pow2");
    expect(parsePracticeRuleset("?practice_ruleset=other")).toBe("pow2");
    expect(parsePracticeRuleset("")).toBe("pow2");
  });

  it("parses practice mode key query and ignores the direct practice sentinel", () => {
    expect(parsePracticeModeKey("?practice_mode_key=capped_4x4_pow2_64_no_undo")).toBe(
      "capped_4x4_pow2_64_no_undo"
    );
    expect(parsePracticeModeKey("?practice_mode_key=practice")).toBe("");
    expect(parsePracticeModeKey("?practice_mode_key=%20%20")).toBe("");
    expect(parsePracticeModeKey("")).toBe("");
  });

  it("builds fibonacci practice mode config", () => {
    const base = {
      key: "practice",
      ruleset: "pow2",
      mode_family: "pow2",
      spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
      label: "练习板（Legacy）"
    };
    const next = buildPracticeModeConfig(base, "fibonacci");

    expect(next.ruleset).toBe("fibonacci");
    expect(next.mode_family).toBe("fibonacci");
    expect(next.spawn_table).toEqual([
      { value: 1, weight: 90 },
      { value: 2, weight: 10 }
    ]);
    expect(next.label).toBe("练习板（Legacy）");
    expect(base.ruleset).toBe("pow2");
  });

  it("builds pow2 practice mode config", () => {
    const next = buildPracticeModeConfig(
      {
        key: "practice",
        ruleset: "fibonacci",
        mode_family: "fibonacci",
        spawn_table: [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
      },
      "pow2"
    );

    expect(next.ruleset).toBe("pow2");
    expect(next.mode_family).toBe("pow2");
    expect(next.spawn_table).toEqual([
      { value: 2, weight: 90 },
      { value: 4, weight: 10 }
    ]);
  });

  it("preserves capped max tile when converting a selected mode into practice mode", () => {
    const selected = buildPracticeModeConfigFromSelection({
      key: "capped_4x4_pow2_64_no_undo",
      board_width: 4,
      board_height: 4,
      ruleset: "pow2",
      mode_family: "pow2",
      special_rules: {},
      spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
      max_tile: 64
    });

    expect(selected.key).toBe("practice");
    expect(selected.max_tile).toBe(64);
    expect(selected.special_rules.enforce_max_tile).toBe(true);

    const normalized = normalizeModeConfig({
      modeKey: selected.key,
      rawConfig: selected,
      defaultModeKey: "standard_4x4_pow2_no_undo",
      defaultModeConfig: {
        key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        special_rules: {},
        undo_enabled: false,
        max_tile: null,
        spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
        ranked_bucket: "standard",
        mode_family: "pow2",
        rank_policy: "ranked"
      }
    });

    expect(normalized.max_tile).toBe(64);
  });
});

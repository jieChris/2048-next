import { describe, expect, it } from "vitest";

import {
  buildPlayModeIntroText,
  compactPlayModeLabel,
  resolvePlayHeaderState,
  resolvePlayRulesText
} from "../../src/bootstrap/play-header";

describe("bootstrap play header", () => {
  it("compacts known label suffixes and aliases", () => {
    expect(compactPlayModeLabel({ label: "标准版 4x4（无撤回）" })).toBe("标准4x4");
    expect(compactPlayModeLabel({ label: "经典版 4x4（可撤回）" })).toBe("经典4x4");
    expect(compactPlayModeLabel({ label: "封顶版 4x4（64，无撤回）" })).toBe("封顶4x4（64，无撤回）");
    (globalThis as unknown as { UII18N?: { getLanguage?: () => string } }).UII18N = {
      getLanguage: () => "en"
    };
    expect(compactPlayModeLabel({ label: "Fibonacci 4x4（无撤回）" })).toBe("Fib4x4");
    (globalThis as unknown as { UII18N?: { getLanguage?: () => string } }).UII18N = {
      getLanguage: () => "zh"
    };
    expect(compactPlayModeLabel({ label: "Diagonal 4x2 (No Undo)" })).toBe("斜向4x2");
    expect(compactPlayModeLabel({ label: "练习板（Legacy）" })).toBe("练习板");
  });

  it("falls back to empty label or default text", () => {
    expect(compactPlayModeLabel({ key: "spawn_custom_4x4_pow2_no_undo" })).toBe("");
    expect(compactPlayModeLabel(null)).toBe("");
  });

  it("resolves rule text", () => {
    expect(resolvePlayRulesText("fibonacci")).toBe("Fib");
    expect(resolvePlayRulesText("pow2")).toBe("2幂");
    expect(resolvePlayRulesText("unknown")).toBe("2幂");
  });

  it("builds intro text from mode config", () => {
    expect(
      buildPlayModeIntroText({
        label: "4x4 自定义4率（无撤回）（4率 25%）",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2"
      })
    ).toBe("4x4自定义4率（4率25%）｜4x4｜2幂");
  });

  it("appends four-rate suffix from special rules when label has no rate text", () => {
    expect(
      buildPlayModeIntroText({
        label: "4x4 自定义4率（无撤回）",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        special_rules: { custom_spawn_four_rate: 25 }
      })
    ).toBe("4x4自定义4率（4率25%）｜4x4｜2幂");
  });

  it("resolves header state for dom rendering", () => {
    expect(
      resolvePlayHeaderState({
        key: "spawn_custom_4x4_pow2_no_undo",
        label: "4x4 自定义4率（无撤回）（4率 25%）",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2"
      })
    ).toEqual({
      bodyModeId: "spawn_custom_4x4_pow2_no_undo",
      bodyRuleset: "pow2",
      titleText: "自定义4率4x4",
      introText: "4x4自定义4率（4率25%）｜4x4｜2幂",
      titleDisplay: "",
      introDisplay: ""
    });
  });

  it("uses mode-correlated board title text", () => {
    expect(
      resolvePlayHeaderState({
        key: "classic_4x4_pow2_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2"
      }).titleText
    ).toBe("4x4（可撤回）");
    expect(
      resolvePlayHeaderState({
        key: "diag_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        special_rules: { allow_diagonal_moves: true }
      }).titleText
    ).toBe("八方向4x4");
    expect(
      resolvePlayHeaderState({
        key: "nox_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        special_rules: { no_x_enabled: true, no_x_target: 64 }
      }).titleText
    ).toBe("NO-64");
    expect(
      resolvePlayHeaderState({
        key: "nox_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        special_rules: { no_x_enabled: true, no_x_target: 8192 }
      }).titleText
    ).toBe("NO-8K");
    expect(
      compactPlayModeLabel({
        key: "nox_4x4_pow2_no_undo",
        special_rules: { no_x_enabled: true, no_x_target: 16384 }
      })
    ).toBe("NO-16K");
  });
});



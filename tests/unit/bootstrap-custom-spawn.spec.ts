import { describe, expect, it } from "vitest";

import {
  applyCustomFourRateToModeConfig,
  formatRatePercent,
  inferFourRateFromSpawnTable,
  isCustomSpawnModeKey,
  sanitizeCustomFourRate
} from "../../src/bootstrap/custom-spawn";

describe("bootstrap custom spawn", () => {
  it("recognizes custom spawn mode keys", () => {
    expect(isCustomSpawnModeKey("spawn_custom_4x4_pow2_no_undo")).toBe(true);
    expect(isCustomSpawnModeKey("spawn_custom_4x4_pow2_undo")).toBe(true);
    expect(isCustomSpawnModeKey("standard_4x4_pow2_no_undo")).toBe(false);
  });

  it("sanitizes custom four-rate inputs", () => {
    expect(sanitizeCustomFourRate("25")).toBe(25);
    expect(sanitizeCustomFourRate("25.5%")).toBe(25.5);
    expect(sanitizeCustomFourRate(" 0 ")).toBe(0);
    expect(sanitizeCustomFourRate("100")).toBe(100);
    expect(sanitizeCustomFourRate("-1")).toBeNull();
    expect(sanitizeCustomFourRate("101")).toBeNull();
    expect(sanitizeCustomFourRate("abc")).toBeNull();
  });

  it("formats rates without trailing zeros", () => {
    expect(formatRatePercent(25)).toBe("25");
    expect(formatRatePercent(25.5)).toBe("25.5");
    expect(formatRatePercent(25.25)).toBe("25.25");
    expect(formatRatePercent(0)).toBe("0");
  });

  it("infers four-rate from spawn table", () => {
    expect(
      inferFourRateFromSpawnTable([
        { value: 2, weight: 90 },
        { value: 4, weight: 10 }
      ])
    ).toBe(10);
    expect(
      inferFourRateFromSpawnTable([
        { value: 2, weight: 75 },
        { value: 4, weight: 25 }
      ])
    ).toBe(25);
    expect(inferFourRateFromSpawnTable(null)).toBe(10);
    expect(inferFourRateFromSpawnTable([])).toBe(10);
  });

  it("applies four-rate to mode config", () => {
    const next = applyCustomFourRateToModeConfig(
      {
        label: "4x4 自定义4率",
        spawn_table: [
          { value: 2, weight: 90 },
          { value: 4, weight: 10 }
        ],
        special_rules: {}
      },
      25
    );

    expect(next.spawn_table).toEqual([
      { value: 2, weight: 75 },
      { value: 4, weight: 25 }
    ]);
    expect(next.special_rules.custom_spawn_four_rate).toBe(25);
    expect(next.label).toContain("4率 25%");
  });

  it("throws for invalid four-rate", () => {
    expect(() =>
      applyCustomFourRateToModeConfig({ label: "x", spawn_table: [] }, 200)
    ).toThrow("invalid_custom_four_rate");
  });
});

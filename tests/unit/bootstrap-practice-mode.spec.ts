import { describe, expect, it } from "vitest";

import {
  buildPracticeModeConfig,
  parsePracticeRuleset
} from "../../src/bootstrap/practice-mode";

describe("bootstrap practice mode", () => {
  it("parses practice ruleset query", () => {
    expect(parsePracticeRuleset("?practice_ruleset=fibonacci")).toBe("fibonacci");
    expect(parsePracticeRuleset("?practice_ruleset=pow2")).toBe("pow2");
    expect(parsePracticeRuleset("?practice_ruleset=other")).toBe("pow2");
    expect(parsePracticeRuleset("")).toBe("pow2");
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
});

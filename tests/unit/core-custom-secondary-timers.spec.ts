import { describe, expect, it } from "vitest";
import {
  generateRecommendedSecondaryTimerRuleText,
  matchCustomSecondaryTimerRule,
  parseCustomSecondaryTimerRules,
  readCustomSecondaryTimerRuleText,
  resolveCustomSecondaryTimerFamily,
  writeCustomSecondaryTimerRuleText
} from "../../src/core/custom-secondary-timers";

const parentValues = [32, 64, 128];

describe("custom secondary timer rules", () => {
  it("generates two levels of recommended rules for a parent range", () => {
    const pow2Text = generateRecommendedSecondaryTimerRuleText({
      family: "pow2",
      parentValues,
      startParent: 32,
      endParent: 64
    });
    expect(pow2Text).toBe([
      "32", "32+2", "32+4", "32+8", "32+16", "32+16+2", "32+16+4", "32+16+8",
      "",
      "64", "64+2", "64+4", "64+8", "64+16", "64+32", "64+32+2", "64+32+4", "64+32+8", "64+32+16"
    ].join("\n"));
    expect(parseCustomSecondaryTimerRules({
      text: pow2Text,
      family: "pow2",
      parentValues
    }).errors).toEqual([]);

    expect(generateRecommendedSecondaryTimerRuleText({
      family: "fibonacci",
      parentValues: [13],
      startParent: 13,
      endParent: 13
    })).toBe([
      "13", "13+1", "13+2", "13+3", "13+5", "13+8", "13+8+1", "13+8+2", "13+8+3", "13+8+5"
    ].join("\n"));
  });

  it("parses grouped rules, normalizes duplicate values, and sorts by progress", () => {
    const result = parseCustomSecondaryTimerRules({
      text: "32\n32+16\n32+2+2\n32+4\n\n64\n64+2",
      family: "pow2",
      parentValues
    });

    expect(result.errors).toEqual([]);
    expect(result.rules.map((rule) => rule.expression)).toEqual([
      "32+2+2",
      "32+4",
      "32+16",
      "64+2"
    ]);
  });

  it("rejects the entire input with line-specific errors", () => {
    const result = parseCustomSecondaryTimerRules({
      text: "32\n32+3\n64+2\n33\n32++4",
      family: "pow2",
      parentValues
    });

    expect(result.rules).toEqual([]);
    expect(result.errors.map((error) => error.line)).toEqual([2, 3, 4, 5]);
  });

  it("distinguishes exact matches from higher-progress coverage", () => {
    const [rule] = parseCustomSecondaryTimerRules({
      text: "32\n32+16+2",
      family: "pow2",
      parentValues
    }).rules;

    expect(matchCustomSecondaryTimerRule([32, 16, 2, 2], rule)).toEqual({
      kind: "exact",
      coveredBy: ""
    });
    expect(matchCustomSecondaryTimerRule([32, 16, 4], rule)).toEqual({
      kind: "covered",
      coveredBy: "32+16+4"
    });
    expect(matchCustomSecondaryTimerRule([32, 16, 4, 2], rule)).toEqual({
      kind: "covered",
      coveredBy: "32+16+4"
    });
    expect(matchCustomSecondaryTimerRule([32, 8, 8, 4], rule)).toBeNull();
    expect(matchCustomSecondaryTimerRule([64], rule)).toEqual({
      kind: "covered",
      coveredBy: "64"
    });
    expect(matchCustomSecondaryTimerRule([64, 32, 16, 2], rule)).toEqual({
      kind: "covered",
      coveredBy: "64"
    });
  });

  it("covers an unconfigured lower rule from the actual board state", () => {
    const [rule] = parseCustomSecondaryTimerRules({
      text: "32\n32+2",
      family: "pow2",
      parentValues
    }).rules;

    expect(matchCustomSecondaryTimerRule([32, 4], rule)).toEqual({
      kind: "covered",
      coveredBy: "32+4"
    });
  });

  it("stores independent rule text for pow2 and fibonacci families", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem(key: string) {
        return values.get(key) || null;
      },
      setItem(key: string, value: string) {
        values.set(key, value);
      }
    };

    expect(resolveCustomSecondaryTimerFamily("fibonacci")).toBe("fibonacci");
    expect(resolveCustomSecondaryTimerFamily("pow2")).toBe("pow2");
    expect(writeCustomSecondaryTimerRuleText(storage, "pow2", "32\n32+2")).toBe(true);
    expect(writeCustomSecondaryTimerRuleText(storage, "fibonacci", "34\n34+1")).toBe(true);
    expect(readCustomSecondaryTimerRuleText(storage, "pow2")).toBe("32\n32+2");
    expect(readCustomSecondaryTimerRuleText(storage, "fibonacci")).toBe("34\n34+1");
  });
});

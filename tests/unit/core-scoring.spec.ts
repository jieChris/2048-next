import { describe, expect, it } from "vitest";

import { computePostMoveScore } from "../../src/core/scoring";

describe("core scoring: computePostMoveScore", () => {
  it("increments combo streak on merge gain without bonus when multiplier is 1", () => {
    const result = computePostMoveScore({
      scoreBeforeMove: 100,
      scoreAfterMerge: 120,
      comboStreak: 0,
      comboMultiplier: 1
    });
    expect(result).toEqual({
      score: 120,
      comboStreak: 1,
      mergeGain: 20,
      comboBonus: 0
    });
  });

  it("applies combo bonus when multiplier and streak conditions are met", () => {
    const result = computePostMoveScore({
      scoreBeforeMove: 200,
      scoreAfterMerge: 240,
      comboStreak: 1,
      comboMultiplier: 1.5
    });
    expect(result).toEqual({
      score: 260,
      comboStreak: 2,
      mergeGain: 40,
      comboBonus: 20
    });
  });

  it("resets combo streak when no merge gain", () => {
    const result = computePostMoveScore({
      scoreBeforeMove: 300,
      scoreAfterMerge: 300,
      comboStreak: 4,
      comboMultiplier: 2
    });
    expect(result.comboStreak).toBe(0);
    expect(result.score).toBe(300);
    expect(result.comboBonus).toBe(0);
  });

  it("normalizes invalid numeric input", () => {
    const result = computePostMoveScore({
      scoreBeforeMove: Number.NaN,
      scoreAfterMerge: Number.NaN,
      comboStreak: -1,
      comboMultiplier: Number.NaN
    });
    expect(result).toEqual({
      score: 0,
      comboStreak: 0,
      mergeGain: 0,
      comboBonus: 0
    });
  });
});

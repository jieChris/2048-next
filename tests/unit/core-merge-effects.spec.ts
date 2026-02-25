import { describe, expect, it } from "vitest";

import { computeMergeEffects } from "../../src/core/merge-effects";

describe("core merge effects: computeMergeEffects", () => {
  it("marks won on uncapped 2048 merge", () => {
    const result = computeMergeEffects({
      mergedValue: 2048,
      isCappedMode: false,
      cappedTargetValue: null,
      reached32k: false
    });
    expect(result.shouldSetWon).toBe(true);
    expect(result.shouldRecordCappedMilestone).toBe(false);
  });

  it("marks capped milestone on capped target merge", () => {
    const result = computeMergeEffects({
      mergedValue: 2048,
      isCappedMode: true,
      cappedTargetValue: 2048,
      reached32k: false
    });
    expect(result.shouldRecordCappedMilestone).toBe(true);
    expect(result.shouldSetWon).toBe(false);
  });

  it("routes 8192/16384 timers by reached32k state", () => {
    const before32k = computeMergeEffects({
      mergedValue: 8192,
      isCappedMode: false,
      cappedTargetValue: null,
      reached32k: false
    });
    const after32k = computeMergeEffects({
      mergedValue: 16384,
      isCappedMode: false,
      cappedTargetValue: null,
      reached32k: true
    });

    expect(before32k.timerIdsToStamp).toEqual(["timer8192"]);
    expect(after32k.timerIdsToStamp).toEqual(["timer16384-sub"]);
  });

  it("marks 32k milestones and ui flags", () => {
    const result = computeMergeEffects({
      mergedValue: 32768,
      isCappedMode: false,
      cappedTargetValue: null,
      reached32k: false
    });
    expect(result.shouldSetReached32k).toBe(true);
    expect(result.timerIdsToStamp).toEqual(["timer32768"]);
    expect(result.showSubTimerContainer).toBe(true);
    expect(result.hideTimerRows).toEqual([16, 32]);
  });
});

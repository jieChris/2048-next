import { describe, expect, it } from "vitest";

import {
  resolveInvalidatedTimerElementIds,
  resolveTimerUpdateIntervalMs
} from "../../src/core/timer-interval";

describe("core timer interval", () => {
  it("returns 10ms for small boards", () => {
    expect(resolveTimerUpdateIntervalMs(4, 4)).toBe(10);
    expect(resolveTimerUpdateIntervalMs(7, 7)).toBe(10);
  });

  it("returns 33ms for medium boards", () => {
    expect(resolveTimerUpdateIntervalMs(8, 8)).toBe(33);
    expect(resolveTimerUpdateIntervalMs(8, 9)).toBe(33);
  });

  it("returns 50ms for large boards", () => {
    expect(resolveTimerUpdateIntervalMs(10, 10)).toBe(50);
    expect(resolveTimerUpdateIntervalMs(12, 9)).toBe(50);
  });

  it("uses default size fallback for invalid inputs", () => {
    expect(resolveTimerUpdateIntervalMs(null, null)).toBe(10);
    expect(resolveTimerUpdateIntervalMs("x", -1)).toBe(10);
  });
});

describe("core timer interval: resolveInvalidatedTimerElementIds", () => {
  it("returns timer ids whose milestones are below the limit", () => {
    expect(
      resolveInvalidatedTimerElementIds({
        timerMilestones: [16, 32, 64],
        timerSlotIds: [16, 32, 64],
        limit: 40
      })
    ).toEqual(["timer16", "timer32"]);
  });

  it("adds sub timer ids after 32k in non-fibonacci mode", () => {
    expect(
      resolveInvalidatedTimerElementIds({
        timerMilestones: [8192, 16384, 32768],
        timerSlotIds: [8192, 16384, 32768],
        limit: 20000,
        reached32k: true,
        isFibonacciMode: false
      })
    ).toEqual(["timer8192", "timer16384", "timer8192-sub", "timer16384-sub"]);
  });

  it("does not include sub timer ids for 32768 milestone stamp", () => {
    expect(
      resolveInvalidatedTimerElementIds({
        timerMilestones: [32768],
        timerSlotIds: [32768],
        limit: 32768,
        reached32k: true,
        isFibonacciMode: false
      })
    ).toEqual(["timer32768"]);
  });
});

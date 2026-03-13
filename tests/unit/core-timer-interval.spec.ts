import { describe, expect, it } from "vitest";

import {
  resolveInvalidatedSecondaryTimerElementIds,
  resolveMoveInputThrottleMs,
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

describe("core timer interval: resolveMoveInputThrottleMs", () => {
  it("returns 0 for replay mode", () => {
    expect(resolveMoveInputThrottleMs(true, 10, 10)).toBe(0);
  });

  it("returns 45ms for medium boards", () => {
    expect(resolveMoveInputThrottleMs(false, 8, 8)).toBe(45);
    expect(resolveMoveInputThrottleMs(false, 8, 9)).toBe(45);
  });

  it("returns 65ms for large boards", () => {
    expect(resolveMoveInputThrottleMs(false, 10, 10)).toBe(65);
  });

  it("returns 0 for small boards and invalid size inputs", () => {
    expect(resolveMoveInputThrottleMs(false, 4, 4)).toBe(0);
    expect(resolveMoveInputThrottleMs(false, null, null)).toBe(0);
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

describe("core timer interval: resolveInvalidatedSecondaryTimerElementIds", () => {
  it("invalidates only matching child rows under already reached parents", () => {
    expect(
      resolveInvalidatedSecondaryTimerElementIds({
        value: 8192,
        descriptors: [
          { parent: 16384, child: 8192, parentReached: true },
          { parent: 32768, child: 8192, parentReached: true },
          { parent: 32768, child: 4096, parentReached: true },
          { parent: 8192, child: 4096, parentReached: true },
          { parent: 65536, child: 8192, parentReached: false }
        ]
      })
    ).toEqual(["timer-secondary-16384-8192", "timer-secondary-32768-8192"]);
  });

  it("does not invalidate descendants when a parent tile is first placed", () => {
    expect(
      resolveInvalidatedSecondaryTimerElementIds({
        value: 32768,
        descriptors: [
          { parent: 32768, child: 16384, parentReached: false },
          { parent: 65536, child: 32768, parentReached: false }
        ]
      })
    ).toEqual([]);
  });
});

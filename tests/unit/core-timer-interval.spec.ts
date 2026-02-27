import { describe, expect, it } from "vitest";

import { resolveTimerUpdateIntervalMs } from "../../src/core/timer-interval";

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

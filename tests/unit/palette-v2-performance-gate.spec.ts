import { describe, expect, it } from "vitest";
import { percentile95 } from "../../scripts/palette-v2-performance-gate.mjs";

describe("palette V2 performance gate", () => {
  it("uses a deterministic nearest-rank p95", () => {
    expect(percentile95([10, 20, 30, 40, 50])).toBe(50);
    expect(percentile95(Array.from({ length: 100 }, (_, index) => index + 1))).toBe(95);
  });

  it("ignores invalid samples and fails with NaN when no measurements remain", () => {
    expect(percentile95([10, Number.NaN, 20])).toBe(20);
    expect(Number.isNaN(percentile95([Number.NaN]))).toBe(true);
  });
});

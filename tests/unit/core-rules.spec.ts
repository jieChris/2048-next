import { describe, expect, it } from "vitest";

import {
  getActualSecondaryRateText,
  getMergedValue,
  getSpawnCount,
  getSpawnStatPair,
  getTheoreticalMaxTile,
  getTotalSpawnCount,
  getTimerMilestoneValues,
  nextFibonacci,
  normalizeSpawnTable,
  pickSpawnValue
} from "../../src/core/rules";

describe("core rules: normalizeSpawnTable", () => {
  it("filters invalid entries and keeps valid weighted values", () => {
    const table = normalizeSpawnTable(
      [
        { value: 2, weight: 90 },
        { value: 4, weight: 10 },
        { value: -1, weight: 100 },
        { value: 8, weight: 0 }
      ],
      "pow2"
    );
    expect(table).toEqual([
      { value: 2, weight: 90 },
      { value: 4, weight: 10 }
    ]);
  });

  it("falls back to pow2 defaults", () => {
    expect(normalizeSpawnTable([], "pow2")).toEqual([
      { value: 2, weight: 90 },
      { value: 4, weight: 10 }
    ]);
  });

  it("falls back to fibonacci defaults", () => {
    expect(normalizeSpawnTable([], "fibonacci")).toEqual([
      { value: 1, weight: 90 },
      { value: 2, weight: 10 }
    ]);
  });
});

describe("core rules: getTheoreticalMaxTile", () => {
  it("computes pow2 cap for 4x4", () => {
    expect(getTheoreticalMaxTile(4, 4, "pow2")).toBe(131072);
  });

  it("computes fibonacci cap for 4x4", () => {
    expect(getTheoreticalMaxTile(4, 4, "fibonacci")).toBe(4181);
  });

  it("returns null for invalid size", () => {
    expect(getTheoreticalMaxTile(0, 4, "pow2")).toBeNull();
  });
});

describe("core rules: nextFibonacci", () => {
  it("returns next for valid fibonacci numbers", () => {
    expect(nextFibonacci(1)).toBe(2);
    expect(nextFibonacci(2)).toBe(3);
    expect(nextFibonacci(3)).toBe(5);
    expect(nextFibonacci(13)).toBe(21);
  });

  it("returns null for non-fibonacci", () => {
    expect(nextFibonacci(4)).toBeNull();
    expect(nextFibonacci(10)).toBeNull();
  });
});

describe("core rules: getMergedValue", () => {
  it("merges equal pow2 tiles", () => {
    expect(getMergedValue(8, 8, "pow2", Infinity)).toBe(16);
  });

  it("rejects invalid pow2 merges", () => {
    expect(getMergedValue(2, 4, "pow2", Infinity)).toBeNull();
    expect(getMergedValue(1024, 1024, "pow2", 1024)).toBeNull();
  });

  it("merges fibonacci pairs", () => {
    expect(getMergedValue(1, 1, "fibonacci", Infinity)).toBe(2);
    expect(getMergedValue(2, 3, "fibonacci", Infinity)).toBe(5);
    expect(getMergedValue(3, 5, "fibonacci", Infinity)).toBe(8);
  });

  it("rejects invalid fibonacci merges", () => {
    expect(getMergedValue(1, 3, "fibonacci", Infinity)).toBeNull();
    expect(getMergedValue(5, 5, "fibonacci", Infinity)).toBeNull();
    expect(getMergedValue(13, 21, "fibonacci", 21)).toBeNull();
  });
});

describe("core rules: pickSpawnValue", () => {
  it("chooses by weight using deterministic random source", () => {
    const table = [
      { value: 2, weight: 90 },
      { value: 4, weight: 10 }
    ];
    expect(pickSpawnValue(table, () => 0)).toBe(2);
    expect(pickSpawnValue(table, () => 0.8999)).toBe(2);
    expect(pickSpawnValue(table, () => 0.9999)).toBe(4);
  });

  it("falls back to first item when total weight is invalid", () => {
    expect(
      pickSpawnValue(
        [
          { value: 7, weight: 0 },
          { value: 9, weight: 0 }
        ],
        () => 0.5
      )
    ).toBe(7);
  });
});

describe("core rules: getTimerMilestoneValues", () => {
  it("returns fibonacci milestones in fibonacci mode", () => {
    expect(getTimerMilestoneValues("fibonacci", [16, 32, 64]).slice(0, 4)).toEqual([13, 21, 34, 55]);
  });

  it("returns timer slots for pow2 mode", () => {
    expect(getTimerMilestoneValues("pow2", [16, 32, 64])).toEqual([16, 32, 64]);
  });
});

describe("core rules: spawn stats", () => {
  it("resolves primary/secondary spawn values from table", () => {
    expect(getSpawnStatPair([{ value: 4, weight: 10 }, { value: 2, weight: 90 }])).toEqual({
      primary: 2,
      secondary: 4
    });
    expect(getSpawnStatPair([{ value: 1, weight: 100 }])).toEqual({
      primary: 1,
      secondary: 1
    });
    expect(getSpawnStatPair(null)).toEqual({
      primary: 2,
      secondary: 2
    });
  });

  it("computes counts and secondary rate text", () => {
    const counts = { "1": 9, "2": 1 };
    expect(getSpawnCount(counts, 1)).toBe(9);
    expect(getSpawnCount(counts, 2)).toBe(1);
    expect(getSpawnCount(counts, 4)).toBe(0);
    expect(getTotalSpawnCount(counts)).toBe(10);
    expect(
      getActualSecondaryRateText(counts, [
        { value: 1, weight: 90 },
        { value: 2, weight: 10 }
      ])
    ).toBe("10.00");
    expect(getActualSecondaryRateText(null, null)).toBe("0.00");
  });
});

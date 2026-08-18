import { describe, expect, it } from "vitest";

import {
  applySpawnValueCount,
  createRulesRuntime,
  getActualSecondaryRateText,
  getMergedValue,
  getSpawnCount,
  getSpawnStatPair,
  getTheoreticalMaxTile,
  getTimerSlotIdsForBoard,
  getTimerMilestoneSlotByValue,
  getTotalSpawnCount,
  getTimerMilestoneValues,
  installRulesRuntime,
  nextFibonacci,
  normalizeSpawnTable,
  pickSpawnValue,
  type RulesRuntime
} from "../../src/core/rules";

describe("core rules runtime installer", () => {
  it("creates the legacy CoreRulesRuntime shape from TypeScript functions", () => {
    const runtime = createRulesRuntime();

    expect(runtime.normalizeSpawnTable).toBe(normalizeSpawnTable);
    expect(runtime.getTheoreticalMaxTile).toBe(getTheoreticalMaxTile);
    expect(runtime.pickSpawnValue).toBe(pickSpawnValue);
    expect(runtime.getSpawnStatPair).toBe(getSpawnStatPair);
    expect(runtime.getSpawnCount).toBe(getSpawnCount);
    expect(runtime.getTotalSpawnCount).toBe(getTotalSpawnCount);
    expect(runtime.getActualSecondaryRateText).toBe(getActualSecondaryRateText);
    expect(runtime.applySpawnValueCount).toBe(applySpawnValueCount);
    expect(runtime.nextFibonacci).toBe(nextFibonacci);
    expect(runtime.getMergedValue).toBe(getMergedValue);
    expect(runtime.getTimerSlotIdsForBoard).toBe(getTimerSlotIdsForBoard);
    expect(runtime.getTimerMilestoneValues).toBe(getTimerMilestoneValues);
    expect(runtime.getTimerMilestoneSlotByValue).toBe(getTimerMilestoneSlotByValue);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreRulesRuntime?: RulesRuntime } = {};

    const installed = installRulesRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreRulesRuntime);
    expect(installed?.getMergedValue).toBeTypeOf("function");
  });

  it("does not overwrite an existing rules runtime", () => {
    const existing = createRulesRuntime();
    const windowLike = { CoreRulesRuntime: existing };

    const installed = installRulesRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreRulesRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installRulesRuntime({ windowLike: null })).toBeNull();
  });
});

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

  it("computes pow2 caps for rectangular boards", () => {
    expect(getTheoreticalMaxTile(4, 2, "pow2")).toBe(512);
    expect(getTheoreticalMaxTile(4, 3, "pow2")).toBe(8192);
  });

  it("computes fibonacci cap from the two directly spawnable base ranks", () => {
    expect(getTheoreticalMaxTile(3, 3, "fibonacci")).toBe(4181);
    expect(getTheoreticalMaxTile(4, 4, "fibonacci")).toBe(3524578);
  });

  it("computes fibonacci caps for rectangular boards", () => {
    expect(getTheoreticalMaxTile(4, 2, "fibonacci")).toBe(1597);
    expect(getTheoreticalMaxTile(4, 3, "fibonacci")).toBe(75025);
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
    expect(getMergedValue(1, 1, "pow2", Infinity)).toBeNull();
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
  it("builds pow2 timer slots through the theoretical max tile", () => {
    expect(getTimerSlotIdsForBoard("pow2", 3, 3, [32, 64, 128, 256, 512, 1024, 2048])).toEqual([
      32,
      64,
      128,
      256,
      512,
      1024
    ]);
    expect(getTimerSlotIdsForBoard("pow2", 4, 2)).toEqual([32, 64, 128, 256, 512]);
    expect(getTimerSlotIdsForBoard("pow2", 4, 3)).toEqual([32, 64, 128, 256, 512, 1024, 2048, 4096, 8192]);
    expect(getTimerSlotIdsForBoard("pow2", 4, 4).at(-1)).toBe(131072);
    expect(getTimerSlotIdsForBoard("pow2", 5, 5, [32, 64, 128, 256, 512, 1024, 2048])).toContain(67108864);
    expect(getTimerSlotIdsForBoard("pow2", 4, 4, [], 64)).toEqual([32, 64]);
  });

  it("returns fibonacci milestones in fibonacci mode", () => {
    expect(getTimerMilestoneValues("fibonacci", [16, 32, 64]).slice(0, 4)).toEqual([13, 21, 34, 55]);
  });

  it("returns timer slots for pow2 mode", () => {
    expect(getTimerMilestoneValues("pow2", [16, 32, 64])).toEqual([16, 32, 64]);
  });

  it("limits milestone values to the current board theoretical max tile", () => {
    expect(getTimerMilestoneValues("pow2", [32, 64, 128, 256, 512, 1024, 2048, 4096], 3, 3)).toEqual([
      32,
      64,
      128,
      256,
      512,
      1024
    ]);
    expect(getTimerMilestoneValues("pow2", getTimerSlotIdsForBoard("pow2", 4, 2), 4, 2)).toEqual([
      32,
      64,
      128,
      256,
      512
    ]);
    expect(getTimerMilestoneValues("pow2", getTimerSlotIdsForBoard("pow2", 4, 3), 4, 3)).toEqual([
      32,
      64,
      128,
      256,
      512,
      1024,
      2048,
      4096,
      8192
    ]);
    expect(getTimerMilestoneValues("fibonacci", getTimerSlotIdsForBoard("fibonacci", 3, 3), 3, 3)).toEqual([
      13,
      21,
      34,
      55,
      89,
      144,
      233,
      377,
      610,
      987,
      1597,
      2584,
      4181
    ]);
    expect(getTimerMilestoneValues("fibonacci", getTimerSlotIdsForBoard("fibonacci", 4, 2), 4, 2)).toEqual([
      13,
      21,
      34,
      55,
      89,
      144,
      233,
      377,
      610,
      987,
      1597
    ]);
    expect(getTimerMilestoneValues("fibonacci", getTimerSlotIdsForBoard("fibonacci", 4, 3), 4, 3).at(-1)).toBe(75025);
    expect(getTimerMilestoneValues("fibonacci", getTimerSlotIdsForBoard("fibonacci", 4, 4), 4, 4).at(-1)).toBe(2178309);
    expect(getTimerMilestoneValues("fibonacci", getTimerSlotIdsForBoard("fibonacci", 4, 4), 4, 4)).not.toContain(3524578);
  });
});

describe("core rules: getTimerMilestoneSlotByValue", () => {
  it("builds slot map from milestone values and timer slot ids", () => {
    expect(getTimerMilestoneSlotByValue([13, 21, 34], [16, 32, 64])).toEqual({
      "13": "16",
      "21": "32",
      "34": "64"
    });
  });

  it("skips invalid milestone values", () => {
    expect(getTimerMilestoneSlotByValue([16, 0, -1, 32.5, 64], [16, 32, 64, 128, 256])).toEqual({
      "16": "16",
      "64": "256"
    });
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

  it("applies spawn value count updates with compatibility counters", () => {
    expect(applySpawnValueCount(null, 2)).toEqual({
      nextSpawnValueCounts: { "2": 1 },
      spawnTwos: 1,
      spawnFours: 0
    });
    expect(applySpawnValueCount({ "2": 1, "4": 2 }, 4)).toEqual({
      nextSpawnValueCounts: { "2": 1, "4": 3 },
      spawnTwos: 1,
      spawnFours: 3
    });
  });
});

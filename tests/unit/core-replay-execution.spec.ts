import { describe, expect, it } from "vitest";

import {
  computeReplayStepStats,
  getReplayActionKind,
  resolveIpsDisplayText,
  resolveIpsInputCount,
  resolveNextIpsInputCount,
  resolveReplayExecution
} from "../../src/core/replay-execution";

describe("core replay execution: getReplayActionKind", () => {
  it("classifies move, undo, practice and unknown actions", () => {
    expect(getReplayActionKind(2)).toBe("m");
    expect(getReplayActionKind(-1)).toBe("u");
    expect(getReplayActionKind(["p", 1, 2, 4])).toBe("p");
    expect(getReplayActionKind({})).toBe("x");
  });
});

describe("core replay execution: resolveReplayExecution", () => {
  it("resolves direct move action", () => {
    expect(resolveReplayExecution(3)).toEqual({ kind: "m", dir: 3 });
  });

  it("resolves tuple move action", () => {
    expect(resolveReplayExecution(["m", 1])).toEqual({ kind: "m", dir: 1 });
  });

  it("resolves undo action", () => {
    expect(resolveReplayExecution(-1)).toEqual({ kind: "u" });
  });

  it("resolves practice action payload", () => {
    expect(resolveReplayExecution(["p", 2, 3, 64])).toEqual({
      kind: "p",
      x: 2,
      y: 3,
      value: 64
    });
  });

  it("throws on unknown action", () => {
    expect(() => resolveReplayExecution(["q"])).toThrow("Unknown replay action");
  });
});

describe("core replay execution: computeReplayStepStats", () => {
  it("computes step stats with undo rollback semantics", () => {
    expect(
      computeReplayStepStats({
        actions: [0, 1, -1, ["p", 0, 0, 2], 2, -1, -1],
        limit: 7
      })
    ).toEqual({
      totalSteps: 7,
      moveSteps: 0,
      undoSteps: 3
    });
  });

  it("clamps limit and handles invalid input", () => {
    expect(
      computeReplayStepStats({
        actions: [0, -1, 2],
        limit: 99
      })
    ).toEqual({
      totalSteps: 3,
      moveSteps: 1,
      undoSteps: 1
    });
    expect(
      computeReplayStepStats({
        actions: null,
        limit: 5
      })
    ).toEqual({
      totalSteps: 0,
      moveSteps: 0,
      undoSteps: 0
    });
  });
});

describe("core replay execution: ips input count", () => {
  it("resolves current ips input count for replay and normal modes", () => {
    expect(
      resolveIpsInputCount({
        replayMode: true,
        replayIndex: 12,
        ipsInputCount: 3
      })
    ).toBe(12);
    expect(
      resolveIpsInputCount({
        replayMode: true,
        replayIndex: -1,
        ipsInputCount: 3
      })
    ).toBe(0);
    expect(
      resolveIpsInputCount({
        replayMode: false,
        replayIndex: 12,
        ipsInputCount: 7
      })
    ).toBe(7);
    expect(
      resolveIpsInputCount({
        replayMode: false,
        ipsInputCount: -4
      })
    ).toBe(0);
  });

  it("resolves next ips input count update", () => {
    expect(
      resolveNextIpsInputCount({
        replayMode: true,
        replayIndex: 10,
        ipsInputCount: 5
      })
    ).toEqual({
      shouldRecord: false,
      nextIpsInputCount: 10,
      nextIpsInputTimes: []
    });
    expect(
      resolveNextIpsInputCount({
        replayMode: false,
        ipsInputCount: 5
      })
    ).toEqual({
      shouldRecord: true,
      nextIpsInputCount: 6,
      nextIpsInputTimes: []
    });
    expect(
      resolveNextIpsInputCount({
        replayMode: false,
        ipsInputCount: -2
      })
    ).toEqual({
      shouldRecord: true,
      nextIpsInputCount: 1,
      nextIpsInputTimes: []
    });
    expect(
      resolveNextIpsInputCount({
        replayMode: false,
        ipsInputTimes: [100, 500, 700],
        nowMs: 1200
      })
    ).toEqual({
      shouldRecord: true,
      nextIpsInputCount: 3,
      nextIpsInputTimes: [500, 700, 1200]
    });
  });
});

describe("core replay execution: ips display text", () => {
  it("computes fixed-point ips text by one-second window count", () => {
    expect(
      resolveIpsDisplayText({
        durationMs: 2000,
        ipsInputCount: 5
      })
    ).toEqual({
      avgIpsText: "5",
      ipsText: "IPS: 5"
    });
  });

  it("keeps zero text when window count is zero", () => {
    expect(
      resolveIpsDisplayText({
        durationMs: 0,
        ipsInputCount: 0
      })
    ).toEqual({
      avgIpsText: "0",
      ipsText: "IPS: 0"
    });
    expect(
      resolveIpsDisplayText({
        durationMs: -1,
        ipsInputCount: 0
      })
    ).toEqual({
      avgIpsText: "0",
      ipsText: "IPS: 0"
    });
  });

  it("sanitizes invalid input count", () => {
    expect(
      resolveIpsDisplayText({
        durationMs: 1000,
        ipsInputCount: Number.NaN
      })
    ).toEqual({
      avgIpsText: "0",
      ipsText: "IPS: 0"
    });
  });

  it("resolves one-second window count from timestamps when provided", () => {
    expect(
      resolveIpsInputCount({
        replayMode: false,
        ipsInputCount: 20,
        ipsInputTimes: [10, 200, 800, 1200, 1300],
        nowMs: 1300
      })
    ).toBe(3);
  });
});

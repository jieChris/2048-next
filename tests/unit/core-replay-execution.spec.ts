import { describe, expect, it } from "vitest";

import {
  computeReplayStepStats,
  getReplayActionKind,
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

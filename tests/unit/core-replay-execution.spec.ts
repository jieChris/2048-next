import { describe, expect, it } from "vitest";

import {
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

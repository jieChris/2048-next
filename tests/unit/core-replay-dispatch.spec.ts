import { describe, expect, it } from "vitest";

import { planReplayDispatch } from "../../src/core/replay-dispatch";

describe("core replay dispatch: planReplayDispatch", () => {
  it("routes move action to move method with resolved dir", () => {
    expect(planReplayDispatch({ kind: "m", dir: 2 })).toEqual({
      method: "move",
      args: [2]
    });
  });

  it("routes undo action to move method with -1", () => {
    expect(planReplayDispatch({ kind: "u" })).toEqual({
      method: "move",
      args: [-1]
    });
  });

  it("routes practice action to insertCustomTile method", () => {
    expect(planReplayDispatch({ kind: "p", x: 1, y: 2, value: 16 })).toEqual({
      method: "insertCustomTile",
      args: [1, 2, 16]
    });
  });
});

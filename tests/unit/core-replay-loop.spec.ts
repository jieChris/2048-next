import { describe, expect, it } from "vitest";

import { planReplayStepExecution } from "../../src/core/replay-loop";

describe("core replay loop: planReplayStepExecution", () => {
  it("returns move action plan with forced spawn injection", () => {
    const spawn = { x: 1, y: 2, value: 4 };
    expect(
      planReplayStepExecution({
        replayMoves: [2],
        replaySpawns: [spawn],
        replayIndex: 0
      })
    ).toEqual({
      action: 2,
      shouldInjectForcedSpawn: true,
      forcedSpawn: spawn,
      nextReplayIndex: 1
    });
  });

  it("does not inject forced spawn for array action", () => {
    expect(
      planReplayStepExecution({
        replayMoves: [["p", 1, 1, 16]],
        replaySpawns: [{ x: 0, y: 0, value: 2 }],
        replayIndex: 0
      })
    ).toEqual({
      action: ["p", 1, 1, 16],
      shouldInjectForcedSpawn: false,
      forcedSpawn: undefined,
      nextReplayIndex: 1
    });
  });

  it("keeps undefined spawn when spawn stream is unavailable", () => {
    expect(
      planReplayStepExecution({
        replayMoves: [3],
        replaySpawns: null,
        replayIndex: 0
      })
    ).toEqual({
      action: 3,
      shouldInjectForcedSpawn: false,
      forcedSpawn: undefined,
      nextReplayIndex: 1
    });
  });
});

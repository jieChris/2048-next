import { describe, expect, it } from "vitest";

import {
  normalizeReplaySeekTarget,
  planReplayStep
} from "../../src/core/replay-lifecycle";

describe("core replay lifecycle: normalizeReplaySeekTarget", () => {
  it("clamps negative target index to zero", () => {
    expect(
      normalizeReplaySeekTarget({
        targetIndex: -3,
        hasReplayMoves: true,
        replayMovesLength: 10
      })
    ).toBe(0);
  });

  it("clamps target index to replay length when replay moves exist", () => {
    expect(
      normalizeReplaySeekTarget({
        targetIndex: 99,
        hasReplayMoves: true,
        replayMovesLength: 12
      })
    ).toBe(12);
  });

  it("keeps target index when replay moves are absent", () => {
    expect(
      normalizeReplaySeekTarget({
        targetIndex: 7,
        hasReplayMoves: false,
        replayMovesLength: 0
      })
    ).toBe(7);
  });

  it("preserves non-integer targets", () => {
    expect(
      normalizeReplaySeekTarget({
        targetIndex: 2.4,
        hasReplayMoves: true,
        replayMovesLength: 10
      })
    ).toBe(2.4);
  });
});

describe("core replay lifecycle: planReplayStep", () => {
  it("injects forced spawn for scalar replay action when spawn stream is enabled", () => {
    const spawn = { x: 1, y: 2, value: 4 };
    expect(
      planReplayStep({
        action: 3,
        hasReplaySpawns: true,
        spawnAtIndex: spawn
      })
    ).toEqual({
      shouldInjectForcedSpawn: true,
      forcedSpawn: spawn
    });
  });

  it("does not inject forced spawn for array action", () => {
    expect(
      planReplayStep({
        action: ["p", 1, 1, 16],
        hasReplaySpawns: true,
        spawnAtIndex: { x: 0, y: 0, value: 2 }
      })
    ).toEqual({
      shouldInjectForcedSpawn: false,
      forcedSpawn: undefined
    });
  });

  it("does not inject forced spawn when spawn stream is disabled", () => {
    expect(
      planReplayStep({
        action: 1,
        hasReplaySpawns: false,
        spawnAtIndex: { x: 0, y: 0, value: 2 }
      })
    ).toEqual({
      shouldInjectForcedSpawn: false,
      forcedSpawn: undefined
    });
  });
});

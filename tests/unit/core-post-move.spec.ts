import { describe, expect, it } from "vitest";

import { computePostMoveLifecycle } from "../../src/core/post-move";

describe("core post move: computePostMoveLifecycle", () => {
  it("increments move count and keeps game running when moves remain", () => {
    const result = computePostMoveLifecycle({
      successfulMoveCount: 5,
      hasMovesAvailable: true,
      timerStatus: 1
    });
    expect(result).toEqual({
      successfulMoveCount: 6,
      over: false,
      shouldEndTime: false,
      shouldStartTimer: false
    });
  });

  it("marks game over and end time when no moves remain", () => {
    const result = computePostMoveLifecycle({
      successfulMoveCount: 5,
      hasMovesAvailable: false,
      timerStatus: 1
    });
    expect(result).toEqual({
      successfulMoveCount: 6,
      over: true,
      shouldEndTime: true,
      shouldStartTimer: false
    });
  });

  it("starts timer on first effective move when game not over", () => {
    const result = computePostMoveLifecycle({
      successfulMoveCount: 0,
      hasMovesAvailable: true,
      timerStatus: 0
    });
    expect(result.shouldStartTimer).toBe(true);
    expect(result.over).toBe(false);
  });

  it("normalizes invalid move count", () => {
    const result = computePostMoveLifecycle({
      successfulMoveCount: -1,
      hasMovesAvailable: true,
      timerStatus: 0
    });
    expect(result.successfulMoveCount).toBe(1);
  });
});

import { describe, expect, it } from "vitest";

import {
  computeReplayPauseState,
  computeReplayResumeState,
  computeReplaySpeedState,
  shouldStopReplayAtTick
} from "../../src/core/replay-timer";

describe("core replay timer: computeReplayPauseState", () => {
  it("returns paused state with interval clear signal", () => {
    expect(computeReplayPauseState()).toEqual({
      isPaused: true,
      shouldClearInterval: true
    });
  });
});

describe("core replay timer: computeReplayResumeState", () => {
  it("uses provided replay delay when truthy", () => {
    expect(computeReplayResumeState({ replayDelay: 350 })).toEqual({
      isPaused: false,
      shouldClearInterval: true,
      delay: 350
    });
  });

  it("falls back to default delay for falsy replay delay", () => {
    expect(computeReplayResumeState({ replayDelay: 0 }).delay).toBe(200);
    expect(computeReplayResumeState({ replayDelay: Number.NaN }).delay).toBe(200);
    expect(computeReplayResumeState({ replayDelay: undefined }).delay).toBe(200);
  });
});

describe("core replay timer: computeReplaySpeedState", () => {
  it("computes replay delay from base delay and multiplier", () => {
    expect(computeReplaySpeedState({ multiplier: 2, isPaused: false })).toEqual({
      replayDelay: 100,
      shouldResume: true
    });
  });

  it("keeps replay paused when speed changes while paused", () => {
    const result = computeReplaySpeedState({ multiplier: 4, isPaused: true });
    expect(result.replayDelay).toBe(50);
    expect(result.shouldResume).toBe(false);
  });
});

describe("core replay timer: shouldStopReplayAtTick", () => {
  it("stops when replay index reaches replay length", () => {
    expect(shouldStopReplayAtTick({ replayIndex: 3, replayMovesLength: 3 })).toBe(true);
    expect(shouldStopReplayAtTick({ replayIndex: 4, replayMovesLength: 3 })).toBe(true);
    expect(shouldStopReplayAtTick({ replayIndex: 2, replayMovesLength: 3 })).toBe(false);
  });
});

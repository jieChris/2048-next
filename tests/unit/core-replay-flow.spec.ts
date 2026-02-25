import { describe, expect, it } from "vitest";

import {
  computeReplayEndState,
  planReplaySeekRestart,
  planReplaySeekRewind
} from "../../src/core/replay-flow";

describe("core replay flow: computeReplayEndState", () => {
  it("returns paused end-state and disables replay mode", () => {
    expect(computeReplayEndState()).toEqual({
      shouldPause: true,
      replayMode: false
    });
  });
});

describe("core replay flow: planReplaySeekRewind", () => {
  it("does not rewind when target index is ahead or equal", () => {
    expect(
      planReplaySeekRewind({
        targetIndex: 5,
        replayIndex: 5,
        hasReplayStartBoard: true
      })
    ).toEqual({
      shouldRewind: false,
      strategy: "none",
      replayIndexAfterRewind: 5
    });
  });

  it("rewinds with board strategy when replay start board exists", () => {
    expect(
      planReplaySeekRewind({
        targetIndex: 2,
        replayIndex: 7,
        hasReplayStartBoard: true
      })
    ).toEqual({
      shouldRewind: true,
      strategy: "board",
      replayIndexAfterRewind: 0
    });
  });

  it("rewinds with seed strategy when replay start board is unavailable", () => {
    expect(
      planReplaySeekRewind({
        targetIndex: 1,
        replayIndex: 7,
        hasReplayStartBoard: false
      })
    ).toEqual({
      shouldRewind: true,
      strategy: "seed",
      replayIndexAfterRewind: 0
    });
  });
});

describe("core replay flow: planReplaySeekRestart", () => {
  it("returns no restart actions when rewind is not required", () => {
    expect(
      planReplaySeekRestart({
        shouldRewind: false,
        strategy: "none",
        replayIndexAfterRewind: 5
      })
    ).toEqual({
      shouldRestartWithBoard: false,
      shouldRestartWithSeed: false,
      shouldApplyReplayIndex: false,
      replayIndex: 5
    });
  });

  it("plans board restart for board strategy rewind", () => {
    expect(
      planReplaySeekRestart({
        shouldRewind: true,
        strategy: "board",
        replayIndexAfterRewind: 0
      })
    ).toEqual({
      shouldRestartWithBoard: true,
      shouldRestartWithSeed: false,
      shouldApplyReplayIndex: true,
      replayIndex: 0
    });
  });

  it("plans seed restart for seed strategy rewind", () => {
    expect(
      planReplaySeekRestart({
        shouldRewind: true,
        strategy: "seed",
        replayIndexAfterRewind: 0
      })
    ).toEqual({
      shouldRestartWithBoard: false,
      shouldRestartWithSeed: true,
      shouldApplyReplayIndex: true,
      replayIndex: 0
    });
  });
});

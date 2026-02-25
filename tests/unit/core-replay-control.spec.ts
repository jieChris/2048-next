import { describe, expect, it } from "vitest";

import { planReplayTickBoundary } from "../../src/core/replay-control";

describe("core replay control: planReplayTickBoundary", () => {
  it("continues replay when current tick is inside replay range", () => {
    expect(
      planReplayTickBoundary({
        shouldStopAtTick: false,
        replayEndState: {
          shouldPause: true,
          replayMode: false
        }
      })
    ).toEqual({
      shouldStop: false,
      shouldPause: false,
      shouldApplyReplayMode: false,
      replayMode: true
    });
  });

  it("stops replay and applies paused non-replay end-state by default", () => {
    expect(
      planReplayTickBoundary({
        shouldStopAtTick: true,
        replayEndState: {
          shouldPause: true,
          replayMode: false
        }
      })
    ).toEqual({
      shouldStop: true,
      shouldPause: true,
      shouldApplyReplayMode: true,
      replayMode: false
    });
  });

  it("honors end-state override when pause is disabled and replay stays enabled", () => {
    expect(
      planReplayTickBoundary({
        shouldStopAtTick: true,
        replayEndState: {
          shouldPause: false,
          replayMode: true
        }
      })
    ).toEqual({
      shouldStop: true,
      shouldPause: false,
      shouldApplyReplayMode: true,
      replayMode: true
    });
  });
});

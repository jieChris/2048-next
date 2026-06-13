import { describe, expect, it } from "vitest";

import {
  computeReplayPauseState,
  computeReplayResumeState,
  computeReplaySpeedState,
  resolveDurationMs,
  shouldStopReplayAtTick
} from "../../src/core/replay-timer";
import {
  createReplayTimerRuntime,
  installReplayTimerRuntime,
  type ReplayTimerRuntime
} from "../../src/bootstrap/replay-timer-runtime";

describe("bootstrap replay-timer runtime", () => {
  it("creates the legacy CoreReplayTimerRuntime shape from TypeScript functions", () => {
    const runtime = createReplayTimerRuntime();

    expect(runtime.computeReplayPauseState()).toEqual(computeReplayPauseState());
    expect(runtime.computeReplayResumeState({ replayDelay: 350 })).toEqual(
      computeReplayResumeState({ replayDelay: 350 })
    );
    expect(runtime.computeReplaySpeedState({ multiplier: 2, isPaused: false })).toEqual(
      computeReplaySpeedState({ multiplier: 2, isPaused: false })
    );
    expect(runtime.shouldStopReplayAtTick({ replayIndex: 3, replayMovesLength: 3 })).toBe(
      shouldStopReplayAtTick({ replayIndex: 3, replayMovesLength: 3 })
    );
    expect(
      runtime.resolveDurationMs({
        timerStatus: 1,
        timerElapsedOffsetMs: 2500,
        timerAnchorServerMs: 90000,
        timerServerNowMs: 97500,
        nowMs: 200000
      })
    ).toBe(
      resolveDurationMs({
        timerStatus: 1,
        timerElapsedOffsetMs: 2500,
        timerAnchorServerMs: 90000,
        timerServerNowMs: 97500,
        nowMs: 200000
      })
    );
  });

  it("preserves legacy fallback behavior for missing inputs", () => {
    const runtime = createReplayTimerRuntime();

    expect(runtime.computeReplayResumeState(undefined)).toEqual({
      isPaused: false,
      shouldClearInterval: true,
      delay: 200
    });
    expect(runtime.computeReplaySpeedState(undefined)).toEqual({
      replayDelay: Number.NaN,
      shouldResume: true
    });
    expect(runtime.shouldStopReplayAtTick(undefined)).toBe(false);
    expect(runtime.resolveDurationMs({ accumulatedTime: 123.8, nowMs: 500 })).toBe(123);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayTimerRuntime?: ReplayTimerRuntime } = {};

    const installed = installReplayTimerRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayTimerRuntime);
    expect(installed?.computeReplayPauseState).toBeTypeOf("function");
    expect(installed?.resolveDurationMs).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayTimerRuntime();
    const windowLike = { CoreReplayTimerRuntime: existing };

    const installed = installReplayTimerRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayTimerRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayTimerRuntime({ windowLike: null })).toBeNull();
  });
});

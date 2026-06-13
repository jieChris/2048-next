import { describe, expect, it } from "vitest";

import { planReplayTickBoundary } from "../../src/core/replay-control";
import {
  createReplayControlRuntime,
  installReplayControlRuntime,
  type ReplayControlRuntime
} from "../../src/bootstrap/replay-control-runtime";

describe("bootstrap replay-control runtime", () => {
  it("creates the legacy CoreReplayControlRuntime shape from TypeScript functions", () => {
    const runtime = createReplayControlRuntime();

    expect(
      runtime.planReplayTickBoundary({
        shouldStopAtTick: true,
        replayEndState: {
          shouldPause: false,
          replayMode: true
        }
      })
    ).toEqual(
      planReplayTickBoundary({
        shouldStopAtTick: true,
        replayEndState: {
          shouldPause: false,
          replayMode: true
        }
      })
    );
  });

  it("preserves legacy fallback behavior for missing inputs", () => {
    const runtime = createReplayControlRuntime();

    expect(runtime.planReplayTickBoundary(undefined)).toEqual({
      shouldStop: false,
      shouldPause: false,
      shouldApplyReplayMode: false,
      replayMode: true
    });
  });

  it("preserves legacy fallback behavior for a missing replayEndState", () => {
    const runtime = createReplayControlRuntime();

    expect(runtime.planReplayTickBoundary({ shouldStopAtTick: true })).toEqual({
      shouldStop: true,
      shouldPause: true,
      shouldApplyReplayMode: true,
      replayMode: false
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayControlRuntime?: ReplayControlRuntime } = {};

    const installed = installReplayControlRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayControlRuntime);
    expect(installed?.planReplayTickBoundary).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayControlRuntime();
    const windowLike = { CoreReplayControlRuntime: existing };

    const installed = installReplayControlRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayControlRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayControlRuntime({ windowLike: null })).toBeNull();
  });
});

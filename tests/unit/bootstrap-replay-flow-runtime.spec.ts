import { describe, expect, it } from "vitest";

import {
  computeReplayEndState,
  planReplaySeekRestart,
  planReplaySeekRewind
} from "../../src/core/replay-flow";
import {
  createReplayFlowRuntime,
  installReplayFlowRuntime,
  type ReplayFlowRuntime
} from "../../src/bootstrap/replay-flow-runtime";

describe("bootstrap replay-flow runtime", () => {
  it("creates the legacy CoreReplayFlowRuntime shape from TypeScript functions", () => {
    const runtime = createReplayFlowRuntime();

    expect(runtime.computeReplayEndState()).toEqual(computeReplayEndState());
    expect(
      runtime.planReplaySeekRewind({
        targetIndex: 2,
        replayIndex: 7,
        hasReplayStartBoard: true
      })
    ).toEqual(
      planReplaySeekRewind({
        targetIndex: 2,
        replayIndex: 7,
        hasReplayStartBoard: true
      })
    );
    expect(
      runtime.planReplaySeekRestart({
        shouldRewind: true,
        strategy: "seed",
        replayIndexAfterRewind: 0
      })
    ).toEqual(
      planReplaySeekRestart({
        shouldRewind: true,
        strategy: "seed",
        replayIndexAfterRewind: 0
      })
    );
  });

  it("preserves legacy fallback behavior for missing inputs", () => {
    const runtime = createReplayFlowRuntime();

    expect(runtime.planReplaySeekRewind(undefined)).toEqual({
      shouldRewind: false,
      strategy: "none",
      replayIndexAfterRewind: undefined
    });
    expect(runtime.planReplaySeekRestart(undefined)).toEqual({
      shouldRestartWithBoard: false,
      shouldRestartWithSeed: false,
      shouldApplyReplayIndex: false,
      replayIndex: undefined
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayFlowRuntime?: ReplayFlowRuntime } = {};

    const installed = installReplayFlowRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayFlowRuntime);
    expect(installed?.computeReplayEndState).toBeTypeOf("function");
    expect(installed?.planReplaySeekRestart).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayFlowRuntime();
    const windowLike = { CoreReplayFlowRuntime: existing };

    const installed = installReplayFlowRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayFlowRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayFlowRuntime({ windowLike: null })).toBeNull();
  });
});

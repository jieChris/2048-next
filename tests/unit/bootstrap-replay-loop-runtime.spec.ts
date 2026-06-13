import { describe, expect, it } from "vitest";

import { planReplayStepExecution } from "../../src/core/replay-loop";
import {
  createReplayLoopRuntime,
  installReplayLoopRuntime,
  type ReplayLoopRuntime
} from "../../src/bootstrap/replay-loop-runtime";

describe("bootstrap replay-loop runtime", () => {
  it("creates the legacy CoreReplayLoopRuntime shape from TypeScript functions", () => {
    const runtime = createReplayLoopRuntime();
    const spawn = { x: 1, y: 2, value: 4 };

    expect(
      runtime.planReplayStepExecution({
        replayMoves: [2],
        replaySpawns: [spawn],
        replayIndex: 0
      })
    ).toEqual(
      planReplayStepExecution({
        replayMoves: [2],
        replaySpawns: [spawn],
        replayIndex: 0
      })
    );
  });

  it("preserves legacy fallback behavior for missing inputs", () => {
    const runtime = createReplayLoopRuntime();

    expect(runtime.planReplayStepExecution(undefined)).toEqual({
      action: undefined,
      shouldInjectForcedSpawn: false,
      forcedSpawn: undefined,
      nextReplayIndex: Number.NaN
    });
  });

  it("preserves legacy fallback behavior for non-array move and spawn streams", () => {
    const runtime = createReplayLoopRuntime();

    expect(
      runtime.planReplayStepExecution({
        replayMoves: "bad",
        replaySpawns: "bad",
        replayIndex: 3
      })
    ).toEqual({
      action: undefined,
      shouldInjectForcedSpawn: false,
      forcedSpawn: undefined,
      nextReplayIndex: 4
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayLoopRuntime?: ReplayLoopRuntime } = {};

    const installed = installReplayLoopRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayLoopRuntime);
    expect(installed?.planReplayStepExecution).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayLoopRuntime();
    const windowLike = { CoreReplayLoopRuntime: existing };

    const installed = installReplayLoopRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayLoopRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayLoopRuntime({ windowLike: null })).toBeNull();
  });
});

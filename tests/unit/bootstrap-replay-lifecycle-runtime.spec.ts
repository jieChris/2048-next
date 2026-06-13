import { describe, expect, it } from "vitest";

import {
  normalizeReplaySeekTarget,
  planReplayStep
} from "../../src/core/replay-lifecycle";
import {
  createReplayLifecycleRuntime,
  installReplayLifecycleRuntime,
  type ReplayLifecycleRuntime
} from "../../src/bootstrap/replay-lifecycle-runtime";

describe("bootstrap replay-lifecycle runtime", () => {
  it("creates the legacy CoreReplayLifecycleRuntime shape from TypeScript functions", () => {
    const runtime = createReplayLifecycleRuntime();
    const spawn = { x: 1, y: 2, value: 4 };

    expect(
      runtime.normalizeReplaySeekTarget({
        targetIndex: 99,
        hasReplayMoves: true,
        replayMovesLength: 12
      })
    ).toBe(
      normalizeReplaySeekTarget({
        targetIndex: 99,
        hasReplayMoves: true,
        replayMovesLength: 12
      })
    );
    expect(
      runtime.planReplayStep({
        action: 3,
        hasReplaySpawns: true,
        spawnAtIndex: spawn
      })
    ).toEqual(
      planReplayStep({
        action: 3,
        hasReplaySpawns: true,
        spawnAtIndex: spawn
      })
    );
  });

  it("preserves legacy seek target fallback and floor behavior", () => {
    const runtime = createReplayLifecycleRuntime();

    expect(
      runtime.normalizeReplaySeekTarget({
        targetIndex: "bad",
        replayIndex: "4.9",
        hasReplayMoves: true,
        replayMovesLength: 10
      })
    ).toBe(4);
    expect(runtime.normalizeReplaySeekTarget(undefined)).toBe(0);
  });

  it("preserves legacy step fallback behavior for missing inputs", () => {
    const runtime = createReplayLifecycleRuntime();

    expect(runtime.planReplayStep(undefined)).toEqual({
      shouldInjectForcedSpawn: false,
      forcedSpawn: undefined
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayLifecycleRuntime?: ReplayLifecycleRuntime } = {};

    const installed = installReplayLifecycleRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayLifecycleRuntime);
    expect(installed?.normalizeReplaySeekTarget).toBeTypeOf("function");
    expect(installed?.planReplayStep).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayLifecycleRuntime();
    const windowLike = { CoreReplayLifecycleRuntime: existing };

    const installed = installReplayLifecycleRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayLifecycleRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayLifecycleRuntime({ windowLike: null })).toBeNull();
  });
});

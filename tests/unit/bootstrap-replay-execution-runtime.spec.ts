import { describe, expect, it } from "vitest";

import {
  computeReplayStepStats,
  getReplayActionKind,
  resolveIpsDisplayText,
  resolveIpsInputCount,
  resolveNextIpsInputCount,
  resolveReplayExecution
} from "../../src/core/replay-execution";
import {
  createReplayExecutionRuntime,
  installReplayExecutionRuntime,
  type ReplayExecutionRuntime
} from "../../src/bootstrap/replay-execution-runtime";

describe("bootstrap replay-execution runtime", () => {
  it("creates the legacy CoreReplayExecutionRuntime shape from TypeScript functions", () => {
    const runtime = createReplayExecutionRuntime();
    const statsInput = { actions: [0, -1, ["p", 1, 2, 4], 3], limit: 4 };
    const ipsInput = {
      replayMode: false,
      ipsInputCount: 2,
      ipsInputTimes: [100, 500, 1500],
      nowMs: 1500
    };

    expect(runtime.getReplayActionKind(["p", 1, 2, 4])).toBe(getReplayActionKind(["p", 1, 2, 4]));
    expect(runtime.computeReplayStepStats(statsInput)).toEqual(computeReplayStepStats(statsInput));
    expect(runtime.resolveIpsInputCount(ipsInput)).toBe(resolveIpsInputCount(ipsInput));
    expect(runtime.resolveNextIpsInputCount(ipsInput)).toEqual(resolveNextIpsInputCount(ipsInput));
    expect(runtime.resolveIpsDisplayText({ ipsInputCount: 3, durationMs: 1000 })).toEqual(
      resolveIpsDisplayText({ ipsInputCount: 3, durationMs: 1000 })
    );
    expect(runtime.resolveReplayExecution(["p", 1, 2, 4])).toEqual(
      resolveReplayExecution(["p", 1, 2, 4])
    );
  });

  it("preserves legacy fallback behavior for missing object inputs", () => {
    const runtime = createReplayExecutionRuntime();

    expect(runtime.computeReplayStepStats(undefined)).toEqual({
      totalSteps: 0,
      moveSteps: 0,
      undoSteps: 0
    });
    expect(runtime.resolveIpsInputCount(undefined)).toBe(0);
    expect(runtime.resolveNextIpsInputCount(undefined)).toEqual({
      shouldRecord: true,
      nextIpsInputCount: 1,
      nextIpsInputTimes: []
    });
    expect(runtime.resolveIpsDisplayText(undefined)).toEqual({
      avgIpsText: "0",
      ipsText: "IPS: 0"
    });
  });

  it("preserves legacy unknown replay action throw behavior", () => {
    const runtime = createReplayExecutionRuntime();

    expect(() => runtime.resolveReplayExecution(undefined)).toThrow("Unknown replay action");
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayExecutionRuntime?: ReplayExecutionRuntime } = {};

    const installed = installReplayExecutionRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayExecutionRuntime);
    expect(installed?.getReplayActionKind).toBeTypeOf("function");
    expect(installed?.computeReplayStepStats).toBeTypeOf("function");
    expect(installed?.resolveIpsInputCount).toBeTypeOf("function");
    expect(installed?.resolveNextIpsInputCount).toBeTypeOf("function");
    expect(installed?.resolveIpsDisplayText).toBeTypeOf("function");
    expect(installed?.resolveReplayExecution).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayExecutionRuntime();
    const windowLike = { CoreReplayExecutionRuntime: existing };

    const installed = installReplayExecutionRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayExecutionRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayExecutionRuntime({ windowLike: null })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  resolveInvalidatedSecondaryTimerElementIds,
  resolveInvalidatedTimerElementIds,
  resolveMoveInputThrottleMs,
  resolveTimerUpdateIntervalMs
} from "../../src/core/timer-interval";
import {
  createTimerIntervalRuntime,
  installTimerIntervalRuntime,
  type TimerIntervalRuntime
} from "../../src/bootstrap/timer-interval-runtime";

describe("bootstrap timer interval runtime", () => {
  it("creates the legacy CoreTimerIntervalRuntime shape from TypeScript functions", () => {
    const runtime = createTimerIntervalRuntime();

    expect(runtime.resolveTimerUpdateIntervalMs).toBe(resolveTimerUpdateIntervalMs);
    expect(runtime.resolveMoveInputThrottleMs).toBe(resolveMoveInputThrottleMs);
    expect(runtime.resolveInvalidatedTimerElementIds).toBe(resolveInvalidatedTimerElementIds);
    expect(runtime.resolveInvalidatedSecondaryTimerElementIds).toBe(
      resolveInvalidatedSecondaryTimerElementIds
    );
    expect(runtime.resolveTimerUpdateIntervalMs(4, 4)).toBe(10);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreTimerIntervalRuntime?: TimerIntervalRuntime } = {};

    const installed = installTimerIntervalRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreTimerIntervalRuntime);
    expect(installed?.resolveMoveInputThrottleMs(false, 8, 8)).toBe(45);
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createTimerIntervalRuntime();
    const windowLike = { CoreTimerIntervalRuntime: existing };

    const installed = installTimerIntervalRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreTimerIntervalRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installTimerIntervalRuntime({ windowLike: null })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { planReplayDispatch } from "../../src/core/replay-dispatch";
import {
  createReplayDispatchRuntime,
  installReplayDispatchRuntime,
  type ReplayDispatchRuntime
} from "../../src/bootstrap/replay-dispatch-runtime";

describe("bootstrap replay-dispatch runtime", () => {
  it("creates the legacy CoreReplayDispatchRuntime shape from TypeScript functions", () => {
    const runtime = createReplayDispatchRuntime();

    expect(runtime.planReplayDispatch({ kind: "m", dir: 2 })).toEqual(
      planReplayDispatch({ kind: "m", dir: 2 })
    );
    expect(runtime.planReplayDispatch({ kind: "u" })).toEqual(planReplayDispatch({ kind: "u" }));
    expect(runtime.planReplayDispatch({ kind: "p", x: 1, y: 2, value: 16 })).toEqual(
      planReplayDispatch({ kind: "p", x: 1, y: 2, value: 16 })
    );
  });

  it("preserves legacy unknown action behavior for missing inputs", () => {
    const runtime = createReplayDispatchRuntime();

    expect(() => runtime.planReplayDispatch(undefined)).toThrow("Unknown replay action");
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayDispatchRuntime?: ReplayDispatchRuntime } = {};

    const installed = installReplayDispatchRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayDispatchRuntime);
    expect(installed?.planReplayDispatch).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayDispatchRuntime();
    const windowLike = { CoreReplayDispatchRuntime: existing };

    const installed = installReplayDispatchRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayDispatchRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayDispatchRuntime({ windowLike: null })).toBeNull();
  });
});

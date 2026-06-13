import { describe, expect, it } from "vitest";

import { encodeReplay128 } from "../../src/core/replay-codec";
import { decodeReplayV4Actions } from "../../src/core/replay-v4-actions";
import {
  createReplayV4ActionsRuntime,
  installReplayV4ActionsRuntime,
  type ReplayV4ActionsRuntime
} from "../../src/bootstrap/replay-v4-actions-runtime";

describe("bootstrap replay-v4-actions runtime", () => {
  it("creates the legacy CoreReplayV4ActionsRuntime shape from TypeScript functions", () => {
    const runtime = createReplayV4ActionsRuntime();
    const actions =
      encodeReplay128((2 << 5) | (1 << 4) | 6) +
      encodeReplay128(127) +
      encodeReplay128(1) +
      encodeReplay128(127) +
      encodeReplay128(2) +
      encodeReplay128(9) +
      encodeReplay128(5);

    expect(runtime.decodeReplayV4Actions(actions)).toEqual(decodeReplayV4Actions(actions));
  });

  it("preserves malformed escape throw behavior", () => {
    const runtime = createReplayV4ActionsRuntime();

    expect(() => runtime.decodeReplayV4Actions(encodeReplay128(127))).toThrow("Invalid v4C escape");
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayV4ActionsRuntime?: ReplayV4ActionsRuntime } = {};

    const installed = installReplayV4ActionsRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayV4ActionsRuntime);
    expect(installed?.decodeReplayV4Actions).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayV4ActionsRuntime();
    const windowLike = { CoreReplayV4ActionsRuntime: existing };

    const installed = installReplayV4ActionsRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayV4ActionsRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayV4ActionsRuntime({ windowLike: null })).toBeNull();
  });
});

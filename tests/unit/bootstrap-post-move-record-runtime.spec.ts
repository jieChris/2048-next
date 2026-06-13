import { describe, expect, it } from "vitest";

import { computePostMoveRecord } from "../../src/core/post-move-record";
import {
  createPostMoveRecordRuntime,
  installPostMoveRecordRuntime,
  type PostMoveRecordRuntime
} from "../../src/bootstrap/post-move-record-runtime";

describe("bootstrap post-move-record runtime", () => {
  it("creates the legacy CorePostMoveRecordRuntime shape from TypeScript functions", () => {
    const runtime = createPostMoveRecordRuntime();

    expect(runtime.computePostMoveRecord).toBe(computePostMoveRecord);
    expect(
      runtime.computePostMoveRecord({
        replayMode: false,
        direction: 2,
        lastSpawn: { x: 1, y: 2, value: 4 },
        width: 4,
        height: 4,
        isFibonacciMode: false,
        hasSessionReplayV3: true
      })
    ).toMatchObject({
      shouldRecordMoveHistory: true,
      compactMoveCode: (2 << 5) | (1 << 4) | (1 + 2 * 4),
      sessionAction: ["m", 2],
      shouldResetLastSpawn: true
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CorePostMoveRecordRuntime?: PostMoveRecordRuntime } = {};

    const installed = installPostMoveRecordRuntime({ windowLike });

    expect(installed).toBe(windowLike.CorePostMoveRecordRuntime);
    expect(installed?.computePostMoveRecord).toBe(computePostMoveRecord);
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createPostMoveRecordRuntime();
    const windowLike = { CorePostMoveRecordRuntime: existing };

    const installed = installPostMoveRecordRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CorePostMoveRecordRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installPostMoveRecordRuntime({ windowLike: null })).toBeNull();
  });
});

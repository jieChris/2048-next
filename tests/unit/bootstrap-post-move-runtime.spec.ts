import { describe, expect, it } from "vitest";

import { computePostMoveLifecycle } from "../../src/core/post-move";
import {
  createPostMoveRuntime,
  installPostMoveRuntime,
  type PostMoveRuntime
} from "../../src/bootstrap/post-move-runtime";

describe("bootstrap post-move runtime", () => {
  it("creates the legacy CorePostMoveRuntime shape from TypeScript functions", () => {
    const runtime = createPostMoveRuntime();

    expect(runtime.computePostMoveLifecycle).toBe(computePostMoveLifecycle);
    expect(
      runtime.computePostMoveLifecycle({
        successfulMoveCount: 2,
        hasMovesAvailable: true,
        timerStatus: 0
      })
    ).toEqual({
      successfulMoveCount: 3,
      over: false,
      shouldEndTime: false,
      shouldStartTimer: true
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CorePostMoveRuntime?: PostMoveRuntime } = {};

    const installed = installPostMoveRuntime({ windowLike });

    expect(installed).toBe(windowLike.CorePostMoveRuntime);
    expect(installed?.computePostMoveLifecycle).toBe(computePostMoveLifecycle);
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createPostMoveRuntime();
    const windowLike = { CorePostMoveRuntime: existing };

    const installed = installPostMoveRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CorePostMoveRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installPostMoveRuntime({ windowLike: null })).toBeNull();
  });
});

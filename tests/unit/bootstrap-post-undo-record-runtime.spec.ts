import { describe, expect, it } from "vitest";

import { computePostUndoRecord } from "../../src/core/post-undo-record";
import {
  createPostUndoRecordRuntime,
  installPostUndoRecordRuntime,
  type PostUndoRecordRuntime
} from "../../src/bootstrap/post-undo-record-runtime";

describe("bootstrap post-undo-record runtime", () => {
  it("creates the legacy CorePostUndoRecordRuntime shape from TypeScript functions", () => {
    const runtime = createPostUndoRecordRuntime();
    const input = {
      replayMode: false,
      direction: -1,
      hasSessionReplayV3: true
    };

    expect(runtime.computePostUndoRecord(input)).toEqual(computePostUndoRecord(input));
  });

  it("preserves replay-mode no-op behavior", () => {
    const runtime = createPostUndoRecordRuntime();
    const input = {
      replayMode: true,
      direction: -1,
      hasSessionReplayV3: true
    };

    expect(runtime.computePostUndoRecord(input)).toEqual({
      shouldRecordMoveHistory: false,
      shouldAppendCompactUndo: false,
      shouldPushSessionAction: false,
      sessionAction: null
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CorePostUndoRecordRuntime?: PostUndoRecordRuntime } = {};

    const installed = installPostUndoRecordRuntime({ windowLike });

    expect(installed).toBe(windowLike.CorePostUndoRecordRuntime);
    expect(installed?.computePostUndoRecord).toBe(computePostUndoRecord);
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createPostUndoRecordRuntime();
    const windowLike = { CorePostUndoRecordRuntime: existing };

    const installed = installPostUndoRecordRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CorePostUndoRecordRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installPostUndoRecordRuntime({ windowLike: null })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { computePostUndoRecord } from "../../src/core/post-undo-record";

describe("core post undo record: computePostUndoRecord", () => {
  it("returns no-op in replay mode", () => {
    const result = computePostUndoRecord({
      replayMode: true,
      direction: -1,
      hasSessionReplayV3: true
    });
    expect(result).toEqual({
      shouldRecordMoveHistory: false,
      shouldAppendCompactUndo: false,
      shouldPushSessionAction: false,
      sessionAction: null
    });
  });

  it("records undo history and compact marker in normal mode", () => {
    const result = computePostUndoRecord({
      replayMode: false,
      direction: -1,
      hasSessionReplayV3: false
    });
    expect(result).toEqual({
      shouldRecordMoveHistory: true,
      shouldAppendCompactUndo: true,
      shouldPushSessionAction: false,
      sessionAction: null
    });
  });

  it("adds undo session action when session replay is enabled", () => {
    const result = computePostUndoRecord({
      replayMode: false,
      direction: -1,
      hasSessionReplayV3: true
    });
    expect(result.shouldPushSessionAction).toBe(true);
    expect(result.sessionAction).toEqual(["u"]);
  });
});

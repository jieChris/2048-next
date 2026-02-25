(function (global) {
  "use strict";

  if (!global) return;

  function computePostUndoRecord(input) {
    var opts = input || {};
    if (opts.replayMode) {
      return {
        shouldRecordMoveHistory: false,
        shouldAppendCompactUndo: false,
        shouldPushSessionAction: false,
        sessionAction: null
      };
    }

    var shouldPushSessionAction = !!opts.hasSessionReplayV3;
    return {
      shouldRecordMoveHistory: true,
      shouldAppendCompactUndo: true,
      shouldPushSessionAction: shouldPushSessionAction,
      sessionAction: shouldPushSessionAction ? ["u"] : null
    };
  }

  global.CorePostUndoRecordRuntime = global.CorePostUndoRecordRuntime || {};
  global.CorePostUndoRecordRuntime.computePostUndoRecord = computePostUndoRecord;
})(typeof window !== "undefined" ? window : undefined);

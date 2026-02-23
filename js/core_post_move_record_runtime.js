(function (global) {
  "use strict";

  if (!global) return;

  function computePostMoveRecord(input) {
    var opts = input || {};
    if (opts.replayMode) {
      return {
        shouldRecordMoveHistory: false,
        compactMoveCode: null,
        shouldPushSessionAction: false,
        sessionAction: null,
        shouldResetLastSpawn: false
      };
    }

    var compactMoveCode = null;
    var spawn = opts.lastSpawn;
    if (
      spawn &&
      Number.isInteger(opts.width) &&
      Number.isInteger(opts.height) &&
      Number(opts.width) === 4 &&
      Number(opts.height) === 4 &&
      !opts.isFibonacciMode &&
      (spawn.value === 2 || spawn.value === 4) &&
      Number.isInteger(spawn.x) &&
      Number.isInteger(spawn.y)
    ) {
      var valBit = spawn.value === 4 ? 1 : 0;
      var posIdx = spawn.x + spawn.y * 4;
      compactMoveCode = (Number(opts.direction) << 5) | (valBit << 4) | posIdx;
    }

    var shouldPushSessionAction = !!opts.hasSessionReplayV3;
    return {
      shouldRecordMoveHistory: true,
      compactMoveCode: compactMoveCode,
      shouldPushSessionAction: shouldPushSessionAction,
      sessionAction: shouldPushSessionAction ? ["m", Number(opts.direction)] : null,
      shouldResetLastSpawn: true
    };
  }

  global.CorePostMoveRecordRuntime = global.CorePostMoveRecordRuntime || {};
  global.CorePostMoveRecordRuntime.computePostMoveRecord = computePostMoveRecord;
})(typeof window !== "undefined" ? window : undefined);

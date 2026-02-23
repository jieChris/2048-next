(function (global) {
  "use strict";

  if (!global) return;

  function computePostMoveLifecycle(input) {
    var opts = input || {};
    var currentCount = Number.isInteger(opts.successfulMoveCount) && opts.successfulMoveCount >= 0
      ? Number(opts.successfulMoveCount)
      : 0;
    var successfulMoveCount = currentCount + 1;
    var hasMovesAvailable = !!opts.hasMovesAvailable;
    var over = !hasMovesAvailable;
    var timerStatus = Number(opts.timerStatus);

    return {
      successfulMoveCount: successfulMoveCount,
      over: over,
      shouldEndTime: over,
      shouldStartTimer: timerStatus === 0 && !over
    };
  }

  global.CorePostMoveRuntime = global.CorePostMoveRuntime || {};
  global.CorePostMoveRuntime.computePostMoveLifecycle = computePostMoveLifecycle;
})(typeof window !== "undefined" ? window : undefined);

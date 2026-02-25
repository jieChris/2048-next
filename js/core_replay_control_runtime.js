(function (global) {
  "use strict";

  if (!global) return;

  function planReplayTickBoundary(input) {
    var opts = input || {};
    var replayEndState = opts.replayEndState || {};
    if (!opts.shouldStopAtTick) {
      return {
        shouldStop: false,
        shouldPause: false,
        shouldApplyReplayMode: false,
        replayMode: true
      };
    }

    return {
      shouldStop: true,
      shouldPause: replayEndState.shouldPause !== false,
      shouldApplyReplayMode: true,
      replayMode: replayEndState.replayMode === true
    };
  }

  global.CoreReplayControlRuntime = global.CoreReplayControlRuntime || {};
  global.CoreReplayControlRuntime.planReplayTickBoundary = planReplayTickBoundary;
})(typeof window !== "undefined" ? window : undefined);

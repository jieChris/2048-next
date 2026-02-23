(function (global) {
  "use strict";

  if (!global) return;

  function computeReplayEndState() {
    return {
      shouldPause: true,
      replayMode: false
    };
  }

  function planReplaySeekRewind(input) {
    var opts = input || {};
    var shouldRewind = opts.targetIndex < opts.replayIndex;
    if (!shouldRewind) {
      return {
        shouldRewind: false,
        strategy: "none",
        replayIndexAfterRewind: opts.replayIndex
      };
    }
    return {
      shouldRewind: true,
      strategy: opts.hasReplayStartBoard ? "board" : "seed",
      replayIndexAfterRewind: 0
    };
  }

  global.CoreReplayFlowRuntime = global.CoreReplayFlowRuntime || {};
  global.CoreReplayFlowRuntime.computeReplayEndState = computeReplayEndState;
  global.CoreReplayFlowRuntime.planReplaySeekRewind = planReplaySeekRewind;
})(typeof window !== "undefined" ? window : undefined);

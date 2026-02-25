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

  function planReplaySeekRestart(input) {
    var opts = input || {};
    if (!opts.shouldRewind) {
      return {
        shouldRestartWithBoard: false,
        shouldRestartWithSeed: false,
        shouldApplyReplayIndex: false,
        replayIndex: opts.replayIndexAfterRewind
      };
    }
    return {
      shouldRestartWithBoard: opts.strategy === "board",
      shouldRestartWithSeed: opts.strategy === "seed",
      shouldApplyReplayIndex: true,
      replayIndex: opts.replayIndexAfterRewind
    };
  }

  global.CoreReplayFlowRuntime = global.CoreReplayFlowRuntime || {};
  global.CoreReplayFlowRuntime.computeReplayEndState = computeReplayEndState;
  global.CoreReplayFlowRuntime.planReplaySeekRewind = planReplaySeekRewind;
  global.CoreReplayFlowRuntime.planReplaySeekRestart = planReplaySeekRestart;
})(typeof window !== "undefined" ? window : undefined);

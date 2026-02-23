(function (global) {
  "use strict";

  if (!global) return;

  function computeReplayPauseState() {
    return {
      isPaused: true,
      shouldClearInterval: true
    };
  }

  function computeReplayResumeState(input) {
    var opts = input || {};
    return {
      isPaused: false,
      shouldClearInterval: true,
      delay: opts.replayDelay || 200
    };
  }

  function computeReplaySpeedState(input) {
    var opts = input || {};
    var baseDelay = typeof opts.baseDelay === "number" ? opts.baseDelay : 200;
    return {
      replayDelay: baseDelay / opts.multiplier,
      shouldResume: !opts.isPaused
    };
  }

  function shouldStopReplayAtTick(input) {
    var opts = input || {};
    return opts.replayIndex >= opts.replayMovesLength;
  }

  global.CoreReplayTimerRuntime = global.CoreReplayTimerRuntime || {};
  global.CoreReplayTimerRuntime.computeReplayPauseState = computeReplayPauseState;
  global.CoreReplayTimerRuntime.computeReplayResumeState = computeReplayResumeState;
  global.CoreReplayTimerRuntime.computeReplaySpeedState = computeReplaySpeedState;
  global.CoreReplayTimerRuntime.shouldStopReplayAtTick = shouldStopReplayAtTick;
})(typeof window !== "undefined" ? window : undefined);

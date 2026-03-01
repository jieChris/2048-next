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

  function resolveDurationMs(input) {
    var opts = input || {};
    var nowRaw = Number(opts.nowMs);
    var nowMs = Number.isFinite(nowRaw) ? nowRaw : Date.now();
    var ms = 0;
    if (opts.timerStatus === 1 && Number.isFinite(Number(opts.startTimeMs))) {
      ms = nowMs - Number(opts.startTimeMs);
    } else {
      ms = Number(opts.accumulatedTime) || 0;
    }
    if (!Number.isFinite(ms) || ms < 0) {
      var startedRaw = Number(opts.sessionStartedAt);
      var startedAt = Number.isFinite(startedRaw) && startedRaw > 0 ? startedRaw : nowMs;
      ms = nowMs - startedAt;
    }
    ms = Math.floor(ms);
    return ms < 0 ? 0 : ms;
  }

  global.CoreReplayTimerRuntime = global.CoreReplayTimerRuntime || {};
  global.CoreReplayTimerRuntime.computeReplayPauseState = computeReplayPauseState;
  global.CoreReplayTimerRuntime.computeReplayResumeState = computeReplayResumeState;
  global.CoreReplayTimerRuntime.computeReplaySpeedState = computeReplaySpeedState;
  global.CoreReplayTimerRuntime.shouldStopReplayAtTick = shouldStopReplayAtTick;
  global.CoreReplayTimerRuntime.resolveDurationMs = resolveDurationMs;
})(typeof window !== "undefined" ? window : undefined);

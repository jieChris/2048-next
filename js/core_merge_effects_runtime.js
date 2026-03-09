(function (global) {
  "use strict";

  if (!global) return;

  function computeMergeEffects(input) {
    var opts = input || {};
    var value = Number(opts.mergedValue);
    var cappedMode = !!opts.isCappedMode;
    var cappedTarget = Number(opts.cappedTargetValue);
    var hasCappedTarget = Number.isFinite(cappedTarget) && cappedTarget > 0;
    var reached32k = !!opts.reached32k;

    var result = {
      shouldRecordCappedMilestone: false,
      shouldSetWon: false,
      shouldSetReached32k: false,
      timerIdsToStamp: [],
      showSubTimerContainer: false,
      hideTimerRows: []
    };

    if (!Number.isInteger(value) || value <= 0) return result;

    if (cappedMode && hasCappedTarget && value === cappedTarget) {
      result.shouldRecordCappedMilestone = true;
    } else if (!cappedMode && value === 2048) {
      result.shouldSetWon = true;
    }

    if (value === 8192) {
      result.timerIdsToStamp.push("timer8192");
    }
    if (value === 16384) {
      result.timerIdsToStamp.push("timer16384");
    }
    if (value === 32768) {
      result.shouldSetReached32k = true;
      result.timerIdsToStamp.push("timer32768");
    }

    return result;
  }

  global.CoreMergeEffectsRuntime = global.CoreMergeEffectsRuntime || {};
  global.CoreMergeEffectsRuntime.computeMergeEffects = computeMergeEffects;
})(typeof window !== "undefined" ? window : undefined);

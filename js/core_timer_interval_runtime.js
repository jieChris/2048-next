(function (global) {
  "use strict";

  if (!global) return;

  function normalizeGridSize(value) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 4;
    return Math.floor(numeric);
  }

  function resolveTimerUpdateIntervalMs(width, height) {
    var w = normalizeGridSize(width);
    var h = normalizeGridSize(height);
    var area = w * h;
    if (area >= 100) return 50;
    if (area >= 64) return 33;
    return 10;
  }

  function resolveMoveInputThrottleMs(replayMode, width, height) {
    if (replayMode) return 0;
    var w = normalizeGridSize(width);
    var h = normalizeGridSize(height);
    var area = w * h;
    if (area >= 100) return 65;
    if (area >= 64) return 45;
    return 0;
  }

  function resolveInvalidatedTimerElementIds(input) {
    var source = input || {};
    var milestones = Array.isArray(source.timerMilestones) ? source.timerMilestones : [];
    var timerSlotIds = Array.isArray(source.timerSlotIds) ? source.timerSlotIds : [];
    var limit = Number(source.limit);
    var out = [];

    for (var i = 0; i < timerSlotIds.length; i++) {
      var milestoneValue = Number(milestones[i]);
      var slotId = timerSlotIds[i];
      if (Number.isInteger(milestoneValue) && milestoneValue <= limit) {
        out.push("timer" + String(slotId));
      }
    }

    return out;
  }

  global.CoreTimerIntervalRuntime = global.CoreTimerIntervalRuntime || {};
  global.CoreTimerIntervalRuntime.resolveTimerUpdateIntervalMs = resolveTimerUpdateIntervalMs;
  global.CoreTimerIntervalRuntime.resolveMoveInputThrottleMs = resolveMoveInputThrottleMs;
  global.CoreTimerIntervalRuntime.resolveInvalidatedTimerElementIds = resolveInvalidatedTimerElementIds;
})(typeof window !== "undefined" ? window : undefined);

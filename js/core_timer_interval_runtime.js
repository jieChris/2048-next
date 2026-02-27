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

  global.CoreTimerIntervalRuntime = global.CoreTimerIntervalRuntime || {};
  global.CoreTimerIntervalRuntime.resolveTimerUpdateIntervalMs = resolveTimerUpdateIntervalMs;
})(typeof window !== "undefined" ? window : undefined);

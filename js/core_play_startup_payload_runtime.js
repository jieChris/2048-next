(function (global) {
  "use strict";

  if (!global) return;

  function resolvePlayStartupPayload(options) {
    var opts = options || {};
    var modeConfig = opts.modeConfig || null;
    if (!modeConfig) return null;

    var rawWidth = opts.defaultBoardWidth;
    var boardWidth = typeof rawWidth === "number" && isFinite(rawWidth) ? rawWidth : 4;

    return {
      modeKey: modeConfig.key,
      modeConfig: modeConfig,
      inputManagerCtor: opts.inputManagerCtor,
      defaultBoardWidth: boardWidth
    };
  }

  global.CorePlayStartupPayloadRuntime = global.CorePlayStartupPayloadRuntime || {};
  global.CorePlayStartupPayloadRuntime.resolvePlayStartupPayload = resolvePlayStartupPayload;
})(typeof window !== "undefined" ? window : undefined);

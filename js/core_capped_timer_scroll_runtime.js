(function (global) {
  "use strict";

  if (!global) return;

  function isTimerScrollModeKey(value) {
    if (typeof value !== "string") return false;
    var text = value.trim().toLowerCase();
    if (!text) return false;
    return text.indexOf("capped") !== -1 || text.indexOf("practice") !== -1;
  }

  function resolveTimerScrollModeFromContext(options) {
    var opts = options || {};
    var body = opts.bodyLike || null;
    var windowLike = opts.windowLike || null;

    var modeId = "";
    if (body && typeof body.getAttribute === "function") {
      try {
        var bodyValue = body.getAttribute("data-mode-id");
        modeId = typeof bodyValue === "string" ? bodyValue.trim() : "";
      } catch (_err) {
        modeId = "";
      }
    }

    var modeConfigKey = "";
    try {
      var configValue =
        windowLike &&
        windowLike.GAME_MODE_CONFIG &&
        typeof windowLike.GAME_MODE_CONFIG.key === "string"
          ? windowLike.GAME_MODE_CONFIG.key
          : "";
      modeConfigKey = typeof configValue === "string" ? configValue.trim() : "";
    } catch (_err) {
      modeConfigKey = "";
    }

    return {
      modeId: modeId,
      modeConfigKey: modeConfigKey,
      enabled: isTimerScrollModeKey(modeId) || isTimerScrollModeKey(modeConfigKey)
    };
  }

  global.CoreCappedTimerScrollRuntime = global.CoreCappedTimerScrollRuntime || {};
  global.CoreCappedTimerScrollRuntime.isTimerScrollModeKey = isTimerScrollModeKey;
  global.CoreCappedTimerScrollRuntime.resolveTimerScrollModeFromContext =
    resolveTimerScrollModeFromContext;
})(typeof window !== "undefined" ? window : undefined);

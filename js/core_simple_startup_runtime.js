(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_BOARD_WIDTH = 4;

  function resolveSimpleStartupPayload(options) {
    var opts = options || {};
    var payload = {
      modeKey: String(opts.modeKey || ""),
      fallbackModeKey: String(opts.fallbackModeKey || ""),
      inputManagerCtor: opts.inputManagerCtor,
      defaultBoardWidth: Number(opts.defaultBoardWidth || DEFAULT_BOARD_WIDTH)
    };

    if (opts.disableSessionSync) {
      payload.disableSessionSync = true;
    }

    return payload;
  }

  global.CoreSimpleStartupRuntime = global.CoreSimpleStartupRuntime || {};
  global.CoreSimpleStartupRuntime.resolveSimpleStartupPayload = resolveSimpleStartupPayload;
})(typeof window !== "undefined" ? window : undefined);

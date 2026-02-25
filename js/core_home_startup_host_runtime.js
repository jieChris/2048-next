(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_HOME_MODE_KEY = "standard_4x4_pow2_no_undo";
  var DEFAULT_BOARD_WIDTH = 4;

  function resolveHomeStartupFromContext(options) {
    var opts = options || {};
    var windowLike = opts.windowLike || null;
    var documentLike = opts.documentLike || null;
    var defaultModeKey = String(opts.defaultModeKey || DEFAULT_HOME_MODE_KEY);
    var defaultBoardWidth = Number(opts.defaultBoardWidth || DEFAULT_BOARD_WIDTH);

    var selection =
      opts.resolveHomeModeSelectionFromContext({
        bodyLike: documentLike ? documentLike.body || null : null,
        locationLike: windowLike ? windowLike.location : null,
        defaultModeKey: defaultModeKey,
        modeCatalog: windowLike ? windowLike.ModeCatalog : undefined
      }) || {};

    var modeKey = String(selection.modeKey || defaultModeKey);
    var modeConfig = Object.prototype.hasOwnProperty.call(selection, "modeConfig")
      ? selection.modeConfig
      : null;

    if (windowLike) {
      windowLike.GAME_MODE_CONFIG = modeConfig;
    }

    return {
      modeKey: modeKey,
      modeConfig: modeConfig,
      inputManagerCtor: opts.inputManagerCtor,
      defaultBoardWidth: defaultBoardWidth
    };
  }

  global.CoreHomeStartupHostRuntime = global.CoreHomeStartupHostRuntime || {};
  global.CoreHomeStartupHostRuntime.resolveHomeStartupFromContext = resolveHomeStartupFromContext;
})(typeof window !== "undefined" ? window : undefined);

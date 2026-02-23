(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";
  var DEFAULT_BOARD_SIZE = 4;

  function toPositiveInt(raw, fallback) {
    var num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Math.floor(num);
  }

  function resolveModeConfig(modeKey, fallbackModeKey) {
    var catalog = global.ModeCatalog;
    var key = modeKey || fallbackModeKey || DEFAULT_MODE_KEY;
    var fallbackKey = fallbackModeKey || DEFAULT_MODE_KEY;
    if (!catalog || typeof catalog.getMode !== "function") {
      return global.GAME_MODE_CONFIG || null;
    }
    return catalog.getMode(key) || catalog.getMode(fallbackKey) || null;
  }

  function attachLegacyBridge(manager, modeKey, modeConfig) {
    var bridgeApi = global.LegacyBridge;
    if (bridgeApi && typeof bridgeApi.attachLegacyEngineToWindow === "function") {
      return bridgeApi.attachLegacyEngineToWindow(manager, modeKey, modeConfig);
    }
    var payload = {
      manager: manager || null,
      modeKey: modeKey || "",
      modeConfig: modeConfig || null
    };
    global.__legacyEngine = payload;
    return payload;
  }

  function startGame(options) {
    var opts = options || {};
    var modeConfig = opts.modeConfig || resolveModeConfig(opts.modeKey, opts.fallbackModeKey);
    if (modeConfig) global.GAME_MODE_CONFIG = modeConfig;

    var GameManagerCtor = opts.gameManagerCtor || global.GameManager;
    var InputManagerCtor = opts.inputManagerCtor;
    var ActuatorCtor = opts.actuatorCtor || global.HTMLActuator;
    var ScoreManagerCtor = opts.scoreManagerCtor || global.LocalScoreManager;
    if (
      typeof GameManagerCtor !== "function" ||
      typeof InputManagerCtor !== "function" ||
      typeof ActuatorCtor !== "function" ||
      typeof ScoreManagerCtor !== "function"
    ) {
      throw new Error("LegacyBootstrapRuntime.startGame missing constructor dependency");
    }

    var boardWidth = toPositiveInt(
      typeof opts.boardWidth === "number"
        ? opts.boardWidth
        : global.GAME_MODE_CONFIG && global.GAME_MODE_CONFIG.board_width,
      toPositiveInt(opts.defaultBoardWidth, DEFAULT_BOARD_SIZE)
    );

    var manager = new GameManagerCtor(boardWidth, InputManagerCtor, ActuatorCtor, ScoreManagerCtor);
    if (opts.disableSessionSync === true) {
      manager.disableSessionSync = true;
    }

    global.game_manager = manager;
    attachLegacyBridge(
      opts.modeKey || (global.GAME_MODE_CONFIG && global.GAME_MODE_CONFIG.key) || "",
      global.GAME_MODE_CONFIG || null,
      manager
    );
    return manager;
  }

  global.LegacyBootstrapRuntime = global.LegacyBootstrapRuntime || {};
  global.LegacyBootstrapRuntime.resolveModeConfig = resolveModeConfig;
  global.LegacyBootstrapRuntime.attachLegacyBridge = attachLegacyBridge;
  global.LegacyBootstrapRuntime.startGame = startGame;
})(typeof window !== "undefined" ? window : undefined);

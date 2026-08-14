(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";
  var DEFAULT_BOARD_SIZE = 4;
  var DUPLICATE_MODE_MESSAGE_ZH = "\u975e\u6cd5\u64cd\u4f5c\uff1a\u4e00\u4e2a\u6a21\u5f0f\u53ea\u80fd\u5f00\u4e00\u4e2a\u9875\u9762";
  var DUPLICATE_MODE_MESSAGE_EN = "Illegal operation: each mode can only be open in one page.";

  function toPositiveInt(raw, fallback) {
    var num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Math.floor(num);
  }

  function resolveModeConfig(modeKey, fallbackModeKey) {
    var catalog = global.ModeCatalog;
    var key = modeKey || fallbackModeKey || DEFAULT_MODE_KEY;
    var fallbackKey = fallbackModeKey || DEFAULT_MODE_KEY;

    var modeCatalogRuntime = global.CoreModeCatalogRuntime;
    if (
      modeCatalogRuntime &&
      typeof modeCatalogRuntime.resolveCatalogModeWithDefault === "function"
    ) {
      var resolved = modeCatalogRuntime.resolveCatalogModeWithDefault(
        catalog,
        key,
        fallbackKey
      );
      if (resolved) return resolved;
    }

    if (!catalog || typeof catalog.getMode !== "function") {
      return global.GAME_MODE_CONFIG || null;
    }
    return catalog.getMode(key) || catalog.getMode(fallbackKey) || null;
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
      throw new Error("CoreBootstrapRuntime.startGame missing constructor dependency");
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
    if (
      global.OnlineLeaderboardRuntime &&
      typeof global.OnlineLeaderboardRuntime.notifyGameManagerReady === "function"
    ) {
      try {
        global.OnlineLeaderboardRuntime.notifyGameManagerReady(manager);
      } catch (_errOnlineReady) {}
    }
    if (
      global.AdminRescueClientRuntime &&
      typeof global.AdminRescueClientRuntime.scheduleCheck === "function"
    ) {
      try {
        global.AdminRescueClientRuntime.scheduleCheck(manager);
      } catch (_err) {}
    }
    return manager;
  }

  function scheduleNextFrame(callback) {
    if (typeof callback !== "function") return;
    if (typeof global.requestAnimationFrame === "function") {
      global.requestAnimationFrame(callback);
      return;
    }
    if (typeof global.setTimeout === "function") {
      global.setTimeout(callback, 0);
      return;
    }
    callback();
  }

  function resolveDuplicateModeMessage() {
    var language = "";
    try {
      var i18n = global.UII18N;
      if (i18n && typeof i18n.getLanguage === "function") {
        language = String(i18n.getLanguage() || "").toLowerCase();
      }
    } catch (_errI18n) {}
    if (!language) {
      try {
        var root = global.document.documentElement;
        language = String(
          root.getAttribute("data-ui-lang") || root.getAttribute("lang") || ""
        ).toLowerCase();
      } catch (_errDocument) {}
    }
    return language.indexOf("en") === 0 ? DUPLICATE_MODE_MESSAGE_EN : DUPLICATE_MODE_MESSAGE_ZH;
  }

  function handleDuplicateMode() {
    if (typeof global.alert === "function") global.alert(resolveDuplicateModeMessage());
    if (global.location) global.location.href = "modes.html";
  }

  function startGameAfterBrowserLock(options, onStarted) {
    var runtime = global.CoreSingleModePageLockRuntime;
    var acquire = runtime && runtime.acquireSingleModeBrowserLock;
    if (typeof acquire !== "function") {
      onStarted();
      return;
    }
    Promise.resolve(acquire(global, options && options.modeKey)).then(function (acquired) {
      if (!acquired) {
        handleDuplicateMode();
        return;
      }
      onStarted();
    }).catch(function () {
      onStarted();
    });
  }

  function startGameOnAnimationFrame(optionsOrFactory) {
    var result = null;
    scheduleNextFrame(function () {
      var options = typeof optionsOrFactory === "function"
        ? optionsOrFactory()
        : optionsOrFactory;
      if (options === null || options === undefined || options === false) {
        result = null;
        return;
      }
      startGameAfterBrowserLock(options, function () {
        result = startGame(options);
      });
    });
    return result;
  }

  global.CoreBootstrapRuntime = global.CoreBootstrapRuntime || {};
  global.CoreBootstrapRuntime.resolveModeConfig = resolveModeConfig;
  global.CoreBootstrapRuntime.startGame = startGame;
  global.CoreBootstrapRuntime.startGameOnAnimationFrame = startGameOnAnimationFrame;
})(typeof window !== "undefined" ? window : undefined);

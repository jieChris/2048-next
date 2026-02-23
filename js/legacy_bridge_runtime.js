(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_ENGINE_SIZE = 4;

  function normalizeRuleset(raw) {
    return raw === "fibonacci" ? "fibonacci" : "pow2";
  }

  function toPositiveInt(raw, fallback) {
    var num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Math.floor(num);
  }

  function buildEngineConfigFromLegacyMode(modeConfig) {
    var config = modeConfig || {};
    return {
      width: toPositiveInt(config.board_width, DEFAULT_ENGINE_SIZE),
      height: toPositiveInt(config.board_height, DEFAULT_ENGINE_SIZE),
      ruleset: normalizeRuleset(config.ruleset),
      undoEnabled: config.undo_enabled === true,
      maxTile: config.max_tile == null ? null : config.max_tile
    };
  }

  function createEngine(config) {
    var started = false;
    return {
      config: config,
      start: function () {
        started = true;
      },
      isStarted: function () {
        return started;
      }
    };
  }

  function createLegacyEngineBridge(config) {
    var engine = createEngine(config);
    return {
      engine: engine,
      start: function () {
        engine.start();
      },
      isStarted: function () {
        return engine.isStarted();
      }
    };
  }

  function createLegacyEngineBridgeFromMode(modeConfig) {
    return createLegacyEngineBridge(buildEngineConfigFromLegacyMode(modeConfig));
  }

  function attachLegacyEngineToWindow(manager, modeKey, modeConfig) {
    var bridge = createLegacyEngineBridgeFromMode(modeConfig);
    bridge.start();

    var payload = {
      manager: manager || null,
      modeKey: modeKey || "",
      modeConfig: modeConfig || null,
      engineConfig: bridge.engine.config,
      engine: bridge.engine,
      start: bridge.start,
      isStarted: bridge.isStarted
    };
    global.__legacyEngine = payload;
    return payload;
  }

  global.LegacyBridge = global.LegacyBridge || {};
  global.LegacyBridge.buildEngineConfigFromLegacyMode = buildEngineConfigFromLegacyMode;
  global.LegacyBridge.createLegacyEngineBridge = createLegacyEngineBridge;
  global.LegacyBridge.createLegacyEngineBridgeFromMode = createLegacyEngineBridgeFromMode;
  global.LegacyBridge.attachLegacyEngineToWindow = attachLegacyEngineToWindow;
})(typeof window !== "undefined" ? window : undefined);

(function (global) {
  "use strict";

  if (!global) return;

  function normalizeAdapterMode(raw) {
    if (raw === "core" || raw === "core-adapter") return "core-adapter";
    if (raw === "legacy" || raw === "legacy-bridge") return "legacy-bridge";
    return null;
  }

  function readAdapterModeFromQuery() {
    try {
      if (!global.location || typeof global.location.search !== "string") return null;
      var params = new URLSearchParams(global.location.search || "");
      return params.get("engine_adapter");
    } catch (_err) {
      return null;
    }
  }

  function readAdapterModeFromStorage() {
    try {
      if (!global.localStorage || typeof global.localStorage.getItem !== "function") return null;
      return global.localStorage.getItem("engine_adapter_mode");
    } catch (_err) {
      return null;
    }
  }

  function resolveAdapterMode(input) {
    var opts = input || {};
    var explicit = normalizeAdapterMode(opts.adapterMode);
    if (explicit) return explicit;

    var globalMode = normalizeAdapterMode(global.__engineAdapterMode);
    if (globalMode) return globalMode;

    var queryMode = normalizeAdapterMode(readAdapterModeFromQuery());
    if (queryMode) return queryMode;

    var storageMode = normalizeAdapterMode(readAdapterModeFromStorage());
    if (storageMode) return storageMode;

    return "legacy-bridge";
  }

  function attachLegacyBridgeWithAdapter(options) {
    var opts = options || {};
    var manager = opts.manager || null;
    var modeKey = opts.modeKey || "";
    var modeConfig = opts.modeConfig || null;
    var adapterMode = resolveAdapterMode(opts);
    var bridgeApi = opts.bridgeApi || global.LegacyBridge;

    var payload;
    if (bridgeApi && typeof bridgeApi.attachLegacyEngineToWindow === "function") {
      payload = bridgeApi.attachLegacyEngineToWindow(manager, modeKey, modeConfig);
    } else {
      payload = {
        manager: manager,
        modeKey: modeKey,
        modeConfig: modeConfig
      };
      global.__legacyEngine = payload;
    }

    if (payload && typeof payload === "object") {
      payload.adapterMode = adapterMode;
      var ioApi = global.LegacyAdapterIoRuntime;
      var snapshotModeKey = modeKey || "";
      if (ioApi && typeof ioApi.readAdapterSnapshot === "function") {
        payload.adapterSnapshot = ioApi.readAdapterSnapshot({
          storage: global.localStorage || null,
          modeKey: snapshotModeKey
        });
      } else {
        payload.adapterSnapshot = null;
      }
      payload.syncAdapterSnapshot = function (snapshot) {
        if (!ioApi || typeof ioApi.writeAdapterSnapshot !== "function") return false;
        return ioApi.writeAdapterSnapshot({
          storage: global.localStorage || null,
          modeKey: snapshotModeKey,
          snapshot: snapshot
        });
      };
      payload.emitMoveResult = function (detail) {
        if (!ioApi || typeof ioApi.emitAdapterMoveResult !== "function") return false;
        return ioApi.emitAdapterMoveResult({
          target: global,
          modeKey: snapshotModeKey,
          detail: detail || {}
        });
      };
    }
    return payload;
  }

  global.LegacyAdapterRuntime = global.LegacyAdapterRuntime || {};
  global.LegacyAdapterRuntime.resolveAdapterMode = resolveAdapterMode;
  global.LegacyAdapterRuntime.attachLegacyBridgeWithAdapter = attachLegacyBridgeWithAdapter;
})(typeof window !== "undefined" ? window : undefined);

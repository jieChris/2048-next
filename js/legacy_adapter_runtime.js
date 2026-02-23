(function (global) {
  "use strict";

  if (!global) return;
  var PARITY_REPORT_KEY_PREFIX = "engine_adapter_parity_report_v1:";

  function normalizeAdapterMode(raw) {
    if (raw === "core" || raw === "core-adapter") return "core-adapter";
    if (raw === "legacy" || raw === "legacy-bridge") return "legacy-bridge";
    return null;
  }

  function normalizeForceLegacyFlag(raw) {
    if (raw === true || raw === 1) return true;
    if (typeof raw !== "string") return false;
    var normalized = raw.trim().toLowerCase();
    if (!normalized) return false;
    return (
      normalized === "1" ||
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "on" ||
      normalized === "legacy" ||
      normalized === "legacy-bridge"
    );
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

  function readAdapterDefaultModeFromQuery() {
    try {
      if (!global.location || typeof global.location.search !== "string") return null;
      var params = new URLSearchParams(global.location.search || "");
      return params.get("engine_adapter_default");
    } catch (_err) {
      return null;
    }
  }

  function readForceLegacyFromQuery() {
    try {
      if (!global.location || typeof global.location.search !== "string") return null;
      var params = new URLSearchParams(global.location.search || "");
      return params.get("engine_adapter_force_legacy");
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

  function readAdapterDefaultModeFromStorage() {
    try {
      if (!global.localStorage || typeof global.localStorage.getItem !== "function") return null;
      return global.localStorage.getItem("engine_adapter_default_mode");
    } catch (_err) {
      return null;
    }
  }

  function readForceLegacyFromStorage() {
    try {
      if (!global.localStorage || typeof global.localStorage.getItem !== "function") return null;
      return global.localStorage.getItem("engine_adapter_force_legacy");
    } catch (_err) {
      return null;
    }
  }

  function resolveAdapterMode(input) {
    var opts = input || {};
    var explicit = normalizeAdapterMode(opts.adapterMode);
    if (explicit) return explicit;

    if (normalizeForceLegacyFlag(opts.forceLegacy)) return "legacy-bridge";
    if (normalizeForceLegacyFlag(global.__engineAdapterForceLegacy)) return "legacy-bridge";
    if (normalizeForceLegacyFlag(readForceLegacyFromQuery())) return "legacy-bridge";
    if (normalizeForceLegacyFlag(readForceLegacyFromStorage())) return "legacy-bridge";

    var globalMode = normalizeAdapterMode(global.__engineAdapterMode);
    if (globalMode) return globalMode;

    var queryMode = normalizeAdapterMode(readAdapterModeFromQuery());
    if (queryMode) return queryMode;

    var storageMode = normalizeAdapterMode(readAdapterModeFromStorage());
    if (storageMode) return storageMode;

    var defaultMode = normalizeAdapterMode(
      opts.defaultMode ||
      global.__engineAdapterDefault ||
      readAdapterDefaultModeFromQuery() ||
      readAdapterDefaultModeFromStorage()
    );
    if (defaultMode) return defaultMode;

    return "legacy-bridge";
  }

  function normalizeModeKey(modeKey) {
    return typeof modeKey === "string" && modeKey ? modeKey : "unknown";
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function buildAdapterParityReportStorageKey(modeKey, adapterMode) {
    var normalizedAdapterMode = normalizeAdapterMode(adapterMode) || "legacy-bridge";
    return PARITY_REPORT_KEY_PREFIX + normalizeModeKey(modeKey) + ":" + normalizedAdapterMode;
  }

  function readAdapterParityReportFromStorage(storage, modeKey, adapterMode) {
    if (!storage || typeof storage.getItem !== "function") return null;
    try {
      var raw = storage.getItem(buildAdapterParityReportStorageKey(modeKey, adapterMode));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : null;
    } catch (_err) {
      return null;
    }
  }

  function writeAdapterParityReportToStorage(storage, modeKey, adapterMode, report) {
    if (!storage || typeof storage.setItem !== "function") return false;
    if (!isPlainObject(report)) return false;
    try {
      storage.setItem(
        buildAdapterParityReportStorageKey(modeKey, adapterMode),
        JSON.stringify(report)
      );
      return true;
    } catch (_err) {
      return false;
    }
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

      var shadowApi = global.CoreAdapterShadowRuntime;
      payload.readAdapterParityState = function () {
        if (!shadowApi || typeof shadowApi.getAdapterParityState !== "function") return null;
        return shadowApi.getAdapterParityState(snapshotModeKey);
      };
      payload.readAdapterParityReport = function () {
        if (!shadowApi || typeof shadowApi.buildAdapterSessionParityReport !== "function") return null;
        return shadowApi.buildAdapterSessionParityReport({
          parityState: payload.readAdapterParityState(),
          snapshot: payload.adapterSnapshot,
          modeKey: snapshotModeKey,
          adapterMode: payload.adapterMode
        });
      };
      payload.readStoredAdapterParityReport = function (targetAdapterMode) {
        return readAdapterParityReportFromStorage(
          global.localStorage || null,
          snapshotModeKey,
          targetAdapterMode || payload.adapterMode
        );
      };
      payload.writeStoredAdapterParityReport = function (report, targetAdapterMode) {
        return writeAdapterParityReportToStorage(
          global.localStorage || null,
          snapshotModeKey,
          targetAdapterMode || payload.adapterMode,
          report
        );
      };
      payload.readAdapterParityABDiff = function () {
        if (!shadowApi || typeof shadowApi.buildAdapterParityABDiffSummary !== "function") return null;
        return shadowApi.buildAdapterParityABDiffSummary({
          legacyBridgeReport: payload.readStoredAdapterParityReport("legacy-bridge"),
          coreAdapterReport: payload.readStoredAdapterParityReport("core-adapter"),
          modeKey: snapshotModeKey
        });
      };

      function syncAdapterParityDiagnostics() {
        payload.adapterParityReport = payload.readAdapterParityReport();
        if (payload.adapterParityReport && typeof payload.writeStoredAdapterParityReport === "function") {
          payload.writeStoredAdapterParityReport(payload.adapterParityReport, payload.adapterMode);
        }
        payload.adapterParityABDiff =
          typeof payload.readAdapterParityABDiff === "function" ? payload.readAdapterParityABDiff() : null;
      }

      if (adapterMode === "core-adapter") {
        if (shadowApi && typeof shadowApi.attachAdapterMoveResultShadow === "function") {
          payload.adapterShadowBinding = shadowApi.attachAdapterMoveResultShadow({
            target: global,
            modeKey: snapshotModeKey,
            onStateChange: function (state) {
              payload.adapterParityState = state || null;
              syncAdapterParityDiagnostics();
            }
          });
          payload.adapterParityState = payload.readAdapterParityState();
          syncAdapterParityDiagnostics();
        } else {
          payload.adapterShadowBinding = null;
          payload.adapterParityState = null;
          syncAdapterParityDiagnostics();
        }
      } else {
        if (shadowApi && typeof shadowApi.detachAdapterMoveResultShadow === "function") {
          shadowApi.detachAdapterMoveResultShadow(snapshotModeKey);
        }
        payload.adapterShadowBinding = null;
        payload.adapterParityState = null;
        syncAdapterParityDiagnostics();
      }
    }
    return payload;
  }

  global.LegacyAdapterRuntime = global.LegacyAdapterRuntime || {};
  global.LegacyAdapterRuntime.resolveAdapterMode = resolveAdapterMode;
  global.LegacyAdapterRuntime.attachLegacyBridgeWithAdapter = attachLegacyBridgeWithAdapter;
})(typeof window !== "undefined" ? window : undefined);

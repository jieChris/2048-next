(function (global) {
  "use strict";

  if (!global) return;
  var ADAPTER_MODE_KEY = "engine_adapter_mode";
  var ADAPTER_DEFAULT_MODE_KEY = "engine_adapter_default_mode";
  var ADAPTER_FORCE_LEGACY_KEY = "engine_adapter_force_legacy";
  var PARITY_REPORT_KEY_PREFIX_V1 = "engine_adapter_parity_report_v1:";
  var PARITY_REPORT_KEY_PREFIX_V2 = "engine_adapter_parity_report_v2:";

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
      return global.localStorage.getItem(ADAPTER_MODE_KEY);
    } catch (_err) {
      return null;
    }
  }

  function readAdapterDefaultModeFromStorage() {
    try {
      if (!global.localStorage || typeof global.localStorage.getItem !== "function") return null;
      return global.localStorage.getItem(ADAPTER_DEFAULT_MODE_KEY);
    } catch (_err) {
      return null;
    }
  }

  function readForceLegacyFromStorage() {
    try {
      if (!global.localStorage || typeof global.localStorage.getItem !== "function") return null;
      return global.localStorage.getItem(ADAPTER_FORCE_LEGACY_KEY);
    } catch (_err) {
      return null;
    }
  }

  function resolveAdapterModePolicy(input) {
    var opts = input || {};
    var explicit = normalizeAdapterMode(opts.adapterMode);
    var globalMode = normalizeAdapterMode(global.__engineAdapterMode);
    var queryMode = normalizeAdapterMode(readAdapterModeFromQuery());
    var storageMode = normalizeAdapterMode(readAdapterModeFromStorage());
    var defaultMode = normalizeAdapterMode(
      opts.defaultMode ||
      global.__engineAdapterDefault ||
      readAdapterDefaultModeFromQuery() ||
      readAdapterDefaultModeFromStorage()
    );
    var forceLegacySource = null;

    if (normalizeForceLegacyFlag(opts.forceLegacy)) {
      forceLegacySource = "input";
    } else if (normalizeForceLegacyFlag(global.__engineAdapterForceLegacy)) {
      forceLegacySource = "global";
    } else if (normalizeForceLegacyFlag(readForceLegacyFromQuery())) {
      forceLegacySource = "query";
    } else if (normalizeForceLegacyFlag(readForceLegacyFromStorage())) {
      forceLegacySource = "storage";
    }
    var forceLegacyEnabled = forceLegacySource !== null;

    if (explicit) {
      return {
        effectiveMode: explicit,
        modeSource: "explicit",
        forceLegacyEnabled: forceLegacyEnabled,
        forceLegacySource: forceLegacySource,
        explicitMode: explicit,
        globalMode: globalMode,
        queryMode: queryMode,
        storageMode: storageMode,
        defaultMode: defaultMode
      };
    }

    if (forceLegacySource) {
      return {
        effectiveMode: "legacy-bridge",
        modeSource: "force-legacy",
        forceLegacyEnabled: forceLegacyEnabled,
        forceLegacySource: forceLegacySource,
        explicitMode: explicit,
        globalMode: globalMode,
        queryMode: queryMode,
        storageMode: storageMode,
        defaultMode: defaultMode
      };
    }

    if (globalMode) {
      return {
        effectiveMode: globalMode,
        modeSource: "global",
        forceLegacyEnabled: forceLegacyEnabled,
        forceLegacySource: forceLegacySource,
        explicitMode: explicit,
        globalMode: globalMode,
        queryMode: queryMode,
        storageMode: storageMode,
        defaultMode: defaultMode
      };
    }

    if (queryMode) {
      return {
        effectiveMode: queryMode,
        modeSource: "query",
        forceLegacyEnabled: forceLegacyEnabled,
        forceLegacySource: forceLegacySource,
        explicitMode: explicit,
        globalMode: globalMode,
        queryMode: queryMode,
        storageMode: storageMode,
        defaultMode: defaultMode
      };
    }

    if (storageMode) {
      return {
        effectiveMode: storageMode,
        modeSource: "storage",
        forceLegacyEnabled: forceLegacyEnabled,
        forceLegacySource: forceLegacySource,
        explicitMode: explicit,
        globalMode: globalMode,
        queryMode: queryMode,
        storageMode: storageMode,
        defaultMode: defaultMode
      };
    }

    if (defaultMode) {
      return {
        effectiveMode: defaultMode,
        modeSource: "default",
        forceLegacyEnabled: forceLegacyEnabled,
        forceLegacySource: forceLegacySource,
        explicitMode: explicit,
        globalMode: globalMode,
        queryMode: queryMode,
        storageMode: storageMode,
        defaultMode: defaultMode
      };
    }

    return {
      effectiveMode: "core-adapter",
      modeSource: "fallback",
      forceLegacyEnabled: forceLegacyEnabled,
      forceLegacySource: forceLegacySource,
      explicitMode: explicit,
      globalMode: globalMode,
      queryMode: queryMode,
      storageMode: storageMode,
      defaultMode: defaultMode
    };
  }

  function resolveAdapterMode(input) {
    var policy = resolveAdapterModePolicy(input);
    return policy && typeof policy.effectiveMode === "string"
      ? policy.effectiveMode
      : "core-adapter";
  }

  function writeStorageValue(key, value) {
    try {
      if (!global.localStorage) return false;
      if (value === null || value === undefined || value === "") {
        if (typeof global.localStorage.removeItem === "function") {
          global.localStorage.removeItem(key);
          return true;
        }
        return false;
      }
      if (typeof global.localStorage.setItem !== "function") return false;
      global.localStorage.setItem(key, String(value));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function setStoredAdapterDefaultMode(mode) {
    var normalized = normalizeAdapterMode(mode);
    return writeStorageValue(ADAPTER_DEFAULT_MODE_KEY, normalized || null);
  }

  function clearStoredAdapterDefaultMode() {
    return writeStorageValue(ADAPTER_DEFAULT_MODE_KEY, null);
  }

  function setStoredForceLegacy(enabled) {
    return writeStorageValue(ADAPTER_FORCE_LEGACY_KEY, enabled ? "1" : null);
  }

  function readStoredAdapterPolicyKeys() {
    return {
      adapterMode: readAdapterModeFromStorage(),
      defaultMode: readAdapterDefaultModeFromStorage(),
      forceLegacy: readForceLegacyFromStorage()
    };
  }

  function normalizeModeKey(modeKey) {
    return typeof modeKey === "string" && modeKey ? modeKey : "unknown";
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function buildAdapterParityReportStorageKey(modeKey, adapterMode, schemaVersion) {
    var normalizedAdapterMode = normalizeAdapterMode(adapterMode) || "legacy-bridge";
    var normalizedSchemaVersion = Number(schemaVersion) === 1 ? 1 : 2;
    var prefix = normalizedSchemaVersion === 1 ? PARITY_REPORT_KEY_PREFIX_V1 : PARITY_REPORT_KEY_PREFIX_V2;
    return prefix + normalizeModeKey(modeKey) + ":" + normalizedAdapterMode;
  }

  function parseAdapterParityReport(raw) {
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : null;
    } catch (_err) {
      return null;
    }
  }

  function normalizeAdapterParityReportSchemaVersion(report, fallbackVersion) {
    if (!isPlainObject(report)) return null;
    var out = Object.assign({}, report);
    var schemaVersion = Number(out.schemaVersion);
    if (!Number.isFinite(schemaVersion) || schemaVersion <= 0) {
      out.schemaVersion = Number(fallbackVersion) === 1 ? 1 : 2;
    } else {
      out.schemaVersion = Math.floor(schemaVersion);
    }
    return out;
  }

  function readAdapterParityReportFromStorage(storage, modeKey, adapterMode) {
    if (!storage || typeof storage.getItem !== "function") return null;
    var rawV2 = null;
    var rawV1 = null;
    try {
      rawV2 = storage.getItem(buildAdapterParityReportStorageKey(modeKey, adapterMode, 2));
      rawV1 = storage.getItem(buildAdapterParityReportStorageKey(modeKey, adapterMode, 1));
    } catch (_err) {
      return null;
    }
    var parsedV2 = normalizeAdapterParityReportSchemaVersion(parseAdapterParityReport(rawV2), 2);
    if (parsedV2) return parsedV2;
    return normalizeAdapterParityReportSchemaVersion(parseAdapterParityReport(rawV1), 1);
  }

  function writeAdapterParityReportToStorage(storage, modeKey, adapterMode, report) {
    if (!storage || typeof storage.setItem !== "function") return false;
    if (!isPlainObject(report)) return false;
    var normalized = normalizeAdapterParityReportSchemaVersion(report, 2);
    if (!normalized) return false;
    var serialized = null;
    try {
      serialized = JSON.stringify(normalized);
      storage.setItem(buildAdapterParityReportStorageKey(modeKey, adapterMode, 2), serialized);
    } catch (_err) {
      return false;
    }
    try {
      storage.setItem(buildAdapterParityReportStorageKey(modeKey, adapterMode, 1), serialized);
      return true;
    } catch (_err) {
      return true;
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
  global.LegacyAdapterRuntime.resolveAdapterModePolicy = resolveAdapterModePolicy;
  global.LegacyAdapterRuntime.setStoredAdapterDefaultMode = setStoredAdapterDefaultMode;
  global.LegacyAdapterRuntime.clearStoredAdapterDefaultMode = clearStoredAdapterDefaultMode;
  global.LegacyAdapterRuntime.setStoredForceLegacy = setStoredForceLegacy;
  global.LegacyAdapterRuntime.readStoredAdapterPolicyKeys = readStoredAdapterPolicyKeys;
  global.LegacyAdapterRuntime.attachLegacyBridgeWithAdapter = attachLegacyBridgeWithAdapter;
})(typeof window !== "undefined" ? window : undefined);

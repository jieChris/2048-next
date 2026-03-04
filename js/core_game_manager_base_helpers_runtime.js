function isCoreCallAvailable(coreCallResult) {
  return !!(coreCallResult && coreCallResult.available === true);
}

function resolveCoreObjectCallOrFallback(manager, coreCallResult, fallbackResolver) {
  if (!manager) return null;
  var coreValue = manager.isCoreCallAvailable(coreCallResult)
    ? (coreCallResult.value || {})
    : null;
  if (coreValue) return coreValue;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return null;
}

function resolveCoreBooleanCallOrFallback(manager, coreCallResult, fallbackResolver) {
  if (!manager) return null;
  var coreValue = manager.isCoreCallAvailable(coreCallResult)
    ? !!coreCallResult.value
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return !!fallbackResolver.call(manager);
  return null;
}

function resolveCoreNumericCallOrFallback(manager, coreCallResult, fallbackResolver) {
  if (!manager) return null;
  var coreValue = manager.isCoreCallAvailable(coreCallResult)
    ? (Number(coreCallResult.value) || 0)
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return Number(fallbackResolver.call(manager)) || 0;
  return null;
}

function resolveCoreStringCallOrFallback(manager, coreCallResult, fallbackResolver, allowEmpty) {
  if (!manager) return null;
  var coreValue = null;
  if (manager.isCoreCallAvailable(coreCallResult)) {
    var rawCoreString = coreCallResult.value;
    if (typeof rawCoreString === "string") {
      coreValue = allowEmpty === true ? rawCoreString : (rawCoreString || null);
    }
  }
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return String(fallbackResolver.call(manager));
  return null;
}

function resolveNormalizedCoreValueOrUndefined(manager, coreCallResult, normalizer) {
  if (!manager) return undefined;
  if (!manager.isCoreCallAvailable(coreCallResult)) return undefined;
  if (typeof normalizer !== "function") return coreCallResult.value;
  return normalizer.call(manager, coreCallResult.value);
}

function resolveNormalizedCoreValueOrFallback(
  manager,
  coreCallResult,
  normalizer,
  fallbackResolver
) {
  if (!manager) return undefined;
  var normalized = manager.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer);
  if (typeof normalized !== "undefined" && normalized !== null) return normalized;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return normalized;
}

function resolveNormalizedCoreValueOrFallbackAllowNull(
  manager,
  coreCallResult,
  normalizer,
  fallbackResolver
) {
  if (!manager) return undefined;
  var normalized = manager.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer);
  if (typeof normalized !== "undefined") return normalized;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return normalized;
}

function resolveCoreRawCallValueOrUndefined(manager, coreCallResult) {
  if (!manager) return undefined;
  if (!manager.isCoreCallAvailable(coreCallResult)) return undefined;
  return coreCallResult.value;
}

function tryHandleCoreRawValue(manager, coreCallResult, handler) {
  if (!manager) return false;
  var coreValue = manager.resolveCoreRawCallValueOrUndefined(coreCallResult);
  if (typeof coreValue === "undefined") return false;
  if (typeof handler === "function") {
    handler.call(manager, coreValue);
  }
  return true;
}

function isNonArrayObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isCoreHelperRecordObject(value) {
  return !!value && typeof value === "object";
}

function createCoreModeDefaultsPayload(payload) {
  var source = isCoreHelperRecordObject(payload) ? payload : {};
  return Object.assign(
    {
      defaultModeKey: GameManager.DEFAULT_MODE_KEY
    },
    source
  );
}

function createCoreModeContextPayload(manager, payload) {
  if (!manager) return createCoreModeDefaultsPayload(payload);
  var source = isCoreHelperRecordObject(payload) ? payload : {};
  return manager.createCoreModeDefaultsPayload(
    Object.assign(
      {
        currentModeKey: manager.modeKey,
        currentMode: manager.mode
      },
      source
    )
  );
}

function createUnavailableCoreCallResult() {
  return {
    available: false,
    value: null
  };
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeClonePlain(manager, value, fallback) {
  if (!manager) return fallback;
  try {
    return manager.clonePlain(value);
  } catch (_err) {
    return fallback;
  }
}

function hasOwnKey(target, key) {
  if (!target || (typeof target !== "object" && typeof target !== "function")) return false;
  return Object.prototype.hasOwnProperty.call(target, key);
}

function readOptionValue(manager, options, key, fallbackValue) {
  if (!manager) return fallbackValue;
  if (!isCoreHelperRecordObject(options)) return fallbackValue;
  return manager.hasOwnKey(options, key) ? options[key] : fallbackValue;
}

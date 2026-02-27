(function (global) {
  "use strict";

  if (!global) return;

  function isObjectRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function resolveLocalStorage(windowLike) {
    if (!windowLike) return null;
    return windowLike.localStorage || null;
  }

  function readStorageFlagFromContext(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    var trueValue = typeof opts.trueValue === "string" ? opts.trueValue : "1";
    if (!key) return false;
    var storage = resolveLocalStorage(opts.windowLike);
    if (!storage || typeof storage.getItem !== "function") return false;
    try {
      return storage.getItem(key) === trueValue;
    } catch (_err) {
      return false;
    }
  }

  function writeStorageFlagFromContext(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    var trueValue = typeof opts.trueValue === "string" ? opts.trueValue : "1";
    var falseValue = typeof opts.falseValue === "string" ? opts.falseValue : "0";
    if (!key) return false;
    var storage = resolveLocalStorage(opts.windowLike);
    if (!storage || typeof storage.setItem !== "function") return false;
    var value = opts.enabled ? trueValue : falseValue;
    try {
      storage.setItem(key, value);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function readStorageJsonMapFromContext(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    if (!key) return {};
    var storage = resolveLocalStorage(opts.windowLike);
    if (!storage || typeof storage.getItem !== "function") return {};
    try {
      var raw = storage.getItem(key);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return isObjectRecord(parsed) ? parsed : {};
    } catch (_err) {
      return {};
    }
  }

  function writeStorageJsonMapFromContext(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    if (!key) return false;
    var storage = resolveLocalStorage(opts.windowLike);
    if (!storage || typeof storage.setItem !== "function") return false;
    var map = isObjectRecord(opts.map) ? opts.map : {};
    try {
      storage.setItem(key, JSON.stringify(map));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function writeStorageJsonPayloadFromContext(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    if (!key) return false;
    var storage = resolveLocalStorage(opts.windowLike);
    if (!storage || typeof storage.setItem !== "function") return false;
    try {
      var serialized = JSON.stringify(opts.payload);
      if (typeof serialized !== "string") return false;
      storage.setItem(key, serialized);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function normalizeTimerModuleViewMode(value) {
    return value === "hidden" ? "hidden" : "timer";
  }

  function readTimerModuleViewForModeFromMap(options) {
    var opts = options || {};
    var map = isObjectRecord(opts.map) ? opts.map : {};
    var mode = typeof opts.mode === "string" ? opts.mode : "";
    if (!mode) return "timer";
    return normalizeTimerModuleViewMode(map[mode]);
  }

  function writeTimerModuleViewForModeToMap(options) {
    var opts = options || {};
    var map = isObjectRecord(opts.map) ? Object.assign({}, opts.map) : {};
    var mode = typeof opts.mode === "string" ? opts.mode : "";
    if (!mode) return map;
    map[mode] = normalizeTimerModuleViewMode(opts.view);
    return map;
  }

  global.CoreGameSettingsStorageRuntime = global.CoreGameSettingsStorageRuntime || {};
  global.CoreGameSettingsStorageRuntime.readStorageFlagFromContext = readStorageFlagFromContext;
  global.CoreGameSettingsStorageRuntime.writeStorageFlagFromContext = writeStorageFlagFromContext;
  global.CoreGameSettingsStorageRuntime.readStorageJsonMapFromContext = readStorageJsonMapFromContext;
  global.CoreGameSettingsStorageRuntime.writeStorageJsonMapFromContext = writeStorageJsonMapFromContext;
  global.CoreGameSettingsStorageRuntime.writeStorageJsonPayloadFromContext =
    writeStorageJsonPayloadFromContext;
  global.CoreGameSettingsStorageRuntime.normalizeTimerModuleViewMode = normalizeTimerModuleViewMode;
  global.CoreGameSettingsStorageRuntime.readTimerModuleViewForModeFromMap = readTimerModuleViewForModeFromMap;
  global.CoreGameSettingsStorageRuntime.writeTimerModuleViewForModeToMap = writeTimerModuleViewForModeToMap;
})(typeof window !== "undefined" ? window : undefined);

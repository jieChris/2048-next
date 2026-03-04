(function (global) {
  "use strict";

  if (!global) return;

  function asKey(value) {
    return typeof value === "string" && value ? value : null;
  }

  function asStorageLike(value) {
    return value && typeof value === "object" ? value : null;
  }

  function resolveReadStorageInput(storageOrKey, keyMaybe) {
    var explicitStorage = asStorageLike(storageOrKey);
    var explicitKey = asKey(keyMaybe);
    if (explicitStorage && explicitKey) {
      return {
        storage: explicitStorage,
        storageKey: explicitKey
      };
    }

    var fallbackStorage = asStorageLike(global.localStorage);
    var fallbackKey = asKey(storageOrKey);
    if (!fallbackStorage || !fallbackKey) return null;
    return {
      storage: fallbackStorage,
      storageKey: fallbackKey
    };
  }

  function resolveWriteStorageInput(storageOrKey, keyOrValue, valueMaybe) {
    var explicitStorage = asStorageLike(storageOrKey);
    var explicitKey = asKey(keyOrValue);
    if (explicitStorage && explicitKey) {
      return {
        storage: explicitStorage,
        storageKey: explicitKey,
        value: valueMaybe
      };
    }

    var fallbackStorage = asStorageLike(global.localStorage);
    var fallbackKey = asKey(storageOrKey);
    if (!fallbackStorage || !fallbackKey) return null;
    return {
      storage: fallbackStorage,
      storageKey: fallbackKey,
      value: keyOrValue
    };
  }

  function readHistoryStorageValue(storageOrKey, keyMaybe) {
    var resolved = resolveReadStorageInput(storageOrKey, keyMaybe);
    if (!resolved || typeof resolved.storage.getItem !== "function") return null;
    try {
      return resolved.storage.getItem(resolved.storageKey);
    } catch (_error) {
      return null;
    }
  }

  function writeHistoryStorageValue(storageOrKey, keyOrValue, valueMaybe) {
    var resolved = resolveWriteStorageInput(storageOrKey, keyOrValue, valueMaybe);
    if (!resolved) return false;

    try {
      if (resolved.value === null || resolved.value === undefined || resolved.value === "") {
        if (typeof resolved.storage.removeItem !== "function") return false;
        resolved.storage.removeItem(resolved.storageKey);
        return true;
      }
      if (typeof resolved.storage.setItem !== "function") return false;
      resolved.storage.setItem(resolved.storageKey, String(resolved.value));
      return true;
    } catch (_error) {
      return false;
    }
  }

  global.CoreHistoryCanaryStorageRuntime = global.CoreHistoryCanaryStorageRuntime || {};
  global.CoreHistoryCanaryStorageRuntime.readHistoryStorageValue = readHistoryStorageValue;
  global.CoreHistoryCanaryStorageRuntime.writeHistoryStorageValue = writeHistoryStorageValue;
})(typeof window !== "undefined" ? window : undefined);

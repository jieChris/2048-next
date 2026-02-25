(function (global) {
  "use strict";

  if (!global) return;

  function asKey(value) {
    return typeof value === "string" && value ? value : null;
  }

  function readHistoryStorageValue(key) {
    var storageKey = asKey(key);
    var localStorageLike = global.localStorage;
    if (
      !storageKey ||
      !localStorageLike ||
      typeof localStorageLike.getItem !== "function"
    ) {
      return null;
    }
    try {
      return localStorageLike.getItem(storageKey);
    } catch (_error) {
      return null;
    }
  }

  function writeHistoryStorageValue(key, value) {
    var storageKey = asKey(key);
    var localStorageLike = global.localStorage;
    if (!storageKey || !localStorageLike) return false;

    try {
      if (value === null || value === undefined || value === "") {
        if (typeof localStorageLike.removeItem !== "function") return false;
        localStorageLike.removeItem(storageKey);
        return true;
      }
      if (typeof localStorageLike.setItem !== "function") return false;
      localStorageLike.setItem(storageKey, String(value));
      return true;
    } catch (_error) {
      return false;
    }
  }

  global.CoreHistoryCanaryStorageRuntime = global.CoreHistoryCanaryStorageRuntime || {};
  global.CoreHistoryCanaryStorageRuntime.readHistoryStorageValue = readHistoryStorageValue;
  global.CoreHistoryCanaryStorageRuntime.writeHistoryStorageValue = writeHistoryStorageValue;
})(typeof window !== "undefined" ? window : undefined);

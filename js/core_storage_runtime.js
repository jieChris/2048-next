(function (global) {
  "use strict";

  if (!global) return;

  function resolveStorageByName(options) {
    var opts = options || {};
    var host = opts.windowLike || null;
    var name = typeof opts.storageName === "string" ? opts.storageName : "";
    if (!host || !name) return null;
    try {
      var storage = host[name];
      if (!storage) return null;
      if (typeof storage.getItem === "function" || typeof storage.setItem === "function") {
        return storage;
      }
      return null;
    } catch (_err) {
      return null;
    }
  }

  function safeSetStorageItem(options) {
    var opts = options || {};
    var storage = opts.storageLike || null;
    var key = typeof opts.key === "string" ? opts.key : "";
    if (!storage || !key || typeof storage.setItem !== "function") return false;
    try {
      var value = typeof opts.value === "string" ? opts.value : String(opts.value || "");
      storage.setItem(key, value);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function safeReadStorageItem(options) {
    var opts = options || {};
    var storage = opts.storageLike || null;
    var key = typeof opts.key === "string" ? opts.key : "";
    if (!storage || !key || typeof storage.getItem !== "function") return null;
    try {
      return storage.getItem(key);
    } catch (_err) {
      return null;
    }
  }

  global.CoreStorageRuntime = global.CoreStorageRuntime || {};
  global.CoreStorageRuntime.resolveStorageByName = resolveStorageByName;
  global.CoreStorageRuntime.safeSetStorageItem = safeSetStorageItem;
  global.CoreStorageRuntime.safeReadStorageItem = safeReadStorageItem;
})(typeof window !== "undefined" ? window : undefined);

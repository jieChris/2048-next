(function (global) {
  "use strict";

  if (!global) return;

  function resolveLocalStorage(windowLike) {
    if (!windowLike) return null;
    return windowLike.localStorage || null;
  }

  function readReplayGuideSeenFromContext(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    if (!key) return null;
    var storage = resolveLocalStorage(opts.windowLike);
    if (!storage || typeof storage.getItem !== "function") return null;
    try {
      var value = storage.getItem(key);
      return typeof value === "string" ? value : null;
    } catch (_err) {
      return null;
    }
  }

  function shouldShowReplayGuideFromContext(options) {
    var opts = options || {};
    var seenValue = typeof opts.seenValue === "string" ? opts.seenValue : "true";
    var stored = readReplayGuideSeenFromContext({
      windowLike: opts.windowLike,
      key: opts.key
    });
    return stored !== seenValue;
  }

  function markReplayGuideSeenFromContext(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    var seenValue = typeof opts.seenValue === "string" ? opts.seenValue : "true";
    if (!key) return false;
    var storage = resolveLocalStorage(opts.windowLike);
    if (!storage || typeof storage.setItem !== "function") return false;
    try {
      storage.setItem(key, seenValue);
      return true;
    } catch (_err) {
      return false;
    }
  }

  global.CoreReplayGuideRuntime = global.CoreReplayGuideRuntime || {};
  global.CoreReplayGuideRuntime.readReplayGuideSeenFromContext = readReplayGuideSeenFromContext;
  global.CoreReplayGuideRuntime.shouldShowReplayGuideFromContext = shouldShowReplayGuideFromContext;
  global.CoreReplayGuideRuntime.markReplayGuideSeenFromContext = markReplayGuideSeenFromContext;
})(typeof window !== "undefined" ? window : undefined);

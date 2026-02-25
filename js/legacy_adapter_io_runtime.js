(function (global) {
  "use strict";

  if (!global) return;

  var ADAPTER_SNAPSHOT_KEY_PREFIX = "engine_adapter_snapshot_v1:";

  function normalizeModeKey(modeKey) {
    return typeof modeKey === "string" && modeKey ? modeKey : "unknown";
  }

  function buildAdapterSnapshotKey(modeKey) {
    return ADAPTER_SNAPSHOT_KEY_PREFIX + normalizeModeKey(modeKey);
  }

  function readAdapterSnapshot(input) {
    var opts = input || {};
    var storage = opts.storage;
    if (!storage || typeof storage.getItem !== "function") return null;

    try {
      var raw = storage.getItem(buildAdapterSnapshotKey(opts.modeKey));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return parsed;
    } catch (_err) {
      return null;
    }
  }

  function writeAdapterSnapshot(input) {
    var opts = input || {};
    var storage = opts.storage;
    if (!storage || typeof storage.setItem !== "function") return false;

    try {
      storage.setItem(buildAdapterSnapshotKey(opts.modeKey), JSON.stringify(opts.snapshot || {}));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function buildAdapterMoveResultEventName(modeKey) {
    return "engine-adapter:move-result:" + normalizeModeKey(modeKey);
  }

  function emitAdapterMoveResult(input) {
    var opts = input || {};
    var target = opts.target;
    if (!target || typeof target.dispatchEvent !== "function") return false;

    var EventCtor = opts.eventCtor || (typeof global.CustomEvent === "function" ? global.CustomEvent : null);
    if (!EventCtor) return false;

    try {
      var event = new EventCtor(buildAdapterMoveResultEventName(opts.modeKey), {
        detail: opts.detail || {}
      });
      target.dispatchEvent(event);
      return true;
    } catch (_err) {
      return false;
    }
  }

  global.LegacyAdapterIoRuntime = global.LegacyAdapterIoRuntime || {};
  global.LegacyAdapterIoRuntime.buildAdapterSnapshotKey = buildAdapterSnapshotKey;
  global.LegacyAdapterIoRuntime.readAdapterSnapshot = readAdapterSnapshot;
  global.LegacyAdapterIoRuntime.writeAdapterSnapshot = writeAdapterSnapshot;
  global.LegacyAdapterIoRuntime.buildAdapterMoveResultEventName = buildAdapterMoveResultEventName;
  global.LegacyAdapterIoRuntime.emitAdapterMoveResult = emitAdapterMoveResult;
})(typeof window !== "undefined" ? window : undefined);

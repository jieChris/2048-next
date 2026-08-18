(function (global) {
  "use strict";

  if (!global || !global.document) return;
  if (global.__rankedCheckpointLocalMirrorFallbackBound) return;
  global.__rankedCheckpointLocalMirrorFallbackBound = true;

  var RANKED_CHECKPOINT_LOCAL_MIRROR_KEY_PREFIX = "ranked_checkpoint_local_mirror:v1:";
  var AUTH_USER_ID_STORAGE_KEY = "2048_auth_userId_v1";

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function resolveLocalStorageLike() {
    var runtime = global.CoreStorageRuntime;
    if (runtime && typeof runtime.resolveStorageByName === "function") {
      return runtime.resolveStorageByName({
        windowLike: global,
        storageName: "localStorage"
      });
    }
    try {
      return global["localStorage"] || null;
    } catch (_err) {
      return null;
    }
  }

  function readLocalStorageItem(key) {
    var storageLike = resolveLocalStorageLike();
    if (!storageLike) return null;
    try {
      return typeof storageLike.getItem === "function"
        ? storageLike.getItem(key)
        : null;
    } catch (_err) {
      return null;
    }
  }

  function writeLocalStorageItem(key, value) {
    var storageLike = resolveLocalStorageLike();
    if (!storageLike) return false;
    try {
      if (typeof storageLike.setItem === "function") {
        storageLike.setItem(key, value);
        return true;
      }
    } catch (_err) {
      return false;
    }
    return false;
  }

  function removeLocalStorageItem(key) {
    var storageLike = resolveLocalStorageLike();
    if (!storageLike) return;
    try {
      if (typeof storageLike.removeItem === "function") {
        storageLike.removeItem(key);
      }
    } catch (_err) {}
  }

  function resolveManagerDurationMs(manager) {
    if (!manager) return 0;
    if (typeof manager.getDurationMs === "function") {
      return Math.max(0, Math.floor(Number(manager.getDurationMs()) || 0));
    }
    var startTs = Number(manager.startTimestamp || manager.startTime || 0);
    if (!Number.isFinite(startTs) || startTs <= 0) return 0;
    return Math.max(0, Date.now() - startTs);
  }

  function resolveModeKey(manager) {
    return toText(manager && (manager.modeKey || manager.mode)).trim();
  }

  function buildLocalMirrorPayload(manager) {
    if (!(manager && !manager.replayMode && toText(manager.rankPolicy).trim().toLowerCase() === "ranked")) {
      return null;
    }
    if (typeof isSessionTerminated === "function" && isSessionTerminated(manager)) return null;
    if (!(manager.hasGameStarted || (Array.isArray(manager.moveHistory) && manager.moveHistory.length > 0))) {
      return null;
    }

    var modeKey = resolveModeKey(manager);
    if (!modeKey || typeof manager.serialize !== "function") return null;

    var replayString = "";
    try {
      replayString = toText(manager.serialize()).trim();
    } catch (_errReplay) {
      replayString = "";
    }
    if (!replayString) return null;

    var savedState = null;
    if (typeof buildSavedGameStatePayload === "function") {
      try {
        savedState = buildSavedGameStatePayload(manager, Date.now(), {
          force: true,
          forceFull: true
        });
      } catch (_errSavedState) {
        savedState = null;
      }
    }

    return {
      mode: "",
      mode_key: modeKey,
      client_record_id: toText(manager.clientRecordId).trim() || null,
      replay_string: replayString,
      duration_ms: resolveManagerDurationMs(manager),
      ui_state: savedState ? { saved_state: savedState } : {},
      saved_at: Date.now(),
      owner_user_id: toText(readLocalStorageItem(AUTH_USER_ID_STORAGE_KEY)).trim() || null
    };
  }

  function persistLocalMirror(manager) {
    var modeKey = resolveModeKey(manager);
    if (!modeKey) return false;
    var payload = buildLocalMirrorPayload(manager);
    var storageKey = RANKED_CHECKPOINT_LOCAL_MIRROR_KEY_PREFIX + modeKey;
    if (!payload) {
      removeLocalStorageItem(storageKey);
      return false;
    }
    var serialized;
    try {
      serialized = JSON.stringify(payload);
    } catch (_errSerialize) {
      return false;
    }
    if (!writeLocalStorageItem(storageKey, serialized)) return false;
    return readLocalStorageItem(storageKey) === serialized;
  }

  function flushCurrentManagerMirror() {
    persistLocalMirror(global.game_manager || null);
  }

  global.addEventListener("pagehide", flushCurrentManagerMirror, true);
  global.addEventListener("beforeunload", flushCurrentManagerMirror, true);
  global.document.addEventListener("visibilitychange", function () {
    if (global.document && global.document.visibilityState === "hidden") {
      flushCurrentManagerMirror();
    }
  });
})(typeof window !== "undefined" ? window : globalThis);

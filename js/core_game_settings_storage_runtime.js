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

  function resolveModeKey(options) {
    var opts = options || {};
    if (typeof opts.modeKey === "string" && opts.modeKey) return opts.modeKey;
    if (typeof opts.currentModeKey === "string" && opts.currentModeKey) return opts.currentModeKey;
    if (typeof opts.currentMode === "string" && opts.currentMode) return opts.currentMode;
    if (typeof opts.defaultModeKey === "string" && opts.defaultModeKey) return opts.defaultModeKey;
    return "";
  }

  function cloneBoardMatrix(value) {
    if (!Array.isArray(value)) return null;
    var out = [];
    for (var y = 0; y < value.length; y++) {
      var row = value[y];
      if (!Array.isArray(row)) return null;
      out.push(row.slice());
    }
    return out;
  }

  function safeClonePlain(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return fallback;
    }
  }

  function resolveSavedGameStateStorageKey(options) {
    var opts = options || {};
    var modeKey = resolveModeKey(opts);
    var keyPrefix = typeof opts.keyPrefix === "string" ? opts.keyPrefix : "";
    return keyPrefix + modeKey;
  }

  function shouldUseSavedGameStateFromContext(options) {
    var opts = options || {};
    if (opts.hasWindow === false) return false;
    if (opts.replayMode) return false;
    var path = typeof opts.pathname === "string" ? opts.pathname : "";
    if (path.indexOf("replay.html") !== -1) return false;
    return true;
  }

  function buildLiteSavedGameStatePayload(input) {
    var opts = input || {};
    var payload = isObjectRecord(opts.payload) ? opts.payload : null;
    if (!payload) return null;

    var savedStateVersion = Number(opts.savedStateVersion);
    if (!Number.isInteger(savedStateVersion)) return null;

    var fallbackModeKey = opts.modeKey;
    var fallbackWidth = Number(opts.width);
    var fallbackHeight = Number(opts.height);
    var fallbackRuleset = opts.ruleset;
    var fallbackScore = opts.score;
    var fallbackInitialSeed = opts.initialSeed;
    var fallbackSeed = opts.seed;
    var fallbackDurationMs = Number(opts.durationMs);

    var fallbackFinalBoard = cloneBoardMatrix(opts.finalBoardMatrix) || [];
    var board = cloneBoardMatrix(payload.board) || fallbackFinalBoard;
    var initialBoardMatrix =
      cloneBoardMatrix(payload.initial_board_matrix) ||
      cloneBoardMatrix(opts.initialBoardMatrix) ||
      fallbackFinalBoard;
    var replayStartBoardMatrix =
      cloneBoardMatrix(payload.replay_start_board_matrix) ||
      cloneBoardMatrix(opts.replayStartBoardMatrix) ||
      null;
    var practiceRestartBoardMatrix =
      cloneBoardMatrix(payload.practice_restart_board_matrix) ||
      cloneBoardMatrix(opts.practiceRestartBoardMatrix) ||
      null;

    var hasPayloadPracticeModeConfig =
      payload.practice_restart_mode_config !== undefined &&
      payload.practice_restart_mode_config !== null;
    var hasFallbackPracticeModeConfig =
      opts.practiceRestartModeConfig !== undefined && opts.practiceRestartModeConfig !== null;
    var practiceRestartModeConfig = hasPayloadPracticeModeConfig
      ? safeClonePlain(payload.practice_restart_mode_config, null)
      : hasFallbackPracticeModeConfig
        ? safeClonePlain(opts.practiceRestartModeConfig, null)
        : null;

    return {
      v: savedStateVersion,
      saved_at: Number(payload.saved_at) || Date.now(),
      terminated: false,
      mode_key: payload.mode_key || fallbackModeKey,
      board_width: Number(payload.board_width) || fallbackWidth,
      board_height: Number(payload.board_height) || fallbackHeight,
      ruleset: payload.ruleset || fallbackRuleset,
      board: board,
      score: Number.isInteger(payload.score) ? payload.score : fallbackScore,
      over: !!payload.over,
      won: !!payload.won,
      keep_playing: !!payload.keep_playing,
      initial_seed: Number.isFinite(Number(payload.initial_seed))
        ? Number(payload.initial_seed)
        : fallbackInitialSeed,
      seed: Number.isFinite(Number(payload.seed)) ? Number(payload.seed) : fallbackSeed,
      ips_input_count:
        Number.isInteger(payload.ips_input_count) && Number(payload.ips_input_count) >= 0
          ? Number(payload.ips_input_count)
          : 0,
      timer_status: payload.timer_status === 1 ? 1 : 0,
      duration_ms: Number.isFinite(Number(payload.duration_ms))
        ? Math.floor(Number(payload.duration_ms))
        : Number.isFinite(fallbackDurationMs)
          ? Math.floor(fallbackDurationMs)
          : 0,
      has_game_started: !!payload.has_game_started,
      initial_board_matrix: initialBoardMatrix,
      replay_start_board_matrix: replayStartBoardMatrix,
      practice_restart_board_matrix: practiceRestartBoardMatrix,
      practice_restart_mode_config: practiceRestartModeConfig,
      move_history: [],
      undo_stack: [],
      replay_compact_log: "",
      session_replay_v3: null,
      spawn_value_counts: {},
      reached_32k: !!payload.reached_32k,
      capped_milestone_count: Number.isInteger(payload.capped_milestone_count)
        ? Number(payload.capped_milestone_count)
        : 0,
      capped64_unlocked: null,
      combo_streak: Number.isInteger(payload.combo_streak) ? Number(payload.combo_streak) : 0,
      successful_move_count: Number.isInteger(payload.successful_move_count)
        ? Number(payload.successful_move_count)
        : 0,
      undo_used: Number.isInteger(payload.undo_used) ? Number(payload.undo_used) : 0,
      lock_consumed_at_move_count: Number.isInteger(payload.lock_consumed_at_move_count)
        ? Number(payload.lock_consumed_at_move_count)
        : -1,
      locked_direction_turn: Number.isInteger(payload.locked_direction_turn)
        ? Number(payload.locked_direction_turn)
        : null,
      locked_direction: Number.isInteger(payload.locked_direction)
        ? Number(payload.locked_direction)
        : null,
      challenge_id: payload.challenge_id || null
    };
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

  function writeSavedPayloadToStorages(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    if (!key) return false;

    var storages = Array.isArray(opts.storages) ? opts.storages : [];
    if (!storages.length) return false;

    var serialized = null;
    try {
      serialized = JSON.stringify(opts.payload);
    } catch (_err) {
      return false;
    }
    if (typeof serialized !== "string") return false;

    for (var i = 0; i < storages.length; i++) {
      var storage = storages[i];
      if (!storage || typeof storage.setItem !== "function") continue;
      try {
        storage.setItem(key, serialized);
        return true;
      } catch (_errStore) {}
    }
    return false;
  }

  function readSavedPayloadByKeyFromStorages(options) {
    var opts = options || {};
    var key = typeof opts.key === "string" ? opts.key : "";
    if (!key) return null;

    var storages = Array.isArray(opts.storages) ? opts.storages : [];
    if (!storages.length) return null;

    var best = null;
    var bestSavedAt = -1;
    for (var i = 0; i < storages.length; i++) {
      var storage = storages[i];
      if (!storage || typeof storage.getItem !== "function") continue;
      var raw = null;
      try {
        raw = storage.getItem(key);
      } catch (_errRead) {
        raw = null;
      }
      if (!raw) continue;

      var parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch (_errParse) {
        if (typeof storage.removeItem === "function") {
          try {
            storage.removeItem(key);
          } catch (_errRemove) {}
        }
        continue;
      }
      if (!isObjectRecord(parsed)) continue;

      var savedAt = Number(parsed.saved_at) || 0;
      if (savedAt >= bestSavedAt) {
        bestSavedAt = savedAt;
        best = parsed;
      }
    }
    return best;
  }

  function readSavedPayloadFromWindowName(options) {
    var opts = options || {};
    var win = opts.windowLike;
    if (!win) return null;

    var raw = "";
    try {
      raw = typeof win.name === "string" ? win.name : "";
    } catch (_errName) {
      return null;
    }
    if (!raw) return null;

    var windowNameKey = typeof opts.windowNameKey === "string" ? opts.windowNameKey : "";
    if (!windowNameKey) return null;
    var marker = windowNameKey + "=";

    var parts = raw.split("&");
    var encoded = "";
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(marker) === 0) {
        encoded = parts[i].substring(marker.length);
        break;
      }
    }
    if (!encoded) return null;

    var map = null;
    try {
      map = JSON.parse(decodeURIComponent(encoded));
    } catch (_errParse) {
      return null;
    }
    if (!isObjectRecord(map)) return null;

    var modeKey = resolveModeKey(opts);
    if (!modeKey) return null;
    var payload = map[modeKey];
    if (!isObjectRecord(payload)) return null;
    return payload;
  }

  function writeSavedPayloadToWindowName(options) {
    var opts = options || {};
    var win = opts.windowLike;
    if (!win) return false;

    var modeKey = resolveModeKey(opts);
    if (!modeKey) return false;

    var windowNameKey = typeof opts.windowNameKey === "string" ? opts.windowNameKey : "";
    if (!windowNameKey) return false;
    var marker = windowNameKey + "=";

    var raw = "";
    try {
      raw = typeof win.name === "string" ? win.name : "";
    } catch (_errNameRead) {
      raw = "";
    }

    var parts = raw ? raw.split("&") : [];
    var kept = [];
    var map = {};
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) continue;
      if (part.indexOf(marker) === 0) {
        var encoded = part.substring(marker.length);
        try {
          var parsed = JSON.parse(decodeURIComponent(encoded));
          if (isObjectRecord(parsed)) map = parsed;
        } catch (_errParse) {}
        continue;
      }
      kept.push(part);
    }

    if (!isObjectRecord(opts.payload)) {
      delete map[modeKey];
    } else {
      map[modeKey] = opts.payload;
    }

    var encodedMap = "";
    try {
      encodedMap = encodeURIComponent(JSON.stringify(map));
    } catch (_errEncode) {
      return false;
    }

    kept.push(marker + encodedMap);
    try {
      win.name = kept.join("&");
      return true;
    } catch (_errWrite) {
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

  function readUndoEnabledForModeFromMap(options) {
    var opts = options || {};
    var map = isObjectRecord(opts.map) ? opts.map : {};
    var mode = typeof opts.mode === "string" ? opts.mode : "";
    var fallbackEnabled = opts.fallbackEnabled !== false;
    if (!mode) return fallbackEnabled;
    if (!Object.prototype.hasOwnProperty.call(map, mode)) return fallbackEnabled;
    return !!map[mode];
  }

  function writeUndoEnabledForModeToMap(options) {
    var opts = options || {};
    var map = isObjectRecord(opts.map) ? Object.assign({}, opts.map) : {};
    var mode = typeof opts.mode === "string" ? opts.mode : "";
    if (!mode) return map;
    map[mode] = !!opts.enabled;
    return map;
  }

  global.CoreGameSettingsStorageRuntime = global.CoreGameSettingsStorageRuntime || {};
  global.CoreGameSettingsStorageRuntime.readStorageFlagFromContext = readStorageFlagFromContext;
  global.CoreGameSettingsStorageRuntime.writeStorageFlagFromContext = writeStorageFlagFromContext;
  global.CoreGameSettingsStorageRuntime.resolveSavedGameStateStorageKey = resolveSavedGameStateStorageKey;
  global.CoreGameSettingsStorageRuntime.shouldUseSavedGameStateFromContext =
    shouldUseSavedGameStateFromContext;
  global.CoreGameSettingsStorageRuntime.buildLiteSavedGameStatePayload =
    buildLiteSavedGameStatePayload;
  global.CoreGameSettingsStorageRuntime.readStorageJsonMapFromContext = readStorageJsonMapFromContext;
  global.CoreGameSettingsStorageRuntime.writeStorageJsonMapFromContext = writeStorageJsonMapFromContext;
  global.CoreGameSettingsStorageRuntime.writeStorageJsonPayloadFromContext =
    writeStorageJsonPayloadFromContext;
  global.CoreGameSettingsStorageRuntime.writeSavedPayloadToStorages =
    writeSavedPayloadToStorages;
  global.CoreGameSettingsStorageRuntime.readSavedPayloadByKeyFromStorages =
    readSavedPayloadByKeyFromStorages;
  global.CoreGameSettingsStorageRuntime.readSavedPayloadFromWindowName =
    readSavedPayloadFromWindowName;
  global.CoreGameSettingsStorageRuntime.writeSavedPayloadToWindowName =
    writeSavedPayloadToWindowName;
  global.CoreGameSettingsStorageRuntime.normalizeTimerModuleViewMode = normalizeTimerModuleViewMode;
  global.CoreGameSettingsStorageRuntime.readTimerModuleViewForModeFromMap = readTimerModuleViewForModeFromMap;
  global.CoreGameSettingsStorageRuntime.writeTimerModuleViewForModeToMap = writeTimerModuleViewForModeToMap;
  global.CoreGameSettingsStorageRuntime.readUndoEnabledForModeFromMap = readUndoEnabledForModeFromMap;
  global.CoreGameSettingsStorageRuntime.writeUndoEnabledForModeToMap = writeUndoEnabledForModeToMap;
})(typeof window !== "undefined" ? window : undefined);

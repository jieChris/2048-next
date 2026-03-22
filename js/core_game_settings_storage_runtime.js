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

  function normalizeHistoryBoardMatrix(value) {
    if (!Array.isArray(value)) return [];
    var out = [];
    for (var y = 0; y < value.length; y++) {
      var row = value[y];
      if (!Array.isArray(row)) {
        out.push([]);
        continue;
      }
      var normalizedRow = [];
      for (var x = 0; x < row.length; x++) {
        normalizedRow.push(Math.floor(Number(row[x]) || 0));
      }
      out.push(normalizedRow);
    }
    return out;
  }

  function normalizeInteger(value, fallback) {
    var numeric = Number(value);
    return Number.isFinite(numeric) ? Math.floor(numeric) : fallback;
  }

  function normalizeNonNegativeInteger(value, fallback) {
    return Math.max(0, normalizeInteger(value, fallback));
  }

  function normalizePositiveInteger(value, fallback) {
    var normalized = normalizeInteger(value, fallback);
    return normalized > 0 ? normalized : fallback;
  }

  function normalizeHistoryOwnerKeyPart(value, maxLength) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.:@-]+/g, "_")
      .slice(0, maxLength);
  }

  function normalizeHistoryDiagnosticPayloadArrayValue(value, maxStringLength) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "boolean") return value;
    if (typeof value === "string" && value) {
      return value.slice(0, maxStringLength);
    }
    return null;
  }

  function normalizeHistoryDiagnosticPayloadArray(value, options) {
    var source = Array.isArray(value) ? value : [];
    var out = [];
    for (var i = 0; i < source.length; i++) {
      if (out.length >= options.maxArrayItems) break;
      var normalized = normalizeHistoryDiagnosticPayloadArrayValue(source[i], options.maxStringLength);
      if (normalized === null) continue;
      out.push(normalized);
    }
    return out;
  }

  function normalizeHistoryDiagnosticPayloadValue(value, options) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value.slice(0, options.maxStringLength);
    }
    if (Array.isArray(value)) {
      return normalizeHistoryDiagnosticPayloadArray(value, options);
    }
    return null;
  }

  function normalizeHistoryDiagnosticPayload(payload, options) {
    if (!isObjectRecord(payload)) return null;
    var out = {};
    var keys = Object.keys(payload);
    var accepted = 0;
    for (var i = 0; i < keys.length; i++) {
      if (accepted >= options.maxPayloadKeys) break;
      var key = keys[i].slice(0, options.keyMaxLength);
      if (!key) continue;
      var value = normalizeHistoryDiagnosticPayloadValue(payload[keys[i]], options);
      if (value === null) continue;
      out[key] = value;
      accepted += 1;
    }
    return out;
  }

  function normalizeHistoryOwnerMetaFromContext(options) {
    var opts = options || {};
    var source = isObjectRecord(opts.record) ? opts.record : {};
    var keyPartMaxLength = normalizePositiveInteger(opts.keyPartMaxLength, 64);
    var ownerTypeRaw = typeof source.owner_type === "string" ? source.owner_type.trim().toLowerCase() : "";
    var ownerUserId = source.owner_user_id == null ? "" : String(source.owner_user_id).trim();
    var ownerNickname = source.owner_nickname == null ? "" : String(source.owner_nickname).trim();
    var ownerKey = typeof source.owner_key === "string" ? source.owner_key.trim() : "";

    if (!ownerTypeRaw && !ownerUserId && !ownerNickname) {
      ownerUserId = opts.authUserId == null ? "" : String(opts.authUserId).trim();
      ownerNickname = opts.authNickname == null ? "" : String(opts.authNickname).trim();
    }

    var ownerType = ownerTypeRaw === "guest" ? "guest" : "user";
    if (!ownerUserId && !ownerNickname) ownerType = "guest";
    if (ownerType === "guest") {
      ownerUserId = "";
      ownerNickname = "";
    }

    if (!ownerKey) {
      if (ownerType === "guest") {
        ownerKey = "guest";
      } else if (ownerUserId) {
        ownerKey = "user:" + normalizeHistoryOwnerKeyPart(ownerUserId, keyPartMaxLength);
      } else {
        var normalizedNickname = normalizeHistoryOwnerKeyPart(ownerNickname, keyPartMaxLength);
        ownerKey = normalizedNickname ? "nick:" + normalizedNickname : "guest";
      }
    }

    return {
      owner_type: ownerType,
      owner_user_id: ownerUserId || null,
      owner_nickname: ownerNickname,
      owner_key: ownerKey || "guest"
    };
  }

  function normalizeHistoryDiagnosticsIndexEntriesFromContext(options) {
    var opts = options || {};
    var maxEntries = normalizePositiveInteger(opts.maxEntries, 6);
    var maxPayloadKeys = normalizePositiveInteger(opts.maxPayloadKeys, 24);
    var maxStringLength = normalizePositiveInteger(opts.maxStringLength, 160);
    var maxArrayItems = normalizePositiveInteger(opts.maxArrayItems, 8);
    var keyMaxLength = normalizePositiveInteger(opts.keyMaxLength, 64);
    var source = Array.isArray(opts.entries) ? opts.entries : [];
    var out = [];
    for (var i = 0; i < source.length; i++) {
      if (out.length >= maxEntries) break;
      var entry = source[i];
      if (!isObjectRecord(entry)) continue;
      var key = typeof entry.key === "string" ? entry.key.slice(0, keyMaxLength) : "";
      if (!key) continue;
      var schemaVersion = Number(entry.schemaVersion);
      if (!Number.isInteger(schemaVersion) || schemaVersion < 1) continue;
      var payload = normalizeHistoryDiagnosticPayload(entry.payload, {
        maxPayloadKeys: maxPayloadKeys,
        keyMaxLength: keyMaxLength,
        maxArrayItems: maxArrayItems,
        maxStringLength: maxStringLength
      });
      if (!payload) continue;
      out.push({
        key: key,
        schemaVersion: schemaVersion,
        payload: payload
      });
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

  function getSavedGameStateStoragesFromContext(options) {
    var opts = options || {};
    var win = opts.windowLike;
    if (!win) return [];

    var storages = [];
    var localStorage = win.localStorage || null;
    var sessionStorage = win.sessionStorage || null;
    if (localStorage) storages.push(localStorage);
    if (sessionStorage && sessionStorage !== localStorage) storages.push(sessionStorage);
    return storages;
  }

  function removeKeysFromStorages(options) {
    var opts = options || {};
    var storages = Array.isArray(opts.storages) ? opts.storages : [];
    var keys = Array.isArray(opts.keys) ? opts.keys : [];
    var filteredKeys = [];
    for (var i = 0; i < keys.length; i++) {
      if (typeof keys[i] === "string" && keys[i]) filteredKeys.push(keys[i]);
    }
    if (!storages.length || !filteredKeys.length) return false;

    var removed = false;
    for (var s = 0; s < storages.length; s++) {
      var storage = storages[s];
      if (!storage || typeof storage.removeItem !== "function") continue;
      for (var k = 0; k < filteredKeys.length; k++) {
        try {
          storage.removeItem(filteredKeys[k]);
          removed = true;
        } catch (_err) {}
      }
    }
    return removed;
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

  function normalizeHistoryRecordFromContext(options) {
    var opts = options || {};
    var source = isObjectRecord(opts.record) ? opts.record : null;
    if (!source) return null;

    var nowIsoProvider = typeof opts.nowIso === "function" ? opts.nowIso : function () { return new Date().toISOString(); };
    var idFactory = typeof opts.idFactory === "function"
      ? opts.idFactory
      : function () { return "hist_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36); };
    var now = String(nowIsoProvider() || "");
    var id = typeof source.id === "string" && source.id.trim() ? source.id.trim() : idFactory();
    var replay = isObjectRecord(source.replay) ? source.replay : null;

    var replayString = "";
    if (typeof source.replay_string === "string") replayString = source.replay_string;
    else if (replay) {
      try {
        replayString = JSON.stringify(replay);
      } catch (_errReplay) {
        replayString = "";
      }
    }

    var ownerMeta = normalizeHistoryOwnerMetaFromContext({
      record: source,
      authUserId: opts.authUserId,
      authNickname: opts.authNickname,
      keyPartMaxLength: opts.ownerKeyPartMaxLength
    });

    var diagnosticsIndexEntries = normalizeHistoryDiagnosticsIndexEntriesFromContext({
      entries: source.diagnostics_index_entries,
      maxEntries: opts.maxDiagnosticEntries,
      maxPayloadKeys: opts.maxDiagnosticPayloadKeys,
      maxStringLength: opts.maxDiagnosticStringLength,
      maxArrayItems: opts.maxDiagnosticArrayItems,
      keyMaxLength: opts.maxDiagnosticKeyLength
    });

    return {
      id: id,
      mode: typeof source.mode === "string" && source.mode ? source.mode : "local",
      mode_key: typeof source.mode_key === "string" && source.mode_key ? source.mode_key : "unknown",
      board_width: normalizeInteger(source.board_width, 4),
      board_height: normalizeInteger(source.board_height, 4),
      ruleset: typeof source.ruleset === "string" && source.ruleset ? source.ruleset : "pow2",
      undo_enabled: !!source.undo_enabled,
      ranked_bucket: typeof source.ranked_bucket === "string" && source.ranked_bucket ? source.ranked_bucket : "none",
      mode_family: typeof source.mode_family === "string" && source.mode_family ? source.mode_family : "pow2",
      rank_policy: typeof source.rank_policy === "string" && source.rank_policy ? source.rank_policy : "unranked",
      special_rules_snapshot: isObjectRecord(source.special_rules_snapshot) ? source.special_rules_snapshot : {},
      challenge_id: typeof source.challenge_id === "string" && source.challenge_id ? source.challenge_id : null,
      score: normalizeInteger(source.score, 0),
      best_tile: normalizeInteger(source.best_tile, 0),
      duration_ms: normalizeNonNegativeInteger(source.duration_ms, 0),
      final_board: normalizeHistoryBoardMatrix(source.final_board),
      ended_at: typeof source.ended_at === "string" && source.ended_at ? source.ended_at : now,
      saved_at: typeof source.saved_at === "string" && source.saved_at ? source.saved_at : now,
      end_reason: typeof source.end_reason === "string" && source.end_reason ? source.end_reason : "game_over",
      client_version:
        typeof source.client_version === "string" && source.client_version
          ? source.client_version
          : (typeof opts.defaultClientVersion === "string" && opts.defaultClientVersion ? opts.defaultClientVersion : "1.8"),
      replay: replay,
      replay_string: replayString,
      owner_type: ownerMeta.owner_type,
      owner_user_id: ownerMeta.owner_user_id,
      owner_nickname: ownerMeta.owner_nickname,
      owner_key: ownerMeta.owner_key,
      diagnostics_index_entries: diagnosticsIndexEntries
    };
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
  global.CoreGameSettingsStorageRuntime.getSavedGameStateStoragesFromContext =
    getSavedGameStateStoragesFromContext;
  global.CoreGameSettingsStorageRuntime.removeKeysFromStorages = removeKeysFromStorages;
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
  global.CoreGameSettingsStorageRuntime.normalizeHistoryOwnerMetaFromContext =
    normalizeHistoryOwnerMetaFromContext;
  global.CoreGameSettingsStorageRuntime.normalizeHistoryDiagnosticsIndexEntriesFromContext =
    normalizeHistoryDiagnosticsIndexEntriesFromContext;
  global.CoreGameSettingsStorageRuntime.normalizeHistoryRecordFromContext =
    normalizeHistoryRecordFromContext;
})(typeof window !== "undefined" ? window : undefined);

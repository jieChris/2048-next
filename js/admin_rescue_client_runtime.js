(function (global) {
  "use strict";

  if (!global) return;

  var AUTH_TOKEN_KEY = "2048_auth_token_v1";
  var AUTH_USER_ID_KEY = "2048_auth_userId_v1";
  var CHECKED_SESSION_KEY_PREFIX = "admin_rescue_checked_session_v1:";
  var ACTIVE_RANKED_SESSION_KEY_PREFIX = "ranked_session_active:v1:";
  var PREFETCH_RANKED_SESSION_KEY_PREFIX = "ranked_session_prefetch:v1:";
  var activeChecks = {};

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function toRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function clonePlain(manager, value, fallbackValue) {
    if (value == null) return fallbackValue;
    if (manager && typeof manager.safeClonePlain === "function") {
      try {
        return manager.safeClonePlain(value, fallbackValue);
      } catch (_errSafeClone) {}
    }
    if (manager && typeof manager.clonePlain === "function") {
      try {
        return manager.clonePlain(value);
      } catch (_errClone) {}
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_errJson) {
      return fallbackValue;
    }
  }

  function normalizeDirectionList(value) {
    if (!Array.isArray(value)) return null;
    var result = [];
    for (var i = 0; i < value.length; i += 1) {
      var direction = Math.floor(Number(value[i]));
      if (!Number.isInteger(direction)) return null;
      result.push(direction);
    }
    return result;
  }

  function normalizeCountMap(value) {
    if (!(value && typeof value === "object") || Array.isArray(value)) return null;
    var result = {};
    for (var key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      var numeric = Math.max(0, Math.floor(Number(value[key]) || 0));
      result[String(key)] = numeric;
    }
    return result;
  }

  function hasDirectionListEntries(value) {
    return Array.isArray(value) && value.length > 0;
  }

  function hasCountMapEntries(value) {
    if (!(value && typeof value === "object") || Array.isArray(value)) return false;
    for (var key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      if (Math.floor(Number(value[key]) || 0) > 0) return true;
    }
    return false;
  }

  function normalizeNonNegativeInteger(value) {
    var numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  }

  function firstPresent(values) {
    if (!Array.isArray(values)) return undefined;
    for (var i = 0; i < values.length; i += 1) {
      var value = values[i];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return undefined;
  }

  function normalizeOptionalInteger(value) {
    if (value === undefined || value === null || value === "") return null;
    var numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) ? numeric : null;
  }

  function getStorage() {
    try {
      return global.localStorage || null;
    } catch (_err) {
      return null;
    }
  }

  function getAuthToken() {
    try {
      var storage = getStorage();
      return storage ? toText(storage.getItem(AUTH_TOKEN_KEY)).trim() : "";
    } catch (_err) {
      return "";
    }
  }

  function normalizeLang(value) {
    var lang = toText(value).trim().toLowerCase();
    return lang.indexOf("en") === 0 ? "en" : "zh";
  }

  function resolveLanguage() {
    try {
      if (global.UII18N && typeof global.UII18N.getLanguage === "function") {
        return normalizeLang(global.UII18N.getLanguage());
      }
    } catch (_errI18n) {}
    try {
      var storage = getStorage();
      if (storage) {
        var stored = normalizeLang(storage.getItem("ui_language_v1"));
        if (stored === "en") return "en";
      }
    } catch (_errStorage) {}
    try {
      var root = global.document && global.document.documentElement;
      if (root && typeof root.getAttribute === "function") {
        var attr = normalizeLang(root.getAttribute("data-ui-lang") || root.getAttribute("lang"));
        if (attr === "en") return "en";
      }
    } catch (_errRoot) {}
    try {
      return normalizeLang(global.navigator && (global.navigator.language || global.navigator.userLanguage));
    } catch (_errNavigator) {
      return "zh";
    }
  }

  function resolveCopy() {
    return resolveLanguage() === "en"
      ? {
          defaultReason: "An administrator has issued a game recovery for you.",
          confirmQuestion: "Replace the current board with the issued recovery board?",
          recoveryScore: "Recovery score: ",
          acceptFailed: "Recovery confirmation failed. Please refresh and try again.",
          applyFailed: "Failed to apply the recovery board. Please contact an administrator.",
          applied: "Recovery board applied."
        }
      : {
          defaultReason: "管理员为你签发了一份恢复对局。",
          confirmQuestion: "是否将当前盘面替换为签发的恢复盘面？",
          recoveryScore: "恢复分数：",
          acceptFailed: "恢复单确认失败，请刷新后重试。",
          applyFailed: "恢复盘面应用失败，请联系管理员。",
          applied: "恢复盘面已应用。"
        };
  }

  function buildApiBases() {
    var utils = global.ApiSharedUtils || {};
    if (typeof utils.buildApiBaseCandidates === "function") {
      var candidates = utils.buildApiBaseCandidates();
      if (Array.isArray(candidates) && candidates.length) return candidates;
    }
    var origin = toText(global.location && global.location.origin).replace(/\/+$/, "");
    var bases = [];
    if (origin) bases.push(origin + "/api");
    bases.push("https://2048next.cn/api");
    return bases;
  }

  async function apiRequest(path, options) {
    var opts = options || {};
    var token = getAuthToken();
    var bases = buildApiBases();
    var lastError = "api_unavailable";
    for (var i = 0; i < bases.length; i += 1) {
      var headers = Object.assign({}, opts.headers || {});
      if (token) headers.Authorization = "Bearer " + token;
      if (opts.body !== undefined && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
      try {
        var response = await global.fetch(bases[i] + path, {
          method: opts.method || "GET",
          headers: headers,
          body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
        });
        var data = await response.json().catch(function () { return null; });
        if (response.ok && data) return data;
        if (data && typeof data === "object") return data;
        lastError = "HTTP " + response.status;
      } catch (error) {
        lastError = error && error.message ? error.message : String(error);
      }
    }
    return { success: false, error: lastError };
  }

  function normalizeBoard(board) {
    if (!Array.isArray(board) || board.length !== 4) return null;
    var result = [];
    for (var y = 0; y < 4; y += 1) {
      if (!Array.isArray(board[y]) || board[y].length !== 4) return null;
      var row = [];
      for (var x = 0; x < 4; x += 1) {
        var value = Math.floor(Number(board[y][x]) || 0);
        if (value < 0) return null;
        row.push(value);
      }
      result.push(row);
    }
    return result;
  }

  function resolveOffer(payload) {
    var record = toRecord(payload);
    if (Array.isArray(record.data)) return toRecord(record.data[0]);
    var data = toRecord(record.data);
    if (Array.isArray(data.data)) return toRecord(data.data[0]);
    if (Array.isArray(data.rows)) return toRecord(data.rows[0]);
    if (Array.isArray(data.items)) return toRecord(data.items[0]);
    if (data.offer && typeof data.offer === "object") return toRecord(data.offer);
    if (data.id) return data;
    if (Array.isArray(record.rows)) return toRecord(record.rows[0]);
    if (Array.isArray(record.items)) return toRecord(record.items[0]);
    if (record.offer && typeof record.offer === "object") return toRecord(record.offer);
    if (record.id) return record;
    return {};
  }

  function getOfferId(offer) {
    return toText(offer && offer.id).trim();
  }

  function parseOfferPayload(offer) {
    if (!offer) return null;
    if (offer.payload && typeof offer.payload === "object") return offer.payload;
    var raw = toText(offer.payload_json || offer.payload);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }

  function readOwnValue(record, key) {
    return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
  }

  function readOfferValue(offer, key) {
    var payload = parseOfferPayload(offer) || {};
    var directPayloadValue = readOwnValue(payload, key);
    if (directPayloadValue !== undefined) return directPayloadValue;
    var payloadSavedState = toRecord(payload.saved_state || payload.savedState);
    var payloadSavedStateValue = readOwnValue(payloadSavedState, key);
    if (payloadSavedStateValue !== undefined) return payloadSavedStateValue;
    var payloadUiState = toRecord(payload.ui_state || payload.uiState);
    var payloadUiStateValue = readOwnValue(payloadUiState, key);
    if (payloadUiStateValue !== undefined) return payloadUiStateValue;
    var directOfferValue = readOwnValue(offer, key);
    if (directOfferValue !== undefined) return directOfferValue;
    var offerSavedState = toRecord(offer && (offer.saved_state || offer.savedState));
    var offerSavedStateValue = readOwnValue(offerSavedState, key);
    if (offerSavedStateValue !== undefined) return offerSavedStateValue;
    var offerUiState = toRecord(offer && (offer.ui_state || offer.uiState));
    var offerUiStateValue = readOwnValue(offerUiState, key);
    if (offerUiStateValue !== undefined) return offerUiStateValue;
    return undefined;
  }

  function resolveBoardFromOffer(offer) {
    var payload = parseOfferPayload(offer) || {};
    var rawBoard = payload.board || offer.board;
    if (!rawBoard && typeof offer.board_json === "string") {
      try {
        rawBoard = JSON.parse(offer.board_json);
      } catch (_err) {
        rawBoard = null;
      }
    }
    return normalizeBoard(rawBoard);
  }

  function resolveScoreFromOffer(offer) {
    var payload = parseOfferPayload(offer) || {};
    var score = Number(payload.score != null ? payload.score : offer.score);
    return Number.isFinite(score) && score >= 0 ? Math.floor(score) : 0;
  }

  function resolveDurationFromOffer(offer) {
    var payload = parseOfferPayload(offer) || {};
    var duration = Number(payload.duration_ms != null ? payload.duration_ms : offer.duration_ms);
    return Number.isFinite(duration) && duration >= 0 ? Math.floor(duration) : 0;
  }

  var SAVED_STATE_OFFER_KEYS = [
    "mode_key",
    "challenge_id",
    "ranked_session_token",
    "initial_seed",
    "seed",
    "timer_status",
    "timer_frozen",
    "timer_started_at_ms",
    "timer_elapsed_offset_ms",
    "timer_anchor_local_ms",
    "timer_anchor_server_ms",
    "timer_module_view",
    "timer_fixed_rows",
    "timer_dynamic_rows_capped",
    "timer_dynamic_rows_overflow",
    "timer_secondary_rows",
    "timer_secondary_expanded_parents",
    "timer_sub_8192",
    "timer_sub_16384",
    "timer_sub_visible",
    "has_game_started",
    "reached_32k",
    "capped_milestone_count",
    "initial_board_matrix",
    "replay_start_board_matrix",
    "practice_restart_board_matrix",
    "practice_restart_mode_config",
    "move_history",
    "ips_input_count",
    "replay_compact_log",
    "session_replay_v1",
    "session_replay_v3",
    "spawn_value_counts",
    "replay_string"
  ];

  function hasSavedStateTimerPayload(offer) {
    return (
      readOfferValue(offer, "timer_fixed_rows") !== undefined ||
      readOfferValue(offer, "timer_dynamic_rows_capped") !== undefined ||
      readOfferValue(offer, "timer_dynamic_rows_overflow") !== undefined ||
      readOfferValue(offer, "timer_secondary_rows") !== undefined ||
      readOfferValue(offer, "timer_elapsed_offset_ms") !== undefined ||
      readOfferValue(offer, "timer_anchor_local_ms") !== undefined ||
      readOfferValue(offer, "timer_anchor_server_ms") !== undefined
    );
  }

  function buildOfferSavedStatePayload(manager, offer, board, score, durationMs) {
    var saved = {
      board: board,
      score: score,
      duration_ms: durationMs,
      timer_status: 1,
      timer_frozen: false,
      has_game_started: true,
      over: false,
      won: false,
      keep_playing: false
    };
    for (var i = 0; i < SAVED_STATE_OFFER_KEYS.length; i += 1) {
      var key = SAVED_STATE_OFFER_KEYS[i];
      var value = readOfferValue(offer, key);
      if (value !== undefined) saved[key] = value;
    }
    if (!saved.mode_key && manager && manager.modeKey) saved.mode_key = manager.modeKey;
    if (!saved.challenge_id && manager && manager.challengeId) saved.challenge_id = manager.challengeId;
    if (!saved.ranked_session_token && manager && manager.rankedSessionToken) {
      saved.ranked_session_token = manager.rankedSessionToken;
    }
    if (saved.initial_seed === undefined && manager && Number.isFinite(Number(manager.initialSeed))) {
      saved.initial_seed = Number(manager.initialSeed);
    }
    if (saved.seed === undefined && manager && Number.isFinite(Number(manager.seed))) {
      saved.seed = Number(manager.seed);
    }
    if (saved.initial_seed === undefined && saved.seed !== undefined) saved.initial_seed = saved.seed;
    if (saved.seed === undefined && saved.initial_seed !== undefined) saved.seed = saved.initial_seed;
    if (!saved.initial_board_matrix && manager && typeof manager.getFinalBoardMatrix === "function") {
      saved.initial_board_matrix = manager.getFinalBoardMatrix();
    }
    return saved;
  }

  function applyOfferSavedStatePayload(manager, offer, board, score, durationMs) {
    if (typeof applySavedStateRestore !== "function") return false;
    if (!hasSavedStateTimerPayload(offer)) return false;
    return !!applySavedStateRestore(manager, buildOfferSavedStatePayload(manager, offer, board, score, durationMs));
  }

  function normalizeUnixMilliseconds(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "string" && !/^-?\d+(\.\d+)?$/.test(value.trim())) {
      var parsedMs = Date.parse(value);
      return Number.isFinite(parsedMs) ? Math.floor(parsedMs) : null;
    }
    var numeric = Math.floor(Number(value));
    if (!Number.isFinite(numeric)) return null;
    if (numeric > 0 && numeric < 100000000000) return numeric * 1000;
    return numeric;
  }

  function resolveAcceptedAtMsFromOffer(offer) {
    return normalizeUnixMilliseconds(firstPresent([
      readOfferValue(offer, "accepted_at"),
      readOfferValue(offer, "acceptedAt"),
      readOfferValue(offer, "server_accepted_at"),
      readOfferValue(offer, "serverAcceptedAt")
    ]));
  }

  function normalizeReplayBase64Body(text) {
    var normalized = toText(text).replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (!normalized) return "";
    var mod = normalized.length % 4;
    if (mod === 2) normalized += "==";
    else if (mod === 3) normalized += "=";
    else if (mod === 1) return "";
    return normalized;
  }

  function decodeBase64ToBytes(base64Text) {
    var normalized = normalizeReplayBase64Body(base64Text);
    if (!normalized || typeof global.atob !== "function" || typeof Uint8Array === "undefined") return null;
    try {
      var binary = global.atob(normalized);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i) & 0xff;
      }
      return bytes;
    } catch (_err) {
      return null;
    }
  }

  function decodeBase64Json(base64Text) {
    var normalized = normalizeReplayBase64Body(base64Text);
    if (!normalized || typeof global.atob !== "function") return null;
    try {
      return JSON.parse(global.atob(normalized));
    } catch (_err) {
      return null;
    }
  }

  function decodeRankedSessionTokenPayload(token) {
    var text = toText(token).trim();
    if (text.indexOf("rs1.") !== 0) return null;
    var parts = text.split(".");
    if (parts.length !== 3) return null;
    var payload = decodeBase64Json(parts[1]);
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  }

  function normalizeUnixSeconds(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "string" && !/^-?\d+(\.\d+)?$/.test(value.trim())) {
      var parsedMs = Date.parse(value);
      return Number.isFinite(parsedMs) ? Math.floor(parsedMs / 1000) : null;
    }
    var numeric = Math.floor(Number(value));
    if (!Number.isFinite(numeric)) return null;
    if (numeric > 100000000000) return Math.floor(numeric / 1000);
    return numeric;
  }

  function readAuthUserId() {
    try {
      var storage = getStorage();
      return storage ? toText(storage.getItem(AUTH_USER_ID_KEY)).trim() : "";
    } catch (_err) {
      return "";
    }
  }

  function removeStorageItem(storage, key) {
    if (!storage || typeof storage.removeItem !== "function" || !key) return;
    try {
      storage.removeItem(key);
    } catch (_err) {}
  }

  function writeStorageItem(storage, key, value) {
    if (!storage || typeof storage.setItem !== "function" || !key) return false;
    try {
      storage.setItem(key, value);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function resolveReplayV1Prefix() {
    var ctor = global.GameManager || {};
    var prefix = toText(ctor.REPLAY_V1_RPL_BASE64_PREFIX).trim();
    return prefix || "REPLAY_v1RPL_B64_";
  }

  function decodeReplayStringV1(replayString) {
    var text = toText(replayString).trim();
    var prefix = resolveReplayV1Prefix();
    if (!text || text.indexOf(prefix) !== 0) return null;
    var codec = global.CoreReplayCodecRuntime || {};
    if (typeof codec.decodeReplayV1Rpl !== "function") return null;
    var bytes = decodeBase64ToBytes(text.substring(prefix.length));
    if (!bytes) return null;
    try {
      return codec.decodeReplayV1Rpl(bytes);
    } catch (_err) {
      return null;
    }
  }

  function resolveRuleset(manager, offer) {
    var raw = readOfferValue(offer, "ruleset");
    var ruleset = toText(raw || (manager && manager.ruleset) || (manager && manager.modeConfig && manager.modeConfig.ruleset)).trim().toLowerCase();
    return ruleset === "fibonacci" ? "fibonacci" : "pow2";
  }

  function decodeReplayStringState(manager, offer) {
    var replayString = toText(readOfferValue(offer, "replay_string") || readOfferValue(offer, "replayString")).trim();
    if (!replayString) return null;
    var decoded = decodeReplayStringV1(replayString);
    if (!decoded || !Array.isArray(decoded.records)) return { replayString: replayString };
    var ruleset = resolveRuleset(manager, offer);
    var records = [];
    var moveHistory = [];
    var spawnCounts = {};
    var width = Math.max(1, Math.floor(Number(decoded.width) || (manager && manager.width) || 4));
    var fib = ruleset === "fibonacci";
    for (var i = 0; i < decoded.records.length; i += 1) {
      var record = decoded.records[i];
      if (!record || record.kind === "ext") continue;
      records.push(clonePlain(manager, record, record));
      if (record.kind === "move") {
        var direction = Math.floor(Number(record.dir));
        if (Number.isInteger(direction)) moveHistory.push(direction);
        var value = fib ? (record.spawnValueBit === 1 ? 2 : 1) : (record.spawnValueBit === 1 ? 4 : 2);
        spawnCounts[String(value)] = (spawnCounts[String(value)] || 0) + 1;
      } else if (record.kind === "undo1") {
        moveHistory.push(-1);
      } else if (record.kind === "undon") {
        var count = Math.max(1, Math.floor(Number(record.undoCount) || 0));
        for (var j = 0; j < count; j += 1) moveHistory.push(-1);
      }
    }
    return {
      replayString: replayString,
      moveHistory: moveHistory,
      spawnValueCounts: spawnCounts,
      sessionReplayV1: {
        v: 1,
        mode_key: toText(readOfferValue(offer, "mode_key") || (manager && manager.modeKey)).trim(),
        ruleset: ruleset,
        board_width: width,
        board_height: Math.max(1, Math.floor(Number(decoded.height) || (manager && manager.height) || 4)),
        start_unix_ms: decoded.startUnixMs || Date.now(),
        challenge_id: toText(readOfferValue(offer, "challenge_id") || readOfferValue(offer, "challengeId")).trim() || null,
        seed: Math.max(0, Math.floor(Number(readOfferValue(offer, "seed") || readOfferValue(offer, "initial_seed") || readOfferValue(offer, "initialSeed") || 0) || 0)),
        init_tiles: Array.isArray(decoded.initTiles) ? clonePlain(manager, decoded.initTiles, []) : [],
        records: records,
        last_event_at_ms: Date.now(),
        supported: true
      }
    };
  }

  function resolveReplayStateFromOffer(manager, offer) {
    var decodedState = decodeReplayStringState(manager, offer) || {};
    var explicitMoveHistory = normalizeDirectionList(readOfferValue(offer, "move_history"));
    var explicitSpawnCounts = normalizeCountMap(readOfferValue(offer, "spawn_value_counts"));
    var sessionReplayV1 = readOfferValue(offer, "session_replay_v1");
    var sessionReplayV3 = readOfferValue(offer, "session_replay_v3");
    var successfulMoveCount = normalizeNonNegativeInteger(
      readOfferValue(offer, "successful_move_count") != null
        ? readOfferValue(offer, "successful_move_count")
        : readOfferValue(offer, "successfulMoveCount")
    );
    var undoUsed = normalizeNonNegativeInteger(
      readOfferValue(offer, "undo_used") != null ? readOfferValue(offer, "undo_used") : readOfferValue(offer, "undoUsed")
    );
    return {
      replayString: decodedState.replayString || toText(readOfferValue(offer, "replay_string") || readOfferValue(offer, "replayString")).trim(),
      moveHistory: hasDirectionListEntries(explicitMoveHistory) ? explicitMoveHistory : decodedState.moveHistory || explicitMoveHistory || null,
      replayCompactLog: toText(readOfferValue(offer, "replay_compact_log")),
      sessionReplayV1: sessionReplayV1 && typeof sessionReplayV1 === "object" ? sessionReplayV1 : decodedState.sessionReplayV1 || null,
      sessionReplayV3: sessionReplayV3 && typeof sessionReplayV3 === "object" ? sessionReplayV3 : null,
      spawnValueCounts: hasCountMapEntries(explicitSpawnCounts) ? explicitSpawnCounts : decodedState.spawnValueCounts || explicitSpawnCounts || null,
      successfulMoveCount: successfulMoveCount,
      undoUsed: undoUsed
    };
  }

  function resolveRankedSessionStateFromOffer(manager, offer, replayState) {
    var sessionReplayV1 = toRecord(replayState && replayState.sessionReplayV1);
    var sessionReplayV3 = toRecord(replayState && replayState.sessionReplayV3);
    var token = toText(firstPresent([
      readOfferValue(offer, "ranked_session_token"),
      readOfferValue(offer, "rankedSessionToken"),
      sessionReplayV1.ranked_session_token,
      sessionReplayV1.rankedSessionToken,
      sessionReplayV3.ranked_session_token,
      sessionReplayV3.rankedSessionToken
    ])).trim();
    var tokenPayload = decodeRankedSessionTokenPayload(token) || {};
    var challengeId = toText(firstPresent([
      readOfferValue(offer, "challenge_id"),
      readOfferValue(offer, "challengeId"),
      sessionReplayV1.challenge_id,
      sessionReplayV1.challengeId,
      sessionReplayV3.challenge_id,
      sessionReplayV3.challengeId,
      tokenPayload.challenge_id
    ])).trim();
    var seed = normalizeOptionalInteger(firstPresent([
      readOfferValue(offer, "seed"),
      readOfferValue(offer, "initial_seed"),
      readOfferValue(offer, "initialSeed"),
      sessionReplayV1.seed,
      sessionReplayV1.initial_seed,
      sessionReplayV1.initialSeed,
      sessionReplayV3.seed,
      sessionReplayV3.initial_seed,
      sessionReplayV3.initialSeed,
      tokenPayload.seed
    ]));
    var modeKey = toText(firstPresent([
      readOfferValue(offer, "mode_key"),
      readOfferValue(offer, "modeKey"),
      sessionReplayV1.mode_key,
      sessionReplayV1.modeKey,
      sessionReplayV3.mode_key,
      sessionReplayV3.modeKey,
      tokenPayload.mode_key,
      manager && manager.modeKey
    ])).trim();
    var issuedAt = normalizeUnixSeconds(firstPresent([
      readOfferValue(offer, "ranked_session_issued_at"),
      readOfferValue(offer, "issued_at"),
      readOfferValue(offer, "issuedAt"),
      sessionReplayV1.issued_at,
      sessionReplayV1.issuedAt,
      sessionReplayV3.issued_at,
      sessionReplayV3.issuedAt,
      tokenPayload.iat
    ]));
    var exp = normalizeUnixSeconds(firstPresent([
      readOfferValue(offer, "ranked_session_expires_at"),
      readOfferValue(offer, "ranked_session_exp"),
      sessionReplayV1.exp,
      sessionReplayV1.expires_at,
      sessionReplayV1.expiresAt,
      sessionReplayV3.exp,
      sessionReplayV3.expires_at,
      sessionReplayV3.expiresAt,
      tokenPayload.exp
    ]));
    if (!token && !challengeId && seed === null) return null;
    return {
      rankedSessionToken: token,
      challengeId: challengeId,
      seed: seed,
      modeKey: modeKey,
      issuedAt: issuedAt,
      exp: exp
    };
  }

  function persistRankedSessionState(manager, rankedState) {
    if (!manager || !rankedState) return false;
    var modeKey = toText(rankedState.modeKey || manager.modeKey).trim();
    var challengeId = toText(rankedState.challengeId).trim().toLowerCase();
    var token = toText(rankedState.rankedSessionToken).trim();
    var seed = Math.floor(Number(rankedState.seed));
    var issuedAt = Math.floor(Number(rankedState.issuedAt));
    var exp = Math.floor(Number(rankedState.exp));
    if (!modeKey || !challengeId || !token) return false;
    if (!Number.isInteger(seed) || seed < 0) return false;
    if (!Number.isInteger(issuedAt) || issuedAt <= 0) return false;
    if (!Number.isInteger(exp) || exp <= Math.floor(Date.now() / 1000)) return false;
    var storage = getStorage();
    if (!storage) return false;
    var activeKey = ACTIVE_RANKED_SESSION_KEY_PREFIX + modeKey;
    var prefetchKey = PREFETCH_RANKED_SESSION_KEY_PREFIX + modeKey;
    var record = {
      mode_key: modeKey,
      mode_bucket: null,
      challenge_id: challengeId,
      seed: seed,
      ranked_session_token: token,
      issued_at: issuedAt,
      exp: exp,
      owner_user_id: readAuthUserId() || null,
      client_received_at_ms: Date.now()
    };
    var written = writeStorageItem(storage, activeKey, JSON.stringify(record));
    if (written) removeStorageItem(storage, prefetchKey);
    return written;
  }

  function applyRankedSessionStateToManager(manager, rankedState) {
    if (!manager || !rankedState) return;
    if (rankedState.rankedSessionToken) manager.rankedSessionToken = rankedState.rankedSessionToken;
    if (rankedState.challengeId) manager.challengeId = rankedState.challengeId;
    if (rankedState.seed !== null) {
      manager.initialSeed = rankedState.seed;
      manager.seed = rankedState.seed;
    }
    if (manager.sessionReplayV1 && typeof manager.sessionReplayV1 === "object") {
      if (rankedState.challengeId) manager.sessionReplayV1.challenge_id = rankedState.challengeId;
      if (rankedState.seed !== null) manager.sessionReplayV1.seed = rankedState.seed;
      if (rankedState.rankedSessionToken) manager.sessionReplayV1.ranked_session_token = rankedState.rankedSessionToken;
    }
    if (manager.sessionReplayV3 && typeof manager.sessionReplayV3 === "object") {
      if (rankedState.challengeId) manager.sessionReplayV3.challenge_id = rankedState.challengeId;
      if (rankedState.seed !== null) manager.sessionReplayV3.seed = rankedState.seed;
      if (rankedState.rankedSessionToken) manager.sessionReplayV3.ranked_session_token = rankedState.rankedSessionToken;
    }
    if (rankedState.challengeId) {
      global.GAME_CHALLENGE_CONTEXT = {
        id: rankedState.challengeId,
        mode_key: rankedState.modeKey || toText(manager.modeKey).trim(),
        seed: rankedState.seed !== null ? rankedState.seed : manager.initialSeed,
        ranked_session_token: rankedState.rankedSessionToken || toText(manager.rankedSessionToken).trim()
      };
    }
    persistRankedSessionState(manager, rankedState);
  }

  function deriveStepCountersFromMoveHistory(moveHistory) {
    var result = { successfulMoveCount: 0, undoUsed: 0 };
    if (!Array.isArray(moveHistory)) return result;
    for (var i = 0; i < moveHistory.length; i += 1) {
      var direction = Math.floor(Number(moveHistory[i]));
      if (!Number.isInteger(direction)) continue;
      if (direction < 0) result.undoUsed += 1;
      else result.successfulMoveCount += 1;
    }
    return result;
  }

  function applyOfferReplayStateToManager(manager, offer) {
    var replayState = resolveReplayStateFromOffer(manager, offer);
    if (replayState.moveHistory) manager.moveHistory = replayState.moveHistory.slice();
    manager.ipsInputTimes = [];
    if (Array.isArray(manager.moveHistory)) manager.ipsInputCount = manager.moveHistory.length;
    var stepCounters = deriveStepCountersFromMoveHistory(manager.moveHistory);
    manager.successfulMoveCount = replayState.successfulMoveCount !== null
      ? replayState.successfulMoveCount
      : stepCounters.successfulMoveCount;
    manager.undoUsed = replayState.undoUsed !== null ? replayState.undoUsed : stepCounters.undoUsed;
    if (replayState.replayCompactLog) manager.replayCompactLog = replayState.replayCompactLog;
    if (replayState.sessionReplayV1) manager.sessionReplayV1 = clonePlain(manager, replayState.sessionReplayV1, null);
    if (replayState.sessionReplayV3) manager.sessionReplayV3 = clonePlain(manager, replayState.sessionReplayV3, null);
    if (replayState.spawnValueCounts) {
      manager.spawnValueCounts = clonePlain(manager, replayState.spawnValueCounts, {});
      manager.spawnTwos = manager.spawnValueCounts["2"] || 0;
      manager.spawnFours = manager.spawnValueCounts["4"] || 0;
    }
    if (replayState.replayString) manager.rescueReplayString = replayState.replayString;
    applyRankedSessionStateToManager(manager, resolveRankedSessionStateFromOffer(manager, offer, replayState));
  }

  function resetRescueSubmitIdentity(manager) {
    if (!manager) return;
    manager.sessionSubmitDone = false;
    if (typeof assignManagerClientRecordId === "function") {
      assignManagerClientRecordId(manager, "");
    } else {
      manager.clientRecordId = "";
    }
  }

  function resolveReasonFromOffer(offer) {
    var raw = toText(offer && offer.reason).trim();
    return raw || resolveCopy().defaultReason;
  }

  function confirmOffer(offer, score) {
    var copy = resolveCopy();
    var reason = resolveReasonFromOffer(offer);
    var message = reason + "\n\n" + copy.confirmQuestion;
    if (score > 0) message += "\n" + copy.recoveryScore + score;
    return global.confirm(message);
  }

  function applyOfferToManager(manager, offer, board, score, durationMs) {
    if (!manager || !offer || !board) return false;
    if (typeof manager.restartWithBoard === "function") {
      manager.restartWithBoard(board, manager.modeConfig || null, { skipStartTiles: true, disableStateRestore: true });
    } else if (typeof setBoardFromMatrix === "function") {
      setBoardFromMatrix(manager, board);
    } else {
      return false;
    }
    if (typeof manager.setRuntimeScore === "function") manager.setRuntimeScore(score);
    else manager.score = score;
    manager.accumulatedTime = durationMs;
    manager.time = durationMs;
    manager.startTime = null;
    manager.timerStatus = 0;
    manager.timerElapsedOffsetMs = durationMs;
    manager.timerAnchorLocalMs = null;
    manager.timerAnchorServerMs = null;
    manager.pendingTimerAnchorServerMs = resolveAcceptedAtMsFromOffer(offer) || Date.now();
    manager.hasGameStarted = true;
    manager.over = false;
    manager.won = false;
    manager.keepPlaying = false;
    if (typeof manager.getFinalBoardMatrix === "function") {
      manager.initialBoardMatrix = manager.getFinalBoardMatrix();
      manager.replayStartBoardMatrix = manager.getFinalBoardMatrix();
    }
    applyOfferReplayStateToManager(manager, offer);
    applyOfferSavedStatePayload(manager, offer, board, score, durationMs);
    resetRescueSubmitIdentity(manager);
    if (typeof manager.startTimer === "function") manager.startTimer();
    if (typeof manager.actuate === "function") manager.actuate();
    if (typeof manager.saveGameState === "function") manager.saveGameState({ force: true, forceFull: true });
    return true;
  }

  function rememberChecked(modeKey) {
    try {
      var storage = getStorage();
      if (storage) storage.setItem(CHECKED_SESSION_KEY_PREFIX + modeKey, String(Date.now()));
    } catch (_err) {}
  }

  async function checkAndOfferRescue(manager) {
    if (!manager || !manager.modeKey || !getAuthToken()) return;
    var modeKey = toText(manager.modeKey).trim();
    if (!modeKey || activeChecks[modeKey]) return;
    activeChecks[modeKey] = true;
    try {
      var result = await apiRequest("/rescue-offers/active?mode_key=" + encodeURIComponent(modeKey), { method: "GET" });
      var offer = resolveOffer(result);
      var offerId = getOfferId(offer);
      if (!offerId) return;
      var board = resolveBoardFromOffer(offer);
      if (!board) return;
      var score = resolveScoreFromOffer(offer);
      var durationMs = resolveDurationFromOffer(offer);
      if (!confirmOffer(offer, score)) {
        await apiRequest("/rescue-offers/" + encodeURIComponent(offerId) + "/reject", { method: "POST" });
        rememberChecked(modeKey);
        return;
      }
      var accepted = await apiRequest("/rescue-offers/" + encodeURIComponent(offerId) + "/accept", { method: "POST" });
      if (accepted && accepted.success === false) {
        global.alert(resolveCopy().acceptFailed);
        return;
      }
      if (accepted && accepted.data && typeof accepted.data === "object") {
        offer.accepted_at = accepted.data.accepted_at || accepted.data.acceptedAt || offer.accepted_at;
      }
      if (!applyOfferToManager(manager, offer, board, score, durationMs)) {
        global.alert(resolveCopy().applyFailed);
        return;
      }
      await apiRequest("/rescue-offers/" + encodeURIComponent(offerId) + "/consume", { method: "POST" });
      global.alert(resolveCopy().applied);
    } finally {
      activeChecks[modeKey] = false;
    }
  }

  function scheduleCheck(manager) {
    if (!manager) return;
    var run = function () { checkAndOfferRescue(manager).catch(function () {}); };
    if (typeof global.setTimeout === "function") global.setTimeout(run, 600);
    else run();
  }

  global.AdminRescueClientRuntime = {
    checkAndOfferRescue: checkAndOfferRescue,
    scheduleCheck: scheduleCheck
  };

  if (global.game_manager) {
    scheduleCheck(global.game_manager);
  }
})(typeof window !== "undefined" ? window : undefined);

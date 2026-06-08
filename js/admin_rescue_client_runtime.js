(function (global) {
  "use strict";

  if (!global) return;

  var AUTH_TOKEN_KEY = "2048_auth_token_v1";
  var CHECKED_SESSION_KEY_PREFIX = "admin_rescue_checked_session_v1:";
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

  function normalizeNonNegativeInteger(value) {
    var numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
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

  function readOfferValue(offer, key) {
    var payload = parseOfferPayload(offer) || {};
    if (payload && Object.prototype.hasOwnProperty.call(payload, key)) return payload[key];
    if (offer && Object.prototype.hasOwnProperty.call(offer, key)) return offer[key];
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
      moveHistory: explicitMoveHistory || decodedState.moveHistory || null,
      replayCompactLog: toText(readOfferValue(offer, "replay_compact_log")),
      sessionReplayV1: sessionReplayV1 && typeof sessionReplayV1 === "object" ? sessionReplayV1 : decodedState.sessionReplayV1 || null,
      sessionReplayV3: sessionReplayV3 && typeof sessionReplayV3 === "object" ? sessionReplayV3 : null,
      spawnValueCounts: explicitSpawnCounts || decodedState.spawnValueCounts || null,
      successfulMoveCount: successfulMoveCount,
      undoUsed: undoUsed
    };
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
  }

  function resolveReasonFromOffer(offer) {
    return toText((offer && offer.reason) || "管理员为你签发了一份恢复对局。");
  }

  function confirmOffer(offer, score) {
    var reason = resolveReasonFromOffer(offer);
    var message = reason + "\n\n是否将当前盘面替换为签发的恢复盘面？";
    if (score > 0) message += "\n恢复分数：" + score;
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
    manager.hasGameStarted = true;
    manager.over = false;
    manager.won = false;
    manager.keepPlaying = false;
    if (typeof manager.getFinalBoardMatrix === "function") {
      manager.initialBoardMatrix = manager.getFinalBoardMatrix();
      manager.replayStartBoardMatrix = manager.getFinalBoardMatrix();
    }
    applyOfferReplayStateToManager(manager, offer);
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
        global.alert("恢复单确认失败，请刷新后重试。");
        return;
      }
      if (!applyOfferToManager(manager, offer, board, score, durationMs)) {
        global.alert("恢复盘面应用失败，请联系管理员。");
        return;
      }
      await apiRequest("/rescue-offers/" + encodeURIComponent(offerId) + "/consume", { method: "POST" });
      global.alert("恢复盘面已应用。");
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

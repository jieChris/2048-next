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
    bases.push("https://taihe.fun/api");
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
    var data = toRecord(record.data);
    return toRecord(data.offer || data || record.offer);
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

  function resolveBoardFromOffer(offer) {
    var payload = parseOfferPayload(offer) || {};
    return normalizeBoard(payload.board || offer.board);
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
})(typeof window !== "undefined" ? window : undefined);

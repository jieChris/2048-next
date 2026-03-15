(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var DEFAULT_API_TIMEOUT_MS = 8000;
  var DEFAULT_RECORD_LIMIT = 200;

  var apiBases = buildApiBaseCandidates();
  var currentLang = readLanguage();
  var targetUserId = 0;
  var targetNicknameHint = "";
  var resolvedProfileNickname = "";
  var isOwnProfile = false;
  var cachedRecords = [];
  var activeModeFilter = "all";
  var expandedRecordId = "";
  var recordDetailCache = Object.create(null);
  var CLOUD_REPLAY_STORAGE_KEY = "cloud_replay_payload_v1";

  var LEADERBOARD_MODE_OPTIONS = [
    { value: "all", zh: "\u5168\u90e8", en: "All" },
    { value: "standard_no_undo", zh: "\u666e\u901a\u65e0\u64a4\u56de", en: "Standard (No Undo)" },
    { value: "standard_undo", zh: "\u53ef\u64a4\u56de", en: "With Undo" },
    { value: "pow2_3x3", zh: "3x3", en: "3x3" },
    { value: "pow2_2x4", zh: "2x4", en: "2x4" },
    { value: "pow2_3x4", zh: "3x4", en: "3x4" },
    { value: "fib_3x3", zh: "\u6590\u6ce2\u90a3\u59513x3", en: "Fibonacci 3x3" }
  ];

  var COPY = {
    zh: {
      pageTitle: "2048 用户主页",
      kicker: "2048 Online Hub",
      title: "用户主页",
      subtitle: "查看该用户有效上传记录，并按时间/分数排序。",
      navHome: "回首页",
      navAccount: "账号中心",
      infoHeading: "基础信息",
      labelName: "昵称：",
      labelCreated: "注册时间：",
      recordHeading: "有效上传记录",
      sortByLabel: "排序字段",
      orderLabel: "排序方向",
      sortByTime: "时间",
      sortByScore: "分数",
      orderDesc: "倒序",
      orderAsc: "正序",
      refreshBtn: "刷新",
      colMode: "模式",
      colScore: "分数",
      colDate: "更新时间",
      mode_standard_no_undo: "普通无撤回",
      mode_standard_undo: "可撤回",
      mode_pow2_3x3: "3x3",
      mode_pow2_2x4: "2x4",
      mode_pow2_3x4: "3x4",
      mode_fib_3x3: "斐波那契3x3",
      loading: "加载中...",
      updated: "记录已更新",
      empty: "该用户暂无有效上传记录",
      invalidUserId: "无效的用户 ID",
      userInfoFail: "用户信息加载失败",
      recordsFail: "用户记录加载失败",
      networkError: "网络异常"
    },
    en: {
      pageTitle: "2048 User Profile",
      kicker: "2048 Online Hub",
      title: "User Profile",
      subtitle: "View valid uploaded records sorted by time or score.",
      navHome: "Home",
      navAccount: "Account",
      infoHeading: "Basic Info",
      labelName: "Nickname:",
      labelCreated: "Created:",
      recordHeading: "Valid Uploaded Records",
      sortByLabel: "Sort By",
      orderLabel: "Order",
      sortByTime: "Time",
      sortByScore: "Score",
      orderDesc: "Desc",
      orderAsc: "Asc",
      refreshBtn: "Refresh",
      colMode: "Mode",
      colScore: "Score",
      colDate: "Updated",
      mode_standard_no_undo: "Standard (No Undo)",
      mode_standard_undo: "With Undo",
      mode_pow2_3x3: "3x3",
      mode_pow2_2x4: "2x4",
      mode_pow2_3x4: "3x4",
      mode_fib_3x3: "Fibonacci 3x3",
      loading: "Loading...",
      updated: "Records updated",
      empty: "No valid uploaded records for this user.",
      invalidUserId: "Invalid user id",
      userInfoFail: "Failed to load user info",
      recordsFail: "Failed to load records",
      networkError: "Network error"
    }
  };

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function parsePositiveInt(value) {
    var parsed = Math.floor(Number(value) || 0);
    return parsed > 0 ? parsed : 0;
  }

  function byId(id) {
    return global.document.getElementById(id);
  }

  function safeGetStorage(key) {
    try {
      return global.localStorage ? global.localStorage.getItem(key) : null;
    } catch (_err) {
      return null;
    }
  }

  function getAuthToken() {
    return toText(safeGetStorage("token")).trim();
  }

  function readLanguage() {
    var raw = toText(safeGetStorage(UI_LANG_STORAGE_KEY)).toLowerCase();
    return raw === "en" ? "en" : "zh";
  }

  function t(key) {
    var lang = currentLang === "en" ? "en" : "zh";
    return (COPY[lang] && COPY[lang][key]) || (COPY.zh && COPY.zh[key]) || "";
  }

  function resolveRecordHeadingText() {
    if (currentLang === "en") return "History Records";
    return "\u5386\u53f2\u8bb0\u5f55";
  }

  function resolveProfileSubtitleText() {
    if (currentLang === "en") return "View user history records sorted by time or score.";
    return "\u67e5\u770b\u8be5\u7528\u6237\u5386\u53f2\u8bb0\u5f55\uff0c\u53ef\u6309\u65f6\u95f4/\u5206\u6570\u6392\u5e8f\u3002";
  }

  function resolveProfilePageTitle() {
    var baseTitle = "\u7528\u6237\u4e3b\u9875";
    if (isOwnProfile) return baseTitle;
    var nickname = toText(resolvedProfileNickname || targetNicknameHint).trim();
    return nickname ? baseTitle + "-" + nickname : baseTitle;
  }

  function applyDocumentTitle() {
    global.document.title = resolveProfilePageTitle();
  }

  function buildApiBaseCandidates() {
    var bases = [];

    function push(base) {
      var normalized = toText(base).trim().replace(/\/+$/, "");
      if (!normalized) return;
      if (bases.indexOf(normalized) >= 0) return;
      bases.push(normalized);
    }

    var explicit = toText(global.GAME_API_BASE_URL).trim();
    if (explicit) push(explicit);

    var locationObj = global.location || {};
    var hostname = toText(locationObj.hostname).toLowerCase();
    var origin = toText(locationObj.origin);
    var isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    var allowCrossOriginFallback = toText(global.GAME_API_ALLOW_CROSS_ORIGIN_FALLBACK).toLowerCase() === "true";

    if (origin) push(origin + "/api");

    if (hostname === "taihe.fun" || hostname === "www.taihe.fun" || isLocalHost || allowCrossOriginFallback) {
      push("https://taihe.fun/api");
    }

    if (bases.length === 0) push("https://taihe.fun/api");
    return bases;
  }

  function resolveApiTimeoutMs() {
    var raw = Number(global.GAME_API_REQUEST_TIMEOUT_MS);
    if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
    return DEFAULT_API_TIMEOUT_MS;
  }

  async function apiRequest(path, options) {
    var opts = options || {};
    var method = toText(opts.method || "GET").toUpperCase();
    var timeoutMs = resolveApiTimeoutMs();
    var lastError = t("networkError");

    for (var i = 0; i < apiBases.length; i += 1) {
      var base = apiBases[i];
      var requestInit = { method: method, headers: {} };
      var requestHeaders = opts.headers && typeof opts.headers === "object" ? opts.headers : null;
      if (requestHeaders) {
        var headerKeys = Object.keys(requestHeaders);
        for (var h = 0; h < headerKeys.length; h += 1) {
          var headerKey = headerKeys[h];
          requestInit.headers[headerKey] = toText(requestHeaders[headerKey]);
        }
      }
      var timeoutHandle = null;
      var controller = null;

      if (typeof global.AbortController === "function") {
        controller = new global.AbortController();
        requestInit.signal = controller.signal;
      }

      try {
        if (controller) {
          timeoutHandle = global.setTimeout(function () {
            try { controller.abort(); } catch (_err) {}
          }, timeoutMs);
        }

        var response = await global.fetch(base + path, requestInit);
        if (timeoutHandle) {
          global.clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        var data = null;
        try {
          data = await response.json();
        } catch (_jsonErr) {
          data = null;
        }

        if (!response.ok) {
          if (!data && i < apiBases.length - 1) continue;
          return data && typeof data === "object" ? data : { error: "HTTP " + response.status };
        }

        if (!data || typeof data !== "object") {
          if (i < apiBases.length - 1) continue;
          return { error: "Invalid response format" };
        }

        return data;
      } catch (error) {
        if (timeoutHandle) {
          global.clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        var errorName = toText(error && error.name).toLowerCase();
        if (errorName === "aborterror") {
          lastError = t("networkError") + ": timeout";
        } else {
          lastError = t("networkError") + ": " + toText(error && error.message);
        }
      }
    }

    return { error: lastError };
  }

  function getUserInfo(userId) {
    var safeUserId = parsePositiveInt(userId);
    if (!safeUserId) return Promise.resolve({ error: t("invalidUserId") });
    return apiRequest("/user/" + encodeURIComponent(String(safeUserId)), { method: "GET" });
  }

  function getMyUserInfo() {
    var token = getAuthToken();
    if (!token) return Promise.resolve(null);
    var requestOptions = {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token
      }
    };
    return apiRequest("/user/me", requestOptions).then(function (result) {
      if (result && result.success) return result;
      var errorText = toText(result && result.error).toLowerCase();
      if (errorText.indexOf("404") === -1 && errorText.indexOf("not found") === -1) {
        return result;
      }
      return apiRequest("/me", requestOptions);
    });
  }

  function getUserRecords(userId, options) {
    var safeUserId = parsePositiveInt(userId);
    if (!safeUserId) return Promise.resolve({ error: t("invalidUserId") });
    var opts = options || {};
    var safeLimit = Math.floor(Number(opts.limit) || DEFAULT_RECORD_LIMIT);
    if (safeLimit <= 0) safeLimit = DEFAULT_RECORD_LIMIT;
    if (safeLimit > 500) safeLimit = 500;
    var safePage = Math.floor(Number(opts.page) || 1);
    if (safePage <= 0) safePage = 1;
    var sortBy = toText(opts.sort_by).toLowerCase() === "score" ? "score" : "time";
    var order = toText(opts.order).toLowerCase() === "asc" ? "asc" : "desc";
    var mode = toText(opts.mode).trim().toLowerCase();

    var path = "/user/" + encodeURIComponent(String(safeUserId)) + "/records";
    path += "?limit=" + encodeURIComponent(String(safeLimit));
    path += "&page=" + encodeURIComponent(String(safePage));
    path += "&sort_by=" + encodeURIComponent(sortBy);
    path += "&order=" + encodeURIComponent(order);
    if (mode && mode !== "all") {
      path += "&mode=" + encodeURIComponent(mode);
    }
    return apiRequest(path, { method: "GET" });
  }

  function setTip(message, type) {
    var tip = byId("user-record-tip");
    if (!tip) return;
    tip.textContent = toText(message);
    tip.classList.remove("ok");
    tip.classList.remove("err");
    if (!message) return;
    if (type === "ok") tip.classList.add("ok");
    if (type === "err") tip.classList.add("err");
  }

  function formatDate(raw) {
    var text = toText(raw).trim();
    return text || "--";
  }

  function resolveRecordDateValue(record) {
    var source = record && typeof record === "object" ? record : {};
    return toText(source.ended_at || source.game_date || source.created_at).trim();
  }

  function parseDateTs(raw) {
    var source = toText(raw).trim();
    if (!source) return 0;
    var normalized = source.replace(" ", "T");
    var ts = Date.parse(normalized);
    if (Number.isFinite(ts)) return ts;
    ts = Date.parse(source);
    return Number.isFinite(ts) ? ts : 0;
  }

  function resolveModeLabel(modeBucket) {
    var key = "mode_" + toText(modeBucket).trim();
    return t(key) || toText(modeBucket).trim() || "--";
  }

  function getModeFilterValue() {
    var mode = toText(byId("user-record-mode") && byId("user-record-mode").value).trim().toLowerCase();
    return mode || "all";
  }

  function resolveModeLabelByValue(value) {
    var key = toText(value).trim();
    for (var i = 0; i < LEADERBOARD_MODE_OPTIONS.length; i += 1) {
      var option = LEADERBOARD_MODE_OPTIONS[i];
      if (option && option.value === key) return currentLang === "en" ? option.en : option.zh;
    }
    return resolveModeLabel(key);
  }

  function isModeMatched(record, modeFilter) {
    var filter = toText(modeFilter).trim().toLowerCase();
    if (!filter || filter === "all") return true;
    return toText(record && record.mode_bucket).trim().toLowerCase() === filter;
  }

  function filterRecordsByMode(records, modeFilter) {
    if (!Array.isArray(records)) return [];
    var out = [];
    for (var i = 0; i < records.length; i += 1) {
      var record = records[i];
      if (!record || typeof record !== "object") continue;
      if (!isModeMatched(record, modeFilter)) continue;
      out.push(record);
    }
    return out;
  }

  function normalizeBoardMatrix(raw) {
    var source = raw;
    if (typeof source === "string") {
      try { source = JSON.parse(source); } catch (_err) { source = []; }
    }
    if (!Array.isArray(source)) return [];
    var rows = [];
    for (var r = 0; r < source.length; r += 1) {
      var rowSource = source[r];
      if (!Array.isArray(rowSource)) continue;
      var row = [];
      for (var c = 0; c < rowSource.length; c += 1) {
        var value = Math.floor(Number(rowSource[c]) || 0);
        row.push(value > 0 ? value : 0);
      }
      if (row.length > 0) rows.push(row);
    }
    return rows;
  }

  function resolveBoardGridSize(boardMatrix) {
    var rows = Array.isArray(boardMatrix) ? boardMatrix.length : 0;
    var cols = 0;
    for (var i = 0; i < rows; i += 1) {
      var row = boardMatrix[i];
      if (!Array.isArray(row)) continue;
      if (row.length > cols) cols = row.length;
    }
    var size = Math.max(rows, cols, 2);
    return size > 8 ? 8 : size;
  }

  function createBoardGridNode(boardMatrix) {
    var matrix = normalizeBoardMatrix(boardMatrix);
    var size = resolveBoardGridSize(matrix);

    var board = global.document.createElement("div");
    board.className = "user-record-board";
    board.style.setProperty("--board-size", String(size));

    for (var r = 0; r < size; r += 1) {
      var row = matrix[r] || [];
      for (var c = 0; c < size; c += 1) {
        var value = Math.floor(Number(row[c]) || 0);
        var cell = global.document.createElement("div");
        cell.className = "user-record-board-cell" + (value > 0 ? "" : " is-empty");
        cell.textContent = value > 0 ? String(value) : "0";
        board.appendChild(cell);
      }
    }
    return board;
  }

  function normalizeRecordDetailPayload(raw, fallbackRecord) {
    var source = raw && typeof raw === "object" ? raw : {};
    var replayString = toText(source.replay_string).trim();
    if (!replayString && source.replay != null) {
      try { replayString = JSON.stringify(source.replay); } catch (_err) { replayString = ""; }
    }
    var finalBoard = source.final_board;
    if (finalBoard == null) finalBoard = source.final_board_json;
    return {
      score: Math.floor(Number(source.score != null ? source.score : fallbackRecord && fallbackRecord.score) || 0),
      mode_bucket: toText(source.mode_bucket || (fallbackRecord && fallbackRecord.mode_bucket)).trim(),
      mode_key: toText(source.mode_key || (fallbackRecord && fallbackRecord.mode_key)).trim(),
      best_tile: Math.floor(Number(source.best_tile != null ? source.best_tile : fallbackRecord && fallbackRecord.best_tile) || 0),
      duration_ms: Math.floor(Number(source.duration_ms != null ? source.duration_ms : fallbackRecord && fallbackRecord.duration_ms) || 0),
      ended_at: toText(source.ended_at || (fallbackRecord && fallbackRecord.ended_at)).trim(),
      replay_string: replayString,
      final_board: normalizeBoardMatrix(finalBoard)
    };
  }

  async function tryFetchReplayEnvelopeFromSignedUrl(url, fallbackRecord) {
    var response = await global.fetch(url, { method: "GET", credentials: "omit" });
    if (!response || !response.ok) throw new Error("Signed replay fetch failed");
    var text = await response.text();
    if (!text) return normalizeRecordDetailPayload({}, fallbackRecord);
    try {
      return normalizeRecordDetailPayload(JSON.parse(text), fallbackRecord);
    } catch (_parseErr) {
      return normalizeRecordDetailPayload({ replay_string: text }, fallbackRecord);
    }
  }

  async function loadRecordDetail(record) {
    var recordId = toText(record && record.id).trim();
    if (!recordId) return { error: "invalid record id" };

    var cached = recordDetailCache[recordId];
    if (cached && !cached.loading) return cached;

    recordDetailCache[recordId] = { loading: true };

    try {
      var result = await apiRequest("/records/" + encodeURIComponent(recordId) + "/replay?download=proxy", { method: "GET" });
      if (!result || !result.success) {
        throw new Error(toText(result && result.error) || "Replay load failed");
      }

      var payload = null;
      if (result.data && typeof result.data === "object") {
        payload = normalizeRecordDetailPayload(result.data, record);
      } else if (toText(result.mode).toLowerCase() === "signed_url" && toText(result.url).trim()) {
        payload = await tryFetchReplayEnvelopeFromSignedUrl(toText(result.url).trim(), record);
      } else {
        payload = normalizeRecordDetailPayload({}, record);
      }

      var detail = Object.assign({ loading: false }, payload);
      recordDetailCache[recordId] = detail;
      return detail;
    } catch (error) {
      var failed = {
        loading: false,
        error: toText(error && error.message) || "Replay load failed"
      };
      recordDetailCache[recordId] = failed;
      return failed;
    }
  }

  function createReplaySessionPayload(record, detail) {
    var replayString = toText(detail && detail.replay_string).trim();
    if (!replayString) return "";
    return JSON.stringify({
      source: "cloud_record",
      id: toText(record && record.id).trim(),
      score: Math.floor(Number(record && record.score) || 0),
      mode_key: toText(record && record.mode_key).trim(),
      mode_bucket: toText(record && record.mode_bucket).trim(),
      ended_at: toText(record && record.ended_at).trim(),
      replay_string: replayString
    });
  }

  function openReplayByRecord(record, detail) {
    var payload = createReplaySessionPayload(record, detail);
    if (!payload) {
      setTip(currentLang === "en" ? "Replay payload is missing." : "\u8be5\u8bb0\u5f55\u7f3a\u5c11\u56de\u653e\u6570\u636e", "err");
      return;
    }
    try {
      if (global.sessionStorage && typeof global.sessionStorage.setItem === "function") {
        global.sessionStorage.setItem(CLOUD_REPLAY_STORAGE_KEY, payload);
      }
    } catch (_err) {}
    global.location.href = "replay.html?cloud_replay=1";
  }

  function createRecordDetailNode(record) {
    var detail = recordDetailCache[toText(record && record.id).trim()];
    var detailHost = global.document.createElement("div");
    detailHost.className = "user-record-detail";

    var card = global.document.createElement("div");
    card.className = "user-record-detail-card";
    detailHost.appendChild(card);

    if (!detail || detail.loading) {
      var loading = global.document.createElement("div");
      loading.className = "user-record-detail-error";
      loading.textContent = currentLang === "en" ? "Loading detail..." : "\u6b63\u5728\u52a0\u8f7d\u8be6\u60c5...";
      card.appendChild(loading);
      if (!detail || !detail.loading) {
        loadRecordDetail(record).then(function () {
          if (expandedRecordId === toText(record && record.id).trim()) applyCurrentSortAndRender();
        });
      }
      return detailHost;
    }

    if (detail.error) {
      var err = global.document.createElement("div");
      err.className = "user-record-detail-error";
      err.textContent = detail.error;
      card.appendChild(err);
      return detailHost;
    }

    var meta = global.document.createElement("div");
    meta.className = "user-record-detail-meta";
    var bestTileText = (currentLang === "en" ? "Best Tile: " : "\u6700\u5927\u683c: ") + String(Math.floor(Number(detail.best_tile) || 0));
    var durationText = (currentLang === "en" ? "Duration: " : "\u7528\u65f6: ") + String(Math.max(0, Math.round((Number(detail.duration_ms) || 0) / 1000))) + "s";
    meta.textContent = bestTileText + " \u00b7 " + durationText;

    var replayBtn = global.document.createElement("button");
    replayBtn.type = "button";
    replayBtn.className = "replay-button user-replay-btn";
    replayBtn.textContent = currentLang === "en" ? "Watch Replay" : "\u67e5\u770b\u56de\u653e";
    replayBtn.addEventListener("click", function (eventLike) {
      if (eventLike && typeof eventLike.stopPropagation === "function") eventLike.stopPropagation();
      openReplayByRecord(record, detail);
    });
    meta.appendChild(replayBtn);
    card.appendChild(meta);
    card.appendChild(createBoardGridNode(detail.final_board));
    return detailHost;
  }

  function createRecordRow(record) {
    var item = global.document.createElement("div");
    item.className = "user-record-item";
    var recordId = toText(record && record.id).trim();
    var isExpanded = !!recordId && recordId === expandedRecordId;
    item.setAttribute("data-open", isExpanded ? "1" : "0");

    var row = global.document.createElement("button");
    row.type = "button";
    row.className = "user-record-row";
    row.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    row.addEventListener("click", function () {
      expandedRecordId = isExpanded ? "" : recordId;
      applyCurrentSortAndRender();
    });

    var mode = global.document.createElement("span");
    mode.className = "user-record-mode";
    mode.textContent = resolveModeLabel(record.mode_bucket);
    row.appendChild(mode);

    var score = global.document.createElement("span");
    score.className = "user-record-score";
    score.textContent = String(Math.floor(Number(record.score) || 0));
    row.appendChild(score);

    var date = global.document.createElement("span");
    date.className = "user-record-date";
    date.textContent = formatDate(resolveRecordDateValue(record));
    row.appendChild(date);

    item.appendChild(row);
    if (isExpanded) item.appendChild(createRecordDetailNode(record));
    return item;
  }

  function renderRecords(records) {
    var list = byId("user-record-list");
    if (!list) return;
    list.innerHTML = "";

    if (!Array.isArray(records) || records.length === 0) {
      expandedRecordId = "";
      var empty = global.document.createElement("div");
      empty.className = "user-record-empty";
      empty.textContent = t("empty");
      list.appendChild(empty);
      return;
    }

    for (var i = 0; i < records.length; i += 1) {
      list.appendChild(createRecordRow(records[i] || {}));
    }
  }

  function sortRecords(records, sortBy, order) {
    var list = Array.isArray(records) ? records.slice() : [];
    var by = sortBy === "score" ? "score" : "time";
    var dir = order === "asc" ? 1 : -1;

    list.sort(function (a, b) {
      var scoreA = Math.floor(Number(a && a.score) || 0);
      var scoreB = Math.floor(Number(b && b.score) || 0);
      var timeA = parseDateTs(resolveRecordDateValue(a));
      var timeB = parseDateTs(resolveRecordDateValue(b));

      if (by === "score") {
        if (scoreA !== scoreB) return dir * (scoreA - scoreB);
        if (timeA !== timeB) return dir * (timeA - timeB);
        return toText(a && a.mode_bucket).localeCompare(toText(b && b.mode_bucket));
      }

      if (timeA !== timeB) return dir * (timeA - timeB);
      if (scoreA !== scoreB) return dir * (scoreA - scoreB);
      return toText(a && a.mode_bucket).localeCompare(toText(b && b.mode_bucket));
    });

    return list;
  }

  function getSortByValue() {
    var sortBy = toText(byId("user-record-sort-by") && byId("user-record-sort-by").value).trim().toLowerCase();
    return sortBy === "score" ? "score" : "time";
  }

  function getOrderValue() {
    var order = toText(byId("user-record-order") && byId("user-record-order").value).trim().toLowerCase();
    return order === "asc" ? "asc" : "desc";
  }

  function applyCurrentSortAndRender() {
    var modeFilter = getModeFilterValue();
    activeModeFilter = modeFilter;
    var filtered = filterRecordsByMode(cachedRecords, modeFilter);
    renderRecords(sortRecords(filtered, getSortByValue(), getOrderValue()));
  }

  function normalizeUserRecordsFromApi(data) {
    if (!Array.isArray(data)) return [];
    var out = [];
    for (var i = 0; i < data.length; i += 1) {
      var item = data[i];
      if (!item || typeof item !== "object") continue;
      out.push({
        id: toText(item.id).trim(),
        user_id: parsePositiveInt(item.user_id),
        mode_bucket: toText(item.mode_bucket).trim(),
        mode_key: toText(item.mode_key).trim(),
        score: Math.floor(Number(item.score) || 0),
        best_tile: Math.floor(Number(item.best_tile) || 0),
        duration_ms: Math.floor(Number(item.duration_ms) || 0),
        end_reason: toText(item.end_reason).trim(),
        ended_at: toText(item.ended_at).trim(),
        created_at: toText(item.created_at).trim()
      });
    }
    return out;
  }

  async function refreshUserInfo() {
    var result = await getUserInfo(targetUserId);
    if (!result || !result.success || !result.data) {
      setTip(toText(result && result.error) || t("userInfoFail"), "err");
      return false;
    }

    var data = result.data || {};
    var nameNode = byId("user-value-name");
    var createdNode = byId("user-value-created");

    resolvedProfileNickname = toText(data.nickname || targetNicknameHint || "").trim();
    if (nameNode) nameNode.textContent = resolvedProfileNickname || "--";
    if (createdNode) createdNode.textContent = formatDate(data.created_at);
    applyDocumentTitle();
    return true;
  }

  async function resolveOwnership() {
    var result = await getMyUserInfo();
    if (!result || !result.success || !result.data) {
      isOwnProfile = false;
      applyDocumentTitle();
      return false;
    }

    var me = result.data || {};
    var myUserId = parsePositiveInt(me.id || me.user_id);
    isOwnProfile = !!myUserId && myUserId === targetUserId;

    if (isOwnProfile && !resolvedProfileNickname) {
      resolvedProfileNickname = toText(me.nickname).trim();
    }
    applyDocumentTitle();
    return isOwnProfile;
  }

  async function refreshRecords() {
    if (!targetUserId) {
      renderRecords([]);
      setTip(t("invalidUserId"), "err");
      return;
    }

    setTip(t("loading"), "");
    var result = await getUserRecords(targetUserId, {
      limit: DEFAULT_RECORD_LIMIT,
      page: 1,
      mode: getModeFilterValue(),
      sort_by: getSortByValue(),
      order: getOrderValue()
    });

    if (!result || !result.success) {
      cachedRecords = [];
      applyCurrentSortAndRender();
      setTip(toText(result && result.error) || t("recordsFail"), "err");
      return;
    }

    cachedRecords = normalizeUserRecordsFromApi(result.data);
    if (expandedRecordId) {
      var exists = false;
      for (var i = 0; i < cachedRecords.length; i += 1) {
        if (toText(cachedRecords[i] && cachedRecords[i].id).trim() === expandedRecordId) {
          exists = true;
          break;
        }
      }
      if (!exists) expandedRecordId = "";
    }
    applyCurrentSortAndRender();

    if (cachedRecords.length === 0) {
      setTip(t("empty"), "");
      return;
    }
    setTip(t("updated"), "ok");
  }

  function applyLanguage() {
    currentLang = readLanguage();
    applyDocumentTitle();

    var textMap = {
      "user-kicker": t("kicker"),
      "user-title": t("title"),
      "user-subtitle": resolveProfileSubtitleText(),
      "user-nav-home": t("navHome"),
      "user-nav-account": t("navAccount"),
      "user-info-heading": t("infoHeading"),
      "user-label-name": t("labelName"),
      "user-label-created": t("labelCreated"),
      "user-record-heading": resolveRecordHeadingText(),
      "user-mode-label": currentLang === "en" ? "Mode" : "\u6a21\u5f0f",
      "user-sort-by-label": t("sortByLabel"),
      "user-order-label": t("orderLabel"),
      "user-record-refresh": t("refreshBtn"),
      "user-col-mode": t("colMode"),
      "user-col-score": t("colScore"),
      "user-col-date": t("colDate")
    };

    var keys = Object.keys(textMap);
    for (var i = 0; i < keys.length; i += 1) {
      var id = keys[i];
      var node = byId(id);
      if (node) node.textContent = textMap[id];
    }

    var sortBySelect = byId("user-record-sort-by");
    if (sortBySelect && sortBySelect.options && sortBySelect.options.length >= 2) {
      sortBySelect.options[0].textContent = t("sortByTime");
      sortBySelect.options[1].textContent = t("sortByScore");
    }

    var modeSelect = byId("user-record-mode");
    if (modeSelect && modeSelect.options) {
      for (var mi = 0; mi < modeSelect.options.length; mi += 1) {
        var modeOptionNode = modeSelect.options[mi];
        var modeValue = toText(modeOptionNode && modeOptionNode.value).trim();
        modeOptionNode.textContent = resolveModeLabelByValue(modeValue);
      }
    }

    var orderSelect = byId("user-record-order");
    if (orderSelect && orderSelect.options && orderSelect.options.length >= 2) {
      orderSelect.options[0].textContent = t("orderDesc");
      orderSelect.options[1].textContent = t("orderAsc");
    }

    applyCurrentSortAndRender();
  }

  function bindEvents() {
    var refreshBtn = byId("user-record-refresh");
    var modeSelect = byId("user-record-mode");
    var sortBySelect = byId("user-record-sort-by");
    var orderSelect = byId("user-record-order");

    if (refreshBtn) refreshBtn.addEventListener("click", refreshRecords);
    if (modeSelect) modeSelect.addEventListener("change", refreshRecords);
    if (sortBySelect) sortBySelect.addEventListener("change", applyCurrentSortAndRender);
    if (orderSelect) orderSelect.addEventListener("change", applyCurrentSortAndRender);

    global.addEventListener("storage", function (eventLike) {
      if (!eventLike) return;
      if (eventLike.key === UI_LANG_STORAGE_KEY) applyLanguage();
    });

    global.addEventListener("uilanguagechange", function () {
      applyLanguage();
    });
  }

  function parseQuery() {
    var params = new global.URLSearchParams(toText(global.location && global.location.search));
    targetUserId = parsePositiveInt(params.get("id"));
    targetNicknameHint = toText(params.get("nickname")).trim();
    resolvedProfileNickname = targetNicknameHint;
  }

  async function init() {
    parseQuery();
    bindEvents();
    applyLanguage();

    var sortBySelect = byId("user-record-sort-by");
    var orderSelect = byId("user-record-order");
    var modeSelect = byId("user-record-mode");
    if (modeSelect && !modeSelect.value) modeSelect.value = "all";
    if (sortBySelect && !sortBySelect.value) sortBySelect.value = "time";
    if (orderSelect && !orderSelect.value) orderSelect.value = "desc";

    if (!targetUserId) {
      applyDocumentTitle();
      renderRecords([]);
      setTip(t("invalidUserId"), "err");
      return;
    }

    var nameNode = byId("user-value-name");
    if (nameNode && targetNicknameHint) nameNode.textContent = targetNicknameHint;
    applyDocumentTitle();

    await resolveOwnership();
    await refreshUserInfo();
    await refreshRecords();
  }

  global.UserProfilePageRuntime = {
    refreshRecords: refreshRecords
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

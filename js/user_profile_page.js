(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var DEFAULT_API_TIMEOUT_MS = 8000;
  var DEFAULT_LEADERBOARD_LIMIT = 500;
  var MODE_BUCKETS = [
    "standard_no_undo",
    "standard_undo",
    "pow2_3x3",
    "pow2_2x4",
    "pow2_3x4",
    "fib_3x3"
  ];

  var apiBases = buildApiBaseCandidates();
  var currentLang = readLanguage();
  var targetUserId = 0;
  var targetNicknameHint = "";
  var cachedRecords = [];

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

  function readLanguage() {
    var raw = toText(safeGetStorage(UI_LANG_STORAGE_KEY)).toLowerCase();
    return raw === "en" ? "en" : "zh";
  }

  function t(key) {
    var lang = currentLang === "en" ? "en" : "zh";
    return (COPY[lang] && COPY[lang][key]) || (COPY.zh && COPY.zh[key]) || "";
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

  function getLeaderboard(limit, modeBucket) {
    var safeLimit = Math.floor(Number(limit) || DEFAULT_LEADERBOARD_LIMIT);
    if (safeLimit <= 0) safeLimit = DEFAULT_LEADERBOARD_LIMIT;

    var path = "/leaderboard?limit=" + encodeURIComponent(String(safeLimit));
    if (modeBucket) path += "&mode=" + encodeURIComponent(String(modeBucket));
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

  function createRecordRow(record) {
    var row = global.document.createElement("div");
    row.className = "user-record-row";

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
    date.textContent = formatDate(record.game_date);
    row.appendChild(date);

    return row;
  }

  function renderRecords(records) {
    var list = byId("user-record-list");
    if (!list) return;
    list.innerHTML = "";

    if (!Array.isArray(records) || records.length === 0) {
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
      var timeA = parseDateTs(a && a.game_date);
      var timeB = parseDateTs(b && b.game_date);

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
    renderRecords(sortRecords(cachedRecords, getSortByValue(), getOrderValue()));
  }

  async function fetchRecordForModeBucket(userId, modeBucket) {
    var result = await getLeaderboard(DEFAULT_LEADERBOARD_LIMIT, modeBucket);
    if (!result || !result.success || !Array.isArray(result.data)) return null;

    for (var i = 0; i < result.data.length; i += 1) {
      var item = result.data[i] || {};
      if (parsePositiveInt(item.user_id) === userId) {
        return {
          user_id: userId,
          nickname: toText(item.nickname).trim(),
          mode_bucket: modeBucket,
          score: Math.floor(Number(item.score) || 0),
          game_date: toText(item.game_date).trim()
        };
      }
    }
    return null;
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

    if (nameNode) nameNode.textContent = toText(data.nickname || targetNicknameHint || "--");
    if (createdNode) createdNode.textContent = formatDate(data.created_at);
    return true;
  }

  async function refreshRecords() {
    if (!targetUserId) {
      renderRecords([]);
      setTip(t("invalidUserId"), "err");
      return;
    }

    setTip(t("loading"), "");
    var records = [];
    var hadError = false;

    var tasks = [];
    for (var i = 0; i < MODE_BUCKETS.length; i += 1) {
      tasks.push(fetchRecordForModeBucket(targetUserId, MODE_BUCKETS[i]));
    }

    var results = await Promise.all(tasks);
    for (var j = 0; j < results.length; j += 1) {
      if (results[j]) records.push(results[j]);
    }

    if (records.length === 0) {
      for (var k = 0; k < MODE_BUCKETS.length; k += 1) {
        var probe = await getLeaderboard(1, MODE_BUCKETS[k]);
        if (!probe || !probe.success) {
          hadError = true;
          break;
        }
      }
    }

    cachedRecords = records;
    applyCurrentSortAndRender();

    if (hadError) {
      setTip(t("recordsFail"), "err");
      return;
    }
    if (records.length === 0) {
      setTip(t("empty"), "");
      return;
    }
    setTip(t("updated"), "ok");
  }

  function applyLanguage() {
    currentLang = readLanguage();
    global.document.title = t("pageTitle");

    var textMap = {
      "user-kicker": t("kicker"),
      "user-title": t("title"),
      "user-subtitle": t("subtitle"),
      "user-nav-home": t("navHome"),
      "user-nav-account": t("navAccount"),
      "user-info-heading": t("infoHeading"),
      "user-label-name": t("labelName"),
      "user-label-created": t("labelCreated"),
      "user-record-heading": t("recordHeading"),
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

    var orderSelect = byId("user-record-order");
    if (orderSelect && orderSelect.options && orderSelect.options.length >= 2) {
      orderSelect.options[0].textContent = t("orderDesc");
      orderSelect.options[1].textContent = t("orderAsc");
    }

    applyCurrentSortAndRender();
  }

  function bindEvents() {
    var refreshBtn = byId("user-record-refresh");
    var sortBySelect = byId("user-record-sort-by");
    var orderSelect = byId("user-record-order");

    if (refreshBtn) refreshBtn.addEventListener("click", refreshRecords);
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
  }

  async function init() {
    parseQuery();
    bindEvents();
    applyLanguage();

    var sortBySelect = byId("user-record-sort-by");
    var orderSelect = byId("user-record-order");
    if (sortBySelect && !sortBySelect.value) sortBySelect.value = "time";
    if (orderSelect && !orderSelect.value) orderSelect.value = "desc";

    if (!targetUserId) {
      renderRecords([]);
      setTip(t("invalidUserId"), "err");
      return;
    }

    var nameNode = byId("user-value-name");
    if (nameNode && targetNicknameHint) nameNode.textContent = targetNicknameHint;

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

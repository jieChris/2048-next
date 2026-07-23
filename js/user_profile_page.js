(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var STORAGE_TOKEN_KEY = "2048_auth_token_v1";
  var STORAGE_USER_ID_KEY = "2048_auth_userId_v1";
  var STORAGE_NICKNAME_KEY = "2048_auth_nickname_v1";
  var DEFAULT_API_TIMEOUT_MS = 12000;
  var AUTH_API_TIMEOUT_MS = 30000;
  var RECORD_REPLAY_API_TIMEOUT_MS = 30000;
  var USER_RECORDS_API_TIMEOUT_MS = 30000;
  var SIGNED_REPLAY_FETCH_TIMEOUT_MS = 30000;
  var DEFAULT_RECORD_LIMIT = 20;
  var BEIJING_TIMEZONE = "Asia/Shanghai";
  var DATETIME_TEXT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
  var beijingDateFormatter = null;

  function resolveLocalStorage() {
    try {
      if (!global || !global.localStorage) return null;
      return global.localStorage;
    } catch (_err) {
      return null;
    }
  }

  function resolveSessionStorage() {
    try {
      if (!global || !global.sessionStorage) return null;
      return global.sessionStorage;
    } catch (_err) {
      return null;
    }
  }

  function readLocalStorageItem(key) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.getItem !== "function") return null;
    try {
      return storage.getItem(key);
    } catch (_err) {
      return null;
    }
  }

  function writeLocalStorageItem(key, value) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.setItem !== "function") return;
    try {
      storage.setItem(key, value);
    } catch (_err) {}
  }

  function removeLocalStorageItem(key) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.removeItem !== "function") return;
    try {
      storage.removeItem(key);
    } catch (_err) {}
  }

  function writeSessionStorageItem(key, value) {
    var storage = resolveSessionStorage();
    if (!storage || typeof storage.setItem !== "function") return;
    try {
      storage.setItem(key, value);
    } catch (_err) {}
  }

  function confirmWithGameDialog(message, options) {
    if (global.GameDialog && typeof global.GameDialog.confirm === "function") {
      return global.GameDialog.confirm(message, options || {});
    }
    return Promise.resolve(typeof global.confirm === "function" ? global.confirm(message) : true);
  }

  // --- localStorage key migration (old bare keys -> namespaced keys) ---
  (function migrateStorageKeys() {
    var migrations = [
      { oldKey: "token",    newKey: "2048_auth_token_v1" },
      { oldKey: "userId",   newKey: "2048_auth_userId_v1" },
      { oldKey: "nickname", newKey: STORAGE_NICKNAME_KEY }
    ];
    try {
      var storage = resolveLocalStorage();
      if (!storage) return;
      for (var i = 0; i < migrations.length; i++) {
        var m = migrations[i];
        var oldVal = readLocalStorageItem(m.oldKey);
        if (oldVal != null && readLocalStorageItem(m.newKey) == null) {
          writeLocalStorageItem(m.newKey, oldVal);
        }
        if (oldVal != null) {
          removeLocalStorageItem(m.oldKey);
        }
      }
    } catch (_err) { /* localStorage unavailable or quota exceeded */ }
  })();

  var apiBases = buildApiBaseCandidates();
  var activeApiBase = "";
  var currentLang = readLanguage();
  var targetUserId = 0;
  var targetNicknameHint = "";
  var resolvedProfileNickname = "";
  var isOwnProfile = false;
  var cachedRecords = [];
  var activeModeFilter = "all";
  var activeRecordVisibility = "active";
  var recordPage = 1;
  var recordTotalPages = 0;
  var recordHasPrev = false;
  var recordHasNext = false;
  var recordsRequestSeq = 0;
  var recordsLoading = false;
  var expandedRecordId = "";
  var recordDetailCache = Object.create(null);
  var summaryTotalRecords = 0;
  var summaryBestScore = 0;
  var summaryBestTile = 0;
  var summaryLastActive = "";
  var summaryModeStats = [];
  var CLOUD_REPLAY_STORAGE_KEY = "cloud_replay_payload_v1";
  var cloudReplayContract = global.CLOUD_REPLAY_CONTRACT && typeof global.CLOUD_REPLAY_CONTRACT === "object"
    ? global.CLOUD_REPLAY_CONTRACT
    : {};
  var CLOUD_REPLAY_PAYLOAD_VERSION = parsePositiveInt(cloudReplayContract.cloud_payload_version) || 2;
  var CLOUD_REPLAY_FILE_VERSION = normalizeReplayFileVersion(cloudReplayContract.replay_file_version) || 1;
  var CLOUD_REPLAY_LOGIC_VERSION = toText(cloudReplayContract.replay_logic_version).trim() || "v1";
  var replayContractCache = {
    payloadVersion: 0,
    replayFileVersion: 0,
    pending: null
  };

  var LEADERBOARD_MODE_OPTIONS = [
    { value: "standard_no_undo", zh: "4x4", en: "4x4" },
    { value: "standard_undo", zh: "4x4", en: "4x4" },
    { value: "pow2_3x3", zh: "3x3", en: "3x3" },
    { value: "pow2_3x3_undo", zh: "3x3", en: "3x3" },
    { value: "pow2_2x4", zh: "4x2", en: "4x2" },
    { value: "pow2_2x4_undo", zh: "4x2", en: "4x2" },
    { value: "pow2_3x4", zh: "4x3", en: "4x3" },
    { value: "pow2_3x4_undo", zh: "4x3", en: "4x3" },
    { value: "pow2_5x5", zh: "5x5", en: "5x5" },
    { value: "pow2_5x5_undo", zh: "5x5", en: "5x5" },
    { value: "diag_3x3", zh: "3x3八方向", en: "3x3 Diagonal" },
    { value: "diag_4x4", zh: "4x4八方向", en: "4x4 Diagonal" },
    { value: "diag_3x4", zh: "4x3八方向", en: "4x3 Diagonal" },
    { value: "diag_2x4", zh: "4x2八方向", en: "4x2 Diagonal" },
    { value: "capped_64", zh: "64封顶", en: "64 Capped" },
    { value: "capped", zh: "2048封顶", en: "2048 Capped" },
    { value: "capped_1024", zh: "1024封顶", en: "1024 Capped" },
    { value: "capped_4096", zh: "4096封顶", en: "4096 Capped" },
    { value: "obstacle_4x4", zh: "障碍块", en: "Obstacle" },
    { value: "fib_4x4", zh: "斐波那契4x4", en: "Fibonacci 4x4" },
    { value: "fib_4x4_undo", zh: "斐波那契4x4", en: "Fibonacci 4x4" },
    { value: "fib_3x3", zh: "斐波那契3x3", en: "Fibonacci 3x3" },
    { value: "fib_3x3_undo", zh: "斐波那契3x3", en: "Fibonacci 3x3" },
    { value: "fib_4x3", zh: "斐波那契4x3", en: "Fibonacci 4x3" },
    { value: "fib_4x3_undo", zh: "斐波那契4x3", en: "Fibonacci 4x3" },
    { value: "fib_4x2", zh: "斐波那契4x2", en: "Fibonacci 4x2" },
    { value: "fib_4x2_undo", zh: "斐波那契4x2", en: "Fibonacci 4x2" }
  ];

    var COPY = {
    zh: {
      pageTitle: "2048 用户主页",
      title: "用户主页",
      navHome: "回首页",
      navAccount: "排行榜",
      navMenu: "菜单",
      navSettings: "账号设置",
      navHistory: "本地历史",
      navReplay: "回放",
      navPalette: "设置",
      navPractice: "练习板",
      navLogout: "退出账号",
      infoHeading: "基础信息",
      labelName: "昵称：",
      labelCreated: "注册时间：",
      recordHeading: "历史记录",
      undoLabel: "撤回",
      undoDisabled: "无撤回",
      undoEnabled: "可撤回",
      sortLabel: "排序字段",
      orderLabel: "顺序",
      visibilityLabel: "记录状态",
      sortByTime: "上传时间",
      sortByScore: "分数",
      sortByBoardSum: "盘面和",
      orderDesc: "倒序",
      orderAsc: "正序",
      visibilityActive: "有效",
      visibilityDeleted: "已删除",
      visibilityAll: "全部",
      refreshBtn: "刷新",
      deleteBtn: "删除记录",
      restoreBtn: "恢复记录",
      exportReplayBtn: "导出回放",
      exportReplayOk: "回放文件已导出",
      exportReplayFail: "导出回放失败",
      deleteConfirm: "确认删除该记录？删除后可在 3 天内恢复。",
      deleting: "正在删除记录...",
      restoring: "正在恢复记录...",
      deleteOk: "记录已删除，可在 3 天内恢复",
      deleteFail: "删除记录失败",
      restoreOk: "记录已恢复",
      restoreFail: "恢复记录失败",
      deletedHint: "已删除，保留 3 天可恢复",
      restoreReplayHint: "已删除记录需恢复后才能查看回放",
      colMode: "模式",
      colScore: "分数",
      colBoardSum: "盘面和",
      colBestTile: "最大方块",
      colDuration: "用时",
      colDate: "更新时间",
      mode_standard_no_undo: "4x4无撤回",
      mode_standard_undo: "4x4可撤回",
      mode_pow2_3x3: "3x3无撤回",
      mode_pow2_3x3_undo: "3x3可撤回",
      mode_pow2_2x4: "4x2无撤回",
      mode_pow2_2x4_undo: "4x2可撤回",
      mode_pow2_3x4: "4x3无撤回",
      mode_pow2_3x4_undo: "4x3可撤回",
      mode_pow2_5x5: "5x5无撤回",
      mode_pow2_5x5_undo: "5x5可撤回",
      mode_diag_3x3: "3x3八方向",
      mode_diag_4x4: "4x4八方向",
      mode_diag_3x4: "4x3八方向",
      mode_diag_2x4: "4x2八方向",
      mode_capped_64: "64封顶",
      mode_capped: "2048封顶",
      mode_capped_1024: "1024封顶",
      mode_capped_4096: "4096封顶",
      mode_obstacle_4x4: "障碍块",
      mode_fib_4x4: "斐波那契4x4无撤回",
      mode_fib_4x4_undo: "斐波那契4x4可撤回",
      mode_fib_3x3: "斐波那契3x3无撤回",
      mode_fib_3x3_undo: "斐波那契3x3可撤回",
      mode_fib_4x3: "斐波那契4x3无撤回",
      mode_fib_4x3_undo: "斐波那契4x3可撤回",
      mode_fib_4x2: "斐波那契4x2无撤回",
      mode_fib_4x2_undo: "斐波那契4x2可撤回",
      loading: "加载中...",
      updated: "记录已更新",
      empty: "该用户暂无可显示记录",
      invalidUserId: "无效的用户 ID",
      userInfoFail: "用户信息加载失败",
      recordsFail: "用户记录加载失败",
      networkError: "网络异常",
      summaryTotalLabel: "总记录数",
      summaryMostPlayedLabel: "最常玩",
      summaryRecordCountLabel: "记录数",
      summaryBestScoreLabel: "最高分",
      summaryBestTileLabel: "最大方块",
      summaryLastActiveLabel: "最近活跃",
      summaryAriaLabel: "用户摘要",
      summaryPreviewEmpty: "暂无云端记录",
      navMedals: "勋章墙"
    },
    en: {
      pageTitle: "2048 User Profile",
      title: "User Profile",
      navHome: "Home",
      navAccount: "Leaderboard",
      navMenu: "Menu",
      navSettings: "Account Settings",
      navHistory: "Local History",
      navReplay: "Replay",
      navPalette: "Settings",
      navPractice: "Practice",
      navLogout: "Sign Out",
      infoHeading: "Basic Info",
      labelName: "Nickname:",
      labelCreated: "Created:",
      recordHeading: "History Records",
      undoLabel: "Undo",
      undoDisabled: "No Undo",
      undoEnabled: "Undo",
      sortLabel: "Sort By",
      orderLabel: "Order",
      visibilityLabel: "Status",
      sortByTime: "Upload Time",
      sortByScore: "Score",
      sortByBoardSum: "Board Sum",
      orderDesc: "Descending",
      orderAsc: "Ascending",
      visibilityActive: "Active",
      visibilityDeleted: "Deleted",
      visibilityAll: "All",
      refreshBtn: "Refresh",
      deleteBtn: "Delete Record",
      restoreBtn: "Restore Record",
      exportReplayBtn: "Export Replay",
      exportReplayOk: "Replay file exported",
      exportReplayFail: "Failed to export replay",
      deleteConfirm: "Delete this record? It can be restored within 3 days.",
      deleting: "Deleting record...",
      restoring: "Restoring record...",
      deleteOk: "Record deleted. You can restore within 3 days.",
      deleteFail: "Failed to delete record",
      restoreOk: "Record restored",
      restoreFail: "Failed to restore record",
      deletedHint: "Deleted (recoverable within 3 days)",
      restoreReplayHint: "Restore this deleted record to view its replay.",
      colMode: "Mode",
      colScore: "Score",
      colBoardSum: "Board Sum",
      colBestTile: "Best Tile",
      colDuration: "Duration",
      colDate: "Updated",
      mode_standard_no_undo: "4x4 (No Undo)",
      mode_standard_undo: "4x4 (Undo)",
      mode_pow2_3x3: "3x3 (No Undo)",
      mode_pow2_3x3_undo: "3x3 (Undo)",
      mode_pow2_2x4: "4x2 (No Undo)",
      mode_pow2_2x4_undo: "4x2 (Undo)",
      mode_pow2_3x4: "4x3 (No Undo)",
      mode_pow2_3x4_undo: "4x3 (Undo)",
      mode_pow2_5x5: "5x5 (No Undo)",
      mode_pow2_5x5_undo: "5x5 (Undo)",
      mode_diag_3x3: "3x3 Diagonal",
      mode_diag_4x4: "4x4 Diagonal",
      mode_diag_3x4: "4x3 Diagonal",
      mode_diag_2x4: "4x2 Diagonal",
      mode_capped_64: "64 Capped",
      mode_capped: "2048 Capped",
      mode_capped_1024: "1024 Capped",
      mode_capped_4096: "4096 Capped",
      mode_obstacle_4x4: "Obstacle",
      mode_fib_4x4: "Fibonacci 4x4 (No Undo)",
      mode_fib_4x4_undo: "Fibonacci 4x4 (Undo)",
      mode_fib_3x3: "Fibonacci 3x3 (No Undo)",
      mode_fib_3x3_undo: "Fibonacci 3x3 (Undo)",
      mode_fib_4x3: "Fibonacci 4x3 (No Undo)",
      mode_fib_4x3_undo: "Fibonacci 4x3 (Undo)",
      mode_fib_4x2: "Fibonacci 4x2 (No Undo)",
      mode_fib_4x2_undo: "Fibonacci 4x2 (Undo)",
      loading: "Loading...",
      updated: "Records updated",
      empty: "No records to show for this user.",
      invalidUserId: "Invalid user id",
      userInfoFail: "Failed to load user info",
      recordsFail: "Failed to load records",
      networkError: "Network error",
      summaryTotalLabel: "Total Records",
      summaryMostPlayedLabel: "Most Played",
      summaryRecordCountLabel: "Records",
      summaryBestScoreLabel: "Best Score",
      summaryBestTileLabel: "Best Tile",
      summaryLastActiveLabel: "Last Active",
      summaryAriaLabel: "User summary",
      summaryPreviewEmpty: "No cloud records yet",
      navMedals: "Medals"
    }
  };

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function parsePositiveInt(value) {
    var parsed = Math.floor(Number(value) || 0);
    return parsed > 0 ? parsed : 0;
  }

  function normalizeReplayFileVersion(value) {
    var parsed = Math.floor(Number(value) || 0);
    return parsed > 0 ? parsed : 0;
  }

  function byId(id) {
    return global.document.getElementById(id);
  }

  function safeGetStorage(key) {
    return readLocalStorageItem(key);
  }

  function getAuthToken() {
    return toText(safeGetStorage(STORAGE_TOKEN_KEY)).trim();
  }

  function getStoredUserId() {
    return parsePositiveInt(safeGetStorage(STORAGE_USER_ID_KEY));
  }

  function getStoredNickname() {
    return toText(safeGetStorage(STORAGE_NICKNAME_KEY)).trim();
  }

  function readLanguage() {
    var raw = toText(safeGetStorage(UI_LANG_STORAGE_KEY)).toLowerCase();
    return raw === "en" ? "en" : "zh";
  }

  function t(key) {
    var lang = currentLang === "en" ? "en" : "zh";
    return (COPY[lang] && COPY[lang][key]) || (COPY.zh && COPY.zh[key]) || "";
  }

  function setI18nReady(ready) {
    var body = global.document && global.document.body;
    if (!body || typeof body.setAttribute !== "function") return;
    body.setAttribute("data-i18n-ready", ready ? "1" : "0");
  }

  function resolveRecordHeadingText() {
    if (currentLang === "en") return "History Records";
    return "\u5386\u53f2\u8bb0\u5f55";
  }

  function resolveProfilePageTitle() {
    var baseTitle = currentLang === "en" ? "User Profile" : "\u7528\u6237\u4e3b\u9875";
    if (currentLang === "en") return baseTitle;
    if (isOwnProfile) return baseTitle;
    var nickname = toText(resolvedProfileNickname || targetNicknameHint).trim();
    return nickname ? baseTitle + "-" + nickname : baseTitle;
  }

  function applyDocumentTitle() {
    global.document.title = resolveProfilePageTitle();
  }

  var DEFAULT_REMOTE_API_BASE_URL = "https://2048next.cn/api";

  function normalizeApiBase(base) {
    return toText(base).trim().replace(/\/+$/, "");
  }

  function isLocalDevelopmentHostname(hostname) {
    var host = toText(hostname).toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.indexOf("127.") === 0
    );
  }

  function shouldUseRemoteApiFallback(hostname, allowCrossOriginFallback) {
    var host = toText(hostname).toLowerCase();
    if (allowCrossOriginFallback) return true;
    if (host === "2048next.cn" || host === "www.2048next.cn") return true;
    return !!host && !isLocalDevelopmentHostname(host);
  }

  function shouldUseSameOriginApi(hostname) {
    var host = toText(hostname).toLowerCase();
    return host !== "taihe.fun" && host !== "www.taihe.fun";
  }

  function buildApiBaseCandidates() {
    var bases = [];

    function push(base) {
      var normalized = normalizeApiBase(base);
      if (!normalized) return;
      if (bases.indexOf(normalized) >= 0) return;
      bases.push(normalized);
    }

    var explicit = toText(global.GAME_API_BASE_URL).trim();
    if (explicit) push(explicit);

    var locationObj = global.location || {};
    var hostname = toText(locationObj.hostname).toLowerCase();
    var origin = toText(locationObj.origin);
    var allowCrossOriginFallback = toText(global.GAME_API_ALLOW_CROSS_ORIGIN_FALLBACK).toLowerCase() === "true";
    var remoteFallback = normalizeApiBase(global.GAME_API_FALLBACK_BASE_URL) || DEFAULT_REMOTE_API_BASE_URL;

    if (/^https?:\/\//i.test(origin) && shouldUseSameOriginApi(hostname)) push(origin + "/api");

    if (shouldUseRemoteApiFallback(hostname, allowCrossOriginFallback)) {
      push(remoteFallback);
    }

    if (bases.length === 0) push(remoteFallback);
    return bases;
  }

  function resolveApiTimeoutMs() {
    var raw = Number(global.GAME_API_REQUEST_TIMEOUT_MS);
    if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
    return DEFAULT_API_TIMEOUT_MS;
  }

  function callFetch(url, requestInit) {
    if (!global || typeof global["fetch"] !== "function") {
      return Promise.reject(new Error("fetch_unavailable"));
    }
    return global["fetch"](url, requestInit);
  }

  async function apiRequest(path, options) {
    var opts = options || {};
    var method = toText(opts.method || "GET").toUpperCase();
    var timeoutMs = Math.floor(Number(opts.timeoutMs) || 0);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) timeoutMs = resolveApiTimeoutMs();
    var lastError = t("networkError");

    for (var i = 0; i < apiBases.length; i += 1) {
      var base = apiBases[i];
      var headers = opts.headers && typeof opts.headers === "object" ? Object.assign({}, opts.headers) : {};
      var requestInit = {
        method: method,
        headers: headers
      };
      var timeoutHandle = null;
      var controller = null;

      if (typeof global.AbortController === "function") {
        controller = new global.AbortController();
        requestInit.signal = controller.signal;
      }

      if (opts.auth) {
        var token = getAuthToken();
        if (token) requestInit.headers.Authorization = "Bearer " + token;
      }

      if (opts.body !== undefined) {
        requestInit.headers["Content-Type"] = "application/json";
        requestInit.body = JSON.stringify(opts.body);
      }
      var allowFallback = method === "GET" && !requestInit.headers.Authorization;

      try {
        if (controller) {
          timeoutHandle = global.setTimeout(function () {
            try { controller.abort(); } catch (_err) {}
          }, timeoutMs);
        }

        var response = await callFetch(base + path, requestInit);
        if (timeoutHandle) {
          global.clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        var contentType = toText(
          response && response.headers && typeof response.headers.get === "function"
            ? response.headers.get("content-type")
            : ""
        ).toLowerCase();

        var data = null;
        try {
          data = await response.json();
        } catch (_jsonErr) {
          data = null;
        }

        if (!response.ok) {
          if (!data && allowFallback && i < apiBases.length - 1) continue;
          if (data && typeof data === "object") return data;
          return { error: "HTTP " + response.status };
        }

        if (!data || typeof data !== "object") {
          var origin = toText(global.location && global.location.origin).trim().replace(/\/+$/, "");
          var normalizedBase = toText(base).trim().replace(/\/+$/, "");
          var isSameOriginApiBase = !!origin && normalizedBase === origin + "/api";
          if (contentType.indexOf("text/html") >= 0 && isSameOriginApiBase && apiBases.length === 1) {
            return { error: t("apiNotConfigured") || "API not configured" };
          }
          if (allowFallback && i < apiBases.length - 1) continue;
          return { error: "Invalid response format" };
        }

        activeApiBase = base;
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
        if (!allowFallback) break;
      }
    }

    return { error: lastError };
  }

  function resolveReplayContractMismatchMessage(kind, expected, actual) {
    var expectedText = String(expected);
    var actualText = actual > 0 ? String(actual) : (currentLang === "en" ? "missing" : "\u7f3a\u5931");
    if (currentLang === "en") {
      if (kind === "payload") {
        return "Replay payload version mismatch (expected " + expectedText + ", got " + actualText + "). Please refresh and retry.";
      }
      return "Replay file version mismatch (expected " + expectedText + ", got " + actualText + "). Please refresh and retry.";
    }
    if (kind === "payload") {
      return "\u56de\u653e\u8f7d\u8377\u7248\u672c\u4e0d\u5339\u914d\uff08\u671f\u671b " + expectedText + "\uff0c\u5b9e\u9645 " + actualText + "\uff09\uff0c\u8bf7\u5237\u65b0\u540e\u91cd\u8bd5\u3002";
    }
    return "\u56de\u653e\u6587\u4ef6\u7248\u672c\u4e0d\u5339\u914d\uff08\u671f\u671b " + expectedText + "\uff0c\u5b9e\u9645 " + actualText + "\uff09\uff0c\u8bf7\u5237\u65b0\u540e\u91cd\u8bd5\u3002";
  }

  function resolveReplayContractField(source, fieldNames) {
    if (!source || !fieldNames || !fieldNames.length) return "";
    for (var i = 0; i < fieldNames.length; i += 1) {
      var key = fieldNames[i];
      var value = source[key];
      if (value != null && toText(value).trim()) return value;
    }
    return "";
  }

  function parseReplayPayloadVersionFromApiResult(result) {
    var raw = resolveReplayContractField(result, [
      "cloud_payload_version",
      "cloudPayloadVersion",
      "payload_version",
      "payloadVersion"
    ]);
    return parsePositiveInt(raw);
  }

  function parseReplayFileVersionFromApiResult(result) {
    var raw = resolveReplayContractField(result, [
      "replay_file_version",
      "replayFileVersion",
      "file_version",
      "fileVersion"
    ]);
    return normalizeReplayFileVersion(raw);
  }

  function buildLocalReplayContractFallback() {
    replayContractCache.payloadVersion = CLOUD_REPLAY_PAYLOAD_VERSION;
    replayContractCache.replayFileVersion = CLOUD_REPLAY_FILE_VERSION;
    return {
      payloadVersion: CLOUD_REPLAY_PAYLOAD_VERSION,
      replayFileVersion: CLOUD_REPLAY_FILE_VERSION
    };
  }

  async function fetchReplayContractFromApi() {
    if (replayContractCache.payloadVersion > 0 && replayContractCache.replayFileVersion > 0) {
      return {
        payloadVersion: replayContractCache.payloadVersion,
        replayFileVersion: replayContractCache.replayFileVersion
      };
    }
    if (replayContractCache.pending) return replayContractCache.pending;

    replayContractCache.pending = (async function () {
      var result = await apiRequest("/replay/version", {
        method: "GET",
        timeoutMs: DEFAULT_API_TIMEOUT_MS
      });
      if (result && result.error) {
        // Replay contract endpoint may be missing on some deployments.
        // In that case, fall back to local contract constants instead of blocking replay.
        return buildLocalReplayContractFallback();
      }

      var replayFileVersion = parseReplayFileVersionFromApiResult(result);
      var payloadVersion = parseReplayPayloadVersionFromApiResult(result);

      if (!replayFileVersion || !payloadVersion) {
        return buildLocalReplayContractFallback();
      }

      replayContractCache.payloadVersion = payloadVersion;
      replayContractCache.replayFileVersion = replayFileVersion;
      return {
        payloadVersion: payloadVersion,
        replayFileVersion: replayFileVersion
      };
    })().finally(function () {
      replayContractCache.pending = null;
    });

    return replayContractCache.pending;
  }

  async function ensureReplayContractAligned(expectedReplayFileVersion) {
    var expectedFileVersion = normalizeReplayFileVersion(expectedReplayFileVersion) || CLOUD_REPLAY_FILE_VERSION;
    var contract = await fetchReplayContractFromApi();
    var apiPayloadVersion = parsePositiveInt(contract && contract.payloadVersion);
    var apiReplayFileVersion = normalizeReplayFileVersion(contract && contract.replayFileVersion);
    if (apiPayloadVersion !== CLOUD_REPLAY_PAYLOAD_VERSION) {
      throw new Error(resolveReplayContractMismatchMessage("payload", CLOUD_REPLAY_PAYLOAD_VERSION, apiPayloadVersion));
    }
    if (apiReplayFileVersion !== expectedFileVersion) {
      throw new Error(resolveReplayContractMismatchMessage("file", expectedFileVersion, apiReplayFileVersion));
    }
  }

  function getUserInfo(userId) {
    var safeUserId = parsePositiveInt(userId);
    if (!safeUserId) return Promise.resolve({ error: t("invalidUserId") });
    return apiRequest("/user/" + encodeURIComponent(String(safeUserId)), { method: "GET" });
  }

  function getMyUserInfo() {
    var token = getAuthToken();
    if (!token) return Promise.resolve(null);
    return (async function () {
      var requestOptions = {
        method: "GET",
        auth: true,
        timeoutMs: AUTH_API_TIMEOUT_MS
      };

      var result = await apiRequest("/user/me", requestOptions);
      if (result && result.success && result.data) return result;

      if (isTimeoutLikeText(toText(result && result.error))) {
        result = await apiRequest("/user/me", requestOptions);
        if (result && result.success && result.data) return result;
      }

      var errorText = toText(result && result.error).toLowerCase();
      var shouldFallback =
        !result ||
        !result.success ||
        !result.data ||
        errorText.indexOf("404") >= 0 ||
        errorText.indexOf("not found") >= 0;
      if (!shouldFallback) return result;

      var fallback = await apiRequest("/me", requestOptions);
      if (fallback && fallback.success && fallback.data) return fallback;
      if (isTimeoutLikeText(toText(fallback && fallback.error))) {
        fallback = await apiRequest("/me", requestOptions);
        if (fallback && fallback.success && fallback.data) return fallback;
      }
      return fallback || result;
    })();
  }

  async function resolveTargetUserFromSession() {
    if (targetUserId) return true;
    if (!getAuthToken()) return false;

    var storedUserId = getStoredUserId();
    if (storedUserId) {
      targetUserId = storedUserId;
      targetNicknameHint = getStoredNickname();
      resolvedProfileNickname = targetNicknameHint;
      return true;
    }

    var result = await getMyUserInfo();
    if (!result || !result.success || !result.data) return false;

    var me = result.data || {};
    var resolvedUserId = parsePositiveInt(me.id || me.user_id);
    if (!resolvedUserId) return false;

    targetUserId = resolvedUserId;
    targetNicknameHint = toText(me.nickname).trim();
    resolvedProfileNickname = targetNicknameHint;
    writeLocalStorageItem(STORAGE_USER_ID_KEY, String(resolvedUserId));
    if (targetNicknameHint) {
      writeLocalStorageItem(STORAGE_NICKNAME_KEY, targetNicknameHint);
    }
    return true;
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
    var requestedSortBy = toText(opts.sort_by).toLowerCase();
    var sortBy = requestedSortBy === "score" || requestedSortBy === "board_sum" ? requestedSortBy : "time";
    var order = toText(opts.order).toLowerCase() === "asc" ? "asc" : "desc";
    var mode = toText(opts.mode).trim().toLowerCase();
    var status = toText(opts.status).trim().toLowerCase();

    var path = "/user/" + encodeURIComponent(String(safeUserId)) + "/records";
    path += "?page_size=" + encodeURIComponent(String(safeLimit));
    path += "&limit=" + encodeURIComponent(String(safeLimit));
    path += "&page=" + encodeURIComponent(String(safePage));
    path += "&sort_by=" + encodeURIComponent(sortBy);
    path += "&order=" + encodeURIComponent(order);
    if (mode && mode !== "all") {
      path += "&mode=" + encodeURIComponent(mode);
    }
    if (status === "deleted" || status === "all" || status === "active") {
      path += "&status=" + encodeURIComponent(status);
    }
    return apiRequest(path, { method: "GET", timeoutMs: USER_RECORDS_API_TIMEOUT_MS });
  }

  function getUserStats(userId) {
    var safeUserId = parsePositiveInt(userId);
    if (!safeUserId) return Promise.resolve({ error: t("invalidUserId") });
    return apiRequest("/user/" + encodeURIComponent(String(safeUserId)) + "/stats", {
      method: "GET",
      timeoutMs: USER_RECORDS_API_TIMEOUT_MS
    });
  }

  function deleteUserRecord(recordId) {
    var id = toText(recordId).trim();
    if (!id) return Promise.resolve({ error: "invalid record id" });
    var token = getAuthToken();
    if (!token) return Promise.resolve({ error: "Unauthorized", code: "UNAUTHORIZED" });
    return apiRequest("/records/" + encodeURIComponent(id), {
      method: "DELETE",
      auth: true
    });
  }

  function restoreUserRecord(recordId) {
    var id = toText(recordId).trim();
    if (!id) return Promise.resolve({ error: "invalid record id" });
    var token = getAuthToken();
    if (!token) return Promise.resolve({ error: "Unauthorized", code: "UNAUTHORIZED" });
    return apiRequest("/records/" + encodeURIComponent(id) + "/restore", {
      method: "POST",
      auth: true
    });
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

  function resolvePagerMeta(result, fallbackPage, pageSize, itemCount) {
    var page = Math.floor(Number(fallbackPage) || 1);
    if (page <= 0) page = 1;
    var size = Math.floor(Number(pageSize) || DEFAULT_RECORD_LIMIT);
    if (size <= 0) size = DEFAULT_RECORD_LIMIT;
    var count = Math.max(0, Math.floor(Number(itemCount) || 0));

    var pagination = (result && (result.pagination || result.page_info || result.meta)) || {};
    var rawPage = Math.floor(
      Number(
        pagination.page != null ? pagination.page :
        pagination.current_page != null ? pagination.current_page :
        result && result.page != null ? result.page :
        result && result.current_page != null ? result.current_page :
        page
      ) || page
    );
    if (rawPage <= 0) rawPage = page;

    var rawTotal = Math.floor(
      Number(
        pagination.total != null ? pagination.total :
        pagination.total_count != null ? pagination.total_count :
        pagination.record_count != null ? pagination.record_count :
        result && result.total != null ? result.total :
        result && result.total_count != null ? result.total_count :
        result && result.record_count != null ? result.record_count :
        0
      ) || 0
    );
    if (rawTotal < 0) rawTotal = 0;
    var rawLimit = Math.floor(
      Number(
        pagination.limit != null ? pagination.limit :
        pagination.page_size != null ? pagination.page_size :
        result && result.limit != null ? result.limit :
        result && result.page_size != null ? result.page_size :
        size
      ) || size
    );
    if (rawLimit <= 0) rawLimit = size;

    var rawTotalPages = Math.floor(
      Number(
        pagination.total_pages != null ? pagination.total_pages :
        pagination.pages != null ? pagination.pages :
        pagination.page_count != null ? pagination.page_count :
        result && result.total_pages != null ? result.total_pages :
        result && result.pages != null ? result.pages :
        result && result.page_count != null ? result.page_count :
        0
      ) || 0
    );
    if (rawTotalPages <= 0 && rawTotal > 0) {
      rawTotalPages = Math.ceil(rawTotal / rawLimit);
    }
    if (rawTotalPages < 0) rawTotalPages = 0;

    var hasPrev = typeof pagination.has_prev === "boolean" ? pagination.has_prev : rawPage > 1;
    var hasNext = typeof pagination.has_next === "boolean"
      ? pagination.has_next
      : (rawTotalPages > 0 ? rawPage < rawTotalPages : count >= size);

    return {
      page: rawPage,
      totalPages: rawTotalPages,
      totalCount: rawTotal,
      hasPrev: !!hasPrev,
      hasNext: !!hasNext
    };
  }

  function resolveRecordPageText(page, totalPages) {
    var safePage = Math.max(1, Math.floor(Number(page) || 1));
    var safeTotal = Math.max(0, Math.floor(Number(totalPages) || 0));
    if (currentLang === "en") {
      return safeTotal > 0 ? "Page " + safePage + "/" + safeTotal : "Page " + safePage;
    }
    return safeTotal > 0 ? "第" + safePage + "/" + safeTotal + "页" : "第" + safePage + "页";
  }

  function syncRecordPagerUi() {
    var pageNode = byId("user-record-page");
    if (pageNode) pageNode.textContent = resolveRecordPageText(recordPage, recordTotalPages);
    var prevBtn = byId("user-record-prev");
    var nextBtn = byId("user-record-next");
    if (prevBtn) prevBtn.disabled = !recordHasPrev;
    if (nextBtn) nextBtn.disabled = !recordHasNext;
  }

  function resolveBeijingDateFormatter() {
    if (beijingDateFormatter) return beijingDateFormatter;
    try {
      beijingDateFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: BEIJING_TIMEZONE,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (_err) {
      beijingDateFormatter = null;
    }
    return beijingDateFormatter;
  }

  function formatTimestampInBeijing(ts) {
    if (!Number.isFinite(ts) || ts <= 0) return "";

    var formatter = resolveBeijingDateFormatter();
    if (formatter && typeof formatter.formatToParts === "function") {
      var parts = formatter.formatToParts(new Date(ts));
      var map = Object.create(null);
      for (var i = 0; i < parts.length; i += 1) {
        var part = parts[i];
        if (part && part.type && part.type !== "literal") map[part.type] = part.value;
      }
      if (map.year && map.month && map.day && map.hour && map.minute && map.second) {
        return map.year + "-" + map.month + "-" + map.day + " " + map.hour + ":" + map.minute + ":" + map.second;
      }
    }

    // Fallback: manually shift to UTC+8 and format in UTC fields.
    var shifted = new Date(ts + 8 * 60 * 60 * 1000);
    var year = shifted.getUTCFullYear();
    var month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
    var day = String(shifted.getUTCDate()).padStart(2, "0");
    var hour = String(shifted.getUTCHours()).padStart(2, "0");
    var minute = String(shifted.getUTCMinutes()).padStart(2, "0");
    var second = String(shifted.getUTCSeconds()).padStart(2, "0");
    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
  }

  function parseUtcDatetimeText(raw) {
    var text = toText(raw).trim();
    var normalized = text
      .replace("T", " ")
      .replace(/\.\d+$/i, "")
      .replace(/\.\d+Z$/i, "Z");
    var match = normalized.match(DATETIME_TEXT_PATTERN);
    if (!match) return 0;
    var year = Number(match[1]);
    var month = Number(match[2]) - 1;
    var day = Number(match[3]);
    var hour = Number(match[4]);
    var minute = Number(match[5]);
    var second = Number(match[6]);
    return Date.UTC(year, month, day, hour, minute, second);
  }

  function formatDate(raw) {
    var text = toText(raw).trim();
    if (!text) return "--";

    // Backend often returns `YYYY-MM-DD HH:mm:ss` as UTC; convert to Beijing time explicitly.
    var hasExplicitTimezone = /Z$/i.test(text) || /[+-]\d{2}:?\d{2}$/i.test(text);
    var ts = hasExplicitTimezone ? parseDateTs(text) : parseUtcDatetimeText(text);
    if (!Number.isFinite(ts) || ts <= 0) {
      ts = parseDateTs(text);
    }
    if (!Number.isFinite(ts) || ts <= 0) return text;
    return formatTimestampInBeijing(ts) || text;
  }

  function formatDurationHms(durationMsLike) {
    var totalSeconds = Math.max(0, Math.floor(Number(durationMsLike) / 1000) || 0);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  function resolveRecordDateValue(record) {
    var source = record && typeof record === "object" ? record : {};
    return toText(source.created_at || source.ended_at || source.game_date).trim();
  }

  function resolveRecordDateLabelText() {
    return currentLang === "en" ? "Uploaded At" : "\u4e0a\u4f20\u65f6\u95f4";
  }

  function syncRecordDateLabel() {
    var node = byId("user-col-date");
    if (!node) return;
    node.textContent = resolveRecordDateLabelText();
  }

  function parseDateTs(raw) {
    var source = toText(raw).trim();
    if (!source) return 0;

    var utcTs = parseUtcDatetimeText(source);
    if (Number.isFinite(utcTs) && utcTs > 0) return utcTs;

    var normalized = source.replace(" ", "T");
    var ts = Date.parse(normalized);
    if (Number.isFinite(ts)) return ts;
    ts = Date.parse(source);
    return Number.isFinite(ts) ? ts : 0;
  }

  function isDeletedRecord(record) {
    return toText(record && record.deleted_at).trim().length > 0;
  }

  function resolveModeLabel(modeBucket) {
    var key = "mode_" + toText(modeBucket).trim();
    return t(key) || toText(modeBucket).trim() || "--";
  }

  function resolveRecordModeLabel(record) {
    var source = record && typeof record === "object" ? record : {};
    var modeKey = toText(source.mode_key).trim();
    var modeBucket = toText(source.mode_bucket).trim();
    if (currentLang !== "en") {
      if (modeKey === "standard_4x4_pow2_no_undo" || modeKey === "classic_no_undo" || modeBucket === "standard_no_undo") {
        return "4x4\uff08\u4e0d\u53ef\u64a4\u56de\uff09";
      }
      if (modeKey === "classic_4x4_pow2_undo" || modeBucket === "standard_undo") {
        return "4x4\u53ef\u64a4\u56de";
      }
    }
    if (currentLang === "en") {
      if (modeKey === "standard_4x4_pow2_no_undo" || modeKey === "classic_no_undo" || modeBucket === "standard_no_undo") {
        return "4x4 (No Undo)";
      }
      if (modeKey === "classic_4x4_pow2_undo" || modeBucket === "standard_undo") {
        return "4x4 Undo";
      }
    }
    return resolveModeLabel(modeBucket || modeKey);
  }

  function normalizeModeBucketFromKey(modeKey) {
    var key = toText(modeKey).trim();
    if (key === "standard_4x4_pow2_no_undo" || key === "classic_no_undo") return "standard_no_undo";
    if (key === "classic_4x4_pow2_undo") return "standard_undo";
    return key;
  }

  function normalizeSummaryModeStats(rawStats) {
    if (!Array.isArray(rawStats)) return [];
    var out = [];
    for (var i = 0; i < rawStats.length; i += 1) {
      var source = rawStats[i];
      if (!source || typeof source !== "object") continue;
      var modeBucket = toText(source.mode_bucket || source.mode).trim();
      var modeKey = toText(source.mode_key).trim();
      if (!modeBucket) modeBucket = normalizeModeBucketFromKey(modeKey);
      var recordCount = parsePositiveInt(source.record_count || source.total_records || source.records || source.count);
      out.push({
        mode_bucket: modeBucket,
        mode_key: modeKey,
        record_count: recordCount,
        best_score: parsePositiveInt(source.best_score || source.max_score),
        best_tile: parsePositiveInt(source.best_tile || source.max_tile),
        latest_record_at: toText(source.latest_record_at || source.last_record_at || source.updated_at).trim()
      });
    }
    return out;
  }

  function findSummaryModeStats(modeFilter) {
    var filter = toText(modeFilter).trim().toLowerCase();
    if (!filter || filter === "all") return null;
    for (var i = 0; i < summaryModeStats.length; i += 1) {
      var item = summaryModeStats[i];
      if (toText(item && item.mode_bucket).trim().toLowerCase() === filter) return item;
    }
    return null;
  }

  function findMostPlayedModeStats() {
    var best = null;
    for (var i = 0; i < summaryModeStats.length; i += 1) {
      var item = summaryModeStats[i];
      if (!item || !item.record_count) continue;
      if (!best || item.record_count > best.record_count) {
        best = item;
        continue;
      }
      if (best && item.record_count === best.record_count) {
        var itemTime = parseDateTs(item.latest_record_at);
        var bestTime = parseDateTs(best.latest_record_at);
        if (itemTime > bestTime) best = item;
      }
    }
    return best;
  }

  function formatGameCount(count) {
    var safeCount = parsePositiveInt(count);
    if (currentLang === "en") return safeCount === 1 ? "1 game" : String(safeCount) + " games";
    return String(safeCount) + "\u5c40";
  }

  function escapeHtml(text) {
    return toText(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getUndoFilterValue() {
    var value = toText(byId("user-record-undo") && byId("user-record-undo").value).trim().toLowerCase();
    return value === "undo" ? "undo" : "no_undo";
  }

  function getModeFilterValue() {
    var mode = toText(byId("user-record-mode") && byId("user-record-mode").value).trim().toLowerCase();
    return mode || "standard_no_undo";
  }

  function getRecordVisibilityValue() {
    var visibility = toText(byId("user-record-visibility") && byId("user-record-visibility").value).trim().toLowerCase();
    if (visibility === "all" || visibility === "deleted") return visibility;
    return "active";
  }

  function updateVisibilityControl() {
    var field = byId("user-record-visibility-field");
    var label = byId("user-visibility-label");
    var select = byId("user-record-visibility");
    if (!label || !select) return;
    var visible = !!isOwnProfile;
    if (field) field.hidden = !visible;
    if (!visible) {
      activeRecordVisibility = "active";
      select.value = "active";
    }
  }

  function refreshModeSelectOptions() {
    var modeSelect = byId("user-record-mode");
    if (!modeSelect) return;

    var previousValue = getModeFilterValue();
    var undoEnabled = getUndoFilterValue() === "undo";
    modeSelect.innerHTML = "";

    for (var i = 0; i < LEADERBOARD_MODE_OPTIONS.length; i += 1) {
      var optionDef = LEADERBOARD_MODE_OPTIONS[i];
      var optionIsUndo = optionDef.value === "standard_undo" || (
        optionDef.value !== "standard_no_undo" && optionDef.value.slice(-5) === "_undo"
      );
      if (optionIsUndo !== undoEnabled) continue;
      var optionEl = global.document.createElement("option");
      optionEl.value = optionDef.value;
      optionEl.textContent = currentLang === "en" ? optionDef.en : optionDef.zh;
      modeSelect.appendChild(optionEl);
    }

    modeSelect.value = previousValue;
    if (!modeSelect.value && modeSelect.options.length > 0) modeSelect.selectedIndex = 0;
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
        row.push(value);
      }
      if (row.length > 0) rows.push(row);
    }
    return rows;
  }

  function normalizeHistoryRecordViaRuntime(raw, fallbackRecord) {
    var runtime = global.CoreGameSettingsStorageRuntime;
    if (!runtime || typeof runtime.normalizeHistoryRecordFromContext !== "function") {
      return null;
    }
    var source = raw && typeof raw === "object" ? raw : {};
    var fallback = fallbackRecord && typeof fallbackRecord === "object" ? fallbackRecord : null;
    var candidate = {};
    if (fallback) {
      candidate.mode = toText(fallback.mode || fallback.mode_bucket).trim();
      candidate.mode_key = toText(fallback.mode_key).trim();
      candidate.board_width = fallback.board_width;
      candidate.board_sum = fallback.board_sum;
      candidate.board_height = fallback.board_height;
      candidate.score = fallback.score;
      candidate.best_tile = fallback.best_tile;
      candidate.duration_ms = fallback.duration_ms;
      candidate.ended_at = fallback.ended_at;
      candidate.end_reason = fallback.end_reason;
      if (fallback.final_board != null) candidate.final_board = fallback.final_board;
      if (fallback.replay_string != null) candidate.replay_string = fallback.replay_string;
      if (fallback.replay != null) candidate.replay = fallback.replay;
      if (fallback.id != null) candidate.id = fallback.id;
    }
    if (source.mode != null || source.mode_bucket != null) {
      candidate.mode = toText(source.mode || source.mode_bucket).trim();
    }
    if (source.mode_key != null) candidate.mode_key = toText(source.mode_key).trim();
    if (source.board_width != null) candidate.board_width = source.board_width;
    if (source.board_sum != null) candidate.board_sum = source.board_sum;
    if (source.board_height != null) candidate.board_height = source.board_height;
    if (source.score != null) candidate.score = source.score;
    if (source.best_tile != null) candidate.best_tile = source.best_tile;
    if (source.duration_ms != null) candidate.duration_ms = source.duration_ms;
    if (source.ended_at != null) candidate.ended_at = source.ended_at;
    if (source.end_reason != null) candidate.end_reason = source.end_reason;
    if (source.final_board != null) candidate.final_board = source.final_board;
    if (source.replay_string != null) candidate.replay_string = source.replay_string;
    if (source.replay != null) candidate.replay = source.replay;
    if (source.id != null) candidate.id = source.id;
    try {
      return runtime.normalizeHistoryRecordFromContext({
        record: candidate,
        nowIso: function () { return ""; },
        idFactory: function () { return ""; }
      });
    } catch (_err) {
      return null;
    }
  }

  function resolveBoardDims(boardMatrix) {
    var rowCount = Array.isArray(boardMatrix) ? boardMatrix.length : 0;
    var cols = 0;
    for (var i = 0; i < rowCount; i += 1) {
      var row = boardMatrix[i];
      if (!Array.isArray(row)) continue;
      if (row.length > cols) cols = row.length;
    }
    return {
      rows: Math.max(0, rowCount),
      cols: Math.max(0, cols)
    };
  }

  function computePreviewBoardLayout(cols, rows, boardSize, baseGap) {
    if (cols === 4 && rows === 4) {
      var cell44 = (boardSize - baseGap * (cols - 1)) / cols;
      return {
        gap: baseGap,
        cell: cell44,
        gridWidth: cols * cell44 + (cols - 1) * baseGap,
        gridHeight: rows * cell44 + (rows - 1) * baseGap
      };
    }

    var cellByRows = (boardSize - baseGap * (rows - 1)) / rows;
    var cellByCols = (boardSize - baseGap * (cols - 1)) / cols;
    var cell = Math.min(cellByRows, cellByCols);
    if (rows === 3 && cols === 3) cell = cellByCols;
    if (!isFinite(cell) || cell < 10) cell = 10;

    return {
      gap: baseGap,
      cell: cell,
      gridWidth: cols * cell + (cols - 1) * baseGap,
      gridHeight: rows * cell + (rows - 1) * baseGap
    };
  }

  function computePreviewTileFontSize(value, cell, cols, rows) {
    var safeCell = Number(cell) || 0;
    if (!Number.isFinite(safeCell) || safeCell <= 0) safeCell = 56;
    var digits = String(Math.max(0, Math.floor(Math.abs(Number(value) || 0)))).length;
    var maxDim = Math.max(Number(cols) || 4, Number(rows) || 4);

    var boardScale = 1;
    if (maxDim >= 7) boardScale = 0.74;
    else if (maxDim >= 6) boardScale = 0.81;
    else if (maxDim >= 5) boardScale = 0.9;

    var digitScale = 1;
    if (digits === 3) digitScale = 0.84;
    if (digits === 4) digitScale = 0.72;
    if (digits >= 5) digitScale = 0.6;

    var raw = safeCell * 0.48 * boardScale * digitScale;
    var minSize = Math.max(11, Math.floor(safeCell * 0.22));
    var maxSize = Math.max(minSize, Math.floor(safeCell * 0.62));
    return Math.max(minSize, Math.min(maxSize, Math.round(raw)));
  }

  function isStoneValue(value) {
    return Number(value) < 0;
  }

  function resolvePreviewTileClasses(value, x, y) {
    var classes = ["tile"];
    var numericValue = Math.floor(Math.abs(Number(value) || 0));
    classes.push("tile-" + (numericValue || 0));
    classes.push("tile-position-" + String(x + 1) + "-" + String(y + 1));
    if (isStoneValue(value)) {
      classes.push("tile-stone");
    } else if (numericValue > 2048) {
      classes.push("tile-super");
    }
    return classes.join(" ");
  }

  function createBoardGridNode(boardMatrix) {
    var matrix = normalizeBoardMatrix(boardMatrix);
    var dims = resolveBoardDims(matrix);
    var rows = dims.rows;
    var cols = dims.cols;
    if (rows <= 0 || cols <= 0) {
      var empty = global.document.createElement("div");
      empty.className = "user-record-detail-error";
      empty.textContent = currentLang === "en" ? "No final board data." : "\u65e0\u6700\u7ec8\u76d8\u9762\u6570\u636e";
      return empty;
    }
    var maxDim = Math.max(rows, cols);
    var baseGap = maxDim >= 5 ? 6 : 8;
    var boardSize = Math.max(180, Math.min(300, maxDim * 60 + (maxDim - 1) * baseGap));
    var layout = computePreviewBoardLayout(cols, rows, boardSize, baseGap);
    var framePadding = 8;

    var wrap = global.document.createElement("div");
    wrap.className = "user-mini-board-wrap";

    var board = global.document.createElement("div");
    board.className = "game-container user-mini-game";
    board.style.width = String(Math.round(layout.gridWidth + framePadding * 2)) + "px";
    board.style.height = String(Math.round(layout.gridHeight + framePadding * 2)) + "px";

    var gridContainer = global.document.createElement("div");
    gridContainer.className = "grid-container";
    gridContainer.style.left = "50%";
    gridContainer.style.top = "50%";
    gridContainer.style.width = String(Math.round(layout.gridWidth)) + "px";
    gridContainer.style.height = String(Math.round(layout.gridHeight)) + "px";
    gridContainer.style.transform = "translate(-50%, -50%)";
    board.appendChild(gridContainer);

    var tileContainer = global.document.createElement("div");
    tileContainer.className = "tile-container";
    tileContainer.style.left = "50%";
    tileContainer.style.top = "50%";
    tileContainer.style.width = String(Math.round(layout.gridWidth)) + "px";
    tileContainer.style.height = String(Math.round(layout.gridHeight)) + "px";
    tileContainer.style.transform = "translate(-50%, -50%)";
    board.appendChild(tileContainer);

    for (var y = 0; y < rows; y += 1) {
      var rowEl = global.document.createElement("div");
      rowEl.className = "grid-row";
      rowEl.style.marginBottom = y === rows - 1 ? "0" : (String(Math.round(layout.gap)) + "px");
      for (var x = 0; x < cols; x += 1) {
        var bgCell = global.document.createElement("div");
        bgCell.className = "grid-cell";
        bgCell.style.width = String(Math.round(layout.cell)) + "px";
        bgCell.style.height = String(Math.round(layout.cell)) + "px";
        bgCell.style.marginRight = x === cols - 1 ? "0" : (String(Math.round(layout.gap)) + "px");
        rowEl.appendChild(bgCell);
      }
      gridContainer.appendChild(rowEl);
    }

    for (var r = 0; r < rows; r += 1) {
      var row = matrix[r] || [];
      for (var c = 0; c < cols; c += 1) {
        var value = Math.floor(Number(row[c]) || 0);
        if (!isStoneValue(value) && value <= 0) continue;

        var tile = global.document.createElement("div");
        tile.setAttribute("class", resolvePreviewTileClasses(value, c, r));
        tile.style.width = String(Math.round(layout.cell)) + "px";
        tile.style.height = String(Math.round(layout.cell)) + "px";
        tile.style.transform = "translate(" + String(Math.round(c * (layout.cell + layout.gap))) + "px, " + String(Math.round(r * (layout.cell + layout.gap))) + "px)";

        var inner = global.document.createElement("div");
        inner.className = "tile-inner";
        inner.style.width = String(Math.round(layout.cell)) + "px";
        inner.style.height = String(Math.round(layout.cell)) + "px";
        inner.style.lineHeight = String(Math.round(layout.cell)) + "px";
        inner.style.fontSize = String(computePreviewTileFontSize(value, layout.cell, cols, rows)) + "px";
        inner.textContent = isStoneValue(value) ? "" : String(Math.floor(Math.abs(value)));
        tile.appendChild(inner);
        tileContainer.appendChild(tile);
      }
    }

    wrap.appendChild(board);
    return wrap;
  }

  function normalizeRecordDetailPayload(raw, fallbackRecord) {
    var source = raw && typeof raw === "object" ? raw : {};
    var fallback = fallbackRecord && typeof fallbackRecord === "object" ? fallbackRecord : null;
    var normalized = normalizeHistoryRecordViaRuntime(source, fallbackRecord);
    if (normalized) {
      var normalizedReplayString = toText(normalized.replay_string).trim();
      var normalizedReplayObject = normalized && typeof normalized.replay === "object" && normalized.replay
        ? normalized.replay
        : (source && typeof source.replay === "object" && source.replay ? source.replay : null);
      if (!normalizedReplayString && normalized.replay != null) {
        try { normalizedReplayString = JSON.stringify(normalized.replay); } catch (_err) { normalizedReplayString = ""; }
      }
      var replayFileVersion = normalizeReplayFileVersion(
        source.replay_file_version ||
        normalized.replay_file_version ||
        (fallback && fallback.replay_file_version)
      );
      return {
        score: Math.floor(Number(normalized.score) || 0),
        mode_bucket: toText(source.mode_bucket || (fallback && fallback.mode_bucket) || normalized.mode).trim(),
        mode_key: toText(source.mode_key || (fallback && fallback.mode_key) || normalized.mode_key).trim(),
        board_width: parsePositiveInt(source.board_width || normalized.board_width || (fallback && fallback.board_width)),
        board_height: parsePositiveInt(source.board_height || normalized.board_height || (fallback && fallback.board_height)),
        best_tile: Math.floor(Number(normalized.best_tile) || 0),
        duration_ms: Math.floor(Number(normalized.duration_ms) || 0),
        ended_at: toText(source.ended_at || normalized.ended_at || (fallback && fallback.ended_at)).trim(),
        replay_string: normalizedReplayString,
        replay: normalizedReplayObject,
        replay_file_version: replayFileVersion,
        final_board: normalizeBoardMatrix(normalized.final_board)
      };
    }

    var replayString = toText(source.replay_string).trim();
    var replayObject = source && typeof source.replay === "object" && source.replay
      ? source.replay
      : (fallbackRecord && typeof fallbackRecord.replay === "object" && fallbackRecord.replay ? fallbackRecord.replay : null);
    if (!replayString && source.replay != null) {
      try { replayString = JSON.stringify(source.replay); } catch (_err) { replayString = ""; }
    }
    var finalBoard = source.final_board;
    return {
      score: Math.floor(Number(source.score != null ? source.score : fallbackRecord && fallbackRecord.score) || 0),
      mode_bucket: toText(source.mode_bucket || (fallbackRecord && fallbackRecord.mode_bucket)).trim(),
      mode_key: toText(source.mode_key || (fallbackRecord && fallbackRecord.mode_key)).trim(),
      board_width: parsePositiveInt(source.board_width || (fallbackRecord && fallbackRecord.board_width)),
      board_height: parsePositiveInt(source.board_height || (fallbackRecord && fallbackRecord.board_height)),
      best_tile: Math.floor(Number(source.best_tile != null ? source.best_tile : fallbackRecord && fallbackRecord.best_tile) || 0),
      duration_ms: Math.floor(Number(source.duration_ms != null ? source.duration_ms : fallbackRecord && fallbackRecord.duration_ms) || 0),
      ended_at: toText(source.ended_at || (fallbackRecord && fallbackRecord.ended_at)).trim(),
      replay_string: replayString,
      replay: replayObject,
      replay_file_version: normalizeReplayFileVersion(source.replay_file_version || (fallbackRecord && fallbackRecord.replay_file_version)),
      final_board: normalizeBoardMatrix(finalBoard)
    };
  }

  function hasBoardCells(boardMatrix) {
    var matrix = normalizeBoardMatrix(boardMatrix);
    for (var y = 0; y < matrix.length; y += 1) {
      var row = Array.isArray(matrix[y]) ? matrix[y] : [];
      for (var x = 0; x < row.length; x += 1) {
        if (Math.floor(Number(row[x]) || 0) !== 0) return true;
      }
    }
    return false;
  }

  function buildLocalRecordDetailFallback(record) {
    var payload = normalizeRecordDetailPayload(record, record);
    var replayString = toText(payload && payload.replay_string).trim();
    var hasReplayObject = !!(payload && payload.replay && typeof payload.replay === "object");
    var hasReplay = !!replayString || hasReplayObject;
    var hasBoard = hasBoardCells(payload && payload.final_board);
    if (!hasReplay && !hasBoard) return null;
    return Object.assign({ loading: false }, payload);
  }

  async function tryFetchReplayEnvelopeFromSignedUrl(url, fallbackRecord) {
    var controller = typeof global.AbortController === "function" ? new global.AbortController() : null;
    var timeoutHandle = null;
    if (controller) {
      timeoutHandle = global.setTimeout(function () {
        try { controller.abort(); } catch (_err) {}
      }, SIGNED_REPLAY_FETCH_TIMEOUT_MS);
    }

    var response = null;
    try {
      response = await callFetch(url, {
        method: "GET",
        credentials: "omit",
        signal: controller ? controller.signal : undefined
      });
    } finally {
      if (timeoutHandle) {
        global.clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
    }

    if (!response || !response.ok) throw new Error("Signed replay fetch failed");
    var text = await response.text();
    if (!text) return normalizeRecordDetailPayload({}, fallbackRecord);
    try {
      return normalizeRecordDetailPayload(JSON.parse(text), fallbackRecord);
    } catch (_parseErr) {
      return normalizeRecordDetailPayload({ replay_string: text }, fallbackRecord);
    }
  }

  function isTimeoutLikeText(textLike) {
    var text = toText(textLike).toLowerCase();
    if (!text) return false;
    return text.indexOf("timeout") >= 0 || text.indexOf("\u8d85\u65f6") >= 0;
  }

  function isNotFoundLikeText(textLike) {
    var text = toText(textLike).toLowerCase();
    if (!text) return false;
    return (
      text.indexOf("404") >= 0 ||
      text.indexOf("not found") >= 0 ||
      text.indexOf("record not found") >= 0 ||
      text.indexOf("\u4e0d\u5b58\u5728") >= 0
    );
  }

  function buildRecordReplayPath(recordId, downloadMode) {
    var path = "/records/" + encodeURIComponent(recordId) + "/replay";
    var mode = toText(downloadMode).trim().toLowerCase();
    if (mode === "signed_url" || mode === "proxy") {
      path += "?download=" + encodeURIComponent(mode);
    }
    return path;
  }

  async function requestRecordReplay(recordId, downloadMode) {
    return await apiRequest(buildRecordReplayPath(recordId, downloadMode), {
      method: "GET",
      timeoutMs: RECORD_REPLAY_API_TIMEOUT_MS
    });
  }

  async function resolveReplayPayloadFromApiResult(result, record) {
    if (!result || !result.success) {
      throw new Error(toText(result && result.error) || "Replay load failed");
    }

    if (result.data && typeof result.data === "object") {
      var replayFileVersion = normalizeReplayFileVersion(result.replay_file_version);
      var normalizedData = result.data;
      if (replayFileVersion > 0 && normalizedData.replay_file_version == null) {
        normalizedData = Object.assign({}, normalizedData, { replay_file_version: replayFileVersion });
      }
      return normalizeRecordDetailPayload(normalizedData, record);
    }

    if (toText(result.mode).toLowerCase() === "signed_url" && toText(result.url).trim()) {
      return await tryFetchReplayEnvelopeFromSignedUrl(toText(result.url).trim(), record);
    }

    return normalizeRecordDetailPayload({}, record);
  }

  async function loadRecordDetail(record) {
    var recordId = toText(record && record.id).trim();
    if (!recordId) return { error: "invalid record id" };

    var cached = recordDetailCache[recordId];
    if (isDeletedRecord(record)) {
      var deletedDetail = Object.assign({ loading: false }, normalizeRecordDetailPayload(record, record));
      recordDetailCache[recordId] = deletedDetail;
      return deletedDetail;
    }

    if (cached && !cached.loading) return cached;

    var eagerLocalDetail = buildLocalRecordDetailFallback(record);
    if (eagerLocalDetail) {
      recordDetailCache[recordId] = eagerLocalDetail;
      return eagerLocalDetail;
    }

    recordDetailCache[recordId] = { loading: true };

    try {
      var lastErrorText = "";
      // Prefer proxy first for browser compatibility (avoid signed-url CORS issues),
      // then fall back to backend default mode and explicit signed_url mode.
      var attempts = ["proxy", "", "signed_url"];
      for (var i = 0; i < attempts.length; i += 1) {
        var mode = attempts[i];
        var result = null;
        try {
          result = await requestRecordReplay(recordId, mode);
        } catch (requestError) {
          var requestErrorText = toText(requestError && requestError.message);
          if (isNotFoundLikeText(requestErrorText)) {
            lastErrorText = currentLang === "en"
              ? "Replay data is unavailable for this record."
              : "\u8be5\u8bb0\u5f55\u7684\u56de\u653e\u6570\u636e\u4e0d\u5b58\u5728\u6216\u5df2\u88ab\u6e05\u7406";
          } else {
            lastErrorText = requestErrorText || lastErrorText;
          }
          continue;
        }

        if (!result || !result.success) {
          var errorText = toText(result && result.error).trim();
          if (errorText) {
            if (isNotFoundLikeText(errorText)) {
              lastErrorText = currentLang === "en"
                ? "Replay data is unavailable for this record."
                : "\u8be5\u8bb0\u5f55\u7684\u56de\u653e\u6570\u636e\u4e0d\u5b58\u5728\u6216\u5df2\u88ab\u6e05\u7406";
            } else {
              lastErrorText = errorText;
            }
          }
          continue;
        }

        try {
          var payload = await resolveReplayPayloadFromApiResult(result, record);
          var detail = Object.assign({ loading: false }, payload);
          recordDetailCache[recordId] = detail;
          return detail;
        } catch (resolveError) {
          lastErrorText = toText(resolveError && resolveError.message) || lastErrorText;
        }
      }

      var localDetailFallback = buildLocalRecordDetailFallback(record);
      if (localDetailFallback) {
        recordDetailCache[recordId] = localDetailFallback;
        return localDetailFallback;
      }

      if (isTimeoutLikeText(lastErrorText)) {
        throw new Error(currentLang === "en" ? "Replay load timed out" : "\u56de\u653e\u52a0\u8f7d\u8d85\u65f6");
      }
      throw new Error(lastErrorText || "Replay load failed");
    } catch (error) {
      var localDetail = buildLocalRecordDetailFallback(record);
      if (localDetail) {
        recordDetailCache[recordId] = localDetail;
        return localDetail;
      }
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
    var replayObject = detail && detail.replay && typeof detail.replay === "object" ? detail.replay : null;
    if (!replayString && !replayObject) return "";
    var replayFileVersion = normalizeReplayFileVersion(
      (detail && detail.replay_file_version) || (record && record.replay_file_version) || CLOUD_REPLAY_FILE_VERSION
    );
    return JSON.stringify({
      source: "cloud_record",
      cloud_payload_version: CLOUD_REPLAY_PAYLOAD_VERSION,
      replay_file_version: replayFileVersion,
      replay_logic_version: CLOUD_REPLAY_LOGIC_VERSION,
      id: toText(record && record.id).trim(),
      score: Math.floor(Number(record && record.score) || 0),
      mode_key: toText((detail && detail.mode_key) || (record && record.mode_key)).trim(),
      mode_bucket: toText((detail && detail.mode_bucket) || (record && record.mode_bucket)).trim(),
      board_width: parsePositiveInt((detail && detail.board_width) || (record && record.board_width)),
      board_height: parsePositiveInt((detail && detail.board_height) || (record && record.board_height)),
      ended_at: toText((detail && detail.ended_at) || (record && record.ended_at)).trim(),
      replay_string: replayString,
      replay: replayObject
    });
  }

  function buildReplayExportFilename(record) {
    var rawId = toText(record && record.id).trim() || "unknown";
    var safeId = rawId.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
    return "2048-record-" + safeId + "-replay.json";
  }

  function downloadTextFile(filename, textContent, mimeType) {
    if (!global.Blob || !global.URL || typeof global.URL.createObjectURL !== "function") return false;
    var documentLike = global.document;
    if (!documentLike || typeof documentLike.createElement !== "function" || !documentLike.body) return false;
    var blob = new global.Blob([toText(textContent)], { type: mimeType || "application/json;charset=utf-8" });
    var objectUrl = "";
    var anchor = null;
    try {
      objectUrl = global.URL.createObjectURL(blob);
      anchor = documentLike.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.style.display = "none";
      documentLike.body.appendChild(anchor);
      anchor.click();
      documentLike.body.removeChild(anchor);
      global.URL.revokeObjectURL(objectUrl);
      return true;
    } catch (_error) {
      if (anchor && anchor.parentNode) {
        try { anchor.parentNode.removeChild(anchor); } catch (_removeError) {}
      }
      if (objectUrl && typeof global.URL.revokeObjectURL === "function") {
        try { global.URL.revokeObjectURL(objectUrl); } catch (_revokeError) {}
      }
      return false;
    }
  }

  function exportReplayByRecord(record, detail) {
    var payload = createReplaySessionPayload(record, detail);
    if (!payload) {
      setTip(currentLang === "en" ? "Replay payload is missing." : "\u8be5\u8bb0\u5f55\u7f3a\u5c11\u56de\u653e\u6570\u636e", "err");
      return false;
    }
    var ok = downloadTextFile(buildReplayExportFilename(record), payload, "application/json;charset=utf-8");
    setTip(ok ? t("exportReplayOk") : t("exportReplayFail"), ok ? "ok" : "err");
    return ok;
  }

  async function openReplayByRecord(record, detail) {
    var replayFileVersion = normalizeReplayFileVersion(
      (detail && detail.replay_file_version) || (record && record.replay_file_version) || CLOUD_REPLAY_FILE_VERSION
    );
    try {
      await ensureReplayContractAligned(replayFileVersion);
    } catch (versionError) {
      setTip(toText(versionError && versionError.message) || (currentLang === "en" ? "Replay version check failed" : "\u56de\u653e\u7248\u672c\u6821\u9a8c\u5931\u8d25"), "err");
      return;
    }

    var payload = createReplaySessionPayload(record, detail);
    if (!payload) {
      setTip(currentLang === "en" ? "Replay payload is missing." : "\u8be5\u8bb0\u5f55\u7f3a\u5c11\u56de\u653e\u6570\u636e", "err");
      return;
    }
    writeSessionStorageItem(CLOUD_REPLAY_STORAGE_KEY, payload);
    if (typeof global.open === "function") {
      global.open("replay.html?cloud_replay=1", "_blank");
      return;
    }
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
    var durationText = (currentLang === "en" ? "Duration: " : "\u7528\u65f6: ") + formatDurationHms(detail.duration_ms);
    var metaText = bestTileText + " \u00b7 " + durationText;
    if (isDeletedRecord(record)) {
      metaText += " \u00b7 " + t("deletedHint");
    }
    meta.textContent = metaText;

    var actions = global.document.createElement("div");
    actions.className = "user-record-detail-actions";

    if (!isDeletedRecord(record)) {
      var replayBtn = global.document.createElement("button");
      replayBtn.type = "button";
      replayBtn.className = "replay-button user-replay-btn";
      replayBtn.textContent = currentLang === "en" ? "Watch Replay" : "\u67e5\u770b\u56de\u653e";
      replayBtn.addEventListener("click", function (eventLike) {
        if (eventLike && typeof eventLike.stopPropagation === "function") eventLike.stopPropagation();
        openReplayByRecord(record, detail).catch(function (error) {
          setTip(toText(error && error.message) || (currentLang === "en" ? "Replay open failed" : "\u6253\u5f00\u56de\u653e\u5931\u8d25"), "err");
        });
      });
      actions.appendChild(replayBtn);

      var exportReplayBtn = global.document.createElement("button");
      exportReplayBtn.type = "button";
      exportReplayBtn.className = "replay-button user-replay-export-btn";
      exportReplayBtn.textContent = t("exportReplayBtn");
      exportReplayBtn.addEventListener("click", function (eventLike) {
        if (eventLike && typeof eventLike.stopPropagation === "function") eventLike.stopPropagation();
        exportReplayByRecord(record, detail);
      });
      actions.appendChild(exportReplayBtn);
    }

    if (isOwnProfile) {
      if (isDeletedRecord(record)) {
        var restoreBtn = global.document.createElement("button");
        restoreBtn.type = "button";
        restoreBtn.className = "replay-button user-record-action-btn";
        restoreBtn.textContent = t("restoreBtn");
        restoreBtn.addEventListener("click", function (eventLike) {
          if (eventLike && typeof eventLike.stopPropagation === "function") eventLike.stopPropagation();
          setTip(t("restoring"), "");
          restoreUserRecord(record.id).then(function (result) {
            if (result && result.success) {
              setTip(t("restoreOk"), "ok");
              updateCachedRecordAfterRestore(record.id);
              return;
            }
            setTip(toText(result && result.error) || t("restoreFail"), "err");
          }).catch(function (error) {
            setTip(toText(error && error.message) || t("restoreFail"), "err");
          });
        });
        actions.appendChild(restoreBtn);
      } else {
        var deleteBtn = global.document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "replay-button user-record-action-btn user-danger-btn";
        deleteBtn.textContent = t("deleteBtn");
        deleteBtn.addEventListener("click", function (eventLike) {
          if (eventLike && typeof eventLike.stopPropagation === "function") eventLike.stopPropagation();
          confirmWithGameDialog(t("deleteConfirm"), { kind: "danger" }).then(function (confirmed) {
            if (!confirmed) return;
            setTip(t("deleting"), "");
            deleteUserRecord(record.id).then(function (result) {
              if (result && result.success) {
                setTip(t("deleteOk"), "ok");
                updateCachedRecordAfterDelete(record.id);
                return;
              }
              setTip(toText(result && result.error) || t("deleteFail"), "err");
            }).catch(function (error) {
              setTip(toText(error && error.message) || t("deleteFail"), "err");
            });
          });
        });
        actions.appendChild(deleteBtn);
      }
    }

    meta.appendChild(actions);
    card.appendChild(meta);
    if (isDeletedRecord(record)) {
      var deletedReplayHint = global.document.createElement("div");
      deletedReplayHint.className = "user-record-detail-error";
      deletedReplayHint.textContent = t("restoreReplayHint");
      card.appendChild(deletedReplayHint);
      return detailHost;
    }
    card.appendChild(createBoardGridNode(detail.final_board));
    return detailHost;
  }

  function createRecordRow(record) {
    var item = global.document.createElement("div");
    item.className = "user-record-item";
    if (isDeletedRecord(record)) {
      item.classList.add("is-deleted");
    }
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
    mode.textContent = resolveRecordModeLabel(record);
    row.appendChild(mode);

    var score = global.document.createElement("span");
    score.className = "user-record-score";
    score.setAttribute("data-label", t("colScore"));
    score.textContent = String(Math.floor(Number(record.score) || 0));
    row.appendChild(score);

    var boardSum = global.document.createElement("span");
    boardSum.className = "user-record-board-sum";
    boardSum.setAttribute("data-label", t("colBoardSum"));
    boardSum.textContent = String(Math.max(0, Math.floor(Number(record.board_sum) || 0)));
    row.appendChild(boardSum);

    var bestTile = global.document.createElement("span");
    bestTile.className = "user-record-best-tile";
    bestTile.setAttribute("data-label", t("colBestTile"));
    bestTile.textContent = String(Math.floor(Number(record.best_tile) || 0));
    row.appendChild(bestTile);

    var duration = global.document.createElement("span");
    duration.className = "user-record-duration";
    duration.setAttribute("data-label", t("colDuration"));
    duration.textContent = formatDurationHms(record.duration_ms);
    row.appendChild(duration);

    var date = global.document.createElement("span");
    date.className = "user-record-date";
    date.setAttribute("data-label", resolveRecordDateLabelText());
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
      empty.textContent = recordsLoading
        ? (currentLang === "en" ? "Loading records..." : "\u6b63\u5728\u52a0\u8f7d\u8bb0\u5f55...")
        : t("empty");
      list.appendChild(empty);
      return;
    }

    for (var i = 0; i < records.length; i += 1) {
      list.appendChild(createRecordRow(records[i] || {}));
    }
  }

  function renderRecordsLoadingHint() {
    recordsLoading = true;
    renderRecords([]);
  }

  function sortRecords(records, sortBy, order) {
    var list = Array.isArray(records) ? records.slice() : [];
    var by = sortBy === "score" || sortBy === "board_sum" ? sortBy : "time";
    var dir = order === "asc" ? 1 : -1;

    list.sort(function (a, b) {
      var scoreA = Math.floor(Number(a && a.score) || 0);
      var scoreB = Math.floor(Number(b && b.score) || 0);
      var boardSumA = Math.floor(Number(a && a.board_sum) || 0);
      var boardSumB = Math.floor(Number(b && b.board_sum) || 0);
      var timeA = parseDateTs(resolveRecordDateValue(a));
      var timeB = parseDateTs(resolveRecordDateValue(b));

      if (by === "board_sum") {
        if (boardSumA !== boardSumB) return dir * (boardSumA - boardSumB);
        if (scoreA !== scoreB) return scoreB - scoreA;
        if (timeA !== timeB) return timeB - timeA;
        return toText(a && a.mode_bucket).localeCompare(toText(b && b.mode_bucket));
      }

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
    var sortBy = toText(byId("user-record-sort") && byId("user-record-sort").value).trim().toLowerCase();
    return sortBy === "score" || sortBy === "board_sum" ? sortBy : "time";
  }

  function getOrderValue() {
    var order = toText(byId("user-record-order") && byId("user-record-order").value).trim().toLowerCase();
    return order === "asc" ? "asc" : "desc";
  }

  function applyCurrentSortAndRender() {
    var modeFilter = getModeFilterValue();
    activeModeFilter = modeFilter;
    activeRecordVisibility = getRecordVisibilityValue();
    renderRecords(sortRecords(cachedRecords, getSortByValue(), getOrderValue()));
  }

  function findCachedRecordIndex(recordId) {
    var id = toText(recordId).trim();
    if (!id || !Array.isArray(cachedRecords)) return -1;
    for (var i = 0; i < cachedRecords.length; i += 1) {
      if (toText(cachedRecords[i] && cachedRecords[i].id).trim() === id) return i;
    }
    return -1;
  }

  function updateCachedRecordAfterDelete(recordId) {
    var idx = findCachedRecordIndex(recordId);
    if (idx < 0) return;
    var id = toText(recordId).trim();
    var visibility = getRecordVisibilityValue();
    var record = cachedRecords[idx] || {};
    if (!isDeletedRecord(record) && summaryTotalRecords > 0) {
      summaryTotalRecords -= 1;
      updateSummaryCards();
    }
    if (visibility === "all") {
      record.deleted_at = new Date().toISOString();
    } else {
      cachedRecords.splice(idx, 1);
      if (expandedRecordId === id) expandedRecordId = "";
      delete recordDetailCache[id];
    }
    applyCurrentSortAndRender();
  }

  function updateCachedRecordAfterRestore(recordId) {
    var idx = findCachedRecordIndex(recordId);
    if (idx < 0) return;
    var id = toText(recordId).trim();
    var visibility = getRecordVisibilityValue();
    summaryTotalRecords += 1;
    updateSummaryCards();
    if (visibility === "all") {
      cachedRecords[idx].deleted_at = "";
    } else {
      cachedRecords.splice(idx, 1);
      if (expandedRecordId === id) expandedRecordId = "";
      delete recordDetailCache[id];
    }
    applyCurrentSortAndRender();
  }

  function normalizeUserRecordsFromApi(data) {
    if (!Array.isArray(data)) return [];
    var out = [];
    for (var i = 0; i < data.length; i += 1) {
      var item = data[i];
      if (!item || typeof item !== "object") continue;
      var normalized = normalizeHistoryRecordViaRuntime(item, null);
      out.push({
        id: toText(item.id || (normalized && normalized.id)).trim(),
        user_id: parsePositiveInt(item.user_id),
        mode_bucket: toText(item.mode_bucket || (normalized && normalized.mode)).trim(),
        mode_key: toText(item.mode_key || (normalized && normalized.mode_key)).trim(),
        board_width: parsePositiveInt(item.board_width || (normalized && normalized.board_width)),
        board_height: parsePositiveInt(item.board_height || (normalized && normalized.board_height)),
        score: Math.floor(Number((normalized && normalized.score) != null ? normalized.score : item.score) || 0),
        board_sum: Math.max(0, Math.floor(Number(
          (normalized && normalized.board_sum) != null ? normalized.board_sum : item.board_sum
        ) || 0)),
        best_tile: Math.floor(Number((normalized && normalized.best_tile) != null ? normalized.best_tile : item.best_tile) || 0),
        duration_ms: Math.floor(Number((normalized && normalized.duration_ms) != null ? normalized.duration_ms : item.duration_ms) || 0),
        end_reason: toText(item.end_reason || (normalized && normalized.end_reason)).trim(),
        ended_at: toText(item.ended_at || (normalized && normalized.ended_at)).trim(),
        created_at: toText(item.created_at).trim(),
        deleted_at: toText(item.deleted_at).trim(),
        replay_string: toText(
          (normalized && normalized.replay_string != null ? normalized.replay_string : item.replay_string) ||
          ""
        ).trim(),
        replay: (normalized && normalized.replay != null ? normalized.replay : item.replay),
        final_board: normalizeBoardMatrix(
          (normalized && normalized.final_board != null ? normalized.final_board : item.final_board)
        )
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
      var localUserId = getStoredUserId();
      var ownershipFromStorage = !!localUserId && localUserId === targetUserId && !!getAuthToken();
      isOwnProfile = ownershipFromStorage;
      updateVisibilityControl();
      syncRecordDateLabel();
      applyDocumentTitle();
      applyCurrentSortAndRender();
      return isOwnProfile;
    }

    var me = result.data || {};
    var myUserId = parsePositiveInt(me.id || me.user_id);
    isOwnProfile = !!myUserId && myUserId === targetUserId;

    if (isOwnProfile && !resolvedProfileNickname) {
      resolvedProfileNickname = toText(me.nickname).trim();
    }
    updateVisibilityControl();
    syncRecordDateLabel();
    applyDocumentTitle();
    applyCurrentSortAndRender();
    return isOwnProfile;
  }

  function buildSummaryPreviewHtml() {
    if (summaryTotalRecords <= 0) {
      var emptyNode = global.document.createElement("span");
      emptyNode.textContent = t("summaryPreviewEmpty");
      return emptyNode.outerHTML;
    }
    var modeFilter = getModeFilterValue();
    if (modeFilter && modeFilter !== "all") {
      var modeStats = findSummaryModeStats(modeFilter);
      var modeTotal = modeStats ? modeStats.record_count : 0;
      var modeBest = modeStats && modeStats.best_score > 0 ? String(modeStats.best_score) : "--";
      var selectedModeLabel = resolveModeLabel(modeFilter);
      if (currentLang === "en") {
        return escapeHtml(selectedModeLabel) + " · <strong>" + String(modeTotal) + "</strong> records · Best <strong>" + modeBest + "</strong>";
      }
      return escapeHtml(selectedModeLabel) + " · <strong>" + String(modeTotal) + "</strong> \u6761\u8bb0\u5f55 · \u6700\u9ad8\u5206 <strong>" + modeBest + "</strong>";
    }

    var mostPlayed = findMostPlayedModeStats();
    if (mostPlayed) {
      var mostPlayedLabel = resolveModeLabel(mostPlayed.mode_bucket || mostPlayed.mode_key);
      var mostPlayedCount = formatGameCount(mostPlayed.record_count);
      if (currentLang === "en") {
        return "<strong>" + String(summaryTotalRecords) + "</strong> records · Most played <strong>" + escapeHtml(mostPlayedLabel) + "</strong> " + escapeHtml(mostPlayedCount);
      }
      return "\u5171 <strong>" + String(summaryTotalRecords) + "</strong> \u6761\u8bb0\u5f55 · \u6700\u5e38\u73a9 <strong>" + escapeHtml(mostPlayedLabel) + "</strong> " + escapeHtml(mostPlayedCount);
    }

    var total = String(summaryTotalRecords);
    if (currentLang === "en") {
      return "<strong>" + total + "</strong> records";
    }
    return "\u5171 <strong>" + total + "</strong> \u6761\u8bb0\u5f55";
  }

  function updateSummaryCards() {
    var totalLabelNode = byId("user-summary-total-label");
    var bestScoreLabelNode = byId("user-summary-best-score-label");
    var bestTileLabelNode = byId("user-summary-best-tile-label");
    var lastActiveLabelNode = byId("user-summary-last-active-label");
    var totalNode = byId("user-summary-total-value");
    var bestScoreNode = byId("user-summary-best-score-value");
    var bestTileNode = byId("user-summary-best-tile-value");
    var lastActiveNode = byId("user-summary-last-active-value");
    var previewNode = byId("user-summary-preview");
    var lastActiveCard = lastActiveNode && lastActiveNode.closest ? lastActiveNode.closest(".user-summary-card") : null;
    var summaryRow = global.document.querySelector(".user-summary-row");
    var modeFilter = getModeFilterValue();

    if (modeFilter && modeFilter !== "all") {
      var modeStats = findSummaryModeStats(modeFilter);
      if (totalLabelNode) totalLabelNode.textContent = t("summaryRecordCountLabel");
      if (bestScoreLabelNode) bestScoreLabelNode.textContent = t("summaryBestScoreLabel");
      if (bestTileLabelNode) bestTileLabelNode.textContent = t("summaryBestTileLabel");
      if (lastActiveLabelNode) lastActiveLabelNode.textContent = t("summaryLastActiveLabel");
      if (lastActiveCard) lastActiveCard.style.display = "";
      if (summaryRow) summaryRow.classList.remove("is-summary-all");
      if (totalNode) totalNode.textContent = modeStats && modeStats.record_count > 0 ? String(modeStats.record_count) : "--";
      if (bestScoreNode) bestScoreNode.textContent = modeStats && modeStats.best_score > 0 ? String(modeStats.best_score) : "--";
      if (bestTileNode) bestTileNode.textContent = modeStats && modeStats.best_tile > 0 ? String(modeStats.best_tile) : "--";
      if (lastActiveNode) lastActiveNode.textContent = modeStats && modeStats.latest_record_at ? formatDate(modeStats.latest_record_at) : "--";
      if (previewNode) previewNode.innerHTML = buildSummaryPreviewHtml();
      return;
    }

    var mostPlayed = findMostPlayedModeStats();
    if (totalLabelNode) totalLabelNode.textContent = t("summaryTotalLabel");
    if (bestScoreLabelNode) bestScoreLabelNode.textContent = t("summaryMostPlayedLabel");
    if (bestTileLabelNode) bestTileLabelNode.textContent = t("summaryLastActiveLabel");
    if (lastActiveLabelNode) lastActiveLabelNode.textContent = "";
    if (lastActiveCard) lastActiveCard.style.display = "none";
    if (summaryRow) summaryRow.classList.add("is-summary-all");
    if (totalNode) totalNode.textContent = summaryTotalRecords > 0 ? String(summaryTotalRecords) : "--";
    if (bestScoreNode) bestScoreNode.textContent = mostPlayed ? resolveModeLabel(mostPlayed.mode_bucket || mostPlayed.mode_key) : "--";
    if (bestTileNode) bestTileNode.textContent = summaryLastActive ? formatDate(summaryLastActive) : "--";
    if (lastActiveNode) lastActiveNode.textContent = "";
    if (previewNode) previewNode.innerHTML = buildSummaryPreviewHtml();
  }

  async function fetchSummaryData() {
    if (!targetUserId) return;
    var stats = await getUserStats(targetUserId);
    var summary = stats && stats.success && stats.data && typeof stats.data === "object"
      ? stats.data.summary
      : null;
    if (summary && typeof summary === "object") {
      summaryModeStats = normalizeSummaryModeStats(stats.data.by_mode);
      summaryTotalRecords = parsePositiveInt(summary.total_records);
      summaryBestScore = parsePositiveInt(summary.best_score);
      summaryBestTile = parsePositiveInt(summary.best_tile);
      summaryLastActive = toText(summary.latest_record_at).trim();
      updateSummaryCards();
      return;
    }

    var result = await getUserRecords(targetUserId, {
      limit: 1, page: 1, sort_by: "score", order: "desc", mode: "all", status: "active"
    });
    if (!result || !result.success) return;
    summaryModeStats = [];
    var meta = resolvePagerMeta(result, 1, 1, (result.data || []).length);
    summaryTotalRecords = meta.totalCount || 0;
    var bestRecord = Array.isArray(result.data) && result.data[0];
    if (bestRecord) {
      summaryBestScore = Math.floor(Number(bestRecord.score) || 0);
      summaryBestTile = Math.floor(Number(bestRecord.best_tile) || 0);
    }
    updateSummaryCards();
  }

  async function refreshRecords(resetPage) {
    if (!targetUserId) {
      recordsLoading = false;
      renderRecords([]);
      setTip(t("invalidUserId"), "err");
      return;
    }

    if (resetPage === true) recordPage = 1;
    recordsLoading = true;
    setTip(t("loading"), "");
    renderRecordsLoadingHint();
    var requestSeq = ++recordsRequestSeq;
    activeModeFilter = getModeFilterValue();
    updateSummaryCards();
    activeRecordVisibility = isOwnProfile ? getRecordVisibilityValue() : "active";
    var result = await getUserRecords(targetUserId, {
      limit: DEFAULT_RECORD_LIMIT,
      page: recordPage,
      mode: activeModeFilter,
      status: activeRecordVisibility,
      sort_by: getSortByValue(),
      order: getOrderValue()
    });
    if ((!result || !result.success) && isTimeoutLikeText(toText(result && result.error))) {
      result = await getUserRecords(targetUserId, {
        limit: DEFAULT_RECORD_LIMIT,
        page: recordPage,
        mode: activeModeFilter,
        status: activeRecordVisibility,
        sort_by: getSortByValue(),
        order: getOrderValue()
      });
    }
    if (requestSeq !== recordsRequestSeq) return;

    if (!result || !result.success) {
      recordsLoading = false;
      cachedRecords = [];
      applyCurrentSortAndRender();
      recordHasPrev = recordPage > 1;
      recordHasNext = false;
      recordTotalPages = 0;
      syncRecordPagerUi();
      setTip(toText(result && result.error) || t("recordsFail"), "err");
      return;
    }

    cachedRecords = normalizeUserRecordsFromApi(result.data);
    recordsLoading = false;
    var meta = resolvePagerMeta(result, recordPage, DEFAULT_RECORD_LIMIT, cachedRecords.length);
    recordPage = meta.page;
    recordTotalPages = meta.totalPages;
    recordHasPrev = meta.hasPrev;
    recordHasNext = meta.hasNext;
    syncRecordPagerUi();
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
    setI18nReady(false);
    currentLang = readLanguage();
    applyDocumentTitle();

    var textMap = {
      "user-title": t("title"),
      "user-nav-home": t("navHome"),
      "user-nav-account": t("navAccount"),
      "user-nav-menu": t("navMenu"),
      "user-nav-settings": t("navSettings"),
      "user-nav-history": t("navHistory"),
      "user-nav-replay": t("navReplay"),
      "user-nav-palette": t("navPalette"),
      "user-nav-practice": t("navPractice"),
      "user-nav-medals": t("navMedals"),
      "user-nav-logout": t("navLogout"),
      "user-label-name": t("labelName"),
      "user-label-created": t("labelCreated"),
      "user-summary-total-label": t("summaryTotalLabel"),
      "user-summary-best-score-label": t("summaryBestScoreLabel"),
      "user-summary-best-tile-label": t("summaryBestTileLabel"),
      "user-summary-last-active-label": t("summaryLastActiveLabel"),
      "user-record-heading": resolveRecordHeadingText(),
      "user-undo-label": t("undoLabel"),
      "user-mode-label": currentLang === "en" ? "Mode" : "\u6a21\u5f0f",
      "user-sort-label": t("sortLabel"),
      "user-order-label": t("orderLabel"),
      "user-visibility-label": t("visibilityLabel"),
      "user-record-refresh": t("refreshBtn"),
      "user-record-prev": currentLang === "en" ? "Prev" : "上一页",
      "user-record-next": currentLang === "en" ? "Next" : "下一页",
      "user-col-mode": t("colMode"),
      "user-col-score": t("colScore"),
      "user-col-board-sum": t("colBoardSum"),
      "user-col-best-tile": t("colBestTile"),
      "user-col-duration": t("colDuration"),
      "user-col-date": resolveRecordDateLabelText()
    };

    var keys = Object.keys(textMap);
    for (var i = 0; i < keys.length; i += 1) {
      var id = keys[i];
      var node = byId(id);
      if (node) node.textContent = textMap[id];
    }
    var summaryRow = document.querySelector(".user-summary-row");
    if (summaryRow) summaryRow.setAttribute("aria-label", t("summaryAriaLabel"));

    var undoSelect = byId("user-record-undo");
    if (undoSelect && undoSelect.options && undoSelect.options.length >= 2) {
      undoSelect.options[0].textContent = t("undoDisabled");
      undoSelect.options[1].textContent = t("undoEnabled");
    }

    var sortSelect = byId("user-record-sort");
    if (sortSelect && sortSelect.options && sortSelect.options.length >= 3) {
      sortSelect.options[0].textContent = t("sortByTime");
      sortSelect.options[1].textContent = t("sortByScore");
      sortSelect.options[2].textContent = t("sortByBoardSum");
    }

    var orderSelect = byId("user-record-order");
    if (orderSelect && orderSelect.options && orderSelect.options.length >= 2) {
      orderSelect.options[0].textContent = t("orderDesc");
      orderSelect.options[1].textContent = t("orderAsc");
    }

    refreshModeSelectOptions();

    var visibilitySelect = byId("user-record-visibility");
    if (visibilitySelect && visibilitySelect.options && visibilitySelect.options.length >= 3) {
      visibilitySelect.options[0].textContent = t("visibilityActive");
      visibilitySelect.options[1].textContent = t("visibilityDeleted");
      visibilitySelect.options[2].textContent = t("visibilityAll");
    }

    updateVisibilityControl();
    syncRecordDateLabel();
    syncRecordPagerUi();
    applyCurrentSortAndRender();
    updateSummaryCards();
    setI18nReady(true);
  }

  function clearAuthState() {
    removeLocalStorageItem(STORAGE_TOKEN_KEY);
    removeLocalStorageItem(STORAGE_USER_ID_KEY);
    removeLocalStorageItem(STORAGE_NICKNAME_KEY);
  }

  function bindEvents() {
    var refreshBtn = byId("user-record-refresh");
    var undoSelect = byId("user-record-undo");
    var modeSelect = byId("user-record-mode");
    var sortSelect = byId("user-record-sort");
    var orderSelect = byId("user-record-order");
    var visibilitySelect = byId("user-record-visibility");
    var prevBtn = byId("user-record-prev");
    var nextBtn = byId("user-record-next");
    var logoutBtn = byId("user-nav-logout");
    var navMenu = global.document.querySelector(".user-nav-menu");

    if (refreshBtn) refreshBtn.addEventListener("click", function () { refreshRecords(false); });
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        clearAuthState();
        global.location.href = "account.html";
      });
    }
    if (undoSelect) {
      undoSelect.addEventListener("change", function () {
        refreshModeSelectOptions();
        refreshRecords(true);
      });
    }
    if (modeSelect) modeSelect.addEventListener("change", function () { refreshRecords(true); });
    if (sortSelect) sortSelect.addEventListener("change", function () { refreshRecords(true); });
    if (orderSelect) orderSelect.addEventListener("change", function () { refreshRecords(true); });
    if (visibilitySelect) visibilitySelect.addEventListener("change", function () { refreshRecords(true); });
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (!recordHasPrev) return;
        recordPage = Math.max(1, recordPage - 1);
        refreshRecords(false);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (!recordHasNext) return;
        recordPage += 1;
        refreshRecords(false);
      });
    }
    if (navMenu) {
      global.document.addEventListener("click", function (eventLike) {
        if (!navMenu.open) return;
        if (eventLike && eventLike.target && navMenu.contains(eventLike.target)) return;
        navMenu.open = false;
      });
    }

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
    syncRecordPagerUi();
    recordsLoading = true;
    applyLanguage();

    var undoSelect = byId("user-record-undo");
    var sortSelect = byId("user-record-sort");
    var orderSelect = byId("user-record-order");
    var modeSelect = byId("user-record-mode");
    var visibilitySelect = byId("user-record-visibility");
    if (undoSelect && !undoSelect.value) undoSelect.value = "no_undo";
    if (modeSelect && !modeSelect.value) modeSelect.value = "standard_no_undo";
    if (sortSelect && !sortSelect.value) sortSelect.value = "time";
    if (orderSelect && !orderSelect.value) orderSelect.value = "desc";
    if (visibilitySelect && !visibilitySelect.value) visibilitySelect.value = "active";

    await resolveTargetUserFromSession();

    if (!targetUserId) {
      applyDocumentTitle();
      recordsLoading = false;
      renderRecords([]);
      setTip(t("invalidUserId"), "err");
      return;
    }

    var nameNode = byId("user-value-name");
    if (nameNode && targetNicknameHint) nameNode.textContent = targetNicknameHint;
    var initialUserId = getStoredUserId();
    isOwnProfile = !!initialUserId && initialUserId === targetUserId && !!getAuthToken();
    updateVisibilityControl();
    applyDocumentTitle();

    var ownershipPromise = resolveOwnership();
    var userInfoPromise = refreshUserInfo();
    var recordsPromise = refreshRecords(true);
    var summaryPromise = fetchSummaryData();
    await Promise.all([ownershipPromise, userInfoPromise, recordsPromise, summaryPromise]);
    if (cachedRecords.length > 0) {
      summaryLastActive = resolveRecordDateValue(cachedRecords[0]);
      updateSummaryCards();
    }
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

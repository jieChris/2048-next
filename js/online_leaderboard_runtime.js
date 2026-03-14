(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var STORAGE_TOKEN_KEY = "token";
  var STORAGE_USER_ID_KEY = "userId";
  var STORAGE_NICKNAME_KEY = "nickname";
  var STORAGE_LAST_SUBMIT_KEY = "online_last_submit_signature_v1";
  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var DEFAULT_BOARD_LIMIT = 10;
  var DEFAULT_API_TIMEOUT_MS = 8000;
  var MODE_BUCKET_ALIAS = {
    standard: "standard_no_undo",
    standard_no_undo: "standard_no_undo",
    standard_4x4_pow2_no_undo: "standard_no_undo",
    capped_4x4_pow2_no_undo: "standard_no_undo",
    capped: "standard_no_undo",

    classic_undo: "standard_undo",
    standard_undo: "standard_undo",
    classic_4x4_pow2_undo: "standard_undo",

    pow2_3x3: "pow2_3x3",
    board_3x3_pow2_no_undo: "pow2_3x3",
    board_3x3_pow2_undo: "pow2_3x3",

    pow2_2x4: "pow2_2x4",
    board_2x4_pow2_no_undo: "pow2_2x4",
    board_2x4_pow2_undo: "pow2_2x4",

    pow2_3x4: "pow2_3x4",
    board_3x4_pow2_no_undo: "pow2_3x4",
    board_3x4_pow2_undo: "pow2_3x4",

    fib_3x3: "fib_3x3",
    fib_3x3_no_undo: "fib_3x3",
    fib_3x3_undo: "fib_3x3"
  };
  var TIMER_LEADERBOARD_TOP_LIMIT = 10;
  var TIMER_LEADERBOARD_FETCH_LIMIT = 500;

  var apiBases = buildApiBaseCandidates();
  var activeApiBase = apiBases[0];
  var cachedLeaderboard = [];
  var cachedLeaderboardMode = "";
  var timerLeaderboardCacheRows = [];
  var timerLeaderboardCacheMode = "";
  var timerLeaderboardCacheTime = 0;
  var timerLeaderboardLoading = false;
  var submitLock = false;
  var modeIntroBound = false;
  var langSyncBound = false;

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function byId(id) {
    return global.document.getElementById(id);
  }

  function createEl(tag, className, text) {
    var el = global.document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === "string") el.textContent = text;
    return el;
  }

  function safeGetStorage(key) {
    try {
      return global.localStorage ? global.localStorage.getItem(key) : null;
    } catch (_err) {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      if (!global.localStorage) return;
      global.localStorage.setItem(key, value);
    } catch (_err) {}
  }

  function safeRemoveStorage(key) {
    try {
      if (!global.localStorage) return;
      global.localStorage.removeItem(key);
    } catch (_err) {}
  }

  function getAuthToken() {
    return toText(safeGetStorage(STORAGE_TOKEN_KEY)).trim();
  }

  function getUserId() {
    return toText(safeGetStorage(STORAGE_USER_ID_KEY)).trim();
  }

  function getNickname() {
    return toText(safeGetStorage(STORAGE_NICKNAME_KEY)).trim();
  }

  function saveAuth(payload) {
    safeSetStorage(STORAGE_TOKEN_KEY, toText(payload && payload.token));
    safeSetStorage(STORAGE_USER_ID_KEY, toText(payload && payload.userId));
    safeSetStorage(STORAGE_NICKNAME_KEY, toText(payload && payload.nickname));
  }

  function clearAuth() {
    safeRemoveStorage(STORAGE_TOKEN_KEY);
    safeRemoveStorage(STORAGE_USER_ID_KEY);
    safeRemoveStorage(STORAGE_NICKNAME_KEY);
  }

  function getLanguage() {
    var raw = toText(safeGetStorage(UI_LANG_STORAGE_KEY)).toLowerCase();
    return raw === "en" ? "en" : "zh";
  }

  function resolveLeaderboardMode(modeLike) {
    var key = toText(modeLike).trim().toLowerCase();
    if (!key) return null;
    return MODE_BUCKET_ALIAS[key] || null;
  }

  function inferModeKeyFromPath() {
    var path = toText(global.location && global.location.pathname).toLowerCase();
    if (path.indexOf("undo_2048") >= 0) return "classic_4x4_pow2_undo";
    if (path.indexOf("capped_2048") >= 0) return "capped_4x4_pow2_no_undo";
    if (path.indexOf("index") >= 0 || path === "/" || path === "/index.html") return "standard_4x4_pow2_no_undo";
    return "";
  }

  function readBodyModeKey() {
    var body = global.document && global.document.body ? global.document.body : null;
    if (!body || typeof body.getAttribute !== "function") return "";
    return toText(body.getAttribute("data-mode-id")).trim();
  }

  function getCurrentModeKey() {
    var manager = global.game_manager;
    if (manager && manager.modeKey) return toText(manager.modeKey).trim();
    if (manager && manager.mode) return toText(manager.mode).trim();
    var bodyModeKey = readBodyModeKey();
    if (bodyModeKey) return bodyModeKey;
    var modeConfigKey = toText(global.GAME_MODE_CONFIG && global.GAME_MODE_CONFIG.key).trim();
    if (modeConfigKey) return modeConfigKey;
    return inferModeKeyFromPath();
  }

  function isLeaderboardModeSupported(modeLike) {
    return !!resolveLeaderboardMode(modeLike);
  }

  function ensureTimerLeaderboardPanel() {
    var timerBox = byId("timerbox");
    if (!timerBox) return null;

    var panel = byId("timer-leaderboard-panel");
    if (!panel) {
      panel = createEl("div", "timer-leaderboard-panel", "");
      panel.id = "timer-leaderboard-panel";

      var summary = createEl("div", "timer-leaderboard-summary", "");
      summary.id = "timer-leaderboard-summary";

      var list = createEl("div", "timer-leaderboard-list", "");
      list.id = "timer-leaderboard-list";

      panel.appendChild(summary);
      panel.appendChild(list);
      timerBox.appendChild(panel);
    }

    updateTimerLeaderboardHeader();
    return panel;
  }

  function updateTimerLeaderboardHeader() {
    var lang = getLanguage();
    var summary = byId("timer-leaderboard-summary");
    if (!summary) return;
    summary.textContent = "TOP 10";
    summary.setAttribute("data-label", lang === "en" ? "LEADERBOARD" : "排行榜");
    summary.setAttribute("title", lang === "en" ? "Leaderboard" : "排行榜");
  }

  function resolveRankTileFontSize(rankText) {
    var length = toText(rankText).trim().length;
    if (length <= 1) return "22px";
    if (length === 2) return "18px";
    if (length === 3) return "14px";
    return "12px";
  }

  function appendTimerLeaderboardRow(list, rankText, nameText, rowClassName, rankClassName) {
    if (!list) return;
    var row = createEl("div", "timer-leaderboard-row", "");
    if (rowClassName) row.className += " " + rowClassName;

    var rankTile = createEl("div", "timertile timer-leaderboard-rank-tile", toText(rankText));
    rankTile.style.fontSize = resolveRankTileFontSize(rankText);
    if (rankClassName) rankTile.className += " " + rankClassName;

    var nameTile = createEl("div", "timertile timer-leaderboard-name-tile", toText(nameText));
    nameTile.title = toText(nameText);

    row.appendChild(rankTile);
    row.appendChild(nameTile);
    list.appendChild(row);
  }

  function renderTimerLeaderboardRows(topRows, selfEntry) {
    var list = byId("timer-leaderboard-list");
    if (!list) return;
    list.innerHTML = "";

    var lang = getLanguage();
    var rows = Array.isArray(topRows) ? topRows : [];

    for (var i = 0; i < rows.length && i < TIMER_LEADERBOARD_TOP_LIMIT; i += 1) {
      var item = rows[i] || {};
      var nick = toText(item.nickname || (lang === "en" ? "Anonymous" : "匿名"));
      var rankClassName = "";
      if (i === 0) rankClassName = "is-top-1";
      else if (i === 1) rankClassName = "is-top-2";
      else if (i === 2) rankClassName = "is-top-3";
      appendTimerLeaderboardRow(list, String(i + 1), nick, "", rankClassName);
    }

    while (list.children.length < TIMER_LEADERBOARD_TOP_LIMIT) {
      appendTimerLeaderboardRow(list, String(list.children.length + 1), "--", "is-empty", "");
    }

    var myRankText = "--";
    var myNick = getNickname() || (lang === "en" ? "You" : "我");

    if (selfEntry) {
      myRankText = String(selfEntry.rank || "--");
      myNick = toText(selfEntry.nickname || myNick);
    }

    appendTimerLeaderboardRow(list, myRankText, myNick, "is-self", "");
  }

  function resolveSelfRank(rows) {
    var list = Array.isArray(rows) ? rows : [];
    var userId = String(Math.floor(Number(getUserId()) || 0));
    if (!userId || userId === "0") return null;

    for (var i = 0; i < list.length; i += 1) {
      var item = list[i] || {};
      if (String(item.user_id || "") === userId) {
        return {
          rank: i + 1,
          score: Math.floor(Number(item.score) || 0),
          nickname: toText(item.nickname || getNickname() || "")
        };
      }
    }
    return {
      rank: "--",
      score: 0,
      nickname: getNickname() || ""
    };
  }

  function syncTimerLeaderboardViewMode() {
    var timerBox = byId("timerbox");
    if (!timerBox) return;

    var manager = global.game_manager || {};
    var modeKey = getCurrentModeKey();
    var supported = isLeaderboardModeSupported(modeKey);
    var isHiddenView =
      typeof manager.getTimerModuleViewMode === "function"
        ? toText(manager.getTimerModuleViewMode()) === "hidden"
        : false;
    var enableLeaderboardPanel = supported && isHiddenView;

    timerBox.classList.toggle("timerbox-leaderboard-mode", enableLeaderboardPanel);

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

    if (hostname === "taihe.fun" && origin) {
      push(origin + "/api");
      push("https://taihe.fun/api");
      push("https://www.taihe.fun/api");
    } else if (hostname === "www.taihe.fun") {
      push("https://taihe.fun/api");
      if (origin) push(origin + "/api");
      push("https://www.taihe.fun/api");
    } else if (isLocalHost) {
      if (origin) push(origin + "/api");
      push("https://taihe.fun/api");
      push("https://www.taihe.fun/api");
    } else {
      if (origin) push(origin + "/api");
      push("https://taihe.fun/api");
      push("https://www.taihe.fun/api");
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
    var lastError = "请求失败";
    var timeoutMs = resolveApiTimeoutMs();

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
          if (!data && i < apiBases.length - 1) {
            continue;
          }
          if (data && typeof data === "object") {
            return data;
          }
          return { error: "请求失败(" + response.status + ")" };
        }

        if (!data || typeof data !== "object") {
          if (i < apiBases.length - 1) {
            continue;
          }
          return { error: "响应格式错误" };
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
          lastError = "网络超时";
        } else {
          lastError = "网络异常: " + toText(error && error.message);
        }
      }
    }

    return { error: lastError };
  }

  function register(payload) {
    return apiRequest("/register", { method: "POST", body: payload });
  }

  function login(payload) {
    return apiRequest("/login", { method: "POST", body: payload });
  }

  function submitScore(score, modeLike) {
    var modeKey = toText(modeLike).trim();
    var modeBucket = resolveLeaderboardMode(modeKey);
    var payload = { score: score };

    if (modeKey) payload.mode_key = modeKey;
    if (modeBucket) payload.mode = modeBucket;

    return apiRequest("/score", { method: "POST", auth: true, body: payload });
  }

  function getLeaderboard(limit, modeLike) {
    var safeLimit = Number(limit);
    if (!Number.isFinite(safeLimit) || safeLimit <= 0) safeLimit = DEFAULT_BOARD_LIMIT;
    safeLimit = Math.floor(safeLimit);

    var modeBucket = resolveLeaderboardMode(modeLike);
    var path = "/leaderboard?limit=" + encodeURIComponent(String(safeLimit));
    if (modeBucket) {
      path += "&mode=" + encodeURIComponent(modeBucket);
    }

    return apiRequest(path, { method: "GET" });
  }

  function getUserInfo(userId) {
    var safeUserId = Math.floor(Number(userId) || 0);
    if (safeUserId <= 0) return Promise.resolve({ error: "无效的用户ID" });
    return apiRequest("/user/" + encodeURIComponent(String(safeUserId)), { method: "GET" });
  }

  function getToolkitCopy(lang) {
    if (lang === "en") {
      return {
        label: "Theme Settings",
        palette: "Theme Settings"
      };
    }
    return {
      label: "主题设置",
      palette: "主题设置"
    };
  }

  function applyToolkitRowText(lang) {
    var copy = getToolkitCopy(lang);
    var label = byId("toolkit-entry-label");
    var palette = byId("toolkit-palette-link");

    if (label) label.textContent = copy.label;
    if (palette) {
      palette.textContent = copy.palette;
      palette.setAttribute("href", "palette.html");
    }
  }

  function ensureToolkitEntryRow() {
    var modalContent = global.document.querySelector("#settings-modal .settings-modal-content");
    if (!modalContent) return;

    var row = byId("toolkit-entry-row");
    if (!row) {
      row = createEl("div", "settings-row toolkit-entry-row", "");
      row.id = "toolkit-entry-row";

      var actionWrap = createEl("div", "toolkit-entry-actions", "");
      var palette = createEl("a", "replay-button", "");
      palette.id = "toolkit-palette-link";
      palette.setAttribute("href", "palette.html");

      actionWrap.appendChild(palette);
      row.appendChild(actionWrap);

      var actionHost = modalContent.querySelector(".replay-modal-actions");
      if (actionHost && actionHost.parentNode === modalContent) {
        modalContent.insertBefore(row, actionHost);
      } else {
        modalContent.appendChild(row);
      }
    }

    applyToolkitRowText(getLanguage());
  }

  function bindLanguageSync() {
    if (langSyncBound) return;
    langSyncBound = true;

    global.addEventListener("uilanguagechange", function (eventLike) {
      var lang = toText(eventLike && eventLike.detail && eventLike.detail.lang).toLowerCase() === "en" ? "en" : "zh";
      applyToolkitRowText(lang);
      if (typeof global.syncTimerModuleSettingsUI === "function") {
        global.syncTimerModuleSettingsUI();
      }
      updateTimerLeaderboardHeader();
      renderTimerLeaderboardRows(
        timerLeaderboardCacheRows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT),
        resolveSelfRank(timerLeaderboardCacheRows)
      );
    });

    global.addEventListener("storage", function (eventLike) {
      if (!eventLike || eventLike.key !== UI_LANG_STORAGE_KEY) return;
      applyToolkitRowText(getLanguage());
      if (typeof global.syncTimerModuleSettingsUI === "function") {
        global.syncTimerModuleSettingsUI();
      }
      updateTimerLeaderboardHeader();
      renderTimerLeaderboardRows(
        timerLeaderboardCacheRows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT),
        resolveSelfRank(timerLeaderboardCacheRows)
      );
    });
  }

  function renderModeIntroLeaderboard(list) {
    var host = byId("mode-intro-leaderboard");
    if (!host) return;
    host.innerHTML = "";
    if (!Array.isArray(list) || list.length === 0) {
      host.textContent = getLanguage() === "en" ? "No online leaderboard data." : "暂无在线排行榜数据";
      return;
    }

    for (var i = 0; i < list.length; i += 1) {
      var item = list[i] || {};
      var row = createEl("div", "mode-intro-leaderboard-row", "");
      row.appendChild(createEl("span", "mode-intro-leaderboard-rank", "#" + String(i + 1)));
      row.appendChild(createEl("span", "mode-intro-leaderboard-nick", toText(item.nickname || "匿名")));
      row.appendChild(createEl("span", "mode-intro-leaderboard-score", String(Number(item.score) || 0)));
      host.appendChild(row);
    }
  }

  async function refreshLeaderboard(modeLike) {
    var modeBucket = resolveLeaderboardMode(modeLike) || "";
    var result = await getLeaderboard(DEFAULT_BOARD_LIMIT, modeLike);
    if (!result || !result.success) {
      renderModeIntroLeaderboard([]);
      return false;
    }
    cachedLeaderboard = Array.isArray(result.data) ? result.data : [];
    cachedLeaderboardMode = modeBucket;
    renderModeIntroLeaderboard(cachedLeaderboard);
    return true;
  }

  async function refreshTimerLeaderboardPanel(forceRefresh) {
    var timerBox = byId("timerbox");
    if (!timerBox) return;
    ensureTimerLeaderboardPanel();
    updateTimerLeaderboardHeader();
    syncTimerLeaderboardViewMode();

    var modeKey = getCurrentModeKey();
    var modeBucket = resolveLeaderboardMode(modeKey) || "";
    if (!modeBucket) {
      renderTimerLeaderboardRows([], null);
      return;
    }

    var now = Date.now();
    if (
      !forceRefresh &&
      !timerLeaderboardLoading &&
      timerLeaderboardCacheMode === modeBucket &&
      timerLeaderboardCacheRows.length > 0 &&
      now - timerLeaderboardCacheTime < 12000
    ) {
      renderTimerLeaderboardRows(
        timerLeaderboardCacheRows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT),
        resolveSelfRank(timerLeaderboardCacheRows)
      );
      return;
    }

    if (timerLeaderboardLoading) return;
    timerLeaderboardLoading = true;
    var result = await getLeaderboard(TIMER_LEADERBOARD_FETCH_LIMIT, modeBucket);
    timerLeaderboardLoading = false;

    if (!result || !result.success) {
      renderTimerLeaderboardRows([], null);
      return;
    }

    var rows = Array.isArray(result.data) ? result.data : [];
    timerLeaderboardCacheRows = rows;
    timerLeaderboardCacheMode = modeBucket;
    timerLeaderboardCacheTime = now;
    renderTimerLeaderboardRows(rows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT), resolveSelfRank(rows));
  }

  function isSessionTerminated(manager) {
    if (!manager) return false;
    try {
      if (typeof manager.isSessionTerminated === "function") {
        return !!manager.isSessionTerminated();
      }
    } catch (_err) {}
    return !!(manager.over || (manager.won && !manager.keepPlaying));
  }

  function buildSubmitSignature(manager, score) {
    var modeKey = manager && manager.modeKey ? String(manager.modeKey) : getCurrentModeKey() || "unknown";
    var seed = manager && manager.initialSeed != null ? String(manager.initialSeed) : "seedless";
    return [modeKey, seed, String(score)].join("|");
  }

  async function maybeSubmitScoreOnGameOver() {
    if (submitLock) return;
    var token = getAuthToken();
    if (!token) return;

    var manager = global.game_manager;
    if (!manager || manager.replayMode) return;
    if (!isSessionTerminated(manager)) return;

    var score = Math.floor(Number(manager.score) || 0);
    if (!(score > 0)) return;

    var signature = buildSubmitSignature(manager, score);
    var lastSignature = toText(safeGetStorage(STORAGE_LAST_SUBMIT_KEY));
    if (signature && signature === lastSignature) return;

    submitLock = true;
    var result = null;
    try {
      var submitModeKey = getCurrentModeKey();
      result = await submitScore(score, submitModeKey);
    } finally {
      submitLock = false;
    }

    if (result && result.success) {
      safeSetStorage(STORAGE_LAST_SUBMIT_KEY, signature);
      refreshLeaderboard(getCurrentModeKey());
      refreshTimerLeaderboardPanel(true);
      return;
    }

    var errorText = toText(result && result.error ? result.error : "分数提交失败");
    if (errorText.indexOf("未授权") >= 0 || errorText.toLowerCase().indexOf("token") >= 0) {
      clearAuth();
    }
  }

  function bindModeIntroRefresh() {
    if (modeIntroBound) return;
    var introBtn = byId("top-mode-intro-btn");
    if (!introBtn) return;

    modeIntroBound = true;
    introBtn.addEventListener("click", function () {
      var modeKey = getCurrentModeKey();
      var modeBucket = resolveLeaderboardMode(modeKey) || "";
      if (cachedLeaderboard.length > 0 && cachedLeaderboardMode === modeBucket) {
        renderModeIntroLeaderboard(cachedLeaderboard);
      } else {
        refreshLeaderboard(modeKey);
      }
    });
  }

  function startPolling() {
    global.setInterval(function () {
      ensureToolkitEntryRow();
      bindModeIntroRefresh();
      syncTimerLeaderboardViewMode();
      if (typeof global.syncTimerModuleSettingsUI === "function") {
        global.syncTimerModuleSettingsUI();
      }
      maybeSubmitScoreOnGameOver();
    }, 1500);

    global.setInterval(function () {
      if (byId("mode-intro-leaderboard")) {
        refreshLeaderboard(getCurrentModeKey());
      }
      refreshTimerLeaderboardPanel(false);
    }, 30000);

    global.setInterval(function () {
      refreshTimerLeaderboardPanel(false);
    }, 12000);
  }

  function init() {
    ensureToolkitEntryRow();
    bindLanguageSync();
    bindModeIntroRefresh();
    ensureTimerLeaderboardPanel();
    syncTimerLeaderboardViewMode();
    if (typeof global.syncTimerModuleSettingsUI === "function") {
      global.syncTimerModuleSettingsUI();
    }
    refreshTimerLeaderboardPanel(true);
    if (byId("mode-intro-leaderboard")) {
      refreshLeaderboard(getCurrentModeKey());
    }
    startPolling();
  }

  global.OnlineLeaderboardRuntime = {
    refreshLeaderboard: refreshLeaderboard,
    refreshTimerLeaderboardPanel: refreshTimerLeaderboardPanel,
    submitScore: submitScore,
    login: login,
    register: register,
    getUserInfo: getUserInfo,
    clearAuth: clearAuth,
    getApiBase: function () { return activeApiBase; },
    saveAuth: saveAuth,
    getAuthToken: getAuthToken,
    getUserId: getUserId,
    getNickname: getNickname,
    resolveLeaderboardMode: resolveLeaderboardMode,
    isLeaderboardModeSupported: isLeaderboardModeSupported
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

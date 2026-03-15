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
  var POLL_BASE_INTERVAL_VISIBLE_MS = 2500;
  var POLL_BASE_INTERVAL_HIDDEN_MS = 12000;
  var TIMER_REFRESH_INTERVAL_VISIBLE_MS = 20000;
  var TIMER_REFRESH_INTERVAL_HIDDEN_MS = 90000;
  var MODE_INTRO_REFRESH_INTERVAL_VISIBLE_MS = 45000;
  var MODE_INTRO_REFRESH_INTERVAL_HIDDEN_MS = 180000;
  var POLL_BACKOFF_MAX_MS = 60000;
  var POLL_BACKOFF_MAX_STEP = 4;

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
  var pollingStarted = false;
  var pollingTickTimer = 0;
  var pollingTickRunning = false;
  var pollingFailureCount = 0;
  var pollingLastTimerRefreshTime = 0;
  var pollingLastModeIntroRefreshTime = 0;
  var pollingVisibilityBound = false;
  var pollingUsingScheduler = false;
  var schedulerTaskName = "online-leaderboard-main";
  var refreshScheduler = null;

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function normalizeLeaderboardNickname(nameLike) {
    return toText(nameLike).trim().replace(/_/g, "");
  }

  function parsePositiveInt(value) {
    var parsed = Math.floor(Number(value) || 0);
    return parsed > 0 ? parsed : 0;
  }

  function buildUserProfileUrl(userId, nickname) {
    var safeUserId = parsePositiveInt(userId);
    if (!safeUserId) return "";
    var params = new global.URLSearchParams();
    params.set("id", String(safeUserId));
    var safeNickname = toText(nickname).trim();
    if (safeNickname) params.set("nickname", safeNickname);
    return "user.html?" + params.toString();
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

  function getRefreshScheduler() {
    if (refreshScheduler) return refreshScheduler;
    var runtime = global.RefreshSchedulerRuntime;
    if (!runtime || typeof runtime.getDefaultScheduler !== "function") return null;
    refreshScheduler = runtime.getDefaultScheduler();
    return refreshScheduler;
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

  function resolveFixedNameTileFontSizeFromFirst(topRows, lang) {
    var rows = Array.isArray(topRows) ? topRows : [];
    if (rows.length === 0) return "14px";
    var firstText = formatLeaderboardNameAndScore(rows[0], lang);
    var length = toText(firstText).trim().length;
    if (length >= 20) return "10px";
    if (length >= 18) return "11px";
    if (length >= 15) return "12px";
    return "14px";
  }

  function createTimerLeaderboardRowNode() {
    var row = createEl("div", "timer-leaderboard-row", "");
    var rankTile = createEl("div", "timertile timer-leaderboard-rank-tile", "");
    var nameTile = createEl("div", "timertile timer-leaderboard-name-tile", "");
    row.appendChild(rankTile);
    row.appendChild(nameTile);
    row._rankTile = rankTile;
    row._nameTile = nameTile;
    return row;
  }

  function ensureTimerLeaderboardRowNodes(list, count) {
    if (!list) return [];
    var required = Math.max(0, Math.floor(Number(count) || 0));
    while (list.children.length < required) {
      list.appendChild(createTimerLeaderboardRowNode());
    }
    while (list.children.length > required) {
      list.removeChild(list.lastChild);
    }
    var rows = [];
    for (var i = 0; i < list.children.length; i += 1) {
      rows.push(list.children[i]);
    }
    return rows;
  }

  function applyNameTileProfileLink(nameTile, profileUrl) {
    if (!nameTile) return;

    if (!nameTile.__profileClickBound) {
      nameTile.__profileClickBound = true;
      nameTile.addEventListener("click", function () {
        var href = toText(nameTile.getAttribute("data-profile-href")).trim();
        if (!href) return;
        global.location.href = href;
      });
      nameTile.addEventListener("keydown", function (eventLike) {
        var key = toText(eventLike && eventLike.key).toLowerCase();
        if (key !== "enter" && key !== " ") return;
        var href = toText(nameTile.getAttribute("data-profile-href")).trim();
        if (!href) return;
        if (eventLike && typeof eventLike.preventDefault === "function") eventLike.preventDefault();
        global.location.href = href;
      });
    }

    var href = toText(profileUrl).trim();
    if (href) {
      nameTile.classList.add("is-user-link");
      nameTile.setAttribute("data-profile-href", href);
      nameTile.setAttribute("tabindex", "0");
      nameTile.setAttribute("role", "link");
      return;
    }

    nameTile.classList.remove("is-user-link");
    nameTile.removeAttribute("data-profile-href");
    nameTile.removeAttribute("tabindex");
    nameTile.removeAttribute("role");
  }

  function updateTimerLeaderboardRowNode(row, rankText, nameText, rowClassName, rankClassName, fixedNameFontSize, profileUrl) {
    if (!row) return;
    row.className = "timer-leaderboard-row" + (rowClassName ? " " + rowClassName : "");

    var rankTile = row._rankTile;
    var nameTile = row._nameTile;
    if (!rankTile || !nameTile) {
      rankTile = row.querySelector(".timer-leaderboard-rank-tile");
      nameTile = row.querySelector(".timer-leaderboard-name-tile");
      if (!rankTile) {
        rankTile = createEl("div", "timertile timer-leaderboard-rank-tile", "");
        row.insertBefore(rankTile, row.firstChild);
      }
      if (!nameTile) {
        nameTile = createEl("div", "timertile timer-leaderboard-name-tile", "");
        row.appendChild(nameTile);
      }
      row._rankTile = rankTile;
      row._nameTile = nameTile;
    }

    rankTile.className = "timertile timer-leaderboard-rank-tile" + (rankClassName ? " " + rankClassName : "");
    rankTile.textContent = toText(rankText);
    rankTile.style.fontSize = resolveRankTileFontSize(rankText);

    nameTile.className = "timertile timer-leaderboard-name-tile";
    nameTile.textContent = toText(nameText);
    nameTile.title = toText(nameText);
    nameTile.style.fontSize = toText(fixedNameFontSize || "14px");
    applyNameTileProfileLink(nameTile, profileUrl);
  }

  function formatLeaderboardNameAndScore(item, lang) {
    var source = item && typeof item === "object" ? item : {};
    var nickname = normalizeLeaderboardNickname(source.nickname);
    if (!nickname) nickname = lang === "en" ? "Anonymous" : "匿名";
    var scoreValue = Math.floor(Number(source.score) || 0);
    return nickname + "-" + String(scoreValue);
  }

  function renderTimerLeaderboardRows(topRows, selfEntry) {
    var list = byId("timer-leaderboard-list");
    if (!list) return;

    var lang = getLanguage();
    var rows = Array.isArray(topRows) ? topRows : [];
    var fixedNameFontSize = resolveFixedNameTileFontSizeFromFirst(rows, lang);
    var rowNodes = ensureTimerLeaderboardRowNodes(list, TIMER_LEADERBOARD_TOP_LIMIT + 1);
    var rowCursor = 0;

    for (var i = 0; i < rows.length && i < TIMER_LEADERBOARD_TOP_LIMIT; i += 1) {
      var item = rows[i] || {};
      var displayText = formatLeaderboardNameAndScore(item, lang);
      var profileUrl = buildUserProfileUrl(item.user_id, item.nickname);
      var rankClassName = "";
      if (i === 0) rankClassName = "is-top-1";
      else if (i === 1) rankClassName = "is-top-2";
      else if (i === 2) rankClassName = "is-top-3";
      updateTimerLeaderboardRowNode(
        rowNodes[rowCursor],
        String(i + 1),
        displayText,
        "",
        rankClassName,
        fixedNameFontSize,
        profileUrl
      );
      rowCursor += 1;
    }

    while (rowCursor < TIMER_LEADERBOARD_TOP_LIMIT) {
      updateTimerLeaderboardRowNode(
        rowNodes[rowCursor],
        String(rowCursor + 1),
        "--",
        "is-empty",
        "",
        fixedNameFontSize,
        ""
      );
      rowCursor += 1;
    }

    var myRankText = "--";
    var myIdentityAndScore = formatLeaderboardNameAndScore({
      nickname: getNickname() || (lang === "en" ? "You" : "我"),
      score: 0
    }, lang);

    if (selfEntry) {
      myRankText = String(selfEntry.rank || "--");
      myIdentityAndScore = formatLeaderboardNameAndScore(selfEntry, lang);
    }
    var selfProfileUrl = selfEntry ? buildUserProfileUrl(selfEntry.user_id, selfEntry.nickname) : "";

    updateTimerLeaderboardRowNode(
      rowNodes[TIMER_LEADERBOARD_TOP_LIMIT],
      myRankText,
      myIdentityAndScore,
      "is-self",
      "",
      fixedNameFontSize,
      selfProfileUrl
    );
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
          user_id: Math.floor(Number(item.user_id) || 0),
          score: Math.floor(Number(item.score) || 0),
          nickname: toText(item.nickname || getNickname() || "")
        };
      }
    }
    return {
      rank: "--",
      user_id: Math.floor(Number(userId) || 0),
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
          if (!data && i < apiBases.length - 1) {
            continue;
          }
          if (data && typeof data === "object") {
            return data;
          }
          return { error: "请求失败(" + response.status + ")" };
        }

        if (!data || typeof data !== "object") {
          var origin = toText(global.location && global.location.origin).trim().replace(/\/+$/, "");
          var normalizedBase = toText(base).trim().replace(/\/+$/, "");
          var isSameOriginApiBase = !!origin && normalizedBase === origin + "/api";
          if (contentType.indexOf("text/html") >= 0 && isSameOriginApiBase && apiBases.length === 1) {
            return { error: "当前站点未配置排行榜 API（/api）。" };
          }
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
      var profileUrl = buildUserProfileUrl(item.user_id, item.nickname);
      var displayNickname = normalizeLeaderboardNickname(item.nickname) || (getLanguage() === "en" ? "Anonymous" : "匿名");
      if (profileUrl) {
        var nickLink = createEl("a", "mode-intro-leaderboard-nick mode-intro-leaderboard-nick-link", displayNickname);
        nickLink.setAttribute("href", profileUrl);
        nickLink.setAttribute("title", displayNickname);
        row.appendChild(nickLink);
      } else {
        row.appendChild(createEl("span", "mode-intro-leaderboard-nick", displayNickname));
      }
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
    if (!timerBox) return true;
    ensureTimerLeaderboardPanel();
    updateTimerLeaderboardHeader();
    syncTimerLeaderboardViewMode();

    var modeKey = getCurrentModeKey();
    var modeBucket = resolveLeaderboardMode(modeKey) || "";
    if (!modeBucket) {
      renderTimerLeaderboardRows([], null);
      return true;
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
      return true;
    }

    if (timerLeaderboardLoading) return true;
    timerLeaderboardLoading = true;
    var result = await getLeaderboard(TIMER_LEADERBOARD_FETCH_LIMIT, modeBucket);
    timerLeaderboardLoading = false;

    if (!result || !result.success) {
      renderTimerLeaderboardRows([], null);
      return false;
    }

    var rows = Array.isArray(result.data) ? result.data : [];
    timerLeaderboardCacheRows = rows;
    timerLeaderboardCacheMode = modeBucket;
    timerLeaderboardCacheTime = Date.now();
    renderTimerLeaderboardRows(rows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT), resolveSelfRank(rows));
    return true;
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

  function resolvePollBaseIntervalMs() {
    return global.document.hidden ? POLL_BASE_INTERVAL_HIDDEN_MS : POLL_BASE_INTERVAL_VISIBLE_MS;
  }

  function resolveTimerRefreshIntervalMs() {
    return global.document.hidden ? TIMER_REFRESH_INTERVAL_HIDDEN_MS : TIMER_REFRESH_INTERVAL_VISIBLE_MS;
  }

  function resolveModeIntroRefreshIntervalMs() {
    return global.document.hidden ? MODE_INTRO_REFRESH_INTERVAL_HIDDEN_MS : MODE_INTRO_REFRESH_INTERVAL_VISIBLE_MS;
  }

  function clearPollingTimer() {
    if (pollingUsingScheduler) return;
    if (!pollingTickTimer) return;
    global.clearTimeout(pollingTickTimer);
    pollingTickTimer = 0;
  }

  function schedulePollingTick(immediate) {
    if (pollingUsingScheduler) return;
    clearPollingTimer();
    var delay = immediate ? 0 : resolvePollBaseIntervalMs();
    if (!immediate && pollingFailureCount > 0) {
      var scale = Math.pow(2, Math.min(pollingFailureCount, POLL_BACKOFF_MAX_STEP));
      delay = Math.min(POLL_BACKOFF_MAX_MS, delay * scale);
    }
    pollingTickTimer = global.setTimeout(runPollingTick, delay);
  }

  function bindPollingVisibilityRefresh() {
    if (pollingVisibilityBound) return;
    pollingVisibilityBound = true;
    global.document.addEventListener("visibilitychange", function () {
      if (!global.document.hidden) {
        pollingFailureCount = 0;
        if (pollingUsingScheduler) {
          var visibilityScheduler = getRefreshScheduler();
          if (visibilityScheduler && typeof visibilityScheduler.wake === "function") {
            visibilityScheduler.wake(schedulerTaskName);
          }
        } else {
          schedulePollingTick(true);
        }
      }
    });
    global.addEventListener("online", function () {
      pollingFailureCount = 0;
      if (pollingUsingScheduler) {
        var onlineScheduler = getRefreshScheduler();
        if (onlineScheduler && typeof onlineScheduler.wake === "function") {
          onlineScheduler.wake(schedulerTaskName);
        }
      } else {
        schedulePollingTick(true);
      }
    });
    global.addEventListener("focus", function () {
      if (pollingUsingScheduler) {
        var focusScheduler = getRefreshScheduler();
        if (focusScheduler && typeof focusScheduler.wake === "function") {
          focusScheduler.wake(schedulerTaskName);
        }
      } else {
        schedulePollingTick(true);
      }
    });
  }

  async function runPollingTick() {
    if (pollingTickRunning) {
      if (!pollingUsingScheduler) {
        schedulePollingTick(false);
      }
      return;
    }
    pollingTickRunning = true;
    var tickFailed = false;
    var now = Date.now();

    try {
      ensureToolkitEntryRow();
      bindModeIntroRefresh();
      syncTimerLeaderboardViewMode();
      if (typeof global.syncTimerModuleSettingsUI === "function") {
        global.syncTimerModuleSettingsUI();
      }

      await maybeSubmitScoreOnGameOver();

      if (now - pollingLastTimerRefreshTime >= resolveTimerRefreshIntervalMs()) {
        pollingLastTimerRefreshTime = now;
        var timerOk = await refreshTimerLeaderboardPanel(false);
        if (!timerOk) tickFailed = true;
      }

      if (byId("mode-intro-leaderboard") && now - pollingLastModeIntroRefreshTime >= resolveModeIntroRefreshIntervalMs()) {
        pollingLastModeIntroRefreshTime = now;
        var introOk = await refreshLeaderboard(getCurrentModeKey());
        if (!introOk) tickFailed = true;
      }
    } catch (_err) {
      tickFailed = true;
    } finally {
      pollingTickRunning = false;
      pollingFailureCount = tickFailed ? Math.min(pollingFailureCount + 1, POLL_BACKOFF_MAX_STEP) : 0;
      if (!pollingUsingScheduler) {
        schedulePollingTick(false);
      }
    }

    if (tickFailed && pollingUsingScheduler) {
      throw new Error("leaderboard_poll_tick_failed");
    }
  }

  function startPolling() {
    if (pollingStarted) return;
    pollingStarted = true;
    bindPollingVisibilityRefresh();

    var scheduler = getRefreshScheduler();
    if (scheduler && typeof scheduler.register === "function") {
      pollingUsingScheduler = true;
      scheduler.register({
        name: schedulerTaskName,
        intervalMs: POLL_BASE_INTERVAL_VISIBLE_MS,
        backgroundIntervalMs: POLL_BASE_INTERVAL_HIDDEN_MS,
        maxBackoffMs: POLL_BACKOFF_MAX_MS,
        immediate: true,
        callback: runPollingTick
      });
      return;
    }

    pollingUsingScheduler = false;
    schedulePollingTick(true);
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

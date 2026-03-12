(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var STORAGE_TOKEN_KEY = "token";
  var STORAGE_USER_ID_KEY = "userId";
  var STORAGE_NICKNAME_KEY = "nickname";
  var STORAGE_LAST_SUBMIT_KEY = "online_last_submit_signature_v1";
  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var DEFAULT_BOARD_LIMIT = 10;

  var apiBases = buildApiBaseCandidates();
  var activeApiBase = apiBases[0];
  var cachedLeaderboard = [];
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

    if (hostname === "taihe.fun" && origin) {
      push(origin + "/api");
      push("https://taihe.fun/api");
    } else if (hostname === "www.taihe.fun") {
      push("https://taihe.fun/api");
      if (origin) push(origin + "/api");
    } else {
      if (origin) push(origin + "/api");
      push("https://taihe.fun/api");
    }

    if (bases.length === 0) push("https://taihe.fun/api");
    return bases;
  }

  async function apiRequest(path, options) {
    var opts = options || {};
    var method = toText(opts.method || "GET").toUpperCase();
    var lastError = "请求失败";

    for (var i = 0; i < apiBases.length; i += 1) {
      var base = apiBases[i];
      var headers = opts.headers && typeof opts.headers === "object" ? Object.assign({}, opts.headers) : {};
      var requestInit = {
        method: method,
        headers: headers
      };

      if (opts.auth) {
        var token = getAuthToken();
        if (token) requestInit.headers.Authorization = "Bearer " + token;
      }

      if (opts.body !== undefined) {
        requestInit.headers["Content-Type"] = "application/json";
        requestInit.body = JSON.stringify(opts.body);
      }

      try {
        var response = await global.fetch(base + path, requestInit);
        var data = null;
        try {
          data = await response.json();
        } catch (_jsonErr) {
          data = null;
        }

        if (!response.ok) {
          if ((response.status === 404 || response.status === 405) && !data && i < apiBases.length - 1) {
            continue;
          }
          if (data && typeof data === "object") {
            return data;
          }
          return { error: "请求失败(" + response.status + ")" };
        }

        if (!data || typeof data !== "object") {
          return { error: "响应格式错误" };
        }

        activeApiBase = base;
        return data;
      } catch (error) {
        lastError = "网络异常: " + toText(error && error.message);
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

  function submitScore(score) {
    return apiRequest("/score", { method: "POST", auth: true, body: { score: score } });
  }

  function getLeaderboard(limit) {
    var safeLimit = Number(limit);
    if (!Number.isFinite(safeLimit) || safeLimit <= 0) safeLimit = DEFAULT_BOARD_LIMIT;
    safeLimit = Math.floor(safeLimit);
    return apiRequest("/leaderboard?limit=" + encodeURIComponent(String(safeLimit)), { method: "GET" });
  }

  function getUserInfo(userId) {
    var safeUserId = Math.floor(Number(userId) || 0);
    if (safeUserId <= 0) return Promise.resolve({ error: "无效的用户ID" });
    return apiRequest("/user/" + encodeURIComponent(String(safeUserId)), { method: "GET" });
  }

  function getToolkitCopy(lang) {
    if (lang === "en") {
      return {
        label: "Toolkit",
        palette: "Palette Center"
      };
    }
    return {
      label: "扩展中心",
      palette: "色板中心"
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

      var label = createEl("label", "", "");
      label.id = "toolkit-entry-label";
      row.appendChild(label);

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
    });

    global.addEventListener("storage", function (eventLike) {
      if (!eventLike || eventLike.key !== UI_LANG_STORAGE_KEY) return;
      applyToolkitRowText(getLanguage());
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

  async function refreshLeaderboard() {
    var result = await getLeaderboard(DEFAULT_BOARD_LIMIT);
    if (!result || !result.success) {
      renderModeIntroLeaderboard([]);
      return false;
    }
    cachedLeaderboard = Array.isArray(result.data) ? result.data : [];
    renderModeIntroLeaderboard(cachedLeaderboard);
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
    var modeKey = manager && manager.modeKey ? String(manager.modeKey) : "unknown";
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
    var result = await submitScore(score);
    submitLock = false;

    if (result && result.success) {
      safeSetStorage(STORAGE_LAST_SUBMIT_KEY, signature);
      refreshLeaderboard();
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
      if (cachedLeaderboard.length > 0) {
        renderModeIntroLeaderboard(cachedLeaderboard);
      } else {
        refreshLeaderboard();
      }
    });
  }

  function startPolling() {
    global.setInterval(function () {
      ensureToolkitEntryRow();
      bindModeIntroRefresh();
      maybeSubmitScoreOnGameOver();
    }, 1500);

    global.setInterval(function () {
      if (byId("mode-intro-leaderboard")) {
        refreshLeaderboard();
      }
    }, 30000);
  }

  function init() {
    ensureToolkitEntryRow();
    bindLanguageSync();
    bindModeIntroRefresh();
    if (byId("mode-intro-leaderboard")) {
      refreshLeaderboard();
    }
    startPolling();
  }

  global.OnlineLeaderboardRuntime = {
    refreshLeaderboard: refreshLeaderboard,
    submitScore: submitScore,
    login: login,
    register: register,
    getUserInfo: getUserInfo,
    clearAuth: clearAuth,
    getApiBase: function () { return activeApiBase; },
    saveAuth: saveAuth,
    getAuthToken: getAuthToken,
    getUserId: getUserId,
    getNickname: getNickname
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

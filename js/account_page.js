(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var STORAGE_TOKEN_KEY = "token";
  var STORAGE_USER_ID_KEY = "userId";
  var STORAGE_NICKNAME_KEY = "nickname";
  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var DEFAULT_LIMIT = 20;
  var DEFAULT_BOARD_MODE = "standard_no_undo";
  var DEFAULT_API_TIMEOUT_MS = 8000;

  var apiBases = buildApiBaseCandidates();
  var activeApiBase = apiBases[0];
  var currentLang = readLanguage();

  var COPY = {
    zh: {
      pageTitle: "2048 账号中心",
      kicker: "2048 Online Hub",
      title: "账号中心",
      subtitle: "注册、登录并查看在线排行榜。登录后游戏会自动提交结算分数。",
      navHome: "回首页",
      navPalette: "主题设置",
      navPractice: "练习板",
      authHeading: "账号",
      stateGuest: "未登录",
      stateAuthed: "已登录",
      emailLabel: "邮箱",
      emailPlaceholder: "请输入邮箱",
      passwordLabel: "密码",
      passwordPlaceholder: "请输入密码",
      loginBtn: "登录",
      registerBtn: "注册",
      logoutBtn: "退出",
      userTitle: "当前账号信息",
      userId: "用户ID：",
      userNickname: "昵称：",
      userEmail: "邮箱：",
      userCreated: "注册时间：",
      boardHeading: "在线排行榜",
      boardMode: "模式",
      boardLimit: "条数",
      boardRefresh: "刷新",
      colRank: "排名",
      colName: "昵称",
      colScore: "分数",
      colDate: "更新时间",
      boardLoading: "加载中...",
      boardEmpty: "暂无在线排行榜数据",
      boardFail: "排行榜加载失败",
      requireEmailPass: "请输入邮箱和密码",
      requireRegisterFields: "请填写邮箱和密码",
      requireNickname: "请输入昵称",
      registerNicknamePrompt: "请输入昵称（用于排行榜显示）",
      registerOk: "注册成功，请登录",
      registerFail: "注册失败",
      loginOk: "登录成功",
      loginFail: "登录失败",
      logoutOk: "已退出登录",
      userInfoFail: "用户信息加载失败",
      noUserInfo: "未找到当前用户信息",
      networkError: "网络异常"
    },
    en: {
      pageTitle: "2048 Account Center",
      kicker: "2048 Online Hub",
      title: "Account Center",
      subtitle: "Register, sign in, and view online rankings. Scores are auto-submitted after each game.",
      navHome: "Home",
      navPalette: "Theme Settings",
      navPractice: "Practice",
      authHeading: "Account",
      stateGuest: "Guest",
      stateAuthed: "Signed In",
      emailLabel: "Email",
      emailPlaceholder: "Enter email",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter password",
      loginBtn: "Login",
      registerBtn: "Register",
      logoutBtn: "Logout",
      userTitle: "Current User",
      userId: "User ID:",
      userNickname: "Nickname:",
      userEmail: "Email:",
      userCreated: "Created:",
      boardHeading: "Leaderboard",
      boardMode: "Mode",
      boardLimit: "Limit",
      boardRefresh: "Refresh",
      colRank: "Rank",
      colName: "Nickname",
      colScore: "Score",
      colDate: "Updated",
      boardLoading: "Loading...",
      boardEmpty: "No leaderboard data.",
      boardFail: "Failed to load leaderboard",
      requireEmailPass: "Please enter email and password",
      requireRegisterFields: "Please enter email and password",
      requireNickname: "Please enter nickname",
      registerNicknamePrompt: "Enter nickname for leaderboard",
      registerOk: "Registered. Please log in.",
      registerFail: "Register failed",
      loginOk: "Login success",
      loginFail: "Login failed",
      logoutOk: "Logged out",
      userInfoFail: "Failed to load user info",
      noUserInfo: "User not found",
      networkError: "Network error"
    }
  };

  var ERROR_CODE_COPY = {
    zh: {
      EMPTY: "昵称不能为空",
      LENGTH: "昵称长度需在 2-20 个字符",
      CHARS: "昵称仅支持中文、字母、数字、空格、下划线和短横线",
      INVALID: "昵称不可用，请更换",
      RESERVED: "昵称不可用，请更换",
      SENSITIVE: "昵称不可用，请更换",
      UNAUTHORIZED: "请先登录",
      INVALID_TOKEN: "登录状态已失效，请重新登录"
    },
    en: {
      EMPTY: "Nickname cannot be empty",
      LENGTH: "Nickname length must be 2-20 characters",
      CHARS: "Nickname supports letters, numbers, spaces, underscores and hyphens only",
      INVALID: "Nickname is not allowed",
      RESERVED: "Nickname is not allowed",
      SENSITIVE: "Nickname is not allowed",
      UNAUTHORIZED: "Please sign in first",
      INVALID_TOKEN: "Session expired, please sign in again"
    }
  };

  var MODE_BUCKET_ALIAS = {
    standard_no_undo: "standard_no_undo",
    standard_4x4_pow2_no_undo: "standard_no_undo",
    capped_4x4_pow2_no_undo: "standard_no_undo",
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

  var LEADERBOARD_MODE_OPTIONS = [
    { value: "standard_no_undo", zh: "普通无撤回", en: "Standard (No Undo)" },
    { value: "standard_undo", zh: "可撤回", en: "With Undo" },
    { value: "pow2_3x3", zh: "3x3", en: "3x3" },
    { value: "pow2_2x4", zh: "2x4", en: "2x4" },
    { value: "pow2_3x4", zh: "3x4", en: "3x4" },
    { value: "fib_3x3", zh: "斐波那契3x3", en: "Fibonacci 3x3" }
  ];

  function toText(value) {
    return value == null ? "" : String(value);
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

  function readLanguage() {
    var raw = toText(safeGetStorage(UI_LANG_STORAGE_KEY)).toLowerCase();
    return raw === "en" ? "en" : "zh";
  }

  function t(key) {
    var lang = currentLang === "en" ? "en" : "zh";
    return (COPY[lang] && COPY[lang][key]) || (COPY.zh && COPY.zh[key]) || "";
  }

  function resolveLeaderboardMode(modeLike) {
    var key = toText(modeLike).trim().toLowerCase();
    if (!key) return null;
    return MODE_BUCKET_ALIAS[key] || null;
  }

  function getSelectedModeBucket() {
    var modeSelect = byId("account-board-mode");
    var modeValue = toText(modeSelect && modeSelect.value).trim();
    return resolveLeaderboardMode(modeValue) || DEFAULT_BOARD_MODE;
  }

  function getToken() {
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
    var lastError = t("networkError");
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
        var token = getToken();
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
          return { error: "HTTP " + response.status };
        }

        if (!data || typeof data !== "object") {
          if (i < apiBases.length - 1) {
            continue;
          }
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

  function getLeaderboard(limit, modeLike) {
    var safeLimit = Number(limit);
    if (!Number.isFinite(safeLimit) || safeLimit <= 0) safeLimit = DEFAULT_LIMIT;
    safeLimit = Math.floor(safeLimit);

    var modeBucket = resolveLeaderboardMode(modeLike) || DEFAULT_BOARD_MODE;
    var path = "/leaderboard?limit=" + encodeURIComponent(String(safeLimit));
    if (modeBucket) path += "&mode=" + encodeURIComponent(modeBucket);
    return apiRequest(path, { method: "GET" });
  }

  function getUserInfo(userId) {
    var safeUserId = Math.floor(Number(userId) || 0);
    if (safeUserId <= 0) return Promise.resolve({ error: "invalid user id" });
    return apiRequest("/user/" + encodeURIComponent(String(safeUserId)), { method: "GET" });
  }

  function setTip(node, message, type) {
    if (!node) return;
    node.textContent = toText(message);
    node.classList.remove("ok");
    node.classList.remove("err");
    if (!message) return;
    if (type === "ok") node.classList.add("ok");
    if (type === "err") node.classList.add("err");
  }

  function formatDate(raw) {
    return toText(raw).trim() || "--";
  }

  function resolveServerError(result, fallbackKey) {
    var lang = currentLang === "en" ? "en" : "zh";
    var code = toText(result && result.code).trim().toUpperCase();

    if (code && ERROR_CODE_COPY[lang] && ERROR_CODE_COPY[lang][code]) {
      return ERROR_CODE_COPY[lang][code];
    }

    var explicit = toText(result && result.error).trim();
    if (explicit) return explicit;
    return t(fallbackKey);
  }

  function renderBoardList(resultList) {
    var host = byId("account-board-list");
    if (!host) return;
    host.innerHTML = "";

    if (!Array.isArray(resultList) || resultList.length === 0) {
      var empty = global.document.createElement("div");
      empty.className = "account-board-empty";
      empty.textContent = t("boardEmpty");
      host.appendChild(empty);
      return;
    }

    for (var i = 0; i < resultList.length; i += 1) {
      var item = resultList[i] || {};
      var row = global.document.createElement("div");
      row.className = "account-board-row";

      var rank = global.document.createElement("span");
      rank.className = "account-rank";
      rank.textContent = String(i + 1);
      row.appendChild(rank);

      var name = global.document.createElement("span");
      name.className = "account-name";
      name.textContent = toText(item.nickname || "--");
      row.appendChild(name);

      var score = global.document.createElement("span");
      score.className = "account-score";
      score.textContent = String(Number(item.score) || 0);
      row.appendChild(score);

      var date = global.document.createElement("span");
      date.className = "account-date";
      date.textContent = formatDate(item.game_date);
      row.appendChild(date);

      host.appendChild(row);
    }
  }

  function refreshModeSelectOptions() {
    var modeSelect = byId("account-board-mode");
    if (!modeSelect) return;

    var lang = currentLang === "en" ? "en" : "zh";
    var prevValue = resolveLeaderboardMode(modeSelect.value) || DEFAULT_BOARD_MODE;
    modeSelect.innerHTML = "";

    for (var i = 0; i < LEADERBOARD_MODE_OPTIONS.length; i += 1) {
      var optionDef = LEADERBOARD_MODE_OPTIONS[i];
      var optionEl = global.document.createElement("option");
      optionEl.value = optionDef.value;
      optionEl.textContent = lang === "en" ? optionDef.en : optionDef.zh;
      modeSelect.appendChild(optionEl);
    }

    modeSelect.value = prevValue;
    if (!modeSelect.value) modeSelect.value = DEFAULT_BOARD_MODE;
  }

  function resetUserInfo() {
    var id = byId("account-user-id");
    var nick = byId("account-user-nickname");
    var email = byId("account-user-email");
    var created = byId("account-user-created");
    if (id) id.textContent = "--";
    if (nick) nick.textContent = "--";
    if (email) email.textContent = "--";
    if (created) created.textContent = "--";
  }

  async function refreshUserInfo() {
    var userId = getUserId();
    if (!userId) {
      resetUserInfo();
      return;
    }

    var result = await getUserInfo(userId);
    if (!result || !result.success || !result.data) {
      setTip(byId("account-auth-tip"), resolveServerError(result, "userInfoFail"), "err");
      return;
    }

    var data = result.data || {};
    var id = byId("account-user-id");
    var nick = byId("account-user-nickname");
    var email = byId("account-user-email");
    var created = byId("account-user-created");
    if (id) id.textContent = toText(data.id || "--");
    if (nick) nick.textContent = toText(data.nickname || getNickname() || "--");
    if (email) email.textContent = toText(data.email || "--");
    if (created) created.textContent = formatDate(data.created_at);
  }

  function syncAuthState() {
    var token = getToken();
    var isAuthed = !!token;

    var stateTag = byId("account-auth-state-tag");
    if (stateTag) {
      stateTag.textContent = isAuthed ? t("stateAuthed") : t("stateGuest");
    }

    var authGrid = byId("account-auth-grid");
    var actionRow = byId("account-action-row");
    var authTip = byId("account-auth-tip");
    var loginBtn = byId("account-login-btn");
    var registerBtn = byId("account-register-btn");
    var logoutBtn = byId("account-logout-btn");
    var passwordInput = byId("account-password");

    if (authGrid) authGrid.style.display = isAuthed ? "none" : "";
    if (actionRow) actionRow.style.display = "";
    if (loginBtn) loginBtn.style.display = isAuthed ? "none" : "";
    if (registerBtn) registerBtn.style.display = isAuthed ? "none" : "";
    if (logoutBtn) logoutBtn.style.display = isAuthed ? "" : "none";
    if (authTip) authTip.style.display = isAuthed ? "none" : "";

    if (isAuthed && passwordInput) passwordInput.value = "";
  }

  async function refreshLeaderboard() {
    var boardTip = byId("account-board-tip");
    var limit = Number(toText(byId("account-board-limit") && byId("account-board-limit").value));
    var modeBucket = getSelectedModeBucket();

    setTip(boardTip, t("boardLoading"), "");
    var result = await getLeaderboard(limit, modeBucket);
    if (!result || !result.success) {
      renderBoardList([]);
      setTip(boardTip, resolveServerError(result, "boardFail"), "err");
      return;
    }

    renderBoardList(Array.isArray(result.data) ? result.data : []);
    setTip(boardTip, "API: " + activeApiBase, "ok");
  }

  function promptRegisterNickname() {
    var promptText = t("registerNicknamePrompt");
    if (typeof global.prompt !== "function") return null;
    var nickname = global.prompt(promptText, "");
    if (nickname == null) return null;
    return toText(nickname).trim();
  }

  async function onRegisterClick() {
    var email = toText(byId("account-email") && byId("account-email").value).trim();
    var password = toText(byId("account-password") && byId("account-password").value).trim();

    if (!email || !password) {
      setTip(byId("account-auth-tip"), t("requireRegisterFields"), "err");
      return;
    }

    var nickname = promptRegisterNickname();
    if (nickname === null) return;
    if (!nickname) {
      setTip(byId("account-auth-tip"), t("requireNickname"), "err");
      return;
    }

    var result = await register({ email: email, password: password, nickname: nickname });
    if (result && result.success) {
      setTip(byId("account-auth-tip"), t("registerOk"), "ok");
      return;
    }

    setTip(byId("account-auth-tip"), resolveServerError(result, "registerFail"), "err");
  }

  async function onLoginClick() {
    var email = toText(byId("account-email") && byId("account-email").value).trim();
    var password = toText(byId("account-password") && byId("account-password").value).trim();

    if (!email || !password) {
      setTip(byId("account-auth-tip"), t("requireEmailPass"), "err");
      return;
    }

    var result = await login({ email: email, password: password });
    if (result && result.success) {
      saveAuth(result);
      syncAuthState();
      setTip(byId("account-auth-tip"), t("loginOk"), "ok");
      refreshUserInfo();
      refreshLeaderboard();
      return;
    }

    setTip(byId("account-auth-tip"), resolveServerError(result, "loginFail"), "err");
  }

  function onLogoutClick() {
    clearAuth();
    syncAuthState();
    resetUserInfo();
    setTip(byId("account-auth-tip"), t("logoutOk"), "ok");
  }

  function applyLanguage() {
    currentLang = readLanguage();

    global.document.title = t("pageTitle");

    var textMap = {
      "account-kicker": t("kicker"),
      "account-title": t("title"),
      "account-subtitle": t("subtitle"),
      "account-nav-home": t("navHome"),
      "account-nav-palette": t("navPalette"),
      "account-nav-practice": t("navPractice"),
      "account-auth-heading": t("authHeading"),
      "account-email-label": t("emailLabel"),
      "account-password-label": t("passwordLabel"),
      "account-login-btn": t("loginBtn"),
      "account-register-btn": t("registerBtn"),
      "account-logout-btn": t("logoutBtn"),
      "account-user-title": t("userTitle"),
      "account-user-id-label": t("userId"),
      "account-user-nickname-label": t("userNickname"),
      "account-user-email-label": t("userEmail"),
      "account-user-created-label": t("userCreated"),
      "account-board-heading": t("boardHeading"),
      "account-board-mode-label": t("boardMode"),
      "account-board-limit-label": t("boardLimit"),
      "account-board-refresh": t("boardRefresh"),
      "account-col-rank": t("colRank"),
      "account-col-name": t("colName"),
      "account-col-score": t("colScore"),
      "account-col-date": t("colDate")
    };

    var keys = Object.keys(textMap);
    for (var i = 0; i < keys.length; i += 1) {
      var id = keys[i];
      var node = byId(id);
      if (node) node.textContent = textMap[id];
    }

    var emailInput = byId("account-email");
    var passwordInput = byId("account-password");
    if (emailInput) emailInput.setAttribute("placeholder", t("emailPlaceholder"));
    if (passwordInput) passwordInput.setAttribute("placeholder", t("passwordPlaceholder"));
    refreshModeSelectOptions();

    syncAuthState();
    refreshLeaderboard();
  }

  function bindEvents() {
    var loginBtn = byId("account-login-btn");
    var registerBtn = byId("account-register-btn");
    var logoutBtn = byId("account-logout-btn");
    var refreshBtn = byId("account-board-refresh");
    var limitSelect = byId("account-board-limit");
    var modeSelect = byId("account-board-mode");

    if (loginBtn) loginBtn.addEventListener("click", onLoginClick);
    if (registerBtn) registerBtn.addEventListener("click", onRegisterClick);
    if (logoutBtn) logoutBtn.addEventListener("click", onLogoutClick);
    if (refreshBtn) refreshBtn.addEventListener("click", refreshLeaderboard);
    if (limitSelect) {
      limitSelect.value = String(DEFAULT_LIMIT);
      limitSelect.addEventListener("change", refreshLeaderboard);
    }
    if (modeSelect) {
      modeSelect.value = DEFAULT_BOARD_MODE;
      modeSelect.addEventListener("change", refreshLeaderboard);
    }

    global.addEventListener("storage", function (eventLike) {
      if (!eventLike) return;
      if (eventLike.key === UI_LANG_STORAGE_KEY) {
        applyLanguage();
      }
      if (eventLike.key === STORAGE_TOKEN_KEY || eventLike.key === STORAGE_USER_ID_KEY || eventLike.key === STORAGE_NICKNAME_KEY) {
        syncAuthState();
        refreshUserInfo();
      }
    });

    global.addEventListener("uilanguagechange", function () {
      applyLanguage();
    });
  }

  function init() {
    bindEvents();
    applyLanguage();
    syncAuthState();
    refreshUserInfo();
    refreshLeaderboard();
  }

  global.AccountPageRuntime = {
    refreshLeaderboard: refreshLeaderboard,
    register: register,
    login: login,
    getUserInfo: getUserInfo,
    getApiBase: function () { return activeApiBase; }
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

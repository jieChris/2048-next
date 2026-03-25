(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var STORAGE_TOKEN_KEY = "2048_auth_token_v1";
  var STORAGE_USER_ID_KEY = "2048_auth_userId_v1";
  var STORAGE_NICKNAME_KEY = "2048_auth_nickname_v1";
  var UI_LANG_STORAGE_KEY = "ui_language_v1";

  function resolveLocalStorage() {
    try {
      if (!global || !global.localStorage) return null;
      return global.localStorage;
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

  // --- localStorage key migration (old bare keys -> namespaced keys) ---
  (function migrateStorageKeys() {
    var migrations = [
      { oldKey: "token",    newKey: STORAGE_TOKEN_KEY },
      { oldKey: "userId",   newKey: STORAGE_USER_ID_KEY },
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
  var DEFAULT_LIMIT = 8;
  var DEFAULT_BOARD_MODE = "standard_no_undo";
  var DEFAULT_BOARD_METRIC = "score";
  var DEFAULT_API_TIMEOUT_MS = 12000;

  // --- shared API utilities (from api_shared_utils.js) ---
  var _u = global.ApiSharedUtils || {};
  var toText = _u.toText || function (v) { return v == null ? "" : String(v); };
  var safeGetStorage = _u.safeGetStorage || function () { return null; };
  var safeSetStorage = _u.safeSetStorage || function () {};
  var safeRemoveStorage = _u.safeRemoveStorage || function () {};
  var buildApiBaseCandidates = _u.buildApiBaseCandidates || function () { return []; };
  var resolveApiTimeoutMs = _u.resolveApiTimeoutMs || function () { return DEFAULT_API_TIMEOUT_MS; };
  var callFetch = _u.callFetch || function (url, requestInit) {
    if (!global || typeof global["fetch"] !== "function") {
      return Promise.reject(new Error("fetch_unavailable"));
    }
    return global["fetch"](url, requestInit);
  };

  var apiBases = buildApiBaseCandidates();
  var activeApiBase = apiBases[0];
  var currentLang = readLanguage();
  var loginCaptchaRequired = false;
  var loginCaptchaId = "";
  var loginCaptchaLoading = false;
  var leaderboardPage = 1;
  var leaderboardTotalPages = 0;
  var leaderboardHasPrev = false;
  var leaderboardHasNext = false;

  var COPY = {
    zh: {
      pageTitle: "2048 账号中心",
      kicker: "2048 Online Hub",
      title: "账号中心",
      subtitle: "登录后可查看在线排行榜。",
      navSettings: "账号设置",
      navHome: "回首页",
      navPalette: "主题设置",
      navPractice: "练习板",
      navRegister: "去注册",
      authHeading: "账号",
      authSubtitle: "登录后可同步成绩并查看在线排行。",
      stateGuest: "未登录",
      stateAuthed: "已登录",
      emailLabel: "邮箱",
      emailPlaceholder: "请输入邮箱",
      passwordLabel: "密码",
      passwordPlaceholder: "请输入密码",
      loginCaptchaLabel: "图片验证码",
      loginCaptchaPlaceholder: "请输入图片验证码",
      loginCaptchaRefresh: "换一张",
      loginCaptchaLoading: "正在加载图片验证码...",
      loginCaptchaPrompt: "登录失败次数过多，请先完成图片验证码",
      loginBtn: "登录",
      registerBtn: "去注册",
      resetPasswordBtn: "找回密码",
      userTitle: "当前账号信息",
      userNickname: "昵称：",
      userEmail: "邮箱：",
      userCreated: "注册时间：",
      boardHeading: "在线排行榜",
      boardSubtitle: "按模式和榜单筛选后查看排行。",
      boardMode: "模式",
      boardMetric: "榜单",
      boardLimit: "条数",
      boardRefresh: "刷新",
      boardRefreshing: "刷新中...",
      boardPrev: "上一页",
      boardNext: "下一页",
      boardMetricScore: "分数",
      boardMetricMinSteps2k: "合成2K最少步数",
      boardMetricMinSteps4k: "合成4K最少步数",
      boardMetricMinSteps8k: "合成8K最少步数",
      colRank: "排名",
      colName: "昵称",
      colScore: "分数",
      colMinSteps: "最少步数",
      colDate: "更新时间",
      boardLoading: "加载中...",
      boardEmpty: "暂无在线排行榜数据",
      boardFail: "排行榜加载失败",
      boardUpdated: "排行榜已更新",
      invalidEmailFormat: "请输入正确的邮箱格式",
      invalidPasswordPolicy: "密码需为8-16位，且至少包含字母/数字/符号中的两种",
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
      networkError: "网络异常",
      apiNotConfigured: "当前站点未配置排行榜 API（/api）"
    },
    en: {
      pageTitle: "2048 Account Center",
      kicker: "2048 Online Hub",
      title: "Account Center",
      subtitle: "Sign in to view online rankings.",
      navSettings: "Account Settings",
      navHome: "Home",
      navPalette: "Theme Settings",
      navPractice: "Practice",
      navRegister: "Create Account",
      authHeading: "Account",
      authSubtitle: "Sign in to sync records and compare rankings.",
      stateGuest: "Guest",
      stateAuthed: "Signed In",
      emailLabel: "Email",
      emailPlaceholder: "Enter email",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter password",
      loginCaptchaLabel: "Image captcha",
      loginCaptchaPlaceholder: "Enter captcha",
      loginCaptchaRefresh: "Refresh",
      loginCaptchaLoading: "Loading captcha...",
      loginCaptchaPrompt: "Too many failed logins, complete captcha first",
      loginBtn: "Login",
      registerBtn: "Create Account",
      resetPasswordBtn: "Forgot Password",
      userTitle: "Current User",
      userNickname: "Nickname:",
      userEmail: "Email:",
      userCreated: "Created:",
      boardHeading: "Leaderboard",
      boardSubtitle: "Filter by mode and metric.",
      boardMode: "Mode",
      boardMetric: "Metric",
      boardLimit: "Limit",
      boardRefresh: "Refresh",
      boardRefreshing: "Refreshing...",
      boardPrev: "Prev",
      boardNext: "Next",
      boardMetricScore: "Score",
      boardMetricMinSteps2k: "Fewest Steps to 2K",
      boardMetricMinSteps4k: "Fewest Steps to 4K",
      boardMetricMinSteps8k: "Fewest Steps to 8K",
      colRank: "Rank",
      colName: "Nickname",
      colScore: "Score",
      colMinSteps: "Fewest Steps",
      colDate: "Updated",
      boardLoading: "Loading...",
      boardEmpty: "No leaderboard data.",
      boardFail: "Failed to load leaderboard",
      boardUpdated: "Leaderboard updated",
      invalidEmailFormat: "Please enter a valid email address",
      invalidPasswordPolicy: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
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
      networkError: "Network error",
      apiNotConfigured: "API not configured on this host (/api)"
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
      INVALID_TOKEN: "登录状态已失效，请重新登录",
      INVALID_EMAIL: "邮箱格式不正确",
      WEAK_PASSWORD: "密码需为8-16位，且至少包含字母/数字/符号中的两种",
      INVALID_CREDENTIALS: "邮箱或密码错误",
      IMAGE_CAPTCHA_REQUIRED: "请先完成图片验证码",
      IMAGE_CAPTCHA_INVALID: "图片验证码错误，请重试",
      IMAGE_CAPTCHA_EXPIRED: "图片验证码已过期，请刷新后重试",
      IMAGE_CAPTCHA_ATTEMPTS_EXCEEDED: "图片验证码尝试次数过多，请刷新后重试"
    },
    en: {
      EMPTY: "Nickname cannot be empty",
      LENGTH: "Nickname length must be 2-20 characters",
      CHARS: "Nickname supports letters, numbers, spaces, underscores and hyphens only",
      INVALID: "Nickname is not allowed",
      RESERVED: "Nickname is not allowed",
      SENSITIVE: "Nickname is not allowed",
      UNAUTHORIZED: "Please sign in first",
      INVALID_TOKEN: "Session expired, please sign in again",
      INVALID_EMAIL: "Invalid email format",
      WEAK_PASSWORD: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
      INVALID_CREDENTIALS: "Invalid email or password",
      IMAGE_CAPTCHA_REQUIRED: "Please complete image captcha",
      IMAGE_CAPTCHA_INVALID: "Incorrect image captcha",
      IMAGE_CAPTCHA_EXPIRED: "Image captcha expired, please refresh",
      IMAGE_CAPTCHA_ATTEMPTS_EXCEEDED: "Too many captcha attempts, please refresh"
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
  var LEADERBOARD_METRIC_ALIAS = {
    score: "score",
    by_score: "score",
    min_steps_2048: "min_steps_2048",
    least_steps_2k: "min_steps_2048",
    least_steps_2048: "min_steps_2048",
    steps_to_2048: "min_steps_2048",
    min_steps_4096: "min_steps_4096",
    least_steps_4k: "min_steps_4096",
    least_steps_4096: "min_steps_4096",
    steps_to_4096: "min_steps_4096",
    min_steps_8192: "min_steps_8192",
    least_steps_8k: "min_steps_8192",
    least_steps_8192: "min_steps_8192",
    steps_to_8192: "min_steps_8192"
  };

  var LEADERBOARD_MODE_OPTIONS = [
    { value: "standard_no_undo", zh: "普通无撤回", en: "Standard (No Undo)" },
    { value: "standard_undo", zh: "可撤回", en: "With Undo" },
    { value: "pow2_3x3", zh: "3x3", en: "3x3" },
    { value: "pow2_2x4", zh: "2x4", en: "2x4" },
    { value: "pow2_3x4", zh: "3x4", en: "3x4" },
    { value: "fib_3x3", zh: "斐波那契3x3", en: "Fibonacci 3x3" }
  ];
  var LEADERBOARD_METRIC_OPTIONS = [
    { value: "score", copyKey: "boardMetricScore" },
    { value: "min_steps_2048", copyKey: "boardMetricMinSteps2k" },
    { value: "min_steps_4096", copyKey: "boardMetricMinSteps4k" },
    { value: "min_steps_8192", copyKey: "boardMetricMinSteps8k" }
  ];

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

  function resolveLeaderboardMode(modeLike) {
    var key = toText(modeLike).trim().toLowerCase();
    if (!key) return null;
    return MODE_BUCKET_ALIAS[key] || null;
  }

  function resolveLeaderboardMetric(metricLike) {
    var key = toText(metricLike).trim().toLowerCase();
    if (!key) return null;
    return LEADERBOARD_METRIC_ALIAS[key] || null;
  }

  function resolveMetricTargetTile(metricLike) {
    var metric = resolveLeaderboardMetric(metricLike);
    if (metric === "min_steps_2048") return 2048;
    if (metric === "min_steps_4096") return 4096;
    if (metric === "min_steps_8192") return 8192;
    return null;
  }

  function isValidEmailFormat(emailLike) {
    var email = toText(emailLike).trim();
    if (!email || email.length > 254) return false;
    if (/\s/.test(email)) return false;
    var atIndex = email.indexOf("@");
    if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) return false;
    var localPart = email.slice(0, atIndex);
    var domainPart = email.slice(atIndex + 1);
    if (!localPart || !domainPart) return false;
    if (localPart.length > 64) return false;
    if (localPart.indexOf("..") >= 0 || domainPart.indexOf("..") >= 0) return false;
    if (!/^[A-Za-z0-9._%+-]+$/.test(localPart)) return false;
    if (!/^[A-Za-z0-9.-]+$/.test(domainPart)) return false;
    var labels = domainPart.split(".");
    if (labels.length < 2) return false;
    for (var i = 0; i < labels.length; i += 1) {
      var label = labels[i];
      if (!label || label.length > 63) return false;
      if (label.charAt(0) === "-" || label.charAt(label.length - 1) === "-") return false;
      if (!/^[A-Za-z0-9-]+$/.test(label)) return false;
    }
    var tld = labels[labels.length - 1];
    if (!/^[A-Za-z]{2,63}$/.test(tld)) return false;
    return true;
  }

  function isValidRegisterPassword(passwordLike) {
    var password = toText(passwordLike);
    if (password.length < 8 || password.length > 16) return false;
    if (/\s/.test(password)) return false;
    var groups = 0;
    if (/[A-Za-z]/.test(password)) groups += 1;
    if (/[0-9]/.test(password)) groups += 1;
    if (/[^A-Za-z0-9]/.test(password)) groups += 1;
    return groups >= 2;
  }

  function getSelectedModeBucket() {
    var modeSelect = byId("account-board-mode");
    var modeValue = toText(modeSelect && modeSelect.value).trim();
    return resolveLeaderboardMode(modeValue) || DEFAULT_BOARD_MODE;
  }

  function getSelectedLeaderboardMetric() {
    var metricSelect = byId("account-board-metric");
    var metricValue = toText(metricSelect && metricSelect.value).trim();
    return resolveLeaderboardMetric(metricValue) || DEFAULT_BOARD_METRIC;
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
    var userIdValue = toText(
      payload && (
        payload.userId != null
          ? payload.userId
          : (payload.user_id != null ? payload.user_id : payload.id)
      )
    ).trim();
    safeSetStorage(STORAGE_TOKEN_KEY, toText(payload && payload.token));
    if (userIdValue) {
      safeSetStorage(STORAGE_USER_ID_KEY, userIdValue);
    } else {
      safeRemoveStorage(STORAGE_USER_ID_KEY);
    }
    safeSetStorage(STORAGE_NICKNAME_KEY, toText(payload && payload.nickname));
  }

  function clearAuth() {
    safeRemoveStorage(STORAGE_TOKEN_KEY);
    safeRemoveStorage(STORAGE_USER_ID_KEY);
    safeRemoveStorage(STORAGE_NICKNAME_KEY);
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
          if (!data && i < apiBases.length - 1) {
            continue;
          }
          if (data && typeof data === "object") {
            return data;
          }
          return { error: "HTTP " + response.status };
        }

        if (!data || typeof data !== "object") {
          var origin = toText(global.location && global.location.origin).trim().replace(/\/+$/, "");
          var normalizedBase = toText(base).trim().replace(/\/+$/, "");
          var isSameOriginApiBase = !!origin && normalizedBase === origin + "/api";
          if (contentType.indexOf("text/html") >= 0 && isSameOriginApiBase && apiBases.length === 1) {
            return { error: t("apiNotConfigured") };
          }
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

  function resolveLoginCaptchaCode(result) {
    return toText(result && result.code).trim().toUpperCase();
  }

  function shouldRequireLoginCaptcha(result) {
    if (!result || typeof result !== "object") return false;
    if (result.captcha_required === true || toText(result.captcha_required) === "true") return true;

    var code = resolveLoginCaptchaCode(result);
    return (
      code === "IMAGE_CAPTCHA_REQUIRED" ||
      code === "IMAGE_CAPTCHA_INVALID" ||
      code === "IMAGE_CAPTCHA_EXPIRED" ||
      code === "IMAGE_CAPTCHA_ATTEMPTS_EXCEEDED"
    );
  }

  function setLoginCaptchaRequiredState(required) {
    loginCaptchaRequired = !!required;
    var wrap = byId("account-login-captcha-wrap");
    if (wrap) wrap.style.display = loginCaptchaRequired ? "grid" : "none";

    if (loginCaptchaRequired) return;

    loginCaptchaId = "";
    var imageNode = byId("account-login-captcha-image");
    var inputNode = byId("account-login-captcha-answer");
    if (imageNode) imageNode.removeAttribute("src");
    if (inputNode) inputNode.value = "";
  }

  async function refreshLoginCaptchaChallenge(showErrorTip) {
    if (loginCaptchaLoading) return false;
    loginCaptchaLoading = true;
    if (showErrorTip) setTip(byId("account-auth-tip"), t("loginCaptchaLoading"), "");

    var refreshBtn = byId("account-login-captcha-refresh");
    if (refreshBtn) refreshBtn.disabled = true;

    try {
      var result = await apiRequest("/login/captcha", { method: "GET" });
      var captchaId = toText(result && result.captcha_id).trim();
      var imageDataUrl = toText(result && result.captcha_image_data_url).trim();
      if (!result || !result.success || !captchaId || !imageDataUrl) {
        if (showErrorTip) setTip(byId("account-auth-tip"), resolveServerError(result, "loginFail"), "err");
        return false;
      }

      loginCaptchaId = captchaId;
      var imageNode = byId("account-login-captcha-image");
      if (imageNode) imageNode.setAttribute("src", imageDataUrl);
      var inputNode = byId("account-login-captcha-answer");
      if (inputNode) {
        inputNode.value = "";
        try { inputNode.focus(); } catch (_err) {}
      }
      return true;
    } finally {
      loginCaptchaLoading = false;
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  function getLeaderboard(limit, modeLike, pageLike, metricLike) {
    var safeLimit = Number(limit);
    if (!Number.isFinite(safeLimit) || safeLimit <= 0) safeLimit = DEFAULT_LIMIT;
    safeLimit = Math.floor(safeLimit);
    var safePage = Number(pageLike);
    if (!Number.isFinite(safePage) || safePage <= 0) safePage = 1;
    safePage = Math.floor(safePage);

    var modeBucket = resolveLeaderboardMode(modeLike) || DEFAULT_BOARD_MODE;
    var metric = resolveLeaderboardMetric(metricLike) || DEFAULT_BOARD_METRIC;
    var path = "/leaderboard?page=" + encodeURIComponent(String(safePage));
    path += "&page_size=" + encodeURIComponent(String(safeLimit));
    path += "&limit=" + encodeURIComponent(String(safeLimit));
    if (modeBucket) path += "&mode=" + encodeURIComponent(modeBucket);
    if (metric) path += "&metric=" + encodeURIComponent(metric);
    var metricTargetTile = resolveMetricTargetTile(metric);
    if (metricTargetTile) path += "&target_tile=" + encodeURIComponent(String(metricTargetTile));
    return apiRequest(path, { method: "GET" });
  }

  function getUserInfo(userId) {
    var safeUserId = Math.floor(Number(userId) || 0);
    if (safeUserId <= 0) return Promise.resolve({ error: "invalid user id" });
    return apiRequest("/user/" + encodeURIComponent(String(safeUserId)), { method: "GET" });
  }

  function getMyUserInfo() {
    return apiRequest("/me", { method: "GET", auth: true });
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

  function resolvePagerMeta(result, fallbackPage, pageSize, itemCount) {
    var page = Math.floor(Number(fallbackPage) || 1);
    if (page <= 0) page = 1;
    var size = Math.floor(Number(pageSize) || DEFAULT_LIMIT);
    if (size <= 0) size = DEFAULT_LIMIT;
    var count = Math.max(0, Math.floor(Number(itemCount) || 0));

    var pagination = (result && (result.pagination || result.page_info || result.meta)) || {};
    var rawPage = Math.floor(
      Number(
        pagination.page != null ? pagination.page :
        pagination.current_page != null ? pagination.current_page :
        page
      ) || page
    );
    if (rawPage <= 0) rawPage = page;

    var rawTotalPages = Math.floor(
      Number(
        pagination.total_pages != null ? pagination.total_pages :
        pagination.pages != null ? pagination.pages :
        pagination.page_count != null ? pagination.page_count :
        0
      ) || 0
    );
    if (rawTotalPages < 0) rawTotalPages = 0;

    var hasPrev = typeof pagination.has_prev === "boolean" ? pagination.has_prev : rawPage > 1;
    var hasNext = typeof pagination.has_next === "boolean"
      ? pagination.has_next
      : (rawTotalPages > 0 ? rawPage < rawTotalPages : count >= size);

    return {
      page: rawPage,
      totalPages: rawTotalPages,
      hasPrev: !!hasPrev,
      hasNext: !!hasNext
    };
  }

  function resolveBoardPageText(page, totalPages) {
    var safePage = Math.max(1, Math.floor(Number(page) || 1));
    var safeTotal = Math.max(0, Math.floor(Number(totalPages) || 0));
    if (currentLang === "en") {
      return safeTotal > 0 ? "Page " + safePage + "/" + safeTotal : "Page " + safePage;
    }
    return safeTotal > 0 ? "第" + safePage + "/" + safeTotal + "页" : "第" + safePage + "页";
  }

  function syncLeaderboardPagerUi() {
    var pageNode = byId("account-board-page");
    if (pageNode) {
      pageNode.textContent = resolveBoardPageText(leaderboardPage, leaderboardTotalPages);
    }
    var prevBtn = byId("account-board-prev");
    var nextBtn = byId("account-board-next");
    if (prevBtn) prevBtn.disabled = !leaderboardHasPrev;
    if (nextBtn) nextBtn.disabled = !leaderboardHasNext;
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

  function isTimeoutErrorText(textLike) {
    var text = toText(textLike).toLowerCase();
    return text.indexOf("timeout") >= 0 || text.indexOf("超时") >= 0;
  }

  function resolveMetricValueFromKeys(item, keys) {
    if (!item || !Array.isArray(keys)) return null;
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (!key) continue;
      var value = Number(item[key]);
      if (Number.isFinite(value) && value > 0) return Math.floor(value);
    }
    return null;
  }

  function resolveLeaderboardDisplayValue(item, metricLike) {
    var metric = resolveLeaderboardMetric(metricLike) || DEFAULT_BOARD_METRIC;
    if (metric === "score") {
      return Math.floor(Number(item && item.score) || 0);
    }
    if (metric === "min_steps_2048") {
      return resolveMetricValueFromKeys(item, [
        "min_steps_2048",
        "least_steps_2048",
        "least_steps_2k",
        "steps_to_2048"
      ]);
    }
    if (metric === "min_steps_4096") {
      return resolveMetricValueFromKeys(item, [
        "min_steps_4096",
        "least_steps_4096",
        "least_steps_4k",
        "steps_to_4096"
      ]);
    }
    if (metric === "min_steps_8192") {
      return resolveMetricValueFromKeys(item, [
        "min_steps_8192",
        "least_steps_8192",
        "least_steps_8k",
        "steps_to_8192"
      ]);
    }
    return null;
  }

  function syncLeaderboardMetricColumnHeader(metricLike) {
    var scoreHeader = byId("account-col-score");
    if (!scoreHeader) return;
    var metric = resolveLeaderboardMetric(metricLike) || DEFAULT_BOARD_METRIC;
    scoreHeader.textContent = metric === "score" ? t("colScore") : t("colMinSteps");
  }

  function renderBoardList(resultList, pageLike, pageSizeLike, metricLike, stateLike) {
    var host = byId("account-board-list");
    if (!host) return;
    host.innerHTML = "";
    var renderState = toText(stateLike).toLowerCase() === "error" ? "error" : "ready";
    var safePage = Math.floor(Number(pageLike) || 1);
    if (safePage <= 0) safePage = 1;
    var safePageSize = Math.floor(Number(pageSizeLike) || DEFAULT_LIMIT);
    if (safePageSize <= 0) safePageSize = DEFAULT_LIMIT;
    var rankOffset = (safePage - 1) * safePageSize;

    if (!Array.isArray(resultList) || resultList.length === 0) {
      var empty = global.document.createElement("div");
      if (renderState === "error") {
        empty.className = "account-board-empty err is-error";
        empty.textContent = t("boardFail");
        host.setAttribute("data-board-state", "error");
      } else {
        empty.className = "account-board-empty is-empty";
        empty.textContent = t("boardEmpty");
        host.setAttribute("data-board-state", "empty");
      }
      empty.setAttribute("role", "status");
      host.appendChild(empty);
      return;
    }
    host.setAttribute("data-board-state", "ready");

    for (var i = 0; i < resultList.length; i += 1) {
      var item = resultList[i] || {};
      var row = global.document.createElement("div");
      row.className = "account-board-row";
      var absoluteRank = rankOffset + i + 1;
      if (absoluteRank === 1) {
        row.classList.add("is-rank-top1");
      } else if (absoluteRank === 2) {
        row.classList.add("is-rank-top2");
      } else if (absoluteRank === 3) {
        row.classList.add("is-rank-top3");
      }

      var rank = global.document.createElement("span");
      rank.className = "account-rank";
      rank.textContent = String(absoluteRank);
      row.appendChild(rank);

      var name = global.document.createElement("span");
      var userProfileUrl = buildUserProfileUrl(item.user_id, item.nickname);
      var displayNickname = normalizeLeaderboardNickname(item.nickname) || "--";
      if (userProfileUrl) {
        name = global.document.createElement("a");
        name.className = "account-name account-name-link";
        name.setAttribute("href", userProfileUrl);
        name.setAttribute("title", displayNickname);
      } else {
        name.className = "account-name";
      }
      name.textContent = displayNickname;
      row.appendChild(name);

      var score = global.document.createElement("span");
      score.className = "account-score";
      var displayValue = resolveLeaderboardDisplayValue(item, metricLike);
      score.textContent = displayValue == null ? "--" : String(displayValue);
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

  function refreshMetricSelectOptions() {
    var metricSelect = byId("account-board-metric");
    if (!metricSelect) return;

    var prevValue = resolveLeaderboardMetric(metricSelect.value) || DEFAULT_BOARD_METRIC;
    metricSelect.innerHTML = "";

    for (var i = 0; i < LEADERBOARD_METRIC_OPTIONS.length; i += 1) {
      var optionDef = LEADERBOARD_METRIC_OPTIONS[i];
      var optionEl = global.document.createElement("option");
      optionEl.value = optionDef.value;
      optionEl.textContent = t(optionDef.copyKey);
      metricSelect.appendChild(optionEl);
    }

    metricSelect.value = prevValue;
    if (!metricSelect.value) metricSelect.value = DEFAULT_BOARD_METRIC;
  }

  function resetUserInfo() {
    var nick = byId("account-user-nickname");
    var email = byId("account-user-email");
    var created = byId("account-user-created");
    if (nick) nick.textContent = "--";
    if (email) email.textContent = "--";
    if (created) created.textContent = "--";
  }

  async function refreshUserInfo() {
    if (!getToken()) {
      resetUserInfo();
      return;
    }

    var result = await getMyUserInfo();
    if (!result || !result.success || !result.data) {
      setTip(byId("account-auth-tip"), resolveServerError(result, "userInfoFail"), "err");
      return;
    }

    var data = result.data || {};
    var nick = byId("account-user-nickname");
    var email = byId("account-user-email");
    var created = byId("account-user-created");
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
    var registerBtn = byId("account-open-register-btn");
    var resetPasswordBtn = byId("account-open-reset-password-btn");
    var settingsNavBtn = byId("account-nav-settings");
    var passwordInput = byId("account-password");
    var captchaWrap = byId("account-login-captcha-wrap");

    if (authGrid) authGrid.style.display = isAuthed ? "none" : "";
    if (actionRow) actionRow.style.display = "";
    if (loginBtn) loginBtn.style.display = isAuthed ? "none" : "";
    if (registerBtn) registerBtn.style.display = isAuthed ? "none" : "";
    if (resetPasswordBtn) resetPasswordBtn.style.display = isAuthed ? "none" : "";
    if (settingsNavBtn) settingsNavBtn.style.display = isAuthed ? "" : "none";
    if (authTip) authTip.style.display = isAuthed ? "none" : "";
    if (captchaWrap) captchaWrap.style.display = isAuthed ? "none" : (loginCaptchaRequired ? "grid" : "none");

    if (isAuthed) {
      if (passwordInput) passwordInput.value = "";
      setLoginCaptchaRequiredState(false);
    }
  }

  async function refreshLeaderboard(resetPage) {
    var boardTip = byId("account-board-tip");
    var refreshBtn = byId("account-board-refresh");
    var boardList = byId("account-board-list");
    var modeBucket = getSelectedModeBucket();
    var metric = getSelectedLeaderboardMetric();
    var safeLimit = DEFAULT_LIMIT;
    if (resetPage === true) leaderboardPage = 1;

    syncLeaderboardMetricColumnHeader(metric);
    setTip(boardTip, t("boardLoading"), "");
    if (boardList) boardList.setAttribute("data-board-state", "loading");
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.classList.add("is-loading");
      refreshBtn.textContent = t("boardRefreshing");
    }
    try {
      var result = await getLeaderboard(safeLimit, modeBucket, leaderboardPage, metric);
      var errorText = resolveServerError(result, "boardFail");
      if ((!result || !result.success) && isTimeoutErrorText(errorText)) {
        result = await getLeaderboard(safeLimit, modeBucket, leaderboardPage, metric);
        errorText = resolveServerError(result, "boardFail");
      }
      if (!result || !result.success) {
        renderBoardList([], leaderboardPage, safeLimit, metric, "error");
        leaderboardHasPrev = leaderboardPage > 1;
        leaderboardHasNext = false;
        leaderboardTotalPages = 0;
        syncLeaderboardPagerUi();
        setTip(boardTip, errorText, "err");
        return;
      }

      var list = Array.isArray(result.data) ? result.data : [];
      var meta = resolvePagerMeta(result, leaderboardPage, safeLimit, list.length);
      leaderboardPage = meta.page;
      leaderboardTotalPages = meta.totalPages;
      leaderboardHasPrev = meta.hasPrev;
      leaderboardHasNext = meta.hasNext;
      renderBoardList(list, leaderboardPage, safeLimit, metric, list.length ? "ready" : "empty");
      syncLeaderboardPagerUi();
      setTip(boardTip, t("boardUpdated"), "ok");
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove("is-loading");
        refreshBtn.textContent = t("boardRefresh");
      }
    }
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
    if (!isValidEmailFormat(email)) {
      setTip(byId("account-auth-tip"), t("invalidEmailFormat"), "err");
      return;
    }
    if (!isValidRegisterPassword(password)) {
      setTip(byId("account-auth-tip"), t("invalidPasswordPolicy"), "err");
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
    var captchaAnswer = toText(byId("account-login-captcha-answer") && byId("account-login-captcha-answer").value).trim().toUpperCase();

    if (!email || !password) {
      setTip(byId("account-auth-tip"), t("requireEmailPass"), "err");
      return;
    }

    if (loginCaptchaRequired && !captchaAnswer) {
      setTip(byId("account-auth-tip"), t("loginCaptchaPrompt"), "err");
      return;
    }

    var payload = { email: email, password: password };
    if (loginCaptchaRequired) {
      payload.captcha_id = loginCaptchaId;
      payload.captcha_answer = captchaAnswer;
    }

    var result = await login(payload);
    if (result && result.success) {
      setLoginCaptchaRequiredState(false);
      saveAuth(result);
      syncAuthState();
      setTip(byId("account-auth-tip"), t("loginOk"), "ok");
      refreshUserInfo();
      refreshLeaderboard();
      return;
    }

    if (shouldRequireLoginCaptcha(result)) {
      setLoginCaptchaRequiredState(true);
      var code = resolveLoginCaptchaCode(result);
      var mustRefreshCaptcha =
        !loginCaptchaId ||
        code === "IMAGE_CAPTCHA_INVALID" ||
        code === "IMAGE_CAPTCHA_EXPIRED" ||
        code === "IMAGE_CAPTCHA_ATTEMPTS_EXCEEDED";
      if (mustRefreshCaptcha) {
        await refreshLoginCaptchaChallenge(false);
      }
    }

    setTip(byId("account-auth-tip"), resolveServerError(result, "loginFail"), "err");
  }

  function applyLanguage() {
    setI18nReady(false);
    currentLang = readLanguage();

    global.document.title = t("pageTitle");

    var textMap = {
      "account-kicker": t("kicker"),
      "account-title": t("title"),
      "account-subtitle": t("subtitle"),
      "account-nav-settings": t("navSettings"),
      "account-nav-home": t("navHome"),
      "account-nav-palette": t("navPalette"),
      "account-nav-practice": t("navPractice"),
      "account-nav-register": t("navRegister"),
      "account-auth-heading": t("authHeading"),
      "account-auth-subtitle": t("authSubtitle"),
      "account-email-label": t("emailLabel"),
      "account-password-label": t("passwordLabel"),
      "account-login-captcha-label": t("loginCaptchaLabel"),
      "account-login-captcha-refresh": t("loginCaptchaRefresh"),
      "account-login-btn": t("loginBtn"),
      "account-open-register-btn": t("registerBtn"),
      "account-open-reset-password-btn": t("resetPasswordBtn"),
      "account-user-title": t("userTitle"),
      "account-user-nickname-label": t("userNickname"),
      "account-user-email-label": t("userEmail"),
      "account-user-created-label": t("userCreated"),
      "account-board-heading": t("boardHeading"),
      "account-board-subtitle": t("boardSubtitle"),
      "account-board-mode-label": t("boardMode"),
      "account-board-metric-label": t("boardMetric"),
      "account-board-refresh": t("boardRefresh"),
      "account-board-prev": t("boardPrev"),
      "account-board-next": t("boardNext"),
      "account-col-rank": t("colRank"),
      "account-col-name": t("colName"),
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
    var loginCaptchaInput = byId("account-login-captcha-answer");
    var loginCaptchaImage = byId("account-login-captcha-image");
    if (emailInput) emailInput.setAttribute("placeholder", t("emailPlaceholder"));
    if (passwordInput) passwordInput.setAttribute("placeholder", t("passwordPlaceholder"));
    if (loginCaptchaInput) loginCaptchaInput.setAttribute("placeholder", t("loginCaptchaPlaceholder"));
    if (loginCaptchaImage) loginCaptchaImage.setAttribute("alt", t("loginCaptchaLabel"));
    refreshModeSelectOptions();
    refreshMetricSelectOptions();
    syncLeaderboardMetricColumnHeader(getSelectedLeaderboardMetric());
    syncLeaderboardPagerUi();

    syncAuthState();
    refreshLeaderboard();
    setI18nReady(true);
  }

  function bindEvents() {
    var loginBtn = byId("account-login-btn");
    var registerBtn = byId("account-open-register-btn");
    var resetPasswordBtn = byId("account-open-reset-password-btn");
    var refreshBtn = byId("account-board-refresh");
    var loginCaptchaRefreshBtn = byId("account-login-captcha-refresh");
    var modeSelect = byId("account-board-mode");
    var metricSelect = byId("account-board-metric");
    var prevBtn = byId("account-board-prev");
    var nextBtn = byId("account-board-next");

    if (loginBtn) loginBtn.addEventListener("click", onLoginClick);
    if (registerBtn) registerBtn.setAttribute("href", "register.html");
    if (resetPasswordBtn) resetPasswordBtn.setAttribute("href", "password.html?mode=reset");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        refreshLeaderboard(false);
      });
    }
    if (loginCaptchaRefreshBtn) {
      loginCaptchaRefreshBtn.addEventListener("click", function () {
        refreshLoginCaptchaChallenge(true);
      });
    }
    if (modeSelect) {
      modeSelect.value = DEFAULT_BOARD_MODE;
      modeSelect.addEventListener("change", function () {
        refreshLeaderboard(true);
      });
    }
    if (metricSelect) {
      metricSelect.value = DEFAULT_BOARD_METRIC;
      metricSelect.addEventListener("change", function () {
        refreshLeaderboard(true);
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (!leaderboardHasPrev) return;
        leaderboardPage = Math.max(1, leaderboardPage - 1);
        refreshLeaderboard(false);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (!leaderboardHasNext) return;
        leaderboardPage += 1;
        refreshLeaderboard(false);
      });
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
    syncLeaderboardPagerUi();
    applyLanguage();
    syncAuthState();
    try {
      var params = new global.URLSearchParams(toText(global.location && global.location.search));
      if (params.get("registered") === "1" && !getToken()) {
        setTip(byId("account-auth-tip"), t("registerOk"), "ok");
      }
      if (params.get("registered") === "1" && global.history && typeof global.history.replaceState === "function") {
        params.delete("registered");
        var query = params.toString();
        var nextUrl = toText(global.location && global.location.pathname) + (query ? "?" + query : "") + toText(global.location && global.location.hash);
        global.history.replaceState(null, "", nextUrl);
      }
    } catch (_err) {}
    refreshUserInfo();
  }

  global.AccountPageRuntime = {
    refreshLeaderboard: refreshLeaderboard,
    register: register,
    login: login,
    getUserInfo: getMyUserInfo,
    getApiBase: function () { return activeApiBase; }
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

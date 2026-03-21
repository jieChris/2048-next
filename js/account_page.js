(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var STORAGE_TOKEN_KEY = "2048_auth_token_v1";
  var STORAGE_USER_ID_KEY = "2048_auth_userId_v1";
  var STORAGE_NICKNAME_KEY = "2048_auth_nickname_v1";
  var UI_LANG_STORAGE_KEY = "ui_language_v1";

  // --- localStorage key migration (old bare keys -> namespaced keys) ---
  (function migrateStorageKeys() {
    var migrations = [
      { oldKey: "token",    newKey: STORAGE_TOKEN_KEY },
      { oldKey: "userId",   newKey: STORAGE_USER_ID_KEY },
      { oldKey: "nickname", newKey: STORAGE_NICKNAME_KEY }
    ];
    try {
      if (!global.localStorage) return;
      for (var i = 0; i < migrations.length; i++) {
        var m = migrations[i];
        var oldVal = global.localStorage.getItem(m.oldKey);
        if (oldVal != null && global.localStorage.getItem(m.newKey) == null) {
          global.localStorage.setItem(m.newKey, oldVal);
        }
        if (oldVal != null) {
          global.localStorage.removeItem(m.oldKey);
        }
      }
    } catch (_err) { /* localStorage unavailable or quota exceeded */ }
  })();
  var DEFAULT_LIMIT = 20;
  var DEFAULT_BOARD_MODE = "standard_no_undo";
  var DEFAULT_API_TIMEOUT_MS = 12000;
  var LOCAL_RECORD_SYNC_STATE_KEY = "cloud_record_sync_state_v1";
  var LOCAL_RECORD_SYNC_MAX_MARKS_PER_USER = 6000;
  var LOCAL_RECORD_SYNC_MAX_UPLOADS_PER_RUN = 600;
  var LOCAL_RECORD_SYNC_RUNNING = false;

  // --- shared API utilities (from api_shared_utils.js) ---
  var _u = global.ApiSharedUtils || {};
  var toText = _u.toText || function (v) { return v == null ? "" : String(v); };
  var safeGetStorage = _u.safeGetStorage || function () { return null; };
  var safeSetStorage = _u.safeSetStorage || function () {};
  var safeRemoveStorage = _u.safeRemoveStorage || function () {};
  var buildApiBaseCandidates = _u.buildApiBaseCandidates || function () { return []; };
  var resolveApiTimeoutMs = _u.resolveApiTimeoutMs || function () { return DEFAULT_API_TIMEOUT_MS; };

  var apiBases = buildApiBaseCandidates();
  var activeApiBase = apiBases[0];
  var currentLang = readLanguage();
  var loginCaptchaRequired = false;
  var loginCaptchaId = "";
  var loginCaptchaLoading = false;

  var COPY = {
    zh: {
      pageTitle: "2048 账号中心",
      kicker: "2048 Online Hub",
      title: "账号中心",
      subtitle: "登录后可自动补录本地战绩并查看在线排行榜。",
      navHome: "回首页",
      navPalette: "主题设置",
      navPractice: "练习板",
      navRegister: "去注册",
      authHeading: "账号",
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
      changePasswordBtn: "修改密码",
      logoutBtn: "退出",
      userTitle: "当前账号信息",
      userNickname: "昵称：",
      userEmail: "邮箱：",
      userCreated: "注册时间：",
      boardHeading: "在线排行榜",
      boardMode: "模式",
      boardLimit: "条数",
      boardRefresh: "刷新",
      recordSyncBtn: "补录本地历史",
      colRank: "排名",
      colName: "昵称",
      colScore: "分数",
      colDate: "更新时间",
      boardLoading: "加载中...",
      boardEmpty: "暂无在线排行榜数据",
      boardFail: "排行榜加载失败",
      boardUpdated: "排行榜已更新",
      syncLoading: "正在补录本地历史...",
      syncDone: "补录完成",
      syncNoLocalStore: "本地历史模块未加载，无法补录",
      syncNeedLogin: "请先登录后再补录",
      syncUnauthorized: "登录已失效，请重新登录",
      syncNoCandidates: "没有可补录的本地对局",
      syncPartialFail: "部分记录补录失败",
      syncNetworkRetryHint: "网络超时导致上传中断，可稍后重试补录",
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
      subtitle: "Sign in to sync local records and view online rankings.",
      navHome: "Home",
      navPalette: "Theme Settings",
      navPractice: "Practice",
      navRegister: "Create Account",
      authHeading: "Account",
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
      changePasswordBtn: "Change Password",
      logoutBtn: "Logout",
      userTitle: "Current User",
      userNickname: "Nickname:",
      userEmail: "Email:",
      userCreated: "Created:",
      boardHeading: "Leaderboard",
      boardMode: "Mode",
      boardLimit: "Limit",
      boardRefresh: "Refresh",
      recordSyncBtn: "Sync Local Records",
      colRank: "Rank",
      colName: "Nickname",
      colScore: "Score",
      colDate: "Updated",
      boardLoading: "Loading...",
      boardEmpty: "No leaderboard data.",
      boardFail: "Failed to load leaderboard",
      boardUpdated: "Leaderboard updated",
      syncLoading: "Syncing local records...",
      syncDone: "Sync completed",
      syncNoLocalStore: "Local history is unavailable",
      syncNeedLogin: "Please sign in before syncing",
      syncUnauthorized: "Session expired, please sign in again",
      syncNoCandidates: "No local finished games to sync",
      syncPartialFail: "Some records failed to sync",
      syncNetworkRetryHint: "Network timeout interrupted upload; try sync again later",
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

  var LEADERBOARD_MODE_OPTIONS = [
    { value: "standard_no_undo", zh: "普通无撤回", en: "Standard (No Undo)" },
    { value: "standard_undo", zh: "可撤回", en: "With Undo" },
    { value: "pow2_3x3", zh: "3x3", en: "3x3" },
    { value: "pow2_2x4", zh: "2x4", en: "2x4" },
    { value: "pow2_3x4", zh: "3x4", en: "3x4" },
    { value: "fib_3x3", zh: "斐波那契3x3", en: "Fibonacci 3x3" }
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

  function getLeaderboard(limit, modeLike) {
    var safeLimit = Number(limit);
    if (!Number.isFinite(safeLimit) || safeLimit <= 0) safeLimit = DEFAULT_LIMIT;
    safeLimit = Math.floor(safeLimit);

    var modeBucket = resolveLeaderboardMode(modeLike) || DEFAULT_BOARD_MODE;
    var path = "/leaderboard?limit=" + encodeURIComponent(String(safeLimit));
    if (modeBucket) path += "&mode=" + encodeURIComponent(modeBucket);
    return apiRequest(path, { method: "GET" });
  }

  function submitRecord(payload) {
    return apiRequest("/records", { method: "POST", auth: true, body: payload });
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

  function readRecordSyncState() {
    var raw = safeGetStorage(LOCAL_RECORD_SYNC_STATE_KEY);
    if (!raw) return {};
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_err) {
      return {};
    }
  }

  function writeRecordSyncState(state) {
    try {
      safeSetStorage(LOCAL_RECORD_SYNC_STATE_KEY, JSON.stringify(state || {}));
    } catch (_err) {}
  }

  function resolveRecordSyncUserBucket(state, userId) {
    var root = state && typeof state === "object" ? state : {};
    var key = String(parsePositiveInt(userId) || 0);
    if (!key || key === "0") return null;
    var bucket = root[key];
    if (!bucket || typeof bucket !== "object") {
      bucket = {};
      root[key] = bucket;
    }
    return {
      root: root,
      key: key,
      bucket: bucket
    };
  }

  function isLocalRecordSynced(syncBucketInfo, localRecordId) {
    if (!syncBucketInfo || !syncBucketInfo.bucket) return false;
    var key = toText(localRecordId).trim();
    if (!key) return false;
    return !!syncBucketInfo.bucket[key];
  }

  function markLocalRecordSynced(syncBucketInfo, localRecordId, recordId) {
    if (!syncBucketInfo || !syncBucketInfo.bucket) return;
    var key = toText(localRecordId).trim();
    if (!key) return;
    syncBucketInfo.bucket[key] = {
      synced_at: new Date().toISOString(),
      server_record_id: toText(recordId).trim()
    };

    var ids = Object.keys(syncBucketInfo.bucket);
    if (ids.length <= LOCAL_RECORD_SYNC_MAX_MARKS_PER_USER) return;
    ids.sort(function (a, b) {
      var ta = Date.parse(toText(syncBucketInfo.bucket[a] && syncBucketInfo.bucket[a].synced_at)) || 0;
      var tb = Date.parse(toText(syncBucketInfo.bucket[b] && syncBucketInfo.bucket[b].synced_at)) || 0;
      return tb - ta;
    });
    for (var i = LOCAL_RECORD_SYNC_MAX_MARKS_PER_USER; i < ids.length; i += 1) {
      delete syncBucketInfo.bucket[ids[i]];
    }
  }

  function canSyncLocalRecord(record) {
    var item = record && typeof record === "object" ? record : null;
    if (!item) return false;
    var score = Math.floor(Number(item.score) || 0);
    if (!(score > 0)) return false;
    var endReason = toText(item.end_reason || "game_over").trim().toLowerCase();
    if (endReason && endReason !== "game_over") return false;
    var modeKey = toText(item.mode_key).trim();
    var modeBucket = resolveLeaderboardMode(modeKey || item.mode || item.mode_bucket);
    if (!modeKey || !modeBucket) return false;
    var replayString = toText(item.replay_string).trim();
    if (!replayString && item.replay != null) {
      try {
        replayString = JSON.stringify(item.replay);
      } catch (_err) {
        replayString = "";
      }
    }
    return replayString.length > 0;
  }

  function buildRecordSyncPayload(localRecord) {
    var record = localRecord && typeof localRecord === "object" ? localRecord : {};
    var modeKey = toText(record.mode_key).trim();
    var modeBucket = resolveLeaderboardMode(modeKey || record.mode || record.mode_bucket);
    if (!modeKey || !modeBucket) return null;

    var replayString = toText(record.replay_string).trim();
    if (!replayString && record.replay != null) {
      try {
        replayString = JSON.stringify(record.replay);
      } catch (_err) {
        replayString = "";
      }
    }
    if (!replayString) return null;

    return {
      mode: modeBucket,
      mode_key: modeKey,
      score: Math.floor(Number(record.score) || 0),
      best_tile: Math.floor(Number(record.best_tile) || 0),
      duration_ms: Math.floor(Number(record.duration_ms) || 0),
      ended_at: toText(record.ended_at).trim() || new Date().toISOString(),
      end_reason: "game_over",
      final_board: Array.isArray(record.final_board) ? record.final_board : [],
      replay: record.replay || null,
      replay_string: replayString,
      client_record_id: toText(record.id).trim()
    };
  }

  async function getAllLocalHistoryRecords() {
    var store = global.LocalHistoryStore;
    if (!store || typeof store !== "object") return null;

    try {
      if (typeof store.getAllAsync === "function") {
        var asyncRows = await store.getAllAsync();
        return Array.isArray(asyncRows) ? asyncRows : [];
      }
      if (typeof store.getAll === "function") {
        var rows = store.getAll();
        return Array.isArray(rows) ? rows : [];
      }
      if (typeof store.listRecordsAsync === "function") {
        var listedAsync = await store.listRecordsAsync({ page: 1, page_size: 5000, sort_by: "ended_desc" });
        return Array.isArray(listedAsync && listedAsync.items) ? listedAsync.items : [];
      }
      if (typeof store.listRecords === "function") {
        var listed = store.listRecords({ page: 1, page_size: 5000, sort_by: "ended_desc" });
        return Array.isArray(listed && listed.items) ? listed.items : [];
      }
    } catch (_err) {
      return [];
    }
    return [];
  }

  async function ensureLocalHistoryStoreReady() {
    if (global.LocalHistoryStore && typeof global.LocalHistoryStore === "object") return true;
    try {
      await import("./local_history_store.js");
    } catch (_err) {}
    return !!(global.LocalHistoryStore && typeof global.LocalHistoryStore === "object");
  }

  async function syncLocalHistoryRecords(showTipOnNoop) {
    if (LOCAL_RECORD_SYNC_RUNNING) return;

    var tipNode = byId("account-board-tip");
    var token = getToken();
    if (!token) {
      if (showTipOnNoop) setTip(tipNode, t("syncNeedLogin"), "err");
      return;
    }
    var localStoreReady = await ensureLocalHistoryStoreReady();
    if (!localStoreReady) {
      if (showTipOnNoop) setTip(tipNode, t("syncNoLocalStore"), "err");
      return;
    }

    LOCAL_RECORD_SYNC_RUNNING = true;
    setTip(tipNode, t("syncLoading"), "");

    try {
      var userInfo = await getMyUserInfo();
      var currentUserId = parsePositiveInt(userInfo && userInfo.data && (userInfo.data.id || userInfo.data.user_id));
      if (!currentUserId) {
        clearAuth();
        setTip(tipNode, t("syncUnauthorized"), "err");
        return;
      }

      var allRows = await getAllLocalHistoryRecords();
      allRows = Array.isArray(allRows) ? allRows : [];
      var syncState = readRecordSyncState();
      var syncBucketInfo = resolveRecordSyncUserBucket(syncState, currentUserId);
      if (!syncBucketInfo) {
        setTip(tipNode, t("syncNeedLogin"), "err");
        return;
      }

      var candidates = [];
      for (var i = 0; i < allRows.length; i += 1) {
        var row = allRows[i];
        if (!canSyncLocalRecord(row)) continue;
        if (isLocalRecordSynced(syncBucketInfo, row && row.id)) continue;
        candidates.push(row);
      }

      if (candidates.length === 0) {
        setTip(tipNode, t("syncNoCandidates"), showTipOnNoop ? "ok" : "");
        return;
      }

      candidates.sort(function (a, b) {
        var ta = Date.parse(toText(a && a.ended_at)) || 0;
        var tb = Date.parse(toText(b && b.ended_at)) || 0;
        return ta - tb;
      });

      var attempts = 0;
      var success = 0;
      var failed = 0;
      var timedOut = 0;

      for (var c = 0; c < candidates.length; c += 1) {
        if (attempts >= LOCAL_RECORD_SYNC_MAX_UPLOADS_PER_RUN) break;
        var payload = buildRecordSyncPayload(candidates[c]);
        if (!payload) continue;
        attempts += 1;
        var result = await submitRecord(payload);
        if (result && result.success) {
          success += 1;
          markLocalRecordSynced(syncBucketInfo, payload.client_record_id, result.id);
          continue;
        }

        var errorText = resolveServerError(result, "syncPartialFail");
        if (isTimeoutErrorText(errorText)) timedOut += 1;
        if (toText(result && result.code).toUpperCase() === "UNAUTHORIZED") {
          clearAuth();
          setTip(tipNode, t("syncUnauthorized"), "err");
          writeRecordSyncState(syncBucketInfo.root);
          return;
        }
        failed += 1;
      }

      writeRecordSyncState(syncBucketInfo.root);
      if (failed <= 0) {
        setTip(tipNode, t("syncDone") + " · " + success + "/" + attempts, "ok");
      } else {
        var suffix = " · " + success + "/" + attempts;
        if (timedOut > 0) suffix += " · " + t("syncNetworkRetryHint");
        setTip(tipNode, t("syncPartialFail") + suffix, "err");
      }
    } catch (error) {
      setTip(tipNode, toText(error && error.message) || t("syncPartialFail"), "err");
    } finally {
      LOCAL_RECORD_SYNC_RUNNING = false;
    }
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
      name.style.fontSize = "11px";
      name.textContent = displayNickname;
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
    var changePasswordBtn = byId("account-open-change-password-btn");
    var logoutBtn = byId("account-logout-btn");
    var passwordInput = byId("account-password");
    var captchaWrap = byId("account-login-captcha-wrap");

    if (authGrid) authGrid.style.display = isAuthed ? "none" : "";
    if (actionRow) actionRow.style.display = "";
    if (loginBtn) loginBtn.style.display = isAuthed ? "none" : "";
    if (registerBtn) registerBtn.style.display = isAuthed ? "none" : "";
    if (resetPasswordBtn) resetPasswordBtn.style.display = isAuthed ? "none" : "";
    if (changePasswordBtn) changePasswordBtn.style.display = isAuthed ? "" : "none";
    if (logoutBtn) logoutBtn.style.display = isAuthed ? "" : "none";
    if (authTip) authTip.style.display = isAuthed ? "none" : "";
    if (captchaWrap) captchaWrap.style.display = isAuthed ? "none" : (loginCaptchaRequired ? "grid" : "none");

    if (isAuthed) {
      if (passwordInput) passwordInput.value = "";
      setLoginCaptchaRequiredState(false);
    }
  }

  async function refreshLeaderboard() {
    var boardTip = byId("account-board-tip");
    var limit = Number(toText(byId("account-board-limit") && byId("account-board-limit").value));
    var modeBucket = getSelectedModeBucket();

    setTip(boardTip, t("boardLoading"), "");
    var result = await getLeaderboard(limit, modeBucket);
    var errorText = resolveServerError(result, "boardFail");
    if ((!result || !result.success) && isTimeoutErrorText(errorText)) {
      result = await getLeaderboard(limit, modeBucket);
      errorText = resolveServerError(result, "boardFail");
    }
    if (!result || !result.success) {
      renderBoardList([]);
      setTip(boardTip, errorText, "err");
      return;
    }

    renderBoardList(Array.isArray(result.data) ? result.data : []);
    setTip(boardTip, t("boardUpdated"), "ok");
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
      syncLocalHistoryRecords(false);
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

  function onLogoutClick() {
    clearAuth();
    syncAuthState();
    resetUserInfo();
    setTip(byId("account-auth-tip"), t("logoutOk"), "ok");
  }

  function applyLanguage() {
    setI18nReady(false);
    currentLang = readLanguage();

    global.document.title = t("pageTitle");

    var textMap = {
      "account-kicker": t("kicker"),
      "account-title": t("title"),
      "account-subtitle": t("subtitle"),
      "account-nav-home": t("navHome"),
      "account-nav-palette": t("navPalette"),
      "account-nav-practice": t("navPractice"),
      "account-nav-register": t("navRegister"),
      "account-auth-heading": t("authHeading"),
      "account-email-label": t("emailLabel"),
      "account-password-label": t("passwordLabel"),
      "account-login-captcha-label": t("loginCaptchaLabel"),
      "account-login-captcha-refresh": t("loginCaptchaRefresh"),
      "account-login-btn": t("loginBtn"),
      "account-open-register-btn": t("registerBtn"),
      "account-open-reset-password-btn": t("resetPasswordBtn"),
      "account-open-change-password-btn": t("changePasswordBtn"),
      "account-logout-btn": t("logoutBtn"),
      "account-user-title": t("userTitle"),
      "account-user-nickname-label": t("userNickname"),
      "account-user-email-label": t("userEmail"),
      "account-user-created-label": t("userCreated"),
      "account-board-heading": t("boardHeading"),
      "account-board-mode-label": t("boardMode"),
      "account-board-limit-label": t("boardLimit"),
      "account-board-refresh": t("boardRefresh"),
      "account-record-sync": t("recordSyncBtn"),
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
    var loginCaptchaInput = byId("account-login-captcha-answer");
    var loginCaptchaImage = byId("account-login-captcha-image");
    if (emailInput) emailInput.setAttribute("placeholder", t("emailPlaceholder"));
    if (passwordInput) passwordInput.setAttribute("placeholder", t("passwordPlaceholder"));
    if (loginCaptchaInput) loginCaptchaInput.setAttribute("placeholder", t("loginCaptchaPlaceholder"));
    if (loginCaptchaImage) loginCaptchaImage.setAttribute("alt", t("loginCaptchaLabel"));
    refreshModeSelectOptions();

    syncAuthState();
    refreshLeaderboard();
    setI18nReady(true);
  }

  function bindEvents() {
    var loginBtn = byId("account-login-btn");
    var registerBtn = byId("account-open-register-btn");
    var resetPasswordBtn = byId("account-open-reset-password-btn");
    var changePasswordBtn = byId("account-open-change-password-btn");
    var logoutBtn = byId("account-logout-btn");
    var refreshBtn = byId("account-board-refresh");
    var recordSyncBtn = byId("account-record-sync");
    var loginCaptchaRefreshBtn = byId("account-login-captcha-refresh");
    var limitSelect = byId("account-board-limit");
    var modeSelect = byId("account-board-mode");

    if (loginBtn) loginBtn.addEventListener("click", onLoginClick);
    if (registerBtn) registerBtn.setAttribute("href", "register.html");
    if (resetPasswordBtn) resetPasswordBtn.setAttribute("href", "password.html?mode=reset");
    if (changePasswordBtn) changePasswordBtn.setAttribute("href", "password.html?mode=change");
    if (logoutBtn) logoutBtn.addEventListener("click", onLogoutClick);
    if (refreshBtn) refreshBtn.addEventListener("click", refreshLeaderboard);
    if (loginCaptchaRefreshBtn) {
      loginCaptchaRefreshBtn.addEventListener("click", function () {
        refreshLoginCaptchaChallenge(true);
      });
    }
    if (recordSyncBtn) recordSyncBtn.addEventListener("click", function () {
      syncLocalHistoryRecords(true);
    });
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
    refreshLeaderboard();
    if (getToken()) {
      syncLocalHistoryRecords(false);
    }
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

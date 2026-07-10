(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var STORAGE_TOKEN_KEY = "2048_auth_token_v1";
  var STORAGE_USER_ID_KEY = "2048_auth_userId_v1";
  var STORAGE_NICKNAME_KEY = "2048_auth_nickname_v1";
  var DEFAULT_API_TIMEOUT_MS = 12000;
  var AUTH_API_TIMEOUT_MS = 30000;

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
  var currentLang = readLanguage();

  var nicknameValidationState = "idle";
  var nicknameValidationValue = "";
  var nicknameValidationSerial = 0;
  var loginCaptchaRequired = false;
  var loginCaptchaId = "";
  var loginCaptchaLoading = false;
  var loginSubmitting = false;

  var COPY = {
    zh: {
      pageTitle: "2048 账号设置",
      kicker: "2048 在线中心",
      title: "账号设置",
      subtitle: "在这里统一管理昵称、密码和登录状态。",
      navAccount: "返回排行榜",
      navHome: "回首页",
      authHeading: "账号登录",
      authSubtitle: "登录后可同步记录并参与排行比较。",
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
      loginLoading: "登录中...",
      registerBtn: "注册账号",
      resetPasswordBtn: "忘记密码",
      userTitle: "当前账号",
      userNickname: "昵称：",
      userEmail: "邮箱：",
      userCreated: "创建时间：",
      nicknameHeading: "修改昵称",
      currentNicknameLabel: "当前昵称",
      newNicknameLabel: "新昵称",
      newNicknamePlaceholder: "请输入新昵称（2-10字符）",
      saveNicknameBtn: "保存昵称",
      passwordHeading: "修改密码",
      currentPasswordLabel: "当前密码",
      currentPasswordPlaceholder: "请输入当前密码",
      newPasswordLabel: "新密码",
      newPasswordPlaceholder: "请输入新密码",
      changePasswordBtn: "修改密码",
      sessionHeading: "账号会话",
      logoutBtn: "退出当前账号",
      requireEmailPass: "请输入邮箱和密码",
      loginOk: "登录成功",
      loginFail: "登录失败",
      registerOk: "注册成功，请登录",
      requireLogin: "请先登录",
      requireNickname: "请输入昵称",
      nicknameNoChange: "昵称未变化",
      invalidNickname: "昵称需 2-10 位，仅支持中文、字母、数字、空格、下划线和短横线",
      nicknameUnavailableInline: "当前昵称不可用，请更换昵称",
      nicknameCheckFailed: "昵称校验失败，请稍后重试",
      nicknameUpdated: "昵称修改成功",
      nicknameUpdateFail: "昵称修改失败",
      nicknameUpdateUnsupported: "当前服务端暂不支持修改昵称",
      requirePasswordFields: "请输入当前密码和新密码",
      invalidPassword: "密码需 8-16 位，且至少包含字母/数字/符号中的两种",
      passwordChanged: "密码修改成功",
      passwordChangeFail: "密码修改失败",
      logoutDone: "已退出，正在返回首页...",
      userInfoFail: "用户信息加载失败",
      networkError: "网络异常"
    },
    en: {
      pageTitle: "2048 Account Settings",
      kicker: "2048 Online Hub",
      title: "Account Settings",
      subtitle: "Manage nickname, password and session in one place.",
      navAccount: "Back to Leaderboard",
      navHome: "Home",
      authHeading: "Account Login",
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
      loginLoading: "Logging in...",
      registerBtn: "Create Account",
      resetPasswordBtn: "Forgot Password",
      userTitle: "Current Account",
      userNickname: "Nickname:",
      userEmail: "Email:",
      userCreated: "Created:",
      nicknameHeading: "Change Nickname",
      currentNicknameLabel: "Current Nickname",
      newNicknameLabel: "New Nickname",
      newNicknamePlaceholder: "Enter new nickname (2-10 chars)",
      saveNicknameBtn: "Save Nickname",
      passwordHeading: "Change Password",
      currentPasswordLabel: "Current Password",
      currentPasswordPlaceholder: "Enter current password",
      newPasswordLabel: "New Password",
      newPasswordPlaceholder: "Enter new password",
      changePasswordBtn: "Change Password",
      sessionHeading: "Session",
      logoutBtn: "Logout Current Account",
      requireEmailPass: "Please enter email and password",
      loginOk: "Login success",
      loginFail: "Login failed",
      registerOk: "Registered. Please log in.",
      requireLogin: "Please sign in first",
      requireNickname: "Please enter nickname",
      nicknameNoChange: "Nickname is unchanged",
      invalidNickname: "Nickname must be 2-10 chars and use letters/numbers/spaces/_/-/Chinese only",
      nicknameUnavailableInline: "Nickname unavailable, please choose another",
      nicknameCheckFailed: "Nickname validation failed, please retry",
      nicknameUpdated: "Nickname updated",
      nicknameUpdateFail: "Failed to update nickname",
      nicknameUpdateUnsupported: "Server does not support nickname update yet",
      requirePasswordFields: "Please enter current and new passwords",
      invalidPassword: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
      passwordChanged: "Password changed successfully",
      passwordChangeFail: "Failed to change password",
      logoutDone: "Logged out. Redirecting to home...",
      userInfoFail: "Failed to load user info",
      networkError: "Network error"
    }
  };

  var ERROR_CODE_COPY = {
    zh: {
      EMPTY: "昵称不能为空",
      LENGTH: "昵称长度需在 2-10 个字符",
      CHARS: "昵称仅支持中文、字母、数字、空格、下划线和短横线",
      INVALID: "昵称不可用，请更换",
      RESERVED: "昵称不可用，请更换",
      SENSITIVE: "昵称不可用，请更换",
      NICKNAME_EXISTS: "昵称已被占用，请更换",
      DUPLICATE_NICKNAME: "昵称已被占用，请更换",
      NICKNAME_TAKEN: "昵称已被占用，请更换",
      UNAUTHORIZED: "请先登录",
      INVALID_TOKEN: "登录状态已失效，请重新登录",
      INVALID_CREDENTIALS: "当前密码错误",
      LOGIN_INVALID_CREDENTIALS: "邮箱或密码错误",
      WEAK_PASSWORD: "密码需 8-16 位，且至少包含字母/数字/符号中的两种",
      SAME_PASSWORD: "新密码不能与旧密码相同",
      NICKNAME_UPDATE_UNSUPPORTED: "当前服务端暂不支持修改昵称",
      IMAGE_CAPTCHA_REQUIRED: "请先完成图片验证码",
      IMAGE_CAPTCHA_INVALID: "图片验证码错误，请重试",
      IMAGE_CAPTCHA_EXPIRED: "图片验证码已过期，请刷新后重试",
      IMAGE_CAPTCHA_ATTEMPTS_EXCEEDED: "图片验证码尝试次数过多，请刷新后重试"
    },
    en: {
      EMPTY: "Nickname cannot be empty",
      LENGTH: "Nickname length must be 2-10 characters",
      CHARS: "Nickname supports letters, numbers, spaces, underscores and hyphens only",
      INVALID: "Nickname is not allowed",
      RESERVED: "Nickname is not allowed",
      SENSITIVE: "Nickname is not allowed",
      NICKNAME_EXISTS: "Nickname already exists",
      DUPLICATE_NICKNAME: "Nickname already exists",
      NICKNAME_TAKEN: "Nickname already exists",
      UNAUTHORIZED: "Please sign in first",
      INVALID_TOKEN: "Session expired, please sign in again",
      INVALID_CREDENTIALS: "Current password is incorrect",
      LOGIN_INVALID_CREDENTIALS: "Invalid email or password",
      WEAK_PASSWORD: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
      SAME_PASSWORD: "New password must differ from old password",
      NICKNAME_UPDATE_UNSUPPORTED: "Server does not support nickname update yet",
      IMAGE_CAPTCHA_REQUIRED: "Please complete image captcha",
      IMAGE_CAPTCHA_INVALID: "Incorrect image captcha",
      IMAGE_CAPTCHA_EXPIRED: "Image captcha expired, please refresh",
      IMAGE_CAPTCHA_ATTEMPTS_EXCEEDED: "Too many captcha attempts, please refresh"
    }
  };

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

  function setTip(message, type) {
    var node = byId("settings-tip");
    if (!node) return;
    node.textContent = toText(message);
    node.classList.remove("ok");
    node.classList.remove("err");
    if (!message) return;
    if (type === "ok") node.classList.add("ok");
    if (type === "err") node.classList.add("err");
  }

  function setAuthTip(message, type) {
    var node = byId("account-auth-tip");
    if (!node) return;
    node.textContent = toText(message);
    node.classList.remove("ok");
    node.classList.remove("err");
    if (!message) return;
    if (type === "ok") node.classList.add("ok");
    if (type === "err") node.classList.add("err");
  }

  function clearAuthErrorTip() {
    var node = byId("account-auth-tip");
    if (!node || !node.classList || !node.classList.contains("err")) return;
    setAuthTip("", "");
  }

  function getToken() {
    return toText(safeGetStorage(STORAGE_TOKEN_KEY)).trim();
  }

  function getStoredNickname() {
    return toText(safeGetStorage(STORAGE_NICKNAME_KEY)).trim();
  }

  function setStoredNickname(nickname) {
    safeSetStorage(STORAGE_NICKNAME_KEY, toText(nickname).trim());
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
    setStoredNickname(payload && payload.nickname);
  }

  function clearAuth() {
    safeRemoveStorage(STORAGE_TOKEN_KEY);
    safeRemoveStorage(STORAGE_USER_ID_KEY);
    safeRemoveStorage(STORAGE_NICKNAME_KEY);
  }

  function isTimeoutErrorText(errorLike) {
    return toText(errorLike).toLowerCase().indexOf("timeout") >= 0;
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

  function isValidNickname(nicknameLike) {
    var nickname = toText(nicknameLike).trim();
    if (nickname.length < 2 || nickname.length > 10) return false;
    return /^[\u4E00-\u9FA5A-Za-z0-9 _-]+$/.test(nickname);
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

  function resolveLoginError(result) {
    var lang = currentLang === "en" ? "en" : "zh";
    var code = toText(result && result.code).trim().toUpperCase();
    if (code === "INVALID_CREDENTIALS") {
      return ERROR_CODE_COPY[lang].LOGIN_INVALID_CREDENTIALS;
    }
    return resolveServerError(result, "loginFail");
  }

  function setNicknameValidationUi(invalid, message) {
    var input = byId("settings-new-nickname");
    var feedback = byId("settings-nickname-feedback");
    if (input) input.classList.toggle("input-error", !!invalid);
    if (!feedback) return;
    if (!invalid) {
      feedback.textContent = "";
      feedback.classList.remove("active");
      return;
    }
    feedback.textContent = toText(message) || t("nicknameUnavailableInline");
    feedback.classList.add("active");
  }

  function markNicknameDirty(nextValue) {
    var normalized = toText(nextValue).trim();
    if (normalized !== nicknameValidationValue) {
      nicknameValidationSerial += 1;
      nicknameValidationValue = normalized;
      nicknameValidationState = "idle";
      setNicknameValidationUi(false, "");
    }
  }

  function isNicknameUnavailableResult(result) {
    var code = toText(result && result.code).trim().toUpperCase();
    return (
      code === "EMPTY" ||
      code === "LENGTH" ||
      code === "CHARS" ||
      code === "INVALID" ||
      code === "RESERVED" ||
      code === "SENSITIVE" ||
      code === "NICKNAME_EXISTS" ||
      code === "DUPLICATE_NICKNAME" ||
      code === "NICKNAME_TAKEN"
    );
  }

  function isRouteNotFoundResult(result) {
    var code = toText(result && result.code).trim().toUpperCase();
    if (code === "NOT_FOUND" || code === "ROUTE_NOT_FOUND" || code === "ENDPOINT_NOT_FOUND") return true;
    var text = toText(result && result.error).toLowerCase();
    if (!text) return false;
    if (text.indexOf("http 404") >= 0) return true;
    if (text.indexOf("not found") >= 0) return true;
    return false;
  }

  async function apiRequest(path, options) {
    var opts = options || {};
    var method = toText(opts.method || "GET").toUpperCase();
    var lastError = t("networkError");
    var preferredTimeoutMs = Number(opts.timeoutMs);
    var timeoutMs = Number.isFinite(preferredTimeoutMs) && preferredTimeoutMs > 0
      ? Math.floor(preferredTimeoutMs)
      : resolveApiTimeoutMs();

    for (var i = 0; i < apiBases.length; i += 1) {
      var base = apiBases[i];
      var headers = opts.headers && typeof opts.headers === "object" ? Object.assign({}, opts.headers) : {};
      var requestInit = { method: method, headers: headers };
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
          if (allowFallback && i < apiBases.length - 1) continue;
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
        if (!allowFallback) break;
      }
    }

    return { error: lastError };
  }

  async function login(payload) {
    var requestOptions = {
      method: "POST",
      body: payload,
      timeoutMs: AUTH_API_TIMEOUT_MS
    };
    var result = await apiRequest("/login", requestOptions);
    if (result && !result.success && isTimeoutErrorText(result.error)) {
      result = await apiRequest("/login", requestOptions);
    }
    return result;
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
    if (showErrorTip) setAuthTip(t("loginCaptchaLoading"), "");

    var refreshBtn = byId("account-login-captcha-refresh");
    if (refreshBtn) refreshBtn.disabled = true;

    try {
      var result = await apiRequest("/login/captcha", {
        method: "GET",
        timeoutMs: AUTH_API_TIMEOUT_MS
      });
      var captchaId = toText(result && result.captcha_id).trim();
      var imageDataUrl = toText(result && result.captcha_image_data_url).trim();
      if (!result || !result.success || !captchaId || !imageDataUrl) {
        if (showErrorTip) setAuthTip(resolveServerError(result, "loginFail"), "err");
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

  async function getMyUserInfo() {
    return apiRequest("/me", { method: "GET", auth: true });
  }

  async function checkNicknameAvailable(nickname) {
    var path = "/register/check-nickname?nickname=" + encodeURIComponent(nickname);
    var result = await apiRequest(path, { method: "GET" });
    if (!result || typeof result !== "object") return null;
    if (result.success === true && result.available === true) return true;
    if (result.success === true && result.available === false) return false;
    if (isNicknameUnavailableResult(result)) return false;
    return null;
  }

  async function validateNicknameAvailability(nickname, showTipOnError) {
    var normalized = toText(nickname).trim();
    if (!isValidNickname(normalized)) {
      nicknameValidationValue = normalized;
      nicknameValidationState = "invalid";
      setNicknameValidationUi(true, t("invalidNickname"));
      if (showTipOnError) setTip("", "");
      return false;
    }

    if (normalized && normalized === nicknameValidationValue && nicknameValidationState === "available") {
      return true;
    }

    nicknameValidationValue = normalized;
    nicknameValidationState = "checking";
    var serial = nicknameValidationSerial + 1;
    nicknameValidationSerial = serial;
    var available = await checkNicknameAvailable(normalized);
    if (serial !== nicknameValidationSerial) return false;

    if (available === true) {
      nicknameValidationState = "available";
      setNicknameValidationUi(false, "");
      if (showTipOnError) setTip("", "");
      return true;
    }

    if (available === false) {
      nicknameValidationState = "unavailable";
      setNicknameValidationUi(true, t("nicknameUnavailableInline"));
      if (showTipOnError) setTip("", "");
      return false;
    }

    nicknameValidationState = "error";
    setNicknameValidationUi(true, t("nicknameCheckFailed"));
    if (showTipOnError) setTip(t("nicknameCheckFailed"), "err");
    return false;
  }

  function setNicknameButtonEnabled(enabled) {
    var btn = byId("settings-update-nickname-btn");
    if (btn) btn.disabled = !enabled;
  }

  function setPasswordButtonEnabled(enabled) {
    var btn = byId("settings-change-password-btn");
    if (btn) btn.disabled = !enabled;
  }

  function setCurrentNicknameText(nickname) {
    var accountNick = byId("account-user-nickname");
    var node = byId("settings-current-nickname");
    var text = toText(nickname).trim();
    if (node) node.textContent = text || "--";
    if (accountNick) accountNick.textContent = text || "--";
  }

  function setUserInfoText(dataLike) {
    var data = dataLike && typeof dataLike === "object" ? dataLike : {};
    var nickname = toText(data.nickname || getStoredNickname()).trim();
    setCurrentNicknameText(nickname || "--");
    var email = byId("account-user-email");
    var created = byId("account-user-created");
    if (email) email.textContent = toText(data.email || "--");
    if (created) created.textContent = toText(data.created_at || "--");
  }

  function syncAuthState() {
    var isAuthed = !!getToken();
    if (global.document.body) {
      global.document.body.setAttribute("data-auth-state", isAuthed ? "authed" : "guest");
    }

    var stateTag = byId("account-auth-state-tag");
    var authFormSurface = global.document.querySelector(".account-auth-form-surface");
    var authSubtitle = byId("account-auth-subtitle");
    var actionRow = byId("account-action-row");
    var userCard = global.document.querySelector(".account-user-card");
    var authTip = byId("account-auth-tip");
    var loginBtn = byId("account-login-btn");
    var registerBtn = byId("account-open-register-btn");
    var resetPasswordBtn = byId("account-open-reset-password-btn");
    var captchaWrap = byId("account-login-captcha-wrap");
    var accountOnlySections = global.document.querySelectorAll("[data-settings-account-only]");

    if (stateTag) stateTag.textContent = isAuthed ? t("stateAuthed") : t("stateGuest");
    if (authFormSurface) authFormSurface.style.display = isAuthed ? "none" : "";
    if (authSubtitle) authSubtitle.style.display = isAuthed ? "none" : "";
    if (actionRow) actionRow.style.display = isAuthed ? "none" : "";
    if (userCard) userCard.style.display = isAuthed ? "" : "none";
    if (authTip) authTip.style.display = isAuthed ? "none" : "";
    if (loginBtn) loginBtn.style.display = isAuthed ? "none" : "";
    if (registerBtn) registerBtn.style.display = isAuthed ? "none" : "";
    if (resetPasswordBtn) resetPasswordBtn.style.display = isAuthed ? "none" : "";
    if (captchaWrap) captchaWrap.style.display = isAuthed ? "none" : (loginCaptchaRequired ? "grid" : "none");

    for (var i = 0; i < accountOnlySections.length; i += 1) {
      accountOnlySections[i].style.display = isAuthed ? "" : "none";
    }

    if (isAuthed) {
      var passwordInput = byId("account-password");
      if (passwordInput) passwordInput.value = "";
      setLoginCaptchaRequiredState(false);
    } else {
      setUserInfoText(null);
    }
  }

  function setDisabledLinkState(linkNode, disabled) {
    if (!linkNode) return;
    if (disabled) {
      if (!linkNode.hasAttribute("data-prev-tabindex")) {
        var previousTabIndex = linkNode.getAttribute("tabindex");
        linkNode.setAttribute("data-prev-tabindex", previousTabIndex == null ? "" : previousTabIndex);
      }
      linkNode.setAttribute("aria-disabled", "true");
      linkNode.setAttribute("tabindex", "-1");
      linkNode.classList.add("is-disabled");
      return;
    }

    linkNode.setAttribute("aria-disabled", "false");
    linkNode.classList.remove("is-disabled");
    var storedTabIndex = linkNode.getAttribute("data-prev-tabindex");
    if (storedTabIndex != null) {
      if (storedTabIndex) linkNode.setAttribute("tabindex", storedTabIndex);
      else linkNode.removeAttribute("tabindex");
      linkNode.removeAttribute("data-prev-tabindex");
    }
  }

  function setLoginSubmittingState(isSubmitting) {
    loginSubmitting = !!isSubmitting;

    var loginBtn = byId("account-login-btn");
    var registerBtn = byId("account-open-register-btn");
    var resetPasswordBtn = byId("account-open-reset-password-btn");

    if (loginBtn) {
      loginBtn.disabled = loginSubmitting;
      loginBtn.classList.toggle("is-loading", loginSubmitting);
      loginBtn.textContent = loginSubmitting ? t("loginLoading") : t("loginBtn");
    }

    setDisabledLinkState(registerBtn, loginSubmitting);
    setDisabledLinkState(resetPasswordBtn, loginSubmitting);
  }

  async function onLoginClick() {
    if (loginSubmitting) return;

    var email = toText(byId("account-email") && byId("account-email").value).trim();
    var password = toText(byId("account-password") && byId("account-password").value).trim();
    var captchaAnswer = toText(byId("account-login-captcha-answer") && byId("account-login-captcha-answer").value).trim().toUpperCase();

    if (!email || !password) {
      setAuthTip(t("requireEmailPass"), "err");
      return;
    }

    if (loginCaptchaRequired && !captchaAnswer) {
      setAuthTip(t("loginCaptchaPrompt"), "err");
      return;
    }

    var payload = { email: email, password: password };
    if (loginCaptchaRequired) {
      payload.captcha_id = loginCaptchaId;
      payload.captcha_answer = captchaAnswer;
    }

    setLoginSubmittingState(true);
    try {
      var result = await login(payload);
      if (result && result.success) {
        setLoginCaptchaRequiredState(false);
        saveAuth(result);
        syncAuthState();
        setTip(t("loginOk"), "ok");
        refreshUserInfo();
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

      setAuthTip(resolveLoginError(result), "err");
    } finally {
      setLoginSubmittingState(false);
    }
  }

  function triggerLoginFromKeyboard(eventLike) {
    if (!eventLike) return;
    if (eventLike.isComposing === true) return;
    var key = toText(eventLike.key);
    if (key !== "Enter") return;
    if (typeof eventLike.preventDefault === "function") eventLike.preventDefault();
    onLoginClick();
  }

  function bindLoginInputBehavior(inputNode) {
    if (!inputNode || typeof inputNode.addEventListener !== "function") return;
    inputNode.addEventListener("keydown", triggerLoginFromKeyboard);
    inputNode.addEventListener("focus", clearAuthErrorTip);
    inputNode.addEventListener("input", clearAuthErrorTip);
  }

  async function updateNicknameOnServer(nextNickname) {
    var attempts = [
      { method: "POST", path: "/me/nickname", body: { nickname: nextNickname } },
      { method: "PATCH", path: "/me", body: { nickname: nextNickname } },
      { method: "POST", path: "/user/me/nickname", body: { nickname: nextNickname } },
      { method: "POST", path: "/user/nickname", body: { nickname: nextNickname } }
    ];

    var lastResult = null;
    for (var i = 0; i < attempts.length; i += 1) {
      var req = attempts[i];
      var result = await apiRequest(req.path, {
        method: req.method,
        auth: true,
        body: req.body
      });
      lastResult = result;
      if (result && result.success) return result;
      if (isNicknameUnavailableResult(result)) return result;
      if (isRouteNotFoundResult(result)) continue;
    }

    if (lastResult) return lastResult;
    return {
      success: false,
      code: "NICKNAME_UPDATE_UNSUPPORTED",
      error: t("nicknameUpdateUnsupported")
    };
  }

  async function onUpdateNicknameClick() {
    if (!getToken()) {
      setTip(t("requireLogin"), "err");
      return;
    }

    var input = byId("settings-new-nickname");
    var nextNickname = toText(input && input.value).trim();
    if (!nextNickname) {
      setTip(t("requireNickname"), "err");
      return;
    }
    if (!isValidNickname(nextNickname)) {
      nicknameValidationState = "invalid";
      setNicknameValidationUi(true, t("invalidNickname"));
      setTip("", "");
      return;
    }

    var currentNickname = getStoredNickname();
    if (currentNickname && nextNickname === currentNickname) {
      setTip(t("nicknameNoChange"), "");
      return;
    }

    if (!(await validateNicknameAvailability(nextNickname, true))) return;

    setNicknameButtonEnabled(false);
    try {
      var result = await updateNicknameOnServer(nextNickname);
      if (result && result.success) {
        var resolvedNickname = toText(result.nickname || nextNickname).trim() || nextNickname;
        setStoredNickname(resolvedNickname);
        setCurrentNicknameText(resolvedNickname);
        if (input) input.value = "";
        setNicknameValidationUi(false, "");
        setTip(t("nicknameUpdated"), "ok");
        return;
      }
      setTip(resolveServerError(result, "nicknameUpdateFail"), "err");
    } finally {
      setNicknameButtonEnabled(true);
    }
  }

  async function onChangePasswordClick() {
    if (!getToken()) {
      setTip(t("requireLogin"), "err");
      return;
    }

    var oldInput = byId("settings-current-password");
    var newInput = byId("settings-new-password");
    var oldPassword = toText(oldInput && oldInput.value).trim();
    var newPassword = toText(newInput && newInput.value).trim();

    if (!oldPassword || !newPassword) {
      setTip(t("requirePasswordFields"), "err");
      return;
    }
    if (!isValidRegisterPassword(newPassword)) {
      setTip(t("invalidPassword"), "err");
      return;
    }

    setPasswordButtonEnabled(false);
    try {
      var result = await apiRequest("/password/change", {
        method: "POST",
        auth: true,
        body: {
          old_password: oldPassword,
          new_password: newPassword
        }
      });
      if (result && result.success) {
        if (oldInput) oldInput.value = "";
        if (newInput) newInput.value = "";
        setTip(t("passwordChanged"), "ok");
        return;
      }
      setTip(resolveServerError(result, "passwordChangeFail"), "err");
    } finally {
      setPasswordButtonEnabled(true);
    }
  }

  function onLogoutClick() {
    clearAuth();
    setTip(t("logoutDone"), "ok");
    global.setTimeout(function () {
      global.location.href = "2048.html";
    }, 120);
  }

  async function refreshUserInfo() {
    if (!getToken()) {
      syncAuthState();
      return;
    }

    var result = await getMyUserInfo();
    if (!result || !result.success || !result.data) {
      setUserInfoText({ nickname: getStoredNickname() || "--" });
      setTip(resolveServerError(result, "userInfoFail"), "err");
      syncAuthState();
      return;
    }

    var data = result.data || {};
    var nickname = toText(data.nickname || getStoredNickname()).trim();
    if (nickname) setStoredNickname(nickname);
    setUserInfoText(data);
    syncAuthState();
  }

  function applyLanguage() {
    setI18nReady(false);
    currentLang = readLanguage();
    global.document.title = t("pageTitle");

    var textMap = {
      "settings-kicker": t("kicker"),
      "settings-title": t("title"),
      "settings-subtitle": t("subtitle"),
      "settings-nav-account": t("navAccount"),
      "settings-nav-home": t("navHome"),
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
      "settings-nickname-heading": t("nicknameHeading"),
      "settings-current-nickname-label": t("currentNicknameLabel"),
      "settings-new-nickname-label": t("newNicknameLabel"),
      "settings-update-nickname-btn": t("saveNicknameBtn"),
      "settings-password-heading": t("passwordHeading"),
      "settings-current-password-label": t("currentPasswordLabel"),
      "settings-new-password-label": t("newPasswordLabel"),
      "settings-change-password-btn": t("changePasswordBtn"),
      "settings-session-heading": t("sessionHeading"),
      "settings-logout-btn": t("logoutBtn")
    };

    var ids = Object.keys(textMap);
    for (var i = 0; i < ids.length; i += 1) {
      var id = ids[i];
      var node = byId(id);
      if (node) node.textContent = textMap[id];
    }

    var newNicknameInput = byId("settings-new-nickname");
    var currentPasswordInput = byId("settings-current-password");
    var newPasswordInput = byId("settings-new-password");
    var emailInput = byId("account-email");
    var passwordInput = byId("account-password");
    var loginCaptchaInput = byId("account-login-captcha-answer");
    var loginCaptchaImage = byId("account-login-captcha-image");
    if (emailInput) emailInput.setAttribute("placeholder", t("emailPlaceholder"));
    if (passwordInput) passwordInput.setAttribute("placeholder", t("passwordPlaceholder"));
    if (loginCaptchaInput) loginCaptchaInput.setAttribute("placeholder", t("loginCaptchaPlaceholder"));
    if (loginCaptchaImage) loginCaptchaImage.setAttribute("alt", t("loginCaptchaLabel"));
    if (newNicknameInput) newNicknameInput.setAttribute("placeholder", t("newNicknamePlaceholder"));
    if (currentPasswordInput) currentPasswordInput.setAttribute("placeholder", t("currentPasswordPlaceholder"));
    if (newPasswordInput) newPasswordInput.setAttribute("placeholder", t("newPasswordPlaceholder"));

    syncAuthState();
    setI18nReady(true);
  }

  function bindEvents() {
    var loginBtn = byId("account-login-btn");
    var loginCaptchaRefreshBtn = byId("account-login-captcha-refresh");
    var emailInput = byId("account-email");
    var passwordInput = byId("account-password");
    var loginCaptchaInput = byId("account-login-captcha-answer");
    var updateNicknameBtn = byId("settings-update-nickname-btn");
    var newNicknameInput = byId("settings-new-nickname");
    var changePasswordBtn = byId("settings-change-password-btn");
    var newPasswordInput = byId("settings-new-password");
    var logoutBtn = byId("settings-logout-btn");

    if (loginBtn) loginBtn.addEventListener("click", onLoginClick);
    bindLoginInputBehavior(emailInput);
    bindLoginInputBehavior(passwordInput);
    bindLoginInputBehavior(loginCaptchaInput);
    if (loginCaptchaRefreshBtn) {
      loginCaptchaRefreshBtn.addEventListener("click", function () {
        refreshLoginCaptchaChallenge(true);
      });
    }
    if (updateNicknameBtn) {
      updateNicknameBtn.addEventListener("click", function () {
        onUpdateNicknameClick();
      });
    }
    if (newNicknameInput) {
      newNicknameInput.addEventListener("input", function () {
        markNicknameDirty(newNicknameInput.value);
        setTip("", "");
      });
      newNicknameInput.addEventListener("blur", function () {
        var nickname = toText(newNicknameInput.value).trim();
        if (!nickname) return;
        validateNicknameAvailability(nickname, true);
      });
    }
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener("click", function () {
        onChangePasswordClick();
      });
    }
    if (newPasswordInput) {
      newPasswordInput.addEventListener("keydown", function (eventLike) {
        if (!eventLike || eventLike.key !== "Enter") return;
        eventLike.preventDefault();
        onChangePasswordClick();
      });
    }
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        onLogoutClick();
      });
    }

    global.addEventListener("uilanguagechange", function () {
      applyLanguage();
    });
    global.addEventListener("storage", function (eventLike) {
      if (!eventLike) return;
      if (eventLike.key === UI_LANG_STORAGE_KEY) {
        applyLanguage();
        return;
      }
      if (
        eventLike.key === STORAGE_TOKEN_KEY ||
        eventLike.key === STORAGE_USER_ID_KEY ||
        eventLike.key === STORAGE_NICKNAME_KEY
      ) {
        syncAuthState();
        refreshUserInfo();
      }
    });
  }

  function init() {
    applyLanguage();
    bindEvents();
    syncAuthState();
    try {
      var params = new global.URLSearchParams(toText(global.location && global.location.search));
      if (params.get("registered") === "1" && !getToken()) {
        setAuthTip(t("registerOk"), "ok");
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

  global.AccountSettingsPageRuntime = {
    refreshUserInfo: refreshUserInfo,
    login: login,
    validateNicknameAvailability: validateNicknameAvailability
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

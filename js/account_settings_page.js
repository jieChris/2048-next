(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var STORAGE_TOKEN_KEY = "2048_auth_token_v1";
  var STORAGE_USER_ID_KEY = "2048_auth_userId_v1";
  var STORAGE_NICKNAME_KEY = "2048_auth_nickname_v1";
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
  var currentLang = readLanguage();

  var nicknameValidationState = "idle";
  var nicknameValidationValue = "";
  var nicknameValidationSerial = 0;

  var COPY = {
    zh: {
      pageTitle: "2048 账号设置",
      kicker: "2048 在线中心",
      title: "账号设置",
      subtitle: "在这里统一管理昵称、密码和登录状态。",
      navAccount: "返回账号中心",
      navHome: "回首页",
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
      navAccount: "Back to Account",
      navHome: "Home",
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
      WEAK_PASSWORD: "密码需 8-16 位，且至少包含字母/数字/符号中的两种",
      SAME_PASSWORD: "新密码不能与旧密码相同",
      NICKNAME_UPDATE_UNSUPPORTED: "当前服务端暂不支持修改昵称"
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
      WEAK_PASSWORD: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
      SAME_PASSWORD: "New password must differ from old password",
      NICKNAME_UPDATE_UNSUPPORTED: "Server does not support nickname update yet"
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

  function getToken() {
    return toText(safeGetStorage(STORAGE_TOKEN_KEY)).trim();
  }

  function getStoredNickname() {
    return toText(safeGetStorage(STORAGE_NICKNAME_KEY)).trim();
  }

  function setStoredNickname(nickname) {
    safeSetStorage(STORAGE_NICKNAME_KEY, toText(nickname).trim());
  }

  function clearAuth() {
    safeRemoveStorage(STORAGE_TOKEN_KEY);
    safeRemoveStorage(STORAGE_USER_ID_KEY);
    safeRemoveStorage(STORAGE_NICKNAME_KEY);
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
    var timeoutMs = resolveApiTimeoutMs();

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
          if (!data && i < apiBases.length - 1) continue;
          if (data && typeof data === "object") return data;
          return { error: "HTTP " + response.status };
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
    var node = byId("settings-current-nickname");
    if (!node) return;
    var text = toText(nickname).trim();
    node.textContent = text || "--";
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
      setCurrentNicknameText(getStoredNickname() || "--");
      return;
    }

    var result = await getMyUserInfo();
    if (!result || !result.success || !result.data) {
      setCurrentNicknameText(getStoredNickname() || "--");
      setTip(resolveServerError(result, "userInfoFail"), "err");
      return;
    }

    var data = result.data || {};
    var nickname = toText(data.nickname || getStoredNickname()).trim();
    if (nickname) setStoredNickname(nickname);
    setCurrentNicknameText(nickname || "--");
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
    if (newNicknameInput) newNicknameInput.setAttribute("placeholder", t("newNicknamePlaceholder"));
    if (currentPasswordInput) currentPasswordInput.setAttribute("placeholder", t("currentPasswordPlaceholder"));
    if (newPasswordInput) newPasswordInput.setAttribute("placeholder", t("newPasswordPlaceholder"));

    setI18nReady(true);
  }

  function bindEvents() {
    var updateNicknameBtn = byId("settings-update-nickname-btn");
    var newNicknameInput = byId("settings-new-nickname");
    var changePasswordBtn = byId("settings-change-password-btn");
    var newPasswordInput = byId("settings-new-password");
    var logoutBtn = byId("settings-logout-btn");

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
        refreshUserInfo();
      }
    });
  }

  function init() {
    applyLanguage();
    bindEvents();
    refreshUserInfo();
  }

  global.AccountSettingsPageRuntime = {
    refreshUserInfo: refreshUserInfo,
    validateNicknameAvailability: validateNicknameAvailability
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

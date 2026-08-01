(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var STORAGE_TOKEN_KEY = "2048_auth_token_v1";
  var DEFAULT_API_TIMEOUT_MS = 12000;

  // --- shared API utilities (from api_shared_utils.js) ---
  var _u = global.ApiSharedUtils || {};
  var toText = _u.toText || function (v) { return v == null ? "" : String(v); };
  var safeGetStorage = _u.safeGetStorage || function () { return null; };
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
  var turnstileSiteKey = "";
  var turnstileWidgetId = null;
  var turnstileToken = "";

  var COPY = {
    zh: {
      pageTitle: "2048 密码中心",
      kicker: "2048 在线中心",
      title: "密码中心",
      subtitle: "可找回密码，也可在登录后修改密码。",
      heading: "密码操作",
      navLogin: "返回登录",
      navHome: "回首页",
      resetHeading: "找回密码",
      changeHeading: "修改密码（需已登录）",
      emailLabel: "邮箱",
      turnstileLabel: "人机验证",
      codeLabel: "邮箱验证码",
      newPasswordLabel: "新密码",
      oldPasswordLabel: "当前密码",
      emailPlaceholder: "请输入邮箱",
      codePlaceholder: "请输入邮箱验证码",
      newPasswordPlaceholder: "请输入新密码",
      oldPasswordPlaceholder: "请输入当前密码",
      sendCodeBtn: "发送验证码",
      resetSubmitBtn: "重置密码",
      changeSubmitBtn: "修改密码",
      requireResetEmail: "请输入邮箱",
      requireResetCode: "请输入邮箱验证码",
      requireResetNewPassword: "请输入新密码",
      requireChangeFields: "请输入当前密码和新密码",
      requireLogin: "请先登录后再修改密码",
      turnstileMissingConfig: "未配置 Turnstile site key，请联系管理员",
      turnstileRequired: "请先完成人机验证",
      invalidEmail: "请输入正确的邮箱格式",
      invalidPassword: "密码需为8-16位，且至少包含字母/数字/符号中的两种",
      codeSent: "验证码已发送，请查收邮箱",
      resetOk: "密码重置成功，请返回登录",
      changeOk: "密码修改成功",
      networkError: "网络异常"
    },
    en: {
      pageTitle: "2048 Password Center",
      kicker: "2048 Online Hub",
      title: "Password Center",
      subtitle: "Reset forgotten passwords or change your password after login.",
      heading: "Password Operations",
      navLogin: "Back to Login",
      navHome: "Home",
      resetHeading: "Forgot Password",
      changeHeading: "Change Password (Logged In)",
      emailLabel: "Email",
      turnstileLabel: "Human Verification",
      codeLabel: "Email Verification Code",
      newPasswordLabel: "New Password",
      oldPasswordLabel: "Current Password",
      emailPlaceholder: "Enter email",
      codePlaceholder: "Enter email code",
      newPasswordPlaceholder: "Enter new password",
      oldPasswordPlaceholder: "Enter current password",
      sendCodeBtn: "Send Code",
      resetSubmitBtn: "Reset Password",
      changeSubmitBtn: "Change Password",
      requireResetEmail: "Please enter email",
      requireResetCode: "Please enter verification code",
      requireResetNewPassword: "Please enter new password",
      requireChangeFields: "Please enter current and new passwords",
      requireLogin: "Please sign in before changing password",
      turnstileMissingConfig: "Turnstile site key is not configured",
      turnstileRequired: "Please complete human verification",
      invalidEmail: "Please enter a valid email address",
      invalidPassword: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
      codeSent: "Verification code sent. Please check your email.",
      resetOk: "Password reset complete. Please sign in again.",
      changeOk: "Password changed successfully",
      networkError: "Network error"
    }
  };

  var ERROR_CODE_COPY = {
    zh: {
      MISSING_REQUIRED_PARAMS: "参数不完整",
      INVALID_EMAIL: "邮箱格式不正确",
      WEAK_PASSWORD: "密码需为8-16位，且至少包含字母/数字/符号中的两种",
      UNAUTHORIZED: "请先登录",
      INVALID_CREDENTIALS: "当前密码错误",
      SAME_PASSWORD: "新密码不能与旧密码相同",
      CAPTCHA_REQUIRED: "请先完成 Turnstile 人机验证",
      CAPTCHA_FAILED: "Turnstile 校验失败，请重试",
      CAPTCHA_VERIFY_FAILED: "Turnstile 验证服务异常，请稍后重试",
      TURNSTILE_NOT_CONFIGURED: "服务端未配置 Turnstile",
      RATE_LIMIT_IP: "请求过于频繁，请稍后重试",
      RATE_LIMIT_EMAIL: "请求过于频繁，请稍后重试",
      RESEND_COOLDOWN: "发送过于频繁，请稍后再试",
      VERIFICATION_NOT_FOUND: "未找到有效验证码，请重新发送",
      INVALID_VERIFICATION_CODE: "验证码错误",
      VERIFICATION_EXPIRED: "验证码已过期，请重新发送",
      VERIFICATION_ATTEMPTS_EXCEEDED: "验证码尝试次数过多，请重新发送",
      USER_NOT_FOUND: "账号不存在"
    },
    en: {
      MISSING_REQUIRED_PARAMS: "Missing required parameters",
      INVALID_EMAIL: "Invalid email format",
      WEAK_PASSWORD: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
      UNAUTHORIZED: "Please sign in first",
      INVALID_CREDENTIALS: "Current password is incorrect",
      SAME_PASSWORD: "New password must differ from old password",
      CAPTCHA_REQUIRED: "Please complete Turnstile verification",
      CAPTCHA_FAILED: "Turnstile verification failed",
      CAPTCHA_VERIFY_FAILED: "Turnstile verification service is unavailable",
      TURNSTILE_NOT_CONFIGURED: "Turnstile is not configured on server",
      RATE_LIMIT_IP: "Too many requests, please retry later",
      RATE_LIMIT_EMAIL: "Too many requests, please retry later",
      RESEND_COOLDOWN: "Please wait before requesting another code",
      VERIFICATION_NOT_FOUND: "Verification request not found",
      INVALID_VERIFICATION_CODE: "Invalid verification code",
      VERIFICATION_EXPIRED: "Verification code expired",
      VERIFICATION_ATTEMPTS_EXCEEDED: "Too many verification attempts",
      USER_NOT_FOUND: "User not found"
    }
  };

  function byId(id) {
    return global.document.getElementById(id);
  }

  function readLanguage() {
    var raw = toText(safeGetStorage(UI_LANG_STORAGE_KEY)).toLowerCase();
    return raw === "en" ? "en" : "zh";
  }

  function readTurnstileSiteKey() {
    var explicit = toText(global.GAME_TURNSTILE_SITE_KEY).trim();
    if (explicit) return explicit;
    if (!global.document || typeof global.document.querySelector !== "function") return "";
    var meta = global.document.querySelector("meta[name='turnstile-site-key']");
    return toText(meta && meta.getAttribute("content")).trim();
  }

  function setTurnstileVisible(visible) {
    var label = byId("password-reset-turnstile-label");
    var wrap = byId("password-reset-turnstile-wrap");
    var display = visible ? "" : "none";
    if (label) label.style.display = display;
    if (wrap) wrap.style.display = display;
  }

  function resetTurnstileToken() {
    turnstileToken = "";
    if (
      typeof global.turnstile !== "undefined" &&
      global.turnstile &&
      typeof global.turnstile.reset === "function" &&
      turnstileWidgetId != null
    ) {
      try {
        global.turnstile.reset(turnstileWidgetId);
      } catch (_err) {}
    }
  }

  function tryRenderTurnstileWidget() {
    if (!turnstileSiteKey) {
      setTurnstileVisible(false);
      return false;
    }
    setTurnstileVisible(true);

    if (
      typeof global.turnstile === "undefined" ||
      !global.turnstile ||
      typeof global.turnstile.render !== "function"
    ) {
      return false;
    }
    if (turnstileWidgetId != null) return true;

    var host = byId("password-reset-turnstile-widget");
    if (!host) return false;
    host.innerHTML = "";
    try {
      turnstileWidgetId = global.turnstile.render(host, {
        sitekey: turnstileSiteKey,
        callback: function (token) {
          turnstileToken = toText(token).trim();
        },
        "expired-callback": function () {
          turnstileToken = "";
        },
        "error-callback": function () {
          turnstileToken = "";
        }
      });
      return true;
    } catch (_err) {
      turnstileWidgetId = null;
      return false;
    }
  }

  function ensureTurnstileWidgetReady() {
    if (!turnstileSiteKey) {
      setTurnstileVisible(false);
      return;
    }
    var attempts = 0;
    (function tick() {
      if (tryRenderTurnstileWidget()) return;
      attempts += 1;
      if (attempts >= 20) return;
      global.setTimeout(tick, 250);
    })();
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

  function setTip(message, type) {
    var node = byId("password-tip");
    if (!node) return;
    node.textContent = toText(message);
    node.classList.remove("ok");
    node.classList.remove("err");
    if (!message) return;
    if (type === "ok") node.classList.add("ok");
    if (type === "err") node.classList.add("err");
  }

  function resolveMailFailureDetail(result) {
    var detail = toText(result && result.detail).trim();
    if (!detail) return "";

    var parsedMessage = "";
    if (detail.charAt(0) === "{" || detail.charAt(0) === "[") {
      try {
        var payload = JSON.parse(detail);
        var payloadCode = toText(
          payload && (payload.code || (payload.error && payload.error.code))
        ).trim();
        var payloadMessage = toText(
          payload &&
            (payload.message ||
              (payload.error && payload.error.message) ||
              (payload.errors && payload.errors[0] && payload.errors[0].message))
        ).trim();
        if (payloadCode && payloadMessage) {
          parsedMessage = payloadCode + ": " + payloadMessage;
        } else {
          parsedMessage = payloadMessage || payloadCode;
        }
      } catch (_err) {}
    }

    var normalized = (parsedMessage || detail).replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (normalized.length > 120) {
      return normalized.slice(0, 117) + "...";
    }
    return normalized;
  }

  function resolveServerError(result, fallbackKey) {
    var lang = currentLang === "en" ? "en" : "zh";
    var code = toText(result && result.code).trim().toUpperCase();
    if (code && ERROR_CODE_COPY[lang] && ERROR_CODE_COPY[lang][code]) {
      var baseMessage = ERROR_CODE_COPY[lang][code];
      if (code === "MAIL_SEND_FAILED" || code === "MAIL_NOT_CONFIGURED") {
        var detail = resolveMailFailureDetail(result);
        if (detail) return baseMessage + " (" + detail + ")";
      }
      return baseMessage;
    }
    var explicit = toText(result && result.error).trim();
    if (explicit) return explicit;
    return t(fallbackKey);
  }

  function getToken() {
    return toText(safeGetStorage(STORAGE_TOKEN_KEY)).trim();
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

  function setResetActionsEnabled(enabled) {
    var sendBtn = byId("password-reset-send-code-btn");
    var submitBtn = byId("password-reset-submit-btn");
    if (sendBtn) sendBtn.disabled = !enabled;
    if (submitBtn) submitBtn.disabled = !enabled;
  }

  function setChangeActionsEnabled(enabled) {
    var submitBtn = byId("password-change-submit-btn");
    if (submitBtn) submitBtn.disabled = !enabled;
  }

  async function onResetSendCodeClick() {
    var email = toText(byId("password-reset-email") && byId("password-reset-email").value).trim();
    if (!email) {
      setTip(t("requireResetEmail"), "err");
      return;
    }
    if (!isValidEmailFormat(email)) {
      setTip(t("invalidEmail"), "err");
      return;
    }
    if (!turnstileSiteKey) {
      setTip(t("turnstileMissingConfig"), "err");
      return;
    }
    if (turnstileWidgetId == null && !tryRenderTurnstileWidget()) {
      setTip(t("turnstileRequired"), "err");
      return;
    }
    if (!turnstileToken) {
      setTip(t("turnstileRequired"), "err");
      return;
    }
    setResetActionsEnabled(false);
    try {
      var result = await apiRequest("/password/reset/start", {
        method: "POST",
        body: {
          email: email,
          turnstile_token: turnstileToken,
          turnstileToken: turnstileToken,
          captchaToken: turnstileToken
        }
      });
      resetTurnstileToken();
      if (result && result.success) {
        setTip(t("codeSent"), "ok");
        return;
      }
      setTip(resolveServerError(result, "networkError"), "err");
    } finally {
      setResetActionsEnabled(true);
    }
  }

  async function onResetSubmitClick() {
    var email = toText(byId("password-reset-email") && byId("password-reset-email").value).trim();
    var code = toText(byId("password-reset-code") && byId("password-reset-code").value).trim();
    var newPassword = toText(byId("password-reset-new-password") && byId("password-reset-new-password").value).trim();

    if (!email) {
      setTip(t("requireResetEmail"), "err");
      return;
    }
    if (!isValidEmailFormat(email)) {
      setTip(t("invalidEmail"), "err");
      return;
    }
    if (!code) {
      setTip(t("requireResetCode"), "err");
      return;
    }
    if (!newPassword) {
      setTip(t("requireResetNewPassword"), "err");
      return;
    }
    if (!isValidRegisterPassword(newPassword)) {
      setTip(t("invalidPassword"), "err");
      return;
    }

    setResetActionsEnabled(false);
    try {
      var result = await apiRequest("/password/reset/verify", {
        method: "POST",
        body: {
          email: email,
          code: code,
          new_password: newPassword
        }
      });
      if (result && result.success) {
        setTip(t("resetOk"), "ok");
        var resetCodeInput = byId("password-reset-code");
        var resetNewPasswordInput = byId("password-reset-new-password");
        if (resetCodeInput) resetCodeInput.value = "";
        if (resetNewPasswordInput) resetNewPasswordInput.value = "";
        return;
      }
      setTip(resolveServerError(result, "networkError"), "err");
    } finally {
      setResetActionsEnabled(true);
    }
  }

  async function onChangeSubmitClick() {
    var token = getToken();
    if (!token) {
      setTip(t("requireLogin"), "err");
      return;
    }

    var oldPassword = toText(byId("password-change-old-password") && byId("password-change-old-password").value).trim();
    var newPassword = toText(byId("password-change-new-password") && byId("password-change-new-password").value).trim();
    if (!oldPassword || !newPassword) {
      setTip(t("requireChangeFields"), "err");
      return;
    }
    if (!isValidRegisterPassword(newPassword)) {
      setTip(t("invalidPassword"), "err");
      return;
    }

    setChangeActionsEnabled(false);
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
        setTip(t("changeOk"), "ok");
        var oldInput = byId("password-change-old-password");
        var newInput = byId("password-change-new-password");
        if (oldInput) oldInput.value = "";
        if (newInput) newInput.value = "";
        return;
      }
      setTip(resolveServerError(result, "networkError"), "err");
    } finally {
      setChangeActionsEnabled(true);
    }
  }

  function applyLanguage() {
    setI18nReady(false);
    currentLang = readLanguage();
    global.document.title = t("pageTitle");

    var textMap = {
      "password-kicker": t("kicker"),
      "password-title": t("title"),
      "password-subtitle": t("subtitle"),
      "password-heading": t("heading"),
      "password-nav-login": t("navLogin"),
      "password-nav-home": t("navHome"),
      "password-reset-heading": t("resetHeading"),
      "password-change-heading": t("changeHeading"),
      "password-reset-email-label": t("emailLabel"),
      "password-reset-turnstile-label": t("turnstileLabel"),
      "password-reset-code-label": t("codeLabel"),
      "password-reset-new-password-label": t("newPasswordLabel"),
      "password-change-old-password-label": t("oldPasswordLabel"),
      "password-change-new-password-label": t("newPasswordLabel"),
      "password-reset-send-code-btn": t("sendCodeBtn"),
      "password-reset-submit-btn": t("resetSubmitBtn"),
      "password-change-submit-btn": t("changeSubmitBtn")
    };

    var ids = Object.keys(textMap);
    for (var i = 0; i < ids.length; i += 1) {
      var id = ids[i];
      var node = byId(id);
      if (node) node.textContent = textMap[id];
    }

    var resetEmailInput = byId("password-reset-email");
    var resetCodeInput = byId("password-reset-code");
    var resetNewPasswordInput = byId("password-reset-new-password");
    var changeOldPasswordInput = byId("password-change-old-password");
    var changeNewPasswordInput = byId("password-change-new-password");
    if (resetEmailInput) resetEmailInput.setAttribute("placeholder", t("emailPlaceholder"));
    if (resetCodeInput) resetCodeInput.setAttribute("placeholder", t("codePlaceholder"));
    if (resetNewPasswordInput) resetNewPasswordInput.setAttribute("placeholder", t("newPasswordPlaceholder"));
    if (changeOldPasswordInput) changeOldPasswordInput.setAttribute("placeholder", t("oldPasswordPlaceholder"));
    if (changeNewPasswordInput) changeNewPasswordInput.setAttribute("placeholder", t("newPasswordPlaceholder"));
    setTurnstileVisible(!!turnstileSiteKey);

    setI18nReady(true);
  }

  function focusByModeQuery() {
    try {
      var params = new global.URLSearchParams(toText(global.location && global.location.search));
      var mode = toText(params.get("mode")).trim().toLowerCase();
      if (mode === "change") {
        var changeInput = byId("password-change-old-password");
        if (changeInput && typeof changeInput.focus === "function") changeInput.focus();
        return;
      }
      if (mode === "reset") {
        var resetInput = byId("password-reset-email");
        if (resetInput && typeof resetInput.focus === "function") resetInput.focus();
      }
    } catch (_err) {}
  }

  function bindEvents() {
    var resetSendBtn = byId("password-reset-send-code-btn");
    var resetSubmitBtn = byId("password-reset-submit-btn");
    var changeSubmitBtn = byId("password-change-submit-btn");
    var resetCodeInput = byId("password-reset-code");
    var changeNewInput = byId("password-change-new-password");

    if (resetSendBtn) {
      resetSendBtn.addEventListener("click", function () {
        onResetSendCodeClick();
      });
    }
    if (resetSubmitBtn) {
      resetSubmitBtn.addEventListener("click", function () {
        onResetSubmitClick();
      });
    }
    if (changeSubmitBtn) {
      changeSubmitBtn.addEventListener("click", function () {
        onChangeSubmitClick();
      });
    }
    if (resetCodeInput) {
      resetCodeInput.addEventListener("keydown", function (eventLike) {
        if (!eventLike || eventLike.key !== "Enter") return;
        eventLike.preventDefault();
        onResetSubmitClick();
      });
    }
    if (changeNewInput) {
      changeNewInput.addEventListener("keydown", function (eventLike) {
        if (!eventLike || eventLike.key !== "Enter") return;
        eventLike.preventDefault();
        onChangeSubmitClick();
      });
    }

    global.addEventListener("uilanguagechange", function () {
      applyLanguage();
    });
    global.addEventListener("storage", function (eventLike) {
      if (!eventLike || eventLike.key !== UI_LANG_STORAGE_KEY) return;
      applyLanguage();
    });
  }

  function init() {
    turnstileSiteKey = readTurnstileSiteKey();
    applyLanguage();
    bindEvents();
    ensureTurnstileWidgetReady();
    focusByModeQuery();
  }

  global.PasswordPageRuntime = {
    refreshTurnstile: ensureTurnstileWidgetReady
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

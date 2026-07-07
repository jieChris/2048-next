(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var UI_LANG_STORAGE_KEY = "ui_language_v1";
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
  var turnstileRenderTried = false;
  var nicknameValidationState = "idle";
  var nicknameValidationValue = "";
  var nicknameValidationSerial = 0;

  var COPY = {
    zh: {
      pageTitle: "2048 \u6ce8\u518c",
      kicker: "2048 在线中心",
      title: "\u6ce8\u518c\u8d26\u53f7",
      subtitle: "\u6ce8\u518c\u524d\u8bf7\u5148\u5b8c\u6210\u4eba\u673a\u9a8c\u8bc1\uff0c\u5e76\u901a\u8fc7\u6635\u79f0\u53ef\u7528\u6027\u6821\u9a8c\u3002",
      heading: "\u6ce8\u518c",
      navLogin: "\u8fd4\u56de\u767b\u5f55",
      navHome: "\u56de\u9996\u9875",
      emailLabel: "\u90ae\u7bb1",
      emailPlaceholder: "\u8bf7\u8f93\u5165\u90ae\u7bb1",
      passwordLabel: "\u5bc6\u7801",
      passwordPlaceholder: "\u8bf7\u8f93\u5165\u5bc6\u7801",
      nicknameLabel: "\u6635\u79f0",
      nicknamePlaceholder: "\u8bf7\u8f93\u5165\u6635\u79f0\uff082-10\u5b57\u7b26\uff09",
      emailCodeLabel: "\u90ae\u7bb1\u9a8c\u8bc1\u7801",
      emailCodePlaceholder: "\u8bf7\u8f93\u5165\u90ae\u7bb1\u6536\u5230\u76846\u4f4d\u9a8c\u8bc1\u7801",
      turnstileLabel: "\u4eba\u673a\u9a8c\u8bc1",
      sendCodeBtn: "\u53d1\u9001\u9a8c\u8bc1\u7801",
      submitBtn: "\u6ce8\u518c",
      backLoginBtn: "\u8fd4\u56de\u767b\u5f55",
      requireFields: "\u8bf7\u586b\u5199\u90ae\u7bb1\u3001\u5bc6\u7801\u548c\u6635\u79f0",
      requireEmailCode: "\u8bf7\u8f93\u5165\u90ae\u7bb1\u9a8c\u8bc1\u7801",
      turnstileMissingConfig: "\u672a\u914d\u7f6e Turnstile site key\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458",
      turnstileRequired: "\u8bf7\u5148\u5b8c\u6210\u4eba\u673a\u9a8c\u8bc1",
      codeSent: "\u9a8c\u8bc1\u7801\u5df2\u53d1\u9001\uff0c\u8bf7\u67e5\u6536\u90ae\u7bb1\u540e\u8f93\u5165\u9a8c\u8bc1\u7801\u518d\u70b9\u51fb\u6ce8\u518c",
      invalidEmail: "\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u90ae\u7bb1\u683c\u5f0f",
      invalidPassword: "\u5bc6\u7801\u9700\u4e3a8-16\u4f4d\uff0c\u4e14\u81f3\u5c11\u5305\u542b\u5b57\u6bcd/\u6570\u5b57/\u7b26\u53f7\u4e2d\u7684\u4e24\u79cd",
      invalidNickname: "\u6635\u79f0\u9700\u4e3a2-10\u4f4d\uff0c\u4ec5\u652f\u6301\u4e2d\u6587\u3001\u5b57\u6bcd\u3001\u6570\u5b57\u3001\u7a7a\u683c\u3001\u4e0b\u5212\u7ebf\u548c\u77ed\u6a2a\u7ebf",
      nicknameTaken: "\u6635\u79f0\u5df2\u88ab\u5360\u7528\uff0c\u8bf7\u66f4\u6362",
      nicknameUnavailableInline: "\u5f53\u524d\u6635\u79f0\u4e0d\u53ef\u7528\uff0c\u8bf7\u66f4\u6362\u6635\u79f0",
      nicknameCheckFailed: "\u6635\u79f0\u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5",
      registerOk: "\u6ce8\u518c\u6210\u529f\uff0c\u6b63\u5728\u8fd4\u56de\u767b\u5f55\u9875...",
      registerFail: "\u6ce8\u518c\u5931\u8d25",
      networkError: "\u7f51\u7edc\u5f02\u5e38"
    },
    en: {
      pageTitle: "2048 Register",
      kicker: "2048 Online Hub",
      title: "Create Account",
      subtitle: "Complete human verification and pass nickname availability check before account creation.",
      heading: "Register",
      navLogin: "Back to Login",
      navHome: "Home",
      emailLabel: "Email",
      emailPlaceholder: "Enter email",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter password",
      nicknameLabel: "Nickname",
      nicknamePlaceholder: "Enter nickname (2-10 chars)",
      emailCodeLabel: "Email Verification Code",
      emailCodePlaceholder: "Enter 6-digit code from email",
      turnstileLabel: "Human Verification",
      sendCodeBtn: "Send Code",
      submitBtn: "Register",
      backLoginBtn: "Back to Login",
      requireFields: "Email, password and nickname are required",
      requireEmailCode: "Please enter the email verification code",
      turnstileMissingConfig: "Turnstile site key is not configured",
      turnstileRequired: "Please complete human verification",
      codeSent: "Verification code sent. Enter it and click Register again.",
      invalidEmail: "Please enter a valid email address",
      invalidPassword: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
      invalidNickname: "Nickname must be 2-10 chars and use letters/numbers/spaces/_/-/Chinese only",
      nicknameTaken: "Nickname already exists",
      nicknameUnavailableInline: "Nickname unavailable, please choose another",
      nicknameCheckFailed: "Nickname validation failed, please retry",
      registerOk: "Registered. Redirecting to login...",
      registerFail: "Register failed",
      networkError: "Network error"
    }
  };

  var ERROR_CODE_COPY = {
    zh: {
      INVALID_EMAIL: "\u90ae\u7bb1\u683c\u5f0f\u4e0d\u6b63\u786e",
      WEAK_PASSWORD: "\u5bc6\u7801\u9700\u4e3a8-16\u4f4d\uff0c\u4e14\u81f3\u5c11\u5305\u542b\u5b57\u6bcd/\u6570\u5b57/\u7b26\u53f7\u4e2d\u7684\u4e24\u79cd",
      EMPTY: "\u6635\u79f0\u4e0d\u80fd\u4e3a\u7a7a",
      LENGTH: "\u6635\u79f0\u957f\u5ea6\u9700\u5728 2-10 \u4e2a\u5b57\u7b26",
      CHARS: "\u6635\u79f0\u4ec5\u652f\u6301\u4e2d\u6587\u3001\u5b57\u6bcd\u3001\u6570\u5b57\u3001\u7a7a\u683c\u3001\u4e0b\u5212\u7ebf\u548c\u77ed\u6a2a\u7ebf",
      INVALID: "\u6635\u79f0\u4e0d\u53ef\u7528\uff0c\u8bf7\u66f4\u6362",
      RESERVED: "\u6635\u79f0\u4e0d\u53ef\u7528\uff0c\u8bf7\u66f4\u6362",
      SENSITIVE: "\u6635\u79f0\u4e0d\u53ef\u7528\uff0c\u8bf7\u66f4\u6362",
      NICKNAME_EXISTS: "\u6635\u79f0\u5df2\u88ab\u5360\u7528\uff0c\u8bf7\u66f4\u6362",
      DUPLICATE_NICKNAME: "\u6635\u79f0\u5df2\u88ab\u5360\u7528\uff0c\u8bf7\u66f4\u6362",
      NICKNAME_TAKEN: "\u6635\u79f0\u5df2\u88ab\u5360\u7528\uff0c\u8bf7\u66f4\u6362",
      EMAIL_EXISTS: "\u90ae\u7bb1\u5df2\u6ce8\u518c\uff0c\u8bf7\u76f4\u63a5\u767b\u5f55",
      IMAGE_CAPTCHA_REQUIRED: "\u8bf7\u5148\u5b8c\u6210\u56fe\u7247\u9a8c\u8bc1\u7801",
      IMAGE_CAPTCHA_INVALID: "\u56fe\u7247\u9a8c\u8bc1\u7801\u9519\u8bef\uff0c\u8bf7\u91cd\u8bd5",
      IMAGE_CAPTCHA_EXPIRED: "\u56fe\u7247\u9a8c\u8bc1\u7801\u5df2\u8fc7\u671f\uff0c\u8bf7\u5237\u65b0\u540e\u91cd\u8bd5",
      IMAGE_CAPTCHA_ATTEMPTS_EXCEEDED: "\u56fe\u7247\u9a8c\u8bc1\u7801\u5c1d\u8bd5\u6b21\u6570\u8fc7\u591a\uff0c\u8bf7\u5237\u65b0\u540e\u91cd\u8bd5",
      CAPTCHA_REQUIRED: "\u8bf7\u5148\u5b8c\u6210 Turnstile \u4eba\u673a\u9a8c\u8bc1",
      CAPTCHA_FAILED: "Turnstile \u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5",
      CAPTCHA_VERIFY_FAILED: "Turnstile \u9a8c\u8bc1\u670d\u52a1\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5",
      TURNSTILE_NOT_CONFIGURED: "\u670d\u52a1\u7aef\u672a\u914d\u7f6e Turnstile",
      VERIFICATION_REQUIRED: "\u8bf7\u5148\u53d1\u9001\u90ae\u7bb1\u9a8c\u8bc1\u7801",
      VERIFICATION_NOT_FOUND: "\u672a\u627e\u5230\u6709\u6548\u9a8c\u8bc1\u8bf7\u6c42\uff0c\u8bf7\u91cd\u65b0\u53d1\u9001\u9a8c\u8bc1\u7801",
      INVALID_VERIFICATION_CODE: "\u9a8c\u8bc1\u7801\u9519\u8bef",
      VERIFICATION_EXPIRED: "\u9a8c\u8bc1\u7801\u5df2\u8fc7\u671f\uff0c\u8bf7\u91cd\u65b0\u53d1\u9001",
      VERIFICATION_ATTEMPTS_EXCEEDED: "\u9a8c\u8bc1\u7801\u5c1d\u8bd5\u6b21\u6570\u8fc7\u591a\uff0c\u8bf7\u91cd\u65b0\u53d1\u9001",
      RESEND_COOLDOWN: "\u8bf7\u7a0d\u540e\u518d\u91cd\u65b0\u53d1\u9001\u9a8c\u8bc1\u7801",
      MAIL_NOT_CONFIGURED: "\u90ae\u4ef6\u670d\u52a1\u672a\u914d\u7f6e\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458",
      MAIL_SEND_FAILED: "\u9a8c\u8bc1\u90ae\u4ef6\u53d1\u9001\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5"
    },
    en: {
      INVALID_EMAIL: "Invalid email format",
      WEAK_PASSWORD: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
      EMPTY: "Nickname cannot be empty",
      LENGTH: "Nickname length must be 2-10 characters",
      CHARS: "Nickname supports letters, numbers, spaces, underscores and hyphens only",
      INVALID: "Nickname is not allowed",
      RESERVED: "Nickname is not allowed",
      SENSITIVE: "Nickname is not allowed",
      NICKNAME_EXISTS: "Nickname already exists",
      DUPLICATE_NICKNAME: "Nickname already exists",
      NICKNAME_TAKEN: "Nickname already exists",
      EMAIL_EXISTS: "Email already registered",
      IMAGE_CAPTCHA_REQUIRED: "Please complete image captcha",
      IMAGE_CAPTCHA_INVALID: "Incorrect image captcha",
      IMAGE_CAPTCHA_EXPIRED: "Image captcha expired, please refresh",
      IMAGE_CAPTCHA_ATTEMPTS_EXCEEDED: "Too many captcha attempts, please refresh",
      CAPTCHA_REQUIRED: "Please complete Turnstile verification",
      CAPTCHA_FAILED: "Turnstile verification failed",
      CAPTCHA_VERIFY_FAILED: "Turnstile verification service is unavailable",
      TURNSTILE_NOT_CONFIGURED: "Turnstile is not configured on server",
      VERIFICATION_REQUIRED: "Please send email verification code first",
      VERIFICATION_NOT_FOUND: "Verification request not found. Please send code again.",
      INVALID_VERIFICATION_CODE: "Invalid verification code",
      VERIFICATION_EXPIRED: "Verification code expired. Please send again.",
      VERIFICATION_ATTEMPTS_EXCEEDED: "Too many verification attempts. Please send again.",
      RESEND_COOLDOWN: "Please wait before requesting another code",
      MAIL_NOT_CONFIGURED: "Email service is not configured",
      MAIL_SEND_FAILED: "Failed to send verification email"
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
    var label = byId("register-turnstile-label");
    var wrap = byId("register-turnstile-wrap");
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

    var host = byId("register-turnstile-widget");
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
      turnstileRenderTried = true;
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
    return (COPY[lang] && COPY[lang][key]) || (COPY.en && COPY.en[key]) || (COPY.zh && COPY.zh[key]) || "";
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

  function isValidNickname(nicknameLike) {
    var nickname = toText(nicknameLike).trim();
    if (nickname.length < 2 || nickname.length > 10) return false;
    return /^[\u4E00-\u9FA5A-Za-z0-9 _-]+$/.test(nickname);
  }

  function setTip(message, type) {
    var node = byId("register-tip");
    if (!node) return;
    node.textContent = toText(message);
    node.classList.remove("ok");
    node.classList.remove("err");
    if (!message) return;
    if (type === "ok") node.classList.add("ok");
    if (type === "err") node.classList.add("err");
  }

  function setSubmitEnabled(enabled) {
    var submitBtn = byId("register-submit-btn");
    if (submitBtn) submitBtn.disabled = !enabled;
  }

  function setSendCodeEnabled(enabled) {
    var sendBtn = byId("register-send-code-btn");
    if (sendBtn) sendBtn.disabled = !enabled;
  }

  function setNicknameValidationUi(invalid) {
    var nicknameInput = byId("register-nickname");
    var feedback = byId("register-nickname-feedback");
    if (nicknameInput) {
      nicknameInput.classList.toggle("input-error", !!invalid);
    }
    if (feedback) {
      if (invalid) {
        feedback.textContent = t("nicknameUnavailableInline");
        feedback.classList.add("active");
      } else {
        feedback.textContent = "";
        feedback.classList.remove("active");
      }
    }
  }

  function isNicknameErrorCode(code) {
    var normalized = toText(code).trim().toUpperCase();
    return (
      normalized === "EMPTY" ||
      normalized === "LENGTH" ||
      normalized === "CHARS" ||
      normalized === "INVALID" ||
      normalized === "RESERVED" ||
      normalized === "SENSITIVE" ||
      normalized === "NICKNAME_EXISTS" ||
      normalized === "DUPLICATE_NICKNAME" ||
      normalized === "NICKNAME_TAKEN"
    );
  }

  function normalizeServerCode(result) {
    return toText(result && result.code).trim().toUpperCase();
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
    var code = normalizeServerCode(result);
    var baseMessage = "";
    if (code) {
      if (ERROR_CODE_COPY[lang] && ERROR_CODE_COPY[lang][code]) {
        baseMessage = ERROR_CODE_COPY[lang][code];
      } else if (ERROR_CODE_COPY.en && ERROR_CODE_COPY.en[code]) {
        baseMessage = ERROR_CODE_COPY.en[code];
      }
      if (
        baseMessage &&
        (code === "MAIL_SEND_FAILED" || code === "MAIL_NOT_CONFIGURED")
      ) {
        var mailDetail = resolveMailFailureDetail(result);
        if (mailDetail) {
          return baseMessage + " (" + mailDetail + ")";
        }
      }
      if (baseMessage) return baseMessage;
    }
    var explicit = toText(result && result.error).trim();
    if (explicit) return explicit;
    return t(fallbackKey);
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

  async function checkNicknameAvailable(nickname) {
    var path = "/register/check-nickname?nickname=" + encodeURIComponent(nickname);
    var result = await apiRequest(path, { method: "GET" });
    if (!result || typeof result !== "object") return null;
    if (result.success === true && result.available === true) return true;
    if (result.success === true && result.available === false) return false;
    if (toText(result.code).toUpperCase() === "NICKNAME_EXISTS") return false;
    return null;
  }

  function markNicknameDirty(nextValue) {
    var normalized = toText(nextValue).trim();
    if (normalized !== nicknameValidationValue) {
      nicknameValidationSerial += 1;
      nicknameValidationValue = normalized;
      nicknameValidationState = "idle";
      setNicknameValidationUi(false);
    }
  }

  async function validateNicknameAvailability(nickname, showTipOnError) {
    var normalized = toText(nickname).trim();
    if (!isValidNickname(normalized)) {
      nicknameValidationValue = normalized;
      nicknameValidationState = "invalid";
      setNicknameValidationUi(true);
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
      setNicknameValidationUi(false);
      if (showTipOnError) setTip("", "");
      return true;
    }
    if (available === false) {
      nicknameValidationState = "unavailable";
      setNicknameValidationUi(true);
      if (showTipOnError) setTip("", "");
      return false;
    }

    nicknameValidationState = "error";
    setNicknameValidationUi(true);
    if (showTipOnError) setTip("", "");
    return false;
  }

  function readRegisterForm() {
    return {
      email: toText(byId("register-email") && byId("register-email").value).trim(),
      password: toText(byId("register-password") && byId("register-password").value).trim(),
      nickname: toText(byId("register-nickname") && byId("register-nickname").value).trim(),
      verificationCode: toText(byId("register-email-code") && byId("register-email-code").value).trim()
    };
  }

  function validateRegisterBase(form) {
    if (!form.email || !form.password || !form.nickname) {
      setTip(t("requireFields"), "err");
      return false;
    }
    if (!isValidEmailFormat(form.email)) {
      setTip(t("invalidEmail"), "err");
      return false;
    }
    if (!isValidRegisterPassword(form.password)) {
      setTip(t("invalidPassword"), "err");
      return false;
    }
    if (!isValidNickname(form.nickname)) {
      nicknameValidationState = "invalid";
      setNicknameValidationUi(true);
      setTip("", "");
      return false;
    }
    return true;
  }

  async function onSendCodeClick() {
    var form = readRegisterForm();
    if (!validateRegisterBase(form)) return;
    if (!(await validateNicknameAvailability(form.nickname, true))) return;
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

    setSendCodeEnabled(false);
    setSubmitEnabled(false);
    try {
      var startResult = await apiRequest("/register/start", {
        method: "POST",
        body: {
          email: form.email,
          password: form.password,
          nickname: form.nickname,
          turnstile_token: turnstileToken,
          turnstileToken: turnstileToken,
          captchaToken: turnstileToken
        }
      });
      resetTurnstileToken();

      if (startResult && startResult.success) {
        setTip(t("codeSent"), "ok");
        return;
      }

      if (isNicknameErrorCode(normalizeServerCode(startResult))) {
        nicknameValidationState = "unavailable";
        setNicknameValidationUi(true);
        setTip("", "");
        return;
      }
      setTip(resolveServerError(startResult, "registerFail"), "err");
    } finally {
      setSendCodeEnabled(true);
      setSubmitEnabled(true);
    }
  }

  async function onSubmitRegister() {
    var form = readRegisterForm();
    if (!validateRegisterBase(form)) return;
    if (!(await validateNicknameAvailability(form.nickname, true))) return;
    if (!form.verificationCode) {
      setTip(t("requireEmailCode"), "err");
      return;
    }

    setSubmitEnabled(false);
    try {
      var result = await apiRequest("/register/verify", {
        method: "POST",
        body: {
          email: form.email,
          code: form.verificationCode
        }
      });

      if (result && result.success) {
        setTip(t("registerOk"), "ok");
        global.setTimeout(function () {
          global.location.href = "account.html?registered=1";
        }, 900);
        return;
      }

      if (isNicknameErrorCode(normalizeServerCode(result))) {
        nicknameValidationState = "unavailable";
        setNicknameValidationUi(true);
        setTip("", "");
        return;
      }
      setTip(resolveServerError(result, "registerFail"), "err");
    } finally {
      setSubmitEnabled(true);
    }
  }

  function applyLanguage() {
    setI18nReady(false);
    currentLang = readLanguage();
    global.document.title = t("pageTitle");

    var textMap = {
      "register-kicker": t("kicker"),
      "register-title": t("title"),
      "register-subtitle": t("subtitle"),
      "register-heading": t("heading"),
      "register-nav-login": t("navLogin"),
      "register-nav-home": t("navHome"),
      "register-email-label": t("emailLabel"),
      "register-password-label": t("passwordLabel"),
      "register-nickname-label": t("nicknameLabel"),
      "register-turnstile-label": t("turnstileLabel"),
      "register-email-code-label": t("emailCodeLabel"),
      "register-send-code-btn": t("sendCodeBtn"),
      "register-submit-btn": t("submitBtn"),
      "register-back-login-btn": t("backLoginBtn")
    };

    var ids = Object.keys(textMap);
    for (var i = 0; i < ids.length; i += 1) {
      var id = ids[i];
      var node = byId(id);
      if (node) node.textContent = textMap[id];
    }

    var emailInput = byId("register-email");
    var passwordInput = byId("register-password");
    var nicknameInput = byId("register-nickname");
    var codeInput = byId("register-email-code");
    if (emailInput) emailInput.setAttribute("placeholder", t("emailPlaceholder"));
    if (passwordInput) passwordInput.setAttribute("placeholder", t("passwordPlaceholder"));
    if (nicknameInput) nicknameInput.setAttribute("placeholder", t("nicknamePlaceholder"));
    if (codeInput) codeInput.setAttribute("placeholder", t("emailCodePlaceholder"));
    setNicknameValidationUi(
      nicknameValidationState === "invalid" ||
        nicknameValidationState === "unavailable" ||
        nicknameValidationState === "error"
    );
    setTurnstileVisible(!!turnstileSiteKey);

    setI18nReady(true);
  }

  function bindEvents() {
    var sendCodeBtn = byId("register-send-code-btn");
    var submitBtn = byId("register-submit-btn");
    var nicknameInput = byId("register-nickname");
    var codeInput = byId("register-email-code");

    if (sendCodeBtn) {
      sendCodeBtn.addEventListener("click", function () {
        onSendCodeClick();
      });
    }
    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        onSubmitRegister();
      });
    }
    if (nicknameInput) {
      nicknameInput.addEventListener("input", function () {
        markNicknameDirty(nicknameInput.value);
      });
      nicknameInput.addEventListener("blur", function () {
        var nickname = toText(nicknameInput.value).trim();
        if (!nickname) return;
        validateNicknameAvailability(nickname, true);
      });
    }
    if (codeInput) {
      codeInput.addEventListener("keydown", function (eventLike) {
        if (!eventLike || eventLike.key !== "Enter") return;
        eventLike.preventDefault();
        onSubmitRegister();
      });
    }
  }

  function bindLanguageSync() {
    global.addEventListener("uilanguagechange", function () {
      applyLanguage();
    });
    global.addEventListener("storage", function (eventLike) {
      if (!eventLike || eventLike.key !== UI_LANG_STORAGE_KEY) return;
      applyLanguage();
    });
  }

  async function init() {
    turnstileSiteKey = readTurnstileSiteKey();
    applyLanguage();
    bindEvents();
    bindLanguageSync();
    ensureTurnstileWidgetReady();
    setSendCodeEnabled(true);
    setSubmitEnabled(true);
  }

  global.RegisterPage = {
    refreshCaptcha: function () {
      return false;
    }
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

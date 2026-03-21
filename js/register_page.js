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

  var apiBases = buildApiBaseCandidates();
  var currentLang = readLanguage();
  var captchaId = "";
  var captchaLoading = false;
  var captchaEndpoint = "";

  var COPY = {
    zh: {
      pageTitle: "2048 注册",
      kicker: "2048 Online Hub",
      title: "注册账号",
      subtitle: "注册前需要先完成图片验证码校验。",
      heading: "注册",
      navLogin: "返回登录",
      navHome: "回首页",
      emailLabel: "邮箱",
      emailPlaceholder: "请输入邮箱",
      passwordLabel: "密码",
      passwordPlaceholder: "请输入密码",
      nicknameLabel: "昵称",
      nicknamePlaceholder: "请输入昵称（2-20字符）",
      captchaLabel: "图片验证码",
      captchaPlaceholder: "请输入图片验证码",
      captchaRefresh: "换一张",
      submitBtn: "注册",
      backLoginBtn: "返回登录",
      loadingCaptcha: "正在加载图片验证码...",
      requireFields: "请填写邮箱、密码、昵称和验证码",
      invalidEmail: "请输入正确的邮箱格式",
      invalidPassword: "密码需为8-16位，且至少包含字母/数字/符号中的两种",
      invalidNickname: "昵称需为2-20位，仅支持中文、字母、数字、空格、下划线和短横线",
      nicknameTaken: "昵称已被占用，请更换",
      registerOk: "注册成功，正在返回登录页...",
      registerFail: "注册失败",
      captchaUnavailable: "服务器暂未启用注册验证码接口，请联系管理员",
      networkError: "网络异常"
    },
    en: {
      pageTitle: "2048 Register",
      kicker: "2048 Online Hub",
      title: "Create Account",
      subtitle: "Complete image captcha before account creation.",
      heading: "Register",
      navLogin: "Back to Login",
      navHome: "Home",
      emailLabel: "Email",
      emailPlaceholder: "Enter email",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter password",
      nicknameLabel: "Nickname",
      nicknamePlaceholder: "Enter nickname (2-20 chars)",
      captchaLabel: "Image Captcha",
      captchaPlaceholder: "Enter captcha",
      captchaRefresh: "Refresh",
      submitBtn: "Register",
      backLoginBtn: "Back to Login",
      loadingCaptcha: "Loading captcha...",
      requireFields: "Email, password, nickname and captcha are required",
      invalidEmail: "Please enter a valid email address",
      invalidPassword: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
      invalidNickname: "Nickname must be 2-20 chars and use letters/numbers/spaces/_/-/Chinese only",
      nicknameTaken: "Nickname already exists",
      registerOk: "Registered. Redirecting to login...",
      registerFail: "Register failed",
      captchaUnavailable: "Register captcha endpoint is unavailable on server",
      networkError: "Network error"
    }
  };

  var ERROR_CODE_COPY = {
    zh: {
      INVALID_EMAIL: "邮箱格式不正确",
      WEAK_PASSWORD: "密码需为8-16位，且至少包含字母/数字/符号中的两种",
      EMPTY: "昵称不能为空",
      LENGTH: "昵称长度需在 2-20 个字符",
      CHARS: "昵称仅支持中文、字母、数字、空格、下划线和短横线",
      INVALID: "昵称不可用，请更换",
      RESERVED: "昵称不可用，请更换",
      SENSITIVE: "昵称不可用，请更换",
      NICKNAME_EXISTS: "昵称已被占用，请更换",
      DUPLICATE_NICKNAME: "昵称已被占用，请更换",
      NICKNAME_TAKEN: "昵称已被占用，请更换",
      EMAIL_EXISTS: "邮箱已注册，请直接登录",
      IMAGE_CAPTCHA_REQUIRED: "请先完成图片验证码",
      IMAGE_CAPTCHA_INVALID: "图片验证码错误，请重试",
      IMAGE_CAPTCHA_EXPIRED: "图片验证码已过期，请刷新后重试",
      IMAGE_CAPTCHA_ATTEMPTS_EXCEEDED: "图片验证码尝试次数过多，请刷新后重试"
    },
    en: {
      INVALID_EMAIL: "Invalid email format",
      WEAK_PASSWORD: "Password must be 8-16 chars and include at least two of letters/numbers/symbols",
      EMPTY: "Nickname cannot be empty",
      LENGTH: "Nickname length must be 2-20 characters",
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
    if (nickname.length < 2 || nickname.length > 20) return false;
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

  function shouldRefreshCaptcha(result) {
    var code = toText(result && result.code).trim().toUpperCase();
    return (
      code === "IMAGE_CAPTCHA_INVALID" ||
      code === "IMAGE_CAPTCHA_EXPIRED" ||
      code === "IMAGE_CAPTCHA_ATTEMPTS_EXCEEDED"
    );
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

  async function loadCaptcha(showLoadingTip) {
    if (captchaLoading) return false;
    captchaLoading = true;

    var refreshBtn = byId("register-captcha-refresh");
    if (refreshBtn) refreshBtn.disabled = true;
    if (showLoadingTip) setTip(t("loadingCaptcha"), "");

    try {
      var endpoints = ["/register/captcha", "/login/captcha"];
      for (var i = 0; i < endpoints.length; i += 1) {
        var endpoint = endpoints[i];
        var result = await apiRequest(endpoint, { method: "GET" });
        var nextId = toText(result && result.captcha_id).trim();
        var imageDataUrl = toText(result && result.captcha_image_data_url).trim();
        if (!result || !result.success || !nextId || !imageDataUrl) continue;

        captchaId = nextId;
        captchaEndpoint = endpoint;

        var imageNode = byId("register-captcha-image");
        if (imageNode) imageNode.setAttribute("src", imageDataUrl);
        var answerNode = byId("register-captcha-answer");
        if (answerNode) answerNode.value = "";
        setSubmitEnabled(true);
        return true;
      }

      setSubmitEnabled(false);
      setTip(t("captchaUnavailable"), "err");
      return false;
    } finally {
      captchaLoading = false;
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  async function onSubmitRegister() {
    var email = toText(byId("register-email") && byId("register-email").value).trim();
    var password = toText(byId("register-password") && byId("register-password").value).trim();
    var nickname = toText(byId("register-nickname") && byId("register-nickname").value).trim();
    var captchaAnswer = toText(byId("register-captcha-answer") && byId("register-captcha-answer").value).trim().toUpperCase();

    if (!email || !password || !nickname || !captchaAnswer || !captchaId) {
      setTip(t("requireFields"), "err");
      return;
    }
    if (!isValidEmailFormat(email)) {
      setTip(t("invalidEmail"), "err");
      return;
    }
    if (!isValidRegisterPassword(password)) {
      setTip(t("invalidPassword"), "err");
      return;
    }
    if (!isValidNickname(nickname)) {
      setTip(t("invalidNickname"), "err");
      return;
    }

    setSubmitEnabled(false);
    try {
      var available = await checkNicknameAvailable(nickname);
      if (available === false) {
        setTip(t("nicknameTaken"), "err");
        return;
      }

      var result = await apiRequest("/register", {
        method: "POST",
        body: {
          email: email,
          password: password,
          nickname: nickname,
          captcha_id: captchaId,
          captcha_answer: captchaAnswer
        }
      });

      if (result && result.success) {
        setTip(t("registerOk"), "ok");
        global.setTimeout(function () {
          global.location.href = "account.html?registered=1";
        }, 900);
        return;
      }

      setTip(resolveServerError(result, "registerFail"), "err");
      if (shouldRefreshCaptcha(result)) {
        await loadCaptcha(false);
      }
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
      "register-captcha-label": t("captchaLabel"),
      "register-captcha-refresh": t("captchaRefresh"),
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
    var captchaInput = byId("register-captcha-answer");
    var captchaImage = byId("register-captcha-image");
    if (emailInput) emailInput.setAttribute("placeholder", t("emailPlaceholder"));
    if (passwordInput) passwordInput.setAttribute("placeholder", t("passwordPlaceholder"));
    if (nicknameInput) nicknameInput.setAttribute("placeholder", t("nicknamePlaceholder"));
    if (captchaInput) captchaInput.setAttribute("placeholder", t("captchaPlaceholder"));
    if (captchaImage) captchaImage.setAttribute("alt", t("captchaLabel"));

    setI18nReady(true);
  }

  function bindEvents() {
    var submitBtn = byId("register-submit-btn");
    var refreshBtn = byId("register-captcha-refresh");
    var captchaInput = byId("register-captcha-answer");

    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        onSubmitRegister();
      });
    }
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        loadCaptcha(true);
      });
    }
    if (captchaInput) {
      captchaInput.addEventListener("keydown", function (eventLike) {
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
    applyLanguage();
    bindEvents();
    bindLanguageSync();
    setSubmitEnabled(false);
    await loadCaptcha(false);
  }

  global.RegisterPage = {
    refreshCaptcha: loadCaptcha
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);


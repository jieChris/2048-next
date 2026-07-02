import { writeStorageValue } from "../storage/browser-storage";
import {
  AUTH_TOKEN_KEY,
  buildApiBaseCandidates,
  createJsonApiClient,
  type JsonRecord
} from "../services/api-client";
import { fetchBetaAccessStatus } from "../bootstrap/access-gate";

const AUTH_USER_ID_KEY = "2048_auth_userId_v1";
const AUTH_NICKNAME_KEY = "2048_auth_nickname_v1";
const UI_LANGUAGE_KEY = "ui_language_v1";

type TipState = "ok" | "err" | "busy" | "idle";
type PageLang = "zh" | "en";

const COPY: Record<PageLang, Record<string, string>> = {
  zh: {
    title: "2048 NEXT 内测访问",
    heading: "内测访问登录",
    copy: "本项目当前为局部内测。请使用受邀邮箱对应账号登录，或先完成受邀邮箱注册。",
    contact: "内测交流群：1103144436",
    tabAria: "内测访问方式",
    loginTab: "登录",
    registerTab: "注册",
    email: "邮箱",
    password: "密码",
    nickname: "昵称",
    emailCode: "邮箱验证码",
    loginPasswordPlaceholder: "请输入密码",
    registerEmailPlaceholder: "受邀邮箱",
    nicknamePlaceholder: "2-10 个字符",
    registerPasswordPlaceholder: "至少 10 位",
    codePlaceholder: "6 位验证码",
    sendCode: "发送验证码",
    loginSubmit: "登录并继续",
    registerSubmit: "完成注册",
    authCheckFailed: "登录状态校验失败，请重新登录。",
    loginRequired: "请填写邮箱和密码。",
    loggingIn: "正在登录...",
    loginFailed: "登录失败：",
    loginFallback: "邮箱或密码不正确",
    loginOk: "登录成功，正在检查内测权限...",
    registerStartRequired: "请先填写邮箱、昵称和密码。",
    sendingCode: "正在发送验证码...",
    sendCodeFailed: "验证码发送失败：",
    retryLater: "请稍后重试",
    codeGenerated: "验证码已生成：",
    codeSent: "验证码已发送，请检查邮箱。",
    verifyRequired: "请填写邮箱和 6 位验证码。",
    registering: "正在完成注册...",
    registerFailed: "注册失败：",
    registerFallback: "验证码无效或已过期",
    registerOk: "注册成功，正在检查内测权限..."
  },
  en: {
    title: "2048 NEXT Closed Beta Access",
    heading: "Closed Beta Sign In",
    copy: "This project is currently in limited beta. Sign in with an invited email account, or register with an invited email first.",
    contact: "Beta group: 1103144436",
    tabAria: "Beta access method",
    loginTab: "Sign In",
    registerTab: "Register",
    email: "Email",
    password: "Password",
    nickname: "Nickname",
    emailCode: "Email Verification Code",
    loginPasswordPlaceholder: "Enter password",
    registerEmailPlaceholder: "Invited email",
    nicknamePlaceholder: "2-10 characters",
    registerPasswordPlaceholder: "At least 10 characters",
    codePlaceholder: "6-digit code",
    sendCode: "Send Code",
    loginSubmit: "Sign In And Continue",
    registerSubmit: "Complete Registration",
    authCheckFailed: "Could not verify your sign-in session. Please sign in again.",
    loginRequired: "Please enter email and password.",
    loggingIn: "Signing in...",
    loginFailed: "Sign-in failed: ",
    loginFallback: "Incorrect email or password",
    loginOk: "Signed in. Checking beta access...",
    registerStartRequired: "Please enter email, nickname, and password first.",
    sendingCode: "Sending verification code...",
    sendCodeFailed: "Could not send verification code: ",
    retryLater: "Please try again later",
    codeGenerated: "Verification code generated: ",
    codeSent: "Verification code sent. Please check your inbox.",
    verifyRequired: "Please enter email and a 6-digit verification code.",
    registering: "Completing registration...",
    registerFailed: "Registration failed: ",
    registerFallback: "Verification code is invalid or expired",
    registerOk: "Registered. Checking beta access..."
  }
};

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function currentLang(): PageLang {
  try {
    const raw = toText(window.localStorage.getItem(UI_LANGUAGE_KEY)).trim().toLowerCase();
    if (raw.startsWith("en")) return "en";
  } catch (_err) {}
  return "zh";
}

function t(key: string): string {
  const lang = currentLang();
  return COPY[lang][key] || COPY.zh[key] || key;
}

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) node.textContent = value;
}

function setAttr(selector: string, attr: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) node.setAttribute(attr, value);
}

function applyStaticCopy(): void {
  const lang = currentLang();
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  document.title = t("title");
  setText("#beta-login-title", t("heading"));
  setText(".beta-copy", t("copy"));
  setText(".beta-contact-copy", t("contact"));
  setAttr(".beta-tabs", "aria-label", t("tabAria"));
  setText("#beta-login-tab-login", t("loginTab"));
  setText("#beta-login-tab-register", t("registerTab"));
  const loginLabels = document.querySelectorAll<HTMLElement>("#beta-login-form label");
  if (loginLabels[0]) loginLabels[0].childNodes[0].textContent = t("email") + " ";
  if (loginLabels[1]) loginLabels[1].childNodes[0].textContent = t("password") + " ";
  const registerLabels = document.querySelectorAll<HTMLElement>("#beta-register-form label");
  if (registerLabels[0]) registerLabels[0].childNodes[0].textContent = t("email") + " ";
  if (registerLabels[1]) registerLabels[1].childNodes[0].textContent = t("nickname") + " ";
  if (registerLabels[2]) registerLabels[2].childNodes[0].textContent = t("password") + " ";
  if (registerLabels[3]) registerLabels[3].childNodes[0].textContent = t("emailCode") + " ";
  byId<HTMLInputElement>("beta-login-password")?.setAttribute("placeholder", t("loginPasswordPlaceholder"));
  byId<HTMLInputElement>("beta-register-email")?.setAttribute("placeholder", t("registerEmailPlaceholder"));
  byId<HTMLInputElement>("beta-register-nickname")?.setAttribute("placeholder", t("nicknamePlaceholder"));
  byId<HTMLInputElement>("beta-register-password")?.setAttribute("placeholder", t("registerPasswordPlaceholder"));
  byId<HTMLInputElement>("beta-register-code")?.setAttribute("placeholder", t("codePlaceholder"));
  setText("#beta-login-submit", t("loginSubmit"));
  setText("#beta-register-send", t("sendCode"));
  setText("#beta-register-submit", t("registerSubmit"));
}

function currentNext(): string {
  const params = new URLSearchParams(window.location.search);
  const next = toText(params.get("next")).trim();
  return next && !/^https?:\/\//iu.test(next) ? next : "2048.html";
}

function setTip(message: string, state: TipState = "idle"): void {
  const tip = byId("beta-login-tip");
  if (!tip) return;
  tip.textContent = message;
  if (state === "idle") tip.removeAttribute("data-state");
  else tip.setAttribute("data-state", state);
}

function setBusy(id: string, busy: boolean): void {
  const button = byId<HTMLButtonElement>(id);
  if (!button) return;
  button.disabled = busy;
  button.toggleAttribute("aria-busy", busy);
}

function getInput(id: string): string {
  return toText(byId<HTMLInputElement>(id)?.value).trim();
}

function api() {
  return createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: window.location })
  });
}

function persistAuth(payload: JsonRecord): void {
  const user = toRecord(payload.user);
  const data = toRecord(payload.data);
  const token = toText(payload.token || data.token).trim();
  const userId = toText(payload.userId || payload.user_id || user.id || data.userId || data.user_id).trim();
  const nickname = toText(payload.nickname || user.nickname || data.nickname || user.email || data.email).trim();
  writeStorageValue(window.localStorage, AUTH_TOKEN_KEY, token);
  if (userId) writeStorageValue(window.localStorage, AUTH_USER_ID_KEY, userId);
  if (nickname) writeStorageValue(window.localStorage, AUTH_NICKNAME_KEY, nickname);
}

function authError(payload: JsonRecord, fallback: string): string {
  return toText(payload.error || payload.message || payload.code).trim() || fallback;
}

async function routeAfterAuth(): Promise<void> {
  const access = await fetchBetaAccessStatus();
  const status = access.status;
  const next = currentNext();
  if (access.unauthorized || !status) {
    setTip(t("authCheckFailed"), "err");
    return;
  }
  if (!status.superAdmin && !status.allowlisted) {
    window.location.replace("beta-access.html?state=blocked&next=" + encodeURIComponent(next));
    return;
  }
  if (!status.noticeAccepted || !status.canAccessProduct) {
    window.location.replace("beta-access.html?state=notice&next=" + encodeURIComponent(next));
    return;
  }
  window.location.replace(next);
}

async function submitLogin(): Promise<void> {
  const email = getInput("beta-login-email").toLowerCase();
  const password = getInput("beta-login-password");
  if (!email || !password) {
    setTip(t("loginRequired"), "err");
    return;
  }
  setBusy("beta-login-submit", true);
  setTip(t("loggingIn"), "busy");
  try {
    const payload = await api().request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (payload.success === false || !toText(payload.token).trim()) {
      setTip(t("loginFailed") + authError(payload, t("loginFallback")), "err");
      return;
    }
    persistAuth(payload);
    setTip(t("loginOk"), "busy");
    await routeAfterAuth();
  } finally {
    setBusy("beta-login-submit", false);
  }
}

async function sendRegisterCode(): Promise<void> {
  const email = getInput("beta-register-email").toLowerCase();
  const nickname = getInput("beta-register-nickname");
  const password = getInput("beta-register-password");
  if (!email || !nickname || !password) {
    setTip(t("registerStartRequired"), "err");
    return;
  }
  setBusy("beta-register-send", true);
  setTip(t("sendingCode"), "busy");
  try {
    const payload = await api().request("/register/start", {
      method: "POST",
      body: JSON.stringify({ email, nickname, password })
    });
    if (payload.success === false) {
      setTip(t("sendCodeFailed") + authError(payload, t("retryLater")), "err");
      return;
    }
    const devCode = toText(payload.devCode).trim();
    setTip(devCode ? t("codeGenerated") + devCode : t("codeSent"), "ok");
  } finally {
    setBusy("beta-register-send", false);
  }
}

async function submitRegister(): Promise<void> {
  const email = getInput("beta-register-email").toLowerCase();
  const code = getInput("beta-register-code");
  if (!email || !/^\d{6}$/u.test(code)) {
    setTip(t("verifyRequired"), "err");
    return;
  }
  setBusy("beta-register-submit", true);
  setTip(t("registering"), "busy");
  try {
    const payload = await api().request("/register/verify", {
      method: "POST",
      body: JSON.stringify({ email, code })
    });
    if (payload.success === false || !toText(payload.token).trim()) {
      setTip(t("registerFailed") + authError(payload, t("registerFallback")), "err");
      return;
    }
    persistAuth(payload);
    setTip(t("registerOk"), "busy");
    await routeAfterAuth();
  } finally {
    setBusy("beta-register-submit", false);
  }
}

function switchTab(tab: "login" | "register"): void {
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-beta-tab]"))) {
    const active = button.dataset.betaTab === tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  }
  byId<HTMLElement>("beta-login-form")!.hidden = tab !== "login";
  byId<HTMLElement>("beta-register-form")!.hidden = tab !== "register";
  setTip("");
}

function bind(): void {
  byId("beta-login-submit")?.addEventListener("click", () => void submitLogin());
  byId("beta-register-send")?.addEventListener("click", () => void sendRegisterCode());
  byId("beta-register-submit")?.addEventListener("click", () => void submitRegister());
  document.querySelectorAll<HTMLButtonElement>("[data-beta-tab]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.betaTab === "register" ? "register" : "login"));
  });
  document.querySelectorAll<HTMLInputElement>(".beta-input").forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const form = input.closest("[data-beta-form]");
      if (form?.getAttribute("data-beta-form") === "register") void submitRegister();
      else void submitLogin();
    });
  });
}

bind();
applyStaticCopy();
window.addEventListener("storage", (event) => {
  if (event.key === UI_LANGUAGE_KEY) applyStaticCopy();
});

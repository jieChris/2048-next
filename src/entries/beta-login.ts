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

type TipState = "ok" | "err" | "busy" | "idle";

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
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
    setTip("登录状态校验失败，请重新登录。", "err");
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
    setTip("请填写邮箱和密码。", "err");
    return;
  }
  setBusy("beta-login-submit", true);
  setTip("正在登录...", "busy");
  try {
    const payload = await api().request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (payload.success === false || !toText(payload.token).trim()) {
      setTip("登录失败：" + authError(payload, "邮箱或密码不正确"), "err");
      return;
    }
    persistAuth(payload);
    setTip("登录成功，正在检查内测权限...", "busy");
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
    setTip("请先填写邮箱、昵称和密码。", "err");
    return;
  }
  setBusy("beta-register-send", true);
  setTip("正在发送验证码...", "busy");
  try {
    const payload = await api().request("/register/start", {
      method: "POST",
      body: JSON.stringify({ email, nickname, password })
    });
    if (payload.success === false) {
      setTip("验证码发送失败：" + authError(payload, "请稍后重试"), "err");
      return;
    }
    const devCode = toText(payload.devCode).trim();
    setTip(devCode ? "验证码已生成：" + devCode : "验证码已发送，请检查邮箱。", "ok");
  } finally {
    setBusy("beta-register-send", false);
  }
}

async function submitRegister(): Promise<void> {
  const email = getInput("beta-register-email").toLowerCase();
  const code = getInput("beta-register-code");
  if (!email || !/^\d{6}$/u.test(code)) {
    setTip("请填写邮箱和 6 位验证码。", "err");
    return;
  }
  setBusy("beta-register-submit", true);
  setTip("正在完成注册...", "busy");
  try {
    const payload = await api().request("/register/verify", {
      method: "POST",
      body: JSON.stringify({ email, code })
    });
    if (payload.success === false || !toText(payload.token).trim()) {
      setTip("注册失败：" + authError(payload, "验证码无效或已过期"), "err");
      return;
    }
    persistAuth(payload);
    setTip("注册成功，正在检查内测权限...", "busy");
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

import { removeStorageValue } from "../storage/browser-storage";
import { AUTH_TOKEN_KEY, type JsonRecord } from "../services/api-client";
import {
  ACTIVE_BETA_NOTICE_VERSION,
  acceptBetaNotice,
  fetchBetaAccessStatus,
  type BetaAccessStatus
} from "../bootstrap/access-gate";

const AUTH_USER_ID_KEY = "2048_auth_userId_v1";
const AUTH_NICKNAME_KEY = "2048_auth_nickname_v1";

type TipState = "ok" | "err" | "busy" | "idle";

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function currentNext(): string {
  const params = new URLSearchParams(window.location.search);
  const next = toText(params.get("next")).trim();
  return next && !/^https?:\/\//iu.test(next) ? next : "2048.html";
}

function setTip(message: string, state: TipState = "idle"): void {
  const tip = byId("beta-access-tip");
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

function showSection(section: "blocked" | "notice"): void {
  const blocked = byId<HTMLElement>("beta-blocked-section");
  const notice = byId<HTMLElement>("beta-notice-section");
  if (blocked) blocked.hidden = section !== "blocked";
  if (notice) notice.hidden = section !== "notice";
}

function setSummary(status: BetaAccessStatus | null, text: string): void {
  const summary = byId("beta-access-summary");
  if (!summary) return;
  summary.textContent = status?.email ? status.email + " · " + text : text;
}

function clearAuth(): void {
  removeStorageValue(window.localStorage, AUTH_TOKEN_KEY);
  removeStorageValue(window.localStorage, AUTH_USER_ID_KEY);
  removeStorageValue(window.localStorage, AUTH_NICKNAME_KEY);
}

function redirectToLogin(): void {
  clearAuth();
  window.location.replace("beta-login.html?state=login&next=" + encodeURIComponent(currentNext()));
}

function errorText(payload: JsonRecord | null | undefined, fallback: string): string {
  return toText(payload?.error || payload?.message || payload?.code).trim() || fallback;
}

async function loadState(): Promise<void> {
  setTip("正在检查内测状态...", "busy");
  const access = await fetchBetaAccessStatus();
  if (access.unauthorized) {
    redirectToLogin();
    return;
  }

  const status = access.status;
  if (!status) {
    setSummary(null, "无法读取当前账号的内测状态。");
    setTip(errorText(access.payload, "状态检查失败"), "err");
    showSection("blocked");
    return;
  }
  if (!status.superAdmin && !status.allowlisted) {
    setSummary(status, "暂未获得内测资格");
    setTip("请联系管理员将该邮箱加入内测名单。", "err");
    showSection("blocked");
    return;
  }
  if (status.noticeAccepted && status.canAccessProduct) {
    window.location.replace(currentNext());
    return;
  }
  setSummary(status, "请先阅读并同意内测须知");
  setTip("");
  showSection("notice");
}

async function acceptNotice(): Promise<void> {
  const checkbox = byId<HTMLInputElement>("beta-notice-check");
  if (!checkbox?.checked) {
    setTip("请先勾选同意内测须知。", "err");
    return;
  }
  setBusy("beta-notice-accept", true);
  setTip("正在记录同意状态...", "busy");
  try {
    const result = await acceptBetaNotice({ noticeVersion: ACTIVE_BETA_NOTICE_VERSION });
    if (result.payload.success === false || !result.status?.canAccessProduct) {
      setTip("提交失败：" + errorText(result.payload, "请稍后重试"), "err");
      return;
    }
    setTip("已同意内测须知，正在进入项目...", "ok");
    window.location.replace(currentNext());
  } finally {
    setBusy("beta-notice-accept", false);
  }
}

function bind(): void {
  const checkbox = byId<HTMLInputElement>("beta-notice-check");
  const acceptButton = byId<HTMLButtonElement>("beta-notice-accept");
  checkbox?.addEventListener("change", () => {
    if (acceptButton) acceptButton.disabled = !checkbox.checked;
  });
  byId("beta-notice-accept")?.addEventListener("click", () => void acceptNotice());
  byId("beta-notice-logout")?.addEventListener("click", redirectToLogin);
  byId("beta-switch-account")?.addEventListener("click", redirectToLogin);
}

bind();
void loadState();

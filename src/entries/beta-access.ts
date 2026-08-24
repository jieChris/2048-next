import { createBrowserStorageAccess, readStorageValue } from "../storage/browser-storage";
import { requestLogout, type JsonRecord } from "../services/api-client";
import { clearAuthSession } from "../services/auth-session";
import {
  ACTIVE_BETA_NOTICE_VERSION,
  acceptBetaNotice,
  fetchBetaAccessStatus,
  shouldBypassBetaGateForLocalDevelopment,
  type BetaAccessStatus
} from "../bootstrap/access-gate";

const UI_LANGUAGE_KEY = "ui_language_v1";

type TipState = "ok" | "err" | "busy" | "idle";
type PageLang = "zh" | "en";

const NOTICE_HTML: Record<PageLang, string> = {
  zh: `
          <p>欢迎体验本网站内测版本。在继续访问或使用本服务之前，请您务必阅读并同意以下内容。</p>
          <h3>1. 内测版本说明</h3>
          <p>本网站当前处于内部测试（Beta）阶段，并非最终正式版本。所有功能、数值、规则及界面均可能在不通知的情况下进行调整、重构或删除。</p>
          <h3>2. 数据与进度风险</h3>
          <p>在内测期间，您的游戏数据、成绩、排名、进度等可能随时被重置或清除；内测数据不会继承到正式版本；因版本更新、Bug 修复、服务器维护等原因，数据丢失可能不可恢复。</p>
          <h3>3. 稳定性与 Bug 说明</h3>
          <p>内测版本可能存在功能异常或错误、页面卡顿、闪退或加载失败、数据不同步或显示异常、游戏逻辑错误导致结果不准确，极端情况下可能导致进度丢失或回档。</p>
          <h3>4. 使用风险自担</h3>
          <p>继续使用本内测版本，即表示您理解并接受可能存在的程序缺陷与数据风险，因使用内测版本导致的任何数据损失或体验问题，以及版本变更带来的功能调整或中断。</p>
          <h3>5. 正式版本说明</h3>
          <p>未来正式版本发布后，将尽可能提供更稳定的体验，但当前内测内容不代表最终品质或最终规则。</p>
          <h3>6. 反馈与支持</h3>
          <p>如果您在使用过程中遇到问题或有建议，欢迎通过内测反馈群 / 社区、GitHub Issue（如适用）或网站内反馈入口反馈。</p>
          <h3>7. 同意与继续访问</h3>
          <p>若您选择继续访问或使用本网站，即表示您已阅读并理解本内测须知，同意承担内测期间可能存在的风险，并同意参与本次内测体验。如您不同意以上内容，请立即关闭页面。</p>
  `,
  en: `
          <p>Welcome to the closed beta version of this site. Before continuing to access or use this service, please read and agree to the following terms.</p>
          <h3>1. Beta Version Notice</h3>
          <p>This site is currently in an internal beta stage and is not the final release. Features, values, rules, and interface details may be adjusted, rebuilt, or removed without notice.</p>
          <h3>2. Data And Progress Risk</h3>
          <p>During the beta period, game data, scores, rankings, progress, and related records may be reset or cleared at any time. Beta data will not carry over to the final release. Data loss caused by updates, bug fixes, or maintenance may be unrecoverable.</p>
          <h3>3. Stability And Bug Notice</h3>
          <p>The beta version may include feature errors, slow pages, crashes, loading failures, data sync or display issues, game logic errors, inaccurate results, and in extreme cases progress loss or rollback.</p>
          <h3>4. Use At Your Own Risk</h3>
          <p>By continuing to use this beta, you understand and accept the possible defects, data risks, losses, experience issues, feature changes, and interruptions that may occur during beta testing.</p>
          <h3>5. Final Release Notice</h3>
          <p>The future final release will aim to provide a more stable experience, but current beta content does not represent final quality or final rules.</p>
          <h3>6. Feedback And Support</h3>
          <p>If you encounter issues or have suggestions, please provide feedback through the beta feedback group or community, GitHub Issues when applicable, or the in-site feedback entry.</p>
          <h3>7. Agreement And Continued Access</h3>
          <p>If you continue to access or use this site, you confirm that you have read and understood this beta notice, accept the risks during beta testing, and agree to participate in this beta. If you do not agree, please close this page immediately.</p>
  `
};

const COPY: Record<PageLang, Record<string, string>> = {
  zh: {
    title: "2048 NEXT 内测准入",
    heading: "内测准入",
    summaryChecking: "正在检查当前账号的内测状态。",
    blockedHeading: "当前账号暂未获得内测资格",
    blockedCopy: "请联系管理员将你的邮箱加入内测名单后再访问。",
    switchAccount: "切换账号",
    noticeHeading: "内测须知与用户协议（Beta Notice）",
    agreement: "我已阅读并同意内测须知，理解内测期间可能存在的数据与稳定性风险。",
    logout: "不同意，退出登录",
    accept: "同意并继续",
    checking: "正在检查内测状态...",
    readFailed: "无法读取当前账号的内测状态。",
    stateFail: "状态检查失败",
    blockedSummary: "暂未获得内测资格",
    blockedTip: "请联系管理员将该邮箱加入内测名单。",
    noticeSummary: "请先阅读并同意内测须知",
    mustAgree: "请先勾选同意内测须知。",
    accepting: "正在记录同意状态...",
    submitFailed: "提交失败：",
    retryLater: "请稍后重试",
    accepted: "已同意内测须知，正在进入项目..."
  },
  en: {
    title: "2048 NEXT Beta Access",
    heading: "Beta Access",
    summaryChecking: "Checking beta access for the current account.",
    blockedHeading: "This account is not invited yet",
    blockedCopy: "Please ask an administrator to add your email to the beta allowlist before accessing the project.",
    switchAccount: "Switch Account",
    noticeHeading: "Beta Notice And User Agreement",
    agreement: "I have read and agree to the beta notice, and I understand the data and stability risks during beta testing.",
    logout: "Disagree And Sign Out",
    accept: "Agree And Continue",
    checking: "Checking beta access...",
    readFailed: "Could not read beta access status for the current account.",
    stateFail: "Status check failed",
    blockedSummary: "Not invited yet",
    blockedTip: "Please ask an administrator to add this email to the beta allowlist.",
    noticeSummary: "Please read and agree to the beta notice first",
    mustAgree: "Please check the agreement box first.",
    accepting: "Saving agreement status...",
    submitFailed: "Submission failed: ",
    retryLater: "Please try again later",
    accepted: "Beta notice accepted. Entering project..."
  }
};

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function currentLang(): PageLang {
  try {
    const raw = toText(readStorageValue(createBrowserStorageAccess().local(), UI_LANGUAGE_KEY)).trim().toLowerCase();
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

function applyStaticCopy(): void {
  const lang = currentLang();
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  document.title = t("title");
  setText("#beta-access-title", t("heading"));
  setText("#beta-access-summary", t("summaryChecking"));
  setText("#beta-blocked-section h2", t("blockedHeading"));
  setText("#beta-blocked-copy", t("blockedCopy"));
  setText("#beta-switch-account", t("switchAccount"));
  setText("#beta-notice-section h2", t("noticeHeading"));
  const noticeCopy = document.querySelector<HTMLElement>(".beta-notice-copy");
  if (noticeCopy) noticeCopy.innerHTML = NOTICE_HTML[lang];
  setText(".beta-agreement span", t("agreement"));
  setText("#beta-notice-logout", t("logout"));
  setText("#beta-notice-accept", t("accept"));
}

function currentNext(): string {
  const params = new URLSearchParams(window.location.search);
  const next = toText(params.get("next")).trim();
  return next && !/^https?:\/\//iu.test(next) ? next : "/";
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
  clearAuthSession({ storageLike: window.localStorage });
}

function redirectToLogin(): void {
  clearAuth();
  window.location.replace("beta-login.html?state=login&next=" + encodeURIComponent(currentNext()));
}

async function logoutAndRedirectToLogin(): Promise<void> {
  await requestLogout({ locationLike: window.location }).catch(() => undefined);
  redirectToLogin();
}

function errorText(payload: JsonRecord | null | undefined, fallback: string): string {
  return toText(payload?.error || payload?.message || payload?.code).trim() || fallback;
}

async function loadState(): Promise<void> {
  setTip(t("checking"), "busy");
  const access = await fetchBetaAccessStatus();
  if (access.unauthorized) {
    redirectToLogin();
    return;
  }

  const status = access.status;
  if (!status) {
    setSummary(null, t("readFailed"));
    setTip(errorText(access.payload, t("stateFail")), "err");
    showSection("blocked");
    return;
  }
  if (!status.superAdmin && !status.allowlisted) {
    setSummary(status, t("blockedSummary"));
    setTip(t("blockedTip"), "err");
    showSection("blocked");
    return;
  }
  if (status.noticeAccepted && status.canAccessProduct) {
    window.location.replace(currentNext());
    return;
  }
  setSummary(status, t("noticeSummary"));
  setTip("");
  showSection("notice");
}

async function acceptNotice(): Promise<void> {
  const checkbox = byId<HTMLInputElement>("beta-notice-check");
  if (!checkbox?.checked) {
    setTip(t("mustAgree"), "err");
    return;
  }
  setBusy("beta-notice-accept", true);
  setTip(t("accepting"), "busy");
  try {
    const result = await acceptBetaNotice({ noticeVersion: ACTIVE_BETA_NOTICE_VERSION });
    if (result.payload.success === false || !result.status?.canAccessProduct) {
      setTip(t("submitFailed") + errorText(result.payload, t("retryLater")), "err");
      return;
    }
    setTip(t("accepted"), "ok");
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
  byId("beta-notice-logout")?.addEventListener("click", () => void logoutAndRedirectToLogin());
  byId("beta-switch-account")?.addEventListener("click", () => void logoutAndRedirectToLogin());
}

if (shouldBypassBetaGateForLocalDevelopment(window, window.localStorage)) {
  window.location.replace(currentNext());
} else {
  bind();
  applyStaticCopy();
  window.addEventListener("storage", (event) => {
    if (event.key === UI_LANGUAGE_KEY) applyStaticCopy();
  });
  void loadState();
}

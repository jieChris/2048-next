import {
  buildApiBaseCandidates,
  createJsonApiClient,
  type JsonApiResult,
} from "../services/api-client";
import {
  createBrowserStorageAccess,
  readStorageValue,
  writeStorageValue,
} from "../storage/browser-storage";

type Locale = "zh-CN" | "en";

interface DeletionReceipt {
  maskedEmail: string;
  requestedAt: string;
  dueAt: string;
}

const COPY = {
  "zh-CN": {
    kicker: "2048 NEXT · 账号管理",
    title: "申请删除账号",
    subtitle: "无需安装 App。提交后进入 72 小时冷静期，期间使用邮箱和密码登录会取消删除。",
    home: "返回首页",
    formTitle: "验证账号并提交",
    warningTitle: "提交后会立即发生",
    warningOne: "现有登录凭据失效，账号退出。",
    warningTwo: "账号资料、记录、回放、排行榜和成就从公开页面隐藏。",
    warningThree: "72 小时内重新使用邮箱和密码登录，可取消删除并恢复数据。",
    warningFour: "超过期限仍未登录，账号和游戏数据将被彻底删除且无法恢复。",
    emailLabel: "邮箱",
    emailPlaceholder: "请输入账号邮箱",
    passwordLabel: "密码",
    passwordPlaceholder: "请输入当前密码",
    confirmLabel: "我已了解 72 小时冷静期和到期后不可恢复的后果。",
    submit: "申请删除账号",
    submitting: "正在提交删除申请……",
    receiptKicker: "删除申请已受理",
    receiptTitle: "账号已进入冷静期",
    receiptEmail: "账号",
    receiptDue: "删除截止时间",
    receiptBody: "截止时间前使用邮箱和密码登录会自动取消删除；到期后数据将不可恢复。",
    login: "前往登录",
    privacy: "隐私政策",
    terms: "用户协议",
    invalid: "请填写有效邮箱、密码并确认已了解删除规则。",
    unauthorized: "邮箱或密码不正确，删除申请未提交。",
    gone: "该账号已超过删除截止时间或已完成删除。",
    limited: "请求过于频繁，请稍后再试。",
    network: "暂时无法连接服务器，请检查网络后重试。",
    failed: "暂时无法提交删除申请，请稍后重试。",
    success: "删除申请已提交，现有登录凭据已失效。",
  },
  en: {
    kicker: "2048 NEXT · ACCOUNT",
    title: "Request account deletion",
    subtitle: "No App installation is required. Submission starts a 72-hour cooling-off period; signing in with your email and password cancels deletion.",
    home: "Back to game",
    formTitle: "Verify the account and submit",
    warningTitle: "Immediately after submission",
    warningOne: "Existing sign-in credentials are revoked and the account is signed out.",
    warningTwo: "The profile, records, replays, leaderboard entries, and achievements are hidden from public views.",
    warningThree: "Signing in with the email and password within 72 hours cancels deletion and restores the data.",
    warningFour: "After the deadline, the account and game data are permanently deleted and cannot be recovered.",
    emailLabel: "Email",
    emailPlaceholder: "Enter the account email",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter the current password",
    confirmLabel: "I understand the 72-hour cooling-off period and that deletion becomes irreversible after the deadline.",
    submit: "Request account deletion",
    submitting: "Submitting the deletion request…",
    receiptKicker: "REQUEST ACCEPTED",
    receiptTitle: "The account is in its cooling-off period",
    receiptEmail: "Account",
    receiptDue: "Deletion deadline",
    receiptBody: "Signing in with the email and password before the deadline cancels deletion. After the deadline, the data cannot be recovered.",
    login: "Go to sign in",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    invalid: "Enter a valid email and password, then confirm that you understand the deletion rules.",
    unauthorized: "The email or password is incorrect. No deletion request was submitted.",
    gone: "This account has passed its deletion deadline or has already been deleted.",
    limited: "Too many requests. Try again later.",
    network: "The server cannot be reached. Check your connection and try again.",
    failed: "The deletion request could not be submitted. Try again later.",
    success: "The deletion request was submitted and existing sign-in credentials were revoked.",
  },
} as const;

type CopyKey = keyof (typeof COPY)["zh-CN"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function parseAccountDeletionReceipt(
  result: JsonApiResult,
): DeletionReceipt | null {
  if (!result.ok || !result.body || result.body.success !== true) return null;
  const data = asRecord(result.body.data);
  if (!data || data.status !== "pending_deletion") return null;
  const maskedEmail = data.maskedEmail;
  const requestedAt = data.requestedAt;
  const dueAt = data.dueAt;
  if (
    typeof maskedEmail !== "string" ||
    !maskedEmail.trim() ||
    typeof requestedAt !== "string" ||
    typeof dueAt !== "string" ||
    !Number.isFinite(Date.parse(requestedAt)) ||
    !Number.isFinite(Date.parse(dueAt)) ||
    Date.parse(dueAt) <= Date.parse(requestedAt)
  ) {
    return null;
  }
  return { maskedEmail, requestedAt, dueAt };
}

export function accountDeletionErrorKey(result: JsonApiResult): CopyKey {
  if (result.networkError) return "network";
  if (result.status === 401) return "unauthorized";
  if (result.status === 410) return "gone";
  if (result.status === 429) return "limited";
  return "failed";
}

function resolveLocale(): Locale {
  const stored = readStorageValue(
    createBrowserStorageAccess().local(),
    "2048-next.account-deletion.locale-v1",
  );
  if (stored === "zh-CN" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "zh-CN";
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing_account_deletion_element:${selector}`);
  return element;
}

export function bootstrapAccountDeletionPage(): void {
  const form = requireElement<HTMLFormElement>("[data-deletion-form]");
  const language = requireElement<HTMLSelectElement>("[data-language]");
  const status = requireElement<HTMLElement>("[data-deletion-status]");
  const receipt = requireElement<HTMLElement>("[data-deletion-receipt]");
  const submit = requireElement<HTMLButtonElement>(".deletion-submit");
  const passwordInput = requireElement<HTMLInputElement>("#deletion-password");
  const client = createJsonApiClient({
    bases: buildApiBaseCandidates(),
    timeoutMs: 10_000,
  });
  const storage = createBrowserStorageAccess().local();
  let locale = resolveLocale();

  const t = (key: CopyKey): string => COPY[locale][key];

  const applyLocale = (): void => {
    document.documentElement.lang = locale;
    document.title = locale === "en"
      ? "2048 NEXT Account Deletion"
      : "2048 NEXT 账号删除";
    language.value = locale;
    for (const element of document.querySelectorAll<HTMLElement>("[data-copy]")) {
      const key = element.dataset.copy as CopyKey | undefined;
      if (key) element.textContent = t(key);
    }
    for (const element of document.querySelectorAll<HTMLInputElement>("[data-copy-placeholder]")) {
      const key = element.dataset.copyPlaceholder as CopyKey | undefined;
      if (key) element.placeholder = t(key);
    }
  };

  const setStatus = (message: string, tone: "error" | "success" | "info"): void => {
    status.textContent = message;
    status.dataset.tone = tone;
  };

  language.addEventListener("change", () => {
    locale = language.value === "en" ? "en" : "zh-CN";
    writeStorageValue(
      storage,
      "2048-next.account-deletion.locale-v1",
      locale,
    );
    applyLocale();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    if (!email.includes("@") || !password || data.get("confirmed") !== "on") {
      setStatus(t("invalid"), "error");
      return;
    }

    submit.disabled = true;
    setStatus(t("submitting"), "info");
    try {
      const result = await client.requestResult("/account/deletion/request", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const parsed = parseAccountDeletionReceipt(result);
      if (!parsed) {
        setStatus(t(accountDeletionErrorKey(result)), "error");
        return;
      }

      passwordInput.value = "";
      form.hidden = true;
      requireElement<HTMLElement>("[data-receipt-email]").textContent = parsed.maskedEmail;
      requireElement<HTMLElement>("[data-receipt-due]").textContent =
        new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "long",
        }).format(new Date(parsed.dueAt));
      receipt.hidden = false;
      setStatus(t("success"), "success");
      receipt.focus({ preventScroll: true });
    } finally {
      submit.disabled = false;
    }
  });

  receipt.tabIndex = -1;
  applyLocale();
  document.body.dataset.ready = "1";
}

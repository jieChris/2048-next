import {
  getPolicyDocument,
  POLICY_APPROVAL_BLOCKERS,
  POLICY_BUNDLE_VERSION,
  POLICY_EFFECTIVE_DATE,
  renderPolicyDocumentHtml,
  type PolicyKind,
  type PolicyLocale,
} from "../policies/2048-next-policy";
import {
  createBrowserStorageAccess,
  readStorageValue,
  writeStorageValue,
} from "../storage/browser-storage";

const body = document.body;
const kind: PolicyKind = body.dataset.policyKind === "terms" ? "terms" : "privacy";

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing_policy_element:${selector}`);
  return element;
}

const language = requireElement<HTMLSelectElement>("[data-policy-language]");
const storage = createBrowserStorageAccess().local();

function resolveLocale(): PolicyLocale {
  const stored = readStorageValue(storage, "2048-next.policy.locale-v1");
  if (stored === "zh-CN" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "zh-CN";
}

let locale = resolveLocale();

function setText(selector: string, value: string): void {
  requireElement<HTMLElement>(selector).textContent = value;
}

function render(): void {
  const policy = getPolicyDocument(kind, locale);
  document.documentElement.lang = locale;
  document.title = policy.title;
  language.value = locale;
  setText("[data-policy-title]", policy.title);
  setText("[data-policy-intro]", policy.intro);
  setText("[data-policy-version-label]", locale === "en" ? "Version" : "版本");
  setText("[data-policy-date-label]", locale === "en" ? "Effective date" : "生效日期");
  setText("[data-policy-version]", POLICY_BUNDLE_VERSION);
  setText(
    "[data-policy-date]",
    POLICY_EFFECTIVE_DATE ?? (locale === "en" ? "Not effective" : "尚未生效"),
  );
  setText(
    "[data-policy-status]",
    locale === "en"
      ? `Unapproved draft. Release blockers: ${POLICY_APPROVAL_BLOCKERS.join(", ")}.`
      : `未批准草案。公开发行前仍须补齐：运营主体、联系邮箱、生产托管信息、生效日期。`,
  );
  setText(
    "[data-policy-peer]",
    getPolicyDocument(kind === "privacy" ? "terms" : "privacy", locale).shortTitle,
  );
  setText("[data-policy-delete]", locale === "en" ? "Account deletion" : "账号删除");
  setText("[data-policy-home]", locale === "en" ? "Back to game" : "返回首页");
  const content = requireElement<HTMLElement>("[data-policy-content]");
  content.innerHTML = renderPolicyDocumentHtml(kind, locale);
}

language.addEventListener("change", () => {
  locale = language.value === "en" ? "en" : "zh-CN";
  writeStorageValue(storage, "2048-next.policy.locale-v1", locale);
  render();
});

render();
body.dataset.ready = "1";

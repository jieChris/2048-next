import { describe, expect, it } from "vitest";
import { renderAppTemplate } from "../../mobile/src/app/templates";
import { createTranslator } from "../../mobile/src/i18n";
import { PREVIEW_POLICY_VERSION } from "../../mobile/src/privacy";
import {
  getPolicyDocument,
  POLICY_APPROVAL_BLOCKERS,
  POLICY_BUNDLE_VERSION,
  POLICY_CONSENT_VERSION,
  POLICY_EFFECTIVE_DATE,
  renderPolicyDocumentHtml,
} from "../../src/policies/2048-next-policy";

describe("shared mobile and web policy bundle", () => {
  it("publishes the approved policy metadata", () => {
    expect(POLICY_BUNDLE_VERSION).toBe("2026-08-01.1");
    expect(POLICY_CONSENT_VERSION).toBe("2026-08-01");
    expect(PREVIEW_POLICY_VERSION).toBe(POLICY_CONSENT_VERSION);
    expect(PREVIEW_POLICY_VERSION).not.toBe(POLICY_BUNDLE_VERSION);
    expect(POLICY_EFFECTIVE_DATE).toBe("2026-08-01");
    expect(POLICY_APPROVAL_BLOCKERS).toEqual([]);
  });

  it("renders the verified data, permission, provider, retention, and deletion rules", () => {
    const privacy = renderPolicyDocumentHtml("privacy", "zh-CN");
    const terms = renderPolicyDocumentHtml("terms", "en");
    expect(privacy).toContain("INTERNET");
    expect(privacy).toContain("Resend");
    expect(privacy).toContain("Turnstile");
    expect(privacy).toContain("华为云中国大陆上海区域");
    expect(privacy).toContain("Color Cross");
    expect(privacy).toContain("美国芝加哥");
    expect(privacy).toContain("单独同意上述个人信息出境处理");
    expect(privacy).toContain("1203214493@qq.com");
    expect(privacy).toContain("自然人王世杰");
    expect(privacy).toContain("30 天");
    expect(privacy).toContain("72 小时");
    expect(terms).toContain("3-day restoration period");
    expect(terms).toContain("1203214493@qq.com");
    expect(terms).toContain("unique consecutive ranks");
  });

  it("uses the same document source inside the App package", () => {
    const html = renderAppTemplate(createTranslator("en"), "en");
    expect(html).toContain(getPolicyDocument("privacy", "en").title);
    expect(html).toContain(getPolicyDocument("terms", "en").title);
    expect(html).toContain(POLICY_BUNDLE_VERSION);
    expect(html).toContain("Resend");
  });
});

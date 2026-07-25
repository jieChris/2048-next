import { describe, expect, it } from "vitest";
import { renderAppTemplate } from "../../mobile/src/app/templates";
import { createTranslator } from "../../mobile/src/i18n";
import { PREVIEW_POLICY_VERSION } from "../../mobile/src/privacy";
import {
  getPolicyDocument,
  POLICY_APPROVAL_BLOCKERS,
  POLICY_BUNDLE_VERSION,
  POLICY_EFFECTIVE_DATE,
  renderPolicyDocumentHtml,
} from "../../src/policies/2048-next-policy";

describe("shared mobile and web policy bundle", () => {
  it("keeps the release gate closed until the approval metadata is complete", () => {
    expect(POLICY_BUNDLE_VERSION).toBe("unapproved-draft");
    expect(PREVIEW_POLICY_VERSION).toBe(POLICY_BUNDLE_VERSION);
    expect(POLICY_EFFECTIVE_DATE).toBeNull();
    expect(POLICY_APPROVAL_BLOCKERS).toEqual([
      "operator_identity",
      "contact_email",
      "production_hosting_provider",
      "effective_date",
    ]);
  });

  it("renders the verified data, permission, provider, retention, and deletion rules", () => {
    const privacy = renderPolicyDocumentHtml("privacy", "zh-CN");
    const terms = renderPolicyDocumentHtml("terms", "en");
    expect(privacy).toContain("INTERNET");
    expect(privacy).toContain("Resend");
    expect(privacy).toContain("Turnstile");
    expect(privacy).toContain("30 天");
    expect(privacy).toContain("72 小时");
    expect(terms).toContain("3-day restoration period");
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

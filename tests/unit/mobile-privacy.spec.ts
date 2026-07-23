import { describe, expect, it } from "vitest";

import {
  createPreviewPrivacyRecord,
  parsePreviewPrivacyRecord,
  PREVIEW_POLICY_VERSION,
  PREVIEW_PRIVACY_STORAGE_KEY
} from "../../mobile/src/privacy";

describe("mobile preview privacy record", () => {
  it("uses an explicit preview-only key and unapproved policy marker", () => {
    expect(PREVIEW_PRIVACY_STORAGE_KEY).toContain("preview");
    expect(PREVIEW_POLICY_VERSION).toBe("unapproved-draft");

    expect(createPreviewPrivacyRecord("offline", 1_784_779_200_000)).toEqual({
      schema: 1,
      choice: "offline",
      decidedAt: 1_784_779_200_000,
      policyVersion: "unapproved-draft"
    });
  });

  it("accepts only the current preview schema and never treats legacy strings as consent", () => {
    const record = createPreviewPrivacyRecord("online", 1_784_779_200_000);

    expect(parsePreviewPrivacyRecord(JSON.stringify(record))).toEqual(record);
    expect(parsePreviewPrivacyRecord("online")).toBeNull();
    expect(
      parsePreviewPrivacyRecord(
        JSON.stringify({ ...record, policyVersion: "approved-v1" })
      )
    ).toBeNull();
    expect(parsePreviewPrivacyRecord("not-json")).toBeNull();
  });
});

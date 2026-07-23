export type PreviewPrivacyChoice = "offline" | "online";

export interface PreviewPrivacyRecord {
  readonly schema: 1;
  readonly choice: PreviewPrivacyChoice;
  readonly decidedAt: number;
  readonly policyVersion: typeof PREVIEW_POLICY_VERSION;
}

export const PREVIEW_POLICY_VERSION = "unapproved-draft" as const;
export const PREVIEW_PRIVACY_STORAGE_KEY =
  "2048-next.app.preview-privacy-v1";

export function createPreviewPrivacyRecord(
  choice: PreviewPrivacyChoice,
  decidedAt: number
): PreviewPrivacyRecord {
  return {
    schema: 1,
    choice,
    decidedAt,
    policyVersion: PREVIEW_POLICY_VERSION
  };
}

export function parsePreviewPrivacyRecord(
  serialized: string | null
): PreviewPrivacyRecord | null {
  if (!serialized) return null;

  try {
    const candidate: unknown = JSON.parse(serialized);
    if (!candidate || typeof candidate !== "object") return null;

    const record = candidate as Record<string, unknown>;
    if (
      record.schema !== 1 ||
      (record.choice !== "offline" && record.choice !== "online") ||
      typeof record.decidedAt !== "number" ||
      !Number.isFinite(record.decidedAt) ||
      record.policyVersion !== PREVIEW_POLICY_VERSION
    ) {
      return null;
    }

    return {
      schema: 1,
      choice: record.choice,
      decidedAt: record.decidedAt,
      policyVersion: PREVIEW_POLICY_VERSION
    };
  } catch {
    return null;
  }
}

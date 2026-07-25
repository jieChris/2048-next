export const ACCOUNT_DELETION_RECEIPT_STORAGE_KEY =
  "2048-next.app.account-deletion-receipt-v1";

export interface AccountDeletionReceipt {
  version: 1;
  requestedAt: string;
  dueAt: string;
  maskedEmail: string;
}

function isReceipt(value: unknown): value is AccountDeletionReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).sort().join("\0") !==
      ["dueAt", "maskedEmail", "requestedAt", "version"].join("\0") ||
    record.version !== 1 ||
    typeof record.requestedAt !== "string" ||
    typeof record.dueAt !== "string" ||
    typeof record.maskedEmail !== "string" ||
    !record.maskedEmail.trim() ||
    record.maskedEmail.length > 320
  ) {
    return false;
  }
  const requestedAt = Date.parse(record.requestedAt);
  const dueAt = Date.parse(record.dueAt);
  return Number.isFinite(requestedAt) && Number.isFinite(dueAt) && dueAt > requestedAt;
}

export function parseAccountDeletionReceipt(
  serialized: string | null,
): AccountDeletionReceipt | null {
  if (serialized === null || serialized.length > 2_048) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    return isReceipt(value) ? { ...value } : null;
  } catch {
    return null;
  }
}

export function loadAccountDeletionReceipt(
  storage: Pick<Storage, "getItem">,
): AccountDeletionReceipt | null {
  return parseAccountDeletionReceipt(
    storage.getItem(ACCOUNT_DELETION_RECEIPT_STORAGE_KEY),
  );
}

export function saveAccountDeletionReceipt(
  storage: Pick<Storage, "setItem">,
  receipt: AccountDeletionReceipt,
): void {
  if (!isReceipt(receipt)) throw new Error("invalid_account_deletion_receipt");
  storage.setItem(ACCOUNT_DELETION_RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
}

export function clearAccountDeletionReceipt(
  storage: Pick<Storage, "removeItem">,
): void {
  storage.removeItem(ACCOUNT_DELETION_RECEIPT_STORAGE_KEY);
}

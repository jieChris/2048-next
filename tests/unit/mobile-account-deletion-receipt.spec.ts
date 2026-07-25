import { describe, expect, it } from "vitest";

import {
  ACCOUNT_DELETION_RECEIPT_STORAGE_KEY,
  clearAccountDeletionReceipt,
  loadAccountDeletionReceipt,
  parseAccountDeletionReceipt,
  saveAccountDeletionReceipt,
  type AccountDeletionReceipt,
} from "../../mobile/src/auth/account-deletion-receipt";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const receipt: AccountDeletionReceipt = {
  version: 1,
  requestedAt: "2026-07-25T00:00:00.000Z",
  dueAt: "2026-07-28T00:00:00.000Z",
  maskedEmail: "p***@example.com",
};

describe("mobile account deletion receipt", () => {
  it("round-trips only the non-sensitive versioned receipt", () => {
    const storage = memoryStorage();
    saveAccountDeletionReceipt(storage, receipt);
    expect(loadAccountDeletionReceipt(storage)).toEqual(receipt);
    const serialized = storage.getItem(ACCOUNT_DELETION_RECEIPT_STORAGE_KEY);
    expect(serialized).not.toContain("player@example.com");
    expect(serialized).not.toContain("userId");
    expect(serialized).not.toContain("token");
    clearAccountDeletionReceipt(storage);
    expect(loadAccountDeletionReceipt(storage)).toBeNull();
  });

  it.each([
    null,
    "not-json",
    JSON.stringify({ ...receipt, version: 2 }),
    JSON.stringify({ ...receipt, userId: 42 }),
    JSON.stringify({ ...receipt, dueAt: receipt.requestedAt }),
    JSON.stringify({ ...receipt, maskedEmail: "" }),
  ])("rejects malformed or expanded receipts", (value) => {
    expect(parseAccountDeletionReceipt(value)).toBeNull();
  });
});

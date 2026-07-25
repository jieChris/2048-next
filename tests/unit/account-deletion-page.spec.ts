import { describe, expect, it } from "vitest";
import {
  accountDeletionErrorKey,
  parseAccountDeletionReceipt,
} from "../../src/pages/account-deletion-page";

describe("public account deletion page", () => {
  it("accepts only the frozen 72-hour receipt shape", () => {
    expect(parseAccountDeletionReceipt({
      ok: true,
      status: 200,
      networkError: null,
      body: {
        success: true,
        data: {
          status: "pending_deletion",
          requestedAt: "2026-07-25T00:00:00.000Z",
          dueAt: "2026-07-28T00:00:00.000Z",
          maskedEmail: "p***@example.com",
        },
      },
    })).toEqual({
      requestedAt: "2026-07-25T00:00:00.000Z",
      dueAt: "2026-07-28T00:00:00.000Z",
      maskedEmail: "p***@example.com",
    });

    expect(parseAccountDeletionReceipt({
      ok: true,
      status: 200,
      networkError: null,
      body: {
        success: true,
        data: {
          status: "pending_deletion",
          requestedAt: "2026-07-25T00:00:00.000Z",
          dueAt: "2026-07-24T00:00:00.000Z",
          maskedEmail: "p***@example.com",
        },
      },
    })).toBeNull();
  });

  it("classifies public deletion failures without exposing server details", () => {
    expect(accountDeletionErrorKey({ ok: false, status: null, body: null, networkError: "offline" })).toBe("network");
    expect(accountDeletionErrorKey({ ok: false, status: 401, body: null, networkError: null })).toBe("unauthorized");
    expect(accountDeletionErrorKey({ ok: false, status: 410, body: null, networkError: null })).toBe("gone");
    expect(accountDeletionErrorKey({ ok: false, status: 429, body: null, networkError: null })).toBe("limited");
    expect(accountDeletionErrorKey({ ok: false, status: 500, body: null, networkError: null })).toBe("failed");
  });
});

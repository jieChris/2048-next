import { describe, expect, it } from "vitest";

import {
  assignManagerClientRecordId,
  createManagerClientRecordId,
  resolveManagerClientRecordId
} from "../../src/core/game-manager-client-record-id";

describe("core game manager client record id helpers", () => {
  it("creates legacy-shaped record ids from randomUUID without dashes", () => {
    const id = createManagerClientRecordId({
      randomUUID: () => "12345678-90ab-cdef-1234-567890abcdef"
    });

    expect(id).toBe("rec_1234567890abcdef1234567890abcdef");
  });

  it("falls back to timestamp plus 24 lowercase hex characters", () => {
    const now = 1_700_000_000_000;
    const id = createManagerClientRecordId({
      now: () => now,
      randomUUID: () => {
        throw new Error("uuid unavailable");
      },
      randomHex: (byteCount) => "a1".repeat(byteCount)
    });

    expect(id).toBe(`rec_${now.toString(36)}_${"a1".repeat(12)}`);
  });

  it("trims assigned ids and generates one when the supplied id is blank", () => {
    const manager: { clientRecordId?: string } = {};

    expect(assignManagerClientRecordId(manager, " rec_existing ")).toBe("rec_existing");
    expect(manager.clientRecordId).toBe("rec_existing");

    expect(
      assignManagerClientRecordId(manager, "   ", {
        now: () => 1_700_000_000_001,
        randomUUID: () => {
          throw new Error("uuid unavailable");
        },
        randomHex: () => "b".repeat(24)
      })
    ).toBe(`rec_${(1_700_000_000_001).toString(36)}_${"b".repeat(24)}`);
  });

  it("resolves an existing trimmed id and assigns a generated id when missing", () => {
    const existing: { clientRecordId?: string } = { clientRecordId: " rec_current " };
    const missing: { clientRecordId?: string } = {};

    expect(resolveManagerClientRecordId(existing)).toBe("rec_current");
    expect(resolveManagerClientRecordId(missing, {
      now: () => 1_700_000_000_002,
      randomUUID: () => {
        throw new Error("uuid unavailable");
      },
      randomHex: () => "c".repeat(24)
    })).toBe(`rec_${(1_700_000_000_002).toString(36)}_${"c".repeat(24)}`);
    expect(missing.clientRecordId).toBe(`rec_${(1_700_000_000_002).toString(36)}_${"c".repeat(24)}`);
  });

  it("returns an empty id for nullish managers", () => {
    expect(assignManagerClientRecordId(null, "rec_next")).toBe("");
    expect(resolveManagerClientRecordId(undefined)).toBe("");
  });
});

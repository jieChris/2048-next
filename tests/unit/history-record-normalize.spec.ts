import { describe, expect, it } from "vitest";

import {
  normalizeHistoryRecordForView,
  resolveModeLabel
} from "../../src/features/history/history-record-normalize";

describe("history-record-normalize", () => {
  it("normalizes record fields with runtime absent", () => {
    const record = {
      id: "abc",
      mode_key: "pow2",
      score: "120",
      best_tile: "256",
      duration_ms: "1200",
      ended_at: "2024-01-01T00:00:00.000Z",
      replay_string: "replay",
      owner_type: "GUEST",
      owner_user_id: "",
      owner_nickname: ""
    };

    const result = normalizeHistoryRecordForView(record);
    expect(result.id).toBe("abc");
    expect(result.mode_key).toBe("pow2");
    expect(result.score).toBe(120);
    expect(result.best_tile).toBe(256);
    expect(result.duration_ms).toBe(1200);
    expect(result.ended_at).toBe("2024-01-01T00:00:00.000Z");
    expect(result.replay_string).toBe("replay");
    expect(result.owner_type).toBe("guest");
  });

  it("resolves mode label from catalog when available", () => {
    const label = resolveModeLabel("pow2", "fallback", {
      modeCatalog: {
        getMode: () => ({ label: "Pow2 Mode" })
      }
    });
    expect(label).toBe("Pow2 Mode");
  });
});

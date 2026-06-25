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

  it("uses concise 4x4 labels for Chinese history records", () => {
    expect(
      resolveModeLabel("standard_4x4_pow2_no_undo", "普通无撤回", {
        lang: "zh",
        modeCatalog: {
          getMode: () => ({ label: "标准版 4x4（无撤回）", board_width: 4, board_height: 4 })
        }
      })
    ).toBe("经典4x4");

    expect(
      resolveModeLabel("classic_4x4_pow2_undo", "经典版 4x4（可撤回）", {
        lang: "zh",
        modeCatalog: {
          getMode: () => ({ label: "经典版 4x4（可撤回）", board_width: 4, board_height: 4 })
        }
      })
    ).toBe("4x4可撤回");

    expect(resolveModeLabel("classic_no_undo", "普通无撤回", { lang: "zh" })).toBe("经典4x4");
  });

  it("falls back to the provided label before the mode key", () => {
    expect(resolveModeLabel("diag_4x2_pow2_no_undo", "Diagonal 4x2")).toBe("Diagonal 4x2");
  });

  it("resolves English labels for generated modes when catalog labels are legacy Chinese", () => {
    expect(
      resolveModeLabel("spawn_custom_4x4_pow2_no_undo", "4x4 自定义4率（无撤回）", {
        lang: "en",
        modeCatalog: {
          getMode: () => ({ label: "4x4 自定义4率（无撤回）", board_width: 4, board_height: 4 })
        }
      })
    ).toBe("4x4 Custom 4-Rate");

    expect(
      resolveModeLabel("limit3_4x4_pow2_no_undo", "限次撤回 4x4（3次）（无撤回）", {
        lang: "en"
      })
    ).toBe("Limited Undo 4x4 (3)");
  });
});

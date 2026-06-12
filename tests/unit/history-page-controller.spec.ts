import { describe, expect, it } from "vitest";

import { createHistoryPageController } from "../../src/pages/history-page-controller";

describe("history page controller", () => {
  it("normalizes records with an injected storage runtime without a global legacy runtime", () => {
    const windowLike = {
      localStorage: null,
      CoreGameSettingsStorageRuntime: null
    } as unknown as Window;
    const controller = createHistoryPageController({
      windowLike,
      documentLike: null,
      storageRuntime: {
        normalizeHistoryRecordFromContext: () => ({
          id: "from-injected-runtime",
          mode: "local",
          mode_key: "practice",
          score: 2048,
          best_tile: 256,
          duration_ms: 1200,
          ended_at: "2026-06-13T00:00:00.000Z",
          replay_string: "replay",
          final_board: [],
          owner_type: "guest",
          owner_user_id: null,
          owner_nickname: "",
          owner_key: "guest",
          diagnostics_index_entries: []
        }),
        normalizeHistoryDiagnosticsIndexEntriesFromContext: () => []
      }
    });

    const normalized = controller.normalizeRecord({ score: 1 });

    expect(normalized.id).toBe("from-injected-runtime");
    expect(normalized.score).toBe(2048);
    expect(normalized.mode_key).toBe("practice");
  });
});

import { expect, test } from "@playwright/test";

test.describe("History smoke: export", () => {
  test("supports export-all and single-record export", async ({ page }) => {
    const response = await page.goto("/history.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store) throw new Error("LocalHistoryStore missing");
      store.clearAll();

      const now = Date.now();
      store.saveRecord({
        id: "export_1",
        mode: "local",
        mode_key: "practice",
        board_width: 4,
        board_height: 4,
        score: 123,
        best_tile: 32,
        duration_ms: 1000,
        final_board: [],
        ended_at: new Date(now).toISOString(),
        replay_string: "replay_(!äfC",
        diagnostics_index_entries: [
          {
            key: "secondaryTimerPlacement",
            schemaVersion: 1,
            payload: {
              validPlacementDescriptors: 3,
              placed: 2,
              skippedDuplicate: 1,
              skippedMissingAnchor: 0,
              dedupeKeyKinds: 2,
              dedupeKeySamples: ["parent-child:8192:4096#2"]
            }
          }
        ]
      });
      store.saveRecord({
        id: "export_2",
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        score: 456,
        best_tile: 64,
        duration_ms: 2000,
        final_board: [],
        ended_at: new Date(now - 500).toISOString(),
        replay_string: ""
      });
    });

    await page.click("#history-load-btn");

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      const calls: Array<{ file: string; size: number; mime: string; payload: string }> = [];
      const originalDownload = store.download;

      store.download = function (file: string, payload: string, mimeType?: string) {
        calls.push({
          file: String(file || ""),
          size: String(payload || "").length,
          mime: String(mimeType || "application/json;charset=utf-8"),
          payload: String(payload || "")
        });
      };

      const exportAllBtn = document.querySelector("#history-export-all-btn") as HTMLButtonElement | null;
      if (exportAllBtn) exportAllBtn.click();

      const exportOneBtn = document.querySelector(".history-export-btn") as HTMLButtonElement | null;
      if (exportOneBtn) exportOneBtn.click();

      store.download = originalDownload;
      return calls;
    });

    expect(snapshot.length).toBe(3);
    expect(snapshot[0].file).toContain("2048_local_history_");
    expect(snapshot[1].file).toContain("history_");
    expect(snapshot[2].file).toContain("history_");
    expect(snapshot[1].file).toContain(".json");
    expect(snapshot[2].file).toContain(".txt");
    expect(snapshot[2].mime).toContain("text/plain");
    expect(snapshot[0].size).toBeGreaterThan(10);
    expect(snapshot[1].size).toBeGreaterThan(10);
    expect(snapshot[2].size).toBeGreaterThan(0);

    const singleExportPayload = JSON.parse(String(snapshot[1].payload || "{}"));
    const records = Array.isArray(singleExportPayload.records) ? singleExportPayload.records : [];
    expect(records.length).toBe(1);
    expect(records[0]?.id).toBe("export_1");
    expect(records[0]?.diagnostics_index_entries?.[0]?.key).toBe("secondaryTimerPlacement");
  });
});

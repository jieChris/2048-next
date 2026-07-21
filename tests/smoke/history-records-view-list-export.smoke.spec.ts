import { expect, test } from "@playwright/test";

import { mockAcceptedBetaAccess } from "./support/beta-access";

test.describe("History smoke: export", () => {
  test("backfills, displays, sorts, searches and exports board sum", async ({ page }) => {
    await mockAcceptedBetaAccess(page);

    const response = await page.goto("/history.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.evaluate(() => {
      const now = Date.now();
      window.localStorage.setItem("local_game_history_v1", JSON.stringify([
        {
          id: "legacy_sum_30",
          mode: "local",
          mode_key: "standard_4x4_pow2_no_undo",
          score: 900,
          best_tile: 16,
          duration_ms: 1000,
          final_board: [[2, 4], [8, 16]],
          ended_at: new Date(now).toISOString()
        },
        {
          id: "legacy_sum_64",
          mode: "local",
          mode_key: "standard_4x4_pow2_no_undo",
          score: 100,
          best_tile: 64,
          duration_ms: 1000,
          final_board: [[64, 0], [0, 0]],
          ended_at: new Date(now - 1000).toISOString()
        }
      ]));
    });

    await page.click("#history-load-btn");
    await expect(page.locator(".history-item")).toHaveCount(2);
    await expect(page.locator(".history-item").first()).toContainText("盘面和: 30");

    await page.selectOption("#history-sort", "board_sum_desc");
    await expect(page.locator(".history-item").first()).toContainText("盘面和: 64");

    await page.fill("#history-keyword", "30");
    await page.press("#history-keyword", "Enter");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-item").first()).toContainText("盘面和: 30");

    const exported = await page.evaluate(() => {
      const payload = (window as any).LocalHistoryStore.exportRecords();
      return JSON.parse(String(payload || "{}"));
    });
    expect(exported.records).toHaveLength(2);
    expect(exported.records.map((record: any) => record.board_sum).sort((a: number, b: number) => a - b)).toEqual([30, 64]);
  });

  test("supports export-all and single-record export", async ({ page }) => {
    await mockAcceptedBetaAccess(page);

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
        mode_key: "standard_4x4_pow2_no_undo",
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

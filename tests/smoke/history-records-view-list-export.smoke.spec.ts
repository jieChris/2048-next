import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates record list render orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordListHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordListHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryRecordListRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordListHostCallCount =
                Number((window as any).__historyRecordListHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryRecordListHostRuntime?.applyHistoryRecordListRender),
      callCount: Number((window as any).__historyRecordListHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
  });

  test("history page delegates single-record export state to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historySingleExportActionCallCount = 0;
      (window as any).__historySingleExportStateCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryExportRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "downloadHistorySingleRecord" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historySingleExportActionCallCount =
                Number((window as any).__historySingleExportActionCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistorySingleRecordExportState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historySingleExportStateCallCount =
                Number((window as any).__historySingleExportStateCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 512,
        best_tile: 64,
        duration_ms: 12000,
        final_board: [
          [2, 4, 8, 16],
          [32, 64, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.download !== "function") {
        throw new Error("LocalHistoryStore download unavailable");
      }
      const originalDownload = store.download;
      (window as any).__historySingleExportLastFile = "";
      store.download = function (file: unknown, payload: unknown) {
        (window as any).__historySingleExportLastFile = String(file || "");
        (window as any).__historySingleExportPayloadLength = String(payload || "").length;
      };

      const button = document.querySelector(".history-export-btn") as HTMLButtonElement | null;
      if (button && typeof button.click === "function") button.click();

      store.download = originalDownload;
      return {
        hasRuntime:
          Boolean((window as any).CoreHistoryExportRuntime?.downloadHistorySingleRecord) &&
          Boolean((window as any).CoreHistoryExportRuntime?.resolveHistorySingleRecordExportState),
        singleExportActionCallCount: Number((window as any).__historySingleExportActionCallCount || 0),
        singleExportStateCallCount: Number((window as any).__historySingleExportStateCallCount || 0),
        fileName: String((window as any).__historySingleExportLastFile || "")
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.singleExportActionCallCount).toBeGreaterThan(0);
    expect(snapshot.fileName).toContain("history_");
  });
});

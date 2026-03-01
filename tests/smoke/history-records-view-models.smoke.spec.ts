import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates record head modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordHeadCallCount = 0;
      (window as any).__historyCatalogModeLabelCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordViewRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCatalogModeLabel" && typeof value === "function") {
            proxyTarget[prop] = function (modeCatalog: unknown, item: unknown) {
              (window as any).__historyCatalogModeLabelCallCount =
                Number((window as any).__historyCatalogModeLabelCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(modeCatalog, item);
            };
            return true;
          }
          if (prop === "resolveHistoryRecordHeadState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHeadCallCount =
                Number((window as any).__historyRecordHeadCallCount || 0) + 1;
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
        duration_ms: 40000,
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

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean(
        (window as any).CoreHistoryRecordViewRuntime?.resolveHistoryCatalogModeLabel &&
          (window as any).CoreHistoryRecordViewRuntime?.resolveHistoryRecordHeadState
      ),
      catalogModeLabelCallCount: Number((window as any).__historyCatalogModeLabelCallCount || 0),
      headCallCount: Number((window as any).__historyRecordHeadCallCount || 0),
      firstItemText: (document.querySelector(".history-item-head")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.catalogModeLabelCallCount).toBeGreaterThan(0);
    expect(snapshot.headCallCount).toBeGreaterThan(0);
    expect(snapshot.firstItemText).toContain("分数:");
  });

  test("history page delegates record item html modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordItemHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordItemRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryRecordItemHtml" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordItemHtmlCallCount =
                Number((window as any).__historyRecordItemHtmlCallCount || 0) + 1;
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

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryRecordItemRuntime?.resolveHistoryRecordItemHtml),
      callCount: Number((window as any).__historyRecordItemHtmlCallCount || 0),
      hasHistoryItem: document.querySelectorAll(".history-item").length > 0
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasHistoryItem).toBe(true);
  });
  test("history page delegates final board html rendering to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBoardHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBoardRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryFinalBoardHtml" && typeof value === "function") {
            proxyTarget[prop] = function (board: unknown, width: unknown, height: unknown) {
              (window as any).__historyBoardHtmlCallCount =
                Number((window as any).__historyBoardHtmlCallCount || 0) + 1;
              return (value as (b: unknown, w: unknown, h: unknown) => unknown)(board, width, height);
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
        score: 1024,
        best_tile: 128,
        duration_ms: 32000,
        final_board: [
          [2, 4, 8, 16],
          [32, 64, 128, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryBoardRuntime?.resolveHistoryFinalBoardHtml),
      boardHtmlCallCount: Number((window as any).__historyBoardHtmlCallCount || 0),
      hasBoardGrid: Boolean(document.querySelector(".final-board-grid"))
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.boardHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.hasBoardGrid).toBe(true);
  });
});

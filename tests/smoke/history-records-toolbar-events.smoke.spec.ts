import { expect, test } from "@playwright/test";

test.describe("History smoke: pagination toolbar", () => {
  test("supports prev/next pagination", async ({ page }) => {
    const response = await page.goto("/history.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store) throw new Error("LocalHistoryStore missing");
      store.clearAll();

      const now = Date.now();
      for (let i = 0; i < 65; i += 1) {
        store.saveRecord({
          id: "pager_" + i,
          mode: "local",
          mode_key: "standard_4x4_pow2_no_undo",
          board_width: 4,
          board_height: 4,
          score: 1000 - i,
          best_tile: 128,
          duration_ms: 1000 + i,
          final_board: [],
          ended_at: new Date(now - i * 1000).toISOString(),
          replay_string: ""
        });
      }
    });

    await page.click("#history-load-btn");
    await expect(page.locator("#history-summary")).toContainText("第 1/3 页");

    await page.click("#history-next-page");
    await expect(page.locator("#history-summary")).toContainText("第 2/3 页");

    await page.click("#history-next-page");
    await expect(page.locator("#history-summary")).toContainText("第 3/3 页");

    await page.click("#history-prev-page");
    await expect(page.locator("#history-summary")).toContainText("第 2/3 页");
  });
});

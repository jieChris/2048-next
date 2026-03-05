import { expect, test } from "@playwright/test";

test.describe("History smoke: mode and filter", () => {
  test("supports mode filter, keyword and score sort", async ({ page }) => {
    const response = await page.goto("/history.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store) throw new Error("LocalHistoryStore missing");
      store.clearAll();

      const now = Date.now();
      store.saveRecord({
        id: "mode_filter_a",
        mode: "local",
        mode_key: "practice",
        board_width: 4,
        board_height: 4,
        score: 2048,
        best_tile: 256,
        duration_ms: 8000,
        challenge_id: "kw_hit",
        final_board: [],
        ended_at: new Date(now).toISOString(),
        replay_string: ""
      });

      store.saveRecord({
        id: "mode_filter_b",
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        score: 512,
        best_tile: 64,
        duration_ms: 3000,
        final_board: [],
        ended_at: new Date(now - 1000).toISOString(),
        replay_string: ""
      });

      store.saveRecord({
        id: "mode_filter_c",
        mode: "local",
        mode_key: "classic_4x4_pow2_undo",
        board_width: 4,
        board_height: 4,
        score: 4096,
        best_tile: 512,
        duration_ms: 10000,
        final_board: [],
        ended_at: new Date(now - 2000).toISOString(),
        replay_string: ""
      });
    });

    await page.click("#history-load-btn");

    const optionCount = await page.locator("#history-mode option").count();
    expect(optionCount).toBeGreaterThan(1);

    await page.selectOption("#history-mode", "practice");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-item-head").first()).toContainText("分数: 2048");

    await page.selectOption("#history-mode", "");
    await page.fill("#history-keyword", "kw_hit");
    await page.press("#history-keyword", "Enter");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-item-head").first()).toContainText("分数: 2048");

    await page.fill("#history-keyword", "");
    await page.selectOption("#history-sort", "score_desc");

    const firstHead = await page.locator(".history-item-head").first().textContent();
    expect(firstHead || "").toContain("分数: 4096");
  });
});

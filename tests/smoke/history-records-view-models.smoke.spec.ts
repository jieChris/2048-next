import { expect, test } from "@playwright/test";

test.describe("History smoke: item render and actions", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
    });

    const response = await page.goto("/history.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store) throw new Error("LocalHistoryStore missing");
      store.clearAll();
      store.saveRecord({
        id: "render_1",
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
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

    await page.click("#history-load-btn");
  });

  test("renders record head and final board", async ({ page }) => {
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-item-head").first()).toContainText("分数: 512");
    await expect(page.locator(".history-item-head").first()).toContainText("最大块: 64");
    await expect(page.locator(".history-board")).toHaveCount(1);
  });

  test("supports delete action", async ({ page }) => {
    await page.click(".history-delete-btn");
    await expect(page.locator("#history-list")).toContainText("暂无历史记录");
  });

  test("supports replay jump action", async ({ page }) => {
    await page.click(".history-replay-btn");
    await page.waitForURL(/\/replay\.html\?local_history_id=/);
    await expect(page).toHaveURL(/render_1/);
  });
});

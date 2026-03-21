import { expect, test } from "@playwright/test";

test.describe("History smoke: owner label and filter", () => {
  test("separates guest/account records and filters by owner", async ({ page }) => {
    const response = await page.goto("/history.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store) throw new Error("LocalHistoryStore missing");
      store.clearAll();

      const now = Date.now();
      const setAuth = (userId?: string, nickname?: string) => {
        if (userId) window.localStorage.setItem("2048_auth_userId_v1", userId);
        else window.localStorage.removeItem("2048_auth_userId_v1");

        if (nickname) window.localStorage.setItem("2048_auth_nickname_v1", nickname);
        else window.localStorage.removeItem("2048_auth_nickname_v1");
      };

      setAuth(undefined, undefined);
      store.saveRecord({
        id: "owner_guest",
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        score: 128,
        best_tile: 16,
        duration_ms: 1000,
        final_board: [],
        ended_at: new Date(now - 3000).toISOString(),
        replay_string: ""
      });

      setAuth("1001", "Alice");
      store.saveRecord({
        id: "owner_alice",
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        score: 256,
        best_tile: 32,
        duration_ms: 1000,
        final_board: [],
        ended_at: new Date(now - 2000).toISOString(),
        replay_string: ""
      });

      setAuth("1002", "Bob");
      store.saveRecord({
        id: "owner_bob",
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        score: 512,
        best_tile: 64,
        duration_ms: 1000,
        final_board: [],
        ended_at: new Date(now - 1000).toISOString(),
        replay_string: ""
      });
    });

    await page.click("#history-load-btn");

    await expect(page.locator(".history-item")).toHaveCount(3);
    await expect(page.locator("#history-list")).toContainText("Alice");
    await expect(page.locator("#history-list")).toContainText("Bob");
    await expect(page.locator("#history-list")).toContainText(/游客|Guest/);

    await page.selectOption("#history-owner", "user:1002");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-owner-tag").first()).toContainText("Bob");

    await page.selectOption("#history-owner", "guest");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-owner-tag").first()).toContainText(/游客|Guest/);

    await page.selectOption("#history-owner", "");
    await expect(page.locator(".history-item")).toHaveCount(3);
  });
});

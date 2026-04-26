import { expect, test } from "@playwright/test";

test.describe("Replay Lock Smoke", () => {
  test("play page duplicate mode guard uses English message", async ({ page }) => {
    let duplicateDialogMessage = "";
    page.on("dialog", async (dialog) => {
      duplicateDialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("ui_language_v1", "en");
      window.localStorage.setItem(
        "playModeSinglePageLock:v1:standard_4x4_pow2_no_undo",
        JSON.stringify({
          tab_id: "tab_existing",
          token: "token_existing",
          mode_key: "standard_4x4_pow2_no_undo",
          instance_id: "win_existing",
          updated_at: Date.now()
        })
      );
    });

    const response = await page.goto("/play.html?mode_key=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();

    await page.waitForURL(/\/modes\.html$/);
    expect(duplicateDialogMessage).toBe(
      "Illegal operation: each mode can only be open in one page."
    );
  });

  test("replay page ignores the gameplay single-page lock", async ({ page }) => {
    let duplicateDialogMessage = "";
    page.on("dialog", async (dialog) => {
      duplicateDialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.addInitScript(() => {
      window.localStorage.setItem(
        "playModeSinglePageLock:v1:standard_4x4_pow2_no_undo",
        JSON.stringify({
          tab_id: "tab_existing",
          token: "token_existing",
          mode_key: "standard_4x4_pow2_no_undo",
          instance_id: "win_existing",
          updated_at: Date.now()
        })
      );
    });

    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();

    await expect(page.locator(".replay-metric-card").first()).toBeVisible();
    await page.waitForFunction(() => {
      return (
        location.pathname.endsWith("/replay.html") &&
        !!(window as any).game_manager
      );
    });

    expect(duplicateDialogMessage).toBe("");

    const snapshot = await page.evaluate(() => {
      return {
        path: location.pathname,
        hasManager: !!(window as any).game_manager
      };
    });

    expect(snapshot.path).toBe("/replay.html");
    expect(snapshot.hasManager).toBe(true);
  });

  test("practice board ignores the gameplay single-page lock", async ({ page }) => {
    let duplicateDialogMessage = "";
    page.on("dialog", async (dialog) => {
      duplicateDialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("practice_guide_shown_v2", "1");
      window.localStorage.setItem("practice_guide_mobile_shown_v1", "1");
      window.localStorage.setItem(
        "playModeSinglePageLock:v1:practice",
        JSON.stringify({
          tab_id: "tab_existing",
          token: "token_existing",
          mode_key: "practice",
          instance_id: "win_existing",
          updated_at: Date.now()
        })
      );
    });

    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice response should exist").not.toBeNull();
    expect(response?.ok(), "Practice response should be 2xx").toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      return (
        location.pathname.endsWith("/Practice_board.html") &&
        !!(window as any).game_manager
      );
    });

    expect(duplicateDialogMessage).toBe("");

    const snapshot = await page.evaluate(() => {
      return {
        path: location.pathname,
        hasManager: !!(window as any).game_manager
      };
    });

    expect(snapshot.path).toBe("/Practice_board.html");
    expect(snapshot.hasManager).toBe(true);
  });
});

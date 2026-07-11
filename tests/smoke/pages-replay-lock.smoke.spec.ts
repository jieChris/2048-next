import { expect, test } from "@playwright/test";

test.describe("Replay Lock Smoke", () => {
  test("new Chrome tab ignores a stale local lock when no page is alive", async ({ page }) => {
    let duplicateDialogMessage = "";
    page.on("dialog", async (dialog) => {
      duplicateDialogMessage = dialog.message();
      await dialog.dismiss();
    });
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "playModeSinglePageLock:v1:standard_4x4_pow2_no_undo",
        JSON.stringify({
          tab_id: "closed-mobile-tab",
          token: "closed-mobile-token",
          mode_key: "standard_4x4_pow2_no_undo",
          instance_id: "closed-mobile-window",
          updated_at: Date.now()
        })
      );
    });

    await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean((window as any).game_manager));

    expect(duplicateDialogMessage).toBe("");
    await expect(page).toHaveURL(/\/2048\.html$/);
  });

  test("restored standard tab reclaims its own fresh lock", async ({ page }) => {
    let duplicateDialogMessage = "";
    page.on("dialog", async (dialog) => {
      duplicateDialogMessage = dialog.message();
      await dialog.dismiss();
    });
    await page.addInitScript(() => {
      const tabId = "restored-mobile-tab";
      window.sessionStorage.setItem("playModeSinglePageTabId:v1", tabId);
      window.localStorage.setItem(
        "playModeSinglePageLock:v1:standard_4x4_pow2_no_undo",
        JSON.stringify({
          tab_id: tabId,
          token: "stale-token",
          mode_key: "standard_4x4_pow2_no_undo",
          instance_id: "closed-window",
          updated_at: Date.now()
        })
      );
    });

    await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean((window as any).game_manager));

    const snapshot = await page.evaluate(() => {
      const raw = window.localStorage.getItem(
        "playModeSinglePageLock:v1:standard_4x4_pow2_no_undo"
      );
      return {
        path: location.pathname,
        lock: raw ? JSON.parse(raw) : null
      };
    });
    expect(duplicateDialogMessage).toBe("");
    expect(snapshot.path).toBe("/2048.html");
    expect(snapshot.lock).toMatchObject({
      tab_id: "restored-mobile-tab",
      mode_key: "standard_4x4_pow2_no_undo"
    });
    expect(snapshot.lock.token).not.toBe("stale-token");
    expect(snapshot.lock.instance_id).not.toBe("closed-window");
  });

  test("duplicate standard page cannot overwrite the active page saved board", async ({
    page,
    context
  }) => {
    await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      return Boolean((window as any).game_manager && typeof (window as any).saveGameState === "function");
    });

    const before = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      (window as any).saveGameState(manager, { force: true, forceFull: true });
      const key = "savedGameStateByMode:v1:standard_4x4_pow2_no_undo";
      return window.localStorage.getItem(key);
    });
    expect(before).toBeTruthy();

    const duplicatePage = await context.newPage();
    duplicatePage.on("dialog", async (dialog) => {
      await dialog.dismiss();
    });
    await duplicatePage.goto("/2048.html", { waitUntil: "domcontentloaded" });
    await duplicatePage.waitForURL(/\/modes\.html$/);

    const after = await duplicatePage.evaluate(() => {
      return window.localStorage.getItem(
        "savedGameStateByMode:v1:standard_4x4_pow2_no_undo"
      );
    });
    expect(after).toBe(before);
  });

  test("play page duplicate mode guard uses English message", async ({ page, context }) => {
    let duplicateDialogMessage = "";
    await page.addInitScript(() => {
      window.localStorage.setItem("ui_language_v1", "en");
    });
    await page.goto("/play.html?mode_key=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    await page.waitForFunction(() => Boolean((window as any).game_manager));

    const duplicatePage = await context.newPage();
    duplicatePage.on("dialog", async (dialog) => {
      duplicateDialogMessage = dialog.message();
      await dialog.dismiss();
    });
    const response = await duplicatePage.goto("/play.html?mode_key=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();

    await duplicatePage.waitForURL(/\/modes\.html$/);
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

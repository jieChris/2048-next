import { expect, test, type Page } from "@playwright/test";
import { waitForWindowCondition } from "./support/runtime-ready";

function useEnglishUi(page: Page) {
  return page.addInitScript(() => {
    window.localStorage.setItem("ui_language_v1", "en");
    window.localStorage.setItem("home_guide_seen_v1", "1");
    window.localStorage.setItem("practice_guide_shown_v2", "1");
    window.localStorage.removeItem("custom_spawn_4x4_four_rate_v1");
  });
}

test.describe("English UI copy coverage", () => {
  test("local history page renders static and record copy in English", async ({ page }) => {
    await useEnglishUi(page);
    const response = await page.goto("/history.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await waitForWindowCondition(page, () => Boolean((window as any).LocalHistoryStore));
    await expect(page.locator(".portal-header .title")).toContainText("Local History");
    await expect(page.locator("#history-keyword")).toHaveAttribute("placeholder", "Mode / Score / ID");
    await expect(page.locator("#history-load-btn")).toHaveText("Refresh");

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      store.clearAll();
      store.saveRecord({
        id: "en_render_1",
        mode: "4x4 自定义4率（无撤回）",
        mode_key: "spawn_custom_4x4_pow2_no_undo",
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
    await expect(page.locator("#history-summary")).toContainText("records");
    await expect(page.locator("#history-mode option[value='spawn_custom_4x4_pow2_no_undo']")).toHaveText(
      "4x4 Custom 4-Rate"
    );
    await expect(page.locator(".history-item-head").first()).toContainText("4x4 Custom 4-Rate");
    await expect(page.locator(".history-item-head").first()).toContainText("Score: 512");
    await expect(page.locator(".history-item-head").first()).toContainText("Max Tile: 64");
    await expect(page.locator(".history-replay-btn").first()).toHaveText("Replay");
    await expect(page.locator(".history-export-btn").first()).toHaveText("Export");
    await expect(page.locator(".history-delete-btn").first()).toHaveText("Delete");
  });

  test("mode selection page renders missing mode labels in English", async ({ page }) => {
    await useEnglishUi(page);
    const response = await page.goto("/modes.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator(".mode-brand-title")).toHaveText("Mode Selection");
    await expect(page.locator(".mode-tab-button[data-tab-target='diagonal']")).toHaveText("8 Directions");
    await expect(page.locator(".mode-group-title").nth(6)).toHaveText("Capped Modes");
    await expect(page.locator("a[href='play.html?mode_key=spawn_custom_4x4_pow2_no_undo']")).toHaveText(
      "4x4 Custom 4-Rate"
    );
    await expect(page.locator("a[href='play.html?mode_key=nox_4x4_pow2_no_undo']")).toHaveText(
      "NO X (64-32k)"
    );
    await expect(page.locator("a[href='history.html']")).toHaveText("History");

    const layout = await page.evaluate(() => {
      const top = document.querySelector(".mode-select-top") as HTMLElement | null;
      const frequent = document.querySelector(".mode-frequent-title") as HTMLElement | null;
      const topBox = top ? top.getBoundingClientRect() : null;
      const frequentBox = frequent ? frequent.getBoundingClientRect() : null;
      return {
        topHeight: topBox ? topBox.height : 0,
        frequentWidth: frequentBox ? frequentBox.width : 0,
        frequentHeight: frequentBox ? frequentBox.height : 0,
        frequentWritingMode: frequent ? window.getComputedStyle(frequent).writingMode : ""
      };
    });
    expect(layout.topHeight).toBeLessThan(260);
    expect(layout.frequentWidth).toBeGreaterThan(layout.frequentHeight);
    expect(layout.frequentWritingMode).toBe("horizontal-tb");
  });

  test("home announcements, stats panel, and replay export modal use English copy", async ({ page }) => {
    await useEnglishUi(page);
    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await waitForWindowCondition(page, () => {
      return (
        typeof (window as any).exportReplay === "function" &&
          typeof (window as any).CoreReplayExportRuntime?.applyReplayExport === "function" &&
          typeof (window as any).CoreReplayModalRuntime?.applyReplayModalOpen === "function" &&
          typeof (window as any).game_manager?.serialize === "function" &&
          Boolean(document.getElementById("top-announcement-btn")) &&
          Boolean(document.getElementById("stats-panel-toggle"))
      );
    });

    await page.click("#top-announcement-btn");
    await expect(page.locator(".announcement-title").first()).toHaveText("Project Source and Official Site Notice");
    await expect(page.locator(".announcement-content").first()).toContainText("After review");
    await page.click("#announcement-close-btn");

    await page.click("#stats-panel-toggle");
    await expect(page.locator("#stats-panel-title")).toHaveText("Stats Summary");
    await expect(page.locator("#stats-panel-total-label")).toHaveText("Total Steps");
    await expect(page.locator("#stats-panel-four-rate-label")).toHaveText("Actual 4-Rate");
    await expect(page.locator("#stats-panel-close")).toHaveText("Close");
    await page.click("#stats-panel-close");

    await page.evaluate(() => {
      (window as any).exportReplay();
    });
    await expect(page.locator("#replay-modal-title")).toContainText("Export Replay");
    await expect(page.locator("#replay-action-btn")).toHaveText("Copy Replay");
    await expect(page.locator("#replay-download-btn")).toHaveText("Download File");
    await expect(page.locator("#replay-open-page-btn")).toHaveText("Open Replay Page");
  });

  test("custom 4-rate prompt and No X selection use English copy", async ({ page }) => {
    await useEnglishUi(page);
    const promptMessages: string[] = [];
    page.on("dialog", async (dialog) => {
      promptMessages.push(dialog.message());
      await dialog.accept("25");
    });

    const customResponse = await page.goto("/play.html?mode_key=spawn_custom_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(customResponse).not.toBeNull();
    expect(customResponse?.ok()).toBeTruthy();
    await waitForWindowCondition(page, () => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      return Boolean(cfg && cfg.special_rules && cfg.special_rules.custom_spawn_four_rate === 25);
    });
    expect(promptMessages[0]).toBe("Enter 4 spawn rate (0-100, decimals allowed)");

    const noXResponse = await page.goto("/play.html?mode_key=nox_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(noXResponse).not.toBeNull();
    expect(noXResponse?.ok()).toBeTruthy();
    await expect(page.locator("#no-x-selection-overlay")).toContainText("Choose forbidden X");
    await expect(page.locator("#no-x-selection-overlay")).toContainText("If X appears, game ends");
    await expect(page.locator("#no-x-selection-overlay [data-no-x-value='64']")).toHaveText("NO 64");
    await expect(page.locator("#no-x-selection-overlay [data-no-x-value='32768']")).toHaveText("NO 32K");
    await page.locator("#no-x-selection-overlay [data-no-x-value='64']").click();
    await expect(page.locator("#no-x-selection-overlay")).toHaveCount(0);
    await expect(page.locator("#play-mode-title")).toHaveText("NO-64");
    await expect.poll(async () => {
      return page.evaluate(() => {
        return (window as any).GAME_MODE_CONFIG?.special_rules?.no_x_target;
      });
    }).toBe(64);
  });
});

import { expect, test } from "@playwright/test";

import { mockAcceptedBetaAccess } from "./support/beta-access";

test.describe("History smoke: mode and filter", () => {
  test("supports undo-first mode filter and keyword search", async ({ page }) => {
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

    await expect(page.locator("#history-import-btn")).toHaveCount(0);
    await expect(page.locator("#history-import-replace-btn")).toHaveCount(0);
    await expect(page.locator("#history-import-file")).toHaveCount(0);
    await expect(page.locator("#history-keyword")).toBeVisible();
    await expect(page.locator("#history-undo")).toHaveValue("no_undo");
    await expect(page.locator("#history-mode")).toHaveValue("standard_4x4_pow2_no_undo");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-item-head").first()).toContainText("分数: 512");

    const noUndoOptions = await page.locator("#history-mode option").evaluateAll((options) =>
      options.map((option) => ({ value: (option as HTMLOptionElement).value, label: option.textContent || "" }))
    );
    expect(noUndoOptions.some((option) => option.value === "standard_4x4_pow2_no_undo")).toBeTruthy();
    expect(noUndoOptions.some((option) => option.value === "classic_4x4_pow2_undo")).toBeFalsy();
    expect(noUndoOptions.some((option) => option.label.includes("无撤回"))).toBeFalsy();

    await page.selectOption("#history-undo", "undo");
    await expect(page.locator("#history-mode")).toHaveValue("classic_4x4_pow2_undo");
    const undoOptions = await page.locator("#history-mode option").evaluateAll((options) =>
      options.map((option) => ({ value: (option as HTMLOptionElement).value, label: option.textContent || "" }))
    );
    expect(undoOptions.some((option) => option.value === "practice")).toBeTruthy();
    expect(undoOptions.some((option) => option.value === "standard_4x4_pow2_no_undo")).toBeFalsy();
    expect(undoOptions.some((option) => option.label.includes("可撤回"))).toBeFalsy();

    await page.selectOption("#history-mode", "practice");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-item-head").first()).toContainText("分数: 2048");

    await page.fill("#history-keyword", "kw_hit");
    await page.press("#history-keyword", "Enter");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-item-head").first()).toContainText("分数: 2048");

    await page.fill("#history-keyword", "");
    await page.selectOption("#history-mode", "classic_4x4_pow2_undo");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-item-head").first()).toContainText("分数: 4096");

    await page.setViewportSize({ width: 390, height: 844 });
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBeFalsy();
  });
});

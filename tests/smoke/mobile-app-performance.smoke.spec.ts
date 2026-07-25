import { expect, test } from "@playwright/test";

const PRIVACY_KEY = "2048-next.app.preview-privacy-v1";

test("startup, top navigation, game entry, and input first frame stay inside local budgets", async ({ page }) => {
  await page.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify({
      schema: 1,
      choice: "offline",
      policyVersion: "unapproved-draft",
      decidedAt: Date.now(),
    }));
  }, { key: PRIVACY_KEY });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#app")).not.toHaveAttribute("aria-busy", "true");
  await expect.poll(() => page.evaluate(() => performance.getEntriesByName("app-startup").length)).toBe(1);

  await page.locator('[data-app-bottom-nav] [data-nav="modes"]').click();
  await expect(page.locator('[data-app-view="modes"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => performance.getEntriesByName("app-navigation").length)).toBeGreaterThan(0);

  await page.locator('[data-mode="standard_4x4_pow2_no_undo"]').click();
  const board = page.locator("[data-game-board-root]");
  await expect(board).toBeVisible();
  await expect.poll(() => page.evaluate(() => performance.getEntriesByName("app-game-entry").length)).toBeGreaterThan(0);
  await board.focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => page.evaluate(() => performance.getEntriesByName("app-input-first-frame-latency").length)).toBeGreaterThan(0);

  const durations = await page.evaluate(() => ({
    startup: performance.getEntriesByName("app-startup").at(-1)?.duration ?? Infinity,
    navigation: performance.getEntriesByName("app-navigation").at(-1)?.duration ?? Infinity,
    gameEntry: performance.getEntriesByName("app-game-entry").at(-1)?.duration ?? Infinity,
    input: performance.getEntriesByName("app-input-first-frame-latency").at(-1)?.duration ?? Infinity,
    inputCore: performance.getEntriesByName("app-input-core").at(-1)?.duration ?? Infinity,
    inputDomCommit: performance.getEntriesByName("app-input-dom-commit").at(-1)?.duration ?? Infinity,
  }));
  expect(durations.startup).toBeLessThanOrEqual(2_000);
  expect(durations.navigation).toBeLessThanOrEqual(100);
  expect(durations.gameEntry).toBeLessThanOrEqual(500);
  expect(durations.inputCore).toBeLessThanOrEqual(10);
  expect(durations.inputDomCommit).toBeLessThanOrEqual(20);
  expect(durations.input).toBeLessThanOrEqual(50);

  const frameSample = await page.evaluate(() =>
    window.__2048NextStartFrameSample?.(1_000),
  );
  expect(frameSample).toMatchObject({ frameCount: expect.any(Number) });
  expect(frameSample?.effectiveFps ?? 0).toBeGreaterThan(30);
  expect(frameSample?.medianIntervalMs ?? Infinity).toBeLessThanOrEqual(25);
});

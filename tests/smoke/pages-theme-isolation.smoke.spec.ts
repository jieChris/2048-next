import { expect, test } from "@playwright/test";

test("mist cyan stays independent while classic and retained themes keep their own colors", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme_profile_v1", "classic");
    localStorage.setItem("settings_day_theme_profile_v1", "classic");
    localStorage.setItem("settings_night_theme_profile_v1", "classic");
    localStorage.removeItem("settings_night_background_enabled_v1");
  });

  await page.goto("/2048.html?visual_preview=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "classic");
  await page.waitForFunction(() => Boolean((window as any).ThemeManager?.applyTheme));
  expect(await page.evaluate(() => (window as any).ThemeManager.getThemes())).toContainEqual({
    id: "mist_cyan",
    label: "雾青灰"
  });

  await page.evaluate(() => (window as any).ThemeManager.applyTheme("horse_year"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "horse_year");

  const horseYearPalette = await page.evaluate(() => ({
    rootBackground: getComputedStyle(document.documentElement).backgroundImage,
    bodyBackground: getComputedStyle(document.body).backgroundImage,
    score: getComputedStyle(document.querySelector<HTMLElement>(".score-container")!).backgroundColor,
    restart: getComputedStyle(document.querySelector<HTMLElement>(".restart-button")!).backgroundColor
  }));
  expect(horseYearPalette.rootBackground).toContain("radial-gradient");
  expect(horseYearPalette.rootBackground).toContain("rgb(167, 30, 50)");
  expect(horseYearPalette.rootBackground).toContain("rgb(122, 12, 30)");
  expect(horseYearPalette.bodyBackground).toContain("images/horse/%E9%A9%AC.png");
  expect(horseYearPalette.score).toBe("rgb(94, 13, 22)");
  expect(horseYearPalette.restart).toBe("rgb(94, 13, 22)");

  await page.evaluate(() => (window as any).ThemeManager.applyTheme("mist_cyan"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "mist_cyan");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(243, 246, 245)");
  await expect(page.locator(".game-container")).toHaveCSS("background-color", "rgb(184, 201, 199)");
  await expect(page.locator(".grid-cell").first()).toHaveCSS("background-color", "rgb(220, 231, 229)");
  await expect(page.locator(".score-container")).toHaveCSS("background-color", "rgb(251, 253, 252)");

  await page.evaluate(() => (window as any).ThemeManager.applyTheme("classic"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "classic");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 248, 239)");
  await expect(page.locator(".game-container")).toHaveCSS("background-color", "rgb(187, 173, 160)");
  await expect(page.locator(".grid-cell").first()).toHaveCSS("background-color", "rgba(238, 228, 218, 0.35)");
  await expect(page.locator(".score-container")).toHaveCSS("background-color", "rgb(187, 173, 160)");
  await expect(page.locator(".restart-button")).toHaveCSS("background-color", "rgb(143, 122, 102)");

  await page.evaluate(() => (window as any).ThemeManager.applyTheme("bauhaus"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "bauhaus");
  await expect(page.locator("html")).toHaveCSS("background-color", "rgb(240, 240, 240)");
  await expect(page.locator(".game-container")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".score-container")).toHaveCSS("background-color", "rgb(255, 215, 0)");
  await expect(page.locator(".restart-button")).toHaveCSS("background-color", "rgb(0, 87, 183)");
});

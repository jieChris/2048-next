import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { key: "320x568", width: 320, height: 568 },
  { key: "390x844", width: 390, height: 844 },
  { key: "768x1024", width: 768, height: 1024 },
  { key: "1280x720", width: 1280, height: 720 }
] as const;

const THEMES = ["light", "night"] as const;

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`账号设置游客页 ${viewport.key} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript(({ night }) => {
        localStorage.setItem("2048_beta_access_smoke_bypass_v1", "1");
        localStorage.setItem("ui_language_v1", "zh-CN");
        localStorage.setItem("theme_profile_v1", "mist_cyan");
        localStorage.setItem("settings_day_theme_profile_v1", "mist_cyan");
        localStorage.setItem("settings_night_theme_profile_v1", "mist_cyan");
        localStorage.setItem("settings_night_background_enabled_v1", night ? "1" : "0");
        localStorage.removeItem("2048_auth_token_v1");
        localStorage.removeItem("2048_auth_userId_v1");
        localStorage.removeItem("2048_auth_nickname_v1");
      }, { night: theme === "night" });
      await page.route("**/api/**", (route) => route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, code: "UNAUTHORIZED" })
      }));

      const response = await page.goto("/account_settings.html?visual_preview=1", {
        waitUntil: "domcontentloaded"
      });
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("body")).toHaveAttribute("data-auth-state", "guest");
      await expect(page.locator("body")).toHaveAttribute("data-i18n-ready", "1");
      await expect(page.locator("#home-user-display")).toHaveCount(0);
      await expect(page.locator(".account-auth-form-surface")).toBeVisible();
      const layout = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>(".palette-page-header")!;
        const titleRow = document.querySelector<HTMLElement>(".settings-section-title-row")!;
        const form = document.querySelector<HTMLElement>(".account-auth-form-surface")!;
        const titleRect = titleRow.getBoundingClientRect();
        const formRect = form.getBoundingClientRect();
        return {
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          headerDirection: getComputedStyle(header).flexDirection,
          titleFormCenterDelta: Math.abs(
            titleRect.left + titleRect.width / 2 - (formRect.left + formRect.width / 2)
          )
        };
      });
      expect(layout.horizontalOverflow).toBe(false);
      expect(layout.headerDirection).toBe("row");
      expect(layout.titleFormCenterDelta).toBeLessThanOrEqual(1);

      await page.addStyleTag({
        content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}"
      });
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`account-settings-guest-${viewport.key}-${theme}.png`);
    });
  }
}

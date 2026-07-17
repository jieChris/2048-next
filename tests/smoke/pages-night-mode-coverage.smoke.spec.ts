import { expect, test, type Page } from "@playwright/test";

async function installNightModeFixture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("settings_night_background_enabled_v1", "1");
    window.localStorage.setItem("2048_auth_token_v1", "night-mode-smoke-token");
    window.localStorage.setItem("2048_auth_userId_v1", "42");
    window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
  });

  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let payload: Record<string, unknown> = { success: true, data: [] };

    if (pathname.endsWith("/admin/me")) {
      payload = {
        success: true,
        admin: true,
        data: {
          admin: true,
          id: 42,
          rootAdmin: true,
          canManageSuperAdmins: true
        }
      };
    } else if (pathname.endsWith("/user/me") || /\/user\/42$/.test(pathname)) {
      payload = {
        success: true,
        data: {
          id: 42,
          nickname: "Smoke",
          created_at: "2026-01-01 00:00:00"
        }
      };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload)
    });
  });
}

test.describe("Night mode page coverage", () => {
  test.beforeEach(async ({ page }) => {
    await installNightModeFixture(page);
  });

  test("saved night preference reaches every shipped page family", async ({ page }) => {
    const paths = [
      "/2048.html",
      "/Practice_board.html",
      "/modes.html",
      "/account.html",
      "/account_settings.html",
      "/register.html",
      "/password.html",
      "/user.html?id=42",
      "/history.html",
      "/replay.html",
      "/medal-wall.html",
      "/palette.html",
      "/touch_sensitivity.html",
      "/relay_5x5.html",
      "/stone_2k_monitor.html",
      "/admin.html"
    ];

    for (const path of paths) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${path} should load`).toBeTruthy();
      await expect(page.locator("html"), `${path} should apply night mode`).toHaveAttribute(
        "data-night-background",
        "1"
      );
    }
  });

  test("secondary page surfaces use the shared dark palette", async ({ page }) => {
    const cases = [
      { path: "/account_settings.html", selector: "#settings-logout-btn", background: "rgb(58, 41, 39)" },
      { path: "/2048.html", selector: "#night-bg-settings-row", background: "rgb(43, 55, 52)" },
      { path: "/2048.html", selector: "#game-dialog-cancel", background: "rgb(32, 43, 48)" },
      { path: "/user.html?id=42", selector: "#user-record-list", background: "rgb(43, 55, 52)" },
      { path: "/history.html", selector: ".history-item", background: "rgb(43, 55, 52)" },
      { path: "/touch_sensitivity.html", selector: "#touch-threshold-value", background: "rgb(43, 55, 52)" },
      { path: "/relay_5x5.html", selector: "#relay-note", background: "rgb(43, 55, 52)" },
      { path: "/stone_2k_monitor.html", selector: ".stone-access-card", background: "rgb(35, 46, 44)" },
      { path: "/admin.html", selector: ".admin-card", background: "rgb(35, 46, 44)" }
    ];

    for (const item of cases) {
      await page.goto(item.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator(item.selector).first(), `${item.path} ${item.selector}`).toHaveCSS(
        "background-color",
        item.background
      );
    }
  });

  test("secondary page copy keeps readable night colors", async ({ page }) => {
    const cases = [
      { path: "/register.html", selector: "#register-email-label", color: "rgb(204, 215, 209)" },
      { path: "/password.html", selector: "#password-reset-email-label", color: "rgb(204, 215, 209)" },
      { path: "/user.html?id=42", selector: "#user-mode-label", color: "rgb(204, 215, 209)" },
      { path: "/medal-wall.html", selector: "#achievements-user-name", color: "rgb(237, 242, 237)" },
      { path: "/relay_5x5.html", selector: "#relay-note", color: "rgb(204, 215, 209)" }
    ];

    for (const item of cases) {
      await page.goto(item.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator(item.selector).first(), `${item.path} ${item.selector}`).toHaveCSS(
        "color",
        item.color
      );
    }
  });
});

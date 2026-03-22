import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("user profile page uses the unified direct-page bootstrap", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-user-profile-page-system");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/user/7/records")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] })
        });
        return;
      }
      if (url.includes("/user/7")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 7, nickname: "Alice", created_at: "2026-03-14 10:00:00" }
          })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=7&nickname=Alice", { waitUntil: "domcontentloaded" });
    expect(response, "User profile response should exist").not.toBeNull();
    expect(response?.ok(), "User profile response should be 2xx").toBeTruthy();

    await expect(page.locator("body")).toBeVisible();

    const snapshot = await page.evaluate(() => ({
      htmlPageId: document.documentElement.getAttribute("data-page-id"),
      htmlArchitecture: document.documentElement.getAttribute("data-page-entry-architecture"),
      htmlSystem: document.documentElement.getAttribute("data-page-system"),
      bodyManifest: document.body?.getAttribute("data-page-manifest-id"),
      bodyFamily: document.body?.getAttribute("data-page-family")
    }));

    expect(snapshot).toEqual({
      htmlPageId: "user-profile",
      htmlArchitecture: "manifest-bootstrap",
      htmlSystem: "unified-page-system",
      bodyManifest: "user-profile",
      bodyFamily: "profile-history-replay"
    });
  });
});


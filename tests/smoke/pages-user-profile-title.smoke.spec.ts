import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("home page title stays 2048", async ({ page }) => {
    const response = await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page).toHaveTitle("2048");
  });

  test("own user profile title is 用户主页", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("token", "test-token-own");
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
      if (url.includes("/user/9")) {
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
      if (url.includes("/leaderboard")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=9&nickname=Owner", { waitUntil: "domcontentloaded" });
    expect(response, "User response should exist").not.toBeNull();
    expect(response?.ok(), "User response should be 2xx").toBeTruthy();
    await page.waitForFunction(() => document.title === "用户主页");
    await expect(page).toHaveTitle("用户主页");
  });

  test("other user profile title is 用户主页-<用户名>", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("token", "test-token-other");
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
      if (url.includes("/leaderboard")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=7&nickname=Alice", { waitUntil: "domcontentloaded" });
    expect(response, "User response should exist").not.toBeNull();
    expect(response?.ok(), "User response should be 2xx").toBeTruthy();
    await page.waitForFunction(() => document.title === "用户主页-Alice");
    await expect(page).toHaveTitle("用户主页-Alice");
  });
});

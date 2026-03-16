import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("account login stores namespaced auth fields including user id", async ({ page }) => {
    let loginCalls = 0;

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

      if (pathname.endsWith("/api/login")) {
        loginCalls += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            token: "smoke_token",
            userId: 42,
            nickname: "Smoke"
          })
        });
        return;
      }

      if (pathname.endsWith("/api/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: 42,
              nickname: "Smoke",
              email: "smoke@example.com",
              created_at: "2026-03-16T00:00:00Z"
            }
          })
        });
        return;
      }

      if (pathname.endsWith("/api/leaderboard")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    const response = await page.goto("/account.html", { waitUntil: "domcontentloaded" });
    expect(response, "Account response should exist").not.toBeNull();
    expect(response?.ok(), "Account response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.fill("#account-email", "smoke@example.com");
    await page.fill("#account-password", "smoke_password");
    await page.click("#account-login-btn");

    await page.waitForFunction(() => {
      return (
        window.localStorage.getItem("2048_auth_token_v1") === "smoke_token" &&
        window.localStorage.getItem("2048_auth_userId_v1") === "42" &&
        window.localStorage.getItem("2048_auth_nickname_v1") === "Smoke"
      );
    });

    const snapshot = await page.evaluate(() => ({
      token: window.localStorage.getItem("2048_auth_token_v1"),
      userId: window.localStorage.getItem("2048_auth_userId_v1"),
      nickname: window.localStorage.getItem("2048_auth_nickname_v1")
    }));

    expect(snapshot.token).toBe("smoke_token");
    expect(snapshot.userId).toBe("42");
    expect(snapshot.nickname).toBe("Smoke");
    expect(loginCalls).toBe(1);
  });
});

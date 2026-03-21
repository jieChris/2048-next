import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("account page exposes register entry instead of inline register action", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

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

    await expect(page.locator("#account-open-register-btn")).toBeVisible();
    await expect(page.locator("#account-register-btn")).toHaveCount(0);
  });

  test("register page requires captcha payload and redirects back to login", async ({ page }) => {
    let registerCalls = 0;
    let registerPayload: Record<string, unknown> | null = null;

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

      if (pathname.endsWith("/api/register/captcha")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            captcha_id: "reg-captcha-1",
            captcha_image_data_url:
              "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNDAiIGhlaWdodD0iNDgiPjxyZWN0IHdpZHRoPSIxNDAiIGhlaWdodD0iNDgiIGZpbGw9IiNmMWUyY2YiLz48dGV4dCB4PSIxMCIgeT0iMzAiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NjYiPkFCQ0Q8L3RleHQ+PC9zdmc+"
          })
        });
        return;
      }

      if (pathname.endsWith("/api/register")) {
        registerCalls += 1;
        const body = route.request().postDataJSON();
        registerPayload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    const response = await page.goto("/register.html", { waitUntil: "domcontentloaded" });
    expect(response, "Register response should exist").not.toBeNull();
    expect(response?.ok(), "Register response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("#register-captcha-image")).toHaveAttribute("src", /data:image\/svg\+xml/);

    await page.fill("#register-email", "smoke@example.com");
    await page.fill("#register-password", "smoke_pass1!");
    await page.fill("#register-nickname", "SmokeUser");
    await page.fill("#register-captcha-answer", "ABCD");
    await page.click("#register-submit-btn");

    await page.waitForURL(/account\.html\?registered=1/, { timeout: 4000 });

    expect(registerCalls).toBe(1);
    expect(registerPayload).not.toBeNull();
    expect(registerPayload?.email).toBe("smoke@example.com");
    expect(registerPayload?.nickname).toBe("SmokeUser");
    expect(registerPayload?.captcha_id).toBe("reg-captcha-1");
    expect(registerPayload?.captcha_answer).toBe("ABCD");
  });
});


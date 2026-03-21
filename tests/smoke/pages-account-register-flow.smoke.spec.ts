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
    await expect(page.locator("#account-open-reset-password-btn")).toBeVisible();
    await expect(page.locator("#account-open-change-password-btn")).toBeHidden();
    await expect(page.locator("#account-register-btn")).toHaveCount(0);
  });

  test("register page validates nickname and redirects back to login", async ({ page }) => {
    let registerStartCalls = 0;
    let registerStartPayload: Record<string, unknown> | null = null;
    let registerVerifyCalls = 0;
    let registerVerifyPayload: Record<string, unknown> | null = null;
    let nicknameCheckCalls = 0;

    await page.addInitScript(() => {
      window.localStorage.setItem("ui_language_v1", "en");
      (window as unknown as { GAME_TURNSTILE_SITE_KEY?: string }).GAME_TURNSTILE_SITE_KEY = "turnstile-site-test";
      (window as unknown as { turnstile?: { render: (host: unknown, options?: Record<string, unknown>) => string; reset: (id: string) => void } }).turnstile = {
        render: (_host: unknown, options?: Record<string, unknown>) => {
          if (options && typeof options.callback === "function") {
            (options.callback as (token: string) => void)("turnstile-token-test");
          }
          return "turnstile-widget-test";
        },
        reset: (_id: string) => {
          return;
        }
      };
    });

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

      if (pathname.endsWith("/api/register/check-nickname")) {
        nicknameCheckCalls += 1;
        const nickname = requestUrl.searchParams.get("nickname");
        const available = nickname !== "TakenUser";
        await route.fulfill({
          status: available ? 200 : 409,
          contentType: "application/json",
          body: JSON.stringify(
            available
              ? { success: true, available: true }
              : { success: true, available: false, code: "NICKNAME_EXISTS" }
          )
        });
        return;
      }

      if (pathname.endsWith("/api/register/start")) {
        registerStartCalls += 1;
        const body = route.request().postDataJSON();
        registerStartPayload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, expires_in: 600, retry_after: 60 })
        });
        return;
      }

      if (pathname.endsWith("/api/register/verify")) {
        registerVerifyCalls += 1;
        const body = route.request().postDataJSON();
        registerVerifyPayload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, userId: 123, token: "smoke-token", nickname: "SmokeUser" })
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

    await page.fill("#register-email", "smoke@example.com");
    await page.fill("#register-password", "smoke_pass1!");
    await page.fill("#register-nickname", "TakenUser");
    await page.locator("#register-nickname").blur();
    await expect(page.locator("#register-tip")).toHaveText("");
    await expect(page.locator("#register-nickname")).toHaveClass(/input-error/);
    await expect(page.locator("#register-nickname-feedback")).toContainText("Nickname unavailable, please choose another");

    await page.fill("#register-nickname", "SmokeUser");
    await expect(page.locator("#register-nickname")).not.toHaveClass(/input-error/);
    await expect(page.locator("#register-nickname-feedback")).toHaveText("");
    await page.locator("#register-nickname").blur();
    await expect(page.locator("#register-nickname")).not.toHaveClass(/input-error/);
    await expect(page.locator("#register-nickname-feedback")).toHaveText("");
    await page.click("#register-send-code-btn");
    await page.fill("#register-email-code", "246810");
    await page.click("#register-submit-btn");

    await page.waitForURL(/account\.html\?registered=1/, { timeout: 4000 });

    expect(registerStartCalls).toBe(1);
    expect(registerStartPayload).not.toBeNull();
    expect(registerStartPayload?.email).toBe("smoke@example.com");
    expect(registerStartPayload?.nickname).toBe("SmokeUser");
    expect(registerStartPayload?.turnstile_token).toBe("turnstile-token-test");
    expect(registerStartPayload?.captcha_id).toBeUndefined();
    expect(registerStartPayload?.captcha_answer).toBeUndefined();
    expect(nicknameCheckCalls).toBeGreaterThanOrEqual(2);

    expect(registerVerifyCalls).toBe(1);
    expect(registerVerifyPayload).not.toBeNull();
    expect(registerVerifyPayload?.email).toBe("smoke@example.com");
    expect(registerVerifyPayload?.code).toBe("246810");
  });

  test("register page blocks send-code when nickname validation endpoint fails", async ({ page }) => {
    let registerStartCalls = 0;

    await page.addInitScript(() => {
      window.localStorage.setItem("ui_language_v1", "en");
      (window as unknown as { GAME_TURNSTILE_SITE_KEY?: string }).GAME_TURNSTILE_SITE_KEY = "turnstile-site-test";
      (window as unknown as { turnstile?: { render: (host: unknown, options?: Record<string, unknown>) => string; reset: (id: string) => void } }).turnstile = {
        render: (_host: unknown, options?: Record<string, unknown>) => {
          if (options && typeof options.callback === "function") {
            (options.callback as (token: string) => void)("turnstile-token-test");
          }
          return "turnstile-widget-test";
        },
        reset: (_id: string) => {
          return;
        }
      };
    });

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;
      if (pathname.endsWith("/api/register/check-nickname")) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "validation dependency unavailable" })
        });
        return;
      }
      if (pathname.endsWith("/api/register/start")) {
        registerStartCalls += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, expires_in: 600, retry_after: 60 })
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

    await page.fill("#register-email", "smoke@example.com");
    await page.fill("#register-password", "smoke_pass1!");
    await page.fill("#register-nickname", "SmokeUser");
    await page.locator("#register-nickname").blur();
    await expect(page.locator("#register-tip")).toHaveText("");
    await expect(page.locator("#register-nickname")).toHaveClass(/input-error/);
    await expect(page.locator("#register-nickname-feedback")).toContainText("Nickname unavailable, please choose another");

    await page.click("#register-send-code-btn");
    await page.waitForTimeout(200);
    expect(registerStartCalls).toBe(0);
  });
});

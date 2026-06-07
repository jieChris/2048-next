import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("password page supports reset and change password flows", async ({ page }) => {
    let resetStartCalls = 0;
    let resetVerifyCalls = 0;
    let changeCalls = 0;
    let resetStartPayload: Record<string, unknown> | null = null;
    let resetVerifyPayload: Record<string, unknown> | null = null;
    let changePayload: Record<string, unknown> | null = null;
    let changeAuthHeader = "";

    await page.addInitScript(() => {
      window.localStorage.setItem("ui_language_v1", "en");
    });

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

      if (pathname.endsWith("/api/password/reset/start")) {
        resetStartCalls += 1;
        const body = route.request().postDataJSON();
        resetStartPayload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, expires_in: 600, retry_after: 60 })
        });
        return;
      }

      if (pathname.endsWith("/api/password/reset/verify")) {
        resetVerifyCalls += 1;
        const body = route.request().postDataJSON();
        resetVerifyPayload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true })
        });
        return;
      }

      if (pathname.endsWith("/api/password/change")) {
        changeCalls += 1;
        changeAuthHeader = route.request().headers().authorization || "";
        const body = route.request().postDataJSON();
        changePayload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
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

    const response = await page.goto("/password.html?mode=reset", { waitUntil: "domcontentloaded" });
    expect(response, "Password page response should exist").not.toBeNull();
    expect(response?.ok(), "Password page response should be 2xx").toBeTruthy();

    await page.fill("#password-reset-email", "smoke@example.com");
    await page.click("#password-reset-send-code-btn");
    await page.fill("#password-reset-code", "135790");
    await page.fill("#password-reset-new-password", "SmokePass1!");
    await page.click("#password-reset-submit-btn");
    await expect(page.locator("#password-tip")).toContainText("Password reset complete");

    await page.evaluate(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke-token");
    });

    await page.fill("#password-change-old-password", "OldPass1!");
    await page.fill("#password-change-new-password", "NewPass1!");
    await page.click("#password-change-submit-btn");
    await expect(page.locator("#password-tip")).toContainText("Password changed successfully");

    expect(resetStartCalls).toBe(1);
    expect(resetVerifyCalls).toBe(1);
    expect(changeCalls).toBe(1);

    expect(resetStartPayload?.email).toBe("smoke@example.com");
    expect(resetStartPayload?.turnstile_token).toBeUndefined();
    expect(resetStartPayload?.captchaToken).toBeUndefined();

    expect(resetVerifyPayload?.email).toBe("smoke@example.com");
    expect(resetVerifyPayload?.code).toBe("135790");
    expect(resetVerifyPayload?.new_password).toBe("SmokePass1!");

    expect(changePayload?.old_password).toBe("OldPass1!");
    expect(changePayload?.new_password).toBe("NewPass1!");
    expect(changeAuthHeader).toBe("Bearer smoke-token");
  });
});

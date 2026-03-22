import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("account settings page supports nickname/password/logout flows", async ({ page }) => {
    let nicknameCheckCalls = 0;
    let nicknameUpdateCalls = 0;
    let passwordChangeCalls = 0;
    let nicknameUpdatePayload: Record<string, unknown> | null = null;
    let passwordChangePayload: Record<string, unknown> | null = null;

    await page.addInitScript(() => {
      if (!window.location.pathname.endsWith("/account_settings.html")) return;
      window.localStorage.setItem("ui_language_v1", "en");
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "SmokeUser");
    });

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;

      if (pathname.endsWith("/api/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: 42,
              nickname: "SmokeUser",
              email: "smoke@example.com"
            }
          })
        });
        return;
      }

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

      if (pathname.endsWith("/api/me/nickname")) {
        nicknameUpdateCalls += 1;
        const body = route.request().postDataJSON();
        nicknameUpdatePayload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            nickname: String((body as { nickname?: string })?.nickname || "")
          })
        });
        return;
      }

      if (pathname.endsWith("/api/password/change")) {
        passwordChangeCalls += 1;
        const body = route.request().postDataJSON();
        passwordChangePayload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
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
        body: JSON.stringify({ success: true })
      });
    });

    const response = await page.goto("/account_settings.html", { waitUntil: "domcontentloaded" });
    expect(response, "Account settings response should exist").not.toBeNull();
    expect(response?.ok(), "Account settings response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await expect(page.locator("#settings-current-nickname")).toHaveText("SmokeUser");

    await page.fill("#settings-new-nickname", "TakenUser");
    await page.locator("#settings-new-nickname").blur();
    await expect(page.locator("#settings-new-nickname")).toHaveClass(/input-error/);
    await expect(page.locator("#settings-nickname-feedback")).toContainText("Nickname unavailable");

    await page.fill("#settings-new-nickname", "SmokeNew");
    await expect(page.locator("#settings-new-nickname")).not.toHaveClass(/input-error/);
    await expect(page.locator("#settings-nickname-feedback")).toHaveText("");
    await page.locator("#settings-new-nickname").blur();
    await expect(page.locator("#settings-new-nickname")).not.toHaveClass(/input-error/);
    await expect(page.locator("#settings-nickname-feedback")).toHaveText("");
    await page.click("#settings-update-nickname-btn");

    expect(nicknameCheckCalls).toBeGreaterThanOrEqual(2);
    expect(nicknameUpdateCalls).toBe(1);
    expect(nicknameUpdatePayload?.nickname).toBe("SmokeNew");
    await expect(page.locator("#settings-current-nickname")).toHaveText("SmokeNew");
    await page.waitForFunction(() => window.localStorage.getItem("2048_auth_nickname_v1") === "SmokeNew");

    const nicknameSnapshot = await page.evaluate(() => {
      return {
        currentNickname: (document.getElementById("settings-current-nickname") as HTMLElement | null)?.textContent || "",
        storageNickname: window.localStorage.getItem("2048_auth_nickname_v1")
      };
    });
    expect(nicknameSnapshot.currentNickname).toBe("SmokeNew");
    expect(nicknameSnapshot.storageNickname).toBe("SmokeNew");

    await page.fill("#settings-current-password", "old_pass1!");
    await page.fill("#settings-new-password", "new_pass2!");
    await page.click("#settings-change-password-btn");

    expect(passwordChangeCalls).toBe(1);
    expect(passwordChangePayload).not.toBeNull();
    expect(passwordChangePayload?.old_password).toBe("old_pass1!");
    expect(passwordChangePayload?.new_password).toBe("new_pass2!");

    await page.click("#settings-logout-btn");
    await page.waitForURL(/2048\.html/, {
      timeout: 4000,
      waitUntil: "domcontentloaded"
    });

    const logoutSnapshot = await page.evaluate(() => ({
      token: window.localStorage.getItem("2048_auth_token_v1"),
      userId: window.localStorage.getItem("2048_auth_userId_v1"),
      nickname: window.localStorage.getItem("2048_auth_nickname_v1")
    }));
    expect(logoutSnapshot.token).toBeNull();
    expect(logoutSnapshot.userId).toBeNull();
    expect(logoutSnapshot.nickname).toBeNull();
  });
});

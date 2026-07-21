import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("guest login panel uses the approved compact centered layout", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("theme_profile_v1", "mist_cyan"));
    await page.goto("/account_settings.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveAttribute("data-auth-state", "guest");
    const outerStackStyle = await page.locator(".settings-stack").evaluate((stack) => {
      const style = getComputedStyle(stack);
      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
        padding: style.padding
      };
    });
    expect(outerStackStyle).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      backgroundImage: "none",
      borderWidth: "0px",
      boxShadow: "none",
      padding: "0px"
    });
    const authSectionStyle = await page.locator(".settings-auth-section").evaluate((section) => {
      const style = getComputedStyle(section);
      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow
      };
    });
    expect(authSectionStyle).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      backgroundImage: "none",
      borderWidth: "0px",
      boxShadow: "none"
    });
    await expect(page.locator("#account-auth-subtitle")).toBeHidden();
    await expect(page.locator("#account-auth-heading")).toHaveCSS("font-size", "25px");
    await expect(page.locator("#account-auth-state-tag")).toHaveCSS("padding-left", "12px");
    await expect(page.locator("#account-auth-state-tag")).toHaveCSS("padding-right", "12px");
    await expect(page.locator("#account-auth-state-tag")).toHaveCSS("margin-right", "15px");
    await expect(page.locator("#account-auth-state-tag")).toHaveCSS("background-color", "rgba(47, 134, 160, 0.1)");
    await expect(page.locator("#account-auth-state-tag")).toHaveCSS("color", "rgb(37, 107, 125)");
    await expect(page.locator("#account-auth-heading")).toHaveCSS("padding-top", "6px");
    await expect(page.locator("#account-auth-heading")).toHaveCSS("margin-left", "14px");
    await expect(page.locator("#settings-subtitle")).toBeHidden();
    await expect(page.locator("#settings-kicker")).toBeHidden();
    await expect(page.locator("#home-user-display")).toBeHidden();
    await expect(page.locator("#settings-nav-user")).toBeHidden();
    await expect(page.locator(".account-auth-form-surface")).toHaveCSS("padding-top", "19px");
    await expect(page.locator(".account-auth-form-surface")).toHaveCSS("padding-bottom", "19px");
    await expect(page.locator(".account-auth-form-surface > #account-action-row")).toHaveCount(1);
    await expect(page.locator("#account-action-row")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator("#account-action-row")).toHaveCSS("border-width", "0px");
    await expect(page.locator("#account-action-row")).toHaveCSS("box-shadow", "none");
    await expect(page.locator("#account-action-row")).toHaveCSS("padding-bottom", "12px");
    await expect(page.locator('link[href^="style/account_settings_page.css"]')).toHaveAttribute(
      "href",
      "style/account_settings_page.css?v=20260720-unified-auth-v3"
    );

    const alignment = await page.locator(".settings-auth-section").evaluate((section) => {
      const form = section.querySelector<HTMLElement>(".account-auth-form-surface")!;
      const actions = section.querySelector<HTMLElement>("#account-action-row")!;
      const sectionRect = section.getBoundingClientRect();
      const formRect = form.getBoundingClientRect();
      const actionRect = actions.getBoundingClientRect();
      return {
        centerDelta: Math.abs(
          (sectionRect.left + sectionRect.width / 2) - (formRect.left + formRect.width / 2)
        ),
        actionInset: Math.round(actionRect.left - formRect.left)
      };
    });
    expect(alignment.centerDelta).toBeLessThanOrEqual(1);
    expect(alignment.actionInset).toBeGreaterThan(0);
  });

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
    await expect(page.locator("#settings-nav-user")).toBeVisible();
    await expect(page.locator("#settings-nav-user")).toHaveAttribute("href", "user.html");

    const centeredPanels = await page.locator(".settings-stack").evaluate((card) => {
      const cardRect = card.getBoundingClientRect();
      const panels = [
        card.querySelector<HTMLElement>(".account-user-card"),
        ...Array.from(card.querySelectorAll<HTMLElement>("[data-settings-account-only]"))
      ].filter((panel): panel is HTMLElement => Boolean(panel));

      return panels.map((panel) => {
        const rect = panel.getBoundingClientRect();
        return {
          centerDelta: Math.abs((cardRect.left + cardRect.width / 2) - (rect.left + rect.width / 2)),
          width: rect.width
        };
      });
    });

    expect(centeredPanels).toHaveLength(4);
    expect(centeredPanels.every((panel) => panel.centerDelta <= 1)).toBeTruthy();
    expect(centeredPanels.every((panel) => panel.width <= 560)).toBeTruthy();

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

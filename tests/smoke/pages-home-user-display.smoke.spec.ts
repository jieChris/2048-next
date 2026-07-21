import { expect, test } from "@playwright/test";

test.describe("Home user display", () => {
  test("shows guest text above the logo when logged out", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("2048_auth_userId_v1");
      window.localStorage.removeItem("2048_auth_nickname_v1");
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    await expect(page.locator("#home-user-display")).toHaveText("游客");
    await expect(page.locator("#top-announcement-btn")).toBeHidden();
    await expect(page.locator("#top-user-profile-btn")).toHaveAttribute("href", "account_settings.html");
  });

  test("switches the profile button between text and icon modes", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("settings_top_button_style_v1", "text");
    });

    await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveAttribute("data-top-button-style", "text");
    await expect(page.locator("#top-user-profile-btn")).toHaveText("用户");
    await expect(page.locator("#top-user-profile-btn svg")).toHaveCount(0);
    await expect(page.locator("#top-mobile-hint-btn")).toBeHidden();
    await expect(page.locator("#top-mobile-undo-btn")).toBeHidden();

    const textButtonLayout = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>(".top-action-buttons .top-action-btn"))
        .filter((button) => button.offsetParent !== null)
        .map((button) => ({
          height: button.getBoundingClientRect().height,
          borderRadius: getComputedStyle(button).borderRadius,
          overflows: button.scrollWidth > button.clientWidth
        }))
    );
    expect(textButtonLayout.length).toBeGreaterThan(0);
    expect(textButtonLayout.every(({ height }) => height === 50)).toBe(true);
    expect(textButtonLayout.every(({ borderRadius }) => borderRadius === "12px")).toBe(true);
    expect(textButtonLayout.every(({ overflows }) => !overflows)).toBe(true);

    await page.evaluate(() => (window as any).CoreTopButtonStyleRuntime.applyTopButtonStyle("icon"));
    await expect(page.locator("#top-user-profile-btn svg")).toHaveCount(1);
  });

  test("shows stored nickname on the action row and aligns the logo with scores", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_userId_v1", "19");
      window.localStorage.setItem("2048_auth_nickname_v1", "SmokeUser");
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    await expect(page.locator("#home-user-display")).toHaveText("SmokeUser");
    await expect(page.locator("#top-user-profile-btn")).toHaveAttribute(
      "href",
      "user.html?id=19&nickname=SmokeUser"
    );
    await page.waitForFunction(() => {
      const label = document.getElementById("home-user-display");
      const topActions = document.querySelector(".top-action-buttons");
      const labelRect = label?.getBoundingClientRect();
      const topActionsRect = topActions?.getBoundingClientRect();
      if (!labelRect || !topActionsRect) return false;
      return Math.abs(labelRect.height - topActionsRect.height) <= 1;
    });

    const alignment = await page.evaluate(() => {
      const label = document.getElementById("home-user-display");
      const logo = document.querySelector(".site-logo");
      const score = document.querySelector(".score-container");
      const topActions = document.querySelector(".top-action-buttons");
      const heading = document.querySelector(".heading");
      const labelRect = label?.getBoundingClientRect();
      const logoRect = logo?.getBoundingClientRect();
      const scoreRect = score?.getBoundingClientRect();
      const topActionsRect = topActions?.getBoundingClientRect();
      const headingRect = heading?.getBoundingClientRect();
      return {
        labelLeft: labelRect?.left ?? null,
        labelTop: labelRect?.top ?? null,
        labelHeight: labelRect?.height ?? null,
        labelWidth: labelRect?.width ?? null,
        topActionsTop: topActionsRect?.top ?? null,
        topActionsHeight: topActionsRect?.height ?? null,
        logoTop: logoRect?.top ?? null,
        logoLeft: logoRect?.left ?? null,
        scoreTop: scoreRect?.top ?? null,
        headingWidth: headingRect?.width ?? null
      };
    });

    expect(alignment.labelLeft).not.toBeNull();
    expect(alignment.logoLeft).not.toBeNull();
    expect(alignment.topActionsTop).not.toBeNull();
    expect(alignment.scoreTop).not.toBeNull();
    expect(Math.abs((Number(alignment.labelLeft) - 25) - Number(alignment.logoLeft))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(alignment.labelTop) - Number(alignment.topActionsTop))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(alignment.labelHeight) - Number(alignment.topActionsHeight))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(alignment.logoTop) - Number(alignment.scoreTop))).toBeLessThanOrEqual(1);
    expect(Number(alignment.labelWidth)).toBeLessThan(Number(alignment.headingWidth) / 2);
  });

  test("does not show the account badge on hub and mode-selection pages", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_userId_v1", "19");
      window.localStorage.setItem("2048_auth_nickname_v1", "Jay");
    });

    for (const path of ["/account.html", "/palette.html", "/modes.html", "/medal-wall.html"]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response, `${path} response should exist`).not.toBeNull();
      expect(response?.ok(), `${path} response should be 2xx`).toBeTruthy();
      await expect(page.locator("#home-user-display")).toHaveCount(0);
    }
  });

  test("aligns the account badge with the game header on play pages", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_userId_v1", "19");
      window.localStorage.setItem("2048_auth_nickname_v1", "Jay");
    });

    const response = await page.goto("/play.html?mode_key=board_3x3_pow2_no_undo", { waitUntil: "domcontentloaded" });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();

    const badge = page.locator("#home-user-display");
    await expect(badge).toHaveText("Jay");
    await expect(badge).not.toHaveClass(/home-user-display--global/);
    await expect(page.locator("#top-user-profile-btn")).toHaveAttribute(
      "href",
      "user.html?id=19&nickname=Jay"
    );
    await expect(page.locator("#top-user-profile-btn svg")).toHaveCount(1);

    const layout = await page.evaluate(() => {
      const label = document.getElementById("home-user-display");
      const logo = document.querySelector(".site-logo");
      const labelRect = label?.getBoundingClientRect();
      const logoRect = logo?.getBoundingClientRect();
      return {
        labelLeft: labelRect?.left ?? null,
        logoLeft: logoRect?.left ?? null,
        labelTop: labelRect?.top ?? null,
        logoTop: logoRect?.top ?? null
      };
    });

    expect(layout.labelLeft).not.toBeNull();
    expect(layout.logoLeft).not.toBeNull();
    expect(Math.abs((Number(layout.labelLeft) - 25) - Number(layout.logoLeft))).toBeLessThanOrEqual(1);
    expect(Number(layout.labelTop)).toBeLessThan(Number(layout.logoTop));
  });

  test("does not show the account badge on practice pages", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_userId_v1", "19");
      window.localStorage.setItem("2048_auth_nickname_v1", "Jay");
    });

    const response = await page.goto("/Practice_board.html?practice_fresh=1", { waitUntil: "domcontentloaded" });
    expect(response, "Practice response should exist").not.toBeNull();
    expect(response?.ok(), "Practice response should be 2xx").toBeTruthy();

    await expect(page.locator("#home-user-display")).toHaveCount(0);
    await expect(page.locator("#top-user-profile-btn")).toHaveCount(0);
  });

  test("keeps long score values fully visible", async ({ page }) => {
    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && !!manager.actuator;
    });
    await page.evaluate(async () => {
      const fontSet = document.fonts;
      if (fontSet && typeof fontSet.ready?.then === "function") {
        await fontSet.ready;
      }
    });

    const scoreboard = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const measureSevenDigitWidth = () => {
        const source = document.querySelector(".score-container");
        if (!(source instanceof HTMLElement)) return null;
        const probe = document.createElement("span");
        const styles = window.getComputedStyle(source);
        probe.textContent = "0000000";
        probe.style.position = "absolute";
        probe.style.visibility = "hidden";
        probe.style.whiteSpace = "nowrap";
        probe.style.fontFamily = styles.fontFamily;
        probe.style.fontWeight = styles.fontWeight;
        probe.style.fontSize = "25px";
        probe.style.lineHeight = styles.lineHeight;
        document.body.appendChild(probe);
        const width = probe.getBoundingClientRect().width + 20;
        probe.remove();
        return width;
      };

      const readBox = (selector: string) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) return null;
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent || "",
          width: rect.width,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          overflow: window.getComputedStyle(element).overflow
        };
      };

      const sevenDigitWidth = measureSevenDigitWidth();
      const initial = {
        score: readBox(".score-container"),
        best: readBox(".best-container")
      };
      manager.actuator.updateScore(1234567);
      manager.actuator.updateBestScore(7654321);

      return {
        sevenDigitWidth,
        initial,
        score: readBox(".score-container"),
        best: readBox(".best-container")
      };
    });

    expect(scoreboard.score?.text).toContain("1234567");
    expect(scoreboard.best?.text).toContain("7654321");
    expect(Number(scoreboard.score?.scrollWidth || 0)).toBeLessThanOrEqual(Number(scoreboard.score?.clientWidth || 0));
    expect(Number(scoreboard.best?.scrollWidth || 0)).toBeLessThanOrEqual(Number(scoreboard.best?.clientWidth || 0));
    expect(Math.abs(Number(scoreboard.score?.width || 0) - Number(scoreboard.best?.width || 0))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(scoreboard.score?.width || 0) - Number(scoreboard.sevenDigitWidth || 0))).toBeLessThanOrEqual(4);
    expect(Math.abs(Number(scoreboard.initial.score?.width || 0) - Number(scoreboard.score?.width || 0))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(scoreboard.initial.best?.width || 0) - Number(scoreboard.best?.width || 0))).toBeLessThanOrEqual(1);
  });

  test("mobile score boxes split the row with a 3px center gap", async ({ page }) => {
    await page.setViewportSize({ width: 543, height: 837 });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    const layout = await page.evaluate(() => {
      const score = document.querySelector(".score-container");
      const best = document.querySelector(".best-container");
      const row = document.querySelector(".scores-container");
      const scoreRect = score?.getBoundingClientRect();
      const bestRect = best?.getBoundingClientRect();
      const rowRect = row?.getBoundingClientRect();
      return {
        scoreWidth: scoreRect?.width ?? null,
        bestWidth: bestRect?.width ?? null,
        gap: scoreRect && bestRect ? bestRect.left - scoreRect.right : null,
        rowWidth: rowRect?.width ?? null,
        combinedWidth: scoreRect && bestRect ? bestRect.right - scoreRect.left : null
      };
    });

    expect(layout.scoreWidth).not.toBeNull();
    expect(layout.bestWidth).not.toBeNull();
    expect(layout.gap).not.toBeNull();
    expect(Math.abs(Number(layout.scoreWidth) - Number(layout.bestWidth))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(layout.gap) - 3)).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(layout.combinedWidth) - Number(layout.rowWidth))).toBeLessThanOrEqual(1);
  });

  test("settings modal does not show duplicate navigation links", async ({ page }) => {
    await page.addInitScript(() => {
    });

    const response = await page.goto("/2048.html?settings-nav-smoke=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    const settingsBtn = page.locator("#top-settings-btn");
    await expect(settingsBtn).toBeVisible();
    await page.waitForFunction(() => typeof (window as any).openSettingsModal === "function");
    await page.evaluate(() => {
      (window as any).openSettingsModal();
    });
    await expect(page.locator("#settings-modal")).toHaveCSS("display", "flex");

    await expect(page.locator("#toolkit-entry-row")).toHaveCount(0);
    await expect(page.locator("#toolkit-palette-link")).toHaveCount(0);
    await expect(page.locator("#toolkit-account-link")).toHaveCount(0);
  });

  test("mobile board starts after the ranked session request without layout regression", async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.route("**/api/ranked-session/start", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            mode_key: "standard_4x4_pow2_no_undo",
            challenge_id: "slow-ranked-layout",
            seed: 1357,
            ranked_session_token: "slow-ranked-layout-token",
            issued_at: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
          }
        })
      });
    });
    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });
    await page.route("**/api/user/**/records**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });
    await page.route("**/api/ranked-checkpoint**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: null })
      });
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "slow_ranked_token");
      window.localStorage.setItem("2048_auth_userId_v1", "12");
      window.localStorage.removeItem("ranked_session_active:v1:standard_4x4_pow2_no_undo");
      window.localStorage.removeItem("ranked_session_prefetch:v1:standard_4x4_pow2_no_undo");
    });

    const response = await page.goto("/2048.html?slow-ranked-layout-smoke=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return !!manager && !!manager.actuator;
      },
      null,
      { timeout: 5_000 }
    );

    const layout = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        const bounds = element?.getBoundingClientRect();
        if (!bounds) return null;
        return {
          width: bounds.width,
          height: bounds.height
        };
      };
      return {
        game: rect(".game-container"),
        grid: rect(".grid-container"),
        firstCell: rect(".grid-cell"),
        tileContainer: rect(".tile-container"),
        tileCount: document.querySelectorAll(".tile").length
      };
    });

    expect(layout.game?.width).toBeGreaterThanOrEqual(390);
    expect(layout.grid?.width).toBeGreaterThanOrEqual(370);
    expect(layout.tileContainer?.width).toBeGreaterThanOrEqual(370);
    expect(layout.firstCell?.width).toBeGreaterThanOrEqual(80);
    expect(layout.tileCount).toBeGreaterThan(0);
  });

  test("reloads restored guest-ranked page after login before the next board is played", async ({ page }) => {
    let sessionStartRequests = 0;
    await page.route("**/api/ranked-session/start", async (route) => {
      sessionStartRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            mode_key: "standard_4x4_pow2_no_undo",
            challenge_id: "auth-transition-ranked",
            seed: 2468,
            ranked_session_token: "auth-transition-token",
            issued_at: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
          }
        })
      });
    });
    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });
    await page.route("**/api/user/**/records**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });
    await page.route("**/api/ranked-checkpoint**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: null })
      });
    });
    await page.addInitScript(() => {
      if (window.sessionStorage.getItem("auth_transition_smoke_cleaned") === "1") return;
      window.sessionStorage.setItem("auth_transition_smoke_cleaned", "1");
      window.localStorage.removeItem("2048_auth_token_v1");
      window.localStorage.removeItem("2048_auth_userId_v1");
      window.localStorage.removeItem("ranked_session_active:v1:standard_4x4_pow2_no_undo");
      window.localStorage.removeItem("ranked_session_prefetch:v1:standard_4x4_pow2_no_undo");
    });

    const response = await page.goto("/2048.html?auth-transition-smoke=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await page.waitForFunction(() => !!(window as any).game_manager);
    expect(sessionStartRequests).toBe(0);

    const rankedSessionRequest = page.waitForRequest((request) =>
      new URL(request.url()).pathname.endsWith("/api/ranked-session/start")
    );
    await page.evaluate(() => {
      window.localStorage.setItem("2048_auth_token_v1", "auth-transition-login-token");
      window.localStorage.setItem("2048_auth_userId_v1", "17");
      window.dispatchEvent(new Event("pageshow"));
    });
    await rankedSessionRequest;

    await page.waitForFunction(
      () => {
        const context = (window as any).GAME_CHALLENGE_CONTEXT;
        return context && context.ranked_session_token === "auth-transition-token";
      },
      null,
      { timeout: 5_000 }
    );
    expect(sessionStartRequests).toBeGreaterThan(0);
  });

  test("mobile static board shell fills the board before scripts run", async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.route("**/*.js", async (route) => {
      await route.abort();
    });

    const response = await page.goto("/2048.html?static-board-shell-smoke=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    const layout = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        const bounds = element?.getBoundingClientRect();
        if (!bounds) return null;
        return {
          width: bounds.width,
          height: bounds.height
        };
      };
      return {
        game: rect(".game-container"),
        grid: rect(".grid-container"),
        firstCell: rect(".grid-cell")
      };
    });

    expect(layout.game?.width).toBeGreaterThanOrEqual(390);
    expect(layout.game?.height).toBeGreaterThanOrEqual(390);
    expect(layout.grid?.width).toBeGreaterThanOrEqual(370);
    expect(layout.grid?.height).toBeGreaterThanOrEqual(370);
    expect(layout.firstCell?.width).toBeGreaterThanOrEqual(80);
    expect(layout.firstCell?.height).toBeGreaterThanOrEqual(80);
  });

  test("mobile board starts before deferred home scripts finish loading", async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.route("**/js/announcement_manager.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      await route.continue();
    });
    await page.route("**/js/online_leaderboard_runtime.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      await route.continue();
    });

    const response = await page.goto("/2048.html?slow-deferred-scripts-smoke=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return !!manager && !!manager.actuator;
      },
      null,
      { timeout: 3_000 }
    );

    const layout = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        const bounds = element?.getBoundingClientRect();
        if (!bounds) return null;
        return {
          width: bounds.width,
          height: bounds.height
        };
      };
      return {
        grid: rect(".grid-container"),
        tileContainer: rect(".tile-container"),
        tileCount: document.querySelectorAll(".tile").length
      };
    });

    expect(layout.grid?.width).toBeGreaterThanOrEqual(370);
    expect(layout.tileContainer?.width).toBeGreaterThanOrEqual(370);
    expect(layout.tileCount).toBeGreaterThan(0);
  });
});

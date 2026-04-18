import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("home page exposes shared background music and night mode toggles", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("home_guide_seen_v1", "1");
      window.localStorage.setItem("settings_bgm_enabled_v1", "0");
      window.localStorage.setItem("settings_night_background_enabled_v1", "0");
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.removeItem("settings_night_theme_auto_applied_v1");
      window.localStorage.removeItem("settings_night_theme_pending_v1");
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Home response should exist").not.toBeNull();
    expect(response?.ok(), "Home response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const bgm = (window as any).CoreBgmRuntime;
      const night = (window as any).CoreNightModeRuntime;
      return Boolean(
        bgm &&
          typeof bgm.setBgmEnabled === "function" &&
          typeof bgm.getBgmRuntimeSnapshot === "function" &&
          night &&
          typeof night.setNightBackgroundEnabled === "function" &&
          typeof night.getNightModeRuntimeSnapshot === "function" &&
          typeof (window as any).openSettingsModal === "function"
      );
    }, null, { timeout: 15000 });

    await page.evaluate(() => {
      (window as any).CoreBgmRuntime.setBgmEnabled(false);
      (window as any).CoreNightModeRuntime.setNightBackgroundEnabled(false);
      (window as any).openSettingsModal();
    });

    await expect(page.locator("#settings-modal")).toHaveCSS("display", "flex");
    await expect(page.locator("label.settings-switch[for='bgm-toggle']")).toBeVisible();
    await expect(page.locator("label.settings-switch[for='night-bg-toggle']")).toBeVisible();
    await expect(page.locator("#night-bg-settings-row .settings-toggle-title")).toHaveText(
      "夜间模式"
    );
    await expect(page.locator("#home-guide-trigger-btn")).toHaveCount(0);

    await page.click("label.settings-switch[for='bgm-toggle']");
    await page.waitForFunction(() => {
      return window.localStorage.getItem("settings_bgm_enabled_v1") === "1";
    });
    await expect(page.locator("#bgm-toggle")).toBeChecked();

    const afterBgmEnable = await page.evaluate(() => {
      return (window as any).CoreBgmRuntime.getBgmRuntimeSnapshot();
    });

    expect(afterBgmEnable.enabled).toBe(true);
    expect(afterBgmEnable.hasAudio).toBe(true);

    await page.click("label.settings-switch[for='night-bg-toggle']");
    await page.waitForFunction(() => {
      return window.localStorage.getItem("settings_night_background_enabled_v1") === "1";
    });
    await expect(page.locator("#night-bg-toggle")).toBeChecked();

    const afterNightEnable = await page.evaluate(() => {
      return {
        night: (window as any).CoreNightModeRuntime.getNightModeRuntimeSnapshot(),
        currentTheme:
          typeof (window as any).ThemeManager?.getCurrentTheme === "function"
            ? (window as any).ThemeManager.getCurrentTheme()
            : "",
        savedTheme: window.localStorage.getItem("theme_profile_v1"),
        autoThemeApplied: window.localStorage.getItem("settings_night_theme_auto_applied_v1"),
        autoThemePending: window.localStorage.getItem("settings_night_theme_pending_v1")
      };
    });

    expect(afterNightEnable.night.enabled).toBe(true);
    expect(afterNightEnable.night.dataAttribute).toBe("1");
    expect(afterNightEnable.night.hasStyleTag).toBe(true);
    expect(afterNightEnable.currentTheme).toBe("midnight_nebula");
    expect(afterNightEnable.savedTheme).toBe("midnight_nebula");
    expect(afterNightEnable.autoThemeApplied).toBe("1");
    expect(afterNightEnable.autoThemePending).toBe("0");

    const nightBoardSnapshot = await page.evaluate(() => {
      const gameContainer = document.querySelector(".game-container");
      const gridCell = document.querySelector(".grid-cell");
      return {
        gameContainerBackgroundImage: gameContainer ? window.getComputedStyle(gameContainer).backgroundImage : "",
        gridCellBackgroundColor: gridCell ? window.getComputedStyle(gridCell).backgroundColor : ""
      };
    });

    expect(nightBoardSnapshot.gameContainerBackgroundImage).toContain("linear-gradient");
    expect(nightBoardSnapshot.gridCellBackgroundColor).toContain("176, 192, 214");

    await page.evaluate(() => {
      (window as any).ThemeManager.applyTheme("ocean");
    });
    await page.waitForFunction(() => {
      return window.localStorage.getItem("theme_profile_v1") === "ocean";
    });

    await page.click("label.settings-switch[for='bgm-toggle']");
    await page.waitForFunction(() => {
      return window.localStorage.getItem("settings_bgm_enabled_v1") === "0";
    });
    await expect(page.locator("#bgm-toggle")).not.toBeChecked();

    await page.click("label.settings-switch[for='night-bg-toggle']");
    await page.waitForFunction(() => {
      return window.localStorage.getItem("settings_night_background_enabled_v1") === "0";
    });
    await expect(page.locator("#night-bg-toggle")).not.toBeChecked();

    const finalNightSnapshot = await page.evaluate(() => {
      return (window as any).CoreNightModeRuntime.getNightModeRuntimeSnapshot();
    });

    expect(finalNightSnapshot.enabled).toBe(false);
    expect(finalNightSnapshot.dataAttribute).toBe("");

    await page.click("label.settings-switch[for='night-bg-toggle']");
    await page.waitForFunction(() => {
      return window.localStorage.getItem("settings_night_background_enabled_v1") === "1";
    });
    await expect(page.locator("#night-bg-toggle")).toBeChecked();

    const secondNightEnable = await page.evaluate(() => {
      return {
        currentTheme:
          typeof (window as any).ThemeManager?.getCurrentTheme === "function"
            ? (window as any).ThemeManager.getCurrentTheme()
            : "",
        savedTheme: window.localStorage.getItem("theme_profile_v1"),
        autoThemeApplied: window.localStorage.getItem("settings_night_theme_auto_applied_v1")
      };
    });

    expect(secondNightEnable.currentTheme).toBe("ocean");
    expect(secondNightEnable.savedTheme).toBe("ocean");
    expect(secondNightEnable.autoThemeApplied).toBe("1");
  });

  test("modes page follows saved night background preference", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("settings_night_background_enabled_v1", "1");
    });

    const response = await page.goto("/modes.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Modes response should exist").not.toBeNull();
    expect(response?.ok(), "Modes response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      return document.documentElement.getAttribute("data-night-background") === "1";
    }, null, { timeout: 15000 });

    const snapshot = await page.evaluate(() => {
      const groupTitle = document.querySelector(".mode-group-title");
      return {
        dataAttribute: document.documentElement.getAttribute("data-night-background") || "",
        groupTitleColor: groupTitle ? window.getComputedStyle(groupTitle).color : "",
        rootBackgroundImage: window.getComputedStyle(document.documentElement).backgroundImage,
        bodyBeforeDisplay: window.getComputedStyle(document.body, "::before").display,
        bodyAfterDisplay: window.getComputedStyle(document.body, "::after").display
      };
    });

    expect(snapshot.dataAttribute).toBe("1");
    expect(snapshot.groupTitleColor).toContain("236, 226, 211");
    expect(snapshot.rootBackgroundImage).toContain("linear-gradient");
    expect(snapshot.bodyBeforeDisplay).toBe("none");
    expect(snapshot.bodyAfterDisplay).toBe("none");
  });

  test("account page follows night mode preference and exposes the guide entry", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("settings_night_background_enabled_v1", "1");
      window.localStorage.setItem("home_guide_seen_v1", "1");
    });

    const response = await page.goto("/account.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Account response should exist").not.toBeNull();
    expect(response?.ok(), "Account response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      return (
        document.documentElement.getAttribute("data-night-background") === "1" &&
        document.body?.getAttribute("data-i18n-ready") === "1"
      );
    }, null, { timeout: 15000 });

    await expect(page.locator("#account-guide-title")).toHaveText("新手指引");
    await expect(page.locator("#account-open-guide-btn")).toHaveText("打开指引");

    const snapshot = await page.evaluate(() => {
      const guideCard = document.querySelector(".account-guide-card");
      return {
        dataAttribute: document.documentElement.getAttribute("data-night-background") || "",
        guideCardBackgroundImage: guideCard
          ? window.getComputedStyle(guideCard).backgroundImage
          : "",
        guideCardBorderColor: guideCard ? window.getComputedStyle(guideCard).borderColor : ""
      };
    });

    expect(snapshot.dataAttribute).toBe("1");
    expect(snapshot.guideCardBackgroundImage).toContain("linear-gradient");
    expect(snapshot.guideCardBorderColor).toContain("181, 198, 221");
  });

  test("account guide entry reopens the home guide flow on the home page", async ({ page }) => {
    const response = await page.goto("/account.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Account response should exist").not.toBeNull();
    expect(response?.ok(), "Account response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.evaluate(() => {
      window.localStorage.setItem("home_guide_seen_v1", "1");
    });

    await page.waitForFunction(() => {
      return document.body?.getAttribute("data-i18n-ready") === "1";
    }, null, { timeout: 15000 });

    await page.click("#account-open-guide-btn");
    await page.waitForURL("**/2048.html", { timeout: 15000 });
    await page.waitForFunction(() => {
      return (
        window.localStorage.getItem("home_guide_seen_v1") === "0" &&
        !!(window as any).CoreHomeGuideRuntime &&
        !!(window as any).CoreHomeGuideStartupHostRuntime &&
        location.pathname.endsWith("/2048.html")
      );
    }, null, { timeout: 15000 });
  });

  test("night preference reaches utility and direct pages with darkened key surfaces", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("settings_night_background_enabled_v1", "1");
      window.localStorage.setItem("home_guide_seen_v1", "1");
    });

    const targets = [
      { url: "/account_settings.html", selector: ".settings-card" },
      { url: "/replay.html", selector: ".replay-metric-card" },
      { url: "/palette.html", selector: ".theme-selection-col" },
      { url: "/history.html", selector: ".portal-card" },
      { url: "/relay_5x5.html", selector: ".relay-panel" },
      { url: "/Practice_board.html?practice_fresh=1", selector: ".dashboard-box" }
    ];

    for (const target of targets) {
      const response = await page.goto(target.url, {
        waitUntil: "domcontentloaded"
      });
      expect(response, `${target.url} response should exist`).not.toBeNull();
      expect(response?.ok(), `${target.url} response should be 2xx`).toBeTruthy();
      await expect(page.locator(target.selector).first()).toBeVisible();
      await page.waitForFunction(() => {
        return document.documentElement.getAttribute("data-night-background") === "1";
      }, null, { timeout: 15000 });

      const snapshot = await page.evaluate((selector) => {
        const element = document.querySelector(String(selector)) as HTMLElement | null;
        const style = element ? window.getComputedStyle(element) : null;
        return {
          dataAttribute: document.documentElement.getAttribute("data-night-background") || "",
          backgroundImage: style ? style.backgroundImage : "",
          backgroundColor: style ? style.backgroundColor : ""
        };
      }, target.selector);

      expect(snapshot.dataAttribute).toBe("1");
      expect(
        snapshot.backgroundImage.includes("linear-gradient") ||
          snapshot.backgroundColor !== "rgba(0, 0, 0, 0)"
      ).toBe(true);
    }
  });
});

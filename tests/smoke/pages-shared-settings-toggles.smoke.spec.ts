import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("night mode toggle stays synced across two pages", async ({ page }) => {
    const context = page.context();
    await context.addInitScript(() => {
      window.localStorage.setItem("settings_night_background_enabled_v1", "0");
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.removeItem("settings_night_theme_auto_applied_v1");
      window.localStorage.removeItem("settings_night_theme_pending_v1");
    });

    const secondPage = await context.newPage();

    const firstResponse = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(firstResponse, "Home response should exist").not.toBeNull();
    expect(firstResponse?.ok(), "Home response should be 2xx").toBeTruthy();

    const secondResponse = await secondPage.goto("/Practice_board.html", {
      waitUntil: "domcontentloaded"
    });
    expect(secondResponse, "Practice board response should exist").not.toBeNull();
    expect(secondResponse?.ok(), "Practice board response should be 2xx").toBeTruthy();

    await page.waitForFunction(() => {
      return (
        !!(window as any).CoreNightModeRuntime &&
        typeof (window as any).openSettingsModal === "function"
      );
    }, null, { timeout: 15000 });
    await secondPage.waitForFunction(() => {
      return (
        !!(window as any).CoreNightModeRuntime &&
        typeof (window as any).openSettingsModal === "function"
      );
    }, null, { timeout: 15000 });

    await page.evaluate(() => {
      (window as any).CoreNightModeRuntime.setNightBackgroundEnabled(false);
      (window as any).openSettingsModal();
    });
    await secondPage.evaluate(() => {
      (window as any).CoreNightModeRuntime.setNightBackgroundEnabled(false);
      (window as any).openSettingsModal();
    });

    await expect(page.locator("#night-bg-toggle")).not.toBeChecked();
    await expect(secondPage.locator("#night-bg-toggle")).not.toBeChecked();

    await page.click("label.settings-switch[for='night-bg-toggle']");
    await page.waitForFunction(() => {
      return window.localStorage.getItem("settings_night_background_enabled_v1") === "1";
    });
    await expect(page.locator("#night-bg-toggle")).toBeChecked();
    await expect(secondPage.locator("#night-bg-toggle")).toBeChecked();

    await secondPage.click("label.settings-switch[for='night-bg-toggle']");
    await secondPage.waitForFunction(() => {
      return window.localStorage.getItem("settings_night_background_enabled_v1") === "0";
    });
    await expect(secondPage.locator("#night-bg-toggle")).not.toBeChecked();
    await expect(page.locator("#night-bg-toggle")).not.toBeChecked();

    await secondPage.close();
  });

  test("home page exposes shared background music and night mode toggles", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("settings_bgm_enabled_v1", "0");
      window.localStorage.setItem("settings_night_background_enabled_v1", "0");
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
      window.localStorage.removeItem("settings_night_theme_auto_applied_v1");
      window.localStorage.removeItem("settings_night_theme_pending_v1");
      window.localStorage.removeItem("settings_day_theme_profile_v1");
      window.localStorage.removeItem("settings_night_theme_profile_v1");
      window.localStorage.removeItem("settings_day_tile_palette_v1");
      window.localStorage.removeItem("settings_night_tile_palette_v1");
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

    const timerToggleLayout = await page.evaluate(() => {
      const timerRow = document.querySelector("#timer-module-view-toggle")?.closest<HTMLElement>(".settings-row");
      const bgmRow = document.getElementById("bgm-settings-row");
      return {
        inlineWidth: timerRow?.style.width || "",
        timerWidth: Math.round(timerRow?.getBoundingClientRect().width || 0),
        siblingWidth: Math.round(bgmRow?.getBoundingClientRect().width || 0)
      };
    });
    expect(timerToggleLayout.inlineWidth).toBe("");
    expect(timerToggleLayout.timerWidth).toBe(timerToggleLayout.siblingWidth);

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
        currentTilePalette:
          typeof (window as any).ThemeManager?.getActiveTilePaletteId === "function"
            ? (window as any).ThemeManager.getActiveTilePaletteId()
            : "",
        savedTheme: window.localStorage.getItem("theme_profile_v1"),
        savedTilePalette: window.localStorage.getItem("tile_palette_active_v1"),
        autoThemeApplied: window.localStorage.getItem("settings_night_theme_auto_applied_v1"),
        autoThemePending: window.localStorage.getItem("settings_night_theme_pending_v1"),
        dayTheme: window.localStorage.getItem("settings_day_theme_profile_v1"),
        nightTheme: window.localStorage.getItem("settings_night_theme_profile_v1"),
        dayTilePalette: window.localStorage.getItem("settings_day_tile_palette_v1"),
        nightTilePalette: window.localStorage.getItem("settings_night_tile_palette_v1")
      };
    });

    expect(afterNightEnable.night.enabled).toBe(true);
    expect(afterNightEnable.night.dataAttribute).toBe("1");
    expect(afterNightEnable.night.hasStyleTag).toBe(true);
    expect(afterNightEnable.currentTheme).toBe("classic");
    expect(afterNightEnable.currentTilePalette).toBe("follow-theme");
    expect(afterNightEnable.savedTheme).toBe("classic");
    expect(afterNightEnable.savedTilePalette).toBe("follow-theme");
    expect(afterNightEnable.autoThemeApplied).toBe("1");
    expect(afterNightEnable.autoThemePending).toBe("0");
    expect(afterNightEnable.dayTheme).toBe("classic");
    expect(afterNightEnable.nightTheme).toBe("classic");
    expect(afterNightEnable.dayTilePalette).toBe("follow-theme");
    expect(afterNightEnable.nightTilePalette).toBe("follow-theme");

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
      (window as any).ThemeManager.setActiveTilePalette("cold-cyan-steps");
    });
    await page.waitForFunction(() => {
      return (
        window.localStorage.getItem("theme_profile_v1") === "ocean" &&
        window.localStorage.getItem("tile_palette_active_v1") === "cold-cyan-steps" &&
        window.localStorage.getItem("settings_night_theme_profile_v1") === "ocean" &&
        window.localStorage.getItem("settings_night_tile_palette_v1") === "cold-cyan-steps"
      );
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
      return {
        night: (window as any).CoreNightModeRuntime.getNightModeRuntimeSnapshot(),
        currentTheme:
          typeof (window as any).ThemeManager?.getCurrentTheme === "function"
            ? (window as any).ThemeManager.getCurrentTheme()
            : "",
        currentTilePalette:
          typeof (window as any).ThemeManager?.getActiveTilePaletteId === "function"
            ? (window as any).ThemeManager.getActiveTilePaletteId()
            : "",
        savedTheme: window.localStorage.getItem("theme_profile_v1"),
        savedTilePalette: window.localStorage.getItem("tile_palette_active_v1")
      };
    });

    expect(finalNightSnapshot.night.enabled).toBe(false);
    expect(finalNightSnapshot.night.dataAttribute).toBe("");
    expect(finalNightSnapshot.currentTheme).toBe("classic");
    expect(finalNightSnapshot.currentTilePalette).toBe("follow-theme");
    expect(finalNightSnapshot.savedTheme).toBe("classic");
    expect(finalNightSnapshot.savedTilePalette).toBe("follow-theme");

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
        currentTilePalette:
          typeof (window as any).ThemeManager?.getActiveTilePaletteId === "function"
            ? (window as any).ThemeManager.getActiveTilePaletteId()
            : "",
        savedTheme: window.localStorage.getItem("theme_profile_v1"),
        savedTilePalette: window.localStorage.getItem("tile_palette_active_v1"),
        autoThemeApplied: window.localStorage.getItem("settings_night_theme_auto_applied_v1")
      };
    });

    expect(secondNightEnable.currentTheme).toBe("ocean");
    expect(secondNightEnable.currentTilePalette).toBe("cold-cyan-steps");
    expect(secondNightEnable.savedTheme).toBe("ocean");
    expect(secondNightEnable.savedTilePalette).toBe("cold-cyan-steps");
    expect(secondNightEnable.autoThemeApplied).toBe("1");
  });

  test("palette theme changes persist in night mode after returning to the home page", async ({
    page
  }) => {
    await page.addInitScript(() => {
      if (window.localStorage.getItem("__night_theme_palette_regression_seeded_v1") === "1") {
        return;
      }
      window.localStorage.setItem("__night_theme_palette_regression_seeded_v1", "1");
      window.localStorage.setItem("settings_night_background_enabled_v1", "1");
      window.localStorage.setItem("theme_profile_v1", "midnight_nebula");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
      window.localStorage.setItem("settings_day_theme_profile_v1", "classic");
      window.localStorage.setItem("settings_day_tile_palette_v1", "follow-theme");
      window.localStorage.setItem("settings_night_theme_profile_v1", "midnight_nebula");
      window.localStorage.setItem("settings_night_tile_palette_v1", "follow-theme");
      window.localStorage.setItem("settings_night_theme_auto_applied_v1", "1");
      window.localStorage.setItem("settings_night_theme_pending_v1", "0");
    });

    const homeResponse = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(homeResponse, "Home response should exist").not.toBeNull();
    expect(homeResponse?.ok(), "Home response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      return (
        !!(window as any).CoreNightModeRuntime &&
        typeof (window as any).ThemeManager?.getCurrentTheme === "function"
      );
    }, null, { timeout: 15000 });

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          return {
            currentTheme: (window as any).ThemeManager.getCurrentTheme(),
            nightTheme: window.localStorage.getItem("settings_night_theme_profile_v1"),
            dataNight: document.documentElement.getAttribute("data-night-background") || ""
          };
        });
      })
      .toEqual({
        currentTheme: "classic",
        nightTheme: "classic",
        dataNight: "1"
      });

    const paletteResponse = await page.goto("/palette.html#appearance-settings", {
      waitUntil: "domcontentloaded"
    });
    expect(paletteResponse, "Palette response should exist").not.toBeNull();
    expect(paletteResponse?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("#appearance-settings-editor")).toBeVisible();
    await expect(page.locator("#appearance-settings-editor")).toHaveAttribute("open", "");

    await page.evaluate(() => {
      (window as any).ThemeManager.applyTheme("ocean");
    });
    await page.waitForFunction(() => {
      return (
        typeof (window as any).ThemeManager?.getCurrentTheme === "function" &&
        (window as any).ThemeManager.getCurrentTheme() === "ocean" &&
        window.localStorage.getItem("theme_profile_v1") === "ocean" &&
        window.localStorage.getItem("settings_night_theme_profile_v1") === "ocean" &&
        window.localStorage.getItem("settings_day_theme_profile_v1") === "classic"
      );
    }, null, { timeout: 15000 });

    const returnHomeResponse = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(returnHomeResponse, "Return-home response should exist").not.toBeNull();
    expect(returnHomeResponse?.ok(), "Return-home response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          return {
            currentTheme:
              typeof (window as any).ThemeManager?.getCurrentTheme === "function"
                ? (window as any).ThemeManager.getCurrentTheme()
                : "",
            savedTheme: window.localStorage.getItem("theme_profile_v1"),
            nightTheme: window.localStorage.getItem("settings_night_theme_profile_v1"),
            dayTheme: window.localStorage.getItem("settings_day_theme_profile_v1"),
            dataNight: document.documentElement.getAttribute("data-night-background") || ""
          };
        });
      })
      .toEqual({
        currentTheme: "ocean",
        savedTheme: "ocean",
        nightTheme: "ocean",
        dayTheme: "classic",
        dataNight: "1"
      });
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
    expect(snapshot.groupTitleColor).toContain("237, 242, 237");
    expect(snapshot.rootBackgroundImage).toBe("none");
    expect(snapshot.bodyBeforeDisplay).toBe("none");
    expect(snapshot.bodyAfterDisplay).toBe("none");
  });

  test("account page does not render retired guide entry in night mode", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("settings_night_background_enabled_v1", "1");
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

    const snapshot = await page.evaluate(() => {
      return {
        dataAttribute: document.documentElement.getAttribute("data-night-background") || "",
        hasGuideCard: !!document.querySelector(".account-guide-card"),
        hasGuideButton: !!document.getElementById("account-open-guide-btn")
      };
    });

    expect(snapshot.dataAttribute).toBe("1");
    expect(snapshot.hasGuideCard).toBe(false);
    expect(snapshot.hasGuideButton).toBe(false);
  });

  test("night preference reaches utility and direct pages with darkened key surfaces", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("settings_night_background_enabled_v1", "1");
    });

    const targets = [
      { url: "/account_settings.html", selector: ".account-auth-form-surface" },
      { url: "/replay.html", selector: ".replay-metric-card" },
      { url: "/palette.html#appearance-settings", selector: "#appearance-settings-editor" },
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

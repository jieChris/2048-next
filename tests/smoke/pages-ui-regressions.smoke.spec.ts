import { expect, test } from "@playwright/test";
import { installRankedSessionForMode } from "./support/ranked-session";
import { waitForWindowCondition } from "./support/runtime-ready";

test.describe("Legacy Multi-Page Smoke", () => {
  async function confirmGameDialog(page: import("@playwright/test").Page) {
    await expect(page.locator("#game-dialog-overlay.is-open")).toBeVisible();
    await page.locator("#game-dialog-confirm").click();
    await expect(page.locator("#game-dialog-overlay.is-open")).toBeHidden();
  }

  async function routeI18nAuditApi(page: import("@playwright/test").Page) {
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me") || url.includes("/user/12")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 12, nickname: "小明", created_at: "2026-03-21 15:45:05" }
          })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });
  }

  async function collectVisibleLanguageTexts(page: import("@playwright/test").Page) {
    return await page.evaluate(() => {
      const results: Array<{ kind: string; selector: string; text: string }> = [];
      const seen = new Set<string>();
      const ignoredIds = new Set(["user-value-name"]);

      function isVisible(element: Element) {
        const styles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return styles.display !== "none" && styles.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }

      function selectorFor(element: Element) {
        return element.id ? "#" + element.id : element.tagName.toLowerCase();
      }

      function add(kind: string, element: Element | Document, textLike: unknown) {
        const text = String(textLike || "").replace(/\s+/g, " ").trim();
        if (!text) return;
        const selector = element instanceof Document ? "document" : selectorFor(element);
        if (selector.startsWith("#") && ignoredIds.has(selector.slice(1))) return;
        const key = kind + "|" + selector + "|" + text;
        if (seen.has(key)) return;
        seen.add(key);
        results.push({ kind, selector, text });
      }

      for (const element of Array.from(document.querySelectorAll("body *"))) {
        if (!isVisible(element)) continue;
        if (
          element.childNodes.length === 1 &&
          element.childNodes[0] &&
          element.childNodes[0].nodeType === Node.TEXT_NODE
        ) {
          add("text", element, element.textContent);
        }
        for (const attr of ["title", "aria-label", "placeholder", "alt"]) {
          if (element.hasAttribute(attr)) add(attr, element, element.getAttribute(attr));
        }
      }
      add("document.title", document, document.title);
      return results;
    });
  }

  function stripAllowedChinesePageTerms(text: string) {
    return text
      .replace(/\bNEXT\b/gu, "")
      .replace(/\bIPS\b/gu, "")
      .replace(/\bWASD\b/gu, "")
      .replace(/\bKHJL\b/gu, "")
      .replace(/\bNo X\b/gu, "")
      .replace(/\b\d+x\d+\b/giu, "")
      .replace(/\b[RKZ]\b/gu, "")
      .replace(/\b\d+k\b/giu, "");
  }

  test("secondary pages replace oversized headings with a plain icon-only back control", async ({ page }) => {
    const pages = [
      ["/account.html", "/2048.html"],
      ["/account_settings.html", "/account.html"],
      ["/history.html", "/2048.html"],
      ["/medal-wall.html", "/2048.html"],
      ["/modes.html", "/2048.html"],
      ["/palette.html", "/2048.html"],
      ["/touch_sensitivity.html", "/palette.html"],
      ["/user.html", "/2048.html"]
    ] as const;

    await routeI18nAuditApi(page);
    await page.addInitScript(() => window.localStorage.setItem("ui_language_v1", "zh"));

    for (const [target, expectedBackPath] of pages) {
      const response = await page.goto(target, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${target} response should be 2xx`).toBeTruthy();

      const back = page.locator(".page-back-button");
      await expect(back, `${target} should have one back control`).toHaveCount(1);
      await expect(back).toBeVisible();
      const snapshot = await back.evaluate((node) => {
        const element = node as HTMLElement;
        const style = getComputedStyle(element);
        return {
          path: new URL((element as HTMLAnchorElement).href).pathname,
          accessibleName: element.getAttribute("aria-label") || (element.textContent || "").trim(),
          isLegacyButton: element.classList.contains("replay-button"),
          background: style.backgroundColor,
          border: style.borderTopWidth,
          radius: style.borderRadius,
          size: [element.getBoundingClientRect().width, element.getBoundingClientRect().height]
        };
      });
      const hiddenHeading = await page.locator(".page-title-visually-hidden").first().evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return [rect.width, rect.height];
      });

      expect(snapshot.path).toBe(expectedBackPath);
      expect(snapshot.accessibleName.length).toBeGreaterThan(0);
      expect(snapshot.isLegacyButton).toBe(false);
      expect(snapshot.background).toBe("rgba(0, 0, 0, 0)");
      expect(snapshot.border).toBe("0px");
      expect(snapshot.radius).toBe("0px");
      expect(snapshot.size).toEqual([44, 44]);
      expect(hiddenHeading[0]).toBeLessThanOrEqual(1);
      expect(hiddenHeading[1]).toBeLessThanOrEqual(1);
    }
  });

  test("key pages keep Chinese and English UI copy separated", async ({ page }) => {
    const pages = [
      "/2048.html",
      "/account.html",
      "/account_settings.html",
      "/register.html",
      "/password.html",
      "/user.html?id=12&nickname=%E5%B0%8F%E6%98%8E",
      "/history.html",
      "/modes.html",
      "/Practice_board.html"
    ];

    for (const lang of ["zh", "en"] as const) {
      for (const target of pages) {
        await routeI18nAuditApi(page);
        await page.addInitScript((value) => {
          window.localStorage.setItem("ui_language_v1", value);
        }, lang);
        const response = await page.goto(target, { waitUntil: "domcontentloaded" });
        expect(response, `${target} response should exist`).not.toBeNull();
        expect(response?.ok(), `${target} response should be 2xx`).toBeTruthy();
        await expect(page.locator("body")).toBeVisible();
        if (target === "/Practice_board.html") {
          await waitForWindowCondition(
            page,
            () =>
              Boolean((window as any).__practicePhaseSyncBound) &&
              document.getElementById("practice-mode-picker-btn")?.hasAttribute("data-active-practice-mode-key") === true &&
              document.querySelectorAll("#practice-mode-list [data-practice-mode-key]").length > 0,
            15_000
          );
        }
        await page.waitForTimeout(800);

        const texts = await collectVisibleLanguageTexts(page);
        const violations = texts.filter((item) => {
          if (lang === "en") return /[\u3400-\u9fff]/u.test(item.text);
          return /[A-Za-z]/u.test(stripAllowedChinesePageTerms(item.text));
        });

        expect(violations, `${target} ${lang} language violations`).toEqual([]);
      }
    }
  });

  test("timer module settings description follows language selected on the settings page", async ({ page }) => {
    await routeI18nAuditApi(page);
    await page.addInitScript(() => {
      if (window.localStorage.getItem("__timer_language_settings_seeded_v1") === "1") return;
      window.localStorage.setItem("__timer_language_settings_seeded_v1", "1");
      window.localStorage.setItem("ui_language_v1", "en");
      window.localStorage.setItem("settings_timer_module_view_v1", "timer");
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Home response should exist").not.toBeNull();
    expect(response?.ok(), "Home response should be 2xx").toBeTruthy();
    await waitForWindowCondition(
      page,
      () => typeof (window as any).openSettingsModal === "function",
      "settings modal opener ready"
    );

    await page.evaluate(() => {
      (window as any).openSettingsModal();
    });
    await expect(page.locator("#settings-modal")).toHaveCSS("display", "flex");
    await expect(page.locator("#timer-module-view-label")).toHaveText(
      "Turn on to show timers, turn off to show leaderboard."
    );

    const settingsResponse = await page.goto("/palette.html", {
      waitUntil: "domcontentloaded"
    });
    expect(settingsResponse?.ok(), "Settings response should be 2xx").toBeTruthy();
    await expect(page.locator('[data-ui-language="en"]')).toHaveAttribute("aria-pressed", "true");
    await page.locator('[data-ui-language="zh"]').click();
    await page.waitForFunction(() => window.localStorage.getItem("ui_language_v1") === "zh");

    const updatedHomeResponse = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(updatedHomeResponse?.ok(), "Updated home response should be 2xx").toBeTruthy();
    await waitForWindowCondition(
      page,
      () => typeof (window as any).openSettingsModal === "function",
      "updated settings modal opener ready"
    );
    await page.evaluate(() => {
      (window as any).openSettingsModal();
    });

    await expect(page.locator("#timer-module-view-label")).toHaveText(
      "开启时显示计时器，关闭时显示排行榜。"
    );
  });

  test("timer module settings toggle switches to leaderboard without waiting for leaderboard fetch", async ({
    page
  }) => {
    let releaseLeaderboard: (() => void) | null = null;
    const leaderboardGate = new Promise<void>((resolve) => {
      releaseLeaderboard = resolve;
    });
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/leaderboard")) {
        await leaderboardGate;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "settings_timer_module_view_by_mode_v1",
        JSON.stringify({ standard_4x4_pow2_no_undo: "timer" })
      );
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Home response should exist").not.toBeNull();
    expect(response?.ok(), "Home response should be 2xx").toBeTruthy();
    await waitForWindowCondition(
      page,
      () =>
        typeof (window as any).openSettingsModal === "function" &&
        Boolean((window as any).OnlineLeaderboardRuntime?.refreshTimerLeaderboardPanel),
      "settings and leaderboard runtime ready"
    );

    await page.evaluate(() => {
      (window as any).openSettingsModal();
    });
    await expect(page.locator("#settings-modal")).toHaveCSS("display", "flex");
    await expect(page.locator("#timer-module-view-toggle")).toBeChecked();

    await page.click("label.settings-switch[for='timer-module-view-toggle']");
    const snapshot = await page.evaluate(() => {
      const timerBox = document.getElementById("timerbox");
      const panel = document.getElementById("timer-leaderboard-panel");
      return {
        timerBoxClassName: String(timerBox?.className || ""),
        panelExists: !!panel,
        rowCount: document.querySelectorAll("#timer-leaderboard-list .timer-leaderboard-row").length,
        firstRowText: String(
          document.querySelector("#timer-leaderboard-list .timer-leaderboard-row")?.textContent || ""
        ).trim()
      };
    });
    releaseLeaderboard?.();

    expect(snapshot.timerBoxClassName).toContain("timerbox-leaderboard-mode");
    expect(snapshot.panelExists).toBe(true);
    expect(snapshot.rowCount).toBeGreaterThan(0);
    expect(snapshot.firstRowText).toContain("--");
  });

  test("timer module settings toggle returns from the preloaded leaderboard without a reload", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "settings_timer_module_view_by_mode_v1",
        JSON.stringify({ standard_4x4_pow2_no_undo: "hidden" })
      );
    });

    await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    await waitForWindowCondition(
      page,
      () => Boolean((window as any).game_manager) && typeof (window as any).openSettingsModal === "function",
      "timer settings ready"
    );
    await expect(page.locator("html")).toHaveAttribute("data-initial-timer-leaderboard", "1");

    await page.evaluate(() => (window as any).openSettingsModal());
    await page.click("label.settings-switch[for='timer-module-view-toggle']");

    await expect(page.locator("#timer-module-view-toggle")).toBeChecked();
    await expect(page.locator("html")).not.toHaveAttribute("data-initial-timer-leaderboard", "1");
    await expect(page.locator("#timerbox")).not.toHaveClass(/timerbox-(hidden|leaderboard)-mode/);
    await expect(page.locator("#timer")).toBeVisible();
    await expect(page.locator("#timer-leaderboard-panel")).toBeHidden();
  });

  test("initial leaderboard view shows the embedded shell before ranked startup and leaderboard data finish", async ({
    page
  }) => {
    let releaseRankedSession: (() => void) | null = null;
    const rankedSessionGate = new Promise<void>((resolve) => {
      releaseRankedSession = resolve;
    });
    let releaseLeaderboard: (() => void) | null = null;
    const leaderboardGate = new Promise<void>((resolve) => {
      releaseLeaderboard = resolve;
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/ranked-session/start")) {
        await rankedSessionGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              mode_key: "standard_4x4_pow2_no_undo",
              challenge_id: "leaderboard-shell-startup",
              seed: 2468,
              ranked_session_token: "leaderboard-shell-token",
              issued_at: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
              spawn_sequence_version: 2
            }
          })
        });
        return;
      }
      if (url.includes("/leaderboard")) {
        await leaderboardGate;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "leaderboard-shell-token");
      window.localStorage.setItem(
        "settings_timer_module_view_by_mode_v1",
        JSON.stringify({ standard_4x4_pow2_no_undo: "hidden" })
      );
      window.localStorage.removeItem("ranked_session_active:v1:standard_4x4_pow2_no_undo");
      window.localStorage.removeItem("ranked_session_prefetch:v1:standard_4x4_pow2_no_undo");
    });

    try {
      const response = await page.goto("/2048.html?leaderboard-shell-startup=1", {
        waitUntil: "commit"
      });
      expect(response, "Home response should exist").not.toBeNull();
      expect(response?.ok(), "Home response should be 2xx").toBeTruthy();
      await page.waitForSelector("#timerbox");

      const snapshot = await page.evaluate(() => {
        const root = document.documentElement;
        const timerBox = document.getElementById("timerbox") as HTMLElement | null;
        const panel = document.getElementById("timer-leaderboard-panel") as HTMLElement | null;
        const firstRow = document.querySelector(
          "#timer-leaderboard-list .timer-leaderboard-row"
        ) as HTMLElement | null;
        return {
          initialAttr: root.getAttribute("data-initial-timer-leaderboard"),
          timerBoxClassName: String(timerBox?.className || ""),
          panelDisplay: panel ? window.getComputedStyle(panel).display : "",
          panelVisibility: panel ? window.getComputedStyle(panel).visibility : "",
          firstRowText: String(firstRow?.textContent || "").trim(),
          hasManager: Boolean((window as any).game_manager)
        };
      });

      expect(snapshot.hasManager).toBe(false);
      expect(snapshot.initialAttr).toBe("1");
      expect(snapshot.timerBoxClassName).not.toContain("timerbox-leaderboard-mode");
      expect(snapshot.panelDisplay).toBe("block");
      expect(snapshot.panelVisibility).toBe("visible");
      expect(snapshot.firstRowText).toContain("--");
    } finally {
      releaseRankedSession?.();
      releaseLeaderboard?.();
    }
  });

  test("settings modal omits duplicate palette and account shortcuts", async ({ page }) => {
    await routeI18nAuditApi(page);
    await page.addInitScript(() => {
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Home response should exist").not.toBeNull();
    expect(response?.ok(), "Home response should be 2xx").toBeTruthy();
    await waitForWindowCondition(
      page,
      () => typeof (window as any).openSettingsModal === "function",
      "settings modal opener ready"
    );

    await page.evaluate(() => {
      (window as any).openSettingsModal();
    });
    await expect(page.locator("#settings-modal")).toHaveCSS("display", "flex");
    await expect(page.locator("#toolkit-entry-row")).toHaveCount(0);
    await expect(page.locator("#toolkit-palette-link")).toHaveCount(0);
    await expect(page.locator("#toolkit-account-link")).toHaveCount(0);
  });

  async function seedBrokenPracticeTimerSave(page: import("@playwright/test").Page) {
    const seedResponse = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(seedResponse, "Practice seed response should exist").not.toBeNull();
    expect(seedResponse?.ok(), "Practice seed response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(
      () => Boolean(window.localStorage.getItem("savedGameStateByMode:v1:practice")),
      { timeout: 5_000 }
    ).catch(() => undefined);

    const seeded = await page.evaluate(() => {
      const raw = window.localStorage.getItem("savedGameStateByMode:v1:practice");
      const saved = raw ? JSON.parse(raw) : {};
      if (!saved || typeof saved !== "object") return false;
      const timerRows =
        saved.timer_fixed_rows && typeof saved.timer_fixed_rows === "object"
          ? saved.timer_fixed_rows
          : {};
      timerRows["32768"] = {
        ...(timerRows["32768"] || {}),
        display: "none",
        hidden: "1"
      };
      timerRows["65536"] = {
        ...(timerRows["65536"] || {}),
        display: "none",
        hidden: "1"
      };
      saved.timer_fixed_rows = timerRows;
      window.localStorage.setItem("savedGameStateByMode:v1:practice", JSON.stringify(saved));
      return true;
    });

    expect(seeded).toBe(true);
  }

  test("homepage does not render the retired guide overlay", async ({ page }) => {
    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => !!document.getElementById("timer-row-131072"));

    const beforeClick = await page.evaluate(() => {
      const row131072 = document.getElementById("timer-row-131072") as HTMLElement | null;
      return {
        hasGuideRuntime: !!(window as any).CoreHomeGuideRuntime,
        hasGuideOverlay: !!document.getElementById("home-guide-overlay"),
        bodyHasGuideClass: document.body.classList.contains("home-guide-active"),
        row131072Exists: !!row131072
      };
    });

    expect(beforeClick.hasGuideRuntime).toBe(false);
    expect(beforeClick.hasGuideOverlay).toBe(false);
    expect(beforeClick.bodyHasGuideClass).toBe(false);
    expect(beforeClick.row131072Exists).toBe(true);
  });

  test("export replay action works without retired guide runtime", async ({ page }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 602,
      token: "smoke-token-guide-export"
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => typeof (window as any).exportReplay === "function");
    await expect(page.locator("#home-guide-overlay")).toHaveCount(0);

    await page.locator("#top-export-replay-btn").click();
    await expect(page.locator("#replay-modal")).toBeVisible();
  });

  test("mist cyan replay surfaces use the shared light and night palettes", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("settings_day_theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("settings_night_theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("settings_night_background_enabled_v1", "0");
    });

    await page.goto("/replay.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".replay-metric-card").first()).toBeVisible();
    await page.locator("#replay-open-speed-btn").click();
    await expect.poll(() => page.locator("#theme-dynamic-style").textContent()).toContain(
      "input[type=range]::-webkit-slider-runnable-track"
    );

    const snapshot = () => page.evaluate(() => {
      const color = (selector: string, property: "backgroundColor" | "borderColor" | "color" | "accentColor") => {
        const node = document.querySelector(selector);
        return node ? window.getComputedStyle(node)[property] : "";
      };
      return {
        body: color("body", "backgroundColor"),
        metric: color(".replay-metric-card", "backgroundColor"),
        metricBorder: color(".replay-metric-card", "borderColor"),
        metricLabel: color(".replay-metric-label", "color"),
        metricValue: color(".replay-metric-value", "color"),
        imported: color(".replay-imported-file-name", "backgroundColor"),
        importedText: color(".replay-imported-file-name", "color"),
        speedLabel: color(".replay-speed-mode-label", "color"),
        speedUnit: color(".replay-singleline-unit", "color"),
        speedInput: color(".replay-singleline-input", "backgroundColor"),
        speedCheckbox: color("#replay-speed-mode-original", "accentColor"),
        board: color(".game-container-replay", "backgroundColor"),
        dynamicThemeCss: document.getElementById("theme-dynamic-style")?.textContent || ""
      };
    });

    const light = await snapshot();
    expect(light).toMatchObject({
      body: "rgb(243, 246, 245)",
      metric: "rgb(251, 253, 252)",
      metricBorder: "rgba(47, 92, 99, 0.26)",
      metricLabel: "rgb(99, 116, 118)",
      metricValue: "rgb(61, 79, 82)",
      imported: "rgb(237, 243, 242)",
      importedText: "rgb(61, 79, 82)",
      speedLabel: "rgb(86, 104, 106)",
      speedUnit: "rgb(99, 116, 118)",
      speedInput: "rgb(255, 254, 249)",
      speedCheckbox: "rgb(47, 134, 160)",
      board: "rgb(184, 201, 199)"
    });
    expect(light.dynamicThemeCss).toContain(
      "input[type=range]::-webkit-slider-runnable-track{background:var(--app-border-control);}"
    );
    expect(light.dynamicThemeCss).toContain(
      "input[type=range]::-webkit-slider-thumb{background:var(--app-accent);}"
    );

    await page.evaluate(() => document.documentElement.setAttribute("data-night-background", "1"));
    expect(await snapshot()).toMatchObject({
      body: "rgb(24, 32, 31)",
      metric: "rgb(53, 73, 70)",
      metricLabel: "rgb(168, 183, 176)",
      metricValue: "rgb(237, 242, 237)",
      imported: "rgb(43, 55, 52)",
      importedText: "rgb(237, 242, 237)",
      speedLabel: "rgb(204, 215, 209)",
      speedUnit: "rgb(168, 183, 176)",
      speedInput: "rgb(32, 43, 48)",
      speedCheckbox: "rgb(99, 170, 166)"
    });
    await expect(page.locator('link[href^="style/replay_page_rebuild.css"]')).toHaveAttribute(
      "href",
      "style/replay_page_rebuild.css?v=20260820-theme-colors-v1"
    );
  });

  test("timer scroll controls stay hidden below 11 active rows and show at 11", async ({
    page
  }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice response should exist").not.toBeNull();
    expect(response?.ok(), "Practice response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => typeof (window as any).updateTimerScroll === "function");

    const snapshot = await page.evaluate(() => {
      const updateTimerScroll = (window as any).updateTimerScroll;
      const controls = document.getElementById("timer-scroll-controls") as HTMLElement | null;
      const rows = Array.from(document.querySelectorAll("[id^='timer-row-']")) as HTMLElement[];
      if (typeof updateTimerScroll !== "function" || !controls || rows.length < 11) {
        return {
          hasUpdateBinding: typeof updateTimerScroll === "function",
          hasControls: !!controls,
          rowCount: rows.length
        };
      }

      const applyActiveCount = (count: number) => {
        rows.forEach((row, index) => {
          row.style.display = index < count ? "" : "none";
          row.style.visibility = "";
          row.style.pointerEvents = "";
          row.removeAttribute("data-scroll-hidden");
          row.removeAttribute("data-secondary-hidden");
        });
        updateTimerScroll();
        return window.getComputedStyle(controls).display;
      };

      return {
        hasUpdateBinding: true,
        hasControls: true,
        rowCount: rows.length,
        belowThresholdDisplay: applyActiveCount(10),
        atThresholdDisplay: applyActiveCount(11)
      };
    });

    expect(snapshot.hasUpdateBinding).toBe(true);
    expect(snapshot.hasControls).toBe(true);
    expect(snapshot.rowCount).toBeGreaterThanOrEqual(11);
    expect(snapshot.belowThresholdDisplay).toBe("none");
    expect(snapshot.atThresholdDisplay).toBe("flex");
  });

  test("standard timer secondary rows use the timer scroll window", async ({ page }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 606,
      token: "smoke-token-standard-timer-scroll"
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await waitForWindowCondition(
      page,
      () => Boolean((window as any).game_manager) && typeof (window as any).updateTimerScroll === "function",
      12_000
    );

    const snapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      if (manager && typeof manager.setTimerModuleViewMode === "function") {
        manager.setTimerModuleViewMode("timer");
      }
      document.getElementById("timer8192")?.click();
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

      const controls = document.getElementById("timer-scroll-controls") as HTMLElement | null;
      const rows = Array.from(document.querySelectorAll("#timerbox [id^='timer-row-']")) as HTMLElement[];
      const visibleRows = rows.filter((row) => {
        const style = window.getComputedStyle(row);
        return style.display !== "none" && row.getAttribute("data-secondary-hidden") !== "1";
      });
      return {
        controlsDisplay: controls ? window.getComputedStyle(controls).display : null,
        hiddenRows: rows.filter((row) => row.getAttribute("data-scroll-hidden") === "1").map((row) => row.id),
        visibleCount: visibleRows.length
      };
    });

    expect(snapshot.controlsDisplay).toBe("flex");
    expect(snapshot.hiddenRows.length).toBeGreaterThan(0);
    expect(snapshot.visibleCount).toBeLessThanOrEqual(11);
  });

  test("practice save restore self-heals legacy hidden fixed timer rows", async ({
    page
  }) => {
    await seedBrokenPracticeTimerSave(page);

    const targets = ["/Practice_board.html"];

    for (const target of targets) {
      const response = await page.goto(target, {
        waitUntil: "domcontentloaded"
      });
      expect(response, `Response should exist for ${target}`).not.toBeNull();
      expect(response?.ok(), `Response should be 2xx for ${target}`).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await page.waitForTimeout(350);

      const snapshot = await page.evaluate(() => {
        const row32k = document.getElementById("timer-row-32768") as HTMLElement | null;
        const row64k = document.getElementById("timer-row-65536") as HTMLElement | null;
        const controls = document.getElementById("timer-scroll-controls") as HTMLElement | null;
        return {
          row32kDisplay: row32k ? window.getComputedStyle(row32k).display : null,
          row32kHidden: row32k ? row32k.getAttribute("data-scroll-hidden") : null,
          row64kDisplay: row64k ? window.getComputedStyle(row64k).display : null,
          row64kHidden: row64k ? row64k.getAttribute("data-scroll-hidden") : null,
          controlsDisplay: controls ? window.getComputedStyle(controls).display : null
        };
      });

      expect(snapshot.row32kDisplay, `32768 row should be visible for ${target}`).not.toBe("none");
      expect(snapshot.row32kHidden, `32768 row should not stay scroll-hidden for ${target}`).not.toBe("1");
      expect(snapshot.row64kDisplay, `65536 row should remain scroll-managed for ${target}`).toBe("none");
      expect(snapshot.row64kHidden, `65536 row should be hidden only by scroll for ${target}`).toBe("1");
      expect(snapshot.controlsDisplay, `scroll controls should be visible for ${target}`).toBe("flex");
    }
  });

  test("practice board keeps setup editable after first move", async ({ page }) => {
    await page.addInitScript(() => {
    });

    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice response should exist").not.toBeNull();
    expect(response?.ok(), "Practice response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () =>
        Boolean((window as any).game_manager) &&
        document.querySelector('.selection-tile[data-value="32"]') !== null &&
        document.querySelector('.selection-tile[data-value="16"]') !== null &&
        document.querySelector('.grid-cell[data-x="0"][data-y="0"]') !== null &&
        document.querySelector('.grid-cell[data-x="1"][data-y="0"]') !== null,
      12_000
    );
    await page.waitForFunction(() => {
      const params = new URLSearchParams(window.location.search || "");
      return params.get("practice_fresh") !== "1";
    });

    await page.locator('.selection-tile[data-value="32"]').click();
    await page.locator('.grid-cell[data-x="0"][data-y="0"]').click();
    await page.waitForTimeout(120);

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(180);

    await page.locator('.selection-tile[data-value="16"]').click();
    await page.locator('.grid-cell[data-x="1"][data-y="0"]').click();
    await page.waitForTimeout(120);

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const tileAt10 = manager?.grid?.cellContent({ x: 1, y: 0 });
      return {
        hasGameStarted: !!manager?.hasGameStarted,
        tileAt10: tileAt10 ? Number(tileAt10.value) : 0,
        bodyClassName: String(document.body.className || "")
      };
    });

    expect(snapshot.hasGameStarted).toBe(true);
    expect(snapshot.tileAt10).toBe(16);
    expect(snapshot.bodyClassName).not.toContain("practice-setup-locked");
  });

  test("legacy global stats visibility key no longer auto-opens undo practice or replay pages", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("stats_panel_visible_v1", "1");
    });

    const targets = ["/undo_2048.html", "/Practice_board.html?practice_fresh=1", "/replay.html"];

    for (const target of targets) {
      const response = await page.goto(target, {
        waitUntil: "domcontentloaded"
      });
      expect(response, `Response should exist for ${target}`).not.toBeNull();
      expect(response?.ok(), `Response should be 2xx for ${target}`).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await page.waitForTimeout(250);

      const snapshot = await page.evaluate(() => {
        const overlay = document.getElementById("stats-panel-overlay") as HTMLElement | null;
        return {
          overlayDisplay: overlay ? window.getComputedStyle(overlay).display : null,
          legacyGlobalKey: window.localStorage.getItem("stats_panel_visible_v1")
        };
      });

      expect(snapshot.legacyGlobalKey).toBe("1");
      expect(snapshot.overlayDisplay).not.toBe("flex");
    }
  });

  test("leaderboard view reuses timer row layout for rank and nickname+score rows", async ({ page }) => {
    const leaderboardRequests: string[] = [];
    await page.route("**/leaderboard?**", async (route) => {
      leaderboardRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { user_id: 7, nickname: "Alice", score: 4096 },
            { user_id: 8, nickname: "Bob", score: 2048 },
            { user_id: 9, nickname: "Carol", score: 1024 }
          ]
        })
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_userId_v1", "8");
      window.localStorage.setItem("2048_auth_nickname_v1", "Bob");
      window.localStorage.setItem("settings_night_background_enabled_v1", "0");
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("settings_day_theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () =>
        Boolean((window as any).game_manager) &&
        Boolean((window as any).OnlineLeaderboardRuntime?.refreshTimerLeaderboardPanel),
      12_000
    );

    const snapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      const runtime = (window as any).OnlineLeaderboardRuntime;
      if (
        !manager ||
        typeof manager.setTimerModuleViewMode !== "function" ||
        !runtime ||
        typeof runtime.refreshTimerLeaderboardPanel !== "function"
      ) {
        return {
          hasManager: !!manager,
          hasRuntime: !!runtime
        };
      }

      manager.setTimerModuleViewMode("hidden");
      await runtime.refreshTimerLeaderboardPanel(true);
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve(null));
        });
      });

      const timerBox = document.getElementById("timerbox") as HTMLElement | null;
      const panel = document.getElementById("timer-leaderboard-panel") as HTMLElement | null;
      const summary = document.getElementById("timer-leaderboard-summary") as HTMLElement | null;
      const timer = document.getElementById("timer") as HTMLElement | null;
      const score = document.querySelector(".score-container") as HTMLElement | null;
      const best = document.querySelector(".best-container") as HTMLElement | null;
      const firstRow = document.querySelector(
        "#timer-leaderboard-list .timer-leaderboard-row"
      ) as HTMLElement | null;
      const selfRow = document.querySelector(
        "#timer-leaderboard-list .timer-leaderboard-row.is-self"
      ) as HTMLElement | null;
      const firstRank = firstRow?.querySelector(".timer-leaderboard-rank-tile") as HTMLElement | null;
      const firstName = firstRow?.querySelector(".timer-leaderboard-name-tile") as HTMLElement | null;
      const selfRank = selfRow?.querySelector(".timer-leaderboard-rank-tile") as HTMLElement | null;
      const selfName = selfRow?.querySelector(".timer-leaderboard-name-tile") as HTMLElement | null;
      const summaryRect = summary?.getBoundingClientRect() || null;
      const firstNameRect = firstName?.getBoundingClientRect() || null;
      const selfNameRect = selfName?.getBoundingClientRect() || null;

      return {
        hasManager: true,
        hasRuntime: true,
        timerBoxClassName: timerBox ? String(timerBox.className || "") : "",
        panelDisplay: panel ? String(window.getComputedStyle(panel).display || "") : "",
        panelBackground: panel ? window.getComputedStyle(panel).backgroundColor : "",
        panelBoxShadow: panel ? window.getComputedStyle(panel).boxShadow : "",
        summaryBackground: summary ? window.getComputedStyle(summary).backgroundColor : "",
        summaryBoxShadow: summary ? window.getComputedStyle(summary).boxShadow : "",
        summaryColor: summary ? window.getComputedStyle(summary).color : "",
        summaryLabelColor: summary ? window.getComputedStyle(summary, "::after").color : "",
        summaryBorderRadius: summary ? window.getComputedStyle(summary).borderRadius : "",
        summaryLabelFontSize: summary ? window.getComputedStyle(summary, "::after").fontSize : "",
        timerBackground: timer ? window.getComputedStyle(timer).backgroundColor : "",
        timerBoxShadow: timer ? window.getComputedStyle(timer).boxShadow : "",
        timerColor: timer ? window.getComputedStyle(timer).color : "",
        timerLabelColor: timer ? window.getComputedStyle(timer, "::after").color : "",
        timerBorderRadius: timer ? window.getComputedStyle(timer).borderRadius : "",
        timerLabelFontSize: timer ? window.getComputedStyle(timer, "::after").fontSize : "",
        scoreBorderStyle: score ? window.getComputedStyle(score).borderStyle : "",
        scoreBorderWidth: score ? window.getComputedStyle(score).borderWidth : "",
        bestBorderStyle: best ? window.getComputedStyle(best).borderStyle : "",
        bestBorderWidth: best ? window.getComputedStyle(best).borderWidth : "",
        summaryText: summary ? String(summary.textContent || "").trim() : "",
        summaryLabel: summary ? String(summary.getAttribute("data-label") || "") : "",
        summaryRole: summary ? String(summary.getAttribute("role") || "") : "",
        summaryFontSize: summary ? String(window.getComputedStyle(summary).fontSize || "") : "",
        firstRankClassName: firstRank ? String(firstRank.className || "") : "",
        firstNameClassName: firstName ? String(firstName.className || "") : "",
        firstNameBackground: firstName ? window.getComputedStyle(firstName).backgroundColor : "",
        firstNameColor: firstName ? window.getComputedStyle(firstName).color : "",
        selfNameBackground: selfName ? window.getComputedStyle(selfName).backgroundColor : "",
        firstRankText: firstRank ? String(firstRank.textContent || "").trim() : "",
        firstNameText: firstName ? String(firstName.textContent || "").trim() : "",
        selfRankText: selfRank ? String(selfRank.textContent || "").trim() : "",
        selfNameText: selfName ? String(selfName.textContent || "").trim() : "",
        firstNameWidth: firstNameRect ? Math.round(firstNameRect.width) : null,
        selfNameWidth: selfNameRect ? Math.round(selfNameRect.width) : null,
        firstNameRightDelta:
          summaryRect && firstNameRect ? Math.round(Math.abs(summaryRect.right - firstNameRect.right)) : null,
        selfNameRightDelta:
          summaryRect && selfNameRect ? Math.round(Math.abs(summaryRect.right - selfNameRect.right)) : null
      };
    });

    expect(snapshot.hasManager).toBe(true);
    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.timerBoxClassName).toContain("timerbox-hidden-mode");
    expect(snapshot.timerBoxClassName).toContain("timerbox-leaderboard-mode");
    expect(snapshot.panelDisplay).toBe("block");
    expect(snapshot.panelBackground).toBe("rgba(0, 0, 0, 0)");
    expect(snapshot.panelBoxShadow).toBe("none");
    expect(snapshot.summaryBackground).toBe(snapshot.timerBackground);
    expect(snapshot.summaryBoxShadow).toBe(snapshot.timerBoxShadow);
    expect(snapshot.summaryColor).toBe(snapshot.timerColor);
    expect(snapshot.summaryLabelColor).toBe(snapshot.timerLabelColor);
    expect(snapshot.summaryBorderRadius).toBe(snapshot.timerBorderRadius);
    expect(snapshot.summaryLabelFontSize).toBe(snapshot.timerLabelFontSize);
    expect(snapshot.scoreBorderStyle).toBe("none");
    expect(snapshot.scoreBorderWidth).toBe("0px");
    expect(snapshot.bestBorderStyle).toBe("none");
    expect(snapshot.bestBorderWidth).toBe("0px");
    expect(snapshot.summaryText).toBe("TOP 10");
    expect(snapshot.summaryLabel).toBe("排行榜");
    expect(snapshot.summaryRole).toBe("button");
    expect(snapshot.summaryFontSize).toBe("25px");
    expect(snapshot.firstRankClassName).toContain("timertile");
    expect(snapshot.firstNameClassName).toContain("timertile");
    expect(snapshot.firstNameBackground).toBe("rgb(238, 228, 218)");
    expect(snapshot.firstNameColor).toBe("rgb(119, 110, 101)");
    expect(snapshot.selfNameBackground).toBe("rgb(244, 234, 223)");
    expect(snapshot.firstRankText).toBe("1");
    expect(snapshot.firstNameText).toBe("Alice-4096");
    expect(snapshot.firstNameText).toContain("4096");
    expect(snapshot.firstNameText).toContain("Alice");
    expect(snapshot.selfRankText).toBe("2");
    expect(snapshot.selfNameText).toBe("Bob-2048");
    expect(snapshot.firstNameWidth).toBe(187);
    expect(snapshot.selfNameWidth).toBe(187);
    expect(snapshot.firstNameRightDelta).toBeLessThanOrEqual(1);
    expect(snapshot.selfNameRightDelta).toBeLessThanOrEqual(1);
    expect(
      leaderboardRequests.some((url) => new URL(url).searchParams.get("period") === "all")
    ).toBe(true);

    const waitForPeriodRequest = (period: string) =>
      page.waitForRequest((request) => {
        if (!request.url().includes("/api/leaderboard?")) return false;
        return new URL(request.url()).searchParams.get("period") === period;
      });

    let periodRequest = waitForPeriodRequest("day");
    await page.locator("#timer-leaderboard-summary").click();
    await periodRequest;
    await expect(page.locator("#timer-leaderboard-summary")).toHaveText("日榜 TOP 10");
    await expect(page.locator("#timer-leaderboard-summary")).toHaveCSS("font-size", "22px");

    periodRequest = waitForPeriodRequest("week");
    await page.locator("#timer-leaderboard-summary").click();
    await periodRequest;
    await expect(page.locator("#timer-leaderboard-summary")).toHaveText("周榜 TOP 10");
    await expect(page.locator("#timer-leaderboard-summary")).toHaveCSS("font-size", "22px");

    periodRequest = waitForPeriodRequest("month");
    await page.locator("#timer-leaderboard-summary").click();
    await periodRequest;
    await expect(page.locator("#timer-leaderboard-summary")).toHaveText("月榜 TOP 10");
    await expect(page.locator("#timer-leaderboard-summary")).toHaveCSS("font-size", "22px");

    await page.locator("#timer-leaderboard-summary").click();
    await expect(page.locator("#timer-leaderboard-summary")).toHaveText("TOP 10");
    await expect(page.locator("#timer-leaderboard-summary")).toHaveCSS("font-size", "25px");

    const requestCountBeforeCachedSwitch = leaderboardRequests.length;
    await page.locator("#timer-leaderboard-summary").click();
    await expect(page.locator("#timer-leaderboard-summary")).toHaveText("日榜 TOP 10");
    await expect(page.locator("#timer-leaderboard-summary")).toHaveCSS("font-size", "22px");
    await page.waitForTimeout(100);
    expect(leaderboardRequests.length).toBe(requestCountBeforeCachedSwitch);
  });

  test("leaderboard row compacts long allowed nickname and score without clipping", async ({ page }) => {
    await page.route("**/leaderboard?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              user_id: 7,
              nickname: "Alice",
              score: 4096
            },
            {
              user_id: 77,
              nickname: "Phrlova112",
              score: 12345678
            }
          ]
        })
      });
    });

    await page.addInitScript(() => {
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await waitForWindowCondition(
      page,
      () =>
        Boolean((window as any).game_manager) &&
        Boolean((window as any).OnlineLeaderboardRuntime?.refreshTimerLeaderboardPanel),
      12_000
    );

    const snapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      const runtime = (window as any).OnlineLeaderboardRuntime;
      manager.setTimerModuleViewMode("hidden");
      await runtime.refreshTimerLeaderboardPanel(true);
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
      });

      const nameTile = document.querySelector(
        "#timer-leaderboard-list .timer-leaderboard-row:nth-child(2) .timer-leaderboard-name-tile"
      ) as HTMLElement | null;
      const nickname = nameTile?.querySelector(".timer-leaderboard-nickname") as HTMLElement | null;
      const score = nameTile?.querySelector(".timer-leaderboard-score") as HTMLElement | null;
      const tileRect = nameTile?.getBoundingClientRect() || null;
      const nickRect = nickname?.getBoundingClientRect() || null;
      const scoreRect = score?.getBoundingClientRect() || null;

      return {
        tileText: String(nameTile?.textContent || "").trim(),
        nicknameText: String(nickname?.textContent || "").trim(),
        scoreText: String(score?.textContent || "").trim(),
        tileFontSize: nameTile ? String(window.getComputedStyle(nameTile).fontSize || "") : "",
        tileWidth: tileRect ? Math.round(tileRect.width) : null,
        tileClientWidth: nameTile ? Math.round(nameTile.clientWidth) : null,
        tileScrollWidth: nameTile ? Math.round(nameTile.scrollWidth) : null,
        nicknameClientWidth: nickname ? Math.round(nickname.clientWidth) : null,
        nicknameScrollWidth: nickname ? Math.round(nickname.scrollWidth) : null,
        nicknameRight: nickRect ? Math.round(nickRect.right) : null,
        scoreLeft: scoreRect ? Math.round(scoreRect.left) : null,
        scoreRightDelta: tileRect && scoreRect ? Math.round(Math.abs(tileRect.right - scoreRect.right)) : null
      };
    });

    expect(snapshot.tileText).toBe("Phrlova112-12345678");
    expect(snapshot.nicknameText).toBe("Phrlova112");
    expect(snapshot.scoreText).toBe("12345678");
    expect(parseFloat(snapshot.tileFontSize)).toBeLessThanOrEqual(13);
    expect(snapshot.tileWidth).toBe(187);
    expect(snapshot.tileScrollWidth).not.toBeNull();
    expect(snapshot.tileClientWidth).not.toBeNull();
    expect((snapshot.tileScrollWidth ?? 0) <= (snapshot.tileClientWidth ?? 0) + 1).toBe(true);
    expect(snapshot.nicknameScrollWidth).not.toBeNull();
    expect(snapshot.nicknameClientWidth).not.toBeNull();
    expect((snapshot.nicknameScrollWidth ?? 0) <= (snapshot.nicknameClientWidth ?? 0) + 1).toBe(true);
    expect(snapshot.nicknameRight).not.toBeNull();
    expect(snapshot.scoreLeft).not.toBeNull();
    expect((snapshot.nicknameRight ?? 0) <= (snapshot.scoreLeft ?? 0)).toBe(true);
  });

  test("leaderboard frame renders placeholders while online data is loading", async ({ page }) => {
    let releaseLeaderboard: (() => void) | null = null;
    const pendingLeaderboard = new Promise<void>((resolve) => {
      releaseLeaderboard = resolve;
    });

    await page.route("**/api/leaderboard?**", async (route) => {
      await pendingLeaderboard;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_userId_v1", "8");
      window.localStorage.setItem("2048_auth_nickname_v1", "Hui");
    });

    try {
      const response = await page.goto("/2048.html", {
        waitUntil: "domcontentloaded"
      });
      expect(response, "Index response should exist").not.toBeNull();
      expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await waitForWindowCondition(
        page,
        () =>
          Boolean((window as any).game_manager) &&
          Boolean((window as any).OnlineLeaderboardRuntime?.refreshTimerLeaderboardPanel),
        12_000
      );

      await page.evaluate(() => {
        const manager = (window as any).game_manager;
        const runtime = (window as any).OnlineLeaderboardRuntime;
        manager.setTimerModuleViewMode("hidden");
        (window as any).__pendingLeaderboardRefresh = runtime.refreshTimerLeaderboardPanel(true);
      });

      await expect(page.locator("#timer-leaderboard-panel")).toBeVisible();
      await expect(page.locator("#timer-leaderboard-summary")).toHaveText("TOP 10");
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row")).toHaveCount(11);
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row").nth(0)).toContainText("--");
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row.is-self")).toContainText("Hui-0");
    } finally {
      releaseLeaderboard?.();
      await page.evaluate(async () => {
        await (window as any).__pendingLeaderboardRefresh?.catch?.(() => undefined);
      }).catch(() => undefined);
    }
  });

  test("leaderboard period switch shows loading placeholders before uncached data resolves", async ({ page }) => {
    let releaseDayLeaderboard: (() => void) | null = null;
    const pendingDayLeaderboard = new Promise<void>((resolve) => {
      releaseDayLeaderboard = resolve;
    });

    await page.route("**/api/leaderboard?**", async (route) => {
      const url = new URL(route.request().url());
      const period = url.searchParams.get("period") || "all";

      if (period === "day") {
        await pendingDayLeaderboard;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [{ user_id: 9, nickname: "DayUser", score: 512 }]
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{ user_id: 7, nickname: "AllUser", score: 4096 }]
        })
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_userId_v1", "8");
      window.localStorage.setItem("2048_auth_nickname_v1", "Hui");
    });

    try {
      const response = await page.goto("/2048.html", {
        waitUntil: "domcontentloaded"
      });
      expect(response, "Index response should exist").not.toBeNull();
      expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
      await waitForWindowCondition(
        page,
        () =>
          Boolean((window as any).game_manager) &&
          Boolean((window as any).OnlineLeaderboardRuntime?.refreshTimerLeaderboardPanel),
        12_000
      );

      await page.evaluate(async () => {
        const manager = (window as any).game_manager;
        const runtime = (window as any).OnlineLeaderboardRuntime;
        await runtime.refreshTimerLeaderboardPanel(true);
        manager.setTimerModuleViewMode("hidden");
      });

      await expect(page.locator("#timer-leaderboard-summary")).toHaveText("TOP 10");
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row").nth(0)).toContainText(
        "AllUser-4096"
      );

      await page.locator("#timer-leaderboard-summary").click();

      await expect(page.locator("#timer-leaderboard-summary")).toHaveText("日榜 TOP 10");
      await expect(page.locator("#timer-leaderboard-panel")).toHaveClass(/is-loading/);
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row").nth(0)).toContainText("--");
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row").nth(0)).not.toContainText(
        "AllUser-4096"
      );
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row").nth(0)).toHaveCSS(
        "animation-name",
        "leaderboard-loading-pulse"
      );

      releaseDayLeaderboard?.();
      await expect(page.locator("#timer-leaderboard-panel")).not.toHaveClass(/is-loading/);
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row").nth(0)).toContainText(
        "DayUser-512"
      );
    } finally {
      releaseDayLeaderboard?.();
    }
  });

  test("leaderboard background refresh keeps current rows visible while data reloads", async ({ page }) => {
    let holdBackgroundRefresh = false;
    let releaseRefresh: (() => void) | null = null;
    const pendingRefresh = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    await page.route("**/api/leaderboard?**", async (route) => {
      if (holdBackgroundRefresh) {
        await pendingRefresh;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: holdBackgroundRefresh
            ? [{ user_id: 7, nickname: "FreshUser", score: 8192 }]
            : [{ user_id: 7, nickname: "StableUser", score: 4096 }]
        })
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_userId_v1", "8");
      window.localStorage.setItem("2048_auth_nickname_v1", "Hui");
    });

    try {
      const response = await page.goto("/2048.html", {
        waitUntil: "domcontentloaded"
      });
      expect(response, "Index response should exist").not.toBeNull();
      expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
      await waitForWindowCondition(
        page,
        () =>
          Boolean((window as any).game_manager) &&
          Boolean((window as any).OnlineLeaderboardRuntime?.refreshTimerLeaderboardPanel),
        12_000
      );

      await page.evaluate(async () => {
        const manager = (window as any).game_manager;
        const runtime = (window as any).OnlineLeaderboardRuntime;
        await runtime.refreshTimerLeaderboardPanel(true);
        manager.setTimerModuleViewMode("hidden");
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
      });

      await expect(page.locator("#timer-leaderboard-summary")).toHaveText("TOP 10");
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row").nth(0)).toContainText(
        "StableUser-4096"
      );
      await expect(page.locator("#timer-leaderboard-panel")).not.toHaveClass(/is-loading/);

      holdBackgroundRefresh = true;
      await page.evaluate(() => {
        const runtime = (window as any).OnlineLeaderboardRuntime;
        const originalNow = Date.now;
        const staleNow = originalNow() + 13_000;
        Date.now = () => staleNow;
        (window as any).__restoreDateNowForLeaderboardTest = () => {
          Date.now = originalNow;
        };
        (window as any).__pendingLeaderboardRefresh = runtime.refreshTimerLeaderboardPanel(false);
      });

      await expect(page.locator("#timer-leaderboard-summary")).toHaveText("TOP 10");
      await expect(page.locator("#timer-leaderboard-panel")).not.toHaveClass(/is-loading/);
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row").nth(0)).toContainText(
        "StableUser-4096"
      );
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row").nth(0)).not.toContainText("--");

      releaseRefresh?.();
      await page.evaluate(async () => {
        await (window as any).__pendingLeaderboardRefresh;
        (window as any).__restoreDateNowForLeaderboardTest?.();
      });
      await expect(page.locator("#timer-leaderboard-panel")).not.toHaveClass(/is-loading/);
      await expect(page.locator("#timer-leaderboard-list .timer-leaderboard-row").nth(0)).toContainText(
        "FreshUser-8192"
      );
    } finally {
      releaseRefresh?.();
      await page.evaluate(async () => {
        await (window as any).__pendingLeaderboardRefresh?.catch?.(() => undefined);
        (window as any).__restoreDateNowForLeaderboardTest?.();
      }).catch(() => undefined);
    }
  });

  test("timer legend tiles reuse board tile foreground and background colors", async ({ page }) => {
    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    const snapshot = await page.evaluate(() => {
      const values = [32, 64, 128, 2048, 4096, 8192, 16384, 32768, 65536];
      const results: Array<{
        value: number;
        hasLegend: boolean;
        timerColor: string | null;
        timerBackground: string | null;
        timerBoxShadow: string | null;
        boardColor: string | null;
        boardBackground: string | null;
      }> = [];

      for (const value of values) {
        const legend = document.querySelector(`#timer-row-${value} .timertile`) as HTMLElement | null;
        const tile = document.createElement("div");
        tile.className = `tile tile-${value}${value > 2048 ? " tile-super" : ""}`;
        const inner = document.createElement("div");
        inner.className = "tile-inner";
        tile.appendChild(inner);
        document.body.appendChild(tile);

        const legendStyles = legend ? window.getComputedStyle(legend) : null;
        const boardStyles = window.getComputedStyle(inner);

        results.push({
          value,
          hasLegend: !!legend,
          timerColor: legendStyles ? legendStyles.color : null,
          timerBackground: legendStyles ? legendStyles.backgroundColor : null,
          timerBoxShadow: legendStyles ? legendStyles.boxShadow : null,
          boardColor: boardStyles.color,
          boardBackground: boardStyles.backgroundColor
        });

        tile.remove();
      }

      return results;
    });

    for (const result of snapshot) {
      expect(result.hasLegend, `legend should exist for ${result.value}`).toBe(true);
      expect(result.timerColor, `legend text color should match board tile for ${result.value}`).toBe(
        result.boardColor
      );
      expect(
        result.timerBackground,
        `legend background should match board tile for ${result.value}`
      ).toBe(result.boardBackground);
      expect(result.timerBoxShadow, `legend glow should be enabled for ${result.value}`).not.toBe("none");
    }
  });
});

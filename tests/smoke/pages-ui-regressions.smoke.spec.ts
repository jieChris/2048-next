import { expect, test } from "@playwright/test";
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
      .replace(/\bIPS\b/gu, "")
      .replace(/\bWASD\b/gu, "")
      .replace(/\bKHJL\b/gu, "")
      .replace(/\bNo X\b/gu, "")
      .replace(/\b[RKZ]\b/gu, "")
      .replace(/\b\d+k\b/giu, "");
  }

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
          window.localStorage.setItem("practice_guide_shown_v2", "1");
          window.localStorage.setItem("practice_guide_mobile_shown_v1", "1");
        }, lang);
        const response = await page.goto(target, { waitUntil: "domcontentloaded" });
        expect(response, `${target} response should exist`).not.toBeNull();
        expect(response?.ok(), `${target} response should be 2xx`).toBeTruthy();
        await expect(page.locator("body")).toBeVisible();
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

  test("timer module settings description updates immediately when language toggles", async ({ page }) => {
    await routeI18nAuditApi(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("ui_language_v1", "en");
      window.localStorage.setItem("home_guide_seen_v1", "1");
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

    await page.click("label.language-settings-switch");

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
      window.localStorage.setItem("home_guide_seen_v1", "1");
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

  test("settings toolkit entry buttons align with their setting columns", async ({ page }) => {
    await routeI18nAuditApi(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("home_guide_seen_v1", "1");
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

    const alignment = await page.evaluate(() => {
      const rectOf = (selector: string) => {
        const element = document.querySelector(selector) as HTMLElement | null;
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          center: Math.round(rect.left + rect.width / 2),
          width: Math.round(rect.width)
        };
      };
      const rows = Array.from(
        document.querySelectorAll(".settings-modal-content > .settings-row.settings-toggle-row")
      ).slice(0, 2) as HTMLElement[];
      const rowRects = rows.map((row) => {
        const rect = row.getBoundingClientRect();
        return {
          center: Math.round(rect.left + rect.width / 2),
          width: Math.round(rect.width)
        };
      });
      const palette = rectOf("#toolkit-palette-link");
      const account = rectOf("#toolkit-account-link");
      return {
        leftColumnCenter: rowRects[0]?.center ?? null,
        rightColumnCenter: rowRects[1]?.center ?? null,
        leftColumnWidth: rowRects[0]?.width ?? null,
        rightColumnWidth: rowRects[1]?.width ?? null,
        paletteCenter: palette?.center ?? null,
        accountCenter: account?.center ?? null,
        paletteWidth: palette?.width ?? null,
        accountWidth: account?.width ?? null
      };
    });

    expect(Math.abs(Number(alignment.paletteCenter) - Number(alignment.leftColumnCenter))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(alignment.accountCenter) - Number(alignment.rightColumnCenter))).toBeLessThanOrEqual(1);
    expect(Number(alignment.paletteWidth)).toBeLessThan(Number(alignment.leftColumnWidth));
    expect(Number(alignment.accountWidth)).toBeLessThan(Number(alignment.rightColumnWidth));
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

  test("homepage guide overlay does not block timer scroll controls", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("home_guide_seen_v1");
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () => {
        const overlay = document.getElementById("home-guide-overlay") as HTMLElement | null;
        return (
          !!(window as any).CoreHomeGuideRuntime?.buildHomeGuideSteps &&
          !!overlay &&
          window.getComputedStyle(overlay).display === "block" &&
          String(document.body.className || "").indexOf("home-guide-active") !== -1
        );
      },
      12_000
    );

    const beforeClick = await page.evaluate(() => {
      const overlay = document.getElementById("home-guide-overlay") as HTMLElement | null;
      const row65536 = document.getElementById("timer-row-65536") as HTMLElement | null;
      return {
        overlayDisplay: overlay ? window.getComputedStyle(overlay).display : null,
        bodyClassName: String(document.body.className || ""),
        row65536Display: row65536 ? window.getComputedStyle(row65536).display : null,
        row65536Hidden: row65536 ? row65536.getAttribute("data-scroll-hidden") : null
      };
    });

    expect(beforeClick.overlayDisplay).toBe("block");
    expect(beforeClick.bodyClassName).toContain("home-guide-active");
    expect(beforeClick.row65536Display).toBe("none");
    expect(beforeClick.row65536Hidden).toBe("1");

    await page.locator('#timer-scroll-controls [data-scroll-dir="1"]').click();
    await page.waitForTimeout(150);

    const afterClick = await page.evaluate(() => {
      const row65536 = document.getElementById("timer-row-65536") as HTMLElement | null;
      return {
        row65536Display: row65536 ? window.getComputedStyle(row65536).display : null,
        row65536Hidden: row65536 ? row65536.getAttribute("data-scroll-hidden") : null
      };
    });

    expect(afterClick.row65536Display).not.toBe("none");
    expect(afterClick.row65536Hidden).not.toBe("1");
  });

  test("homepage guide overlay does not block export replay action", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("home_guide_seen_v1");
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () => {
        const overlay = document.getElementById("home-guide-overlay") as HTMLElement | null;
        return (
          !!overlay &&
          window.getComputedStyle(overlay).display === "block" &&
          String(document.body.className || "").indexOf("home-guide-active") !== -1 &&
          typeof (window as any).exportReplay === "function"
        );
      },
      12_000
    );

    await page.locator("#top-export-replay-btn").click();
    await expect(page.locator("#replay-modal")).toBeVisible();
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

  test("practice save restore self-heals legacy hidden fixed timer rows on PKU and practice pages", async ({
    page
  }) => {
    await seedBrokenPracticeTimerSave(page);

    const targets = ["/PKU2048.html", "/Practice_board.html"];

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

  test("PKU practice board locks setup after first move and keeps 32k child timers unstarted", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("practice_guide_shown_v2", "1");
      window.localStorage.setItem("practice_guide_mobile_shown_v1", "1");
    });

    const response = await page.goto("/PKU2048.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "PKU response should exist").not.toBeNull();
    expect(response?.ok(), "PKU response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () =>
        Boolean((window as any).game_manager) &&
        Array.from(document.scripts).some((script) => script.src.includes("/js/test_ui.js")) &&
        document.querySelector('.selection-tile[data-value="32768"]') !== null &&
        document.querySelector('.grid-cell[data-x="0"][data-y="0"]') !== null,
      12_000
    );

    await page.locator('.selection-tile[data-value="32768"]').click();
    await expect(page.locator('.selection-tile[data-value="32768"]')).toHaveClass(/selected/);
    await page.locator('.grid-cell[data-x="0"][data-y="0"]').click();
    await expect(page.locator("#timer32768")).toHaveText("---------");

    const beforeMove = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const timer32k = document.getElementById("timer32768") as HTMLElement | null;
      const timer16384Sub = document.getElementById("timer-secondary-32768-16384") as HTMLElement | null;
      const timer8192Sub = document.getElementById("timer-secondary-32768-8192") as HTMLElement | null;
      return {
        hasGameStarted: !!manager?.hasGameStarted,
        timer32k: String(timer32k?.textContent || ""),
        timer16384Sub: String(timer16384Sub?.textContent || ""),
        timer8192Sub: String(timer8192Sub?.textContent || "")
      };
    });

    expect(beforeMove.hasGameStarted).toBe(false);
    expect(beforeMove.timer32k).toBe("---------");
    expect(beforeMove.timer16384Sub).toBe("");
    expect(beforeMove.timer8192Sub).toBe("");

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(180);

    await page.locator('.selection-tile[data-value="16384"]').click();
    await page.locator('.grid-cell[data-x="1"][data-y="0"]').click();
    await page.waitForTimeout(120);

    const afterMove = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const tileAt10 = manager?.grid?.cellContent({ x: 1, y: 0 });
      const tileAt30 = manager?.grid?.cellContent({ x: 3, y: 0 });
      const timer16384Sub = document.getElementById("timer-secondary-32768-16384") as HTMLElement | null;
      return {
        hasGameStarted: !!manager?.hasGameStarted,
        tileAt10: tileAt10 ? tileAt10.value : 0,
        tileAt30: tileAt30 ? tileAt30.value : 0,
        timer16384Sub: String(timer16384Sub?.textContent || "")
      };
    });

    expect(afterMove.hasGameStarted).toBe(true);
    expect(afterMove.tileAt10).not.toBe(16384);
    expect(afterMove.tileAt30).toBe(32768);
    expect(afterMove.timer16384Sub).toBe("");

    await page.click(".restart-button");
    await confirmGameDialog(page);
    await page.waitForTimeout(250);

    const afterRestart = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const tileAt00 = manager?.grid?.cellContent({ x: 0, y: 0 });
      return {
        hasGameStarted: !!manager?.hasGameStarted,
        tileAt00: tileAt00 ? tileAt00.value : 0
      };
    });

    expect(afterRestart.hasGameStarted).toBe(false);
    expect(afterRestart.tileAt00).toBe(32768);

    await page.locator('.selection-tile[data-value="16384"]').click();
    await page.locator('.grid-cell[data-x="1"][data-y="0"]').click();
    await page.waitForTimeout(120);

    const afterSetupPlacement = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const tileAt10 = manager?.grid?.cellContent({ x: 1, y: 0 });
      const timer16384Sub = document.getElementById("timer-secondary-32768-16384") as HTMLElement | null;
      return {
        tileAt10: tileAt10 ? tileAt10.value : 0,
        timer16384Sub: String(timer16384Sub?.textContent || "")
      };
    });

    expect(afterSetupPlacement.tileAt10).toBe(16384);
    expect(afterSetupPlacement.timer16384Sub).toBe("---------");

    await page.click(".restart-button");
    await confirmGameDialog(page);
    await page.waitForTimeout(250);

    const afterSecondRestart = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const board = typeof manager?.getFinalBoardMatrix === "function" ? manager.getFinalBoardMatrix() : [];
      return {
        hasGameStarted: !!manager?.hasGameStarted,
        nonZeroCount: Array.isArray(board)
          ? board.reduce(
              (sum: number, row: unknown) =>
                sum +
                (Array.isArray(row)
                  ? row.filter((value) => Number(value) > 0).length
                  : 0),
              0
            )
          : -1
      };
    });

    expect(afterSecondRestart.hasGameStarted).toBe(false);
    expect(afterSecondRestart.nonZeroCount).toBe(0);
  });

  test("practice board keeps setup editable after first move", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("practice_guide_shown_v2", "1");
      window.localStorage.setItem("practice_guide_mobile_shown_v1", "1");
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
      window.localStorage.setItem("home_guide_seen_v1", "1");
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
        summaryText: summary ? String(summary.textContent || "").trim() : "",
        summaryLabel: summary ? String(summary.getAttribute("data-label") || "") : "",
        summaryRole: summary ? String(summary.getAttribute("role") || "") : "",
        summaryFontSize: summary ? String(window.getComputedStyle(summary).fontSize || "") : "",
        firstRankClassName: firstRank ? String(firstRank.className || "") : "",
        firstNameClassName: firstName ? String(firstName.className || "") : "",
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
    expect(snapshot.summaryText).toBe("TOP 10");
    expect(snapshot.summaryLabel).toBe("排行榜");
    expect(snapshot.summaryRole).toBe("button");
    expect(snapshot.summaryFontSize).toBe("25px");
    expect(snapshot.firstRankClassName).toContain("timertile");
    expect(snapshot.firstNameClassName).toContain("timertile");
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
      window.localStorage.setItem("home_guide_seen_v1", "1");
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
      window.localStorage.setItem("home_guide_seen_v1", "1");
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
      window.localStorage.setItem("home_guide_seen_v1", "1");
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
      window.localStorage.setItem("home_guide_seen_v1", "1");
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

import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  async function seedBrokenPracticeTimerSave(page: import("@playwright/test").Page) {
    const seedResponse = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(seedResponse, "Practice seed response should exist").not.toBeNull();
    expect(seedResponse?.ok(), "Practice seed response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(350);

    const seeded = await page.evaluate(() => {
      const raw = window.localStorage.getItem("savedGameStateByMode:v1:practice");
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!saved || !saved.timer_fixed_rows) return false;
      if (!saved.timer_fixed_rows["32768"] || !saved.timer_fixed_rows["65536"]) return false;
      saved.timer_fixed_rows["32768"].display = "none";
      saved.timer_fixed_rows["65536"].display = "none";
      window.localStorage.setItem("savedGameStateByMode:v1:practice", JSON.stringify(saved));
      return true;
    });

    expect(seeded).toBe(true);
  }

  test("homepage guide overlay does not block timer scroll controls", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("home_guide_seen_v1");
    });

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(350);

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

  test("timer scroll controls stay hidden below 11 active rows and show at 11", async ({
    page
  }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice response should exist").not.toBeNull();
    expect(response?.ok(), "Practice response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

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

  test("leaderboard view reuses timer row layout for rank and nickname rows", async ({ page }) => {
    await page.route("**/api/leaderboard?**", async (route) => {
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
      window.localStorage.setItem("userId", "8");
      window.localStorage.setItem("nickname", "Bob");
    });

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

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

      await runtime.refreshTimerLeaderboardPanel(true);
      manager.setTimerModuleViewMode("hidden");
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
    expect(snapshot.firstRankClassName).toContain("timertile");
    expect(snapshot.firstNameClassName).toContain("timertile");
    expect(snapshot.firstRankText).toBe("1");
    expect(snapshot.firstNameText).toBe("Alice");
    expect(snapshot.firstNameText).not.toContain("4096");
    expect(snapshot.firstNameText).not.toContain("-");
    expect(snapshot.selfRankText).toBe("2");
    expect(snapshot.selfNameText).toBe("Bob");
    expect(snapshot.firstNameWidth).toBe(187);
    expect(snapshot.selfNameWidth).toBe(187);
    expect(snapshot.firstNameRightDelta).toBeLessThanOrEqual(1);
    expect(snapshot.selfNameRightDelta).toBeLessThanOrEqual(1);
  });
});

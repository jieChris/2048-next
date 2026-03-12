import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
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
});

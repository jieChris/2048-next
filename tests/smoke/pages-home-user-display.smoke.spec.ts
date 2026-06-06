import { expect, test } from "@playwright/test";

test.describe("Home user display", () => {
  test("shows guest text above the logo when logged out", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("2048_auth_nickname_v1");
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    await expect(page.locator("#home-user-display")).toHaveText("游客");
  });

  test("shows stored nickname on the action row and aligns the logo with scores", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_nickname_v1", "SmokeUser");
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    await expect(page.locator("#home-user-display")).toHaveText("SmokeUser");
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
    expect(Math.abs(Number(scoreboard.score?.width || 0) - Number(scoreboard.sevenDigitWidth || 0))).toBeLessThanOrEqual(2);
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
});

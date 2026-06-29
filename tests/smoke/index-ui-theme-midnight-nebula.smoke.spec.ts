import { expect, test } from "@playwright/test";
import { mockAcceptedBetaAccess } from "./support/beta-access";
import { waitForWindowCondition } from "./support/runtime-ready";

test.describe("Legacy Multi-Page Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await mockAcceptedBetaAccess(page);
  });

  test("midnight nebula only changes tile colors and restores classic colors when switched back", async ({
    page
  }) => {
    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "2048 response should exist").not.toBeNull();
    expect(response?.ok(), "2048 response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => {
      const manager = (window as any).themeManager || (window as any).ThemeManager;
      return !!manager && typeof manager.applyTheme === "function" && typeof manager.getThemes === "function";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).themeManager || (window as any).ThemeManager;
      if (!manager) {
        return { hasThemeManager: false };
      }

      const themes = typeof manager.getThemes === "function" ? manager.getThemes() : [];
      const hasTheme = Array.isArray(themes)
        ? themes.some((item: any) => item && item.id === "midnight_nebula")
        : false;

      function readUiVisual() {
        const score = document.querySelector(".score-container");
        const board = document.querySelector(".game-container");
        const gridCell = document.querySelector(".grid-cell");
        const restartButton = document.querySelector(".restart-button");
        const topActionButton = document.querySelector(".top-action-btn");
        const timer = document.querySelector("#timer");
        const root = document.documentElement;

        return {
          rootBackgroundImage: root ? window.getComputedStyle(root).backgroundImage : "",
          scoreBackgroundColor: score ? window.getComputedStyle(score).backgroundColor : "",
          scoreColor: score ? window.getComputedStyle(score).color : "",
          boardBackgroundColor: board ? window.getComputedStyle(board).backgroundColor : "",
          boardBoxShadow: board ? window.getComputedStyle(board).boxShadow : "",
          gridCellBackgroundColor: gridCell ? window.getComputedStyle(gridCell).backgroundColor : "",
          restartBackgroundColor: restartButton ? window.getComputedStyle(restartButton).backgroundColor : "",
          restartColor: restartButton ? window.getComputedStyle(restartButton).color : "",
          restartDisplay: restartButton ? window.getComputedStyle(restartButton).display : "",
          restartWidth: restartButton ? window.getComputedStyle(restartButton).width : "",
          restartHeight: restartButton ? window.getComputedStyle(restartButton).height : "",
          restartBorderRadius: restartButton ? window.getComputedStyle(restartButton).borderRadius : "",
          topActionDisplay: topActionButton ? window.getComputedStyle(topActionButton).display : "",
          topActionWidth: topActionButton ? window.getComputedStyle(topActionButton).width : "",
          topActionHeight: topActionButton ? window.getComputedStyle(topActionButton).height : "",
          topActionBorderRadius: topActionButton ? window.getComputedStyle(topActionButton).borderRadius : "",
          timerBackgroundColor: timer ? window.getComputedStyle(timer).backgroundColor : "",
          timerColor: timer ? window.getComputedStyle(timer).color : ""
        };
      }

      function readTileVisual(value: number) {
        const tile = document.createElement("div");
        tile.className = `tile tile-${value}`;
        const inner = document.createElement("div");
        inner.className = "tile-inner";
        inner.textContent = String(value);
        tile.appendChild(inner);
        document.body.appendChild(tile);
        const style = window.getComputedStyle(inner);
        const visual = {
          backgroundImage: style.backgroundImage,
          backgroundColor: style.backgroundColor,
          borderTopColor: style.borderTopColor,
          textColor: style.color
        };
        tile.remove();
        return visual;
      }

      manager.applyTheme("classic");
      const classicBefore = {
        ui: readUiVisual(),
        tile2: readTileVisual(2)
      };

      manager.applyTheme("midnight_nebula");
      const midnight = {
        ui: readUiVisual(),
        tile2: readTileVisual(2),
        tile4: readTileVisual(4)
      };

      manager.applyTheme("classic");
      const classicAfter = {
        ui: readUiVisual(),
        tile2: readTileVisual(2)
      };

      return {
        hasThemeManager: true,
        hasTheme,
        currentTheme: typeof manager.getCurrentTheme === "function" ? manager.getCurrentTheme() : "",
        htmlTheme: document.documentElement.getAttribute("data-theme"),
        classicBefore,
        midnight,
        classicAfter
      };
    });

    expect(snapshot.hasThemeManager).toBe(true);
    expect(snapshot.hasTheme).toBe(true);
    expect(snapshot.currentTheme).toBe("classic");
    expect(snapshot.htmlTheme).toBe("classic");
    expect(snapshot.midnight.ui).toEqual(snapshot.classicAfter.ui);
    expect(snapshot.classicAfter.tile2.backgroundImage).toBe("none");
    expect(snapshot.classicAfter.tile2.backgroundColor).toBe("rgb(238, 228, 218)");
    expect(snapshot.classicAfter.tile2.textColor).toBe("rgb(85, 71, 58)");
    expect(snapshot.midnight.tile2.backgroundImage).not.toBe(snapshot.classicAfter.tile2.backgroundImage);
    expect(snapshot.midnight.tile2.borderTopColor).not.toBe(snapshot.classicAfter.tile2.borderTopColor);
    expect(snapshot.midnight.tile2.backgroundImage).not.toBe(snapshot.midnight.tile4.backgroundImage);
    expect(snapshot.midnight.tile2.borderTopColor).not.toBe(snapshot.midnight.tile4.borderTopColor);
  });
});

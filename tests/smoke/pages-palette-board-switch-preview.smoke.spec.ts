import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("classic follow-theme uses white text from 128 through 2K like 4K", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
    });
    const response = await page.goto("/palette.html", { waitUntil: "domcontentloaded" });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("#palette-preview-board .preview-tile")).toHaveCount(16);

    const colors = await page.evaluate(() => {
      const targetLabels = ["128", "256", "512", "1K", "2K", "4K"];
      const result: Record<string, string> = {};
      const tiles = Array.from(document.querySelectorAll("#palette-preview-board .preview-tile"));
      for (const label of targetLabels) {
        const tile = tiles.find((node) => String(node.textContent || "").trim() === label);
        result[label] = tile ? window.getComputedStyle(tile).color : "";
      }
      return result;
    });

    expect(colors).toEqual({
      "128": "rgb(249, 246, 242)",
      "256": "rgb(249, 246, 242)",
      "512": "rgb(249, 246, 242)",
      "1K": "rgb(249, 246, 242)",
      "2K": "rgb(249, 246, 242)",
      "4K": "rgb(249, 246, 242)"
    });
  });

  test("palette board switch updates preview board", async ({ page }) => {
    const response = await page.goto("/palette.html", { waitUntil: "domcontentloaded" });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("#palette-preview-board .preview-tile")).toHaveCount(16);

    const initialSnapshot = await page.evaluate(() => {
      const selected = document.querySelector(".palette-board-btn.is-active") as HTMLElement | null;
      const board = document.getElementById("palette-preview-board");
      const boardTexts = Array.from(
        document.querySelectorAll("#palette-preview-board .preview-tile"),
        (node) => String(node.textContent || "").trim()
      );
      return {
        selectedBoard: selected?.getAttribute("data-board") || "",
        boardClassName: String(board?.className || ""),
        boardTexts
      };
    });

    expect(initialSnapshot.selectedBoard).toBe("pow2");
    expect(initialSnapshot.boardClassName).toContain("is-pow2");
    expect(initialSnapshot.boardClassName).not.toContain("is-fibonacci");
    expect(initialSnapshot.boardTexts.slice(0, 4)).toEqual(["2", "4", "8", "16"]);

    await page.locator('.palette-board-btn[data-board="fibonacci"]').click();
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const selected = document.querySelector(".palette-board-btn.is-active") as HTMLElement | null;
          return {
            selectedBoard: selected?.getAttribute("data-board") || ""
          };
        });
      })
      .toEqual({
        selectedBoard: "fibonacci"
      });

    const fibonacciSnapshot = await page.evaluate(() => {
      const boardTexts = Array.from(
        document.querySelectorAll("#palette-preview-board .preview-tile"),
        (node) => String(node.textContent || "").trim()
      );
      return { boardTexts };
    });

    expect(fibonacciSnapshot.boardTexts.slice(0, 4)).toEqual(["1", "2", "3", "5"]);

    await page.locator('.palette-board-btn[data-board="pow2"]').click();
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const selected = document.querySelector(".palette-board-btn.is-active") as HTMLElement | null;
          const boardTexts = Array.from(
            document.querySelectorAll("#palette-preview-board .preview-tile"),
            (node) => String(node.textContent || "").trim()
          );
          return {
            selectedBoard: selected?.getAttribute("data-board") || "",
            boardTexts: boardTexts.slice(0, 4)
          };
        });
      })
      .toEqual({
        selectedBoard: "pow2",
        boardTexts: ["2", "4", "8", "16"]
      });
  });

  test("palette fibonacci preview footprint keeps parity with pow2", async ({ page }) => {
    const response = await page.goto("/palette.html", { waitUntil: "domcontentloaded" });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("#palette-preview-board .preview-tile")).toHaveCount(16);

    const collectMetrics = async () => {
      return page.evaluate(() => {
        const board = document.getElementById("palette-preview-board");
        const legend = document.getElementById("palette-preview-legend");
        const firstTile = document.querySelector("#palette-preview-board .preview-tile") as HTMLElement | null;
        const boardRect = board?.getBoundingClientRect();
        const legendRect = legend?.getBoundingClientRect();
        const tileRect = firstTile?.getBoundingClientRect();
        return {
          boardWidth: boardRect ? boardRect.width : 0,
          boardHeight: boardRect ? boardRect.height : 0,
          legendWidth: legendRect ? legendRect.width : 0,
          legendHeight: legendRect ? legendRect.height : 0,
          tileWidth: tileRect ? tileRect.width : 0,
          tileHeight: tileRect ? tileRect.height : 0
        };
      });
    };

    const pow2Metrics = await collectMetrics();
    await page.locator('.palette-board-btn[data-board="fibonacci"]').click();
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const selected = document.querySelector(".palette-board-btn.is-active") as HTMLElement | null;
          return selected?.getAttribute("data-board") || "";
        });
      })
      .toBe("fibonacci");
    const fibMetrics = await collectMetrics();

    expect(pow2Metrics.boardWidth).toBeGreaterThan(0);
    expect(pow2Metrics.boardHeight).toBeGreaterThan(0);
    expect(pow2Metrics.tileWidth).toBeGreaterThan(0);
    expect(pow2Metrics.tileHeight).toBeGreaterThan(0);
    expect(fibMetrics.boardWidth).toBeGreaterThan(0);
    expect(fibMetrics.boardHeight).toBeGreaterThan(0);
    expect(fibMetrics.tileWidth).toBeGreaterThan(0);
    expect(fibMetrics.tileHeight).toBeGreaterThan(0);

    // Keep the two rulesets visually aligned: no large size drift after board switch.
    expect(Math.abs(fibMetrics.boardWidth - pow2Metrics.boardWidth)).toBeLessThanOrEqual(2);
    expect(Math.abs(fibMetrics.boardHeight - pow2Metrics.boardHeight)).toBeLessThanOrEqual(2);
    expect(Math.abs(fibMetrics.tileWidth - pow2Metrics.tileWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(fibMetrics.tileHeight - pow2Metrics.tileHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(fibMetrics.legendWidth - pow2Metrics.legendWidth)).toBeLessThanOrEqual(2);
    expect(Math.abs(fibMetrics.legendHeight - pow2Metrics.legendHeight)).toBeLessThanOrEqual(2);
  });
});

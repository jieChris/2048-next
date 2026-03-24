import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("palette board switch updates preview board and legend values", async ({ page }) => {
    const response = await page.goto("/palette.html", { waitUntil: "domcontentloaded" });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("#palette-preview-board .preview-tile")).toHaveCount(16);
    await expect(page.locator("#palette-preview-legend .legend-pill")).toHaveCount(12);

    const initialSnapshot = await page.evaluate(() => {
      const selected = document.querySelector(".palette-board-btn.is-active") as HTMLElement | null;
      const board = document.getElementById("palette-preview-board");
      const legendTexts = Array.from(
        document.querySelectorAll("#palette-preview-legend .legend-pill"),
        (node) => String(node.textContent || "").trim()
      );
      const boardTexts = Array.from(
        document.querySelectorAll("#palette-preview-board .preview-tile"),
        (node) => String(node.textContent || "").trim()
      );
      return {
        selectedBoard: selected?.getAttribute("data-board") || "",
        boardClassName: String(board?.className || ""),
        legendTexts,
        boardTexts
      };
    });

    expect(initialSnapshot.selectedBoard).toBe("pow2");
    expect(initialSnapshot.boardClassName).toContain("is-pow2");
    expect(initialSnapshot.boardClassName).not.toContain("is-fibonacci");
    expect(initialSnapshot.legendTexts[0]).toBe("32");
    expect(initialSnapshot.legendTexts[initialSnapshot.legendTexts.length - 1]).toBe("65536");
    expect(initialSnapshot.boardTexts.slice(0, 4)).toEqual(["2", "4", "8", "16"]);

    await page.locator('.palette-board-btn[data-board="fibonacci"]').click();
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const selected = document.querySelector(".palette-board-btn.is-active") as HTMLElement | null;
          const legendTexts = Array.from(
            document.querySelectorAll("#palette-preview-legend .legend-pill"),
            (node) => String(node.textContent || "").trim()
          );
          return {
            selectedBoard: selected?.getAttribute("data-board") || "",
            legendFirst: legendTexts[0] || "",
            legendLast: legendTexts[legendTexts.length - 1] || ""
          };
        });
      })
      .toEqual({
        selectedBoard: "fibonacci",
        legendFirst: "8",
        legendLast: "1597"
      });

    const fibonacciSnapshot = await page.evaluate(() => {
      const legendTexts = Array.from(
        document.querySelectorAll("#palette-preview-legend .legend-pill"),
        (node) => String(node.textContent || "").trim()
      );
      const boardTexts = Array.from(
        document.querySelectorAll("#palette-preview-board .preview-tile"),
        (node) => String(node.textContent || "").trim()
      );
      return { legendTexts, boardTexts };
    });

    expect(fibonacciSnapshot.legendTexts).toHaveLength(12);
    expect(fibonacciSnapshot.legendTexts[0]).toBe("8");
    expect(fibonacciSnapshot.legendTexts[fibonacciSnapshot.legendTexts.length - 1]).toBe("1597");
    expect(fibonacciSnapshot.legendTexts).not.toContain("2048");
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

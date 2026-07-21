import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("touch sensitivity entry is hidden on desktop and shown on narrow touch devices", async ({ browser, page }) => {
    await page.goto("/palette.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".palette-touch-entry")).toBeHidden();

    const touchContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const touchPage = await touchContext.newPage();
    await touchPage.goto("/palette.html", { waitUntil: "domcontentloaded" });
    await expect(touchPage.locator(".palette-touch-entry")).toBeVisible();
    await touchContext.close();
  });

  test("palette internal controls use the enamel button palette", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("settings_day_theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("settings_night_theme_profile_v1", "mist_cyan");
    });
    const response = await page.goto("/palette.html", { waitUntil: "domcontentloaded" });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator(".palette-item.is-active")).toBeVisible();
    await expect(page.locator('link[href^="style/palette_page.css"]')).toHaveAttribute(
      "href",
      "style/palette_page.css?v=20260720-theme-controls-v1"
    );

    await page.waitForSelector(".swatch-chip", { state: "attached" });

    const styles = await page.evaluate(() => {
      function snapshot(selector: string) {
        const node = document.querySelector<HTMLElement>(selector);
        if (!node) return null;
        const style = window.getComputedStyle(node);
        return {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow
        };
      }

      return {
        themeSelection: snapshot(".theme-selection-col"),
        boardSelection: snapshot(".theme-selection-col .board-selection-col"),
        board: snapshot(".palette-board-btn:not(.is-active)"),
        activeBoard: snapshot(".palette-board-btn.is-active"),
        activeDimension: snapshot(".palette-dimension-tab.is-active"),
        activePalette: snapshot(".palette-item.is-active"),
        selectTrigger: snapshot(".custom-select-trigger"),
        activeTarget: snapshot(".color-target.is-active-target"),
        swatch: snapshot(".swatch-chip"),
        createButton: snapshot("#palette-create-btn")
      };
    });

    expect(styles.themeSelection).toMatchObject({
      backgroundColor: "rgb(237, 243, 242)",
      borderColor: "rgba(47, 92, 99, 0.26)"
    });
    expect(styles.boardSelection).toMatchObject({
      backgroundColor: "rgb(237, 243, 242)",
      borderColor: "rgba(47, 92, 99, 0.26)"
    });
    expect(styles.board).toMatchObject({
      backgroundColor: "rgb(255, 254, 249)",
      borderRadius: "7px"
    });
    expect(styles.activeBoard?.backgroundColor).toBe("rgb(32, 56, 61)");
    expect(styles.activeDimension?.backgroundColor).toBe("rgb(32, 56, 61)");
    expect(styles.activePalette).toMatchObject({
      borderColor: "rgb(47, 134, 160)",
      borderRadius: "7px"
    });
    expect(styles.selectTrigger).toMatchObject({
      backgroundColor: "rgb(255, 254, 249)",
      borderRadius: "7px"
    });
    expect(styles.activeTarget).toMatchObject({
      borderColor: "rgb(47, 134, 160)",
      borderRadius: "7px"
    });
    expect(styles.swatch?.borderRadius).toBe("7px");
    expect(styles.createButton?.backgroundColor).toBe("rgb(32, 56, 61)");
  });

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

  test("cold cyan stepped palette keeps adjacent values distinct", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "cold-cyan-steps");
    });
    await page.goto("/palette.html", { waitUntil: "domcontentloaded" });

    const paletteItem = page.locator('[data-palette-id="cold-cyan-steps"]');
    await expect(paletteItem).toHaveCount(1);
    await expect(paletteItem).toHaveClass(/is-active/);

    const metrics = await page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const palette = manager.getTilePalettes().find((item: any) => item.id === "cold-cyan-steps");
      const rgb = (hex: string) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
      const luminance = (hex: string) => {
        const channels = rgb(hex).map((value) => {
          const normalized = value / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });
        return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
      };
      const contrast = (background: string, foreground: string) => {
        const a = luminance(background);
        const b = luminance(foreground);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const adjacentDistances = palette.pow2.slice(1).map((color: string, index: number) => {
        const current = rgb(color);
        const previous = rgb(palette.pow2[index]);
        return Math.hypot(...current.map((value, channel) => value - previous[channel]));
      });
      const textContrasts = palette.pow2.map((color: string, index: number) => (
        contrast(color, palette.pow2Text[index])
      ));
      return {
        pow2: palette.pow2,
        fibonacci: palette.fibonacci,
        pow2Text: palette.pow2Text,
        minAdjacentDistance: Math.min(...adjacentDistances),
        minTextContrast: Math.min(...textContrasts)
      };
    });

    expect(metrics.pow2).toEqual([
      "#e7f7f6", "#a9dad7", "#4abdb7", "#147f86",
      "#8bcdd0", "#287d99", "#35b9b3", "#0c5c70",
      "#73b9d2", "#1b6d98", "#55c4bb", "#08495f",
      "#4ca5c3", "#096a74", "#4d9bd5", "#05384b"
    ]);
    expect(metrics.fibonacci).toEqual(metrics.pow2);
    expect(metrics.pow2Text).toEqual([
      "#082a30", "#082a30", "#082a30", "#f7fefd",
      "#082a30", "#f7fefd", "#082a30", "#f7fefd",
      "#082a30", "#f7fefd", "#082a30", "#f7fefd",
      "#082a30", "#f7fefd", "#082a30", "#f7fefd"
    ]);
    expect(metrics.minAdjacentDistance).toBeGreaterThanOrEqual(64);
    expect(metrics.minTextContrast).toBeGreaterThanOrEqual(4.5);
  });

  test("warm glaze stepped palette keeps 2, 4, and adjacent values distinct", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "warm-glaze-steps");
    });
    await page.goto("/palette.html", { waitUntil: "domcontentloaded" });

    const paletteItem = page.locator('[data-palette-id="warm-glaze-steps"]');
    await expect(paletteItem).toHaveCount(1);
    await expect(paletteItem).toHaveClass(/is-active/);

    const metrics = await page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const palette = manager.getTilePalettes().find((item: any) => item.id === "warm-glaze-steps");
      const rgb = (hex: string) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
      const luminance = (hex: string) => {
        const channels = rgb(hex).map((value) => {
          const normalized = value / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });
        return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
      };
      const contrast = (background: string, foreground: string) => {
        const a = luminance(background);
        const b = luminance(foreground);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const adjacentDistances = palette.pow2.slice(1).map((color: string, index: number) => {
        const current = rgb(color);
        const previous = rgb(palette.pow2[index]);
        return Math.hypot(...current.map((value, channel) => value - previous[channel]));
      });
      const textContrasts = palette.pow2.map((color: string, index: number) => (
        contrast(color, palette.pow2Text[index])
      ));
      return {
        pow2: palette.pow2,
        fibonacci: palette.fibonacci,
        pow2Text: palette.pow2Text,
        twoFourDistance: adjacentDistances[0],
        minAdjacentDistance: Math.min(...adjacentDistances),
        minTextContrast: Math.min(...textContrasts)
      };
    });

    expect(metrics.pow2).toEqual([
      "#f7e3c3", "#e9a85f", "#c95e4b", "#f28e3b",
      "#b53a32", "#f2b33d", "#c96b35", "#f1c94a",
      "#a9493f", "#e99138", "#8f3248", "#d86c55",
      "#6e2948", "#b94062", "#7a3e24", "#4c1e45"
    ]);
    expect(metrics.fibonacci).toEqual(metrics.pow2);
    expect(metrics.pow2Text).toEqual([
      "#21100c", "#21100c", "#21100c", "#21100c",
      "#fff9f2", "#21100c", "#21100c", "#21100c",
      "#fff9f2", "#21100c", "#fff9f2", "#21100c",
      "#fff9f2", "#fff9f2", "#fff9f2", "#fff9f2"
    ]);
    expect(metrics.twoFourDistance).toBeGreaterThanOrEqual(100);
    expect(metrics.minAdjacentDistance).toBeGreaterThanOrEqual(64);
    expect(metrics.minTextContrast).toBeGreaterThanOrEqual(4.5);
  });

  test("jade ochre palette uses cross-hue contrast for adjacent values", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "jade-ochre");
    });
    await page.goto("/palette.html", { waitUntil: "domcontentloaded" });

    const paletteItem = page.locator('[data-palette-id="jade-ochre"]');
    await expect(paletteItem).toHaveCount(1);
    await expect(paletteItem).toHaveClass(/is-active/);

    const metrics = await page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const palette = manager.getTilePalettes().find((item: any) => item.id === "jade-ochre");
      const rgb = (hex: string) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
      const luminance = (hex: string) => {
        const channels = rgb(hex).map((value) => {
          const normalized = value / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });
        return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
      };
      const contrast = (background: string, foreground: string) => {
        const a = luminance(background);
        const b = luminance(foreground);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const adjacentDistances = palette.pow2.slice(1).map((color: string, index: number) => {
        const current = rgb(color);
        const previous = rgb(palette.pow2[index]);
        return Math.hypot(...current.map((value, channel) => value - previous[channel]));
      });
      const textContrasts = palette.pow2.map((color: string, index: number) => (
        contrast(color, palette.pow2Text[index])
      ));
      return {
        pow2: palette.pow2,
        fibonacci: palette.fibonacci,
        pow2Text: palette.pow2Text,
        twoFourDistance: adjacentDistances[0],
        minAdjacentDistance: Math.min(...adjacentDistances),
        minTextContrast: Math.min(...textContrasts)
      };
    });

    expect(metrics.pow2).toEqual([
      "#f4ead8", "#b6a15f", "#315f54", "#c56f52",
      "#806e2d", "#5d8a7a", "#7b3947", "#d3b975",
      "#28463f", "#a7593f", "#493144", "#9d8248",
      "#1f3935", "#b46858", "#4f2b36", "#102f28"
    ]);
    expect(metrics.fibonacci).toEqual(metrics.pow2);
    expect(metrics.pow2Text).toEqual([
      "#15110d", "#15110d", "#fffcf6", "#15110d",
      "#fffcf6", "#15110d", "#fffcf6", "#15110d",
      "#fffcf6", "#fffcf6", "#fffcf6", "#15110d",
      "#fffcf6", "#15110d", "#fffcf6", "#fffcf6"
    ]);
    expect(metrics.twoFourDistance).toBeGreaterThanOrEqual(100);
    expect(metrics.minAdjacentDistance).toBeGreaterThanOrEqual(64);
    expect(metrics.minTextContrast).toBeGreaterThanOrEqual(4.5);
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

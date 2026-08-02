import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("fresh profile defaults to mist cyan with the cold cyan palette", async ({ page }) => {
    await page.addInitScript(() => {
      for (const key of [
        "theme_profile_v1",
        "tile_palette_active_v1",
        "settings_day_theme_profile_v1",
        "settings_day_tile_palette_v1",
        "settings_night_theme_profile_v1",
        "settings_night_tile_palette_v1"
      ]) {
        window.localStorage.removeItem(key);
      }
      window.localStorage.setItem("settings_night_background_enabled_v1", "0");
    });

    await page.goto("/palette.html", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#timer-settings")).toBeVisible();
    await expect(page.locator("#appearance-settings")).toBeHidden();
    await page.locator('.settings-category-link[href="#appearance-settings"]').click();
    await expect(page.locator("#timer-settings")).toBeHidden();
    await expect(page.locator("#appearance-settings")).toBeVisible();
    await expect(page.locator('.settings-category-link[href="#appearance-settings"]')).toHaveAttribute("aria-current", "page");

    await page.locator('.settings-category-link[href="#timer-settings"]').click();
    await expect(page.locator("#timer-settings")).toBeVisible();
    await expect(page.locator("#appearance-settings")).toBeHidden();
    await expect(page.locator('.settings-category-link[href="#timer-settings"]')).toHaveAttribute("aria-current", "page");

    await page.locator('.settings-category-link[href="#appearance-settings"]').click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "mist_cyan");
    await expect(page.locator("#theme-select-trigger > span")).toHaveText("雾青灰");
    await expect(page.locator('.palette-item.is-active[data-palette-id="cold-cyan-steps"]')).toBeVisible();
    await expect(page.locator('#theme-select-options .custom-option[data-value="classic"]')).toHaveText("经典");
  });

  test("touch sensitivity entry is hidden on desktop and shown on narrow touch devices", async ({ browser, page }) => {
    await page.goto("/palette.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".palette-touch-entry")).toBeHidden();

    const touchContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const touchPage = await touchContext.newPage();
    await touchPage.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("settings_day_theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("settings_night_theme_profile_v1", "mist_cyan");
    });
    await touchPage.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });
    await expect(touchPage.locator(".palette-touch-entry")).toBeVisible();
    await expect(touchPage.locator("#palette-preview-board")).toHaveCSS("width", "280px");
    await expect(touchPage.locator("#palette-preview-board")).toHaveCSS("padding", "10px");
    await expect(touchPage.locator("#palette-preview-board")).toHaveCSS("gap", "10px");
    await expect(touchPage.locator("#palette-preview-board")).toHaveCSS("background-color", "rgb(184, 201, 199)");
    expect(await touchPage.locator("#palette-list .palette-item").evaluateAll((items) =>
      items.every((item) => item.clientHeight >= item.scrollHeight)
    )).toBe(true);
    await expect(touchPage.locator('#palette-preview-board .preview-tile[data-value="2"] .tile-inner')).toHaveCSS("font-size", "28px");
    await expect(touchPage.locator('#palette-preview-board .preview-tile[data-value="128"] .tile-inner')).toHaveCSS("font-size", "26px");
    await expect(touchPage.locator('#palette-preview-board .preview-tile[data-value="1024"] .tile-inner')).toHaveCSS("font-size", "20px");
    await expect(touchPage.locator('#palette-preview-board .preview-tile[data-value="16384"] .tile-inner')).toHaveCSS("font-size", "17px");
    await touchPage.locator(".palette-expand-target").click();
    expect(await touchPage.locator("#palette-preview-board .tile-inner").evaluateAll((nodes) =>
      nodes.every((node) => node.scrollWidth <= node.clientWidth + 1)
    )).toBe(true);
    await touchContext.close();
  });

  test("palette internal controls use the enamel button palette", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("settings_day_theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("settings_night_theme_profile_v1", "mist_cyan");
    });
    const response = await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator(".palette-item.is-active")).toBeVisible();
    await expect(page.locator("#palette-name-input")).toBeDisabled();
    await expect(page.locator("#palette-name-input")).toHaveCSS("opacity", "0.42");
    await expect(page.locator("#palette-name-input")).toHaveCSS("cursor", "not-allowed");
    await expect(page.locator("#palette-name-input")).toHaveAttribute("title", "内置色板名称不可修改，请先新建副本。");
    await expect(page.locator(".color-panel-head > #palette-note")).toContainText("请先新建副本");
    await expect(page.locator(".palette-editor > #palette-note")).toHaveCount(0);
    await expect(page.locator('[data-palette-id="eyestrain-soft"]')).toHaveCount(0);
    await expect(page.locator('[data-palette-id="night-paper"]')).toHaveCount(0);
    await expect(page.locator("#appearance-settings .settings-section-head")).toHaveCount(0);
    await expect(page.locator(".palette-editor > .panel-head")).toHaveCount(0);
    await expect(page.locator(".palette-theme-card")).toHaveCount(0);
    await expect(page.locator("#palette-board-switch")).toHaveCount(0);
    await expect(page.locator(".palette-sidebar > .theme-selection-col")).toBeVisible();
    await expect(page.locator(".palette-sidebar .panel-head h2")).toHaveText("色板");
    await expect(page.locator(".palette-sidebar .panel-head h2")).toHaveCSS("font-size", "15px");
    await expect(page.locator(".palette-sidebar .panel-head h2")).toHaveCSS("font-weight", "600");
    await expect(page.locator("#palette-list .palette-item").first()).toHaveCSS("margin-top", "4px");
    await expect(page.locator("#theme-select-trigger .custom-arrow")).toHaveCSS("width", "12px");
    await expect(page.locator("#theme-select-trigger .custom-arrow")).toHaveCSS("border-left-width", "0px");
    await expect(page.locator("#theme-select-trigger .custom-arrow")).toHaveCSS("border-top-width", "0px");
    await expect(page.locator(".palette-variant-note")).toHaveText("色板颜色会按方块等级映射到其他棋盘变体。");
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
        activeDimension: snapshot(".palette-dimension-tab.is-active"),
        activePalette: snapshot(".palette-item.is-active"),
        selectTrigger: snapshot(".custom-select-trigger"),
        activeTarget: snapshot(".color-target.is-active-target"),
        swatch: snapshot(".swatch-chip"),
        createButton: snapshot("#palette-create-btn"),
        previewBoard: snapshot("#palette-preview-board")
      };
    });

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
    expect(styles.previewBoard).toMatchObject({
      backgroundColor: "rgb(184, 201, 199)",
      borderRadius: "7px"
    });
    expect(styles.previewBoard?.boxShadow).toContain("rgba(42, 74, 78, 0.13)");
  });

  test("classic follow-theme uses white text from 128 through 2048 like 4096", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
    });
    const response = await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("#palette-preview-board .preview-tile")).toHaveCount(16);
    await expect(page.locator("#palette-preview-board")).toHaveClass(/game-container/);
    await expect(page.locator('#palette-preview-board .preview-tile[data-value="2"] .tile-inner')).toHaveCSS("font-size", "51px");
    await expect(page.locator('#palette-preview-board .preview-tile[data-value="128"] .tile-inner')).toHaveCSS("font-size", "43px");
    await expect(page.locator('#palette-preview-board .preview-tile[data-value="1024"] .tile-inner')).toHaveCSS("font-size", "37px");
    await expect(page.locator('#palette-preview-board .preview-tile[data-value="4096"] .tile-inner')).toHaveCSS("font-size", "37px");
    await expect(page.locator('#palette-preview-board .preview-tile[data-value="16384"] .tile-inner')).toHaveCSS("font-size", "31px");

    const colors = await page.evaluate(() => {
      const targetLabels = ["128", "256", "512", "1024", "2048", "4096"];
      const result: Record<string, string> = {};
      const tiles = Array.from(document.querySelectorAll("#palette-preview-board .preview-tile"));
      for (const label of targetLabels) {
        const tile = tiles.find((node) => String(node.textContent || "").trim() === label);
        const inner = tile?.querySelector(".tile-inner");
        result[label] = inner ? window.getComputedStyle(inner).color : "";
      }
      return result;
    });

    expect(colors).toEqual({
      "128": "rgb(249, 246, 242)",
      "256": "rgb(249, 246, 242)",
      "512": "rgb(249, 246, 242)",
      "1024": "rgb(249, 246, 242)",
      "2048": "rgb(249, 246, 242)",
      "4096": "rgb(249, 246, 242)"
    });
  });

  test("mist cyan follow-theme maps to the cold cyan stepped palette", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
    });
    await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });

    const palettes = await page.evaluate(() => {
      const list = (window as any).ThemeManager.getTilePalettes();
      const follow = list.find((item: any) => item.id === "follow-theme");
      const cold = list.find((item: any) => item.id === "cold-cyan-steps");
      return {
        follow: [follow?.pow2, follow?.pow2Text, follow?.pow2Border, follow?.pow2Glow],
        cold: [cold?.pow2, cold?.pow2Text, cold?.pow2Border, cold?.pow2Glow]
      };
    });

    expect(palettes.follow).toEqual(palettes.cold);
  });

  test("cold cyan stepped palette keeps adjacent values distinct", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "cold-cyan-steps");
    });
    await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });

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
      const pow2 = palette.pow2.slice(0, 16);
      const pow2Text = palette.pow2Text.slice(0, 16);
      const adjacentDistances = pow2.slice(1).map((color: string, index: number) => {
        const current = rgb(color);
        const previous = rgb(pow2[index]);
        return Math.hypot(...current.map((value, channel) => value - previous[channel]));
      });
      const textContrasts = pow2.map((color: string, index: number) => (
        contrast(color, pow2Text[index])
      ));
      return {
        pow2,
        fibonacci: palette.fibonacci,
        pow2Text,
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
    await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });

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
      const pow2 = palette.pow2.slice(0, 16);
      const pow2Text = palette.pow2Text.slice(0, 16);
      const adjacentDistances = pow2.slice(1).map((color: string, index: number) => {
        const current = rgb(color);
        const previous = rgb(pow2[index]);
        return Math.hypot(...current.map((value, channel) => value - previous[channel]));
      });
      const textContrasts = pow2.map((color: string, index: number) => (
        contrast(color, pow2Text[index])
      ));
      return {
        pow2,
        fibonacci: palette.fibonacci,
        pow2Text,
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
    await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });

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
      const pow2 = palette.pow2.slice(0, 16);
      const pow2Text = palette.pow2Text.slice(0, 16);
      const adjacentDistances = pow2.slice(1).map((color: string, index: number) => {
        const current = rgb(color);
        const previous = rgb(pow2[index]);
        return Math.hypot(...current.map((value, channel) => value - previous[channel]));
      });
      const textContrasts = pow2.map((color: string, index: number) => (
        contrast(color, pow2Text[index])
      ));
      return {
        pow2,
        fibonacci: palette.fibonacci,
        pow2Text,
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

  test("palette editor maps colors to other board variants by tile level", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
      window.localStorage.removeItem("tile_palette_profiles_v1");
    });
    const response = await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("#palette-board-switch")).toHaveCount(0);
    await page.locator("#palette-create-btn").click();
    await page.locator('.color-target[data-index="0"]').click();
    await page.locator("#palette-picker-r").fill("18");
    await page.locator("#palette-picker-g").fill("52");
    await page.locator("#palette-picker-b").fill("86");

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const manager = (window as any).ThemeManager;
          const activeId = manager.getActiveTilePaletteId();
          const palette = manager.getTilePalettes().find((item: any) => item.id === activeId);
          return [palette?.pow2?.[0], palette?.fibonacci?.[0]];
        });
      })
      .toEqual(["#123456", "#123456"]);
  });

  test("pow2 palette extension edits colors through the 5x5 theoretical maximum", async ({ page }) => {
    await page.addInitScript(() => {
      if (window.sessionStorage.getItem("palette_extension_test_ready") !== "1") {
        window.localStorage.setItem("theme_profile_v1", "classic");
        window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
        window.localStorage.removeItem("tile_palette_profiles_v1");
        window.sessionStorage.setItem("palette_extension_test_ready", "1");
      }
    });
    await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#theme-preview-grid-pow2 .theme-preview-tile")).toHaveCount(16);
    await expect(page.locator("#palette-editor-current .color-target")).toHaveCount(16);
    await expect(page.locator("#palette-preview-board .preview-tile")).toHaveCount(16);
    await expect(page.locator('.color-target[data-index="9"] .color-target-label')).toHaveText("1024");
    await expect(page.locator('.color-target[data-index="15"] .color-target-label')).toHaveText("65536");
    await expect(page.locator("#theme-preview-grid-pow2 .theme-color-1024")).toHaveText("1024");
    await expect(page.locator("#theme-preview-grid-pow2 .theme-color-65536")).toHaveText("65536");
    const expandButton = page.locator(".palette-expand-target");
    await expect(expandButton).toHaveText("拓展");
    await expect(expandButton).toHaveAttribute("aria-expanded", "false");

    await page.locator("#palette-create-btn").click();
    await expect(page.locator("#palette-name-input")).toBeEnabled();
    await expandButton.click();
    await expect(expandButton).toHaveText("收起");
    await expect(expandButton).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#palette-editor-current .color-target")).toHaveCount(10);
    await expect(page.locator('.color-target[data-index="0"]')).toHaveCount(0);
    await expect(page.locator('.color-target[data-index="16"] .color-target-label')).toHaveText("131072");
    await expect(page.locator('.color-target[data-index="25"] .color-target-label')).toHaveText("67108864");
    await expect(page.locator("#palette-preview-board .preview-tile")).toHaveCount(10);
    await expect(page.locator('#palette-preview-board .preview-tile[data-value="65536"]')).toHaveCount(0);
    await expect(page.locator('#palette-preview-board .preview-tile[data-value="131072"]')).toHaveCount(1);
    await expect(page.locator('#palette-preview-board .preview-tile[data-value="67108864"]')).toHaveCount(1);
    expect(await page.locator("#palette-preview-board .tile-inner").evaluateAll((nodes) =>
      nodes.every((node) => node.scrollWidth <= node.clientWidth + 1)
    )).toBe(true);

    await page.locator('.color-target[data-index="16"]').click();
    await page.locator("#palette-picker-r").fill("18");
    await page.locator("#palette-picker-g").fill("52");
    await page.locator("#palette-picker-b").fill("86");
    await page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const activeId = manager.getActiveTilePaletteId();
      manager.updateTilePaletteColor(activeId, "pow2", "text", 25, "#abcdef");
      manager.updateTilePaletteColor(activeId, "pow2", "border", 25, "#654321");
      manager.updateTilePaletteColor(activeId, "pow2", "glow", 25, "#fedcba");
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    const persisted = await page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const activeId = manager.getActiveTilePaletteId();
      const palette = manager.getTilePalettes().find((item: any) => item.id === activeId);
      const exportedPalette = JSON.parse(manager.exportTilePalettes()).palettes.find(
        (item: any) => item.id === activeId
      );
      const css = String(document.getElementById("theme-dynamic-style")?.textContent || "");
      return {
        pow2Count: palette?.pow2?.length || 0,
        highColor: palette?.pow2?.[16] || "",
        highestText: palette?.pow2Text?.[25] || "",
        highestBorder: palette?.pow2Border?.[25] || "",
        highestGlow: palette?.pow2Glow?.[25] || "",
        exportedPow2Count: exportedPalette?.pow2?.length || 0,
        hasHighestRule: css.includes("tile-67108864")
      };
    });

    expect(persisted).toEqual({
      pow2Count: 26,
      highColor: "#123456",
      highestText: "#abcdef",
      highestBorder: "#654321",
      highestGlow: "#fedcba",
      exportedPow2Count: 26,
      hasHighestRule: true
    });
  });

});

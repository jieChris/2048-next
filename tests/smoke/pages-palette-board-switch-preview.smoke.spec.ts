import { expect, test } from "@playwright/test";

async function openAppearanceWorkspace(page: import("@playwright/test").Page) {
  const disclosure = page.locator("#appearance-settings-editor");
  if (!await disclosure.evaluate((element) => element.open)) {
    await disclosure.locator("summary").click();
  }
}

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
    await expect(page.locator("#appearance-settings")).toBeVisible();
    await page.locator('.settings-category-link[href="#appearance-settings"]').click();
    await openAppearanceWorkspace(page);
    await expect(page.locator("#timer-settings")).toBeVisible();
    await expect(page.locator("#appearance-settings")).toBeVisible();
    await expect(page.locator('.settings-category-link[href="#appearance-settings"]')).toHaveAttribute("aria-current", "location");

    await page.locator('.settings-category-link[href="#timer-settings"]').click();
    await expect(page.locator("#timer-settings")).toBeVisible();
    await expect(page.locator("#appearance-settings")).toBeVisible();
    await expect(page.locator('.settings-category-link[href="#timer-settings"]')).toHaveAttribute("aria-current", "location");

    await page.locator('.settings-category-link[href="#appearance-settings"]').click();
    await openAppearanceWorkspace(page);

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
    await openAppearanceWorkspace(touchPage);
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
    await touchPage.locator(".palette-expand-target").click();
    await touchPage.locator("#palette-create-btn").click();
    await touchPage.locator('.palette-dimension-tab[data-dimension="glow"]').click();
    await touchPage.locator('.color-target[data-index="0"]').click();
    await expect(touchPage.locator("#palette-swatch-popover")).toHaveClass(/is-open/);
    expect(await touchPage.evaluate(() => {
      const rect = document.querySelector("#palette-swatch-popover")?.getBoundingClientRect();
      return !!rect &&
        document.documentElement.scrollWidth <= window.innerWidth &&
        rect.left >= 0 && rect.top >= 0 &&
        rect.right <= window.innerWidth && rect.bottom <= window.innerHeight;
    })).toBe(true);
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
    const appearanceDisclosure = page.locator("#appearance-settings-editor");
    await expect(appearanceDisclosure).toBeVisible();
    await expect(appearanceDisclosure).toHaveAttribute("open", "");
    await expect(page.locator(".palette-grid")).toBeVisible();
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
    await expect(page.locator("#theme-select-trigger")).toBeVisible();
    await expect(page.locator(".palette-sidebar .panel-head h2")).toHaveText("色板");
    await expect(page.locator(".palette-sidebar .panel-head h2")).toHaveCSS("font-size", "15px");
    await expect(page.locator(".palette-sidebar .panel-head h2")).toHaveCSS("font-weight", "600");
    await expect(page.locator("#palette-list .palette-item").first()).toHaveCSS("margin-top", "4px");
    await expect(page.locator("#theme-select-trigger .custom-arrow")).toHaveCSS("width", "12px");
    await expect(page.locator("#theme-select-trigger .custom-arrow")).toHaveCSS("border-left-width", "0px");
    await expect(page.locator("#theme-select-trigger .custom-arrow")).toHaveCSS("border-top-width", "0px");
    await expect(page.locator(".palette-variant-note")).toHaveText("色板颜色会按方块等级映射到其他棋盘变体。");
    await expect(page.locator('link[href^="style/palette_page.css"]')).toHaveAttribute(
      "href",
      "style/palette_page.css?v=20260811-glow-controls-v24"
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
    await openAppearanceWorkspace(page);
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
    await openAppearanceWorkspace(page);

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
    await openAppearanceWorkspace(page);

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
    await openAppearanceWorkspace(page);

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
    await openAppearanceWorkspace(page);

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
    await openAppearanceWorkspace(page);
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

  test("HEX, EyeDropper and native color input share the palette update path", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
      window.localStorage.setItem("ui_language_v1", "en");
      window.localStorage.removeItem("tile_palette_profiles_v1");
      Object.defineProperty(window, "EyeDropper", {
        configurable: true,
        value: class {
          open() {
            return Promise.resolve({ sRGBHex: "#0a1b2c" });
          }
        }
      });
    });
    await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });
    await openAppearanceWorkspace(page);

    await page.locator("#palette-create-btn").click();
    await page.locator('.color-target[data-index="0"]').click();

    const hexInput = page.locator("#palette-picker-hex");
    const eyeDropperButton = page.locator("#palette-picker-eyedropper");
    const nativeInput = page.locator("#palette-picker-native");
    const readColors = () => page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const activeId = manager.getActiveTilePaletteId();
      const palette = manager.getTilePalettes().find((item: any) => item.id === activeId);
      return [palette?.pow2?.[0], palette?.fibonacci?.[0]];
    });

    await expect(hexInput).toHaveAttribute("aria-label", "6-digit HEX color");
    await expect(eyeDropperButton).toHaveAttribute("aria-label", "Pick a color from the screen");
    await expect(eyeDropperButton).toBeVisible();
    await expect(nativeInput).toHaveAttribute("type", "color");
    await expect(nativeInput).toHaveAttribute("aria-label", "Open system color picker");

    const colorsBeforeInvalidInput = await readColors();
    await hexInput.fill("12345");
    await hexInput.press("Enter");
    await expect(hexInput).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#palette-note")).toContainText("6-digit HEX");
    expect(await readColors()).toEqual(colorsBeforeInvalidInput);

    await hexInput.fill("ABCDEF");
    await hexInput.press("Enter");
    await expect.poll(readColors).toEqual(["#abcdef", "#abcdef"]);
    await expect(hexInput).toHaveValue("#abcdef");
    await expect(hexInput).not.toHaveAttribute("aria-invalid", "true");

    await eyeDropperButton.click();
    await expect.poll(readColors).toEqual(["#0a1b2c", "#0a1b2c"]);
    await expect(hexInput).toHaveValue("#0a1b2c");

    await nativeInput.evaluate((node) => {
      const input = node as HTMLInputElement;
      input.value = "#654321";
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect.poll(readColors).toEqual(["#654321", "#654321"]);
    await expect(hexInput).toHaveValue("#654321");
  });

  test("unsupported EyeDropper stays hidden and native controls respect palette locks", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
      window.localStorage.setItem("ui_language_v1", "zh");
      window.localStorage.removeItem("tile_palette_profiles_v1");
      Object.defineProperty(window, "EyeDropper", {
        configurable: true,
        value: undefined
      });
    });
    await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });
    await openAppearanceWorkspace(page);

    await page.locator("#palette-create-btn").click();
    await page.locator('.color-target[data-index="0"]').click();
    await expect(page.locator("#palette-picker-hex")).toHaveAttribute("aria-label", "6 位 HEX 颜色");
    await expect(page.locator("#palette-picker-native")).toHaveAttribute("aria-label", "打开系统色板");
    await expect(page.locator("#palette-picker-eyedropper")).toBeHidden();
    await expect(page.locator("#palette-picker-hex")).toBeEnabled();
    await expect(page.locator("#palette-picker-native")).toBeEnabled();

    await page.locator('[data-palette-id="follow-theme"]').click();
    await expect(page.locator("#palette-picker-hex")).toBeDisabled();
    await expect(page.locator("#palette-picker-native")).toBeDisabled();
    await expect(page.locator("#palette-picker-eyedropper")).toBeDisabled();
  });

  test("stale EyeDropper results do not update a palette after the editor changes", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
      window.localStorage.setItem("ui_language_v1", "zh");
      window.localStorage.removeItem("tile_palette_profiles_v1");
      Object.defineProperty(window, "EyeDropper", {
        configurable: true,
        value: class {
          open() {
            return new Promise((resolve) => {
              (window as any).__resolvePaletteEyeDropper = resolve;
            });
          }
        }
      });
    });
    await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });
    await openAppearanceWorkspace(page);

    await page.locator("#palette-create-btn").click();
    await page.locator('.color-target[data-index="0"]').click();
    const original = await page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const id = manager.getActiveTilePaletteId();
      const palette = manager.getTilePalettes().find((item: any) => item.id === id);
      return { id, color: palette?.pow2?.[0] };
    });

    await page.locator("#palette-picker-eyedropper").click();
    await page.waitForFunction(() => typeof (window as any).__resolvePaletteEyeDropper === "function");
    await page.locator('[data-palette-id="follow-theme"]').click();
    await page.evaluate(async () => {
      (window as any).__resolvePaletteEyeDropper({ sRGBHex: "#010203" });
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(await page.evaluate((paletteId) => {
      const manager = (window as any).ThemeManager;
      return manager.getTilePalettes().find((item: any) => item.id === paletteId)?.pow2?.[0];
    }, original.id)).toBe(original.color);
    await expect(page.locator("#palette-picker-eyedropper")).toBeDisabled();
  });

  test("border presets start with an accessible remove option and persist it", async ({ page }) => {
    await page.addInitScript(() => {
      if (window.sessionStorage.getItem("palette_border_remove_test_ready") === "1") return;
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
      window.localStorage.setItem("ui_language_v1", "zh");
      window.localStorage.removeItem("tile_palette_profiles_v1");
      window.sessionStorage.setItem("palette_border_remove_test_ready", "1");
    });
    await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });
    await openAppearanceWorkspace(page);

    await page.locator("#palette-create-btn").click();
    await page.locator('.palette-dimension-tab[data-dimension="border"]').click();
    await page.locator('.color-target[data-index="0"]').click();

    const removeBorder = page.locator("#palette-swatch-grid .swatch-chip").first();
    await expect(removeBorder).toHaveClass(/swatch-chip-none/);
    await expect(removeBorder).toHaveAttribute("aria-label", "取消边框颜色");
    await expect(removeBorder).toHaveAttribute("data-color", "transparent");
    await removeBorder.click();

    await expect.poll(async () => page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const activeId = manager.getActiveTilePaletteId();
      const palette = manager.getTilePalettes().find((item: any) => item.id === activeId);
      return [palette?.pow2Border?.[0], palette?.fibonacciBorder?.[0]];
    })).toEqual(["transparent", "transparent"]);
    await expect(page.locator('#palette-preview-board .preview-tile[data-value="2"] .tile-inner'))
      .toHaveCSS("border-top-style", "none");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(async () => page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const activeId = manager.getActiveTilePaletteId();
      const palette = manager.getTilePalettes().find((item: any) => item.id === activeId);
      return palette?.pow2Border?.[0];
    })).toBe("transparent");
  });

  test("glow intensity visibly controls preview shadows and persists", async ({ page }) => {
    await page.addInitScript(() => {
      if (window.sessionStorage.getItem("palette_glow_intensity_test_ready") === "1") return;
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
      window.localStorage.setItem("ui_language_v1", "zh");
      window.localStorage.removeItem("tile_palette_profiles_v1");
      window.sessionStorage.setItem("palette_glow_intensity_test_ready", "1");
    });
    await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });
    await openAppearanceWorkspace(page);

    await page.locator("#palette-create-btn").click();
    await page.locator('.palette-dimension-tab[data-dimension="glow"]').click();
    const slider = page.locator("#palette-glow-intensity");
    const previewTile = page.locator('#palette-preview-board .preview-tile[data-value="2"] .tile-inner');
    const previewTile4 = page.locator('#palette-preview-board .preview-tile[data-value="4"] .tile-inner');
    const readPreviewGlow = () => previewTile.evaluate((node) => (
      window.getComputedStyle(node, "::before").boxShadow
    ));
    const readPreviewGlow4 = () => previewTile4.evaluate((node) => (
      window.getComputedStyle(node, "::before").boxShadow
    ));
    await expect(slider).toHaveAttribute("min", "0");
    await expect(slider).toHaveAttribute("max", "100");
    await expect(slider).toHaveAttribute("aria-label", "整体发光强度");
    await expect(slider).toHaveValue("50");
    await expect(slider).toBeEnabled();

    await page.evaluate(() => {
      const storage = Object.getPrototypeOf(window.localStorage);
      (window as any).__paletteSetItem = storage.setItem;
      storage.setItem = () => {
        throw new Error("storage full");
      };
    });
    await slider.fill("12");
    await expect(slider).toHaveValue("50");
    await expect(page.locator("#palette-glow-intensity-value")).toHaveText("50%");
    await expect(page.locator("#palette-note")).toContainText("无法保存发光设置");
    await page.evaluate(() => {
      Object.getPrototypeOf(window.localStorage).setItem = (window as any).__paletteSetItem;
    });

    await page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const id = manager.getActiveTilePaletteId();
      manager.updateTilePaletteColor(id, "pow2", "border", 0, "transparent");
      manager.updateTilePaletteColor(id, "pow2", "border", 1, "transparent");
      manager.updateTilePaletteColor(id, "pow2", "glow", 0, "#010203");
    });
    await slider.fill("0");
    await expect(page.locator("#palette-glow-intensity-value")).toHaveText("0%");
    expect(await readPreviewGlow()).toBe("none");
    expect(await readPreviewGlow4()).toBe("none");

    await slider.fill("100");
    await expect(page.locator("#palette-glow-intensity-value")).toHaveText("100%");
    const strongShadow = await readPreviewGlow();
    const tile4StrongShadow = await readPreviewGlow4();
    expect(strongShadow).not.toBe("none");
    expect(tile4StrongShadow).not.toBe("none");
    expect(strongShadow.replace(/\s/g, "")).toContain("1,2,3");
    await expect(page.locator('.color-target[data-index="0"]')).toHaveClass(/is-glow-target/);
    await expect(page.locator('#palette-preview-board .preview-tile[data-value="2"]'))
      .toHaveClass(/is-active-glow-preview/);

    await page.locator('.color-target[data-index="0"]').click();
    const tileSlider = page.locator("#palette-tile-glow-intensity");
    await expect(tileSlider).toBeVisible();
    await expect(tileSlider).toHaveAttribute("min", "0");
    await expect(tileSlider).toHaveAttribute("max", "200");
    await expect(tileSlider).toHaveAttribute("aria-label", "方块 2 发光倍率");
    await expect(tileSlider).toHaveValue("100");
    await expect(page.locator("#palette-tile-glow-intensity-value")).toHaveText("100% · 实际 100%");

    await page.evaluate(() => {
      const storage = Object.getPrototypeOf(window.localStorage);
      (window as any).__paletteSetItem = storage.setItem;
      storage.setItem = () => {
        throw new Error("storage full");
      };
    });
    await tileSlider.fill("123");
    await expect(tileSlider).toHaveValue("100");
    await expect(page.locator("#palette-tile-glow-intensity-value")).toHaveText("100% · 实际 100%");
    await expect(page.locator("#palette-note")).toContainText("无法保存发光设置");
    await page.evaluate(() => {
      Object.getPrototypeOf(window.localStorage).setItem = (window as any).__paletteSetItem;
    });

    await tileSlider.fill("0");
    await expect(page.locator("#palette-tile-glow-intensity-value")).toHaveText("0% · 实际 0%");
    expect(await readPreviewGlow()).toBe("none");
    expect(await readPreviewGlow4()).toBe(tile4StrongShadow);
    await tileSlider.fill("200");
    await slider.fill("50");
    await expect(tileSlider).toHaveValue("200");
    await expect(page.locator("#palette-tile-glow-intensity-value")).toHaveText("200% · 实际 100%");
    expect(await readPreviewGlow()).toBe(strongShadow);
    await slider.fill("0");
    await expect(tileSlider).toHaveValue("200");
    await expect(page.locator("#palette-tile-glow-intensity-value")).toHaveText("200% · 实际 0%");
    await expect(page.locator("#palette-tile-glow-intensity-hint")).toContainText("整体强度为 0");
    expect(await readPreviewGlow()).toBe("none");
    await slider.fill("100");

    const removeGlow = page.locator("#palette-swatch-grid .swatch-chip").first();
    await expect(removeGlow).toHaveClass(/swatch-chip-none/);
    await expect(removeGlow).toHaveAttribute("aria-label", "取消发光颜色");
    await expect(removeGlow).toHaveAttribute("data-color", "transparent");
    await removeGlow.click();
    await expect(tileSlider).toBeDisabled();
    await expect(tileSlider).toHaveValue("200");
    await expect(page.locator("#palette-tile-glow-intensity-value")).toHaveText("200% · 实际 0%");
    await expect(page.locator("#palette-tile-glow-intensity-hint")).toContainText("请先设置发光颜色");
    expect(await readPreviewGlow()).toBe("none");
    expect(await readPreviewGlow4()).toBe(tile4StrongShadow);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#palette-glow-intensity")).toHaveValue("100");
    expect(await page.evaluate(() => {
      const manager = (window as any).ThemeManager;
      const id = manager.getActiveTilePaletteId();
      const palette = manager.getTilePalettes().find((item: any) => item.id === id);
      const exported = JSON.parse(manager.exportTilePalettes()).palettes.find((item: any) => item.id === id);
      return [
        palette?.glowIntensity,
        exported?.glowIntensity,
        palette?.pow2Glow?.[0],
        palette?.fibonacciGlow?.[0],
        exported?.pow2Glow?.[0],
        palette?.glowMultipliers?.[0],
        exported?.glowMultipliers?.[0]
      ];
    })).toEqual([100, 100, "transparent", "transparent", "transparent", 200, 200]);
    expect(await readPreviewGlow()).toBe("none");

    await page.locator('.palette-dimension-tab[data-dimension="glow"]').click();
    await page.locator('.color-target[data-index="0"]').click();
    await expect(tileSlider).toHaveValue("200");
    await expect(tileSlider).toBeDisabled();

    await page.locator('[data-palette-id="follow-theme"]').click();
    await expect(page.locator("#palette-glow-intensity")).toBeDisabled();
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
    await openAppearanceWorkspace(page);

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

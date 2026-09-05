import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const THEME_MANAGER_SOURCE = readFileSync(resolve("js/theme_manager.js"), "utf8");

function paletteFixture(id: string) {
  const pow2 = Array.from(
    { length: 26 },
    (_, index) => `#${String(index + 1).padStart(6, "0")}`,
  );
  return {
    id,
    name: id,
    pow2,
    fibonacci: pow2.slice(0, 16),
    pow2Text: Array.from({ length: 26 }, () => "#F9F6F2"),
    fibonacciText: Array.from({ length: 16 }, () => "#F9F6F2"),
    pow2Border: Array.from({ length: 26 }, () => "transparent"),
    fibonacciBorder: Array.from({ length: 16 }, () => "transparent"),
    pow2Glow: Array.from({ length: 26 }, () => "transparent"),
    fibonacciGlow: Array.from({ length: 16 }, () => "transparent"),
    glowIntensity: 50,
    glowMultipliers: Array.from({ length: 26 }, () => 100),
    createdAt: 1,
    updatedAt: 1,
  };
}

function tileGlowShadow(dom: JSDOM, value: number) {
  const css = String(dom.window.document.getElementById("theme-dynamic-style")?.textContent || "");
  const match = css.match(new RegExp(
    `\\.tile\\.tile-${value} \\.tile-inner::before,[^{]*\\{[^}]*box-shadow:([^;]+)`
  ));
  return String(match?.[1] || "").replace(/\s*!important\s*$/, "").trim();
}

describe("theme manager palette effects", () => {
  it("reuses timer legend visuals until the theme changes", () => {
    const dom = new JSDOM(
      '<!doctype html><html><head></head><body><div class="timer-legend-32">32</div></body></html>',
      {
        runScripts: "outside-only",
        url: "https://example.test/2048.html",
      },
    );
    const originalGetComputedStyle = dom.window.getComputedStyle.bind(
      dom.window,
    );
    let probeReads = 0;
    dom.window.getComputedStyle = ((
      element: Element,
      pseudoElement?: string,
    ) => {
      if (
        element.classList.contains("tile-inner") &&
        element.parentElement?.parentElement?.id === "theme-timer-style-probe"
      ) {
        probeReads += 1;
      }
      return originalGetComputedStyle(element, pseudoElement);
    }) as typeof dom.window.getComputedStyle;

    dom.window.eval(THEME_MANAGER_SOURCE);
    const manager = (dom.window as any).ThemeManager;
    const initialReads = probeReads;
    expect(initialReads).toBeGreaterThan(0);

    manager.syncTimerLegendStyles();
    expect(probeReads).toBe(initialReads);

    dom.window.document.body.dataset.ruleset = "fibonacci";
    manager.syncTimerLegendStyles();
    expect(probeReads).toBeGreaterThan(initialReads);
    const readsAfterRulesetChange = probeReads;

    manager.syncTimerLegendStyles();
    expect(probeReads).toBe(readsAfterRulesetChange);

    dom.window.document.body.classList.add("board-low-perf");
    manager.syncTimerLegendStyles();
    expect(probeReads).toBeGreaterThan(readsAfterRulesetChange);
    const readsAfterLowPerfEnabled = probeReads;

    manager.syncTimerLegendStyles();
    expect(probeReads).toBe(readsAfterLowPerfEnabled);

    dom.window.document.body.dataset.ruleset = "pow2";
    manager.syncTimerLegendStyles();
    expect(probeReads).toBeGreaterThan(readsAfterLowPerfEnabled);
    const readsAfterPow2LowPerf = probeReads;

    manager.syncTimerLegendStyles();
    expect(probeReads).toBe(readsAfterPow2LowPerf);

    dom.window.document.body.classList.remove("board-low-perf");
    manager.syncTimerLegendStyles();
    expect(probeReads).toBe(readsAfterPow2LowPerf);

    dom.window.document.body.classList.add("board-low-perf");
    manager.applyTheme("classic");
    expect(probeReads).toBeGreaterThan(readsAfterPow2LowPerf);
    const readsAfterThemeChange = probeReads;

    dom.window.document.body.classList.remove("board-low-perf");
    manager.syncTimerLegendStyles();
    expect(probeReads).toBeGreaterThan(readsAfterThemeChange);
    const readsAfterReturningToFull = probeReads;

    manager.syncTimerLegendStyles();
    expect(probeReads).toBe(readsAfterReturningToFull);
    dom.window.close();
  });

  it("reads every timer probe before writing legend styles", () => {
    const dom = new JSDOM(
      '<!doctype html><html><head></head><body><div class="timer-legend-32">32</div><div class="timer-legend-64">64</div></body></html>',
      {
        runScripts: "outside-only",
        url: "https://example.test/2048.html",
      },
    );
    const events: string[] = [];
    const originalGetComputedStyle = dom.window.getComputedStyle.bind(
      dom.window,
    );
    dom.window.getComputedStyle = ((
      element: Element,
      pseudoElement?: string,
    ) => {
      if (
        element.classList.contains("tile-inner") &&
        element.parentElement?.parentElement?.id === "theme-timer-style-probe"
      ) {
        events.push(`read:${element.textContent}`);
      }
      return originalGetComputedStyle(element, pseudoElement);
    }) as typeof dom.window.getComputedStyle;
    for (const legend of Array.from(
      dom.window.document.querySelectorAll<HTMLElement>(
        ".timer-legend-32,.timer-legend-64",
      ),
    )) {
      let background = "";
      Object.defineProperty(legend.style, "background", {
        configurable: true,
        get: () => background,
        set: (value: string) => {
          background = value;
          events.push(`write:${legend.textContent}`);
        },
      });
    }

    dom.window.eval(THEME_MANAGER_SOURCE);
    const firstWrite = events.findIndex((event) => event.startsWith("write:"));
    const lastRead = events.findLastIndex((event) => event.startsWith("read:"));
    expect(firstWrite).toBeGreaterThan(-1);
    expect(lastRead).toBeLessThan(firstWrite);
    expect(events.filter((event) => event.startsWith("write:"))).toEqual([
      "write:32",
      "write:64",
    ]);
    dom.window.close();
  });

  it("persists a removed border and renders it without a border", () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
      runScripts: "outside-only",
      url: "https://example.test/2048.html"
    });

    dom.window.localStorage.setItem("theme_profile_v1", "classic");
    dom.window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
    dom.window.eval(THEME_MANAGER_SOURCE);

    const manager = (dom.window as any).ThemeManager;
    const created = manager.createTilePalette("follow-theme", "无边框测试");
    expect(manager.updateTilePaletteColor(created.id, "pow2", "border", 0, "transparent")).toBe(true);
    expect(manager.updateTilePaletteColor(created.id, "pow2", "background", 0, "#123456")).toBe(true);

    const palette = manager.getTilePalettes().find((item: any) => item.id === created.id);
    const exportedPayload = manager.exportTilePalettes();
    const exported = JSON.parse(exportedPayload).palettes.find((item: any) => item.id === created.id);
    const css = String(dom.window.document.getElementById("theme-dynamic-style")?.textContent || "");

    expect(palette.pow2Border[0]).toBe("transparent");
    expect(exported.pow2Border[0]).toBe("transparent");
    expect(css).toMatch(/tile-2 \.tile-inner[^}]+border:none !important;/);

    expect(manager.importTilePalettes(exportedPayload).importedCount).toBe(1);
    const imported = manager.getTilePalettes().find((item: any) => (
      item.id !== created.id && item.name.startsWith("无边框测试")
    ));
    expect(imported.pow2Border[0]).toBe("transparent");

    dom.window.close();
  });

  it("keeps legacy glow intensity compatible and renders adjustable glow", () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
      runScripts: "outside-only",
      url: "https://example.test/2048.html"
    });
    const legacyId = "legacy-glow-palette";
    dom.window.localStorage.setItem("theme_profile_v1", "classic");
    dom.window.localStorage.setItem("tile_palette_active_v1", legacyId);
    dom.window.localStorage.setItem("tile_palette_profiles_v1", JSON.stringify([{
      id: legacyId,
      name: "旧发光色板",
      pow2: ["#123456"],
      fibonacci: ["#123456"],
      source: "custom"
    }]));
    dom.window.eval(THEME_MANAGER_SOURCE);

    const manager = (dom.window as any).ThemeManager;
    const tile = dom.window.document.createElement("div");
    tile.className = "tile tile-2";
    const inner = dom.window.document.createElement("div");
    inner.className = "tile-inner";
    tile.appendChild(inner);
    const tileContainer = dom.window.document.createElement("div");
    tileContainer.className = "tile-container";
    tileContainer.appendChild(tile);
    dom.window.document.body.appendChild(tileContainer);

    expect(manager.getTilePalettes().find((item: any) => item.id === legacyId).glowIntensity).toBe(50);
    expect(manager.updateTilePaletteColor(legacyId, "pow2", "border", 0, "transparent")).toBe(true);
    expect(manager.updateTilePaletteColor(legacyId, "pow2", "glow", 0, "#00ff00")).toBe(true);
    expect(manager.updateTilePaletteGlowIntensity(legacyId, 0)).toBe(true);
    expect(tileGlowShadow(dom, 2)).toBe("none");

    expect(manager.updateTilePaletteGlowIntensity(legacyId, 100)).toBe(true);
    for (const themeId of ["classic", "mist_cyan", "midnight_nebula", "yanyuan"]) {
      manager.applyTheme(themeId);
      const themeCss = String(dom.window.document.getElementById("theme-dynamic-style")?.textContent || "");
      expect(themeCss).toContain(".tile-2 .tile-inner::before");
      expect(themeCss.replace(/\s/g, "")).toContain("rgba(0,255,0");
    }
    manager.applyTheme("horse_year");
    const horseThemeCss = String(dom.window.document.getElementById("theme-dynamic-style")?.textContent || "")
      .replace(/\s/g, "");
    expect(horseThemeCss).toContain(
      "box-shadow:04px8pxrgba(0,0,0,0.3),0040px6pxrgba(0,255,0,0.68)!important;"
    );
    manager.applyTheme("glass");
    expect(dom.window.getComputedStyle(inner).boxShadow.replace(/\s/g, "")).toContain(
      "04px6pxrgba(0,0,0,0.05)"
    );
    manager.applyTheme("mecha");
    const mechaThemeCss = String(dom.window.document.getElementById("theme-dynamic-style")?.textContent || "")
      .replace(/\s/g, "");
    expect(mechaThemeCss).toContain("filter:drop-shadow(0036pxrgba(0,255,0,0.95));");
    manager.applyTheme("bauhaus");
    const bauhausThemeCss = String(dom.window.document.getElementById("theme-dynamic-style")?.textContent || "");
    expect(bauhausThemeCss).toContain(".tile.tile-8{filter:drop-shadow");
    manager.applyTheme("mecha");
    dom.window.document.body.classList.add("board-low-perf");
    expect(dom.window.getComputedStyle(inner).boxShadow).toBe("none");
    expect(dom.window.getComputedStyle(tile).filter).toBe("none");
    dom.window.document.body.classList.remove("board-low-perf");
    expect(manager.getTilePalettes().find((item: any) => item.id === legacyId).glowIntensity).toBe(100);
    expect(manager.updateTilePaletteGlowIntensity(legacyId, -1)).toBe(true);
    expect(manager.getTilePalettes().find((item: any) => item.id === legacyId).glowIntensity).toBe(0);
    expect(manager.updateTilePaletteGlowIntensity(legacyId, 101)).toBe(true);
    expect(manager.getTilePalettes().find((item: any) => item.id === legacyId).glowIntensity).toBe(100);
    expect(manager.updateTilePaletteGlowIntensity(legacyId, "invalid")).toBe(true);
    expect(manager.getTilePalettes().find((item: any) => item.id === legacyId).glowIntensity).toBe(50);

    expect(manager.updateTilePaletteGlowIntensity(legacyId, 73)).toBe(true);
    manager.applyTheme("classic");
    expect(manager.updateTilePaletteColor(legacyId, "pow2", "glow", 0, "transparent")).toBe(true);
    expect(manager.updateTilePaletteColor(legacyId, "pow2", "background", 0, "#654321")).toBe(true);
    expect(tileGlowShadow(dom, 2)).toBe("none");
    const exportedPayload = manager.exportTilePalettes();
    const exported = JSON.parse(exportedPayload).palettes.find((item: any) => item.id === legacyId);
    expect([exported.glowIntensity, exported.pow2Glow[0]]).toEqual([73, "transparent"]);
    expect(manager.importTilePalettes(exportedPayload).importedCount).toBe(1);
    const imported = manager.getTilePalettes().find((item: any) => (
      item.id !== legacyId && item.name.startsWith("旧发光色板")
    ));
    expect(imported.glowIntensity).toBe(73);
    expect(imported.pow2Glow[0]).toBe("transparent");

    dom.window.close();
  });

  it("enforces the shared ten-palette limit across create and import", () => {
    const dom = new JSDOM(
      "<!doctype html><html><head></head><body></body></html>",
      {
        runScripts: "outside-only",
        url: "https://example.test/palette.html",
      },
    );
    dom.window.eval(THEME_MANAGER_SOURCE);
    const manager = (dom.window as any).ThemeManager;

    for (let index = 0; index < 10; index += 1) {
      expect(
        manager.createTilePalette("follow-theme", `色板 ${index + 1}`),
      ).toBeTruthy();
    }
    expect(manager.getCustomTilePalettes()).toHaveLength(10);
    expect(manager.createTilePalette("follow-theme", "第十一套")).toBeNull();

    const payload = JSON.stringify({
      version: 5,
      palettes: [paletteFixture("import-one"), paletteFixture("import-two")],
    });
    expect(manager.importTilePalettes(payload)).toMatchObject({
      importedCount: 0,
      error: "palette_limit_reached",
    });
    expect(manager.getCustomTilePalettes()).toHaveLength(10);
    dom.window.close();
  });

  it("exposes an atomic account-sync adapter without applying a replacement implicitly", () => {
    const dom = new JSDOM(
      "<!doctype html><html><head></head><body></body></html>",
      {
        runScripts: "outside-only",
        url: "https://example.test/palette.html",
      },
    );
    dom.window.eval(THEME_MANAGER_SOURCE);
    const manager = (dom.window as any).ThemeManager;
    const first = manager.createTilePalette("follow-theme", "本地一");
    manager.setActiveTilePalette(first.id);

    expect(
      manager.replaceCustomTilePalettes([paletteFixture("cloud-copy")], {
        source: "account-sync",
      }),
    ).toBe(true);
    expect(manager.getCustomTilePalettes()).toHaveLength(1);
    expect(manager.getCustomTilePalettes()[0].id).toBe("cloud-copy");
    expect(manager.getActiveTilePaletteId()).not.toBe("cloud-copy");
    dom.window.close();
  });

  it("preserves a selected built-in palette when cloud custom palettes have no active custom ID", () => {
    const dom = new JSDOM(
      "<!doctype html><html><head></head><body></body></html>",
      {
        runScripts: "outside-only",
        url: "https://example.test/palette.html",
      },
    );
    dom.window.eval(THEME_MANAGER_SOURCE);
    const manager = (dom.window as any).ThemeManager;

    expect(manager.setActiveTilePalette("warm-glaze-steps")).toBe(
      "warm-glaze-steps",
    );
    expect(
      manager.replaceCustomTilePalettes([], {
        activePaletteId: null,
        source: "account-sync",
      }),
    ).toBe(true);
    expect(manager.getActiveTilePaletteId()).toBe("warm-glaze-steps");
    dom.window.close();
  });

  it("combines overall glow intensity with a persisted per-tile multiplier", () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
      runScripts: "outside-only",
      url: "https://example.test/2048.html"
    });
    const legacyId = "legacy-glow-multiplier-palette";
    dom.window.localStorage.setItem("theme_profile_v1", "classic");
    dom.window.localStorage.setItem("tile_palette_active_v1", legacyId);
    dom.window.localStorage.setItem("tile_palette_profiles_v1", JSON.stringify([{
      id: legacyId,
      name: "逐块发光测试",
      pow2: ["#123456"],
      fibonacci: ["#123456"],
      pow2Border: ["transparent"],
      pow2Glow: ["#00ff00"],
      source: "custom"
    }]));
    dom.window.eval(THEME_MANAGER_SOURCE);

    const manager = (dom.window as any).ThemeManager;
    const tile = dom.window.document.createElement("div");
    tile.className = "tile tile-2";
    const inner = dom.window.document.createElement("div");
    inner.className = "tile-inner";
    tile.appendChild(inner);
    dom.window.document.body.appendChild(tile);

    const legacyPalette = manager.getTilePalettes().find((item: any) => item.id === legacyId);
    expect(legacyPalette.glowMultipliers).toHaveLength(26);
    expect(legacyPalette.glowMultipliers.every((value: number) => value === 100)).toBe(true);

    expect(manager.updateTilePaletteGlowMultiplier(legacyId, 0, 200)).toBe(true);
    expect(manager.updateTilePaletteGlowIntensity(legacyId, 50)).toBe(true);
    const boostedAtFifty = tileGlowShadow(dom, 2);
    expect(boostedAtFifty).not.toBe("none");
    expect(manager.updateTilePaletteGlowMultiplier(legacyId, 0, 100)).toBe(true);
    expect(manager.updateTilePaletteGlowIntensity(legacyId, 100)).toBe(true);
    expect(tileGlowShadow(dom, 2)).toBe(boostedAtFifty);

    expect(manager.updateTilePaletteGlowMultiplier(legacyId, 0, 200)).toBe(true);
    expect(tileGlowShadow(dom, 2)).toBe(boostedAtFifty);

    expect(manager.updateTilePaletteGlowMultiplier(legacyId, 0, 0)).toBe(true);
    expect(tileGlowShadow(dom, 2)).toBe("none");
    expect(tileGlowShadow(dom, 4)).not.toBe("none");
    expect(manager.updateTilePaletteGlowMultiplier(legacyId, 0, -1)).toBe(true);
    expect(manager.getTilePalettes().find((item: any) => item.id === legacyId).glowMultipliers[0]).toBe(0);
    expect(manager.updateTilePaletteGlowMultiplier(legacyId, 0, 201)).toBe(true);
    expect(manager.getTilePalettes().find((item: any) => item.id === legacyId).glowMultipliers[0]).toBe(200);

    expect(manager.updateTilePaletteGlowMultiplier(legacyId, 25, 37)).toBe(true);
    expect(manager.updateTilePaletteGlowMultiplier(legacyId, 0, 175)).toBe(true);
    const exportedPayload = manager.exportTilePalettes();
    const exported = JSON.parse(exportedPayload).palettes.find((item: any) => item.id === legacyId);
    expect([exported.glowMultipliers[0], exported.glowMultipliers[25]]).toEqual([175, 37]);
    expect(manager.importTilePalettes(exportedPayload).importedCount).toBe(1);
    const imported = manager.getTilePalettes().find((item: any) => (
      item.id !== legacyId && item.name.startsWith("逐块发光测试")
    ));
    expect([imported.glowMultipliers[0], imported.glowMultipliers[25]]).toEqual([175, 37]);

    const storagePrototype = Object.getPrototypeOf(dom.window.localStorage);
    const originalSetItem = storagePrototype.setItem;
    storagePrototype.setItem = () => {
      throw new Error("storage full");
    };
    try {
      expect(manager.updateTilePaletteGlowIntensity(legacyId, 12)).toBe(false);
      expect(manager.updateTilePaletteGlowMultiplier(legacyId, 0, 12)).toBe(false);
      const unchanged = manager.getTilePalettes().find((item: any) => item.id === legacyId);
      expect([unchanged.glowIntensity, unchanged.glowMultipliers[0]]).toEqual([100, 175]);
    } finally {
      storagePrototype.setItem = originalSetItem;
    }

    dom.window.close();
  });
});

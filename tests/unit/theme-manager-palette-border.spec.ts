import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const THEME_MANAGER_SOURCE = readFileSync(resolve("js/theme_manager.js"), "utf8");

function tileGlowShadow(dom: JSDOM, value: number) {
  const css = String(dom.window.document.getElementById("theme-dynamic-style")?.textContent || "");
  const match = css.match(new RegExp(
    `\\.tile\\.tile-${value} \\.tile-inner::before,[^{]*\\{[^}]*box-shadow:([^;]+)`
  ));
  return String(match?.[1] || "").replace(/\s*!important\s*$/, "").trim();
}

describe("theme manager palette effects", () => {
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

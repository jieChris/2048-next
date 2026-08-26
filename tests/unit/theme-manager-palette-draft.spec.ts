import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  new URL("../../js/theme_manager.js", import.meta.url),
  "utf8",
);

function customPalette(id = "custom-1") {
  const pow2 = Array.from(
    { length: 26 },
    (_, index) => `#${String(index + 1).padStart(6, "0")}`,
  );
  return {
    id,
    name: "Saved",
    baseSkin: "glass",
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
    extensions: { vendor: { accent: "#123456", enabled: true } },
    createdAt: 1,
    updatedAt: 1,
    source: "custom",
    locked: false,
  };
}

describe("theme manager palette draft", () => {
  it("previews edits without changing saved browser storage until explicit save", () => {
    const dom = new JSDOM(
      "<!doctype html><html><head></head><body></body></html>",
      {
        runScripts: "outside-only",
        url: "http://127.0.0.1/",
      },
    );
    const saved = customPalette();
    dom.window.localStorage.setItem(
      "tile_palette_profiles_v1",
      JSON.stringify([saved]),
    );
    dom.window.localStorage.setItem("tile_palette_active_v1", saved.id);
    dom.window.eval(SOURCE);
    const manager = (dom.window as any).ThemeManager;

    manager.beginTilePaletteDraft();
    manager.updateTilePaletteColor(
      saved.id,
      "pow2",
      "background",
      0,
      "#abcdef",
    );

    expect(manager.getTilePaletteDraftState()).toMatchObject({
      dirty: true,
      dirtyPaletteIds: [saved.id],
      activePaletteId: saved.id,
    });
    expect(manager.getCustomTilePalettes()[0]).toMatchObject({
      baseSkin: "glass",
      extensions: { vendor: { accent: "#123456", enabled: true } },
    });
    expect(manager.getCustomTilePalettes()[0].pow2[0]).toBe("#abcdef");
    expect(
      JSON.parse(
        dom.window.localStorage.getItem("tile_palette_profiles_v1")!,
      )[0].pow2[0],
    ).toBe(saved.pow2[0]);

    expect(manager.saveTilePaletteDraft()).toBe(true);
    expect(
      JSON.parse(
        dom.window.localStorage.getItem("tile_palette_profiles_v1")!,
      )[0],
    ).toMatchObject({
      baseSkin: "glass",
      extensions: { vendor: { accent: "#123456", enabled: true } },
    });
    expect(
      JSON.parse(
        dom.window.localStorage.getItem("tile_palette_profiles_v1")!,
      )[0].pow2[0],
    ).toBe("#abcdef");
    expect(JSON.parse(manager.exportTilePalettes()).palettes[0]).toMatchObject({
      baseSkin: "glass",
      extensions: { vendor: { accent: "#123456", enabled: true } },
    });
    dom.window.close();
  });

  it("discards a draft and restores the last saved palette", () => {
    const dom = new JSDOM(
      "<!doctype html><html><head></head><body></body></html>",
      {
        runScripts: "outside-only",
        url: "http://127.0.0.1/",
      },
    );
    const saved = customPalette();
    dom.window.localStorage.setItem(
      "tile_palette_profiles_v1",
      JSON.stringify([saved]),
    );
    dom.window.localStorage.setItem("tile_palette_active_v1", saved.id);
    dom.window.eval(SOURCE);
    const manager = (dom.window as any).ThemeManager;

    manager.beginTilePaletteDraft();
    manager.renameTilePalette(saved.id, "Draft name");
    expect(manager.getCustomTilePalettes()[0].name).toBe("Draft name");
    manager.discardTilePaletteDraft();
    expect(manager.getCustomTilePalettes()[0].name).toBe("Saved");
    dom.window.close();
  });

  it("rekeys the working identity without changing the draft dirty state", () => {
    const dom = new JSDOM(
      "<!doctype html><html><head></head><body></body></html>",
      {
        runScripts: "outside-only",
        url: "http://127.0.0.1/",
      },
    );
    const saved = customPalette();
    dom.window.localStorage.setItem(
      "tile_palette_profiles_v1",
      JSON.stringify([saved]),
    );
    dom.window.localStorage.setItem("tile_palette_active_v1", saved.id);
    dom.window.eval(SOURCE);
    const manager = (dom.window as any).ThemeManager;

    manager.beginTilePaletteDraft();
    expect(manager.rekeyTilePaletteDraft(saved.id, "replacement-1")).toBe(true);
    expect(manager.getTilePaletteDraftState()).toMatchObject({
      dirty: false,
      activePaletteId: "replacement-1",
      profiles: [{ id: "replacement-1" }],
    });
    manager.renameTilePalette("replacement-1", "Dirty name");
    expect(manager.rekeyTilePaletteDraft("replacement-1", "replacement-2")).toBe(
      true,
    );
    expect(manager.getTilePaletteDraftState()).toMatchObject({
      dirty: true,
      dirtyPaletteIds: ["replacement-2"],
      activePaletteId: "replacement-2",
      profiles: [{ id: "replacement-2", name: "Dirty name" }],
    });
    dom.window.close();
  });


  it("falls back to follow-theme when the selected custom palette is deleted", () => {
    const dom = new JSDOM(
      "<!doctype html><html><head></head><body></body></html>",
      {
        runScripts: "outside-only",
        url: "http://127.0.0.1/",
      },
    );
    const saved = customPalette();
    dom.window.localStorage.setItem(
      "tile_palette_profiles_v1",
      JSON.stringify([saved]),
    );
    dom.window.localStorage.setItem("tile_palette_active_v1", saved.id);
    dom.window.eval(SOURCE);
    const manager = (dom.window as any).ThemeManager;

    manager.beginTilePaletteDraft();
    expect(manager.deleteTilePalette(saved.id)).toBe(true);
    expect(manager.getTilePaletteDraftState()).toMatchObject({
      dirty: true,
      activePaletteId: "follow-theme",
      profiles: [],
    });
    expect(manager.saveTilePaletteDraft()).toBe(true);
    expect(dom.window.localStorage.getItem("tile_palette_active_v1")).toBe(
      "follow-theme",
    );
    dom.window.close();
  });

});

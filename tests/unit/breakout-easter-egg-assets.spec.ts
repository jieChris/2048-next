import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const BREAKOUT_ROOT = path.resolve("public/easter-eggs/breakout");

describe("breakout easter egg assets", () => {
  it("embeds the built static game without copying development dependencies", () => {
    const indexPath = path.join(BREAKOUT_ROOT, "index.html");
    const assetsPath = path.join(BREAKOUT_ROOT, "assets");

    expect(existsSync(indexPath)).toBe(true);
    expect(existsSync(assetsPath)).toBe(true);
    expect(existsSync(path.join(BREAKOUT_ROOT, "node_modules"))).toBe(false);

    const indexHtml = readFileSync(indexPath, "utf8");
    const assets = readdirSync(assetsPath);
    expect(indexHtml).toContain("./assets/");
    expect(indexHtml).toContain("./host-bridge.css?v=20260703-mobile-hud-shields");
    expect(indexHtml).toContain("./host-bridge.js?v=20260626-window-controls");
    const bridgeCss = readFileSync(path.join(BREAKOUT_ROOT, "host-bridge.css"), "utf8");
    expect(bridgeCss).toContain(".modal-overlay.breakout-overlay");
    expect(bridgeCss).toContain(".breakout-drop-expand");
    for (const tileValue of ["2", "4", "8", "16", "32", "64", "128", "256", "512", "1024", "2048"]) {
      expect(bridgeCss).toContain(`--breakout-drop-tile-value: "${tileValue}"`);
      expect(bridgeCss).toContain(`.breakout-drop-tile_${tileValue}`);
    }
    expect(bridgeCss).toContain(".breakout-drop::before");
    expect(bridgeCss).toContain(".breakout-drop-icon");
    const builtAssetText = assets
      .filter((fileName) => fileName.endsWith(".js") || fileName.endsWith(".css"))
      .map((fileName) => readFileSync(path.join(assetsPath, fileName), "utf8"))
      .join("\n");
    expect(builtAssetText).toContain("breakout-drop-count-tile");
    expect(builtAssetText).toContain("breakout-drop-count-tile-expand");
    expect(builtAssetText).toContain("breakout-drop-count-tile-split");
    expect(builtAssetText).toContain("breakout-drop-count-tile-triple");
    expect(builtAssetText).toContain("breakout-drop-count-tile-shield");
    for (const tileValue of ["2", "4", "8", "16", "32", "64", "128", "256", "512", "1024", "2048"]) {
      expect(builtAssetText).toContain(`"${tileValue}"`);
      expect(builtAssetText).toContain(`tile_${tileValue}`);
      expect(builtAssetText).toContain(`breakout-drop-tile_${tileValue}`);
      expect(builtAssetText).toContain(`breakout-drop-count-tile-tile_${tileValue}`);
    }
    expect(builtAssetText).toContain("breakout-mobile-controls");
    expect(builtAssetText).toContain("breakout-mobile-launch-btn");
    expect(builtAssetText).toContain("breakout-mobile-move-btn");
    expect(builtAssetText).toContain("onPointerDown");
    expect(builtAssetText).toContain("onPointerUp");
    expect(builtAssetText).toContain("onPointerCancel");
    const bridgeScript = readFileSync(path.join(BREAKOUT_ROOT, "host-bridge.js"), "utf8");
    expect(bridgeScript).toContain("2048-next-breakout-easter-egg");
    expect(bridgeScript).toContain('closestElement(target, ".breakout-window-btn")');
    expect(bridgeScript).toContain("true\n  );");
    expect(assets.some((fileName) => fileName.endsWith(".js"))).toBe(true);
    expect(assets.some((fileName) => fileName.endsWith(".css"))).toBe(true);
  });
});

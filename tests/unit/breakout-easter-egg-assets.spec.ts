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
    expect(indexHtml).toContain("./host-bridge.css?v=20260626-drop-tiles");
    expect(indexHtml).toContain("./host-bridge.js?v=20260626-window-controls");
    const bridgeCss = readFileSync(path.join(BREAKOUT_ROOT, "host-bridge.css"), "utf8");
    expect(bridgeCss).toContain(".modal-overlay.breakout-overlay");
    expect(bridgeCss).toContain(".breakout-drop-expand");
    expect(bridgeCss).toContain('--breakout-drop-tile-value: "2"');
    expect(bridgeCss).toContain('--breakout-drop-tile-value: "4"');
    expect(bridgeCss).toContain('--breakout-drop-tile-value: "8"');
    expect(bridgeCss).toContain('--breakout-drop-tile-value: "16"');
    expect(bridgeCss).toContain(".breakout-drop::before");
    expect(bridgeCss).toContain(".breakout-drop-icon");
    const bridgeScript = readFileSync(path.join(BREAKOUT_ROOT, "host-bridge.js"), "utf8");
    expect(bridgeScript).toContain("2048-next-breakout-easter-egg");
    expect(bridgeScript).toContain('closestElement(target, ".breakout-window-btn")');
    expect(bridgeScript).toContain("true\n  );");
    expect(assets.some((fileName) => fileName.endsWith(".js"))).toBe(true);
    expect(assets.some((fileName) => fileName.endsWith(".css"))).toBe(true);
  });
});

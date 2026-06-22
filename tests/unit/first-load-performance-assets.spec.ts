import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("first-load performance assets", () => {
  it("preloads only the standard home startup bundle before runtime discovery", () => {
    const html = readFileSync("2048.html", "utf8");

    expect(html).toContain(
      '<link rel="preload" href="js/home_standard_startup_bundle.js?v=20260609-rescue-sync1" as="script">'
    );
    expect(html).not.toContain("home_standard_deferred_bundle");
  });

  it("loads the game dialog in the startup bundle before restart handling", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");
    const startupStart = viteConfig.indexOf("const HOME_STANDARD_STARTUP_FILES = [");
    const startupEnd = viteConfig.indexOf("];", startupStart);
    const deferredStart = viteConfig.indexOf("const HOME_STANDARD_DEFERRED_FILES = [");
    const deferredEnd = viteConfig.indexOf("];", deferredStart);
    const startupBlock = viteConfig.slice(startupStart, startupEnd);
    const deferredBlock = viteConfig.slice(deferredStart, deferredEnd);

    expect(startupBlock).toContain('"game_dialog_runtime.js"');
    expect(startupBlock.indexOf('"game_dialog_runtime.js"')).toBeLessThan(
      startupBlock.indexOf('"core_game_manager_restart_setup_helpers_runtime.js"')
    );
    expect(deferredBlock).not.toContain('"game_dialog_runtime.js"');
  });

  it("uses swap font loading for Clear Sans faces", () => {
    const css = readFileSync("style/fonts/clear-sans.css", "utf8");

    expect(css.match(/font-display:\s*swap;/g)).toHaveLength(3);
  });
});

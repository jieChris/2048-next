import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const HOME_FAMILY_ENTRIES = [
  "src/entries/index.ts",
  "src/entries/play.ts",
  "src/entries/undo.ts",
  "src/entries/capped.ts",
  "src/entries/practice-board.ts",
  "src/entries/pku2048.ts",
  "src/entries/replay.ts",
  "src/entries/index-test-page.ts"
] as const;

describe("first-load performance assets", () => {
  it("does not preload legacy home bundles before the module entry", () => {
    const html = readFileSync("2048.html", "utf8");

    expect(html).toContain('type="module" src="./src/entries/index.ts"');
    expect(html).not.toContain('rel="preload" href="js/home_standard_startup_bundle.js');
    expect(html).not.toContain("core_game_manager_replay_helpers_runtime.js");
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

  it("keeps the heavy home-family bootstrap out of the static entry import graph", () => {
    for (const entryPath of HOME_FAMILY_ENTRIES) {
      const entry = readFileSync(entryPath, "utf8");

      expect(entry, entryPath).toContain('await import("./home-family-bootstrap")');
      expect(entry, entryPath).not.toContain(
        'import { bootstrapHomeFamilyPage } from "./home-family-bootstrap"'
      );
    }
  });

  it("keeps idle index UI runtimes out of the home-family bootstrap chunk", () => {
    const homeFamilyBootstrap = readFileSync("src/entries/home-family-bootstrap.ts", "utf8");
    const indexUiBootstrap = readFileSync("src/entries/index-ui-bootstrap.ts", "utf8");
    const idleOnlyRuntimeImports = [
      '"../bootstrap/home-guide"',
      '"../bootstrap/settings-modal-page-host"',
      '"../bootstrap/replay-export"',
      '"../bootstrap/index-ui-startup-host"'
    ];

    for (const runtimeImport of idleOnlyRuntimeImports) {
      expect(homeFamilyBootstrap).not.toContain(runtimeImport);
      expect(indexUiBootstrap).toContain(runtimeImport);
    }
  });

  it("uses swap font loading for Clear Sans faces", () => {
    const css = readFileSync("style/fonts/clear-sans.css", "utf8");

    expect(css.match(/font-display:\s*swap;/g)).toHaveLength(3);
  });
});

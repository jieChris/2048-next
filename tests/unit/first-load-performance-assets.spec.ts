import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("first-load performance assets", () => {
  it("preloads only the standard home startup bundle before runtime discovery", () => {
    const html = readFileSync("2048.html", "utf8");

    expect(html).toContain(
      '<link rel="preload" href="%HOME_STANDARD_STARTUP_BUNDLE_URL%" as="script">'
    );
    expect(html).not.toContain("home_standard_startup_bundle.js?v=");
    expect(html).not.toContain("core_game_manager_replay_helpers_runtime.js");
    expect(html).not.toContain("home_standard_deferred_bundle");
  });

  it("uses build-time legacy bundle URL defines instead of manual query strings", () => {
    const homeBootstrap = readFileSync("src/entries/home-family-bootstrap.ts", "utf8");
    const playRuntimeScripts = readFileSync("src/entries/play-runtime-scripts.ts", "utf8");

    expect(homeBootstrap).toContain("__HOME_STANDARD_STARTUP_BUNDLE_URL__");
    expect(homeBootstrap).toContain("__HOME_STANDARD_DEFERRED_BUNDLE_URL__");
    expect(playRuntimeScripts).toContain("__PLAY_STANDARD_BUNDLE_URL__");
    expect(homeBootstrap).not.toContain("home_standard_startup_bundle.js?v=");
    expect(homeBootstrap).not.toContain("home_standard_deferred_bundle.js?v=");
    expect(playRuntimeScripts).not.toContain("play_standard_bundle.js?v=");
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

  it("keeps retired game manager base helpers out of the startup bundle", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");
    const runtimeInstallers = readFileSync("src/entries/home-family-runtime-installers.ts", "utf8");
    const startupStart = viteConfig.indexOf("const HOME_STANDARD_STARTUP_FILES = [");
    const startupEnd = viteConfig.indexOf("];", startupStart);
    const startupBlock = viteConfig.slice(startupStart, startupEnd);

    expect(startupBlock).not.toContain('"core_game_manager_base_helpers_runtime.js"');
    expect(startupBlock).toContain('"core_game_manager_bindings_runtime.js"');
    expect(runtimeInstallers).toContain("installGameManagerBaseHelpersRuntime()");
  });

  it("defers the large theme manager off the standard home startup bundle", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");
    const startupStart = viteConfig.indexOf("const HOME_STANDARD_STARTUP_FILES = [");
    const startupEnd = viteConfig.indexOf("];", startupStart);
    const deferredStart = viteConfig.indexOf("const HOME_STANDARD_DEFERRED_FILES = [");
    const deferredEnd = viteConfig.indexOf("];", deferredStart);
    const startupBlock = viteConfig.slice(startupStart, startupEnd);
    const deferredBlock = viteConfig.slice(deferredStart, deferredEnd);

    expect(startupBlock).not.toContain('"theme_manager.js"');
    expect(deferredBlock).toContain('"theme_manager.js"');
    expect(deferredBlock.indexOf('"theme_manager.js"')).toBeLessThan(
      deferredBlock.indexOf('"core_theme_settings_runtime.js"')
    );
  });

  it("generates the play page standard bundle from the play runtime script manifest", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");

    expect(viteConfig).toContain('const PLAY_STANDARD_BUNDLE = "play_standard_bundle.js";');
    expect(viteConfig).toContain("readPlayRuntimeScriptFileNames()");
    expect(viteConfig).toContain("writeLegacyBundleFile(targetDir, legacyBundles.playStandard)");
    expect(viteConfig).toContain("legacyBundles.playStandard");
  });

  it("hashes and minifies generated legacy bundles during the Vite build", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");

    expect(viteConfig).toContain('createHash("sha256")');
    expect(viteConfig).toContain("transformWithEsbuild");
    expect(viteConfig).toContain("minify: true");
    expect(viteConfig).toContain('define: {');
    expect(viteConfig).toContain("__HOME_STANDARD_STARTUP_BUNDLE_URL__");
    expect(viteConfig).toContain("__PLAY_STANDARD_BUNDLE_URL__");
  });

  it("keeps the protected home-family entry free of static game runtime installers", () => {
    const homeBootstrap = readFileSync("src/entries/home-family-bootstrap.ts", "utf8");

    expect(homeBootstrap).not.toMatch(/^import\s+.*from\s+["']\.\.\/core\//m);
    expect(homeBootstrap).not.toContain("installGameManagerInputEventsRuntime");
    expect(homeBootstrap).not.toContain("installReplayImportRuntime");
    expect(homeBootstrap).not.toContain('from "../bootstrap/ranked-session"');
    expect(homeBootstrap).toContain('import("./home-family-runtime-installers")');
    expect(homeBootstrap).toContain('import("../bootstrap/ranked-session")');
  });

  it("cleans stale hashed legacy bundles before writing fresh build output", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");

    expect(viteConfig).toContain("removeStaleLegacyBundleFiles");
    expect(viteConfig).toContain("home_standard_startup_bundle.*.js");
    expect(viteConfig).toContain("home_standard_deferred_bundle.*.js");
    expect(viteConfig).toContain("play_standard_bundle.*.js");
  });

  it("uses swap font loading for Clear Sans faces", () => {
    const css = readFileSync("style/fonts/clear-sans.css", "utf8");

    expect(css.match(/font-display:\s*swap;/g)).toHaveLength(3);
  });
});

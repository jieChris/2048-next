import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readCssEntry } from "./css-test-utils";

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([
  ".git",
  ".playwright-cli",
  "dist",
  "node_modules",
  "output",
  "playwright-report",
  "work"
]);
const STATIC_DISPLAY_NONE_RE =
  /style\s*=\s*["'][^"']*\bdisplay\s*:\s*none\s*(?:!important)?\s*;?[^"']*["']/i;
const CSS_FILE_LINE_BUDGET = 260;
const PRODUCTION_ENTRY_FILE_RE = /\.(?:html|js|ts)$/;

function collectFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const entryPath = path.join(dir, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      result.push(...collectFiles(entryPath, predicate));
      continue;
    }
    if (predicate(entryPath)) result.push(entryPath);
  }
  return result.sort();
}

function relative(filePath: string): string {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function extractRule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? match[1] : "";
}

describe("theme-ready CSS maintenance guardrails", () => {
  it("keeps non-ignored HTML free of head style blocks", () => {
    const offenders = collectFiles(ROOT, (filePath) => filePath.endsWith(".html"))
      .map((filePath) => ({
        filePath,
        source: readFileSync(filePath, "utf8")
      }))
      .filter(({ source }) => /<head\b[\s\S]*?<style\b/i.test(source))
      .map(({ filePath }) => relative(filePath));

    expect(offenders).toEqual([]);
  });

  it("keeps static initial visibility out of inline display:none attributes", () => {
    const offenders = collectFiles(ROOT, (filePath) => filePath.endsWith(".html"))
      .flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        return source.split(/\r?\n/).flatMap((line, index) =>
          STATIC_DISPLAY_NONE_RE.test(line) ? [`${relative(filePath)}:${index + 1}`] : []
        );
      });

    expect(offenders).toEqual([]);
  });

  it("keeps CSS imports resolvable from runtime entry manifests", () => {
    const cssEntries = collectFiles(path.join(ROOT, "style"), (filePath) => {
      const parent = path.dirname(filePath);
      return filePath.endsWith(".css") && parent === path.join(ROOT, "style");
    });

    for (const entry of cssEntries) {
      expect(() => readCssEntry(relative(entry))).not.toThrow();
    }
  });

  it("keeps focused CSS files below the maintenance line budget", () => {
    const oversized = collectFiles(path.join(ROOT, "style"), (filePath) => filePath.endsWith(".css"))
      .map((filePath) => ({
        filePath: relative(filePath),
        lines: readFileSync(filePath, "utf8").split(/\r?\n/).length
      }))
      .filter(({ lines }) => lines > CSS_FILE_LINE_BUDGET);

    expect(oversized).toEqual([]);
  });

  it("imports the shared visibility state utility immediately after base tokens", () => {
    const mainCss = readFileSync(path.join(ROOT, "style/main.css"), "utf8");

    expect(mainCss).toContain('@import url("tokens/base.css");\n@import url("base/state.css");');

    const css = readCssEntry("style/main.css");
    const stateRule = extractRule(css, ".is-hidden,\n[hidden]");
    expect(stateRule).toContain("display: none !important;");
  });

  it("defines current-value semantic tokens for future theme boundaries", () => {
    const css = readCssEntry("style/main.css");
    const rootRule = extractRule(css, ":root");

    expect(rootRule).toContain("--app-surface-overlay: rgba(0, 0, 0, 0.5);");
    expect(rootRule).toContain("--app-surface-modal: #fffdf9;");
    expect(rootRule).toContain("--app-surface-popover: #fffdfa;");
    expect(rootRule).toContain("--app-focus-ring-control: rgba(143, 122, 102, 0.35);");
    expect(rootRule).toContain("--app-shadow-dialog:");
    expect(rootRule).toContain("--app-radius-pill: 999px;");

    expect(css).toMatch(/\.replay-modal-overlay\s*\{[\s\S]*?background:\s*var\(--app-surface-overlay\);/);
    expect(css).toMatch(/\.announcement-item\s*\{[\s\S]*?background:\s*var\(--app-surface-modal\);/);
    expect(css).toMatch(/\.mode-intro-leaderboard-wrap\s*\{[\s\S]*?background:\s*var\(--app-surface-popover\);/);
  });

  it("keeps unfinished Liquid Glass CSS out of production entrypoints", () => {
    const mainCss = readFileSync(path.join(ROOT, "style/main.css"), "utf8");
    const css = readCssEntry("style/main.css");
    const forbiddenImports = [
      "themes/visual-theme-state.css",
      "themes/liquid-glass/tokens-light.css",
      "themes/liquid-glass/tokens-dark.css",
      "themes/liquid-glass/surfaces.css",
      "themes/liquid-glass/controls.css",
      "themes/liquid-glass/game.css",
      "themes/liquid-glass/modals.css",
      "themes/liquid-glass/pages.css"
    ];

    const pageLinks = [
      "account.html",
      "account_settings.html",
      "admin.html",
      "api-docs.html",
      "beta-access.html",
      "beta-login.html",
      "cache-reset.html",
      "capped_2048.html",
      "favicon-preview.html",
      "index_test.html",
      "medal-wall.html",
      "modes.html",
      "palette.html",
      "password.html",
      "PKU2048.html",
      "Practice_board.html",
      "ranked_seed_validator.html",
      "register.html",
      "relay_5x5.html",
      "replay.html",
      "stone_2k_monitor.html",
      "ui-preview.html",
      "user.html"
    ];

    for (const importPath of forbiddenImports) {
      expect(mainCss).not.toContain(importPath);
    }
    expect(css).not.toContain(':where(html[data-visual-theme="liquid-glass"])');

    for (const page of pageLinks) {
      const source = readFileSync(path.join(ROOT, page), "utf8");
      expect(source).not.toContain('href="style/themes/liquid-glass/pages.css');
    }
  });

  it("keeps unfinished visual-theme runtime controls out of production entrypoints", () => {
    const forbiddenRuntimeTokens = [
      "visual_theme_v1",
      "color_scheme_v1",
      "visual-theme-select",
      "color-scheme-select",
      "settings-theme-select",
      "buildSettingsSelectRowHtml",
      "readVisualThemeState",
      "writeVisualThemeState",
      "applyVisualThemeRootState"
    ];
    const offenders = collectFiles(ROOT, (filePath) => {
      if (!PRODUCTION_ENTRY_FILE_RE.test(filePath)) return false;
      const relativePath = relative(filePath);
      if (relativePath.startsWith("tests/")) return false;
      if (relativePath.startsWith(".trellis/")) return false;
      if (relativePath.startsWith("style/themes/")) return false;
      return true;
    }).flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return forbiddenRuntimeTokens.flatMap((token) =>
        source.includes(token) ? [`${relative(filePath)}:${token}`] : []
      );
    });

    expect(offenders).toEqual([]);
  });

  it("preloads visual-theme attributes on every page-owned Liquid Glass surface", () => {
    const themeReadyPages = [
      "account.html",
      "account_settings.html",
      "admin.html",
      "api-docs.html",
      "beta-access.html",
      "beta-login.html",
      "cache-reset.html",
      "favicon-preview.html",
      "medal-wall.html",
      "modes.html",
      "palette.html",
      "password.html",
      "ranked_seed_validator.html",
      "register.html",
      "relay_5x5.html",
      "replay.html",
      "stone_2k_monitor.html",
      "ui-preview.html",
      "user.html"
    ];

    for (const page of themeReadyPages) {
      const source = readFileSync(path.join(ROOT, page), "utf8");
      expect(source).toContain('/js/core_night_mode_preload.js');
    }
  });

  it("documents the theme boundary before any new theme implementation", () => {
    const docsPath = path.join(ROOT, "style/docs/theme-boundaries.md");

    expect(existsSync(docsPath)).toBe(true);
    const docs = existsSync(docsPath) ? readFileSync(docsPath, "utf8") : "";
    expect(docs).toContain("## Boundary Rules");
    expect(docs).toContain("Do not implement a new visual theme in CSS cleanup tasks.");
    expect(docs).toContain("Use semantic tokens before page-private visual overrides.");
    expect(docs).toContain("Prefer `.is-hidden` or `hidden` for static initial visibility.");
  });
});

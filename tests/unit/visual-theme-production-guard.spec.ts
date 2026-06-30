import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "js", "public/js", "style"];
const SCAN_ROOT_FILES = [
  "2048.html",
  "undo_2048.html",
  "PKU2048.html",
  "Practice_board.html",
  "capped_2048.html",
  "play.html",
  "replay.html",
  "modes.html",
  "account.html",
  "admin.html",
  "palette.html"
];
const IGNORED_DIRS = new Set(["dist", "node_modules", "playwright-report", "work"]);
const SCANNED_FILE_RE = /\.(?:css|html|js|ts|tsx)$/;

const FORBIDDEN_UNFINISHED_THEME_TOKENS = [
  "liquid-glass",
  "--lg-",
  "visual-theme-select",
  "color-scheme-select",
  "visual_theme_v1",
  "color_scheme_v1",
  "settings-theme-select",
  "readVisualThemeState",
  "writeVisualThemeState",
  "applyVisualThemeRootState"
];

function relative(filePath: string): string {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function collectFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const entryPath = path.join(dir, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      result.push(...collectFiles(entryPath));
      continue;
    }
    if (SCANNED_FILE_RE.test(entryPath)) {
      result.push(entryPath);
    }
  }
  return result;
}

describe("visual theme production guard", () => {
  it("keeps unfinished visual theme code out of production source entrypoints", () => {
    const scannedFiles = [
      ...SCAN_DIRS.flatMap((dir) => collectFiles(path.join(ROOT, dir))),
      ...SCAN_ROOT_FILES.map((file) => path.join(ROOT, file))
    ];

    const offenders = scannedFiles.flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return FORBIDDEN_UNFINISHED_THEME_TOKENS.flatMap((token) =>
        source.includes(token) ? [`${relative(filePath)}:${token}`] : []
      );
    });

    expect(offenders).toEqual([]);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

interface HtmlEntryExpectation {
  htmlPath: string;
  entryPath: string;
}

const ENTRY_PAGES: HtmlEntryExpectation[] = [
  { htmlPath: "index.html", entryPath: "./src/entries/index.ts" },
  { htmlPath: "history.html", entryPath: "./src/entries/history.ts" },
  { htmlPath: "modes.html", entryPath: "./src/entries/modes.ts" },
  { htmlPath: "account.html", entryPath: "./src/entries/account.ts" },
  { htmlPath: "palette.html", entryPath: "./src/entries/palette.ts" },
  { htmlPath: "replay.html", entryPath: "./src/entries/replay.ts" },
  { htmlPath: "play.html", entryPath: "./src/entries/play.ts" },
  { htmlPath: "undo_2048.html", entryPath: "./src/entries/undo.ts" },
  { htmlPath: "capped_2048.html", entryPath: "./src/entries/capped.ts" },
  { htmlPath: "Practice_board.html", entryPath: "./src/entries/practice-board.ts" },
  { htmlPath: "PKU2048.html", entryPath: "./src/entries/pku2048.ts" }
];

function readHtml(relativePath: string): string {
  const htmlPath = path.resolve(process.cwd(), relativePath);
  return readFileSync(htmlPath, "utf8");
}

describe("module entry html pages", () => {
  for (const entry of ENTRY_PAGES) {
    it(`${entry.htmlPath} uses a single module entry`, () => {
      const html = readHtml(entry.htmlPath);
      const moduleScripts = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g) || [];
      const legacyJsScripts = html.match(/<script\b[^>]*src="js\/[^"]+"[^>]*><\/script>/g) || [];

      expect(moduleScripts).toHaveLength(1);
      expect(html).toContain(`type="module" src="${entry.entryPath}"`);
      expect(legacyJsScripts).toEqual([]);
    });
  }
});

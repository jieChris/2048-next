import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const WIDE_LOGO_HTML_FILES = [
  "2048.html",
  "Practice_board.html",
  "PKU2048.html",
  "capped_2048.html",
  "history.html",
  "index_test.html",
  "modes.html",
  "play.html",
  "undo_2048.html"
];

function readPngSize(path: string): { width: number; height: number } {
  const buffer = readFileSync(path);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

describe("wide logo asset", () => {
  it("stores the height-stretched wide logo as a separate source asset", () => {
    expect(readPngSize("meta/logo.png")).toEqual({ width: 976, height: 400 });
    expect(readPngSize("meta/logo-tall.png")).toEqual({ width: 976, height: 421 });
  });

  it("uses the stretched logo file without fixed display-height stretching", () => {
    for (const file of WIDE_LOGO_HTML_FILES) {
      const html = readFileSync(file, "utf8");
      expect(html, file).toContain("meta/logo-tall.png?v=20260607-tall");
      expect(html, file).not.toContain("meta/logo.png");
      expect(html, file).not.toMatch(/height\s*:\s*10(?:1|6\.2621)px/);
    }

    const mainCss = readFileSync("style/main.css", "utf8");
    expect(mainCss).toContain("height: auto;");
    expect(mainCss).not.toContain("height: 106.2621px;");
  });
});

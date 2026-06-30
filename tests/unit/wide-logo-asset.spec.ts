import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readCssEntry } from "./css-test-utils";

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
  it("stores the height-stretched wide logo sources, including a small first-paint asset", () => {
    expect(readPngSize("meta/logo.png")).toEqual({ width: 976, height: 433 });
    expect(readPngSize("meta/logo-tall.png")).toEqual({ width: 976, height: 433 });
    expect(readPngSize("meta/logo-tall-small.png")).toEqual({ width: 468, height: 208 });
  });

  it("stores the height-stretched square logo sources", () => {
    expect(readPngSize("meta/source-square-logo-active.png")).toEqual({ width: 683, height: 739 });
    expect(readPngSize("meta/source-square-logo-crop-1_5.png")).toEqual({ width: 683, height: 739 });
    expect(readPngSize("meta/source-square-logo-crop-1_5-tall.png")).toEqual({ width: 683, height: 739 });
  });

  it("uses the small stretched logo file without fixed display-height stretching", () => {
    for (const file of WIDE_LOGO_HTML_FILES) {
      const html = readFileSync(file, "utf8");
      expect(html, file).toContain("meta/logo-tall-small.png?v=20260630-logo-height");
      expect(html, file).not.toContain("meta/logo.png");
      expect(html, file).not.toContain("meta/logo-tall.png");
      expect(html, file).not.toMatch(/height\s*:\s*10(?:1|6\.2621)px/);
    }

    const mainCss = readCssEntry("style/main.css");
    expect(mainCss).toContain("height: auto;");
    expect(mainCss).not.toContain("height: 106.2621px;");
  });

  it("marks the main game logo as a high priority image with stable dimensions", () => {
    const html = readFileSync("2048.html", "utf8");

    expect(html).toContain('width="234"');
    expect(html).toContain('height="104"');
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain('decoding="async"');
  });
});

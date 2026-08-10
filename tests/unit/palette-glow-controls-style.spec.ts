import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const CSS_SOURCE = readFileSync(resolve("style/palette_page.css"), "utf8");
const PAGE_SOURCE = readFileSync(resolve("js/palette_page.js"), "utf8");

describe("palette glow controls", () => {
  it("keeps an empty status note out of the glow control row", () => {
    expect(CSS_SOURCE).toMatch(
      /\.color-panel-head \.palette-note:empty\s*\{[\s\S]*?display:\s*none\s*;/
    );
    expect(CSS_SOURCE).toMatch(
      /\.glow-intensity-control\s*\{[\s\S]*?margin-left:\s*auto\s*;/
    );
  });

  it("does not announce successful glow slider updates", () => {
    expect(PAGE_SOURCE).not.toContain("Overall glow intensity updated.");
    expect(PAGE_SOURCE).not.toContain("已更新整体发光强度。");
    expect(PAGE_SOURCE).not.toContain("Tile glow multiplier updated.");
    expect(PAGE_SOURCE).not.toContain("已更新当前方块发光倍率。");
  });

  it("puts the swatch popover above preview tiles", () => {
    const popoverRule = CSS_SOURCE.match(
      /\.editor-palette-popover\s*\{([\s\S]*?)\}/
    )?.[1] || "";
    const zIndex = Number(popoverRule.match(/z-index:\s*(\d+)/)?.[1] || 0);
    expect(zIndex).toBeGreaterThan(10);
  });
});

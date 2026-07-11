import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("palette touch entry style", () => {
  it("only exposes touch sensitivity on narrow coarse-pointer devices", () => {
    const css = readFileSync(path.resolve(process.cwd(), "style/palette_page.css"), "utf8");

    expect(css).toMatch(
      /@media \(max-width: 760px\) and \(pointer: coarse\)\s*\{[\s\S]*?\.palette-touch-entry\s*\{\s*display: inline-flex !important;/
    );
    expect(css).toMatch(/\.palette-touch-entry\s*\{\s*display: none !important;/);
    expect(css).not.toMatch(/@media \(pointer: coarse\)\s*\{/);
    expect(css).not.toMatch(
      /@media \(max-width: 760px\)\s*\{[\s\S]*?\.palette-touch-entry\s*\{\s*display: inline-block;/
    );
  });
});

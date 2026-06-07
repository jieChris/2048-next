import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("first-load performance assets", () => {
  it("preloads the standard home critical bundle before runtime discovery", () => {
    const html = readFileSync("2048.html", "utf8");

    expect(html).toContain(
      '<link rel="preload" href="js/home_standard_critical_bundle.js?v=20260607-critical2" as="script">'
    );
  });

  it("uses swap font loading for Clear Sans faces", () => {
    const css = readFileSync("style/fonts/clear-sans.css", "utf8");

    expect(css.match(/font-display:\s*swap;/g)).toHaveLength(3);
  });
});

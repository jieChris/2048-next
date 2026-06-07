import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("first-load performance assets", () => {
  it("preloads only the standard home startup bundle before runtime discovery", () => {
    const html = readFileSync("2048.html", "utf8");

    expect(html).toContain(
      '<link rel="preload" href="js/home_standard_startup_bundle.js?v=20260607-startup1" as="script">'
    );
    expect(html).not.toContain("home_standard_deferred_bundle");
  });

  it("uses swap font loading for Clear Sans faces", () => {
    const css = readFileSync("style/fonts/clear-sans.css", "utf8");

    expect(css.match(/font-display:\s*swap;/g)).toHaveLength(3);
  });
});

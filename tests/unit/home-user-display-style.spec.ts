import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function extractRule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? match[1] : "";
}

describe("home user display style", () => {
  it("shows long nicknames without ellipsis clipping", () => {
    const css = readFileSync("style/main.css", "utf8");
    const scss = readFileSync("style/main.scss", "utf8");

    for (const source of [css, scss]) {
      const rule = extractRule(source, ".home-user-display");
      expect(rule).toContain("width: max-content;");
      expect(rule).toContain("overflow: visible;");
      expect(rule).not.toContain("max-width: 220px;");
      expect(rule).not.toContain("text-overflow: ellipsis;");
    }
  });

  it("uses a fresh stylesheet cache key on the main game page", () => {
    const html = readFileSync("2048.html", "utf8");

    expect(html).toContain("style/main.css?v=20260608-toolkit-align");
    expect(html).not.toContain("style/main.css?v=20260607-userdisplay");
  });
});

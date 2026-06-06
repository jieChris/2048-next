import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("modes page logo CSS", () => {
  it("keeps the logo aspect ratio and centers the logo on mobile", () => {
    const html = readFileSync("modes.html", "utf8");

    expect(html).toContain(".mode-brand-logo");
    expect(html).toContain("height: auto;");
    expect(html).not.toContain("object-fit: fill;");
    expect(html).toMatch(
      /@media\s*\(max-width:\s*900px\)[\s\S]*?\.mode-brand-logo\s*\{[\s\S]*?margin-left:\s*auto;[\s\S]*?margin-right:\s*auto;/
    );
  });
});

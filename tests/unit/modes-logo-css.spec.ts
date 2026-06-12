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

  it("keeps night mode titles on the shared legacy night ink", () => {
    const html = readFileSync("modes.html", "utf8");

    expect(html).toContain("--mode-ink: #ece2d3;");
    expect(html).toMatch(
      /html\[data-night-background="1"\]\s+\.mode-priority-card strong,\s*html\[data-night-background="1"\]\s+\.mode-group-title\s*\{[\s\S]*?color:\s*var\(--mode-ink\);/
    );
    expect(html).toMatch(
      /html\[data-night-background="1"\]\s+body::before\s*\{[\s\S]*?display:\s*none;/
    );
    expect(html).toMatch(
      /html\[data-night-background="1"\]\s+body::after\s*\{[\s\S]*?display:\s*none;/
    );
  });
});

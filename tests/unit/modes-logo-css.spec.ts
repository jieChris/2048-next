import { describe, expect, it } from "vitest";
import { readCssEntry } from "./css-test-utils";

describe("modes page logo CSS", () => {
  it("keeps the logo aspect ratio and centers the logo on mobile", () => {
    const css = readCssEntry("style/pages/modes/page.css");

    expect(css).toContain(".mode-brand-logo");
    expect(css).toContain("height: auto;");
    expect(css).not.toContain("object-fit: fill;");
    expect(css).toMatch(
      /@media\s*\(max-width:\s*900px\)[\s\S]*?\.mode-brand-logo\s*\{[\s\S]*?margin-left:\s*auto;[\s\S]*?margin-right:\s*auto;/
    );
  });

  it("keeps night mode titles on the shared legacy night ink", () => {
    const css = readCssEntry("style/pages/modes/page.css");

    expect(css).toContain("--mode-ink: #ece2d3;");
    expect(css).toMatch(
      /html\[data-night-background="1"\]\s+\.mode-priority-card strong,\s*html\[data-night-background="1"\]\s+\.mode-group-title\s*\{[\s\S]*?color:\s*var\(--mode-ink\);/
    );
    expect(css).toMatch(
      /html\[data-night-background="1"\]\s+body::before\s*\{[\s\S]*?display:\s*none;/
    );
    expect(css).toMatch(
      /html\[data-night-background="1"\]\s+body::after\s*\{[\s\S]*?display:\s*none;/
    );
  });
});

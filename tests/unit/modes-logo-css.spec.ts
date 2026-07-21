import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("modes page header CSS", () => {
  it("replaces the old logo heading with the shared icon-only back control", () => {
    const html = readFileSync("modes.html", "utf8");

    expect(html).toContain('<a class="page-back-button" href="2048.html"');
    expect(html).not.toContain('<img class="mode-brand-logo"');
    expect(html).not.toContain(".mode-brand-logo {");
  });

  it("keeps night mode headings on the shared page text token", () => {
    const html = readFileSync("modes.html", "utf8");

    expect(html).toContain("--mode-ink: var(--app-text-strong);");
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

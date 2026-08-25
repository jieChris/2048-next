import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/pages/admin-page.ts", "utf8");

describe("Theme Plaza administration", () => {
  it("adds one dedicated review view with preview and single-version actions", () => {
    expect(source).toContain('"themePlaza"');
    expect(source).toContain('view: "themePlaza"');
    expect(source).toContain(
      "request<AdminRecord[]>(`/admin/theme-plaza/reviews?",
    );
    expect(source).toContain("renderThemePlazaPalettePreview");
    expect(source).toContain(
      "/admin/theme-plaza/reviews/${encodeURIComponent(versionId)}/${action}",
    );
    expect(source).toContain(
      "/admin/theme-plaza/versions/${encodeURIComponent(versionId)}/${action}",
    );
    expect(source).not.toContain("data-theme-plaza-bulk");
  });
});

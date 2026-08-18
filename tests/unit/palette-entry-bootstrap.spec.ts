import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readEntry(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("palette entry bootstrap", () => {
  it("uses the shared unified direct-page bootstrap entry", () => {
    const source = readEntry("src/entries/palette.ts");

    expect(source).toContain('import { bootstrapDirectPage } from "../app/bootstrap-direct-page";');
    expect(source).toContain('import { bootstrapPalettePage } from "../pages/palette-page";');
    expect(source).toContain('import { initContextualGuideCatalogUI } from "../features/contextual-guide/contextual-guide-catalog";');
    expect(source).toContain('await bootstrapDirectPage("palette", bootstrapPalettePage);');
    expect(source).toContain("initContextualGuideCatalogUI();");
  });
});

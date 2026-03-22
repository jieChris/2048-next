import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readEntry(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("account-settings entry bootstrap", () => {
  it("uses the shared unified direct-page bootstrap entry", () => {
    const source = readEntry("src/entries/account-settings.ts");

    expect(source).toContain('import { bootstrapDirectPage } from "../app/bootstrap-direct-page";');
    expect(source).toContain('import { bootstrapAccountSettingsPage } from "../pages/account-settings-page";');
    expect(source).toContain('await bootstrapDirectPage("account-settings", bootstrapAccountSettingsPage);');
  });
});

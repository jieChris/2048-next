import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readEntry(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("password entry bootstrap", () => {
  it("uses the shared unified direct-page bootstrap entry", () => {
    const source = readEntry("src/entries/password.ts");

    expect(source).toContain('import { bootstrapDirectPage } from "../app/bootstrap-direct-page";');
    expect(source).toContain('import { bootstrapPasswordPage } from "../pages/password-page";');
    expect(source).toContain('await bootstrapDirectPage("password", bootstrapPasswordPage);');
  });
});

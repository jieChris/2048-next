import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("account-settings page bootstrap", () => {
  it("wraps the legacy module and marks the unified page system", () => {
    const source = readSource("src/pages/account-settings-page.ts");

    expect(source).toContain('import "../../js/api_shared_utils.js";');
    expect(source).toContain('import "../../js/account_settings_page.js";');
    expect(source).toContain('document.documentElement.setAttribute("data-page-system", "unified-page-system");');
    expect(source).toContain('document.body.setAttribute("data-page-family", "account-settings");');
  });
});

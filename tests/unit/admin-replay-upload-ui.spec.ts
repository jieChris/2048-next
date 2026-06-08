import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin replay rescue upload UI", () => {
  it("exposes replay upload controls and calls the parsed rescue API", () => {
    const root = process.cwd();
    const html = readFileSync(resolve(root, "admin.html"), "utf8");
    const page = readFileSync(resolve(root, "src/pages/admin-page.ts"), "utf8");

    expect(html).toContain('id="admin-rescue-replay-file"');
    expect(html).toContain('id="admin-create-rescue-from-replay"');
    expect(page).toContain("/admin/rescue-offers/from-replay");
  });
});

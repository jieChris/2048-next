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

  it("exposes a readable rescue offer history view", () => {
    const root = process.cwd();
    const html = readFileSync(resolve(root, "admin.html"), "utf8");
    const page = readFileSync(resolve(root, "src/pages/admin-page.ts"), "utf8");

    expect(html).toContain('id="admin-rescue-history"');
    expect(page).toContain('renderRescueOfferHistory');
    expect(page).toContain('game_progress_status');
    expect(page).toContain('final_record_id');
  });

  it("gates the admin page before authorization is confirmed", () => {
    const root = process.cwd();
    const html = readFileSync(resolve(root, "admin.html"), "utf8");
    const page = readFileSync(resolve(root, "src/pages/admin-page.ts"), "utf8");
    const css = readFileSync(resolve(root, "style/admin_page.css"), "utf8");

    expect(html).toContain('data-admin-access="checking"');
    expect(css).toContain('[data-admin-access="checking"] .admin-page-shell');
    expect(page).toContain('checkAuth({ redirectOnDeny: true })');
    expect(page).toContain('window.location.replace(ADMIN_DENIED_REDIRECT)');
  });
});

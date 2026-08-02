import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

function restoreGlobals(): void {
  if (originalDocument === undefined) delete (globalThis as { document?: Document }).document;
  else Object.defineProperty(globalThis, "document", { value: originalDocument, configurable: true, writable: true });
  if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
  else Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true, writable: true });
}

function installDom(url = "https://example.test/admin.html?view=dashboard"): JSDOM {
  const dom = new JSDOM(`<!doctype html><html><body data-admin-access="checking">
    <div id="admin-gate"><span id="admin-gate-text"></span></div>
    <div id="admin-shell" hidden><aside id="admin-sidebar"></aside><div id="admin-sidebar-backdrop" hidden></div><div><header id="admin-topbar"></header><main id="admin-content"></main></div></div>
    <dialog id="admin-dialog"><div id="admin-dialog-title"></div><div id="admin-dialog-body"></div><div id="admin-dialog-actions"></div></dialog>
    <div id="admin-toast" hidden></div>
  </body></html>`, { url });
  Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true, writable: true });
  Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true, writable: true });
  dom.window.localStorage.setItem("2048_auth_token_v1", "admin-token");
  return dom;
}

async function flush(): Promise<void> {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
}

describe("Next admin console", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
    restoreGlobals();
  });

  it("renders the authorized dashboard shell and has no beta qualification module", async () => {
    const dom = installDom();
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true, canManageSuperAdmins: true } }) };
      if (url.includes("/admin/dashboard")) return { json: async () => ({ success: true, data: { metrics: { total_users: 12, active_users: 10, inactive_users: 2, new_users_7d: 3, active_users_7d: 7, pending_rescue_offers: 1 }, recent_users: [], recent_audit: [], recent_events: [] } }) };
      return { json: async () => ({ success: true, data: [] }) };
    }));
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    expect(dom.window.document.getElementById("admin-shell")?.hidden).toBe(false);
    expect(dom.window.document.getElementById("admin-sidebar")?.textContent).toContain("用户中心");
    expect(dom.window.document.getElementById("admin-sidebar")?.textContent).toContain("成绩补录");
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("12");
    expect(dom.window.document.body.textContent).not.toContain("内测用户管理");
    expect(dom.window.document.body.textContent).not.toContain("内测资格");
  });

  it("renders record import as an independent URL module", async () => {
    const dom = installDom("https://example.test/admin.html?view=imports&user_id=42");
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true, canManageSuperAdmins: true } }) })));
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    expect(dom.window.document.querySelector("[data-view=imports]")?.classList.contains("is-active")).toBe(true);
    expect(dom.window.document.querySelector("#admin-content h1")?.textContent).toBe("成绩补录");
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("已预填用户 #42");
    (dom.window.document.querySelector("#admin-content [data-import]") as HTMLButtonElement).click();
    expect((dom.window.document.getElementById("dialog-import-user") as HTMLInputElement).value).toBe("42");
  });

  it("keeps Tabler and admin styles isolated to the admin entry", () => {
    const root = process.cwd();
    const entry = readFileSync(resolve(root, "src/entries/admin.ts"), "utf8");
    const html = readFileSync(resolve(root, "admin.html"), "utf8");

    expect(entry).toContain('@tabler/core/dist/css/tabler.min.css');
    expect(entry).toContain('style/admin_page.css');
    expect(html).not.toContain("main.css");
    expect(html).not.toContain("palette_page.css");
  });

  it("implements dry-run then official record import without editable score fields", () => {
    const root = process.cwd();
    const page = readFileSync(resolve(root, "src/pages/admin-page.ts"), "utf8");

    expect(page).toContain("/record-import/preview");
    expect(page).toContain("/record-import`");
    expect(page).toContain("official_v1");
    expect(page).not.toContain('id="dialog-import-score"');
    expect(page).not.toContain('id="dialog-import-duration"');
  });

  it("uses URL parameters for stable module and user detail navigation", () => {
    const page = readFileSync(resolve(process.cwd(), "src/pages/admin-page.ts"), "utf8");

    expect(page).toContain('const ADMIN_DENIED_REDIRECT = "/404.html";');
    expect(page).toContain('url.searchParams.set("view", view)');
    expect(page).toContain('url.searchParams.get("user")');
    expect(page).toContain('window.addEventListener("popstate"');
  });
});

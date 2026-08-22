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
      if (url.includes("/admin/record-delivery-health")) return { json: async () => ({ success: true, data: { scope: "server_observed_only", summary: { observed: 8, accepted: 5, duplicate: 2, authentication_failed: 1, payload_too_large: 0, rate_limited: 0, server_error: 0, replay_invalid: 0 }, upload_tasks: [{ status: "completed", total: 3 }] } }) };
      return { json: async () => ({ success: true, data: [] }) };
    }));
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    expect(dom.window.document.getElementById("admin-shell")?.hidden).toBe(false);
    expect(dom.window.document.getElementById("admin-sidebar")?.textContent).toContain("用户中心");
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("12");
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("服务器已观测投递");
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("无法统计从未到达服务器的浏览器本地记录");
    expect(dom.window.document.body.textContent).not.toContain("内测用户管理");
    expect(dom.window.document.body.textContent).not.toContain("内测资格");
  });

  it("uses the HttpOnly admin session when no local bearer is available", async () => {
    const dom = installDom();
    dom.window.localStorage.removeItem("2048_auth_token_v1");
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/admin/me")) {
        const headers = new Headers(init?.headers || {});
        expect(headers.get("Authorization")).toBeNull();
        expect(init?.credentials).toBe("include");
        return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true } }) };
      }
      if (url.includes("/admin/dashboard")) {
        return { json: async () => ({ success: true, data: { metrics: {}, recent_users: [], recent_audit: [], recent_events: [] } }) };
      }
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    expect(dom.window.document.getElementById("admin-shell")?.hidden).toBe(false);
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

  it("lists safe device-session metadata and requires a reason to revoke one", async () => {
    const dom = installDom("https://example.test/admin.html?view=users&user=42&section=sessions");
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 99, admin: true } }) };
      if (url.includes("/admin/users/42/device-sessions/device_session_1/revoke")) return { json: async () => ({ success: true, data: { revoked: true } }) };
      if (url.includes("/admin/users/42/device-sessions")) return { json: async () => ({ success: true, data: [{ id: "device_session_1", device_label: "Safari on Mac", created_at: "2026-08-01T00:00:00Z", last_used_at: "2026-08-19T00:00:00Z", status: "active" }] }) };
      if (url.includes("/admin/users/42")) return { json: async () => ({ success: true, data: { user: { id: 42, email: "player@example.com", nickname: "Player", role: "player", is_active: true }, stats: {}, leaderboard: [], achievements: [], rescue_offers: [], audit: [] } }) };
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("Safari on Mac");
    expect(dom.window.document.body.textContent).not.toContain("token_hash");
    dom.window.document.querySelector<HTMLElement>("[data-revoke-device-session]")?.click();
    const reason = dom.window.document.getElementById("dialog-device-session-reason") as HTMLTextAreaElement;
    reason.value = "设备已丢失";
    dom.window.document.querySelector<HTMLElement>("[data-dialog-confirm]")?.click();
    await flush();

    const revokeCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/device_session_1/revoke"));
    expect(JSON.parse(String((revokeCall?.[1] as RequestInit | undefined)?.body))).toEqual({ reason: "设备已丢失" });
  });

  it("renders the fixed read-only reconciliation snapshot in existing data tools", async () => {
    const dom = installDom("https://example.test/admin.html?view=tools");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 99, admin: true } }) };
      if (url.includes("/admin/reconciliation")) return { json: async () => ({ success: true, data: { readonly: true, generated_at: "2026-08-19T00:00:00Z", totals: { total_records: 100, active_records: 98, players: 12 }, leaderboard_modes: [], top_records: [], target_speed_eligibility: [] } }) };
      if (url.includes("/admin/tables")) return { json: async () => ({ success: true, data: [] }) };
      return { json: async () => ({ success: true, data: [] }) };
    }));
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    const content = dom.window.document.getElementById("admin-content")?.textContent || "";
    expect(content).toContain("固定只读发布对账");
    expect(content).toContain("100");
    expect(content).toContain("98");
  });

  it("shows record delivery identifiers and target-specific speed eligibility", async () => {
    const dom = installDom("https://example.test/admin.html?view=records");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 99, admin: true } }) };
      if (url.includes("/admin/records")) return { json: async () => ({ success: true, page: 1, limit: 50, total: 1, data: [{ id: "rec-1", user_id: 42, user_name: "Player", mode_key: "standard_4x4_pow2_no_undo", score: 1000, best_tile: 4096, duration_ms: 5000, status: "verified", client_record_id: "client-1", upload_status: "completed", tile_times_ms: { "2048": 1200 }, speed_metric_exclusions_v1: { "4096": { reason: "CHECKPOINT_TIMELINE_REWRITTEN" } } }] }) };
      return { json: async () => ({ success: true, data: [] }) };
    }));
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    const content = dom.window.document.getElementById("admin-content")?.textContent || "";
    const details = dom.window.document.querySelector<HTMLTemplateElement>("template[data-record-json]")?.innerHTML || "";
    expect(content).toContain("client-1");
    expect(content).toContain("completed");
    expect(details).toContain("目标速度资格");
    expect(details).toContain("CHECKPOINT_TIMELINE_REWRITTEN");
  });
});

import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { bootstrapAdminPage } from "../../src/pages/admin-page";

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

function installDom() {
  const dom = new JSDOM(
    [
      "<!doctype html><html><body data-page=\"admin-console\" data-admin-access=\"checking\">",
      "<button id=\"admin-check-auth\"></button>",
      "<button id=\"admin-refresh-tables\"></button>",
      "<button id=\"admin-beta-access-refresh\"></button>",
      "<button id=\"admin-beta-access-add\"></button>",
      "<input id=\"admin-beta-access-email\">",
      "<input id=\"admin-beta-access-note\">",
      "<select id=\"admin-beta-access-status\"><option value=\"active\">active</option></select>",
      "<p id=\"admin-beta-access-tip\"></p>",
      "<div id=\"admin-beta-access-list\"></div>",
      "<section id=\"admin-super-admin-card\" hidden>",
      "<button id=\"admin-super-admin-refresh\"></button>",
      "<button id=\"admin-super-admin-add\"></button>",
      "<input id=\"admin-super-admin-user-id\">",
      "<p id=\"admin-super-admin-tip\"></p>",
      "<div id=\"admin-super-admin-list\"></div>",
      "</section>",
      "<pre id=\"admin-auth-output\"></pre>",
      "<span id=\"admin-auth-state\"></span>",
      "</body></html>"
    ].join(""),
    { url: "https://example.test/admin.html" }
  );
  Object.defineProperty(globalThis, "document", {
    value: dom.window.document,
    configurable: true,
    writable: true
  });
  Object.defineProperty(globalThis, "window", {
    value: dom.window,
    configurable: true,
    writable: true
  });
  dom.window.localStorage.setItem("2048_auth_token_v1", "admin-token");
  return dom;
}

function restoreDom(): void {
  if (originalDocument === undefined) {
    delete (globalThis as { document?: Document }).document;
  } else {
    Object.defineProperty(globalThis, "document", {
      value: originalDocument,
      configurable: true,
      writable: true
    });
  }
  if (originalWindow === undefined) {
    delete (globalThis as { window?: Window }).window;
  } else {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true
    });
  }
}

async function flushAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("admin beta access UI", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    restoreDom();
  });

  it("loads allowlist rows and renders revoke buttons for active entries", async () => {
    const dom = installDom();
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/admin/me")) {
        return { json: async () => ({ success: true, data: { admin: true, rootAdmin: false, canManageSuperAdmins: false } }) };
      }
      if (url.includes("/admin/beta-access/allowlist")) {
        return {
          json: async () => ({
            success: true,
            data: [{ id: 1, email: "invitee@example.com", status: "active", note: "seed" }]
          })
        };
      }
      return { json: async () => ({ success: true, data: [] }) };
    }));

    bootstrapAdminPage();
    await flushAsync();
    dom.window.document.getElementById("admin-beta-access-refresh")!.click();
    await flushAsync();

    expect(dom.window.document.getElementById("admin-beta-access-list")?.textContent).toContain("invitee@example.com");
    expect(dom.window.document.querySelector(".admin-beta-access-table-head")?.textContent).toContain("邮箱");
    expect(dom.window.document.querySelector(".admin-beta-access-identity .admin-beta-access-email")).not.toBeNull();
    expect(dom.window.document.querySelector(".admin-beta-access-lifecycle")?.textContent).toContain("当前有效");
    expect(dom.window.document.querySelector("[data-admin-beta-access-revoke='1']")).not.toBeNull();
  });

  it("shows super-admin management only to the root administrator", async () => {
    const dom = installDom();
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/admin/me")) {
        return { json: async () => ({ success: true, data: { admin: true, rootAdmin: true, canManageSuperAdmins: true } }) };
      }
      if (url.includes("/admin/super-admins")) {
        return {
          json: async () => ({
            success: true,
            data: [
              { id: 0, email: "owner@example.com", nickname: "Owner", role: "super_admin" },
              { id: 48, email: "helper@example.com", nickname: "Helper", role: "super_admin" }
            ]
          })
        };
      }
      return { json: async () => ({ success: true, data: [] }) };
    }));

    bootstrapAdminPage();
    await flushAsync();

    expect(dom.window.document.getElementById("admin-super-admin-card")?.hidden).toBe(false);
    expect(dom.window.document.getElementById("admin-super-admin-list")?.textContent).toContain("owner@example.com");
    expect(dom.window.document.getElementById("admin-super-admin-list")?.textContent).toContain("helper@example.com");
    expect(dom.window.document.querySelector("[data-admin-super-admin-revoke='0']")).toBeNull();
    expect(dom.window.document.querySelector("[data-admin-super-admin-revoke='48']")).not.toBeNull();
  });

  it("keeps super-admin management hidden for non-root super administrators", async () => {
    const dom = installDom();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/admin/me")) {
        return { json: async () => ({ success: true, data: { admin: true, rootAdmin: false, canManageSuperAdmins: false } }) };
      }
      if (url.includes("/admin/beta-access/allowlist")) {
        return { json: async () => ({ success: true, data: [] }) };
      }
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    bootstrapAdminPage();
    await flushAsync();

    expect(dom.window.document.getElementById("admin-super-admin-card")?.hidden).toBe(true);
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/admin/super-admins"), expect.anything());
  });
});

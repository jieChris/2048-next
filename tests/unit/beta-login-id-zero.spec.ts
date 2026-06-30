import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

function createLoginDom() {
  return new JSDOM(
    `<!doctype html>
      <html>
        <body>
          <div id="beta-login-tip"></div>
          <input id="beta-login-email" class="beta-input" value="owner@example.com">
          <input id="beta-login-password" class="beta-input" value="secret">
          <button id="beta-login-submit"></button>
          <button data-beta-tab="login"></button>
          <button data-beta-tab="register"></button>
          <section id="beta-login-form" data-beta-form="login"></section>
          <section id="beta-register-form" data-beta-form="register"></section>
          <input id="beta-register-email" class="beta-input">
          <input id="beta-register-nickname" class="beta-input">
          <input id="beta-register-password" class="beta-input">
          <input id="beta-register-code" class="beta-input">
          <button id="beta-register-send"></button>
          <button id="beta-register-submit"></button>
        </body>
      </html>`,
    { url: "https://2048next.cn/beta-login.html?next=2048.html" }
  );
}

describe("beta login id=0 auth persistence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  });

  it("persists numeric userId 0 instead of keeping a previous user id", async () => {
    const dom = createLoginDom();
    (globalThis as { window?: unknown }).window = dom.window;
    (globalThis as { document?: unknown }).document = dom.window.document;
    dom.window.localStorage.setItem("2048_auth_userId_v1", "19");
    dom.window.localStorage.setItem("2048_auth_nickname_v1", "PreviousUser");

    const request = vi.fn(async () => ({
      success: true,
      token: "owner-token",
      userId: 0,
      nickname: "Owner"
    }));

    vi.doMock("../../src/services/api-client", () => ({
      AUTH_TOKEN_KEY: "2048_auth_token_v1",
      buildApiBaseCandidates: vi.fn(() => ["https://2048next.cn/api"]),
      createJsonApiClient: vi.fn(() => ({ request }))
    }));
    vi.doMock("../../src/bootstrap/access-gate", () => ({
      fetchBetaAccessStatus: vi.fn(async () => ({
        unauthorized: true,
        payload: { success: false, code: "UNAUTHORIZED" },
        status: null
      }))
    }));

    await import("../../src/entries/beta-login");

    dom.window.document.getElementById("beta-login-submit")?.dispatchEvent(
      new dom.window.Event("click", { bubbles: true })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.localStorage.getItem("2048_auth_token_v1")).toBe("owner-token");
    expect(dom.window.localStorage.getItem("2048_auth_userId_v1")).toBe("0");
    expect(dom.window.localStorage.getItem("2048_auth_nickname_v1")).toBe("Owner");
  });

  it("does not persist email as nickname when the login payload omits nickname", async () => {
    const dom = createLoginDom();
    (globalThis as { window?: unknown }).window = dom.window;
    (globalThis as { document?: unknown }).document = dom.window.document;
    dom.window.localStorage.setItem("2048_auth_nickname_v1", "PreviousUser");

    const request = vi.fn(async () => ({
      success: true,
      token: "owner-token",
      userId: 0,
      user: {
        id: 0,
        email: "owner@example.com"
      }
    }));

    vi.doMock("../../src/services/api-client", () => ({
      AUTH_TOKEN_KEY: "2048_auth_token_v1",
      buildApiBaseCandidates: vi.fn(() => ["https://2048next.cn/api"]),
      createJsonApiClient: vi.fn(() => ({ request }))
    }));
    vi.doMock("../../src/bootstrap/access-gate", () => ({
      fetchBetaAccessStatus: vi.fn(async () => ({
        unauthorized: true,
        payload: { success: false, code: "UNAUTHORIZED" },
        status: null
      }))
    }));

    await import("../../src/entries/beta-login");

    dom.window.document.getElementById("beta-login-submit")?.dispatchEvent(
      new dom.window.Event("click", { bubbles: true })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.localStorage.getItem("2048_auth_token_v1")).toBe("owner-token");
    expect(dom.window.localStorage.getItem("2048_auth_userId_v1")).toBe("0");
    expect(dom.window.localStorage.getItem("2048_auth_nickname_v1")).toBeNull();
  });
});

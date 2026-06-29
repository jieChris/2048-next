import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BETA_ACCESS_EXEMPT_PAGE_IDS,
  BETA_ACCESS_SMOKE_BYPASS_KEY,
  runBetaAccessGate,
  shouldRunBetaAccessGate
} from "../../src/bootstrap/access-gate";

function createDom() {
  const dom = new JSDOM("<!doctype html><html data-beta-access-pending=\"1\"><body><main id=\"app\"></main></body></html>", {
    url: "https://example.test/play.html?mode_key=board_3x3_pow2_no_undo"
  });
  return dom;
}

function createWindowLike(dom: JSDOM, pathname = "/play.html", search = "?mode_key=board_3x3_pow2_no_undo") {
  return {
    location: {
      origin: "https://example.test",
      hostname: "example.test",
      pathname,
      search,
      hash: "",
      href: "",
      replace: vi.fn()
    },
    localStorage: dom.window.localStorage
  } as unknown as Window & { location: Location & { replace: ReturnType<typeof vi.fn> } };
}

describe("bootstrap: access-gate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("only exempts standalone beta/admin utility pages", () => {
    expect(BETA_ACCESS_EXEMPT_PAGE_IDS).toEqual(new Set(["beta-login", "beta-access", "admin", "cache-reset"]));
    expect(shouldRunBetaAccessGate("account")).toBe(true);
    expect(shouldRunBetaAccessGate("register")).toBe(true);
    expect(shouldRunBetaAccessGate("password")).toBe(true);
    expect(shouldRunBetaAccessGate("beta-login")).toBe(false);
    expect(shouldRunBetaAccessGate("beta-access")).toBe(false);
    expect(shouldRunBetaAccessGate("admin")).toBe(false);
    expect(shouldRunBetaAccessGate("play")).toBe(true);
  });

  it("redirects to the standalone beta login page when no auth token exists", async () => {
    const dom = createDom();
    const windowLike = createWindowLike(dom);
    const result = await runBetaAccessGate("play", {
      documentLike: dom.window.document,
      windowLike,
      storageLike: dom.window.localStorage,
      fetchLike: vi.fn()
    });

    expect(result.allowed).toBe(false);
    expect(windowLike.location.replace).toHaveBeenCalledWith(
      "beta-login.html?gate_v=20260627-02&next=%2Fplay.html%3Fmode_key%3Dboard_3x3_pow2_no_undo&state=login"
    );
    expect(dom.window.document.querySelector("[data-beta-access-gate]")).toBeNull();
    expect(dom.window.document.documentElement.getAttribute("data-beta-access-pending")).toBe("1");
  });

  it("redirects allowlisted users without notice acceptance to the standalone notice page", async () => {
    const dom = createDom();
    const windowLike = createWindowLike(dom, "/modes.html", "");
    dom.window.localStorage.setItem("2048_auth_token_v1", "token");
    const fetchLike = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      expect(url).toContain("/access/me");
      return {
        status: 200,
        json: async () => ({
          success: true,
          data: {
            authenticated: true,
            userId: 7,
            email: "player@example.com",
            role: "player",
            superAdmin: false,
            allowlisted: true,
            noticeAccepted: false,
            noticeVersion: "beta_notice_2026_06_26_v1",
            canAccessProduct: false
          }
        })
      };
    });

    const result = await runBetaAccessGate("modes", {
      documentLike: dom.window.document,
      windowLike,
      storageLike: dom.window.localStorage,
      fetchLike: fetchLike as never
    });

    expect(result.allowed).toBe(false);
    expect(windowLike.location.replace).toHaveBeenCalledWith(
      "beta-access.html?gate_v=20260627-02&next=%2Fmodes.html&state=notice"
    );
  });

  it("reveals the protected page when beta access is already accepted", async () => {
    const dom = createDom();
    const windowLike = createWindowLike(dom);
    dom.window.localStorage.setItem("2048_auth_token_v1", "token");
    const fetchLike = vi.fn(async () => ({
      status: 200,
      json: async () => ({
        success: true,
        data: {
          authenticated: true,
          userId: 7,
          email: "player@example.com",
          role: "player",
          superAdmin: false,
          allowlisted: true,
          noticeAccepted: true,
          noticeVersion: "beta_notice_2026_06_26_v1",
          canAccessProduct: true
        }
      })
    }));

    const result = await runBetaAccessGate("play", {
      documentLike: dom.window.document,
      windowLike,
      storageLike: dom.window.localStorage,
      fetchLike: fetchLike as never
    });

    expect(result.allowed).toBe(true);
    expect(windowLike.location.replace).not.toHaveBeenCalled();
    expect(dom.window.document.documentElement.hasAttribute("data-beta-access-pending")).toBe(false);
  });

  it("allows the smoke bypass only on local development hosts", async () => {
    const localDom = new JSDOM("<!doctype html><html data-beta-access-pending=\"1\"><body></body></html>", {
      url: "http://127.0.0.1:4173/play.html"
    });
    const localWindow = createWindowLike(localDom, "/play.html", "");
    localWindow.location.hostname = "127.0.0.1";
    localDom.window.localStorage.setItem(BETA_ACCESS_SMOKE_BYPASS_KEY, "1");

    const localResult = await runBetaAccessGate("play", {
      documentLike: localDom.window.document,
      windowLike: localWindow,
      storageLike: localDom.window.localStorage,
      fetchLike: vi.fn()
    });

    expect(localResult.allowed).toBe(true);
    expect(localWindow.location.replace).not.toHaveBeenCalled();
    expect(localDom.window.document.documentElement.hasAttribute("data-beta-access-pending")).toBe(false);

    const productionDom = createDom();
    const productionWindow = createWindowLike(productionDom);
    productionDom.window.localStorage.setItem(BETA_ACCESS_SMOKE_BYPASS_KEY, "1");

    const productionResult = await runBetaAccessGate("play", {
      documentLike: productionDom.window.document,
      windowLike: productionWindow,
      storageLike: productionDom.window.localStorage,
      fetchLike: vi.fn()
    });

    expect(productionResult.allowed).toBe(false);
    expect(productionWindow.location.replace).toHaveBeenCalledWith(
      "beta-login.html?gate_v=20260627-02&next=%2Fplay.html%3Fmode_key%3Dboard_3x3_pow2_no_undo&state=login"
    );
  });
});

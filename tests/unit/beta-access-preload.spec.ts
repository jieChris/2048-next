import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";

const PRELOAD_SOURCE = readFileSync(resolve(__dirname, "../../public/js/beta_access_preload.js"), "utf8");

interface PreloadWindowLike {
  location: {
    hostname: string;
    pathname: string;
    search: string;
    hash: string;
    replace: ReturnType<typeof vi.fn>;
  };
  localStorage: Storage | Record<string, unknown>;
}

function runPreload(windowLike: PreloadWindowLike, documentLike: Document): void {
  // The preload is a classic IIFE over the `window`/`document` globals; shadow
  // them via function parameters so the file under test runs against our fakes.
  new Function("window", "document", PRELOAD_SOURCE)(windowLike, documentLike);
}

function createDom(): JSDOM {
  return new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/play.html" });
}

function createWindowLike(dom: JSDOM, pathname: string, search = "", hostname = "example.test"): PreloadWindowLike {
  return {
    location: { hostname, pathname, search, hash: "", replace: vi.fn() },
    localStorage: dom.window.localStorage
  };
}

describe("public/js/beta_access_preload", () => {
  it("marks the page pending WITHOUT hiding it and bounces tokenless visitors to login from <head>", () => {
    const dom = createDom();
    const windowLike = createWindowLike(dom, "/play.html", "?mode_key=board_3x3_pow2_no_undo");

    runPreload(windowLike, dom.window.document);

    const root = dom.window.document.documentElement;
    expect(root.getAttribute("data-beta-access-pending")).toBe("1");
    // Paint-first: the preload must never hide the document any more.
    expect(root.hasAttribute("hidden")).toBe(false);
    // Exact same URL shape as access-gate.ts buildGateHref().
    expect(windowLike.location.replace).toHaveBeenCalledWith(
      "beta-login.html?gate_v=20260627-02&next=%2Fplay.html%3Fmode_key%3Dboard_3x3_pow2_no_undo&state=login"
    );
  });

  it("does not redirect visitors that already carry an auth token", () => {
    const dom = createDom();
    const windowLike = createWindowLike(dom, "/play.html");
    dom.window.localStorage.setItem("2048_auth_token_v1", "token");

    runPreload(windowLike, dom.window.document);

    expect(dom.window.document.documentElement.getAttribute("data-beta-access-pending")).toBe("1");
    expect(dom.window.document.documentElement.hasAttribute("hidden")).toBe(false);
    expect(windowLike.location.replace).not.toHaveBeenCalled();
  });

  it("leaves exempt standalone pages untouched", () => {
    const dom = createDom();
    const windowLike = createWindowLike(dom, "/beta-login.html");

    runPreload(windowLike, dom.window.document);

    expect(dom.window.document.documentElement.hasAttribute("data-beta-access-pending")).toBe(false);
    expect(windowLike.location.replace).not.toHaveBeenCalled();
  });

  it("honors the smoke bypass only on local hosts", () => {
    const dom = createDom();
    const localWindow = createWindowLike(dom, "/play.html", "", "127.0.0.1");
    dom.window.localStorage.setItem("2048_beta_access_smoke_bypass_v1", "1");

    runPreload(localWindow, dom.window.document);

    expect(dom.window.document.documentElement.hasAttribute("data-beta-access-pending")).toBe(false);
    expect(localWindow.location.replace).not.toHaveBeenCalled();
  });

  it("still bounces to login when localStorage is unavailable", () => {
    const dom = createDom();
    const windowLike = createWindowLike(dom, "/modes.html");
    windowLike.localStorage = {
      getItem() {
        throw new Error("storage disabled");
      }
    };

    runPreload(windowLike, dom.window.document);

    expect(windowLike.location.replace).toHaveBeenCalledWith(
      "beta-login.html?gate_v=20260627-02&next=%2Fmodes.html&state=login"
    );
  });
});

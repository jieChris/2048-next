import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PRELOAD_SOURCE = readFileSync(resolve(__dirname, "../../public/js/beta_access_preload.js"), "utf8");
const GATE_TEST_START_MS = 1785392820000;
const GATE_TEST_END_MS = 1785394020000;
const GATE_RELEASE_AT_MS = 1785513600000;

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
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(GATE_RELEASE_AT_MS - 1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("bypasses during the test window and restores at its end", () => {
    vi.setSystemTime(GATE_TEST_START_MS);
    const openDom = createDom();
    const openWindow = createWindowLike(openDom, "/play.html");

    runPreload(openWindow, openDom.window.document);

    expect(openDom.window.document.documentElement.hasAttribute("data-beta-access-pending")).toBe(false);
    expect(openWindow.location.replace).not.toHaveBeenCalled();

    vi.setSystemTime(GATE_TEST_END_MS);
    const restoredDom = createDom();
    const restoredWindow = createWindowLike(restoredDom, "/play.html");

    runPreload(restoredWindow, restoredDom.window.document);

    expect(restoredDom.window.document.documentElement.getAttribute("data-beta-access-pending")).toBe("1");
    expect(restoredWindow.location.replace).toHaveBeenCalled();
  });

  it("stops marking or redirecting production pages at the permanent release boundary", () => {
    vi.setSystemTime(GATE_RELEASE_AT_MS);
    const dom = createDom();
    const windowLike = createWindowLike(dom, "/play.html");

    runPreload(windowLike, dom.window.document);

    expect(dom.window.document.documentElement.hasAttribute("data-beta-access-pending")).toBe(false);
    expect(windowLike.location.replace).not.toHaveBeenCalled();
  });

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

  it("bypasses the gate automatically on local development hosts", () => {
    const dom = createDom();
    const localWindow = createWindowLike(dom, "/play.html", "", "127.0.0.1");

    runPreload(localWindow, dom.window.document);

    expect(dom.window.document.documentElement.hasAttribute("data-beta-access-pending")).toBe(false);
    expect(localWindow.location.replace).not.toHaveBeenCalled();
  });

  it("can force the gate on a local host for gate regression tests", () => {
    vi.setSystemTime(GATE_RELEASE_AT_MS);
    const dom = createDom();
    const localWindow = createWindowLike(dom, "/play.html", "", "127.0.0.1");
    dom.window.localStorage.setItem("2048_beta_access_force_gate_local_v1", "1");

    runPreload(localWindow, dom.window.document);

    expect(dom.window.document.documentElement.getAttribute("data-beta-access-pending")).toBe("1");
    expect(localWindow.location.replace).toHaveBeenCalled();
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

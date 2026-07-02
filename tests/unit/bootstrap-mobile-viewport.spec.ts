import { describe, expect, it } from "vitest";

import {
  applyMobilePageScrollLock,
  bindMobilePageScrollLock,
  isGamePageScope,
  isCompactGameViewport,
  isMobileGameViewport,
  isPracticePageScope,
  resolveMobilePageScrollLockState,
  isTimerboxMobileScope,
  isTimerboxCollapseViewport,
  isViewportAtMost,
  resolvePageScopeValue
} from "../../src/bootstrap/mobile-viewport";

describe("bootstrap mobile viewport", () => {
  it("uses matchMedia when available", () => {
    expect(
      isViewportAtMost({
        windowLike: {
          matchMedia(query: string) {
            return { matches: query === "(max-width: 760px)" };
          }
        },
        maxWidth: 760
      })
    ).toBe(true);
  });

  it("falls back to innerWidth when matchMedia is unavailable", () => {
    expect(isViewportAtMost({ windowLike: { innerWidth: 760 }, maxWidth: 760 })).toBe(true);
    expect(isViewportAtMost({ windowLike: { innerWidth: 761 }, maxWidth: 760 })).toBe(false);
  });

  it("provides compact and timerbox wrappers", () => {
    const win = { innerWidth: 980 };
    expect(isCompactGameViewport({ windowLike: win, maxWidth: 980 })).toBe(true);
    expect(isTimerboxCollapseViewport({ windowLike: win, maxWidth: 980 })).toBe(true);
  });

  it("returns false when not narrow enough for mobile viewport", () => {
    expect(
      isMobileGameViewport({
        windowLike: { innerWidth: 1000 },
        navigatorLike: { userAgent: "iPhone" },
        maxWidth: 760
      })
    ).toBe(false);
  });

  it("returns true for coarse pointer in narrow viewport", () => {
    expect(
      isMobileGameViewport({
        windowLike: {
          matchMedia(query: string) {
            if (query === "(max-width: 760px)") return { matches: true };
            if (query === "(pointer: coarse)") return { matches: true };
            if (query === "(hover: none)") return { matches: false };
            return { matches: false };
          }
        },
        navigatorLike: { userAgent: "Desktop" },
        maxWidth: 760
      })
    ).toBe(true);
  });

  it("returns true for mobile userAgent in narrow viewport", () => {
    expect(
      isMobileGameViewport({
        windowLike: {
          matchMedia(query: string) {
            return { matches: query === "(max-width: 760px)" };
          }
        },
        navigatorLike: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" },
        maxWidth: 760
      })
    ).toBe(true);
  });

  it("returns false when narrow viewport has no mobile signals", () => {
    expect(
      isMobileGameViewport({
        windowLike: {
          matchMedia(query: string) {
            if (query === "(max-width: 760px)") return { matches: true };
            return { matches: false };
          }
        },
        navigatorLike: { userAgent: "Desktop" },
        maxWidth: 760
      })
    ).toBe(false);
  });

  it("resolves page scope value from body dataset", () => {
    expect(
      resolvePageScopeValue({
        bodyLike: {
          getAttribute(name: string) {
            return name === "data-page" ? "game" : null;
          }
        }
      })
    ).toBe("game");
    expect(resolvePageScopeValue({ bodyLike: null })).toBe("");
  });

  it("detects game and practice scope flags", () => {
    const gameBody = {
      getAttribute(name: string) {
        return name === "data-page" ? "game" : null;
      }
    };
    const practiceBody = {
      getAttribute(name: string) {
        return name === "data-page" ? "practice" : null;
      }
    };
    const homeBody = {
      getAttribute(name: string) {
        return name === "data-page" ? "home" : null;
      }
    };
    expect(isGamePageScope({ bodyLike: gameBody })).toBe(true);
    expect(isGamePageScope({ bodyLike: practiceBody })).toBe(false);
    expect(isPracticePageScope({ bodyLike: practiceBody })).toBe(true);
    expect(isPracticePageScope({ bodyLike: gameBody })).toBe(false);
    expect(isTimerboxMobileScope({ bodyLike: gameBody })).toBe(true);
    expect(isTimerboxMobileScope({ bodyLike: practiceBody })).toBe(true);
    expect(isTimerboxMobileScope({ bodyLike: homeBody })).toBe(false);
  });

  it("locks mobile game page scrolling when the document fits in the viewport", () => {
    const root = {
      scrollHeight: 640,
      clientHeight: 640,
      attributes: new Map<string, string>(),
      setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
      },
      removeAttribute(name: string) {
        this.attributes.delete(name);
      },
      getAttribute(name: string) {
        return this.attributes.get(name) || null;
      }
    };
    const body = {
      scrollHeight: 620,
      clientHeight: 640,
      getAttribute(name: string) {
        return name === "data-page" ? "game" : null;
      }
    };
    const documentLike = {
      documentElement: root,
      body
    };
    const windowLike = {
      innerWidth: 390,
      innerHeight: 640,
      matchMedia(query: string) {
        if (query === "(max-width: 760px)") return { matches: true };
        if (query === "(pointer: coarse)") return { matches: true };
        return { matches: false };
      }
    };

    expect(
      resolveMobilePageScrollLockState({
        documentLike,
        windowLike,
        navigatorLike: { userAgent: "iPhone" },
        bodyLike: body,
        maxWidth: 760
      }).shouldLock
    ).toBe(true);

    const result = applyMobilePageScrollLock({
      documentLike,
      windowLike,
      navigatorLike: { userAgent: "iPhone" },
      bodyLike: body,
      maxWidth: 760
    });

    expect(result.shouldLock).toBe(true);
    expect(root.getAttribute("data-mobile-page-scroll-lock")).toBe("1");
  });

  it("allows mobile game page scrolling when content overflows the viewport", () => {
    const root = {
      scrollHeight: 920,
      clientHeight: 640,
      attributes: new Map<string, string>([["data-mobile-page-scroll-lock", "1"]]),
      setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
      },
      removeAttribute(name: string) {
        this.attributes.delete(name);
      },
      getAttribute(name: string) {
        return this.attributes.get(name) || null;
      }
    };
    const body = {
      scrollHeight: 920,
      clientHeight: 640,
      getAttribute(name: string) {
        return name === "data-page" ? "game" : null;
      }
    };

    const result = applyMobilePageScrollLock({
      documentLike: {
        documentElement: root,
        body
      },
      windowLike: {
        innerWidth: 390,
        innerHeight: 640,
        matchMedia(query: string) {
          if (query === "(max-width: 760px)") return { matches: true };
          if (query === "(hover: none)") return { matches: true };
          return { matches: false };
        }
      },
      navigatorLike: { userAgent: "iPhone" },
      bodyLike: body,
      maxWidth: 760
    });

    expect(result.shouldLock).toBe(false);
    expect(root.getAttribute("data-mobile-page-scroll-lock")).toBeNull();
  });

  it("refreshes mobile page scroll lock when viewport sizing changes", () => {
    const root = {
      scrollHeight: 640,
      clientHeight: 640,
      attributes: new Map<string, string>(),
      setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
      },
      removeAttribute(name: string) {
        this.attributes.delete(name);
      },
      getAttribute(name: string) {
        return this.attributes.get(name) || null;
      }
    };
    const body = {
      scrollHeight: 640,
      clientHeight: 640,
      getAttribute(name: string) {
        return name === "data-page" ? "practice" : null;
      }
    };
    const listeners = new Map<string, Array<() => void>>();
    const windowLike = {
      innerWidth: 390,
      innerHeight: 640,
      matchMedia(query: string) {
        if (query === "(max-width: 760px)") return { matches: true };
        if (query === "(pointer: coarse)") return { matches: true };
        return { matches: false };
      },
      addEventListener(name: string, listener: () => void) {
        const existing = listeners.get(name) || [];
        existing.push(listener);
        listeners.set(name, existing);
      },
      requestAnimationFrame(callback: () => void) {
        callback();
        return 1;
      }
    };

    bindMobilePageScrollLock({
      documentLike: {
        documentElement: root,
        body
      },
      windowLike,
      navigatorLike: { userAgent: "iPhone" },
      bodyLike: body,
      maxWidth: 760
    });

    expect(root.getAttribute("data-mobile-page-scroll-lock")).toBe("1");

    root.scrollHeight = 820;
    body.scrollHeight = 820;
    listeners.get("resize")?.[0]?.();

    expect(root.getAttribute("data-mobile-page-scroll-lock")).toBeNull();
  });
});

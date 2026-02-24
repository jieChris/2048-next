import { describe, expect, it } from "vitest";

import {
  isGamePageScope,
  isCompactGameViewport,
  isMobileGameViewport,
  isPracticePageScope,
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
});

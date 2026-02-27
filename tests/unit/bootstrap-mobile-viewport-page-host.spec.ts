import { describe, expect, it } from "vitest";

import { createMobileViewportPageResolvers } from "../../src/bootstrap/mobile-viewport-page-host";

describe("bootstrap mobile viewport page host", () => {
  it("creates page resolver functions and delegates with page context", () => {
    const bodyLike = { id: "body" };
    const windowLike = { innerWidth: 640 };
    const navigatorLike = { userAgent: "test-agent" };
    const calls: Array<{ name: string; payload: unknown }> = [];
    const runtime = {
      isGamePageScope(payload: unknown) {
        calls.push({ name: "isGamePageScope", payload });
        return true;
      },
      isTimerboxMobileScope(payload: unknown) {
        calls.push({ name: "isTimerboxMobileScope", payload });
        return true;
      },
      isPracticePageScope(payload: unknown) {
        calls.push({ name: "isPracticePageScope", payload });
        return false;
      },
      isMobileGameViewport(payload: unknown) {
        calls.push({ name: "isMobileGameViewport", payload });
        return true;
      },
      isCompactGameViewport(payload: unknown) {
        calls.push({ name: "isCompactGameViewport", payload });
        return true;
      },
      isTimerboxCollapseViewport(payload: unknown) {
        calls.push({ name: "isTimerboxCollapseViewport", payload });
        return false;
      }
    };

    const resolvers = createMobileViewportPageResolvers({
      mobileViewportRuntime: runtime,
      bodyLike,
      windowLike,
      navigatorLike,
      mobileUiMaxWidth: 760,
      compactGameViewportMaxWidth: 980,
      timerboxCollapseMaxWidth: 960
    });

    expect(resolvers.isGamePageScope()).toBe(true);
    expect(resolvers.isTimerboxMobileScope()).toBe(true);
    expect(resolvers.isPracticePageScope()).toBe(false);
    expect(resolvers.isMobileGameViewport()).toBe(true);
    expect(resolvers.isCompactGameViewport()).toBe(true);
    expect(resolvers.isTimerboxCollapseViewport()).toBe(false);

    expect(calls).toHaveLength(6);
    expect(calls[0].payload).toEqual({ bodyLike });
    expect(calls[1].payload).toEqual({ bodyLike });
    expect(calls[2].payload).toEqual({ bodyLike });
    expect(calls[3].payload).toEqual({ windowLike, navigatorLike, maxWidth: 760 });
    expect(calls[4].payload).toEqual({ windowLike, maxWidth: 980 });
    expect(calls[5].payload).toEqual({ windowLike, maxWidth: 960 });
  });

  it("returns false when resolver api is missing", () => {
    const resolvers = createMobileViewportPageResolvers({
      mobileViewportRuntime: {}
    });

    expect(resolvers.isGamePageScope()).toBe(false);
    expect(resolvers.isTimerboxMobileScope()).toBe(false);
    expect(resolvers.isPracticePageScope()).toBe(false);
    expect(resolvers.isMobileGameViewport()).toBe(false);
    expect(resolvers.isCompactGameViewport()).toBe(false);
    expect(resolvers.isTimerboxCollapseViewport()).toBe(false);
  });
});

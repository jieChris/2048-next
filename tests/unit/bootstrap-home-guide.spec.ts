import { describe, expect, it } from "vitest";

import {
  buildHomeGuideSteps,
  isHomePagePath,
  shouldAutoStartHomeGuide
} from "../../src/bootstrap/home-guide";

describe("bootstrap home guide", () => {
  it("identifies index homepage paths", () => {
    expect(isHomePagePath("/")).toBe(true);
    expect(isHomePagePath("/index.html")).toBe(true);
    expect(isHomePagePath("/foo/index.htm")).toBe(true);
    expect(isHomePagePath("")).toBe(true);
  });

  it("rejects non-home paths", () => {
    expect(isHomePagePath("/play.html")).toBe(false);
    expect(isHomePagePath("/modes.html")).toBe(false);
  });

  it("auto-starts only on homepage when guide is unseen", () => {
    expect(
      shouldAutoStartHomeGuide({
        pathname: "/index.html",
        seenValue: "0"
      })
    ).toBe(true);
    expect(
      shouldAutoStartHomeGuide({
        pathname: "/index.html",
        seenValue: null
      })
    ).toBe(true);
  });

  it("does not auto-start when already seen or on non-homepage", () => {
    expect(
      shouldAutoStartHomeGuide({
        pathname: "/index.html",
        seenValue: "1"
      })
    ).toBe(false);
    expect(
      shouldAutoStartHomeGuide({
        pathname: "/play.html",
        seenValue: "0"
      })
    ).toBe(false);
  });

  it("builds desktop home guide steps without mobile hint button", () => {
    const steps = buildHomeGuideSteps({ isCompactViewport: false });
    const selectors = steps.map((item) => item.selector);
    expect(selectors).not.toContain("#top-mobile-hint-btn");
    expect(selectors[selectors.length - 1]).toBe("#top-restart-btn");
  });

  it("inserts mobile hint step before restart in compact viewport", () => {
    const steps = buildHomeGuideSteps({ isCompactViewport: true });
    const selectors = steps.map((item) => item.selector);
    const hintIdx = selectors.indexOf("#top-mobile-hint-btn");
    const restartIdx = selectors.indexOf("#top-restart-btn");
    expect(hintIdx).toBeGreaterThan(-1);
    expect(restartIdx).toBeGreaterThan(hintIdx);
    expect(restartIdx).toBe(hintIdx + 1);
  });
});

import { describe, expect, it } from "vitest";

import {
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
});

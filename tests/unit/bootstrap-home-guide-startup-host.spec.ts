import { describe, expect, it, vi } from "vitest";

import { applyHomeGuideAutoStart } from "../../src/bootstrap/home-guide-startup-host";

describe("bootstrap home guide startup host", () => {
  it("schedules guide start when auto-start condition is met", () => {
    const startHomeGuide = vi.fn();
    const setTimeoutLike = vi.fn((handler: () => unknown, _ms: number) => {
      handler();
      return 1;
    });

    const result = applyHomeGuideAutoStart({
      homeGuideRuntime: {
        resolveHomeGuidePathname() {
          return "/index.html";
        },
        resolveHomeGuideAutoStart() {
          return { shouldAutoStart: true };
        }
      },
      locationLike: { pathname: "/index.html" },
      storageLike: { getItem: vi.fn(() => null) },
      seenKey: "home_guide_seen_v1",
      startHomeGuide,
      setTimeoutLike,
      delayMs: 260
    });

    expect(result).toEqual({
      shouldAutoStart: true,
      scheduled: true,
      delayMs: 260
    });
    expect(setTimeoutLike).toHaveBeenCalledWith(expect.any(Function), 260);
    expect(startHomeGuide).toHaveBeenCalledWith({ fromSettings: false });
  });

  it("returns no-op when auto-start condition is false", () => {
    const result = applyHomeGuideAutoStart({
      homeGuideRuntime: {
        resolveHomeGuidePathname() {
          return "/play.html";
        },
        resolveHomeGuideAutoStart() {
          return { shouldAutoStart: false };
        }
      }
    });

    expect(result).toEqual({
      shouldAutoStart: false,
      scheduled: false,
      delayMs: 260
    });
  });
});

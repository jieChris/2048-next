import { describe, expect, it, vi } from "vitest";

import {
  applyHomeGuidePanelPosition,
  resolveHomeGuideTargetVisibility
} from "../../src/bootstrap/home-guide-panel-host";

describe("bootstrap home guide panel host", () => {
  it("positions panel by applying layout resolver twice", () => {
    const panel = {
      style: {},
      offsetHeight: 222
    };
    const target = {
      getBoundingClientRect() {
        return {
          left: 10,
          top: 20,
          right: 30,
          bottom: 40
        };
      }
    };
    const resolveHomeGuidePanelLayout = vi
      .fn()
      .mockReturnValueOnce({
        panelWidth: 260,
        top: 100,
        left: 120
      })
      .mockReturnValueOnce({
        panelWidth: 300,
        top: 140,
        left: 160
      });

    const result = applyHomeGuidePanelPosition({
      homeGuideState: {
        panel,
        target
      },
      homeGuideRuntime: {
        resolveHomeGuidePanelLayout
      },
      mobileViewportRuntime: {
        isViewportAtMost() {
          return true;
        }
      },
      windowLike: {
        innerWidth: 1024,
        innerHeight: 768
      },
      mobileUiMaxWidth: 640
    });

    expect(result).toEqual({ didPosition: true });
    expect(resolveHomeGuidePanelLayout).toHaveBeenCalledTimes(2);
    expect(panel.style).toEqual({
      maxWidth: "300px",
      width: "300px",
      top: "140px",
      left: "160px"
    });
  });

  it("returns false when panel/target/runtime layout resolver is missing", () => {
    expect(applyHomeGuidePanelPosition({ homeGuideState: {} })).toEqual({
      didPosition: false
    });
    expect(
      applyHomeGuidePanelPosition({
        homeGuideState: {
          panel: {},
          target: {
            getBoundingClientRect() {
              return {};
            }
          }
        },
        homeGuideRuntime: {}
      })
    ).toEqual({
      didPosition: false
    });
  });

  it("delegates target visibility check with getComputedStyle wrapper", () => {
    const getComputedStyle = vi.fn().mockReturnValue({ display: "block" });
    const visibility = resolveHomeGuideTargetVisibility({
      homeGuideRuntime: {
        isHomeGuideTargetVisible(payload: {
          nodeLike: unknown;
          getComputedStyle: ((node: unknown) => unknown) | null;
        }) {
          return !!payload.getComputedStyle && payload.getComputedStyle(payload.nodeLike);
        }
      },
      windowLike: {
        getComputedStyle
      },
      node: { id: "x" }
    });

    expect(visibility).toBe(true);
    expect(getComputedStyle).toHaveBeenCalledTimes(1);
  });

  it("returns false when visibility resolver is unavailable", () => {
    expect(resolveHomeGuideTargetVisibility({})).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";

import { applyHomeGuideStart } from "../../src/bootstrap/home-guide-start-host";

describe("bootstrap home guide start host", () => {
  it("applies start lifecycle, session state and layer display", () => {
    const overlay = { style: { display: "none" } };
    const panel = { style: { display: "none" } };
    const documentLike = { body: { className: "" } };

    const homeGuideState: Record<string, unknown> = {
      active: false,
      fromSettings: false,
      steps: [],
      index: 0
    };

    const result = applyHomeGuideStart({
      homeGuideRuntime: {
        resolveHomeGuideLifecycleState(payload: { action: string; fromSettings: boolean }) {
          return { action: payload.action, fromSettings: payload.fromSettings };
        },
        resolveHomeGuideSessionState() {
          return {
            active: true,
            fromSettings: true,
            steps: [{ selector: ".a" }],
            index: 0
          };
        },
        resolveHomeGuideLayerDisplayState() {
          return {
            overlayDisplay: "block",
            panelDisplay: "block"
          };
        }
      },
      homeGuideState,
      documentLike,
      options: { fromSettings: true },
      isHomePage() {
        return true;
      },
      getHomeGuideSteps() {
        return [{ selector: ".a" }];
      },
      ensureHomeGuideDom() {
        return { overlay, panel };
      }
    });

    expect(result).toEqual({ didStart: true, hasDom: true });
    expect(homeGuideState.active).toBe(true);
    expect(homeGuideState.fromSettings).toBe(true);
    expect(homeGuideState.steps).toEqual([{ selector: ".a" }]);
    expect(homeGuideState.index).toBe(0);
    expect(overlay.style.display).toBe("block");
    expect(panel.style.display).toBe("block");
    expect(documentLike.body.className).toBe("home-guide-active");
  });

  it("returns noop when page is not home", () => {
    const ensureHomeGuideDom = vi.fn();
    const result = applyHomeGuideStart({
      isHomePage() {
        return false;
      },
      ensureHomeGuideDom
    });

    expect(result).toEqual({ didStart: false, hasDom: false });
    expect(ensureHomeGuideDom).not.toHaveBeenCalled();
  });
});

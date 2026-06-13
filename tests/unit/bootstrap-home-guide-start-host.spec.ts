import { describe, expect, it, vi } from "vitest";

import {
  applyHomeGuideStart,
  createHomeGuideStartHostRuntime,
  installHomeGuideStartHostRuntime,
  type HomeGuideStartHostRuntime
} from "../../src/bootstrap/home-guide-start-host";

describe("bootstrap home guide start host", () => {
  it("creates the legacy CoreHomeGuideStartHostRuntime shape from TypeScript functions", () => {
    const runtime = createHomeGuideStartHostRuntime();

    expect(runtime.applyHomeGuideStart).toBe(applyHomeGuideStart);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreHomeGuideStartHostRuntime?: HomeGuideStartHostRuntime } = {};

    const installed = installHomeGuideStartHostRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreHomeGuideStartHostRuntime);
    expect(installed?.applyHomeGuideStart).toBeTypeOf("function");
  });

  it("does not overwrite an existing start host runtime", () => {
    const existing = createHomeGuideStartHostRuntime();
    const windowLike = { CoreHomeGuideStartHostRuntime: existing };

    const installed = installHomeGuideStartHostRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreHomeGuideStartHostRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installHomeGuideStartHostRuntime({ windowLike: null })).toBeNull();
  });

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

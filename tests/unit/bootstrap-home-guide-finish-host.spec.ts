import { describe, expect, it, vi } from "vitest";

import {
  applyHomeGuideFinish,
  applyHomeGuideFinishFromContext
} from "../../src/bootstrap/home-guide-finish-host";

describe("bootstrap home guide finish host", () => {
  it("applies finish lifecycle, marks seen, syncs settings and shows done notice", () => {
    const clearHomeGuideHighlight = vi.fn();
    const markHomeGuideSeen = vi.fn();
    const syncHomeGuideSettingsUI = vi.fn();
    const showHomeGuideDoneNotice = vi.fn();

    const homeGuideState: Record<string, unknown> = {
      active: true,
      fromSettings: true,
      index: 2,
      steps: [{ id: 1 }],
      overlay: { style: { display: "flex" } },
      panel: { style: { display: "block" } }
    };
    const documentLike = {
      body: { className: "home-guide-active" },
      getElementById: vi.fn(() => null)
    };

    const result = applyHomeGuideFinish({
      homeGuideRuntime: {
        resolveHomeGuideLifecycleState() {
          return { next: "finish" };
        },
        resolveHomeGuideSessionState() {
          return {
            active: false,
            fromSettings: false,
            index: 0,
            steps: []
          };
        },
        resolveHomeGuideLayerDisplayState() {
          return {
            overlayDisplay: "none",
            panelDisplay: "none"
          };
        },
        markHomeGuideSeen
      },
      homeGuideState,
      markSeen: true,
      options: {
        showDoneNotice: true
      },
      clearHomeGuideHighlight,
      documentLike,
      storageLike: { getItem: vi.fn() },
      seenKey: "home_guide_seen_v1",
      syncHomeGuideSettingsUI,
      showHomeGuideDoneNotice
    });

    expect(result).toEqual({
      didFinish: true,
      markedSeen: true,
      syncedSettings: true,
      showedDoneNotice: true
    });

    expect(clearHomeGuideHighlight).toHaveBeenCalledTimes(1);
    expect(markHomeGuideSeen).toHaveBeenCalledWith({
      storageLike: expect.any(Object),
      seenKey: "home_guide_seen_v1"
    });
    expect(syncHomeGuideSettingsUI).toHaveBeenCalledTimes(1);
    expect(showHomeGuideDoneNotice).toHaveBeenCalledTimes(1);

    expect(homeGuideState.active).toBe(false);
    expect(homeGuideState.fromSettings).toBe(false);
    expect(homeGuideState.index).toBe(0);
    expect(homeGuideState.steps).toEqual([]);
    expect(
      ((homeGuideState.overlay as Record<string, unknown>).style as Record<string, unknown>).display
    ).toBe("none");
    expect(
      ((homeGuideState.panel as Record<string, unknown>).style as Record<string, unknown>).display
    ).toBe("none");
    expect(documentLike.body.className).toBe("");
  });

  it("returns noop when required runtime functions are missing", () => {
    expect(applyHomeGuideFinish({})).toEqual({
      didFinish: false,
      markedSeen: false,
      syncedSettings: false,
      showedDoneNotice: false
    });
  });

  it("resolves localStorage from context and delegates finish action", () => {
    const markHomeGuideSeen = vi.fn();
    const storageLike = { getItem: vi.fn() };
    const result = applyHomeGuideFinishFromContext({
      homeGuideRuntime: {
        resolveHomeGuideLifecycleState() {
          return { next: "finish" };
        },
        resolveHomeGuideSessionState() {
          return {
            active: false,
            fromSettings: false,
            index: 0,
            steps: []
          };
        },
        resolveHomeGuideLayerDisplayState() {
          return {
            overlayDisplay: "none",
            panelDisplay: "none"
          };
        },
        markHomeGuideSeen
      },
      homeGuideState: {
        active: true,
        fromSettings: true,
        index: 2,
        steps: [{ id: 1 }],
        overlay: { style: { display: "flex" } },
        panel: { style: { display: "block" } }
      },
      markSeen: true,
      storageRuntime: {
        resolveStorageByName(payload: { storageName?: string }) {
          return payload.storageName === "localStorage" ? storageLike : null;
        }
      },
      windowLike: { localStorage: storageLike },
      seenKey: "home_guide_seen_v1"
    });

    expect(result.didInvokeFinish).toBe(true);
    expect(result.localStorageResolved).toBe(true);
    expect(result.finishResult.markedSeen).toBe(true);
    expect(markHomeGuideSeen).toHaveBeenCalledWith({
      storageLike,
      seenKey: "home_guide_seen_v1"
    });
  });
});

import { describe, expect, it, vi } from "vitest";

import { applyHomeGuideControls } from "../../src/bootstrap/home-guide-controls-host";

function createButton(bound = false) {
  const handlers: Record<string, () => void> = {};
  return {
    __homeGuideBound: bound,
    handlers,
    addEventListener(name: string, handler: () => void) {
      handlers[name] = handler;
    }
  };
}

describe("bootstrap home guide controls host", () => {
  it("binds prev/next/skip controls and dispatches guide actions", () => {
    const prevBtn = createButton();
    const nextBtn = createButton();
    const skipBtn = createButton();
    const homeGuideState = { index: 2 };
    const showHomeGuideStep = vi.fn((nextStepIndex: number) => {
      homeGuideState.index = nextStepIndex;
    });
    const finishHomeGuide = vi.fn();
    const syncHomeGuideSettingsUI = vi.fn();

    const result = applyHomeGuideControls({
      documentLike: {
        getElementById(id: string) {
          if (id === "home-guide-prev") return prevBtn;
          if (id === "home-guide-next") return nextBtn;
          if (id === "home-guide-skip") return skipBtn;
          return null;
        }
      },
      homeGuideRuntime: {
        resolveHomeGuideBindingState(payload: { alreadyBound: boolean }) {
          return {
            shouldBind: !payload.alreadyBound,
            boundValue: true
          };
        },
        resolveHomeGuideControlAction(payload: { action: string }) {
          if (payload.action === "prev") {
            return { nextStepIndex: 1 };
          }
          if (payload.action === "next") {
            return { nextStepIndex: 2 };
          }
          return {
            nextStepIndex: 2,
            finishReason: "skipped"
          };
        },
        resolveHomeGuideFinishState(payload: { reason: string }) {
          return {
            markSeen: payload.reason === "skipped",
            showDoneNotice: true
          };
        }
      },
      homeGuideState,
      showHomeGuideStep,
      finishHomeGuide,
      syncHomeGuideSettingsUI
    });

    expect(result).toEqual({
      didBindControls: true,
      boundControlCount: 3,
      didKickoff: true,
      didSyncSettings: true
    });
    expect(prevBtn.__homeGuideBound).toBe(true);
    expect(nextBtn.__homeGuideBound).toBe(true);
    expect(skipBtn.__homeGuideBound).toBe(true);

    expect(showHomeGuideStep).toHaveBeenNthCalledWith(1, 0);
    prevBtn.handlers.click();
    expect(showHomeGuideStep).toHaveBeenNthCalledWith(2, 1);
    nextBtn.handlers.click();
    expect(showHomeGuideStep).toHaveBeenNthCalledWith(3, 2);

    skipBtn.handlers.click();
    expect(finishHomeGuide).toHaveBeenCalledWith(true, { showDoneNotice: true });
    expect(syncHomeGuideSettingsUI).toHaveBeenCalledTimes(1);
  });

  it("skips rebinding for controls already marked as bound", () => {
    const prevBtn = createButton(true);
    const nextBtn = createButton(true);
    const skipBtn = createButton(true);
    const showHomeGuideStep = vi.fn();

    const result = applyHomeGuideControls({
      documentLike: {
        getElementById(id: string) {
          if (id === "home-guide-prev") return prevBtn;
          if (id === "home-guide-next") return nextBtn;
          if (id === "home-guide-skip") return skipBtn;
          return null;
        }
      },
      homeGuideRuntime: {
        resolveHomeGuideBindingState(payload: { alreadyBound: boolean }) {
          return {
            shouldBind: !payload.alreadyBound,
            boundValue: true
          };
        },
        resolveHomeGuideControlAction() {
          return { nextStepIndex: 0 };
        },
        resolveHomeGuideFinishState() {
          return {
            markSeen: false,
            showDoneNotice: false
          };
        }
      },
      homeGuideState: { index: 0 },
      showHomeGuideStep,
      finishHomeGuide: vi.fn()
    });

    expect(result).toEqual({
      didBindControls: false,
      boundControlCount: 0,
      didKickoff: true,
      didSyncSettings: false
    });
    expect(showHomeGuideStep).toHaveBeenCalledWith(0);
    expect(prevBtn.handlers.click).toBeUndefined();
    expect(nextBtn.handlers.click).toBeUndefined();
    expect(skipBtn.handlers.click).toBeUndefined();
  });

  it("returns noop when showHomeGuideStep is missing", () => {
    expect(applyHomeGuideControls({})).toEqual({
      didBindControls: false,
      boundControlCount: 0,
      didKickoff: false,
      didSyncSettings: false
    });
  });
});

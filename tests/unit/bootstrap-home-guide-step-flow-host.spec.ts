import { describe, expect, it, vi } from "vitest";

import { applyHomeGuideStepFlow } from "../../src/bootstrap/home-guide-step-flow-host";

describe("bootstrap home guide step flow host", () => {
  it("finishes guide when step index state requests completion", () => {
    const finishHomeGuide = vi.fn();

    const result = applyHomeGuideStepFlow({
      index: 9,
      homeGuideRuntime: {
        resolveHomeGuideStepIndexState() {
          return {
            shouldAbort: false,
            shouldFinish: true,
            resolvedIndex: 9
          };
        },
        resolveHomeGuideFinishState() {
          return {
            markSeen: true,
            showDoneNotice: true
          };
        },
        resolveHomeGuideStepTargetState() {
          return {};
        },
        resolveHomeGuideTargetScrollState() {
          return {};
        }
      },
      homeGuideState: {
        active: true,
        steps: [{ selector: "#a" }]
      },
      finishHomeGuide
    });

    expect(result).toEqual({
      shouldAbort: false,
      didFinish: true,
      shouldAdvance: false,
      nextIndex: 0,
      shouldRender: false,
      stepIndex: 9,
      step: null
    });
    expect(finishHomeGuide).toHaveBeenCalledWith(true, { showDoneNotice: true });
  });

  it("advances when target is missing or invisible", () => {
    const clearHomeGuideHighlight = vi.fn();

    const result = applyHomeGuideStepFlow({
      index: 0,
      documentLike: {
        querySelector() {
          return null;
        }
      },
      homeGuideRuntime: {
        resolveHomeGuideStepIndexState() {
          return {
            shouldAbort: false,
            shouldFinish: false,
            resolvedIndex: 0
          };
        },
        resolveHomeGuideFinishState() {
          return {
            markSeen: false,
            showDoneNotice: false
          };
        },
        resolveHomeGuideStepTargetState() {
          return {
            shouldAdvance: true,
            nextIndex: 1
          };
        },
        resolveHomeGuideTargetScrollState() {
          return {};
        }
      },
      homeGuideState: {
        active: true,
        steps: [{ selector: "#missing" }]
      },
      isElementVisibleForGuide() {
        return false;
      },
      clearHomeGuideHighlight
    });

    expect(result).toEqual({
      shouldAbort: false,
      didFinish: false,
      shouldAdvance: true,
      nextIndex: 1,
      shouldRender: false,
      stepIndex: 0,
      step: { selector: "#missing" }
    });
    expect(clearHomeGuideHighlight).toHaveBeenCalledTimes(1);
  });

  it("prepares render path and applies target scroll/highlight", () => {
    const scrollIntoView = vi.fn();
    const addClass = vi.fn();
    const target = {
      scrollIntoView,
      classList: {
        add: addClass
      }
    };
    const elevateHomeGuideTarget = vi.fn();
    const clearHomeGuideHighlight = vi.fn();
    const homeGuideState: Record<string, unknown> = {
      active: true,
      steps: [{ selector: "#x", title: "x", desc: "y" }],
      index: 0,
      target: null
    };

    const result = applyHomeGuideStepFlow({
      index: 0,
      documentLike: {
        querySelector(selector: string) {
          return selector === "#x" ? target : null;
        }
      },
      windowLike: {},
      homeGuideRuntime: {
        resolveHomeGuideStepIndexState() {
          return {
            shouldAbort: false,
            shouldFinish: false,
            resolvedIndex: 0
          };
        },
        resolveHomeGuideFinishState() {
          return {};
        },
        resolveHomeGuideStepTargetState() {
          return {
            shouldAdvance: false,
            nextIndex: 0
          };
        },
        resolveHomeGuideTargetScrollState() {
          return {
            shouldScroll: true,
            block: "center",
            inline: "nearest",
            behavior: "smooth"
          };
        }
      },
      mobileViewportRuntime: {
        isViewportAtMost() {
          return true;
        }
      },
      homeGuideState,
      mobileUiMaxWidth: 900,
      isElementVisibleForGuide() {
        return true;
      },
      clearHomeGuideHighlight,
      elevateHomeGuideTarget
    });

    expect(result).toEqual({
      shouldAbort: false,
      didFinish: false,
      shouldAdvance: false,
      nextIndex: 0,
      shouldRender: true,
      stepIndex: 0,
      step: { selector: "#x", title: "x", desc: "y" }
    });
    expect(homeGuideState.target).toBe(target);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    });
    expect(addClass).toHaveBeenCalledWith("home-guide-highlight");
    expect(clearHomeGuideHighlight).toHaveBeenCalledTimes(1);
    expect(elevateHomeGuideTarget).toHaveBeenCalledWith(target);
  });

  it("returns abort result when required runtime resolvers are missing", () => {
    expect(
      applyHomeGuideStepFlow({
        homeGuideRuntime: {}
      })
    ).toEqual({
      shouldAbort: true,
      didFinish: false,
      shouldAdvance: false,
      nextIndex: 0,
      shouldRender: false,
      stepIndex: 0,
      step: null
    });
  });
});

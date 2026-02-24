import { describe, expect, it } from "vitest";

import {
  buildHomeGuidePanelInnerHtml,
  buildHomeGuideSettingsRowInnerHtml,
  buildHomeGuideSteps,
  isHomeGuideTargetVisible,
  isHomePagePath,
  markHomeGuideSeen,
  readHomeGuideSeenValue,
  resolveHomeGuidePanelLayout,
  resolveHomeGuideAutoStart,
  resolveHomeGuideDoneNotice,
  resolveHomeGuideDoneNoticeStyle,
  resolveHomeGuideControlAction,
  resolveHomeGuideElevationPlan,
  resolveHomeGuideBindingState,
  resolveHomeGuideStepRenderState,
  resolveHomeGuideLayerDisplayState,
  resolveHomeGuideLifecycleState,
  resolveHomeGuideSessionState,
  resolveHomeGuideFinishState,
  resolveHomeGuideStepIndexState,
  resolveHomeGuideStepTargetState,
  resolveHomeGuideToggleAction,
  resolveHomeGuideTargetScrollState,
  resolveHomeGuideStepUiState,
  resolveHomeGuideSettingsState,
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

  it("builds panel and settings row html templates", () => {
    const panelHtml = buildHomeGuidePanelInnerHtml();
    const settingsHtml = buildHomeGuideSettingsRowInnerHtml();
    expect(panelHtml).toContain("id='home-guide-step'");
    expect(panelHtml).toContain("id='home-guide-next'");
    expect(panelHtml).toContain("id='home-guide-skip'");
    expect(settingsHtml).toContain("id='home-guide-toggle'");
    expect(settingsHtml).toContain("id='home-guide-note'");
  });

  it("reads seen marker from storage safely", () => {
    expect(
      readHomeGuideSeenValue({
        storageLike: {
          getItem(key: string) {
            return key === "home_guide_seen_v1" ? "1" : null;
          }
        }
      })
    ).toBe("1");
    expect(
      readHomeGuideSeenValue({
        storageLike: {
          getItem() {
            return "0";
          }
        }
      })
    ).toBe("0");
    expect(readHomeGuideSeenValue({ storageLike: null })).toBe("0");
  });

  it("marks seen marker through storage safely", () => {
    const writes: Array<{ key: string; value: string }> = [];
    expect(
      markHomeGuideSeen({
        storageLike: {
          getItem() {
            return null;
          },
          setItem(key: string, value: string) {
            writes.push({ key, value });
          }
        }
      })
    ).toBe(true);
    expect(writes).toEqual([{ key: "home_guide_seen_v1", value: "1" }]);
    expect(markHomeGuideSeen({ storageLike: null })).toBe(false);
  });

  it("resolves auto-start state by combining seen read and pathname gate", () => {
    expect(
      resolveHomeGuideAutoStart({
        pathname: "/index.html",
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem() {
            return null;
          }
        }
      })
    ).toEqual({
      seenValue: "0",
      shouldAutoStart: true
    });

    expect(
      resolveHomeGuideAutoStart({
        pathname: "/play.html",
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem() {
            return "1";
          }
        }
      })
    ).toEqual({
      seenValue: "1",
      shouldAutoStart: false
    });
  });

  it("resolves home-guide settings ui state", () => {
    expect(
      resolveHomeGuideSettingsState({
        isHomePage: true,
        guideActive: true,
        fromSettings: true
      })
    ).toEqual({
      toggleDisabled: false,
      toggleChecked: true,
      noteText: "打开后将立即进入首页新手引导，完成后自动关闭。"
    });

    expect(
      resolveHomeGuideSettingsState({
        isHomePage: false,
        guideActive: true,
        fromSettings: true
      })
    ).toEqual({
      toggleDisabled: true,
      toggleChecked: false,
      noteText: "该功能仅在首页可用。"
    });
  });

  it("resolves panel layout for mobile viewport", () => {
    expect(
      resolveHomeGuidePanelLayout({
        targetRect: {
          left: 100,
          top: 100,
          width: 80,
          height: 30,
          bottom: 130
        },
        viewportWidth: 360,
        viewportHeight: 640,
        panelHeight: 180,
        margin: 12,
        mobileLayout: true
      })
    ).toEqual({
      panelWidth: 336,
      top: 448,
      left: 12
    });
  });

  it("resolves panel layout for desktop viewport with overflow fallback", () => {
    expect(
      resolveHomeGuidePanelLayout({
        targetRect: {
          left: 1000,
          top: 600,
          width: 100,
          height: 40,
          bottom: 650
        },
        viewportWidth: 1200,
        viewportHeight: 700,
        panelHeight: 160,
        margin: 12,
        mobileLayout: false
      })
    ).toEqual({
      panelWidth: 430,
      top: 428,
      left: 758
    });
  });

  it("resolves step ui state model for first and last steps", () => {
    expect(
      resolveHomeGuideStepUiState({
        stepIndex: 0,
        stepCount: 10
      })
    ).toEqual({
      stepText: "步骤 1 / 10",
      prevDisabled: true,
      nextText: "下一步"
    });

    expect(
      resolveHomeGuideStepUiState({
        stepIndex: 9,
        stepCount: 10
      })
    ).toEqual({
      stepText: "步骤 10 / 10",
      prevDisabled: false,
      nextText: "完成"
    });
  });

  it("resolves step render state from step and ui model", () => {
    expect(
      resolveHomeGuideStepRenderState({
        step: {
          selector: "#a",
          title: "标题",
          desc: "描述"
        },
        stepIndex: 0,
        stepCount: 2
      })
    ).toEqual({
      stepText: "步骤 1 / 2",
      titleText: "标题",
      descText: "描述",
      prevDisabled: true,
      nextText: "下一步"
    });
  });

  it("resolves step index state for abort, continue and finish", () => {
    expect(
      resolveHomeGuideStepIndexState({
        isActive: false,
        stepCount: 5,
        stepIndex: 0
      })
    ).toEqual({
      shouldAbort: true,
      shouldFinish: false,
      resolvedIndex: 0
    });
    expect(
      resolveHomeGuideStepIndexState({
        isActive: true,
        stepCount: 5,
        stepIndex: -2
      })
    ).toEqual({
      shouldAbort: false,
      shouldFinish: false,
      resolvedIndex: 0
    });
    expect(
      resolveHomeGuideStepIndexState({
        isActive: true,
        stepCount: 5,
        stepIndex: 5
      })
    ).toEqual({
      shouldAbort: false,
      shouldFinish: true,
      resolvedIndex: 5
    });
  });

  it("resolves target state for visible and skipped targets", () => {
    expect(
      resolveHomeGuideStepTargetState({
        hasTarget: true,
        targetVisible: true,
        stepIndex: 2
      })
    ).toEqual({
      shouldAdvance: false,
      nextIndex: 2
    });
    expect(
      resolveHomeGuideStepTargetState({
        hasTarget: false,
        targetVisible: false,
        stepIndex: 2
      })
    ).toEqual({
      shouldAdvance: true,
      nextIndex: 3
    });
  });

  it("resolves elevation plan for top-actions/heading/none", () => {
    expect(
      resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: true,
        hasHeadingAncestor: true
      })
    ).toEqual({
      hostSelector: ".top-action-buttons",
      shouldScopeTopActions: true
    });
    expect(
      resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: false,
        hasHeadingAncestor: true
      })
    ).toEqual({
      hostSelector: ".heading",
      shouldScopeTopActions: false
    });
    expect(
      resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: false,
        hasHeadingAncestor: false
      })
    ).toEqual({
      hostSelector: "",
      shouldScopeTopActions: false
    });
  });

  it("resolves binding state for bound and unbound nodes", () => {
    expect(
      resolveHomeGuideBindingState({
        alreadyBound: false
      })
    ).toEqual({
      shouldBind: true,
      boundValue: true
    });
    expect(
      resolveHomeGuideBindingState({
        alreadyBound: true
      })
    ).toEqual({
      shouldBind: false,
      boundValue: true
    });
  });

  it("resolves control action for prev/next/skip", () => {
    expect(
      resolveHomeGuideControlAction({
        action: "prev",
        stepIndex: 3
      })
    ).toEqual({
      type: "step",
      nextStepIndex: 2,
      finishReason: ""
    });
    expect(
      resolveHomeGuideControlAction({
        action: "next",
        stepIndex: 3
      })
    ).toEqual({
      type: "step",
      nextStepIndex: 4,
      finishReason: ""
    });
    expect(
      resolveHomeGuideControlAction({
        action: "skip",
        stepIndex: 3
      })
    ).toEqual({
      type: "finish",
      nextStepIndex: 3,
      finishReason: "skipped"
    });
  });

  it("resolves toggle action for unchecked/non-home/home", () => {
    expect(
      resolveHomeGuideToggleAction({
        checked: false,
        isHomePage: true
      })
    ).toEqual({
      shouldStartGuide: false,
      shouldCloseSettings: false,
      shouldResync: false,
      startFromSettings: false
    });
    expect(
      resolveHomeGuideToggleAction({
        checked: true,
        isHomePage: false
      })
    ).toEqual({
      shouldStartGuide: false,
      shouldCloseSettings: false,
      shouldResync: true,
      startFromSettings: false
    });
    expect(
      resolveHomeGuideToggleAction({
        checked: true,
        isHomePage: true
      })
    ).toEqual({
      shouldStartGuide: true,
      shouldCloseSettings: true,
      shouldResync: false,
      startFromSettings: true
    });
  });

  it("resolves lifecycle state for start and finish", () => {
    const startState = resolveHomeGuideLifecycleState({
      action: "start",
      fromSettings: true,
      steps: [
        {
          selector: "#a",
          title: "t",
          desc: "d"
        }
      ]
    });
    expect(startState).toEqual({
      active: true,
      fromSettings: true,
      index: 0,
      steps: [
        {
          selector: "#a",
          title: "t",
          desc: "d"
        }
      ]
    });
    expect(
      resolveHomeGuideLifecycleState({
        action: "finish",
        fromSettings: true,
        steps: [
          {
            selector: "#a",
            title: "t",
            desc: "d"
          }
        ]
      })
    ).toEqual({
      active: false,
      fromSettings: false,
      index: 0,
      steps: []
    });
  });

  it("resolves session state snapshot from lifecycle output", () => {
    expect(
      resolveHomeGuideSessionState({
        lifecycleState: {
          active: true,
          fromSettings: true,
          index: 2.8,
          steps: [
            {
              selector: "#a",
              title: "t",
              desc: "d"
            }
          ]
        }
      })
    ).toEqual({
      active: true,
      fromSettings: true,
      index: 2,
      steps: [
        {
          selector: "#a",
          title: "t",
          desc: "d"
        }
      ]
    });

    expect(
      resolveHomeGuideSessionState({
        lifecycleState: null
      })
    ).toEqual({
      active: false,
      fromSettings: false,
      index: 0,
      steps: []
    });
  });

  it("resolves layer display state for active and inactive", () => {
    expect(
      resolveHomeGuideLayerDisplayState({
        active: true
      })
    ).toEqual({
      overlayDisplay: "block",
      panelDisplay: "block"
    });
    expect(
      resolveHomeGuideLayerDisplayState({
        active: false
      })
    ).toEqual({
      overlayDisplay: "none",
      panelDisplay: "none"
    });
  });

  it("resolves finish state for completed and skipped flows", () => {
    expect(
      resolveHomeGuideFinishState({
        reason: "completed"
      })
    ).toEqual({
      markSeen: true,
      showDoneNotice: true
    });
    expect(
      resolveHomeGuideFinishState({
        reason: "skipped"
      })
    ).toEqual({
      markSeen: true,
      showDoneNotice: false
    });
  });

  it("resolves target scroll state for compact and desktop viewport", () => {
    expect(
      resolveHomeGuideTargetScrollState({
        isCompactViewport: true,
        canScrollIntoView: true
      })
    ).toEqual({
      shouldScroll: true,
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    });
    expect(
      resolveHomeGuideTargetScrollState({
        isCompactViewport: false,
        canScrollIntoView: true
      })
    ).toEqual({
      shouldScroll: false,
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    });
  });

  it("resolves done notice defaults and custom hide delay", () => {
    expect(resolveHomeGuideDoneNotice({})).toEqual({
      message: "指引已完成，可在设置中重新打开新手指引。",
      hideDelayMs: 2600
    });
    expect(
      resolveHomeGuideDoneNotice({
        message: "  完成啦  ",
        hideDelayMs: 1800
      })
    ).toEqual({
      message: "完成啦",
      hideDelayMs: 1800
    });
  });

  it("resolves done notice style model", () => {
    expect(resolveHomeGuideDoneNoticeStyle()).toMatchObject({
      position: "fixed",
      left: "50%",
      bottom: "26px",
      color: "#f9f6f2",
      zIndex: "3400"
    });
  });

  it("accepts visible guide target node", () => {
    expect(
      isHomeGuideTargetVisible({
        nodeLike: {
          getClientRects() {
            return [{ left: 0 }];
          }
        },
        getComputedStyle() {
          return {
            display: "block",
            visibility: "visible",
            opacity: "1"
          };
        }
      })
    ).toBe(true);
  });

  it("rejects hidden guide target node", () => {
    expect(
      isHomeGuideTargetVisible({
        nodeLike: {
          getClientRects() {
            return [{ left: 0 }];
          }
        },
        getComputedStyle() {
          return {
            display: "none",
            visibility: "visible",
            opacity: "1"
          };
        }
      })
    ).toBe(false);

    expect(
      isHomeGuideTargetVisible({
        nodeLike: {
          getClientRects() {
            return [];
          }
        },
        getComputedStyle() {
          return {
            display: "block",
            visibility: "visible",
            opacity: "1"
          };
        }
      })
    ).toBe(false);
  });
});

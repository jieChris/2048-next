import { expect, test } from "@playwright/test";
import { waitForWindowCondition } from "./support/runtime-ready";

test.describe("Legacy Multi-Page Smoke", () => {
  test("home guide runtime provides homepage auto-start gating", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => {
      const runtime = (window as any).CoreHomeGuideRuntime;
      return (
        !!runtime &&
        typeof runtime.resolveHomeGuidePathname === "function" &&
        typeof runtime.buildHomeGuideSteps === "function" &&
        typeof runtime.buildHomeGuidePanelInnerHtml === "function" &&
        typeof runtime.buildHomeGuideSettingsRowInnerHtml === "function"
      );
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreHomeGuideRuntime;
      if (
        !runtime ||
        typeof runtime.resolveHomeGuidePathname !== "function" ||
        typeof runtime.isHomePagePath !== "function" ||
        typeof runtime.buildHomeGuideSteps !== "function" ||
        typeof runtime.buildHomeGuidePanelInnerHtml !== "function" ||
        typeof runtime.buildHomeGuideSettingsRowInnerHtml !== "function" ||
        typeof runtime.readHomeGuideSeenValue !== "function" ||
        typeof runtime.markHomeGuideSeen !== "function" ||
        typeof runtime.shouldAutoStartHomeGuide !== "function" ||
        typeof runtime.resolveHomeGuideAutoStart !== "function" ||
        typeof runtime.resolveHomeGuideSettingsState !== "function" ||
        typeof runtime.resolveHomeGuideStepUiState !== "function" ||
        typeof runtime.resolveHomeGuideStepRenderState !== "function" ||
        typeof runtime.resolveHomeGuideStepIndexState !== "function" ||
        typeof runtime.resolveHomeGuideStepTargetState !== "function" ||
        typeof runtime.resolveHomeGuideElevationPlan !== "function" ||
        typeof runtime.resolveHomeGuideBindingState !== "function" ||
        typeof runtime.resolveHomeGuideControlAction !== "function" ||
        typeof runtime.resolveHomeGuideToggleAction !== "function" ||
        typeof runtime.resolveHomeGuideLifecycleState !== "function" ||
        typeof runtime.resolveHomeGuideSessionState !== "function" ||
        typeof runtime.resolveHomeGuideLayerDisplayState !== "function" ||
        typeof runtime.resolveHomeGuideFinishState !== "function" ||
        typeof runtime.resolveHomeGuideTargetScrollState !== "function" ||
        typeof runtime.resolveHomeGuideDoneNotice !== "function" ||
        typeof runtime.resolveHomeGuideDoneNoticeStyle !== "function" ||
        typeof runtime.resolveHomeGuidePanelLayout !== "function" ||
        typeof runtime.isHomeGuideTargetVisible !== "function"
      ) {
        return { hasRuntime: false };
      }
      const compactSteps = runtime.buildHomeGuideSteps({ isCompactViewport: true });
      const desktopSteps = runtime.buildHomeGuideSteps({ isCompactViewport: false });
      const resolvedPath = runtime.resolveHomeGuidePathname({
        locationLike: { pathname: "/index.html" }
      });
      const resolvedPathFallback = runtime.resolveHomeGuidePathname({
        locationLike: {
          get pathname() {
            throw new Error("deny");
          }
        }
      });
      const panelHtml = runtime.buildHomeGuidePanelInnerHtml();
      const settingsRowHtml = runtime.buildHomeGuideSettingsRowInnerHtml();
      const compactSelectors = Array.isArray(compactSteps)
        ? compactSteps.map((item: any) => item && item.selector)
        : [];
      const desktopSelectors = Array.isArray(desktopSteps)
        ? desktopSteps.map((item: any) => item && item.selector)
        : [];
      const writes: string[] = [];
      const seenValue = runtime.readHomeGuideSeenValue({
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem(key: string) {
            return key === "home_guide_seen_v1" ? "1" : null;
          }
        }
      });
      const markResult = runtime.markHomeGuideSeen({
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem() {
            return null;
          },
          setItem(key: string, value: string) {
            writes.push(key + ":" + value);
          }
        }
      });
      const resolvedAutoStart = runtime.resolveHomeGuideAutoStart({
        pathname: "/index.html",
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem() {
            return null;
          }
        }
      });
      const settingsOnHome = runtime.resolveHomeGuideSettingsState({
        isHomePage: true,
        guideActive: true,
        fromSettings: true
      });
      const settingsOffHome = runtime.resolveHomeGuideSettingsState({
        isHomePage: false,
        guideActive: true,
        fromSettings: true
      });
      const stepUiStateFirst = runtime.resolveHomeGuideStepUiState({
        stepIndex: 0,
        stepCount: 10
      });
      const stepUiStateLast = runtime.resolveHomeGuideStepUiState({
        stepIndex: 9,
        stepCount: 10
      });
      const stepRenderState = runtime.resolveHomeGuideStepRenderState({
        step: {
          selector: "#top-settings-btn",
          title: "设置",
          desc: "desc"
        },
        stepIndex: 0,
        stepCount: 2
      });
      const stepIndexAbort = runtime.resolveHomeGuideStepIndexState({
        isActive: false,
        stepCount: 10,
        stepIndex: 0
      });
      const stepIndexFinish = runtime.resolveHomeGuideStepIndexState({
        isActive: true,
        stepCount: 10,
        stepIndex: 10
      });
      const stepTargetMissing = runtime.resolveHomeGuideStepTargetState({
        hasTarget: false,
        targetVisible: false,
        stepIndex: 2
      });
      const stepTargetKeep = runtime.resolveHomeGuideStepTargetState({
        hasTarget: true,
        targetVisible: true,
        stepIndex: 2
      });
      const stepTargetHidden = runtime.resolveHomeGuideStepTargetState({
        hasTarget: true,
        targetVisible: false,
        stepIndex: 2
      });
      const elevationTop = runtime.resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: true,
        hasHeadingAncestor: true
      });
      const elevationHeading = runtime.resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: false,
        hasHeadingAncestor: true
      });
      const elevationNone = runtime.resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: false,
        hasHeadingAncestor: false
      });
      const bindingStateNew = runtime.resolveHomeGuideBindingState({
        alreadyBound: false
      });
      const bindingStateBound = runtime.resolveHomeGuideBindingState({
        alreadyBound: true
      });
      const controlPrev = runtime.resolveHomeGuideControlAction({
        action: "prev",
        stepIndex: 3
      });
      const controlNext = runtime.resolveHomeGuideControlAction({
        action: "next",
        stepIndex: 3
      });
      const controlSkip = runtime.resolveHomeGuideControlAction({
        action: "skip",
        stepIndex: 3
      });
      const toggleUnchecked = runtime.resolveHomeGuideToggleAction({
        checked: false,
        isHomePage: true
      });
      const toggleOffHome = runtime.resolveHomeGuideToggleAction({
        checked: true,
        isHomePage: false
      });
      const toggleOnHome = runtime.resolveHomeGuideToggleAction({
        checked: true,
        isHomePage: true
      });
      const lifecycleStart = runtime.resolveHomeGuideLifecycleState({
        action: "start",
        fromSettings: true,
        steps: [
          {
            selector: "#top-settings-btn",
            title: "设置",
            desc: "desc"
          }
        ]
      });
      const lifecycleFinish = runtime.resolveHomeGuideLifecycleState({
        action: "finish",
        fromSettings: true,
        steps: [
          {
            selector: "#top-settings-btn",
            title: "设置",
            desc: "desc"
          }
        ]
      });
      const sessionState = runtime.resolveHomeGuideSessionState({
        lifecycleState: {
          active: true,
          fromSettings: true,
          index: 2.8,
          steps: [
            {
              selector: "#top-settings-btn",
              title: "设置",
              desc: "desc"
            }
          ]
        }
      });
      const sessionStateDefault = runtime.resolveHomeGuideSessionState({
        lifecycleState: null
      });
      const layerDisplayActive = runtime.resolveHomeGuideLayerDisplayState({
        active: true
      });
      const layerDisplayInactive = runtime.resolveHomeGuideLayerDisplayState({
        active: false
      });
      const finishStateCompleted = runtime.resolveHomeGuideFinishState({
        reason: "completed"
      });
      const finishStateSkipped = runtime.resolveHomeGuideFinishState({
        reason: "skipped"
      });
      const targetScrollStateCompact = runtime.resolveHomeGuideTargetScrollState({
        isCompactViewport: true,
        canScrollIntoView: true
      });
      const targetScrollStateDesktop = runtime.resolveHomeGuideTargetScrollState({
        isCompactViewport: false,
        canScrollIntoView: true
      });
      const doneNotice = runtime.resolveHomeGuideDoneNotice({});
      const doneNoticeStyle = runtime.resolveHomeGuideDoneNoticeStyle();
      const visibleCheck = runtime.isHomeGuideTargetVisible({
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
      });
      const mobilePanelLayout = runtime.resolveHomeGuidePanelLayout({
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
      });
      return {
        hasRuntime: true,
        panelHasStep: typeof panelHtml === "string" && panelHtml.indexOf("home-guide-step") !== -1,
        panelHasSkip: typeof panelHtml === "string" && panelHtml.indexOf("home-guide-skip") !== -1,
        settingsHasTrigger:
          typeof settingsRowHtml === "string" &&
          settingsRowHtml.indexOf("home-guide-trigger-btn") !== -1,
        homePath: runtime.isHomePagePath("/index.html"),
        playPath: runtime.isHomePagePath("/play.html"),
        hasCompactHint: compactSelectors.includes("#top-mobile-hint-btn"),
        hasCompactTimerToggle: compactSelectors.includes("#timerbox-toggle-btn"),
        hasDesktopHint: desktopSelectors.includes("#top-mobile-hint-btn"),
        hasDesktopTimerToggle: desktopSelectors.includes("#timerbox-toggle-btn"),
        resolvedPath,
        resolvedPathFallback,
        seenValue,
        markResult,
        writes,
        autoStart: runtime.shouldAutoStartHomeGuide({
          pathname: "/index.html",
          seenValue: "0"
        }),
        blockedSeen: runtime.shouldAutoStartHomeGuide({
          pathname: "/index.html",
          seenValue: "1"
        }),
        blockedPath: runtime.shouldAutoStartHomeGuide({
          pathname: "/play.html",
          seenValue: "0"
        }),
        stepUiStateFirst,
        stepUiStateLast,
        stepRenderState,
        stepIndexAbort,
        stepIndexFinish,
        stepTargetMissing,
        stepTargetKeep,
        stepTargetHidden,
        elevationTop,
        elevationHeading,
        elevationNone,
        bindingStateNew,
        bindingStateBound,
        controlPrev,
        controlNext,
        controlSkip,
        toggleUnchecked,
        toggleOffHome,
        toggleOnHome,
        lifecycleStart,
        lifecycleFinish,
        sessionState,
        sessionStateDefault,
        layerDisplayActive,
        layerDisplayInactive,
        finishStateCompleted,
        finishStateSkipped,
        targetScrollStateCompact,
        targetScrollStateDesktop,
        doneNotice,
        doneNoticeStyle,
        visibleCheck,
        resolvedAutoStart,
        mobilePanelLayout,
        settingsOnHome,
        settingsOffHome
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.panelHasStep).toBe(true);
    expect(snapshot.panelHasSkip).toBe(true);
    expect(snapshot.settingsHasTrigger).toBe(true);
    expect(snapshot.homePath).toBe(true);
    expect(snapshot.playPath).toBe(false);
    expect(snapshot.hasCompactHint).toBe(true);
    expect(snapshot.hasCompactTimerToggle).toBe(true);
    expect(snapshot.hasDesktopHint).toBe(false);
    expect(snapshot.hasDesktopTimerToggle).toBe(false);
    expect(snapshot.resolvedPath).toBe("/index.html");
    expect(snapshot.resolvedPathFallback).toBe("");
    expect(snapshot.seenValue).toBe("1");
    expect(snapshot.markResult).toBe(true);
    expect(snapshot.writes).toEqual(["home_guide_seen_v1:1"]);
    expect(snapshot.autoStart).toBe(true);
    expect(snapshot.blockedSeen).toBe(false);
    expect(snapshot.blockedPath).toBe(false);
    expect(snapshot.stepUiStateFirst).toEqual({
      stepText: "步骤 1 / 10",
      prevDisabled: true,
      nextText: "下一步"
    });
    expect(snapshot.stepUiStateLast).toEqual({
      stepText: "步骤 10 / 10",
      prevDisabled: false,
      nextText: "完成"
    });
    expect(snapshot.stepRenderState).toEqual({
      stepText: "步骤 1 / 2",
      titleText: "设置",
      descText: "desc",
      prevDisabled: true,
      nextText: "下一步"
    });
    expect(snapshot.stepIndexAbort).toEqual({
      shouldAbort: true,
      shouldFinish: false,
      resolvedIndex: 0
    });
    expect(snapshot.stepIndexFinish).toEqual({
      shouldAbort: false,
      shouldFinish: true,
      resolvedIndex: 10
    });
    expect(snapshot.stepTargetMissing).toEqual({
      shouldAdvance: false,
      nextIndex: 2
    });
    expect(snapshot.stepTargetKeep).toEqual({
      shouldAdvance: false,
      nextIndex: 2
    });
    expect(snapshot.stepTargetHidden).toEqual({
      shouldAdvance: true,
      nextIndex: 3
    });
    expect(snapshot.elevationTop).toEqual({
      hostSelector: ".top-action-buttons",
      shouldScopeTopActions: true
    });
    expect(snapshot.elevationHeading).toEqual({
      hostSelector: ".heading",
      shouldScopeTopActions: false
    });
    expect(snapshot.elevationNone).toEqual({
      hostSelector: "",
      shouldScopeTopActions: false
    });
    expect(snapshot.bindingStateNew).toEqual({
      shouldBind: true,
      boundValue: true
    });
    expect(snapshot.bindingStateBound).toEqual({
      shouldBind: false,
      boundValue: true
    });
    expect(snapshot.controlPrev).toEqual({
      type: "step",
      nextStepIndex: 2,
      finishReason: ""
    });
    expect(snapshot.controlNext).toEqual({
      type: "step",
      nextStepIndex: 4,
      finishReason: ""
    });
    expect(snapshot.controlSkip).toEqual({
      type: "finish",
      nextStepIndex: 3,
      finishReason: "skipped"
    });
    expect(snapshot.toggleUnchecked).toEqual({
      shouldStartGuide: false,
      shouldCloseSettings: false,
      shouldResync: false,
      startFromSettings: false
    });
    expect(snapshot.toggleOffHome).toEqual({
      shouldStartGuide: false,
      shouldCloseSettings: false,
      shouldResync: true,
      startFromSettings: false
    });
    expect(snapshot.toggleOnHome).toEqual({
      shouldStartGuide: true,
      shouldCloseSettings: true,
      shouldResync: false,
      startFromSettings: true
    });
    expect(snapshot.lifecycleStart).toEqual({
      active: true,
      fromSettings: true,
      index: 0,
      steps: [
        {
          selector: "#top-settings-btn",
          title: "设置",
          desc: "desc"
        }
      ]
    });
    expect(snapshot.lifecycleFinish).toEqual({
      active: false,
      fromSettings: false,
      index: 0,
      steps: []
    });
    expect(snapshot.sessionState).toEqual({
      active: true,
      fromSettings: true,
      index: 2,
      steps: [
        {
          selector: "#top-settings-btn",
          title: "设置",
          desc: "desc"
        }
      ]
    });
    expect(snapshot.sessionStateDefault).toEqual({
      active: false,
      fromSettings: false,
      index: 0,
      steps: []
    });
    expect(snapshot.layerDisplayActive).toEqual({
      overlayDisplay: "block",
      panelDisplay: "block"
    });
    expect(snapshot.layerDisplayInactive).toEqual({
      overlayDisplay: "none",
      panelDisplay: "none"
    });
    expect(snapshot.finishStateCompleted).toEqual({
      markSeen: true,
      showDoneNotice: true
    });
    expect(snapshot.finishStateSkipped).toEqual({
      markSeen: true,
      showDoneNotice: false
    });
    expect(snapshot.targetScrollStateCompact).toEqual({
      shouldScroll: true,
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    });
    expect(snapshot.targetScrollStateDesktop).toEqual({
      shouldScroll: false,
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    });
    expect(snapshot.doneNotice).toEqual({
      message: "指引已完成，可在设置中重新打开新手指引。",
      hideDelayMs: 2600
    });
    expect(snapshot.doneNoticeStyle).toMatchObject({
      position: "fixed",
      left: "50%",
      bottom: "26px",
      color: "#f9f6f2",
      zIndex: "3400"
    });
    expect(snapshot.visibleCheck).toBe(true);
    expect(snapshot.resolvedAutoStart).toEqual({
      seenValue: "0",
      shouldAutoStart: true
    });
    expect(snapshot.mobilePanelLayout).toEqual({
      panelWidth: 336,
      top: 448,
      left: 12
    });
    expect(snapshot.settingsOnHome).toEqual({
      toggleDisabled: false,
      toggleChecked: true,
      noteText: "打开后将立即进入首页新手引导，完成后自动关闭。"
    });
    expect(snapshot.settingsOffHome).toEqual({
      toggleDisabled: true,
      toggleChecked: false,
      noteText: "该功能仅在首页可用。"
    });
  });


});

import type { Page } from "@playwright/test";

import { waitForWindowCondition } from "./runtime-ready";

export async function waitForHomeGuidePageHostReady(page: Page): Promise<void> {
  await waitForWindowCondition(page, () => {
    const pageHostRuntime = (window as any).CoreHomeGuidePageHostRuntime;
    return (
      !!pageHostRuntime &&
      typeof pageHostRuntime.createHomeGuidePageResolvers === "function" &&
      !!(window as any).CoreHomeGuideRuntime &&
      !!(window as any).CoreHomeGuideDomHostRuntime &&
      !!(window as any).CoreHomeGuideHighlightHostRuntime &&
      !!(window as any).CoreHomeGuidePanelHostRuntime &&
      !!(window as any).CoreHomeGuideDoneNoticeHostRuntime &&
      !!(window as any).CoreHomeGuideFinishHostRuntime &&
      !!(window as any).CoreHomeGuideStepHostRuntime &&
      !!(window as any).CoreHomeGuideStepFlowHostRuntime &&
      !!(window as any).CoreHomeGuideStepViewHostRuntime &&
      !!(window as any).CoreHomeGuideStartHostRuntime &&
      !!(window as any).CoreHomeGuideControlsHostRuntime &&
      !!(window as any).CoreMobileViewportRuntime &&
      !!(window as any).CoreStorageRuntime
    );
  });
}

export async function startHomeGuideFromPageHost(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const pageHostRuntime = (window as any).CoreHomeGuidePageHostRuntime;
    const homeGuideRuntime = (window as any).CoreHomeGuideRuntime;
    const domHostRuntime = (window as any).CoreHomeGuideDomHostRuntime;
    const highlightHostRuntime = (window as any).CoreHomeGuideHighlightHostRuntime;
    const panelHostRuntime = (window as any).CoreHomeGuidePanelHostRuntime;
    const doneNoticeHostRuntime = (window as any).CoreHomeGuideDoneNoticeHostRuntime;
    const finishHostRuntime = (window as any).CoreHomeGuideFinishHostRuntime;
    const stepHostRuntime = (window as any).CoreHomeGuideStepHostRuntime;
    const stepFlowHostRuntime = (window as any).CoreHomeGuideStepFlowHostRuntime;
    const stepViewHostRuntime = (window as any).CoreHomeGuideStepViewHostRuntime;
    const startHostRuntime = (window as any).CoreHomeGuideStartHostRuntime;
    const controlsHostRuntime = (window as any).CoreHomeGuideControlsHostRuntime;
    const mobileViewportRuntime = (window as any).CoreMobileViewportRuntime;
    const storageRuntime = (window as any).CoreStorageRuntime;

    if (
      !pageHostRuntime ||
      typeof pageHostRuntime.createHomeGuidePageResolvers !== "function" ||
      !homeGuideRuntime ||
      !domHostRuntime ||
      !highlightHostRuntime ||
      !panelHostRuntime ||
      !doneNoticeHostRuntime ||
      !finishHostRuntime ||
      !stepHostRuntime ||
      !stepFlowHostRuntime ||
      !stepViewHostRuntime ||
      !startHostRuntime ||
      !controlsHostRuntime ||
      !mobileViewportRuntime ||
      !storageRuntime
    ) {
      return false;
    }

    const homeGuideState = {
      active: false,
      fromSettings: false,
      index: 0,
      steps: [],
      target: null,
      elevated: [],
      panel: null,
      overlay: null
    };

    const resolvers = pageHostRuntime.createHomeGuidePageResolvers({
      homeGuideRuntime,
      locationLike: window.location,
      isCompactViewport: () => window.innerWidth <= 760,
      homeGuideDomHostRuntime: domHostRuntime,
      homeGuideHighlightHostRuntime: highlightHostRuntime,
      homeGuidePanelHostRuntime: panelHostRuntime,
      homeGuideDoneNoticeHostRuntime: doneNoticeHostRuntime,
      mobileViewportRuntime,
      documentLike: document,
      windowLike: window,
      homeGuideState,
      mobileUiMaxWidth: 760,
      panelMargin: 12,
      defaultPanelHeight: 160,
      setTimeoutLike: window.setTimeout.bind(window),
      clearTimeoutLike: window.clearTimeout.bind(window),
      homeGuideFinishHostRuntime: finishHostRuntime,
      homeGuideStepHostRuntime: stepHostRuntime,
      homeGuideStepFlowHostRuntime: stepFlowHostRuntime,
      homeGuideStepViewHostRuntime: stepViewHostRuntime,
      homeGuideStartHostRuntime: startHostRuntime,
      homeGuideControlsHostRuntime: controlsHostRuntime,
      storageRuntime,
      seenKey: "home_guide_seen_v1",
      maxAdvanceLoops: 32
    });

    if (!resolvers || typeof resolvers.startHomeGuide !== "function") {
      return false;
    }

    if (typeof resolvers.isHomePage === "function" && !resolvers.isHomePage()) {
      return false;
    }
    if (typeof resolvers.getHomeGuideSteps === "function") {
      resolvers.getHomeGuideSteps();
    }

    const startResult = resolvers.startHomeGuide({ fromSettings: false });
    const overlay = document.getElementById("home-guide-overlay") as HTMLElement | null;
    return Boolean(startResult?.didStart && overlay && overlay.style.display !== "none");
  });
}

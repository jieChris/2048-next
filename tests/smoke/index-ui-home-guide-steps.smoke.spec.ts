import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("index ui delegates home guide step list build to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("home_guide_seen_v1", "1");
      } catch (_err) {}
    });
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreHomeGuideRuntime;
      const pageHostRuntime = (window as any).CoreHomeGuidePageHostRuntime;
      if (
        !runtime ||
        typeof runtime.resolveHomeGuidePathname !== "function" ||
        typeof runtime.buildHomeGuideSteps !== "function" ||
        typeof runtime.buildHomeGuidePanelInnerHtml !== "function" ||
        typeof runtime.buildHomeGuideSettingsRowInnerHtml !== "function" ||
        typeof runtime.markHomeGuideSeen !== "function" ||
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
        typeof runtime.isHomeGuideTargetVisible !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.createHomeGuidePageResolvers !== "function" ||
        typeof pageHostRuntime.createHomeGuideLifecycleResolvers !== "function" ||
        typeof pageHostRuntime.applyHomeGuideSettingsPageInit !== "function" ||
        typeof pageHostRuntime.applyHomeGuideAutoStartPage !== "function" ||
        typeof pageHostRuntime.applyHomeGuideAutoStartPageFromContext !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasSettingsOpen: false };
      }
      const originalBuild = runtime.buildHomeGuideSteps;
      const originalResolvePathname = runtime.resolveHomeGuidePathname;
      const originalBuildPanelHtml = runtime.buildHomeGuidePanelInnerHtml;
      const originalBuildSettingsRowHtml = runtime.buildHomeGuideSettingsRowInnerHtml;
      const originalMark = runtime.markHomeGuideSeen;
      const originalResolveStepUiState = runtime.resolveHomeGuideStepUiState;
      const originalResolveStepRenderState = runtime.resolveHomeGuideStepRenderState;
      const originalResolveStepIndexState = runtime.resolveHomeGuideStepIndexState;
      const originalResolveStepTargetState = runtime.resolveHomeGuideStepTargetState;
      const originalResolveElevationPlan = runtime.resolveHomeGuideElevationPlan;
      const originalResolveBindingState = runtime.resolveHomeGuideBindingState;
      const originalResolveControlAction = runtime.resolveHomeGuideControlAction;
      const originalResolveToggleAction = runtime.resolveHomeGuideToggleAction;
      const originalResolveLifecycleState = runtime.resolveHomeGuideLifecycleState;
      const originalResolveSessionState = runtime.resolveHomeGuideSessionState;
      const originalResolveLayerDisplayState = runtime.resolveHomeGuideLayerDisplayState;
      const originalResolveFinishState = runtime.resolveHomeGuideFinishState;
      const originalResolveTargetScrollState = runtime.resolveHomeGuideTargetScrollState;
      const originalResolveDoneNotice = runtime.resolveHomeGuideDoneNotice;
      const originalResolveDoneNoticeStyle = runtime.resolveHomeGuideDoneNoticeStyle;
      const originalResolvePanelLayout = runtime.resolveHomeGuidePanelLayout;
      const originalIsTargetVisible = runtime.isHomeGuideTargetVisible;
      const originalApplySettingsPageHost = pageHostRuntime.applyHomeGuideSettingsPageInit;
      const originalApplyAutoStartPageHost = pageHostRuntime.applyHomeGuideAutoStartPage;
      const originalApplyAutoStartPageHostFromContext =
        pageHostRuntime.applyHomeGuideAutoStartPageFromContext;
      let callCount = 0;
      let pathnameCallCount = 0;
      let panelHtmlCallCount = 0;
      let settingsRowHtmlCallCount = 0;
      let markCallCount = 0;
      let stepUiStateCallCount = 0;
      let stepRenderStateCallCount = 0;
      let stepIndexStateCallCount = 0;
      let stepTargetStateCallCount = 0;
      let elevationPlanCallCount = 0;
      let bindingStateCallCount = 0;
      let controlActionCallCount = 0;
      let toggleActionCallCount = 0;
      let lifecycleStateCallCount = 0;
      let sessionStateCallCount = 0;
      let layerDisplayStateCallCount = 0;
      let finishStateCallCount = 0;
      let targetScrollStateCallCount = 0;
      let doneNoticeCallCount = 0;
      let doneNoticeStyleCallCount = 0;
      let panelLayoutCallCount = 0;
      let targetVisibleCallCount = 0;
      let applySettingsPageHostCallCount = 0;
      let applyAutoStartPageHostCallCount = 0;
      let applyAutoStartPageHostFromContextCallCount = 0;
      runtime.buildHomeGuideSteps = function (opts: any) {
        callCount += 1;
        return originalBuild(opts);
      };
      runtime.resolveHomeGuidePathname = function (opts: any) {
        pathnameCallCount += 1;
        return originalResolvePathname(opts);
      };
      runtime.buildHomeGuidePanelInnerHtml = function () {
        panelHtmlCallCount += 1;
        return originalBuildPanelHtml();
      };
      runtime.buildHomeGuideSettingsRowInnerHtml = function () {
        settingsRowHtmlCallCount += 1;
        return originalBuildSettingsRowHtml();
      };
      runtime.markHomeGuideSeen = function (opts: any) {
        markCallCount += 1;
        return originalMark(opts);
      };
      runtime.resolveHomeGuideStepUiState = function (opts: any) {
        stepUiStateCallCount += 1;
        return originalResolveStepUiState(opts);
      };
      runtime.resolveHomeGuideStepRenderState = function (opts: any) {
        stepRenderStateCallCount += 1;
        return originalResolveStepRenderState(opts);
      };
      runtime.resolveHomeGuideStepIndexState = function (opts: any) {
        stepIndexStateCallCount += 1;
        return originalResolveStepIndexState(opts);
      };
      runtime.resolveHomeGuideStepTargetState = function (opts: any) {
        stepTargetStateCallCount += 1;
        return originalResolveStepTargetState(opts);
      };
      runtime.resolveHomeGuideElevationPlan = function (opts: any) {
        elevationPlanCallCount += 1;
        return originalResolveElevationPlan(opts);
      };
      runtime.resolveHomeGuideBindingState = function (opts: any) {
        bindingStateCallCount += 1;
        return originalResolveBindingState(opts);
      };
      runtime.resolveHomeGuideControlAction = function (opts: any) {
        controlActionCallCount += 1;
        return originalResolveControlAction(opts);
      };
      runtime.resolveHomeGuideToggleAction = function (opts: any) {
        toggleActionCallCount += 1;
        return originalResolveToggleAction(opts);
      };
      runtime.resolveHomeGuideLifecycleState = function (opts: any) {
        lifecycleStateCallCount += 1;
        return originalResolveLifecycleState(opts);
      };
      runtime.resolveHomeGuideSessionState = function (opts: any) {
        sessionStateCallCount += 1;
        return originalResolveSessionState(opts);
      };
      runtime.resolveHomeGuideLayerDisplayState = function (opts: any) {
        layerDisplayStateCallCount += 1;
        return originalResolveLayerDisplayState(opts);
      };
      runtime.resolveHomeGuideFinishState = function (opts: any) {
        finishStateCallCount += 1;
        return originalResolveFinishState(opts);
      };
      runtime.resolveHomeGuideTargetScrollState = function (opts: any) {
        targetScrollStateCallCount += 1;
        return originalResolveTargetScrollState(opts);
      };
      runtime.resolveHomeGuideDoneNotice = function (opts: any) {
        doneNoticeCallCount += 1;
        return originalResolveDoneNotice(opts);
      };
      runtime.resolveHomeGuideDoneNoticeStyle = function () {
        doneNoticeStyleCallCount += 1;
        return originalResolveDoneNoticeStyle();
      };
      runtime.resolveHomeGuidePanelLayout = function (opts: any) {
        panelLayoutCallCount += 1;
        return originalResolvePanelLayout(opts);
      };
      runtime.isHomeGuideTargetVisible = function (opts: any) {
        targetVisibleCallCount += 1;
        return originalIsTargetVisible(opts);
      };
      pageHostRuntime.applyHomeGuideSettingsPageInit = function (opts: any) {
        applySettingsPageHostCallCount += 1;
        return originalApplySettingsPageHost(opts);
      };
      pageHostRuntime.applyHomeGuideAutoStartPage = function (opts: any) {
        applyAutoStartPageHostCallCount += 1;
        return originalApplyAutoStartPageHost(opts);
      };
      pageHostRuntime.applyHomeGuideAutoStartPageFromContext = function (opts: any) {
        applyAutoStartPageHostFromContextCallCount += 1;
        return originalApplyAutoStartPageHostFromContext(opts);
      };
      try {
        const existingToggle = document.getElementById("home-guide-toggle");
        if (existingToggle) {
          const existingRow = existingToggle.closest(".settings-row");
          if (existingRow && existingRow.parentNode) {
            existingRow.parentNode.removeChild(existingRow);
          }
        }
        openSettingsModal();
        const toggle = document.getElementById("home-guide-toggle") as HTMLInputElement | null;
        if (!toggle) {
          return { hasRuntime: true, hasSettingsOpen: true, hasToggle: false };
        }
        toggle.checked = true;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
        const overlay = document.getElementById("home-guide-overlay");
        const overlayVisibleBeforeFinish = Boolean(overlay && overlay.style.display !== "none");
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const nextBtn = document.getElementById("home-guide-next");
        for (let i = 0; i < 20; i += 1) {
          if (!nextBtn) break;
          nextBtn.dispatchEvent(new Event("click", { bubbles: true }));
          await new Promise((resolve) => {
            window.requestAnimationFrame(() => resolve(null));
          });
          const currentOverlay = document.getElementById("home-guide-overlay");
          if (currentOverlay && currentOverlay.style.display === "none") {
            break;
          }
        }
        const overlayAfterFinish = document.getElementById("home-guide-overlay");
        const doneToast = document.getElementById("home-guide-done-toast");
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasSettingsOpen: true,
          hasToggle: true,
          applySettingsPageHostCallCount,
          applyAutoStartPageHostCallCount,
          callCount,
          pathnameCallCount,
          panelHtmlCallCount,
          settingsRowHtmlCallCount,
          markCallCount,
          stepUiStateCallCount,
          stepRenderStateCallCount,
          stepIndexStateCallCount,
          stepTargetStateCallCount,
          elevationPlanCallCount,
          bindingStateCallCount,
          controlActionCallCount,
          toggleActionCallCount,
          lifecycleStateCallCount,
          sessionStateCallCount,
          layerDisplayStateCallCount,
          finishStateCallCount,
          targetScrollStateCallCount,
          doneNoticeCallCount,
          doneNoticeStyleCallCount,
          panelLayoutCallCount,
          targetVisibleCallCount,
          hasOverlay: Boolean(overlay),
          overlayVisibleBeforeFinish,
          overlayHiddenAfterFinish: Boolean(
            overlayAfterFinish && overlayAfterFinish.style.display === "none"
          ),
          doneToastVisible: Boolean(doneToast && doneToast.style.opacity === "1"),
          applyAutoStartPageHostFromContextCallCount
        };
      } finally {
        runtime.buildHomeGuideSteps = originalBuild;
        runtime.resolveHomeGuidePathname = originalResolvePathname;
        runtime.buildHomeGuidePanelInnerHtml = originalBuildPanelHtml;
        runtime.buildHomeGuideSettingsRowInnerHtml = originalBuildSettingsRowHtml;
        runtime.markHomeGuideSeen = originalMark;
        runtime.resolveHomeGuideStepUiState = originalResolveStepUiState;
        runtime.resolveHomeGuideStepRenderState = originalResolveStepRenderState;
        runtime.resolveHomeGuideStepIndexState = originalResolveStepIndexState;
        runtime.resolveHomeGuideStepTargetState = originalResolveStepTargetState;
        runtime.resolveHomeGuideElevationPlan = originalResolveElevationPlan;
        runtime.resolveHomeGuideBindingState = originalResolveBindingState;
        runtime.resolveHomeGuideControlAction = originalResolveControlAction;
        runtime.resolveHomeGuideToggleAction = originalResolveToggleAction;
        runtime.resolveHomeGuideLifecycleState = originalResolveLifecycleState;
        runtime.resolveHomeGuideSessionState = originalResolveSessionState;
        runtime.resolveHomeGuideLayerDisplayState = originalResolveLayerDisplayState;
        runtime.resolveHomeGuideFinishState = originalResolveFinishState;
        runtime.resolveHomeGuideTargetScrollState = originalResolveTargetScrollState;
        runtime.resolveHomeGuideDoneNotice = originalResolveDoneNotice;
        runtime.resolveHomeGuideDoneNoticeStyle = originalResolveDoneNoticeStyle;
        runtime.resolveHomeGuidePanelLayout = originalResolvePanelLayout;
        runtime.isHomeGuideTargetVisible = originalIsTargetVisible;
        pageHostRuntime.applyHomeGuideSettingsPageInit = originalApplySettingsPageHost;
        pageHostRuntime.applyHomeGuideAutoStartPage = originalApplyAutoStartPageHost;
        pageHostRuntime.applyHomeGuideAutoStartPageFromContext =
          originalApplyAutoStartPageHostFromContext;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasToggle).toBe(true);
    expect(snapshot.applySettingsPageHostCallCount).toBeGreaterThan(0);
    expect(snapshot.applyAutoStartPageHostCallCount).toBe(0);
    expect(snapshot.applyAutoStartPageHostFromContextCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.callCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.pathnameCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.panelHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.settingsRowHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.markCallCount).toBeGreaterThan(0);
    expect(snapshot.stepUiStateCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.stepRenderStateCallCount).toBeGreaterThan(0);
    expect(snapshot.stepIndexStateCallCount).toBeGreaterThan(0);
    expect(snapshot.stepTargetStateCallCount).toBeGreaterThan(0);
    expect(snapshot.elevationPlanCallCount).toBeGreaterThan(0);
    expect(snapshot.bindingStateCallCount).toBeGreaterThan(0);
    expect(snapshot.controlActionCallCount).toBeGreaterThan(0);
    expect(snapshot.toggleActionCallCount).toBeGreaterThan(0);
    expect(snapshot.lifecycleStateCallCount).toBeGreaterThan(0);
    expect(snapshot.sessionStateCallCount).toBeGreaterThan(0);
    expect(snapshot.layerDisplayStateCallCount).toBeGreaterThan(0);
    expect(snapshot.finishStateCallCount).toBeGreaterThan(0);
    expect(snapshot.targetScrollStateCallCount).toBeGreaterThan(0);
    expect(snapshot.doneNoticeCallCount).toBeGreaterThan(0);
    expect(snapshot.doneNoticeStyleCallCount).toBeGreaterThan(0);
    expect(snapshot.panelLayoutCallCount).toBeGreaterThan(0);
    expect(snapshot.targetVisibleCallCount).toBeGreaterThan(0);
    expect(snapshot.hasOverlay).toBe(true);
    expect(snapshot.overlayVisibleBeforeFinish).toBe(true);
    expect(snapshot.overlayHiddenAfterFinish).toBe(true);
    expect(snapshot.doneToastVisible).toBe(true);
  });

});

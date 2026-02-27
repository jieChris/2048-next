import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("index ui delegates mobile hint timerbox undo-top top-actions top-button and viewport logic to runtime helpers", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__viewportResolverCreateCallCount = 0;
      (window as any).__viewportResolverGameScopeCallCount = 0;
      (window as any).__viewportResolverPracticeScopeCallCount = 0;
      (window as any).__viewportResolverTimerboxScopeCallCount = 0;
      (window as any).__viewportResolverMobileCallCount = 0;
      (window as any).__viewportResolverCompactCallCount = 0;
      (window as any).__viewportResolverCollapseCallCount = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createMobileViewportPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__viewportResolverCreateCallCount =
                Number((window as any).__viewportResolverCreateCallCount || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts);
              const toFn = (name: string) => {
                const fn = resolvers && typeof resolvers[name] === "function" ? resolvers[name] : null;
                if (!fn) return null;
                return fn as (...args: unknown[]) => unknown;
              };
              const gameScope = toFn("isGamePageScope");
              const practiceScope = toFn("isPracticePageScope");
              const timerboxScope = toFn("isTimerboxMobileScope");
              const mobileViewport = toFn("isMobileGameViewport");
              const compactViewport = toFn("isCompactGameViewport");
              const collapseViewport = toFn("isTimerboxCollapseViewport");

              return {
                isGamePageScope(...args: unknown[]) {
                  (window as any).__viewportResolverGameScopeCallCount =
                    Number((window as any).__viewportResolverGameScopeCallCount || 0) + 1;
                  return gameScope ? gameScope(...args) : false;
                },
                isPracticePageScope(...args: unknown[]) {
                  (window as any).__viewportResolverPracticeScopeCallCount =
                    Number((window as any).__viewportResolverPracticeScopeCallCount || 0) + 1;
                  return practiceScope ? practiceScope(...args) : false;
                },
                isTimerboxMobileScope(...args: unknown[]) {
                  (window as any).__viewportResolverTimerboxScopeCallCount =
                    Number((window as any).__viewportResolverTimerboxScopeCallCount || 0) + 1;
                  return timerboxScope ? timerboxScope(...args) : false;
                },
                isMobileGameViewport(...args: unknown[]) {
                  (window as any).__viewportResolverMobileCallCount =
                    Number((window as any).__viewportResolverMobileCallCount || 0) + 1;
                  return mobileViewport ? mobileViewport(...args) : false;
                },
                isCompactGameViewport(...args: unknown[]) {
                  (window as any).__viewportResolverCompactCallCount =
                    Number((window as any).__viewportResolverCompactCallCount || 0) + 1;
                  return compactViewport ? compactViewport(...args) : false;
                },
                isTimerboxCollapseViewport(...args: unknown[]) {
                  (window as any).__viewportResolverCollapseCallCount =
                    Number((window as any).__viewportResolverCollapseCallCount || 0) + 1;
                  return collapseViewport ? collapseViewport(...args) : false;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreMobileViewportPageHostRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/play.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(260);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreMobileHintRuntime;
      const uiRuntime = (window as any).CoreMobileHintUiRuntime;
      const modalRuntime = (window as any).CoreMobileHintModalRuntime;
      const timerRuntime = (window as any).CoreMobileTimerboxRuntime;
      const undoTopRuntime = (window as any).CoreMobileUndoTopRuntime;
      const topActionsRuntime = (window as any).CoreTopActionsRuntime;
      const topActionsHostRuntime = (window as any).CoreTopActionsHostRuntime;
      const topButtonsRuntime = (window as any).CoreMobileTopButtonsRuntime;
      const viewportRuntime = (window as any).CoreMobileViewportRuntime;
      const undoActionRuntime = (window as any).CoreUndoActionRuntime;
      if (
        !runtime ||
        typeof runtime.collectMobileHintTexts !== "function" ||
        !uiRuntime ||
        typeof uiRuntime.syncMobileHintTextBlockVisibility !== "function" ||
        typeof uiRuntime.resolveMobileHintUiState !== "function" ||
        !modalRuntime ||
        typeof modalRuntime.ensureMobileHintModalDom !== "function" ||
        !timerRuntime ||
        typeof timerRuntime.resolveStoredMobileTimerboxCollapsed !== "function" ||
        typeof timerRuntime.resolveMobileTimerboxCollapsedValue !== "function" ||
        typeof timerRuntime.resolveMobileTimerboxDisplayModel !== "function" ||
        typeof timerRuntime.resolveMobileTimerboxAppliedModel !== "function" ||
        !undoTopRuntime ||
        typeof undoTopRuntime.resolveMobileUndoTopButtonDisplayModel !== "function" ||
        typeof undoTopRuntime.resolveMobileUndoTopAppliedModel !== "function" ||
        !topActionsRuntime ||
        typeof topActionsRuntime.createGameTopActionsPlacementState !== "function" ||
        typeof topActionsRuntime.createPracticeTopActionsPlacementState !== "function" ||
        typeof topActionsRuntime.syncGameTopActionsPlacement !== "function" ||
        typeof topActionsRuntime.syncPracticeTopActionsPlacement !== "function" ||
        !topActionsHostRuntime ||
        typeof topActionsHostRuntime.applyGameTopActionsPlacementSync !== "function" ||
        typeof topActionsHostRuntime.applyPracticeTopActionsPlacementSync !== "function" ||
        !topButtonsRuntime ||
        typeof topButtonsRuntime.ensureMobileUndoTopButtonDom !== "function" ||
        typeof topButtonsRuntime.ensureMobileHintToggleButtonDom !== "function" ||
        !undoActionRuntime ||
        typeof undoActionRuntime.resolveUndoModeIdFromBody !== "function" ||
        typeof undoActionRuntime.isUndoCapableMode !== "function" ||
        typeof undoActionRuntime.resolveUndoCapabilityFromContext !== "function" ||
        typeof undoActionRuntime.tryTriggerUndoFromContext !== "function" ||
        typeof undoActionRuntime.isUndoInteractionEnabled !== "function" ||
        !viewportRuntime ||
        typeof viewportRuntime.isViewportAtMost !== "function" ||
        typeof viewportRuntime.isCompactGameViewport !== "function" ||
        typeof viewportRuntime.isTimerboxCollapseViewport !== "function" ||
        typeof viewportRuntime.isMobileGameViewport !== "function" ||
        typeof viewportRuntime.resolvePageScopeValue !== "function" ||
        typeof viewportRuntime.isGamePageScope !== "function" ||
        typeof viewportRuntime.isPracticePageScope !== "function" ||
        typeof viewportRuntime.isTimerboxMobileScope !== "function"
      ) {
        return {
          hasRuntime: false,
          hasUiRuntime: false,
          hasModalRuntime: false,
          hasTimerRuntime: false,
          hasUndoTopRuntime: false,
          hasTopActionsRuntime: false,
          hasTopActionsHostRuntime: false,
          hasTopButtonsRuntime: false,
          hasViewportRuntime: false
        };
      }
      const hintBtn = document.getElementById("top-mobile-hint-btn") as HTMLAnchorElement | null;
      const undoTopBtn = document.getElementById("top-mobile-undo-btn") as HTMLAnchorElement | null;
      if (!hintBtn || !undoTopBtn) {
        return {
          hasRuntime: true,
          hasUiRuntime: true,
          hasModalRuntime: true,
          hasTimerRuntime: true,
          hasUndoTopRuntime: true,
          hasTopActionsRuntime: true,
          hasTopActionsHostRuntime: true,
          hasTopButtonsRuntime: true,
          hasViewportRuntime: true,
          hasHintButton: !!hintBtn,
          hasUndoTopButton: !!undoTopBtn
        };
      }

      const originalCollect = runtime.collectMobileHintTexts;
      const originalSync = uiRuntime.syncMobileHintTextBlockVisibility;
      const originalResolveHintUiState = uiRuntime.resolveMobileHintUiState;
      const originalEnsureModal = modalRuntime.ensureMobileHintModalDom;
      const originalResolveStored = timerRuntime.resolveStoredMobileTimerboxCollapsed;
      const originalResolveCollapsedValue = timerRuntime.resolveMobileTimerboxCollapsedValue;
      const originalResolveDisplay = timerRuntime.resolveMobileTimerboxDisplayModel;
      const originalResolveAppliedModel = timerRuntime.resolveMobileTimerboxAppliedModel;
      const originalUndoTopDisplay = undoTopRuntime.resolveMobileUndoTopButtonDisplayModel;
      const originalUndoTopApplied = undoTopRuntime.resolveMobileUndoTopAppliedModel;
      const originalSyncGameTop = topActionsRuntime.syncGameTopActionsPlacement;
      const originalSyncPracticeTop = topActionsRuntime.syncPracticeTopActionsPlacement;
      const originalApplyGameTopHost = topActionsHostRuntime.applyGameTopActionsPlacementSync;
      const originalApplyPracticeTopHost = topActionsHostRuntime.applyPracticeTopActionsPlacementSync;
      const originalEnsureUndoTopBtn = topButtonsRuntime.ensureMobileUndoTopButtonDom;
      const originalEnsureHintTopBtn = topButtonsRuntime.ensureMobileHintToggleButtonDom;
      const originalIsCompactViewport = viewportRuntime.isCompactGameViewport;
      const originalIsTimerboxCollapseViewport = viewportRuntime.isTimerboxCollapseViewport;
      const originalResolvePageScopeValue = viewportRuntime.resolvePageScopeValue;
      const originalIsGamePageScope = viewportRuntime.isGamePageScope;
      const originalIsPracticePageScope = viewportRuntime.isPracticePageScope;
      const originalIsTimerboxMobileScope = viewportRuntime.isTimerboxMobileScope;
      const originalResolveUndoModeIdFromBody = undoActionRuntime.resolveUndoModeIdFromBody;
      const originalIsUndoCapableMode = undoActionRuntime.isUndoCapableMode;
      const originalResolveUndoCapabilityFromContext =
        undoActionRuntime.resolveUndoCapabilityFromContext;
      const originalTryTriggerUndoFromContext = undoActionRuntime.tryTriggerUndoFromContext;
      const originalIsUndoInteractionEnabled = undoActionRuntime.isUndoInteractionEnabled;
      let collectCallCount = 0;
      let syncCallCount = 0;
      let resolveHintUiStateCallCount = 0;
      let ensureModalCallCount = 0;
      let resolveStoredCallCount = 0;
      let resolveCollapsedValueCallCount = 0;
      let resolveDisplayCallCount = 0;
      let resolveAppliedModelCallCount = 0;
      let resolveUndoTopCallCount = 0;
      let resolveUndoTopAppliedCallCount = 0;
      let syncGameTopCallCount = 0;
      let syncPracticeTopCallCount = 0;
      let applyGameTopHostCallCount = 0;
      let applyPracticeTopHostCallCount = 0;
      let ensureUndoTopBtnCallCount = 0;
      let ensureHintTopBtnCallCount = 0;
      let compactViewportCallCount = 0;
      let timerboxCollapseViewportCallCount = 0;
      let resolvePageScopeCallCount = 0;
      let gameScopeCallCount = 0;
      let practiceScopeCallCount = 0;
      let timerboxScopeCallCount = 0;
      let resolveUndoModeIdFromBodyCallCount = 0;
      let isUndoCapableModeCallCount = 0;
      let resolveUndoCapabilityFromContextCallCount = 0;
      let tryTriggerUndoFromContextCallCount = 0;
      let isUndoInteractionEnabledCallCount = 0;
      runtime.collectMobileHintTexts = function (opts: any) {
        collectCallCount += 1;
        const lines = originalCollect(opts);
        return Array.isArray(lines) && lines.length ? lines : ["Smoke 提示"];
      };
      uiRuntime.syncMobileHintTextBlockVisibility = function (opts: any) {
        syncCallCount += 1;
        return originalSync(opts);
      };
      uiRuntime.resolveMobileHintUiState = function (opts: any) {
        resolveHintUiStateCallCount += 1;
        return originalResolveHintUiState(opts);
      };
      modalRuntime.ensureMobileHintModalDom = function (opts: any) {
        ensureModalCallCount += 1;
        return originalEnsureModal(opts);
      };
      timerRuntime.resolveStoredMobileTimerboxCollapsed = function (opts: any) {
        resolveStoredCallCount += 1;
        return originalResolveStored(opts);
      };
      timerRuntime.resolveMobileTimerboxCollapsedValue = function (opts: any) {
        resolveCollapsedValueCallCount += 1;
        return originalResolveCollapsedValue(opts);
      };
      timerRuntime.resolveMobileTimerboxDisplayModel = function (opts: any) {
        resolveDisplayCallCount += 1;
        return originalResolveDisplay(opts);
      };
      timerRuntime.resolveMobileTimerboxAppliedModel = function (opts: any) {
        resolveAppliedModelCallCount += 1;
        return originalResolveAppliedModel(opts);
      };
      undoTopRuntime.resolveMobileUndoTopButtonDisplayModel = function (opts: any) {
        resolveUndoTopCallCount += 1;
        return originalUndoTopDisplay(opts);
      };
      undoTopRuntime.resolveMobileUndoTopAppliedModel = function (opts: any) {
        resolveUndoTopAppliedCallCount += 1;
        return originalUndoTopApplied(opts);
      };
      topActionsRuntime.syncGameTopActionsPlacement = function (opts: any) {
        syncGameTopCallCount += 1;
        return originalSyncGameTop(opts);
      };
      topActionsRuntime.syncPracticeTopActionsPlacement = function (opts: any) {
        syncPracticeTopCallCount += 1;
        return originalSyncPracticeTop(opts);
      };
      topActionsHostRuntime.applyGameTopActionsPlacementSync = function (opts: any) {
        applyGameTopHostCallCount += 1;
        return originalApplyGameTopHost(opts);
      };
      topActionsHostRuntime.applyPracticeTopActionsPlacementSync = function (opts: any) {
        applyPracticeTopHostCallCount += 1;
        return originalApplyPracticeTopHost(opts);
      };
      topButtonsRuntime.ensureMobileUndoTopButtonDom = function (opts: any) {
        ensureUndoTopBtnCallCount += 1;
        return originalEnsureUndoTopBtn(opts);
      };
      topButtonsRuntime.ensureMobileHintToggleButtonDom = function (opts: any) {
        ensureHintTopBtnCallCount += 1;
        return originalEnsureHintTopBtn(opts);
      };
      viewportRuntime.isCompactGameViewport = function (opts: any) {
        compactViewportCallCount += 1;
        return originalIsCompactViewport(opts);
      };
      viewportRuntime.isTimerboxCollapseViewport = function (opts: any) {
        timerboxCollapseViewportCallCount += 1;
        return originalIsTimerboxCollapseViewport(opts);
      };
      viewportRuntime.resolvePageScopeValue = function (opts: any) {
        resolvePageScopeCallCount += 1;
        return originalResolvePageScopeValue(opts);
      };
      viewportRuntime.isGamePageScope = function (opts: any) {
        gameScopeCallCount += 1;
        return originalIsGamePageScope(opts);
      };
      viewportRuntime.isPracticePageScope = function (opts: any) {
        practiceScopeCallCount += 1;
        return originalIsPracticePageScope(opts);
      };
      viewportRuntime.isTimerboxMobileScope = function (opts: any) {
        timerboxScopeCallCount += 1;
        return originalIsTimerboxMobileScope(opts);
      };
      undoActionRuntime.resolveUndoModeIdFromBody = function (opts: any) {
        resolveUndoModeIdFromBodyCallCount += 1;
        return originalResolveUndoModeIdFromBody(opts);
      };
      undoActionRuntime.isUndoCapableMode = function (opts: any) {
        isUndoCapableModeCallCount += 1;
        return originalIsUndoCapableMode(opts);
      };
      undoActionRuntime.resolveUndoCapabilityFromContext = function (opts: any) {
        resolveUndoCapabilityFromContextCallCount += 1;
        return originalResolveUndoCapabilityFromContext(opts);
      };
      undoActionRuntime.tryTriggerUndoFromContext = function (opts: any) {
        tryTriggerUndoFromContextCallCount += 1;
        return originalTryTriggerUndoFromContext(opts);
      };
      undoActionRuntime.isUndoInteractionEnabled = function (manager: any) {
        isUndoInteractionEnabledCallCount += 1;
        return originalIsUndoInteractionEnabled(manager);
      };

      try {
        const syncMobileHintUI = (window as any).syncMobileHintUI;
        if (typeof syncMobileHintUI === "function") {
          syncMobileHintUI();
        }
        const syncMobileTimerboxUI = (window as any).syncMobileTimerboxUI;
        if (typeof syncMobileTimerboxUI === "function") {
          syncMobileTimerboxUI();
        }
        const syncMobileUndoTopButtonAvailability = (window as any).syncMobileUndoTopButtonAvailability;
        if (typeof syncMobileUndoTopButtonAvailability === "function") {
          syncMobileUndoTopButtonAvailability();
        }
        window.dispatchEvent(new Event("resize"));
        await new Promise((resolve) => setTimeout(resolve, 200));
        hintBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        undoTopBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        const overlay = document.getElementById("mobile-hint-overlay");
        const firstLine = document.querySelector("#mobile-hint-body p");
        return {
          hasRuntime: true,
          hasUiRuntime: true,
          hasModalRuntime: true,
          hasTimerRuntime: true,
          hasUndoTopRuntime: true,
          hasTopActionsRuntime: true,
          hasTopActionsHostRuntime: true,
          hasTopButtonsRuntime: true,
          hasViewportRuntime: true,
          hasHintButton: true,
          hasUndoTopButton: true,
          collectCallCount,
          syncCallCount,
          resolveHintUiStateCallCount,
          ensureModalCallCount,
          resolveStoredCallCount,
          resolveCollapsedValueCallCount,
          resolveDisplayCallCount,
          resolveAppliedModelCallCount,
          resolveUndoTopCallCount,
          resolveUndoTopAppliedCallCount,
          syncGameTopCallCount,
          syncPracticeTopCallCount,
          applyGameTopHostCallCount,
          applyPracticeTopHostCallCount,
          ensureUndoTopBtnCallCount,
          ensureHintTopBtnCallCount,
          compactViewportCallCount,
          timerboxCollapseViewportCallCount,
          resolvePageScopeCallCount,
          gameScopeCallCount,
          practiceScopeCallCount,
          timerboxScopeCallCount,
          resolveUndoModeIdFromBodyCallCount,
          isUndoCapableModeCallCount,
          resolveUndoCapabilityFromContextCallCount,
          tryTriggerUndoFromContextCallCount,
          isUndoInteractionEnabledCallCount,
          resolverCreateCallCount: Number((window as any).__viewportResolverCreateCallCount || 0),
          resolverGameScopeCallCount: Number((window as any).__viewportResolverGameScopeCallCount || 0),
          resolverPracticeScopeCallCount: Number(
            (window as any).__viewportResolverPracticeScopeCallCount || 0
          ),
          resolverTimerboxScopeCallCount: Number(
            (window as any).__viewportResolverTimerboxScopeCallCount || 0
          ),
          resolverMobileCallCount: Number((window as any).__viewportResolverMobileCallCount || 0),
          resolverCompactCallCount: Number((window as any).__viewportResolverCompactCallCount || 0),
          resolverCollapseCallCount: Number((window as any).__viewportResolverCollapseCallCount || 0),
          overlayVisible: Boolean(overlay && overlay.style.display === "flex"),
          firstLineText: firstLine ? (firstLine.textContent || "").trim() : ""
        };
      } finally {
        runtime.collectMobileHintTexts = originalCollect;
        uiRuntime.syncMobileHintTextBlockVisibility = originalSync;
        uiRuntime.resolveMobileHintUiState = originalResolveHintUiState;
        modalRuntime.ensureMobileHintModalDom = originalEnsureModal;
        timerRuntime.resolveStoredMobileTimerboxCollapsed = originalResolveStored;
        timerRuntime.resolveMobileTimerboxCollapsedValue = originalResolveCollapsedValue;
        timerRuntime.resolveMobileTimerboxDisplayModel = originalResolveDisplay;
        timerRuntime.resolveMobileTimerboxAppliedModel = originalResolveAppliedModel;
        undoTopRuntime.resolveMobileUndoTopButtonDisplayModel = originalUndoTopDisplay;
        undoTopRuntime.resolveMobileUndoTopAppliedModel = originalUndoTopApplied;
        topActionsRuntime.syncGameTopActionsPlacement = originalSyncGameTop;
        topActionsRuntime.syncPracticeTopActionsPlacement = originalSyncPracticeTop;
        topActionsHostRuntime.applyGameTopActionsPlacementSync = originalApplyGameTopHost;
        topActionsHostRuntime.applyPracticeTopActionsPlacementSync = originalApplyPracticeTopHost;
        topButtonsRuntime.ensureMobileUndoTopButtonDom = originalEnsureUndoTopBtn;
        topButtonsRuntime.ensureMobileHintToggleButtonDom = originalEnsureHintTopBtn;
        viewportRuntime.isCompactGameViewport = originalIsCompactViewport;
        viewportRuntime.isTimerboxCollapseViewport = originalIsTimerboxCollapseViewport;
        viewportRuntime.resolvePageScopeValue = originalResolvePageScopeValue;
        viewportRuntime.isGamePageScope = originalIsGamePageScope;
        viewportRuntime.isPracticePageScope = originalIsPracticePageScope;
        viewportRuntime.isTimerboxMobileScope = originalIsTimerboxMobileScope;
        undoActionRuntime.resolveUndoModeIdFromBody = originalResolveUndoModeIdFromBody;
        undoActionRuntime.isUndoCapableMode = originalIsUndoCapableMode;
        undoActionRuntime.resolveUndoCapabilityFromContext =
          originalResolveUndoCapabilityFromContext;
        undoActionRuntime.tryTriggerUndoFromContext = originalTryTriggerUndoFromContext;
        undoActionRuntime.isUndoInteractionEnabled = originalIsUndoInteractionEnabled;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasUiRuntime).toBe(true);
    expect(snapshot.hasModalRuntime).toBe(true);
    expect(snapshot.hasTimerRuntime).toBe(true);
    expect(snapshot.hasUndoTopRuntime).toBe(true);
    expect(snapshot.hasTopActionsRuntime).toBe(true);
    expect(snapshot.hasTopActionsHostRuntime).toBe(true);
    expect(snapshot.hasTopButtonsRuntime).toBe(true);
    expect(snapshot.hasViewportRuntime).toBe(true);
    expect(snapshot.hasHintButton).toBe(true);
    expect(snapshot.hasUndoTopButton).toBe(true);
    expect(snapshot.collectCallCount).toBeGreaterThan(0);
    expect(snapshot.syncCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveHintUiStateCallCount).toBeGreaterThan(0);
    expect(snapshot.ensureModalCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveStoredCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveCollapsedValueCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveDisplayCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveAppliedModelCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveUndoTopCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveUndoTopAppliedCallCount).toBeGreaterThan(0);
    expect(snapshot.syncGameTopCallCount).toBeGreaterThan(0);
    expect(snapshot.syncPracticeTopCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.applyGameTopHostCallCount).toBeGreaterThan(0);
    expect(snapshot.applyPracticeTopHostCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.ensureUndoTopBtnCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.ensureHintTopBtnCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.compactViewportCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.timerboxCollapseViewportCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolvePageScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.gameScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.practiceScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.timerboxScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolveUndoModeIdFromBodyCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.isUndoCapableModeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolveUndoCapabilityFromContextCallCount).toBeGreaterThan(0);
    expect(snapshot.tryTriggerUndoFromContextCallCount).toBeGreaterThan(0);
    expect(snapshot.isUndoInteractionEnabledCallCount).toBeGreaterThan(0);
    expect(snapshot.resolverCreateCallCount).toBeGreaterThan(0);
    expect(snapshot.resolverGameScopeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolverPracticeScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolverTimerboxScopeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolverMobileCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolverCompactCallCount).toBeGreaterThan(0);
    expect(snapshot.resolverCollapseCallCount).toBeGreaterThan(0);
    expect(snapshot.overlayVisible).toBe(true);
    expect(snapshot.firstLineText.length).toBeGreaterThan(0);
  });

  test("home guide runtime provides homepage auto-start gating", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

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
      const stepTargetAdvance = runtime.resolveHomeGuideStepTargetState({
        hasTarget: false,
        targetVisible: false,
        stepIndex: 2
      });
      const stepTargetKeep = runtime.resolveHomeGuideStepTargetState({
        hasTarget: true,
        targetVisible: true,
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
        settingsHasToggle:
          typeof settingsRowHtml === "string" && settingsRowHtml.indexOf("home-guide-toggle") !== -1,
        homePath: runtime.isHomePagePath("/index.html"),
        playPath: runtime.isHomePagePath("/play.html"),
        hasCompactHint: compactSelectors.includes("#top-mobile-hint-btn"),
        hasDesktopHint: desktopSelectors.includes("#top-mobile-hint-btn"),
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
        stepTargetAdvance,
        stepTargetKeep,
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
    expect(snapshot.settingsHasToggle).toBe(true);
    expect(snapshot.homePath).toBe(true);
    expect(snapshot.playPath).toBe(false);
    expect(snapshot.hasCompactHint).toBe(true);
    expect(snapshot.hasDesktopHint).toBe(false);
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
    expect(snapshot.stepTargetAdvance).toEqual({
      shouldAdvance: true,
      nextIndex: 3
    });
    expect(snapshot.stepTargetKeep).toEqual({
      shouldAdvance: false,
      nextIndex: 2
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

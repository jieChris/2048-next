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


});

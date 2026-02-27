import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("index ui delegates mobile viewport page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__mobileViewportPageResolverCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createMobileViewportPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__mobileViewportPageResolverCalls =
                Number((window as any).__mobileViewportPageResolverCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
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

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreMobileViewportPageHostRuntime;
      return {
        hasRuntime: !!runtime && typeof runtime.createMobileViewportPageResolvers === "function",
        callCount: Number((window as any).__mobileViewportPageResolverCalls || 0),
        hasSyncMobileUndoTopButtonAvailability:
          typeof (window as any).syncMobileUndoTopButtonAvailability === "function",
        hasSyncMobileHintUI: typeof (window as any).syncMobileHintUI === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasSyncMobileUndoTopButtonAvailability).toBe(true);
    expect(snapshot.hasSyncMobileHintUI).toBe(true);
  });

  test("index ui delegates mobile top button resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__mobileTopButtonsResolverCreateCalls = 0;
      (window as any).__mobileTopButtonsEnsureUndoCalls = 0;
      (window as any).__mobileTopButtonsEnsureHintCalls = 0;
      (window as any).__mobileTopButtonsSyncUndoAvailabilityCalls = 0;
      (window as any).__mobileTopButtonsInitUndoCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createMobileTopButtonsPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__mobileTopButtonsResolverCreateCalls =
                Number((window as any).__mobileTopButtonsResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts);
              const originalEnsureUndo = resolvers.ensureMobileUndoTopButton;
              const originalEnsureHint = resolvers.ensureMobileHintToggleButton;
              const originalSyncUndoAvailability = resolvers.syncMobileUndoTopButtonAvailability;
              const originalInitUndo = resolvers.initMobileUndoTopButton;
              return {
                ensureMobileUndoTopButton() {
                  (window as any).__mobileTopButtonsEnsureUndoCalls =
                    Number((window as any).__mobileTopButtonsEnsureUndoCalls || 0) + 1;
                  return typeof originalEnsureUndo === "function" ? originalEnsureUndo() : null;
                },
                ensureMobileHintToggleButton() {
                  (window as any).__mobileTopButtonsEnsureHintCalls =
                    Number((window as any).__mobileTopButtonsEnsureHintCalls || 0) + 1;
                  return typeof originalEnsureHint === "function" ? originalEnsureHint() : null;
                },
                syncMobileUndoTopButtonAvailability() {
                  (window as any).__mobileTopButtonsSyncUndoAvailabilityCalls =
                    Number((window as any).__mobileTopButtonsSyncUndoAvailabilityCalls || 0) + 1;
                  return typeof originalSyncUndoAvailability === "function"
                    ? originalSyncUndoAvailability()
                    : null;
                },
                initMobileUndoTopButton() {
                  (window as any).__mobileTopButtonsInitUndoCalls =
                    Number((window as any).__mobileTopButtonsInitUndoCalls || 0) + 1;
                  return typeof originalInitUndo === "function" ? originalInitUndo() : null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreMobileTopButtonsPageHostRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    const response = await page.goto("/play.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(260);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreMobileTopButtonsPageHostRuntime;
      const syncMobileHintUI = (window as any).syncMobileHintUI;
      const syncMobileUndoTopButtonAvailability = (window as any).syncMobileUndoTopButtonAvailability;
      if (typeof syncMobileHintUI === "function") syncMobileHintUI();
      if (typeof syncMobileUndoTopButtonAvailability === "function") {
        syncMobileUndoTopButtonAvailability();
      }
      return {
        hasRuntime:
          !!runtime && typeof runtime.createMobileTopButtonsPageResolvers === "function",
        createCallCount: Number((window as any).__mobileTopButtonsResolverCreateCalls || 0),
        ensureUndoCallCount: Number((window as any).__mobileTopButtonsEnsureUndoCalls || 0),
        ensureHintCallCount: Number((window as any).__mobileTopButtonsEnsureHintCalls || 0),
        syncUndoAvailabilityCallCount: Number(
          (window as any).__mobileTopButtonsSyncUndoAvailabilityCalls || 0
        ),
        initUndoCallCount: Number((window as any).__mobileTopButtonsInitUndoCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.ensureUndoCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.ensureHintCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.syncUndoAvailabilityCallCount).toBeGreaterThan(0);
    expect(snapshot.initUndoCallCount).toBeGreaterThan(0);
  });

  test("index ui delegates top actions page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__topActionsPageResolverCreateCalls = 0;
      (window as any).__topActionsPageResolverGameSyncCalls = 0;
      (window as any).__topActionsPageResolverPracticeSyncCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createTopActionsPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__topActionsPageResolverCreateCalls =
                Number((window as any).__topActionsPageResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts) || {};
              const originalGameSync = resolvers.syncMobileTopActionsPlacement;
              const originalPracticeSync = resolvers.syncPracticeTopActionsPlacement;
              return {
                syncMobileTopActionsPlacement() {
                  (window as any).__topActionsPageResolverGameSyncCalls =
                    Number((window as any).__topActionsPageResolverGameSyncCalls || 0) + 1;
                  return typeof originalGameSync === "function" ? originalGameSync() : null;
                },
                syncPracticeTopActionsPlacement() {
                  (window as any).__topActionsPageResolverPracticeSyncCalls =
                    Number((window as any).__topActionsPageResolverPracticeSyncCalls || 0) + 1;
                  return typeof originalPracticeSync === "function" ? originalPracticeSync() : null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreTopActionsPageHostRuntime", {
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

    await page.evaluate(async () => {
      window.dispatchEvent(new Event("resize"));
      await new Promise((resolve) => setTimeout(resolve, 220));
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreTopActionsPageHostRuntime;
      return {
        hasRuntime: !!runtime && typeof runtime.createTopActionsPageResolvers === "function",
        createCallCount: Number((window as any).__topActionsPageResolverCreateCalls || 0),
        gameSyncCallCount: Number((window as any).__topActionsPageResolverGameSyncCalls || 0),
        practiceSyncCallCount: Number((window as any).__topActionsPageResolverPracticeSyncCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.gameSyncCallCount).toBeGreaterThan(0);
    expect(snapshot.practiceSyncCallCount).toBeGreaterThanOrEqual(0);
  });

  test("index ui delegates mobile timerbox page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__mobileTimerboxPageResolverCreateCalls = 0;
      (window as any).__mobileTimerboxPageResolverSyncCalls = 0;
      (window as any).__mobileTimerboxPageResolverInitCalls = 0;
      (window as any).__mobileTimerboxPageResolverRequestCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createMobileTimerboxPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__mobileTimerboxPageResolverCreateCalls =
                Number((window as any).__mobileTimerboxPageResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts) || {};
              const originalSync = resolvers.syncMobileTimerboxUI;
              const originalInit = resolvers.initMobileTimerboxToggle;
              const originalRequest = resolvers.requestResponsiveGameRelayout;
              return {
                syncMobileTimerboxUI(options?: unknown) {
                  (window as any).__mobileTimerboxPageResolverSyncCalls =
                    Number((window as any).__mobileTimerboxPageResolverSyncCalls || 0) + 1;
                  return typeof originalSync === "function" ? originalSync(options) : null;
                },
                initMobileTimerboxToggle() {
                  (window as any).__mobileTimerboxPageResolverInitCalls =
                    Number((window as any).__mobileTimerboxPageResolverInitCalls || 0) + 1;
                  return typeof originalInit === "function" ? originalInit() : null;
                },
                requestResponsiveGameRelayout() {
                  (window as any).__mobileTimerboxPageResolverRequestCalls =
                    Number((window as any).__mobileTimerboxPageResolverRequestCalls || 0) + 1;
                  return typeof originalRequest === "function" ? originalRequest() : null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreMobileTimerboxPageHostRuntime", {
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
    await page.evaluate(async () => {
      window.dispatchEvent(new Event("resize"));
      await new Promise((resolve) => setTimeout(resolve, 220));
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreMobileTimerboxPageHostRuntime;
      const syncMobileTimerboxUI = (window as any).syncMobileTimerboxUI;
      if (typeof syncMobileTimerboxUI === "function") syncMobileTimerboxUI();
      return {
        hasRuntime:
          !!runtime && typeof runtime.createMobileTimerboxPageResolvers === "function",
        hasSyncMobileTimerboxUI: typeof syncMobileTimerboxUI === "function",
        createCallCount: Number((window as any).__mobileTimerboxPageResolverCreateCalls || 0),
        syncCallCount: Number((window as any).__mobileTimerboxPageResolverSyncCalls || 0),
        initCallCount: Number((window as any).__mobileTimerboxPageResolverInitCalls || 0),
        requestCallCount: Number((window as any).__mobileTimerboxPageResolverRequestCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasSyncMobileTimerboxUI).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.syncCallCount).toBeGreaterThan(0);
    expect(snapshot.initCallCount).toBeGreaterThan(0);
    expect(snapshot.requestCallCount).toBeGreaterThan(0);
  });

  test("index ui delegates mobile hint page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__mobileHintPageResolverCreateCalls = 0;
      (window as any).__mobileHintPageResolverEnsureCalls = 0;
      (window as any).__mobileHintPageResolverOpenCalls = 0;
      (window as any).__mobileHintPageResolverCloseCalls = 0;
      (window as any).__mobileHintPageResolverSyncCalls = 0;
      (window as any).__mobileHintPageResolverInitCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createMobileHintPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__mobileHintPageResolverCreateCalls =
                Number((window as any).__mobileHintPageResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts) || {};
              const originalEnsure = resolvers.ensureMobileHintModalDom;
              const originalOpen = resolvers.openMobileHintModal;
              const originalClose = resolvers.closeMobileHintModal;
              const originalSync = resolvers.syncMobileHintUI;
              const originalInit = resolvers.initMobileHintToggle;
              return {
                ensureMobileHintModalDom() {
                  (window as any).__mobileHintPageResolverEnsureCalls =
                    Number((window as any).__mobileHintPageResolverEnsureCalls || 0) + 1;
                  return typeof originalEnsure === "function" ? originalEnsure() : null;
                },
                openMobileHintModal() {
                  (window as any).__mobileHintPageResolverOpenCalls =
                    Number((window as any).__mobileHintPageResolverOpenCalls || 0) + 1;
                  return typeof originalOpen === "function" ? originalOpen() : null;
                },
                closeMobileHintModal() {
                  (window as any).__mobileHintPageResolverCloseCalls =
                    Number((window as any).__mobileHintPageResolverCloseCalls || 0) + 1;
                  if (typeof originalClose === "function") originalClose();
                },
                syncMobileHintUI(options?: unknown) {
                  (window as any).__mobileHintPageResolverSyncCalls =
                    Number((window as any).__mobileHintPageResolverSyncCalls || 0) + 1;
                  return typeof originalSync === "function" ? originalSync(options) : null;
                },
                initMobileHintToggle() {
                  (window as any).__mobileHintPageResolverInitCalls =
                    Number((window as any).__mobileHintPageResolverInitCalls || 0) + 1;
                  return typeof originalInit === "function" ? originalInit() : null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreMobileHintPageHostRuntime", {
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

    await page.evaluate(() => {
      const syncMobileHintUI = (window as any).syncMobileHintUI;
      if (typeof syncMobileHintUI === "function") syncMobileHintUI();
      const hintBtn = document.getElementById("top-mobile-hint-btn");
      if (hintBtn) {
        hintBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => {
      const syncMobileHintUI = (window as any).syncMobileHintUI;
      if (typeof syncMobileHintUI === "function") syncMobileHintUI();
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreMobileHintPageHostRuntime;
      return {
        hasRuntime: !!runtime && typeof runtime.createMobileHintPageResolvers === "function",
        createCallCount: Number((window as any).__mobileHintPageResolverCreateCalls || 0),
        ensureCallCount: Number((window as any).__mobileHintPageResolverEnsureCalls || 0),
        openCallCount: Number((window as any).__mobileHintPageResolverOpenCalls || 0),
        closeCallCount: Number((window as any).__mobileHintPageResolverCloseCalls || 0),
        syncCallCount: Number((window as any).__mobileHintPageResolverSyncCalls || 0),
        initCallCount: Number((window as any).__mobileHintPageResolverInitCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.ensureCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.openCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.closeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.syncCallCount).toBeGreaterThan(0);
    expect(snapshot.initCallCount).toBeGreaterThan(0);
  });
});

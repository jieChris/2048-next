import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("index ui delegates modal runtime contract checks to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiModalContractCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveIndexUiModalRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiModalContractCalls =
                Number((window as any).__indexUiModalContractCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiRuntimeContractRuntime", {
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
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return {
        hasRuntime:
          !!runtime && typeof runtime.resolveIndexUiModalRuntimeContracts === "function",
        callCount: Number((window as any).__indexUiModalContractCalls || 0),
        hasOpenSettingsModal: typeof (window as any).openSettingsModal === "function",
        hasCloseSettingsModal: typeof (window as any).closeSettingsModal === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasOpenSettingsModal).toBe(true);
    expect(snapshot.hasCloseSettingsModal).toBe(true);
  });

  test("index ui delegates home guide runtime contract checks to runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiHomeGuideContractCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveIndexUiHomeGuideRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiHomeGuideContractCalls =
                Number((window as any).__indexUiHomeGuideContractCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiRuntimeContractRuntime", {
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
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return {
        hasRuntime:
          !!runtime && typeof runtime.resolveIndexUiHomeGuideRuntimeContracts === "function",
        callCount: Number((window as any).__indexUiHomeGuideContractCalls || 0),
        hasHomeGuideRuntime:
          !!(window as any).CoreHomeGuideRuntime &&
          typeof (window as any).CoreHomeGuideRuntime.buildHomeGuideSteps === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasHomeGuideRuntime).toBe(true);
  });

  test("index ui delegates core runtime contract checks to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiCoreContractCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveIndexUiCoreRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiCoreContractCalls =
                Number((window as any).__indexUiCoreContractCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiRuntimeContractRuntime", {
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
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return {
        hasRuntime:
          !!runtime && typeof runtime.resolveIndexUiCoreRuntimeContracts === "function",
        callCount: Number((window as any).__indexUiCoreContractCalls || 0),
        hasPretty: typeof (window as any).pretty === "function",
        hasSyncMobileHintUI: typeof (window as any).syncMobileHintUI === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasPretty).toBe(true);
    expect(snapshot.hasSyncMobileHintUI).toBe(true);
  });

  test("index ui delegates page bootstrap and undo handler creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiPageHostCreateTryUndoCalls = 0;
      (window as any).__indexUiPageHostBootstrapCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createIndexUiTryUndoHandler" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiPageHostCreateTryUndoCalls =
                Number((window as any).__indexUiPageHostCreateTryUndoCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "applyIndexUiPageBootstrap" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiPageHostBootstrapCalls =
                Number((window as any).__indexUiPageHostBootstrapCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiPageHostRuntime", {
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
      const runtime = (window as any).CoreIndexUiPageHostRuntime;
      return {
        hasRuntime:
          !!runtime &&
          typeof runtime.createIndexUiTryUndoHandler === "function" &&
          typeof runtime.applyIndexUiPageBootstrap === "function",
        createTryUndoCalls: Number((window as any).__indexUiPageHostCreateTryUndoCalls || 0),
        bootstrapCalls: Number((window as any).__indexUiPageHostBootstrapCalls || 0),
        hasPretty: typeof (window as any).pretty === "function",
        hasOpenSettingsModal: typeof (window as any).openSettingsModal === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createTryUndoCalls).toBeGreaterThan(0);
    expect(snapshot.bootstrapCalls).toBeGreaterThan(0);
    expect(snapshot.hasPretty).toBe(true);
    expect(snapshot.hasOpenSettingsModal).toBe(true);
  });

  test("index ui delegates mobile resolver aggregation to page-resolvers host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiPageResolversHostCreateCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createIndexUiMobileResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiPageResolversHostCreateCalls =
                Number((window as any).__indexUiPageResolversHostCreateCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiPageResolversHostRuntime", {
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
      const runtime = (window as any).CoreIndexUiPageResolversHostRuntime;
      return {
        hasRuntime: !!runtime && typeof runtime.createIndexUiMobileResolvers === "function",
        callCount: Number((window as any).__indexUiPageResolversHostCreateCalls || 0),
        hasSyncMobileHintUI: typeof (window as any).syncMobileHintUI === "function",
        hasSyncMobileTimerboxUI: typeof (window as any).syncMobileTimerboxUI === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasSyncMobileHintUI).toBe(true);
    expect(snapshot.hasSyncMobileTimerboxUI).toBe(true);
  });

  test("index ui delegates page action aggregation to page-actions host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiPageActionsHostCreateCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createIndexUiPageActionResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiPageActionsHostCreateCalls =
                Number((window as any).__indexUiPageActionsHostCreateCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiPageActionsHostRuntime", {
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
      const runtime = (window as any).CoreIndexUiPageActionsHostRuntime;
      return {
        hasRuntime: !!runtime && typeof runtime.createIndexUiPageActionResolvers === "function",
        callCount: Number((window as any).__indexUiPageActionsHostCreateCalls || 0),
        hasOpenSettingsModal: typeof (window as any).openSettingsModal === "function",
        hasExportReplay: typeof (window as any).exportReplay === "function",
        hasPracticeTransfer: typeof (window as any).openPracticeBoardFromCurrent === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasOpenSettingsModal).toBe(true);
    expect(snapshot.hasExportReplay).toBe(true);
    expect(snapshot.hasPracticeTransfer).toBe(true);
  });

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

  test("index ui delegates home guide page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__homeGuidePageResolverCreateCalls = 0;
      (window as any).__homeGuidePageResolverIsHomeCalls = 0;
      (window as any).__homeGuidePageResolverStepsCalls = 0;
      (window as any).__homeGuidePageResolverEnsureCalls = 0;
      (window as any).__homeGuidePageResolverClearCalls = 0;
      (window as any).__homeGuidePageResolverElevateCalls = 0;
      (window as any).__homeGuidePageResolverPositionCalls = 0;
      (window as any).__homeGuidePageResolverVisibleCalls = 0;
      (window as any).__homeGuidePageResolverDoneCalls = 0;
      (window as any).__homeGuidePageResolverFinishCalls = 0;
      (window as any).__homeGuidePageResolverShowStepCalls = 0;
      (window as any).__homeGuidePageResolverStartCalls = 0;
      try {
        window.localStorage.setItem("home_guide_seen_v1", "1");
      } catch (_err) {}

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createHomeGuidePageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeGuidePageResolverCreateCalls =
                Number((window as any).__homeGuidePageResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts) || {};
              const originalIsHomePage = resolvers.isHomePage;
              const originalGetSteps = resolvers.getHomeGuideSteps;
              const originalEnsure = resolvers.ensureHomeGuideDom;
              const originalClear = resolvers.clearHomeGuideHighlight;
              const originalElevate = resolvers.elevateHomeGuideTarget;
              const originalPosition = resolvers.positionHomeGuidePanel;
              const originalVisible = resolvers.isElementVisibleForGuide;
              const originalDone = resolvers.showHomeGuideDoneNotice;
              const originalFinish = resolvers.finishHomeGuide;
              const originalShowStep = resolvers.showHomeGuideStep;
              const originalStart = resolvers.startHomeGuide;
              return {
                isHomePage() {
                  (window as any).__homeGuidePageResolverIsHomeCalls =
                    Number((window as any).__homeGuidePageResolverIsHomeCalls || 0) + 1;
                  return typeof originalIsHomePage === "function" ? originalIsHomePage() : false;
                },
                getHomeGuideSteps() {
                  (window as any).__homeGuidePageResolverStepsCalls =
                    Number((window as any).__homeGuidePageResolverStepsCalls || 0) + 1;
                  return typeof originalGetSteps === "function" ? originalGetSteps() : [];
                },
                ensureHomeGuideDom() {
                  (window as any).__homeGuidePageResolverEnsureCalls =
                    Number((window as any).__homeGuidePageResolverEnsureCalls || 0) + 1;
                  return typeof originalEnsure === "function" ? originalEnsure() : null;
                },
                clearHomeGuideHighlight() {
                  (window as any).__homeGuidePageResolverClearCalls =
                    Number((window as any).__homeGuidePageResolverClearCalls || 0) + 1;
                  if (typeof originalClear === "function") return originalClear();
                  return null;
                },
                elevateHomeGuideTarget(node?: unknown) {
                  (window as any).__homeGuidePageResolverElevateCalls =
                    Number((window as any).__homeGuidePageResolverElevateCalls || 0) + 1;
                  if (typeof originalElevate === "function") return originalElevate(node);
                  return null;
                },
                positionHomeGuidePanel() {
                  (window as any).__homeGuidePageResolverPositionCalls =
                    Number((window as any).__homeGuidePageResolverPositionCalls || 0) + 1;
                  if (typeof originalPosition === "function") return originalPosition();
                  return null;
                },
                isElementVisibleForGuide(node?: unknown) {
                  (window as any).__homeGuidePageResolverVisibleCalls =
                    Number((window as any).__homeGuidePageResolverVisibleCalls || 0) + 1;
                  return typeof originalVisible === "function" ? !!originalVisible(node) : false;
                },
                showHomeGuideDoneNotice() {
                  (window as any).__homeGuidePageResolverDoneCalls =
                    Number((window as any).__homeGuidePageResolverDoneCalls || 0) + 1;
                  if (typeof originalDone === "function") return originalDone();
                  return null;
                },
                finishHomeGuide(markSeen?: unknown, options?: unknown) {
                  (window as any).__homeGuidePageResolverFinishCalls =
                    Number((window as any).__homeGuidePageResolverFinishCalls || 0) + 1;
                  if (typeof originalFinish === "function") return originalFinish(markSeen, options);
                  return null;
                },
                showHomeGuideStep(index?: unknown) {
                  (window as any).__homeGuidePageResolverShowStepCalls =
                    Number((window as any).__homeGuidePageResolverShowStepCalls || 0) + 1;
                  if (typeof originalShowStep === "function") return originalShowStep(index);
                  return null;
                },
                startHomeGuide(options?: unknown) {
                  (window as any).__homeGuidePageResolverStartCalls =
                    Number((window as any).__homeGuidePageResolverStartCalls || 0) + 1;
                  if (typeof originalStart === "function") return originalStart(options);
                  return null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreHomeGuidePageHostRuntime", {
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
    await page.waitForTimeout(260);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreHomeGuidePageHostRuntime;
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal === "function") {
        openSettingsModal();
        const toggle = document.getElementById("home-guide-toggle") as HTMLInputElement | null;
        if (toggle) {
          toggle.checked = true;
          toggle.dispatchEvent(new Event("change", { bubbles: true }));
        }
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
      }

      return {
        hasRuntime: !!runtime && typeof runtime.createHomeGuidePageResolvers === "function",
        createCallCount: Number((window as any).__homeGuidePageResolverCreateCalls || 0),
        isHomeCallCount: Number((window as any).__homeGuidePageResolverIsHomeCalls || 0),
        getStepsCallCount: Number((window as any).__homeGuidePageResolverStepsCalls || 0),
        ensureCallCount: Number((window as any).__homeGuidePageResolverEnsureCalls || 0),
        clearCallCount: Number((window as any).__homeGuidePageResolverClearCalls || 0),
        elevateCallCount: Number((window as any).__homeGuidePageResolverElevateCalls || 0),
        positionCallCount: Number((window as any).__homeGuidePageResolverPositionCalls || 0),
        visibleCallCount: Number((window as any).__homeGuidePageResolverVisibleCalls || 0),
        doneCallCount: Number((window as any).__homeGuidePageResolverDoneCalls || 0),
        finishCallCount: Number((window as any).__homeGuidePageResolverFinishCalls || 0),
        showStepCallCount: Number((window as any).__homeGuidePageResolverShowStepCalls || 0),
        startCallCount: Number((window as any).__homeGuidePageResolverStartCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.isHomeCallCount).toBeGreaterThan(0);
    expect(snapshot.getStepsCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.ensureCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.clearCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.elevateCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.positionCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.visibleCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.doneCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.finishCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.showStepCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.startCallCount).toBeGreaterThanOrEqual(0);
  });

  test("application handle_undo delegates to undo-action runtime", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreUndoActionRuntime;
      const handleUndo = (window as any).handle_undo;
      if (!runtime || typeof runtime.tryTriggerUndo !== "function") {
        return { hasRuntime: false, hasCapabilityApi: false, hasHandler: typeof handleUndo === "function" };
      }
      if (typeof handleUndo !== "function") {
        return {
          hasRuntime: true,
          hasCapabilityApi: Boolean(
            typeof runtime.resolveUndoModeIdFromBody === "function" &&
            typeof runtime.resolveUndoModeId === "function" &&
            typeof runtime.isUndoCapableMode === "function" &&
            typeof runtime.isUndoInteractionEnabled === "function"
          ),
          hasHandler: false
        };
      }

      const originalManager = (window as any).game_manager;
      const originalTryTriggerUndo = runtime.tryTriggerUndo;
      let callCount = 0;
      let usedDirection: number | null = null;
      let moveDirection: number | null = null;
      const fakeManager = {
        isUndoInteractionEnabled() {
          return true;
        },
        move(direction: number) {
          moveDirection = direction;
        }
      };

      runtime.tryTriggerUndo = function (manager: any, direction: number) {
        callCount += 1;
        usedDirection = direction;
        return originalTryTriggerUndo(manager, direction);
      };
      (window as any).game_manager = fakeManager;

      try {
        handleUndo();
        return {
          hasRuntime: true,
          hasCapabilityApi: Boolean(
            typeof runtime.resolveUndoModeIdFromBody === "function" &&
            typeof runtime.resolveUndoModeId === "function" &&
            typeof runtime.isUndoCapableMode === "function" &&
            typeof runtime.isUndoInteractionEnabled === "function"
          ),
          hasHandler: true,
          callCount,
          usedDirection,
          moveDirection
        };
      } finally {
        runtime.tryTriggerUndo = originalTryTriggerUndo;
        (window as any).game_manager = originalManager;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasCapabilityApi).toBe(true);
    expect(snapshot.hasHandler).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.usedDirection).toBe(-1);
    expect(snapshot.moveDirection).toBe(-1);
  });

  test("application startup delegates to home startup host runtime", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__homeRuntimeContractCallCount = 0;
      (window as any).__homeStartupHostCallCount = 0;
      (window as any).__homeModeContextCallCount = 0;

      const runtimeContractTarget: Record<string, unknown> = {};
      (window as any).CoreHomeRuntimeContractRuntime = new Proxy(runtimeContractTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeRuntimeContractCallCount =
                Number((window as any).__homeRuntimeContractCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupHostTarget: Record<string, unknown> = {};
      (window as any).CoreHomeStartupHostRuntime = new Proxy(startupHostTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeStartupFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeStartupHostCallCount =
                Number((window as any).__homeStartupHostCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const homeModeRuntimeTarget: Record<string, unknown> = {};
      (window as any).CoreHomeModeRuntime = new Proxy(homeModeRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeModeSelectionFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeModeContextCallCount =
                Number((window as any).__homeModeContextCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
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
      const cfg = (window as any).GAME_MODE_CONFIG;
      return {
        hasHomeRuntimeContractRuntime: Boolean(
          (window as any).CoreHomeRuntimeContractRuntime?.resolveHomeRuntimeContracts
        ),
        hasHomeStartupHostRuntime: Boolean(
          (window as any).CoreHomeStartupHostRuntime?.resolveHomeStartupFromContext
        ),
        hasHomeModeContextRuntime: Boolean(
          (window as any).CoreHomeModeRuntime?.resolveHomeModeSelectionFromContext
        ),
        homeRuntimeContractCallCount: Number((window as any).__homeRuntimeContractCallCount || 0),
        homeStartupHostCallCount: Number((window as any).__homeStartupHostCallCount || 0),
        homeModeContextCallCount: Number((window as any).__homeModeContextCallCount || 0),
        modeKey: cfg && typeof cfg.key === "string" ? cfg.key : null
      };
    });

    expect(snapshot.hasHomeRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasHomeStartupHostRuntime).toBe(true);
    expect(snapshot.hasHomeModeContextRuntime).toBe(true);
    expect(snapshot.homeRuntimeContractCallCount).toBeGreaterThan(0);
    expect(snapshot.homeStartupHostCallCount).toBeGreaterThan(0);
    expect(snapshot.homeModeContextCallCount).toBeGreaterThan(0);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
  });

  test("practice transfer flow delegates transfer navigation plan to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CorePracticeTransferRuntime;
      const pageHostRuntime = (window as any).CorePracticeTransferPageHostRuntime;
      const openPracticeBoardFromCurrent = (window as any).openPracticeBoardFromCurrent;
      if (
        !runtime ||
        typeof runtime.createPracticeTransferNavigationPlan !== "function" ||
        typeof runtime.resolvePracticeTransferPrecheck !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.createPracticeTransferPageActionResolvers !== "function" ||
        typeof pageHostRuntime.applyPracticeTransferPageAction !== "function" ||
        typeof pageHostRuntime.applyPracticeTransferPageActionFromContext !== "function"
      ) {
        return {
          hasRuntime: false,
          hasPageHostRuntime: false,
          hasOpenFn: typeof openPracticeBoardFromCurrent === "function"
        };
      }
      if (typeof openPracticeBoardFromCurrent !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasOpenFn: false };
      }

      const originalCreatePracticeTransferNavigationPlan = runtime.createPracticeTransferNavigationPlan;
      const originalResolvePracticeTransferPrecheck = runtime.resolvePracticeTransferPrecheck;
      const originalApplyPracticeTransferPageAction = pageHostRuntime.applyPracticeTransferPageAction;
      const originalApplyPracticeTransferPageActionFromContext =
        pageHostRuntime.applyPracticeTransferPageActionFromContext;
      const originalManager = (window as any).game_manager;
      const originalOpen = window.open;
      let createPlanCallCount = 0;
      let precheckCallCount = 0;
      let pageHostCallCount = 0;
      let pageHostContextCallCount = 0;
      let openedUrl = "";

      runtime.createPracticeTransferNavigationPlan = function (opts: any) {
        createPlanCallCount += 1;
        return originalCreatePracticeTransferNavigationPlan(opts);
      };
      runtime.resolvePracticeTransferPrecheck = function (opts: any) {
        precheckCallCount += 1;
        return originalResolvePracticeTransferPrecheck(opts);
      };
      pageHostRuntime.applyPracticeTransferPageAction = function (opts: any) {
        pageHostCallCount += 1;
        return originalApplyPracticeTransferPageAction(opts);
      };
      pageHostRuntime.applyPracticeTransferPageActionFromContext = function (opts: any) {
        pageHostContextCallCount += 1;
        return originalApplyPracticeTransferPageActionFromContext(opts);
      };
      (window as any).game_manager = {
        width: 4,
        height: 4,
        modeConfig: {
          ruleset: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        },
        getFinalBoardMatrix() {
          return [
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ];
        }
      };
      try {
        window.localStorage.setItem("practice_guide_shown_v2", "1");
      } catch (_err) {}
      window.open = function (url?: string | URL | undefined) {
        openedUrl = String(url || "");
        return null as any;
      };

      try {
        openPracticeBoardFromCurrent();
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasOpenFn: true,
          precheckCallCount,
          createPlanCallCount,
          pageHostCallCount,
          pageHostContextCallCount,
          openedUrl
        };
      } finally {
        runtime.createPracticeTransferNavigationPlan = originalCreatePracticeTransferNavigationPlan;
        runtime.resolvePracticeTransferPrecheck = originalResolvePracticeTransferPrecheck;
        pageHostRuntime.applyPracticeTransferPageAction = originalApplyPracticeTransferPageAction;
        pageHostRuntime.applyPracticeTransferPageActionFromContext =
          originalApplyPracticeTransferPageActionFromContext;
        (window as any).game_manager = originalManager;
        window.open = originalOpen;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasOpenFn).toBe(true);
    expect(snapshot.precheckCallCount).toBeGreaterThan(0);
    expect(snapshot.createPlanCallCount).toBeGreaterThan(0);
    expect(snapshot.pageHostCallCount).toBe(0);
    expect(snapshot.pageHostContextCallCount).toBeGreaterThan(0);
    expect(snapshot.openedUrl).toContain("Practice_board.html");
    expect(snapshot.openedUrl).toContain("practice_token=");
    expect(snapshot.openedUrl).toContain("practice_ruleset=pow2");
    expect(snapshot.openedUrl).toContain("practice_guide_seen=1");
  });


});

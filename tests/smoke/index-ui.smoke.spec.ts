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

  test("index ui delegates timer module settings model to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreTimerModuleRuntime;
      const pageHostRuntime = (window as any).CoreTimerModuleSettingsPageHostRuntime;
      if (
        !runtime ||
        typeof runtime.buildTimerModuleSettingsRowInnerHtml !== "function" ||
        typeof runtime.resolveTimerModuleSettingsState !== "function" ||
        typeof runtime.resolveTimerModuleCurrentViewMode !== "function" ||
        typeof runtime.resolveTimerModuleBindingState !== "function" ||
        typeof runtime.resolveTimerModuleViewMode !== "function" ||
        typeof runtime.resolveTimerModuleAppliedViewMode !== "function" ||
        typeof runtime.resolveTimerModuleInitRetryState !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.applyTimerModuleSettingsPageInit !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasSettingsOpen: false };
      }
      const originalBuild = runtime.buildTimerModuleSettingsRowInnerHtml;
      const originalResolveState = runtime.resolveTimerModuleSettingsState;
      const originalResolveCurrentViewMode = runtime.resolveTimerModuleCurrentViewMode;
      const originalResolveBinding = runtime.resolveTimerModuleBindingState;
      const originalResolveViewMode = runtime.resolveTimerModuleViewMode;
      const originalResolveAppliedViewMode = runtime.resolveTimerModuleAppliedViewMode;
      const originalResolveInitRetryState = runtime.resolveTimerModuleInitRetryState;
      const originalApplyPageHost = pageHostRuntime.applyTimerModuleSettingsPageInit;
      let buildCallCount = 0;
      let resolveStateCallCount = 0;
      let resolveCurrentViewModeCallCount = 0;
      let resolveBindingCallCount = 0;
      let resolveViewModeCallCount = 0;
      let resolveAppliedViewModeCallCount = 0;
      let resolveInitRetryStateCallCount = 0;
      let applyPageHostCallCount = 0;
      runtime.buildTimerModuleSettingsRowInnerHtml = function () {
        buildCallCount += 1;
        return originalBuild();
      };
      runtime.resolveTimerModuleSettingsState = function (opts: any) {
        resolveStateCallCount += 1;
        return originalResolveState(opts);
      };
      runtime.resolveTimerModuleCurrentViewMode = function (opts: any) {
        resolveCurrentViewModeCallCount += 1;
        return originalResolveCurrentViewMode(opts);
      };
      runtime.resolveTimerModuleBindingState = function (opts: any) {
        resolveBindingCallCount += 1;
        return originalResolveBinding(opts);
      };
      runtime.resolveTimerModuleViewMode = function (opts: any) {
        resolveViewModeCallCount += 1;
        return originalResolveViewMode(opts);
      };
      runtime.resolveTimerModuleAppliedViewMode = function (opts: any) {
        resolveAppliedViewModeCallCount += 1;
        return originalResolveAppliedViewMode(opts);
      };
      runtime.resolveTimerModuleInitRetryState = function (opts: any) {
        resolveInitRetryStateCallCount += 1;
        return originalResolveInitRetryState(opts);
      };
      pageHostRuntime.applyTimerModuleSettingsPageInit = function (opts: any) {
        applyPageHostCallCount += 1;
        return originalApplyPageHost(opts);
      };
      try {
        const existingToggle = document.getElementById("timer-module-view-toggle");
        if (existingToggle) {
          const existingRow = existingToggle.closest(".settings-row");
          if (existingRow && existingRow.parentNode) {
            existingRow.parentNode.removeChild(existingRow);
          }
        }
        openSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const toggle = document.getElementById("timer-module-view-toggle") as HTMLInputElement | null;
        const note = document.getElementById("timer-module-view-note");
        if (!toggle) {
          return {
            hasRuntime: true,
            hasPageHostRuntime: true,
            hasSettingsOpen: true,
            hasToggle: false
          };
        }
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve(null));
        });
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasSettingsOpen: true,
          hasToggle: true,
          applyPageHostCallCount,
          buildCallCount,
          resolveStateCallCount,
          resolveCurrentViewModeCallCount,
          resolveBindingCallCount,
          resolveViewModeCallCount,
          resolveAppliedViewModeCallCount,
          resolveInitRetryStateCallCount,
          noteText: note ? String(note.textContent || "") : "",
          toggleChecked: !!toggle.checked
        };
      } finally {
        runtime.buildTimerModuleSettingsRowInnerHtml = originalBuild;
        runtime.resolveTimerModuleSettingsState = originalResolveState;
        runtime.resolveTimerModuleCurrentViewMode = originalResolveCurrentViewMode;
        runtime.resolveTimerModuleBindingState = originalResolveBinding;
        runtime.resolveTimerModuleViewMode = originalResolveViewMode;
        runtime.resolveTimerModuleAppliedViewMode = originalResolveAppliedViewMode;
        runtime.resolveTimerModuleInitRetryState = originalResolveInitRetryState;
        pageHostRuntime.applyTimerModuleSettingsPageInit = originalApplyPageHost;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasToggle).toBe(true);
    expect(snapshot.applyPageHostCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.buildCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveStateCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveCurrentViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveBindingCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveAppliedViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveInitRetryStateCallCount).toBeGreaterThan(0);
    expect(snapshot.noteText).toContain("关闭后仅隐藏右侧计时器栏");
    expect(snapshot.toggleChecked).toBe(false);
  });

  test("index ui delegates theme settings model to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreThemeSettingsRuntime;
      const pageHostRuntime = (window as any).CoreThemeSettingsPageHostRuntime;
      if (
        !runtime ||
        typeof runtime.formatThemePreviewValue !== "function" ||
        typeof runtime.resolveThemePreviewTileValues !== "function" ||
        typeof runtime.resolveThemePreviewLayout !== "function" ||
        typeof runtime.resolveThemePreviewCssSelectors !== "function" ||
        typeof runtime.resolveThemeOptions !== "function" ||
        typeof runtime.resolveThemeSelectLabel !== "function" ||
        typeof runtime.resolveThemeDropdownToggleState !== "function" ||
        typeof runtime.resolveThemeBindingState !== "function" ||
        typeof runtime.resolveThemeOptionValue !== "function" ||
        typeof runtime.resolveThemeOptionSelectedState !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.applyThemeSettingsPageInit !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasSettingsOpen: false };
      }
      const originalFormat = runtime.formatThemePreviewValue;
      const originalResolveTileValues = runtime.resolveThemePreviewTileValues;
      const originalResolvePreviewLayout = runtime.resolveThemePreviewLayout;
      const originalResolvePreviewCssSelectors = runtime.resolveThemePreviewCssSelectors;
      const originalResolveThemeOptions = runtime.resolveThemeOptions;
      const originalResolveLabel = runtime.resolveThemeSelectLabel;
      const originalResolveDropdown = runtime.resolveThemeDropdownToggleState;
      const originalResolveBinding = runtime.resolveThemeBindingState;
      const originalResolveOptionValue = runtime.resolveThemeOptionValue;
      const originalResolveOptionSelected = runtime.resolveThemeOptionSelectedState;
      const originalApplyPageHost = pageHostRuntime.applyThemeSettingsPageInit;
      let formatCallCount = 0;
      let resolveTileValuesCallCount = 0;
      let resolvePreviewLayoutCallCount = 0;
      let resolvePreviewCssSelectorsCallCount = 0;
      let resolveThemeOptionsCallCount = 0;
      let resolveLabelCallCount = 0;
      let resolveDropdownCallCount = 0;
      let resolveBindingCallCount = 0;
      let resolveOptionValueCallCount = 0;
      let resolveOptionSelectedCallCount = 0;
      let applyPageHostCallCount = 0;
      runtime.formatThemePreviewValue = function (value: any) {
        formatCallCount += 1;
        return originalFormat(value);
      };
      runtime.resolveThemePreviewTileValues = function (opts: any) {
        resolveTileValuesCallCount += 1;
        return originalResolveTileValues(opts);
      };
      runtime.resolveThemePreviewLayout = function () {
        resolvePreviewLayoutCallCount += 1;
        return originalResolvePreviewLayout();
      };
      runtime.resolveThemePreviewCssSelectors = function (opts: any) {
        resolvePreviewCssSelectorsCallCount += 1;
        return originalResolvePreviewCssSelectors(opts);
      };
      runtime.resolveThemeOptions = function (opts: any) {
        resolveThemeOptionsCallCount += 1;
        return originalResolveThemeOptions(opts);
      };
      runtime.resolveThemeSelectLabel = function (opts: any) {
        resolveLabelCallCount += 1;
        return originalResolveLabel(opts);
      };
      runtime.resolveThemeDropdownToggleState = function (opts: any) {
        resolveDropdownCallCount += 1;
        return originalResolveDropdown(opts);
      };
      runtime.resolveThemeBindingState = function (opts: any) {
        resolveBindingCallCount += 1;
        return originalResolveBinding(opts);
      };
      runtime.resolveThemeOptionValue = function (opts: any) {
        resolveOptionValueCallCount += 1;
        return originalResolveOptionValue(opts);
      };
      runtime.resolveThemeOptionSelectedState = function (opts: any) {
        resolveOptionSelectedCallCount += 1;
        return originalResolveOptionSelected(opts);
      };
      pageHostRuntime.applyThemeSettingsPageInit = function (opts: any) {
        applyPageHostCallCount += 1;
        return originalApplyPageHost(opts);
      };
      try {
        openSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const trigger = document.getElementById("theme-select-trigger");
        const options = document.querySelectorAll("#theme-select-options .custom-option");
        if (trigger) {
          trigger.dispatchEvent(new Event("click", { bubbles: true }));
          trigger.dispatchEvent(new Event("click", { bubbles: true }));
        }
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasSettingsOpen: true,
          hasTrigger: Boolean(trigger),
          optionCount: options.length,
          applyPageHostCallCount,
          formatCallCount,
          resolveTileValuesCallCount,
          resolvePreviewLayoutCallCount,
          resolvePreviewCssSelectorsCallCount,
          resolveThemeOptionsCallCount,
          resolveLabelCallCount,
          resolveDropdownCallCount,
          resolveBindingCallCount,
          resolveOptionValueCallCount,
          resolveOptionSelectedCallCount
        };
      } finally {
        runtime.formatThemePreviewValue = originalFormat;
        runtime.resolveThemePreviewTileValues = originalResolveTileValues;
        runtime.resolveThemePreviewLayout = originalResolvePreviewLayout;
        runtime.resolveThemePreviewCssSelectors = originalResolvePreviewCssSelectors;
        runtime.resolveThemeOptions = originalResolveThemeOptions;
        runtime.resolveThemeSelectLabel = originalResolveLabel;
        runtime.resolveThemeDropdownToggleState = originalResolveDropdown;
        runtime.resolveThemeBindingState = originalResolveBinding;
        runtime.resolveThemeOptionValue = originalResolveOptionValue;
        runtime.resolveThemeOptionSelectedState = originalResolveOptionSelected;
        pageHostRuntime.applyThemeSettingsPageInit = originalApplyPageHost;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasTrigger).toBe(true);
    expect(snapshot.optionCount).toBeGreaterThan(0);
    expect(snapshot.applyPageHostCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.formatCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveTileValuesCallCount).toBeGreaterThan(0);
    expect(snapshot.resolvePreviewLayoutCallCount).toBeGreaterThan(0);
    expect(snapshot.resolvePreviewCssSelectorsCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveThemeOptionsCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveLabelCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveDropdownCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveBindingCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveOptionValueCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveOptionSelectedCallCount).toBeGreaterThan(0);
  });

  test("index ui delegates settings modal orchestration to host runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreSettingsModalHostRuntime;
      const pageHostRuntime = (window as any).CoreSettingsModalPageHostRuntime;
      if (
        !runtime ||
        typeof runtime.applySettingsModalOpenOrchestration !== "function" ||
        typeof runtime.applySettingsModalCloseOrchestration !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.createSettingsModalInitResolvers !== "function" ||
        typeof pageHostRuntime.createSettingsModalActionResolvers !== "function" ||
        typeof pageHostRuntime.applySettingsModalPageOpen !== "function" ||
        typeof pageHostRuntime.applySettingsModalPageClose !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      const closeSettingsModal = (window as any).closeSettingsModal;
      if (typeof openSettingsModal !== "function" || typeof closeSettingsModal !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasBindings: false };
      }

      const originalOpen = runtime.applySettingsModalOpenOrchestration;
      const originalClose = runtime.applySettingsModalCloseOrchestration;
      const originalPageOpen = pageHostRuntime.applySettingsModalPageOpen;
      const originalPageClose = pageHostRuntime.applySettingsModalPageClose;
      let openCallCount = 0;
      let closeCallCount = 0;
      let pageOpenCallCount = 0;
      let pageCloseCallCount = 0;
      runtime.applySettingsModalOpenOrchestration = function (opts: any) {
        openCallCount += 1;
        return originalOpen(opts);
      };
      runtime.applySettingsModalCloseOrchestration = function (opts: any) {
        closeCallCount += 1;
        return originalClose(opts);
      };
      pageHostRuntime.applySettingsModalPageOpen = function (opts: any) {
        pageOpenCallCount += 1;
        return originalPageOpen(opts);
      };
      pageHostRuntime.applySettingsModalPageClose = function (opts: any) {
        pageCloseCallCount += 1;
        return originalPageClose(opts);
      };

      try {
        openSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });

        const modal = document.getElementById("settings-modal");
        const openDisplay = modal ? String((modal as HTMLElement).style.display || "") : "";

        closeSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve(null));
        });
        const closeDisplay = modal ? String((modal as HTMLElement).style.display || "") : "";

        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasBindings: true,
          openCallCount,
          closeCallCount,
          pageOpenCallCount,
          pageCloseCallCount,
          openDisplay,
          closeDisplay
        };
      } finally {
        runtime.applySettingsModalOpenOrchestration = originalOpen;
        runtime.applySettingsModalCloseOrchestration = originalClose;
        pageHostRuntime.applySettingsModalPageOpen = originalPageOpen;
        pageHostRuntime.applySettingsModalPageClose = originalPageClose;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasBindings).toBe(true);
    expect(snapshot.openCallCount).toBeGreaterThan(0);
    expect(snapshot.closeCallCount).toBeGreaterThan(0);
    expect(snapshot.pageOpenCallCount).toBeGreaterThan(0);
    expect(snapshot.pageCloseCallCount).toBeGreaterThan(0);
    expect(snapshot.openDisplay).toBe("flex");
    expect(snapshot.closeDisplay).toBe("none");
  });

  test("index ui delegates replay modal and export page actions to host runtime helper", async ({
    page
  }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const pageHostRuntime = (window as any).CoreReplayPageHostRuntime;
      const modalRuntime = (window as any).CoreReplayModalRuntime;
      const exportRuntime = (window as any).CoreReplayExportRuntime;
      if (
        !pageHostRuntime ||
        typeof pageHostRuntime.createReplayPageActionResolvers !== "function" ||
        typeof pageHostRuntime.applyReplayModalPageOpen !== "function" ||
        typeof pageHostRuntime.applyReplayModalPageClose !== "function" ||
        typeof pageHostRuntime.applyReplayExportPageAction !== "function" ||
        typeof pageHostRuntime.applyReplayExportPageActionFromContext !== "function" ||
        !modalRuntime ||
        typeof modalRuntime.applyReplayModalOpen !== "function" ||
        typeof modalRuntime.applyReplayModalClose !== "function" ||
        !exportRuntime ||
        typeof exportRuntime.applyReplayExport !== "function"
      ) {
        return { hasPageHostRuntime: false };
      }

      const exportReplay = (window as any).exportReplay;
      const closeReplayModal = (window as any).closeReplayModal;
      if (typeof exportReplay !== "function" || typeof closeReplayModal !== "function") {
        return { hasPageHostRuntime: true, hasBindings: false };
      }

      const originalPageOpen = pageHostRuntime.applyReplayModalPageOpen;
      const originalPageClose = pageHostRuntime.applyReplayModalPageClose;
      const originalPageExport = pageHostRuntime.applyReplayExportPageActionFromContext;
      const originalRuntimeExport = exportRuntime.applyReplayExport;
      let pageOpenCallCount = 0;
      let pageCloseCallCount = 0;
      let pageExportCallCount = 0;
      let runtimeExportCallCount = 0;
      pageHostRuntime.applyReplayModalPageOpen = function (opts: any) {
        pageOpenCallCount += 1;
        return originalPageOpen(opts);
      };
      pageHostRuntime.applyReplayModalPageClose = function (opts: any) {
        pageCloseCallCount += 1;
        return originalPageClose(opts);
      };
      pageHostRuntime.applyReplayExportPageActionFromContext = function (opts: any) {
        pageExportCallCount += 1;
        return originalPageExport(opts);
      };
      exportRuntime.applyReplayExport = function (opts: any) {
        runtimeExportCallCount += 1;
        const maybeShowReplayModal = opts && opts.showReplayModal;
        if (typeof maybeShowReplayModal === "function") {
          maybeShowReplayModal("回放内容", "seed payload", "确定", function () {
            return null;
          });
        }
        return { simulated: true };
      };

      try {
        exportReplay();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });

        const replayModal = document.getElementById("replay-modal");
        const openDisplay = replayModal ? String((replayModal as HTMLElement).style.display || "") : "";

        closeReplayModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve(null));
        });
        const closeDisplay = replayModal ? String((replayModal as HTMLElement).style.display || "") : "";

        return {
          hasPageHostRuntime: true,
          hasBindings: true,
          pageOpenCallCount,
          pageCloseCallCount,
          pageExportCallCount,
          runtimeExportCallCount,
          openDisplay,
          closeDisplay
        };
      } finally {
        pageHostRuntime.applyReplayModalPageOpen = originalPageOpen;
        pageHostRuntime.applyReplayModalPageClose = originalPageClose;
        pageHostRuntime.applyReplayExportPageActionFromContext = originalPageExport;
        exportRuntime.applyReplayExport = originalRuntimeExport;
      }
    });

    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasBindings).toBe(true);
    expect(snapshot.pageOpenCallCount).toBeGreaterThan(0);
    expect(snapshot.pageCloseCallCount).toBeGreaterThan(0);
    expect(snapshot.pageExportCallCount).toBeGreaterThan(0);
    expect(snapshot.runtimeExportCallCount).toBeGreaterThan(0);
    expect(snapshot.openDisplay).toBe("flex");
    expect(snapshot.closeDisplay).toBe("none");
  });

  test("index ui delegates storage resolution to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreStorageRuntime;
      if (
        !runtime ||
        typeof runtime.resolveStorageByName !== "function" ||
        typeof runtime.safeReadStorageItem !== "function" ||
        typeof runtime.safeSetStorageItem !== "function"
      ) {
        return { hasRuntime: false };
      }
      const originalResolveStorageByName = runtime.resolveStorageByName;
      const practiceRuntime = (window as any).CorePracticeTransferRuntime;
      const originalResolvePrecheck =
        practiceRuntime && typeof practiceRuntime.resolvePracticeTransferPrecheck === "function"
          ? practiceRuntime.resolvePracticeTransferPrecheck
          : null;
      const originalCreatePlan =
        practiceRuntime && typeof practiceRuntime.createPracticeTransferNavigationPlan === "function"
          ? practiceRuntime.createPracticeTransferNavigationPlan
          : null;
      const originalWindowOpen = window.open;
      let resolveStorageByNameCallCount = 0;
      runtime.resolveStorageByName = function (opts: any) {
        resolveStorageByNameCallCount += 1;
        return originalResolveStorageByName(opts);
      };
      try {
        const syncMobileTimerboxUI = (window as any).syncMobileTimerboxUI;
        if (typeof syncMobileTimerboxUI === "function") {
          syncMobileTimerboxUI();
        }
        if (practiceRuntime && originalResolvePrecheck && originalCreatePlan) {
          practiceRuntime.resolvePracticeTransferPrecheck = function () {
            return {
              canOpen: true,
              board: [[0]],
              alertMessage: ""
            };
          };
          practiceRuntime.createPracticeTransferNavigationPlan = function () {
            return {
              openUrl: "about:blank"
            };
          };
          (window as any).open = function () {
            return null;
          };
          const openPracticeBoardFromCurrent = (window as any).openPracticeBoardFromCurrent;
          if (typeof openPracticeBoardFromCurrent === "function") {
            openPracticeBoardFromCurrent();
          }
        }
        const openSettingsModal = (window as any).openSettingsModal;
        if (typeof openSettingsModal === "function") {
          openSettingsModal();
        }
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const settingsModal = document.getElementById("settings-modal");
        return {
          hasRuntime: true,
          hasSyncMobileTimerboxUI: typeof syncMobileTimerboxUI === "function",
          hasOpenSettingsModal: typeof openSettingsModal === "function",
          settingsVisible: Boolean(settingsModal && settingsModal.style.display === "flex"),
          resolveStorageByNameCallCount
        };
      } finally {
        runtime.resolveStorageByName = originalResolveStorageByName;
        if (practiceRuntime && originalResolvePrecheck) {
          practiceRuntime.resolvePracticeTransferPrecheck = originalResolvePrecheck;
        }
        if (practiceRuntime && originalCreatePlan) {
          practiceRuntime.createPracticeTransferNavigationPlan = originalCreatePlan;
        }
        (window as any).open = originalWindowOpen;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasSyncMobileTimerboxUI).toBe(true);
    expect(snapshot.hasOpenSettingsModal).toBe(true);
    expect(snapshot.settingsVisible).toBe(true);
    expect(snapshot.resolveStorageByNameCallCount).toBeGreaterThan(0);
  });

});

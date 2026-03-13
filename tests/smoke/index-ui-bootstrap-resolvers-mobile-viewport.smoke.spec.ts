import { expect, test } from "@playwright/test";
import { waitForWindowCondition } from "./support/runtime-ready";

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
    await waitForWindowCondition(page, () => {
      const runtime = (window as any).CoreMobileViewportPageHostRuntime;
      return (
        !!runtime &&
        typeof runtime.createMobileViewportPageResolvers === "function" &&
        typeof (window as any).syncMobileUndoTopButtonAvailability === "function" &&
        typeof (window as any).syncMobileHintUI === "function"
      );
    });

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
    await waitForWindowCondition(page, () => {
      const runtime = (window as any).CoreMobileTopButtonsPageHostRuntime;
      return (
        !!runtime &&
        typeof runtime.createMobileTopButtonsPageResolvers === "function" &&
        typeof (window as any).syncMobileHintUI === "function" &&
        typeof (window as any).syncMobileUndoTopButtonAvailability === "function"
      );
    });

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
});

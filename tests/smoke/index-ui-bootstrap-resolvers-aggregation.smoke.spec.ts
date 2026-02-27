import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
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
});

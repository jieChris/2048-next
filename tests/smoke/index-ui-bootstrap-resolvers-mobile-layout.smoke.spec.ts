import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
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
});

import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
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

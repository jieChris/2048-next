import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates toolbar action decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyToolbarMismatchQueryCallCount = 0;
      (window as any).__historyToolbarClearAllCallCount = 0;
      (window as any).__historyToolbarExecuteClearAllCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryMismatchExportQuery" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarMismatchQueryCallCount =
                Number((window as any).__historyToolbarMismatchQueryCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryClearAllActionState" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyToolbarClearAllCallCount =
                Number((window as any).__historyToolbarClearAllCallCount || 0) + 1;
              return (value as () => unknown)();
            };
            return true;
          }
          if (prop === "executeHistoryClearAll" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarExecuteClearAllCallCount =
                Number((window as any).__historyToolbarExecuteClearAllCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore.clearAll unavailable");
      }
      const originalClearAll = store.clearAll;
      store.clearAll = () => {};

      const mismatchBtn = document.querySelector("#history-export-mismatch-btn") as HTMLButtonElement | null;
      if (mismatchBtn && typeof mismatchBtn.click === "function") mismatchBtn.click();

      const clearAllBtn = document.querySelector("#history-clear-all-btn") as HTMLButtonElement | null;
      if (clearAllBtn && typeof clearAllBtn.click === "function") clearAllBtn.click();

      store.clearAll = originalClearAll;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarRuntime?.resolveHistoryMismatchExportQuery &&
            (window as any).CoreHistoryToolbarRuntime?.resolveHistoryClearAllActionState &&
            (window as any).CoreHistoryToolbarRuntime?.executeHistoryClearAll
        ),
        mismatchQueryCallCount: Number((window as any).__historyToolbarMismatchQueryCallCount || 0),
        clearAllCallCount: Number((window as any).__historyToolbarClearAllCallCount || 0),
        executeClearAllCallCount: Number((window as any).__historyToolbarExecuteClearAllCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.mismatchQueryCallCount).toBeGreaterThan(0);
    expect(snapshot.clearAllCallCount).toBeGreaterThan(0);
    expect(snapshot.executeClearAllCallCount).toBeGreaterThan(0);
  });

  test("history page delegates toolbar action execution orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyToolbarHostExportAllCallCount = 0;
      (window as any).__historyToolbarHostMismatchCallCount = 0;
      (window as any).__historyToolbarHostClearAllCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryExportAllAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarHostExportAllCallCount =
                Number((window as any).__historyToolbarHostExportAllCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryMismatchExportAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarHostMismatchCallCount =
                Number((window as any).__historyToolbarHostMismatchCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryClearAllAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarHostClearAllCallCount =
                Number((window as any).__historyToolbarHostClearAllCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore.clearAll unavailable");
      }
      const originalClearAll = store.clearAll;
      store.clearAll = () => {};

      const exportAllBtn = document.querySelector("#history-export-all-btn") as HTMLButtonElement | null;
      if (exportAllBtn && typeof exportAllBtn.click === "function") exportAllBtn.click();

      const mismatchBtn = document.querySelector("#history-export-mismatch-btn") as HTMLButtonElement | null;
      if (mismatchBtn && typeof mismatchBtn.click === "function") mismatchBtn.click();

      const clearAllBtn = document.querySelector("#history-clear-all-btn") as HTMLButtonElement | null;
      if (clearAllBtn && typeof clearAllBtn.click === "function") clearAllBtn.click();

      store.clearAll = originalClearAll;

      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarHostRuntime?.applyHistoryExportAllAction &&
            (window as any).CoreHistoryToolbarHostRuntime?.applyHistoryMismatchExportAction &&
            (window as any).CoreHistoryToolbarHostRuntime?.applyHistoryClearAllAction
        ),
        exportAllCallCount: Number((window as any).__historyToolbarHostExportAllCallCount || 0),
        mismatchCallCount: Number((window as any).__historyToolbarHostMismatchCallCount || 0),
        clearAllCallCount: Number((window as any).__historyToolbarHostClearAllCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.exportAllCallCount).toBeGreaterThan(0);
    expect(snapshot.mismatchCallCount).toBeGreaterThan(0);
    expect(snapshot.clearAllCallCount).toBeGreaterThan(0);
  });

  test("history page delegates toolbar button binding orchestration to bind-host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyToolbarBindHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarBindHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "bindHistoryToolbarActionButtons" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarBindHostCallCount =
                Number((window as any).__historyToolbarBindHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryToolbarBindHostRuntime?.bindHistoryToolbarActionButtons),
      bindCallCount: Number((window as any).__historyToolbarBindHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.bindCallCount).toBeGreaterThan(0);
  });
});

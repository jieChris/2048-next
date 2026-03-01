import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates query assembly to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyApplyFilterCallCount = 0;
      (window as any).__historyListQueryCallCount = 0;
      (window as any).__historyListResultSourceCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryQueryRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryFilterState" && typeof value === "function") {
            proxyTarget[prop] = function (targetState: unknown, input: unknown) {
              (window as any).__historyApplyFilterCallCount =
                Number((window as any).__historyApplyFilterCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(targetState, input);
            };
            return true;
          }
          if (prop === "resolveHistoryListQuery" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyListQueryCallCount =
                Number((window as any).__historyListQueryCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryListResultSource" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyListResultSourceCallCount =
                Number((window as any).__historyListResultSourceCallCount || 0) + 1;
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryQueryRuntime?.applyHistoryFilterState) &&
        Boolean((window as any).CoreHistoryQueryRuntime?.resolveHistoryListQuery) &&
        Boolean((window as any).CoreHistoryQueryRuntime?.resolveHistoryListResultSource),
      applyFilterCallCount: Number((window as any).__historyApplyFilterCallCount || 0),
      listQueryCallCount: Number((window as any).__historyListQueryCallCount || 0),
      listResultSourceCallCount: Number((window as any).__historyListResultSourceCallCount || 0),
      hasSummaryText: (document.querySelector("#history-summary")?.textContent || "").trim().length > 0
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.applyFilterCallCount).toBeGreaterThan(0);
    expect(snapshot.listQueryCallCount).toBeGreaterThan(0);
    expect(snapshot.listResultSourceCallCount).toBeGreaterThan(0);
    expect(snapshot.hasSummaryText).toBe(true);
  });

  test("history page delegates load pipeline orchestration to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyLoadPipelineCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryLoadRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryLoadPipeline" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyLoadPipelineCallCount =
                Number((window as any).__historyLoadPipelineCallCount || 0) + 1;
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryLoadRuntime?.resolveHistoryLoadPipeline),
      loadPipelineCallCount: Number((window as any).__historyLoadPipelineCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.loadPipelineCallCount).toBeGreaterThan(0);
  });

  test("history page delegates load render orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyLoadHostCallCount = 0;
      (window as any).__historyLoadHostWithPagerCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryLoadHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryLoadAndRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyLoadHostCallCount =
                Number((window as any).__historyLoadHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryLoadWithPager" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyLoadHostWithPagerCallCount =
                Number((window as any).__historyLoadHostWithPagerCallCount || 0) + 1;
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryLoadHostRuntime?.applyHistoryLoadAndRender) &&
        Boolean((window as any).CoreHistoryLoadHostRuntime?.applyHistoryPagerButtonState) &&
        Boolean((window as any).CoreHistoryLoadHostRuntime?.applyHistoryLoadWithPager),
      loadHostCallCount: Number((window as any).__historyLoadHostCallCount || 0),
      loadWithPagerCallCount: Number((window as any).__historyLoadHostWithPagerCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.loadHostCallCount).toBe(0);
    expect(snapshot.loadWithPagerCallCount).toBeGreaterThan(0);
  });

  test("history page delegates status and summary view apply to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyViewHostStatusCallCount = 0;
      (window as any).__historyViewHostSummaryCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryViewHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryStatus" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyViewHostStatusCallCount =
                Number((window as any).__historyViewHostStatusCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistorySummary" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyViewHostSummaryCallCount =
                Number((window as any).__historyViewHostSummaryCallCount || 0) + 1;
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryViewHostRuntime?.applyHistoryStatus) &&
        Boolean((window as any).CoreHistoryViewHostRuntime?.applyHistorySummary),
      statusCallCount: Number((window as any).__historyViewHostStatusCallCount || 0),
      summaryCallCount: Number((window as any).__historyViewHostSummaryCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.statusCallCount).toBeGreaterThan(0);
    expect(snapshot.summaryCallCount).toBeGreaterThan(0);
  });
});

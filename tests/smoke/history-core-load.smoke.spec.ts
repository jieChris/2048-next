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

  test("history page captures burn-in thresholds through filter host inputs", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyApplyFilterLastInput = null;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryQueryRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryFilterState" && typeof value === "function") {
            proxyTarget[prop] = function (targetState: unknown, input: unknown) {
              (window as any).__historyApplyFilterLastInput = input;
              return (value as (a: unknown, b: unknown) => unknown)(targetState, input);
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

    await page.fill("#history-burnin-min-comparable", "40");
    await page.fill("#history-burnin-max-mismatch-rate", "0.5");
    await page.click("#history-load-btn");
    await page.waitForTimeout(120);

    const snapshot = await page.evaluate(() => {
      const payload = (window as any).__historyApplyFilterLastInput || {};
      return {
        minComparableRaw: (payload as Record<string, unknown>).minComparableRaw,
        maxMismatchRateRaw: (payload as Record<string, unknown>).maxMismatchRateRaw
      };
    });

    expect(snapshot.minComparableRaw).toBe("40");
    expect(snapshot.maxMismatchRateRaw).toBe("0.5");
  });

  test("history page persists filter snapshot to storage on reload", async ({ page }) => {
    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    await page.fill("#history-keyword", "persist-keyword");
    await page.selectOption("#history-sort", "score_desc");
    await page.selectOption("#history-adapter-filter", "mismatch");
    await page.selectOption("#history-burnin-window", "500");
    await page.selectOption("#history-sustained-window", "4");
    await page.fill("#history-burnin-min-comparable", "42");
    await page.fill("#history-burnin-max-mismatch-rate", "0.6");
    await page.click("#history-load-btn");
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const raw = window.localStorage.getItem("history_filter_state_v1");
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (_error) {
        return { __parseError: true };
      }
    });

    expect(snapshot).not.toBeNull();
    expect((snapshot as Record<string, unknown>).__parseError).not.toBe(true);
    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      filter: {
        keyword: "persist-keyword",
        sortBy: "score_desc",
        adapterParityFilter: "mismatch",
        burnInWindow: "500",
        sustainedWindows: "4",
        burnInMinComparable: "42",
        burnInMaxMismatchRate: "0.6"
      }
    });
  });

  test("history page clears persisted filter snapshot when filter returns to defaults", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "history_filter_state_v1",
        JSON.stringify({
          schemaVersion: 1,
          filter: {
            keyword: "seeded-keyword",
            sortBy: "score_desc",
            adapterParityFilter: "mismatch",
            burnInWindow: "500",
            sustainedWindows: "4",
            burnInMinComparable: "42",
            burnInMaxMismatchRate: "0.6"
          }
        })
      );
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    await page.fill("#history-keyword", "");
    await page.selectOption("#history-sort", "ended_desc");
    await page.selectOption("#history-adapter-filter", "all");
    await page.selectOption("#history-burnin-window", "200");
    await page.selectOption("#history-sustained-window", "3");
    await page.fill("#history-burnin-min-comparable", "50");
    await page.fill("#history-burnin-max-mismatch-rate", "1");
    await page.click("#history-load-btn");
    await page.waitForTimeout(200);

    const persistedRaw = await page.evaluate(() => window.localStorage.getItem("history_filter_state_v1"));
    expect(persistedRaw).toBeNull();
  });

  test("history page restores persisted filter snapshot on startup", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "history_filter_state_v1",
        JSON.stringify({
          keyword: "restored-keyword",
          sortBy: "score_desc",
          adapterParityFilter: "mismatch",
          burnInWindow: "500",
          sustainedWindows: "4",
          burnInMinComparable: "44",
          burnInMaxMismatchRate: "0.4"
        })
      );
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      keyword: (document.querySelector("#history-keyword") as HTMLInputElement | null)?.value || "",
      sortBy: (document.querySelector("#history-sort") as HTMLSelectElement | null)?.value || "",
      adapterParityFilter:
        (document.querySelector("#history-adapter-filter") as HTMLSelectElement | null)?.value || "",
      burnInWindow:
        (document.querySelector("#history-burnin-window") as HTMLSelectElement | null)?.value || "",
      sustainedWindows:
        (document.querySelector("#history-sustained-window") as HTMLSelectElement | null)?.value || "",
      burnInMinComparable:
        (document.querySelector("#history-burnin-min-comparable") as HTMLInputElement | null)?.value || "",
      burnInMaxMismatchRate:
        (document.querySelector("#history-burnin-max-mismatch-rate") as HTMLInputElement | null)?.value || ""
    }));

    expect(snapshot).toEqual({
      keyword: "restored-keyword",
      sortBy: "score_desc",
      adapterParityFilter: "mismatch",
      burnInWindow: "500",
      sustainedWindows: "4",
      burnInMinComparable: "44",
      burnInMaxMismatchRate: "0.4"
    });
  });

  test("history page restores schema-wrapped persisted filter snapshot on startup", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "history_filter_state_v1",
        JSON.stringify({
          schemaVersion: 1,
          filter: {
            keyword: "restored-schema-keyword",
            sortBy: "score_desc",
            adapterParityFilter: "match",
            burnInWindow: "100",
            sustainedWindows: "2",
            burnInMinComparable: "60",
            burnInMaxMismatchRate: "0.8"
          }
        })
      );
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      keyword: (document.querySelector("#history-keyword") as HTMLInputElement | null)?.value || "",
      sortBy: (document.querySelector("#history-sort") as HTMLSelectElement | null)?.value || "",
      adapterParityFilter:
        (document.querySelector("#history-adapter-filter") as HTMLSelectElement | null)?.value || "",
      burnInWindow:
        (document.querySelector("#history-burnin-window") as HTMLSelectElement | null)?.value || "",
      sustainedWindows:
        (document.querySelector("#history-sustained-window") as HTMLSelectElement | null)?.value || "",
      burnInMinComparable:
        (document.querySelector("#history-burnin-min-comparable") as HTMLInputElement | null)?.value || "",
      burnInMaxMismatchRate:
        (document.querySelector("#history-burnin-max-mismatch-rate") as HTMLInputElement | null)?.value || ""
    }));

    expect(snapshot).toEqual({
      keyword: "restored-schema-keyword",
      sortBy: "score_desc",
      adapterParityFilter: "match",
      burnInWindow: "100",
      sustainedWindows: "2",
      burnInMinComparable: "60",
      burnInMaxMismatchRate: "0.8"
    });
  });

  test("history page ignores malformed persisted filter snapshot", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("history_filter_state_v1", "{bad-json");
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      keyword: (document.querySelector("#history-keyword") as HTMLInputElement | null)?.value || "",
      sortBy: (document.querySelector("#history-sort") as HTMLSelectElement | null)?.value || "",
      adapterParityFilter:
        (document.querySelector("#history-adapter-filter") as HTMLSelectElement | null)?.value || "",
      burnInWindow:
        (document.querySelector("#history-burnin-window") as HTMLSelectElement | null)?.value || "",
      sustainedWindows:
        (document.querySelector("#history-sustained-window") as HTMLSelectElement | null)?.value || "",
      burnInMinComparable:
        (document.querySelector("#history-burnin-min-comparable") as HTMLInputElement | null)?.value || "",
      burnInMaxMismatchRate:
        (document.querySelector("#history-burnin-max-mismatch-rate") as HTMLInputElement | null)?.value || ""
    }));

    expect(snapshot).toEqual({
      keyword: "",
      sortBy: "ended_desc",
      adapterParityFilter: "all",
      burnInWindow: "200",
      sustainedWindows: "3",
      burnInMinComparable: "50",
      burnInMaxMismatchRate: "1"
    });
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

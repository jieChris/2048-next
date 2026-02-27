import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates summary text modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historySummaryCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistorySummaryRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistorySummaryText" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historySummaryCallCount =
                Number((window as any).__historySummaryCallCount || 0) + 1;
              return (value as (state: unknown) => unknown)(input);
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
      hasRuntime: Boolean((window as any).CoreHistorySummaryRuntime?.resolveHistorySummaryText),
      summaryCallCount: Number((window as any).__historySummaryCallCount || 0),
      summaryText: (document.querySelector("#history-summary")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.summaryCallCount).toBeGreaterThan(0);
    expect(snapshot.summaryText).toContain("诊断筛选:");
  });

  test("history page delegates status display modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyStatusDisplayCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryStatusRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryStatusDisplayState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyStatusDisplayCallCount =
                Number((window as any).__historyStatusDisplayCallCount || 0) + 1;
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
      hasRuntime: Boolean((window as any).CoreHistoryStatusRuntime?.resolveHistoryStatusDisplayState),
      statusCallCount: Number((window as any).__historyStatusDisplayCallCount || 0),
      statusText: (document.querySelector("#history-status")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.statusCallCount).toBeGreaterThan(0);
    expect(snapshot.statusText).toBe("");
  });
});

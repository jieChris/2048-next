import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates pager and keyword trigger decisions to toolbar-events runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyToolbarPrevPageCallCount = 0;
      (window as any).__historyToolbarNextPageCallCount = 0;
      (window as any).__historyToolbarKeywordCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarEventsRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryPrevPageState" && typeof value === "function") {
            proxyTarget[prop] = function (pageNo: unknown) {
              (window as any).__historyToolbarPrevPageCallCount =
                Number((window as any).__historyToolbarPrevPageCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(pageNo);
            };
            return true;
          }
          if (prop === "resolveHistoryNextPageState" && typeof value === "function") {
            proxyTarget[prop] = function (pageNo: unknown) {
              (window as any).__historyToolbarNextPageCallCount =
                Number((window as any).__historyToolbarNextPageCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(pageNo);
            };
            return true;
          }
          if (prop === "shouldHistoryKeywordTriggerReload" && typeof value === "function") {
            proxyTarget[prop] = function (key: unknown) {
              (window as any).__historyToolbarKeywordCallCount =
                Number((window as any).__historyToolbarKeywordCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(key);
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
      const nextBtn = document.querySelector("#history-next-page") as HTMLButtonElement | null;
      if (nextBtn) nextBtn.disabled = false;
      if (nextBtn && typeof nextBtn.click === "function") nextBtn.click();

      const prevBtn = document.querySelector("#history-prev-page") as HTMLButtonElement | null;
      if (prevBtn) prevBtn.disabled = false;
      if (prevBtn && typeof prevBtn.click === "function") prevBtn.click();

      const keyword = document.querySelector("#history-keyword") as HTMLInputElement | null;
      if (keyword) {
        const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
        keyword.dispatchEvent(event);
      }

      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarEventsRuntime?.resolveHistoryPrevPageState &&
            (window as any).CoreHistoryToolbarEventsRuntime?.resolveHistoryNextPageState &&
            (window as any).CoreHistoryToolbarEventsRuntime?.shouldHistoryKeywordTriggerReload
        ),
        prevPageCallCount: Number((window as any).__historyToolbarPrevPageCallCount || 0),
        nextPageCallCount: Number((window as any).__historyToolbarNextPageCallCount || 0),
        keywordCallCount: Number((window as any).__historyToolbarKeywordCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.prevPageCallCount).toBeGreaterThan(0);
    expect(snapshot.nextPageCallCount).toBeGreaterThan(0);
    expect(snapshot.keywordCallCount).toBeGreaterThan(0);
  });

  test(
    "history page delegates pager/filter event binding orchestration to toolbar-events host runtime helper",
    async ({ page }) => {
      await page.addInitScript(() => {
        (window as any).__historyToolbarEventsHostBindCallCount = 0;
        const target: Record<string, unknown> = {};
        (window as any).CoreHistoryToolbarEventsHostRuntime = new Proxy(target, {
          set(proxyTarget, prop, value) {
            if (prop === "bindHistoryToolbarPagerAndFilterEvents" && typeof value === "function") {
              proxyTarget[prop] = function (input: unknown) {
                (window as any).__historyToolbarEventsHostBindCallCount =
                  Number((window as any).__historyToolbarEventsHostBindCallCount || 0) + 1;
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
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarEventsHostRuntime
            ?.bindHistoryToolbarPagerAndFilterEvents
        ),
        bindCallCount: Number((window as any).__historyToolbarEventsHostBindCallCount || 0)
      }));

      expect(snapshot.hasRuntime).toBe(true);
      expect(snapshot.bindCallCount).toBeGreaterThan(0);
    }
  );
});

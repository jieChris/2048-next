import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates burn-in panel orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBurnInHostRenderCallCount = 0;
      (window as any).__historyBurnInHostClickCallCount = 0;
      (window as any).__historyBurnInHostApplyRenderCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBurnInHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryBurnInPanelRenderState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInHostRenderCallCount =
                Number((window as any).__historyBurnInHostRenderCallCount || 0) + 1;
              (value as (arg: unknown) => unknown)(input);
              return {
                panelHtml:
                  "<div class='history-burnin-actions'>" +
                  "<button class='replay-button history-burnin-focus-mismatch'>仅看不一致</button>" +
                  "</div>",
                shouldBindMismatchAction: true
              };
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInMismatchFocusClickState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInHostClickCallCount =
                Number((window as any).__historyBurnInHostClickCallCount || 0) + 1;
              (value as (arg: unknown) => unknown)(input);
              return {
                shouldApply: true,
                nextAdapterParityFilter: "mismatch",
                nextSelectValue: "mismatch",
                shouldReload: false,
                resetPage: true
              };
            };
            return true;
          }
          if (prop === "applyHistoryBurnInSummaryRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInHostApplyRenderCallCount =
                Number((window as any).__historyBurnInHostApplyRenderCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
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
    await page.waitForFunction(
      () => Number((window as any).__historyBurnInHostApplyRenderCallCount || 0) > 0,
      undefined,
      { timeout: 5000 }
    );

    const snapshot = await page.evaluate(() => {
      const actionBtn = document.querySelector(".history-burnin-focus-mismatch") as HTMLButtonElement | null;
      if (actionBtn && typeof actionBtn.click === "function") actionBtn.click();
      return {
        hasRuntime:
          Boolean((window as any).CoreHistoryBurnInHostRuntime?.resolveHistoryBurnInPanelRenderState) &&
          Boolean((window as any).CoreHistoryBurnInHostRuntime?.resolveHistoryBurnInMismatchFocusClickState) &&
          Boolean((window as any).CoreHistoryBurnInHostRuntime?.applyHistoryBurnInSummaryRender),
        applyRenderCallCount: Number((window as any).__historyBurnInHostApplyRenderCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.applyRenderCallCount).toBeGreaterThan(0);
  });

  test("history page delegates startup orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyStartupHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryStartupHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryStartup" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyStartupHostCallCount =
                Number((window as any).__historyStartupHostCallCount || 0) + 1;
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
    await page.waitForFunction(
      () => Number((window as any).__historyStartupHostCallCount || 0) > 0,
      undefined,
      { timeout: 5000 }
    );

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryStartupHostRuntime?.applyHistoryStartup),
      startupHostCallCount: Number((window as any).__historyStartupHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.startupHostCallCount).toBeGreaterThan(0);
  });
});

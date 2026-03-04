import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates filter input capture to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyFilterHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryFilterHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryFilterStateFromInputs" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyFilterHostCallCount =
                Number((window as any).__historyFilterHostCallCount || 0) + 1;
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
      hasRuntime: Boolean((window as any).CoreHistoryFilterHostRuntime?.applyHistoryFilterStateFromInputs),
      callCount: Number((window as any).__historyFilterHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
  });

  test("history page delegates burn-in/canary/list panel orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyPanelHostBurnInCallCount = 0;
      (window as any).__historyPanelHostCanaryCallCount = 0;
      (window as any).__historyPanelHostListCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryPanelHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryBurnInPanelRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyPanelHostBurnInCallCount =
                Number((window as any).__historyPanelHostBurnInCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryCanaryPolicyPanelRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyPanelHostCanaryCallCount =
                Number((window as any).__historyPanelHostCanaryCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryRecordListPanelRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyPanelHostListCallCount =
                Number((window as any).__historyPanelHostListCallCount || 0) + 1;
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
        Boolean((window as any).CoreHistoryPanelHostRuntime?.applyHistoryBurnInPanelRender) &&
        Boolean((window as any).CoreHistoryPanelHostRuntime?.applyHistoryCanaryPolicyPanelRender) &&
        Boolean((window as any).CoreHistoryPanelHostRuntime?.applyHistoryRecordListPanelRender),
      burnInCallCount: Number((window as any).__historyPanelHostBurnInCallCount || 0),
      canaryCallCount: Number((window as any).__historyPanelHostCanaryCallCount || 0),
      listCallCount: Number((window as any).__historyPanelHostListCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.burnInCallCount).toBeGreaterThan(0);
    expect(snapshot.canaryCallCount).toBeGreaterThan(0);
    expect(snapshot.listCallCount).toBeGreaterThan(0);
  });

  test("history page delegates mode-filter init and control bindings to controls host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyControlsHostInitCallCount = 0;
      (window as any).__historyControlsHostThresholdInitCallCount = 0;
      (window as any).__historyControlsHostBindCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryControlsHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryModeFilterInitialization" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyControlsHostInitCallCount =
                Number((window as any).__historyControlsHostInitCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryBurnInThresholdInitialization" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyControlsHostThresholdInitCallCount =
                Number((window as any).__historyControlsHostThresholdInitCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "bindHistoryControls" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyControlsHostBindCallCount =
                Number((window as any).__historyControlsHostBindCallCount || 0) + 1;
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
        Boolean((window as any).CoreHistoryControlsHostRuntime?.applyHistoryModeFilterInitialization) &&
        Boolean((window as any).CoreHistoryControlsHostRuntime?.applyHistoryBurnInThresholdInitialization) &&
        Boolean((window as any).CoreHistoryControlsHostRuntime?.bindHistoryControls),
      initCallCount: Number((window as any).__historyControlsHostInitCallCount || 0),
      thresholdInitCallCount: Number((window as any).__historyControlsHostThresholdInitCallCount || 0),
      bindCallCount: Number((window as any).__historyControlsHostBindCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.initCallCount).toBeGreaterThan(0);
    expect(snapshot.thresholdInitCallCount).toBeGreaterThan(0);
    expect(snapshot.bindCallCount).toBeGreaterThan(0);
  });

  test("history page delegates load entry orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyLoadEntryHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryLoadEntryHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryLoadEntry" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyLoadEntryHostCallCount =
                Number((window as any).__historyLoadEntryHostCallCount || 0) + 1;
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
      hasRuntime: Boolean((window as any).CoreHistoryLoadEntryHostRuntime?.applyHistoryLoadEntry),
      callCount: Number((window as any).__historyLoadEntryHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
  });
});

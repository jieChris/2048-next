import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates canary policy decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanarySnapshotCallCount = 0;
      (window as any).__historyCanaryStoredKeysCallCount = 0;
      (window as any).__historyCanaryActionPlanCallCount = 0;
      (window as any).__historyCanaryActionNoticeCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryPolicyRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveCanaryPolicySnapshot" && typeof value === "function") {
            proxyTarget[prop] = function (opts: unknown) {
              (window as any).__historyCanarySnapshotCallCount =
                Number((window as any).__historyCanarySnapshotCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "resolveStoredPolicyKeys" && typeof value === "function") {
            proxyTarget[prop] = function (opts: unknown) {
              (window as any).__historyCanaryStoredKeysCallCount =
                Number((window as any).__historyCanaryStoredKeysCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "resolveCanaryPolicyActionPlan" && typeof value === "function") {
            proxyTarget[prop] = function (action: unknown) {
              (window as any).__historyCanaryActionPlanCallCount =
                Number((window as any).__historyCanaryActionPlanCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(action);
            };
            return true;
          }
          if (prop === "resolveCanaryPolicyActionNotice" && typeof value === "function") {
            proxyTarget[prop] = function (action: unknown) {
              (window as any).__historyCanaryActionNoticeCallCount =
                Number((window as any).__historyCanaryActionNoticeCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(action);
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

    const snapshot = await page.evaluate(() => {
      const actionButton = document.querySelector(
        ".history-canary-action-btn[data-action='reset_policy']"
      ) as HTMLElement | null;
      if (actionButton && typeof actionButton.click === "function") actionButton.click();
      const policyBanner = document.querySelector("#history-canary-policy .history-burnin-gate");
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryCanaryPolicyRuntime?.resolveCanaryPolicySnapshot &&
            (window as any).CoreHistoryCanaryPolicyRuntime?.resolveStoredPolicyKeys &&
            (window as any).CoreHistoryCanaryPolicyRuntime?.resolveCanaryPolicyActionPlan &&
            (window as any).CoreHistoryCanaryPolicyRuntime?.resolveCanaryPolicyActionNotice
        ),
        snapshotCallCount: Number((window as any).__historyCanarySnapshotCallCount || 0),
        storedKeysCallCount: Number((window as any).__historyCanaryStoredKeysCallCount || 0),
        actionPlanCallCount: Number((window as any).__historyCanaryActionPlanCallCount || 0),
        actionNoticeCallCount: Number((window as any).__historyCanaryActionNoticeCallCount || 0),
        policyGateText: policyBanner && policyBanner.textContent ? policyBanner.textContent.trim() : ""
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.snapshotCallCount).toBeGreaterThan(0);
    expect(snapshot.storedKeysCallCount).toBeGreaterThan(0);
    expect(snapshot.actionPlanCallCount).toBeGreaterThan(0);
    expect(snapshot.actionNoticeCallCount).toBeGreaterThan(0);
    expect(snapshot.policyGateText.length).toBeGreaterThan(0);
  });

  test("history page delegates canary storage reads to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanaryStorageReadCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryStorageRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "readHistoryStorageValue" && typeof value === "function") {
            proxyTarget[prop] = function (key: unknown) {
              (window as any).__historyCanaryStorageReadCallCount =
                Number((window as any).__historyCanaryStorageReadCallCount || 0) + 1;
              return (value as (k: unknown) => unknown)(key);
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
      hasRuntime: Boolean((window as any).CoreHistoryCanaryStorageRuntime?.readHistoryStorageValue),
      readCallCount: Number((window as any).__historyCanaryStorageReadCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.readCallCount).toBeGreaterThan(0);
  });

  test("history page delegates runtime dependency contract checks to runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyRuntimeContractCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRuntimeContractRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryRuntimeContracts" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRuntimeContractCallCount =
                Number((window as any).__historyRuntimeContractCallCount || 0) + 1;
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean(
        (window as any).CoreHistoryRuntimeContractRuntime?.resolveHistoryRuntimeContracts
      ),
      contractCallCount: Number((window as any).__historyRuntimeContractCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.contractCallCount).toBeGreaterThan(0);
  });

  test("history page delegates canary runtime source reads to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanarySourcePolicyCallCount = 0;
      (window as any).__historyCanarySourceStoredCallCount = 0;
      (window as any).__historyCanarySourceSnapshotInputCallCount = 0;
      (window as any).__historyCanarySourceStoredInputCallCount = 0;
      (window as any).__historyCanarySourceCombinedStateCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanarySourceRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCanaryRuntimePolicy" && typeof value === "function") {
            proxyTarget[prop] = function (runtime: unknown) {
              (window as any).__historyCanarySourcePolicyCallCount =
                Number((window as any).__historyCanarySourcePolicyCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(runtime);
            };
            return true;
          }
          if (prop === "resolveHistoryCanaryRuntimeStoredPolicyKeys" && typeof value === "function") {
            proxyTarget[prop] = function (runtime: unknown) {
              (window as any).__historyCanarySourceStoredCallCount =
                Number((window as any).__historyCanarySourceStoredCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(runtime);
            };
            return true;
          }
          if (prop === "resolveHistoryCanaryPolicySnapshotInput" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanarySourceSnapshotInputCallCount =
                Number((window as any).__historyCanarySourceSnapshotInputCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryCanaryStoredPolicyInput" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanarySourceStoredInputCallCount =
                Number((window as any).__historyCanarySourceStoredInputCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryCanaryPolicyAndStoredState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanarySourceCombinedStateCallCount =
                Number((window as any).__historyCanarySourceCombinedStateCallCount || 0) + 1;
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryCanarySourceRuntime?.resolveHistoryCanaryRuntimePolicy) &&
        Boolean((window as any).CoreHistoryCanarySourceRuntime?.resolveHistoryCanaryRuntimeStoredPolicyKeys) &&
        Boolean((window as any).CoreHistoryCanarySourceRuntime?.resolveHistoryCanaryPolicySnapshotInput) &&
        Boolean((window as any).CoreHistoryCanarySourceRuntime?.resolveHistoryCanaryStoredPolicyInput) &&
        Boolean((window as any).CoreHistoryCanarySourceRuntime?.resolveHistoryCanaryPolicyAndStoredState),
      combinedStateCallCount: Number((window as any).__historyCanarySourceCombinedStateCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.combinedStateCallCount).toBeGreaterThan(0);
  });

  test("history page delegates canary policy apply action to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanaryPanelActionCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryActionRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryCanaryPanelAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanaryPanelActionCallCount =
                Number((window as any).__historyCanaryPanelActionCallCount || 0) + 1;
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const actionButton = document.querySelector(
        ".history-canary-action-btn[data-action='reset_policy']"
      ) as HTMLElement | null;
      if (actionButton && typeof actionButton.click === "function") actionButton.click();
      return {
        hasRuntime:
          Boolean((window as any).CoreHistoryCanaryActionRuntime?.applyHistoryCanaryPanelAction) &&
          Boolean((window as any).CoreHistoryCanaryActionRuntime?.applyHistoryCanaryPolicyActionByName) &&
          Boolean(
            (window as any).CoreHistoryCanaryActionRuntime?.applyHistoryCanaryPolicyActionByNameWithFeedback
          ) &&
          Boolean((window as any).CoreHistoryCanaryActionRuntime?.resolveHistoryCanaryPolicyApplyFeedbackState),
        panelActionCallCount: Number((window as any).__historyCanaryPanelActionCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.panelActionCallCount).toBeGreaterThan(0);
  });
});

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

  test("history page delegates canary panel orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanaryHostRenderCallCount = 0;
      (window as any).__historyCanaryHostClickCallCount = 0;
      (window as any).__historyCanaryHostApplyRenderCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCanaryPanelRenderState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanaryHostRenderCallCount =
                Number((window as any).__historyCanaryHostRenderCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryCanaryPanelClickAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanaryHostClickCallCount =
                Number((window as any).__historyCanaryHostClickCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryCanaryPanelRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanaryHostApplyRenderCallCount =
                Number((window as any).__historyCanaryHostApplyRenderCallCount || 0) + 1;
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
      const policyPanel = document.querySelector("#history-canary-policy");
      return {
        hasRuntime:
          Boolean((window as any).CoreHistoryCanaryHostRuntime?.resolveHistoryCanaryPanelRenderState) &&
          Boolean((window as any).CoreHistoryCanaryHostRuntime?.applyHistoryCanaryPanelClickAction) &&
          Boolean((window as any).CoreHistoryCanaryHostRuntime?.applyHistoryCanaryPanelRender),
        applyRenderCallCount: Number((window as any).__historyCanaryHostApplyRenderCallCount || 0),
        hasActionButton: Boolean(actionButton),
        panelText: policyPanel && policyPanel.textContent ? policyPanel.textContent : ""
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.applyRenderCallCount).toBeGreaterThan(0);
    expect(snapshot.hasActionButton).toBe(true);
    expect(snapshot.panelText).toContain("Canary 策略控制");
  });

  test("history page delegates canary view modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanaryViewCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryViewRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCanaryViewState" && typeof value === "function") {
            proxyTarget[prop] = function (policy: unknown, stored: unknown) {
              (window as any).__historyCanaryViewCallCount =
                Number((window as any).__historyCanaryViewCallCount || 0) + 1;
              return (value as (p: unknown, s: unknown) => unknown)(policy, stored);
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
      const policyBanner = document.querySelector("#history-canary-policy");
      return {
        hasRuntime: Boolean((window as any).CoreHistoryCanaryViewRuntime?.resolveHistoryCanaryViewState),
        canaryViewCallCount: Number((window as any).__historyCanaryViewCallCount || 0),
        policyText: policyBanner && policyBanner.textContent ? policyBanner.textContent.trim() : ""
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.canaryViewCallCount).toBeGreaterThan(0);
    expect(snapshot.policyText).toContain("Canary 策略控制");
  });

  test("history page delegates canary panel html rendering to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanaryPanelHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryPanelRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCanaryPanelHtml" && typeof value === "function") {
            proxyTarget[prop] = function (view: unknown) {
              (window as any).__historyCanaryPanelHtmlCallCount =
                Number((window as any).__historyCanaryPanelHtmlCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(view);
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
      hasRuntime: Boolean((window as any).CoreHistoryCanaryPanelRuntime?.resolveHistoryCanaryPanelHtml),
      panelHtmlCallCount: Number((window as any).__historyCanaryPanelHtmlCallCount || 0),
      panelText: (document.querySelector("#history-canary-policy")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.panelHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.panelText).toContain("Canary 策略控制");
  });

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
        Boolean((window as any).CoreHistoryControlsHostRuntime?.bindHistoryControls),
      initCallCount: Number((window as any).__historyControlsHostInitCallCount || 0),
      bindCallCount: Number((window as any).__historyControlsHostBindCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.initCallCount).toBeGreaterThan(0);
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

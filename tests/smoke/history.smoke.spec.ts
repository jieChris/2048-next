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

  test("history page delegates record head modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordHeadCallCount = 0;
      (window as any).__historyCatalogModeLabelCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordViewRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCatalogModeLabel" && typeof value === "function") {
            proxyTarget[prop] = function (modeCatalog: unknown, item: unknown) {
              (window as any).__historyCatalogModeLabelCallCount =
                Number((window as any).__historyCatalogModeLabelCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(modeCatalog, item);
            };
            return true;
          }
          if (prop === "resolveHistoryRecordHeadState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHeadCallCount =
                Number((window as any).__historyRecordHeadCallCount || 0) + 1;
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 512,
        best_tile: 64,
        duration_ms: 40000,
        final_board: [
          [2, 4, 8, 16],
          [32, 64, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean(
        (window as any).CoreHistoryRecordViewRuntime?.resolveHistoryCatalogModeLabel &&
          (window as any).CoreHistoryRecordViewRuntime?.resolveHistoryRecordHeadState
      ),
      catalogModeLabelCallCount: Number((window as any).__historyCatalogModeLabelCallCount || 0),
      headCallCount: Number((window as any).__historyRecordHeadCallCount || 0),
      firstItemText: (document.querySelector(".history-item-head")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.catalogModeLabelCallCount).toBeGreaterThan(0);
    expect(snapshot.headCallCount).toBeGreaterThan(0);
    expect(snapshot.firstItemText).toContain("分数:");
  });

  test("history page delegates record item html modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordItemHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordItemRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryRecordItemHtml" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordItemHtmlCallCount =
                Number((window as any).__historyRecordItemHtmlCallCount || 0) + 1;
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 512,
        best_tile: 64,
        duration_ms: 12000,
        final_board: [
          [2, 4, 8, 16],
          [32, 64, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryRecordItemRuntime?.resolveHistoryRecordItemHtml),
      callCount: Number((window as any).__historyRecordItemHtmlCallCount || 0),
      hasHistoryItem: document.querySelectorAll(".history-item").length > 0
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasHistoryItem).toBe(true);
  });

  test("history page delegates record list render orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordListHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordListHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryRecordListRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordListHostCallCount =
                Number((window as any).__historyRecordListHostCallCount || 0) + 1;
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
      hasRuntime: Boolean((window as any).CoreHistoryRecordListHostRuntime?.applyHistoryRecordListRender),
      callCount: Number((window as any).__historyRecordListHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
  });

  test("history page delegates single-record export state to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historySingleExportActionCallCount = 0;
      (window as any).__historySingleExportStateCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryExportRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "downloadHistorySingleRecord" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historySingleExportActionCallCount =
                Number((window as any).__historySingleExportActionCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistorySingleRecordExportState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historySingleExportStateCallCount =
                Number((window as any).__historySingleExportStateCallCount || 0) + 1;
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
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 512,
        best_tile: 64,
        duration_ms: 12000,
        final_board: [
          [2, 4, 8, 16],
          [32, 64, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.download !== "function") {
        throw new Error("LocalHistoryStore download unavailable");
      }
      const originalDownload = store.download;
      (window as any).__historySingleExportLastFile = "";
      store.download = function (file: unknown, payload: unknown) {
        (window as any).__historySingleExportLastFile = String(file || "");
        (window as any).__historySingleExportPayloadLength = String(payload || "").length;
      };

      const button = document.querySelector(".history-export-btn") as HTMLButtonElement | null;
      if (button && typeof button.click === "function") button.click();

      store.download = originalDownload;
      return {
        hasRuntime:
          Boolean((window as any).CoreHistoryExportRuntime?.downloadHistorySingleRecord) &&
          Boolean((window as any).CoreHistoryExportRuntime?.resolveHistorySingleRecordExportState),
        singleExportActionCallCount: Number((window as any).__historySingleExportActionCallCount || 0),
        singleExportStateCallCount: Number((window as any).__historySingleExportStateCallCount || 0),
        fileName: String((window as any).__historySingleExportLastFile || "")
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.singleExportActionCallCount).toBeGreaterThan(0);
    expect(snapshot.fileName).toContain("history_");
  });

  test("history page delegates final board html rendering to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBoardHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBoardRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryFinalBoardHtml" && typeof value === "function") {
            proxyTarget[prop] = function (board: unknown, width: unknown, height: unknown) {
              (window as any).__historyBoardHtmlCallCount =
                Number((window as any).__historyBoardHtmlCallCount || 0) + 1;
              return (value as (b: unknown, w: unknown, h: unknown) => unknown)(board, width, height);
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 1024,
        best_tile: 128,
        duration_ms: 32000,
        final_board: [
          [2, 4, 8, 16],
          [32, 64, 128, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryBoardRuntime?.resolveHistoryFinalBoardHtml),
      boardHtmlCallCount: Number((window as any).__historyBoardHtmlCallCount || 0),
      hasBoardGrid: Boolean(document.querySelector(".final-board-grid"))
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.boardHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.hasBoardGrid).toBe(true);
  });

  test("history page delegates import action decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => false;
      (window as any).__historyImportActionCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryImportRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryImportActionState" && typeof value === "function") {
            proxyTarget[prop] = function (action: unknown) {
              (window as any).__historyImportActionCallCount =
                Number((window as any).__historyImportActionCallCount || 0) + 1;
              return (value as (name: unknown) => unknown)(action);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });

      const originalClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this && this.type === "file") return;
        return originalClick.apply(this);
      };
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const mergeBtn = document.querySelector("#history-import-btn") as HTMLButtonElement | null;
      if (mergeBtn && typeof mergeBtn.click === "function") mergeBtn.click();

      const replaceBtn = document.querySelector("#history-import-replace-btn") as HTMLButtonElement | null;
      if (replaceBtn && typeof replaceBtn.click === "function") replaceBtn.click();

      return {
        hasRuntime: Boolean((window as any).CoreHistoryImportRuntime?.resolveHistoryImportActionState),
        actionCallCount: Number((window as any).__historyImportActionCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.actionCallCount).toBeGreaterThan(1);
  });

  test("history page delegates import file helpers to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyImportFileSelectedCallCount = 0;
      (window as any).__historyImportFilePayloadCallCount = 0;
      (window as any).__historyImportFileEncodingCallCount = 0;
      (window as any).__historyImportFileResetCallCount = 0;
      (window as any).__historyImportExecuteCallCount = 0;
      (window as any).__historyImportFileSeenEncoding = null;
      {
        const target: Record<string, unknown> = {};
        (window as any).CoreHistoryImportRuntime = new Proxy(target, {
          set(proxyTarget, prop, value) {
            if (prop === "executeHistoryImport" && typeof value === "function") {
              proxyTarget[prop] = function (input: unknown) {
                (window as any).__historyImportExecuteCallCount =
                  Number((window as any).__historyImportExecuteCallCount || 0) + 1;
                return (value as (args: unknown) => unknown)(input);
              };
              return true;
            }
            proxyTarget[prop] = value;
            return true;
          }
        });
      }
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryImportFileRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryImportSelectedFile" && typeof value === "function") {
            proxyTarget[prop] = function (files: unknown) {
              (window as any).__historyImportFileSelectedCallCount =
                Number((window as any).__historyImportFileSelectedCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(files);
            };
            return true;
          }
          if (prop === "resolveHistoryImportPayloadText" && typeof value === "function") {
            proxyTarget[prop] = function (readerResult: unknown) {
              (window as any).__historyImportFilePayloadCallCount =
                Number((window as any).__historyImportFilePayloadCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(readerResult);
            };
            return true;
          }
          if (prop === "resolveHistoryImportReadEncoding" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyImportFileEncodingCallCount =
                Number((window as any).__historyImportFileEncodingCallCount || 0) + 1;
              return (value as () => unknown)();
            };
            return true;
          }
          if (prop === "resolveHistoryImportInputResetValue" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyImportFileResetCallCount =
                Number((window as any).__historyImportFileResetCallCount || 0) + 1;
              return (value as () => unknown)();
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });

      class MockFileReader {
        result: unknown = "{\"records\":[]}";
        onload: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        readAsText(_file: unknown, encoding?: string) {
          (window as any).__historyImportFileSeenEncoding = encoding ?? null;
          if (typeof this.onload === "function") {
            this.onload(new Event("load"));
          }
        }
      }

      (window as any).FileReader = MockFileReader;
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(async () => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.importRecords !== "function") {
        throw new Error("LocalHistoryStore.importRecords unavailable");
      }
      const originalImportRecords = store.importRecords;
      store.importRecords = () => ({ imported: 0, replaced: 0 });

      const importInput = document.querySelector("#history-import-file") as HTMLInputElement | null;
      if (!importInput) {
        throw new Error("history import input unavailable");
      }

      const fakeFile = { name: "history.json" };
      Object.defineProperty(importInput, "files", {
        configurable: true,
        get() {
          return {
            0: fakeFile,
            length: 1,
            item(index: number) {
              return index === 0 ? fakeFile : null;
            }
          };
        }
      });

      importInput.dispatchEvent(new Event("change"));
      await new Promise((resolve) => setTimeout(resolve, 0));

      store.importRecords = originalImportRecords;
      return {
        hasRuntime: Boolean((window as any).CoreHistoryImportFileRuntime?.resolveHistoryImportSelectedFile),
        hasImportRuntime: Boolean((window as any).CoreHistoryImportRuntime?.executeHistoryImport),
        selectedCallCount: Number((window as any).__historyImportFileSelectedCallCount || 0),
        payloadCallCount: Number((window as any).__historyImportFilePayloadCallCount || 0),
        encodingCallCount: Number((window as any).__historyImportFileEncodingCallCount || 0),
        resetCallCount: Number((window as any).__historyImportFileResetCallCount || 0),
        executeCallCount: Number((window as any).__historyImportExecuteCallCount || 0),
        seenEncoding: (window as any).__historyImportFileSeenEncoding
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasImportRuntime).toBe(true);
    expect(snapshot.selectedCallCount).toBeGreaterThan(0);
    expect(snapshot.payloadCallCount).toBeGreaterThan(0);
    expect(snapshot.encodingCallCount).toBeGreaterThan(0);
    expect(snapshot.resetCallCount).toBeGreaterThan(0);
    expect(snapshot.executeCallCount).toBeGreaterThan(0);
    expect(snapshot.seenEncoding).toBe("utf-8");
  });

  test("history page delegates import orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyImportHostMergeClickCallCount = 0;
      (window as any).__historyImportHostReplaceClickCallCount = 0;
      (window as any).__historyImportHostFileSelectionCallCount = 0;
      (window as any).__historyImportHostApplyReadResultCallCount = 0;
      const hostTarget: Record<string, unknown> = {};
      (window as any).CoreHistoryImportHostRuntime = new Proxy(hostTarget, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryImportMergeClickState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostMergeClickCallCount =
                Number((window as any).__historyImportHostMergeClickCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryImportReplaceClickState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostReplaceClickCallCount =
                Number((window as any).__historyImportHostReplaceClickCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryImportFileSelectionState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostFileSelectionCallCount =
                Number((window as any).__historyImportHostFileSelectionCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryImportFromFileReadResult" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostApplyReadResultCallCount =
                Number((window as any).__historyImportHostApplyReadResultCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });

      const originalClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this && this.type === "file") return;
        return originalClick.apply(this);
      };

      class MockFileReader {
        result: unknown = "{\"records\":[]}";
        onload: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        readAsText(_file: unknown, _encoding?: string) {
          if (typeof this.onload === "function") {
            this.onload(new Event("load"));
          }
        }
      }

      (window as any).FileReader = MockFileReader;
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(async () => {
      const mergeBtn = document.querySelector("#history-import-btn") as HTMLButtonElement | null;
      if (mergeBtn && typeof mergeBtn.click === "function") mergeBtn.click();

      const replaceBtn = document.querySelector("#history-import-replace-btn") as HTMLButtonElement | null;
      if (replaceBtn && typeof replaceBtn.click === "function") replaceBtn.click();

      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.importRecords !== "function") {
        throw new Error("LocalHistoryStore.importRecords unavailable");
      }
      const originalImportRecords = store.importRecords;
      store.importRecords = () => ({ imported: 0, replaced: 0 });

      const importInput = document.querySelector("#history-import-file") as HTMLInputElement | null;
      if (!importInput) {
        throw new Error("history import input unavailable");
      }
      const fakeFile = { name: "history.json" };
      Object.defineProperty(importInput, "files", {
        configurable: true,
        get() {
          return {
            0: fakeFile,
            length: 1,
            item(index: number) {
              return index === 0 ? fakeFile : null;
            }
          };
        }
      });

      importInput.dispatchEvent(new Event("change"));
      await new Promise((resolve) => setTimeout(resolve, 0));

      store.importRecords = originalImportRecords;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryImportHostRuntime?.resolveHistoryImportMergeClickState &&
            (window as any).CoreHistoryImportHostRuntime?.resolveHistoryImportReplaceClickState &&
            (window as any).CoreHistoryImportHostRuntime?.resolveHistoryImportFileSelectionState &&
            (window as any).CoreHistoryImportHostRuntime?.applyHistoryImportFromFileReadResult
        ),
        mergeClickCallCount: Number((window as any).__historyImportHostMergeClickCallCount || 0),
        replaceClickCallCount: Number((window as any).__historyImportHostReplaceClickCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.mergeClickCallCount).toBeGreaterThan(0);
    expect(snapshot.replaceClickCallCount).toBeGreaterThan(0);
  });

  test("history page delegates import control binding orchestration to bind-host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyImportBindHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryImportBindHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "bindHistoryImportControls" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportBindHostCallCount =
                Number((window as any).__historyImportBindHostCallCount || 0) + 1;
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
      hasRuntime: Boolean((window as any).CoreHistoryImportBindHostRuntime?.bindHistoryImportControls),
      bindCallCount: Number((window as any).__historyImportBindHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.bindCallCount).toBeGreaterThan(0);
  });

  test("history page delegates mode filter option modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyModeFilterOptionsCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryModeFilterRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryModeFilterOptions" && typeof value === "function") {
            proxyTarget[prop] = function (modes: unknown) {
              (window as any).__historyModeFilterOptionsCallCount =
                Number((window as any).__historyModeFilterOptionsCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(modes);
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
      const select = document.querySelector("#history-mode") as HTMLSelectElement | null;
      const optionCount = select ? select.querySelectorAll("option").length : 0;
      const hasDefaultOption = select ? select.querySelector("option[value='']") !== null : false;
      return {
        hasRuntime: Boolean((window as any).CoreHistoryModeFilterRuntime?.resolveHistoryModeFilterOptions),
        callCount: Number((window as any).__historyModeFilterOptionsCallCount || 0),
        optionCount,
        hasDefaultOption
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.optionCount).toBeGreaterThan(1);
    expect(snapshot.hasDefaultOption).toBe(true);
  });

  test("history page delegates mode filter render orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyModeFilterHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryModeFilterHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryModeFilterOptionsRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyModeFilterHostCallCount =
                Number((window as any).__historyModeFilterHostCallCount || 0) + 1;
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
      const select = document.querySelector("#history-mode") as HTMLSelectElement | null;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryModeFilterHostRuntime?.applyHistoryModeFilterOptionsRender
        ),
        callCount: Number((window as any).__historyModeFilterHostCallCount || 0),
        optionCount: select ? select.querySelectorAll("option").length : 0
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.optionCount).toBeGreaterThan(1);
  });

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

  test("history page delegates record delete action decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyDeleteActionCallCount = 0;
      (window as any).__historyDeleteExecuteCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordActionsRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryDeleteActionState" && typeof value === "function") {
            proxyTarget[prop] = function (recordId: unknown) {
              (window as any).__historyDeleteActionCallCount =
                Number((window as any).__historyDeleteActionCallCount || 0) + 1;
              return (value as (id: unknown) => unknown)(recordId);
            };
            return true;
          }
          if (prop === "executeHistoryDeleteRecord" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyDeleteExecuteCallCount =
                Number((window as any).__historyDeleteExecuteCallCount || 0) + 1;
              return (value as (payload: unknown) => unknown)(input);
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 128,
        best_tile: 16,
        duration_ms: 8000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.deleteById !== "function") {
        throw new Error("LocalHistoryStore.deleteById unavailable");
      }
      const originalDeleteById = store.deleteById;
      store.deleteById = () => true;

      const deleteBtn = document.querySelector(".history-delete-btn") as HTMLButtonElement | null;
      if (deleteBtn && typeof deleteBtn.click === "function") deleteBtn.click();

      store.deleteById = originalDeleteById;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryRecordActionsRuntime?.resolveHistoryDeleteActionState &&
            (window as any).CoreHistoryRecordActionsRuntime?.executeHistoryDeleteRecord
        ),
        deleteActionCallCount: Number((window as any).__historyDeleteActionCallCount || 0),
        deleteExecuteCallCount: Number((window as any).__historyDeleteExecuteCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.deleteActionCallCount).toBeGreaterThan(0);
    expect(snapshot.deleteExecuteCallCount).toBeGreaterThan(0);
  });

  test("history page delegates record item actions orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordHostReplayCallCount = 0;
      (window as any).__historyRecordHostExportCallCount = 0;
      (window as any).__historyRecordHostDeleteCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryRecordReplayHref" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHostReplayCallCount =
                Number((window as any).__historyRecordHostReplayCallCount || 0) + 1;
              (value as (args: unknown) => unknown)(input);
              return "";
            };
            return true;
          }
          if (prop === "applyHistoryRecordExportAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHostExportCallCount =
                Number((window as any).__historyRecordHostExportCallCount || 0) + 1;
              (value as (args: unknown) => unknown)(input);
              return false;
            };
            return true;
          }
          if (prop === "applyHistoryRecordDeleteAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHostDeleteCallCount =
                Number((window as any).__historyRecordHostDeleteCallCount || 0) + 1;
              (value as (args: unknown) => unknown)(input);
              return {
                shouldSetStatus: false,
                statusText: "",
                isError: false,
                shouldReload: false
              };
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }
      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 64,
        best_tile: 8,
        duration_ms: 3000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "[]"
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      const runtime = (window as any).CoreHistoryRecordHostRuntime;
      if (!store || !runtime || typeof store.listRecords !== "function") {
        throw new Error("history record host runtime prerequisites unavailable");
      }
      const listResult = store.listRecords({
        mode_key: "",
        keyword: "",
        sort_by: "ended_desc",
        adapter_parity_filter: "all",
        page: 1,
        page_size: 1
      });
      const item = Array.isArray(listResult?.items) ? listResult.items[0] : null;
      const itemId = item?.id;

      if (typeof runtime.resolveHistoryRecordReplayHref === "function") {
        runtime.resolveHistoryRecordReplayHref({
          historyRecordActionsRuntime: {
            resolveHistoryReplayHref: () => ""
          },
          itemId
        });
      }
      if (typeof runtime.applyHistoryRecordExportAction === "function") {
        runtime.applyHistoryRecordExportAction({
          localHistoryStore: store,
          item,
          historyExportRuntime: {
            downloadHistorySingleRecord: () => false
          }
        });
      }
      if (typeof runtime.applyHistoryRecordDeleteAction === "function") {
        runtime.applyHistoryRecordDeleteAction({
          historyRecordActionsRuntime: {
            resolveHistoryDeleteActionState: (id: unknown) => ({
              confirmMessage: "确认删除这条记录吗？",
              recordId: id
            }),
            executeHistoryDeleteRecord: () => ({
              deleted: false,
              notice: "failed"
            }),
            resolveHistoryDeleteFailureNotice: () => "failed",
            resolveHistoryDeleteSuccessNotice: () => "ok"
          },
          localHistoryStore: store,
          itemId,
          confirmAction: () => true
        });
      }

      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryRecordHostRuntime?.resolveHistoryRecordReplayHref &&
            (window as any).CoreHistoryRecordHostRuntime?.applyHistoryRecordExportAction &&
            (window as any).CoreHistoryRecordHostRuntime?.applyHistoryRecordDeleteAction
        ),
        replayCallCount: Number((window as any).__historyRecordHostReplayCallCount || 0),
        exportCallCount: Number((window as any).__historyRecordHostExportCallCount || 0),
        deleteCallCount: Number((window as any).__historyRecordHostDeleteCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.replayCallCount).toBeGreaterThan(0);
    expect(snapshot.exportCallCount).toBeGreaterThan(0);
    expect(snapshot.deleteCallCount).toBeGreaterThan(0);
  });

  test("history page delegates mismatch export execution to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyExportMismatchCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryExportRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "downloadHistoryMismatchRecords" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyExportMismatchCallCount =
                Number((window as any).__historyExportMismatchCallCount || 0) + 1;
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 256,
        best_tile: 32,
        duration_ms: 12000,
        final_board: [
          [2, 4, 8, 16],
          [32, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 260,
          undoUsedFromSnapshot: 0,
          scoreDelta: 4,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 4,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.download !== "function") {
        throw new Error("LocalHistoryStore download unavailable");
      }
      const originalDownload = store.download;
      (window as any).__historyExportLastFile = "";
      store.download = function (file: unknown, payload: unknown) {
        (window as any).__historyExportLastFile = String(file || "");
        (window as any).__historyExportPayloadLength = String(payload || "").length;
      };

      const button = document.querySelector("#history-export-mismatch-btn") as HTMLButtonElement | null;
      if (button && typeof button.click === "function") button.click();

      store.download = originalDownload;
      return {
        hasRuntime: Boolean((window as any).CoreHistoryExportRuntime?.downloadHistoryMismatchRecords),
        mismatchCallCount: Number((window as any).__historyExportMismatchCallCount || 0),
        statusText: (document.querySelector("#history-status")?.textContent || "").trim(),
        fileName: String((window as any).__historyExportLastFile || "")
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.mismatchCallCount).toBeGreaterThan(0);
    expect(snapshot.statusText).toContain("已导出 A/B 不一致记录");
    expect(snapshot.fileName).toContain("2048_local_history_mismatch_");
  });

  test("history page delegates adapter diagnostics rendering to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyAdapterParityStatusCallCount = 0;
      (window as any).__historyAdapterBadgeCallCount = 0;
      (window as any).__historyAdapterDiagnosticsCallCount = 0;
      (window as any).__historyAdapterBadgeHtmlCallCount = 0;
      (window as any).__historyAdapterDiagnosticsHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryAdapterDiagnosticsRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryAdapterParityStatus" && typeof value === "function") {
            proxyTarget[prop] = function (store: unknown, item: unknown) {
              (window as any).__historyAdapterParityStatusCallCount =
                Number((window as any).__historyAdapterParityStatusCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(store, item);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterBadgeState" && typeof value === "function") {
            proxyTarget[prop] = function (item: unknown, status: string) {
              (window as any).__historyAdapterBadgeCallCount =
                Number((window as any).__historyAdapterBadgeCallCount || 0) + 1;
              return (value as (entry: unknown, state: string) => unknown)(item, status);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterDiagnosticsState" && typeof value === "function") {
            proxyTarget[prop] = function (item: unknown) {
              (window as any).__historyAdapterDiagnosticsCallCount =
                Number((window as any).__historyAdapterDiagnosticsCallCount || 0) + 1;
              return (value as (entry: unknown) => unknown)(item);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterBadgeHtml" && typeof value === "function") {
            proxyTarget[prop] = function (state: unknown) {
              (window as any).__historyAdapterBadgeHtmlCallCount =
                Number((window as any).__historyAdapterBadgeHtmlCallCount || 0) + 1;
              return (value as (entry: unknown) => unknown)(state);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterDiagnosticsHtml" && typeof value === "function") {
            proxyTarget[prop] = function (state: unknown) {
              (window as any).__historyAdapterDiagnosticsHtmlCallCount =
                Number((window as any).__historyAdapterDiagnosticsHtmlCallCount || 0) + 1;
              return (value as (entry: unknown) => unknown)(state);
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 256,
        best_tile: 32,
        duration_ms: 12000,
        final_board: [
          [2, 4, 8, 16],
          [32, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 256,
          undoUsedFromSnapshot: 1,
          scoreDelta: 0,
          isScoreAligned: true
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 0,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: true,
          bothScoreAligned: true
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryAdapterDiagnosticsRuntime?.resolveHistoryAdapterParityStatus &&
          (window as any).CoreHistoryAdapterDiagnosticsRuntime?.resolveHistoryAdapterBadgeState &&
            (window as any).CoreHistoryAdapterDiagnosticsRuntime
              ?.resolveHistoryAdapterDiagnosticsState &&
            (window as any).CoreHistoryAdapterDiagnosticsRuntime?.resolveHistoryAdapterBadgeHtml &&
            (window as any).CoreHistoryAdapterDiagnosticsRuntime
              ?.resolveHistoryAdapterDiagnosticsHtml
        ),
        parityStatusCallCount: Number((window as any).__historyAdapterParityStatusCallCount || 0),
        badgeCallCount: Number((window as any).__historyAdapterBadgeCallCount || 0),
        diagnosticsCallCount: Number((window as any).__historyAdapterDiagnosticsCallCount || 0),
        badgeHtmlCallCount: Number((window as any).__historyAdapterBadgeHtmlCallCount || 0),
        diagnosticsHtmlCallCount: Number((window as any).__historyAdapterDiagnosticsHtmlCallCount || 0),
        diagnosticsCount: document.querySelectorAll(".history-adapter-diagnostics").length
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.parityStatusCallCount).toBeGreaterThan(0);
    expect(snapshot.badgeCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsCallCount).toBeGreaterThan(0);
    expect(snapshot.badgeHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsCount).toBe(1);
  });

  test("history page delegates adapter diagnostics orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyAdapterHostRenderCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryAdapterHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryAdapterRecordRenderState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyAdapterHostRenderCallCount =
                Number((window as any).__historyAdapterHostRenderCallCount || 0) + 1;
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
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 256,
        best_tile: 32,
        duration_ms: 12000,
        final_board: [
          [2, 4, 8, 16],
          [32, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 256,
          undoUsedFromSnapshot: 1,
          scoreDelta: 0,
          isScoreAligned: true
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 0,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: true,
          bothScoreAligned: true
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      return {
        hasRuntime: Boolean((window as any).CoreHistoryAdapterHostRuntime?.resolveHistoryAdapterRecordRenderState),
        hostRenderCallCount: Number((window as any).__historyAdapterHostRenderCallCount || 0),
        diagnosticsCount: document.querySelectorAll(".history-adapter-diagnostics").length
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hostRenderCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsCount).toBe(1);
  });

  test("history page delegates burn-in summary modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBurnInSummarySourceCallCount = 0;
      (window as any).__historyBurnInCallCount = 0;
      (window as any).__historyBurnInPanelHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBurnInRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryBurnInSummarySource" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInSummarySourceCallCount =
                Number((window as any).__historyBurnInSummarySourceCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInSummaryState" && typeof value === "function") {
            proxyTarget[prop] = function (summary: unknown) {
              (window as any).__historyBurnInCallCount =
                Number((window as any).__historyBurnInCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(summary);
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInPanelHtml" && typeof value === "function") {
            proxyTarget[prop] = function (summary: unknown, state: unknown) {
              (window as any).__historyBurnInPanelHtmlCallCount =
                Number((window as any).__historyBurnInPanelHtmlCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(summary, state);
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }
      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 128,
        best_tile: 16,
        duration_ms: 8000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 130,
          undoUsedFromSnapshot: 0,
          scoreDelta: 2,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 2,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInSummarySource) &&
        Boolean((window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInSummaryState) &&
        Boolean((window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInPanelHtml),
      summarySourceCallCount: Number((window as any).__historyBurnInSummarySourceCallCount || 0),
      burnInCallCount: Number((window as any).__historyBurnInCallCount || 0),
      panelHtmlCallCount: Number((window as any).__historyBurnInPanelHtmlCallCount || 0),
      burnInText: (document.querySelector("#history-burnin-summary")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.summarySourceCallCount).toBeGreaterThan(0);
    expect(snapshot.burnInCallCount).toBeGreaterThan(0);
    expect(snapshot.panelHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.burnInText).toContain("Cutover Burn-in 统计");
  });

  test("history page delegates burn-in mismatch focus action to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBurnInFocusCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBurnInRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryBurnInSummaryState" && typeof value === "function") {
            proxyTarget[prop] = function (summary: unknown) {
              const state = (value as (input: unknown) => unknown)(summary);
              if (!state || typeof state !== "object") return state;
              return { ...(state as Record<string, unknown>), mismatchActionEnabled: true };
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInMismatchFocusActionState" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyBurnInFocusCallCount =
                Number((window as any).__historyBurnInFocusCallCount || 0) + 1;
              return (value as () => unknown)();
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }
      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 128,
        best_tile: 16,
        duration_ms: 8000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 130,
          undoUsedFromSnapshot: 0,
          scoreDelta: 2,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 2,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const actionBtn = document.querySelector(".history-burnin-focus-mismatch") as HTMLButtonElement | null;
      if (actionBtn && typeof actionBtn.click === "function") actionBtn.click();
      const adapterFilter = document.querySelector("#history-adapter-filter") as HTMLSelectElement | null;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInMismatchFocusActionState
        ),
        callCount: Number((window as any).__historyBurnInFocusCallCount || 0),
        hasActionButton: Boolean(actionBtn),
        adapterFilterValue: adapterFilter ? adapterFilter.value : ""
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasActionButton).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.adapterFilterValue).toBe("mismatch");
  });

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
    await page.waitForTimeout(200);

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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryStartupHostRuntime?.applyHistoryStartup),
      startupHostCallCount: Number((window as any).__historyStartupHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.startupHostCallCount).toBeGreaterThan(0);
  });
});

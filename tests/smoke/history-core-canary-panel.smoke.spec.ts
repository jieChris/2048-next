import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
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
});

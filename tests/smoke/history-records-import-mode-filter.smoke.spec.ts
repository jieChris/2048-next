import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
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


});

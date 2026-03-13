import { expect, test } from "@playwright/test";
import { waitForWindowCondition } from "./support/runtime-ready";

test.describe("Legacy Multi-Page Smoke", () => {
  test("index ui delegates modal runtime contract checks to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiModalContractCalls = 0;
      (window as any).__indexUiAggregateContractCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveIndexUiModalRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiModalContractCalls =
                Number((window as any).__indexUiModalContractCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "resolveIndexUiRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiAggregateContractCalls =
                Number((window as any).__indexUiAggregateContractCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiRuntimeContractRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => {
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return (
        !!runtime &&
        (typeof runtime.resolveIndexUiModalRuntimeContracts === "function" ||
          typeof runtime.resolveIndexUiRuntimeContracts === "function") &&
        typeof (window as any).openSettingsModal === "function" &&
        typeof (window as any).closeSettingsModal === "function"
      );
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return {
        hasRuntime:
          !!runtime &&
          (typeof runtime.resolveIndexUiModalRuntimeContracts === "function" ||
            typeof runtime.resolveIndexUiRuntimeContracts === "function"),
        callCount:
          Number((window as any).__indexUiModalContractCalls || 0) +
          Number((window as any).__indexUiAggregateContractCalls || 0),
        hasOpenSettingsModal: typeof (window as any).openSettingsModal === "function",
        hasCloseSettingsModal: typeof (window as any).closeSettingsModal === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasOpenSettingsModal).toBe(true);
    expect(snapshot.hasCloseSettingsModal).toBe(true);
  });

  test("index ui delegates home guide runtime contract checks to runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiHomeGuideContractCalls = 0;
      (window as any).__indexUiAggregateContractCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveIndexUiHomeGuideRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiHomeGuideContractCalls =
                Number((window as any).__indexUiHomeGuideContractCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "resolveIndexUiRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiAggregateContractCalls =
                Number((window as any).__indexUiAggregateContractCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiRuntimeContractRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => {
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return (
        !!runtime &&
        (typeof runtime.resolveIndexUiHomeGuideRuntimeContracts === "function" ||
          typeof runtime.resolveIndexUiRuntimeContracts === "function") &&
        !!(window as any).CoreHomeGuideRuntime?.buildHomeGuideSteps
      );
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return {
        hasRuntime:
          !!runtime &&
          (typeof runtime.resolveIndexUiHomeGuideRuntimeContracts === "function" ||
            typeof runtime.resolveIndexUiRuntimeContracts === "function"),
        callCount:
          Number((window as any).__indexUiHomeGuideContractCalls || 0) +
          Number((window as any).__indexUiAggregateContractCalls || 0),
        hasHomeGuideRuntime:
          !!(window as any).CoreHomeGuideRuntime &&
          typeof (window as any).CoreHomeGuideRuntime.buildHomeGuideSteps === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasHomeGuideRuntime).toBe(true);
  });

  test("index ui delegates core runtime contract checks to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiCoreContractCalls = 0;
      (window as any).__indexUiAggregateContractCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveIndexUiCoreRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiCoreContractCalls =
                Number((window as any).__indexUiCoreContractCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "resolveIndexUiRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiAggregateContractCalls =
                Number((window as any).__indexUiAggregateContractCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiRuntimeContractRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => {
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return (
        !!runtime &&
        (typeof runtime.resolveIndexUiCoreRuntimeContracts === "function" ||
          typeof runtime.resolveIndexUiRuntimeContracts === "function") &&
        typeof (window as any).pretty === "function" &&
        typeof (window as any).syncMobileHintUI === "function"
      );
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return {
        hasRuntime:
          !!runtime &&
          (typeof runtime.resolveIndexUiCoreRuntimeContracts === "function" ||
            typeof runtime.resolveIndexUiRuntimeContracts === "function"),
        callCount:
          Number((window as any).__indexUiCoreContractCalls || 0) +
          Number((window as any).__indexUiAggregateContractCalls || 0),
        hasPretty: typeof (window as any).pretty === "function",
        hasSyncMobileHintUI: typeof (window as any).syncMobileHintUI === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasPretty).toBe(true);
    expect(snapshot.hasSyncMobileHintUI).toBe(true);
  });


});

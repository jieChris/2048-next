import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("legacy bootstrap resolveModeConfig delegates to mode-catalog runtime", async ({ page }) => {
    const response = await page.goto("/capped_2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Capped page response should exist").not.toBeNull();
    expect(response?.ok(), "Capped page response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const bootstrap = (window as any).LegacyBootstrapRuntime;
      const modeCatalogRuntime = (window as any).CoreModeCatalogRuntime;
      if (
        !bootstrap ||
        typeof bootstrap.resolveModeConfig !== "function" ||
        !modeCatalogRuntime ||
        typeof modeCatalogRuntime.resolveCatalogModeWithDefault !== "function"
      ) {
        return null;
      }

      const originalCatalog = (window as any).ModeCatalog;
      const originalResolve = modeCatalogRuntime.resolveCatalogModeWithDefault;
      let callCount = 0;
      modeCatalogRuntime.resolveCatalogModeWithDefault = function (
        catalog: any,
        modeKey: string,
        defaultModeKey: string
      ) {
        callCount += 1;
        return originalResolve(catalog, modeKey, defaultModeKey);
      };

      (window as any).ModeCatalog = {
        getMode(key: string) {
          if (key === "standard_4x4_pow2_no_undo") return { key };
          return null;
        }
      };

      try {
        const resolved = bootstrap.resolveModeConfig("missing_mode", "standard_4x4_pow2_no_undo");
        return {
          callCount,
          key: resolved && resolved.key ? String(resolved.key) : null
        };
      } finally {
        modeCatalogRuntime.resolveCatalogModeWithDefault = originalResolve;
        (window as any).ModeCatalog = originalCatalog;
      }
    });

    expect(snapshot, "resolveModeConfig delegation snapshot should exist").not.toBeNull();
    expect(snapshot?.callCount).toBeGreaterThan(0);
    expect(snapshot?.key).toBe("standard_4x4_pow2_no_undo");
  });

  test("game manager delegates mode catalog config resolution to core mode runtime", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__modeCatalogConfigCallCount = 0;
      const runtimeTarget: Record<string, unknown> = {};
      (window as any).CoreModeRuntime = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveModeCatalogConfig" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__modeCatalogConfigCallCount =
                Number((window as any).__modeCatalogConfigCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/play.html?mode_key=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.getModeConfigFromCatalog === "function";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (!manager || typeof manager.getModeConfigFromCatalog !== "function") {
        return null;
      }
      const resolved = manager.getModeConfigFromCatalog("standard_4x4_pow2_no_undo");
      return {
        callCount: Number((window as any).__modeCatalogConfigCallCount || 0),
        key: resolved && typeof resolved.key === "string" ? resolved.key : null
      };
    });

    expect(snapshot, "mode catalog config delegation snapshot should exist").not.toBeNull();
    expect(snapshot?.callCount).toBeGreaterThan(0);
    expect(snapshot?.key).toBe("standard_4x4_pow2_no_undo");
  });

  test("game manager delegates mode config catalog resolution to core mode runtime", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__modeConfigCatalogCallCount = 0;
      const runtimeTarget: Record<string, unknown> = {};
      (window as any).CoreModeRuntime = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveModeConfigFromCatalog" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__modeConfigCatalogCallCount =
                Number((window as any).__modeConfigCatalogCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/play.html?mode_key=classic_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (!manager || typeof manager.resolveModeConfig !== "function") {
        return null;
      }
      const resolved = manager.resolveModeConfig("classic_no_undo");
      return {
        callCount: Number((window as any).__modeConfigCatalogCallCount || 0),
        key: resolved && typeof resolved.key === "string" ? resolved.key : null
      };
    });

    expect(snapshot, "mode config catalog delegation snapshot should exist").not.toBeNull();
    expect(snapshot?.callCount).toBeGreaterThan(0);
    expect(snapshot?.key).toBe("standard_4x4_pow2_no_undo");
  });

  test("game manager delegates capped mode state resolution to core mode runtime", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__cappedModeStateCallCount = 0;
      const runtimeTarget: Record<string, unknown> = {};
      (window as any).CoreModeRuntime = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveCappedModeState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__cappedModeStateCallCount =
                Number((window as any).__cappedModeStateCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/capped_2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Capped response should exist").not.toBeNull();
    expect(response?.ok(), "Capped response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (!manager || typeof manager.isCappedMode !== "function") {
        return null;
      }
      return {
        callCount: Number((window as any).__cappedModeStateCallCount || 0),
        isCapped: !!manager.isCappedMode()
      };
    });

    expect(snapshot, "capped mode state delegation snapshot should exist").not.toBeNull();
    expect(snapshot?.callCount).toBeGreaterThan(0);
    expect(snapshot?.isCapped).toBe(true);
  });

  test("game manager delegates capped64 unlocked-state normalization to core mode runtime", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__capped64UnlockedStateCallCount = 0;
      const runtimeTarget: Record<string, unknown> = {};
      (window as any).CoreModeRuntime = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createProgressiveCapped64UnlockedState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__capped64UnlockedStateCallCount =
                Number((window as any).__capped64UnlockedStateCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/capped_2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Capped response should exist").not.toBeNull();
    expect(response?.ok(), "Capped response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.resolveProgressiveCapped64UnlockedState === "function";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (!manager || typeof manager.resolveProgressiveCapped64UnlockedState !== "function") {
        return null;
      }
      const state = manager.resolveProgressiveCapped64UnlockedState({ "16": true });
      return {
        callCount: Number((window as any).__capped64UnlockedStateCallCount || 0),
        state
      };
    });

    expect(snapshot, "capped64 unlocked-state delegation snapshot should exist").not.toBeNull();
    expect(snapshot?.callCount).toBeGreaterThan(0);
    expect(snapshot?.state).toEqual({ "16": true, "32": false, "64": false });
  });

  test("replay application delegates startup payload to simple runtime helpers", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__simpleRuntimeContractCallCount = 0;
      (window as any).__simpleStartupCallCount = 0;
      const contractTarget: Record<string, unknown> = {};
      (window as any).CoreSimpleRuntimeContractRuntime = new Proxy(contractTarget, {
        set(target, prop, value) {
          if (prop === "resolveSimpleBootstrapRuntime" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__simpleRuntimeContractCallCount =
                Number((window as any).__simpleRuntimeContractCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupTarget: Record<string, unknown> = {};
      (window as any).CoreSimpleStartupRuntime = new Proxy(startupTarget, {
        set(target, prop, value) {
          if (prop === "resolveSimpleStartupPayload" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__simpleStartupCallCount =
                Number((window as any).__simpleStartupCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      return {
        hasSimpleRuntimeContractRuntime: Boolean(
          (window as any).CoreSimpleRuntimeContractRuntime?.resolveSimpleBootstrapRuntime
        ),
        hasSimpleStartupRuntime: Boolean(
          (window as any).CoreSimpleStartupRuntime?.resolveSimpleStartupPayload
        ),
        simpleRuntimeContractCallCount: Number((window as any).__simpleRuntimeContractCallCount || 0),
        simpleStartupCallCount: Number((window as any).__simpleStartupCallCount || 0),
        modeKey: cfg && typeof cfg.key === "string" ? cfg.key : null
      };
    });

    expect(snapshot.hasSimpleRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasSimpleStartupRuntime).toBe(true);
    expect(snapshot.simpleRuntimeContractCallCount).toBeGreaterThan(0);
    expect(snapshot.simpleStartupCallCount).toBeGreaterThan(0);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
  });

  test("replay ui delegates guide storage decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem("replay_guide_shown_v1");
      } catch (_err) {}

      (window as any).__replayGuideShowCalls = 0;
      (window as any).__replayGuideMarkCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "shouldShowReplayGuideFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__replayGuideShowCalls =
                Number((window as any).__replayGuideShowCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "markReplayGuideSeenFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__replayGuideMarkCalls =
                Number((window as any).__replayGuideMarkCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreReplayGuideRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreReplayGuideRuntime;
      if (
        !runtime ||
        typeof runtime.readReplayGuideSeenFromContext !== "function" ||
        typeof runtime.shouldShowReplayGuideFromContext !== "function" ||
        typeof runtime.markReplayGuideSeenFromContext !== "function"
      ) {
        return {
          hasRuntime: false
        };
      }

      const overlay = document.getElementById("guide-overlay") as HTMLElement | null;
      const initialDisplay = overlay ? String(overlay.style.display || "") : "";
      if (overlay) {
        overlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve(null));
      });
      const finalDisplay = overlay ? String(overlay.style.display || "") : "";

      return {
        hasRuntime: true,
        hasOverlay: !!overlay,
        showCalls: Number((window as any).__replayGuideShowCalls || 0),
        markCalls: Number((window as any).__replayGuideMarkCalls || 0),
        initialDisplay,
        finalDisplay
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasOverlay).toBe(true);
    expect(snapshot.showCalls).toBeGreaterThan(0);
    expect(snapshot.markCalls).toBeGreaterThan(0);
    expect(snapshot.initialDisplay).toBe("block");
    expect(snapshot.finalDisplay).toBe("none");
  });
});

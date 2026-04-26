import { expect, test } from "@playwright/test";

test.describe("Refactor Contract Smoke: replay/bootstrap delegation", () => {
  test("core bootstrap resolveModeConfig delegates to mode-catalog runtime", async ({ page }) => {
    const response = await page.goto("/capped_2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Capped page response should exist").not.toBeNull();
    expect(response?.ok(), "Capped page response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const bootstrap = (window as any).CoreBootstrapRuntime;
      const modeCatalogRuntime = (window as any).CoreModeCatalogRuntime;
      return (
        !!bootstrap &&
        typeof bootstrap.resolveModeConfig === "function" &&
        !!modeCatalogRuntime &&
        typeof modeCatalogRuntime.resolveCatalogModeWithDefault === "function"
      );
    });

    const snapshot = await page.evaluate(() => {
      const bootstrap = (window as any).CoreBootstrapRuntime;
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
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.resolveModeConfig === "function";
    });
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
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      if (!manager || typeof manager.resolveModeConfig !== "function") {
        return false;
      }
      const resolved = manager.resolveModeConfig("classic_no_undo");
      return (
        !!resolved &&
        typeof resolved.key === "string" &&
        Number((window as any).__modeConfigCatalogCallCount || 0) > 0
      );
    });

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
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.isCappedMode === "function";
    });

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
    await page.waitForFunction(() => {
      const simpleRuntimeContractRuntime = (window as any).CoreSimpleRuntimeContractRuntime;
      const simpleStartupRuntime = (window as any).CoreSimpleStartupRuntime;
      return (
        !!simpleRuntimeContractRuntime &&
        typeof simpleRuntimeContractRuntime.resolveSimpleBootstrapRuntime === "function" &&
        !!simpleStartupRuntime &&
        typeof simpleStartupRuntime.resolveSimpleStartupPayload === "function"
      );
    });
    await page.waitForFunction(() => {
      return (
        Number((window as any).__simpleRuntimeContractCallCount || 0) > 0 &&
        Number((window as any).__simpleStartupCallCount || 0) > 0 &&
        !!(window as any).GAME_MODE_CONFIG &&
        typeof (window as any).GAME_MODE_CONFIG.key === "string"
      );
    });

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

});

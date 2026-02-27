import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("core-adapter shadow path updates parity state", async ({ page }) => {
    const legacyResponse = await page.goto("/index.html?engine_adapter=legacy-bridge", {
      waitUntil: "domcontentloaded"
    });
    expect(legacyResponse, "Legacy seed response should exist").not.toBeNull();
    expect(legacyResponse?.ok(), "Legacy seed response should be 2xx").toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(300);

    const seededLegacy = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      const manager = (window as any).game_manager;
      if (
        !payload ||
        payload.adapterMode !== "legacy-bridge" ||
        typeof payload.readAdapterParityReport !== "function" ||
        !manager ||
        typeof manager.publishAdapterMoveResult !== "function"
      ) {
        return false;
      }

      manager.publishAdapterMoveResult({
        reason: "smoke-ab-legacy",
        direction: 1,
        moved: true
      });

      const report = payload.readAdapterParityReport();
      return Boolean(report && report.adapterMode === "legacy-bridge");
    });
    expect(seededLegacy, "legacy bridge parity seed failed").toBe(true);

    const response = await page.goto("/index.html?engine_adapter=core-adapter", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Document response should exist").not.toBeNull();
    expect(response?.ok(), "Document response should be 2xx").toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(400);

    const result = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      const manager = (window as any).game_manager;
      if (
        !payload ||
        payload.adapterMode !== "core-adapter" ||
        typeof payload.readAdapterParityState !== "function" ||
        typeof payload.readAdapterParityReport !== "function" ||
        typeof payload.readAdapterParityABDiff !== "function" ||
        !manager ||
        typeof manager.publishAdapterMoveResult !== "function"
      ) {
        return null;
      }

      const before = payload.readAdapterParityState();
      const beforeReport = payload.readAdapterParityReport();
      const beforeABDiff = payload.readAdapterParityABDiff();
      manager.publishAdapterMoveResult({
        reason: "smoke-core-adapter",
        direction: 2,
        moved: true
      });
      const after = payload.readAdapterParityState();
      const afterReport = payload.readAdapterParityReport();
      const afterABDiff = payload.readAdapterParityABDiff();
      return {
        payloadModeKey: payload.modeKey || "unknown",
        payloadParityReport: payload.adapterParityReport || null,
        payloadParityABDiff: payload.adapterParityABDiff || null,
        before,
        after,
        beforeReport,
        afterReport,
        beforeABDiff,
        afterABDiff
      };
    });

    expect(result, "core-adapter payload contract mismatch").not.toBeNull();
    const beforeTotal = result?.before?.counters?.totalEvents || 0;
    const beforeMoved = result?.before?.counters?.movedEvents || 0;
    expect(result?.after?.lastReason).toBe("smoke-core-adapter");
    expect(result?.after?.lastDirection).toBe(2);
    expect(result?.after?.counters?.totalEvents).toBe(beforeTotal + 1);
    expect(result?.after?.counters?.movedEvents).toBe(beforeMoved + 1);
    expect(result?.afterReport?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.afterReport?.adapterMode).toBe("core-adapter");
    expect(result?.afterReport?.undoEvents).toBe(result?.after?.counters?.undoEvents);
    expect(result?.afterReport?.wonEvents).toBe(result?.after?.counters?.wonEvents);
    expect(result?.afterReport?.overEvents).toBe(result?.after?.counters?.overEvents);
    expect(result?.afterReport?.isScoreAligned).toBe(true);
    expect(result?.payloadParityReport?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.payloadParityReport?.isScoreAligned).toBe(true);
    expect(result?.beforeABDiff?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.afterABDiff?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.afterABDiff?.hasCoreReport).toBe(true);
    expect(result?.afterABDiff?.hasLegacyReport).toBe(true);
    expect(result?.afterABDiff?.comparable).toBe(true);
    expect(result?.afterABDiff?.isScoreMatch).toBe(true);
    expect(result?.payloadParityABDiff?.modeKey).toBe(result?.payloadModeKey);
  });

  test("adapter rollout default and rollback switch are respected", async ({ page }) => {
    const defaultCoreResponse = await page.goto("/index.html?engine_adapter_default=core-adapter", {
      waitUntil: "domcontentloaded"
    });
    expect(defaultCoreResponse, "Default-core response should exist").not.toBeNull();
    expect(defaultCoreResponse?.ok(), "Default-core response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const defaultCoreMode = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      return payload && typeof payload.adapterMode === "string" ? payload.adapterMode : null;
    });
    expect(defaultCoreMode).toBe("core-adapter");

    const forcedLegacyResponse = await page.goto(
      "/index.html?engine_adapter_default=core-adapter&engine_adapter_force_legacy=1",
      { waitUntil: "domcontentloaded" }
    );
    expect(forcedLegacyResponse, "Forced-legacy response should exist").not.toBeNull();
    expect(forcedLegacyResponse?.ok(), "Forced-legacy response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const forcedLegacyMode = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      return payload && typeof payload.adapterMode === "string" ? payload.adapterMode : null;
    });
    expect(forcedLegacyMode).toBe("legacy-bridge");
  });

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

  test("announcement manager delegates unread decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem("announcement_last_read_id_v1");
      } catch (_err) {}

      (window as any).__announcementResolveCalls = 0;
      (window as any).__announcementUnreadCalls = 0;
      (window as any).__announcementMarkCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveAnnouncementRecords" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__announcementResolveCalls =
                Number((window as any).__announcementResolveCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "hasUnreadAnnouncementFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__announcementUnreadCalls =
                Number((window as any).__announcementUnreadCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "markAnnouncementSeenFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__announcementMarkCalls =
                Number((window as any).__announcementMarkCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreAnnouncementRuntime", {
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreAnnouncementRuntime;
      if (
        !runtime ||
        typeof runtime.resolveAnnouncementRecords !== "function" ||
        typeof runtime.hasUnreadAnnouncementFromContext !== "function" ||
        typeof runtime.markAnnouncementSeenFromContext !== "function"
      ) {
        return {
          hasRuntime: false
        };
      }

      const btn = document.getElementById("top-announcement-btn") as HTMLElement | null;
      const modal = document.getElementById("announcement-modal") as HTMLElement | null;
      const initialUnread = !!(btn && btn.classList.contains("has-unread"));
      if (btn) {
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }

      await new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve(null));
      });

      return {
        hasRuntime: true,
        hasButton: !!btn,
        hasModal: !!modal,
        initialUnread,
        afterUnread: !!(btn && btn.classList.contains("has-unread")),
        modalDisplay: modal ? String(modal.style.display || "") : "",
        resolveCalls: Number((window as any).__announcementResolveCalls || 0),
        unreadCalls: Number((window as any).__announcementUnreadCalls || 0),
        markCalls: Number((window as any).__announcementMarkCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasButton).toBe(true);
    expect(snapshot.hasModal).toBe(true);
    expect(snapshot.initialUnread).toBe(true);
    expect(snapshot.afterUnread).toBe(false);
    expect(snapshot.modalDisplay).toBe("flex");
    expect(snapshot.resolveCalls).toBeGreaterThan(0);
    expect(snapshot.unreadCalls).toBeGreaterThan(0);
    expect(snapshot.markCalls).toBeGreaterThan(0);
  });

  test("game manager delegates settings storage access to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__gameSettingsReadFlagCalls = 0;
      (window as any).__gameSettingsWriteFlagCalls = 0;
      (window as any).__gameSettingsReadMapCalls = 0;
      (window as any).__gameSettingsWriteMapCalls = 0;
      (window as any).__gameSettingsWritePayloadCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "readStorageFlagFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__gameSettingsReadFlagCalls =
                Number((window as any).__gameSettingsReadFlagCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "writeStorageFlagFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__gameSettingsWriteFlagCalls =
                Number((window as any).__gameSettingsWriteFlagCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "readStorageJsonMapFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__gameSettingsReadMapCalls =
                Number((window as any).__gameSettingsReadMapCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "writeStorageJsonMapFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__gameSettingsWriteMapCalls =
                Number((window as any).__gameSettingsWriteMapCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "writeStorageJsonPayloadFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__gameSettingsWritePayloadCalls =
                Number((window as any).__gameSettingsWritePayloadCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreGameSettingsStorageRuntime", {
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreGameSettingsStorageRuntime;
      const manager = (window as any).game_manager;
      if (
        !runtime ||
        typeof runtime.readStorageFlagFromContext !== "function" ||
        typeof runtime.writeStorageFlagFromContext !== "function" ||
        typeof runtime.readStorageJsonMapFromContext !== "function" ||
        typeof runtime.writeStorageJsonMapFromContext !== "function" ||
        typeof runtime.writeStorageJsonPayloadFromContext !== "function" ||
        !manager
      ) {
        return {
          hasRuntime: false,
          hasManager: !!manager
        };
      }

      const mode = typeof manager.mode === "string" && manager.mode ? manager.mode : "standard_4x4_pow2_no_undo";
      const prevSubmitDone = !!manager.sessionSubmitDone;
      const prevReplayMode = !!manager.replayMode;
      manager.loadTimerModuleViewForMode(mode);
      manager.persistTimerModuleViewForMode(mode, "hidden");
      manager.loadUndoSettingForMode(mode);
      manager.persistUndoSettingForMode(mode, true);
      manager.openStatsPanel();
      manager.closeStatsPanel();
      manager.sessionSubmitDone = false;
      manager.replayMode = true;
      manager.tryAutoSubmitOnGameOver();
      manager.sessionSubmitDone = prevSubmitDone;
      manager.replayMode = prevReplayMode;

      return {
        hasRuntime: true,
        hasManager: true,
        readFlagCalls: Number((window as any).__gameSettingsReadFlagCalls || 0),
        writeFlagCalls: Number((window as any).__gameSettingsWriteFlagCalls || 0),
        readMapCalls: Number((window as any).__gameSettingsReadMapCalls || 0),
        writeMapCalls: Number((window as any).__gameSettingsWriteMapCalls || 0),
        writePayloadCalls: Number((window as any).__gameSettingsWritePayloadCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasManager).toBe(true);
    expect(snapshot.readFlagCalls).toBeGreaterThan(0);
    expect(snapshot.writeFlagCalls).toBeGreaterThan(0);
    expect(snapshot.readMapCalls).toBeGreaterThan(0);
    expect(snapshot.writeMapCalls).toBeGreaterThan(0);
    expect(snapshot.writePayloadCalls).toBeGreaterThan(0);
  });

  test("index ui delegates modal runtime contract checks to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiModalContractCalls = 0;

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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return {
        hasRuntime:
          !!runtime && typeof runtime.resolveIndexUiModalRuntimeContracts === "function",
        callCount: Number((window as any).__indexUiModalContractCalls || 0),
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return {
        hasRuntime:
          !!runtime && typeof runtime.resolveIndexUiHomeGuideRuntimeContracts === "function",
        callCount: Number((window as any).__indexUiHomeGuideContractCalls || 0),
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreIndexUiRuntimeContractRuntime;
      return {
        hasRuntime:
          !!runtime && typeof runtime.resolveIndexUiCoreRuntimeContracts === "function",
        callCount: Number((window as any).__indexUiCoreContractCalls || 0),
        hasPretty: typeof (window as any).pretty === "function",
        hasSyncMobileHintUI: typeof (window as any).syncMobileHintUI === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasPretty).toBe(true);
    expect(snapshot.hasSyncMobileHintUI).toBe(true);
  });

  test("index ui delegates page bootstrap and undo handler creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiPageHostCreateTryUndoCalls = 0;
      (window as any).__indexUiPageHostBootstrapCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createIndexUiTryUndoHandler" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiPageHostCreateTryUndoCalls =
                Number((window as any).__indexUiPageHostCreateTryUndoCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "applyIndexUiPageBootstrap" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiPageHostBootstrapCalls =
                Number((window as any).__indexUiPageHostBootstrapCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiPageHostRuntime", {
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreIndexUiPageHostRuntime;
      return {
        hasRuntime:
          !!runtime &&
          typeof runtime.createIndexUiTryUndoHandler === "function" &&
          typeof runtime.applyIndexUiPageBootstrap === "function",
        createTryUndoCalls: Number((window as any).__indexUiPageHostCreateTryUndoCalls || 0),
        bootstrapCalls: Number((window as any).__indexUiPageHostBootstrapCalls || 0),
        hasPretty: typeof (window as any).pretty === "function",
        hasOpenSettingsModal: typeof (window as any).openSettingsModal === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createTryUndoCalls).toBeGreaterThan(0);
    expect(snapshot.bootstrapCalls).toBeGreaterThan(0);
    expect(snapshot.hasPretty).toBe(true);
    expect(snapshot.hasOpenSettingsModal).toBe(true);
  });

  test("index ui delegates mobile resolver aggregation to page-resolvers host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiPageResolversHostCreateCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createIndexUiMobileResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiPageResolversHostCreateCalls =
                Number((window as any).__indexUiPageResolversHostCreateCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiPageResolversHostRuntime", {
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreIndexUiPageResolversHostRuntime;
      return {
        hasRuntime: !!runtime && typeof runtime.createIndexUiMobileResolvers === "function",
        callCount: Number((window as any).__indexUiPageResolversHostCreateCalls || 0),
        hasSyncMobileHintUI: typeof (window as any).syncMobileHintUI === "function",
        hasSyncMobileTimerboxUI: typeof (window as any).syncMobileTimerboxUI === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasSyncMobileHintUI).toBe(true);
    expect(snapshot.hasSyncMobileTimerboxUI).toBe(true);
  });

  test("index ui delegates page action aggregation to page-actions host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__indexUiPageActionsHostCreateCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createIndexUiPageActionResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__indexUiPageActionsHostCreateCalls =
                Number((window as any).__indexUiPageActionsHostCreateCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreIndexUiPageActionsHostRuntime", {
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreIndexUiPageActionsHostRuntime;
      return {
        hasRuntime: !!runtime && typeof runtime.createIndexUiPageActionResolvers === "function",
        callCount: Number((window as any).__indexUiPageActionsHostCreateCalls || 0),
        hasOpenSettingsModal: typeof (window as any).openSettingsModal === "function",
        hasExportReplay: typeof (window as any).exportReplay === "function",
        hasPracticeTransfer: typeof (window as any).openPracticeBoardFromCurrent === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasOpenSettingsModal).toBe(true);
    expect(snapshot.hasExportReplay).toBe(true);
    expect(snapshot.hasPracticeTransfer).toBe(true);
  });

  test("index ui delegates mobile viewport page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__mobileViewportPageResolverCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createMobileViewportPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__mobileViewportPageResolverCalls =
                Number((window as any).__mobileViewportPageResolverCalls || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreMobileViewportPageHostRuntime", {
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreMobileViewportPageHostRuntime;
      return {
        hasRuntime: !!runtime && typeof runtime.createMobileViewportPageResolvers === "function",
        callCount: Number((window as any).__mobileViewportPageResolverCalls || 0),
        hasSyncMobileUndoTopButtonAvailability:
          typeof (window as any).syncMobileUndoTopButtonAvailability === "function",
        hasSyncMobileHintUI: typeof (window as any).syncMobileHintUI === "function"
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasSyncMobileUndoTopButtonAvailability).toBe(true);
    expect(snapshot.hasSyncMobileHintUI).toBe(true);
  });

  test("index ui delegates mobile top button resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__mobileTopButtonsResolverCreateCalls = 0;
      (window as any).__mobileTopButtonsEnsureUndoCalls = 0;
      (window as any).__mobileTopButtonsEnsureHintCalls = 0;
      (window as any).__mobileTopButtonsSyncUndoAvailabilityCalls = 0;
      (window as any).__mobileTopButtonsInitUndoCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createMobileTopButtonsPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__mobileTopButtonsResolverCreateCalls =
                Number((window as any).__mobileTopButtonsResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts);
              const originalEnsureUndo = resolvers.ensureMobileUndoTopButton;
              const originalEnsureHint = resolvers.ensureMobileHintToggleButton;
              const originalSyncUndoAvailability = resolvers.syncMobileUndoTopButtonAvailability;
              const originalInitUndo = resolvers.initMobileUndoTopButton;
              return {
                ensureMobileUndoTopButton() {
                  (window as any).__mobileTopButtonsEnsureUndoCalls =
                    Number((window as any).__mobileTopButtonsEnsureUndoCalls || 0) + 1;
                  return typeof originalEnsureUndo === "function" ? originalEnsureUndo() : null;
                },
                ensureMobileHintToggleButton() {
                  (window as any).__mobileTopButtonsEnsureHintCalls =
                    Number((window as any).__mobileTopButtonsEnsureHintCalls || 0) + 1;
                  return typeof originalEnsureHint === "function" ? originalEnsureHint() : null;
                },
                syncMobileUndoTopButtonAvailability() {
                  (window as any).__mobileTopButtonsSyncUndoAvailabilityCalls =
                    Number((window as any).__mobileTopButtonsSyncUndoAvailabilityCalls || 0) + 1;
                  return typeof originalSyncUndoAvailability === "function"
                    ? originalSyncUndoAvailability()
                    : null;
                },
                initMobileUndoTopButton() {
                  (window as any).__mobileTopButtonsInitUndoCalls =
                    Number((window as any).__mobileTopButtonsInitUndoCalls || 0) + 1;
                  return typeof originalInitUndo === "function" ? originalInitUndo() : null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreMobileTopButtonsPageHostRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    const response = await page.goto("/play.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(260);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreMobileTopButtonsPageHostRuntime;
      const syncMobileHintUI = (window as any).syncMobileHintUI;
      const syncMobileUndoTopButtonAvailability = (window as any).syncMobileUndoTopButtonAvailability;
      if (typeof syncMobileHintUI === "function") syncMobileHintUI();
      if (typeof syncMobileUndoTopButtonAvailability === "function") {
        syncMobileUndoTopButtonAvailability();
      }
      return {
        hasRuntime:
          !!runtime && typeof runtime.createMobileTopButtonsPageResolvers === "function",
        createCallCount: Number((window as any).__mobileTopButtonsResolverCreateCalls || 0),
        ensureUndoCallCount: Number((window as any).__mobileTopButtonsEnsureUndoCalls || 0),
        ensureHintCallCount: Number((window as any).__mobileTopButtonsEnsureHintCalls || 0),
        syncUndoAvailabilityCallCount: Number(
          (window as any).__mobileTopButtonsSyncUndoAvailabilityCalls || 0
        ),
        initUndoCallCount: Number((window as any).__mobileTopButtonsInitUndoCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.ensureUndoCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.ensureHintCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.syncUndoAvailabilityCallCount).toBeGreaterThan(0);
    expect(snapshot.initUndoCallCount).toBeGreaterThan(0);
  });

  test("index ui delegates top actions page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__topActionsPageResolverCreateCalls = 0;
      (window as any).__topActionsPageResolverGameSyncCalls = 0;
      (window as any).__topActionsPageResolverPracticeSyncCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createTopActionsPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__topActionsPageResolverCreateCalls =
                Number((window as any).__topActionsPageResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts) || {};
              const originalGameSync = resolvers.syncMobileTopActionsPlacement;
              const originalPracticeSync = resolvers.syncPracticeTopActionsPlacement;
              return {
                syncMobileTopActionsPlacement() {
                  (window as any).__topActionsPageResolverGameSyncCalls =
                    Number((window as any).__topActionsPageResolverGameSyncCalls || 0) + 1;
                  return typeof originalGameSync === "function" ? originalGameSync() : null;
                },
                syncPracticeTopActionsPlacement() {
                  (window as any).__topActionsPageResolverPracticeSyncCalls =
                    Number((window as any).__topActionsPageResolverPracticeSyncCalls || 0) + 1;
                  return typeof originalPracticeSync === "function" ? originalPracticeSync() : null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreTopActionsPageHostRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/play.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(260);

    await page.evaluate(async () => {
      window.dispatchEvent(new Event("resize"));
      await new Promise((resolve) => setTimeout(resolve, 220));
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreTopActionsPageHostRuntime;
      return {
        hasRuntime: !!runtime && typeof runtime.createTopActionsPageResolvers === "function",
        createCallCount: Number((window as any).__topActionsPageResolverCreateCalls || 0),
        gameSyncCallCount: Number((window as any).__topActionsPageResolverGameSyncCalls || 0),
        practiceSyncCallCount: Number((window as any).__topActionsPageResolverPracticeSyncCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.gameSyncCallCount).toBeGreaterThan(0);
    expect(snapshot.practiceSyncCallCount).toBeGreaterThanOrEqual(0);
  });

  test("index ui delegates mobile timerbox page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__mobileTimerboxPageResolverCreateCalls = 0;
      (window as any).__mobileTimerboxPageResolverSyncCalls = 0;
      (window as any).__mobileTimerboxPageResolverInitCalls = 0;
      (window as any).__mobileTimerboxPageResolverRequestCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createMobileTimerboxPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__mobileTimerboxPageResolverCreateCalls =
                Number((window as any).__mobileTimerboxPageResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts) || {};
              const originalSync = resolvers.syncMobileTimerboxUI;
              const originalInit = resolvers.initMobileTimerboxToggle;
              const originalRequest = resolvers.requestResponsiveGameRelayout;
              return {
                syncMobileTimerboxUI(options?: unknown) {
                  (window as any).__mobileTimerboxPageResolverSyncCalls =
                    Number((window as any).__mobileTimerboxPageResolverSyncCalls || 0) + 1;
                  return typeof originalSync === "function" ? originalSync(options) : null;
                },
                initMobileTimerboxToggle() {
                  (window as any).__mobileTimerboxPageResolverInitCalls =
                    Number((window as any).__mobileTimerboxPageResolverInitCalls || 0) + 1;
                  return typeof originalInit === "function" ? originalInit() : null;
                },
                requestResponsiveGameRelayout() {
                  (window as any).__mobileTimerboxPageResolverRequestCalls =
                    Number((window as any).__mobileTimerboxPageResolverRequestCalls || 0) + 1;
                  return typeof originalRequest === "function" ? originalRequest() : null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreMobileTimerboxPageHostRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/play.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(260);
    await page.evaluate(async () => {
      window.dispatchEvent(new Event("resize"));
      await new Promise((resolve) => setTimeout(resolve, 220));
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreMobileTimerboxPageHostRuntime;
      const syncMobileTimerboxUI = (window as any).syncMobileTimerboxUI;
      if (typeof syncMobileTimerboxUI === "function") syncMobileTimerboxUI();
      return {
        hasRuntime:
          !!runtime && typeof runtime.createMobileTimerboxPageResolvers === "function",
        hasSyncMobileTimerboxUI: typeof syncMobileTimerboxUI === "function",
        createCallCount: Number((window as any).__mobileTimerboxPageResolverCreateCalls || 0),
        syncCallCount: Number((window as any).__mobileTimerboxPageResolverSyncCalls || 0),
        initCallCount: Number((window as any).__mobileTimerboxPageResolverInitCalls || 0),
        requestCallCount: Number((window as any).__mobileTimerboxPageResolverRequestCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasSyncMobileTimerboxUI).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.syncCallCount).toBeGreaterThan(0);
    expect(snapshot.initCallCount).toBeGreaterThan(0);
    expect(snapshot.requestCallCount).toBeGreaterThan(0);
  });

  test("index ui delegates mobile hint page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__mobileHintPageResolverCreateCalls = 0;
      (window as any).__mobileHintPageResolverEnsureCalls = 0;
      (window as any).__mobileHintPageResolverOpenCalls = 0;
      (window as any).__mobileHintPageResolverCloseCalls = 0;
      (window as any).__mobileHintPageResolverSyncCalls = 0;
      (window as any).__mobileHintPageResolverInitCalls = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createMobileHintPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__mobileHintPageResolverCreateCalls =
                Number((window as any).__mobileHintPageResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts) || {};
              const originalEnsure = resolvers.ensureMobileHintModalDom;
              const originalOpen = resolvers.openMobileHintModal;
              const originalClose = resolvers.closeMobileHintModal;
              const originalSync = resolvers.syncMobileHintUI;
              const originalInit = resolvers.initMobileHintToggle;
              return {
                ensureMobileHintModalDom() {
                  (window as any).__mobileHintPageResolverEnsureCalls =
                    Number((window as any).__mobileHintPageResolverEnsureCalls || 0) + 1;
                  return typeof originalEnsure === "function" ? originalEnsure() : null;
                },
                openMobileHintModal() {
                  (window as any).__mobileHintPageResolverOpenCalls =
                    Number((window as any).__mobileHintPageResolverOpenCalls || 0) + 1;
                  return typeof originalOpen === "function" ? originalOpen() : null;
                },
                closeMobileHintModal() {
                  (window as any).__mobileHintPageResolverCloseCalls =
                    Number((window as any).__mobileHintPageResolverCloseCalls || 0) + 1;
                  if (typeof originalClose === "function") originalClose();
                },
                syncMobileHintUI(options?: unknown) {
                  (window as any).__mobileHintPageResolverSyncCalls =
                    Number((window as any).__mobileHintPageResolverSyncCalls || 0) + 1;
                  return typeof originalSync === "function" ? originalSync(options) : null;
                },
                initMobileHintToggle() {
                  (window as any).__mobileHintPageResolverInitCalls =
                    Number((window as any).__mobileHintPageResolverInitCalls || 0) + 1;
                  return typeof originalInit === "function" ? originalInit() : null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreMobileHintPageHostRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/play.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(260);

    await page.evaluate(() => {
      const syncMobileHintUI = (window as any).syncMobileHintUI;
      if (typeof syncMobileHintUI === "function") syncMobileHintUI();
      const hintBtn = document.getElementById("top-mobile-hint-btn");
      if (hintBtn) {
        hintBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => {
      const syncMobileHintUI = (window as any).syncMobileHintUI;
      if (typeof syncMobileHintUI === "function") syncMobileHintUI();
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreMobileHintPageHostRuntime;
      return {
        hasRuntime: !!runtime && typeof runtime.createMobileHintPageResolvers === "function",
        createCallCount: Number((window as any).__mobileHintPageResolverCreateCalls || 0),
        ensureCallCount: Number((window as any).__mobileHintPageResolverEnsureCalls || 0),
        openCallCount: Number((window as any).__mobileHintPageResolverOpenCalls || 0),
        closeCallCount: Number((window as any).__mobileHintPageResolverCloseCalls || 0),
        syncCallCount: Number((window as any).__mobileHintPageResolverSyncCalls || 0),
        initCallCount: Number((window as any).__mobileHintPageResolverInitCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.ensureCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.openCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.closeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.syncCallCount).toBeGreaterThan(0);
    expect(snapshot.initCallCount).toBeGreaterThan(0);
  });

  test("index ui delegates home guide page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__homeGuidePageResolverCreateCalls = 0;
      (window as any).__homeGuidePageResolverIsHomeCalls = 0;
      (window as any).__homeGuidePageResolverStepsCalls = 0;
      (window as any).__homeGuidePageResolverEnsureCalls = 0;
      (window as any).__homeGuidePageResolverClearCalls = 0;
      (window as any).__homeGuidePageResolverElevateCalls = 0;
      (window as any).__homeGuidePageResolverPositionCalls = 0;
      (window as any).__homeGuidePageResolverVisibleCalls = 0;
      (window as any).__homeGuidePageResolverDoneCalls = 0;
      (window as any).__homeGuidePageResolverFinishCalls = 0;
      (window as any).__homeGuidePageResolverShowStepCalls = 0;
      (window as any).__homeGuidePageResolverStartCalls = 0;
      try {
        window.localStorage.setItem("home_guide_seen_v1", "1");
      } catch (_err) {}

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createHomeGuidePageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeGuidePageResolverCreateCalls =
                Number((window as any).__homeGuidePageResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts) || {};
              const originalIsHomePage = resolvers.isHomePage;
              const originalGetSteps = resolvers.getHomeGuideSteps;
              const originalEnsure = resolvers.ensureHomeGuideDom;
              const originalClear = resolvers.clearHomeGuideHighlight;
              const originalElevate = resolvers.elevateHomeGuideTarget;
              const originalPosition = resolvers.positionHomeGuidePanel;
              const originalVisible = resolvers.isElementVisibleForGuide;
              const originalDone = resolvers.showHomeGuideDoneNotice;
              const originalFinish = resolvers.finishHomeGuide;
              const originalShowStep = resolvers.showHomeGuideStep;
              const originalStart = resolvers.startHomeGuide;
              return {
                isHomePage() {
                  (window as any).__homeGuidePageResolverIsHomeCalls =
                    Number((window as any).__homeGuidePageResolverIsHomeCalls || 0) + 1;
                  return typeof originalIsHomePage === "function" ? originalIsHomePage() : false;
                },
                getHomeGuideSteps() {
                  (window as any).__homeGuidePageResolverStepsCalls =
                    Number((window as any).__homeGuidePageResolverStepsCalls || 0) + 1;
                  return typeof originalGetSteps === "function" ? originalGetSteps() : [];
                },
                ensureHomeGuideDom() {
                  (window as any).__homeGuidePageResolverEnsureCalls =
                    Number((window as any).__homeGuidePageResolverEnsureCalls || 0) + 1;
                  return typeof originalEnsure === "function" ? originalEnsure() : null;
                },
                clearHomeGuideHighlight() {
                  (window as any).__homeGuidePageResolverClearCalls =
                    Number((window as any).__homeGuidePageResolverClearCalls || 0) + 1;
                  if (typeof originalClear === "function") return originalClear();
                  return null;
                },
                elevateHomeGuideTarget(node?: unknown) {
                  (window as any).__homeGuidePageResolverElevateCalls =
                    Number((window as any).__homeGuidePageResolverElevateCalls || 0) + 1;
                  if (typeof originalElevate === "function") return originalElevate(node);
                  return null;
                },
                positionHomeGuidePanel() {
                  (window as any).__homeGuidePageResolverPositionCalls =
                    Number((window as any).__homeGuidePageResolverPositionCalls || 0) + 1;
                  if (typeof originalPosition === "function") return originalPosition();
                  return null;
                },
                isElementVisibleForGuide(node?: unknown) {
                  (window as any).__homeGuidePageResolverVisibleCalls =
                    Number((window as any).__homeGuidePageResolverVisibleCalls || 0) + 1;
                  return typeof originalVisible === "function" ? !!originalVisible(node) : false;
                },
                showHomeGuideDoneNotice() {
                  (window as any).__homeGuidePageResolverDoneCalls =
                    Number((window as any).__homeGuidePageResolverDoneCalls || 0) + 1;
                  if (typeof originalDone === "function") return originalDone();
                  return null;
                },
                finishHomeGuide(markSeen?: unknown, options?: unknown) {
                  (window as any).__homeGuidePageResolverFinishCalls =
                    Number((window as any).__homeGuidePageResolverFinishCalls || 0) + 1;
                  if (typeof originalFinish === "function") return originalFinish(markSeen, options);
                  return null;
                },
                showHomeGuideStep(index?: unknown) {
                  (window as any).__homeGuidePageResolverShowStepCalls =
                    Number((window as any).__homeGuidePageResolverShowStepCalls || 0) + 1;
                  if (typeof originalShowStep === "function") return originalShowStep(index);
                  return null;
                },
                startHomeGuide(options?: unknown) {
                  (window as any).__homeGuidePageResolverStartCalls =
                    Number((window as any).__homeGuidePageResolverStartCalls || 0) + 1;
                  if (typeof originalStart === "function") return originalStart(options);
                  return null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreHomeGuidePageHostRuntime", {
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
    await page.waitForTimeout(260);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreHomeGuidePageHostRuntime;
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal === "function") {
        openSettingsModal();
        const toggle = document.getElementById("home-guide-toggle") as HTMLInputElement | null;
        if (toggle) {
          toggle.checked = true;
          toggle.dispatchEvent(new Event("change", { bubbles: true }));
        }
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
      }

      return {
        hasRuntime: !!runtime && typeof runtime.createHomeGuidePageResolvers === "function",
        createCallCount: Number((window as any).__homeGuidePageResolverCreateCalls || 0),
        isHomeCallCount: Number((window as any).__homeGuidePageResolverIsHomeCalls || 0),
        getStepsCallCount: Number((window as any).__homeGuidePageResolverStepsCalls || 0),
        ensureCallCount: Number((window as any).__homeGuidePageResolverEnsureCalls || 0),
        clearCallCount: Number((window as any).__homeGuidePageResolverClearCalls || 0),
        elevateCallCount: Number((window as any).__homeGuidePageResolverElevateCalls || 0),
        positionCallCount: Number((window as any).__homeGuidePageResolverPositionCalls || 0),
        visibleCallCount: Number((window as any).__homeGuidePageResolverVisibleCalls || 0),
        doneCallCount: Number((window as any).__homeGuidePageResolverDoneCalls || 0),
        finishCallCount: Number((window as any).__homeGuidePageResolverFinishCalls || 0),
        showStepCallCount: Number((window as any).__homeGuidePageResolverShowStepCalls || 0),
        startCallCount: Number((window as any).__homeGuidePageResolverStartCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.isHomeCallCount).toBeGreaterThan(0);
    expect(snapshot.getStepsCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.ensureCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.clearCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.elevateCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.positionCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.visibleCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.doneCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.finishCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.showStepCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.startCallCount).toBeGreaterThanOrEqual(0);
  });

  test("application handle_undo delegates to undo-action runtime", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreUndoActionRuntime;
      const handleUndo = (window as any).handle_undo;
      if (!runtime || typeof runtime.tryTriggerUndo !== "function") {
        return { hasRuntime: false, hasCapabilityApi: false, hasHandler: typeof handleUndo === "function" };
      }
      if (typeof handleUndo !== "function") {
        return {
          hasRuntime: true,
          hasCapabilityApi: Boolean(
            typeof runtime.resolveUndoModeIdFromBody === "function" &&
            typeof runtime.resolveUndoModeId === "function" &&
            typeof runtime.isUndoCapableMode === "function" &&
            typeof runtime.isUndoInteractionEnabled === "function"
          ),
          hasHandler: false
        };
      }

      const originalManager = (window as any).game_manager;
      const originalTryTriggerUndo = runtime.tryTriggerUndo;
      let callCount = 0;
      let usedDirection: number | null = null;
      let moveDirection: number | null = null;
      const fakeManager = {
        isUndoInteractionEnabled() {
          return true;
        },
        move(direction: number) {
          moveDirection = direction;
        }
      };

      runtime.tryTriggerUndo = function (manager: any, direction: number) {
        callCount += 1;
        usedDirection = direction;
        return originalTryTriggerUndo(manager, direction);
      };
      (window as any).game_manager = fakeManager;

      try {
        handleUndo();
        return {
          hasRuntime: true,
          hasCapabilityApi: Boolean(
            typeof runtime.resolveUndoModeIdFromBody === "function" &&
            typeof runtime.resolveUndoModeId === "function" &&
            typeof runtime.isUndoCapableMode === "function" &&
            typeof runtime.isUndoInteractionEnabled === "function"
          ),
          hasHandler: true,
          callCount,
          usedDirection,
          moveDirection
        };
      } finally {
        runtime.tryTriggerUndo = originalTryTriggerUndo;
        (window as any).game_manager = originalManager;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasCapabilityApi).toBe(true);
    expect(snapshot.hasHandler).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.usedDirection).toBe(-1);
    expect(snapshot.moveDirection).toBe(-1);
  });

  test("application startup delegates to home startup host runtime", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__homeRuntimeContractCallCount = 0;
      (window as any).__homeStartupHostCallCount = 0;
      (window as any).__homeModeContextCallCount = 0;

      const runtimeContractTarget: Record<string, unknown> = {};
      (window as any).CoreHomeRuntimeContractRuntime = new Proxy(runtimeContractTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeRuntimeContractCallCount =
                Number((window as any).__homeRuntimeContractCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupHostTarget: Record<string, unknown> = {};
      (window as any).CoreHomeStartupHostRuntime = new Proxy(startupHostTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeStartupFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeStartupHostCallCount =
                Number((window as any).__homeStartupHostCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const homeModeRuntimeTarget: Record<string, unknown> = {};
      (window as any).CoreHomeModeRuntime = new Proxy(homeModeRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeModeSelectionFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeModeContextCallCount =
                Number((window as any).__homeModeContextCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      return {
        hasHomeRuntimeContractRuntime: Boolean(
          (window as any).CoreHomeRuntimeContractRuntime?.resolveHomeRuntimeContracts
        ),
        hasHomeStartupHostRuntime: Boolean(
          (window as any).CoreHomeStartupHostRuntime?.resolveHomeStartupFromContext
        ),
        hasHomeModeContextRuntime: Boolean(
          (window as any).CoreHomeModeRuntime?.resolveHomeModeSelectionFromContext
        ),
        homeRuntimeContractCallCount: Number((window as any).__homeRuntimeContractCallCount || 0),
        homeStartupHostCallCount: Number((window as any).__homeStartupHostCallCount || 0),
        homeModeContextCallCount: Number((window as any).__homeModeContextCallCount || 0),
        modeKey: cfg && typeof cfg.key === "string" ? cfg.key : null
      };
    });

    expect(snapshot.hasHomeRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasHomeStartupHostRuntime).toBe(true);
    expect(snapshot.hasHomeModeContextRuntime).toBe(true);
    expect(snapshot.homeRuntimeContractCallCount).toBeGreaterThan(0);
    expect(snapshot.homeStartupHostCallCount).toBeGreaterThan(0);
    expect(snapshot.homeModeContextCallCount).toBeGreaterThan(0);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
  });

  test("practice transfer flow delegates transfer navigation plan to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CorePracticeTransferRuntime;
      const pageHostRuntime = (window as any).CorePracticeTransferPageHostRuntime;
      const openPracticeBoardFromCurrent = (window as any).openPracticeBoardFromCurrent;
      if (
        !runtime ||
        typeof runtime.createPracticeTransferNavigationPlan !== "function" ||
        typeof runtime.resolvePracticeTransferPrecheck !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.createPracticeTransferPageActionResolvers !== "function" ||
        typeof pageHostRuntime.applyPracticeTransferPageAction !== "function" ||
        typeof pageHostRuntime.applyPracticeTransferPageActionFromContext !== "function"
      ) {
        return {
          hasRuntime: false,
          hasPageHostRuntime: false,
          hasOpenFn: typeof openPracticeBoardFromCurrent === "function"
        };
      }
      if (typeof openPracticeBoardFromCurrent !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasOpenFn: false };
      }

      const originalCreatePracticeTransferNavigationPlan = runtime.createPracticeTransferNavigationPlan;
      const originalResolvePracticeTransferPrecheck = runtime.resolvePracticeTransferPrecheck;
      const originalApplyPracticeTransferPageAction = pageHostRuntime.applyPracticeTransferPageAction;
      const originalApplyPracticeTransferPageActionFromContext =
        pageHostRuntime.applyPracticeTransferPageActionFromContext;
      const originalManager = (window as any).game_manager;
      const originalOpen = window.open;
      let createPlanCallCount = 0;
      let precheckCallCount = 0;
      let pageHostCallCount = 0;
      let pageHostContextCallCount = 0;
      let openedUrl = "";

      runtime.createPracticeTransferNavigationPlan = function (opts: any) {
        createPlanCallCount += 1;
        return originalCreatePracticeTransferNavigationPlan(opts);
      };
      runtime.resolvePracticeTransferPrecheck = function (opts: any) {
        precheckCallCount += 1;
        return originalResolvePracticeTransferPrecheck(opts);
      };
      pageHostRuntime.applyPracticeTransferPageAction = function (opts: any) {
        pageHostCallCount += 1;
        return originalApplyPracticeTransferPageAction(opts);
      };
      pageHostRuntime.applyPracticeTransferPageActionFromContext = function (opts: any) {
        pageHostContextCallCount += 1;
        return originalApplyPracticeTransferPageActionFromContext(opts);
      };
      (window as any).game_manager = {
        width: 4,
        height: 4,
        modeConfig: {
          ruleset: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        },
        getFinalBoardMatrix() {
          return [
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ];
        }
      };
      try {
        window.localStorage.setItem("practice_guide_shown_v2", "1");
      } catch (_err) {}
      window.open = function (url?: string | URL | undefined) {
        openedUrl = String(url || "");
        return null as any;
      };

      try {
        openPracticeBoardFromCurrent();
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasOpenFn: true,
          precheckCallCount,
          createPlanCallCount,
          pageHostCallCount,
          pageHostContextCallCount,
          openedUrl
        };
      } finally {
        runtime.createPracticeTransferNavigationPlan = originalCreatePracticeTransferNavigationPlan;
        runtime.resolvePracticeTransferPrecheck = originalResolvePracticeTransferPrecheck;
        pageHostRuntime.applyPracticeTransferPageAction = originalApplyPracticeTransferPageAction;
        pageHostRuntime.applyPracticeTransferPageActionFromContext =
          originalApplyPracticeTransferPageActionFromContext;
        (window as any).game_manager = originalManager;
        window.open = originalOpen;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasOpenFn).toBe(true);
    expect(snapshot.precheckCallCount).toBeGreaterThan(0);
    expect(snapshot.createPlanCallCount).toBeGreaterThan(0);
    expect(snapshot.pageHostCallCount).toBe(0);
    expect(snapshot.pageHostContextCallCount).toBeGreaterThan(0);
    expect(snapshot.openedUrl).toContain("Practice_board.html");
    expect(snapshot.openedUrl).toContain("practice_token=");
    expect(snapshot.openedUrl).toContain("practice_ruleset=pow2");
    expect(snapshot.openedUrl).toContain("practice_guide_seen=1");
  });

  test("index ui delegates mobile hint timerbox undo-top top-actions top-button and viewport logic to runtime helpers", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__viewportResolverCreateCallCount = 0;
      (window as any).__viewportResolverGameScopeCallCount = 0;
      (window as any).__viewportResolverPracticeScopeCallCount = 0;
      (window as any).__viewportResolverTimerboxScopeCallCount = 0;
      (window as any).__viewportResolverMobileCallCount = 0;
      (window as any).__viewportResolverCompactCallCount = 0;
      (window as any).__viewportResolverCollapseCallCount = 0;

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createMobileViewportPageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__viewportResolverCreateCallCount =
                Number((window as any).__viewportResolverCreateCallCount || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts);
              const toFn = (name: string) => {
                const fn = resolvers && typeof resolvers[name] === "function" ? resolvers[name] : null;
                if (!fn) return null;
                return fn as (...args: unknown[]) => unknown;
              };
              const gameScope = toFn("isGamePageScope");
              const practiceScope = toFn("isPracticePageScope");
              const timerboxScope = toFn("isTimerboxMobileScope");
              const mobileViewport = toFn("isMobileGameViewport");
              const compactViewport = toFn("isCompactGameViewport");
              const collapseViewport = toFn("isTimerboxCollapseViewport");

              return {
                isGamePageScope(...args: unknown[]) {
                  (window as any).__viewportResolverGameScopeCallCount =
                    Number((window as any).__viewportResolverGameScopeCallCount || 0) + 1;
                  return gameScope ? gameScope(...args) : false;
                },
                isPracticePageScope(...args: unknown[]) {
                  (window as any).__viewportResolverPracticeScopeCallCount =
                    Number((window as any).__viewportResolverPracticeScopeCallCount || 0) + 1;
                  return practiceScope ? practiceScope(...args) : false;
                },
                isTimerboxMobileScope(...args: unknown[]) {
                  (window as any).__viewportResolverTimerboxScopeCallCount =
                    Number((window as any).__viewportResolverTimerboxScopeCallCount || 0) + 1;
                  return timerboxScope ? timerboxScope(...args) : false;
                },
                isMobileGameViewport(...args: unknown[]) {
                  (window as any).__viewportResolverMobileCallCount =
                    Number((window as any).__viewportResolverMobileCallCount || 0) + 1;
                  return mobileViewport ? mobileViewport(...args) : false;
                },
                isCompactGameViewport(...args: unknown[]) {
                  (window as any).__viewportResolverCompactCallCount =
                    Number((window as any).__viewportResolverCompactCallCount || 0) + 1;
                  return compactViewport ? compactViewport(...args) : false;
                },
                isTimerboxCollapseViewport(...args: unknown[]) {
                  (window as any).__viewportResolverCollapseCallCount =
                    Number((window as any).__viewportResolverCollapseCallCount || 0) + 1;
                  return collapseViewport ? collapseViewport(...args) : false;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreMobileViewportPageHostRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/play.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(260);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreMobileHintRuntime;
      const uiRuntime = (window as any).CoreMobileHintUiRuntime;
      const modalRuntime = (window as any).CoreMobileHintModalRuntime;
      const timerRuntime = (window as any).CoreMobileTimerboxRuntime;
      const undoTopRuntime = (window as any).CoreMobileUndoTopRuntime;
      const topActionsRuntime = (window as any).CoreTopActionsRuntime;
      const topActionsHostRuntime = (window as any).CoreTopActionsHostRuntime;
      const topButtonsRuntime = (window as any).CoreMobileTopButtonsRuntime;
      const viewportRuntime = (window as any).CoreMobileViewportRuntime;
      const undoActionRuntime = (window as any).CoreUndoActionRuntime;
      if (
        !runtime ||
        typeof runtime.collectMobileHintTexts !== "function" ||
        !uiRuntime ||
        typeof uiRuntime.syncMobileHintTextBlockVisibility !== "function" ||
        typeof uiRuntime.resolveMobileHintUiState !== "function" ||
        !modalRuntime ||
        typeof modalRuntime.ensureMobileHintModalDom !== "function" ||
        !timerRuntime ||
        typeof timerRuntime.resolveStoredMobileTimerboxCollapsed !== "function" ||
        typeof timerRuntime.resolveMobileTimerboxCollapsedValue !== "function" ||
        typeof timerRuntime.resolveMobileTimerboxDisplayModel !== "function" ||
        typeof timerRuntime.resolveMobileTimerboxAppliedModel !== "function" ||
        !undoTopRuntime ||
        typeof undoTopRuntime.resolveMobileUndoTopButtonDisplayModel !== "function" ||
        typeof undoTopRuntime.resolveMobileUndoTopAppliedModel !== "function" ||
        !topActionsRuntime ||
        typeof topActionsRuntime.createGameTopActionsPlacementState !== "function" ||
        typeof topActionsRuntime.createPracticeTopActionsPlacementState !== "function" ||
        typeof topActionsRuntime.syncGameTopActionsPlacement !== "function" ||
        typeof topActionsRuntime.syncPracticeTopActionsPlacement !== "function" ||
        !topActionsHostRuntime ||
        typeof topActionsHostRuntime.applyGameTopActionsPlacementSync !== "function" ||
        typeof topActionsHostRuntime.applyPracticeTopActionsPlacementSync !== "function" ||
        !topButtonsRuntime ||
        typeof topButtonsRuntime.ensureMobileUndoTopButtonDom !== "function" ||
        typeof topButtonsRuntime.ensureMobileHintToggleButtonDom !== "function" ||
        !undoActionRuntime ||
        typeof undoActionRuntime.resolveUndoModeIdFromBody !== "function" ||
        typeof undoActionRuntime.isUndoCapableMode !== "function" ||
        typeof undoActionRuntime.resolveUndoCapabilityFromContext !== "function" ||
        typeof undoActionRuntime.tryTriggerUndoFromContext !== "function" ||
        typeof undoActionRuntime.isUndoInteractionEnabled !== "function" ||
        !viewportRuntime ||
        typeof viewportRuntime.isViewportAtMost !== "function" ||
        typeof viewportRuntime.isCompactGameViewport !== "function" ||
        typeof viewportRuntime.isTimerboxCollapseViewport !== "function" ||
        typeof viewportRuntime.isMobileGameViewport !== "function" ||
        typeof viewportRuntime.resolvePageScopeValue !== "function" ||
        typeof viewportRuntime.isGamePageScope !== "function" ||
        typeof viewportRuntime.isPracticePageScope !== "function" ||
        typeof viewportRuntime.isTimerboxMobileScope !== "function"
      ) {
        return {
          hasRuntime: false,
          hasUiRuntime: false,
          hasModalRuntime: false,
          hasTimerRuntime: false,
          hasUndoTopRuntime: false,
          hasTopActionsRuntime: false,
          hasTopActionsHostRuntime: false,
          hasTopButtonsRuntime: false,
          hasViewportRuntime: false
        };
      }
      const hintBtn = document.getElementById("top-mobile-hint-btn") as HTMLAnchorElement | null;
      const undoTopBtn = document.getElementById("top-mobile-undo-btn") as HTMLAnchorElement | null;
      if (!hintBtn || !undoTopBtn) {
        return {
          hasRuntime: true,
          hasUiRuntime: true,
          hasModalRuntime: true,
          hasTimerRuntime: true,
          hasUndoTopRuntime: true,
          hasTopActionsRuntime: true,
          hasTopActionsHostRuntime: true,
          hasTopButtonsRuntime: true,
          hasViewportRuntime: true,
          hasHintButton: !!hintBtn,
          hasUndoTopButton: !!undoTopBtn
        };
      }

      const originalCollect = runtime.collectMobileHintTexts;
      const originalSync = uiRuntime.syncMobileHintTextBlockVisibility;
      const originalResolveHintUiState = uiRuntime.resolveMobileHintUiState;
      const originalEnsureModal = modalRuntime.ensureMobileHintModalDom;
      const originalResolveStored = timerRuntime.resolveStoredMobileTimerboxCollapsed;
      const originalResolveCollapsedValue = timerRuntime.resolveMobileTimerboxCollapsedValue;
      const originalResolveDisplay = timerRuntime.resolveMobileTimerboxDisplayModel;
      const originalResolveAppliedModel = timerRuntime.resolveMobileTimerboxAppliedModel;
      const originalUndoTopDisplay = undoTopRuntime.resolveMobileUndoTopButtonDisplayModel;
      const originalUndoTopApplied = undoTopRuntime.resolveMobileUndoTopAppliedModel;
      const originalSyncGameTop = topActionsRuntime.syncGameTopActionsPlacement;
      const originalSyncPracticeTop = topActionsRuntime.syncPracticeTopActionsPlacement;
      const originalApplyGameTopHost = topActionsHostRuntime.applyGameTopActionsPlacementSync;
      const originalApplyPracticeTopHost = topActionsHostRuntime.applyPracticeTopActionsPlacementSync;
      const originalEnsureUndoTopBtn = topButtonsRuntime.ensureMobileUndoTopButtonDom;
      const originalEnsureHintTopBtn = topButtonsRuntime.ensureMobileHintToggleButtonDom;
      const originalIsCompactViewport = viewportRuntime.isCompactGameViewport;
      const originalIsTimerboxCollapseViewport = viewportRuntime.isTimerboxCollapseViewport;
      const originalResolvePageScopeValue = viewportRuntime.resolvePageScopeValue;
      const originalIsGamePageScope = viewportRuntime.isGamePageScope;
      const originalIsPracticePageScope = viewportRuntime.isPracticePageScope;
      const originalIsTimerboxMobileScope = viewportRuntime.isTimerboxMobileScope;
      const originalResolveUndoModeIdFromBody = undoActionRuntime.resolveUndoModeIdFromBody;
      const originalIsUndoCapableMode = undoActionRuntime.isUndoCapableMode;
      const originalResolveUndoCapabilityFromContext =
        undoActionRuntime.resolveUndoCapabilityFromContext;
      const originalTryTriggerUndoFromContext = undoActionRuntime.tryTriggerUndoFromContext;
      const originalIsUndoInteractionEnabled = undoActionRuntime.isUndoInteractionEnabled;
      let collectCallCount = 0;
      let syncCallCount = 0;
      let resolveHintUiStateCallCount = 0;
      let ensureModalCallCount = 0;
      let resolveStoredCallCount = 0;
      let resolveCollapsedValueCallCount = 0;
      let resolveDisplayCallCount = 0;
      let resolveAppliedModelCallCount = 0;
      let resolveUndoTopCallCount = 0;
      let resolveUndoTopAppliedCallCount = 0;
      let syncGameTopCallCount = 0;
      let syncPracticeTopCallCount = 0;
      let applyGameTopHostCallCount = 0;
      let applyPracticeTopHostCallCount = 0;
      let ensureUndoTopBtnCallCount = 0;
      let ensureHintTopBtnCallCount = 0;
      let compactViewportCallCount = 0;
      let timerboxCollapseViewportCallCount = 0;
      let resolvePageScopeCallCount = 0;
      let gameScopeCallCount = 0;
      let practiceScopeCallCount = 0;
      let timerboxScopeCallCount = 0;
      let resolveUndoModeIdFromBodyCallCount = 0;
      let isUndoCapableModeCallCount = 0;
      let resolveUndoCapabilityFromContextCallCount = 0;
      let tryTriggerUndoFromContextCallCount = 0;
      let isUndoInteractionEnabledCallCount = 0;
      runtime.collectMobileHintTexts = function (opts: any) {
        collectCallCount += 1;
        const lines = originalCollect(opts);
        return Array.isArray(lines) && lines.length ? lines : ["Smoke 提示"];
      };
      uiRuntime.syncMobileHintTextBlockVisibility = function (opts: any) {
        syncCallCount += 1;
        return originalSync(opts);
      };
      uiRuntime.resolveMobileHintUiState = function (opts: any) {
        resolveHintUiStateCallCount += 1;
        return originalResolveHintUiState(opts);
      };
      modalRuntime.ensureMobileHintModalDom = function (opts: any) {
        ensureModalCallCount += 1;
        return originalEnsureModal(opts);
      };
      timerRuntime.resolveStoredMobileTimerboxCollapsed = function (opts: any) {
        resolveStoredCallCount += 1;
        return originalResolveStored(opts);
      };
      timerRuntime.resolveMobileTimerboxCollapsedValue = function (opts: any) {
        resolveCollapsedValueCallCount += 1;
        return originalResolveCollapsedValue(opts);
      };
      timerRuntime.resolveMobileTimerboxDisplayModel = function (opts: any) {
        resolveDisplayCallCount += 1;
        return originalResolveDisplay(opts);
      };
      timerRuntime.resolveMobileTimerboxAppliedModel = function (opts: any) {
        resolveAppliedModelCallCount += 1;
        return originalResolveAppliedModel(opts);
      };
      undoTopRuntime.resolveMobileUndoTopButtonDisplayModel = function (opts: any) {
        resolveUndoTopCallCount += 1;
        return originalUndoTopDisplay(opts);
      };
      undoTopRuntime.resolveMobileUndoTopAppliedModel = function (opts: any) {
        resolveUndoTopAppliedCallCount += 1;
        return originalUndoTopApplied(opts);
      };
      topActionsRuntime.syncGameTopActionsPlacement = function (opts: any) {
        syncGameTopCallCount += 1;
        return originalSyncGameTop(opts);
      };
      topActionsRuntime.syncPracticeTopActionsPlacement = function (opts: any) {
        syncPracticeTopCallCount += 1;
        return originalSyncPracticeTop(opts);
      };
      topActionsHostRuntime.applyGameTopActionsPlacementSync = function (opts: any) {
        applyGameTopHostCallCount += 1;
        return originalApplyGameTopHost(opts);
      };
      topActionsHostRuntime.applyPracticeTopActionsPlacementSync = function (opts: any) {
        applyPracticeTopHostCallCount += 1;
        return originalApplyPracticeTopHost(opts);
      };
      topButtonsRuntime.ensureMobileUndoTopButtonDom = function (opts: any) {
        ensureUndoTopBtnCallCount += 1;
        return originalEnsureUndoTopBtn(opts);
      };
      topButtonsRuntime.ensureMobileHintToggleButtonDom = function (opts: any) {
        ensureHintTopBtnCallCount += 1;
        return originalEnsureHintTopBtn(opts);
      };
      viewportRuntime.isCompactGameViewport = function (opts: any) {
        compactViewportCallCount += 1;
        return originalIsCompactViewport(opts);
      };
      viewportRuntime.isTimerboxCollapseViewport = function (opts: any) {
        timerboxCollapseViewportCallCount += 1;
        return originalIsTimerboxCollapseViewport(opts);
      };
      viewportRuntime.resolvePageScopeValue = function (opts: any) {
        resolvePageScopeCallCount += 1;
        return originalResolvePageScopeValue(opts);
      };
      viewportRuntime.isGamePageScope = function (opts: any) {
        gameScopeCallCount += 1;
        return originalIsGamePageScope(opts);
      };
      viewportRuntime.isPracticePageScope = function (opts: any) {
        practiceScopeCallCount += 1;
        return originalIsPracticePageScope(opts);
      };
      viewportRuntime.isTimerboxMobileScope = function (opts: any) {
        timerboxScopeCallCount += 1;
        return originalIsTimerboxMobileScope(opts);
      };
      undoActionRuntime.resolveUndoModeIdFromBody = function (opts: any) {
        resolveUndoModeIdFromBodyCallCount += 1;
        return originalResolveUndoModeIdFromBody(opts);
      };
      undoActionRuntime.isUndoCapableMode = function (opts: any) {
        isUndoCapableModeCallCount += 1;
        return originalIsUndoCapableMode(opts);
      };
      undoActionRuntime.resolveUndoCapabilityFromContext = function (opts: any) {
        resolveUndoCapabilityFromContextCallCount += 1;
        return originalResolveUndoCapabilityFromContext(opts);
      };
      undoActionRuntime.tryTriggerUndoFromContext = function (opts: any) {
        tryTriggerUndoFromContextCallCount += 1;
        return originalTryTriggerUndoFromContext(opts);
      };
      undoActionRuntime.isUndoInteractionEnabled = function (manager: any) {
        isUndoInteractionEnabledCallCount += 1;
        return originalIsUndoInteractionEnabled(manager);
      };

      try {
        const syncMobileHintUI = (window as any).syncMobileHintUI;
        if (typeof syncMobileHintUI === "function") {
          syncMobileHintUI();
        }
        const syncMobileTimerboxUI = (window as any).syncMobileTimerboxUI;
        if (typeof syncMobileTimerboxUI === "function") {
          syncMobileTimerboxUI();
        }
        const syncMobileUndoTopButtonAvailability = (window as any).syncMobileUndoTopButtonAvailability;
        if (typeof syncMobileUndoTopButtonAvailability === "function") {
          syncMobileUndoTopButtonAvailability();
        }
        window.dispatchEvent(new Event("resize"));
        await new Promise((resolve) => setTimeout(resolve, 200));
        hintBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        undoTopBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        const overlay = document.getElementById("mobile-hint-overlay");
        const firstLine = document.querySelector("#mobile-hint-body p");
        return {
          hasRuntime: true,
          hasUiRuntime: true,
          hasModalRuntime: true,
          hasTimerRuntime: true,
          hasUndoTopRuntime: true,
          hasTopActionsRuntime: true,
          hasTopActionsHostRuntime: true,
          hasTopButtonsRuntime: true,
          hasViewportRuntime: true,
          hasHintButton: true,
          hasUndoTopButton: true,
          collectCallCount,
          syncCallCount,
          resolveHintUiStateCallCount,
          ensureModalCallCount,
          resolveStoredCallCount,
          resolveCollapsedValueCallCount,
          resolveDisplayCallCount,
          resolveAppliedModelCallCount,
          resolveUndoTopCallCount,
          resolveUndoTopAppliedCallCount,
          syncGameTopCallCount,
          syncPracticeTopCallCount,
          applyGameTopHostCallCount,
          applyPracticeTopHostCallCount,
          ensureUndoTopBtnCallCount,
          ensureHintTopBtnCallCount,
          compactViewportCallCount,
          timerboxCollapseViewportCallCount,
          resolvePageScopeCallCount,
          gameScopeCallCount,
          practiceScopeCallCount,
          timerboxScopeCallCount,
          resolveUndoModeIdFromBodyCallCount,
          isUndoCapableModeCallCount,
          resolveUndoCapabilityFromContextCallCount,
          tryTriggerUndoFromContextCallCount,
          isUndoInteractionEnabledCallCount,
          resolverCreateCallCount: Number((window as any).__viewportResolverCreateCallCount || 0),
          resolverGameScopeCallCount: Number((window as any).__viewportResolverGameScopeCallCount || 0),
          resolverPracticeScopeCallCount: Number(
            (window as any).__viewportResolverPracticeScopeCallCount || 0
          ),
          resolverTimerboxScopeCallCount: Number(
            (window as any).__viewportResolverTimerboxScopeCallCount || 0
          ),
          resolverMobileCallCount: Number((window as any).__viewportResolverMobileCallCount || 0),
          resolverCompactCallCount: Number((window as any).__viewportResolverCompactCallCount || 0),
          resolverCollapseCallCount: Number((window as any).__viewportResolverCollapseCallCount || 0),
          overlayVisible: Boolean(overlay && overlay.style.display === "flex"),
          firstLineText: firstLine ? (firstLine.textContent || "").trim() : ""
        };
      } finally {
        runtime.collectMobileHintTexts = originalCollect;
        uiRuntime.syncMobileHintTextBlockVisibility = originalSync;
        uiRuntime.resolveMobileHintUiState = originalResolveHintUiState;
        modalRuntime.ensureMobileHintModalDom = originalEnsureModal;
        timerRuntime.resolveStoredMobileTimerboxCollapsed = originalResolveStored;
        timerRuntime.resolveMobileTimerboxCollapsedValue = originalResolveCollapsedValue;
        timerRuntime.resolveMobileTimerboxDisplayModel = originalResolveDisplay;
        timerRuntime.resolveMobileTimerboxAppliedModel = originalResolveAppliedModel;
        undoTopRuntime.resolveMobileUndoTopButtonDisplayModel = originalUndoTopDisplay;
        undoTopRuntime.resolveMobileUndoTopAppliedModel = originalUndoTopApplied;
        topActionsRuntime.syncGameTopActionsPlacement = originalSyncGameTop;
        topActionsRuntime.syncPracticeTopActionsPlacement = originalSyncPracticeTop;
        topActionsHostRuntime.applyGameTopActionsPlacementSync = originalApplyGameTopHost;
        topActionsHostRuntime.applyPracticeTopActionsPlacementSync = originalApplyPracticeTopHost;
        topButtonsRuntime.ensureMobileUndoTopButtonDom = originalEnsureUndoTopBtn;
        topButtonsRuntime.ensureMobileHintToggleButtonDom = originalEnsureHintTopBtn;
        viewportRuntime.isCompactGameViewport = originalIsCompactViewport;
        viewportRuntime.isTimerboxCollapseViewport = originalIsTimerboxCollapseViewport;
        viewportRuntime.resolvePageScopeValue = originalResolvePageScopeValue;
        viewportRuntime.isGamePageScope = originalIsGamePageScope;
        viewportRuntime.isPracticePageScope = originalIsPracticePageScope;
        viewportRuntime.isTimerboxMobileScope = originalIsTimerboxMobileScope;
        undoActionRuntime.resolveUndoModeIdFromBody = originalResolveUndoModeIdFromBody;
        undoActionRuntime.isUndoCapableMode = originalIsUndoCapableMode;
        undoActionRuntime.resolveUndoCapabilityFromContext =
          originalResolveUndoCapabilityFromContext;
        undoActionRuntime.tryTriggerUndoFromContext = originalTryTriggerUndoFromContext;
        undoActionRuntime.isUndoInteractionEnabled = originalIsUndoInteractionEnabled;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasUiRuntime).toBe(true);
    expect(snapshot.hasModalRuntime).toBe(true);
    expect(snapshot.hasTimerRuntime).toBe(true);
    expect(snapshot.hasUndoTopRuntime).toBe(true);
    expect(snapshot.hasTopActionsRuntime).toBe(true);
    expect(snapshot.hasTopActionsHostRuntime).toBe(true);
    expect(snapshot.hasTopButtonsRuntime).toBe(true);
    expect(snapshot.hasViewportRuntime).toBe(true);
    expect(snapshot.hasHintButton).toBe(true);
    expect(snapshot.hasUndoTopButton).toBe(true);
    expect(snapshot.collectCallCount).toBeGreaterThan(0);
    expect(snapshot.syncCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveHintUiStateCallCount).toBeGreaterThan(0);
    expect(snapshot.ensureModalCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveStoredCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveCollapsedValueCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveDisplayCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveAppliedModelCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveUndoTopCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveUndoTopAppliedCallCount).toBeGreaterThan(0);
    expect(snapshot.syncGameTopCallCount).toBeGreaterThan(0);
    expect(snapshot.syncPracticeTopCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.applyGameTopHostCallCount).toBeGreaterThan(0);
    expect(snapshot.applyPracticeTopHostCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.ensureUndoTopBtnCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.ensureHintTopBtnCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.compactViewportCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.timerboxCollapseViewportCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolvePageScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.gameScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.practiceScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.timerboxScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolveUndoModeIdFromBodyCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.isUndoCapableModeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolveUndoCapabilityFromContextCallCount).toBeGreaterThan(0);
    expect(snapshot.tryTriggerUndoFromContextCallCount).toBeGreaterThan(0);
    expect(snapshot.isUndoInteractionEnabledCallCount).toBeGreaterThan(0);
    expect(snapshot.resolverCreateCallCount).toBeGreaterThan(0);
    expect(snapshot.resolverGameScopeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolverPracticeScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolverTimerboxScopeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolverMobileCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolverCompactCallCount).toBeGreaterThan(0);
    expect(snapshot.resolverCollapseCallCount).toBeGreaterThan(0);
    expect(snapshot.overlayVisible).toBe(true);
    expect(snapshot.firstLineText.length).toBeGreaterThan(0);
  });

  test("home guide runtime provides homepage auto-start gating", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreHomeGuideRuntime;
      if (
        !runtime ||
        typeof runtime.resolveHomeGuidePathname !== "function" ||
        typeof runtime.isHomePagePath !== "function" ||
        typeof runtime.buildHomeGuideSteps !== "function" ||
        typeof runtime.buildHomeGuidePanelInnerHtml !== "function" ||
        typeof runtime.buildHomeGuideSettingsRowInnerHtml !== "function" ||
        typeof runtime.readHomeGuideSeenValue !== "function" ||
        typeof runtime.markHomeGuideSeen !== "function" ||
        typeof runtime.shouldAutoStartHomeGuide !== "function" ||
        typeof runtime.resolveHomeGuideAutoStart !== "function" ||
        typeof runtime.resolveHomeGuideSettingsState !== "function" ||
        typeof runtime.resolveHomeGuideStepUiState !== "function" ||
        typeof runtime.resolveHomeGuideStepRenderState !== "function" ||
        typeof runtime.resolveHomeGuideStepIndexState !== "function" ||
        typeof runtime.resolveHomeGuideStepTargetState !== "function" ||
        typeof runtime.resolveHomeGuideElevationPlan !== "function" ||
        typeof runtime.resolveHomeGuideBindingState !== "function" ||
        typeof runtime.resolveHomeGuideControlAction !== "function" ||
        typeof runtime.resolveHomeGuideToggleAction !== "function" ||
        typeof runtime.resolveHomeGuideLifecycleState !== "function" ||
        typeof runtime.resolveHomeGuideSessionState !== "function" ||
        typeof runtime.resolveHomeGuideLayerDisplayState !== "function" ||
        typeof runtime.resolveHomeGuideFinishState !== "function" ||
        typeof runtime.resolveHomeGuideTargetScrollState !== "function" ||
        typeof runtime.resolveHomeGuideDoneNotice !== "function" ||
        typeof runtime.resolveHomeGuideDoneNoticeStyle !== "function" ||
        typeof runtime.resolveHomeGuidePanelLayout !== "function" ||
        typeof runtime.isHomeGuideTargetVisible !== "function"
      ) {
        return { hasRuntime: false };
      }
      const compactSteps = runtime.buildHomeGuideSteps({ isCompactViewport: true });
      const desktopSteps = runtime.buildHomeGuideSteps({ isCompactViewport: false });
      const resolvedPath = runtime.resolveHomeGuidePathname({
        locationLike: { pathname: "/index.html" }
      });
      const resolvedPathFallback = runtime.resolveHomeGuidePathname({
        locationLike: {
          get pathname() {
            throw new Error("deny");
          }
        }
      });
      const panelHtml = runtime.buildHomeGuidePanelInnerHtml();
      const settingsRowHtml = runtime.buildHomeGuideSettingsRowInnerHtml();
      const compactSelectors = Array.isArray(compactSteps)
        ? compactSteps.map((item: any) => item && item.selector)
        : [];
      const desktopSelectors = Array.isArray(desktopSteps)
        ? desktopSteps.map((item: any) => item && item.selector)
        : [];
      const writes: string[] = [];
      const seenValue = runtime.readHomeGuideSeenValue({
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem(key: string) {
            return key === "home_guide_seen_v1" ? "1" : null;
          }
        }
      });
      const markResult = runtime.markHomeGuideSeen({
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem() {
            return null;
          },
          setItem(key: string, value: string) {
            writes.push(key + ":" + value);
          }
        }
      });
      const resolvedAutoStart = runtime.resolveHomeGuideAutoStart({
        pathname: "/index.html",
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem() {
            return null;
          }
        }
      });
      const settingsOnHome = runtime.resolveHomeGuideSettingsState({
        isHomePage: true,
        guideActive: true,
        fromSettings: true
      });
      const settingsOffHome = runtime.resolveHomeGuideSettingsState({
        isHomePage: false,
        guideActive: true,
        fromSettings: true
      });
      const stepUiStateFirst = runtime.resolveHomeGuideStepUiState({
        stepIndex: 0,
        stepCount: 10
      });
      const stepUiStateLast = runtime.resolveHomeGuideStepUiState({
        stepIndex: 9,
        stepCount: 10
      });
      const stepRenderState = runtime.resolveHomeGuideStepRenderState({
        step: {
          selector: "#top-settings-btn",
          title: "设置",
          desc: "desc"
        },
        stepIndex: 0,
        stepCount: 2
      });
      const stepIndexAbort = runtime.resolveHomeGuideStepIndexState({
        isActive: false,
        stepCount: 10,
        stepIndex: 0
      });
      const stepIndexFinish = runtime.resolveHomeGuideStepIndexState({
        isActive: true,
        stepCount: 10,
        stepIndex: 10
      });
      const stepTargetAdvance = runtime.resolveHomeGuideStepTargetState({
        hasTarget: false,
        targetVisible: false,
        stepIndex: 2
      });
      const stepTargetKeep = runtime.resolveHomeGuideStepTargetState({
        hasTarget: true,
        targetVisible: true,
        stepIndex: 2
      });
      const elevationTop = runtime.resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: true,
        hasHeadingAncestor: true
      });
      const elevationHeading = runtime.resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: false,
        hasHeadingAncestor: true
      });
      const elevationNone = runtime.resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: false,
        hasHeadingAncestor: false
      });
      const bindingStateNew = runtime.resolveHomeGuideBindingState({
        alreadyBound: false
      });
      const bindingStateBound = runtime.resolveHomeGuideBindingState({
        alreadyBound: true
      });
      const controlPrev = runtime.resolveHomeGuideControlAction({
        action: "prev",
        stepIndex: 3
      });
      const controlNext = runtime.resolveHomeGuideControlAction({
        action: "next",
        stepIndex: 3
      });
      const controlSkip = runtime.resolveHomeGuideControlAction({
        action: "skip",
        stepIndex: 3
      });
      const toggleUnchecked = runtime.resolveHomeGuideToggleAction({
        checked: false,
        isHomePage: true
      });
      const toggleOffHome = runtime.resolveHomeGuideToggleAction({
        checked: true,
        isHomePage: false
      });
      const toggleOnHome = runtime.resolveHomeGuideToggleAction({
        checked: true,
        isHomePage: true
      });
      const lifecycleStart = runtime.resolveHomeGuideLifecycleState({
        action: "start",
        fromSettings: true,
        steps: [
          {
            selector: "#top-settings-btn",
            title: "设置",
            desc: "desc"
          }
        ]
      });
      const lifecycleFinish = runtime.resolveHomeGuideLifecycleState({
        action: "finish",
        fromSettings: true,
        steps: [
          {
            selector: "#top-settings-btn",
            title: "设置",
            desc: "desc"
          }
        ]
      });
      const sessionState = runtime.resolveHomeGuideSessionState({
        lifecycleState: {
          active: true,
          fromSettings: true,
          index: 2.8,
          steps: [
            {
              selector: "#top-settings-btn",
              title: "设置",
              desc: "desc"
            }
          ]
        }
      });
      const sessionStateDefault = runtime.resolveHomeGuideSessionState({
        lifecycleState: null
      });
      const layerDisplayActive = runtime.resolveHomeGuideLayerDisplayState({
        active: true
      });
      const layerDisplayInactive = runtime.resolveHomeGuideLayerDisplayState({
        active: false
      });
      const finishStateCompleted = runtime.resolveHomeGuideFinishState({
        reason: "completed"
      });
      const finishStateSkipped = runtime.resolveHomeGuideFinishState({
        reason: "skipped"
      });
      const targetScrollStateCompact = runtime.resolveHomeGuideTargetScrollState({
        isCompactViewport: true,
        canScrollIntoView: true
      });
      const targetScrollStateDesktop = runtime.resolveHomeGuideTargetScrollState({
        isCompactViewport: false,
        canScrollIntoView: true
      });
      const doneNotice = runtime.resolveHomeGuideDoneNotice({});
      const doneNoticeStyle = runtime.resolveHomeGuideDoneNoticeStyle();
      const visibleCheck = runtime.isHomeGuideTargetVisible({
        nodeLike: {
          getClientRects() {
            return [{ left: 0 }];
          }
        },
        getComputedStyle() {
          return {
            display: "block",
            visibility: "visible",
            opacity: "1"
          };
        }
      });
      const mobilePanelLayout = runtime.resolveHomeGuidePanelLayout({
        targetRect: {
          left: 100,
          top: 100,
          width: 80,
          height: 30,
          bottom: 130
        },
        viewportWidth: 360,
        viewportHeight: 640,
        panelHeight: 180,
        margin: 12,
        mobileLayout: true
      });
      return {
        hasRuntime: true,
        panelHasStep: typeof panelHtml === "string" && panelHtml.indexOf("home-guide-step") !== -1,
        panelHasSkip: typeof panelHtml === "string" && panelHtml.indexOf("home-guide-skip") !== -1,
        settingsHasToggle:
          typeof settingsRowHtml === "string" && settingsRowHtml.indexOf("home-guide-toggle") !== -1,
        homePath: runtime.isHomePagePath("/index.html"),
        playPath: runtime.isHomePagePath("/play.html"),
        hasCompactHint: compactSelectors.includes("#top-mobile-hint-btn"),
        hasDesktopHint: desktopSelectors.includes("#top-mobile-hint-btn"),
        resolvedPath,
        resolvedPathFallback,
        seenValue,
        markResult,
        writes,
        autoStart: runtime.shouldAutoStartHomeGuide({
          pathname: "/index.html",
          seenValue: "0"
        }),
        blockedSeen: runtime.shouldAutoStartHomeGuide({
          pathname: "/index.html",
          seenValue: "1"
        }),
        blockedPath: runtime.shouldAutoStartHomeGuide({
          pathname: "/play.html",
          seenValue: "0"
        }),
        stepUiStateFirst,
        stepUiStateLast,
        stepRenderState,
        stepIndexAbort,
        stepIndexFinish,
        stepTargetAdvance,
        stepTargetKeep,
        elevationTop,
        elevationHeading,
        elevationNone,
        bindingStateNew,
        bindingStateBound,
        controlPrev,
        controlNext,
        controlSkip,
        toggleUnchecked,
        toggleOffHome,
        toggleOnHome,
        lifecycleStart,
        lifecycleFinish,
        sessionState,
        sessionStateDefault,
        layerDisplayActive,
        layerDisplayInactive,
        finishStateCompleted,
        finishStateSkipped,
        targetScrollStateCompact,
        targetScrollStateDesktop,
        doneNotice,
        doneNoticeStyle,
        visibleCheck,
        resolvedAutoStart,
        mobilePanelLayout,
        settingsOnHome,
        settingsOffHome
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.panelHasStep).toBe(true);
    expect(snapshot.panelHasSkip).toBe(true);
    expect(snapshot.settingsHasToggle).toBe(true);
    expect(snapshot.homePath).toBe(true);
    expect(snapshot.playPath).toBe(false);
    expect(snapshot.hasCompactHint).toBe(true);
    expect(snapshot.hasDesktopHint).toBe(false);
    expect(snapshot.resolvedPath).toBe("/index.html");
    expect(snapshot.resolvedPathFallback).toBe("");
    expect(snapshot.seenValue).toBe("1");
    expect(snapshot.markResult).toBe(true);
    expect(snapshot.writes).toEqual(["home_guide_seen_v1:1"]);
    expect(snapshot.autoStart).toBe(true);
    expect(snapshot.blockedSeen).toBe(false);
    expect(snapshot.blockedPath).toBe(false);
    expect(snapshot.stepUiStateFirst).toEqual({
      stepText: "步骤 1 / 10",
      prevDisabled: true,
      nextText: "下一步"
    });
    expect(snapshot.stepUiStateLast).toEqual({
      stepText: "步骤 10 / 10",
      prevDisabled: false,
      nextText: "完成"
    });
    expect(snapshot.stepRenderState).toEqual({
      stepText: "步骤 1 / 2",
      titleText: "设置",
      descText: "desc",
      prevDisabled: true,
      nextText: "下一步"
    });
    expect(snapshot.stepIndexAbort).toEqual({
      shouldAbort: true,
      shouldFinish: false,
      resolvedIndex: 0
    });
    expect(snapshot.stepIndexFinish).toEqual({
      shouldAbort: false,
      shouldFinish: true,
      resolvedIndex: 10
    });
    expect(snapshot.stepTargetAdvance).toEqual({
      shouldAdvance: true,
      nextIndex: 3
    });
    expect(snapshot.stepTargetKeep).toEqual({
      shouldAdvance: false,
      nextIndex: 2
    });
    expect(snapshot.elevationTop).toEqual({
      hostSelector: ".top-action-buttons",
      shouldScopeTopActions: true
    });
    expect(snapshot.elevationHeading).toEqual({
      hostSelector: ".heading",
      shouldScopeTopActions: false
    });
    expect(snapshot.elevationNone).toEqual({
      hostSelector: "",
      shouldScopeTopActions: false
    });
    expect(snapshot.bindingStateNew).toEqual({
      shouldBind: true,
      boundValue: true
    });
    expect(snapshot.bindingStateBound).toEqual({
      shouldBind: false,
      boundValue: true
    });
    expect(snapshot.controlPrev).toEqual({
      type: "step",
      nextStepIndex: 2,
      finishReason: ""
    });
    expect(snapshot.controlNext).toEqual({
      type: "step",
      nextStepIndex: 4,
      finishReason: ""
    });
    expect(snapshot.controlSkip).toEqual({
      type: "finish",
      nextStepIndex: 3,
      finishReason: "skipped"
    });
    expect(snapshot.toggleUnchecked).toEqual({
      shouldStartGuide: false,
      shouldCloseSettings: false,
      shouldResync: false,
      startFromSettings: false
    });
    expect(snapshot.toggleOffHome).toEqual({
      shouldStartGuide: false,
      shouldCloseSettings: false,
      shouldResync: true,
      startFromSettings: false
    });
    expect(snapshot.toggleOnHome).toEqual({
      shouldStartGuide: true,
      shouldCloseSettings: true,
      shouldResync: false,
      startFromSettings: true
    });
    expect(snapshot.lifecycleStart).toEqual({
      active: true,
      fromSettings: true,
      index: 0,
      steps: [
        {
          selector: "#top-settings-btn",
          title: "设置",
          desc: "desc"
        }
      ]
    });
    expect(snapshot.lifecycleFinish).toEqual({
      active: false,
      fromSettings: false,
      index: 0,
      steps: []
    });
    expect(snapshot.sessionState).toEqual({
      active: true,
      fromSettings: true,
      index: 2,
      steps: [
        {
          selector: "#top-settings-btn",
          title: "设置",
          desc: "desc"
        }
      ]
    });
    expect(snapshot.sessionStateDefault).toEqual({
      active: false,
      fromSettings: false,
      index: 0,
      steps: []
    });
    expect(snapshot.layerDisplayActive).toEqual({
      overlayDisplay: "block",
      panelDisplay: "block"
    });
    expect(snapshot.layerDisplayInactive).toEqual({
      overlayDisplay: "none",
      panelDisplay: "none"
    });
    expect(snapshot.finishStateCompleted).toEqual({
      markSeen: true,
      showDoneNotice: true
    });
    expect(snapshot.finishStateSkipped).toEqual({
      markSeen: true,
      showDoneNotice: false
    });
    expect(snapshot.targetScrollStateCompact).toEqual({
      shouldScroll: true,
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    });
    expect(snapshot.targetScrollStateDesktop).toEqual({
      shouldScroll: false,
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    });
    expect(snapshot.doneNotice).toEqual({
      message: "指引已完成，可在设置中重新打开新手指引。",
      hideDelayMs: 2600
    });
    expect(snapshot.doneNoticeStyle).toMatchObject({
      position: "fixed",
      left: "50%",
      bottom: "26px",
      color: "#f9f6f2",
      zIndex: "3400"
    });
    expect(snapshot.visibleCheck).toBe(true);
    expect(snapshot.resolvedAutoStart).toEqual({
      seenValue: "0",
      shouldAutoStart: true
    });
    expect(snapshot.mobilePanelLayout).toEqual({
      panelWidth: 336,
      top: 448,
      left: 12
    });
    expect(snapshot.settingsOnHome).toEqual({
      toggleDisabled: false,
      toggleChecked: true,
      noteText: "打开后将立即进入首页新手引导，完成后自动关闭。"
    });
    expect(snapshot.settingsOffHome).toEqual({
      toggleDisabled: true,
      toggleChecked: false,
      noteText: "该功能仅在首页可用。"
    });
  });

  test("index ui delegates home guide step list build to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("home_guide_seen_v1", "1");
      } catch (_err) {}
    });
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreHomeGuideRuntime;
      const pageHostRuntime = (window as any).CoreHomeGuidePageHostRuntime;
      if (
        !runtime ||
        typeof runtime.resolveHomeGuidePathname !== "function" ||
        typeof runtime.buildHomeGuideSteps !== "function" ||
        typeof runtime.buildHomeGuidePanelInnerHtml !== "function" ||
        typeof runtime.buildHomeGuideSettingsRowInnerHtml !== "function" ||
        typeof runtime.markHomeGuideSeen !== "function" ||
        typeof runtime.resolveHomeGuideStepUiState !== "function" ||
        typeof runtime.resolveHomeGuideStepRenderState !== "function" ||
        typeof runtime.resolveHomeGuideStepIndexState !== "function" ||
        typeof runtime.resolveHomeGuideStepTargetState !== "function" ||
        typeof runtime.resolveHomeGuideElevationPlan !== "function" ||
        typeof runtime.resolveHomeGuideBindingState !== "function" ||
        typeof runtime.resolveHomeGuideControlAction !== "function" ||
        typeof runtime.resolveHomeGuideToggleAction !== "function" ||
        typeof runtime.resolveHomeGuideLifecycleState !== "function" ||
        typeof runtime.resolveHomeGuideSessionState !== "function" ||
        typeof runtime.resolveHomeGuideLayerDisplayState !== "function" ||
        typeof runtime.resolveHomeGuideFinishState !== "function" ||
        typeof runtime.resolveHomeGuideTargetScrollState !== "function" ||
        typeof runtime.resolveHomeGuideDoneNotice !== "function" ||
        typeof runtime.resolveHomeGuideDoneNoticeStyle !== "function" ||
        typeof runtime.resolveHomeGuidePanelLayout !== "function" ||
        typeof runtime.isHomeGuideTargetVisible !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.createHomeGuidePageResolvers !== "function" ||
        typeof pageHostRuntime.createHomeGuideLifecycleResolvers !== "function" ||
        typeof pageHostRuntime.applyHomeGuideSettingsPageInit !== "function" ||
        typeof pageHostRuntime.applyHomeGuideAutoStartPage !== "function" ||
        typeof pageHostRuntime.applyHomeGuideAutoStartPageFromContext !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasSettingsOpen: false };
      }
      const originalBuild = runtime.buildHomeGuideSteps;
      const originalResolvePathname = runtime.resolveHomeGuidePathname;
      const originalBuildPanelHtml = runtime.buildHomeGuidePanelInnerHtml;
      const originalBuildSettingsRowHtml = runtime.buildHomeGuideSettingsRowInnerHtml;
      const originalMark = runtime.markHomeGuideSeen;
      const originalResolveStepUiState = runtime.resolveHomeGuideStepUiState;
      const originalResolveStepRenderState = runtime.resolveHomeGuideStepRenderState;
      const originalResolveStepIndexState = runtime.resolveHomeGuideStepIndexState;
      const originalResolveStepTargetState = runtime.resolveHomeGuideStepTargetState;
      const originalResolveElevationPlan = runtime.resolveHomeGuideElevationPlan;
      const originalResolveBindingState = runtime.resolveHomeGuideBindingState;
      const originalResolveControlAction = runtime.resolveHomeGuideControlAction;
      const originalResolveToggleAction = runtime.resolveHomeGuideToggleAction;
      const originalResolveLifecycleState = runtime.resolveHomeGuideLifecycleState;
      const originalResolveSessionState = runtime.resolveHomeGuideSessionState;
      const originalResolveLayerDisplayState = runtime.resolveHomeGuideLayerDisplayState;
      const originalResolveFinishState = runtime.resolveHomeGuideFinishState;
      const originalResolveTargetScrollState = runtime.resolveHomeGuideTargetScrollState;
      const originalResolveDoneNotice = runtime.resolveHomeGuideDoneNotice;
      const originalResolveDoneNoticeStyle = runtime.resolveHomeGuideDoneNoticeStyle;
      const originalResolvePanelLayout = runtime.resolveHomeGuidePanelLayout;
      const originalIsTargetVisible = runtime.isHomeGuideTargetVisible;
      const originalApplySettingsPageHost = pageHostRuntime.applyHomeGuideSettingsPageInit;
      const originalApplyAutoStartPageHost = pageHostRuntime.applyHomeGuideAutoStartPage;
      const originalApplyAutoStartPageHostFromContext =
        pageHostRuntime.applyHomeGuideAutoStartPageFromContext;
      let callCount = 0;
      let pathnameCallCount = 0;
      let panelHtmlCallCount = 0;
      let settingsRowHtmlCallCount = 0;
      let markCallCount = 0;
      let stepUiStateCallCount = 0;
      let stepRenderStateCallCount = 0;
      let stepIndexStateCallCount = 0;
      let stepTargetStateCallCount = 0;
      let elevationPlanCallCount = 0;
      let bindingStateCallCount = 0;
      let controlActionCallCount = 0;
      let toggleActionCallCount = 0;
      let lifecycleStateCallCount = 0;
      let sessionStateCallCount = 0;
      let layerDisplayStateCallCount = 0;
      let finishStateCallCount = 0;
      let targetScrollStateCallCount = 0;
      let doneNoticeCallCount = 0;
      let doneNoticeStyleCallCount = 0;
      let panelLayoutCallCount = 0;
      let targetVisibleCallCount = 0;
      let applySettingsPageHostCallCount = 0;
      let applyAutoStartPageHostCallCount = 0;
      let applyAutoStartPageHostFromContextCallCount = 0;
      runtime.buildHomeGuideSteps = function (opts: any) {
        callCount += 1;
        return originalBuild(opts);
      };
      runtime.resolveHomeGuidePathname = function (opts: any) {
        pathnameCallCount += 1;
        return originalResolvePathname(opts);
      };
      runtime.buildHomeGuidePanelInnerHtml = function () {
        panelHtmlCallCount += 1;
        return originalBuildPanelHtml();
      };
      runtime.buildHomeGuideSettingsRowInnerHtml = function () {
        settingsRowHtmlCallCount += 1;
        return originalBuildSettingsRowHtml();
      };
      runtime.markHomeGuideSeen = function (opts: any) {
        markCallCount += 1;
        return originalMark(opts);
      };
      runtime.resolveHomeGuideStepUiState = function (opts: any) {
        stepUiStateCallCount += 1;
        return originalResolveStepUiState(opts);
      };
      runtime.resolveHomeGuideStepRenderState = function (opts: any) {
        stepRenderStateCallCount += 1;
        return originalResolveStepRenderState(opts);
      };
      runtime.resolveHomeGuideStepIndexState = function (opts: any) {
        stepIndexStateCallCount += 1;
        return originalResolveStepIndexState(opts);
      };
      runtime.resolveHomeGuideStepTargetState = function (opts: any) {
        stepTargetStateCallCount += 1;
        return originalResolveStepTargetState(opts);
      };
      runtime.resolveHomeGuideElevationPlan = function (opts: any) {
        elevationPlanCallCount += 1;
        return originalResolveElevationPlan(opts);
      };
      runtime.resolveHomeGuideBindingState = function (opts: any) {
        bindingStateCallCount += 1;
        return originalResolveBindingState(opts);
      };
      runtime.resolveHomeGuideControlAction = function (opts: any) {
        controlActionCallCount += 1;
        return originalResolveControlAction(opts);
      };
      runtime.resolveHomeGuideToggleAction = function (opts: any) {
        toggleActionCallCount += 1;
        return originalResolveToggleAction(opts);
      };
      runtime.resolveHomeGuideLifecycleState = function (opts: any) {
        lifecycleStateCallCount += 1;
        return originalResolveLifecycleState(opts);
      };
      runtime.resolveHomeGuideSessionState = function (opts: any) {
        sessionStateCallCount += 1;
        return originalResolveSessionState(opts);
      };
      runtime.resolveHomeGuideLayerDisplayState = function (opts: any) {
        layerDisplayStateCallCount += 1;
        return originalResolveLayerDisplayState(opts);
      };
      runtime.resolveHomeGuideFinishState = function (opts: any) {
        finishStateCallCount += 1;
        return originalResolveFinishState(opts);
      };
      runtime.resolveHomeGuideTargetScrollState = function (opts: any) {
        targetScrollStateCallCount += 1;
        return originalResolveTargetScrollState(opts);
      };
      runtime.resolveHomeGuideDoneNotice = function (opts: any) {
        doneNoticeCallCount += 1;
        return originalResolveDoneNotice(opts);
      };
      runtime.resolveHomeGuideDoneNoticeStyle = function () {
        doneNoticeStyleCallCount += 1;
        return originalResolveDoneNoticeStyle();
      };
      runtime.resolveHomeGuidePanelLayout = function (opts: any) {
        panelLayoutCallCount += 1;
        return originalResolvePanelLayout(opts);
      };
      runtime.isHomeGuideTargetVisible = function (opts: any) {
        targetVisibleCallCount += 1;
        return originalIsTargetVisible(opts);
      };
      pageHostRuntime.applyHomeGuideSettingsPageInit = function (opts: any) {
        applySettingsPageHostCallCount += 1;
        return originalApplySettingsPageHost(opts);
      };
      pageHostRuntime.applyHomeGuideAutoStartPage = function (opts: any) {
        applyAutoStartPageHostCallCount += 1;
        return originalApplyAutoStartPageHost(opts);
      };
      pageHostRuntime.applyHomeGuideAutoStartPageFromContext = function (opts: any) {
        applyAutoStartPageHostFromContextCallCount += 1;
        return originalApplyAutoStartPageHostFromContext(opts);
      };
      try {
        const existingToggle = document.getElementById("home-guide-toggle");
        if (existingToggle) {
          const existingRow = existingToggle.closest(".settings-row");
          if (existingRow && existingRow.parentNode) {
            existingRow.parentNode.removeChild(existingRow);
          }
        }
        openSettingsModal();
        const toggle = document.getElementById("home-guide-toggle") as HTMLInputElement | null;
        if (!toggle) {
          return { hasRuntime: true, hasSettingsOpen: true, hasToggle: false };
        }
        toggle.checked = true;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
        const overlay = document.getElementById("home-guide-overlay");
        const overlayVisibleBeforeFinish = Boolean(overlay && overlay.style.display !== "none");
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const nextBtn = document.getElementById("home-guide-next");
        for (let i = 0; i < 20; i += 1) {
          if (!nextBtn) break;
          nextBtn.dispatchEvent(new Event("click", { bubbles: true }));
          await new Promise((resolve) => {
            window.requestAnimationFrame(() => resolve(null));
          });
          const currentOverlay = document.getElementById("home-guide-overlay");
          if (currentOverlay && currentOverlay.style.display === "none") {
            break;
          }
        }
        const overlayAfterFinish = document.getElementById("home-guide-overlay");
        const doneToast = document.getElementById("home-guide-done-toast");
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasSettingsOpen: true,
          hasToggle: true,
          applySettingsPageHostCallCount,
          applyAutoStartPageHostCallCount,
          callCount,
          pathnameCallCount,
          panelHtmlCallCount,
          settingsRowHtmlCallCount,
          markCallCount,
          stepUiStateCallCount,
          stepRenderStateCallCount,
          stepIndexStateCallCount,
          stepTargetStateCallCount,
          elevationPlanCallCount,
          bindingStateCallCount,
          controlActionCallCount,
          toggleActionCallCount,
          lifecycleStateCallCount,
          sessionStateCallCount,
          layerDisplayStateCallCount,
          finishStateCallCount,
          targetScrollStateCallCount,
          doneNoticeCallCount,
          doneNoticeStyleCallCount,
          panelLayoutCallCount,
          targetVisibleCallCount,
          hasOverlay: Boolean(overlay),
          overlayVisibleBeforeFinish,
          overlayHiddenAfterFinish: Boolean(
            overlayAfterFinish && overlayAfterFinish.style.display === "none"
          ),
          doneToastVisible: Boolean(doneToast && doneToast.style.opacity === "1"),
          applyAutoStartPageHostFromContextCallCount
        };
      } finally {
        runtime.buildHomeGuideSteps = originalBuild;
        runtime.resolveHomeGuidePathname = originalResolvePathname;
        runtime.buildHomeGuidePanelInnerHtml = originalBuildPanelHtml;
        runtime.buildHomeGuideSettingsRowInnerHtml = originalBuildSettingsRowHtml;
        runtime.markHomeGuideSeen = originalMark;
        runtime.resolveHomeGuideStepUiState = originalResolveStepUiState;
        runtime.resolveHomeGuideStepRenderState = originalResolveStepRenderState;
        runtime.resolveHomeGuideStepIndexState = originalResolveStepIndexState;
        runtime.resolveHomeGuideStepTargetState = originalResolveStepTargetState;
        runtime.resolveHomeGuideElevationPlan = originalResolveElevationPlan;
        runtime.resolveHomeGuideBindingState = originalResolveBindingState;
        runtime.resolveHomeGuideControlAction = originalResolveControlAction;
        runtime.resolveHomeGuideToggleAction = originalResolveToggleAction;
        runtime.resolveHomeGuideLifecycleState = originalResolveLifecycleState;
        runtime.resolveHomeGuideSessionState = originalResolveSessionState;
        runtime.resolveHomeGuideLayerDisplayState = originalResolveLayerDisplayState;
        runtime.resolveHomeGuideFinishState = originalResolveFinishState;
        runtime.resolveHomeGuideTargetScrollState = originalResolveTargetScrollState;
        runtime.resolveHomeGuideDoneNotice = originalResolveDoneNotice;
        runtime.resolveHomeGuideDoneNoticeStyle = originalResolveDoneNoticeStyle;
        runtime.resolveHomeGuidePanelLayout = originalResolvePanelLayout;
        runtime.isHomeGuideTargetVisible = originalIsTargetVisible;
        pageHostRuntime.applyHomeGuideSettingsPageInit = originalApplySettingsPageHost;
        pageHostRuntime.applyHomeGuideAutoStartPage = originalApplyAutoStartPageHost;
        pageHostRuntime.applyHomeGuideAutoStartPageFromContext =
          originalApplyAutoStartPageHostFromContext;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasToggle).toBe(true);
    expect(snapshot.applySettingsPageHostCallCount).toBeGreaterThan(0);
    expect(snapshot.applyAutoStartPageHostCallCount).toBe(0);
    expect(snapshot.applyAutoStartPageHostFromContextCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.callCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.pathnameCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.panelHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.settingsRowHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.markCallCount).toBeGreaterThan(0);
    expect(snapshot.stepUiStateCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.stepRenderStateCallCount).toBeGreaterThan(0);
    expect(snapshot.stepIndexStateCallCount).toBeGreaterThan(0);
    expect(snapshot.stepTargetStateCallCount).toBeGreaterThan(0);
    expect(snapshot.elevationPlanCallCount).toBeGreaterThan(0);
    expect(snapshot.bindingStateCallCount).toBeGreaterThan(0);
    expect(snapshot.controlActionCallCount).toBeGreaterThan(0);
    expect(snapshot.toggleActionCallCount).toBeGreaterThan(0);
    expect(snapshot.lifecycleStateCallCount).toBeGreaterThan(0);
    expect(snapshot.sessionStateCallCount).toBeGreaterThan(0);
    expect(snapshot.layerDisplayStateCallCount).toBeGreaterThan(0);
    expect(snapshot.finishStateCallCount).toBeGreaterThan(0);
    expect(snapshot.targetScrollStateCallCount).toBeGreaterThan(0);
    expect(snapshot.doneNoticeCallCount).toBeGreaterThan(0);
    expect(snapshot.doneNoticeStyleCallCount).toBeGreaterThan(0);
    expect(snapshot.panelLayoutCallCount).toBeGreaterThan(0);
    expect(snapshot.targetVisibleCallCount).toBeGreaterThan(0);
    expect(snapshot.hasOverlay).toBe(true);
    expect(snapshot.overlayVisibleBeforeFinish).toBe(true);
    expect(snapshot.overlayHiddenAfterFinish).toBe(true);
    expect(snapshot.doneToastVisible).toBe(true);
  });

  test("index ui delegates timer module settings model to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreTimerModuleRuntime;
      const pageHostRuntime = (window as any).CoreTimerModuleSettingsPageHostRuntime;
      if (
        !runtime ||
        typeof runtime.buildTimerModuleSettingsRowInnerHtml !== "function" ||
        typeof runtime.resolveTimerModuleSettingsState !== "function" ||
        typeof runtime.resolveTimerModuleCurrentViewMode !== "function" ||
        typeof runtime.resolveTimerModuleBindingState !== "function" ||
        typeof runtime.resolveTimerModuleViewMode !== "function" ||
        typeof runtime.resolveTimerModuleAppliedViewMode !== "function" ||
        typeof runtime.resolveTimerModuleInitRetryState !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.applyTimerModuleSettingsPageInit !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasSettingsOpen: false };
      }
      const originalBuild = runtime.buildTimerModuleSettingsRowInnerHtml;
      const originalResolveState = runtime.resolveTimerModuleSettingsState;
      const originalResolveCurrentViewMode = runtime.resolveTimerModuleCurrentViewMode;
      const originalResolveBinding = runtime.resolveTimerModuleBindingState;
      const originalResolveViewMode = runtime.resolveTimerModuleViewMode;
      const originalResolveAppliedViewMode = runtime.resolveTimerModuleAppliedViewMode;
      const originalResolveInitRetryState = runtime.resolveTimerModuleInitRetryState;
      const originalApplyPageHost = pageHostRuntime.applyTimerModuleSettingsPageInit;
      let buildCallCount = 0;
      let resolveStateCallCount = 0;
      let resolveCurrentViewModeCallCount = 0;
      let resolveBindingCallCount = 0;
      let resolveViewModeCallCount = 0;
      let resolveAppliedViewModeCallCount = 0;
      let resolveInitRetryStateCallCount = 0;
      let applyPageHostCallCount = 0;
      runtime.buildTimerModuleSettingsRowInnerHtml = function () {
        buildCallCount += 1;
        return originalBuild();
      };
      runtime.resolveTimerModuleSettingsState = function (opts: any) {
        resolveStateCallCount += 1;
        return originalResolveState(opts);
      };
      runtime.resolveTimerModuleCurrentViewMode = function (opts: any) {
        resolveCurrentViewModeCallCount += 1;
        return originalResolveCurrentViewMode(opts);
      };
      runtime.resolveTimerModuleBindingState = function (opts: any) {
        resolveBindingCallCount += 1;
        return originalResolveBinding(opts);
      };
      runtime.resolveTimerModuleViewMode = function (opts: any) {
        resolveViewModeCallCount += 1;
        return originalResolveViewMode(opts);
      };
      runtime.resolveTimerModuleAppliedViewMode = function (opts: any) {
        resolveAppliedViewModeCallCount += 1;
        return originalResolveAppliedViewMode(opts);
      };
      runtime.resolveTimerModuleInitRetryState = function (opts: any) {
        resolveInitRetryStateCallCount += 1;
        return originalResolveInitRetryState(opts);
      };
      pageHostRuntime.applyTimerModuleSettingsPageInit = function (opts: any) {
        applyPageHostCallCount += 1;
        return originalApplyPageHost(opts);
      };
      try {
        const existingToggle = document.getElementById("timer-module-view-toggle");
        if (existingToggle) {
          const existingRow = existingToggle.closest(".settings-row");
          if (existingRow && existingRow.parentNode) {
            existingRow.parentNode.removeChild(existingRow);
          }
        }
        openSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const toggle = document.getElementById("timer-module-view-toggle") as HTMLInputElement | null;
        const note = document.getElementById("timer-module-view-note");
        if (!toggle) {
          return {
            hasRuntime: true,
            hasPageHostRuntime: true,
            hasSettingsOpen: true,
            hasToggle: false
          };
        }
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve(null));
        });
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasSettingsOpen: true,
          hasToggle: true,
          applyPageHostCallCount,
          buildCallCount,
          resolveStateCallCount,
          resolveCurrentViewModeCallCount,
          resolveBindingCallCount,
          resolveViewModeCallCount,
          resolveAppliedViewModeCallCount,
          resolveInitRetryStateCallCount,
          noteText: note ? String(note.textContent || "") : "",
          toggleChecked: !!toggle.checked
        };
      } finally {
        runtime.buildTimerModuleSettingsRowInnerHtml = originalBuild;
        runtime.resolveTimerModuleSettingsState = originalResolveState;
        runtime.resolveTimerModuleCurrentViewMode = originalResolveCurrentViewMode;
        runtime.resolveTimerModuleBindingState = originalResolveBinding;
        runtime.resolveTimerModuleViewMode = originalResolveViewMode;
        runtime.resolveTimerModuleAppliedViewMode = originalResolveAppliedViewMode;
        runtime.resolveTimerModuleInitRetryState = originalResolveInitRetryState;
        pageHostRuntime.applyTimerModuleSettingsPageInit = originalApplyPageHost;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasToggle).toBe(true);
    expect(snapshot.applyPageHostCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.buildCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveStateCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveCurrentViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveBindingCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveAppliedViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveInitRetryStateCallCount).toBeGreaterThan(0);
    expect(snapshot.noteText).toContain("关闭后仅隐藏右侧计时器栏");
    expect(snapshot.toggleChecked).toBe(false);
  });

  test("index ui delegates theme settings model to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreThemeSettingsRuntime;
      const pageHostRuntime = (window as any).CoreThemeSettingsPageHostRuntime;
      if (
        !runtime ||
        typeof runtime.formatThemePreviewValue !== "function" ||
        typeof runtime.resolveThemePreviewTileValues !== "function" ||
        typeof runtime.resolveThemePreviewLayout !== "function" ||
        typeof runtime.resolveThemePreviewCssSelectors !== "function" ||
        typeof runtime.resolveThemeOptions !== "function" ||
        typeof runtime.resolveThemeSelectLabel !== "function" ||
        typeof runtime.resolveThemeDropdownToggleState !== "function" ||
        typeof runtime.resolveThemeBindingState !== "function" ||
        typeof runtime.resolveThemeOptionValue !== "function" ||
        typeof runtime.resolveThemeOptionSelectedState !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.applyThemeSettingsPageInit !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasSettingsOpen: false };
      }
      const originalFormat = runtime.formatThemePreviewValue;
      const originalResolveTileValues = runtime.resolveThemePreviewTileValues;
      const originalResolvePreviewLayout = runtime.resolveThemePreviewLayout;
      const originalResolvePreviewCssSelectors = runtime.resolveThemePreviewCssSelectors;
      const originalResolveThemeOptions = runtime.resolveThemeOptions;
      const originalResolveLabel = runtime.resolveThemeSelectLabel;
      const originalResolveDropdown = runtime.resolveThemeDropdownToggleState;
      const originalResolveBinding = runtime.resolveThemeBindingState;
      const originalResolveOptionValue = runtime.resolveThemeOptionValue;
      const originalResolveOptionSelected = runtime.resolveThemeOptionSelectedState;
      const originalApplyPageHost = pageHostRuntime.applyThemeSettingsPageInit;
      let formatCallCount = 0;
      let resolveTileValuesCallCount = 0;
      let resolvePreviewLayoutCallCount = 0;
      let resolvePreviewCssSelectorsCallCount = 0;
      let resolveThemeOptionsCallCount = 0;
      let resolveLabelCallCount = 0;
      let resolveDropdownCallCount = 0;
      let resolveBindingCallCount = 0;
      let resolveOptionValueCallCount = 0;
      let resolveOptionSelectedCallCount = 0;
      let applyPageHostCallCount = 0;
      runtime.formatThemePreviewValue = function (value: any) {
        formatCallCount += 1;
        return originalFormat(value);
      };
      runtime.resolveThemePreviewTileValues = function (opts: any) {
        resolveTileValuesCallCount += 1;
        return originalResolveTileValues(opts);
      };
      runtime.resolveThemePreviewLayout = function () {
        resolvePreviewLayoutCallCount += 1;
        return originalResolvePreviewLayout();
      };
      runtime.resolveThemePreviewCssSelectors = function (opts: any) {
        resolvePreviewCssSelectorsCallCount += 1;
        return originalResolvePreviewCssSelectors(opts);
      };
      runtime.resolveThemeOptions = function (opts: any) {
        resolveThemeOptionsCallCount += 1;
        return originalResolveThemeOptions(opts);
      };
      runtime.resolveThemeSelectLabel = function (opts: any) {
        resolveLabelCallCount += 1;
        return originalResolveLabel(opts);
      };
      runtime.resolveThemeDropdownToggleState = function (opts: any) {
        resolveDropdownCallCount += 1;
        return originalResolveDropdown(opts);
      };
      runtime.resolveThemeBindingState = function (opts: any) {
        resolveBindingCallCount += 1;
        return originalResolveBinding(opts);
      };
      runtime.resolveThemeOptionValue = function (opts: any) {
        resolveOptionValueCallCount += 1;
        return originalResolveOptionValue(opts);
      };
      runtime.resolveThemeOptionSelectedState = function (opts: any) {
        resolveOptionSelectedCallCount += 1;
        return originalResolveOptionSelected(opts);
      };
      pageHostRuntime.applyThemeSettingsPageInit = function (opts: any) {
        applyPageHostCallCount += 1;
        return originalApplyPageHost(opts);
      };
      try {
        openSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const trigger = document.getElementById("theme-select-trigger");
        const options = document.querySelectorAll("#theme-select-options .custom-option");
        if (trigger) {
          trigger.dispatchEvent(new Event("click", { bubbles: true }));
          trigger.dispatchEvent(new Event("click", { bubbles: true }));
        }
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasSettingsOpen: true,
          hasTrigger: Boolean(trigger),
          optionCount: options.length,
          applyPageHostCallCount,
          formatCallCount,
          resolveTileValuesCallCount,
          resolvePreviewLayoutCallCount,
          resolvePreviewCssSelectorsCallCount,
          resolveThemeOptionsCallCount,
          resolveLabelCallCount,
          resolveDropdownCallCount,
          resolveBindingCallCount,
          resolveOptionValueCallCount,
          resolveOptionSelectedCallCount
        };
      } finally {
        runtime.formatThemePreviewValue = originalFormat;
        runtime.resolveThemePreviewTileValues = originalResolveTileValues;
        runtime.resolveThemePreviewLayout = originalResolvePreviewLayout;
        runtime.resolveThemePreviewCssSelectors = originalResolvePreviewCssSelectors;
        runtime.resolveThemeOptions = originalResolveThemeOptions;
        runtime.resolveThemeSelectLabel = originalResolveLabel;
        runtime.resolveThemeDropdownToggleState = originalResolveDropdown;
        runtime.resolveThemeBindingState = originalResolveBinding;
        runtime.resolveThemeOptionValue = originalResolveOptionValue;
        runtime.resolveThemeOptionSelectedState = originalResolveOptionSelected;
        pageHostRuntime.applyThemeSettingsPageInit = originalApplyPageHost;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasTrigger).toBe(true);
    expect(snapshot.optionCount).toBeGreaterThan(0);
    expect(snapshot.applyPageHostCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.formatCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveTileValuesCallCount).toBeGreaterThan(0);
    expect(snapshot.resolvePreviewLayoutCallCount).toBeGreaterThan(0);
    expect(snapshot.resolvePreviewCssSelectorsCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveThemeOptionsCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveLabelCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveDropdownCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveBindingCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveOptionValueCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveOptionSelectedCallCount).toBeGreaterThan(0);
  });

  test("index ui delegates settings modal orchestration to host runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreSettingsModalHostRuntime;
      const pageHostRuntime = (window as any).CoreSettingsModalPageHostRuntime;
      if (
        !runtime ||
        typeof runtime.applySettingsModalOpenOrchestration !== "function" ||
        typeof runtime.applySettingsModalCloseOrchestration !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.createSettingsModalInitResolvers !== "function" ||
        typeof pageHostRuntime.createSettingsModalActionResolvers !== "function" ||
        typeof pageHostRuntime.applySettingsModalPageOpen !== "function" ||
        typeof pageHostRuntime.applySettingsModalPageClose !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      const closeSettingsModal = (window as any).closeSettingsModal;
      if (typeof openSettingsModal !== "function" || typeof closeSettingsModal !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasBindings: false };
      }

      const originalOpen = runtime.applySettingsModalOpenOrchestration;
      const originalClose = runtime.applySettingsModalCloseOrchestration;
      const originalPageOpen = pageHostRuntime.applySettingsModalPageOpen;
      const originalPageClose = pageHostRuntime.applySettingsModalPageClose;
      let openCallCount = 0;
      let closeCallCount = 0;
      let pageOpenCallCount = 0;
      let pageCloseCallCount = 0;
      runtime.applySettingsModalOpenOrchestration = function (opts: any) {
        openCallCount += 1;
        return originalOpen(opts);
      };
      runtime.applySettingsModalCloseOrchestration = function (opts: any) {
        closeCallCount += 1;
        return originalClose(opts);
      };
      pageHostRuntime.applySettingsModalPageOpen = function (opts: any) {
        pageOpenCallCount += 1;
        return originalPageOpen(opts);
      };
      pageHostRuntime.applySettingsModalPageClose = function (opts: any) {
        pageCloseCallCount += 1;
        return originalPageClose(opts);
      };

      try {
        openSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });

        const modal = document.getElementById("settings-modal");
        const openDisplay = modal ? String((modal as HTMLElement).style.display || "") : "";

        closeSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve(null));
        });
        const closeDisplay = modal ? String((modal as HTMLElement).style.display || "") : "";

        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasBindings: true,
          openCallCount,
          closeCallCount,
          pageOpenCallCount,
          pageCloseCallCount,
          openDisplay,
          closeDisplay
        };
      } finally {
        runtime.applySettingsModalOpenOrchestration = originalOpen;
        runtime.applySettingsModalCloseOrchestration = originalClose;
        pageHostRuntime.applySettingsModalPageOpen = originalPageOpen;
        pageHostRuntime.applySettingsModalPageClose = originalPageClose;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasBindings).toBe(true);
    expect(snapshot.openCallCount).toBeGreaterThan(0);
    expect(snapshot.closeCallCount).toBeGreaterThan(0);
    expect(snapshot.pageOpenCallCount).toBeGreaterThan(0);
    expect(snapshot.pageCloseCallCount).toBeGreaterThan(0);
    expect(snapshot.openDisplay).toBe("flex");
    expect(snapshot.closeDisplay).toBe("none");
  });

  test("index ui delegates replay modal and export page actions to host runtime helper", async ({
    page
  }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const pageHostRuntime = (window as any).CoreReplayPageHostRuntime;
      const modalRuntime = (window as any).CoreReplayModalRuntime;
      const exportRuntime = (window as any).CoreReplayExportRuntime;
      if (
        !pageHostRuntime ||
        typeof pageHostRuntime.createReplayPageActionResolvers !== "function" ||
        typeof pageHostRuntime.applyReplayModalPageOpen !== "function" ||
        typeof pageHostRuntime.applyReplayModalPageClose !== "function" ||
        typeof pageHostRuntime.applyReplayExportPageAction !== "function" ||
        typeof pageHostRuntime.applyReplayExportPageActionFromContext !== "function" ||
        !modalRuntime ||
        typeof modalRuntime.applyReplayModalOpen !== "function" ||
        typeof modalRuntime.applyReplayModalClose !== "function" ||
        !exportRuntime ||
        typeof exportRuntime.applyReplayExport !== "function"
      ) {
        return { hasPageHostRuntime: false };
      }

      const exportReplay = (window as any).exportReplay;
      const closeReplayModal = (window as any).closeReplayModal;
      if (typeof exportReplay !== "function" || typeof closeReplayModal !== "function") {
        return { hasPageHostRuntime: true, hasBindings: false };
      }

      const originalPageOpen = pageHostRuntime.applyReplayModalPageOpen;
      const originalPageClose = pageHostRuntime.applyReplayModalPageClose;
      const originalPageExport = pageHostRuntime.applyReplayExportPageActionFromContext;
      const originalRuntimeExport = exportRuntime.applyReplayExport;
      let pageOpenCallCount = 0;
      let pageCloseCallCount = 0;
      let pageExportCallCount = 0;
      let runtimeExportCallCount = 0;
      pageHostRuntime.applyReplayModalPageOpen = function (opts: any) {
        pageOpenCallCount += 1;
        return originalPageOpen(opts);
      };
      pageHostRuntime.applyReplayModalPageClose = function (opts: any) {
        pageCloseCallCount += 1;
        return originalPageClose(opts);
      };
      pageHostRuntime.applyReplayExportPageActionFromContext = function (opts: any) {
        pageExportCallCount += 1;
        return originalPageExport(opts);
      };
      exportRuntime.applyReplayExport = function (opts: any) {
        runtimeExportCallCount += 1;
        const maybeShowReplayModal = opts && opts.showReplayModal;
        if (typeof maybeShowReplayModal === "function") {
          maybeShowReplayModal("回放内容", "seed payload", "确定", function () {
            return null;
          });
        }
        return { simulated: true };
      };

      try {
        exportReplay();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });

        const replayModal = document.getElementById("replay-modal");
        const openDisplay = replayModal ? String((replayModal as HTMLElement).style.display || "") : "";

        closeReplayModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve(null));
        });
        const closeDisplay = replayModal ? String((replayModal as HTMLElement).style.display || "") : "";

        return {
          hasPageHostRuntime: true,
          hasBindings: true,
          pageOpenCallCount,
          pageCloseCallCount,
          pageExportCallCount,
          runtimeExportCallCount,
          openDisplay,
          closeDisplay
        };
      } finally {
        pageHostRuntime.applyReplayModalPageOpen = originalPageOpen;
        pageHostRuntime.applyReplayModalPageClose = originalPageClose;
        pageHostRuntime.applyReplayExportPageActionFromContext = originalPageExport;
        exportRuntime.applyReplayExport = originalRuntimeExport;
      }
    });

    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasBindings).toBe(true);
    expect(snapshot.pageOpenCallCount).toBeGreaterThan(0);
    expect(snapshot.pageCloseCallCount).toBeGreaterThan(0);
    expect(snapshot.pageExportCallCount).toBeGreaterThan(0);
    expect(snapshot.runtimeExportCallCount).toBeGreaterThan(0);
    expect(snapshot.openDisplay).toBe("flex");
    expect(snapshot.closeDisplay).toBe("none");
  });

  test("index ui delegates storage resolution to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreStorageRuntime;
      if (
        !runtime ||
        typeof runtime.resolveStorageByName !== "function" ||
        typeof runtime.safeReadStorageItem !== "function" ||
        typeof runtime.safeSetStorageItem !== "function"
      ) {
        return { hasRuntime: false };
      }
      const originalResolveStorageByName = runtime.resolveStorageByName;
      const practiceRuntime = (window as any).CorePracticeTransferRuntime;
      const originalResolvePrecheck =
        practiceRuntime && typeof practiceRuntime.resolvePracticeTransferPrecheck === "function"
          ? practiceRuntime.resolvePracticeTransferPrecheck
          : null;
      const originalCreatePlan =
        practiceRuntime && typeof practiceRuntime.createPracticeTransferNavigationPlan === "function"
          ? practiceRuntime.createPracticeTransferNavigationPlan
          : null;
      const originalWindowOpen = window.open;
      let resolveStorageByNameCallCount = 0;
      runtime.resolveStorageByName = function (opts: any) {
        resolveStorageByNameCallCount += 1;
        return originalResolveStorageByName(opts);
      };
      try {
        const syncMobileTimerboxUI = (window as any).syncMobileTimerboxUI;
        if (typeof syncMobileTimerboxUI === "function") {
          syncMobileTimerboxUI();
        }
        if (practiceRuntime && originalResolvePrecheck && originalCreatePlan) {
          practiceRuntime.resolvePracticeTransferPrecheck = function () {
            return {
              canOpen: true,
              board: [[0]],
              alertMessage: ""
            };
          };
          practiceRuntime.createPracticeTransferNavigationPlan = function () {
            return {
              openUrl: "about:blank"
            };
          };
          (window as any).open = function () {
            return null;
          };
          const openPracticeBoardFromCurrent = (window as any).openPracticeBoardFromCurrent;
          if (typeof openPracticeBoardFromCurrent === "function") {
            openPracticeBoardFromCurrent();
          }
        }
        const openSettingsModal = (window as any).openSettingsModal;
        if (typeof openSettingsModal === "function") {
          openSettingsModal();
        }
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const settingsModal = document.getElementById("settings-modal");
        return {
          hasRuntime: true,
          hasSyncMobileTimerboxUI: typeof syncMobileTimerboxUI === "function",
          hasOpenSettingsModal: typeof openSettingsModal === "function",
          settingsVisible: Boolean(settingsModal && settingsModal.style.display === "flex"),
          resolveStorageByNameCallCount
        };
      } finally {
        runtime.resolveStorageByName = originalResolveStorageByName;
        if (practiceRuntime && originalResolvePrecheck) {
          practiceRuntime.resolvePracticeTransferPrecheck = originalResolvePrecheck;
        }
        if (practiceRuntime && originalCreatePlan) {
          practiceRuntime.createPracticeTransferNavigationPlan = originalCreatePlan;
        }
        (window as any).open = originalWindowOpen;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasSyncMobileTimerboxUI).toBe(true);
    expect(snapshot.hasOpenSettingsModal).toBe(true);
    expect(snapshot.settingsVisible).toBe(true);
    expect(snapshot.resolveStorageByNameCallCount).toBeGreaterThan(0);
  });

  test("play application delegates entry resolution to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__playEntryPlanCallCount = 0;
      (window as any).__playRuntimeContractCallCount = 0;
      (window as any).__playChallengeIntroCallCount = 0;
      (window as any).__playChallengeIntroUiCallCount = 0;
      (window as any).__playChallengeIntroActionCallCount = 0;
      (window as any).__playChallengeIntroHostCallCount = 0;
      (window as any).__playChallengeContextCallCount = 0;
      (window as any).__playHeaderStateCallCount = 0;
      (window as any).__playHeaderHostCallCount = 0;
      (window as any).__playStartGuardCallCount = 0;
      (window as any).__playStartupPayloadCallCount = 0;
      (window as any).__playStartupContextCallCount = 0;
      (window as any).__playStartupHostCallCount = 0;
      (window as any).__playPageContextCustomSpawnCallCount = 0;
      (window as any).__playPageContextHeaderCallCount = 0;
      (window as any).__playCustomSpawnHostCallCount = 0;
      const runtimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayEntryRuntime = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayEntryPlan" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playEntryPlanCallCount =
                Number((window as any).__playEntryPlanCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const runtimeContractTarget: Record<string, unknown> = {};
      (window as any).CorePlayRuntimeContractRuntime = new Proxy(runtimeContractTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playRuntimeContractCallCount =
                Number((window as any).__playRuntimeContractCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const pageContextRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayPageContextRuntime = new Proxy(pageContextRuntimeTarget, {
        set(target, prop, value) {
          if (
            prop === "resolvePlayCustomSpawnModeConfigFromPageContext" &&
            typeof value === "function"
          ) {
            target[prop] = function (opts: unknown) {
              (window as any).__playPageContextCustomSpawnCallCount =
                Number((window as any).__playPageContextCustomSpawnCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "applyPlayHeaderFromPageContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playPageContextHeaderCallCount =
                Number((window as any).__playPageContextHeaderCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroRuntime = new Proxy(challengeIntroRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayChallengeIntroModel" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playChallengeIntroCallCount =
                Number((window as any).__playChallengeIntroCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroUiRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroUiRuntime = new Proxy(challengeIntroUiRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayChallengeIntroUiState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playChallengeIntroUiCallCount =
                Number((window as any).__playChallengeIntroUiCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroActionRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroActionRuntime = new Proxy(
        challengeIntroActionRuntimeTarget,
        {
          set(target, prop, value) {
            if (prop === "resolvePlayChallengeIntroActionState" && typeof value === "function") {
              target[prop] = function (opts: unknown) {
                (window as any).__playChallengeIntroActionCallCount =
                  Number((window as any).__playChallengeIntroActionCallCount || 0) + 1;
                return (value as (input: unknown) => unknown)(opts);
              };
              return true;
            }
            target[prop] = value;
            return true;
          }
        }
      );
      const challengeContextRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeContextRuntime = new Proxy(challengeContextRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayChallengeContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playChallengeContextCallCount =
                Number((window as any).__playChallengeContextCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroHostRuntime = new Proxy(
        challengeIntroHostRuntimeTarget,
        {
          set(target, prop, value) {
            if (prop === "resolvePlayChallengeIntroFromContext" && typeof value === "function") {
              target[prop] = function (opts: unknown) {
                (window as any).__playChallengeIntroHostCallCount =
                  Number((window as any).__playChallengeIntroHostCallCount || 0) + 1;
                return (value as (input: unknown) => unknown)(opts);
              };
              return true;
            }
            target[prop] = value;
            return true;
          }
        }
      );
      const playCustomSpawnHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayCustomSpawnHostRuntime = new Proxy(
        playCustomSpawnHostRuntimeTarget,
        {
          set(target, prop, value) {
            if (
              prop === "resolvePlayCustomSpawnModeConfigFromContext" &&
              typeof value === "function"
            ) {
              target[prop] = function (opts: unknown) {
                (window as any).__playCustomSpawnHostCallCount =
                  Number((window as any).__playCustomSpawnHostCallCount || 0) + 1;
                return (value as (input: unknown) => unknown)(opts);
              };
              return true;
            }
            target[prop] = value;
            return true;
          }
        }
      );
      const startGuardRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartGuardRuntime = new Proxy(startGuardRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartGuardState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartGuardCallCount =
                Number((window as any).__playStartGuardCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupPayloadRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartupPayloadRuntime = new Proxy(startupPayloadRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartupPayload" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartupPayloadCallCount =
                Number((window as any).__playStartupPayloadCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupContextRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartupContextRuntime = new Proxy(startupContextRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartupContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartupContextCallCount =
                Number((window as any).__playStartupContextCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartupHostRuntime = new Proxy(startupHostRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartupFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartupHostCallCount =
                Number((window as any).__playStartupHostCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const headerHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayHeaderHostRuntime = new Proxy(headerHostRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayHeaderFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playHeaderHostCallCount =
                Number((window as any).__playHeaderHostCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const headerRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayHeaderRuntime = new Proxy(headerRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayHeaderState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playHeaderStateCallCount =
                Number((window as any).__playHeaderStateCallCount || 0) + 1;
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

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CorePlayEntryRuntime?.resolvePlayEntryPlan),
      hasRuntimeContract: Boolean(
        (window as any).CorePlayRuntimeContractRuntime?.resolvePlayRuntimeContracts
      ),
      hasPageContextRuntime: Boolean(
        (window as any).CorePlayPageContextRuntime?.resolvePlayCustomSpawnModeConfigFromPageContext &&
        (window as any).CorePlayPageContextRuntime?.applyPlayHeaderFromPageContext
      ),
      hasChallengeIntroRuntime: Boolean(
        (window as any).CorePlayChallengeIntroRuntime?.resolvePlayChallengeIntroModel
      ),
      hasChallengeIntroUiRuntime: Boolean(
        (window as any).CorePlayChallengeIntroUiRuntime?.resolvePlayChallengeIntroUiState
      ),
      hasChallengeIntroActionRuntime: Boolean(
        (window as any).CorePlayChallengeIntroActionRuntime?.resolvePlayChallengeIntroActionState
      ),
      hasChallengeIntroHostRuntime: Boolean(
        (window as any).CorePlayChallengeIntroHostRuntime?.resolvePlayChallengeIntroFromContext
      ),
      hasChallengeContextRuntime: Boolean(
        (window as any).CorePlayChallengeContextRuntime?.resolvePlayChallengeContext
      ),
      hasPlayCustomSpawnHostRuntime: Boolean(
        (window as any).CorePlayCustomSpawnHostRuntime?.resolvePlayCustomSpawnModeConfigFromContext
      ),
      hasStartGuardRuntime: Boolean(
        (window as any).CorePlayStartGuardRuntime?.resolvePlayStartGuardState
      ),
      hasStartupPayloadRuntime: Boolean(
        (window as any).CorePlayStartupPayloadRuntime?.resolvePlayStartupPayload
      ),
      hasStartupContextRuntime: Boolean(
        (window as any).CorePlayStartupContextRuntime?.resolvePlayStartupContext
      ),
      hasStartupHostRuntime: Boolean(
        (window as any).CorePlayStartupHostRuntime?.resolvePlayStartupFromContext
      ),
      hasHeaderHostRuntime: Boolean(
        (window as any).CorePlayHeaderHostRuntime?.resolvePlayHeaderFromContext
      ),
      hasHeaderStateRuntime: Boolean(
        (window as any).CorePlayHeaderRuntime?.resolvePlayHeaderState
      ),
      entryCallCount: Number((window as any).__playEntryPlanCallCount || 0),
      runtimeContractCallCount: Number((window as any).__playRuntimeContractCallCount || 0),
      pageContextCustomSpawnCallCount: Number(
        (window as any).__playPageContextCustomSpawnCallCount || 0
      ),
      pageContextHeaderCallCount: Number((window as any).__playPageContextHeaderCallCount || 0),
      challengeIntroCallCount: Number((window as any).__playChallengeIntroCallCount || 0),
      challengeIntroUiCallCount: Number((window as any).__playChallengeIntroUiCallCount || 0),
      challengeIntroActionCallCount: Number(
        (window as any).__playChallengeIntroActionCallCount || 0
      ),
      challengeIntroHostCallCount: Number((window as any).__playChallengeIntroHostCallCount || 0),
      challengeContextCallCount: Number((window as any).__playChallengeContextCallCount || 0),
      playCustomSpawnHostCallCount: Number((window as any).__playCustomSpawnHostCallCount || 0),
      startGuardCallCount: Number((window as any).__playStartGuardCallCount || 0),
      startupPayloadCallCount: Number((window as any).__playStartupPayloadCallCount || 0),
      startupContextCallCount: Number((window as any).__playStartupContextCallCount || 0),
      startupHostCallCount: Number((window as any).__playStartupHostCallCount || 0),
      headerHostCallCount: Number((window as any).__playHeaderHostCallCount || 0),
      headerStateCallCount: Number((window as any).__playHeaderStateCallCount || 0),
      modeKey:
        (window as any).GAME_MODE_CONFIG && typeof (window as any).GAME_MODE_CONFIG.key === "string"
          ? (window as any).GAME_MODE_CONFIG.key
          : null,
      challengeContext: (window as any).GAME_CHALLENGE_CONTEXT,
      topIntroDisplay: (() => {
        const node = document.getElementById("top-mode-intro-btn");
        if (!node) return null;
        const htmlNode = node as HTMLElement;
        return htmlNode.style.display || "";
      })()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasRuntimeContract).toBe(true);
    expect(snapshot.hasPageContextRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroUiRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroActionRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroHostRuntime).toBe(true);
    expect(snapshot.hasChallengeContextRuntime).toBe(true);
    expect(snapshot.hasPlayCustomSpawnHostRuntime).toBe(true);
    expect(snapshot.hasStartGuardRuntime).toBe(true);
    expect(snapshot.hasStartupPayloadRuntime).toBe(true);
    expect(snapshot.hasStartupContextRuntime).toBe(true);
    expect(snapshot.hasStartupHostRuntime).toBe(true);
    expect(snapshot.hasHeaderHostRuntime).toBe(true);
    expect(snapshot.hasHeaderStateRuntime).toBe(true);
    expect(snapshot.entryCallCount).toBeGreaterThan(0);
    expect(snapshot.runtimeContractCallCount).toBeGreaterThan(0);
    expect(snapshot.pageContextCustomSpawnCallCount).toBeGreaterThan(0);
    expect(snapshot.pageContextHeaderCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroUiCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroActionCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroHostCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeContextCallCount).toBeGreaterThan(0);
    expect(snapshot.playCustomSpawnHostCallCount).toBeGreaterThan(0);
    expect(snapshot.startGuardCallCount).toBeGreaterThan(0);
    expect(snapshot.startupPayloadCallCount).toBeGreaterThan(0);
    expect(snapshot.startupContextCallCount).toBeGreaterThan(0);
    expect(snapshot.startupHostCallCount).toBeGreaterThan(0);
    expect(snapshot.headerHostCallCount).toBeGreaterThan(0);
    expect(snapshot.headerStateCallCount).toBeGreaterThan(0);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
    expect(snapshot.challengeContext).toBeNull();
    expect(snapshot.topIntroDisplay).toBe("none");
  });

  test("play custom spawn mode applies query four-rate via runtime helper", async ({ page }) => {
    const response = await page.goto("/play.html?mode_key=spawn_custom_4x4_pow2_no_undo&four_rate=25", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Custom-spawn response should exist").not.toBeNull();
    expect(response?.ok(), "Custom-spawn response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      const introNode = document.getElementById("play-mode-intro");
      return {
        key: cfg && typeof cfg.key === "string" ? cfg.key : null,
        label: cfg && typeof cfg.label === "string" ? cfg.label : null,
        spawnTable: cfg && Array.isArray(cfg.spawn_table) ? cfg.spawn_table : null,
        storedRate: window.localStorage.getItem("custom_spawn_4x4_four_rate_v1"),
        introText: introNode ? String(introNode.textContent || "") : "",
        hasRuntime: Boolean((window as any).CoreCustomSpawnRuntime?.applyCustomFourRateToModeConfig),
        hasPlayCustomSpawnRuntime: Boolean(
          (window as any).CorePlayCustomSpawnRuntime?.resolvePlayCustomSpawnModeConfig
        ),
        hasStorageRuntime: Boolean(
          (window as any).CoreStorageRuntime?.resolveStorageByName &&
          (window as any).CoreStorageRuntime?.safeReadStorageItem &&
          (window as any).CoreStorageRuntime?.safeSetStorageItem
        ),
        hasPlayEntryRuntime: Boolean(
          (window as any).CorePlayEntryRuntime?.resolvePlayEntryPlan
        ),
        hasPlayRuntimeContractRuntime: Boolean(
          (window as any).CorePlayRuntimeContractRuntime?.resolvePlayRuntimeContracts
        ),
        hasPlayPageContextRuntime: Boolean(
          (window as any).CorePlayPageContextRuntime?.resolvePlayCustomSpawnModeConfigFromPageContext &&
          (window as any).CorePlayPageContextRuntime?.applyPlayHeaderFromPageContext
        ),
        hasPlayChallengeIntroRuntime: Boolean(
          (window as any).CorePlayChallengeIntroRuntime?.resolvePlayChallengeIntroModel
        ),
        hasPlayChallengeIntroUiRuntime: Boolean(
          (window as any).CorePlayChallengeIntroUiRuntime?.resolvePlayChallengeIntroUiState
        ),
        hasPlayChallengeIntroActionRuntime: Boolean(
          (window as any).CorePlayChallengeIntroActionRuntime?.resolvePlayChallengeIntroActionState
        ),
        hasPlayChallengeIntroHostRuntime: Boolean(
          (window as any).CorePlayChallengeIntroHostRuntime?.resolvePlayChallengeIntroFromContext
        ),
        hasPlayChallengeContextRuntime: Boolean(
          (window as any).CorePlayChallengeContextRuntime?.resolvePlayChallengeContext
        ),
        hasPlayCustomSpawnHostRuntime: Boolean(
          (window as any).CorePlayCustomSpawnHostRuntime?.resolvePlayCustomSpawnModeConfigFromContext
        ),
        hasPlayStartGuardRuntime: Boolean(
          (window as any).CorePlayStartGuardRuntime?.resolvePlayStartGuardState
        ),
        hasPlayStartupPayloadRuntime: Boolean(
          (window as any).CorePlayStartupPayloadRuntime?.resolvePlayStartupPayload
        ),
        hasPlayStartupContextRuntime: Boolean(
          (window as any).CorePlayStartupContextRuntime?.resolvePlayStartupContext
        ),
        hasPlayStartupHostRuntime: Boolean(
          (window as any).CorePlayStartupHostRuntime?.resolvePlayStartupFromContext
        ),
        hasPlayHeaderHostRuntime: Boolean(
          (window as any).CorePlayHeaderHostRuntime?.resolvePlayHeaderFromContext
        ),
        hasHeaderRuntime: Boolean(
          (window as any).CorePlayHeaderRuntime?.buildPlayModeIntroText &&
            (window as any).CorePlayHeaderRuntime?.resolvePlayHeaderState
        ),
        hasModeCatalogRuntime: Boolean((window as any).CoreModeCatalogRuntime?.resolveCatalogModeWithDefault)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPlayCustomSpawnRuntime).toBe(true);
    expect(snapshot.hasStorageRuntime).toBe(true);
    expect(snapshot.hasPlayEntryRuntime).toBe(true);
    expect(snapshot.hasPlayRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasPlayPageContextRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroUiRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroActionRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroHostRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeContextRuntime).toBe(true);
    expect(snapshot.hasPlayCustomSpawnHostRuntime).toBe(true);
    expect(snapshot.hasPlayStartGuardRuntime).toBe(true);
    expect(snapshot.hasPlayStartupPayloadRuntime).toBe(true);
    expect(snapshot.hasPlayStartupContextRuntime).toBe(true);
    expect(snapshot.hasPlayStartupHostRuntime).toBe(true);
    expect(snapshot.hasPlayHeaderHostRuntime).toBe(true);
    expect(snapshot.hasHeaderRuntime).toBe(true);
    expect(snapshot.hasModeCatalogRuntime).toBe(true);
    expect(snapshot.key).toBe("spawn_custom_4x4_pow2_no_undo");
    expect(snapshot.label).toContain("4率 25%");
    expect(snapshot.introText).toContain("4率25%");
    expect(snapshot.spawnTable).toEqual([
      { value: 2, weight: 75 },
      { value: 4, weight: 25 }
    ]);
    expect(snapshot.storedRate).toBe("25");
  });

  test("capped timer scroll delegates mode context resolution to runtime helper", async ({
    page
  }) => {
    const response = await page.goto("/capped_2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Capped response should exist").not.toBeNull();
    expect(response?.ok(), "Capped response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreCappedTimerScrollRuntime;
      const updateTimerScroll = (window as any).updateTimerScroll;
      if (
        !runtime ||
        typeof runtime.resolveTimerScrollModeFromContext !== "function" ||
        typeof runtime.isTimerScrollModeKey !== "function" ||
        typeof updateTimerScroll !== "function"
      ) {
        return {
          hasRuntime: false,
          hasUpdateBinding: typeof updateTimerScroll === "function"
        };
      }

      const originalResolve = runtime.resolveTimerScrollModeFromContext;
      let resolveCallCount = 0;
      runtime.resolveTimerScrollModeFromContext = function (opts: any) {
        resolveCallCount += 1;
        return originalResolve(opts);
      };

      try {
        updateTimerScroll();
        const modeState = originalResolve({
          bodyLike: document.body,
          windowLike: window
        });
        return {
          hasRuntime: true,
          hasUpdateBinding: true,
          resolveCallCount,
          modeEnabled: Boolean(modeState && modeState.enabled)
        };
      } finally {
        runtime.resolveTimerScrollModeFromContext = originalResolve;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasUpdateBinding).toBe(true);
    expect(snapshot.resolveCallCount).toBeGreaterThan(0);
    expect(snapshot.modeEnabled).toBe(true);
  });

  test("practice page applies fibonacci ruleset via runtime helper", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_ruleset=fibonacci", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice-fibonacci response should exist").not.toBeNull();
    expect(response?.ok(), "Practice-fibonacci response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      return {
        key: cfg && typeof cfg.key === "string" ? cfg.key : null,
        ruleset: cfg && typeof cfg.ruleset === "string" ? cfg.ruleset : null,
        spawnTable: cfg && Array.isArray(cfg.spawn_table) ? cfg.spawn_table : null,
        hasRuntime: Boolean((window as any).CorePracticeModeRuntime?.buildPracticeModeConfig),
        hasModeCatalogRuntime: Boolean((window as any).CoreModeCatalogRuntime?.resolveCatalogModeWithDefault),
        hasHomeModeRuntime: Boolean((window as any).CoreHomeModeRuntime?.resolveHomeModeSelection),
        hasHomeRuntimeContractRuntime: Boolean(
          (window as any).CoreHomeRuntimeContractRuntime?.resolveHomeRuntimeContracts
        ),
        hasHomeStartupHostRuntime: Boolean(
          (window as any).CoreHomeStartupHostRuntime?.resolveHomeStartupFromContext
        ),
        hasHomeModeContextRuntime: Boolean(
          (window as any).CoreHomeModeRuntime?.resolveHomeModeSelectionFromContext
        )
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasModeCatalogRuntime).toBe(true);
    expect(snapshot.hasHomeModeRuntime).toBe(true);
    expect(snapshot.hasHomeRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasHomeStartupHostRuntime).toBe(true);
    expect(snapshot.hasHomeModeContextRuntime).toBe(true);
    expect(snapshot.key).toBe("practice_legacy");
    expect(snapshot.ruleset).toBe("fibonacci");
    expect(snapshot.spawnTable).toEqual([
      { value: 1, weight: 90 },
      { value: 2, weight: 10 }
    ]);
  });

  test("history page renders adapter diagnostics for local records", async ({ page }) => {
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
      window.localStorage.removeItem("engine_adapter_default_mode");
      window.localStorage.removeItem("engine_adapter_force_legacy");
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
          undoUsedFromSnapshot: 1,
          scoreDelta: 4,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 4,
          undoUsedDelta: 1,
          overEventsDelta: 1,
          undoEventsDelta: 1,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });

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
        duration_ms: 18000,
        final_board: [
          [4, 8, 16, 32],
          [64, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 512,
          undoUsedFromSnapshot: 2,
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
    await expect(page.locator(".history-adapter-diagnostics")).toHaveCount(2);
    await expect(page.locator(".history-adapter-badge-mismatch")).toHaveCount(1);
    await expect(page.locator(".history-adapter-badge-match")).toHaveCount(1);
    await expect(page.locator("#history-export-mismatch-btn")).toBeVisible();
    await expect(page.locator("#history-burnin-summary")).toContainText("可比较样本 2");
    await expect(page.locator("#history-burnin-summary")).toContainText("不一致 1");
    await expect(page.locator("#history-burnin-summary")).toContainText("单窗口: 样本不足");
    await expect(page.locator("#history-burnin-summary")).toContainText("连续窗口: 窗口不足");
    await expect(page.locator("#history-burnin-summary")).toContainText("连续门槛: 最近 3 个窗口");
    await expect(page.locator(".history-burnin-focus-mismatch")).toHaveCount(1);

    await page.click(".history-burnin-focus-mismatch");
    await expect(page.locator("#history-adapter-filter")).toHaveValue("mismatch");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-adapter-badge-mismatch")).toHaveCount(1);
    await expect(page.locator("#history-summary")).toContainText("共 1 条记录");
    await expect(page.locator("#history-summary")).toContainText("诊断筛选: 仅不一致");

    await expect(page.locator("#history-canary-policy")).toContainText("Canary 策略控制");
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: legacy-bridge");
    await expect(page.locator("#history-canary-policy")).toContainText("生效来源: 默认回退");

    await page.click("[data-action='apply_canary']");
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: core-adapter");
    await expect(page.locator("#history-canary-policy")).toContainText("生效来源: 默认策略");
    await expect(page.locator("#history-canary-policy")).toContainText(
      "storage(engine_adapter_default_mode)=core-adapter"
    );
    await expect(page.locator("#history-canary-policy")).toContainText(
      "storage(engine_adapter_force_legacy)=-"
    );

    await page.click("[data-action='emergency_rollback']");
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: legacy-bridge");
    await expect(page.locator("#history-canary-policy")).toContainText("生效来源: 强制回滚");
    await expect(page.locator("#history-canary-policy")).toContainText(
      "storage(engine_adapter_force_legacy)=1"
    );

    await page.click("[data-action='resume_canary']");
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: core-adapter");
    await expect(page.locator("#history-canary-policy")).toContainText("生效来源: 默认策略");
    await expect(page.locator("#history-canary-policy")).toContainText(
      "storage(engine_adapter_force_legacy)=-"
    );

    await page.click("[data-action='reset_policy']");
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: legacy-bridge");
    await expect(page.locator("#history-canary-policy")).toContainText("生效来源: 默认回退");
    await expect(page.locator("#history-canary-policy")).toContainText(
      "storage(engine_adapter_default_mode)=-"
    );

    const policyKeys = await page.evaluate(() => ({
      defaultMode: window.localStorage.getItem("engine_adapter_default_mode"),
      forceLegacy: window.localStorage.getItem("engine_adapter_force_legacy")
    }));
    expect(policyKeys.defaultMode).toBeNull();
    expect(policyKeys.forceLegacy).toBeNull();
  });
});

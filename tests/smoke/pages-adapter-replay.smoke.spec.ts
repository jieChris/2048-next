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


});

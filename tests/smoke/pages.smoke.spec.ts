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

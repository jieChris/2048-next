import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
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

  test("replay step controls advance replay index deterministically", async ({ page }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function" && typeof manager.step === "function";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const replayText = "replay_(!äfC";
      const originalAlert = window.alert;
      window.alert = function (_msg) {};
      try {
        const ok = manager.import(replayText);
        manager.pause();
        const total = Array.isArray(manager.replayMoves) ? manager.replayMoves.length : 0;
        const before = Number(manager.replayIndex);
        manager.step(1);
        const afterPlusOne = Number(manager.replayIndex);
        manager.step(10);
        const afterPlusTen = Number(manager.replayIndex);
        manager.step(-1);
        const afterMinusOne = Number(manager.replayIndex);
        return {
          ok,
          total,
          before,
          afterPlusOne,
          afterPlusTen,
          afterMinusOne
        };
      } finally {
        window.alert = originalAlert;
      }
    });

    expect(snapshot.ok).toBe(true);
    expect(snapshot.total).toBeGreaterThan(0);
    expect(snapshot.afterPlusOne).toBe(Math.min(snapshot.before + 1, snapshot.total));
    expect(snapshot.afterPlusTen).toBe(Math.min(snapshot.afterPlusOne + 10, snapshot.total));
    expect(snapshot.afterMinusOne).toBe(Math.max(snapshot.afterPlusTen - 1, 0));
  });

  test("replay import treats REPLAY_v4C payload as v4 instead of v9 verse", async ({ page }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function" && typeof manager.serialize === "function";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const replayText = manager.serialize();
      const v4Prefix = ((window as any).GameManager && (window as any).GameManager.REPLAY_V4_PREFIX) || "REPLAY_v4C_";
      const originalAlert = window.alert;
      const alerts: string[] = [];
      window.alert = function (msg?: unknown) {
        alerts.push(typeof msg === "string" ? msg : String(msg));
      };
      try {
        const ok = manager.import(replayText);
        manager.pause();
        return {
          hasV4Prefix: typeof replayText === "string" && replayText.indexOf(v4Prefix) === 0,
          ok,
          alerts,
          replayMovesLength: Array.isArray(manager.replayMoves) ? manager.replayMoves.length : -1
        };
      } finally {
        window.alert = originalAlert;
      }
    });

    expect(snapshot.hasV4Prefix).toBe(true);
    expect(snapshot.ok).toBe(true);
    expect(snapshot.alerts).toEqual([]);
    expect(snapshot.replayMovesLength).toBe(0);
  });

  test("replay ui step/seek triggers single final actuate without extra relayout flash", async ({
    page
  }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function" && typeof manager.step === "function";
    });

    const snapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      const replayText = "replay_(!äfC";
      const originalAlert = window.alert;
      window.alert = function (_msg) {};
      try {
        const ok = manager.import(replayText);
        manager.pause();
        if (!ok) {
          return { ok: false };
        }

        const originalActuate = manager.actuate;
        let actuateCount = 0;
        manager.actuate = function (...args: unknown[]) {
          actuateCount += 1;
          return originalActuate.apply(this, args);
        };

        window.replayUiStepReplay(1);
        await new Promise((resolve) => window.setTimeout(resolve, 280));
        const stepActuateCount = actuateCount;

        actuateCount = 0;
        const progress = document.getElementById("replay-progress") as HTMLInputElement | null;
        if (progress) {
          progress.value = "50";
          progress.dispatchEvent(new Event("input", { bubbles: true }));
          progress.dispatchEvent(new Event("change", { bubbles: true }));
        }
        await new Promise((resolve) => window.setTimeout(resolve, 280));
        const seekActuateCount = actuateCount;

        manager.actuate = originalActuate;
        return {
          ok: true,
          stepActuateCount,
          seekActuateCount
        };
      } finally {
        window.alert = originalAlert;
      }
    });

    expect(snapshot.ok).toBe(true);
    expect(snapshot.stepActuateCount).toBe(1);
    expect(snapshot.seekActuateCount).toBe(1);
  });

  test("replay mode does not write best score into standard mode storage key", async ({ page }) => {
    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.actuate === "function";
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const standardKey = "bestScoreByMode:standard_4x4_pow2_no_undo";
      window.localStorage.setItem(standardKey, "0");

      manager.replayMode = true;
      manager.score = 4096;
      manager.actuate();

      // Even if replay flag is off, replay page should remain isolated from standard best score key.
      if (manager.scoreManager && typeof manager.scoreManager.setModeKey === "function") {
        manager.scoreManager.setModeKey("standard_4x4_pow2_no_undo");
      }
      manager.replayMode = false;
      manager.score = 8192;
      manager.actuate();

      return {
        standardAfter: window.localStorage.getItem(standardKey),
        replayScoreKey:
          manager.scoreManager && typeof manager.scoreManager.getKey === "function"
            ? manager.scoreManager.getKey()
            : null
      };
    });

    expect(snapshot.standardAfter).toBe("0");
    expect(snapshot.replayScoreKey).toBe("bestScoreByMode:replay_view");
  });

  test("replay page loads local history replay via local_history_id parameter", async ({ page }) => {
    const replayId = "lh_replay_local_param";
    await page.addInitScript((id: string) => {
      const records = [
        {
          id,
          mode_key: "standard_4x4_pow2_no_undo",
          replay_string: "replay_(!äfC",
          ended_at: new Date().toISOString(),
          saved_at: new Date().toISOString()
        }
      ];
      window.localStorage.setItem("local_game_history_v1", JSON.stringify(records));
      (window as any).__replayLoadAlerts = [];
      window.alert = function (message?: unknown) {
        (window as any).__replayLoadAlerts.push(String(message || ""));
      };
    }, replayId);

    const response = await page.goto("/replay.html?local_history_id=" + replayId, {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const titleNode = document.querySelector(".heading .title");
      const title = titleNode ? String(titleNode.textContent || "") : "";
      return title.includes("本地记录") || title.includes("鏈湴璁板綍");
    });

    const snapshot = await page.evaluate(() => {
      const titleNode = document.querySelector(".heading .title");
      return {
        title: titleNode ? String(titleNode.textContent || "") : "",
        alertCount: Number(((window as any).__replayLoadAlerts || []).length)
      };
    });

    expect(snapshot.alertCount).toBe(0);
    expect(snapshot.title.includes("本地记录") || snapshot.title.includes("鏈湴璁板綍")).toBe(true);
  });

  test("replay page keeps backward compatibility for legacy id parameter", async ({ page }) => {
    const replayId = "lh_replay_legacy_param";
    await page.addInitScript((id: string) => {
      const records = [
        {
          id,
          mode_key: "standard_4x4_pow2_no_undo",
          replay_string: "replay_(!äfC",
          ended_at: new Date().toISOString(),
          saved_at: new Date().toISOString()
        }
      ];
      window.localStorage.setItem("local_game_history_v1", JSON.stringify(records));
      (window as any).__replayLoadAlerts = [];
      window.alert = function (message?: unknown) {
        (window as any).__replayLoadAlerts.push(String(message || ""));
      };
    }, replayId);

    const response = await page.goto("/replay.html?id=" + replayId, {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const titleNode = document.querySelector(".heading .title");
      const title = titleNode ? String(titleNode.textContent || "") : "";
      return title.includes("本地记录") || title.includes("鏈湴璁板綍");
    });

    const snapshot = await page.evaluate(() => {
      const titleNode = document.querySelector(".heading .title");
      return {
        title: titleNode ? String(titleNode.textContent || "") : "",
        alertCount: Number(((window as any).__replayLoadAlerts || []).length)
      };
    });

    expect(snapshot.alertCount).toBe(0);
    expect(snapshot.title.includes("本地记录") || snapshot.title.includes("鏈湴璁板綍")).toBe(true);
  });

  test("replay page reports explicit error when local history replay code is missing", async ({
    page
  }) => {
    const replayId = "lh_replay_missing_code";
    await page.addInitScript((id: string) => {
      const records = [
        {
          id,
          mode_key: "standard_4x4_pow2_no_undo",
          replay_string: "",
          ended_at: new Date().toISOString(),
          saved_at: new Date().toISOString()
        }
      ];
      window.localStorage.setItem("local_game_history_v1", JSON.stringify(records));
      (window as any).__replayLoadAlerts = [];
      window.alert = function (message?: unknown) {
        (window as any).__replayLoadAlerts.push(String(message || ""));
      };
    }, replayId);

    const response = await page.goto("/replay.html?local_history_id=" + replayId, {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      return Number(((window as any).__replayLoadAlerts || []).length || 0) > 0;
    });

    const snapshot = await page.evaluate(() => {
      return {
        alerts: ((window as any).__replayLoadAlerts || []).map((item: unknown) => String(item || ""))
      };
    });

    expect(snapshot.alerts.length).toBeGreaterThan(0);
    expect(
      snapshot.alerts[0].includes("加载本地回放失败") ||
        snapshot.alerts[0].includes("鍔犺浇鏈湴鍥炴斁澶辫触")
    ).toBe(true);
  });

  test("replay ui no longer includes onboarding guide storage runtime", async ({ page }) => {
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
          hasRuntime: false,
          hasOverlay: false,
          showCalls: Number((window as any).__replayGuideShowCalls || 0),
          markCalls: Number((window as any).__replayGuideMarkCalls || 0),
          initialDisplay: "",
          finalDisplay: ""
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

    expect(snapshot.hasRuntime).toBe(false);
    expect(snapshot.hasOverlay).toBe(false);
    expect(snapshot.showCalls).toBe(0);
    expect(snapshot.markCalls).toBe(0);
    expect(snapshot.initialDisplay).toBe("");
    expect(snapshot.finalDisplay).toBe("");
  });
});

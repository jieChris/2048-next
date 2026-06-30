import { expect, test } from "@playwright/test";

test.describe("Refactor Contract Smoke: settings storage delegation", () => {
  test("game manager delegates settings storage access to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__gameSettingsReadFlagCalls = 0;
      (window as any).__gameSettingsWriteFlagCalls = 0;
      (window as any).__gameSettingsReadMapCalls = 0;
      (window as any).__gameSettingsWriteMapCalls = 0;
      (window as any).__gameSettingsWritePayloadCalls = 0;

      const trackedCalls: Record<string, string> = {
        readStorageFlagFromContext: "__gameSettingsReadFlagCalls",
        writeStorageFlagFromContext: "__gameSettingsWriteFlagCalls",
        readStorageJsonMapFromContext: "__gameSettingsReadMapCalls",
        writeStorageJsonMapFromContext: "__gameSettingsWriteMapCalls",
        writeStorageJsonPayloadFromContext: "__gameSettingsWritePayloadCalls"
      };
      let runtimeValue: Record<string, unknown> | undefined;
      const wrapRuntimeValue = (prop: string | symbol, value: unknown) => {
        if (typeof prop !== "string" || typeof value !== "function" || !trackedCalls[prop]) {
          return value;
        }
        return function (opts: unknown) {
          const key = trackedCalls[prop];
          (window as any)[key] = Number((window as any)[key] || 0) + 1;
          return (value as (input: unknown) => unknown)(opts);
        };
      };
      const createRuntimeProxy = (source: unknown) => {
        const target: Record<string, unknown> =
          source && typeof source === "object" && !Array.isArray(source)
            ? (source as Record<string, unknown>)
            : {};
        Object.keys(trackedCalls).forEach((prop) => {
          target[prop] = wrapRuntimeValue(prop, target[prop]);
        });
        return new Proxy(target, {
          set(target, prop, value) {
            target[prop as string] = wrapRuntimeValue(prop, value);
            return true;
          }
        });
      };
      Object.defineProperty(window, "CoreGameSettingsStorageRuntime", {
        configurable: true,
        get() {
          return runtimeValue;
        },
        set(value) {
          runtimeValue = createRuntimeProxy(value);
        }
      });
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);
    await page.waitForFunction(() => {
      const runtime = (window as any).CoreGameSettingsStorageRuntime;
      const manager = (window as any).game_manager;
      return (
        !!manager &&
        !!runtime &&
        typeof runtime.readStorageFlagFromContext === "function" &&
        typeof runtime.writeStorageFlagFromContext === "function" &&
        typeof runtime.readStorageJsonMapFromContext === "function" &&
        typeof runtime.writeStorageJsonMapFromContext === "function" &&
        typeof runtime.writeStorageJsonPayloadFromContext === "function"
      );
    });

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

      if (!document.getElementById("timerbox")) {
        const timerbox = document.createElement("div");
        timerbox.id = "timerbox";
        document.body.appendChild(timerbox);
      }
      if (!document.getElementById("stats-panel-overlay")) {
        const overlay = document.createElement("div");
        overlay.id = "stats-panel-overlay";
        document.body.appendChild(overlay);
      }

      if (typeof manager.loadTimerModuleViewForMode === "function") {
        manager.loadTimerModuleViewForMode(mode);
      } else if (typeof manager.getTimerModuleViewMode === "function") {
        manager.getTimerModuleViewMode();
      }

      if (typeof manager.persistTimerModuleViewForMode === "function") {
        manager.persistTimerModuleViewForMode(mode, "hidden");
      } else if (typeof manager.setTimerModuleViewMode === "function") {
        manager.setTimerModuleViewMode("hidden", false);
      } else if (typeof manager.applyTimerModuleView === "function") {
        manager.applyTimerModuleView("hidden", false);
      }

      if (typeof manager.loadUndoSettingForMode === "function") {
        manager.loadUndoSettingForMode(mode);
      }
      if (typeof manager.persistUndoSettingForMode === "function") {
        manager.persistUndoSettingForMode(mode, true);
      }
      if (typeof manager.openStatsPanel === "function") {
        manager.openStatsPanel();
      }
      if (typeof manager.closeStatsPanel === "function") {
        manager.closeStatsPanel();
      }

      manager.sessionSubmitDone = false;
      manager.replayMode = true;
      if (typeof manager.tryAutoSubmitOnGameOver === "function") {
        manager.tryAutoSubmitOnGameOver();
      }
      if (typeof manager.writeLocalStorageJsonPayload === "function") {
        manager.writeLocalStorageJsonPayload("last_session_submit_result_v1", {
          at: new Date().toISOString(),
          ok: false,
          reason: "smoke_probe"
        });
      }
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

import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
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

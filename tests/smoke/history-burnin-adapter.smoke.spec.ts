import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates adapter diagnostics rendering to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyAdapterParityStatusCallCount = 0;
      (window as any).__historyAdapterBadgeCallCount = 0;
      (window as any).__historyAdapterDiagnosticsCallCount = 0;
      (window as any).__historyAdapterBadgeHtmlCallCount = 0;
      (window as any).__historyAdapterDiagnosticsHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryAdapterDiagnosticsRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryAdapterParityStatus" && typeof value === "function") {
            proxyTarget[prop] = function (store: unknown, item: unknown) {
              (window as any).__historyAdapterParityStatusCallCount =
                Number((window as any).__historyAdapterParityStatusCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(store, item);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterBadgeState" && typeof value === "function") {
            proxyTarget[prop] = function (item: unknown, status: string) {
              (window as any).__historyAdapterBadgeCallCount =
                Number((window as any).__historyAdapterBadgeCallCount || 0) + 1;
              return (value as (entry: unknown, state: string) => unknown)(item, status);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterDiagnosticsState" && typeof value === "function") {
            proxyTarget[prop] = function (item: unknown) {
              (window as any).__historyAdapterDiagnosticsCallCount =
                Number((window as any).__historyAdapterDiagnosticsCallCount || 0) + 1;
              return (value as (entry: unknown) => unknown)(item);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterBadgeHtml" && typeof value === "function") {
            proxyTarget[prop] = function (state: unknown) {
              (window as any).__historyAdapterBadgeHtmlCallCount =
                Number((window as any).__historyAdapterBadgeHtmlCallCount || 0) + 1;
              return (value as (entry: unknown) => unknown)(state);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterDiagnosticsHtml" && typeof value === "function") {
            proxyTarget[prop] = function (state: unknown) {
              (window as any).__historyAdapterDiagnosticsHtmlCallCount =
                Number((window as any).__historyAdapterDiagnosticsHtmlCallCount || 0) + 1;
              return (value as (entry: unknown) => unknown)(state);
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
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
        adapter_parity_report_v2: {
          schemaVersion: 2,
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 256,
          undoUsedFromSnapshot: 1,
          scoreDelta: 0,
          isScoreAligned: true
        },
        adapter_parity_ab_diff_v2: {
          schemaVersion: 2,
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
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryAdapterDiagnosticsRuntime?.resolveHistoryAdapterParityStatus &&
          (window as any).CoreHistoryAdapterDiagnosticsRuntime?.resolveHistoryAdapterBadgeState &&
            (window as any).CoreHistoryAdapterDiagnosticsRuntime
              ?.resolveHistoryAdapterDiagnosticsState &&
            (window as any).CoreHistoryAdapterDiagnosticsRuntime?.resolveHistoryAdapterBadgeHtml &&
            (window as any).CoreHistoryAdapterDiagnosticsRuntime
              ?.resolveHistoryAdapterDiagnosticsHtml
        ),
        parityStatusCallCount: Number((window as any).__historyAdapterParityStatusCallCount || 0),
        badgeCallCount: Number((window as any).__historyAdapterBadgeCallCount || 0),
        diagnosticsCallCount: Number((window as any).__historyAdapterDiagnosticsCallCount || 0),
        badgeHtmlCallCount: Number((window as any).__historyAdapterBadgeHtmlCallCount || 0),
        diagnosticsHtmlCallCount: Number((window as any).__historyAdapterDiagnosticsHtmlCallCount || 0),
        diagnosticsCount: document.querySelectorAll(".history-adapter-diagnostics").length
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.parityStatusCallCount).toBeGreaterThan(0);
    expect(snapshot.badgeCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsCallCount).toBeGreaterThan(0);
    expect(snapshot.badgeHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsCount).toBe(1);
  });

  test("history page delegates adapter diagnostics orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyAdapterHostRenderCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryAdapterHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryAdapterRecordRenderState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyAdapterHostRenderCallCount =
                Number((window as any).__historyAdapterHostRenderCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
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

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
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
        adapter_parity_report_v2: {
          schemaVersion: 2,
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 256,
          undoUsedFromSnapshot: 1,
          scoreDelta: 0,
          isScoreAligned: true
        },
        adapter_parity_ab_diff_v2: {
          schemaVersion: 2,
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
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      return {
        hasRuntime: Boolean((window as any).CoreHistoryAdapterHostRuntime?.resolveHistoryAdapterRecordRenderState),
        hostRenderCallCount: Number((window as any).__historyAdapterHostRenderCallCount || 0),
        diagnosticsCount: document.querySelectorAll(".history-adapter-diagnostics").length
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hostRenderCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsCount).toBe(1);
  });
});

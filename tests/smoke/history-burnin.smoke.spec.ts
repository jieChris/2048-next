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
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 256,
          undoUsedFromSnapshot: 1,
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
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 256,
          undoUsedFromSnapshot: 1,
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

  test("history page delegates burn-in summary modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBurnInSummarySourceCallCount = 0;
      (window as any).__historyBurnInCallCount = 0;
      (window as any).__historyBurnInPanelHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBurnInRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryBurnInSummarySource" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInSummarySourceCallCount =
                Number((window as any).__historyBurnInSummarySourceCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInSummaryState" && typeof value === "function") {
            proxyTarget[prop] = function (summary: unknown) {
              (window as any).__historyBurnInCallCount =
                Number((window as any).__historyBurnInCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(summary);
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInPanelHtml" && typeof value === "function") {
            proxyTarget[prop] = function (summary: unknown, state: unknown) {
              (window as any).__historyBurnInPanelHtmlCallCount =
                Number((window as any).__historyBurnInPanelHtmlCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(summary, state);
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
        score: 128,
        best_tile: 16,
        duration_ms: 8000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 130,
          undoUsedFromSnapshot: 0,
          scoreDelta: 2,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 2,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInSummarySource) &&
        Boolean((window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInSummaryState) &&
        Boolean((window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInPanelHtml),
      summarySourceCallCount: Number((window as any).__historyBurnInSummarySourceCallCount || 0),
      burnInCallCount: Number((window as any).__historyBurnInCallCount || 0),
      panelHtmlCallCount: Number((window as any).__historyBurnInPanelHtmlCallCount || 0),
      burnInText: (document.querySelector("#history-burnin-summary")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.summarySourceCallCount).toBeGreaterThan(0);
    expect(snapshot.burnInCallCount).toBeGreaterThan(0);
    expect(snapshot.panelHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.burnInText).toContain("Cutover Burn-in 统计");
  });

  test("history page delegates burn-in mismatch focus action to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBurnInFocusCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBurnInRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryBurnInSummaryState" && typeof value === "function") {
            proxyTarget[prop] = function (summary: unknown) {
              const state = (value as (input: unknown) => unknown)(summary);
              if (!state || typeof state !== "object") return state;
              return { ...(state as Record<string, unknown>), mismatchActionEnabled: true };
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInMismatchFocusActionState" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyBurnInFocusCallCount =
                Number((window as any).__historyBurnInFocusCallCount || 0) + 1;
              return (value as () => unknown)();
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
        score: 128,
        best_tile: 16,
        duration_ms: 8000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 130,
          undoUsedFromSnapshot: 0,
          scoreDelta: 2,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 2,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const actionBtn = document.querySelector(".history-burnin-focus-mismatch") as HTMLButtonElement | null;
      if (actionBtn && typeof actionBtn.click === "function") actionBtn.click();
      const adapterFilter = document.querySelector("#history-adapter-filter") as HTMLSelectElement | null;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInMismatchFocusActionState
        ),
        callCount: Number((window as any).__historyBurnInFocusCallCount || 0),
        hasActionButton: Boolean(actionBtn),
        adapterFilterValue: adapterFilter ? adapterFilter.value : ""
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasActionButton).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.adapterFilterValue).toBe("mismatch");
  });

  test("history page delegates burn-in panel orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBurnInHostRenderCallCount = 0;
      (window as any).__historyBurnInHostClickCallCount = 0;
      (window as any).__historyBurnInHostApplyRenderCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBurnInHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryBurnInPanelRenderState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInHostRenderCallCount =
                Number((window as any).__historyBurnInHostRenderCallCount || 0) + 1;
              (value as (arg: unknown) => unknown)(input);
              return {
                panelHtml:
                  "<div class='history-burnin-actions'>" +
                  "<button class='replay-button history-burnin-focus-mismatch'>仅看不一致</button>" +
                  "</div>",
                shouldBindMismatchAction: true
              };
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInMismatchFocusClickState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInHostClickCallCount =
                Number((window as any).__historyBurnInHostClickCallCount || 0) + 1;
              (value as (arg: unknown) => unknown)(input);
              return {
                shouldApply: true,
                nextAdapterParityFilter: "mismatch",
                nextSelectValue: "mismatch",
                shouldReload: false,
                resetPage: true
              };
            };
            return true;
          }
          if (prop === "applyHistoryBurnInSummaryRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInHostApplyRenderCallCount =
                Number((window as any).__historyBurnInHostApplyRenderCallCount || 0) + 1;
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

    const snapshot = await page.evaluate(() => {
      const actionBtn = document.querySelector(".history-burnin-focus-mismatch") as HTMLButtonElement | null;
      if (actionBtn && typeof actionBtn.click === "function") actionBtn.click();
      return {
        hasRuntime:
          Boolean((window as any).CoreHistoryBurnInHostRuntime?.resolveHistoryBurnInPanelRenderState) &&
          Boolean((window as any).CoreHistoryBurnInHostRuntime?.resolveHistoryBurnInMismatchFocusClickState) &&
          Boolean((window as any).CoreHistoryBurnInHostRuntime?.applyHistoryBurnInSummaryRender),
        applyRenderCallCount: Number((window as any).__historyBurnInHostApplyRenderCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.applyRenderCallCount).toBeGreaterThan(0);
  });

  test("history page delegates startup orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyStartupHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryStartupHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryStartup" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyStartupHostCallCount =
                Number((window as any).__historyStartupHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
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
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryStartupHostRuntime?.applyHistoryStartup),
      startupHostCallCount: Number((window as any).__historyStartupHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.startupHostCallCount).toBeGreaterThan(0);
  });
});

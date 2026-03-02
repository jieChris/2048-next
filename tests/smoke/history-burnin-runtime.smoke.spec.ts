import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
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
        adapter_parity_report_v2: {
          schemaVersion: 2,
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 130,
          undoUsedFromSnapshot: 0,
          scoreDelta: 2,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v2: {
          schemaVersion: 2,
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
    expect(snapshot.burnInText).toContain("观察中：样本仍不足，继续 burn-in");
    expect(snapshot.burnInText).toContain("模式不一致 Top:");
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
        adapter_parity_report_v2: {
          schemaVersion: 2,
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 130,
          undoUsedFromSnapshot: 0,
          scoreDelta: 2,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v2: {
          schemaVersion: 2,
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
});

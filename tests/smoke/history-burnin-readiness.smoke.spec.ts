import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history burn-in shows cutover-ready state when gate thresholds are satisfied", async ({
    page
  }) => {
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
      for (let i = 0; i < 100; i++) {
        store.saveRecord({
          mode: "local",
          mode_key: i % 2 === 0 ? "standard_4x4_pow2_no_undo" : "practice_legacy",
          board_width: 4,
          board_height: 4,
          ruleset: "pow2",
          undo_enabled: false,
          rank_policy: "ranked",
          score: 256 + i,
          best_tile: 32,
          duration_ms: 8000 + i,
          final_board: [
            [2, 4, 8, 16],
            [32, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ],
          ended_at: new Date(Date.now() - i * 1000).toISOString(),
          replay_string: "",
          adapter_parity_report_v2: {
            schemaVersion: 2,
            adapterMode: "core-adapter",
            lastScoreFromSnapshot: 256 + i,
            undoUsedFromSnapshot: 0,
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
      }
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    await page.selectOption("#history-burnin-window", "50");
    await page.selectOption("#history-sustained-window", "2");
    await page.click("#history-load-btn");
    await page.waitForTimeout(250);

    await expect(page.locator("#history-burnin-summary")).toContainText("单窗口: 达标");
    await expect(page.locator("#history-burnin-summary")).toContainText("连续窗口: 连续达标");
    await expect(page.locator("#history-burnin-summary")).toContainText("可切换：当前 burn-in 指标达标");
    await expect(page.locator("#history-burnin-summary")).toContainText("一致率 100.00%");
    await expect(page.locator("#history-burnin-summary")).toContainText("连续通过 2/2（达标率 100.00%）");
    await expect(page.locator("#history-burnin-summary")).toContainText("窗口趋势:");
    await expect(page.locator("#history-burnin-summary")).toContainText("模式不一致 Top: -");
  });

  test("history local store burn-in summary returns top mismatch modes by mode key", async ({
    page
  }) => {
    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (
        !store ||
        typeof store.saveRecord !== "function" ||
        typeof store.clearAll !== "function" ||
        typeof store.getAdapterParityBurnInSummary !== "function"
      ) {
        throw new Error("LocalHistoryStore burn-in api unavailable");
      }

      function save(modeKey: string, mismatch: boolean) {
        store.saveRecord({
          mode: "local",
          mode_key: modeKey,
          board_width: 4,
          board_height: 4,
          ruleset: "pow2",
          undo_enabled: false,
          rank_policy: "ranked",
          score: mismatch ? 300 : 256,
          best_tile: 32,
          duration_ms: 9000,
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
            lastScoreFromSnapshot: mismatch ? 296 : 256,
            undoUsedFromSnapshot: 0,
            scoreDelta: mismatch ? 4 : 0,
            isScoreAligned: !mismatch
          },
          adapter_parity_ab_diff_v2: {
            schemaVersion: 2,
            comparable: true,
            scoreDelta: mismatch ? 4 : 0,
            undoUsedDelta: 0,
            overEventsDelta: 0,
            undoEventsDelta: 0,
            wonEventsDelta: 0,
            isScoreMatch: !mismatch,
            bothScoreAligned: !mismatch
          }
        });
      }

      store.clearAll();
      save("mode_a", true);
      save("mode_a", true);
      save("mode_a", true);
      save("mode_a", false);
      save("mode_a", false);
      save("mode_b", true);
      save("mode_b", false);
      save("mode_b", false);
      save("mode_c", false);

      const summary = store.getAdapterParityBurnInSummary({
        sample_limit: "all",
        sustained_windows: "2",
        min_comparable: 1,
        max_mismatch_rate: 100
      });

      return {
        topMismatchModes: Array.isArray(summary?.topMismatchModes) ? summary.topMismatchModes : [],
        mismatch: Number(summary?.mismatch || 0),
        comparable: Number(summary?.comparable || 0)
      };
    });

    expect(snapshot.mismatch).toBe(4);
    expect(snapshot.comparable).toBe(9);
    expect(snapshot.topMismatchModes).toHaveLength(2);
    expect(snapshot.topMismatchModes[0]).toMatchObject({
      modeKey: "mode_a",
      mismatchCount: 3,
      comparableCount: 5
    });
    expect(snapshot.topMismatchModes[1]).toMatchObject({
      modeKey: "mode_b",
      mismatchCount: 1,
      comparableCount: 3
    });
  });

  test("history burn-in shows blocked state when mismatch rate exceeds gate", async ({ page }) => {
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
      for (let i = 0; i < 100; i++) {
        store.saveRecord({
          mode: "local",
          mode_key: i % 2 === 0 ? "mode_risky_a" : "mode_risky_b",
          board_width: 4,
          board_height: 4,
          ruleset: "pow2",
          undo_enabled: false,
          rank_policy: "ranked",
          score: 300 + i,
          best_tile: 32,
          duration_ms: 7000 + i,
          final_board: [
            [2, 4, 8, 16],
            [32, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ],
          ended_at: new Date(Date.now() - i * 1000).toISOString(),
          replay_string: "",
          adapter_parity_report_v2: {
            schemaVersion: 2,
            adapterMode: "core-adapter",
            lastScoreFromSnapshot: 296 + i,
            undoUsedFromSnapshot: 0,
            scoreDelta: 4,
            isScoreAligned: false
          },
          adapter_parity_ab_diff_v2: {
            schemaVersion: 2,
            comparable: true,
            scoreDelta: 4,
            undoUsedDelta: 0,
            overEventsDelta: 0,
            undoEventsDelta: 0,
            wonEventsDelta: 0,
            isScoreMatch: false,
            bothScoreAligned: false
          }
        });
      }
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    await page.selectOption("#history-burnin-window", "50");
    await page.selectOption("#history-sustained-window", "2");
    await page.click("#history-load-btn");
    await page.waitForTimeout(250);

    await expect(page.locator("#history-burnin-summary")).toContainText("单窗口: 未达标");
    await expect(page.locator("#history-burnin-summary")).toContainText("连续窗口: 连续未达标");
    await expect(page.locator("#history-burnin-summary")).toContainText("阻塞：存在不一致风险，暂不放量");
    await expect(page.locator("#history-burnin-summary")).toContainText("一致率 0.00%");
    await expect(page.locator("#history-burnin-summary")).toContainText("连续通过 0/2（达标率 0.00%）");
    await expect(page.locator("#history-burnin-summary")).toContainText("窗口趋势:");
    await expect(page.locator("#history-burnin-summary")).toContainText(
      "模式不一致 Top: mode_risky_a(25/25)，mode_risky_b(25/25)"
    );
  });
});

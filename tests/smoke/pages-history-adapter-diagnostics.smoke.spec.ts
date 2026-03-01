import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
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
        adapter_parity_report_v2: {
          schemaVersion: 2,
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 260,
          undoUsedFromSnapshot: 1,
          scoreDelta: 4,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v2: {
          schemaVersion: 2,
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
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: core-adapter");
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
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: core-adapter");
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

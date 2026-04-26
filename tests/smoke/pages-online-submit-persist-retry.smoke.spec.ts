import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("online score submit replays persisted pending payload after reload", async ({ page }) => {
    let scoreCalls = 0;
    const scoreBodies: Array<Record<string, unknown>> = [];

    await page.route("**/api/score", async (route) => {
      scoreCalls += 1;
      const body = route.request().postDataJSON() as Record<string, unknown>;
      scoreBodies.push(body);
      if (scoreCalls === 1) {
        await route.abort("failed");
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      if (!window.localStorage.getItem("__smoke_persist_score_seeded__")) {
        window.localStorage.removeItem("online_last_submit_signature_v1");
        window.localStorage.removeItem("online_pending_score_submit_v1");
        window.localStorage.setItem("__smoke_persist_score_seeded__", "1");
      }
      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 120;
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await page.waitForFunction(() => !!(window as any).game_manager && !!(window as any).OnlineLeaderboardRuntime);

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = Math.max(512, Number(manager.score || 0));
      manager.rankPolicy = "unranked";
      manager.serialize = () => "";
      manager.serializeV3 = () => null;
      window.dispatchEvent(new Event("online"));
    });

    await expect
      .poll(() => scoreCalls, { timeout: 4000 })
      .toBeGreaterThanOrEqual(1);

    const firstSnapshot = await page.evaluate(() => ({
      pending: String(window.localStorage.getItem("online_pending_score_submit_v1") || ""),
      last: String(window.localStorage.getItem("online_last_submit_signature_v1") || "")
    }));

    expect(firstSnapshot.pending.length).toBeGreaterThan(0);
    expect(firstSnapshot.last).toBe("");

    await page.evaluate(() => {
      const modeKey = "board_3x3_pow2_no_undo";
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("savedGameState") && key.includes(modeKey)) {
          window.localStorage.removeItem(key);
        }
      }
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).OnlineLeaderboardRuntime);

    await expect
      .poll(() => scoreCalls, { timeout: 6000 })
      .toBeGreaterThanOrEqual(2);

    const finalSnapshot = await page.evaluate(() => ({
      pending: String(window.localStorage.getItem("online_pending_score_submit_v1") || ""),
      last: String(window.localStorage.getItem("online_last_submit_signature_v1") || "")
    }));

    expect(finalSnapshot.pending).toBe("");
    expect(finalSnapshot.last.length).toBeGreaterThan(0);
    expect(scoreBodies).toHaveLength(2);
    expect(String(scoreBodies[0]?.mode_key || "")).toBe("standard_4x4_pow2_no_undo");
    expect(String(scoreBodies[1]?.mode_key || "")).toBe("standard_4x4_pow2_no_undo");
    expect(Number(scoreBodies[1]?.score || 0)).toBeGreaterThan(0);
  });

  test("online record submit replays persisted pending payload after reload", async ({ page }) => {
    let recordCalls = 0;
    const recordBodies: Array<Record<string, unknown>> = [];

    await page.route("**/api/records", async (route) => {
      recordCalls += 1;
      const body = route.request().postDataJSON() as Record<string, unknown>;
      recordBodies.push(body);
      if (recordCalls === 1) {
        await route.abort("failed");
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, id: "rec-smoke-persist-1" })
      });
    });

    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      if (!window.localStorage.getItem("__smoke_persist_record_seeded__")) {
        window.localStorage.removeItem("online_last_record_submit_signature_v1");
        window.localStorage.removeItem("online_pending_record_submit_signature_v1");
        window.localStorage.setItem("__smoke_persist_record_seeded__", "1");
      }
      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 120;
    });

    const response = await page.goto("/play.html?mode_key=board_3x3_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await page.waitForFunction(() => !!(window as any).game_manager && !!(window as any).OnlineLeaderboardRuntime);

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const trySuccessfulMove = (): boolean => {
        const startLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
        for (const direction of [0, 1, 2, 3]) {
          manager.move(direction);
          const nextLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
          if (nextLength > startLength) return true;
        }
        return false;
      };

      for (let i = 0; i < 4; i += 1) {
        if (manager.over) break;
        trySuccessfulMove();
      }

      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = Math.max(512, Number(manager.score || 0));
      window.dispatchEvent(new Event("online"));
    });

    await expect
      .poll(() => recordCalls, { timeout: 4000 })
      .toBeGreaterThanOrEqual(1);

    const firstSnapshot = await page.evaluate(() => ({
      pending: String(window.localStorage.getItem("online_pending_record_submit_signature_v1") || ""),
      last: String(window.localStorage.getItem("online_last_record_submit_signature_v1") || "")
    }));

    expect(firstSnapshot.pending.length).toBeGreaterThan(0);
    expect(firstSnapshot.last).toBe("");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).OnlineLeaderboardRuntime);

    await expect
      .poll(() => recordCalls, { timeout: 6000 })
      .toBeGreaterThanOrEqual(2);

    const finalSnapshot = await page.evaluate(() => ({
      pending: String(window.localStorage.getItem("online_pending_record_submit_signature_v1") || ""),
      last: String(window.localStorage.getItem("online_last_record_submit_signature_v1") || "")
    }));

    expect(finalSnapshot.pending).toBe("");
    expect(finalSnapshot.last.length).toBeGreaterThan(0);
    expect(recordBodies).toHaveLength(2);
    expect(String(recordBodies[0]?.mode_key || "")).toBe("board_3x3_pow2_no_undo");
    expect(String(recordBodies[1]?.mode_key || "")).toBe("board_3x3_pow2_no_undo");
    expect(String(recordBodies[0]?.replay_string || "").length).toBeGreaterThan(0);
    expect(String(recordBodies[1]?.replay_string || "")).toBe(String(recordBodies[0]?.replay_string || ""));
  });
});

import { expect, test, type Page } from "@playwright/test";

import { mockAcceptedBetaAccess } from "./support/beta-access";
import { installRankedSessionForMode } from "./support/ranked-session";

async function readLatestDurableRecord(page: Page) {
  return page.evaluate(async () => {
    const store = (window as any).LocalHistoryStore;
    const records = store && typeof store.getAllAsync === "function" ? await store.getAllAsync() : [];
    const record = Array.isArray(records) ? records[0] : null;
    return record ? {
      id: String(record.id || ""),
      clientRecordId: String(record.client_record_id || ""),
      nextRetryAt: String(record.next_retry_at || ""),
      serverRecordId: String(record.server_record_id || ""),
      syncStatus: String(record.sync_status || "")
    } : null;
  });
}

test.describe("Legacy Multi-Page Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await mockAcceptedBetaAccess(page);
  });

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
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!(window as any).OnlineLeaderboardRuntime && manager?.__onlineImmediateSubmitHooksBound === true;
    });

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

    await expect.poll(async () => {
      const snapshot = await page.evaluate(() => ({
        pending: String(window.localStorage.getItem("online_pending_score_submit_v1") || ""),
        last: String(window.localStorage.getItem("online_last_submit_signature_v1") || "")
      }));
      return snapshot.pending === "" && snapshot.last.length > 0;
    }, { timeout: 6000 }).toBe(true);

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

  test("online record submit replays the durable outbox record after reload", async ({ page }) => {
    await installRankedSessionForMode(page, "board_3x3_pow2_no_undo", {
      ownerUserId: "42",
      seed: 818,
      token: "persist-record-3x3-token"
    });

    let recordCalls = 0;
    let recordUploadsEnabled = false;
    const recordBodies: Array<Record<string, unknown>> = [];

    await page.route("**/api/records", async (route) => {
      recordCalls += 1;
      const body = route.request().postDataJSON() as Record<string, unknown>;
      recordBodies.push(body);
      if (!recordUploadsEnabled) {
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
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return (
        !!manager &&
        !!(window as any).OnlineLeaderboardRuntime &&
        typeof manager.tryAutoSubmitOnGameOver === "function"
      );
    });

    await page.evaluate(async () => {
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
      manager.sessionSubmitDone = false;
      manager.score = Math.max(512, Number(manager.score || 0));
      await manager.tryAutoSubmitOnGameOver();
    });

    await expect
      .poll(() => recordCalls, { timeout: 4000 })
      .toBeGreaterThanOrEqual(1);

    await expect.poll(async () => (await readLatestDurableRecord(page))?.syncStatus).toBe("retry_wait");
    const firstRecord = await readLatestDurableRecord(page);
    const clientRecordId = String(recordBodies[0]?.client_record_id || "");
    expect(firstRecord?.id).not.toBe("");
    expect(clientRecordId).not.toBe("");
    expect(firstRecord?.clientRecordId).toBe(clientRecordId);
    expect(firstRecord?.serverRecordId).toBe("");
    expect(await page.evaluate(() => window.localStorage.getItem("online_pending_record_submit_signature_v1"))).toBeNull();

    await page.evaluate(async (recordId) => {
      const store = (window as any).LocalHistoryStore;
      await store.updateRecordAsync(recordId, {
        next_retry_at: new Date(Date.now() - 1000).toISOString()
      });
    }, firstRecord?.id);
    await expect.poll(async () => {
      const record = await readLatestDurableRecord(page);
      const nextRetryAt = Date.parse(record?.nextRetryAt || "");
      return record?.syncStatus === "retry_wait" && Number.isFinite(nextRetryAt) && nextRetryAt <= Date.now();
    }).toBe(true);

    recordUploadsEnabled = true;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).OnlineLeaderboardRuntime);

    await expect
      .poll(() => recordCalls, { timeout: 6000 })
      .toBeGreaterThanOrEqual(2);

    await expect.poll(async () => (await readLatestDurableRecord(page))?.syncStatus).toBe("synced");
    expect((await readLatestDurableRecord(page))?.serverRecordId).toBe("rec-smoke-persist-1");
    expect(recordBodies.length).toBeGreaterThanOrEqual(2);
    expect(new Set(recordBodies.map((body) => String(body.client_record_id || "")))).toEqual(new Set([clientRecordId]));
    expect(recordBodies.every((body) => String(body.mode_key || "") === "board_3x3_pow2_no_undo")).toBe(true);
    const replayStrings = recordBodies.map((body) => String(body.replay_string || ""));
    expect(replayStrings.every(Boolean)).toBe(true);
    expect(new Set(replayStrings).size).toBe(1);
  });

  test("online record submit keeps the durable record waiting when auth was cleared before upload", async ({ page }) => {
    await installRankedSessionForMode(page, "board_3x3_pow2_no_undo", {
      ownerUserId: "42",
      seed: 919,
      token: "auth-cleared-3x3-token"
    });

    let recordCalls = 0;
    const recordBodies: Array<Record<string, unknown>> = [];

    await page.route("**/api/records", async (route) => {
      recordCalls += 1;
      recordBodies.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, id: "rec-smoke-auth-restored" })
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
      if (!window.localStorage.getItem("__smoke_auth_cleared_record_seeded__")) {
        window.localStorage.removeItem("online_last_record_submit_signature_v1");
        window.localStorage.removeItem("online_pending_record_submit_signature_v1");
        window.localStorage.setItem("__smoke_auth_cleared_record_seeded__", "1");
      }
      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 120;
    });

    const response = await page.goto("/play.html?mode_key=board_3x3_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return (
        !!manager &&
        !!(window as any).OnlineLeaderboardRuntime &&
        typeof manager.tryAutoSubmitOnGameOver === "function"
      );
    });

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.sessionSubmitDone = false;
      manager.score = Math.max(512, Number(manager.score || 0));
      window.localStorage.removeItem("2048_auth_token_v1");
      manager.tryAutoSubmitOnGameOver();
    });

    await expect.poll(async () => (await readLatestDurableRecord(page))?.syncStatus).toBe("waiting_auth");
    const waitingRecord = await readLatestDurableRecord(page);
    expect(waitingRecord).not.toBeNull();
    expect(waitingRecord?.clientRecordId).not.toBe("");
    expect(await page.evaluate(() => window.localStorage.getItem("online_pending_record_submit_signature_v1"))).toBeNull();
    expect(recordCalls).toBe(0);

    await page.evaluate(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token_restored");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).OnlineLeaderboardRuntime);

    await expect
      .poll(() => recordCalls, { timeout: 6000 })
      .toBeGreaterThanOrEqual(1);

    await expect.poll(async () => (await readLatestDurableRecord(page))?.syncStatus).toBe("synced");
    const syncedRecord = await readLatestDurableRecord(page);
    expect(syncedRecord?.clientRecordId).toBe(waitingRecord?.clientRecordId);
    expect(syncedRecord?.serverRecordId).toBe("rec-smoke-auth-restored");
    // Reload may race the old pagehide flush with the new document's startup retry.
    expect(recordBodies.length).toBeGreaterThanOrEqual(1);
    expect(new Set(recordBodies.map((body) => String(body.client_record_id || ""))).size).toBe(1);
    expect(recordBodies.every((body) => String(body.mode_key || "") === "board_3x3_pow2_no_undo")).toBe(true);
    const replayStrings = recordBodies.map((body) => String(body.replay_string || ""));
    expect(replayStrings.every(Boolean)).toBe(true);
    expect(new Set(replayStrings).size).toBe(1);
  });
});

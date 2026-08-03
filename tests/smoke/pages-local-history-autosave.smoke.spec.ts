import { expect, test } from "@playwright/test";
import { installRankedSessionForMode } from "./support/ranked-session";

test.describe("Legacy Multi-Page Smoke", () => {
  test("local history auto-save only persists on game over", async ({ page }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 603,
      token: "smoke-token-local-history"
    });
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem("local_game_history_v1");
        window.localStorage.removeItem("last_session_submit_result_v1");
      } catch (_err) {}
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      const store = (window as any).LocalHistoryStore;
      return (
        !!manager &&
        !!store &&
        typeof manager.tryAutoSubmitOnGameOver === "function" &&
        typeof store.getAllAsync === "function"
      );
    });

    const snapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      const store = (window as any).LocalHistoryStore;
      const recordsBefore = await store.getAllAsync();
      const listBefore = Array.isArray(recordsBefore) ? recordsBefore : [];
      const before = listBefore.length;

      manager.sessionSubmitDone = false;
      manager.replayMode = false;
      manager.over = false;
      manager.won = true;
      manager.keepPlaying = false;
      await Promise.resolve(manager.tryAutoSubmitOnGameOver());

      const recordsAfterWinStop = await store.getAllAsync();
      const afterWinStop = Array.isArray(recordsAfterWinStop) ? recordsAfterWinStop.length : 0;
      const submitResultRaw = window.localStorage.getItem("last_session_submit_result_v1");
      let submitReason = "";
      try {
        const submitResult = submitResultRaw ? JSON.parse(submitResultRaw) : null;
        submitReason =
          submitResult && typeof submitResult.reason === "string" ? submitResult.reason : "";
      } catch (_err) {}

      manager.sessionSubmitDone = false;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      await Promise.resolve(manager.tryAutoSubmitOnGameOver());

      const recordsAfterGameOver = await store.getAllAsync();
      const listAfterGameOver = Array.isArray(recordsAfterGameOver) ? recordsAfterGameOver : [];
      const afterGameOver = listAfterGameOver.length;
      const latest = listAfterGameOver[0] || null;

      return {
        before,
        afterWinStop,
        afterGameOver,
        submitReason,
        latestEndReason: latest && typeof latest.end_reason === "string" ? latest.end_reason : "",
        latestHasReplayString:
          !!(latest && typeof latest.replay_string === "string" && latest.replay_string.trim())
      };
    });

    expect(snapshot.before).toBe(0);
    expect(snapshot.afterWinStop).toBe(snapshot.before);
    expect(snapshot.submitReason).toBe("not_game_over");
    expect(snapshot.afterGameOver).toBe(snapshot.before + 1);
    expect(snapshot.latestEndReason).toBe("game_over");
    expect(snapshot.latestHasReplayString).toBe(true);
  });

  test("local history auto-save persists capped completion win-stop sessions", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem("local_game_history_v1");
        window.localStorage.removeItem("last_session_submit_result_v1");
      } catch (_err) {}
    });

    const response = await page.goto("/play.html?mode_key=capped_4x4_pow2_64_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      const store = (window as any).LocalHistoryStore;
      return (
        !!manager &&
        !!store &&
        typeof manager.actuate === "function" &&
        typeof store.getAllAsync === "function"
      );
    });

    const snapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      const store = (window as any).LocalHistoryStore;
      const recordsBefore = await store.getAllAsync();
      const before = Array.isArray(recordsBefore) ? recordsBefore.length : 0;

      manager.sessionSubmitDone = false;
      manager.replayMode = false;
      manager.over = false;
      manager.won = true;
      manager.keepPlaying = false;
      manager.score = Math.max(512, Number(manager.score || 0));

      if (typeof manager.serialize !== "function") {
        manager.serialize = () => '{"v":3,"actions":[0,1,2,3]}';
      }
      if (typeof manager.serializeV3 !== "function") {
        manager.serializeV3 = () => ({ v: 3, actions: [0, 1, 2, 3] });
      }

      manager.actuate();
      const localHistorySavePromise = manager.localHistorySaveInFlight?.promise;
      if (!localHistorySavePromise || typeof localHistorySavePromise.then !== "function") {
        throw new Error("Expected terminal local-history save to be in flight after actuate()");
      }
      await localHistorySavePromise;

      const recordsAfter = await store.getAllAsync();
      const listAfter = Array.isArray(recordsAfter) ? recordsAfter : [];
      const latest = listAfter[0] || null;
      const submitResultRaw = window.localStorage.getItem("last_session_submit_result_v1");
      let submitResult = null;
      try {
        submitResult = submitResultRaw ? JSON.parse(submitResultRaw) : null;
      } catch (_err) {}

      return {
        before,
        after: listAfter.length,
        latestEndReason: latest && typeof latest.end_reason === "string" ? latest.end_reason : "",
        latestModeKey: latest && typeof latest.mode_key === "string" ? latest.mode_key : "",
        submitOk: !!(submitResult && submitResult.ok === true)
      };
    });

    expect(snapshot.after).toBe(snapshot.before + 1);
    expect(snapshot.latestEndReason).toBe("win_stop");
    expect(snapshot.latestModeKey).toBe("capped_4x4_pow2_64_no_undo");
    expect(snapshot.submitOk).toBe(true);
  });
});

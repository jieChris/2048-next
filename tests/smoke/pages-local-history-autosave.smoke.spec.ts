import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("local history auto-save only persists on game over", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem("local_game_history_v1");
        window.localStorage.removeItem("last_session_submit_result_v1");
      } catch (_err) {}
    });

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      const store = (window as any).LocalHistoryStore;
      return (
        !!manager &&
        !!store &&
        typeof manager.tryAutoSubmitOnGameOver === "function" &&
        typeof manager.restart === "function" &&
        typeof store.getAll === "function"
      );
    });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const store = (window as any).LocalHistoryStore;
      const listBefore = Array.isArray(store.getAll()) ? store.getAll() : [];
      const before = listBefore.length;

      manager.sessionSubmitDone = false;
      manager.replayMode = false;
      manager.over = false;
      manager.won = true;
      manager.keepPlaying = false;
      manager.tryAutoSubmitOnGameOver();

      const afterWinStop = (Array.isArray(store.getAll()) ? store.getAll() : []).length;
      const submitResultRaw = window.localStorage.getItem("last_session_submit_result_v1");
      let submitReason = "";
      try {
        const submitResult = submitResultRaw ? JSON.parse(submitResultRaw) : null;
        submitReason =
          submitResult && typeof submitResult.reason === "string" ? submitResult.reason : "";
      } catch (_err) {}

      manager.restart();
      const afterRestart = (Array.isArray(store.getAll()) ? store.getAll() : []).length;

      manager.sessionSubmitDone = false;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.tryAutoSubmitOnGameOver();

      const listAfterGameOver = Array.isArray(store.getAll()) ? store.getAll() : [];
      const afterGameOver = listAfterGameOver.length;
      const latest = listAfterGameOver[0] || null;

      return {
        before,
        afterWinStop,
        afterRestart,
        afterGameOver,
        submitReason,
        latestEndReason: latest && typeof latest.end_reason === "string" ? latest.end_reason : "",
        latestHasReplayString:
          !!(latest && typeof latest.replay_string === "string" && latest.replay_string.trim())
      };
    });

    expect(snapshot.before).toBe(0);
    expect(snapshot.afterWinStop).toBe(snapshot.before);
    expect(snapshot.afterRestart).toBe(snapshot.before);
    expect(snapshot.submitReason).toBe("not_game_over");
    expect(snapshot.afterGameOver).toBe(snapshot.before + 1);
    expect(snapshot.latestEndReason).toBe("game_over");
    expect(snapshot.latestHasReplayString).toBe(true);
  });
});

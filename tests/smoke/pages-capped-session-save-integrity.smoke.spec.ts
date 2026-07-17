import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { waitForWindowCondition } from "./support/runtime-ready";

const MODE_KEY = "capped_4x4_pow2_1024_no_undo";
const PLAY_URL = `/play.html?mode_key=${MODE_KEY}`;
const ADVANCED_BOARD = [
  [1024, 1024, 0, 0],
  [512, 256, 128, 64],
  [32, 16, 8, 4],
  [2, 0, 0, 0],
];
const NEWER_BOARD = [
  [1024, 1024, 512, 256],
  [128, 64, 32, 16],
  [8, 4, 2, 0],
  [0, 0, 0, 0],
];

async function openCappedGame(
  context: BrowserContext,
  page?: Page,
): Promise<Page> {
  const target = page || (await context.newPage());
  const response = await target.goto(PLAY_URL, {
    waitUntil: "domcontentloaded",
  });
  expect(response, "Capped play response should exist").not.toBeNull();
  expect(response?.ok(), "Capped play response should be 2xx").toBeTruthy();
  await waitForWindowCondition(
    target,
    () => Boolean((window as any).game_manager),
    12_000,
  );
  return target;
}

test.describe("Capped ranked save integrity", () => {
  test("signed-out 1024 capped progress survives repeated page close and reopen", async ({
    context,
    page,
  }) => {
    await page.addInitScript((modeKey) => {
      window.localStorage.removeItem("2048_auth_token_v1");
      window.localStorage.removeItem("2048_auth_userId_v1");
      window.localStorage.removeItem("2048_auth_nickname_v1");
      window.localStorage.removeItem("ranked_session_active:v1:" + modeKey);
      window.localStorage.removeItem("ranked_session_prefetch:v1:" + modeKey);
      window.localStorage.removeItem("savedGameStateByMode:v1:" + modeKey);
      window.localStorage.removeItem("savedGameStateLiteByMode:v1:" + modeKey);
      window.localStorage.removeItem(
        "ranked_checkpoint_local_mirror:v1:" + modeKey,
      );
      window.name = "";
    }, MODE_KEY);

    let activePage = await openCappedGame(context, page);
    const expected = await activePage.evaluate(
      ({ board, modeKey }) => {
        const manager = (window as any).game_manager;
        manager.restartWithBoard(board, manager.modeConfig || null, {
          preserveMode: true,
          preserveSeed: true,
        });
        manager.setRuntimeScore(131_072);
        manager.moveHistory = [0, 1, 2, 3, 0, 1, 2, 3];
        manager.successfulMoveCount = manager.moveHistory.length;
        manager.hasGameStarted = true;
        manager.actuate();
        (window as any).saveGameState(manager, {
          force: true,
          forceFull: true,
        });
        const raw = window.localStorage.getItem(
          "savedGameStateByMode:v1:" + modeKey,
        );
        const saved = raw ? JSON.parse(raw) : null;
        return {
          board: manager.getFinalBoardMatrix(),
          score: Number(manager.score || 0),
          savedAt: Number(saved?.saved_at || 0),
        };
      },
      { board: ADVANCED_BOARD, modeKey: MODE_KEY },
    );

    expect(expected.board).toEqual(ADVANCED_BOARD);
    expect(expected.savedAt).toBeGreaterThan(0);

    for (let reopenIndex = 0; reopenIndex < 3; reopenIndex += 1) {
      await activePage.close();
      activePage = await context.newPage();
      await activePage.goto("/modes.html", { waitUntil: "domcontentloaded" });
      await activePage.evaluate((modeKey) => {
        window.localStorage.removeItem(
          "ranked_checkpoint_local_mirror:v1:" + modeKey,
        );
      }, MODE_KEY);
      activePage = await openCappedGame(context, activePage);
      const restored = await activePage.evaluate((modeKey) => {
        const manager = (window as any).game_manager;
        const raw = window.localStorage.getItem(
          "savedGameStateByMode:v1:" + modeKey,
        );
        const saved = raw ? JSON.parse(raw) : null;
        return {
          board: manager.getFinalBoardMatrix(),
          score: Number(manager.score || 0),
          savedAt: Number(saved?.saved_at || 0),
        };
      }, MODE_KEY);

      expect(restored.board).toEqual(expected.board);
      expect(restored.score).toBe(expected.score);
      expect(restored.savedAt).toBeGreaterThanOrEqual(expected.savedAt);
    }
  });

  test("a stale suspended page cannot overwrite newer capped progress", async ({
    context,
    page,
  }) => {
    await page.addInitScript((modeKey) => {
      window.localStorage.removeItem("2048_auth_token_v1");
      window.localStorage.removeItem("2048_auth_userId_v1");
      window.localStorage.removeItem("2048_auth_nickname_v1");
      window.localStorage.removeItem("ranked_session_active:v1:" + modeKey);
      window.localStorage.removeItem("ranked_session_prefetch:v1:" + modeKey);
      window.localStorage.removeItem("savedGameStateByMode:v1:" + modeKey);
      window.localStorage.removeItem("savedGameStateLiteByMode:v1:" + modeKey);
      window.localStorage.removeItem(
        "ranked_checkpoint_local_mirror:v1:" + modeKey,
      );
      window.name = "";
    }, MODE_KEY);

    const stalePage = await openCappedGame(context, page);
    const staleSavedAt = await stalePage.evaluate(
      ({ board, modeKey }) => {
        const manager = (window as any).game_manager;
        (window as any).setBoardFromMatrix(manager, board);
        manager.setRuntimeScore(65_536);
        manager.moveHistory = [0, 1, 2, 3];
        manager.successfulMoveCount = manager.moveHistory.length;
        manager.hasGameStarted = true;
        (window as any).saveGameState(manager, {
          force: true,
          forceFull: true,
        });
        const raw = window.localStorage.getItem(
          "savedGameStateByMode:v1:" + modeKey,
        );
        const saved = raw ? JSON.parse(raw) : null;
        const lockState = manager.singleModePageLockState;
        if (lockState && typeof lockState.pageHideHandler === "function") {
          lockState.pageHideHandler();
        }
        const releaseBrowserLock = (window as any)
          .__playSinglePageBrowserLockRelease;
        if (typeof releaseBrowserLock === "function") releaseBrowserLock();
        (window as any).__playSinglePageBrowserLockModeKey = undefined;
        (window as any).__playSinglePageBrowserLockRelease = null;
        return Number(saved?.saved_at || 0);
      },
      { board: ADVANCED_BOARD, modeKey: MODE_KEY },
    );

    const currentPage = await openCappedGame(context);
    const currentSnapshot = await currentPage.evaluate(
      ({ board, modeKey }) => {
        const manager = (window as any).game_manager;
        (window as any).setBoardFromMatrix(manager, board);
        manager.setRuntimeScore(262_144);
        manager.moveHistory = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
        manager.successfulMoveCount = manager.moveHistory.length;
        manager.hasGameStarted = true;
        (window as any).saveGameState(manager, {
          force: true,
          forceFull: true,
        });
        const raw = window.localStorage.getItem(
          "savedGameStateByMode:v1:" + modeKey,
        );
        const saved = raw ? JSON.parse(raw) : null;
        return {
          board: saved?.board,
          score: Number(saved?.score || 0),
          savedAt: Number(saved?.saved_at || 0),
        };
      },
      { board: NEWER_BOARD, modeKey: MODE_KEY },
    );

    expect(currentSnapshot.savedAt).toBeGreaterThan(staleSavedAt);
    await stalePage.evaluate(() => {
      const manager = (window as any).game_manager;
      const publishSync = (window as any).publishSavedStateSyncSnapshot;
      manager.lastSavedStateSyncPublishedAt = 0;
      if (typeof publishSync === "function") publishSync(manager);
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
    });

    const storedAfterStaleFlush = await currentPage.evaluate((modeKey) => {
      const raw = window.localStorage.getItem(
        "savedGameStateByMode:v1:" + modeKey,
      );
      return raw ? JSON.parse(raw) : null;
    }, MODE_KEY);

    expect(storedAfterStaleFlush?.board).toEqual(currentSnapshot.board);
    expect(Number(storedAfterStaleFlush?.score || 0)).toBe(
      currentSnapshot.score,
    );
    expect(Number(storedAfterStaleFlush?.saved_at || 0)).toBeGreaterThanOrEqual(
      currentSnapshot.savedAt,
    );
  });
});

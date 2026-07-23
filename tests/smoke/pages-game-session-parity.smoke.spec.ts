import { expect, test } from "@playwright/test";

import golden from "../fixtures/game-session-golden-v1.json" with { type: "json" };
import { installRankedSessionForMode } from "./support/ranked-session";

const ROUTE_BY_MODE: Record<string, string> = {
  standard_4x4_pow2_no_undo: "/2048.html",
  classic_4x4_pow2_undo: "/play.html?mode_key=classic_4x4_pow2_undo",
  board_3x3_pow2_no_undo: "/play.html?mode_key=board_3x3_pow2_no_undo"
};

for (const vector of golden.vectors) {
  test(`Web shared mode consumes frozen Game Session transitions: ${vector.id}`, async ({ page }) => {
    const compatFailures: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes("[game-session-compat] shared move failed")) {
        compatFailures.push(message.text());
      }
    });
    await installRankedSessionForMode(page, vector.mode_key, {
      seed: vector.seed,
      token: `golden-${vector.id}`,
      challengeId: `golden-${vector.id}`,
      clearSavedState: true,
      resetStorage: true
    });

    const response = await page.goto(ROUTE_BY_MODE[vector.mode_key], {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return Boolean(
        manager &&
          manager.grid &&
          typeof manager.move === "function" &&
          manager.rankedSetupBlockedUntilSessionReady !== true &&
          (window as any).CoreGameSessionRuntime
      );
    }, null, { timeout: 15_000 });

    const actual = await page.evaluate((actions) => {
      const manager = (window as any).game_manager;
      const readBoard = () => {
        const board: number[][] = [];
        for (let y = 0; y < manager.height; y += 1) {
          const row: number[] = [];
          for (let x = 0; x < manager.width; x += 1) {
            row.push(Number(manager.grid.cells?.[x]?.[y]?.value || 0));
          }
          board.push(row);
        }
        return board;
      };
      const initialBoard = readBoard();
      const results: Array<Record<string, unknown>> = [];
      for (const action of actions) {
        if (action.kind === "undo") {
          manager.move(-1);
          results.push({
            kind: "undo",
            board: readBoard(),
            score: Number(manager.score || 0),
            steps: Number(manager.successfulMoveCount || 0),
            undoUsed: Number(manager.undoUsed || 0),
            sharedMoveCount: Number(manager.__sharedGameSessionMoveCount || 0)
          });
          continue;
        }
        const beforeSharedCount = Number(manager.__sharedGameSessionMoveCount || 0);
        manager.move(action.direction);
        const transition = manager.__sharedGameSessionLastTransition || null;
        results.push({
          kind: "move",
          board: readBoard(),
          score: Number(manager.score || 0),
          steps: Number(manager.successfulMoveCount || 0),
          undoUsed: Number(manager.undoUsed || 0),
          sharedMoveCount: Number(manager.__sharedGameSessionMoveCount || 0),
          sharedCountDelta: Number(manager.__sharedGameSessionMoveCount || 0) - beforeSharedCount,
          moved: transition ? transition.moved === true : null,
          spawn: transition && transition.spawn
            ? {
                x: transition.spawn.x,
                y: transition.spawn.y,
                value: transition.spawn.value,
                rngStep: transition.spawn.rngStep
              }
            : null
        });
      }
      return {
        initialBoard,
        results,
        finalBoard: readBoard(),
        score: Number(manager.score || 0),
        steps: Number(manager.successfulMoveCount || 0),
        undoUsed: Number(manager.undoUsed || 0),
        sharedMoveCount: Number(manager.__sharedGameSessionMoveCount || 0)
      };
    }, vector.actions);

    expect(actual.initialBoard).toEqual(vector.expected.initial_board);
    for (let index = 0; index < vector.actions.length; index += 1) {
      const action = vector.actions[index];
      const expectedStep = vector.expected.step_results[index];
      const result = actual.results[index];
      if (action.kind === "undo") {
        expect(result.undoUsed).toBe(1);
        continue;
      }
      expect(result.sharedCountDelta).toBe(1);
      expect(result.moved).toBe(expectedStep.moved);
      expect(result.spawn).toEqual(
        expectedStep.spawn === null
          ? null
          : { ...expectedStep.spawn, rngStep: expectedStep.rng_step }
      );
    }
    expect(actual.finalBoard).toEqual(vector.expected.final_board);
    expect(actual.score).toBe(vector.expected.score);
    expect(actual.steps).toBe(vector.expected.steps);
    expect(actual.undoUsed).toBe(vector.expected.undo_used);
    expect(compatFailures).toEqual([]);
  });
}

test("Web classic mode records both exact-board high-tile spawns through RPL1 ext8", async ({
  page
}) => {
  const compatFailures: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("[game-session-compat] shared move failed")) {
      compatFailures.push(message.text());
    }
  });
  await installRankedSessionForMode(page, "classic_4x4_pow2_undo", {
    seed: 146,
    token: "golden-classic-high-spawn",
    clearSavedState: true,
    resetStorage: true
  });
  await page.goto("/play.html?mode_key=classic_4x4_pow2_undo", {
    waitUntil: "domcontentloaded"
  });
  await page.waitForFunction(() => {
    const manager = (window as any).game_manager;
    return Boolean(
      manager &&
        typeof manager.restartWithBoard === "function" &&
        typeof manager.move === "function" &&
        (window as any).CoreGameSessionRuntime
    );
  });

  const results = await page.evaluate(() => {
    const manager = (window as any).game_manager;
    const cases = [
      {
        expected: 8,
        board: [
          [131072, 65536, 32768, 16384],
          [8192, 4096, 2048, 1024],
          [512, 256, 128, 64],
          [32, 16, 8, 0]
        ]
      },
      {
        expected: 16,
        board: [
          [262144, 131072, 65536, 32768],
          [16384, 8192, 4096, 2048],
          [1024, 512, 256, 128],
          [64, 32, 16, 0]
        ]
      }
    ];

    const installBoard = (board: number[][]) => {
      const GridCtor = (window as any).Grid;
      const TileCtor = (window as any).Tile;
      const grid = new GridCtor(manager.width, manager.height);
      for (let y = 0; y < board.length; y += 1) {
        for (let x = 0; x < board[y].length; x += 1) {
          if (board[y][x] > 0) grid.insertTile(new TileCtor({ x, y }, board[y][x]));
        }
      }
      manager.grid = grid;
      manager.initialBoardMatrix = board.map((row) => row.slice());
      manager.replayStartBoardMatrix = board.map((row) => row.slice());
    };

    return cases.map((testCase) => {
      installBoard(testCase.board);
      manager.replayMode = false;
      manager.over = false;
      manager.won = false;
      manager.keepPlaying = false;
      manager.moveHistory = [];
      manager.successfulMoveCount = 0;
      if (manager.sessionReplayV1) {
        manager.sessionReplayV1.records = [];
        manager.sessionReplayV1.supported = true;
        manager.sessionReplayV1.last_event_at_ms = Date.now();
      }
      manager.move(1);
      const records = Array.isArray(manager.sessionReplayV1?.records)
        ? manager.sessionReplayV1.records.slice(-2)
        : [];
      return {
        expected: testCase.expected,
        spawn: manager.__sharedGameSessionLastTransition?.spawn?.value ?? null,
        extType: records[0]?.extType ?? null,
        extPayload: records[0]?.payload ? Array.from(records[0].payload) : null,
        moveBit: records[1]?.spawnValueBit ?? null
      };
    });
  });

  expect(results).toEqual([
    { expected: 8, spawn: 8, extType: 8, extPayload: [8], moveBit: 0 },
    { expected: 16, spawn: 16, extType: 8, extPayload: [16], moveBit: 0 }
  ]);
  expect(compatFailures).toEqual([]);
});

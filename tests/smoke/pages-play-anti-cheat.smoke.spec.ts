import { expect, test } from "@playwright/test";

import { installRankedSessionForMode } from "./support/ranked-session";
import { waitForWindowCondition } from "./support/runtime-ready";

test.describe("Play Anti-Cheat Smoke", () => {
  test("no-undo modes do not allow console-forced undo after runtime flag tampering", async ({
    page
  }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      seed: 717,
      token: "anti-cheat-standard-token"
    });

    const response = await page.goto("/play.html?mode=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const moves = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3];
      for (const direction of moves) {
        manager.move(direction);
        if (Number(manager.successfulMoveCount || 0) >= 3) break;
      }

      const readBoard = () =>
        typeof manager.getFinalBoardMatrix === "function"
          ? manager.getFinalBoardMatrix()
          : manager.grid.cells.map((column: Array<{ value: number } | null>) =>
              column.map((cell) => (cell ? cell.value : 0))
            );
      const capture = () => ({
        score: Number(manager.score || 0),
        undoUsed: Number(manager.undoUsed || 0),
        undoStack: Array.isArray(manager.undoStack) ? manager.undoStack.length : -1,
        successfulMoveCount: Number(manager.successfulMoveCount || 0),
        board: readBoard()
      });

      const before = capture();
      manager.modeConfig = Object.assign({}, manager.modeConfig, { undo_enabled: true });
      manager.undoEnabled = true;
      manager.isUndoInteractionEnabled = () => true;
      manager.move(-1);
      const after = capture();

      return {
        before,
        after,
        boardChanged: JSON.stringify(before.board) !== JSON.stringify(after.board),
        scoreChanged: before.score !== after.score
      };
    });

    expect(snapshot.before.successfulMoveCount).toBeGreaterThan(0);
    expect(snapshot.before.undoStack).toBe(0);
    expect(snapshot.after.undoStack).toBe(0);
    expect(snapshot.after.undoUsed).toBe(snapshot.before.undoUsed);
    expect(snapshot.boardChanged).toBe(false);
    expect(snapshot.scoreChanged).toBe(false);
  });
});

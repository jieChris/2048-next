import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("practice board supports Y to redo the last undo", async ({ page }) => {
    const response = await page.goto("/Practice_board.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => Boolean((window as any).game_manager) && Boolean((window as any).Tile));

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const TileCtor = (window as any).Tile;
      if (!manager || !TileCtor || !manager.grid || typeof manager.grid.build !== "function") return;
      manager.grid.build();
      manager.grid.insertTile(new TileCtor({ x: 0, y: 0 }, 2));
      manager.grid.insertTile(new TileCtor({ x: 1, y: 0 }, 4));
      manager.score = 0;
      manager.over = false;
      manager.won = false;
      manager.keepPlaying = false;
      manager.undoUsed = 0;
      manager.undoStack = [];
      manager.redoStack = [];
      manager.actuate();
    });

    const readBoard = async () =>
      page.evaluate(() => {
        const manager = (window as any).game_manager;
        if (!manager || !manager.grid || !manager.grid.cells) return null;
        const width = Number(manager.width) || 4;
        const height = Number(manager.height) || width;
        const rows: number[][] = [];
        for (let y = 0; y < height; y += 1) {
          const row: number[] = [];
          for (let x = 0; x < width; x += 1) {
            const tile = manager.grid.cells[x] ? manager.grid.cells[x][y] : null;
            row.push(tile ? Number(tile.value) || 0 : 0);
          }
          rows.push(row);
        }
        return {
          board: rows,
          undoLen: Array.isArray(manager.undoStack) ? manager.undoStack.length : -1,
          redoLen: Array.isArray(manager.redoStack) ? manager.redoStack.length : -1
        };
      });

    const readTopStackMotionCount = async (stackName: "undoStack" | "redoStack") =>
      page.evaluate((targetStackName) => {
        const manager = (window as any).game_manager;
        if (!manager) return -1;
        const stack = Array.isArray(manager[targetStackName]) ? manager[targetStackName] : [];
        const top = stack.length > 0 ? stack[stack.length - 1] : null;
        const tiles = top && Array.isArray(top.tiles) ? top.tiles : [];
        let motionCount = 0;
        for (let i = 0; i < tiles.length; i += 1) {
          const tile = tiles[i];
          if (!tile || typeof tile !== "object") continue;
          const x = Number(tile.x);
          const y = Number(tile.y);
          const px = tile.previousPosition ? Number(tile.previousPosition.x) : Number.NaN;
          const py = tile.previousPosition ? Number(tile.previousPosition.y) : Number.NaN;
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(px) || !Number.isFinite(py)) continue;
          if (x !== px || y !== py) motionCount += 1;
        }
        return motionCount;
      }, stackName);

    const beforeMove = await readBoard();
    expect(beforeMove).not.toBeNull();

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    const afterMove = await readBoard();
    expect(afterMove).not.toBeNull();
    expect(afterMove?.undoLen).toBeGreaterThan(0);
    const undoMotionAfterMove = await readTopStackMotionCount("undoStack");
    expect(undoMotionAfterMove).toBeGreaterThan(0);

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (manager && typeof manager.move === "function") manager.move(-1);
    });
    await page.waitForTimeout(150);
    const afterUndo = await readBoard();
    expect(afterUndo).not.toBeNull();
    expect(afterUndo?.redoLen).toBeGreaterThan(0);
    expect(afterUndo?.board).toEqual(beforeMove?.board);
    const redoMotionAfterUndo = await readTopStackMotionCount("redoStack");
    expect(redoMotionAfterUndo).toBeGreaterThan(0);

    await page.keyboard.press("Shift+Y");
    await page.waitForTimeout(150);
    const afterRedo = await readBoard();
    expect(afterRedo).not.toBeNull();
    expect(afterRedo?.board).toEqual(afterMove?.board);
    const undoMotionAfterRedo = await readTopStackMotionCount("undoStack");
    expect(undoMotionAfterRedo).toBeGreaterThan(0);

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (manager && typeof manager.move === "function") manager.move(-1);
    });
    await page.waitForTimeout(150);
    const afterUndoAgain = await readBoard();
    expect(afterUndoAgain).not.toBeNull();
    expect(afterUndoAgain?.board).toEqual(beforeMove?.board);
    const redoMotionAfterUndoAgain = await readTopStackMotionCount("redoStack");
    expect(redoMotionAfterUndoAgain).toBeGreaterThan(0);
  });
});

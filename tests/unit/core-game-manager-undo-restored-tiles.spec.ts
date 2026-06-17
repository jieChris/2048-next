import { describe, expect, it, vi } from "vitest";

import {
  applyUndoRestoredTiles,
  createGameManagerUndoRestoredTilesRuntime,
  installGameManagerUndoRestoredTilesRuntime,
  type GameManagerUndoRestoredTilesRuntime
} from "../../src/core/game-manager-undo-restored-tiles";

function createManager() {
  return {
    grid: {
      cells: [
        [null, null],
        [null, null]
      ],
      build: vi.fn()
    },
    width: 2,
    height: 2,
    isStoneValue: vi.fn((value: unknown) => value === 8),
    score: 0
  };
}

describe("core game manager undo restored tiles", () => {
  it("rebuilds the grid, restores score, and writes valid restored tiles", () => {
    const manager = createManager();
    const setRuntimeScoreForUndo = vi.fn((target: typeof manager, value: unknown) => {
      target.score = Number(value);
    });
    const writeRuntimeGridCellForUndo = vi.fn(
      (
        target: typeof manager,
        x: number,
        y: number,
        tile: { x: number; y: number; value: number }
      ) => {
        target.grid.cells[x][y] = tile;
        return true;
      }
    );

    applyUndoRestoredTiles(
      manager,
      {
        score: 32,
        tiles: [
          { x: 1, y: 0, value: 8, previousPosition: { x: 0, y: 0 } },
          { x: 2, y: 0, value: 4, previousPosition: { x: 1, y: 0 } },
          { x: "bad", y: 1, value: 2, previousPosition: { x: 0, y: 1 } }
        ]
      },
      {
        createUndoRestoreTile: (_target, snapshot) => snapshot,
        createTile: (position, value) => ({
          x: position.x,
          y: position.y,
          value,
          previousPosition: null as unknown,
          isStone: false
        }),
        setRuntimeScoreForUndo,
        writeRuntimeGridCellForUndo
      }
    );

    expect(manager.grid.build).toHaveBeenCalledTimes(1);
    expect(setRuntimeScoreForUndo).toHaveBeenCalledWith(manager, 32);
    expect(writeRuntimeGridCellForUndo).toHaveBeenCalledTimes(1);
    const restoredTile = manager.grid.cells[1][0] as {
      x: number;
      y: number;
      value: number;
      previousPosition: unknown;
      isStone: boolean;
    };
    expect(restoredTile).toMatchObject({
      x: 1,
      y: 0,
      value: 8,
      previousPosition: { x: 0, y: 0 },
      isStone: true
    });
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerUndoRestoredTilesRuntime();
    expect(runtime.applyUndoRestoredTiles).toBe(applyUndoRestoredTiles);

    const windowLike: {
      CoreGameManagerUndoRestoredTilesRuntime?: GameManagerUndoRestoredTilesRuntime;
    } = {};
    expect(installGameManagerUndoRestoredTilesRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerUndoRestoredTilesRuntime
    );
    expect(windowLike.CoreGameManagerUndoRestoredTilesRuntime?.applyUndoRestoredTiles).toBe(
      applyUndoRestoredTiles
    );

    const existing = { applyUndoRestoredTiles: vi.fn() };
    expect(
      installGameManagerUndoRestoredTilesRuntime({
        windowLike: { CoreGameManagerUndoRestoredTilesRuntime: existing }
      })
    ).toBe(existing);
  });
});

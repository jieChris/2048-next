import { describe, expect, it } from "vitest";

import { buildBoardMatrix, getAvailableCells, getBestTileValue } from "../../src/core/grid-scan";

describe("core grid scan: getAvailableCells", () => {
  it("collects available cells in x-major order", () => {
    const occupied = new Set(["0:0", "1:2"]);
    const cells = getAvailableCells(
      3,
      3,
      () => false,
      (cell) => !occupied.has(`${cell.x}:${cell.y}`)
    );

    expect(cells).toEqual([
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 }
    ]);
  });

  it("filters blocked cells before availability checks", () => {
    const blocked = new Set(["0:1", "2:0"]);
    let availabilityCalls = 0;
    const cells = getAvailableCells(
      3,
      2,
      (x, y) => blocked.has(`${x}:${y}`),
      () => {
        availabilityCalls += 1;
        return true;
      }
    );

    expect(cells).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ]);
    expect(availabilityCalls).toBe(4);
  });

  it("returns empty list for invalid dimensions", () => {
    expect(getAvailableCells(0, 4, () => false, () => true)).toEqual([]);
    expect(getAvailableCells(4, -1, () => false, () => true)).toEqual([]);
  });
});

describe("core grid scan: buildBoardMatrix", () => {
  it("builds board rows in y-major order", () => {
    const board = buildBoardMatrix(3, 2, (x, y) => x + y * 10);
    expect(board).toEqual([
      [0, 1, 2],
      [10, 11, 12]
    ]);
  });

  it("sanitizes invalid cell values and invalid sizes", () => {
    const board = buildBoardMatrix(2, 2, (x, y) => (x === 1 && y === 0 ? Number.NaN : 4));
    expect(board).toEqual([
      [4, 0],
      [4, 4]
    ]);
    expect(buildBoardMatrix(0, 2, () => 1)).toEqual([]);
  });
});

describe("core grid scan: getBestTileValue", () => {
  it("returns the best numeric value from matrix", () => {
    expect(getBestTileValue([[2, 4], [16, 8]])).toBe(16);
    expect(getBestTileValue([[2, Number.NaN], [0, 8]])).toBe(8);
  });

  it("returns zero for invalid matrix", () => {
    expect(getBestTileValue(null)).toBe(0);
    expect(getBestTileValue([["x"], [null]])).toBe(0);
  });
});

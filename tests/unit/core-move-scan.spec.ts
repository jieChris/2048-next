import { describe, expect, it } from "vitest";

import { movesAvailable, tileMatchesAvailable } from "../../src/core/move-scan";

describe("core move scan: tileMatchesAvailable", () => {
  it("returns true when a mergeable neighbor exists", () => {
    const board = new Map<string, number>([
      ["0:0", 2],
      ["1:0", 2]
    ]);
    const hasMatch = tileMatchesAvailable(
      4,
      4,
      () => false,
      (cell) => board.get(`${cell.x}:${cell.y}`) ?? null,
      (a, b) => a === b
    );
    expect(hasMatch).toBe(true);
  });

  it("returns false when no mergeable neighbor exists", () => {
    const board = new Map<string, number>([
      ["0:0", 2],
      ["1:0", 4],
      ["0:1", 8]
    ]);
    const hasMatch = tileMatchesAvailable(
      4,
      4,
      () => false,
      (cell) => board.get(`${cell.x}:${cell.y}`) ?? null,
      (a, b) => a === b
    );
    expect(hasMatch).toBe(false);
  });

  it("skips blocked neighbors", () => {
    const board = new Map<string, number>([
      ["0:0", 2],
      ["1:0", 2]
    ]);
    const blocked = new Set(["1:0"]);
    const hasMatch = tileMatchesAvailable(
      4,
      4,
      (x, y) => blocked.has(`${x}:${y}`),
      (cell) => board.get(`${cell.x}:${cell.y}`) ?? null,
      (a, b) => a === b
    );
    expect(hasMatch).toBe(false);
  });
});

describe("core move scan: movesAvailable", () => {
  it("returns true if there are empty cells", () => {
    expect(movesAvailable(1, false)).toBe(true);
  });

  it("returns true if no empty cells but merge exists", () => {
    expect(movesAvailable(0, true)).toBe(true);
  });

  it("returns false when no empty cells and no merge", () => {
    expect(movesAvailable(0, false)).toBe(false);
  });
});

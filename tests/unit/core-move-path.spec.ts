import { describe, expect, it } from "vitest";

import {
  buildTraversals,
  findFarthestPosition,
  getVector,
  positionsEqual
} from "../../src/core/move-path";

describe("core move path: getVector", () => {
  it("returns vectors for valid directions", () => {
    expect(getVector(0)).toEqual({ x: 0, y: -1 });
    expect(getVector(1)).toEqual({ x: 1, y: 0 });
    expect(getVector(2)).toEqual({ x: 0, y: 1 });
    expect(getVector(3)).toEqual({ x: -1, y: 0 });
  });

  it("returns undefined for invalid directions", () => {
    expect(getVector(-1)).toBeUndefined();
    expect(getVector(4)).toBeUndefined();
    expect(getVector(Number.NaN)).toBeUndefined();
  });
});

describe("core move path: positionsEqual", () => {
  it("compares two cell positions", () => {
    expect(positionsEqual({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(true);
    expect(positionsEqual({ x: 2, y: 3 }, { x: 3, y: 2 })).toBe(false);
  });
});

describe("core move path: buildTraversals", () => {
  it("reverses x traversal when moving right", () => {
    const traversals = buildTraversals(4, 3, { x: 1, y: 0 });
    expect(traversals).toEqual({
      x: [3, 2, 1, 0],
      y: [0, 1, 2]
    });
  });

  it("reverses y traversal when moving down", () => {
    const traversals = buildTraversals(3, 4, { x: 0, y: 1 });
    expect(traversals).toEqual({
      x: [0, 1, 2],
      y: [3, 2, 1, 0]
    });
  });

  it("returns empty traversals for invalid board size", () => {
    expect(buildTraversals(0, 4, { x: 1, y: 0 })).toEqual({ x: [], y: [] });
    expect(buildTraversals(4, -1, { x: 0, y: 1 })).toEqual({ x: [], y: [] });
  });
});

describe("core move path: findFarthestPosition", () => {
  it("moves until boundary when cells are available", () => {
    const pos = findFarthestPosition(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      4,
      4,
      () => false,
      () => true
    );
    expect(pos).toEqual({
      farthest: { x: 3, y: 0 },
      next: { x: 4, y: 0 }
    });
  });

  it("stops before blocked cells", () => {
    const blocked = new Set(["2:0"]);
    const pos = findFarthestPosition(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      4,
      4,
      (x, y) => blocked.has(`${x}:${y}`),
      () => true
    );
    expect(pos).toEqual({
      farthest: { x: 1, y: 0 },
      next: { x: 2, y: 0 }
    });
  });

  it("stops before occupied cells", () => {
    const occupied = new Set(["2:0"]);
    const pos = findFarthestPosition(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      4,
      4,
      () => false,
      (cell) => !occupied.has(`${cell.x}:${cell.y}`)
    );
    expect(pos).toEqual({
      farthest: { x: 1, y: 0 },
      next: { x: 2, y: 0 }
    });
  });
});

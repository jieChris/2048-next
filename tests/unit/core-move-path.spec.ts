import { describe, expect, it } from "vitest";

import { buildTraversals, findFarthestPosition } from "../../src/core/move-path";

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

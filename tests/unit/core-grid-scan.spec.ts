import { describe, expect, it } from "vitest";

import { getAvailableCells } from "../../src/core/grid-scan";

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

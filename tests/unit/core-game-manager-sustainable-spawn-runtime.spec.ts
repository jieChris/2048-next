import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type Cell = { x: number; y: number };

function createPow2Board(width: number, height: number, empty: Cell, firstExponent = 1): number[][] {
  let exponent = firstExponent;
  return Array.from({ length: height }, (_row, y) =>
    Array.from({ length: width }, (_cell, x) => {
      if (x === empty.x && y === empty.y) return 0;
      const value = 2 ** exponent;
      exponent += 1;
      return value;
    })
  );
}

function boardFromValues(width: number, height: number, values: number[]): number[][] {
  return Array.from({ length: height }, (_row, y) =>
    Array.from({ length: width }, (_cell, x) => values[y * width + x] || 0)
  );
}

function fibonacciAt(rank: number): number {
  let previous = 1;
  let current = 2;
  for (let currentRank = 3; currentRank <= rank; currentRank += 1) {
    [previous, current] = [current, previous + current];
  }
  return rank <= 1 ? 1 : current;
}

function loadRuntime() {
  let randomRoll = 0;
  class Tile {
    x: number;
    y: number;
    value: number;

    constructor(cell: Cell, value: number) {
      this.x = cell.x;
      this.y = cell.y;
      this.value = value;
    }
  }

  const context = {
    console,
    BigInt,
    Math,
    Number,
    String,
    Array,
    Object,
    Tile,
    CoreCryptoRandomRuntime: {
      randomUnitFloat: () => randomRoll,
      randomInt: () => 0
    },
    getAvailableCells: vi.fn(),
    pickSpawnValue: vi.fn(() => 2),
    recordSpawnValue: vi.fn()
  } as Record<string, unknown>;
  vm.runInNewContext(
    readFileSync(
      path.resolve(process.cwd(), "js/core_game_manager_move_input_helpers_runtime.js"),
      "utf8"
    ),
    context
  );
  return {
    runtime: context as Record<string, (...args: any[]) => any>,
    setRandomRoll(value: number) {
      randomRoll = value;
    }
  };
}

function createManager(board: number[][], options: Record<string, unknown> = {}) {
  const height = board.length;
  const width = board[0].length;
  const grid = {
    eachCell(callback: (x: number, y: number, tile: { value: number } | null) => void) {
      for (let x = 0; x < width; x += 1) {
        for (let y = 0; y < height; y += 1) {
          callback(x, y, board[y][x] ? { value: board[y][x] } : null);
        }
      }
    },
    cellContent(cell: Cell) {
      const value = board[cell.y]?.[cell.x] || 0;
      return value ? { value } : null;
    },
    cellsAvailable() {
      return board.some((row) => row.includes(0));
    },
    randomAvailableCell() {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) if (board[y][x] === 0) return { x, y };
      }
      return null;
    },
    insertTile(tile: { x: number; y: number; value: number }) {
      board[tile.y][tile.x] = tile.value;
    }
  };
  return {
    width,
    height,
    ruleset: "pow2",
    replayMode: false,
    undoEnabled: true,
    modeConfig: { undo_enabled: true },
    spawnTable: [
      { value: 2, weight: 90 },
      { value: 4, weight: 10 }
    ],
    spawnValueCounts: {},
    moveHistory: [],
    grid,
    isBlockedCell: () => false,
    isFibonacciMode: () => false,
    ...options
  };
}

function createFibonacciManager(board: number[][], options: Record<string, unknown> = {}) {
  return createManager(board, {
    ruleset: "fibonacci",
    spawnTable: [
      { value: 1, weight: 90 },
      { value: 2, weight: 10 }
    ],
    isFibonacciMode: () => true,
    ...options
  });
}

function compactTable(table: Array<{ value: number; weight: number }>) {
  return table.map(({ value, weight }) => ({ value, weight }));
}

describe("sustainable undo spawn", () => {
  it.each([
    { width: 3, height: 3 },
    { width: 4, height: 4 },
    { width: 5, height: 5 }
  ])("uses the pow2 N - 1 threshold and global minimum on $width x $height", ({ width, height }) => {
    const { runtime } = loadRuntime();
    const empty = { x: width - 1, y: height - 1 };
    const board = createPow2Board(width, height, empty);

    expect(runtime.resolveSustainableUndoSpawnValue(createManager(board), empty)).toBe(2);
  });

  it("uses the non-adjacent pow2 global minimum", () => {
    const { runtime } = loadRuntime();
    const board = [
      [2, 4, 8],
      [16, 0, 32],
      [64, 128, 256]
    ];

    expect(runtime.resolveSustainableUndoSpawnValue(createManager(board), { x: 1, y: 1 })).toBe(2);
  });

  it.each([
    { name: "below threshold", board: [[2, 2, 8], [16, 32, 64], [128, 256, 0]], options: {} },
    { name: "no undo", board: createPow2Board(3, 3, { x: 2, y: 2 }), options: { modeConfig: { undo_enabled: false }, undoEnabled: false } },
    { name: "custom distribution", board: createPow2Board(3, 3, { x: 2, y: 2 }), options: { spawnTable: [{ value: 2, weight: 80 }, { value: 4, weight: 20 }] } },
    { name: "replay", board: createPow2Board(3, 3, { x: 2, y: 2 }), options: { replayMode: true } }
  ])("keeps normal pow2 spawning for $name", ({ board, options }) => {
    const { runtime } = loadRuntime();
    expect(
      runtime.resolveSustainableUndoSpawnValue(createManager(board, options), { x: 2, y: 2 })
    ).toBeNull();
  });

  it.each([
    { unlocked: {}, values: [5, 13, 34, 0], expected: 3 },
    { unlocked: { "3": 1 }, values: [8, 21, 55, 0], expected: 5 },
    { unlocked: { "3": 1, "5": 1 }, values: [13, 34, 89, 0], expected: 8 }
  ])("forces the next Fibonacci rank only at the exact frontier", ({ unlocked, values, expected }) => {
    const { runtime } = loadRuntime();
    const board = boardFromValues(2, 2, values);
    const manager = createFibonacciManager(board, { spawnValueCounts: unlocked });

    expect(runtime.resolveSustainableUndoSpawnValue(manager, { x: 1, y: 1 })).toBe(expected);
  });

  it("recognizes the initial 4x4 Fibonacci frontier through F32", () => {
    const { runtime } = loadRuntime();
    const values = Array.from({ length: 15 }, (_value, index) => fibonacciAt(4 + index * 2));
    const board = boardFromValues(4, 4, [...values, 0]);

    expect(
      runtime.resolveSustainableUndoSpawnValue(createFibonacciManager(board), { x: 3, y: 3 })
    ).toBe(3);
  });

  it.each([
    { name: "reversible 5,5,5 branch", values: [5, 5, 5, 0], counts: {} },
    { name: "almost-frontier", values: [5, 13, 21, 0], counts: {} },
    { name: "wrong unlocked frontier", values: [8, 21, 55, 0], counts: {} }
  ])("does not rescue Fibonacci $name", ({ values, counts }) => {
    const { runtime } = loadRuntime();
    const board = boardFromValues(2, 2, values);

    expect(
      runtime.resolveSustainableUndoSpawnValue(
        createFibonacciManager(board, { spawnValueCounts: counts }),
        { x: 1, y: 1 }
      )
    ).toBeNull();
  });

  it("ignores a broken Fibonacci unlock prefix", () => {
    const { runtime } = loadRuntime();
    const board = boardFromValues(2, 2, [5, 13, 34, 0]);
    const manager = createFibonacciManager(board, { spawnValueCounts: { "5": 4 } });

    expect(compactTable(runtime.resolveSustainableUndoSpawnTable(manager))).toEqual([
      { value: 1, weight: 90 },
      { value: 2, weight: 10 }
    ]);
    expect(runtime.resolveSustainableUndoSpawnValue(manager, { x: 1, y: 1 })).toBe(3);
  });

  it.each([
    {
      name: "pow2 one unlock",
      manager: { spawnValueCounts: { "8": 1 } },
      expected: [{ value: 2, weight: 87 }, { value: 4, weight: 10 }, { value: 8, weight: 3 }]
    },
    {
      name: "pow2 two unlocks",
      manager: { spawnValueCounts: { "8": 1, "16": 1 } },
      expected: [{ value: 2, weight: 174 }, { value: 4, weight: 20 }, { value: 8, weight: 3 }, { value: 16, weight: 3 }]
    },
    {
      name: "pow2 three unlocks",
      manager: { spawnValueCounts: { "8": 1, "16": 1, "32": 1 } },
      expected: [{ value: 2, weight: 261 }, { value: 4, weight: 30 }, { value: 8, weight: 3 }, { value: 16, weight: 3 }, { value: 32, weight: 3 }]
    }
  ])("builds the shared 3% table for $name", ({ manager: managerOptions, expected }) => {
    const { runtime } = loadRuntime();
    const manager = createManager([[2, 0], [0, 0]], managerOptions);

    expect(compactTable(runtime.resolveSustainableUndoSpawnTable(manager))).toEqual(expected);
  });

  it("uses the same shared 3% table for Fibonacci", () => {
    const { runtime } = loadRuntime();
    const manager = createFibonacciManager([[1, 0], [0, 0]], {
      spawnValueCounts: { "3": 1, "5": 1 }
    });

    expect(compactTable(runtime.resolveSustainableUndoSpawnTable(manager))).toEqual([
      { value: 1, weight: 174 },
      { value: 2, weight: 20 },
      { value: 3, weight: 3 },
      { value: 5, weight: 3 }
    ]);
  });

  it("keeps exact shared-pool boundaries", () => {
    const { runtime } = loadRuntime();
    const table = runtime.resolveSustainableUndoSpawnTable(
      createManager([[2, 0], [0, 0]], { spawnValueCounts: { "8": 1, "16": 1 } })
    );

    expect(runtime.resolveSpawnValueByUnitRoll(table, 0.869999, 2)).toBe(2);
    expect(runtime.resolveSpawnValueByUnitRoll(table, 0.87, 2)).toBe(4);
    expect(runtime.resolveSpawnValueByUnitRoll(table, 0.97, 2)).toBe(8);
    expect(runtime.resolveSpawnValueByUnitRoll(table, 0.985, 2)).toBe(16);
  });

  it("uses unlocked values in ordinary and ranked deterministic spawning", () => {
    const { runtime, setRandomRoll } = loadRuntime();
    const ordinaryBoard = [[2, 0], [0, 0]];
    const ordinary = createManager(ordinaryBoard, { spawnValueCounts: { "8": 1 } });
    setRandomRoll(0.99);
    runtime.addRandomTile(ordinary);
    expect(ordinaryBoard[0][1]).toBe(8);

    const ranked = createManager([[2, 0], [0, 0]], {
      rankPolicy: "ranked",
      initialSeed: 0,
      spawnValueCounts: { "8": 1 }
    });
    const rankedValues = new Set<number>();
    for (let seed = 0; seed < 2_000; seed += 1) {
      rankedValues.add(runtime.resolveRankedDeterministicSpawnValue(ranked, seed, 0));
    }
    expect(rankedValues).toContain(8);
  });

  it.each([
    { name: "ordinary random", options: {} },
    { name: "ranked deterministic", options: { rankPolicy: "ranked", initialSeed: 7 } }
  ])("applies the exact capacity value to $name spawning", ({ options }) => {
    const { runtime } = loadRuntime();
    const empty = { x: 1, y: 1 };
    const board = [
      [8, 16, 32],
      [64, 0, 128],
      [256, 512, 1024]
    ];
    const manager = createManager(board, options);
    runtime.getAvailableCells.mockReturnValue([empty]);

    runtime.addRandomTile(manager);

    expect(board[1][1]).toBe(8);
  });
});

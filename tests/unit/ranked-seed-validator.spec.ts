import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

import {
  createExpectedRankedInitialBoard,
  createRankedDeterministicHash,
  listAvailableCells,
  parseArgs,
  predictAllRankedDirections,
  resolveExpectedRankedSpawn,
  resolveRankedDeterministicUnitFloat,
  resolveRankedMode,
  simulateMove
} from "../../scripts/ranked-seed-validator.mjs";

type MoveInputRuntime = {
  insertSeededRandomSpawnTile: (
    manager: Record<string, unknown>,
    available: Array<{ x: number; y: number }>
  ) => void;
  createRankedDeterministicHash: (seed: number, stepCount: number, channel: string) => number;
  resolveRankedDeterministicUnitFloat: (seed: number, stepCount: number, channel: string) => number;
  resolveRankedDeterministicSpawnValue: (
    manager: { spawnTable: Array<{ value: number; weight: number }>; ruleset: string },
    seed: number,
    stepCount: number
  ) => number;
};

type CoreHelperRuntimes = {
  CoreGridScanRuntime: {
    getAvailableCells: (
      width: number,
      height: number,
      isBlockedCell: (x: number, y: number) => boolean,
      isCellAvailable: (cell: { x: number; y: number }) => boolean
    ) => Array<{ x: number; y: number }>;
  };
  CoreMovePathRuntime: {
    getVector: (direction: number) => { x: number; y: number } | undefined;
    buildTraversals: (width: number, height: number, vector: { x: number; y: number }) => {
      x: number[];
      y: number[];
    };
    findFarthestPosition: (
      cell: { x: number; y: number },
      vector: { x: number; y: number },
      width: number,
      height: number,
      isBlockedCell: (x: number, y: number) => boolean,
      isCellAvailable: (cell: { x: number; y: number }) => boolean
    ) => { farthest: { x: number; y: number }; next: { x: number; y: number } };
  };
  CoreRulesRuntime: {
    getMergedValue: (a: number, b: number, ruleset: string, maxTile: number) => number | null;
  };
  CoreMoveApplyRuntime: {
    planTileInteraction: (input: {
      cell: { x: number; y: number };
      farthest: { x: number; y: number };
      next: { x: number; y: number };
      hasNextTile: boolean;
      nextMergedFrom: boolean;
      mergedValue: number | null;
    }) => {
      kind: "merge" | "move";
      target: { x: number; y: number };
      moved: boolean;
    };
  };
};

function loadMoveInputRuntime(): MoveInputRuntime {
  const scriptPath = path.resolve(process.cwd(), "js/core_game_manager_move_input_helpers_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    console,
    Math,
    Number,
    String,
    Array,
    Object
  } as Record<string, unknown>;
  vm.runInNewContext(script, context);
  return context as MoveInputRuntime;
}

function loadReplaySeededMoveInputRuntime() {
  const scriptPath = path.resolve(process.cwd(), "js/core_game_manager_move_input_helpers_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const seededValues = [0.11, 0.22, 0.05, 0.75];
  const seedrandomCallModes: string[] = [];
  let nativeRandomCalls = 0;
  let seededRandomCalls = 0;
  const mathLike = Object.create(Math) as Math & {
    random: () => number;
    seedrandom: new (seed: unknown) => () => number;
  };
  const nativeRandom = () => {
    nativeRandomCalls += 1;
    return 0.99;
  };
  function SeedRandom(this: unknown, _seed: unknown) {
    let index = 0;
    const rng = () => {
      seededRandomCalls += 1;
      const value = seededValues[index];
      index += 1;
      return typeof value === "number" ? value : 0;
    };
    if (!(this instanceof (SeedRandom as unknown as { new (): unknown }))) {
      mathLike.random = rng;
      seedrandomCallModes.push("global");
    } else {
      seedrandomCallModes.push("local");
    }
    return rng;
  }
  mathLike.random = nativeRandom;
  mathLike.seedrandom = SeedRandom as unknown as new (seed: unknown) => () => number;
  const insertedTiles: Array<{ x: number; y: number; value: number }> = [];
  const context = {
    console,
    Math: mathLike,
    Number,
    String,
    Array,
    Object,
    Tile: function FakeTile(this: { x: number; y: number; value: number }, cell: { x: number; y: number }, value: number) {
      this.x = cell.x;
      this.y = cell.y;
      this.value = value;
    },
    pickSpawnValue() {
      return 2;
    },
    recordSpawnValue(manager: Record<string, unknown>, value: number) {
      manager.recordedSpawnValue = value;
    }
  } as Record<string, unknown>;

  vm.runInNewContext(script, context);

  return {
    runtime: context as MoveInputRuntime,
    mathLike,
    nativeRandom,
    insertedTiles,
    getSeedrandomCallModes: () => seedrandomCallModes.slice(),
    getNativeRandomCalls: () => nativeRandomCalls,
    getSeededRandomCalls: () => seededRandomCalls
  };
}

function loadCoreHelperRuntimes(): CoreHelperRuntimes {
  const context = {
    console,
    Math,
    Number,
    String,
    Array,
    Object
  } as Record<string, unknown>;
  context.window = context;

  for (const relativePath of [
    "js/core_grid_scan_runtime.js",
    "js/core_move_path_runtime.js",
    "js/core_rules_runtime.js",
    "js/core_move_apply_runtime.js"
  ]) {
    const scriptPath = path.resolve(process.cwd(), relativePath);
    const script = readFileSync(scriptPath, "utf8");
    vm.runInNewContext(script, context);
  }

  return context as CoreHelperRuntimes;
}

function simulateMoveByRuntimeHelpers(
  board: number[][],
  mode: { width: number; height: number; ruleset: string; maxTile: number | null },
  directionCode: number
) {
  const runtime = loadCoreHelperRuntimes();
  const vector = runtime.CoreMovePathRuntime.getVector(directionCode);
  if (!vector) {
    throw new Error(`unsupported direction code: ${directionCode}`);
  }
  const traversals = runtime.CoreMovePathRuntime.buildTraversals(mode.width, mode.height, vector);
  const nextBoard = board.map((row) => row.slice());
  const mergedFlags = Array.from({ length: mode.height }, () =>
    Array.from({ length: mode.width }, () => false)
  );
  const maxTile = Number.isInteger(mode.maxTile) && Number(mode.maxTile) > 0 ? Number(mode.maxTile) : Infinity;
  let moved = false;
  let scoreDelta = 0;

  const isWithinBounds = (cell: { x: number; y: number }) =>
    cell.x >= 0 && cell.x < mode.width && cell.y >= 0 && cell.y < mode.height;

  for (const x of traversals.x) {
    for (const y of traversals.y) {
      const cell = { x, y };
      const value = nextBoard[y][x];
      if (!Number.isInteger(value) || value <= 0) continue;
      const positions = runtime.CoreMovePathRuntime.findFarthestPosition(
        cell,
        vector,
        mode.width,
        mode.height,
        () => false,
        (candidate) => isWithinBounds(candidate) && nextBoard[candidate.y][candidate.x] === 0
      );
      const nextCell = positions.next;
      const hasNextTile = isWithinBounds(nextCell) && nextBoard[nextCell.y][nextCell.x] > 0;
      const mergedValue = hasNextTile
        ? runtime.CoreRulesRuntime.getMergedValue(
            value,
            nextBoard[nextCell.y][nextCell.x],
            mode.ruleset,
            maxTile
          )
        : null;
      const interaction = runtime.CoreMoveApplyRuntime.planTileInteraction({
        cell,
        farthest: positions.farthest,
        next: nextCell,
        hasNextTile,
        nextMergedFrom: hasNextTile ? mergedFlags[nextCell.y][nextCell.x] === true : false,
        mergedValue
      });

      if (interaction.kind === "merge" && hasNextTile && mergedValue !== null) {
        nextBoard[cell.y][cell.x] = 0;
        nextBoard[nextCell.y][nextCell.x] = mergedValue;
        mergedFlags[nextCell.y][nextCell.x] = true;
        scoreDelta += mergedValue;
        moved = interaction.moved || moved;
        continue;
      }

      if (interaction.moved) {
        nextBoard[cell.y][cell.x] = 0;
        nextBoard[interaction.target.y][interaction.target.x] = value;
        moved = true;
      }
    }
  }

  return {
    moved,
    scoreDelta,
    boardAfterMove: moved ? nextBoard : board
  };
}

describe("ranked seed validator", () => {
  it("accepts npm-friendly positional mode and seed arguments", () => {
    expect(parseArgs(["standard_4x4_pow2_no_undo", "424242"])).toMatchObject({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: "424242",
      showInitialBoard: true,
      showNextSpawn: false
    });
  });

  it("matches the runtime hash and unit-float outputs", () => {
    const runtime = loadMoveInputRuntime();
    const cases = [
      { seed: 424242, stepCount: 0, channel: "spawn:value" },
      { seed: 424242, stepCount: 0, channel: "spawn:cell" },
      { seed: 424242, stepCount: 7, channel: "spawn:value" },
      { seed: 987654321, stepCount: 19, channel: "spawn:cell" }
    ];

    for (const testCase of cases) {
      expect(
        createRankedDeterministicHash(testCase.seed, testCase.stepCount, testCase.channel)
      ).toBe(runtime.createRankedDeterministicHash(testCase.seed, testCase.stepCount, testCase.channel));
      expect(
        resolveRankedDeterministicUnitFloat(testCase.seed, testCase.stepCount, testCase.channel)
      ).toBe(runtime.resolveRankedDeterministicUnitFloat(testCase.seed, testCase.stepCount, testCase.channel));
    }
  });

  it("keeps replay seeded spawn randomness local to the replay path", () => {
    const {
      runtime,
      mathLike,
      nativeRandom,
      insertedTiles,
      getNativeRandomCalls,
      getSeededRandomCalls,
      getSeedrandomCallModes
    } = loadReplaySeededMoveInputRuntime();
    const manager = {
      seed: "replay-seed",
      replayMode: true,
      replayIndex: 2,
      spawnTable: [
        { value: 2, weight: 90 },
        { value: 4, weight: 10 }
      ],
      grid: {
        insertTile(tile: { x: number; y: number; value: number }) {
          insertedTiles.push({ x: tile.x, y: tile.y, value: tile.value });
        }
      }
    } as Record<string, unknown>;

    runtime.insertSeededRandomSpawnTile(manager, [
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ]);

    expect(getSeedrandomCallModes()).toEqual(["local"]);
    expect(mathLike.random).toBe(nativeRandom);
    expect(getNativeRandomCalls()).toBe(0);
    expect(getSeededRandomCalls()).toBe(4);
    expect(insertedTiles).toEqual([{ x: 1, y: 1, value: 2 }]);
    expect(manager.lastSpawn).toEqual({ x: 1, y: 1, value: 2 });
    expect(manager.recordedSpawnValue).toBe(2);
  });

  it("predicts the next ranked spawn the same way as the runtime logic", () => {
    const runtime = loadMoveInputRuntime();
    const helperRuntime = loadCoreHelperRuntimes();
    const mode = resolveRankedMode("standard_4x4_pow2_no_undo");
    const board = [
      [2, 4, 0, 8],
      [16, 0, 32, 64],
      [128, 256, 0, 512],
      [1024, 0, 2048, 4096]
    ];
    const seed = 424242;
    const stepCount = 7;
    const available = helperRuntime.CoreGridScanRuntime.getAvailableCells(
      mode.width,
      mode.height,
      () => false,
      (cell) => board[cell.y][cell.x] === 0
    );
    const cellRoll = runtime.resolveRankedDeterministicUnitFloat(seed, stepCount, "spawn:cell");
    const expectedCell = available[Math.min(available.length - 1, Math.floor(cellRoll * available.length))];
    const expectedValue = runtime.resolveRankedDeterministicSpawnValue(
      { spawnTable: mode.spawnTable, ruleset: mode.ruleset },
      seed,
      stepCount
    );

    expect(resolveExpectedRankedSpawn({ board, mode, seed, stepCount })).toMatchObject({
      x: expectedCell.x,
      y: expectedCell.y,
      spawnIndex: expectedCell.y * mode.width + expectedCell.x,
      value: expectedValue
    });
  });

  it("enumerates available cells in the same order as the runtime grid scan", () => {
    const helperRuntime = loadCoreHelperRuntimes();
    const board = [
      [2, 0, 0, 4],
      [0, 8, 16, 0],
      [32, 64, 0, 128],
      [0, 0, 256, 512]
    ];

    expect(listAvailableCells(board)).toEqual(
      helperRuntime.CoreGridScanRuntime.getAvailableCells(
        4,
        4,
        () => false,
        (cell) => board[cell.y][cell.x] === 0
      )
    );
  });

  it("reconstructs the same deterministic opening board as the runtime logic", () => {
    const runtime = loadMoveInputRuntime();
    const mode = resolveRankedMode("classic_4x4_pow2_undo");
    const seed = 987654321;
    let expectedBoard = Array.from({ length: mode.height }, () => Array.from({ length: mode.width }, () => 0));

    for (let stepCount = 0; stepCount < 2; stepCount += 1) {
      const available = listAvailableCells(expectedBoard);
      const cellRoll = runtime.resolveRankedDeterministicUnitFloat(seed, stepCount, "spawn:cell");
      const cell = available[Math.min(available.length - 1, Math.floor(cellRoll * available.length))];
      const value = runtime.resolveRankedDeterministicSpawnValue(
        { spawnTable: mode.spawnTable, ruleset: mode.ruleset },
        seed,
        stepCount
      );
      expectedBoard = expectedBoard.map((row) => row.slice());
      expectedBoard[cell.y][cell.x] = value;
    }

    expect(createExpectedRankedInitialBoard(mode, seed).board).toEqual(expectedBoard);
  });

  it("simulates ranked move boards with standard 2048 merge rules", () => {
    const mode = resolveRankedMode("standard_4x4_pow2_no_undo");
    const board = [
      [2, 0, 2, 4],
      [0, 4, 4, 0],
      [2, 2, 2, 0],
      [0, 0, 0, 0]
    ];

    expect(simulateMove(board, mode, 3)).toMatchObject({
      directionKey: "left",
      moved: true,
      scoreDelta: 16,
      boardAfterMove: [
        [4, 4, 0, 0],
        [8, 0, 0, 0],
        [4, 2, 0, 0],
        [0, 0, 0, 0]
      ]
    });
  });

  it("matches the runtime helper traversal logic for all four directions", () => {
    const mode = resolveRankedMode("standard_4x4_pow2_no_undo");
    const board = [
      [2, 0, 2, 4],
      [2, 4, 4, 4],
      [0, 4, 2, 2],
      [2, 0, 2, 0]
    ];

    for (const directionCode of [0, 1, 2, 3]) {
      expect(simulateMove(board, mode, directionCode)).toMatchObject(
        simulateMoveByRuntimeHelpers(board, mode, directionCode)
      );
    }
  });

  it("uses the current successful-move count as stepCount for all valid next directions", () => {
    const mode = resolveRankedMode("standard_4x4_pow2_no_undo");
    const board = [
      [2, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];

    const results = predictAllRankedDirections({
      board,
      mode,
      seed: 424242,
      stepCount: 0
    });

    expect(results.find((item) => item.directionKey === "left")).toMatchObject({
      moved: false,
      prediction: null
    });
    expect(results.find((item) => item.directionKey === "up")).toMatchObject({
      moved: false,
      prediction: null
    });
    expect(results.find((item) => item.directionKey === "right")).toMatchObject({
      moved: true,
      prediction: { stepCount: 0 }
    });
    expect(results.find((item) => item.directionKey === "down")).toMatchObject({
      moved: true,
      prediction: { stepCount: 0 }
    });
  });
});

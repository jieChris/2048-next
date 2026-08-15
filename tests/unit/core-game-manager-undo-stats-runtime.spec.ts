import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type UndoStatsRuntime = {
  applyUndoRestoredTiles: (manager: Record<string, unknown>, undoPayload: Record<string, unknown>) => void;
  buildRedoRestoreState: (
    manager: Record<string, unknown>,
    entry: Record<string, unknown>
  ) => Record<string, unknown>;
  createNormalizedUndoStackEntry: (
    manager: Record<string, unknown>,
    source: Record<string, unknown>,
    fallbackState: Record<string, unknown>,
    tiles: Record<string, unknown>[],
    motionMap: Record<string, unknown>
  ) => Record<string, unknown>;
  executeRedoRestorePipeline: (manager: Record<string, unknown>) => Record<string, unknown> | null;
  handleUndoMove: (manager: Record<string, unknown>, direction: number) => boolean;
};

function loadUndoStatsRuntime(options?: {
  redoRestorePipelineRuntime?: {
    executeRedoRestorePipeline?: (
      manager: Record<string, unknown> | null,
      operations: Record<string, unknown>
    ) => Record<string, unknown> | null;
  };
  normalizedUndoEntryRuntime?: {
    createNormalizedUndoStackEntry?: (
      manager: Record<string, unknown> | null,
      source: Record<string, unknown>,
      fallbackState: Record<string, unknown>,
      tiles: Record<string, unknown>[],
      motionMap: Record<string, unknown> | null
    ) => Record<string, unknown>;
  };
  redoRestoreStateRuntime?: {
    buildRedoRestoreState?: (
      manager: Record<string, unknown> | null,
      entry: Record<string, unknown> | null
    ) => Record<string, unknown>;
  };
  undoMoveHandlerRuntime?: {
    handleUndoMove?: (
      manager: Record<string, unknown> | null,
      direction: number,
      operations: Record<string, unknown>
    ) => boolean;
  };
  postUndoRecordRuntime?: {
    computePostUndoRecord?: (input: Record<string, unknown>) => Record<string, unknown>;
  };
  replayCodecRuntime?: {
    appendCompactUndo?: (log: unknown) => string;
  };
  undoRestoredTilesRuntime?: {
    applyUndoRestoredTiles?: (
      manager: Record<string, unknown> | null,
      undoPayload: Record<string, unknown>,
      operations: Record<string, unknown>
    ) => void;
  };
}): UndoStatsRuntime {
  const scriptPath = path.resolve(
    process.cwd(),
    "js/core_game_manager_undo_stats_helpers_runtime.js"
  );
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    console,
    actuate: vi.fn(),
    Tile: class Tile {
      x: number;
      y: number;
      value: number;
      previousPosition: unknown;

      constructor(position: { x: number; y: number }, value: number) {
        this.x = position.x;
        this.y = position.y;
        this.value = value;
        this.previousPosition = null;
      }
    },
    resolveCorePayloadCallWith: vi.fn(
      (
        _manager: unknown,
        _runtimeName: string,
        _methodName: string,
        _payload: unknown,
        fallback: unknown
      ) => fallback
    ),
    CoreGameManagerRedoRestorePipelineRuntime: options?.redoRestorePipelineRuntime,
    CoreGameManagerNormalizedUndoEntryRuntime: options?.normalizedUndoEntryRuntime,
    CoreGameManagerRedoRestoreStateRuntime: options?.redoRestoreStateRuntime,
    CoreGameManagerUndoMoveHandlerRuntime: options?.undoMoveHandlerRuntime,
    CorePostUndoRecordRuntime: options?.postUndoRecordRuntime,
    CoreReplayCodecRuntime: options?.replayCodecRuntime,
    CoreGameManagerUndoRestoredTilesRuntime: options?.undoRestoredTilesRuntime
  } as Record<string, unknown>;

  vm.runInNewContext(script, context);
  return context as UndoStatsRuntime;
}

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
    isNonArrayObject: (value: unknown) => !!value && typeof value === "object" && !Array.isArray(value),
    isStoneValue: vi.fn(() => false),
    setRuntimeScore: vi.fn(),
    writeRuntimeGridCell: vi.fn(() => true)
  };
}

describe("core game manager undo stats runtime", () => {
  it("delegates redo restore pipeline execution to the TypeScript runtime", () => {
    const redoRestore = { shouldStartTimer: true };
    const executeRedoRestorePipeline = vi.fn(() => redoRestore);
    const runtime = loadUndoStatsRuntime({
      redoRestorePipelineRuntime: {
        executeRedoRestorePipeline
      }
    });
    const manager = {
      undoStack: [],
      redoStack: [],
      normalizeUndoStackEntry: vi.fn()
    };

    expect(runtime.executeRedoRestorePipeline(manager)).toBe(redoRestore);
    expect(executeRedoRestorePipeline).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        applyUndoRestoredTiles: expect.any(Function),
        applyUndoRestoreState: expect.any(Function),
        buildRedoRestoreState: expect.any(Function),
        buildUndoPreviousPositionMapFromRedoEntry: expect.any(Function),
        createCurrentUndoStackEntrySnapshot: expect.any(Function),
        ensureRedoStack: expect.any(Function),
        mergeUndoPositionMap: expect.any(Function)
      })
    );
  });

  it("delegates normalized undo stack entry creation to the TypeScript runtime", () => {
    const normalizedEntry = { score: 128, tiles: [], motionMap: null };
    const createNormalizedUndoStackEntry = vi.fn(() => normalizedEntry);
    const runtime = loadUndoStatsRuntime({
      normalizedUndoEntryRuntime: {
        createNormalizedUndoStackEntry
      }
    });
    const manager = {};
    const source = { score: Number.NaN };
    const fallbackState = { score: 128 };
    const tiles: Record<string, unknown>[] = [];
    const motionMap = { "0,0": { x: 0, y: 0 } };

    expect(
      runtime.createNormalizedUndoStackEntry(manager, source, fallbackState, tiles, motionMap)
    ).toBe(normalizedEntry);
    expect(createNormalizedUndoStackEntry).toHaveBeenCalledWith(
      manager,
      source,
      fallbackState,
      tiles,
      motionMap
    );
  });

  it("delegates redo restore state building to the TypeScript runtime", () => {
    const redoRestore = { shouldStartTimer: true };
    const buildRedoRestoreState = vi.fn(() => redoRestore);
    const runtime = loadUndoStatsRuntime({
      redoRestoreStateRuntime: {
        buildRedoRestoreState
      }
    });
    const manager = {
      getUndoStateFallbackValues: vi.fn(),
      normalizeUndoStackEntry: vi.fn(),
      timerStatus: 0
    };
    const entry = {
      comboStreak: 2
    };

    expect(runtime.buildRedoRestoreState(manager, entry)).toBe(redoRestore);
    expect(buildRedoRestoreState).toHaveBeenCalledWith(manager, entry);
  });

  it("delegates undo move handling to the TypeScript runtime", () => {
    const handleUndoMove = vi.fn(() => true);
    const runtime = loadUndoStatsRuntime({
      undoMoveHandlerRuntime: {
        handleUndoMove
      }
    });
    const manager = {
      undoStack: [],
      redoStack: [],
      modeKey: "standard_4x4_pow2_undo",
      undoLimit: null,
      undoUsed: 0,
      normalizeUndoStackEntry: vi.fn(),
      resolveUndoPolicyStateForMode: vi.fn(() => ({ isUndoInteractionEnabled: true }))
    };

    expect(runtime.handleUndoMove(manager, -1)).toBe(true);

    expect(handleUndoMove).toHaveBeenCalledWith(
      manager,
      -1,
      expect.objectContaining({
        actuate: expect.any(Function),
        canExecuteRedoMove: expect.any(Function),
        canExecuteUndoMove: expect.any(Function),
        executeRedoRestorePipeline: expect.any(Function),
        executeUndoRestorePipeline: expect.any(Function),
        pushRedoSnapshotBeforeUndo: expect.any(Function),
        shouldStartTimerAfterRedoRestore: expect.any(Function),
        shouldStartTimerAfterUndoRestore: expect.any(Function)
      })
    );
  });

  it("delegates undo restored tile application to the TypeScript runtime", () => {
    const applyUndoRestoredTiles = vi.fn();
    const runtime = loadUndoStatsRuntime({
      undoRestoredTilesRuntime: {
        applyUndoRestoredTiles
      }
    });
    const manager = createManager();
    const undoPayload = {
      score: 16,
      tiles: [{ x: 1, y: 0, value: 8, previousPosition: { x: 0, y: 0 } }]
    };

    runtime.applyUndoRestoredTiles(manager, undoPayload);

    expect(applyUndoRestoredTiles).toHaveBeenCalledWith(
      manager,
      undoPayload,
      expect.objectContaining({
        createTile: expect.any(Function),
        createUndoRestoreTile: expect.any(Function),
        setRuntimeScoreForUndo: expect.any(Function),
        writeRuntimeGridCellForUndo: expect.any(Function)
      })
    );
  });

  it("records post-undo artifacts through installed runtimes during undo restore", () => {
    const computePostUndoRecord = vi.fn(() => ({
      shouldRecordMoveHistory: true,
      shouldAppendCompactUndo: true,
      shouldPushSessionAction: true,
      sessionAction: ["u"]
    }));
    const appendCompactUndo = vi.fn(() => "undo-log");
    const handleUndoMove = vi.fn((manager, direction, operations) => {
      const ops = operations as {
        executeUndoRestorePipeline: (
          manager: Record<string, unknown>,
          direction: number
        ) => unknown;
        actuate: (manager: Record<string, unknown>) => void;
      };
      ops.executeUndoRestorePipeline(manager as Record<string, unknown>, direction);
      ops.actuate(manager as Record<string, unknown>);
      return true;
    });
    const runtime = loadUndoStatsRuntime({
      undoMoveHandlerRuntime: {
        handleUndoMove
      },
      postUndoRecordRuntime: {
        computePostUndoRecord
      },
      replayCodecRuntime: {
        appendCompactUndo
      }
    });
    const manager = {
      grid: {
        cells: [
          [null, null],
          [null, null]
        ],
        build: vi.fn()
      },
      width: 2,
      height: 2,
      score: 16,
      comboStreak: 0,
      successfulMoveCount: 1,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      undoUsed: 0,
      undoLimit: null,
      timerStatus: 1,
      modeKey: "classic_4x4_pow2_undo",
      mode: "classic_4x4_pow2_undo",
      replayMode: false,
      replayCompactLog: "",
      moveHistory: [] as number[],
      sessionReplayV1: { supported: true, records: [] as Record<string, unknown>[] },
      sessionReplayV3: { actions: [] as unknown[] },
      undoStack: [
        {
          score: 8,
          tiles: [{ x: 0, y: 0, value: 8, previousPosition: { x: 1, y: 0 } }],
          comboStreak: 0,
          successfulMoveCount: 0,
          lockConsumedAtMoveCount: -1,
          lockedDirectionTurn: null,
          lockedDirection: null,
          undoUsed: 0
        }
      ],
      redoStack: [],
      normalizeUndoStackEntry: vi.fn((entry) => entry),
      isNonArrayObject: (value: unknown) => !!value && typeof value === "object" && !Array.isArray(value),
      isStoneValue: vi.fn(() => false),
      setRuntimeScore: vi.fn(),
      writeRuntimeGridCell: vi.fn(() => true),
      resolveUndoPolicyStateForMode: vi.fn(() => ({ isUndoInteractionEnabled: true })),
      actuator: {
        clearMessage: vi.fn()
      }
    };

    expect(runtime.handleUndoMove(manager, -1)).toBe(true);

    expect(computePostUndoRecord).toHaveBeenCalledWith({
      replayMode: false,
      direction: -1,
      hasSessionReplayV3: true
    });
    expect(appendCompactUndo).toHaveBeenCalledWith("");
    expect(manager.moveHistory).toEqual([-1]);
    expect(manager.replayCompactLog).toBe("undo-log");
    expect(manager.sessionReplayV1.records[0]).toMatchObject({ kind: "undo1" });
    expect(manager.sessionReplayV3.actions).toEqual([["u"]]);
  });
});

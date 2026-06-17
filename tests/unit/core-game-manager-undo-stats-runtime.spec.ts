import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type UndoStatsRuntime = {
  applyUndoRestoredTiles: (manager: Record<string, unknown>, undoPayload: Record<string, unknown>) => void;
  handleUndoMove: (manager: Record<string, unknown>, direction: number) => boolean;
};

function loadUndoStatsRuntime(options?: {
  undoMoveHandlerRuntime?: {
    handleUndoMove?: (
      manager: Record<string, unknown> | null,
      direction: number,
      operations: Record<string, unknown>
    ) => boolean;
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
    CoreGameManagerUndoMoveHandlerRuntime: options?.undoMoveHandlerRuntime,
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
});

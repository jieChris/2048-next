import { describe, expect, it, vi } from "vitest";

import {
  addRuntimeScoreDelta,
  callCoreStorageRuntime,
  clearRuntimeGridCell,
  clearRuntimeRedoStack,
  pushRuntimeUndoStackEntry,
  resolveCoreArgsCallWith,
  resolveCorePayloadCallWith,
  resolveRuntimeCallResult,
  setRuntimeDisableSessionSync,
  setRuntimeGrid,
  setRuntimeRedoStack,
  setRuntimeReplayDelay,
  setRuntimeReplayIndex,
  setRuntimeReplayMoves,
  setRuntimeReplayMovesV2,
  setRuntimeReplaySpawns,
  setRuntimeScore,
  setRuntimeUndoEnabled,
  setRuntimeUndoStack,
  writeRuntimeGridCell
} from "../../src/core/game-manager-runtime-call-helpers";

describe("game manager runtime call helpers", () => {
  it("resolves runtime calls with manager receiver and array-normalized args", () => {
    const runtimeMethod = vi.fn(function (
      this: { marker: string },
      methodName: string,
      runtimeArgs: unknown[]
    ) {
      return { receiver: this.marker, methodName, runtimeArgs };
    });
    const manager = {
      marker: "manager",
      callRuntime: runtimeMethod
    };

    expect(resolveRuntimeCallResult(manager, "callRuntime", "read", ["a", "b"])).toEqual({
      receiver: "manager",
      methodName: "read",
      runtimeArgs: ["a", "b"]
    });
    expect(runtimeMethod).toHaveBeenCalledWith("read", ["a", "b"]);
    expect(resolveRuntimeCallResult(manager, "callRuntime", "read", "not-array")).toEqual({
      receiver: "manager",
      methodName: "read",
      runtimeArgs: []
    });
    expect(resolveRuntimeCallResult(null, "callRuntime", "read", [])).toBeNull();
    expect(resolveRuntimeCallResult(manager, "", "read", [])).toBeNull();
    expect(resolveRuntimeCallResult(manager, "missing", "read", [])).toBeNull();
  });

  it("resolves payload and args runtime calls through supplied resolvers", () => {
    const manager = {
      callRuntime: vi.fn((_methodName: string, runtimeArgs: unknown[]) => ({
        available: true,
        value: runtimeArgs
      }))
    };
    const resolver = vi.fn((_manager: unknown, coreCallResult: unknown) => coreCallResult);

    expect(resolveCorePayloadCallWith(manager, "callRuntime", "payload", undefined, "empty", resolver)).toEqual({
      available: true,
      value: [{}]
    });
    expect(resolveCorePayloadCallWith(null, "callRuntime", "payload", { a: 1 }, "empty", resolver)).toBe("empty");
    expect(resolveCoreArgsCallWith(manager, "callRuntime", "args", ["x"], "empty", resolver)).toEqual({
      available: true,
      value: ["x"]
    });
    expect(resolveCoreArgsCallWith(null, "callRuntime", "args", ["x"], "empty", resolver)).toBe("empty");
    expect(resolver).toHaveBeenCalledWith(manager, { available: true, value: [{}] });
    expect(resolver).toHaveBeenCalledWith(manager, { available: true, value: ["x"] });
  });

  it("calls the storage runtime with optional window context", () => {
    const windowLike = { name: "window" };
    const manager = {
      getWindowLike: () => windowLike,
      callCoreStorageRuntime: vi.fn((_methodName: string, runtimeArgs: unknown[]) => runtimeArgs[0])
    };

    expect(callCoreStorageRuntime(manager, "read", undefined, false)).toEqual({});
    expect(callCoreStorageRuntime(manager, "read", { key: "score" }, true)).toEqual({
      windowLike,
      key: "score"
    });
    expect(callCoreStorageRuntime(null, "read", {}, true)).toBeNull();
    expect(manager.callCoreStorageRuntime).toHaveBeenCalledWith("read", [{}]);
  });

  it("normalizes score and replay scalar state", () => {
    const manager: Record<string, unknown> = {};

    setRuntimeScore(manager, "42");
    expect(manager.score).toBe(42);
    setRuntimeScore(manager, "invalid");
    expect(manager.score).toBe(0);

    addRuntimeScoreDelta(manager, 5);
    expect(manager.score).toBe(5);
    addRuntimeScoreDelta(manager, "invalid");
    addRuntimeScoreDelta(manager, 0);
    expect(manager.score).toBe(5);

    setRuntimeReplayIndex(manager, 3);
    expect(manager.replayIndex).toBe(3);
    setRuntimeReplayIndex(manager, -1);
    expect(manager.replayIndex).toBe(0);
    setRuntimeReplayIndex(manager, 1.5);
    expect(manager.replayIndex).toBe(0);

    setRuntimeReplaySpawns(manager, ["spawn"]);
    setRuntimeReplayMovesV2(manager, { moves: [] });
    setRuntimeUndoEnabled(manager, false);
    setRuntimeDisableSessionSync(manager, true);
    setRuntimeReplayDelay(manager, 120);
    expect(manager.replaySpawns).toEqual(["spawn"]);
    expect(manager.replayMovesV2).toEqual({ moves: [] });
    expect(manager.undoEnabled).toBe(false);
    expect(manager.disableSessionSync).toBe(true);
    expect(manager.replayDelay).toBe(120);
  });

  it("normalizes replay moves and undo stacks", () => {
    const manager: Record<string, unknown> = {};

    setRuntimeReplayMoves(manager, ["left"]);
    expect(manager.replayMoves).toEqual(["left"]);
    setRuntimeReplayMoves(manager, "invalid");
    expect(manager.replayMoves).toEqual([]);

    setRuntimeGrid(manager, { cells: [] });
    expect(manager.grid).toEqual({ cells: [] });
    setRuntimeGrid(manager, undefined);
    expect(manager.grid).toBeNull();

    setRuntimeUndoStack(manager, ["undo"]);
    setRuntimeRedoStack(manager, ["redo"]);
    expect(manager.undoStack).toEqual(["undo"]);
    expect(manager.redoStack).toEqual(["redo"]);
    setRuntimeUndoStack(manager, "invalid");
    setRuntimeRedoStack(manager, "invalid");
    expect(manager.undoStack).toEqual([]);
    expect(manager.redoStack).toEqual([]);

    pushRuntimeUndoStackEntry(manager, { score: 1 });
    expect(manager.undoStack).toEqual([{ score: 1 }]);
    clearRuntimeRedoStack(manager);
    expect(manager.redoStack).toEqual([]);
  });

  it("writes and clears valid grid cells only", () => {
    const manager = {
      grid: {
        cells: [
          [null, null],
          [null, null]
        ]
      }
    };
    const tile = { value: 2 };

    expect(writeRuntimeGridCell(manager, 1, 0, tile)).toBe(true);
    expect(manager.grid.cells[1][0]).toBe(tile);
    expect(writeRuntimeGridCell(manager, -1, 0, tile)).toBe(false);
    expect(writeRuntimeGridCell(manager, 1.5, 0, tile)).toBe(false);
    expect(writeRuntimeGridCell({ grid: { cells: {} } }, 0, 0, tile)).toBe(false);
    expect(writeRuntimeGridCell({ grid: { cells: [null] } }, 0, 0, tile)).toBe(false);

    expect(clearRuntimeGridCell(manager, 1, 0)).toBe(true);
    expect(manager.grid.cells[1][0]).toBeNull();
  });
});

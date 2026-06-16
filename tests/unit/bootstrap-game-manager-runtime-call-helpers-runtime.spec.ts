import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerRuntimeCallHelpersRuntime,
  installGameManagerRuntimeCallHelpersRuntime,
  type GameManagerRuntimeCallHelpersRuntimeWindowLike
} from "../../src/bootstrap/game-manager-runtime-call-helpers-runtime";
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

const expectedRuntime = {
  resolveRuntimeCallResult,
  resolveCorePayloadCallWith,
  resolveCoreArgsCallWith,
  callCoreStorageRuntime,
  setRuntimeScore,
  addRuntimeScoreDelta,
  setRuntimeReplayIndex,
  setRuntimeReplayMoves,
  setRuntimeReplaySpawns,
  setRuntimeReplayMovesV2,
  setRuntimeUndoEnabled,
  setRuntimeDisableSessionSync,
  setRuntimeReplayDelay,
  setRuntimeGrid,
  setRuntimeUndoStack,
  setRuntimeRedoStack,
  pushRuntimeUndoStackEntry,
  clearRuntimeRedoStack,
  writeRuntimeGridCell,
  clearRuntimeGridCell
};

describe("game manager runtime call helpers runtime installer", () => {
  it("creates the legacy global function shape from TypeScript helpers", () => {
    const runtime = createGameManagerRuntimeCallHelpersRuntime();

    expect(runtime).toEqual(expectedRuntime);
    for (const name of Object.keys(expectedRuntime)) {
      expect(Object.prototype.hasOwnProperty.call(runtime, name)).toBe(true);
      expect(typeof runtime[name as keyof typeof runtime]).toBe("function");
    }
  });

  it("installs missing legacy global functions on a supplied window-like object", () => {
    const windowLike: GameManagerRuntimeCallHelpersRuntimeWindowLike = {};

    const installed = installGameManagerRuntimeCallHelpersRuntime({ windowLike });

    expect(installed).toEqual(expectedRuntime);
    for (const [name, fn] of Object.entries(expectedRuntime)) {
      expect(typeof fn).toBe("function");
      expect(Object.prototype.hasOwnProperty.call(windowLike, name)).toBe(true);
      expect(windowLike[name as keyof GameManagerRuntimeCallHelpersRuntimeWindowLike]).toBe(fn);
    }
  });

  it("does not overwrite existing legacy global function properties", () => {
    const existingResolveRuntimeCallResult = vi.fn(() => null);
    const existingSetRuntimeScore = vi.fn();
    const windowLike: GameManagerRuntimeCallHelpersRuntimeWindowLike = {
      resolveRuntimeCallResult: existingResolveRuntimeCallResult,
      setRuntimeScore: existingSetRuntimeScore
    };

    const installed = installGameManagerRuntimeCallHelpersRuntime({ windowLike });

    expect(installed?.resolveRuntimeCallResult).toBe(existingResolveRuntimeCallResult);
    expect(installed?.setRuntimeScore).toBe(existingSetRuntimeScore);
    expect(windowLike.resolveRuntimeCallResult).toBe(existingResolveRuntimeCallResult);
    expect(windowLike.setRuntimeScore).toBe(existingSetRuntimeScore);
    expect(windowLike.clearRuntimeGridCell).toBe(clearRuntimeGridCell);
  });

  it("returns null when no window-like target is available", () => {
    expect(installGameManagerRuntimeCallHelpersRuntime({ windowLike: null })).toBeNull();
  });
});

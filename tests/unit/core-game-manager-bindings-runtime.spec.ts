import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

const PRE_ACCESSOR_MANAGER_BINDING_NAMES = [
  "encodeReplay128",
  "decodeReplay128",
  "resolveCoreObjectCallOrFallback",
  "resolveCoreBooleanCallOrFallback",
  "resolveCoreNumericCallOrFallback",
  "resolveCoreStringCallOrFallback",
  "resolveNormalizedCoreValueOrUndefined",
  "resolveNormalizedCoreValueOrFallback",
  "resolveNormalizedCoreValueOrFallbackAllowNull",
  "resolveCoreRawCallValueOrUndefined",
  "tryHandleCoreRawValue",
  "createCoreModeContextPayload",
  "setRuntimeScore",
  "addRuntimeScoreDelta",
  "setRuntimeReplayIndex",
  "setRuntimeReplayMoves",
  "setRuntimeReplaySpawns",
  "setRuntimeReplayMovesV2",
  "setRuntimeUndoEnabled",
  "setRuntimeDisableSessionSync",
  "setRuntimeReplayDelay",
  "setRuntimeGrid",
  "setRuntimeUndoStack",
  "setRuntimeRedoStack",
  "pushRuntimeUndoStackEntry",
  "clearRuntimeRedoStack",
  "writeRuntimeGridCell",
  "clearRuntimeGridCell"
] as const;

const POST_ACCESSOR_MANAGER_BINDING_NAMES = [
  "readOptionValue",
  "resolveUndoPolicyStateForMode",
  "getUndoStateFallbackValues",
  "normalizeUndoStackEntry",
  "createUndoTileSnapshot",
  "normalizeSpawnTable",
  "normalizeModeConfig",
  "resolveModeConfig",
  "normalizeSpecialRules",
  "getActiveMoveDirections",
  "isDirectionAllowed",
  "isStoneValue",
  "useItem",
  "updateItemModeHud",
  "updateMoveTimeoutHud"
] as const;

const TOP_LEVEL_GAMEPLAY_BINDING_REFERENCES = [
  "restartGame",
  "restartWithSeed",
  "restartWithBoard",
  "keepPlaying",
  "clearTransientTileVisualState",
  "isGameTerminated",
  "setupGame",
  "addRandomTile",
  "actuate",
  "move",
  "startTimer",
  "stopTimer",
  "formatPrettyTime",
  "insertCustomTile",
  "getFinalBoardMatrix",
  "getDurationMs",
  "serializeReplayV3",
  "serializeReplayAsV9Verse",
  "exportReplayAsV9VerseBlob",
  "serializeReplayAsV9RplBase64",
  "tryAutoSubmitOnGameOver",
  "isSessionTerminated",
  "serializeReplay",
  "applyReplayImportActions",
  "importReplay",
  "importV9RplBuffer",
  "pauseReplay",
  "resumeReplay",
  "setReplaySpeed",
  "seekReplay",
  "stepReplay"
] as const;

type BindingsRuntimeContext = {
  createPreAccessorManagerForwardBindings: () => [string, unknown][];
  createPostAccessorManagerForwardBindings: () => [string, unknown][];
};

function loadBindingsRuntime(options?: {
  postAccessorRuntime?: {
    createPostAccessorManagerForwardBindings?: (operations: Record<string, unknown>) => [string, unknown][];
  };
  preAccessorRuntime?: {
    createPreAccessorManagerForwardBindings?: (operations: Record<string, unknown>) => [string, unknown][];
  };
}): BindingsRuntimeContext {
  const script = readFileSync(
    path.resolve(process.cwd(), "js/core_game_manager_bindings_runtime.js"),
    "utf8"
  );
  const context = {
    console,
    GameManager: { prototype: {} },
    CorePostAccessorManagerForwardBindingsRuntime: options?.postAccessorRuntime,
    CorePreAccessorManagerForwardBindingsRuntime: options?.preAccessorRuntime
  } as Record<string, unknown>;
  for (const name of PRE_ACCESSOR_MANAGER_BINDING_NAMES) {
    context[name] = vi.fn();
  }
  for (const name of POST_ACCESSOR_MANAGER_BINDING_NAMES) {
    context[name] = vi.fn();
  }
  for (const name of TOP_LEVEL_GAMEPLAY_BINDING_REFERENCES) {
    context[name] = context[name] || vi.fn();
  }

  vm.runInNewContext(script, context);
  return context as BindingsRuntimeContext;
}

describe("core game manager bindings runtime", () => {
  it("delegates post-accessor manager-forward binding creation to the TypeScript runtime", () => {
    const runtimeBindings: [string, unknown][] = [["fromRuntime", vi.fn()]];
    const createPostAccessorManagerForwardBindings = vi.fn(() => runtimeBindings);
    const runtime = loadBindingsRuntime({
      postAccessorRuntime: {
        createPostAccessorManagerForwardBindings
      }
    });

    const bindings = runtime.createPostAccessorManagerForwardBindings();

    expect(bindings).toBe(runtimeBindings);
    expect(createPostAccessorManagerForwardBindings).toHaveBeenCalledTimes(1);
    expect(createPostAccessorManagerForwardBindings).toHaveBeenCalledWith(
      expect.objectContaining(
        Object.fromEntries(POST_ACCESSOR_MANAGER_BINDING_NAMES.map((name) => [name, expect.any(Function)]))
      )
    );
  });

  it("delegates pre-accessor manager-forward binding creation to the TypeScript runtime", () => {
    const runtimeBindings: [string, unknown][] = [["fromRuntime", vi.fn()]];
    const createPreAccessorManagerForwardBindings = vi.fn(() => runtimeBindings);
    const runtime = loadBindingsRuntime({
      preAccessorRuntime: {
        createPreAccessorManagerForwardBindings
      }
    });

    const bindings = runtime.createPreAccessorManagerForwardBindings();

    expect(bindings).toBe(runtimeBindings);
    expect(createPreAccessorManagerForwardBindings).toHaveBeenCalledTimes(1);
    expect(createPreAccessorManagerForwardBindings).toHaveBeenCalledWith(
      expect.objectContaining(
        Object.fromEntries(PRE_ACCESSOR_MANAGER_BINDING_NAMES.map((name) => [name, expect.any(Function)]))
      )
    );
  });
});

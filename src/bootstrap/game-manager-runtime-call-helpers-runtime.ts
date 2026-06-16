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
} from "../core/game-manager-runtime-call-helpers";

export interface GameManagerRuntimeCallHelpersRuntime {
  resolveRuntimeCallResult: typeof resolveRuntimeCallResult;
  resolveCorePayloadCallWith: typeof resolveCorePayloadCallWith;
  resolveCoreArgsCallWith: typeof resolveCoreArgsCallWith;
  callCoreStorageRuntime: typeof callCoreStorageRuntime;
  setRuntimeScore: typeof setRuntimeScore;
  addRuntimeScoreDelta: typeof addRuntimeScoreDelta;
  setRuntimeReplayIndex: typeof setRuntimeReplayIndex;
  setRuntimeReplayMoves: typeof setRuntimeReplayMoves;
  setRuntimeReplaySpawns: typeof setRuntimeReplaySpawns;
  setRuntimeReplayMovesV2: typeof setRuntimeReplayMovesV2;
  setRuntimeUndoEnabled: typeof setRuntimeUndoEnabled;
  setRuntimeDisableSessionSync: typeof setRuntimeDisableSessionSync;
  setRuntimeReplayDelay: typeof setRuntimeReplayDelay;
  setRuntimeGrid: typeof setRuntimeGrid;
  setRuntimeUndoStack: typeof setRuntimeUndoStack;
  setRuntimeRedoStack: typeof setRuntimeRedoStack;
  pushRuntimeUndoStackEntry: typeof pushRuntimeUndoStackEntry;
  clearRuntimeRedoStack: typeof clearRuntimeRedoStack;
  writeRuntimeGridCell: typeof writeRuntimeGridCell;
  clearRuntimeGridCell: typeof clearRuntimeGridCell;
}

export type GameManagerRuntimeCallHelpersRuntimeWindowLike = Partial<GameManagerRuntimeCallHelpersRuntime>;

export interface GameManagerRuntimeCallHelpersRuntimeInstallOptions {
  windowLike?: GameManagerRuntimeCallHelpersRuntimeWindowLike | null | undefined;
}

type RuntimeEntry = {
  [Key in keyof GameManagerRuntimeCallHelpersRuntime]: [Key, GameManagerRuntimeCallHelpersRuntime[Key]];
}[keyof GameManagerRuntimeCallHelpersRuntime];

function getRuntimeEntries(runtime: GameManagerRuntimeCallHelpersRuntime): RuntimeEntry[] {
  return Object.entries(runtime) as RuntimeEntry[];
}

export function createGameManagerRuntimeCallHelpersRuntime(): GameManagerRuntimeCallHelpersRuntime {
  return {
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
}

export function installGameManagerRuntimeCallHelpersRuntime(
  options: GameManagerRuntimeCallHelpersRuntimeInstallOptions = {}
): GameManagerRuntimeCallHelpersRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as GameManagerRuntimeCallHelpersRuntimeWindowLike));
  if (!windowLike) return null;

  const runtime = createGameManagerRuntimeCallHelpersRuntime();
  for (const [name, helper] of getRuntimeEntries(runtime)) {
    if (typeof windowLike[name] !== "function") {
      windowLike[name] = helper as never;
    }
  }

  const installed: Partial<GameManagerRuntimeCallHelpersRuntime> = {};
  for (const [name] of getRuntimeEntries(runtime)) {
    installed[name] = windowLike[name] as never;
  }
  return installed as GameManagerRuntimeCallHelpersRuntime;
}

export interface SetupRestoreInitialBoardStateManagerLike {
  needsRankedCheckpointRestore?: boolean;
  rankCheckpointRestorePending?: boolean;
}

export interface SetupRestoreInitialBoardStateOptionsLike {
  skipStartTiles?: unknown;
  disableStateRestore?: unknown;
  [key: string]: unknown;
}

export interface SetupRestoreInitialBoardStateResult {
  restoredFromSavedState: boolean;
}

export interface SetupRestoreInitialBoardStateOperations {
  shouldTryRestoreSavedStateInSetup?: (
    manager: SetupRestoreInitialBoardStateManagerLike,
    hasInputSeed: boolean,
    normalizedOptions: SetupRestoreInitialBoardStateOptionsLike
  ) => boolean;
  tryRestoreLatestSavedState?: (manager: SetupRestoreInitialBoardStateManagerLike) => boolean;
  shouldForceRankedCheckpointRestoreInSetup?: (
    manager: SetupRestoreInitialBoardStateManagerLike
  ) => boolean;
  readRankedCheckpointLocalMirrorSavedStateForSetup?: (
    manager: SetupRestoreInitialBoardStateManagerLike
  ) => unknown | null;
  applySavedStateRestore?: (
    manager: SetupRestoreInitialBoardStateManagerLike,
    savedState: unknown
  ) => boolean;
  shouldScheduleRankedCheckpointRestoreInSetup?: (
    manager: SetupRestoreInitialBoardStateManagerLike,
    hasInputSeed: boolean,
    normalizedOptions: SetupRestoreInitialBoardStateOptionsLike
  ) => boolean;
  hasRankedCheckpointAuthTokenForSetup?: (manager: SetupRestoreInitialBoardStateManagerLike) => boolean;
  placeStoneTilesForSetup?: (manager: SetupRestoreInitialBoardStateManagerLike) => void;
  seedInitialTilesAndSnapshotBoard?: (manager: SetupRestoreInitialBoardStateManagerLike) => void;
}

export interface SetupRestoreInitialBoardStateRuntime {
  resolveSetupRestoreAndInitialBoardState: typeof resolveSetupRestoreAndInitialBoardState;
}

export interface SetupRestoreInitialBoardStateWindowLike {
  CoreSetupRestoreInitialBoardStateRuntime?: SetupRestoreInitialBoardStateRuntime;
}

export interface SetupRestoreInitialBoardStateRuntimeInstallOptions {
  windowLike?: SetupRestoreInitialBoardStateWindowLike | null;
}

export function resolveSetupRestoreAndInitialBoardState(
  manager: SetupRestoreInitialBoardStateManagerLike | null | undefined,
  hasInputSeed: boolean,
  normalizedOptions: SetupRestoreInitialBoardStateOptionsLike = {},
  operations: SetupRestoreInitialBoardStateOperations = {}
): SetupRestoreInitialBoardStateResult {
  if (!manager) return { restoredFromSavedState: false };
  let restoredFromSavedState = false;
  let restoredFromRankedLocalMirror = false;
  const skipStartTiles = !!normalizedOptions.skipStartTiles;
  if (operations.shouldTryRestoreSavedStateInSetup?.(manager, hasInputSeed, normalizedOptions)) {
    restoredFromSavedState = operations.tryRestoreLatestSavedState?.(manager) === true;
  }
  const forceRankedCheckpointRestore =
    operations.shouldForceRankedCheckpointRestoreInSetup?.(manager) === true;
  if (
    !forceRankedCheckpointRestore &&
    !restoredFromSavedState &&
    !hasInputSeed &&
    !skipStartTiles &&
    !normalizedOptions.disableStateRestore
  ) {
    const rankedLocalMirrorSavedState =
      operations.readRankedCheckpointLocalMirrorSavedStateForSetup?.(manager);
    if (rankedLocalMirrorSavedState && typeof operations.applySavedStateRestore === "function") {
      restoredFromSavedState = operations.applySavedStateRestore(manager, rankedLocalMirrorSavedState) === true;
      restoredFromRankedLocalMirror = !!restoredFromSavedState;
    }
  }
  manager.needsRankedCheckpointRestore =
    operations.shouldScheduleRankedCheckpointRestoreInSetup?.(manager, hasInputSeed, normalizedOptions) === true &&
    (!restoredFromSavedState ||
      (restoredFromRankedLocalMirror &&
        operations.hasRankedCheckpointAuthTokenForSetup?.(manager) === true));
  manager.rankCheckpointRestorePending = !!manager.needsRankedCheckpointRestore;
  if (!skipStartTiles && !restoredFromSavedState) {
    operations.placeStoneTilesForSetup?.(manager);
    operations.seedInitialTilesAndSnapshotBoard?.(manager);
  }
  return { restoredFromSavedState };
}

export function createSetupRestoreInitialBoardStateRuntime(): SetupRestoreInitialBoardStateRuntime {
  return {
    resolveSetupRestoreAndInitialBoardState
  };
}

export function installSetupRestoreInitialBoardStateRuntime(
  options: SetupRestoreInitialBoardStateRuntimeInstallOptions = {}
): SetupRestoreInitialBoardStateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SetupRestoreInitialBoardStateWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSetupRestoreInitialBoardStateRuntime) {
    target.CoreSetupRestoreInitialBoardStateRuntime = createSetupRestoreInitialBoardStateRuntime();
  }
  return target.CoreSetupRestoreInitialBoardStateRuntime;
}

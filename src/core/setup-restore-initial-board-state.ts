export interface SetupRestoreInitialBoardStateManagerLike {
  needsRankedCheckpointRestore?: boolean;
  rankCheckpointRestorePending?: boolean;
  rankPolicy?: unknown;
  getWindowLike?: () => SetupRestoreInitialBoardStateWindowLike | null;
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
  shouldForceRankedCheckpointRestoreInSetup: typeof shouldForceRankedCheckpointRestoreInSetup;
}

export interface SetupRestoreInitialBoardStateWindowLike {
  CoreSetupRestoreInitialBoardStateRuntime?: SetupRestoreInitialBoardStateRuntime;
  location?: {
    search?: unknown;
  } | null;
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

export function shouldForceRankedCheckpointRestoreInSetup(
  manager: SetupRestoreInitialBoardStateManagerLike | null | undefined
): boolean {
  if (!manager || manager.rankPolicy !== "ranked") return false;
  let search = "";
  try {
    const windowLike = typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
    search = windowLike?.location ? String(windowLike.location.search || "") : "";
  } catch (_error) {
    search = "";
  }
  if (!search) return false;
  try {
    const params = new URLSearchParams(search);
    return params.get("force_ranked_checkpoint") === "1" || params.get("restore_ranked_checkpoint") === "1";
  } catch (_error) {
    return search.includes("force_ranked_checkpoint=1") || search.includes("restore_ranked_checkpoint=1");
  }
}

export function createSetupRestoreInitialBoardStateRuntime(): SetupRestoreInitialBoardStateRuntime {
  return {
    resolveSetupRestoreAndInitialBoardState,
    shouldForceRankedCheckpointRestoreInSetup
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

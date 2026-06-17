export interface SetupStateInitializationManagerLike {
  challengeId?: unknown;
  rankedSessionToken?: unknown;
  needsRankedCheckpointRestore?: boolean;
  getWindowLike?: () => SetupStateInitializationWindowLike | null;
}

export interface SetupStateInitializationWindowLike {
  OnlineLeaderboardRuntime?: {
    scheduleRankedCheckpointRestore?: (
      manager: SetupStateInitializationManagerLike,
      options: { reason: "setup" }
    ) => void;
  } | null;
}

export interface SetupStateInitializationSeedState {
  hasInputSeed: boolean;
  rankedSessionContext?: unknown;
}

export interface SetupStateInitializationRestoreState {
  restoredFromSavedState: boolean;
}

export interface SetupStateInitializationOperations {
  initializeSetupSeedAndReplayState?: (
    manager: SetupStateInitializationManagerLike,
    inputSeed: unknown
  ) => SetupStateInitializationSeedState;
  resetSetupRuntimeState?: (manager: SetupStateInitializationManagerLike) => void;
  resolveSetupChallengeId?: (
    manager: SetupStateInitializationManagerLike,
    normalizedOptions: Record<string, unknown>,
    rankedSessionContext: unknown
  ) => unknown;
  resolveSetupRankedSessionToken?: (rankedSessionContext: unknown) => unknown;
  initializeSetupSessionReplaySnapshot?: (manager: SetupStateInitializationManagerLike) => void;
  initializeTimerMilestones?: (manager: SetupStateInitializationManagerLike) => void;
  resetRoundStatsState?: (manager: SetupStateInitializationManagerLike) => void;
  resetTimerUiForSetup?: (manager: SetupStateInitializationManagerLike) => void;
  resolvePreferredTimerModuleViewForSetup?: (manager: SetupStateInitializationManagerLike) => unknown;
  resolveSetupRestoreAndInitialBoardState?: (
    manager: SetupStateInitializationManagerLike,
    hasInputSeed: boolean,
    normalizedOptions: Record<string, unknown>
  ) => SetupStateInitializationRestoreState;
  syncSetupSessionReplayV1InitTiles?: (manager: SetupStateInitializationManagerLike) => void;
  finalizeSetupUiAndStatsState?: (
    manager: SetupStateInitializationManagerLike,
    preferredTimerModuleView: unknown,
    restoredFromSavedState: boolean
  ) => void;
}

export interface SetupStateInitializationRuntime {
  runSetupStateInitialization: typeof runSetupStateInitialization;
}

export interface SetupStateInitializationRuntimeWindowLike {
  CoreSetupStateInitializationRuntime?: SetupStateInitializationRuntime;
}

export interface SetupStateInitializationRuntimeInstallOptions {
  windowLike?: SetupStateInitializationRuntimeWindowLike | null;
}

function isNonArrayRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function scheduleRankedCheckpointRestoreIfNeeded(manager: SetupStateInitializationManagerLike): void {
  try {
    const windowLike = typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
    if (
      manager.needsRankedCheckpointRestore &&
      windowLike?.OnlineLeaderboardRuntime &&
      typeof windowLike.OnlineLeaderboardRuntime.scheduleRankedCheckpointRestore === "function"
    ) {
      windowLike.OnlineLeaderboardRuntime.scheduleRankedCheckpointRestore(manager, { reason: "setup" });
    }
  } catch (_error) {
    // Legacy setup intentionally ignores checkpoint scheduling failures.
  }
}

export function runSetupStateInitialization(
  manager: SetupStateInitializationManagerLike | null | undefined,
  inputSeed: unknown,
  setupOptions: unknown,
  operations: SetupStateInitializationOperations = {}
): void {
  if (!manager) return;
  const normalizedOptions = isNonArrayRecord(setupOptions) ? setupOptions : {};
  const seedState =
    operations.initializeSetupSeedAndReplayState?.(manager, inputSeed) || {
      hasInputSeed: typeof inputSeed !== "undefined",
      rankedSessionContext: null
    };
  operations.resetSetupRuntimeState?.(manager);
  manager.challengeId = operations.resolveSetupChallengeId?.(
    manager,
    normalizedOptions,
    seedState.rankedSessionContext
  );
  manager.rankedSessionToken = operations.resolveSetupRankedSessionToken?.(seedState.rankedSessionContext);
  operations.initializeSetupSessionReplaySnapshot?.(manager);
  operations.initializeTimerMilestones?.(manager);
  operations.resetRoundStatsState?.(manager);
  operations.resetTimerUiForSetup?.(manager);
  const preferredTimerModuleView = operations.resolvePreferredTimerModuleViewForSetup?.(manager);
  const restoreState =
    operations.resolveSetupRestoreAndInitialBoardState?.(manager, seedState.hasInputSeed, normalizedOptions) || {
      restoredFromSavedState: false
    };
  operations.syncSetupSessionReplayV1InitTiles?.(manager);
  operations.finalizeSetupUiAndStatsState?.(
    manager,
    preferredTimerModuleView,
    restoreState.restoredFromSavedState
  );
  scheduleRankedCheckpointRestoreIfNeeded(manager);
}

export function createSetupStateInitializationRuntime(): SetupStateInitializationRuntime {
  return {
    runSetupStateInitialization
  };
}

export function installSetupStateInitializationRuntime(
  options: SetupStateInitializationRuntimeInstallOptions = {}
): SetupStateInitializationRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SetupStateInitializationRuntimeWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSetupStateInitializationRuntime) {
    target.CoreSetupStateInitializationRuntime = createSetupStateInitializationRuntime();
  }
  return target.CoreSetupStateInitializationRuntime;
}

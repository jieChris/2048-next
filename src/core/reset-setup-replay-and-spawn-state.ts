export interface ResetSetupReplayAndSpawnStateManagerLike {
  moveHistory?: unknown;
  replayCompactLog?: unknown;
  initialBoardMatrix?: unknown;
  replayStartBoardMatrix?: unknown;
  rescueReplayString?: unknown;
  lastReplayStringSavedAt?: unknown;
  rankedSessionToken?: unknown;
  clientRecordId?: unknown;
  sessionSubmitDone?: unknown;
  needsRankedCheckpointRestore?: unknown;
  rankCheckpointRestorePending?: unknown;
  rankCheckpointRestoreScheduled?: unknown;
  rankCheckpointApplying?: unknown;
  rankCheckpointSaveConflict?: unknown;
  lastRankedCheckpointSignature?: unknown;
  lastRankedCheckpointSavedAt?: unknown;
  lastRankedCheckpointSaveError?: unknown;
  lastSpawn?: unknown;
  forcedSpawn?: unknown;
  spawnSequenceVersion?: unknown;
}

export interface ResetSetupReplayAndSpawnStateOperations {
  assignManagerClientRecordId?: (
    manager: ResetSetupReplayAndSpawnStateManagerLike,
    value: string
  ) => void;
}

export interface ResetSetupReplayAndSpawnStateRuntime {
  resetSetupReplayAndSpawnState: typeof resetSetupReplayAndSpawnState;
}

export interface ResetSetupReplayAndSpawnStateWindowLike {
  CoreResetSetupReplayAndSpawnStateRuntime?: ResetSetupReplayAndSpawnStateRuntime;
}

export interface ResetSetupReplayAndSpawnStateRuntimeInstallOptions {
  windowLike?: ResetSetupReplayAndSpawnStateWindowLike | null;
}

export function resetSetupReplayAndSpawnState(
  manager: ResetSetupReplayAndSpawnStateManagerLike | null | undefined,
  operations: ResetSetupReplayAndSpawnStateOperations = {}
): void {
  if (!manager) return;
  manager.moveHistory = [];
  manager.replayCompactLog = "";
  manager.initialBoardMatrix = null;
  manager.replayStartBoardMatrix = null;
  manager.rescueReplayString = "";
  manager.lastReplayStringSavedAt = 0;
  manager.rankedSessionToken = "";
  manager.spawnSequenceVersion = 1;
  if (typeof operations.assignManagerClientRecordId === "function") {
    operations.assignManagerClientRecordId(manager, "");
  } else {
    manager.clientRecordId = "";
  }
  manager.sessionSubmitDone = false;
  manager.needsRankedCheckpointRestore = false;
  manager.rankCheckpointRestorePending = false;
  manager.rankCheckpointRestoreScheduled = false;
  manager.rankCheckpointApplying = false;
  manager.rankCheckpointSaveConflict = "";
  manager.lastRankedCheckpointSignature = "";
  manager.lastRankedCheckpointSavedAt = 0;
  manager.lastRankedCheckpointSaveError = "";
  manager.lastSpawn = null;
  manager.forcedSpawn = null;
}

export function createResetSetupReplayAndSpawnStateRuntime(): ResetSetupReplayAndSpawnStateRuntime {
  return {
    resetSetupReplayAndSpawnState
  };
}

export function installResetSetupReplayAndSpawnStateRuntime(
  options: ResetSetupReplayAndSpawnStateRuntimeInstallOptions = {}
): ResetSetupReplayAndSpawnStateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as ResetSetupReplayAndSpawnStateWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreResetSetupReplayAndSpawnStateRuntime) {
    target.CoreResetSetupReplayAndSpawnStateRuntime = createResetSetupReplayAndSpawnStateRuntime();
  }
  return target.CoreResetSetupReplayAndSpawnStateRuntime;
}

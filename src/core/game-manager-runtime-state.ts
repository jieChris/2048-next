export interface GameManagerRuntimeStateManagerLike {
  startTiles?: number;
  maxTile?: number;
  mode?: unknown;
  modeConfig?: unknown;
  ruleset?: string;
  rankedBucket?: string;
  disableSessionSync?: boolean;
  spawnTable?: Array<{ value: number; weight: number }>;
  sessionSubmitDone?: boolean;
  sessionReplayV3?: unknown;
  timerModuleView?: string;
  timerLeaderboardLoadId?: number;
  timerModuleBaseHeight?: number;
  timerUpdateIntervalMs?: number;
  lastStatsPanelUpdateAt?: number;
  pendingMoveInput?: unknown;
  moveInputFlushScheduled?: boolean;
  lastMoveInputAt?: number;
  allowedDirections?: number[];
  allowedDirectionSet?: Record<string, boolean>;
  stoneCellsList?: unknown[];
  stoneValueSet?: Record<string, unknown>;
  itemModeRules?: unknown;
  itemInventory?: unknown;
  itemProgress?: number;
  nextSpawnSuppressed?: boolean;
  nextSpawnValueOverride?: unknown;
  moveTimeoutMs?: number | null;
  moveDeadlineAt?: number | null;
  practiceRestartBoardMatrix?: unknown;
  practiceRestartModeConfig?: unknown;
  noXTriggered?: boolean;
  noXTriggeredTile?: unknown;
  noXSelectionPending?: boolean;
  noXPendingDefaultTarget?: unknown;
  timerFrozen?: boolean;
  clientRecordId?: string;
  needsRankedCheckpointRestore?: boolean;
  rankCheckpointRestorePending?: boolean;
  rankCheckpointRestoreScheduled?: boolean;
  rankCheckpointApplying?: boolean;
  rankCheckpointSaveConflict?: string;
  lastRankedCheckpointSignature?: string;
  lastRankedCheckpointSavedAt?: number;
  lastRankedCheckpointSaveError?: string;
  singleModePageLockState?: unknown;
}

export interface GameManagerRuntimeStateOperations {
  detectMode?: (manager: GameManagerRuntimeStateManagerLike) => unknown;
  createEmptyItemInventory?: () => unknown;
}

export interface GameManagerRuntimeStateRuntime {
  initializeGameManagerRuntimeState: typeof initializeGameManagerRuntimeState;
}

export interface GameManagerRuntimeStateWindowLike {
  CoreGameManagerRuntimeStateRuntime?: GameManagerRuntimeStateRuntime;
}

export interface GameManagerRuntimeStateRuntimeInstallOptions {
  windowLike?: GameManagerRuntimeStateWindowLike | null;
}

export function initializeGameManagerRuntimeState(
  manager: GameManagerRuntimeStateManagerLike | null | undefined,
  operations: GameManagerRuntimeStateOperations = {}
): void {
  if (!manager) return;
  manager.startTiles = 2;
  manager.maxTile = Infinity;
  manager.mode = operations.detectMode?.(manager);
  manager.modeConfig = null;
  manager.ruleset = "pow2";
  manager.rankedBucket = "none";
  manager.disableSessionSync = false;
  manager.spawnTable = [
    { value: 2, weight: 90 },
    { value: 4, weight: 10 }
  ];
  manager.sessionSubmitDone = false;
  manager.sessionReplayV3 = null;
  manager.timerModuleView = "timer";
  manager.timerLeaderboardLoadId = 0;
  manager.timerModuleBaseHeight = 0;
  manager.timerUpdateIntervalMs = 33;
  manager.lastStatsPanelUpdateAt = 0;
  manager.pendingMoveInput = null;
  manager.moveInputFlushScheduled = false;
  manager.lastMoveInputAt = 0;
  manager.allowedDirections = [0, 1, 2, 3];
  manager.allowedDirectionSet = { "0": true, "1": true, "2": true, "3": true };
  manager.stoneCellsList = [];
  manager.stoneValueSet = {};
  manager.itemModeRules = null;
  manager.itemInventory = operations.createEmptyItemInventory?.() ?? {};
  manager.itemProgress = 0;
  manager.nextSpawnSuppressed = false;
  manager.nextSpawnValueOverride = null;
  manager.moveTimeoutMs = null;
  manager.moveDeadlineAt = null;
  manager.practiceRestartBoardMatrix = null;
  manager.practiceRestartModeConfig = null;
  manager.noXTriggered = false;
  manager.noXTriggeredTile = null;
  manager.noXSelectionPending = false;
  manager.noXPendingDefaultTarget = null;
  manager.timerFrozen = false;
  manager.clientRecordId = "";
  manager.needsRankedCheckpointRestore = false;
  manager.rankCheckpointRestorePending = false;
  manager.rankCheckpointRestoreScheduled = false;
  manager.rankCheckpointApplying = false;
  manager.rankCheckpointSaveConflict = "";
  manager.lastRankedCheckpointSignature = "";
  manager.lastRankedCheckpointSavedAt = 0;
  manager.lastRankedCheckpointSaveError = "";
  manager.singleModePageLockState = null;
}

export function createGameManagerRuntimeStateRuntime(): GameManagerRuntimeStateRuntime {
  return {
    initializeGameManagerRuntimeState
  };
}

export function installGameManagerRuntimeStateRuntime(
  options: GameManagerRuntimeStateRuntimeInstallOptions = {}
): GameManagerRuntimeStateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerRuntimeStateWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerRuntimeStateRuntime) {
    target.CoreGameManagerRuntimeStateRuntime = createGameManagerRuntimeStateRuntime();
  }
  return target.CoreGameManagerRuntimeStateRuntime;
}

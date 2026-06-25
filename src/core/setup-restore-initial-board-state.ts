export interface SetupRestoreInitialBoardStateManagerLike {
  challengeId?: unknown;
  initialSeed?: unknown;
  needsRankedCheckpointRestore?: boolean;
  rankCheckpointRestorePending?: boolean;
  rankedSessionToken?: unknown;
  mode?: unknown;
  modeKey?: unknown;
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
  GAME_CHALLENGE_CONTEXT?: unknown;
  location?: {
    search?: unknown;
  } | null;
}

export interface SetupRestoreInitialBoardStateRuntimeInstallOptions {
  windowLike?: SetupRestoreInitialBoardStateWindowLike | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSeed(value: unknown): number | null {
  const seed = Math.floor(Number(value));
  return Number.isSafeInteger(seed) && seed >= 0 ? seed : null;
}

function resolveManagerModeKey(manager: SetupRestoreInitialBoardStateManagerLike): string {
  return normalizeText(manager.modeKey) || normalizeText(manager.mode);
}

function resolveWindowChallengeContext(
  manager: SetupRestoreInitialBoardStateManagerLike
): Record<string, unknown> | null {
  try {
    const windowLike = typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
    return isRecord(windowLike?.GAME_CHALLENGE_CONTEXT) ? windowLike.GAME_CHALLENGE_CONTEXT : null;
  } catch (_error) {
    return null;
  }
}

function resolveCurrentRankedToken(
  manager: SetupRestoreInitialBoardStateManagerLike,
  context: Record<string, unknown> | null
): string {
  return normalizeText(manager.rankedSessionToken) || normalizeText(context?.ranked_session_token);
}

function resolveCurrentRankedChallengeId(
  manager: SetupRestoreInitialBoardStateManagerLike,
  context: Record<string, unknown> | null
): string {
  return (
    normalizeText(manager.challengeId) ||
    normalizeText(context?.id) ||
    normalizeText(context?.challenge_id)
  );
}

function resolveCurrentRankedSeed(
  manager: SetupRestoreInitialBoardStateManagerLike,
  context: Record<string, unknown> | null
): number | null {
  const managerSeed = normalizeSeed(manager.initialSeed);
  if (managerSeed !== null) return managerSeed;
  return normalizeSeed(context?.seed);
}

function isRankedLocalMirrorSavedStateValidForRestore(
  manager: SetupRestoreInitialBoardStateManagerLike,
  savedState: unknown
): boolean {
  if (manager.rankPolicy !== "ranked") return true;
  if (!isRecord(savedState)) return false;
  const context = resolveWindowChallengeContext(manager);
  const managerModeKey = resolveManagerModeKey(manager);
  const savedModeKey = normalizeText(savedState.mode_key);
  if (managerModeKey && savedModeKey && savedModeKey !== managerModeKey) return false;

  const currentToken = resolveCurrentRankedToken(manager, context);
  const savedToken = normalizeText(savedState.ranked_session_token);
  if (!currentToken || !savedToken || currentToken !== savedToken) return false;

  const currentChallengeId = resolveCurrentRankedChallengeId(manager, context);
  const savedChallengeId = normalizeText(savedState.challenge_id);
  if (!currentChallengeId || !savedChallengeId || currentChallengeId !== savedChallengeId) return false;

  const currentSeed = resolveCurrentRankedSeed(manager, context);
  const savedSeed = normalizeSeed(savedState.initial_seed);
  if (currentSeed === null || savedSeed === null) return false;
  return currentSeed === savedSeed;
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
    if (
      rankedLocalMirrorSavedState &&
      typeof operations.applySavedStateRestore === "function" &&
      isRankedLocalMirrorSavedStateValidForRestore(manager, rankedLocalMirrorSavedState)
    ) {
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

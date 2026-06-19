export interface GameManagerRedoRestoreStateFallback {
  comboStreak: number;
  successfulMoveCount: number;
  lockConsumedAtMoveCount: number;
  lockedDirectionTurn: number;
  lockedDirection: number;
  undoUsed: number;
}

export interface GameManagerRedoRestoreStateManager {
  timerStatus: unknown;
  getUndoStateFallbackValues: () => GameManagerRedoRestoreStateFallback;
  normalizeUndoStackEntry: (entry: unknown) => Partial<GameManagerRedoRestoreStateFallback> | null;
}

export interface GameManagerRedoRestoreState extends GameManagerRedoRestoreStateFallback {
  over: false;
  won: false;
  keepPlaying: false;
  shouldClearMessage: true;
  shouldStartTimer: boolean;
}

export interface GameManagerRedoRestoreStateRuntime {
  buildRedoRestoreState: typeof buildRedoRestoreState;
}

export interface GameManagerRedoRestoreStateWindowLike {
  CoreGameManagerRedoRestoreStateRuntime?: GameManagerRedoRestoreStateRuntime;
}

export interface GameManagerRedoRestoreStateRuntimeInstallOptions {
  windowLike?: GameManagerRedoRestoreStateWindowLike | null;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

function normalizeInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) ? Number(value) : fallback;
}

export function buildRedoRestoreState(
  manager: GameManagerRedoRestoreStateManager,
  entry: unknown
): GameManagerRedoRestoreState {
  const fallback = manager.getUndoStateFallbackValues();
  const source = manager.normalizeUndoStackEntry(entry) || fallback;
  return {
    comboStreak: normalizeNonNegativeInteger(source.comboStreak, fallback.comboStreak),
    successfulMoveCount: normalizeNonNegativeInteger(
      source.successfulMoveCount,
      fallback.successfulMoveCount
    ),
    lockConsumedAtMoveCount: normalizeInteger(
      source.lockConsumedAtMoveCount,
      fallback.lockConsumedAtMoveCount
    ),
    lockedDirectionTurn: normalizeInteger(source.lockedDirectionTurn, fallback.lockedDirectionTurn),
    lockedDirection: normalizeInteger(source.lockedDirection, fallback.lockedDirection),
    undoUsed: normalizeNonNegativeInteger(source.undoUsed, fallback.undoUsed),
    over: false,
    won: false,
    keepPlaying: false,
    shouldClearMessage: true,
    shouldStartTimer: manager.timerStatus === 0
  };
}

export function createGameManagerRedoRestoreStateRuntime(): GameManagerRedoRestoreStateRuntime {
  return {
    buildRedoRestoreState
  };
}

export function installGameManagerRedoRestoreStateRuntime(
  options: GameManagerRedoRestoreStateRuntimeInstallOptions = {}
): GameManagerRedoRestoreStateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerRedoRestoreStateWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerRedoRestoreStateRuntime) {
    target.CoreGameManagerRedoRestoreStateRuntime = createGameManagerRedoRestoreStateRuntime();
  }
  return target.CoreGameManagerRedoRestoreStateRuntime;
}

export interface GameManagerNormalizedUndoEntryResult {
  score: unknown;
  tiles: Record<string, unknown>[];
  comboStreak: unknown;
  successfulMoveCount: unknown;
  lockConsumedAtMoveCount: unknown;
  lockedDirectionTurn: unknown;
  lockedDirection: unknown;
  undoUsed: unknown;
  motionMap: Record<string, { x: number; y: number }> | null;
}

export interface GameManagerNormalizedUndoEntryRuntime {
  createNormalizedUndoStackEntry: typeof createNormalizedUndoStackEntry;
}

export interface GameManagerNormalizedUndoEntryWindowLike {
  CoreGameManagerNormalizedUndoEntryRuntime?: GameManagerNormalizedUndoEntryRuntime;
}

export interface GameManagerNormalizedUndoEntryRuntimeInstallOptions {
  windowLike?: GameManagerNormalizedUndoEntryWindowLike | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeFiniteNumberOrFallback(value: unknown, fallbackValue: unknown): unknown {
  return typeof value === "number" && Number.isFinite(value) ? value : fallbackValue;
}

function normalizeIntegerOrFallback(value: unknown, fallbackValue: unknown): unknown {
  return Number.isInteger(value) ? value : fallbackValue;
}

function normalizeNonNegativeIntegerOrFallback(value: unknown, fallbackValue: unknown): unknown {
  return Number.isInteger(value) && Number(value) >= 0 ? value : fallbackValue;
}

function normalizeUndoPositionMap(value: unknown): Record<string, { x: number; y: number }> | null {
  if (!isRecord(value)) return null;
  const map: Record<string, { x: number; y: number }> = {};
  let hasEntry = false;
  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    if (!Number.isInteger(entry.x) || !Number.isInteger(entry.y)) continue;
    map[key] = { x: Number(entry.x), y: Number(entry.y) };
    hasEntry = true;
  }
  return hasEntry ? map : null;
}

export function createNormalizedUndoStackEntry(
  _manager: unknown,
  source: Record<string, unknown>,
  fallbackState: Record<string, unknown>,
  tiles: Record<string, unknown>[],
  motionMap: unknown
): GameManagerNormalizedUndoEntryResult {
  return {
    score: normalizeFiniteNumberOrFallback(source.score, fallbackState.score),
    tiles,
    comboStreak: normalizeNonNegativeIntegerOrFallback(source.comboStreak, fallbackState.comboStreak),
    successfulMoveCount: normalizeNonNegativeIntegerOrFallback(
      source.successfulMoveCount,
      fallbackState.successfulMoveCount
    ),
    lockConsumedAtMoveCount: normalizeIntegerOrFallback(
      source.lockConsumedAtMoveCount,
      fallbackState.lockConsumedAtMoveCount
    ),
    lockedDirectionTurn: normalizeIntegerOrFallback(source.lockedDirectionTurn, fallbackState.lockedDirectionTurn),
    lockedDirection: normalizeIntegerOrFallback(source.lockedDirection, fallbackState.lockedDirection),
    undoUsed: normalizeNonNegativeIntegerOrFallback(source.undoUsed, fallbackState.undoUsed),
    motionMap: normalizeUndoPositionMap(motionMap)
  };
}

export function createGameManagerNormalizedUndoEntryRuntime(): GameManagerNormalizedUndoEntryRuntime {
  return {
    createNormalizedUndoStackEntry
  };
}

export function installGameManagerNormalizedUndoEntryRuntime(
  options: GameManagerNormalizedUndoEntryRuntimeInstallOptions = {}
): GameManagerNormalizedUndoEntryRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerNormalizedUndoEntryWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerNormalizedUndoEntryRuntime) {
    target.CoreGameManagerNormalizedUndoEntryRuntime = createGameManagerNormalizedUndoEntryRuntime();
  }
  return target.CoreGameManagerNormalizedUndoEntryRuntime;
}

export interface SavedStatePersistTimestampTarget {
  lastSavedGameStateAt?: unknown;
  lastSavedGameStateFullAttemptAt?: unknown;
  lastSavedGameStateFullAt?: unknown;
}

export interface SavedStatePersistTimestampContext {
  now?: unknown;
  hasFullPayload?: unknown;
  persistedFull?: unknown;
}

export interface SavedStatePersistTimestampsRuntime {
  applySavedStatePersistTimestamps: typeof applySavedStatePersistTimestamps;
}

export interface SavedStatePersistTimestampsWindowLike {
  CoreSavedStatePersistTimestampsRuntime?: SavedStatePersistTimestampsRuntime;
}

export interface SavedStatePersistTimestampsRuntimeInstallOptions {
  windowLike?: SavedStatePersistTimestampsWindowLike | null;
}

function normalizePersistTimestamp(value: unknown): number | null {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? Math.floor(timestamp) : null;
}

export function applySavedStatePersistTimestamps(
  target: SavedStatePersistTimestampTarget | null | undefined,
  context: SavedStatePersistTimestampContext = {}
): void {
  if (!target) return;
  const now = normalizePersistTimestamp(context.now);
  if (now === null) return;
  target.lastSavedGameStateAt = now;
  if (context.hasFullPayload) {
    target.lastSavedGameStateFullAttemptAt = now;
  }
  if (context.persistedFull) {
    target.lastSavedGameStateFullAt = now;
  }
}

export function createSavedStatePersistTimestampsRuntime(): SavedStatePersistTimestampsRuntime {
  return {
    applySavedStatePersistTimestamps
  };
}

export function installSavedStatePersistTimestampsRuntime(
  options: SavedStatePersistTimestampsRuntimeInstallOptions = {}
): SavedStatePersistTimestampsRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SavedStatePersistTimestampsWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSavedStatePersistTimestampsRuntime) {
    target.CoreSavedStatePersistTimestampsRuntime = createSavedStatePersistTimestampsRuntime();
  }
  return target.CoreSavedStatePersistTimestampsRuntime;
}

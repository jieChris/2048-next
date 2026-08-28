export interface SavedManagerProgressStateTarget {
  comboStreak?: unknown;
  successfulMoveCount?: unknown;
  undoUsed?: unknown;
  validInputCount?: unknown;
  invalidInputCount?: unknown;
  moveHistory?: unknown;
  lockConsumedAtMoveCount?: unknown;
  lockedDirectionTurn?: unknown;
  lockedDirection?: unknown;
}

export interface SavedManagerProgressStateSource {
  combo_streak?: unknown;
  successful_move_count?: unknown;
  undo_used?: unknown;
  valid_input_count?: unknown;
  invalid_input_count?: unknown;
  lock_consumed_at_move_count?: unknown;
  locked_direction_turn?: unknown;
  locked_direction?: unknown;
}

export interface SavedManagerProgressStateRuntime {
  applySavedManagerProgressState: typeof applySavedManagerProgressState;
}

export interface SavedManagerProgressStateWindowLike {
  CoreSavedManagerProgressStateRuntime?: SavedManagerProgressStateRuntime;
}

export interface SavedManagerProgressStateRuntimeInstallOptions {
  windowLike?: SavedManagerProgressStateWindowLike | null;
}

function integerOrDefault(value: unknown, fallback: number): number {
  return Number.isInteger(value) ? Number(value) : fallback;
}

function nullableInteger(value: unknown): number | null {
  return Number.isInteger(value) ? Number(value) : null;
}

function deriveProgressCounts(moveHistory: unknown): {
  successfulMoveCount: number;
  undoUsed: number;
} {
  const counts = { successfulMoveCount: 0, undoUsed: 0 };
  if (!Array.isArray(moveHistory)) return counts;
  for (const entry of moveHistory) {
    const direction = Math.floor(Number(entry));
    if (!Number.isInteger(direction)) continue;
    if (direction < 0) counts.undoUsed += 1;
    else counts.successfulMoveCount += 1;
  }
  return counts;
}

export function applySavedManagerProgressState(
  manager: SavedManagerProgressStateTarget | null | undefined,
  saved: SavedManagerProgressStateSource | null | undefined,
): void {
  if (!manager) return;
  const source = saved || {};
  manager.comboStreak = integerOrDefault(source.combo_streak, 0);
  manager.successfulMoveCount = integerOrDefault(
    source.successful_move_count,
    0,
  );
  manager.undoUsed = integerOrDefault(source.undo_used, 0);
  manager.validInputCount = integerOrDefault(source.valid_input_count, 0);
  manager.invalidInputCount = integerOrDefault(source.invalid_input_count, 0);
  if (manager.successfulMoveCount === 0 && manager.undoUsed === 0) {
    const derived = deriveProgressCounts(manager.moveHistory);
    if (derived.successfulMoveCount > 0 || derived.undoUsed > 0) {
      manager.successfulMoveCount = derived.successfulMoveCount;
      manager.undoUsed = derived.undoUsed;
    }
  }
  manager.lockConsumedAtMoveCount = integerOrDefault(
    source.lock_consumed_at_move_count,
    -1,
  );
  manager.lockedDirectionTurn = nullableInteger(source.locked_direction_turn);
  manager.lockedDirection = nullableInteger(source.locked_direction);
}

export function createSavedManagerProgressStateRuntime(): SavedManagerProgressStateRuntime {
  return {
    applySavedManagerProgressState,
  };
}

export function installSavedManagerProgressStateRuntime(
  options: SavedManagerProgressStateRuntimeInstallOptions = {},
): SavedManagerProgressStateRuntime | null {
  let target = options.windowLike;
  if (target === undefined) {
    if (typeof window === "undefined") return null;
    // SAFETY: this runtime is published on the browser Window namespace.
    target = window as unknown as SavedManagerProgressStateWindowLike;
  }
  if (!target) return null;
  if (!target.CoreSavedManagerProgressStateRuntime) {
    target.CoreSavedManagerProgressStateRuntime =
      createSavedManagerProgressStateRuntime();
  }
  return target.CoreSavedManagerProgressStateRuntime;
}

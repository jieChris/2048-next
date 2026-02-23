export interface UndoStackEntryInput {
  entry: Record<string, unknown> | null | undefined;
  fallbackScore: number;
  fallbackComboStreak: number;
  fallbackSuccessfulMoveCount: number;
  fallbackLockConsumedAtMoveCount: number;
  fallbackLockedDirectionTurn: number | null;
  fallbackLockedDirection: number | null;
  fallbackUndoUsed: number;
}

export interface UndoStackEntryResult {
  score: number;
  tiles: Record<string, unknown>[];
  comboStreak: number;
  successfulMoveCount: number;
  lockConsumedAtMoveCount: number;
  lockedDirectionTurn: number | null;
  lockedDirection: number | null;
  undoUsed: number;
}

export function normalizeUndoStackEntry(input: UndoStackEntryInput): UndoStackEntryResult {
  const source = input.entry && typeof input.entry === "object" ? input.entry : {};

  const score =
    Number.isFinite(source.score) && typeof source.score === "number"
      ? Number(source.score)
      : Number.isFinite(input.fallbackScore)
        ? Number(input.fallbackScore)
        : 0;

  const rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
  const tiles: Record<string, unknown>[] = [];
  for (let i = 0; i < rawTiles.length; i += 1) {
    const item = rawTiles[i];
    if (!item || typeof item !== "object") continue;
    tiles.push(item as Record<string, unknown>);
  }

  const comboStreak =
    Number.isInteger(source.comboStreak) && Number(source.comboStreak) >= 0
      ? Number(source.comboStreak)
      : Number.isInteger(input.fallbackComboStreak) && Number(input.fallbackComboStreak) >= 0
        ? Number(input.fallbackComboStreak)
        : 0;

  const successfulMoveCount =
    Number.isInteger(source.successfulMoveCount) && Number(source.successfulMoveCount) >= 0
      ? Number(source.successfulMoveCount)
      : Number.isInteger(input.fallbackSuccessfulMoveCount) &&
          Number(input.fallbackSuccessfulMoveCount) >= 0
        ? Number(input.fallbackSuccessfulMoveCount)
        : 0;

  const lockConsumedAtMoveCount =
    Number.isInteger(source.lockConsumedAtMoveCount)
      ? Number(source.lockConsumedAtMoveCount)
      : Number.isInteger(input.fallbackLockConsumedAtMoveCount)
        ? Number(input.fallbackLockConsumedAtMoveCount)
        : -1;

  const lockedDirectionTurn =
    Number.isInteger(source.lockedDirectionTurn)
      ? Number(source.lockedDirectionTurn)
      : Number.isInteger(input.fallbackLockedDirectionTurn)
        ? Number(input.fallbackLockedDirectionTurn)
        : null;

  const lockedDirection =
    Number.isInteger(source.lockedDirection)
      ? Number(source.lockedDirection)
      : Number.isInteger(input.fallbackLockedDirection)
        ? Number(input.fallbackLockedDirection)
        : null;

  const undoUsed =
    Number.isInteger(source.undoUsed) && Number(source.undoUsed) >= 0
      ? Number(source.undoUsed)
      : Number.isInteger(input.fallbackUndoUsed) && Number(input.fallbackUndoUsed) >= 0
        ? Number(input.fallbackUndoUsed)
        : 0;

  return {
    score,
    tiles,
    comboStreak,
    successfulMoveCount,
    lockConsumedAtMoveCount,
    lockedDirectionTurn,
    lockedDirection,
    undoUsed
  };
}

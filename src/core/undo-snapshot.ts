export interface UndoSnapshotInput {
  score: number;
  comboStreak: number;
  successfulMoveCount: number;
  lockConsumedAtMoveCount: number;
  lockedDirectionTurn: number | null;
  lockedDirection: number | null;
  undoUsed: number;
}

export interface UndoSnapshotResult {
  score: number;
  tiles: unknown[];
  comboStreak: number;
  successfulMoveCount: number;
  lockConsumedAtMoveCount: number;
  lockedDirectionTurn: number | null;
  lockedDirection: number | null;
  undoUsed: number;
}

export function createUndoSnapshot(input: UndoSnapshotInput): UndoSnapshotResult {
  return {
    score: Number.isFinite(input.score) ? Number(input.score) : 0,
    tiles: [],
    comboStreak:
      Number.isInteger(input.comboStreak) && Number(input.comboStreak) >= 0
        ? Number(input.comboStreak)
        : 0,
    successfulMoveCount:
      Number.isInteger(input.successfulMoveCount) && Number(input.successfulMoveCount) >= 0
        ? Number(input.successfulMoveCount)
        : 0,
    lockConsumedAtMoveCount: Number.isInteger(input.lockConsumedAtMoveCount)
      ? Number(input.lockConsumedAtMoveCount)
      : -1,
    lockedDirectionTurn: Number.isInteger(input.lockedDirectionTurn)
      ? Number(input.lockedDirectionTurn)
      : null,
    lockedDirection: Number.isInteger(input.lockedDirection)
      ? Number(input.lockedDirection)
      : null,
    undoUsed:
      Number.isInteger(input.undoUsed) && Number(input.undoUsed) >= 0
        ? Number(input.undoUsed)
        : 0
  };
}

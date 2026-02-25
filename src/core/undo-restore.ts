export interface UndoRestoreInput {
  prev: Record<string, unknown> | null | undefined;
  fallbackUndoUsed: number;
  timerStatus: number;
}

export interface UndoRestoreResult {
  comboStreak: number;
  successfulMoveCount: number;
  lockConsumedAtMoveCount: number;
  lockedDirectionTurn: number | null;
  lockedDirection: number | null;
  undoUsed: number;
  over: boolean;
  won: boolean;
  keepPlaying: boolean;
  shouldClearMessage: boolean;
  shouldStartTimer: boolean;
}

export function computeUndoRestoreState(input: UndoRestoreInput): UndoRestoreResult {
  const source = input.prev && typeof input.prev === "object" ? input.prev : {};
  const fallbackUndoUsed =
    Number.isInteger(input.fallbackUndoUsed) && Number(input.fallbackUndoUsed) >= 0
      ? Number(input.fallbackUndoUsed)
      : 0;
  const undoBase =
    Number.isInteger(source.undoUsed) && Number(source.undoUsed) >= 0
      ? Number(source.undoUsed)
      : fallbackUndoUsed;

  return {
    comboStreak:
      Number.isInteger(source.comboStreak) && Number(source.comboStreak) >= 0
        ? Number(source.comboStreak)
        : 0,
    successfulMoveCount:
      Number.isInteger(source.successfulMoveCount) && Number(source.successfulMoveCount) >= 0
        ? Number(source.successfulMoveCount)
        : 0,
    lockConsumedAtMoveCount: Number.isInteger(source.lockConsumedAtMoveCount)
      ? Number(source.lockConsumedAtMoveCount)
      : -1,
    lockedDirectionTurn: Number.isInteger(source.lockedDirectionTurn)
      ? Number(source.lockedDirectionTurn)
      : null,
    lockedDirection: Number.isInteger(source.lockedDirection)
      ? Number(source.lockedDirection)
      : null,
    undoUsed: undoBase + 1,
    over: false,
    won: false,
    keepPlaying: false,
    shouldClearMessage: true,
    shouldStartTimer: Number(input.timerStatus) === 0
  };
}

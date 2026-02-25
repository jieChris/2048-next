import { describe, expect, it } from "vitest";

import { computeUndoRestoreState } from "../../src/core/undo-restore";

describe("core undo restore: computeUndoRestoreState", () => {
  it("restores valid snapshot values and increments undo counter", () => {
    const result = computeUndoRestoreState({
      prev: {
        comboStreak: 4,
        successfulMoveCount: 11,
        lockConsumedAtMoveCount: 7,
        lockedDirectionTurn: 9,
        lockedDirection: 2,
        undoUsed: 3
      },
      fallbackUndoUsed: 8,
      timerStatus: 1
    });

    expect(result).toEqual({
      comboStreak: 4,
      successfulMoveCount: 11,
      lockConsumedAtMoveCount: 7,
      lockedDirectionTurn: 9,
      lockedDirection: 2,
      undoUsed: 4,
      over: false,
      won: false,
      keepPlaying: false,
      shouldClearMessage: true,
      shouldStartTimer: false
    });
  });

  it("falls back to safe defaults for invalid snapshot values", () => {
    const result = computeUndoRestoreState({
      prev: {
        comboStreak: -1,
        successfulMoveCount: null,
        lockConsumedAtMoveCount: "x",
        lockedDirectionTurn: "x",
        lockedDirection: "x",
        undoUsed: null
      },
      fallbackUndoUsed: 5,
      timerStatus: 0
    });

    expect(result).toEqual({
      comboStreak: 0,
      successfulMoveCount: 0,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      undoUsed: 6,
      over: false,
      won: false,
      keepPlaying: false,
      shouldClearMessage: true,
      shouldStartTimer: true
    });
  });

  it("handles null snapshot and invalid fallback undo counter", () => {
    const result = computeUndoRestoreState({
      prev: null,
      fallbackUndoUsed: -10,
      timerStatus: Number.NaN
    });

    expect(result.undoUsed).toBe(1);
    expect(result.comboStreak).toBe(0);
    expect(result.successfulMoveCount).toBe(0);
    expect(result.lockConsumedAtMoveCount).toBe(-1);
    expect(result.lockedDirectionTurn).toBeNull();
    expect(result.lockedDirection).toBeNull();
    expect(result.shouldStartTimer).toBe(false);
  });
});

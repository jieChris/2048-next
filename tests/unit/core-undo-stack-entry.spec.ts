import { describe, expect, it } from "vitest";

import { normalizeUndoStackEntry } from "../../src/core/undo-stack-entry";

describe("core undo stack entry: normalizeUndoStackEntry", () => {
  it("keeps valid entry fields", () => {
    const result = normalizeUndoStackEntry({
      entry: {
        score: 100,
        tiles: [{ x: 0 }, { x: 1 }],
        comboStreak: 2,
        successfulMoveCount: 8,
        lockConsumedAtMoveCount: 7,
        lockedDirectionTurn: 8,
        lockedDirection: 3,
        undoUsed: 5
      },
      fallbackScore: 0,
      fallbackComboStreak: 0,
      fallbackSuccessfulMoveCount: 0,
      fallbackLockConsumedAtMoveCount: -1,
      fallbackLockedDirectionTurn: null,
      fallbackLockedDirection: null,
      fallbackUndoUsed: 0
    });

    expect(result).toEqual({
      score: 100,
      tiles: [{ x: 0 }, { x: 1 }],
      comboStreak: 2,
      successfulMoveCount: 8,
      lockConsumedAtMoveCount: 7,
      lockedDirectionTurn: 8,
      lockedDirection: 3,
      undoUsed: 5
    });
  });

  it("falls back for invalid fields and filters non-object tiles", () => {
    const result = normalizeUndoStackEntry({
      entry: {
        score: null,
        tiles: [null, 0, "x", { y: 2 }],
        comboStreak: -1,
        successfulMoveCount: "x",
        lockConsumedAtMoveCount: "x",
        lockedDirectionTurn: "x",
        lockedDirection: "x",
        undoUsed: -1
      },
      fallbackScore: 11,
      fallbackComboStreak: 1,
      fallbackSuccessfulMoveCount: 2,
      fallbackLockConsumedAtMoveCount: 3,
      fallbackLockedDirectionTurn: 4,
      fallbackLockedDirection: 5,
      fallbackUndoUsed: 6
    });

    expect(result).toEqual({
      score: 11,
      tiles: [{ y: 2 }],
      comboStreak: 1,
      successfulMoveCount: 2,
      lockConsumedAtMoveCount: 3,
      lockedDirectionTurn: 4,
      lockedDirection: 5,
      undoUsed: 6
    });
  });
});

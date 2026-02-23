import { describe, expect, it } from "vitest";

import { createUndoSnapshot } from "../../src/core/undo-snapshot";

describe("core undo snapshot: createUndoSnapshot", () => {
  it("creates snapshot with normalized counters and empty tiles", () => {
    const result = createUndoSnapshot({
      score: 1234,
      comboStreak: 2,
      successfulMoveCount: 8,
      lockConsumedAtMoveCount: 7,
      lockedDirectionTurn: 8,
      lockedDirection: 3,
      undoUsed: 5
    });

    expect(result).toEqual({
      score: 1234,
      tiles: [],
      comboStreak: 2,
      successfulMoveCount: 8,
      lockConsumedAtMoveCount: 7,
      lockedDirectionTurn: 8,
      lockedDirection: 3,
      undoUsed: 5
    });
  });

  it("falls back to defaults for invalid fields", () => {
    const result = createUndoSnapshot({
      score: Number.NaN,
      comboStreak: -1,
      successfulMoveCount: -1,
      lockConsumedAtMoveCount: Number.NaN,
      lockedDirectionTurn: Number.NaN,
      lockedDirection: Number.NaN,
      undoUsed: -1
    });

    expect(result).toEqual({
      score: 0,
      tiles: [],
      comboStreak: 0,
      successfulMoveCount: 0,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      undoUsed: 0
    });
  });
});

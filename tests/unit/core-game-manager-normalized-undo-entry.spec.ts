import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerNormalizedUndoEntryRuntime,
  createNormalizedUndoStackEntry,
  installGameManagerNormalizedUndoEntryRuntime,
  type GameManagerNormalizedUndoEntryRuntime
} from "../../src/core/game-manager-normalized-undo-entry";

describe("core game manager normalized undo entry", () => {
  it("normalizes score counters and motion map using fallback state", () => {
    const tiles = [{ x: 0, y: 1, value: 2 }];
    const result = createNormalizedUndoStackEntry(
      {},
      {
        score: Number.NaN,
        comboStreak: 3,
        successfulMoveCount: -1,
        lockConsumedAtMoveCount: 8,
        lockedDirectionTurn: "invalid",
        lockedDirection: 2,
        undoUsed: -3
      },
      {
        score: 64,
        comboStreak: 1,
        successfulMoveCount: 9,
        lockConsumedAtMoveCount: -1,
        lockedDirectionTurn: null,
        lockedDirection: null,
        undoUsed: 4
      },
      tiles,
      {
        "0,1": { x: 0, y: 1 },
        invalid: { x: 1.5, y: 2 }
      }
    );

    expect(result).toEqual({
      score: 64,
      tiles,
      comboStreak: 3,
      successfulMoveCount: 9,
      lockConsumedAtMoveCount: 8,
      lockedDirectionTurn: null,
      lockedDirection: 2,
      undoUsed: 4,
      motionMap: {
        "0,1": { x: 0, y: 1 }
      }
    });
  });

  it("preserves missing fallback values when source fields are invalid", () => {
    expect(
      createNormalizedUndoStackEntry(
        {},
        {
          score: Number.NaN,
          comboStreak: -1,
          successfulMoveCount: -1,
          lockConsumedAtMoveCount: "invalid",
          lockedDirectionTurn: "invalid",
          lockedDirection: "invalid",
          undoUsed: -1
        },
        {},
        [],
        null
      )
    ).toEqual({
      score: undefined,
      tiles: [],
      comboStreak: undefined,
      successfulMoveCount: undefined,
      lockConsumedAtMoveCount: undefined,
      lockedDirectionTurn: undefined,
      lockedDirection: undefined,
      undoUsed: undefined,
      motionMap: null
    });
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerNormalizedUndoEntryRuntime();
    expect(runtime.createNormalizedUndoStackEntry).toBe(createNormalizedUndoStackEntry);

    const windowLike: { CoreGameManagerNormalizedUndoEntryRuntime?: GameManagerNormalizedUndoEntryRuntime } = {};
    expect(installGameManagerNormalizedUndoEntryRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerNormalizedUndoEntryRuntime
    );
    expect(windowLike.CoreGameManagerNormalizedUndoEntryRuntime?.createNormalizedUndoStackEntry).toBe(
      createNormalizedUndoStackEntry
    );

    const existing = { createNormalizedUndoStackEntry: vi.fn() };
    expect(
      installGameManagerNormalizedUndoEntryRuntime({
        windowLike: { CoreGameManagerNormalizedUndoEntryRuntime: existing }
      })
    ).toBe(existing);
  });
});

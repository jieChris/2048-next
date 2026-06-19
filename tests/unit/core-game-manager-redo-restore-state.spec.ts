import { describe, expect, it, vi } from "vitest";

import {
  buildRedoRestoreState,
  createGameManagerRedoRestoreStateRuntime,
  installGameManagerRedoRestoreStateRuntime,
  type GameManagerRedoRestoreStateRuntime
} from "../../src/core/game-manager-redo-restore-state";

function createManager(overrides: Record<string, unknown> = {}) {
  return {
    timerStatus: 0,
    getUndoStateFallbackValues: vi.fn(() => ({
      comboStreak: 1,
      successfulMoveCount: 2,
      lockConsumedAtMoveCount: 3,
      lockedDirectionTurn: 4,
      lockedDirection: -1,
      undoUsed: 5
    })),
    normalizeUndoStackEntry: vi.fn((entry: unknown) => entry),
    ...overrides
  };
}

describe("core game manager redo restore state", () => {
  it("normalizes redo entry values and derives timer restart intent", () => {
    const manager = createManager({ timerStatus: 0 });

    expect(
      buildRedoRestoreState(manager, {
        comboStreak: 7,
        successfulMoveCount: 8,
        lockConsumedAtMoveCount: 9,
        lockedDirectionTurn: 10,
        lockedDirection: 1,
        undoUsed: 11
      })
    ).toEqual({
      comboStreak: 7,
      successfulMoveCount: 8,
      lockConsumedAtMoveCount: 9,
      lockedDirectionTurn: 10,
      lockedDirection: 1,
      undoUsed: 11,
      over: false,
      won: false,
      keepPlaying: false,
      shouldClearMessage: true,
      shouldStartTimer: true
    });
  });

  it("falls back for invalid redo entry counters", () => {
    const manager = createManager({ timerStatus: 1 });

    expect(
      buildRedoRestoreState(manager, {
        comboStreak: -1,
        successfulMoveCount: Number.NaN,
        lockConsumedAtMoveCount: "x",
        lockedDirectionTurn: null,
        lockedDirection: 1.5,
        undoUsed: -4
      })
    ).toMatchObject({
      comboStreak: 1,
      successfulMoveCount: 2,
      lockConsumedAtMoveCount: 3,
      lockedDirectionTurn: 4,
      lockedDirection: -1,
      undoUsed: 5,
      shouldStartTimer: false
    });
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerRedoRestoreStateRuntime();
    expect(runtime.buildRedoRestoreState).toBe(buildRedoRestoreState);

    const windowLike: {
      CoreGameManagerRedoRestoreStateRuntime?: GameManagerRedoRestoreStateRuntime;
    } = {};
    expect(installGameManagerRedoRestoreStateRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerRedoRestoreStateRuntime
    );
    expect(windowLike.CoreGameManagerRedoRestoreStateRuntime?.buildRedoRestoreState).toBe(
      buildRedoRestoreState
    );

    const existing = {
      buildRedoRestoreState: vi.fn()
    };
    expect(
      installGameManagerRedoRestoreStateRuntime({
        windowLike: { CoreGameManagerRedoRestoreStateRuntime: existing }
      })
    ).toBe(existing);
  });
});

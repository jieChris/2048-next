import { describe, expect, it, vi } from "vitest";

import {
  applySavedManagerProgressState,
  createSavedManagerProgressStateRuntime,
  installSavedManagerProgressStateRuntime,
  type SavedManagerProgressStateRuntime
} from "../../src/core/saved-manager-progress-state";

describe("core saved manager progress state", () => {
  it("restores saved progress and direction-lock counters", () => {
    const manager: Record<string, unknown> = {};

    applySavedManagerProgressState(manager, {
      combo_streak: 2,
      successful_move_count: 5,
      undo_used: 1,
      lock_consumed_at_move_count: 4,
      locked_direction_turn: 3,
      locked_direction: 1
    });

    expect(manager).toMatchObject({
      comboStreak: 2,
      successfulMoveCount: 5,
      undoUsed: 1,
      lockConsumedAtMoveCount: 4,
      lockedDirectionTurn: 3,
      lockedDirection: 1
    });
  });

  it("derives missing move and undo counts from restored move history", () => {
    const manager: Record<string, unknown> = {
      moveHistory: [0, 1, -1, 2, "bad"]
    };

    applySavedManagerProgressState(manager, {
      successful_move_count: 0,
      undo_used: 0
    });

    expect(manager.successfulMoveCount).toBe(3);
    expect(manager.undoUsed).toBe(1);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedManagerProgressStateRuntime();
    expect(runtime.applySavedManagerProgressState).toBe(applySavedManagerProgressState);

    const windowLike: { CoreSavedManagerProgressStateRuntime?: SavedManagerProgressStateRuntime } = {};
    expect(installSavedManagerProgressStateRuntime({ windowLike })).toBe(
      windowLike.CoreSavedManagerProgressStateRuntime
    );
    expect(windowLike.CoreSavedManagerProgressStateRuntime?.applySavedManagerProgressState).toBe(
      applySavedManagerProgressState
    );

    const existing = { applySavedManagerProgressState: vi.fn() };
    expect(
      installSavedManagerProgressStateRuntime({
        windowLike: { CoreSavedManagerProgressStateRuntime: existing }
      })
    ).toBe(existing);
  });
});

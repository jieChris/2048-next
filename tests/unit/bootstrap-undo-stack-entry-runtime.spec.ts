import { describe, expect, it } from "vitest";

import { normalizeUndoStackEntry } from "../../src/core/undo-stack-entry";
import {
  createUndoStackEntryRuntime,
  installUndoStackEntryRuntime,
  type UndoStackEntryRuntime
} from "../../src/bootstrap/undo-stack-entry-runtime";

describe("bootstrap undo-stack-entry runtime", () => {
  it("creates the legacy CoreUndoStackEntryRuntime shape from TypeScript functions", () => {
    const runtime = createUndoStackEntryRuntime();
    const input = {
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
    };

    expect(runtime.normalizeUndoStackEntry(input)).toEqual(normalizeUndoStackEntry(input));
  });

  it("preserves legacy fallback behavior for missing input", () => {
    const runtime = createUndoStackEntryRuntime();

    expect(runtime.normalizeUndoStackEntry(undefined)).toEqual({
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

  it("filters non-object tiles through the TypeScript owner", () => {
    const runtime = createUndoStackEntryRuntime();

    expect(
      runtime.normalizeUndoStackEntry({
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
      })
    ).toEqual({
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

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreUndoStackEntryRuntime?: UndoStackEntryRuntime } = {};

    const installed = installUndoStackEntryRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreUndoStackEntryRuntime);
    expect(installed?.normalizeUndoStackEntry).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createUndoStackEntryRuntime();
    const windowLike = { CoreUndoStackEntryRuntime: existing };

    const installed = installUndoStackEntryRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreUndoStackEntryRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installUndoStackEntryRuntime({ windowLike: null })).toBeNull();
  });
});

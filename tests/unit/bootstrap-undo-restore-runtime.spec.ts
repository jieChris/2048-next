import { describe, expect, it } from "vitest";

import { computeUndoRestoreState } from "../../src/core/undo-restore";
import {
  createUndoRestoreRuntime,
  installUndoRestoreRuntime,
  type UndoRestoreRuntime
} from "../../src/bootstrap/undo-restore-runtime";

describe("bootstrap undo-restore runtime", () => {
  it("creates the legacy CoreUndoRestoreRuntime shape from TypeScript functions", () => {
    const runtime = createUndoRestoreRuntime();
    const input = {
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
    };

    expect(runtime.computeUndoRestoreState(input)).toEqual(computeUndoRestoreState(input));
  });

  it("preserves legacy fallback behavior for missing input", () => {
    const runtime = createUndoRestoreRuntime();

    expect(runtime.computeUndoRestoreState(undefined)).toEqual({
      comboStreak: 0,
      successfulMoveCount: 0,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      undoUsed: 1,
      over: false,
      won: false,
      keepPlaying: false,
      shouldClearMessage: true,
      shouldStartTimer: false
    });
  });

  it("delegates to CoreEngineFacade when the facade is available", () => {
    const facadeInput = {
      prev: { undoUsed: 2, ignored: true },
      fallbackUndoUsed: 8,
      timerStatus: 0,
      ignored: "field"
    };
    const expected = {
      comboStreak: 9,
      successfulMoveCount: 10,
      lockConsumedAtMoveCount: 11,
      lockedDirectionTurn: 12,
      lockedDirection: 3,
      undoUsed: 4,
      over: false,
      won: false,
      keepPlaying: false,
      shouldClearMessage: true,
      shouldStartTimer: true
    };
    const calls: unknown[] = [];
    const runtime = createUndoRestoreRuntime({
      CoreEngineFacade: {
        computeUndoRestoreState: (input: unknown) => {
          calls.push(input);
          return expected;
        }
      }
    });

    expect(runtime.computeUndoRestoreState(facadeInput)).toBe(expected);
    expect(calls).toEqual([
      {
        prev: facadeInput.prev,
        fallbackUndoUsed: facadeInput.fallbackUndoUsed,
        timerStatus: facadeInput.timerStatus
      }
    ]);
  });

  it("falls back to the TypeScript owner when CoreEngineFacade throws", () => {
    const runtime = createUndoRestoreRuntime({
      CoreEngineFacade: {
        computeUndoRestoreState: () => {
          throw new Error("facade failed");
        }
      }
    });
    const input = {
      prev: {
        comboStreak: 2,
        successfulMoveCount: 3,
        lockConsumedAtMoveCount: 4,
        lockedDirectionTurn: 5,
        lockedDirection: 1,
        undoUsed: 6
      },
      fallbackUndoUsed: 0,
      timerStatus: 0
    };

    expect(runtime.computeUndoRestoreState(input)).toEqual(computeUndoRestoreState(input));
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreUndoRestoreRuntime?: UndoRestoreRuntime } = {};

    const installed = installUndoRestoreRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreUndoRestoreRuntime);
    expect(installed?.computeUndoRestoreState).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createUndoRestoreRuntime();
    const windowLike = { CoreUndoRestoreRuntime: existing };

    const installed = installUndoRestoreRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreUndoRestoreRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installUndoRestoreRuntime({ windowLike: null })).toBeNull();
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type MoveAttempt = {
  direction: number;
  feedback: { id: string; key: string; repeat: boolean };
};

type MoveInputRuntime = {
  addRandomTile: (manager: Record<string, unknown>) => void;
  executeImmediateMoveInput: (
    manager: Record<string, unknown>,
    attempt: MoveAttempt,
    now: number
  ) => boolean;
  flushPendingMoveInput: (manager: Record<string, unknown>) => unknown;
  handleMoveInput: (manager: Record<string, unknown>, attempt: MoveAttempt) => void;
  move: (manager: Record<string, unknown>, direction: number) => boolean;
};

function loadMoveInputRuntime(options: {
  throttleMs?: number;
  undoResult?: { handled: boolean; valid: boolean };
} = {}) {
  let now = 1_000;
  const delayedCallbacks: Array<() => void> = [];
  class RuntimeDate extends Date {
    static now() {
      return now;
    }
  }
  const publishConfirmedOperationFeedback = vi.fn();
  const executeUndoMove = vi.fn(() => options.undoResult || { handled: false, valid: false });
  const context = {
    console,
    Date: RuntimeDate,
    Math,
    Number,
    String,
    Array,
    Object,
    Tile: class Tile {
      x: number;
      y: number;
      value: number;

      constructor(position: { x: number; y: number }, value: number) {
        this.x = position.x;
        this.y = position.y;
        this.value = value;
      }
    },
    setTimeout: (callback: () => void) => {
      delayedCallbacks.push(callback);
      return delayedCallbacks.length;
    },
    actuate: vi.fn(),
    canExecuteRedoMove: vi.fn(),
    canExecuteUndoMove: vi.fn(),
    executeRedoRestorePipeline: vi.fn(),
    executeUndoRestorePipeline: vi.fn(),
    pushRedoSnapshotBeforeUndo: vi.fn(),
    shouldStartTimerAfterRedoRestore: vi.fn(),
    shouldStartTimerAfterUndoRestore: vi.fn(),
    isGameTerminated: vi.fn(() => false),
    checkAndHandleMoveTimeout: vi.fn(() => false),
    handleUndoMove: vi.fn(() => false),
    CoreGameManagerInputEventsRuntime: { publishConfirmedOperationFeedback },
    CoreGameManagerUndoMoveHandlerRuntime: { executeUndoMove }
  } as Record<string, unknown>;
  const script = readFileSync(
    path.resolve(process.cwd(), "js/core_game_manager_move_input_helpers_runtime.js"),
    "utf8"
  );
  vm.runInNewContext(script, context);
  context.resolveMoveInputThrottleMs = vi.fn(() => options.throttleMs || 0);
  context.isGameTerminated = vi.fn(() => false);
  context.checkAndHandleMoveTimeout = vi.fn(() => false);
  return {
    runtime: context as unknown as MoveInputRuntime,
    context,
    delayedCallbacks,
    executeUndoMove,
    publishConfirmedOperationFeedback,
    setNow(value: number) {
      now = value;
    }
  };
}

function createAttempt(id: string, direction = 0): MoveAttempt {
  return { direction, feedback: { id, key: "W", repeat: false } };
}

describe("core game manager move input runtime", () => {
  it("publishes the exact immediate attempt with validity from manager.move", () => {
    const { runtime, publishConfirmedOperationFeedback } = loadMoveInputRuntime();
    const attempt = createAttempt("key-1");
    const manager = { move: vi.fn(() => true), lastMoveInputAt: 0 };

    expect(runtime.executeImmediateMoveInput(manager, attempt, 1_234)).toBe(true);
    expect(manager.move).toHaveBeenCalledWith(0);
    expect(publishConfirmedOperationFeedback).toHaveBeenCalledWith(manager, attempt, true);
  });

  it("stops publishing inputs that begin after game termination while preserving undo", () => {
    const { runtime, publishConfirmedOperationFeedback } = loadMoveInputRuntime();
    const manager = {
      over: true,
      won: false,
      keepPlaying: false,
      lastMoveInputAt: 0,
      move: vi.fn((direction: number) => {
        if (direction !== -1) return false;
        manager.over = false;
        return true;
      })
    };

    expect(runtime.executeImmediateMoveInput(manager, createAttempt("key-after-over"), 1_234)).toBe(
      false
    );
    expect(manager.move).toHaveBeenCalledWith(0);
    expect(publishConfirmedOperationFeedback).not.toHaveBeenCalled();

    expect(
      runtime.executeImmediateMoveInput(manager, createAttempt("key-rescue-undo", -1), 1_235)
    ).toBe(true);
    expect(manager.move).toHaveBeenCalledWith(-1);
    expect(manager.over).toBe(false);
    expect(publishConfirmedOperationFeedback).not.toHaveBeenCalled();
  });

  it("still publishes the final valid input that terminates the game", () => {
    const { runtime, publishConfirmedOperationFeedback } = loadMoveInputRuntime();
    const attempt = createAttempt("key-final");
    const manager = {
      over: false,
      won: false,
      keepPlaying: false,
      lastMoveInputAt: 0,
      move: vi.fn(() => {
        manager.over = true;
        return true;
      })
    };

    expect(runtime.executeImmediateMoveInput(manager, attempt, 1_234)).toBe(true);
    expect(publishConfirmedOperationFeedback).toHaveBeenCalledWith(manager, attempt, true);
  });

  it("keeps the latest complete throttled attempt and only publishes that execution", () => {
    const { runtime, publishConfirmedOperationFeedback, setNow } = loadMoveInputRuntime({
      throttleMs: 50
    });
    const animationFrames: Array<() => void> = [];
    const first = createAttempt("key-1", 0);
    const latest = createAttempt("key-2", 1);
    const manager = {
      move: vi.fn(() => true),
      lastMoveInputAt: 1_000,
      moveInputFlushScheduled: false,
      pendingMoveInput: null as MoveAttempt | null,
      requestAnimationFrame: (callback: () => void) => animationFrames.push(callback)
    };

    runtime.handleMoveInput(manager, first);
    runtime.handleMoveInput(manager, latest);
    expect(manager.pendingMoveInput).toBe(latest);
    expect(animationFrames).toHaveLength(1);

    setNow(1_050);
    animationFrames[0]();

    expect(manager.move).toHaveBeenCalledTimes(1);
    expect(manager.move).toHaveBeenCalledWith(1);
    expect(publishConfirmedOperationFeedback).toHaveBeenCalledTimes(1);
    expect(publishConfirmedOperationFeedback).toHaveBeenCalledWith(manager, latest, true);
  });

  it("cancels an already delayed attempt when a newer attempt arrives", () => {
    const { runtime, delayedCallbacks, publishConfirmedOperationFeedback, setNow } =
      loadMoveInputRuntime({ throttleMs: 50 });
    const animationFrames: Array<() => void> = [];
    const first = createAttempt("key-1", 0);
    const latest = createAttempt("key-2", 1);
    const manager = {
      move: vi.fn(() => true),
      lastMoveInputAt: 1_000,
      moveInputFlushScheduled: false,
      pendingMoveInput: null as MoveAttempt | null,
      requestAnimationFrame: (callback: () => void) => animationFrames.push(callback)
    };

    runtime.handleMoveInput(manager, first);
    animationFrames.shift()!();
    runtime.handleMoveInput(manager, latest);
    animationFrames.shift()!();
    expect(delayedCallbacks).toHaveLength(2);

    delayedCallbacks.shift()!();
    expect(manager.move).not.toHaveBeenCalled();
    setNow(1_050);
    delayedCallbacks.shift()!();

    expect(manager.move).toHaveBeenCalledWith(1);
    expect(publishConfirmedOperationFeedback).toHaveBeenCalledTimes(1);
    expect(publishConfirmedOperationFeedback).toHaveBeenCalledWith(manager, latest, true);
  });

  it("cancels a delayed ordinary move before executing an immediate undo", () => {
    const { runtime, delayedCallbacks, publishConfirmedOperationFeedback } =
      loadMoveInputRuntime({ throttleMs: 50 });
    const animationFrames: Array<() => void> = [];
    const ordinary = createAttempt("key-move", 0);
    const undo = createAttempt("key-undo", -1);
    const manager = {
      move: vi.fn((direction: number) => direction === -1),
      lastMoveInputAt: 1_000,
      moveInputFlushScheduled: false,
      pendingMoveInput: null as MoveAttempt | null,
      requestAnimationFrame: (callback: () => void) => animationFrames.push(callback)
    };

    runtime.handleMoveInput(manager, ordinary);
    animationFrames.shift()!();
    expect(delayedCallbacks).toHaveLength(1);

    runtime.handleMoveInput(manager, undo);
    delayedCallbacks.shift()!();

    expect(manager.pendingMoveInput).toBeNull();
    expect(manager.move.mock.calls).toEqual([[-1]]);
    expect(publishConfirmedOperationFeedback).toHaveBeenCalledTimes(1);
    expect(publishConfirmedOperationFeedback).toHaveBeenCalledWith(manager, undo, true);
  });

  it.each(["rankCheckpointRestorePending", "rankCheckpointApplying"] as const)(
    "drops queued input without execution or publication while %s",
    (restoreField) => {
      const { runtime, publishConfirmedOperationFeedback } = loadMoveInputRuntime({
        throttleMs: 50
      });
      const animationFrames: Array<() => void> = [];
      const manager = {
        move: vi.fn(() => true),
        lastMoveInputAt: 1_000,
        moveInputFlushScheduled: false,
        pendingMoveInput: null as MoveAttempt | null,
        rankCheckpointRestorePending: false,
        rankCheckpointApplying: false,
        requestAnimationFrame: (callback: () => void) => animationFrames.push(callback)
      };

      runtime.handleMoveInput(manager, createAttempt("key-1"));
      manager[restoreField] = true;
      animationFrames[0]();

      expect(manager.pendingMoveInput).toBeNull();
      expect(manager.move).not.toHaveBeenCalled();
      expect(publishConfirmedOperationFeedback).not.toHaveBeenCalled();
    }
  );

  it("lets undo bypass throttling but uses the same confirmed publication exit", () => {
    const { runtime, publishConfirmedOperationFeedback } = loadMoveInputRuntime({ throttleMs: 50 });
    const attempt = createAttempt("key-undo", -1);
    const manager = {
      move: vi.fn(() => false),
      lastMoveInputAt: 1_000,
      moveInputFlushScheduled: true,
      pendingMoveInput: createAttempt("older")
    };

    runtime.handleMoveInput(manager, attempt);

    expect(manager.move).toHaveBeenCalledWith(-1);
    expect(publishConfirmedOperationFeedback).toHaveBeenCalledWith(manager, attempt, false);
  });

  it("returns booleans for successful, unmoved, and restored moves", () => {
    const successful = loadMoveInputRuntime();
    successful.context.buildMovePlan = vi.fn(() => ({ vector: { x: 0, y: -1 } }));
    successful.context.buildTraversals = vi.fn(() => ({ x: [], y: [] }));
    successful.context.resetGridMergeStateBeforeMove = vi.fn();
    successful.context.processMoveTraversals = vi.fn(() => true);
    successful.context.finalizeSuccessfulMove = vi.fn();
    successful.context.resolveLockedDirection = vi.fn(() => null);
    const manager = {
      isDirectionAllowed: vi.fn(() => true),
      rankedSetupBlockedUntilSessionReady: false,
      noXSelectionPending: false
    };

    expect(successful.runtime.move(manager, 0)).toBe(true);
    successful.context.processMoveTraversals = vi.fn(() => false);
    expect(successful.runtime.move(manager, 0)).toBe(false);

    const undo = loadMoveInputRuntime({ undoResult: { handled: true, valid: true } });
    expect(undo.runtime.move(manager, -1)).toBe(true);
    expect(undo.executeUndoMove).toHaveBeenCalledWith(manager, -1, expect.any(Object));
  });

  it("allows internal checkpoint moves while still dropping user input", () => {
    const { runtime, context, publishConfirmedOperationFeedback } = loadMoveInputRuntime();
    context.buildMovePlan = vi.fn(() => ({ vector: { x: 0, y: -1 } }));
    context.buildTraversals = vi.fn(() => ({ x: [], y: [] }));
    context.resetGridMergeStateBeforeMove = vi.fn();
    context.processMoveTraversals = vi.fn(() => true);
    context.finalizeSuccessfulMove = vi.fn();
    context.resolveLockedDirection = vi.fn(() => null);
    const userMove = vi.fn(() => true);
    const manager = {
      disableSessionSync: true,
      rankCheckpointApplying: true,
      rankCheckpointReplayExecuting: true,
      rankedSetupBlockedUntilSessionReady: false,
      noXSelectionPending: false,
      pendingMoveInput: null,
      move: userMove,
      isDirectionAllowed: vi.fn(() => true)
    };

    expect(runtime.move(manager, 0)).toBe(true);
    runtime.handleMoveInput(manager, createAttempt("blocked-user-input"));

    expect(userMove).not.toHaveBeenCalled();
    expect(publishConfirmedOperationFeedback).not.toHaveBeenCalled();
  });

  it("consumes and records the checkpoint spawn while rebuilding a live game", () => {
    const { runtime, context } = loadMoveInputRuntime();
    const insertTile = vi.fn();
    context.recordSpawnValue = vi.fn();
    const manager = {
      replayMode: false,
      rankCheckpointApplying: true,
      rankCheckpointReplayExecuting: true,
      rankPolicy: "ranked",
      forcedSpawn: { x: 2, y: 3, value: 4 },
      lastSpawn: null as { x: number; y: number; value: number } | null,
      grid: {
        cellAvailable: vi.fn(() => true),
        insertTile
      },
      isBlockedCell: vi.fn(() => false)
    };

    runtime.addRandomTile(manager);

    expect(insertTile).toHaveBeenCalledWith(expect.objectContaining({ x: 2, y: 3, value: 4 }));
    expect(manager.lastSpawn).toEqual({ x: 2, y: 3, value: 4 });
    expect(manager.forcedSpawn).toBeNull();
  });

  it("allows only the synchronous checkpoint replay action through the restore guard", () => {
    const loaded = loadMoveInputRuntime();
    loaded.context.buildMovePlan = vi.fn(() => ({ vector: { x: 0, y: -1 } }));
    loaded.context.buildTraversals = vi.fn(() => ({ x: [], y: [] }));
    loaded.context.resetGridMergeStateBeforeMove = vi.fn();
    loaded.context.processMoveTraversals = vi.fn(() => true);
    loaded.context.finalizeSuccessfulMove = vi.fn();
    loaded.context.resolveLockedDirection = vi.fn(() => null);
    const manager = {
      isDirectionAllowed: vi.fn(() => true),
      rankCheckpointApplying: true,
      rankCheckpointReplayExecuting: false,
      rankedSetupBlockedUntilSessionReady: false,
      noXSelectionPending: false
    };

    expect(loaded.runtime.move(manager, 0)).toBe(false);
    manager.rankCheckpointReplayExecuting = true;
    expect(loaded.runtime.move(manager, 0)).toBe(true);
  });
});

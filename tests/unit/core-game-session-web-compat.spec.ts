import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type CompatRuntime = {
  createSharedGameSessionTransition: (
    manager: Record<string, unknown>,
    direction: number,
    atMs: number
  ) => Record<string, unknown> | null;
  tryMoveWithSharedGameSession: (
    manager: Record<string, unknown>,
    direction: number,
    atMs: number
  ) => boolean;
};

function loadCompatRuntime(coreRuntime: Record<string, unknown>): CompatRuntime {
  const source = readFileSync(
    path.resolve(process.cwd(), "js/core_game_manager_move_input_helpers_runtime.js"),
    "utf8"
  );
  const context = {
    console,
    CoreGameSessionRuntime: coreRuntime
  } as Record<string, unknown>;
  vm.runInNewContext(source, context);
  return context as unknown as CompatRuntime;
}

function createManager() {
  const values = [
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  return {
    modeKey: "standard_4x4_pow2_no_undo",
    width: 4,
    height: 4,
    initialSeed: 424242,
    score: 12,
    successfulMoveCount: 3,
    undoUsed: 0,
    comboStreak: 1,
    moveHistory: [3, 0, 1],
    timerStatus: 0,
    time: 0,
    replayMode: false,
    over: false,
    won: false,
    grid: {
      cellContent({ x, y }: { x: number; y: number }) {
        const value = values[y][x];
        return value > 0 ? { x, y, value } : null;
      }
    },
    getDurationMs: () => 0,
    stopTimer: vi.fn()
  };
}

describe("shared Game Session Web compatibility seam", () => {
  it("builds a direction/time-only transition from the live legacy manager state", () => {
    const init = vi.fn();
    const move = vi.fn(() => ({
      moved: false,
      gameOver: false,
      spawn: null,
      state: { rngStep: 3 }
    }));
    const createSession = vi.fn(() => ({ init, move }));
    const runtime = loadCompatRuntime({
      supportsMode: (modeKey: unknown) => modeKey === "standard_4x4_pow2_no_undo",
      createSession
    });
    const manager = createManager();

    const transition = runtime.createSharedGameSessionTransition(manager, 3, 1_700_000_000_100);

    expect(transition).toMatchObject({ moved: false, gameOver: false });
    expect(createSession).toHaveBeenCalledWith({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 424242,
      startedAtMs: null,
      challengeId: null
    });
    expect(init).toHaveBeenCalledWith(expect.objectContaining({
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      score: 12,
      steps: 3,
      rngStep: 3,
      startedAtMs: null
    }));
    expect(move).toHaveBeenCalledWith({ direction: 3, atMs: 1_700_000_000_100 });
  });

  it("handles an invalid shared-mode move without falling through to legacy rules", () => {
    const runtime = loadCompatRuntime({
      supportsMode: () => true,
      createSession: () => ({
        init: vi.fn(),
        move: () => ({ moved: false, gameOver: false, spawn: null, state: { rngStep: 0 } })
      })
    });
    const manager = createManager();

    expect(runtime.tryMoveWithSharedGameSession(manager, 3, 100)).toBe(true);
    expect(manager).toMatchObject({
      __sharedGameSessionMoveCount: 1,
      __sharedGameSessionLastTransition: { moved: false, gameOver: false }
    });
  });

  it("leaves unsupported and replay-mode managers on their existing paths", () => {
    const runtime = loadCompatRuntime({ supportsMode: () => false, createSession: vi.fn() });
    expect(runtime.tryMoveWithSharedGameSession(createManager(), 3, 100)).toBe(false);

    const supported = loadCompatRuntime({
      supportsMode: () => true,
      createSession: vi.fn()
    });
    expect(
      supported.tryMoveWithSharedGameSession({ ...createManager(), replayMode: true }, 3, 100)
    ).toBe(false);
  });

  it("surfaces shared session failures instead of silently consuming the input", () => {
    const failure = new Error("shared transition failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const runtime = loadCompatRuntime({
      supportsMode: () => true,
      createSession: () => {
        throw failure;
      }
    });

    expect(() => runtime.tryMoveWithSharedGameSession(createManager(), 3, 100)).toThrow(
      "shared transition failed"
    );
    expect(consoleError).toHaveBeenCalledWith(
      "[game-session-compat] shared move failed",
      failure
    );
    consoleError.mockRestore();
  });

  it("rolls back an earlier motion when a later shared motion fails", () => {
    const transition = {
      moved: true,
      gameOver: false,
      spawn: null,
      merges: [],
      motions: [
        { from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, value: 2 },
        { from: { x: 2, y: 0 }, to: { x: 3, y: 0 }, value: 4 }
      ],
      state: { score: 4, steps: 1, comboStreak: 0, won: false }
    };
    const runtime = loadCompatRuntime({
      supportsMode: () => true,
      createSession: () => ({ init: vi.fn(), move: () => transition })
    });
    (runtime as unknown as { buildMovePlan: () => unknown }).buildMovePlan = () => ({
      vector: { x: 1, y: 0 }
    });
    let onTileUpdate = () => undefined;
    const tile = {
      x: 0,
      y: 0,
      value: 2,
      mergedFrom: [{ value: 1 }],
      previousPosition: { x: 9, y: 9 },
      savePosition() {
        this.previousPosition = { x: this.x, y: this.y };
      },
      updatePosition(position: { x: number; y: number }) {
        this.x = position.x;
        this.y = position.y;
        onTileUpdate();
      }
    };
    const cells = Array.from({ length: 4 }, () => Array(4).fill(null));
    cells[0][0] = tile;
    const manager = {
      ...createManager(),
      score: 0,
      successfulMoveCount: 0,
      moveHistory: [] as number[],
      sessionReplayV1: { records: ["before"], last_event_at_ms: 1 },
      grid: {
        cells,
        cellContent: ({ x, y }: { x: number; y: number }) => cells[x][y],
        eachCell(visitor: (x: number, y: number, value: unknown) => void) {
          for (let x = 0; x < 4; x += 1) {
            for (let y = 0; y < 4; y += 1) visitor(x, y, cells[x][y]);
          }
        }
      }
    };
    onTileUpdate = () => {
      manager.score = 99;
      manager.successfulMoveCount = 9;
      manager.moveHistory.push(1);
      manager.sessionReplayV1.records.push("after");
      manager.sessionReplayV1.last_event_at_ms = 9;
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      expect(() => runtime.tryMoveWithSharedGameSession(manager, 1, 100)).toThrow(
        "Shared Game Session motion source is missing"
      );
      expect(cells[0][0]).toBe(tile);
      expect(cells[1][0]).toBeNull();
      expect(tile).toMatchObject({
        x: 0,
        y: 0,
        mergedFrom: [{ value: 1 }],
        previousPosition: { x: 9, y: 9 }
      });
      expect(manager).toMatchObject({ score: 0, successfulMoveCount: 0, moveHistory: [] });
      expect(manager.sessionReplayV1).toEqual({ records: ["before"], last_event_at_ms: 1 });
      expect(manager).not.toHaveProperty("__sharedGameSessionLastTransition");
      expect(manager).not.toHaveProperty("__sharedGameSessionMoveCount");
      expect(consoleError).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
    }
  });
});

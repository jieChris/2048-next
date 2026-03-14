import { describe, expect, it } from "vitest";

import { Engine } from "../../src/core/engine";
import type { EngineConfig } from "../../src/core/engine";

describe("core engine: Engine class", () => {
  const defaultConfig: EngineConfig = {
    width: 4,
    height: 4,
    ruleset: "pow2",
    undoEnabled: true
  };

  it("creates an engine with frozen config", () => {
    const engine = new Engine(defaultConfig);
    expect(engine.config.width).toBe(4);
    expect(engine.config.ruleset).toBe("pow2");
    expect(Object.isFrozen(engine.config)).toBe(true);
  });

  it("starts and reports started state", () => {
    const engine = new Engine(defaultConfig);
    expect(engine.isStarted()).toBe(false);
    engine.start();
    expect(engine.isStarted()).toBe(true);
  });

  it("getState returns initial state", () => {
    const engine = new Engine(defaultConfig);
    const state = engine.getState();
    expect(state.score).toBe(0);
    expect(state.board).toEqual([]);
    expect(state.over).toBe(false);
    expect(state.won).toBe(false);
    expect(state.undoUsed).toBe(0);
  });

  it("loadState updates engine state", () => {
    const engine = new Engine(defaultConfig);
    engine.loadState({ score: 1234, over: true, undoUsed: 3 });
    const state = engine.getState();
    expect(state.score).toBe(1234);
    expect(state.over).toBe(true);
    expect(state.undoUsed).toBe(3);
  });

  it("exportState and importState round-trip", () => {
    const engine = new Engine(defaultConfig);
    engine.loadState({
      score: 500,
      board: [[2, 4], [8, 0]],
      comboStreak: 2,
      successfulMoveCount: 10
    });
    const exported = engine.exportState();
    expect(exported.version).toBe(1);
    expect(exported.config.width).toBe(4);
    expect(exported.state.score).toBe(500);
    expect(exported.timestamp).toBeTruthy();

    const engine2 = new Engine(defaultConfig);
    engine2.importState(exported);
    expect(engine2.getState().score).toBe(500);
    expect(engine2.getState().comboStreak).toBe(2);
  });

  it("planTileInteraction delegates to core", () => {
    const engine = new Engine(defaultConfig);
    const result = engine.planTileInteraction({
      cell: { x: 0, y: 0 },
      farthest: { x: 1, y: 0 },
      next: { x: 2, y: 0 },
      hasNextTile: true,
      nextMergedFrom: false,
      mergedValue: 4
    });
    expect(result.kind).toBe("merge");
    expect(result.moved).toBe(true);
  });

  it("computePostMoveLifecycle delegates to core", () => {
    const engine = new Engine(defaultConfig);
    const result = engine.computePostMoveLifecycle({
      successfulMoveCount: 5,
      hasMovesAvailable: true,
      timerStatus: 1
    });
    expect(result.successfulMoveCount).toBe(6);
    expect(result.over).toBe(false);
  });

  it("computePostMoveScore delegates to core", () => {
    const engine = new Engine(defaultConfig);
    const result = engine.computePostMoveScore({
      scoreBeforeMove: 100,
      scoreAfterMerge: 108,
      comboStreak: 0,
      comboMultiplier: 1
    });
    expect(result.score).toBe(108);
    expect(result.mergeGain).toBe(8);
  });

  it("createUndoSnapshot delegates to core", () => {
    const engine = new Engine(defaultConfig);
    const result = engine.createUndoSnapshot({
      score: 200,
      comboStreak: 1,
      successfulMoveCount: 3,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      undoUsed: 0
    });
    expect(result.score).toBe(200);
    expect(result.tiles).toEqual([]);
  });

  it("computeUndoRestore delegates to core", () => {
    const engine = new Engine(defaultConfig);
    const result = engine.computeUndoRestore({
      prev: { undoUsed: 1 },
      fallbackUndoUsed: 0,
      timerStatus: 1
    });
    expect(result.undoUsed).toBe(2);
    expect(result.over).toBe(false);
  });

  it("normalizeReplaySeekTarget delegates to core", () => {
    const engine = new Engine(defaultConfig);
    const result = engine.normalizeReplaySeekTarget({
      targetIndex: 100,
      hasReplayMoves: true,
      replayMovesLength: 50
    });
    expect(result).toBe(50);
  });

  it("planReplayStep delegates to core", () => {
    const engine = new Engine(defaultConfig);
    const result = engine.planReplayStep({
      action: 0,
      hasReplaySpawns: true,
      spawnAtIndex: { x: 1, y: 1, value: 2 }
    });
    expect(result.shouldInjectForcedSpawn).toBe(true);
  });

  it("encodeBoardV4 and decodeBoardV4 round-trip", () => {
    const engine = new Engine(defaultConfig);
    const board = [
      [0, 2, 4, 8],
      [16, 32, 64, 128],
      [256, 512, 1024, 2048],
      [0, 0, 0, 0]
    ];
    const encoded = engine.encodeBoardV4(board);
    const decoded = engine.decodeBoardV4(encoded);
    expect(decoded).toEqual(board);
  });

  it("getBestTile finds max value", () => {
    const engine = new Engine(defaultConfig);
    expect(engine.getBestTile([[2, 4], [8, 1024]])).toBe(1024);
    expect(engine.getBestTile([])).toBe(0);
  });

  it("importReplay parses v4c envelope", () => {
    const engine = new Engine(defaultConfig);
    const result = engine.importReplay({
      trimmedReplayString: "not_a_replay",
      fallbackModeKey: "standard_4x4_pow2_no_undo"
    });
    expect(result).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { planTileInteraction } from "../../src/core/move-apply";
import { computePostMoveLifecycle } from "../../src/core/post-move";
import { computePostMoveScore } from "../../src/core/scoring";
import { createUndoSnapshot } from "../../src/core/undo-snapshot";
import { computeUndoRestoreState } from "../../src/core/undo-restore";
import { normalizeReplaySeekTarget, planReplayStep } from "../../src/core/replay-lifecycle";
import { parseReplayImportEnvelope } from "../../src/core/replay-import";
import { encodeBoardV4, decodeBoardV4 } from "../../src/core/replay-codec";
import { getBestTileValue } from "../../src/core/grid-scan";
import { createEngineFacade, createEngineSession } from "../../src/core/engine";

describe("core engine: pure function delegation", () => {
  it("planTileInteraction delegates to core", () => {
    const result = planTileInteraction({
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
    const result = computePostMoveLifecycle({
      successfulMoveCount: 5,
      hasMovesAvailable: true,
      timerStatus: 1
    });
    expect(result.successfulMoveCount).toBe(6);
    expect(result.over).toBe(false);
  });

  it("computePostMoveScore delegates to core", () => {
    const result = computePostMoveScore({
      scoreBeforeMove: 100,
      scoreAfterMerge: 108,
      comboStreak: 0,
      comboMultiplier: 1
    });
    expect(result.score).toBe(108);
    expect(result.mergeGain).toBe(8);
  });

  it("createUndoSnapshot delegates to core", () => {
    const result = createUndoSnapshot({
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

  it("computeUndoRestoreState delegates to core", () => {
    const result = computeUndoRestoreState({
      prev: { undoUsed: 1 },
      fallbackUndoUsed: 0,
      timerStatus: 1
    });
    expect(result.undoUsed).toBe(2);
    expect(result.over).toBe(false);
  });

  it("normalizeReplaySeekTarget delegates to core", () => {
    const result = normalizeReplaySeekTarget({
      targetIndex: 100,
      hasReplayMoves: true,
      replayMovesLength: 50
    });
    expect(result).toBe(50);
  });

  it("planReplayStep delegates to core", () => {
    const result = planReplayStep({
      action: 0,
      hasReplaySpawns: true,
      spawnAtIndex: { x: 1, y: 1, value: 2 }
    });
    expect(result.shouldInjectForcedSpawn).toBe(true);
  });

  it("encodeBoardV4 and decodeBoardV4 round-trip", () => {
    const board = [
      [0, 2, 4, 8],
      [16, 32, 64, 128],
      [256, 512, 1024, 2048],
      [0, 0, 0, 0]
    ];
    const encoded = encodeBoardV4(board);
    const decoded = decodeBoardV4(encoded);
    expect(decoded).toEqual(board);
  });

  it("getBestTileValue finds max value", () => {
    expect(getBestTileValue([[2, 4], [8, 1024]])).toBe(1024);
    expect(getBestTileValue([])).toBe(0);
  });

  it("parseReplayImportEnvelope parses v4c envelope", () => {
    const result = parseReplayImportEnvelope({
      trimmedReplayString: "not_a_replay",
      fallbackModeKey: "standard_4x4_pow2_no_undo"
    });
    expect(result).toBeNull();
  });

  it("createEngineFacade exposes unified callable surface", () => {
    const facade = createEngineFacade();
    expect(facade.planTileInteraction).toBe(planTileInteraction);
    expect(facade.computePostMoveLifecycle).toBe(computePostMoveLifecycle);
    expect(facade.computePostMoveScore).toBe(computePostMoveScore);
    expect(facade.createUndoSnapshot).toBe(createUndoSnapshot);
    expect(facade.computeUndoRestoreState).toBe(computeUndoRestoreState);
    expect(facade.normalizeReplaySeekTarget).toBe(normalizeReplaySeekTarget);
    expect(facade.planReplayStep).toBe(planReplayStep);
    expect(facade.parseReplayImportEnvelope).toBe(parseReplayImportEnvelope);
    expect(facade.encodeBoardV4).toBe(encodeBoardV4);
    expect(facade.decodeBoardV4).toBe(decodeBoardV4);
    expect(facade.getBestTileValue).toBe(getBestTileValue);
  });

  it("createEngineFacade methods are directly callable", () => {
    const facade = createEngineFacade();
    const score = facade.computePostMoveScore({
      scoreBeforeMove: 0,
      scoreAfterMerge: 8,
      comboStreak: 0,
      comboMultiplier: 1
    });
    expect(score.score).toBe(8);
    expect(score.mergeGain).toBe(8);
  });

  it("createEngineSession supports init/load/move/undo/export lifecycle", () => {
    const engine = createEngineSession({
      width: 4,
      height: 4,
      ruleset: "pow2",
      undoEnabled: true
    });

    const initialized = engine.init({
      score: 32,
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    });
    expect(initialized.score).toBe(32);

    const moved = engine.move({
      scoreAfterMerge: 40,
      hasMovesAvailable: true,
      timerStatus: 1,
      comboMultiplier: 1
    });
    expect(moved.scoring.score).toBe(40);
    expect(moved.state.successfulMoveCount).toBe(1);

    const undoSnapshot = {
      ...createUndoSnapshot({
        score: 12,
        comboStreak: 0,
        successfulMoveCount: 0,
        lockConsumedAtMoveCount: -1,
        lockedDirectionTurn: null,
        lockedDirection: null,
        undoUsed: 0
      }),
      score: 12,
      tiles: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    };
    const restored = engine.undo({
      snapshot: undoSnapshot,
      timerStatus: 1,
      fallbackUndoUsed: 0
    });
    expect(restored.score).toBe(12);
    expect(restored.undoUsed).toBe(1);

    const exported = engine.exportState();
    expect(exported.config.width).toBe(4);
    expect(exported.state.score).toBe(12);

    const loaded = engine.load({
      ...exported,
      state: {
        ...exported.state,
        score: 99
      }
    });
    expect(loaded.score).toBe(99);
  });

  it("createEngineSession rejects incompatible snapshot version", () => {
    const engine = createEngineSession({
      width: 4,
      height: 4,
      ruleset: "pow2",
      undoEnabled: true
    });

    const exported = engine.exportState();
    expect(() =>
      engine.load({
        ...exported,
        version: 2
      })
    ).toThrow(/Unsupported engine snapshot version/);
  });

  it("createEngineSession rejects malformed board shape on load", () => {
    const engine = createEngineSession({
      width: 4,
      height: 4,
      ruleset: "pow2",
      undoEnabled: true
    });

    const exported = engine.exportState();
    expect(() =>
      engine.load({
        ...exported,
        state: {
          ...exported.state,
          board: [[2, 0, 0, 0]]
        }
      })
    ).toThrow(/board row count mismatch/);
  });

});

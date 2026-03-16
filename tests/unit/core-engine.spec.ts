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
import { createEngineFacade } from "../../src/core/engine";

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

});

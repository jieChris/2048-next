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
import type { AppModeKey, GameDirection } from "../../src/contracts";
import golden from "../fixtures/game-session-golden-v1.json";

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

  for (const vector of golden.vectors) {
    it(`runs frozen game-session golden vector: ${vector.id}`, () => {
      const engine = createEngineSession({
        modeKey: vector.mode_key as AppModeKey,
        seed: vector.seed,
        startedAtMs: vector.started_at_ms,
        challengeId: vector.challenge_id
      });
      const initial = engine.init();
      expect(initial.board).toEqual(vector.expected.initial_board);

      for (let index = 0; index < vector.actions.length; index += 1) {
        const action = vector.actions[index];
        const expectedStep = vector.expected.step_results[index];
        const before = engine.getState();
        if (action.kind === "undo") {
          const transition = engine.undo({ atMs: vector.started_at_ms + action.offset_ms });
          expect(transition).not.toBeNull();
          expect(transition?.spawn).toBeNull();
          expect(transition?.state.rngStep).toBe(Number(expectedStep.rng_step) + 1);
          expect(transition?.state.replayRecords).toHaveLength(before.replayRecords.length + 1);
          continue;
        }

        const transition = engine.move({
          direction: action.direction as GameDirection,
          atMs: vector.started_at_ms + action.offset_ms
        });
        expect(transition.moved).toBe(expectedStep.moved);
        expect(transition.spawn && {
          x: transition.spawn.x,
          y: transition.spawn.y,
          value: transition.spawn.value
        }).toEqual(expectedStep.spawn);
        expect(transition.state.replayRecords.length - before.replayRecords.length).toBe(
          expectedStep.replay_recorded ? 1 : 0
        );
        if (expectedStep.rng_step !== null) {
          expect(transition.spawn?.rngStep).toBe(expectedStep.rng_step);
        } else {
          expect(transition.state.rngStep).toBe(before.rngStep);
        }
      }

      const state = engine.getState();
      expect(state.board).toEqual(vector.expected.final_board);
      expect(state.score).toBe(vector.expected.score);
      expect(state.steps).toBe(vector.expected.steps);
      expect(state.durationMs).toBe(vector.expected.duration_ms);
      expect(state.undoUsed).toBe(vector.expected.undo_used);
      expect(engine.exportReplay().replayString).toBe(vector.expected.replay_string);
    });
  }

  it("does not start time, spawn, step, or record replay for an invalid move", () => {
    const engine = createEngineSession({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 7
    });
    engine.init({
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    });

    const transition = engine.move({ direction: 3, atMs: 100 });
    expect(transition.moved).toBe(false);
    expect(transition.spawn).toBeNull();
    expect(transition.state).toMatchObject({
      steps: 0,
      rngStep: 0,
      startedAtMs: null,
      durationMs: 0,
      replayRecords: []
    });
  });

  it("merges [2,2,2,2] once per tile", () => {
    const engine = createEngineSession({ modeKey: "standard_4x4_pow2_no_undo", seed: 11 });
    engine.init({
      board: [
        [2, 2, 2, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    });

    const transition = engine.move({ direction: 3, atMs: 200 });
    expect(transition.scoreDelta).toBe(8);
    expect(transition.merges.map((merge) => merge.value)).toEqual([4, 4]);
    expect(transition.state.board[0].slice(0, 2)).toEqual([4, 4]);
  });

  it("marks a board terminal only after the successful move and spawn", () => {
    const engine = createEngineSession({ modeKey: "standard_4x4_pow2_no_undo", seed: 9 });
    engine.init({
      board: [
        [2, 2, 8, 16],
        [32, 64, 128, 256],
        [64, 128, 256, 512],
        [128, 256, 512, 1024]
      ]
    });

    const transition = engine.move({ direction: 3, atMs: 300 });
    expect(transition.moved).toBe(true);
    expect(transition.gameOver).toBe(true);
    expect(transition.state.gameOver).toBe(true);
  });

  it("applies both classic exact-board forced spawn rules through the Game Session", () => {
    const cases = [
      {
        seed: 31,
        expectedSpawn: 8,
        board: [
          [131072, 65536, 32768, 16384],
          [8192, 4096, 2048, 1024],
          [512, 256, 128, 64],
          [32, 16, 8, 0]
        ]
      },
      {
        seed: 32,
        expectedSpawn: 16,
        board: [
          [262144, 131072, 65536, 32768],
          [16384, 8192, 4096, 2048],
          [1024, 512, 256, 128],
          [64, 32, 16, 0]
        ]
      }
    ];

    for (const testCase of cases) {
      const engine = createEngineSession({ modeKey: "classic_4x4_pow2_undo", seed: testCase.seed });
      engine.init({ board: testCase.board });
      const transition = engine.move({ direction: 1, atMs: 600 });
      expect(transition.spawn?.value).toBe(testCase.expectedSpawn);
      expect(transition.state.replayRecords.at(-1)).toMatchObject({
        kind: "move",
        spawnValue: testCase.expectedSpawn
      });
    }
  });

  it("emits the 2048 milestone once without ending an otherwise playable game", () => {
    const inputBoard = [
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    const engine = createEngineSession({ modeKey: "standard_4x4_pow2_no_undo", seed: 12 });
    engine.init({ board: inputBoard });
    const first = engine.move({ direction: 3, atMs: 400 });
    expect(first.milestone2048).toBe(true);
    expect(first.state.won).toBe(true);
    expect(first.gameOver).toBe(false);

    engine.init({ board: inputBoard, milestone2048Reached: true, won: true });
    expect(engine.move({ direction: 3, atMs: 500 }).milestone2048).toBe(false);
  });

  it("round-trips a JSON snapshot with complete undo state", () => {
    const config = {
      modeKey: "classic_4x4_pow2_undo" as const,
      seed: 987654321,
      startedAtMs: 1700000100000
    };
    const engine = createEngineSession(config);
    const initialBoard = engine.init().board;
    engine.move({ direction: 3, atMs: config.startedAtMs + 120 });
    const snapshot = JSON.parse(JSON.stringify(engine.exportState(config.startedAtMs + 200)));

    const restored = createEngineSession(config);
    expect(restored.load(snapshot)).toEqual(engine.getState());
    const undone = restored.undo({ atMs: config.startedAtMs + 300 });
    expect(undone?.state.board).toEqual(initialBoard);
    expect(undone?.state.undoUsed).toBe(1);
    expect(undone?.state.durationMs).toBe(300);
  });

  it("rejects incompatible or malformed snapshots", () => {
    const engine = createEngineSession({ modeKey: "classic_4x4_pow2_undo", seed: 1 });
    const snapshot = engine.exportState(100);
    expect(() => engine.load({ ...snapshot, version: 2 } as never)).toThrow(/Invalid GameSnapshot/);
    expect(() =>
      engine.load({
        ...snapshot,
        state: { ...snapshot.state, board: [[2, 0, 0, 0]] }
      } as never)
    ).toThrow(/Invalid GameSnapshot/);
  });

});

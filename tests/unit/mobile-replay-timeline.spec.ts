import { describe, expect, it } from "vitest";

import {
  buildReplayTimeline,
  buildStandard4x4ReplayTimeline,
  resolveReplayProgress,
  type ReplayTimelineSource,
} from "../../mobile/src/game/replay-timeline";
import type {
  AppModeKey,
  GameDirection,
  GameSnapshot,
  ReplayRecord,
} from "../../src/contracts";
import { createEngineSession } from "../../src/core/engine";
import {
  decodeReplayV1Base64,
  encodeReplayV1Base64,
} from "../../src/core/replay-codec";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function replaySource(): ReplayTimelineSource {
  const engine = createEngineSession({
    modeKey: "standard_4x4_pow2_no_undo",
    seed: 424_242,
  });
  engine.init();
  const directions: GameDirection[] = [3, 2, 1, 0, 3, 2, 1, 0];
  let atMs = 1_000;
  for (const direction of directions) {
    engine.move({ direction, atMs });
    atMs += 137;
  }
  return {
    replay: engine.exportReplay(),
    finalSnapshot: engine.exportState(atMs),
  };
}

function terminalReplaySource(): ReplayTimelineSource {
  const engine = createEngineSession({
    modeKey: "standard_4x4_pow2_no_undo",
    seed: 9,
  });
  engine.init();
  const directions: GameDirection[] = [3, 2, 1, 2];
  let atMs = 10_000;
  for (let index = 0; index < 5_000; index += 1) {
    const transition = engine.move({
      direction: directions[index % directions.length],
      atMs,
    });
    atMs += 17;
    if (transition.gameOver) {
      return {
        replay: engine.exportReplay(),
        finalSnapshot: engine.exportState(atMs),
      };
    }
  }
  throw new Error("terminal replay fixture did not finish");
}

function modeReplaySource(modeKey: AppModeKey): ReplayTimelineSource {
  const engine = createEngineSession({ modeKey, seed: 777 });
  engine.init();
  let atMs = 5_000;
  let undid = false;
  for (const direction of [3, 2, 1, 0, 3, 2, 1, 0] as GameDirection[]) {
    const transition = engine.move({ direction, atMs });
    atMs += 113;
    if (modeKey === "classic_4x4_pow2_undo" && transition.moved && !undid) {
      engine.undo({ atMs });
      atMs += 113;
      undid = true;
    }
  }
  return {
    replay: engine.exportReplay(),
    finalSnapshot: engine.exportState(atMs),
  };
}

function replaceReplay(
  source: ReplayTimelineSource,
  replay: ReplayRecord,
): ReplayTimelineSource {
  return { ...source, replay };
}

function replaceSnapshot(
  source: ReplayTimelineSource,
  finalSnapshot: GameSnapshot,
): ReplayTimelineSource {
  return { ...source, finalSnapshot };
}

describe("mobile replay timeline", () => {
  it("builds light frames whose final projection exactly matches the snapshot", () => {
    const source = replaySource();
    const timeline = buildStandard4x4ReplayTimeline(source);
    const finalState = source.finalSnapshot.state;

    expect(timeline.modeKey).toBe("standard_4x4_pow2_no_undo");
    expect(timeline.frames).toHaveLength(finalState.replayRecords.length + 1);
    expect(timeline.totalSteps).toBe(finalState.steps);
    expect(timeline.totalDurationMs).toBe(finalState.durationMs);
    expect(timeline.frames.at(-1)).toMatchObject({
      board: finalState.board,
      score: finalState.score,
      steps: finalState.steps,
      durationMs: finalState.durationMs,
      gameOver: finalState.gameOver,
    });

    for (const frame of timeline.frames) {
      expect(Object.keys(frame).sort()).toEqual([
        "board",
        "durationMs",
        "gameOver",
        "index",
        "merges",
        "milestone2048",
        "motions",
        "score",
        "scoreDelta",
        "spawn",
        "steps",
      ]);
      expect(frame).not.toHaveProperty("state");
      expect(frame).not.toHaveProperty("replayRecords");
      expect(frame).not.toHaveProperty("undoStack");
    }
  });

  it("reconstructs a real terminal standard game", () => {
    const source = terminalReplaySource();
    const timeline = buildStandard4x4ReplayTimeline(source);
    expect(source.finalSnapshot.state.gameOver).toBe(true);
    expect(timeline.frames.at(-1)?.gameOver).toBe(true);
    expect(timeline.frames.at(-1)?.board).toEqual(
      source.finalSnapshot.state.board,
    );
  });

  it("reconstructs all App modes from an authoritative RPL1 without a local snapshot", () => {
    for (const modeKey of [
      "standard_4x4_pow2_no_undo",
      "classic_4x4_pow2_undo",
      "board_3x3_pow2_no_undo",
    ] as const) {
      const source = modeReplaySource(modeKey);
      const timeline = buildReplayTimeline({ replay: source.replay });
      const finalState = source.finalSnapshot.state;
      expect(timeline.modeKey).toBe(modeKey);
      expect(timeline.frames.at(-1)).toMatchObject({
        board: finalState.board,
        score: finalState.score,
        steps: finalState.steps,
        durationMs: finalState.durationMs,
      });
    }
  });

  it("resolves clamped step and time progress without a playback clock", () => {
    const timeline = buildStandard4x4ReplayTimeline(replaySource());
    const middle = resolveReplayProgress(timeline, 2);
    expect(middle).toMatchObject({
      index: 2,
      totalSteps: timeline.frames.length - 1,
      elapsedMs: timeline.frames[2].durationMs,
      totalDurationMs: timeline.totalDurationMs,
    });
    expect(middle.stepRatio).toBeCloseTo(2 / (timeline.frames.length - 1));
    expect(resolveReplayProgress(timeline, -100).index).toBe(0);
    expect(
      resolveReplayProgress(timeline, Number.POSITIVE_INFINITY).index,
    ).toBe(timeline.frames.length - 1);
  });

  it("rejects an RPL1 initial board that differs from the seeded engine", () => {
    const source = replaySource();
    if (source.replay.kind !== "rpl1") throw new Error("expected rpl1 fixture");
    const decoded = decodeReplayV1Base64(source.replay.replayString);
    const initTiles = decoded.initTiles.map((tile, index) =>
      index === 0
        ? { ...tile, valueBit: (tile.valueBit === 0 ? 1 : 0) as 0 | 1 }
        : tile,
    );
    const replay: ReplayRecord = {
      ...source.replay,
      replayString: encodeReplayV1Base64({ ...decoded, initTiles }),
    };

    expect(() =>
      buildStandard4x4ReplayTimeline(replaceReplay(source, replay)),
    ).toThrow("replay_timeline_initial_board_mismatch");
  });

  it("rejects a recorded spawn that differs from the deterministic transition", () => {
    const source = replaySource();
    if (source.replay.kind !== "rpl1") throw new Error("expected rpl1 fixture");
    const decoded = decodeReplayV1Base64(source.replay.replayString);
    const records = decoded.records.map((record) =>
      record.kind === "move"
        ? {
            ...record,
            spawnValueBit: (record.spawnValueBit === 0 ? 1 : 0) as 0 | 1,
          }
        : record,
    );
    const replay: ReplayRecord = {
      ...source.replay,
      replayString: encodeReplayV1Base64({ ...decoded, records }),
    };

    expect(() =>
      buildStandard4x4ReplayTimeline(replaceReplay(source, replay)),
    ).toThrow("replay_timeline_spawn_mismatch");
  });

  it("rejects compressed undo counts before expanding an oversized action stream", () => {
    const source = modeReplaySource("classic_4x4_pow2_undo");
    if (source.replay.kind !== "rpl1") throw new Error("expected rpl1 fixture");
    const decoded = decodeReplayV1Base64(source.replay.replayString);
    const metadata = decoded.records.filter((record) => record.kind === "ext");
    const replay: ReplayRecord = {
      ...source.replay,
      replayString: encodeReplayV1Base64({
        ...decoded,
        records: [
          ...metadata,
          { kind: "undon", undoCount: 50_001, deltaMs: 0 },
        ],
      }),
    };

    expect(() => buildReplayTimeline({ replay })).toThrow(
      "replay_timeline_action_limit",
    );
  });

  it("rejects a final snapshot that differs from the replayed engine state", () => {
    const source = replaySource();
    const finalSnapshot = clone(source.finalSnapshot);
    finalSnapshot.state.score += 1;
    expect(() =>
      buildStandard4x4ReplayTimeline(replaceSnapshot(source, finalSnapshot)),
    ).toThrow("replay_timeline_final_snapshot_mismatch");
  });

  it("rejects legacy replay records and modes outside the guest standard slice", () => {
    const source = replaySource();
    expect(() =>
      buildStandard4x4ReplayTimeline({
        ...source,
        replay: {
          version: 1,
          kind: "v4c",
          modeKey: "standard_4x4_pow2_no_undo",
          initialBoardEncoded: "",
          actionsEncoded: "",
          replayString: "",
        },
      }),
    ).toThrow("replay_timeline_rpl1_required");

    const snapshot = clone(source.finalSnapshot);
    snapshot.state.modeKey = "classic_4x4_pow2_undo";
    expect(() =>
      buildStandard4x4ReplayTimeline({ ...source, finalSnapshot: snapshot }),
    ).toThrow("replay_timeline_standard_4x4_required");
  });
});

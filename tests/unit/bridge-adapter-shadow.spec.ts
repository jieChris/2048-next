import { describe, expect, it } from "vitest";

import {
  applyAdapterMoveResultToParityState,
  buildAdapterParityABDiffSummary,
  buildAdapterSessionParityReport,
  createInitialAdapterParityState
} from "../../src/bridge/adapter-shadow";

describe("bridge adapter shadow", () => {
  it("creates initial state with normalized mode key", () => {
    const state = createInitialAdapterParityState("");

    expect(state.modeKey).toBe("unknown");
    expect(state.counters.totalEvents).toBe(0);
    expect(state.lastDirection).toBeNull();
  });

  it("applies move event and increments move counters", () => {
    const base = createInitialAdapterParityState("standard");
    const next = applyAdapterMoveResultToParityState(base, {
      reason: "move",
      direction: 1,
      moved: true,
      score: 64,
      over: false,
      won: false,
      at: 123
    });

    expect(next.lastReason).toBe("move");
    expect(next.lastDirection).toBe(1);
    expect(next.lastScore).toBe(64);
    expect(next.lastEventAt).toBe(123);
    expect(next.counters.totalEvents).toBe(1);
    expect(next.counters.moveEvents).toBe(1);
    expect(next.counters.undoEvents).toBe(0);
    expect(next.counters.movedEvents).toBe(1);
  });

  it("applies undo event and increments undo counter", () => {
    const base = createInitialAdapterParityState("standard");
    const next = applyAdapterMoveResultToParityState(base, {
      reason: "undo",
      direction: -1,
      moved: true,
      score: 32
    });

    expect(next.lastReason).toBe("undo");
    expect(next.lastDirection).toBe(-1);
    expect(next.counters.totalEvents).toBe(1);
    expect(next.counters.moveEvents).toBe(0);
    expect(next.counters.undoEvents).toBe(1);
  });

  it("normalizes invalid fields and keeps previous score", () => {
    const base = applyAdapterMoveResultToParityState(
      createInitialAdapterParityState("legacy"),
      { score: 128, at: 10 }
    );
    const next = applyAdapterMoveResultToParityState(base, {
      reason: "",
      direction: 1.5,
      score: Number.NaN,
      modeKey: "",
      over: true,
      won: true
    });

    expect(next.modeKey).toBe("legacy");
    expect(next.lastReason).toBe("move");
    expect(next.lastDirection).toBeNull();
    expect(next.lastScore).toBe(128);
    expect(next.lastOver).toBe(true);
    expect(next.lastWon).toBe(true);
    expect(next.counters.overEvents).toBe(1);
    expect(next.counters.wonEvents).toBe(1);
  });

  it("builds session parity report from parity state and snapshot", () => {
    const parity = applyAdapterMoveResultToParityState(
      createInitialAdapterParityState("standard"),
      {
        reason: "undo",
        direction: -1,
        moved: true,
        score: 64,
        over: true,
        won: false,
        at: 200
      }
    );

    const report = buildAdapterSessionParityReport({
      parityState: parity,
      snapshot: {
        adapterMode: "core-adapter",
        modeKey: "standard",
        updatedAt: 210,
        lastMoveResult: {
          score: 64,
          undoUsed: 3
        }
      }
    });

    expect(report.modeKey).toBe("standard");
    expect(report.schemaVersion).toBe(2);
    expect(report.adapterMode).toBe("core-adapter");
    expect(report.hasParityState).toBe(true);
    expect(report.hasSnapshot).toBe(true);
    expect(report.lastReason).toBe("undo");
    expect(report.lastDirection).toBe(-1);
    expect(report.undoEvents).toBe(1);
    expect(report.overEvents).toBe(1);
    expect(report.lastScoreFromParity).toBe(64);
    expect(report.lastScoreFromSnapshot).toBe(64);
    expect(report.scoreDelta).toBe(0);
    expect(report.isScoreAligned).toBe(true);
    expect(report.undoUsedFromSnapshot).toBe(3);
    expect(report.snapshotUpdatedAt).toBe(210);
  });

  it("builds report without snapshot or parity state", () => {
    const report = buildAdapterSessionParityReport({
      parityState: null,
      snapshot: null,
      modeKey: "",
      adapterMode: "invalid"
    });

    expect(report.modeKey).toBe("unknown");
    expect(report.schemaVersion).toBe(2);
    expect(report.adapterMode).toBe("legacy-bridge");
    expect(report.hasParityState).toBe(false);
    expect(report.hasSnapshot).toBe(false);
    expect(report.counters.totalEvents).toBe(0);
    expect(report.lastScoreFromParity).toBeNull();
    expect(report.lastScoreFromSnapshot).toBeNull();
    expect(report.isScoreAligned).toBeNull();
    expect(report.undoUsedFromSnapshot).toBeNull();
    expect(report.snapshotUpdatedAt).toBeNull();
  });

  it("builds comparable AB diff summary when both reports exist", () => {
    const legacyReport = buildAdapterSessionParityReport({
      parityState: applyAdapterMoveResultToParityState(createInitialAdapterParityState("standard"), {
        reason: "move",
        direction: 0,
        moved: true,
        score: 128,
        over: false,
        won: false,
        at: 100
      }),
      snapshot: {
        adapterMode: "legacy-bridge",
        modeKey: "standard",
        updatedAt: 100,
        lastMoveResult: {
          score: 128,
          undoUsed: 1
        }
      },
      modeKey: "standard",
      adapterMode: "legacy-bridge"
    });

    const coreReport = buildAdapterSessionParityReport({
      parityState: applyAdapterMoveResultToParityState(createInitialAdapterParityState("standard"), {
        reason: "move",
        direction: 0,
        moved: true,
        score: 128,
        over: false,
        won: false,
        at: 120
      }),
      snapshot: {
        adapterMode: "core-adapter",
        modeKey: "standard",
        updatedAt: 121,
        lastMoveResult: {
          score: 128,
          undoUsed: 1
        }
      },
      modeKey: "standard",
      adapterMode: "core-adapter"
    });

    const diff = buildAdapterParityABDiffSummary({
      legacyBridgeReport: legacyReport,
      coreAdapterReport: coreReport,
      modeKey: "standard"
    });

    expect(diff.modeKey).toBe("standard");
    expect(diff.schemaVersion).toBe(2);
    expect(diff.hasLegacyReport).toBe(true);
    expect(diff.hasCoreReport).toBe(true);
    expect(diff.comparable).toBe(true);
    expect(diff.scoreDelta).toBe(0);
    expect(diff.isScoreMatch).toBe(true);
    expect(diff.undoUsedDelta).toBe(0);
    expect(diff.bothScoreAligned).toBe(true);
  });

  it("returns non-comparable AB diff when one side is missing", () => {
    const coreReport = buildAdapterSessionParityReport({
      parityState: null,
      snapshot: {
        adapterMode: "core-adapter",
        modeKey: "standard",
        updatedAt: 200,
        lastMoveResult: {
          score: 256,
          undoUsed: 2
        }
      },
      modeKey: "standard",
      adapterMode: "core-adapter"
    });

    const diff = buildAdapterParityABDiffSummary({
      legacyBridgeReport: null,
      coreAdapterReport: coreReport,
      modeKey: "standard"
    });

    expect(diff.modeKey).toBe("standard");
    expect(diff.schemaVersion).toBe(2);
    expect(diff.hasLegacyReport).toBe(false);
    expect(diff.hasCoreReport).toBe(true);
    expect(diff.comparable).toBe(false);
    expect(diff.scoreDelta).toBeNull();
    expect(diff.isScoreMatch).toBeNull();
    expect(diff.undoUsedDelta).toBeNull();
    expect(diff.bothScoreAligned).toBeNull();
  });
});

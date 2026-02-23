import { describe, expect, it } from "vitest";

import {
  applyAdapterMoveResultToParityState,
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
});

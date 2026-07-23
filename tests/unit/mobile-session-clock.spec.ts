import { describe, expect, it } from "vitest";

import {
  createSessionClock,
  type SessionClockAnchors,
} from "../../mobile/src/game/session-clock";

function createSources(wallMs: number, performanceMs: number) {
  let wall = wallMs;
  let monotonic = performanceMs;
  return {
    sources: {
      wallNow: () => wall,
      performanceNow: () => monotonic,
    },
    setWall(value: number) {
      wall = value;
    },
    setPerformance(value: number) {
      monotonic = value;
    },
  };
}

function anchors(
  overrides: Partial<SessionClockAnchors> = {},
): SessionClockAnchors {
  return {
    gameKind: "normal",
    savedAtMs: 0,
    wallClockSavedAtMs: 0,
    startedAtMs: null,
    lastEventAtMs: null,
    durationMs: 0,
    ...overrides,
  };
}

describe("mobile session clock", () => {
  it("starts at the greatest persisted or wall-clock lower bound", () => {
    const time = createSources(1_200, 50);
    const clock = createSessionClock(
      anchors({
        savedAtMs: 1_800,
        wallClockSavedAtMs: 1_200,
        startedAtMs: 1_000,
        lastEventAtMs: 1_700,
        durationMs: 900,
      }),
      time.sources,
    );

    expect(clock.now()).toBe(1_900);
  });

  it("advances in the foreground only from monotonic time and never rolls back", () => {
    const time = createSources(1_000, 100);
    const clock = createSessionClock(anchors(), time.sources);

    time.setWall(9_000);
    time.setPerformance(225.9);
    expect(clock.now()).toBe(1_125);

    time.setPerformance(200);
    expect(clock.now()).toBe(1_125);

    time.setPerformance(350.4);
    expect(clock.now()).toBe(1_250);
  });

  it("reanchors to a later wall clock when resuming after monotonic time stopped", () => {
    const time = createSources(1_000, 100);
    const clock = createSessionClock(anchors(), time.sources);

    time.setWall(5_000);
    expect(clock.resume()).toBe(5_000);

    time.setPerformance(140);
    expect(clock.now()).toBe(5_040);
  });

  it("keeps the current logical time when the wall clock moved backwards", () => {
    const time = createSources(1_000, 100);
    const clock = createSessionClock(anchors(), time.sources);

    time.setPerformance(300);
    expect(clock.now()).toBe(1_200);

    time.setWall(200);
    expect(clock.resume()).toBe(1_200);

    time.setPerformance(350);
    expect(clock.now()).toBe(1_250);
  });

  it("accepts a stored save without starting a normal game or replacing a ranked anchor", () => {
    const time = createSources(500, 10);
    const normal = {
      gameKind: "normal" as const,
      lastClosedAt: 400,
      snapshot: {
        savedAtMs: 400,
        state: {
          startedAtMs: null,
          lastEventAtMs: null,
          durationMs: 0,
        },
      },
    };
    const ranked = {
      gameKind: "ranked" as const,
      lastClosedAt: 1_100,
      snapshot: {
        savedAtMs: 1_100,
        state: {
          startedAtMs: 1_000,
          lastEventAtMs: 1_100,
          durationMs: 250,
        },
      },
    };

    expect(createSessionClock(normal, time.sources).now()).toBe(500);
    expect(normal.snapshot.state.startedAtMs).toBeNull();

    expect(createSessionClock(ranked, time.sources).now()).toBe(1_250);
    expect(ranked.snapshot.state.startedAtMs).toBe(1_000);
  });

  it("rejects a ranked save without its frozen server start anchor", () => {
    const time = createSources(500, 10);

    expect(() =>
      createSessionClock(
        anchors({ gameKind: "ranked", startedAtMs: null }),
        time.sources,
      ),
    ).toThrow("session_clock_ranked_anchor_missing");

    expect(
      createSessionClock(
        anchors({ gameKind: "normal", startedAtMs: null }),
        time.sources,
      ).now(),
    ).toBe(500);
  });

  it("uses local wall-clock deltas without importing absolute device skew into ranked time", () => {
    const time = createSources(3_601_000, 50);
    const clock = createSessionClock(
      anchors({
        gameKind: "ranked",
        savedAtMs: 1_000,
        wallClockSavedAtMs: 3_601_000,
        startedAtMs: 1_000,
      }),
      time.sources,
    );

    expect(clock.now()).toBe(1_000);
    time.setPerformance(175);
    expect(clock.now()).toBe(1_125);

    time.setWall(3_601_500);
    expect(clock.resume()).toBe(1_500);
  });

  it("adds only non-negative wall time elapsed since a persisted ranked checkpoint", () => {
    const forward = createSessionClock(
      anchors({
        gameKind: "ranked",
        savedAtMs: 1_200,
        wallClockSavedAtMs: 10_000,
        startedAtMs: 1_000,
        lastEventAtMs: 1_200,
        durationMs: 200,
      }),
      createSources(10_500, 0).sources,
    );
    expect(forward.now()).toBe(1_700);

    const rollback = createSessionClock(
      anchors({
        gameKind: "ranked",
        savedAtMs: 1_200,
        wallClockSavedAtMs: 10_000,
        startedAtMs: 1_000,
        lastEventAtMs: 1_200,
        durationMs: 200,
      }),
      createSources(9_000, 0).sources,
    );
    expect(rollback.now()).toBe(1_200);
  });

  it("always returns a non-negative safe integer, including near overflow", () => {
    const time = createSources(Number.MAX_SAFE_INTEGER - 2, 0.25);
    const clock = createSessionClock(anchors(), time.sources);

    time.setPerformance(10.75);
    const value = clock.now();

    expect(value).toBe(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);

    const projected = createSessionClock(
      anchors({
        startedAtMs: Number.MAX_SAFE_INTEGER - 2,
        durationMs: 10,
      }),
      createSources(0, 0).sources,
    );
    expect(projected.now()).toBe(Number.MAX_SAFE_INTEGER);
  });
});

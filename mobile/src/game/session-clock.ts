import type { GameSnapshot } from "../../../src/contracts";

export interface SessionClockAnchors {
  readonly gameKind: "normal" | "ranked";
  readonly savedAtMs: number;
  readonly wallClockSavedAtMs: number;
  readonly startedAtMs: number | null;
  readonly lastEventAtMs: number | null;
  readonly durationMs: number;
}

export interface StoredSessionClockAnchors {
  readonly gameKind: "normal" | "ranked";
  readonly lastClosedAt: number;
  readonly snapshot: {
    readonly savedAtMs: number;
    readonly state: Pick<
      GameSnapshot["state"],
      "startedAtMs" | "lastEventAtMs" | "durationMs"
    >;
  };
}

export interface SessionClockSources {
  readonly wallNow: () => number;
  readonly performanceNow: () => number;
}

export interface SessionClock {
  now(): number;
  resume(): number;
}

const defaultSources: SessionClockSources = {
  wallNow: () => Date.now(),
  performanceNow: () => performance.now(),
};

function nonNegativeSafeInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
  return value;
}

function nullableAnchor(value: number | null, name: string): number | null {
  return value === null ? null : nonNegativeSafeInteger(value, name);
}

function clockReading(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(
      `${name} must be a finite non-negative millisecond value`,
    );
  }
  return value;
}

function resolveAnchors(
  input: StoredSessionClockAnchors | SessionClockAnchors,
): SessionClockAnchors {
  if ("snapshot" in input) {
    return {
      gameKind: input.gameKind,
      savedAtMs: input.snapshot.savedAtMs,
      wallClockSavedAtMs: input.lastClosedAt,
      startedAtMs: input.snapshot.state.startedAtMs,
      lastEventAtMs: input.snapshot.state.lastEventAtMs,
      durationMs: input.snapshot.state.durationMs,
    };
  }
  return input;
}

function addElapsed(baseMs: number, elapsedMs: number): number {
  const wholeElapsedMs = Math.floor(Math.max(0, elapsedMs));
  return wholeElapsedMs >= Number.MAX_SAFE_INTEGER - baseMs
    ? Number.MAX_SAFE_INTEGER
    : baseMs + wholeElapsedMs;
}

export function createSessionClock(
  input: StoredSessionClockAnchors | SessionClockAnchors,
  sources: SessionClockSources = defaultSources,
): SessionClock {
  const raw = resolveAnchors(input);
  if (raw.gameKind !== "normal" && raw.gameKind !== "ranked") {
    throw new RangeError("session_clock_invalid_game_kind");
  }
  const savedAtMs = nonNegativeSafeInteger(raw.savedAtMs, "savedAtMs");
  const wallClockSavedAtMs = nonNegativeSafeInteger(
    raw.wallClockSavedAtMs,
    "wallClockSavedAtMs",
  );
  const startedAtMs = nullableAnchor(raw.startedAtMs, "startedAtMs");
  const lastEventAtMs = nullableAnchor(raw.lastEventAtMs, "lastEventAtMs");
  const durationMs = nonNegativeSafeInteger(raw.durationMs, "durationMs");
  if (raw.gameKind === "ranked" && startedAtMs === null) {
    throw new Error("session_clock_ranked_anchor_missing");
  }
  const projectedAtMs =
    startedAtMs === null ? 0 : addElapsed(startedAtMs, durationMs);

  let wallClockAnchorMs = Math.ceil(clockReading(sources.wallNow(), "wallNow"));
  const persistedLogicalMs = Math.max(
    savedAtMs,
    lastEventAtMs ?? 0,
    projectedAtMs,
  );
  let logicalAnchorMs =
    startedAtMs === null
      ? Math.max(persistedLogicalMs, wallClockAnchorMs)
      : addElapsed(persistedLogicalMs, wallClockAnchorMs - wallClockSavedAtMs);
  let monotonicAnchorMs = clockReading(
    sources.performanceNow(),
    "performanceNow",
  );
  let lastReturnedMs = logicalAnchorMs;

  const readAt = (monotonicNowMs: number): number => {
    const candidate = addElapsed(
      logicalAnchorMs,
      monotonicNowMs - monotonicAnchorMs,
    );
    lastReturnedMs = Math.max(lastReturnedMs, candidate);
    return lastReturnedMs;
  };

  return {
    now() {
      return readAt(clockReading(sources.performanceNow(), "performanceNow"));
    },
    resume() {
      const monotonicNowMs = clockReading(
        sources.performanceNow(),
        "performanceNow",
      );
      const currentMs = readAt(monotonicNowMs);
      const wallClockNowMs = Math.ceil(
        clockReading(sources.wallNow(), "wallNow"),
      );
      logicalAnchorMs = Math.max(
        currentMs,
        addElapsed(logicalAnchorMs, wallClockNowMs - wallClockAnchorMs),
      );
      monotonicAnchorMs = monotonicNowMs;
      wallClockAnchorMs = wallClockNowMs;
      lastReturnedMs = logicalAnchorMs;
      return lastReturnedMs;
    },
  };
}

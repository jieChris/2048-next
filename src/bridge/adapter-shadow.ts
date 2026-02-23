export interface AdapterMoveResultDetailLike {
  reason?: string | null;
  direction?: number | null;
  moved?: boolean | null;
  modeKey?: string | null;
  score?: number | null;
  over?: boolean | null;
  won?: boolean | null;
  at?: number | null;
}

export interface AdapterParityCounters {
  totalEvents: number;
  moveEvents: number;
  undoEvents: number;
  movedEvents: number;
  overEvents: number;
  wonEvents: number;
}

export interface AdapterParityState {
  modeKey: string;
  lastReason: string;
  lastDirection: number | null;
  lastScore: number;
  lastOver: boolean;
  lastWon: boolean;
  lastEventAt: number;
  counters: AdapterParityCounters;
}

export interface AdapterSessionParityReport {
  modeKey: string;
  adapterMode: "legacy-bridge" | "core-adapter";
  hasParityState: boolean;
  hasSnapshot: boolean;
  counters: AdapterParityCounters;
  lastReason: string;
  lastDirection: number | null;
  lastEventAt: number;
  lastScoreFromParity: number | null;
  lastScoreFromSnapshot: number | null;
  scoreDelta: number | null;
  isScoreAligned: boolean | null;
  undoEvents: number;
  undoUsedFromSnapshot: number | null;
  wonEvents: number;
  overEvents: number;
  snapshotUpdatedAt: number | null;
}

export interface AdapterSessionParityReportInput {
  parityState: AdapterParityState | null | undefined;
  snapshot: Record<string, unknown> | null | undefined;
  modeKey?: string | null | undefined;
  adapterMode?: string | null | undefined;
}

const DEFAULT_REASON = "move";

function normalizeModeKey(modeKey: string | null | undefined): string {
  return typeof modeKey === "string" && modeKey ? modeKey : "unknown";
}

function normalizeDirection(direction: number | null | undefined): number | null {
  return Number.isInteger(direction) ? Number(direction) : null;
}

function toFiniteNumber(value: number | null | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function toFiniteNumberOrNull(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeAdapterMode(
  adapterMode: string | null | undefined
): "legacy-bridge" | "core-adapter" {
  return adapterMode === "core-adapter" ? "core-adapter" : "legacy-bridge";
}

function cloneCounters(counters: AdapterParityCounters): AdapterParityCounters {
  return {
    totalEvents: counters.totalEvents,
    moveEvents: counters.moveEvents,
    undoEvents: counters.undoEvents,
    movedEvents: counters.movedEvents,
    overEvents: counters.overEvents,
    wonEvents: counters.wonEvents
  };
}

export function createInitialAdapterParityState(
  modeKey: string | null | undefined
): AdapterParityState {
  return {
    modeKey: normalizeModeKey(modeKey),
    lastReason: DEFAULT_REASON,
    lastDirection: null,
    lastScore: 0,
    lastOver: false,
    lastWon: false,
    lastEventAt: 0,
    counters: {
      totalEvents: 0,
      moveEvents: 0,
      undoEvents: 0,
      movedEvents: 0,
      overEvents: 0,
      wonEvents: 0
    }
  };
}

export function applyAdapterMoveResultToParityState(
  previousState: AdapterParityState | null | undefined,
  detail: AdapterMoveResultDetailLike | null | undefined
): AdapterParityState {
  const state = previousState || createInitialAdapterParityState(detail?.modeKey);
  const input = detail || {};
  const reason = typeof input.reason === "string" && input.reason ? input.reason : DEFAULT_REASON;
  const modeKey =
    typeof input.modeKey === "string" && input.modeKey ? input.modeKey : state.modeKey;
  const counters = cloneCounters(state.counters);
  counters.totalEvents += 1;
  if (reason === "undo") {
    counters.undoEvents += 1;
  } else {
    counters.moveEvents += 1;
  }
  if (input.moved === true) counters.movedEvents += 1;
  if (input.over === true) counters.overEvents += 1;
  if (input.won === true) counters.wonEvents += 1;

  return {
    modeKey: normalizeModeKey(modeKey),
    lastReason: reason,
    lastDirection: normalizeDirection(input.direction),
    lastScore: toFiniteNumber(input.score, state.lastScore),
    lastOver: input.over === true,
    lastWon: input.won === true,
    lastEventAt: toFiniteNumber(input.at, Date.now()),
    counters: counters
  };
}

export function buildAdapterSessionParityReport(
  input: AdapterSessionParityReportInput
): AdapterSessionParityReport {
  const parity = input.parityState || null;
  const snapshot = isPlainObject(input.snapshot) ? input.snapshot : null;
  const snapshotLastMove = snapshot && isPlainObject(snapshot.lastMoveResult)
    ? snapshot.lastMoveResult
    : null;
  const parityScore = parity ? toFiniteNumberOrNull(parity.lastScore) : null;
  const snapshotScore = snapshotLastMove ? toFiniteNumberOrNull(snapshotLastMove.score) : null;
  const scoreDelta =
    parityScore !== null && snapshotScore !== null ? parityScore - snapshotScore : null;
  let isScoreAligned: boolean | null = null;
  if (scoreDelta !== null) {
    isScoreAligned = scoreDelta === 0;
  }

  const counters = parity
    ? cloneCounters(parity.counters)
    : {
        totalEvents: 0,
        moveEvents: 0,
        undoEvents: 0,
        movedEvents: 0,
        overEvents: 0,
        wonEvents: 0
      };

  const modeKey = normalizeModeKey(
    (snapshot && typeof snapshot.modeKey === "string" ? snapshot.modeKey : null) ||
      (parity ? parity.modeKey : null) ||
      input.modeKey
  );
  const adapterMode = normalizeAdapterMode(
    (snapshot && typeof snapshot.adapterMode === "string" ? snapshot.adapterMode : null) ||
      input.adapterMode
  );

  return {
    modeKey: modeKey,
    adapterMode: adapterMode,
    hasParityState: !!parity,
    hasSnapshot: !!snapshot,
    counters: counters,
    lastReason: parity ? parity.lastReason : DEFAULT_REASON,
    lastDirection: parity ? parity.lastDirection : null,
    lastEventAt: parity ? parity.lastEventAt : 0,
    lastScoreFromParity: parityScore,
    lastScoreFromSnapshot: snapshotScore,
    scoreDelta: scoreDelta,
    isScoreAligned: isScoreAligned,
    undoEvents: counters.undoEvents,
    undoUsedFromSnapshot: snapshotLastMove ? toFiniteNumberOrNull(snapshotLastMove.undoUsed) : null,
    wonEvents: counters.wonEvents,
    overEvents: counters.overEvents,
    snapshotUpdatedAt: snapshot ? toFiniteNumberOrNull(snapshot.updatedAt) : null
  };
}

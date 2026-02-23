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

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
  schemaVersion: 2;
  modeKey: string;
  adapterMode: "legacy-bridge" | "core-adapter";
  sessionId: string | null;
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

export interface AdapterParityABDiffSummary {
  schemaVersion: 2;
  modeKey: string;
  hasLegacyReport: boolean;
  hasCoreReport: boolean;
  legacySessionId: string | null;
  coreSessionId: string | null;
  isSessionMatch: boolean | null;
  comparable: boolean;
  comparedAt: number;
  legacyScore: number | null;
  coreScore: number | null;
  scoreDelta: number | null;
  isScoreMatch: boolean | null;
  legacyUndoUsed: number | null;
  coreUndoUsed: number | null;
  undoUsedDelta: number | null;
  legacyUndoEvents: number | null;
  coreUndoEvents: number | null;
  undoEventsDelta: number | null;
  legacyWonEvents: number | null;
  coreWonEvents: number | null;
  wonEventsDelta: number | null;
  legacyOverEvents: number | null;
  coreOverEvents: number | null;
  overEventsDelta: number | null;
  bothScoreAligned: boolean | null;
}

export interface AdapterParityABDiffInput {
  legacyBridgeReport: AdapterSessionParityReport | null | undefined;
  coreAdapterReport: AdapterSessionParityReport | null | undefined;
  modeKey?: string | null | undefined;
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

function normalizeReport(
  report: AdapterSessionParityReport | null | undefined,
  expectedAdapterMode: "legacy-bridge" | "core-adapter"
): AdapterSessionParityReport | null {
  if (!report || typeof report !== "object") return null;
  if (report.adapterMode !== expectedAdapterMode) return null;
  return report;
}

function normalizeSessionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function resolveSnapshotSessionId(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;
  const direct = normalizeSessionId(snapshot.sessionId);
  if (direct) return direct;
  const lastMoveResult = snapshot.lastMoveResult;
  if (!isPlainObject(lastMoveResult)) return null;
  return normalizeSessionId(lastMoveResult.sessionId);
}

function toDelta(
  legacyValue: number | null | undefined,
  coreValue: number | null | undefined
): number | null {
  const left = toFiniteNumberOrNull(legacyValue);
  const right = toFiniteNumberOrNull(coreValue);
  if (left === null || right === null) return null;
  return right - left;
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
  const sessionId = resolveSnapshotSessionId(snapshot);

  return {
    schemaVersion: 2,
    modeKey: modeKey,
    adapterMode: adapterMode,
    sessionId: sessionId,
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

export function buildAdapterParityABDiffSummary(
  input: AdapterParityABDiffInput
): AdapterParityABDiffSummary {
  const legacyReport = normalizeReport(input.legacyBridgeReport, "legacy-bridge");
  const coreReport = normalizeReport(input.coreAdapterReport, "core-adapter");
  const modeKey = normalizeModeKey(input.modeKey || coreReport?.modeKey || legacyReport?.modeKey);
  const legacySessionId = normalizeSessionId(legacyReport?.sessionId);
  const coreSessionId = normalizeSessionId(coreReport?.sessionId);
  const isSessionMatch =
    legacySessionId === null || coreSessionId === null
      ? null
      : legacySessionId === coreSessionId;
  const comparableByMode =
    !!legacyReport &&
    !!coreReport &&
    normalizeModeKey(legacyReport.modeKey) === normalizeModeKey(coreReport.modeKey) &&
    normalizeModeKey(legacyReport.modeKey) === modeKey;
  const comparable = comparableByMode && isSessionMatch === true;
  const scoreDelta = comparable
    ? toDelta(legacyReport?.lastScoreFromSnapshot, coreReport?.lastScoreFromSnapshot)
    : null;
  const isScoreMatch = scoreDelta === null ? null : scoreDelta === 0;
  const bothScoreAligned =
    comparable &&
    legacyReport?.isScoreAligned === true &&
    coreReport?.isScoreAligned === true &&
    isScoreMatch === true;

  return {
    schemaVersion: 2,
    modeKey: modeKey,
    hasLegacyReport: !!legacyReport,
    hasCoreReport: !!coreReport,
    legacySessionId: legacySessionId,
    coreSessionId: coreSessionId,
    isSessionMatch: isSessionMatch,
    comparable: comparable,
    comparedAt: Date.now(),
    legacyScore: legacyReport?.lastScoreFromSnapshot ?? null,
    coreScore: coreReport?.lastScoreFromSnapshot ?? null,
    scoreDelta: scoreDelta,
    isScoreMatch: isScoreMatch,
    legacyUndoUsed: legacyReport?.undoUsedFromSnapshot ?? null,
    coreUndoUsed: coreReport?.undoUsedFromSnapshot ?? null,
    undoUsedDelta: comparable
      ? toDelta(legacyReport?.undoUsedFromSnapshot, coreReport?.undoUsedFromSnapshot)
      : null,
    legacyUndoEvents: legacyReport?.undoEvents ?? null,
    coreUndoEvents: coreReport?.undoEvents ?? null,
    undoEventsDelta: comparable
      ? toDelta(legacyReport?.undoEvents, coreReport?.undoEvents)
      : null,
    legacyWonEvents: legacyReport?.wonEvents ?? null,
    coreWonEvents: coreReport?.wonEvents ?? null,
    wonEventsDelta: comparable
      ? toDelta(legacyReport?.wonEvents, coreReport?.wonEvents)
      : null,
    legacyOverEvents: legacyReport?.overEvents ?? null,
    coreOverEvents: coreReport?.overEvents ?? null,
    overEventsDelta: comparable
      ? toDelta(legacyReport?.overEvents, coreReport?.overEvents)
      : null,
    bothScoreAligned: comparable ? bothScoreAligned : null
  };
}

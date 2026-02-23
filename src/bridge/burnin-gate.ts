export type BurnInParityStatus = "match" | "mismatch" | "incomplete";
export type BurnInGateStatus = "pass" | "fail" | "insufficient_sample";
export type SustainedBurnInGateStatus =
  | "pass"
  | "fail"
  | "insufficient_window"
  | "insufficient_sample";

export interface BurnInRecordLike {
  status?: string | null | undefined;
  hasDiagnostics?: boolean | null | undefined;
}

export interface BurnInGateInput {
  comparable: number;
  mismatchRate: number | null;
  minComparable: number;
  maxMismatchRate: number;
}

export interface BurnInGateDecision {
  gateStatus: BurnInGateStatus;
  passGate: boolean | null;
}

export interface BurnInWindowSummary extends BurnInGateDecision {
  recordCount: number;
  withDiagnostics: number;
  comparable: number;
  match: number;
  mismatch: number;
  incomplete: number;
  mismatchRate: number | null;
}

export interface SummarizeBurnInWindowInput {
  minComparable?: number | null | undefined;
  maxMismatchRate?: number | null | undefined;
}

export interface BurnInSustainedWindowSummary extends BurnInWindowSummary {
  windowIndex: number;
}

export interface BurnInSustainedSummary {
  sustainedWindows: number;
  sustainedWindowSize: number;
  sustainedEvaluatedWindows: number;
  sustainedConsecutivePass: number;
  sustainedGateStatus: SustainedBurnInGateStatus;
  sustainedPassGate: boolean | null;
  sustainedWindowDetails: BurnInSustainedWindowSummary[];
}

export interface SummarizeSustainedBurnInInput extends SummarizeBurnInWindowInput {
  sustainedWindows?: number | null | undefined;
  windowSize?: number | null | undefined;
}

function toFiniteNumberOrNull(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toPositiveIntegerOrNull(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const floored = Math.floor(num);
  return floored > 0 ? floored : null;
}

function normalizeStatus(raw: string | null | undefined): BurnInParityStatus {
  if (raw === "match") return "match";
  if (raw === "mismatch") return "mismatch";
  return "incomplete";
}

function normalizeMinComparable(raw: number | null | undefined): number {
  const normalized = toPositiveIntegerOrNull(raw);
  return normalized === null ? 50 : normalized;
}

function normalizeMaxMismatchRate(raw: number | null | undefined): number {
  const normalized = toFiniteNumberOrNull(raw);
  if (normalized === null || normalized < 0) return 1;
  return normalized;
}

function normalizeSustainedWindows(raw: number | null | undefined): number {
  const normalized = toPositiveIntegerOrNull(raw);
  return normalized === null ? 3 : normalized;
}

function normalizeWindowSize(raw: number | null | undefined): number {
  const normalized = toPositiveIntegerOrNull(raw);
  return normalized === null ? 0 : normalized;
}

export function buildBurnInGateDecision(input: BurnInGateInput): BurnInGateDecision {
  const comparable = toPositiveIntegerOrNull(input.comparable) || 0;
  const mismatchRate = toFiniteNumberOrNull(input.mismatchRate);
  const minComparable = normalizeMinComparable(input.minComparable);
  const maxMismatchRate = normalizeMaxMismatchRate(input.maxMismatchRate);

  if (comparable < minComparable || mismatchRate === null) {
    return {
      gateStatus: "insufficient_sample",
      passGate: null
    };
  }

  if (mismatchRate <= maxMismatchRate) {
    return {
      gateStatus: "pass",
      passGate: true
    };
  }

  return {
    gateStatus: "fail",
    passGate: false
  };
}

export function summarizeBurnInWindow(
  records: BurnInRecordLike[] | null | undefined,
  input: SummarizeBurnInWindowInput
): BurnInWindowSummary {
  const list = Array.isArray(records) ? records : [];
  const minComparable = normalizeMinComparable(input.minComparable);
  const maxMismatchRate = normalizeMaxMismatchRate(input.maxMismatchRate);

  let withDiagnostics = 0;
  let comparable = 0;
  let match = 0;
  let mismatch = 0;
  let incomplete = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i] || {};
    if (item.hasDiagnostics === true) withDiagnostics += 1;

    const status = normalizeStatus(item.status);
    if (status === "match") {
      comparable += 1;
      match += 1;
    } else if (status === "mismatch") {
      comparable += 1;
      mismatch += 1;
    } else {
      incomplete += 1;
    }
  }

  const mismatchRate = comparable > 0 ? (mismatch * 100) / comparable : null;
  const gate = buildBurnInGateDecision({
    comparable,
    mismatchRate,
    minComparable,
    maxMismatchRate
  });

  return {
    recordCount: list.length,
    withDiagnostics,
    comparable,
    match,
    mismatch,
    incomplete,
    mismatchRate,
    gateStatus: gate.gateStatus,
    passGate: gate.passGate
  };
}

export function summarizeSustainedBurnIn(
  records: BurnInRecordLike[] | null | undefined,
  input: SummarizeSustainedBurnInInput
): BurnInSustainedSummary {
  const list = Array.isArray(records) ? records : [];
  const minComparable = normalizeMinComparable(input.minComparable);
  const maxMismatchRate = normalizeMaxMismatchRate(input.maxMismatchRate);
  const sustainedWindows = normalizeSustainedWindows(input.sustainedWindows);
  const windowSize = normalizeWindowSize(input.windowSize);

  const details: BurnInSustainedWindowSummary[] = [];
  if (windowSize > 0) {
    for (let i = 0; i < sustainedWindows; i++) {
      const start = i * windowSize;
      if (start >= list.length) break;
      const recordsInWindow = list.slice(start, start + windowSize);
      const summary = summarizeBurnInWindow(recordsInWindow, {
        minComparable,
        maxMismatchRate
      });
      details.push({
        ...summary,
        windowIndex: i + 1
      });
    }
  }

  let sustainedConsecutivePass = 0;
  for (let i = 0; i < details.length; i++) {
    if (details[i].passGate === true) sustainedConsecutivePass += 1;
    else break;
  }

  let sustainedGateStatus: SustainedBurnInGateStatus = "insufficient_window";
  let sustainedPassGate: boolean | null = null;
  if (details.length >= sustainedWindows) {
    if (sustainedConsecutivePass >= sustainedWindows) {
      sustainedGateStatus = "pass";
      sustainedPassGate = true;
    } else {
      let hasSampleInsufficient = false;
      for (let i = 0; i < sustainedWindows; i++) {
        if (details[i].gateStatus === "insufficient_sample") {
          hasSampleInsufficient = true;
          break;
        }
      }
      if (hasSampleInsufficient) {
        sustainedGateStatus = "insufficient_sample";
        sustainedPassGate = null;
      } else {
        sustainedGateStatus = "fail";
        sustainedPassGate = false;
      }
    }
  }

  return {
    sustainedWindows,
    sustainedWindowSize: windowSize,
    sustainedEvaluatedWindows: details.length,
    sustainedConsecutivePass,
    sustainedGateStatus,
    sustainedPassGate,
    sustainedWindowDetails: details
  };
}

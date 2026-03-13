export type ReplayActionKind = "m" | "u" | "p" | "x" | string;

export interface ReplayMoveExecution {
  kind: "m";
  dir: number;
}

export interface ReplayUndoExecution {
  kind: "u";
}

export interface ReplayPracticeExecution {
  kind: "p";
  x: number;
  y: number;
  value: number;
}

export type ReplayExecution = ReplayMoveExecution | ReplayUndoExecution | ReplayPracticeExecution;

export interface ReplayStepStatsInput {
  actions?: unknown[] | null;
  limit?: number | null;
}

export interface ReplayStepStatsResult {
  totalSteps: number;
  moveSteps: number;
  undoSteps: number;
}

export interface IpsInputCountInput {
  replayMode?: boolean | null;
  replayIndex?: number | null;
  ipsInputCount?: number | null;
  ipsInputTimes?: unknown[] | null;
  nowMs?: number | null;
}

export interface NextIpsInputCountResult {
  shouldRecord: boolean;
  nextIpsInputCount: number;
  nextIpsInputTimes: number[];
}

export interface IpsDisplayTextInput {
  durationMs?: number | null;
  ipsInputCount?: number | null;
}

export interface IpsDisplayTextResult {
  avgIpsText: string;
  ipsText: string;
}

export function getReplayActionKind(action: unknown): ReplayActionKind {
  if (action === -1) return "u";
  if (typeof action === "number" && action >= 0 && action <= 7) return "m";
  if (Array.isArray(action) && action.length > 0) return String(action[0]);
  return "x";
}

export function computeReplayStepStats(input: ReplayStepStatsInput): ReplayStepStatsResult {
  const actions = Array.isArray(input.actions) ? input.actions : [];
  const rawLimit = Number(input.limit);
  let limit = Number.isFinite(rawLimit) ? Math.floor(rawLimit) : actions.length;
  if (limit < 0) limit = 0;
  if (limit > actions.length) limit = actions.length;

  let moveSteps = 0;
  let undoSteps = 0;
  for (let i = 0; i < limit; i++) {
    const kind = getReplayActionKind(actions[i]);
    if (kind === "u") {
      undoSteps += 1;
      if (moveSteps > 0) moveSteps -= 1;
    } else if (kind === "m") {
      moveSteps += 1;
    }
  }

  return {
    totalSteps: limit,
    moveSteps,
    undoSteps
  };
}

export function resolveIpsInputCount(input: IpsInputCountInput): number {
  const hasTimesArray = Array.isArray(input.ipsInputTimes);
  if (hasTimesArray && !input.replayMode) {
    const nowMs = resolveIpsWindowNowMs(input.nowMs);
    return resolveIpsWindowTimes(input.ipsInputTimes, nowMs).length;
  }
  if (input.replayMode) {
    const replayIndex = Number(input.replayIndex);
    return Number.isInteger(replayIndex) && replayIndex > 0 ? replayIndex : 0;
  }
  const ipsInputCount = Number(input.ipsInputCount);
  return Number.isInteger(ipsInputCount) && ipsInputCount >= 0 ? ipsInputCount : 0;
}

export function resolveNextIpsInputCount(input: IpsInputCountInput): NextIpsInputCountResult {
  const hasTimesArray = Array.isArray(input.ipsInputTimes);
  if (hasTimesArray && !input.replayMode) {
    const nowMs = resolveIpsWindowNowMs(input.nowMs);
    const nextIpsInputTimes = resolveIpsWindowTimes(input.ipsInputTimes, nowMs, true);
    return {
      shouldRecord: true,
      nextIpsInputCount: nextIpsInputTimes.length,
      nextIpsInputTimes
    };
  }
  if (input.replayMode) {
    return {
      shouldRecord: false,
      nextIpsInputCount: resolveIpsInputCount(input),
      nextIpsInputTimes: []
    };
  }
  return {
    shouldRecord: true,
    nextIpsInputCount: resolveIpsInputCount(input) + 1,
    nextIpsInputTimes: []
  };
}

export function resolveIpsDisplayText(input: IpsDisplayTextInput): IpsDisplayTextResult {
  const rawCount = Number(input.ipsInputCount);
  const inputCount = Number.isFinite(rawCount) && rawCount >= 0 ? Math.floor(rawCount) : 0;
  const avgIps = String(inputCount);
  return {
    avgIpsText: avgIps,
    ipsText: "IPS: " + avgIps
  };
}

const IPS_WINDOW_MS = 1000;

function resolveIpsWindowNowMs(rawNowMs: unknown): number {
  const nowMs = Number(rawNowMs);
  if (Number.isFinite(nowMs) && nowMs >= 0) {
    return Math.floor(nowMs);
  }
  return Date.now();
}

function normalizeIpsInputTime(raw: unknown): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function resolveIpsWindowTimes(
  rawTimes: unknown[] | null | undefined,
  nowMs: number,
  includeNow = false
): number[] {
  const minMs = nowMs - IPS_WINDOW_MS;
  const next: number[] = [];
  const list = Array.isArray(rawTimes) ? rawTimes : [];
  for (const rawTime of list) {
    const time = normalizeIpsInputTime(rawTime);
    if (time === null) continue;
    if (time < minMs || time > nowMs + IPS_WINDOW_MS) continue;
    next.push(time);
  }
  if (includeNow) {
    next.push(nowMs);
  }
  return next;
}

export function resolveReplayExecution(action: unknown): ReplayExecution {
  const kind = getReplayActionKind(action);
  if (kind === "m") {
    const dir = Array.isArray(action) ? (action[1] as number) : (action as number);
    return { kind: "m", dir };
  }
  if (kind === "u") {
    return { kind: "u" };
  }
  if (kind === "p") {
    const raw = action as unknown[];
    return {
      kind: "p",
      x: raw[1] as number,
      y: raw[2] as number,
      value: raw[3] as number
    };
  }
  throw "Unknown replay action";
}

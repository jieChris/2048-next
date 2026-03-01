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
}

export interface NextIpsInputCountResult {
  shouldRecord: boolean;
  nextIpsInputCount: number;
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
  if (typeof action === "number" && action >= 0 && action <= 3) return "m";
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
  if (input.replayMode) {
    const replayIndex = Number(input.replayIndex);
    return Number.isInteger(replayIndex) && replayIndex > 0 ? replayIndex : 0;
  }
  const ipsInputCount = Number(input.ipsInputCount);
  return Number.isInteger(ipsInputCount) && ipsInputCount >= 0 ? ipsInputCount : 0;
}

export function resolveNextIpsInputCount(input: IpsInputCountInput): NextIpsInputCountResult {
  if (input.replayMode) {
    return {
      shouldRecord: false,
      nextIpsInputCount: resolveIpsInputCount(input)
    };
  }
  return {
    shouldRecord: true,
    nextIpsInputCount: resolveIpsInputCount(input) + 1
  };
}

export function resolveIpsDisplayText(input: IpsDisplayTextInput): IpsDisplayTextResult {
  const durationMs = Number(input.durationMs);
  const ms = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
  const seconds = ms / 1000;
  const rawCount = Number(input.ipsInputCount);
  const inputCount = Number.isFinite(rawCount) ? rawCount : 0;
  let avgIps: string | number = 0;
  if (seconds > 0) {
    avgIps = (inputCount / seconds).toFixed(2);
  }
  return {
    avgIpsText: String(avgIps),
    ipsText: "IPS: " + avgIps
  };
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

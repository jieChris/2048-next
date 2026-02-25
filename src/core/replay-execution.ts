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

export function getReplayActionKind(action: unknown): ReplayActionKind {
  if (action === -1) return "u";
  if (typeof action === "number" && action >= 0 && action <= 3) return "m";
  if (Array.isArray(action) && action.length > 0) return String(action[0]);
  return "x";
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

export interface HistoryStatusDisplayState {
  text: string;
  color: string;
}

export interface ResolveHistoryStatusDisplayStateInput {
  text?: unknown;
  isError?: unknown;
}

const HISTORY_STATUS_NORMAL_COLOR = "#4a4a4a";
const HISTORY_STATUS_ERROR_COLOR = "#c0392b";

function asStatusInput(input: unknown): ResolveHistoryStatusDisplayStateInput {
  if (!input || typeof input !== "object") return {};
  return input as ResolveHistoryStatusDisplayStateInput;
}

function asStatusText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function resolveHistoryStatusDisplayState(input: unknown): HistoryStatusDisplayState {
  const opts = asStatusInput(input);
  return {
    text: asStatusText(opts.text),
    color: opts.isError === true ? HISTORY_STATUS_ERROR_COLOR : HISTORY_STATUS_NORMAL_COLOR
  };
}

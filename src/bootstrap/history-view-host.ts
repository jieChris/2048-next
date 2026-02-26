function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface HistoryStatusApplyResult {
  didApply: boolean;
  text: string;
  color: string;
}

export interface HistorySummaryApplyResult {
  didApply: boolean;
  text: string;
}

export function applyHistoryStatus(input: {
  getElementById?: unknown;
  statusElementId?: unknown;
  text?: unknown;
  isError?: unknown;
  historyStatusRuntime?: unknown;
}): HistoryStatusApplyResult {
  const source = toRecord(input);
  const runtime = toRecord(source.historyStatusRuntime);
  const resolveHistoryStatusDisplayState = asFunction<(args: unknown) => unknown>(
    runtime.resolveHistoryStatusDisplayState
  );
  if (!resolveHistoryStatusDisplayState) {
    return {
      didApply: false,
      text: "",
      color: ""
    };
  }

  const statusState = toRecord(
    resolveHistoryStatusDisplayState({
      text: source.text,
      isError: source.isError
    })
  );
  const text = typeof statusState.text === "string" ? statusState.text : "";
  const color = typeof statusState.color === "string" ? statusState.color : "";
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const statusElementId =
    typeof source.statusElementId === "string" ? source.statusElementId : "history-status";
  const statusElement = toRecord(getElementById ? getElementById(statusElementId) : null);
  if ("textContent" in statusElement) {
    statusElement.textContent = text;
  }
  const style = toRecord(statusElement.style);
  if ("color" in style) {
    style.color = color;
  }

  return {
    didApply: true,
    text,
    color
  };
}

export function applyHistorySummary(input: {
  getElementById?: unknown;
  summaryElementId?: unknown;
  result?: unknown;
  state?: unknown;
  historySummaryRuntime?: unknown;
}): HistorySummaryApplyResult {
  const source = toRecord(input);
  const runtime = toRecord(source.historySummaryRuntime);
  const resolveHistorySummaryText = asFunction<(args: unknown) => unknown>(
    runtime.resolveHistorySummaryText
  );
  if (!resolveHistorySummaryText) {
    return {
      didApply: false,
      text: ""
    };
  }

  const result = toRecord(source.result);
  const state = toRecord(source.state);
  const textValue = resolveHistorySummaryText({
    total: result.total,
    page: state.page,
    pageSize: state.pageSize,
    adapterParityFilter: state.adapterParityFilter
  });
  const text = typeof textValue === "string" ? textValue : "";
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const summaryElementId =
    typeof source.summaryElementId === "string" ? source.summaryElementId : "history-summary";
  const summaryElement = toRecord(getElementById ? getElementById(summaryElementId) : null);
  if ("textContent" in summaryElement) {
    summaryElement.textContent = text;
  }

  return {
    didApply: true,
    text
  };
}

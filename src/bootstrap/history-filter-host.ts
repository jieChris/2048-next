function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface HistoryFilterHostApplyResult {
  didApply: boolean;
}

function readElementValue(getElementById: ((id: string) => unknown) | null, id: string): unknown {
  const element = toRecord(getElementById ? getElementById(id) : null);
  return "value" in element ? element.value : undefined;
}

export function applyHistoryFilterStateFromInputs(input: {
  state?: unknown;
  historyQueryRuntime?: unknown;
  getElementById?: unknown;
  modeElementId?: unknown;
  keywordElementId?: unknown;
  sortElementId?: unknown;
  adapterFilterElementId?: unknown;
  burnInWindowElementId?: unknown;
  sustainedWindowElementId?: unknown;
}): HistoryFilterHostApplyResult {
  const source = toRecord(input);
  const runtime = toRecord(source.historyQueryRuntime);
  const applyHistoryFilterState = asFunction<(state: unknown, inputState: unknown) => unknown>(
    runtime.applyHistoryFilterState
  );
  if (!applyHistoryFilterState) {
    return {
      didApply: false
    };
  }

  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const modeElementId = typeof source.modeElementId === "string" ? source.modeElementId : "history-mode";
  const keywordElementId =
    typeof source.keywordElementId === "string" ? source.keywordElementId : "history-keyword";
  const sortElementId = typeof source.sortElementId === "string" ? source.sortElementId : "history-sort";
  const adapterFilterElementId =
    typeof source.adapterFilterElementId === "string"
      ? source.adapterFilterElementId
      : "history-adapter-filter";
  const burnInWindowElementId =
    typeof source.burnInWindowElementId === "string"
      ? source.burnInWindowElementId
      : "history-burnin-window";
  const sustainedWindowElementId =
    typeof source.sustainedWindowElementId === "string"
      ? source.sustainedWindowElementId
      : "history-sustained-window";

  applyHistoryFilterState(source.state, {
    modeKeyRaw: readElementValue(getElementById, modeElementId),
    keywordRaw: readElementValue(getElementById, keywordElementId),
    sortByRaw: readElementValue(getElementById, sortElementId),
    adapterParityFilterRaw: readElementValue(getElementById, adapterFilterElementId),
    burnInWindowRaw: readElementValue(getElementById, burnInWindowElementId),
    sustainedWindowsRaw: readElementValue(getElementById, sustainedWindowElementId)
  });

  return {
    didApply: true
  };
}

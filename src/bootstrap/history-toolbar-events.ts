export interface HistoryPageStepState {
  canGo: boolean;
  nextPage: number;
}

function normalizePage(page: unknown): number {
  const value = Number(page);
  if (!Number.isFinite(value)) return 1;
  return value;
}

export function resolveHistoryPrevPageState(page: unknown): HistoryPageStepState {
  const current = normalizePage(page);
  if (current <= 1) {
    return {
      canGo: false,
      nextPage: current
    };
  }
  return {
    canGo: true,
    nextPage: current - 1
  };
}

export function resolveHistoryNextPageState(page: unknown): HistoryPageStepState {
  const current = normalizePage(page);
  return {
    canGo: true,
    nextPage: current + 1
  };
}

export function resolveHistoryFilterReloadControlIds(): string[] {
  return [
    "history-mode",
    "history-sort",
    "history-adapter-filter",
    "history-burnin-window",
    "history-sustained-window",
    "history-burnin-min-comparable",
    "history-burnin-max-mismatch-rate"
  ];
}

export function shouldHistoryKeywordTriggerReload(key: unknown): boolean {
  return key === "Enter";
}

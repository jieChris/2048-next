function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface HistoryStartupHostResult {
  started: boolean;
  missingStore: boolean;
}

export function applyHistoryStartup(input: {
  localHistoryStore?: unknown;
  setStatus?: unknown;
  initModeFilter?: unknown;
  bindToolbarActions?: unknown;
  loadHistory?: unknown;
}): HistoryStartupHostResult {
  const source = input || {};
  const setStatus = asFunction<(text: unknown, isError: unknown) => unknown>(source.setStatus);
  const initModeFilter = asFunction<() => unknown>(source.initModeFilter);
  const bindToolbarActions = asFunction<() => unknown>(source.bindToolbarActions);
  const loadHistory = asFunction<(resetPage: unknown) => unknown>(source.loadHistory);

  if (!source.localHistoryStore) {
    if (setStatus) setStatus("本地历史模块未加载", true);
    return {
      started: false,
      missingStore: true
    };
  }

  if (initModeFilter) initModeFilter();
  if (bindToolbarActions) bindToolbarActions();
  if (loadHistory) loadHistory(true);
  return {
    started: true,
    missingStore: false
  };
}

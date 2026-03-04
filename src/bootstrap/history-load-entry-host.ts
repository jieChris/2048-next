function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface HistoryLoadEntryApplyResult {
  didLoad: boolean;
  missingStore: boolean;
}

function applyHistoryFilters(input: {
  historyFilterHostRuntime?: unknown;
  state?: unknown;
  historyQueryRuntime?: unknown;
  getElementById?: unknown;
}): void {
  const source = toRecord(input);
  const historyFilterHostRuntime = toRecord(source.historyFilterHostRuntime);
  const applyHistoryFilterStateFromInputs = asFunction<(args: unknown) => unknown>(
    historyFilterHostRuntime.applyHistoryFilterStateFromInputs
  );
  if (!applyHistoryFilterStateFromInputs) return;
  applyHistoryFilterStateFromInputs({
    state: source.state,
    historyQueryRuntime: source.historyQueryRuntime,
    getElementById: source.getElementById
  });
}

export function applyHistoryLoadEntry(input: {
  resetPage?: unknown;
  localHistoryStore?: unknown;
  historyFilterHostRuntime?: unknown;
  state?: unknown;
  historyQueryRuntime?: unknown;
  getElementById?: unknown;
  historyLoadHostRuntime?: unknown;
  historyLoadRuntime?: unknown;
  historyBurnInRuntime?: unknown;
  burnInMinComparable?: unknown;
  burnInMaxMismatchRate?: unknown;
  statusElementId?: unknown;
  summaryElementId?: unknown;
  historyViewHostRuntime?: unknown;
  historyStatusRuntime?: unknown;
  historySummaryRuntime?: unknown;
  historyPanelHostRuntime?: unknown;
  historyPanelContext?: unknown;
  loadHistory?: unknown;
  renderHistory?: unknown;
  renderSummary?: unknown;
  renderBurnInSummary?: unknown;
  renderCanaryPolicy?: unknown;
  setStatus?: unknown;
  prevButtonId?: unknown;
  nextButtonId?: unknown;
  persistHistoryFilterState?: unknown;
}): HistoryLoadEntryApplyResult {
  const source = toRecord(input);
  if (!source.localHistoryStore) {
    return {
      didLoad: false,
      missingStore: true
    };
  }

  applyHistoryFilters({
    historyFilterHostRuntime: source.historyFilterHostRuntime,
    state: source.state,
    historyQueryRuntime: source.historyQueryRuntime,
    getElementById: source.getElementById
  });
  const persistHistoryFilterState = asFunction<() => unknown>(source.persistHistoryFilterState);
  if (persistHistoryFilterState) persistHistoryFilterState();

  const historyLoadHostRuntime = toRecord(source.historyLoadHostRuntime);
  const applyHistoryLoadWithPager = asFunction<(args: unknown) => unknown>(
    historyLoadHostRuntime.applyHistoryLoadWithPager
  );
  if (!applyHistoryLoadWithPager) {
    return {
      didLoad: false,
      missingStore: false
    };
  }

  applyHistoryLoadWithPager({
    resetPage: source.resetPage,
    state: source.state,
    localHistoryStore: source.localHistoryStore,
    historyLoadRuntime: source.historyLoadRuntime,
    historyQueryRuntime: source.historyQueryRuntime,
    historyBurnInRuntime: source.historyBurnInRuntime,
    burnInMinComparable: source.burnInMinComparable,
    burnInMaxMismatchRate: source.burnInMaxMismatchRate,
    statusElementId: source.statusElementId,
    summaryElementId: source.summaryElementId,
    historyViewHostRuntime: source.historyViewHostRuntime,
    historyStatusRuntime: source.historyStatusRuntime,
    historySummaryRuntime: source.historySummaryRuntime,
    historyPanelHostRuntime: source.historyPanelHostRuntime,
    historyPanelContext: source.historyPanelContext,
    loadHistory: source.loadHistory,
    renderHistory: source.renderHistory,
    renderSummary: source.renderSummary,
    renderBurnInSummary: source.renderBurnInSummary,
    renderCanaryPolicy: source.renderCanaryPolicy,
    setStatus: source.setStatus,
    getElementById: source.getElementById,
    prevButtonId: source.prevButtonId,
    nextButtonId: source.nextButtonId
  });

  return {
    didLoad: true,
    missingStore: false
  };
}

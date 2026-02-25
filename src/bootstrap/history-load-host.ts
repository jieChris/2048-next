function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface HistoryLoadHostResult {
  didLoad: boolean;
  disablePrev: boolean;
  disableNext: boolean;
}

function createNoopHistoryLoadHostResult(): HistoryLoadHostResult {
  return {
    didLoad: false,
    disablePrev: false,
    disableNext: false
  };
}

export function applyHistoryLoadAndRender(input: {
  resetPage?: unknown;
  state?: unknown;
  localHistoryStore?: unknown;
  historyLoadRuntime?: unknown;
  historyQueryRuntime?: unknown;
  historyBurnInRuntime?: unknown;
  burnInMinComparable?: unknown;
  burnInMaxMismatchRate?: unknown;
  renderHistory?: unknown;
  renderSummary?: unknown;
  renderBurnInSummary?: unknown;
  renderCanaryPolicy?: unknown;
  setStatus?: unknown;
}): HistoryLoadHostResult {
  const source = toRecord(input);
  const state = toRecord(source.state);
  if (!source.localHistoryStore) return createNoopHistoryLoadHostResult();

  if (source.resetPage === true) {
    state.page = 1;
  }

  const loadRuntime = toRecord(source.historyLoadRuntime);
  const resolveHistoryLoadPipeline = asFunction<(payload: unknown) => unknown>(
    loadRuntime.resolveHistoryLoadPipeline
  );
  if (!resolveHistoryLoadPipeline) return createNoopHistoryLoadHostResult();

  const loadPipeline = toRecord(
    resolveHistoryLoadPipeline({
      state,
      localHistoryStore: source.localHistoryStore,
      historyQueryRuntime: source.historyQueryRuntime,
      historyBurnInRuntime: source.historyBurnInRuntime,
      burnInMinComparable: source.burnInMinComparable,
      burnInMaxMismatchRate: source.burnInMaxMismatchRate
    })
  );

  const renderHistory = asFunction<(result: unknown) => unknown>(source.renderHistory);
  const renderSummary = asFunction<(result: unknown) => unknown>(source.renderSummary);
  const renderBurnInSummary = asFunction<(summary: unknown) => unknown>(source.renderBurnInSummary);
  const renderCanaryPolicy = asFunction<() => unknown>(source.renderCanaryPolicy);
  const setStatus = asFunction<(text: unknown, isError: unknown) => unknown>(source.setStatus);

  if (renderHistory) renderHistory(loadPipeline.listResult);
  if (renderSummary) renderSummary(loadPipeline.listResult);
  if (renderBurnInSummary) renderBurnInSummary(loadPipeline.burnInSummary);
  if (renderCanaryPolicy) renderCanaryPolicy();
  if (setStatus) setStatus("", false);

  const pagerState = toRecord(loadPipeline.pagerState);
  return {
    didLoad: true,
    disablePrev: pagerState.disablePrev === true,
    disableNext: pagerState.disableNext === true
  };
}

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

export interface HistoryPagerButtonStateApplyResult {
  didApply: boolean;
}

export interface HistoryLoadWithPagerResult extends HistoryLoadHostResult {
  didApplyPagerState: boolean;
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
  getElementById?: unknown;
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
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const statusElementId =
    typeof source.statusElementId === "string" ? source.statusElementId : "history-status";
  const summaryElementId =
    typeof source.summaryElementId === "string" ? source.summaryElementId : "history-summary";
  const historyViewHostRuntime = toRecord(source.historyViewHostRuntime);
  const applyHistoryStatus = asFunction<(args: unknown) => unknown>(
    historyViewHostRuntime.applyHistoryStatus
  );
  const applyHistorySummary = asFunction<(args: unknown) => unknown>(
    historyViewHostRuntime.applyHistorySummary
  );
  const historyPanelHostRuntime = toRecord(source.historyPanelHostRuntime);
  const applyHistoryRecordListPanelRender = asFunction<(args: unknown) => unknown>(
    historyPanelHostRuntime.applyHistoryRecordListPanelRender
  );
  const applyHistoryBurnInPanelRender = asFunction<(args: unknown) => unknown>(
    historyPanelHostRuntime.applyHistoryBurnInPanelRender
  );
  const applyHistoryCanaryPolicyPanelRender = asFunction<(args: unknown) => unknown>(
    historyPanelHostRuntime.applyHistoryCanaryPolicyPanelRender
  );
  const historyPanelContext = toRecord(source.historyPanelContext);
  const hasPanelRenderDelegates =
    !!applyHistoryRecordListPanelRender &&
    !!applyHistoryBurnInPanelRender &&
    !!applyHistoryCanaryPolicyPanelRender;

  if (hasPanelRenderDelegates) {
    applyHistoryRecordListPanelRender({
      getElementById: historyPanelContext.getElementById,
      listElementId: historyPanelContext.listElementId,
      result: loadPipeline.listResult,
      documentLike: historyPanelContext.documentLike,
      localHistoryStore: historyPanelContext.localHistoryStore,
      modeCatalog: historyPanelContext.modeCatalog,
      historyAdapterHostRuntime: historyPanelContext.historyAdapterHostRuntime,
      historyAdapterDiagnosticsRuntime: historyPanelContext.historyAdapterDiagnosticsRuntime,
      historyRecordViewRuntime: historyPanelContext.historyRecordViewRuntime,
      historyRecordItemRuntime: historyPanelContext.historyRecordItemRuntime,
      historyRecordActionsRuntime: historyPanelContext.historyRecordActionsRuntime,
      historyRecordHostRuntime: historyPanelContext.historyRecordHostRuntime,
      historyExportRuntime: historyPanelContext.historyExportRuntime,
      historyRecordListHostRuntime: historyPanelContext.historyRecordListHostRuntime,
      historyBoardRuntime: historyPanelContext.historyBoardRuntime,
      confirmAction: historyPanelContext.confirmAction,
      setStatus: source.setStatus,
      loadHistory: source.loadHistory,
      navigateToHref: historyPanelContext.navigateToHref
    });
    applyHistoryBurnInPanelRender({
      getElementById: historyPanelContext.getElementById,
      panelElementId: historyPanelContext.burnInPanelElementId,
      adapterFilterElementId: historyPanelContext.adapterFilterElementId,
      summary: loadPipeline.burnInSummary,
      state,
      historyBurnInHostRuntime: historyPanelContext.historyBurnInHostRuntime,
      historyBurnInRuntime: historyPanelContext.historyBurnInRuntime,
      loadHistory: source.loadHistory
    });
    applyHistoryCanaryPolicyPanelRender({
      getElementById: historyPanelContext.getElementById,
      panelElementId: historyPanelContext.canaryPanelElementId,
      runtime: historyPanelContext.runtime,
      readStorageValue: historyPanelContext.readStorageValue,
      adapterModeStorageKey: historyPanelContext.adapterModeStorageKey,
      defaultModeStorageKey: historyPanelContext.defaultModeStorageKey,
      forceLegacyStorageKey: historyPanelContext.forceLegacyStorageKey,
      historyCanarySourceRuntime: historyPanelContext.historyCanarySourceRuntime,
      historyCanaryPolicyRuntime: historyPanelContext.historyCanaryPolicyRuntime,
      historyCanaryViewRuntime: historyPanelContext.historyCanaryViewRuntime,
      historyCanaryPanelRuntime: historyPanelContext.historyCanaryPanelRuntime,
      historyCanaryActionRuntime: historyPanelContext.historyCanaryActionRuntime,
      writeStorageValue: historyPanelContext.writeStorageValue,
      loadHistory: source.loadHistory,
      setStatus: source.setStatus,
      historyCanaryHostRuntime: historyPanelContext.historyCanaryHostRuntime
    });
  } else {
    if (renderHistory) renderHistory(loadPipeline.listResult);
    if (renderBurnInSummary) renderBurnInSummary(loadPipeline.burnInSummary);
    if (renderCanaryPolicy) renderCanaryPolicy();
  }
  if (applyHistorySummary) {
    applyHistorySummary({
      getElementById: source.getElementById,
      summaryElementId,
      result: loadPipeline.listResult,
      state,
      historySummaryRuntime: source.historySummaryRuntime
    });
  } else if (renderSummary) {
    renderSummary(loadPipeline.listResult);
  }
  if (applyHistoryStatus) {
    applyHistoryStatus({
      getElementById: getElementById,
      statusElementId,
      text: "",
      isError: false,
      historyStatusRuntime: source.historyStatusRuntime
    });
  } else if (setStatus) {
    setStatus("", false);
  }

  const pagerState = toRecord(loadPipeline.pagerState);
  return {
    didLoad: true,
    disablePrev: pagerState.disablePrev === true,
    disableNext: pagerState.disableNext === true
  };
}

export function applyHistoryPagerButtonState(input: {
  prevButton?: unknown;
  nextButton?: unknown;
  loadResult?: unknown;
}): HistoryPagerButtonStateApplyResult {
  const source = toRecord(input);
  const loadResult = toRecord(source.loadResult);

  const prevButton = toRecord(source.prevButton);
  if ("disabled" in prevButton) {
    prevButton.disabled = loadResult.disablePrev === true;
  }

  const nextButton = toRecord(source.nextButton);
  if ("disabled" in nextButton) {
    nextButton.disabled = loadResult.disableNext === true;
  }

  return {
    didApply: true
  };
}

export function applyHistoryLoadWithPager(input: {
  resetPage?: unknown;
  state?: unknown;
  localHistoryStore?: unknown;
  historyLoadRuntime?: unknown;
  historyQueryRuntime?: unknown;
  historyBurnInRuntime?: unknown;
  burnInMinComparable?: unknown;
  burnInMaxMismatchRate?: unknown;
  getElementById?: unknown;
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
}): HistoryLoadWithPagerResult {
  const source = toRecord(input);
  const loadResult = applyHistoryLoadAndRender(source);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const prevButtonId = typeof source.prevButtonId === "string" ? source.prevButtonId : "history-prev-page";
  const nextButtonId = typeof source.nextButtonId === "string" ? source.nextButtonId : "history-next-page";
  const prevButton = getElementById ? getElementById(prevButtonId) : null;
  const nextButton = getElementById ? getElementById(nextButtonId) : null;
  const pagerApplyResult = applyHistoryPagerButtonState({
    prevButton,
    nextButton,
    loadResult
  });

  return {
    didLoad: loadResult.didLoad === true,
    disablePrev: loadResult.disablePrev === true,
    disableNext: loadResult.disableNext === true,
    didApplyPagerState: pagerApplyResult.didApply === true
  };
}

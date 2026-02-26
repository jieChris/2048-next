function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function hasField(target: unknown, key: string): boolean {
  return !!target && typeof target === "object" && key in (target as Record<string, unknown>);
}

function bindListener(
  element: unknown,
  eventName: string,
  handler: (...args: never[]) => unknown
): boolean {
  const addEventListener = asFunction<(name: string, cb: (...args: never[]) => unknown) => unknown>(
    toRecord(element).addEventListener
  );
  if (!addEventListener) return false;
  (addEventListener as unknown as Function).call(element, eventName, handler);
  return true;
}

function queryNode(node: unknown, selector: string): unknown {
  const querySelector = asFunction<(value: string) => unknown>(toRecord(node).querySelector);
  if (!querySelector) return null;
  return (querySelector as unknown as Function).call(node, selector);
}

export interface HistoryBurnInPanelRenderState {
  panelHtml: string;
  shouldBindMismatchAction: boolean;
}

export interface HistoryBurnInMismatchFocusClickState {
  shouldApply: boolean;
  nextAdapterParityFilter: string;
  nextSelectValue: string;
  shouldReload: boolean;
  resetPage: boolean;
}

export interface HistoryBurnInSummaryRenderApplyResult {
  didRender: boolean;
  didBindMismatchAction: boolean;
}

function createNoopMismatchFocusClickState(): HistoryBurnInMismatchFocusClickState {
  return {
    shouldApply: false,
    nextAdapterParityFilter: "",
    nextSelectValue: "",
    shouldReload: false,
    resetPage: false
  };
}

function toText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function resolveHistoryBurnInPanelRenderState(input: {
  summary?: unknown;
  historyBurnInRuntime?: unknown;
}): HistoryBurnInPanelRenderState {
  const source = isRecord(input) ? input : {};
  const runtime = toRecord(source.historyBurnInRuntime);
  const resolveHistoryBurnInSummaryState = asFunction<(summary: unknown) => unknown>(
    runtime.resolveHistoryBurnInSummaryState
  );
  const resolveHistoryBurnInPanelHtml = asFunction<(summary: unknown, state: unknown) => unknown>(
    runtime.resolveHistoryBurnInPanelHtml
  );
  if (!resolveHistoryBurnInSummaryState || !resolveHistoryBurnInPanelHtml) {
    return {
      panelHtml: "",
      shouldBindMismatchAction: false
    };
  }

  const summaryState = toRecord(resolveHistoryBurnInSummaryState(source.summary));
  return {
    panelHtml: toText(resolveHistoryBurnInPanelHtml(source.summary, summaryState), ""),
    shouldBindMismatchAction: summaryState.hasSummary === true
  };
}

export function resolveHistoryBurnInMismatchFocusClickState(input: {
  historyBurnInRuntime?: unknown;
}): HistoryBurnInMismatchFocusClickState {
  const source = isRecord(input) ? input : {};
  const runtime = toRecord(source.historyBurnInRuntime);
  const resolveHistoryBurnInMismatchFocusActionState = asFunction<() => unknown>(
    runtime.resolveHistoryBurnInMismatchFocusActionState
  );
  if (!resolveHistoryBurnInMismatchFocusActionState) return createNoopMismatchFocusClickState();

  const actionState = toRecord(resolveHistoryBurnInMismatchFocusActionState());
  return {
    shouldApply: actionState.shouldApply === true,
    nextAdapterParityFilter: toText(actionState.nextAdapterParityFilter, ""),
    nextSelectValue: toText(actionState.nextSelectValue, ""),
    shouldReload: actionState.shouldReload === true,
    resetPage: actionState.resetPage === true
  };
}

export function applyHistoryBurnInSummaryRender(input: {
  panelElement?: unknown;
  summary?: unknown;
  historyBurnInRuntime?: unknown;
  adapterFilterElement?: unknown;
  setAdapterParityFilter?: unknown;
  loadHistory?: unknown;
}): HistoryBurnInSummaryRenderApplyResult {
  const source = isRecord(input) ? input : {};
  const panelElement = toRecord(source.panelElement);
  if (!hasField(panelElement, "innerHTML")) {
    return {
      didRender: false,
      didBindMismatchAction: false
    };
  }

  const panelState = resolveHistoryBurnInPanelRenderState({
    summary: source.summary,
    historyBurnInRuntime: source.historyBurnInRuntime
  });
  panelElement.innerHTML = panelState.panelHtml;
  if (panelState.shouldBindMismatchAction !== true) {
    return {
      didRender: true,
      didBindMismatchAction: false
    };
  }

  const setAdapterParityFilter = asFunction<(nextValue: unknown) => unknown>(
    source.setAdapterParityFilter
  );
  const loadHistory = asFunction<(resetPage: unknown) => unknown>(source.loadHistory);
  const adapterFilterElement = toRecord(source.adapterFilterElement);

  const mismatchBtn = queryNode(panelElement, ".history-burnin-focus-mismatch");
  const didBindMismatchAction = bindListener(mismatchBtn, "click", function () {
    const actionState = resolveHistoryBurnInMismatchFocusClickState({
      historyBurnInRuntime: source.historyBurnInRuntime
    });
    if (actionState.shouldApply !== true) return;
    if (hasField(adapterFilterElement, "value")) {
      adapterFilterElement.value = actionState.nextSelectValue;
    }
    if (setAdapterParityFilter) {
      setAdapterParityFilter(actionState.nextAdapterParityFilter);
    }
    if (loadHistory && actionState.shouldReload === true) {
      loadHistory(actionState.resetPage);
    }
  });

  return {
    didRender: true,
    didBindMismatchAction
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
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

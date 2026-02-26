function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface HistoryPanelHostResult {
  didRender: boolean;
}

function getNode(getElementById: ((id: string) => unknown) | null, id: string): unknown {
  return getElementById ? getElementById(id) : null;
}

export function applyHistoryBurnInPanelRender(input: {
  getElementById?: unknown;
  panelElementId?: unknown;
  adapterFilterElementId?: unknown;
  summary?: unknown;
  state?: unknown;
  historyBurnInHostRuntime?: unknown;
  historyBurnInRuntime?: unknown;
  loadHistory?: unknown;
}): HistoryPanelHostResult {
  const source = toRecord(input);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const panelElementId =
    typeof source.panelElementId === "string" ? source.panelElementId : "history-burnin-summary";
  const adapterFilterElementId =
    typeof source.adapterFilterElementId === "string"
      ? source.adapterFilterElementId
      : "history-adapter-filter";
  const panelElement = getNode(getElementById, panelElementId);
  if (!panelElement) {
    return {
      didRender: false
    };
  }

  const state = toRecord(source.state);
  const historyBurnInHostRuntime = toRecord(source.historyBurnInHostRuntime);
  const applyHistoryBurnInSummaryRender = asFunction<(args: unknown) => unknown>(
    historyBurnInHostRuntime.applyHistoryBurnInSummaryRender
  );
  if (!applyHistoryBurnInSummaryRender) {
    return {
      didRender: false
    };
  }

  applyHistoryBurnInSummaryRender({
    panelElement,
    summary: source.summary,
    historyBurnInRuntime: source.historyBurnInRuntime,
    adapterFilterElement: getNode(getElementById, adapterFilterElementId),
    setAdapterParityFilter: function (nextValue: unknown) {
      state.adapterParityFilter = nextValue;
    },
    loadHistory: source.loadHistory
  });

  return {
    didRender: true
  };
}

export function applyHistoryCanaryPolicyPanelRender(input: {
  getElementById?: unknown;
  panelElementId?: unknown;
  runtime?: unknown;
  readStorageValue?: unknown;
  adapterModeStorageKey?: unknown;
  defaultModeStorageKey?: unknown;
  forceLegacyStorageKey?: unknown;
  historyCanarySourceRuntime?: unknown;
  historyCanaryPolicyRuntime?: unknown;
  historyCanaryViewRuntime?: unknown;
  historyCanaryPanelRuntime?: unknown;
  historyCanaryActionRuntime?: unknown;
  writeStorageValue?: unknown;
  loadHistory?: unknown;
  setStatus?: unknown;
  historyCanaryHostRuntime?: unknown;
}): HistoryPanelHostResult {
  const source = toRecord(input);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const panelElementId =
    typeof source.panelElementId === "string" ? source.panelElementId : "history-canary-policy";
  const panelElement = getNode(getElementById, panelElementId);
  if (!panelElement) {
    return {
      didRender: false
    };
  }

  const historyCanaryHostRuntime = toRecord(source.historyCanaryHostRuntime);
  const applyHistoryCanaryPanelRender = asFunction<(args: unknown) => unknown>(
    historyCanaryHostRuntime.applyHistoryCanaryPanelRender
  );
  if (!applyHistoryCanaryPanelRender) {
    return {
      didRender: false
    };
  }

  applyHistoryCanaryPanelRender({
    panelElement,
    runtime: source.runtime,
    readStorageValue: source.readStorageValue,
    adapterModeStorageKey: source.adapterModeStorageKey,
    defaultModeStorageKey: source.defaultModeStorageKey,
    forceLegacyStorageKey: source.forceLegacyStorageKey,
    historyCanarySourceRuntime: source.historyCanarySourceRuntime,
    historyCanaryPolicyRuntime: source.historyCanaryPolicyRuntime,
    historyCanaryViewRuntime: source.historyCanaryViewRuntime,
    historyCanaryPanelRuntime: source.historyCanaryPanelRuntime,
    historyCanaryActionRuntime: source.historyCanaryActionRuntime,
    writeStorageValue: source.writeStorageValue,
    loadHistory: source.loadHistory,
    setStatus: source.setStatus
  });

  return {
    didRender: true
  };
}

export function applyHistoryRecordListPanelRender(input: {
  getElementById?: unknown;
  listElementId?: unknown;
  result?: unknown;
  documentLike?: unknown;
  localHistoryStore?: unknown;
  modeCatalog?: unknown;
  historyAdapterHostRuntime?: unknown;
  historyAdapterDiagnosticsRuntime?: unknown;
  historyRecordViewRuntime?: unknown;
  historyRecordItemRuntime?: unknown;
  historyRecordActionsRuntime?: unknown;
  historyRecordHostRuntime?: unknown;
  historyExportRuntime?: unknown;
  historyRecordListHostRuntime?: unknown;
  historyBoardRuntime?: unknown;
  confirmAction?: unknown;
  setStatus?: unknown;
  loadHistory?: unknown;
  navigateToHref?: unknown;
}): HistoryPanelHostResult {
  const source = toRecord(input);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const listElementId = typeof source.listElementId === "string" ? source.listElementId : "history-list";
  const listElement = getNode(getElementById, listElementId);
  if (!listElement) {
    return {
      didRender: false
    };
  }

  const historyRecordListHostRuntime = toRecord(source.historyRecordListHostRuntime);
  const applyHistoryRecordListRender = asFunction<(args: unknown) => unknown>(
    historyRecordListHostRuntime.applyHistoryRecordListRender
  );
  if (!applyHistoryRecordListRender) {
    return {
      didRender: false
    };
  }

  const historyBoardRuntime = toRecord(source.historyBoardRuntime);
  const resolveHistoryFinalBoardHtml = asFunction<(board: unknown, width: unknown, height: unknown) => unknown>(
    historyBoardRuntime.resolveHistoryFinalBoardHtml
  );
  const boardToHtml = resolveHistoryFinalBoardHtml
    ? function (board: unknown, width: unknown, height: unknown) {
        return resolveHistoryFinalBoardHtml(board, width, height);
      }
    : function () {
        return "";
      };

  applyHistoryRecordListRender({
    listElement,
    result: source.result,
    documentLike: source.documentLike,
    localHistoryStore: source.localHistoryStore,
    modeCatalog: source.modeCatalog,
    historyAdapterHostRuntime: source.historyAdapterHostRuntime,
    historyAdapterDiagnosticsRuntime: source.historyAdapterDiagnosticsRuntime,
    historyRecordViewRuntime: source.historyRecordViewRuntime,
    historyRecordItemRuntime: source.historyRecordItemRuntime,
    historyRecordActionsRuntime: source.historyRecordActionsRuntime,
    historyRecordHostRuntime: source.historyRecordHostRuntime,
    historyExportRuntime: source.historyExportRuntime,
    boardToHtml,
    confirmAction: source.confirmAction,
    setStatus: source.setStatus,
    loadHistory: source.loadHistory,
    navigateToHref: source.navigateToHref
  });

  return {
    didRender: true
  };
}

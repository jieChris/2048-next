function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export interface HistoryStartupHostResult {
  started: boolean;
  missingStore: boolean;
  didInitModeFilter: boolean;
  didBindControls: boolean;
}

export function applyHistoryStartup(input: {
  localHistoryStore?: unknown;
  setStatus?: unknown;
  initModeFilter?: unknown;
  bindToolbarActions?: unknown;
  loadHistory?: unknown;
  historyControlsHostRuntime?: unknown;
  getElementById?: unknown;
  modeElementId?: unknown;
  modeCatalog?: unknown;
  historyModeFilterRuntime?: unknown;
  historyModeFilterHostRuntime?: unknown;
  documentLike?: unknown;
  state?: unknown;
  historyFilterHostRuntime?: unknown;
  historyQueryRuntime?: unknown;
  historyExportRuntime?: unknown;
  historyToolbarRuntime?: unknown;
  historyToolbarHostRuntime?: unknown;
  historyToolbarBindHostRuntime?: unknown;
  historyImportRuntime?: unknown;
  historyImportFileRuntime?: unknown;
  historyImportHostRuntime?: unknown;
  historyImportBindHostRuntime?: unknown;
  historyToolbarEventsRuntime?: unknown;
  historyToolbarEventsHostRuntime?: unknown;
  confirmAction?: unknown;
  createDate?: unknown;
  createFileReader?: unknown;
}): HistoryStartupHostResult {
  const source = toRecord(input);
  const setStatus = asFunction<(text: unknown, isError: unknown) => unknown>(source.setStatus);
  const initModeFilter = asFunction<() => unknown>(source.initModeFilter);
  const bindToolbarActions = asFunction<() => unknown>(source.bindToolbarActions);
  const loadHistory = asFunction<(resetPage: unknown) => unknown>(source.loadHistory);
  const historyControlsHostRuntime = toRecord(source.historyControlsHostRuntime);
  const applyHistoryModeFilterInitialization = asFunction<(args: unknown) => unknown>(
    historyControlsHostRuntime.applyHistoryModeFilterInitialization
  );
  const bindHistoryControls = asFunction<(args: unknown) => unknown>(
    historyControlsHostRuntime.bindHistoryControls
  );

  if (!source.localHistoryStore) {
    if (setStatus) setStatus("本地历史模块未加载", true);
    return {
      started: false,
      missingStore: true,
      didInitModeFilter: false,
      didBindControls: false
    };
  }

  let didInitModeFilter = false;
  if (applyHistoryModeFilterInitialization) {
    applyHistoryModeFilterInitialization({
      getElementById: source.getElementById,
      modeElementId: source.modeElementId,
      modeCatalog: source.modeCatalog,
      historyModeFilterRuntime: source.historyModeFilterRuntime,
      historyModeFilterHostRuntime: source.historyModeFilterHostRuntime,
      documentLike: source.documentLike
    });
    didInitModeFilter = true;
  } else if (initModeFilter) {
    initModeFilter();
    didInitModeFilter = true;
  }

  let didBindControls = false;
  if (bindHistoryControls) {
    bindHistoryControls({
      getElementById: source.getElementById,
      localHistoryStore: source.localHistoryStore,
      state: source.state,
      setStatus: source.setStatus,
      loadHistory: source.loadHistory,
      historyFilterHostRuntime: source.historyFilterHostRuntime,
      historyQueryRuntime: source.historyQueryRuntime,
      historyExportRuntime: source.historyExportRuntime,
      historyToolbarRuntime: source.historyToolbarRuntime,
      historyToolbarHostRuntime: source.historyToolbarHostRuntime,
      historyToolbarBindHostRuntime: source.historyToolbarBindHostRuntime,
      historyImportRuntime: source.historyImportRuntime,
      historyImportFileRuntime: source.historyImportFileRuntime,
      historyImportHostRuntime: source.historyImportHostRuntime,
      historyImportBindHostRuntime: source.historyImportBindHostRuntime,
      historyToolbarEventsRuntime: source.historyToolbarEventsRuntime,
      historyToolbarEventsHostRuntime: source.historyToolbarEventsHostRuntime,
      confirmAction: source.confirmAction,
      createDate: source.createDate,
      createFileReader: source.createFileReader
    });
    didBindControls = true;
  } else if (bindToolbarActions) {
    bindToolbarActions();
    didBindControls = true;
  }

  if (loadHistory) loadHistory(true);
  return {
    started: true,
    missingStore: false,
    didInitModeFilter,
    didBindControls
  };
}

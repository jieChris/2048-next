function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface HistoryControlsModeFilterInitResult {
  didInit: boolean;
}

export interface HistoryControlsBindResult {
  didBind: boolean;
}

export function applyHistoryModeFilterInitialization(input: {
  getElementById?: unknown;
  modeElementId?: unknown;
  modeCatalog?: unknown;
  historyModeFilterRuntime?: unknown;
  historyModeFilterHostRuntime?: unknown;
  documentLike?: unknown;
}): HistoryControlsModeFilterInitResult {
  const source = toRecord(input);
  const historyModeFilterHostRuntime = toRecord(source.historyModeFilterHostRuntime);
  const applyHistoryModeFilterOptionsRender = asFunction<(args: unknown) => unknown>(
    historyModeFilterHostRuntime.applyHistoryModeFilterOptionsRender
  );
  if (!applyHistoryModeFilterOptionsRender) {
    return {
      didInit: false
    };
  }

  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const modeElementId = typeof source.modeElementId === "string" ? source.modeElementId : "history-mode";
  applyHistoryModeFilterOptionsRender({
    selectElement: getElementById ? getElementById(modeElementId) : null,
    modeCatalog: source.modeCatalog,
    historyModeFilterRuntime: source.historyModeFilterRuntime,
    documentLike: source.documentLike
  });

  return {
    didInit: true
  };
}

export function bindHistoryControls(input: {
  getElementById?: unknown;
  localHistoryStore?: unknown;
  state?: unknown;
  readFilters?: unknown;
  setStatus?: unknown;
  loadHistory?: unknown;
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
}): HistoryControlsBindResult {
  const source = toRecord(input);
  const historyToolbarBindHostRuntime = toRecord(source.historyToolbarBindHostRuntime);
  const bindHistoryToolbarActionButtons = asFunction<(args: unknown) => unknown>(
    historyToolbarBindHostRuntime.bindHistoryToolbarActionButtons
  );
  const historyImportBindHostRuntime = toRecord(source.historyImportBindHostRuntime);
  const bindHistoryImportControls = asFunction<(args: unknown) => unknown>(
    historyImportBindHostRuntime.bindHistoryImportControls
  );
  const historyToolbarEventsHostRuntime = toRecord(source.historyToolbarEventsHostRuntime);
  const bindHistoryToolbarPagerAndFilterEvents = asFunction<(args: unknown) => unknown>(
    historyToolbarEventsHostRuntime.bindHistoryToolbarPagerAndFilterEvents
  );

  if (
    !bindHistoryToolbarActionButtons ||
    !bindHistoryImportControls ||
    !bindHistoryToolbarPagerAndFilterEvents
  ) {
    return {
      didBind: false
    };
  }

  bindHistoryToolbarActionButtons({
    getElementById: source.getElementById,
    localHistoryStore: source.localHistoryStore,
    state: source.state,
    readFilters: source.readFilters,
    setStatus: source.setStatus,
    loadHistory: source.loadHistory,
    historyExportRuntime: source.historyExportRuntime,
    historyToolbarRuntime: source.historyToolbarRuntime,
    historyToolbarHostRuntime: source.historyToolbarHostRuntime,
    confirmAction: source.confirmAction,
    createDate: source.createDate
  });

  bindHistoryImportControls({
    getElementById: source.getElementById,
    localHistoryStore: source.localHistoryStore,
    historyImportRuntime: source.historyImportRuntime,
    historyImportFileRuntime: source.historyImportFileRuntime,
    historyImportHostRuntime: source.historyImportHostRuntime,
    confirmAction: source.confirmAction,
    createFileReader: source.createFileReader,
    setStatus: source.setStatus,
    loadHistory: source.loadHistory
  });

  bindHistoryToolbarPagerAndFilterEvents({
    getElementById: source.getElementById,
    state: source.state,
    loadHistory: source.loadHistory,
    historyToolbarEventsRuntime: source.historyToolbarEventsRuntime
  });

  return {
    didBind: true
  };
}

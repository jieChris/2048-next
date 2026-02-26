function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface HistoryToolbarHostActionResult {
  shouldSetStatus: boolean;
  statusText: string;
  isError: boolean;
  shouldReload: boolean;
}

function createNoopResult(): HistoryToolbarHostActionResult {
  return {
    shouldSetStatus: false,
    statusText: "",
    isError: false,
    shouldReload: false
  };
}

export function applyHistoryExportAllAction(input: {
  localHistoryStore?: unknown;
  dateValue?: unknown;
  historyExportRuntime?: unknown;
  historyToolbarRuntime?: unknown;
}): HistoryToolbarHostActionResult {
  const source = isRecord(input) ? input : {};
  if (!source.localHistoryStore) return createNoopResult();

  const exportRuntime = isRecord(source.historyExportRuntime)
    ? source.historyExportRuntime
    : {};
  const toolbarRuntime = isRecord(source.historyToolbarRuntime)
    ? source.historyToolbarRuntime
    : {};
  const downloadHistoryAllRecords = asFunction<(payload: unknown) => unknown>(
    exportRuntime.downloadHistoryAllRecords
  );
  const resolveHistoryExportDateTag = asFunction<(dateValue: unknown) => unknown>(
    toolbarRuntime.resolveHistoryExportDateTag
  );
  const resolveHistoryExportAllFileName = asFunction<(dateTag: unknown) => unknown>(
    toolbarRuntime.resolveHistoryExportAllFileName
  );
  const resolveHistoryExportAllNotice = asFunction<() => unknown>(
    toolbarRuntime.resolveHistoryExportAllNotice
  );
  if (!downloadHistoryAllRecords) return createNoopResult();

  const ok = downloadHistoryAllRecords({
    localHistoryStore: source.localHistoryStore,
    dateValue: source.dateValue,
    resolveDateTag: resolveHistoryExportDateTag,
    resolveFileName: resolveHistoryExportAllFileName
  });
  if (ok !== true) return createNoopResult();

  return {
    shouldSetStatus: true,
    statusText: String(resolveHistoryExportAllNotice ? resolveHistoryExportAllNotice() : ""),
    isError: false,
    shouldReload: false
  };
}

export function applyHistoryMismatchExportAction(input: {
  localHistoryStore?: unknown;
  modeKey?: unknown;
  keyword?: unknown;
  sortBy?: unknown;
  dateValue?: unknown;
  historyExportRuntime?: unknown;
  historyToolbarRuntime?: unknown;
}): HistoryToolbarHostActionResult {
  const source = isRecord(input) ? input : {};
  if (!source.localHistoryStore) return createNoopResult();

  const exportRuntime = isRecord(source.historyExportRuntime)
    ? source.historyExportRuntime
    : {};
  const toolbarRuntime = isRecord(source.historyToolbarRuntime)
    ? source.historyToolbarRuntime
    : {};
  const resolveHistoryMismatchExportQuery = asFunction<(payload: unknown) => unknown>(
    toolbarRuntime.resolveHistoryMismatchExportQuery
  );
  const resolveHistoryExportDateTag = asFunction<(dateValue: unknown) => unknown>(
    toolbarRuntime.resolveHistoryExportDateTag
  );
  const resolveHistoryMismatchExportFileName = asFunction<(dateTag: unknown) => unknown>(
    toolbarRuntime.resolveHistoryMismatchExportFileName
  );
  const resolveHistoryMismatchExportEmptyNotice = asFunction<() => unknown>(
    toolbarRuntime.resolveHistoryMismatchExportEmptyNotice
  );
  const resolveHistoryMismatchExportSuccessNotice = asFunction<(count: unknown) => unknown>(
    toolbarRuntime.resolveHistoryMismatchExportSuccessNotice
  );
  const downloadHistoryMismatchRecords = asFunction<(payload: unknown) => unknown>(
    exportRuntime.downloadHistoryMismatchRecords
  );
  if (!resolveHistoryMismatchExportQuery || !downloadHistoryMismatchRecords) {
    return createNoopResult();
  }

  const queryOptions = resolveHistoryMismatchExportQuery({
    modeKey: source.modeKey,
    keyword: source.keyword,
    sortBy: source.sortBy
  });
  const exportState = downloadHistoryMismatchRecords({
    localHistoryStore: source.localHistoryStore,
    queryOptions,
    maxPages: 100,
    pageSize: 500,
    dateValue: source.dateValue,
    resolveDateTag: resolveHistoryExportDateTag,
    resolveFileName: resolveHistoryMismatchExportFileName
  });
  const exportStateRecord = isRecord(exportState) ? exportState : {};
  if (exportStateRecord.empty === true) {
    return {
      shouldSetStatus: true,
      statusText: String(
        resolveHistoryMismatchExportEmptyNotice ? resolveHistoryMismatchExportEmptyNotice() : ""
      ),
      isError: false,
      shouldReload: false
    };
  }
  if (exportStateRecord.downloaded !== true) return createNoopResult();

  return {
    shouldSetStatus: true,
    statusText: String(
      resolveHistoryMismatchExportSuccessNotice
        ? resolveHistoryMismatchExportSuccessNotice(exportStateRecord.count)
        : ""
    ),
    isError: false,
    shouldReload: false
  };
}

export function applyHistoryClearAllAction(input: {
  localHistoryStore?: unknown;
  historyToolbarRuntime?: unknown;
  confirmAction?: unknown;
}): HistoryToolbarHostActionResult {
  const source = isRecord(input) ? input : {};
  if (!source.localHistoryStore) return createNoopResult();

  const toolbarRuntime = isRecord(source.historyToolbarRuntime)
    ? source.historyToolbarRuntime
    : {};
  const resolveHistoryClearAllActionState = asFunction<() => unknown>(
    toolbarRuntime.resolveHistoryClearAllActionState
  );
  const executeHistoryClearAll = asFunction<(payload: unknown) => unknown>(
    toolbarRuntime.executeHistoryClearAll
  );
  const confirmAction = asFunction<(message: unknown) => unknown>(source.confirmAction);
  if (!resolveHistoryClearAllActionState || !executeHistoryClearAll) return createNoopResult();

  const actionState = resolveHistoryClearAllActionState();
  const actionStateRecord = isRecord(actionState) ? actionState : {};
  if (actionStateRecord.requiresConfirm === true) {
    const confirmResult = confirmAction ? confirmAction(actionStateRecord.confirmMessage) : false;
    if (confirmResult !== true) return createNoopResult();
  }

  const clearState = executeHistoryClearAll({
    localHistoryStore: source.localHistoryStore
  });
  const clearStateRecord = isRecord(clearState) ? clearState : {};
  if (clearStateRecord.cleared !== true) return createNoopResult();

  return {
    shouldSetStatus: true,
    statusText: String(actionStateRecord.successNotice || ""),
    isError: false,
    shouldReload: true
  };
}

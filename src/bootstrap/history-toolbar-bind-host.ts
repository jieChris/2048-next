function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
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
  addEventListener(eventName, handler);
  return true;
}

function applyStatusFromActionResult(
  setStatus: ((text: unknown, isError: unknown) => unknown) | null,
  actionResult: unknown
): void {
  if (!setStatus) return;
  const actionState = toRecord(actionResult);
  if (actionState.shouldSetStatus === true) {
    setStatus(actionState.statusText, actionState.isError);
  }
}

export interface HistoryToolbarBindHostResult {
  didBind: boolean;
  boundControlCount: number;
}

export function bindHistoryToolbarActionButtons(input: {
  getElementById?: unknown;
  localHistoryStore?: unknown;
  state?: unknown;
  readFilters?: unknown;
  setStatus?: unknown;
  loadHistory?: unknown;
  historyExportRuntime?: unknown;
  historyToolbarRuntime?: unknown;
  historyToolbarHostRuntime?: unknown;
  confirmAction?: unknown;
  createDate?: unknown;
}): HistoryToolbarBindHostResult {
  const source = toRecord(input);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const loadHistory = asFunction<(resetPage: unknown) => unknown>(source.loadHistory);
  const setStatus = asFunction<(text: unknown, isError: unknown) => unknown>(source.setStatus);
  if (!getElementById || !loadHistory) {
    return {
      didBind: false,
      boundControlCount: 0
    };
  }

  const state = toRecord(source.state);
  const readFilters = asFunction<() => unknown>(source.readFilters);
  const toolbarHostRuntime = toRecord(source.historyToolbarHostRuntime);
  const applyHistoryExportAllAction = asFunction<(payload: unknown) => unknown>(
    toolbarHostRuntime.applyHistoryExportAllAction
  );
  const applyHistoryMismatchExportAction = asFunction<(payload: unknown) => unknown>(
    toolbarHostRuntime.applyHistoryMismatchExportAction
  );
  const applyHistoryClearAllAction = asFunction<(payload: unknown) => unknown>(
    toolbarHostRuntime.applyHistoryClearAllAction
  );
  const confirmAction = asFunction<(message: unknown) => unknown>(source.confirmAction);
  const createDate = asFunction<() => unknown>(source.createDate);

  let boundControlCount = 0;

  const reloadBtn = getElementById("history-load-btn");
  if (
    bindListener(reloadBtn, "click", function () {
      loadHistory(true);
    })
  ) {
    boundControlCount += 1;
  }

  const exportAllBtn = getElementById("history-export-all-btn");
  if (
    applyHistoryExportAllAction &&
    bindListener(exportAllBtn, "click", function () {
      const actionResult = applyHistoryExportAllAction({
        localHistoryStore: source.localHistoryStore,
        dateValue: createDate ? createDate() : new Date(),
        historyExportRuntime: source.historyExportRuntime,
        historyToolbarRuntime: source.historyToolbarRuntime
      });
      applyStatusFromActionResult(setStatus, actionResult);
    })
  ) {
    boundControlCount += 1;
  }

  const exportMismatchBtn = getElementById("history-export-mismatch-btn");
  if (
    applyHistoryMismatchExportAction &&
    bindListener(exportMismatchBtn, "click", function () {
      if (readFilters) readFilters();
      const actionResult = applyHistoryMismatchExportAction({
        localHistoryStore: source.localHistoryStore,
        modeKey: state.modeKey,
        keyword: state.keyword,
        sortBy: state.sortBy,
        dateValue: createDate ? createDate() : new Date(),
        historyExportRuntime: source.historyExportRuntime,
        historyToolbarRuntime: source.historyToolbarRuntime
      });
      applyStatusFromActionResult(setStatus, actionResult);
    })
  ) {
    boundControlCount += 1;
  }

  const clearAllBtn = getElementById("history-clear-all-btn");
  if (
    applyHistoryClearAllAction &&
    bindListener(clearAllBtn, "click", function () {
      const actionResult = toRecord(
        applyHistoryClearAllAction({
          localHistoryStore: source.localHistoryStore,
          historyToolbarRuntime: source.historyToolbarRuntime,
          confirmAction
        })
      );
      applyStatusFromActionResult(setStatus, actionResult);
      if (actionResult.shouldReload === true) loadHistory(true);
    })
  ) {
    boundControlCount += 1;
  }

  return {
    didBind: boundControlCount > 0,
    boundControlCount
  };
}

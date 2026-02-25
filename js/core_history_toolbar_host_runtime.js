(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function createNoopResult() {
    return {
      shouldSetStatus: false,
      statusText: "",
      isError: false,
      shouldReload: false
    };
  }

  function applyHistoryExportAllAction(input) {
    var source = isRecord(input) ? input : {};
    if (!source.localHistoryStore) return createNoopResult();

    var exportRuntime = isRecord(source.historyExportRuntime)
      ? source.historyExportRuntime
      : {};
    var toolbarRuntime = isRecord(source.historyToolbarRuntime)
      ? source.historyToolbarRuntime
      : {};
    var downloadHistoryAllRecords = asFunction(exportRuntime.downloadHistoryAllRecords);
    var resolveHistoryExportDateTag = asFunction(toolbarRuntime.resolveHistoryExportDateTag);
    var resolveHistoryExportAllFileName = asFunction(toolbarRuntime.resolveHistoryExportAllFileName);
    var resolveHistoryExportAllNotice = asFunction(toolbarRuntime.resolveHistoryExportAllNotice);
    if (!downloadHistoryAllRecords) return createNoopResult();

    var ok = downloadHistoryAllRecords({
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

  function applyHistoryMismatchExportAction(input) {
    var source = isRecord(input) ? input : {};
    if (!source.localHistoryStore) return createNoopResult();

    var exportRuntime = isRecord(source.historyExportRuntime)
      ? source.historyExportRuntime
      : {};
    var toolbarRuntime = isRecord(source.historyToolbarRuntime)
      ? source.historyToolbarRuntime
      : {};
    var resolveHistoryMismatchExportQuery = asFunction(
      toolbarRuntime.resolveHistoryMismatchExportQuery
    );
    var resolveHistoryExportDateTag = asFunction(toolbarRuntime.resolveHistoryExportDateTag);
    var resolveHistoryMismatchExportFileName = asFunction(
      toolbarRuntime.resolveHistoryMismatchExportFileName
    );
    var resolveHistoryMismatchExportEmptyNotice = asFunction(
      toolbarRuntime.resolveHistoryMismatchExportEmptyNotice
    );
    var resolveHistoryMismatchExportSuccessNotice = asFunction(
      toolbarRuntime.resolveHistoryMismatchExportSuccessNotice
    );
    var downloadHistoryMismatchRecords = asFunction(exportRuntime.downloadHistoryMismatchRecords);
    if (!resolveHistoryMismatchExportQuery || !downloadHistoryMismatchRecords) {
      return createNoopResult();
    }

    var queryOptions = resolveHistoryMismatchExportQuery({
      modeKey: source.modeKey,
      keyword: source.keyword,
      sortBy: source.sortBy
    });
    var exportState = downloadHistoryMismatchRecords({
      localHistoryStore: source.localHistoryStore,
      queryOptions: queryOptions,
      maxPages: 100,
      pageSize: 500,
      dateValue: source.dateValue,
      resolveDateTag: resolveHistoryExportDateTag,
      resolveFileName: resolveHistoryMismatchExportFileName
    });
    var exportStateRecord = isRecord(exportState) ? exportState : {};
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

  function applyHistoryClearAllAction(input) {
    var source = isRecord(input) ? input : {};
    if (!source.localHistoryStore) return createNoopResult();

    var toolbarRuntime = isRecord(source.historyToolbarRuntime)
      ? source.historyToolbarRuntime
      : {};
    var resolveHistoryClearAllActionState = asFunction(
      toolbarRuntime.resolveHistoryClearAllActionState
    );
    var executeHistoryClearAll = asFunction(toolbarRuntime.executeHistoryClearAll);
    var confirmAction = asFunction(source.confirmAction);
    if (!resolveHistoryClearAllActionState || !executeHistoryClearAll) {
      return createNoopResult();
    }

    var actionState = resolveHistoryClearAllActionState();
    var actionStateRecord = isRecord(actionState) ? actionState : {};
    if (actionStateRecord.requiresConfirm === true) {
      var confirmResult = confirmAction ? confirmAction(actionStateRecord.confirmMessage) : false;
      if (confirmResult !== true) return createNoopResult();
    }

    var clearState = executeHistoryClearAll({
      localHistoryStore: source.localHistoryStore
    });
    var clearStateRecord = isRecord(clearState) ? clearState : {};
    if (clearStateRecord.cleared !== true) return createNoopResult();

    return {
      shouldSetStatus: true,
      statusText: String(actionStateRecord.successNotice || ""),
      isError: false,
      shouldReload: true
    };
  }

  global.CoreHistoryToolbarHostRuntime = global.CoreHistoryToolbarHostRuntime || {};
  global.CoreHistoryToolbarHostRuntime.applyHistoryExportAllAction = applyHistoryExportAllAction;
  global.CoreHistoryToolbarHostRuntime.applyHistoryMismatchExportAction =
    applyHistoryMismatchExportAction;
  global.CoreHistoryToolbarHostRuntime.applyHistoryClearAllAction = applyHistoryClearAllAction;
})(typeof window !== "undefined" ? window : undefined);

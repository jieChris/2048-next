(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function applyStatusFromActionResult(setStatus, actionResult) {
    if (!setStatus) return;
    var actionState = toRecord(actionResult);
    if (actionState.shouldSetStatus === true) {
      setStatus(actionState.statusText, actionState.isError);
    }
  }

  function bindHistoryToolbarActionButtons(input) {
    var source = toRecord(input);
    var getElementById = asFunction(source.getElementById);
    var loadHistory = asFunction(source.loadHistory);
    var setStatus = asFunction(source.setStatus);
    if (!getElementById || !loadHistory) {
      return {
        didBind: false,
        boundControlCount: 0
      };
    }

    var state = toRecord(source.state);
    var readFilters = asFunction(source.readFilters);
    var toolbarHostRuntime = toRecord(source.historyToolbarHostRuntime);
    var applyHistoryExportAllAction = asFunction(toolbarHostRuntime.applyHistoryExportAllAction);
    var applyHistoryMismatchExportAction = asFunction(
      toolbarHostRuntime.applyHistoryMismatchExportAction
    );
    var applyHistoryClearAllAction = asFunction(toolbarHostRuntime.applyHistoryClearAllAction);
    var confirmAction = asFunction(source.confirmAction);
    var createDate = asFunction(source.createDate);

    var boundControlCount = 0;

    var reloadBtn = getElementById("history-load-btn");
    if (
      bindListener(reloadBtn, "click", function () {
        loadHistory(true);
      })
    ) {
      boundControlCount += 1;
    }

    var exportAllBtn = getElementById("history-export-all-btn");
    if (
      applyHistoryExportAllAction &&
      bindListener(exportAllBtn, "click", function () {
        var actionResult = applyHistoryExportAllAction({
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

    var exportMismatchBtn = getElementById("history-export-mismatch-btn");
    if (
      applyHistoryMismatchExportAction &&
      bindListener(exportMismatchBtn, "click", function () {
        if (readFilters) readFilters();
        var actionResult = applyHistoryMismatchExportAction({
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

    var clearAllBtn = getElementById("history-clear-all-btn");
    if (
      applyHistoryClearAllAction &&
      bindListener(clearAllBtn, "click", function () {
        var actionResult = toRecord(
          applyHistoryClearAllAction({
            localHistoryStore: source.localHistoryStore,
            historyToolbarRuntime: source.historyToolbarRuntime,
            confirmAction: confirmAction
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
      boundControlCount: boundControlCount
    };
  }

  global.CoreHistoryToolbarBindHostRuntime = global.CoreHistoryToolbarBindHostRuntime || {};
  global.CoreHistoryToolbarBindHostRuntime.bindHistoryToolbarActionButtons =
    bindHistoryToolbarActionButtons;
})(typeof window !== "undefined" ? window : undefined);

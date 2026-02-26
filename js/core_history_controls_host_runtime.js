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

  function applyHistoryModeFilterInitialization(input) {
    var source = toRecord(input);
    var historyModeFilterHostRuntime = toRecord(source.historyModeFilterHostRuntime);
    var applyHistoryModeFilterOptionsRender = asFunction(
      historyModeFilterHostRuntime.applyHistoryModeFilterOptionsRender
    );
    if (!applyHistoryModeFilterOptionsRender) {
      return {
        didInit: false
      };
    }

    var getElementById = asFunction(source.getElementById);
    var modeElementId = typeof source.modeElementId === "string" ? source.modeElementId : "history-mode";
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

  function bindHistoryControls(input) {
    var source = toRecord(input);
    var historyToolbarBindHostRuntime = toRecord(source.historyToolbarBindHostRuntime);
    var bindHistoryToolbarActionButtons = asFunction(
      historyToolbarBindHostRuntime.bindHistoryToolbarActionButtons
    );
    var historyImportBindHostRuntime = toRecord(source.historyImportBindHostRuntime);
    var bindHistoryImportControls = asFunction(historyImportBindHostRuntime.bindHistoryImportControls);
    var historyToolbarEventsHostRuntime = toRecord(source.historyToolbarEventsHostRuntime);
    var bindHistoryToolbarPagerAndFilterEvents = asFunction(
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
      historyFilterHostRuntime: source.historyFilterHostRuntime,
      historyQueryRuntime: source.historyQueryRuntime,
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

  global.CoreHistoryControlsHostRuntime = global.CoreHistoryControlsHostRuntime || {};
  global.CoreHistoryControlsHostRuntime.applyHistoryModeFilterInitialization =
    applyHistoryModeFilterInitialization;
  global.CoreHistoryControlsHostRuntime.bindHistoryControls = bindHistoryControls;
})(typeof window !== "undefined" ? window : undefined);

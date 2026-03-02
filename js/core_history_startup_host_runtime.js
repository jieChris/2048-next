(function (global) {
  "use strict";

  if (!global) return;

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function applyHistoryStartup(input) {
    var source = toRecord(input);
    var setStatus = asFunction(source.setStatus);
    var initModeFilter = asFunction(source.initModeFilter);
    var bindToolbarActions = asFunction(source.bindToolbarActions);
    var loadHistory = asFunction(source.loadHistory);
    var historyControlsHostRuntime = toRecord(source.historyControlsHostRuntime);
    var applyHistoryModeFilterInitialization = asFunction(
      historyControlsHostRuntime.applyHistoryModeFilterInitialization
    );
    var applyHistoryBurnInThresholdInitialization = asFunction(
      historyControlsHostRuntime.applyHistoryBurnInThresholdInitialization
    );
    var bindHistoryControls = asFunction(historyControlsHostRuntime.bindHistoryControls);

    if (!source.localHistoryStore) {
      if (setStatus) setStatus("本地历史模块未加载", true);
      return {
        started: false,
        missingStore: true,
        didInitModeFilter: false,
        didInitBurnInThresholds: false,
        didBindControls: false
      };
    }

    var didInitModeFilter = false;
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

    var didInitBurnInThresholds = false;
    if (applyHistoryBurnInThresholdInitialization) {
      applyHistoryBurnInThresholdInitialization({
        getElementById: source.getElementById,
        state: source.state
      });
      didInitBurnInThresholds = true;
    }

    var didBindControls = false;
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
      didInitModeFilter: didInitModeFilter,
      didInitBurnInThresholds: didInitBurnInThresholds,
      didBindControls: didBindControls
    };
  }

  global.CoreHistoryStartupHostRuntime = global.CoreHistoryStartupHostRuntime || {};
  global.CoreHistoryStartupHostRuntime.applyHistoryStartup = applyHistoryStartup;
})(typeof window !== "undefined" ? window : undefined);

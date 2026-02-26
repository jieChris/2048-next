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

  function resolveHistoryPageStatusInput(input) {
    var source = toRecord(input);
    var runtimes = toRecord(source.historyRuntimes);
    return {
      getElementById: source.getElementById,
      statusElementId: typeof source.statusElementId === "string" ? source.statusElementId : "history-status",
      text: source.text,
      isError: source.isError,
      historyStatusRuntime: source.historyStatusRuntime || runtimes.historyStatusRuntime
    };
  }

  function resolveHistoryPageLoadEntryInput(input) {
    var source = toRecord(input);
    var runtimes = toRecord(source.historyRuntimes);
    var historyCanaryStorageRuntime = toRecord(runtimes.historyCanaryStorageRuntime);
    var historyLoadContextHostRuntime = toRecord(runtimes.historyLoadContextHostRuntime);
    var resolveHistoryLoadPanelContext = asFunction(
      historyLoadContextHostRuntime.resolveHistoryLoadPanelContext
    );

    var historyPanelContext = resolveHistoryLoadPanelContext
      ? resolveHistoryLoadPanelContext({
          getElementById: source.getElementById,
          listElementId: source.listElementId,
          documentLike: source.documentLike,
          localHistoryStore: source.localHistoryStore,
          modeCatalog: source.modeCatalog,
          historyAdapterHostRuntime: runtimes.historyAdapterHostRuntime,
          historyAdapterDiagnosticsRuntime: runtimes.historyAdapterDiagnosticsRuntime,
          historyRecordViewRuntime: runtimes.historyRecordViewRuntime,
          historyRecordItemRuntime: runtimes.historyRecordItemRuntime,
          historyRecordActionsRuntime: runtimes.historyRecordActionsRuntime,
          historyRecordHostRuntime: runtimes.historyRecordHostRuntime,
          historyExportRuntime: runtimes.historyExportRuntime,
          historyRecordListHostRuntime: runtimes.historyRecordListHostRuntime,
          historyBoardRuntime: runtimes.historyBoardRuntime,
          confirmAction: source.confirmAction,
          navigateToHref: source.navigateToHref,
          burnInPanelElementId: source.burnInPanelElementId,
          adapterFilterElementId: source.adapterFilterElementId,
          historyBurnInHostRuntime: runtimes.historyBurnInHostRuntime,
          historyBurnInRuntime: runtimes.historyBurnInRuntime,
          canaryPanelElementId: source.canaryPanelElementId,
          runtime: source.runtime,
          readStorageValue: historyCanaryStorageRuntime.readHistoryStorageValue,
          adapterModeStorageKey: source.adapterModeStorageKey,
          defaultModeStorageKey: source.defaultModeStorageKey,
          forceLegacyStorageKey: source.forceLegacyStorageKey,
          historyCanarySourceRuntime: runtimes.historyCanarySourceRuntime,
          historyCanaryPolicyRuntime: runtimes.historyCanaryPolicyRuntime,
          historyCanaryViewRuntime: runtimes.historyCanaryViewRuntime,
          historyCanaryPanelRuntime: runtimes.historyCanaryPanelRuntime,
          historyCanaryActionRuntime: runtimes.historyCanaryActionRuntime,
          historyCanaryHostRuntime: runtimes.historyCanaryHostRuntime,
          writeStorageValue: historyCanaryStorageRuntime.writeHistoryStorageValue
        })
      : {};

    return {
      resetPage: source.resetPage,
      localHistoryStore: source.localHistoryStore,
      historyFilterHostRuntime: runtimes.historyFilterHostRuntime,
      state: source.state,
      historyQueryRuntime: runtimes.historyQueryRuntime,
      getElementById: source.getElementById,
      historyLoadHostRuntime: runtimes.historyLoadHostRuntime,
      historyLoadRuntime: runtimes.historyLoadRuntime,
      historyBurnInRuntime: runtimes.historyBurnInRuntime,
      burnInMinComparable: source.burnInMinComparable,
      burnInMaxMismatchRate: source.burnInMaxMismatchRate,
      statusElementId: typeof source.statusElementId === "string" ? source.statusElementId : "history-status",
      summaryElementId: typeof source.summaryElementId === "string" ? source.summaryElementId : "history-summary",
      historyViewHostRuntime: runtimes.historyViewHostRuntime,
      historyStatusRuntime: runtimes.historyStatusRuntime,
      historySummaryRuntime: runtimes.historySummaryRuntime,
      historyPanelHostRuntime: runtimes.historyPanelHostRuntime,
      historyPanelContext: historyPanelContext,
      loadHistory: source.loadHistory,
      setStatus: source.setStatus,
      prevButtonId: typeof source.prevButtonId === "string" ? source.prevButtonId : "history-prev-page",
      nextButtonId: typeof source.nextButtonId === "string" ? source.nextButtonId : "history-next-page"
    };
  }

  function resolveHistoryPageStartupInput(input) {
    var source = toRecord(input);
    var runtimes = toRecord(source.historyRuntimes);
    return {
      localHistoryStore: source.localHistoryStore,
      setStatus: source.setStatus,
      loadHistory: source.loadHistory,
      historyControlsHostRuntime: runtimes.historyControlsHostRuntime,
      getElementById: source.getElementById,
      modeElementId: typeof source.modeElementId === "string" ? source.modeElementId : "history-mode",
      modeCatalog: source.modeCatalog,
      historyModeFilterRuntime: runtimes.historyModeFilterRuntime,
      historyModeFilterHostRuntime: runtimes.historyModeFilterHostRuntime,
      documentLike: source.documentLike,
      state: source.state,
      historyFilterHostRuntime: runtimes.historyFilterHostRuntime,
      historyQueryRuntime: runtimes.historyQueryRuntime,
      historyExportRuntime: runtimes.historyExportRuntime,
      historyToolbarRuntime: runtimes.historyToolbarRuntime,
      historyToolbarHostRuntime: runtimes.historyToolbarHostRuntime,
      historyToolbarBindHostRuntime: runtimes.historyToolbarBindHostRuntime,
      historyImportRuntime: runtimes.historyImportRuntime,
      historyImportFileRuntime: runtimes.historyImportFileRuntime,
      historyImportHostRuntime: runtimes.historyImportHostRuntime,
      historyImportBindHostRuntime: runtimes.historyImportBindHostRuntime,
      historyToolbarEventsRuntime: runtimes.historyToolbarEventsRuntime,
      historyToolbarEventsHostRuntime: runtimes.historyToolbarEventsHostRuntime,
      confirmAction: source.confirmAction,
      createDate: source.createDate,
      createFileReader: source.createFileReader
    };
  }

  global.CoreHistoryPageHostRuntime = global.CoreHistoryPageHostRuntime || {};
  global.CoreHistoryPageHostRuntime.resolveHistoryPageStatusInput = resolveHistoryPageStatusInput;
  global.CoreHistoryPageHostRuntime.resolveHistoryPageLoadEntryInput = resolveHistoryPageLoadEntryInput;
  global.CoreHistoryPageHostRuntime.resolveHistoryPageStartupInput = resolveHistoryPageStartupInput;
})(typeof window !== "undefined" ? window : undefined);

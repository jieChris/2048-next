(function () {
  function el(id) {
    return document.getElementById(id);
  }

  var state = {
    page: 1,
    pageSize: 30,
    modeKey: "",
    keyword: "",
    sortBy: "ended_desc",
    adapterParityFilter: "all",
    burnInWindow: "200",
    sustainedWindows: "3"
  };
  var BURN_IN_MIN_COMPARABLE = 50;
  var BURN_IN_MAX_MISMATCH_RATE = 1;
  var ADAPTER_MODE_STORAGE_KEY = "engine_adapter_mode";
  var ADAPTER_DEFAULT_STORAGE_KEY = "engine_adapter_default_mode";
  var ADAPTER_FORCE_LEGACY_STORAGE_KEY = "engine_adapter_force_legacy";
  var historyRuntimeContractRuntime = window.CoreHistoryRuntimeContractRuntime;
  if (
    !historyRuntimeContractRuntime ||
    typeof historyRuntimeContractRuntime.resolveHistoryRuntimeContracts !== "function"
  ) {
    throw new Error("CoreHistoryRuntimeContractRuntime is required");
  }
  var historyRuntimes = historyRuntimeContractRuntime.resolveHistoryRuntimeContracts(window);
  var historyCanaryPolicyRuntime = historyRuntimes.historyCanaryPolicyRuntime;
  var historyCanaryActionRuntime = historyRuntimes.historyCanaryActionRuntime;
  var historyCanarySourceRuntime = historyRuntimes.historyCanarySourceRuntime;
  var historyCanaryPanelRuntime = historyRuntimes.historyCanaryPanelRuntime;
  var historyCanaryHostRuntime = historyRuntimes.historyCanaryHostRuntime;
  var historyAdapterDiagnosticsRuntime = historyRuntimes.historyAdapterDiagnosticsRuntime;
  var historyAdapterHostRuntime = historyRuntimes.historyAdapterHostRuntime;
  var historyBoardRuntime = historyRuntimes.historyBoardRuntime;
  var historyBurnInRuntime = historyRuntimes.historyBurnInRuntime;
  var historyBurnInHostRuntime = historyRuntimes.historyBurnInHostRuntime;
  var historyCanaryViewRuntime = historyRuntimes.historyCanaryViewRuntime;
  var historySummaryRuntime = historyRuntimes.historySummaryRuntime;
  var historyStatusRuntime = historyRuntimes.historyStatusRuntime;
  var historyViewHostRuntime = historyRuntimes.historyViewHostRuntime;
  var historyExportRuntime = historyRuntimes.historyExportRuntime;
  var historyQueryRuntime = historyRuntimes.historyQueryRuntime;
  var historyFilterHostRuntime = historyRuntimes.historyFilterHostRuntime;
  var historyLoadRuntime = historyRuntimes.historyLoadRuntime;
  var historyLoadHostRuntime = historyRuntimes.historyLoadHostRuntime;
  var historyLoadEntryHostRuntime = historyRuntimes.historyLoadEntryHostRuntime;
  var historyPanelHostRuntime = historyRuntimes.historyPanelHostRuntime;
  var historyRecordViewRuntime = historyRuntimes.historyRecordViewRuntime;
  var historyRecordItemRuntime = historyRuntimes.historyRecordItemRuntime;
  var historyRecordListHostRuntime = historyRuntimes.historyRecordListHostRuntime;
  var historyImportRuntime = historyRuntimes.historyImportRuntime;
  var historyImportFileRuntime = historyRuntimes.historyImportFileRuntime;
  var historyImportHostRuntime = historyRuntimes.historyImportHostRuntime;
  var historyImportBindHostRuntime = historyRuntimes.historyImportBindHostRuntime;
  var historyRecordActionsRuntime = historyRuntimes.historyRecordActionsRuntime;
  var historyRecordHostRuntime = historyRuntimes.historyRecordHostRuntime;
  var historyCanaryStorageRuntime = historyRuntimes.historyCanaryStorageRuntime;
  var historyToolbarRuntime = historyRuntimes.historyToolbarRuntime;
  var historyToolbarHostRuntime = historyRuntimes.historyToolbarHostRuntime;
  var historyToolbarBindHostRuntime = historyRuntimes.historyToolbarBindHostRuntime;
  var historyToolbarEventsRuntime = historyRuntimes.historyToolbarEventsRuntime;
  var historyToolbarEventsHostRuntime = historyRuntimes.historyToolbarEventsHostRuntime;
  var historyModeFilterRuntime = historyRuntimes.historyModeFilterRuntime;
  var historyModeFilterHostRuntime = historyRuntimes.historyModeFilterHostRuntime;
  var historyControlsHostRuntime = historyRuntimes.historyControlsHostRuntime;
  var historyStartupHostRuntime = historyRuntimes.historyStartupHostRuntime;

  function setStatus(text, isError) {
    historyViewHostRuntime.applyHistoryStatus({
      getElementById: el,
      statusElementId: "history-status",
      text: text,
      isError: isError,
      historyStatusRuntime: historyStatusRuntime
    });
  }

  function renderBurnInSummary(summary) {
    historyPanelHostRuntime.applyHistoryBurnInPanelRender({
      getElementById: el,
      panelElementId: "history-burnin-summary",
      adapterFilterElementId: "history-adapter-filter",
      summary: summary,
      state: state,
      historyBurnInHostRuntime: historyBurnInHostRuntime,
      historyBurnInRuntime: historyBurnInRuntime,
      loadHistory: loadHistory
    });
  }

  function renderCanaryPolicy() {
    historyPanelHostRuntime.applyHistoryCanaryPolicyPanelRender({
      getElementById: el,
      panelElementId: "history-canary-policy",
      runtime: window.LegacyAdapterRuntime,
      readStorageValue: historyCanaryStorageRuntime.readHistoryStorageValue,
      adapterModeStorageKey: ADAPTER_MODE_STORAGE_KEY,
      defaultModeStorageKey: ADAPTER_DEFAULT_STORAGE_KEY,
      forceLegacyStorageKey: ADAPTER_FORCE_LEGACY_STORAGE_KEY,
      historyCanarySourceRuntime: historyCanarySourceRuntime,
      historyCanaryPolicyRuntime: historyCanaryPolicyRuntime,
      historyCanaryViewRuntime: historyCanaryViewRuntime,
      historyCanaryPanelRuntime: historyCanaryPanelRuntime,
      historyCanaryActionRuntime: historyCanaryActionRuntime,
      historyCanaryHostRuntime: historyCanaryHostRuntime,
      writeStorageValue: historyCanaryStorageRuntime.writeHistoryStorageValue,
      loadHistory: loadHistory,
      setStatus: setStatus
    });
  }

  function renderHistory(result) {
    historyPanelHostRuntime.applyHistoryRecordListPanelRender({
      getElementById: el,
      listElementId: "history-list",
      result: result,
      documentLike: document,
      localHistoryStore: window.LocalHistoryStore,
      modeCatalog: window.ModeCatalog,
      historyAdapterHostRuntime: historyAdapterHostRuntime,
      historyAdapterDiagnosticsRuntime: historyAdapterDiagnosticsRuntime,
      historyRecordViewRuntime: historyRecordViewRuntime,
      historyRecordItemRuntime: historyRecordItemRuntime,
      historyRecordActionsRuntime: historyRecordActionsRuntime,
      historyRecordHostRuntime: historyRecordHostRuntime,
      historyExportRuntime: historyExportRuntime,
      historyRecordListHostRuntime: historyRecordListHostRuntime,
      historyBoardRuntime: historyBoardRuntime,
      confirmAction: window.confirm,
      setStatus: setStatus,
      loadHistory: loadHistory,
      navigateToHref: function (href) {
        window.location.href = href;
      }
    });
  }

  function loadHistory(resetPage) {
    historyLoadEntryHostRuntime.applyHistoryLoadEntry({
      resetPage: resetPage,
      localHistoryStore: window.LocalHistoryStore,
      historyFilterHostRuntime: historyFilterHostRuntime,
      state: state,
      historyQueryRuntime: historyQueryRuntime,
      getElementById: el,
      historyLoadHostRuntime: historyLoadHostRuntime,
      historyLoadRuntime: historyLoadRuntime,
      historyBurnInRuntime: historyBurnInRuntime,
      burnInMinComparable: BURN_IN_MIN_COMPARABLE,
      burnInMaxMismatchRate: BURN_IN_MAX_MISMATCH_RATE,
      statusElementId: "history-status",
      summaryElementId: "history-summary",
      historyViewHostRuntime: historyViewHostRuntime,
      historyStatusRuntime: historyStatusRuntime,
      historySummaryRuntime: historySummaryRuntime,
      renderHistory: renderHistory,
      renderBurnInSummary: renderBurnInSummary,
      renderCanaryPolicy: renderCanaryPolicy,
      setStatus: setStatus,
      prevButtonId: "history-prev-page",
      nextButtonId: "history-next-page"
    });
  }

  function initModeFilter() {
    historyControlsHostRuntime.applyHistoryModeFilterInitialization({
      getElementById: el,
      modeElementId: "history-mode",
      modeCatalog: window.ModeCatalog,
      historyModeFilterRuntime: historyModeFilterRuntime,
      historyModeFilterHostRuntime: historyModeFilterHostRuntime,
      documentLike: document
    });
  }

  function bindToolbarActions() {
    historyControlsHostRuntime.bindHistoryControls({
      getElementById: el,
      localHistoryStore: window.LocalHistoryStore,
      state: state,
      setStatus: setStatus,
      loadHistory: loadHistory,
      historyFilterHostRuntime: historyFilterHostRuntime,
      historyQueryRuntime: historyQueryRuntime,
      historyExportRuntime: historyExportRuntime,
      historyToolbarRuntime: historyToolbarRuntime,
      historyToolbarHostRuntime: historyToolbarHostRuntime,
      historyToolbarBindHostRuntime: historyToolbarBindHostRuntime,
      historyImportRuntime: historyImportRuntime,
      historyImportFileRuntime: historyImportFileRuntime,
      historyImportHostRuntime: historyImportHostRuntime,
      historyImportBindHostRuntime: historyImportBindHostRuntime,
      historyToolbarEventsRuntime: historyToolbarEventsRuntime,
      historyToolbarEventsHostRuntime: historyToolbarEventsHostRuntime,
      confirmAction: window.confirm,
      createDate: function () {
        return new Date();
      },
      createFileReader: function () {
        return new FileReader();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    historyStartupHostRuntime.applyHistoryStartup({
      localHistoryStore: window.LocalHistoryStore,
      setStatus: setStatus,
      initModeFilter: initModeFilter,
      bindToolbarActions: bindToolbarActions,
      loadHistory: loadHistory
    });
  });
})();

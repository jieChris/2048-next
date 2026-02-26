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
  var historyExportRuntime = historyRuntimes.historyExportRuntime;
  var historyQueryRuntime = historyRuntimes.historyQueryRuntime;
  var historyLoadRuntime = historyRuntimes.historyLoadRuntime;
  var historyLoadHostRuntime = historyRuntimes.historyLoadHostRuntime;
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
  var historyStartupHostRuntime = historyRuntimes.historyStartupHostRuntime;

  function setStatus(text, isError) {
    var status = el("history-status");
    if (!status) return;
    var statusState = historyStatusRuntime.resolveHistoryStatusDisplayState({
      text: text,
      isError: isError
    });
    status.textContent = statusState.text;
    status.style.color = statusState.color;
  }

  function boardToHtml(board, width, height) {
    return historyBoardRuntime.resolveHistoryFinalBoardHtml(board, width, height);
  }

  function buildSummary(result) {
    var summary = el("history-summary");
    if (!summary) return;
    summary.textContent = historySummaryRuntime.resolveHistorySummaryText({
      total: result && result.total,
      page: state.page,
      pageSize: state.pageSize,
      adapterParityFilter: state.adapterParityFilter
    });
  }

  function renderBurnInSummary(summary) {
    var panel = el("history-burnin-summary");
    if (!panel) return;
    historyBurnInHostRuntime.applyHistoryBurnInSummaryRender({
      panelElement: panel,
      summary: summary,
      historyBurnInRuntime: historyBurnInRuntime,
      adapterFilterElement: el("history-adapter-filter"),
      setAdapterParityFilter: function (nextValue) {
        state.adapterParityFilter = nextValue;
      },
      loadHistory: loadHistory
    });
  }

  function renderCanaryPolicy() {
    var panel = el("history-canary-policy");
    if (!panel) return;
    historyCanaryHostRuntime.applyHistoryCanaryPanelRender({
      panelElement: panel,
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
      writeStorageValue: historyCanaryStorageRuntime.writeHistoryStorageValue,
      loadHistory: loadHistory,
      setStatus: setStatus
    });
  }

  function renderHistory(result) {
    var list = el("history-list");
    if (!list) return;
    historyRecordListHostRuntime.applyHistoryRecordListRender({
      listElement: list,
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
      boardToHtml: boardToHtml,
      confirmAction: window.confirm,
      setStatus: setStatus,
      loadHistory: loadHistory,
      navigateToHref: function (href) {
        window.location.href = href;
      }
    });
  }

  function readFilters() {
    var modeInput = el("history-mode");
    var keywordInput = el("history-keyword");
    var sortInput = el("history-sort");
    var adapterFilterInput = el("history-adapter-filter");
    var burnInWindowInput = el("history-burnin-window");
    var sustainedWindowInput = el("history-sustained-window");
    historyQueryRuntime.applyHistoryFilterState(state, {
      modeKeyRaw: modeInput && modeInput.value,
      keywordRaw: keywordInput && keywordInput.value,
      sortByRaw: sortInput && sortInput.value,
      adapterParityFilterRaw: adapterFilterInput && adapterFilterInput.value,
      burnInWindowRaw: burnInWindowInput && burnInWindowInput.value,
      sustainedWindowsRaw: sustainedWindowInput && sustainedWindowInput.value
    });
  }

  function loadHistory(resetPage) {
    if (!window.LocalHistoryStore) return;
    readFilters();
    historyLoadHostRuntime.applyHistoryLoadWithPager({
      resetPage: resetPage,
      state: state,
      localHistoryStore: window.LocalHistoryStore,
      historyLoadRuntime: historyLoadRuntime,
      historyQueryRuntime: historyQueryRuntime,
      historyBurnInRuntime: historyBurnInRuntime,
      burnInMinComparable: BURN_IN_MIN_COMPARABLE,
      burnInMaxMismatchRate: BURN_IN_MAX_MISMATCH_RATE,
      renderHistory: renderHistory,
      renderSummary: buildSummary,
      renderBurnInSummary: renderBurnInSummary,
      renderCanaryPolicy: renderCanaryPolicy,
      setStatus: setStatus,
      getElementById: el,
      prevButtonId: "history-prev-page",
      nextButtonId: "history-next-page"
    });
  }

  function initModeFilter() {
    historyModeFilterHostRuntime.applyHistoryModeFilterOptionsRender({
      selectElement: el("history-mode"),
      modeCatalog: window.ModeCatalog,
      historyModeFilterRuntime: historyModeFilterRuntime,
      documentLike: document
    });
  }

  function bindToolbarActions() {
    historyToolbarBindHostRuntime.bindHistoryToolbarActionButtons({
      getElementById: el,
      localHistoryStore: window.LocalHistoryStore,
      state: state,
      readFilters: readFilters,
      setStatus: setStatus,
      loadHistory: loadHistory,
      historyExportRuntime: historyExportRuntime,
      historyToolbarRuntime: historyToolbarRuntime,
      historyToolbarHostRuntime: historyToolbarHostRuntime,
      confirmAction: window.confirm,
      createDate: function () {
        return new Date();
      }
    });

    historyImportBindHostRuntime.bindHistoryImportControls({
      getElementById: el,
      localHistoryStore: window.LocalHistoryStore,
      historyImportRuntime: historyImportRuntime,
      historyImportFileRuntime: historyImportFileRuntime,
      historyImportHostRuntime: historyImportHostRuntime,
      confirmAction: window.confirm,
      createFileReader: function () {
        return new FileReader();
      },
      setStatus: setStatus,
      loadHistory: loadHistory
    });

    historyToolbarEventsHostRuntime.bindHistoryToolbarPagerAndFilterEvents({
      getElementById: el,
      state: state,
      loadHistory: loadHistory,
      historyToolbarEventsRuntime: historyToolbarEventsRuntime
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

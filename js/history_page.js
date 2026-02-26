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
    var panelState = historyBurnInHostRuntime.resolveHistoryBurnInPanelRenderState({
      summary: summary,
      historyBurnInRuntime: historyBurnInRuntime
    });
    panel.innerHTML = panelState && panelState.panelHtml ? panelState.panelHtml : "";
    if (!panelState || panelState.shouldBindMismatchAction !== true) return;

    var mismatchBtn = panel.querySelector(".history-burnin-focus-mismatch");
    if (mismatchBtn) {
      mismatchBtn.addEventListener("click", function () {
        var actionState = historyBurnInHostRuntime.resolveHistoryBurnInMismatchFocusClickState({
          historyBurnInRuntime: historyBurnInRuntime
        });
        if (!actionState || actionState.shouldApply !== true) return;
        var adapterFilter = el("history-adapter-filter");
        if (adapterFilter) adapterFilter.value = actionState.nextSelectValue;
        state.adapterParityFilter = actionState.nextAdapterParityFilter;
        if (actionState.shouldReload) loadHistory(actionState.resetPage);
      });
    }
  }

  function renderCanaryPolicy() {
    var panel = el("history-canary-policy");
    if (!panel) return;

    var panelState = historyCanaryHostRuntime.resolveHistoryCanaryPanelRenderState({
      runtime: window.LegacyAdapterRuntime,
      readStorageValue: historyCanaryStorageRuntime.readHistoryStorageValue,
      adapterModeStorageKey: ADAPTER_MODE_STORAGE_KEY,
      defaultModeStorageKey: ADAPTER_DEFAULT_STORAGE_KEY,
      forceLegacyStorageKey: ADAPTER_FORCE_LEGACY_STORAGE_KEY,
      historyCanarySourceRuntime: historyCanarySourceRuntime,
      historyCanaryPolicyRuntime: historyCanaryPolicyRuntime,
      historyCanaryViewRuntime: historyCanaryViewRuntime,
      historyCanaryPanelRuntime: historyCanaryPanelRuntime
    });
    panel.innerHTML = panelState && panelState.panelHtml ? panelState.panelHtml : "";

    var buttons = panel.querySelectorAll(".history-canary-action-btn");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (event) {
        var feedbackState = historyCanaryHostRuntime.applyHistoryCanaryPanelClickAction({
          target: event && event.currentTarget,
          runtime: window.LegacyAdapterRuntime,
          writeStorageValue: historyCanaryStorageRuntime.writeHistoryStorageValue,
          defaultModeStorageKey: ADAPTER_DEFAULT_STORAGE_KEY,
          forceLegacyStorageKey: ADAPTER_FORCE_LEGACY_STORAGE_KEY,
          historyCanaryActionRuntime: historyCanaryActionRuntime,
          historyCanaryPanelRuntime: historyCanaryPanelRuntime,
          historyCanaryPolicyRuntime: historyCanaryPolicyRuntime
        });
        if (feedbackState.shouldReload) loadHistory(feedbackState.reloadResetPage);
        setStatus(feedbackState.statusText, feedbackState.isError);
      });
    }
  }

  function renderHistory(result) {
    var list = el("history-list");
    if (!list) return;
    list.innerHTML = "";

    var items = result && Array.isArray(result.items) ? result.items : [];
    if (!items.length) {
      list.innerHTML = "<div class='history-item'>暂无历史记录。你可以开始一局游戏后再回来查看。</div>";
      return;
    }

    for (var i = 0; i < items.length; i++) {
      (function () {
        var item = items[i];
        var node = document.createElement("div");
        node.className = "history-item";
        var adapterRenderState = historyAdapterHostRuntime.resolveHistoryAdapterRecordRenderState({
          localHistoryStore: window.LocalHistoryStore,
          item: item,
          historyAdapterDiagnosticsRuntime: historyAdapterDiagnosticsRuntime
        });

        var headState = historyRecordViewRuntime.resolveHistoryRecordHeadState({
          modeKey: item && item.mode_key,
          modeFallback: item && item.mode,
          catalogLabel: historyRecordViewRuntime.resolveHistoryCatalogModeLabel(
            window.ModeCatalog,
            item
          ),
          score: item && item.score,
          bestTile: item && item.best_tile,
          durationMs: item && item.duration_ms,
          endedAt: item && item.ended_at
        });

        node.innerHTML = historyRecordItemRuntime.resolveHistoryRecordItemHtml({
          modeText: headState.modeText,
          score: headState.score,
          bestTile: headState.bestTile,
          durationText: headState.durationText,
          endedText: headState.endedText,
          adapterBadgeHtml: adapterRenderState && adapterRenderState.adapterBadgeHtml,
          adapterDiagnosticsHtml: adapterRenderState && adapterRenderState.adapterDiagnosticsHtml,
          boardHtml: boardToHtml(item.final_board, item.board_width, item.board_height)
        });

        var replayBtn = node.querySelector(".history-replay-btn");
        if (replayBtn) {
          replayBtn.addEventListener("click", function () {
            var href = historyRecordHostRuntime.resolveHistoryRecordReplayHref({
              historyRecordActionsRuntime: historyRecordActionsRuntime,
              itemId: item && item.id
            });
            if (href) window.location.href = href;
          });
        }

        var exportBtn = node.querySelector(".history-export-btn");
        if (exportBtn) {
          exportBtn.addEventListener("click", function () {
            historyRecordHostRuntime.applyHistoryRecordExportAction({
              localHistoryStore: window.LocalHistoryStore,
              item: item,
              historyExportRuntime: historyExportRuntime
            });
          });
        }

        var deleteBtn = node.querySelector(".history-delete-btn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", function () {
            var deleteState = historyRecordHostRuntime.applyHistoryRecordDeleteAction({
              historyRecordActionsRuntime: historyRecordActionsRuntime,
              localHistoryStore: window.LocalHistoryStore,
              itemId: item && item.id,
              confirmAction: window.confirm
            });
            if (deleteState && deleteState.shouldSetStatus) {
              setStatus(deleteState.statusText, deleteState.isError);
            }
            if (deleteState && deleteState.shouldReload) loadHistory();
          });
        }

        list.appendChild(node);
      })();
    }
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
    var loadResult = historyLoadHostRuntime.applyHistoryLoadAndRender({
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
      setStatus: setStatus
    });

    var prevBtn = el("history-prev-page");
    var nextBtn = el("history-next-page");
    if (prevBtn) prevBtn.disabled = !!(loadResult && loadResult.disablePrev);
    if (nextBtn) nextBtn.disabled = !!(loadResult && loadResult.disableNext);
  }

  function initModeFilter() {
    var select = el("history-mode");
    if (!select) return;
    if (!(window.ModeCatalog && typeof window.ModeCatalog.listModes === "function")) return;

    var options = historyModeFilterRuntime.resolveHistoryModeFilterOptions(window.ModeCatalog.listModes());
    for (var i = 0; i < options.length; i++) {
      var option = document.createElement("option");
      option.value = options[i].value;
      option.textContent = options[i].label;
      select.appendChild(option);
    }
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

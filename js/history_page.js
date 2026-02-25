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
  var historyBoardRuntime = historyRuntimes.historyBoardRuntime;
  var historyBurnInRuntime = historyRuntimes.historyBurnInRuntime;
  var historyBurnInHostRuntime = historyRuntimes.historyBurnInHostRuntime;
  var historyCanaryViewRuntime = historyRuntimes.historyCanaryViewRuntime;
  var historySummaryRuntime = historyRuntimes.historySummaryRuntime;
  var historyStatusRuntime = historyRuntimes.historyStatusRuntime;
  var historyExportRuntime = historyRuntimes.historyExportRuntime;
  var historyQueryRuntime = historyRuntimes.historyQueryRuntime;
  var historyLoadRuntime = historyRuntimes.historyLoadRuntime;
  var historyRecordViewRuntime = historyRuntimes.historyRecordViewRuntime;
  var historyRecordItemRuntime = historyRuntimes.historyRecordItemRuntime;
  var historyImportRuntime = historyRuntimes.historyImportRuntime;
  var historyImportFileRuntime = historyRuntimes.historyImportFileRuntime;
  var historyImportHostRuntime = historyRuntimes.historyImportHostRuntime;
  var historyRecordActionsRuntime = historyRuntimes.historyRecordActionsRuntime;
  var historyRecordHostRuntime = historyRuntimes.historyRecordHostRuntime;
  var historyCanaryStorageRuntime = historyRuntimes.historyCanaryStorageRuntime;
  var historyToolbarRuntime = historyRuntimes.historyToolbarRuntime;
  var historyToolbarHostRuntime = historyRuntimes.historyToolbarHostRuntime;
  var historyToolbarEventsRuntime = historyRuntimes.historyToolbarEventsRuntime;
  var historyModeFilterRuntime = historyRuntimes.historyModeFilterRuntime;

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

  function buildAdapterBadgeHtml(item) {
    var status = historyAdapterDiagnosticsRuntime.resolveHistoryAdapterParityStatus(
      window.LocalHistoryStore,
      item
    );
    var badgeState = historyAdapterDiagnosticsRuntime.resolveHistoryAdapterBadgeState(item, status);
    return historyAdapterDiagnosticsRuntime.resolveHistoryAdapterBadgeHtml(badgeState);
  }

  function buildAdapterDiagnosticsHtml(item) {
    var diagnosticsState = historyAdapterDiagnosticsRuntime.resolveHistoryAdapterDiagnosticsState(item);
    return historyAdapterDiagnosticsRuntime.resolveHistoryAdapterDiagnosticsHtml(diagnosticsState);
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
          adapterBadgeHtml: buildAdapterBadgeHtml(item),
          adapterDiagnosticsHtml: buildAdapterDiagnosticsHtml(item),
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
    if (resetPage) state.page = 1;
    readFilters();

    var loadPipeline = historyLoadRuntime.resolveHistoryLoadPipeline({
      state: state,
      localHistoryStore: window.LocalHistoryStore,
      historyQueryRuntime: historyQueryRuntime,
      historyBurnInRuntime: historyBurnInRuntime,
      burnInMinComparable: BURN_IN_MIN_COMPARABLE,
      burnInMaxMismatchRate: BURN_IN_MAX_MISMATCH_RATE
    });
    var result = loadPipeline && loadPipeline.listResult;
    var burnInSummary = loadPipeline && loadPipeline.burnInSummary;
    var pagerState = loadPipeline && loadPipeline.pagerState;

    renderHistory(result);
    buildSummary(result);
    renderBurnInSummary(burnInSummary);
    renderCanaryPolicy();
    setStatus("", false);

    var prevBtn = el("history-prev-page");
    var nextBtn = el("history-next-page");
    if (prevBtn) prevBtn.disabled = !!(pagerState && pagerState.disablePrev);
    if (nextBtn) nextBtn.disabled = !!(pagerState && pagerState.disableNext);
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
    var reloadBtn = el("history-load-btn");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", function () {
        loadHistory(true);
      });
    }

    var exportAllBtn = el("history-export-all-btn");
    if (exportAllBtn) {
      exportAllBtn.addEventListener("click", function () {
        var actionResult = historyToolbarHostRuntime.applyHistoryExportAllAction({
          localHistoryStore: window.LocalHistoryStore,
          dateValue: new Date(),
          historyExportRuntime: historyExportRuntime,
          historyToolbarRuntime: historyToolbarRuntime
        });
        if (actionResult && actionResult.shouldSetStatus) {
          setStatus(actionResult.statusText, actionResult.isError);
        }
      });
    }

    var exportMismatchBtn = el("history-export-mismatch-btn");
    if (exportMismatchBtn) {
      exportMismatchBtn.addEventListener("click", function () {
        readFilters();
        var actionResult = historyToolbarHostRuntime.applyHistoryMismatchExportAction({
          localHistoryStore: window.LocalHistoryStore,
          modeKey: state.modeKey,
          keyword: state.keyword,
          sortBy: state.sortBy,
          dateValue: new Date(),
          historyExportRuntime: historyExportRuntime,
          historyToolbarRuntime: historyToolbarRuntime
        });
        if (actionResult && actionResult.shouldSetStatus) {
          setStatus(actionResult.statusText, actionResult.isError);
        }
      });
    }

    var clearAllBtn = el("history-clear-all-btn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", function () {
        var actionResult = historyToolbarHostRuntime.applyHistoryClearAllAction({
          localHistoryStore: window.LocalHistoryStore,
          historyToolbarRuntime: historyToolbarRuntime,
          confirmAction: window.confirm
        });
        if (actionResult && actionResult.shouldSetStatus) {
          setStatus(actionResult.statusText, actionResult.isError);
        }
        if (actionResult && actionResult.shouldReload) loadHistory(true);
      });
    }

    var importBtn = el("history-import-btn");
    var importReplaceBtn = el("history-import-replace-btn");
    var importInput = el("history-import-file");
    if (importBtn && importInput) {
      var importMode = "merge";
      importBtn.addEventListener("click", function () {
        var clickState = historyImportHostRuntime.resolveHistoryImportMergeClickState({
          currentMode: importMode,
          historyImportRuntime: historyImportRuntime
        });
        importMode = clickState.nextMode;
        if (clickState.shouldOpenFilePicker) importInput.click();
      });
      if (importReplaceBtn) {
        importReplaceBtn.addEventListener("click", function () {
          var clickState = historyImportHostRuntime.resolveHistoryImportReplaceClickState({
            currentMode: importMode,
            historyImportRuntime: historyImportRuntime,
            confirmAction: window.confirm
          });
          importMode = clickState.nextMode;
          if (clickState.shouldOpenFilePicker) importInput.click();
        });
      }
      importInput.addEventListener("change", function () {
        var selectionState = historyImportHostRuntime.resolveHistoryImportFileSelectionState({
          files: importInput.files,
          historyImportFileRuntime: historyImportFileRuntime
        });
        if (!selectionState || selectionState.shouldRead !== true) return;
        var reader = new FileReader();
        reader.onload = function () {
          var importState = historyImportHostRuntime.applyHistoryImportFromFileReadResult({
            readerResult: reader.result,
            importMode: importMode,
            localHistoryStore: window.LocalHistoryStore,
            historyImportRuntime: historyImportRuntime,
            historyImportFileRuntime: historyImportFileRuntime
          });
          if (importState && importState.shouldSetStatus) {
            setStatus(importState.statusText, importState.isError);
          }
          if (importState && importState.shouldReload) {
            loadHistory(true);
          }
        };
        reader.onerror = function () {
          var failureState = historyImportHostRuntime.resolveHistoryImportReadFailureState({
            historyImportRuntime: historyImportRuntime
          });
          if (failureState && failureState.shouldSetStatus) {
            setStatus(failureState.statusText, failureState.isError);
          }
        };
        reader.readAsText(selectionState.file, selectionState.encoding);
        importInput.value = selectionState.resetValue;
      });
    }

    var prevBtn = el("history-prev-page");
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        var prevState = historyToolbarEventsRuntime.resolveHistoryPrevPageState(state.page);
        if (!prevState.canGo) return;
        state.page = prevState.nextPage;
        loadHistory(false);
      });
    }

    var nextBtn = el("history-next-page");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        var nextState = historyToolbarEventsRuntime.resolveHistoryNextPageState(state.page);
        state.page = nextState.nextPage;
        loadHistory(false);
      });
    }

    var reloadControlIds = historyToolbarEventsRuntime.resolveHistoryFilterReloadControlIds();
    for (var i = 0; i < reloadControlIds.length; i++) {
      var control = el(reloadControlIds[i]);
      if (!control) continue;
      control.addEventListener("change", function () {
        loadHistory(true);
      });
    }

    var keyword = el("history-keyword");
    if (keyword) {
      keyword.addEventListener("keydown", function (event) {
        if (historyToolbarEventsRuntime.shouldHistoryKeywordTriggerReload(event && event.key)) {
          event.preventDefault();
          loadHistory(true);
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.LocalHistoryStore) {
      setStatus("本地历史模块未加载", true);
      return;
    }

    initModeFilter();
    bindToolbarActions();
    loadHistory(true);
  });
})();

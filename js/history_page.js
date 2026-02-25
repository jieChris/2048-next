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
  var historyCanaryPolicyRuntime = window.CoreHistoryCanaryPolicyRuntime;
  if (
    !historyCanaryPolicyRuntime ||
    typeof historyCanaryPolicyRuntime.resolveCanaryPolicySnapshot !== "function" ||
    typeof historyCanaryPolicyRuntime.resolveStoredPolicyKeys !== "function" ||
    typeof historyCanaryPolicyRuntime.resolveCanaryPolicyActionPlan !== "function" ||
    typeof historyCanaryPolicyRuntime.resolveCanaryPolicyActionNotice !== "function"
  ) {
    throw new Error("CoreHistoryCanaryPolicyRuntime is required");
  }
  var historyCanaryActionRuntime = window.CoreHistoryCanaryActionRuntime;
  if (
    !historyCanaryActionRuntime ||
    typeof historyCanaryActionRuntime.applyHistoryCanaryPolicyAction !== "function" ||
    typeof historyCanaryActionRuntime.resolveHistoryCanaryPolicyUpdateFailureNotice !== "function" ||
    typeof historyCanaryActionRuntime.resolveHistoryCanaryPolicyApplyFeedbackState !== "function"
  ) {
    throw new Error("CoreHistoryCanaryActionRuntime is required");
  }
  var historyCanarySourceRuntime = window.CoreHistoryCanarySourceRuntime;
  if (
    !historyCanarySourceRuntime ||
    typeof historyCanarySourceRuntime.resolveHistoryCanaryRuntimePolicy !== "function" ||
    typeof historyCanarySourceRuntime.resolveHistoryCanaryRuntimeStoredPolicyKeys !== "function"
  ) {
    throw new Error("CoreHistoryCanarySourceRuntime is required");
  }
  var historyCanaryPanelRuntime = window.CoreHistoryCanaryPanelRuntime;
  if (
    !historyCanaryPanelRuntime ||
    typeof historyCanaryPanelRuntime.resolveHistoryCanaryPanelHtml !== "function" ||
    typeof historyCanaryPanelRuntime.resolveHistoryCanaryActionName !== "function"
  ) {
    throw new Error("CoreHistoryCanaryPanelRuntime is required");
  }
  var historyAdapterDiagnosticsRuntime = window.CoreHistoryAdapterDiagnosticsRuntime;
  if (
    !historyAdapterDiagnosticsRuntime ||
    typeof historyAdapterDiagnosticsRuntime.resolveHistoryAdapterParityStatus !== "function" ||
    typeof historyAdapterDiagnosticsRuntime.resolveHistoryAdapterBadgeState !== "function" ||
    typeof historyAdapterDiagnosticsRuntime.resolveHistoryAdapterDiagnosticsState !== "function" ||
    typeof historyAdapterDiagnosticsRuntime.resolveHistoryAdapterBadgeHtml !== "function" ||
    typeof historyAdapterDiagnosticsRuntime.resolveHistoryAdapterDiagnosticsHtml !== "function"
  ) {
    throw new Error("CoreHistoryAdapterDiagnosticsRuntime is required");
  }
  var historyBoardRuntime = window.CoreHistoryBoardRuntime;
  if (
    !historyBoardRuntime ||
    typeof historyBoardRuntime.resolveHistoryFinalBoardHtml !== "function"
  ) {
    throw new Error("CoreHistoryBoardRuntime is required");
  }
  var historyBurnInRuntime = window.CoreHistoryBurnInRuntime;
  if (
    !historyBurnInRuntime ||
    typeof historyBurnInRuntime.resolveHistoryBurnInSummaryState !== "function" ||
    typeof historyBurnInRuntime.resolveHistoryBurnInMismatchFocusActionState !== "function" ||
    typeof historyBurnInRuntime.resolveHistoryBurnInPanelHtml !== "function"
  ) {
    throw new Error("CoreHistoryBurnInRuntime is required");
  }
  var historyCanaryViewRuntime = window.CoreHistoryCanaryViewRuntime;
  if (
    !historyCanaryViewRuntime ||
    typeof historyCanaryViewRuntime.resolveHistoryCanaryViewState !== "function"
  ) {
    throw new Error("CoreHistoryCanaryViewRuntime is required");
  }
  var historySummaryRuntime = window.CoreHistorySummaryRuntime;
  if (
    !historySummaryRuntime ||
    typeof historySummaryRuntime.resolveHistorySummaryText !== "function"
  ) {
    throw new Error("CoreHistorySummaryRuntime is required");
  }
  var historyExportRuntime = window.CoreHistoryExportRuntime;
  if (
    !historyExportRuntime ||
    typeof historyExportRuntime.resolveHistoryRecordExportFileName !== "function" ||
    typeof historyExportRuntime.collectHistoryRecordIdsForExport !== "function"
  ) {
    throw new Error("CoreHistoryExportRuntime is required");
  }
  var historyQueryRuntime = window.CoreHistoryQueryRuntime;
  if (
    !historyQueryRuntime ||
    typeof historyQueryRuntime.resolveHistoryFilterState !== "function" ||
    typeof historyQueryRuntime.resolveHistoryListQuery !== "function" ||
    typeof historyQueryRuntime.resolveHistoryBurnInQuery !== "function" ||
    typeof historyQueryRuntime.resolveHistoryPagerState !== "function"
  ) {
    throw new Error("CoreHistoryQueryRuntime is required");
  }
  var historyRecordViewRuntime = window.CoreHistoryRecordViewRuntime;
  if (
    !historyRecordViewRuntime ||
    typeof historyRecordViewRuntime.resolveHistoryCatalogModeLabel !== "function" ||
    typeof historyRecordViewRuntime.resolveHistoryModeText !== "function" ||
    typeof historyRecordViewRuntime.resolveHistoryDurationText !== "function" ||
    typeof historyRecordViewRuntime.resolveHistoryEndedText !== "function" ||
    typeof historyRecordViewRuntime.resolveHistoryRecordHeadState !== "function"
  ) {
    throw new Error("CoreHistoryRecordViewRuntime is required");
  }
  var historyRecordItemRuntime = window.CoreHistoryRecordItemRuntime;
  if (
    !historyRecordItemRuntime ||
    typeof historyRecordItemRuntime.resolveHistoryRecordItemHtml !== "function"
  ) {
    throw new Error("CoreHistoryRecordItemRuntime is required");
  }
  var historyImportRuntime = window.CoreHistoryImportRuntime;
  if (
    !historyImportRuntime ||
    typeof historyImportRuntime.resolveHistoryImportActionState !== "function" ||
    typeof historyImportRuntime.resolveHistoryImportMergeFlag !== "function" ||
    typeof historyImportRuntime.resolveHistoryImportSuccessNotice !== "function" ||
    typeof historyImportRuntime.resolveHistoryImportErrorNotice !== "function" ||
    typeof historyImportRuntime.resolveHistoryImportReadErrorNotice !== "function"
  ) {
    throw new Error("CoreHistoryImportRuntime is required");
  }
  var historyImportFileRuntime = window.CoreHistoryImportFileRuntime;
  if (
    !historyImportFileRuntime ||
    typeof historyImportFileRuntime.resolveHistoryImportSelectedFile !== "function" ||
    typeof historyImportFileRuntime.resolveHistoryImportPayloadText !== "function" ||
    typeof historyImportFileRuntime.resolveHistoryImportReadEncoding !== "function" ||
    typeof historyImportFileRuntime.resolveHistoryImportInputResetValue !== "function"
  ) {
    throw new Error("CoreHistoryImportFileRuntime is required");
  }
  var historyRecordActionsRuntime = window.CoreHistoryRecordActionsRuntime;
  if (
    !historyRecordActionsRuntime ||
    typeof historyRecordActionsRuntime.resolveHistoryReplayHref !== "function" ||
    typeof historyRecordActionsRuntime.resolveHistoryDeleteActionState !== "function" ||
    typeof historyRecordActionsRuntime.resolveHistoryDeleteFailureNotice !== "function" ||
    typeof historyRecordActionsRuntime.resolveHistoryDeleteSuccessNotice !== "function"
  ) {
    throw new Error("CoreHistoryRecordActionsRuntime is required");
  }
  var historyCanaryStorageRuntime = window.CoreHistoryCanaryStorageRuntime;
  if (
    !historyCanaryStorageRuntime ||
    typeof historyCanaryStorageRuntime.readHistoryStorageValue !== "function" ||
    typeof historyCanaryStorageRuntime.writeHistoryStorageValue !== "function"
  ) {
    throw new Error("CoreHistoryCanaryStorageRuntime is required");
  }
  var historyToolbarRuntime = window.CoreHistoryToolbarRuntime;
  if (
    !historyToolbarRuntime ||
    typeof historyToolbarRuntime.resolveHistoryExportDateTag !== "function" ||
    typeof historyToolbarRuntime.resolveHistoryExportAllFileName !== "function" ||
    typeof historyToolbarRuntime.resolveHistoryExportAllNotice !== "function" ||
    typeof historyToolbarRuntime.resolveHistoryMismatchExportQuery !== "function" ||
    typeof historyToolbarRuntime.resolveHistoryMismatchExportEmptyNotice !== "function" ||
    typeof historyToolbarRuntime.resolveHistoryMismatchExportFileName !== "function" ||
    typeof historyToolbarRuntime.resolveHistoryMismatchExportSuccessNotice !== "function" ||
    typeof historyToolbarRuntime.resolveHistoryClearAllActionState !== "function"
  ) {
    throw new Error("CoreHistoryToolbarRuntime is required");
  }
  var historyToolbarEventsRuntime = window.CoreHistoryToolbarEventsRuntime;
  if (
    !historyToolbarEventsRuntime ||
    typeof historyToolbarEventsRuntime.resolveHistoryPrevPageState !== "function" ||
    typeof historyToolbarEventsRuntime.resolveHistoryNextPageState !== "function" ||
    typeof historyToolbarEventsRuntime.resolveHistoryFilterReloadControlIds !== "function" ||
    typeof historyToolbarEventsRuntime.shouldHistoryKeywordTriggerReload !== "function"
  ) {
    throw new Error("CoreHistoryToolbarEventsRuntime is required");
  }
  var historyModeFilterRuntime = window.CoreHistoryModeFilterRuntime;
  if (
    !historyModeFilterRuntime ||
    typeof historyModeFilterRuntime.resolveHistoryModeFilterOptions !== "function"
  ) {
    throw new Error("CoreHistoryModeFilterRuntime is required");
  }

  function setStatus(text, isError) {
    var status = el("history-status");
    if (!status) return;
    status.textContent = text || "";
    status.style.color = isError ? "#c0392b" : "#4a4a4a";
  }

  function boardToHtml(board, width, height) {
    return historyBoardRuntime.resolveHistoryFinalBoardHtml(board, width, height);
  }

  function getStorageValue(key) {
    return historyCanaryStorageRuntime.readHistoryStorageValue(key);
  }

  function setStorageValue(key, value) {
    return historyCanaryStorageRuntime.writeHistoryStorageValue(key, value);
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
    var burnInState = historyBurnInRuntime.resolveHistoryBurnInSummaryState(summary);
    panel.innerHTML = historyBurnInRuntime.resolveHistoryBurnInPanelHtml(summary, burnInState);
    if (!burnInState || burnInState.hasSummary !== true) return;

    var mismatchBtn = panel.querySelector(".history-burnin-focus-mismatch");
    if (mismatchBtn) {
      mismatchBtn.addEventListener("click", function () {
        var actionState = historyBurnInRuntime.resolveHistoryBurnInMismatchFocusActionState();
        if (!actionState || actionState.shouldApply !== true) return;
        var adapterFilter = el("history-adapter-filter");
        if (adapterFilter) adapterFilter.value = actionState.nextSelectValue;
        state.adapterParityFilter = actionState.nextAdapterParityFilter;
        if (actionState.shouldReload) loadHistory(actionState.resetPage);
      });
    }
  }

  function readCanaryPolicySnapshot() {
    var runtimePolicy = historyCanarySourceRuntime.resolveHistoryCanaryRuntimePolicy(
      window.LegacyAdapterRuntime
    );
    return historyCanaryPolicyRuntime.resolveCanaryPolicySnapshot({
      runtimePolicy: runtimePolicy,
      defaultModeRaw: getStorageValue(ADAPTER_DEFAULT_STORAGE_KEY),
      forceLegacyRaw: getStorageValue(ADAPTER_FORCE_LEGACY_STORAGE_KEY)
    });
  }

  function readStoredPolicyKeys() {
    var runtimeStoredKeys = historyCanarySourceRuntime.resolveHistoryCanaryRuntimeStoredPolicyKeys(
      window.LegacyAdapterRuntime
    );
    return historyCanaryPolicyRuntime.resolveStoredPolicyKeys({
      runtimeStoredKeys: runtimeStoredKeys,
      adapterModeRaw: getStorageValue(ADAPTER_MODE_STORAGE_KEY),
      defaultModeRaw: getStorageValue(ADAPTER_DEFAULT_STORAGE_KEY),
      forceLegacyRaw: getStorageValue(ADAPTER_FORCE_LEGACY_STORAGE_KEY)
    });
  }

  function runCanaryPolicyAction(actionName) {
    var actionPlan = historyCanaryPolicyRuntime.resolveCanaryPolicyActionPlan(actionName || "");
    return historyCanaryActionRuntime.applyHistoryCanaryPolicyAction({
      actionPlan: actionPlan,
      runtime: window.LegacyAdapterRuntime,
      writeStorageValue: setStorageValue,
      defaultModeStorageKey: ADAPTER_DEFAULT_STORAGE_KEY,
      forceLegacyStorageKey: ADAPTER_FORCE_LEGACY_STORAGE_KEY
    });
  }

  function renderCanaryPolicy() {
    var panel = el("history-canary-policy");
    if (!panel) return;

    var policy = readCanaryPolicySnapshot();
    var stored = readStoredPolicyKeys();
    var canaryView = historyCanaryViewRuntime.resolveHistoryCanaryViewState(policy, stored);
    panel.innerHTML = historyCanaryPanelRuntime.resolveHistoryCanaryPanelHtml(canaryView);

    var buttons = panel.querySelectorAll(".history-canary-action-btn");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (event) {
        var target = event.currentTarget;
        var action = historyCanaryPanelRuntime.resolveHistoryCanaryActionName(target);
        var ok = runCanaryPolicyAction(action || "");
        var feedbackState = historyCanaryActionRuntime.resolveHistoryCanaryPolicyApplyFeedbackState({
          ok: ok,
          successNotice: historyCanaryPolicyRuntime.resolveCanaryPolicyActionNotice(action || ""),
          failureNotice: historyCanaryActionRuntime.resolveHistoryCanaryPolicyUpdateFailureNotice()
        });
        if (feedbackState.shouldReload) loadHistory(feedbackState.reloadResetPage);
        setStatus(feedbackState.statusText, feedbackState.isError);
      });
    }
  }

  function downloadSingleRecord(item) {
    if (!window.LocalHistoryStore) return;
    var payload = window.LocalHistoryStore.exportRecords([item.id]);
    var file = historyExportRuntime.resolveHistoryRecordExportFileName({
      modeKey: item && item.mode_key,
      id: item && item.id
    });
    window.LocalHistoryStore.download(file, payload);
  }

  function collectRecordIdsForExport(queryOptions) {
    return historyExportRuntime.collectHistoryRecordIdsForExport({
      listRecords:
        window.LocalHistoryStore && typeof window.LocalHistoryStore.listRecords === "function"
          ? window.LocalHistoryStore.listRecords.bind(window.LocalHistoryStore)
          : null,
      queryOptions: queryOptions,
      maxPages: 100,
      pageSize: 500
    });
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
            window.location.href = historyRecordActionsRuntime.resolveHistoryReplayHref(
              item && item.id
            );
          });
        }

        var exportBtn = node.querySelector(".history-export-btn");
        if (exportBtn) {
          exportBtn.addEventListener("click", function () {
            downloadSingleRecord(item);
          });
        }

        var deleteBtn = node.querySelector(".history-delete-btn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", function () {
            var actionState = historyRecordActionsRuntime.resolveHistoryDeleteActionState(
              item && item.id
            );
            if (!window.confirm(actionState.confirmMessage)) return;
            var ok = window.LocalHistoryStore.deleteById(actionState.recordId);
            if (!ok) {
              setStatus(historyRecordActionsRuntime.resolveHistoryDeleteFailureNotice(), true);
              return;
            }
            setStatus(historyRecordActionsRuntime.resolveHistoryDeleteSuccessNotice(), false);
            loadHistory();
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
    var filterState = historyQueryRuntime.resolveHistoryFilterState({
      modeKeyRaw: modeInput && modeInput.value,
      keywordRaw: keywordInput && keywordInput.value,
      sortByRaw: sortInput && sortInput.value,
      adapterParityFilterRaw: adapterFilterInput && adapterFilterInput.value,
      burnInWindowRaw: burnInWindowInput && burnInWindowInput.value,
      sustainedWindowsRaw: sustainedWindowInput && sustainedWindowInput.value
    });
    state.modeKey = filterState.modeKey;
    state.keyword = filterState.keyword;
    state.sortBy = filterState.sortBy;
    state.adapterParityFilter = filterState.adapterParityFilter;
    state.burnInWindow = filterState.burnInWindow;
    state.sustainedWindows = filterState.sustainedWindows;
  }

  function loadHistory(resetPage) {
    if (!window.LocalHistoryStore) return;
    if (resetPage) state.page = 1;
    readFilters();

    var listQuery = historyQueryRuntime.resolveHistoryListQuery({
      modeKey: state.modeKey,
      keyword: state.keyword,
      sortBy: state.sortBy,
      adapterParityFilter: state.adapterParityFilter,
      page: state.page,
      pageSize: state.pageSize
    });
    var result = window.LocalHistoryStore.listRecords(listQuery);

    renderHistory(result);
    buildSummary(result);
    var burnInSummary = null;
    if (
      window.LocalHistoryStore &&
      typeof window.LocalHistoryStore.getAdapterParityBurnInSummary === "function"
    ) {
      var burnInQuery = historyQueryRuntime.resolveHistoryBurnInQuery({
        modeKey: state.modeKey,
        keyword: state.keyword,
        sortBy: state.sortBy,
        sampleLimit: state.burnInWindow,
        sustainedWindows: state.sustainedWindows,
        minComparable: BURN_IN_MIN_COMPARABLE,
        maxMismatchRate: BURN_IN_MAX_MISMATCH_RATE
      });
      burnInSummary = window.LocalHistoryStore.getAdapterParityBurnInSummary(burnInQuery);
    }
    renderBurnInSummary(burnInSummary);
    renderCanaryPolicy();
    setStatus("", false);

    var prevBtn = el("history-prev-page");
    var nextBtn = el("history-next-page");
    var pagerState = historyQueryRuntime.resolveHistoryPagerState({
      total: result && result.total,
      page: state.page,
      pageSize: state.pageSize
    });
    if (prevBtn) prevBtn.disabled = pagerState.disablePrev;
    if (nextBtn) nextBtn.disabled = pagerState.disableNext;
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
        if (!window.LocalHistoryStore) return;
        var payload = window.LocalHistoryStore.exportRecords();
        var dateTag = historyToolbarRuntime.resolveHistoryExportDateTag(new Date());
        var fileName = historyToolbarRuntime.resolveHistoryExportAllFileName(dateTag);
        window.LocalHistoryStore.download(fileName, payload);
        setStatus(historyToolbarRuntime.resolveHistoryExportAllNotice(), false);
      });
    }

    var exportMismatchBtn = el("history-export-mismatch-btn");
    if (exportMismatchBtn) {
      exportMismatchBtn.addEventListener("click", function () {
        if (!window.LocalHistoryStore) return;
        readFilters();
        var queryOptions = historyToolbarRuntime.resolveHistoryMismatchExportQuery({
          modeKey: state.modeKey,
          keyword: state.keyword,
          sortBy: state.sortBy
        });
        var ids = collectRecordIdsForExport(queryOptions);
        if (!ids.length) {
          setStatus(historyToolbarRuntime.resolveHistoryMismatchExportEmptyNotice(), false);
          return;
        }
        var payload = window.LocalHistoryStore.exportRecords(ids);
        var dateTag = historyToolbarRuntime.resolveHistoryExportDateTag(new Date());
        var fileName = historyToolbarRuntime.resolveHistoryMismatchExportFileName(dateTag);
        window.LocalHistoryStore.download(fileName, payload);
        setStatus(historyToolbarRuntime.resolveHistoryMismatchExportSuccessNotice(ids.length), false);
      });
    }

    var clearAllBtn = el("history-clear-all-btn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", function () {
        var actionState = historyToolbarRuntime.resolveHistoryClearAllActionState();
        if (actionState.requiresConfirm && !window.confirm(actionState.confirmMessage)) return;
        window.LocalHistoryStore.clearAll();
        setStatus(actionState.successNotice, false);
        loadHistory(true);
      });
    }

    var importBtn = el("history-import-btn");
    var importReplaceBtn = el("history-import-replace-btn");
    var importInput = el("history-import-file");
    if (importBtn && importInput) {
      var importMode = "merge";
      importBtn.addEventListener("click", function () {
        importMode = historyImportRuntime.resolveHistoryImportActionState("merge").mode;
        importInput.click();
      });
      if (importReplaceBtn) {
        importReplaceBtn.addEventListener("click", function () {
          var actionState = historyImportRuntime.resolveHistoryImportActionState("replace");
          if (actionState.requiresConfirm && !window.confirm(actionState.confirmMessage)) return;
          importMode = actionState.mode;
          importInput.click();
        });
      }
      importInput.addEventListener("change", function () {
        var file = historyImportFileRuntime.resolveHistoryImportSelectedFile(importInput.files);
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var merge = historyImportRuntime.resolveHistoryImportMergeFlag(importMode);
            var payloadText = historyImportFileRuntime.resolveHistoryImportPayloadText(reader.result);
            var result = window.LocalHistoryStore.importRecords(payloadText, { merge: merge });
            setStatus(historyImportRuntime.resolveHistoryImportSuccessNotice(result), false);
            loadHistory(true);
          } catch (error) {
            setStatus(historyImportRuntime.resolveHistoryImportErrorNotice(error), true);
          }
        };
        reader.onerror = function () {
          setStatus(historyImportRuntime.resolveHistoryImportReadErrorNotice(), true);
        };
        reader.readAsText(file, historyImportFileRuntime.resolveHistoryImportReadEncoding());
        importInput.value = historyImportFileRuntime.resolveHistoryImportInputResetValue();
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

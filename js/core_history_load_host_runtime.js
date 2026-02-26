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

  function createNoopHistoryLoadHostResult() {
    return {
      didLoad: false,
      disablePrev: false,
      disableNext: false
    };
  }

  function applyHistoryLoadAndRender(input) {
    var source = toRecord(input);
    var state = toRecord(source.state);
    if (!source.localHistoryStore) return createNoopHistoryLoadHostResult();

    if (source.resetPage === true) {
      state.page = 1;
    }

    var loadRuntime = toRecord(source.historyLoadRuntime);
    var resolveHistoryLoadPipeline = asFunction(loadRuntime.resolveHistoryLoadPipeline);
    if (!resolveHistoryLoadPipeline) return createNoopHistoryLoadHostResult();

    var loadPipeline = toRecord(
      resolveHistoryLoadPipeline({
        state: state,
        localHistoryStore: source.localHistoryStore,
        historyQueryRuntime: source.historyQueryRuntime,
        historyBurnInRuntime: source.historyBurnInRuntime,
        burnInMinComparable: source.burnInMinComparable,
        burnInMaxMismatchRate: source.burnInMaxMismatchRate
      })
    );

    var renderHistory = asFunction(source.renderHistory);
    var renderSummary = asFunction(source.renderSummary);
    var renderBurnInSummary = asFunction(source.renderBurnInSummary);
    var renderCanaryPolicy = asFunction(source.renderCanaryPolicy);
    var setStatus = asFunction(source.setStatus);
    var getElementById = asFunction(source.getElementById);
    var statusElementId =
      typeof source.statusElementId === "string" ? source.statusElementId : "history-status";
    var summaryElementId =
      typeof source.summaryElementId === "string" ? source.summaryElementId : "history-summary";
    var historyViewHostRuntime = toRecord(source.historyViewHostRuntime);
    var applyHistoryStatus = asFunction(historyViewHostRuntime.applyHistoryStatus);
    var applyHistorySummary = asFunction(historyViewHostRuntime.applyHistorySummary);
    var historyPanelHostRuntime = toRecord(source.historyPanelHostRuntime);
    var applyHistoryRecordListPanelRender = asFunction(
      historyPanelHostRuntime.applyHistoryRecordListPanelRender
    );
    var applyHistoryBurnInPanelRender = asFunction(
      historyPanelHostRuntime.applyHistoryBurnInPanelRender
    );
    var applyHistoryCanaryPolicyPanelRender = asFunction(
      historyPanelHostRuntime.applyHistoryCanaryPolicyPanelRender
    );
    var historyPanelContext = toRecord(source.historyPanelContext);
    var hasPanelRenderDelegates =
      !!applyHistoryRecordListPanelRender &&
      !!applyHistoryBurnInPanelRender &&
      !!applyHistoryCanaryPolicyPanelRender;

    if (hasPanelRenderDelegates) {
      applyHistoryRecordListPanelRender({
        getElementById: historyPanelContext.getElementById,
        listElementId: historyPanelContext.listElementId,
        result: loadPipeline.listResult,
        documentLike: historyPanelContext.documentLike,
        localHistoryStore: historyPanelContext.localHistoryStore,
        modeCatalog: historyPanelContext.modeCatalog,
        historyAdapterHostRuntime: historyPanelContext.historyAdapterHostRuntime,
        historyAdapterDiagnosticsRuntime: historyPanelContext.historyAdapterDiagnosticsRuntime,
        historyRecordViewRuntime: historyPanelContext.historyRecordViewRuntime,
        historyRecordItemRuntime: historyPanelContext.historyRecordItemRuntime,
        historyRecordActionsRuntime: historyPanelContext.historyRecordActionsRuntime,
        historyRecordHostRuntime: historyPanelContext.historyRecordHostRuntime,
        historyExportRuntime: historyPanelContext.historyExportRuntime,
        historyRecordListHostRuntime: historyPanelContext.historyRecordListHostRuntime,
        historyBoardRuntime: historyPanelContext.historyBoardRuntime,
        confirmAction: historyPanelContext.confirmAction,
        setStatus: source.setStatus,
        loadHistory: source.loadHistory,
        navigateToHref: historyPanelContext.navigateToHref
      });
      applyHistoryBurnInPanelRender({
        getElementById: historyPanelContext.getElementById,
        panelElementId: historyPanelContext.burnInPanelElementId,
        adapterFilterElementId: historyPanelContext.adapterFilterElementId,
        summary: loadPipeline.burnInSummary,
        state: state,
        historyBurnInHostRuntime: historyPanelContext.historyBurnInHostRuntime,
        historyBurnInRuntime: historyPanelContext.historyBurnInRuntime,
        loadHistory: source.loadHistory
      });
      applyHistoryCanaryPolicyPanelRender({
        getElementById: historyPanelContext.getElementById,
        panelElementId: historyPanelContext.canaryPanelElementId,
        runtime: historyPanelContext.runtime,
        readStorageValue: historyPanelContext.readStorageValue,
        adapterModeStorageKey: historyPanelContext.adapterModeStorageKey,
        defaultModeStorageKey: historyPanelContext.defaultModeStorageKey,
        forceLegacyStorageKey: historyPanelContext.forceLegacyStorageKey,
        historyCanarySourceRuntime: historyPanelContext.historyCanarySourceRuntime,
        historyCanaryPolicyRuntime: historyPanelContext.historyCanaryPolicyRuntime,
        historyCanaryViewRuntime: historyPanelContext.historyCanaryViewRuntime,
        historyCanaryPanelRuntime: historyPanelContext.historyCanaryPanelRuntime,
        historyCanaryActionRuntime: historyPanelContext.historyCanaryActionRuntime,
        writeStorageValue: historyPanelContext.writeStorageValue,
        loadHistory: source.loadHistory,
        setStatus: source.setStatus,
        historyCanaryHostRuntime: historyPanelContext.historyCanaryHostRuntime
      });
    } else {
      if (renderHistory) renderHistory(loadPipeline.listResult);
      if (renderBurnInSummary) renderBurnInSummary(loadPipeline.burnInSummary);
      if (renderCanaryPolicy) renderCanaryPolicy();
    }
    if (applyHistorySummary) {
      applyHistorySummary({
        getElementById: source.getElementById,
        summaryElementId: summaryElementId,
        result: loadPipeline.listResult,
        state: state,
        historySummaryRuntime: source.historySummaryRuntime
      });
    } else if (renderSummary) {
      renderSummary(loadPipeline.listResult);
    }
    if (applyHistoryStatus) {
      applyHistoryStatus({
        getElementById: getElementById,
        statusElementId: statusElementId,
        text: "",
        isError: false,
        historyStatusRuntime: source.historyStatusRuntime
      });
    } else if (setStatus) {
      setStatus("", false);
    }

    var pagerState = toRecord(loadPipeline.pagerState);
    return {
      didLoad: true,
      disablePrev: pagerState.disablePrev === true,
      disableNext: pagerState.disableNext === true
    };
  }

  function applyHistoryPagerButtonState(input) {
    var source = toRecord(input);
    var loadResult = toRecord(source.loadResult);

    var prevButton = toRecord(source.prevButton);
    if ("disabled" in prevButton) {
      prevButton.disabled = loadResult.disablePrev === true;
    }

    var nextButton = toRecord(source.nextButton);
    if ("disabled" in nextButton) {
      nextButton.disabled = loadResult.disableNext === true;
    }

    return {
      didApply: true
    };
  }

  function applyHistoryLoadWithPager(input) {
    var source = toRecord(input);
    var loadResult = applyHistoryLoadAndRender(source);
    var getElementById = asFunction(source.getElementById);
    var prevButtonId =
      typeof source.prevButtonId === "string" ? source.prevButtonId : "history-prev-page";
    var nextButtonId =
      typeof source.nextButtonId === "string" ? source.nextButtonId : "history-next-page";
    var prevButton = getElementById ? getElementById(prevButtonId) : null;
    var nextButton = getElementById ? getElementById(nextButtonId) : null;
    var pagerApplyResult = applyHistoryPagerButtonState({
      prevButton: prevButton,
      nextButton: nextButton,
      loadResult: loadResult
    });

    return {
      didLoad: loadResult.didLoad === true,
      disablePrev: loadResult.disablePrev === true,
      disableNext: loadResult.disableNext === true,
      didApplyPagerState: pagerApplyResult.didApply === true
    };
  }

  global.CoreHistoryLoadHostRuntime = global.CoreHistoryLoadHostRuntime || {};
  global.CoreHistoryLoadHostRuntime.applyHistoryLoadAndRender = applyHistoryLoadAndRender;
  global.CoreHistoryLoadHostRuntime.applyHistoryPagerButtonState = applyHistoryPagerButtonState;
  global.CoreHistoryLoadHostRuntime.applyHistoryLoadWithPager = applyHistoryLoadWithPager;
})(typeof window !== "undefined" ? window : undefined);

(function (global) {
  "use strict";

  if (!global) return;

  function hasFunction(target, key) {
    if (!target || typeof target !== "object") return false;
    return typeof target[key] === "function";
  }

  function requireRuntimeFunctions(target, functionNames, errorMessage) {
    if (!target || typeof target !== "object") {
      throw new Error(errorMessage);
    }
    for (var i = 0; i < functionNames.length; i += 1) {
      if (!hasFunction(target, functionNames[i])) {
        throw new Error(errorMessage);
      }
    }
    return target;
  }

  function resolveHistoryRuntimeContracts(windowLike) {
    var source = windowLike || {};
    var historyCanaryPolicyRuntime = requireRuntimeFunctions(
      source.CoreHistoryCanaryPolicyRuntime,
      [
        "resolveCanaryPolicySnapshot",
        "resolveStoredPolicyKeys",
        "resolveCanaryPolicyActionPlan",
        "resolveCanaryPolicyActionNotice"
      ],
      "CoreHistoryCanaryPolicyRuntime is required"
    );
    var historyCanaryActionRuntime = requireRuntimeFunctions(
      source.CoreHistoryCanaryActionRuntime,
      [
        "applyHistoryCanaryPolicyAction",
        "applyHistoryCanaryPolicyActionByName",
        "resolveHistoryCanaryPolicyUpdateFailureNotice",
        "resolveHistoryCanaryPolicyApplyFeedbackState",
        "applyHistoryCanaryPolicyActionByNameWithFeedback",
        "applyHistoryCanaryPanelAction"
      ],
      "CoreHistoryCanaryActionRuntime is required"
    );
    var historyCanarySourceRuntime = requireRuntimeFunctions(
      source.CoreHistoryCanarySourceRuntime,
      [
        "resolveHistoryCanaryRuntimePolicy",
        "resolveHistoryCanaryRuntimeStoredPolicyKeys",
        "resolveHistoryCanaryPolicySnapshotInput",
        "resolveHistoryCanaryStoredPolicyInput",
        "resolveHistoryCanaryPolicyAndStoredState"
      ],
      "CoreHistoryCanarySourceRuntime is required"
    );
    var historyCanaryPanelRuntime = requireRuntimeFunctions(
      source.CoreHistoryCanaryPanelRuntime,
      ["resolveHistoryCanaryPanelHtml", "resolveHistoryCanaryActionName"],
      "CoreHistoryCanaryPanelRuntime is required"
    );
    var historyCanaryHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryCanaryHostRuntime,
      [
        "resolveHistoryCanaryPanelRenderState",
        "applyHistoryCanaryPanelClickAction",
        "applyHistoryCanaryPanelRender"
      ],
      "CoreHistoryCanaryHostRuntime is required"
    );
    var historyAdapterDiagnosticsRuntime = requireRuntimeFunctions(
      source.CoreHistoryAdapterDiagnosticsRuntime,
      [
        "resolveHistoryAdapterParityStatus",
        "resolveHistoryAdapterBadgeState",
        "resolveHistoryAdapterDiagnosticsState",
        "resolveHistoryAdapterBadgeHtml",
        "resolveHistoryAdapterDiagnosticsHtml"
      ],
      "CoreHistoryAdapterDiagnosticsRuntime is required"
    );
    var historyAdapterHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryAdapterHostRuntime,
      ["resolveHistoryAdapterRecordRenderState"],
      "CoreHistoryAdapterHostRuntime is required"
    );
    var historyBoardRuntime = requireRuntimeFunctions(
      source.CoreHistoryBoardRuntime,
      ["resolveHistoryFinalBoardHtml"],
      "CoreHistoryBoardRuntime is required"
    );
    var historyBurnInRuntime = requireRuntimeFunctions(
      source.CoreHistoryBurnInRuntime,
      [
        "resolveHistoryBurnInSummarySource",
        "resolveHistoryBurnInSummaryState",
        "resolveHistoryBurnInMismatchFocusActionState",
        "resolveHistoryBurnInPanelHtml"
      ],
      "CoreHistoryBurnInRuntime is required"
    );
    var historyBurnInHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryBurnInHostRuntime,
      [
        "resolveHistoryBurnInPanelRenderState",
        "resolveHistoryBurnInMismatchFocusClickState",
        "applyHistoryBurnInSummaryRender"
      ],
      "CoreHistoryBurnInHostRuntime is required"
    );
    var historyCanaryViewRuntime = requireRuntimeFunctions(
      source.CoreHistoryCanaryViewRuntime,
      ["resolveHistoryCanaryViewState"],
      "CoreHistoryCanaryViewRuntime is required"
    );
    var historySummaryRuntime = requireRuntimeFunctions(
      source.CoreHistorySummaryRuntime,
      ["resolveHistorySummaryText"],
      "CoreHistorySummaryRuntime is required"
    );
    var historyStatusRuntime = requireRuntimeFunctions(
      source.CoreHistoryStatusRuntime,
      ["resolveHistoryStatusDisplayState"],
      "CoreHistoryStatusRuntime is required"
    );
    var historyExportRuntime = requireRuntimeFunctions(
      source.CoreHistoryExportRuntime,
      [
        "resolveHistoryRecordExportFileName",
        "collectHistoryRecordIdsForExport",
        "resolveHistoryExportListRecordsSource",
        "resolveHistoryMismatchExportRecordIds",
        "resolveHistorySingleRecordExportState",
        "downloadHistorySingleRecord",
        "downloadHistoryAllRecords",
        "downloadHistoryMismatchRecords"
      ],
      "CoreHistoryExportRuntime is required"
    );
    var historyQueryRuntime = requireRuntimeFunctions(
      source.CoreHistoryQueryRuntime,
      [
        "resolveHistoryFilterState",
        "applyHistoryFilterState",
        "resolveHistoryListQuery",
        "resolveHistoryListResultSource",
        "resolveHistoryBurnInQuery",
        "resolveHistoryPagerState"
      ],
      "CoreHistoryQueryRuntime is required"
    );
    var historyLoadRuntime = requireRuntimeFunctions(
      source.CoreHistoryLoadRuntime,
      ["resolveHistoryLoadPipeline"],
      "CoreHistoryLoadRuntime is required"
    );
    var historyLoadHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryLoadHostRuntime,
      ["applyHistoryLoadAndRender"],
      "CoreHistoryLoadHostRuntime is required"
    );
    var historyRecordViewRuntime = requireRuntimeFunctions(
      source.CoreHistoryRecordViewRuntime,
      [
        "resolveHistoryCatalogModeLabel",
        "resolveHistoryModeText",
        "resolveHistoryDurationText",
        "resolveHistoryEndedText",
        "resolveHistoryRecordHeadState"
      ],
      "CoreHistoryRecordViewRuntime is required"
    );
    var historyRecordItemRuntime = requireRuntimeFunctions(
      source.CoreHistoryRecordItemRuntime,
      ["resolveHistoryRecordItemHtml"],
      "CoreHistoryRecordItemRuntime is required"
    );
    var historyRecordListHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryRecordListHostRuntime,
      ["applyHistoryRecordListRender"],
      "CoreHistoryRecordListHostRuntime is required"
    );
    var historyImportRuntime = requireRuntimeFunctions(
      source.CoreHistoryImportRuntime,
      [
        "resolveHistoryImportActionState",
        "resolveHistoryImportMergeFlag",
        "resolveHistoryImportSuccessNotice",
        "resolveHistoryImportErrorNotice",
        "resolveHistoryImportReadErrorNotice",
        "executeHistoryImport"
      ],
      "CoreHistoryImportRuntime is required"
    );
    var historyImportFileRuntime = requireRuntimeFunctions(
      source.CoreHistoryImportFileRuntime,
      [
        "resolveHistoryImportSelectedFile",
        "resolveHistoryImportPayloadText",
        "resolveHistoryImportReadEncoding",
        "resolveHistoryImportInputResetValue"
      ],
      "CoreHistoryImportFileRuntime is required"
    );
    var historyImportHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryImportHostRuntime,
      [
        "resolveHistoryImportMergeClickState",
        "resolveHistoryImportReplaceClickState",
        "resolveHistoryImportFileSelectionState",
        "applyHistoryImportFromFileReadResult",
        "resolveHistoryImportReadFailureState"
      ],
      "CoreHistoryImportHostRuntime is required"
    );
    var historyImportBindHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryImportBindHostRuntime,
      ["bindHistoryImportControls"],
      "CoreHistoryImportBindHostRuntime is required"
    );
    var historyRecordActionsRuntime = requireRuntimeFunctions(
      source.CoreHistoryRecordActionsRuntime,
      [
        "resolveHistoryReplayHref",
        "resolveHistoryDeleteActionState",
        "resolveHistoryDeleteFailureNotice",
        "resolveHistoryDeleteSuccessNotice",
        "executeHistoryDeleteRecord"
      ],
      "CoreHistoryRecordActionsRuntime is required"
    );
    var historyRecordHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryRecordHostRuntime,
      [
        "resolveHistoryRecordReplayHref",
        "applyHistoryRecordExportAction",
        "applyHistoryRecordDeleteAction"
      ],
      "CoreHistoryRecordHostRuntime is required"
    );
    var historyCanaryStorageRuntime = requireRuntimeFunctions(
      source.CoreHistoryCanaryStorageRuntime,
      ["readHistoryStorageValue", "writeHistoryStorageValue"],
      "CoreHistoryCanaryStorageRuntime is required"
    );
    var historyToolbarRuntime = requireRuntimeFunctions(
      source.CoreHistoryToolbarRuntime,
      [
        "resolveHistoryExportDateTag",
        "resolveHistoryExportAllFileName",
        "resolveHistoryExportAllNotice",
        "resolveHistoryMismatchExportQuery",
        "resolveHistoryMismatchExportEmptyNotice",
        "resolveHistoryMismatchExportFileName",
        "resolveHistoryMismatchExportSuccessNotice",
        "resolveHistoryClearAllActionState",
        "executeHistoryClearAll"
      ],
      "CoreHistoryToolbarRuntime is required"
    );
    var historyToolbarHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryToolbarHostRuntime,
      [
        "applyHistoryExportAllAction",
        "applyHistoryMismatchExportAction",
        "applyHistoryClearAllAction"
      ],
      "CoreHistoryToolbarHostRuntime is required"
    );
    var historyToolbarBindHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryToolbarBindHostRuntime,
      ["bindHistoryToolbarActionButtons"],
      "CoreHistoryToolbarBindHostRuntime is required"
    );
    var historyToolbarEventsRuntime = requireRuntimeFunctions(
      source.CoreHistoryToolbarEventsRuntime,
      [
        "resolveHistoryPrevPageState",
        "resolveHistoryNextPageState",
        "resolveHistoryFilterReloadControlIds",
        "shouldHistoryKeywordTriggerReload"
      ],
      "CoreHistoryToolbarEventsRuntime is required"
    );
    var historyToolbarEventsHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryToolbarEventsHostRuntime,
      ["bindHistoryToolbarPagerAndFilterEvents"],
      "CoreHistoryToolbarEventsHostRuntime is required"
    );
    var historyModeFilterRuntime = requireRuntimeFunctions(
      source.CoreHistoryModeFilterRuntime,
      ["resolveHistoryModeFilterOptions"],
      "CoreHistoryModeFilterRuntime is required"
    );
    var historyModeFilterHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryModeFilterHostRuntime,
      ["applyHistoryModeFilterOptionsRender"],
      "CoreHistoryModeFilterHostRuntime is required"
    );
    var historyStartupHostRuntime = requireRuntimeFunctions(
      source.CoreHistoryStartupHostRuntime,
      ["applyHistoryStartup"],
      "CoreHistoryStartupHostRuntime is required"
    );

    return {
      historyCanaryPolicyRuntime: historyCanaryPolicyRuntime,
      historyCanaryActionRuntime: historyCanaryActionRuntime,
      historyCanarySourceRuntime: historyCanarySourceRuntime,
      historyCanaryPanelRuntime: historyCanaryPanelRuntime,
      historyCanaryHostRuntime: historyCanaryHostRuntime,
      historyAdapterDiagnosticsRuntime: historyAdapterDiagnosticsRuntime,
      historyAdapterHostRuntime: historyAdapterHostRuntime,
      historyBoardRuntime: historyBoardRuntime,
      historyBurnInRuntime: historyBurnInRuntime,
      historyBurnInHostRuntime: historyBurnInHostRuntime,
      historyCanaryViewRuntime: historyCanaryViewRuntime,
      historySummaryRuntime: historySummaryRuntime,
      historyStatusRuntime: historyStatusRuntime,
      historyExportRuntime: historyExportRuntime,
      historyQueryRuntime: historyQueryRuntime,
      historyLoadRuntime: historyLoadRuntime,
      historyLoadHostRuntime: historyLoadHostRuntime,
      historyRecordViewRuntime: historyRecordViewRuntime,
      historyRecordItemRuntime: historyRecordItemRuntime,
      historyRecordListHostRuntime: historyRecordListHostRuntime,
      historyImportRuntime: historyImportRuntime,
      historyImportFileRuntime: historyImportFileRuntime,
      historyImportHostRuntime: historyImportHostRuntime,
      historyImportBindHostRuntime: historyImportBindHostRuntime,
      historyRecordActionsRuntime: historyRecordActionsRuntime,
      historyRecordHostRuntime: historyRecordHostRuntime,
      historyCanaryStorageRuntime: historyCanaryStorageRuntime,
      historyToolbarRuntime: historyToolbarRuntime,
      historyToolbarHostRuntime: historyToolbarHostRuntime,
      historyToolbarBindHostRuntime: historyToolbarBindHostRuntime,
      historyToolbarEventsRuntime: historyToolbarEventsRuntime,
      historyToolbarEventsHostRuntime: historyToolbarEventsHostRuntime,
      historyModeFilterRuntime: historyModeFilterRuntime,
      historyModeFilterHostRuntime: historyModeFilterHostRuntime,
      historyStartupHostRuntime: historyStartupHostRuntime
    };
  }

  global.CoreHistoryRuntimeContractRuntime = global.CoreHistoryRuntimeContractRuntime || {};
  global.CoreHistoryRuntimeContractRuntime.resolveHistoryRuntimeContracts =
    resolveHistoryRuntimeContracts;
})(typeof window !== "undefined" ? window : undefined);

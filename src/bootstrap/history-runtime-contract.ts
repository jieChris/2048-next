type AnyRecord = Record<string, unknown>;

export interface HistoryRuntimeContractWindowLike {
  CoreHistoryCanaryPolicyRuntime?: unknown;
  CoreHistoryCanaryActionRuntime?: unknown;
  CoreHistoryCanarySourceRuntime?: unknown;
  CoreHistoryCanaryPanelRuntime?: unknown;
  CoreHistoryCanaryHostRuntime?: unknown;
  CoreHistoryAdapterDiagnosticsRuntime?: unknown;
  CoreHistoryAdapterHostRuntime?: unknown;
  CoreHistoryBoardRuntime?: unknown;
  CoreHistoryBurnInRuntime?: unknown;
  CoreHistoryBurnInHostRuntime?: unknown;
  CoreHistoryCanaryViewRuntime?: unknown;
  CoreHistorySummaryRuntime?: unknown;
  CoreHistoryStatusRuntime?: unknown;
  CoreHistoryExportRuntime?: unknown;
  CoreHistoryQueryRuntime?: unknown;
  CoreHistoryLoadRuntime?: unknown;
  CoreHistoryLoadHostRuntime?: unknown;
  CoreHistoryRecordViewRuntime?: unknown;
  CoreHistoryRecordItemRuntime?: unknown;
  CoreHistoryRecordListHostRuntime?: unknown;
  CoreHistoryImportRuntime?: unknown;
  CoreHistoryImportFileRuntime?: unknown;
  CoreHistoryImportHostRuntime?: unknown;
  CoreHistoryImportBindHostRuntime?: unknown;
  CoreHistoryRecordActionsRuntime?: unknown;
  CoreHistoryRecordHostRuntime?: unknown;
  CoreHistoryCanaryStorageRuntime?: unknown;
  CoreHistoryToolbarRuntime?: unknown;
  CoreHistoryToolbarHostRuntime?: unknown;
  CoreHistoryToolbarBindHostRuntime?: unknown;
  CoreHistoryToolbarEventsRuntime?: unknown;
  CoreHistoryToolbarEventsHostRuntime?: unknown;
  CoreHistoryModeFilterRuntime?: unknown;
  CoreHistoryModeFilterHostRuntime?: unknown;
  CoreHistoryStartupHostRuntime?: unknown;
}

export interface ResolveHistoryRuntimeContractsResult {
  historyCanaryPolicyRuntime: AnyRecord;
  historyCanaryActionRuntime: AnyRecord;
  historyCanarySourceRuntime: AnyRecord;
  historyCanaryPanelRuntime: AnyRecord;
  historyCanaryHostRuntime: AnyRecord;
  historyAdapterDiagnosticsRuntime: AnyRecord;
  historyAdapterHostRuntime: AnyRecord;
  historyBoardRuntime: AnyRecord;
  historyBurnInRuntime: AnyRecord;
  historyBurnInHostRuntime: AnyRecord;
  historyCanaryViewRuntime: AnyRecord;
  historySummaryRuntime: AnyRecord;
  historyStatusRuntime: AnyRecord;
  historyExportRuntime: AnyRecord;
  historyQueryRuntime: AnyRecord;
  historyLoadRuntime: AnyRecord;
  historyLoadHostRuntime: AnyRecord;
  historyRecordViewRuntime: AnyRecord;
  historyRecordItemRuntime: AnyRecord;
  historyRecordListHostRuntime: AnyRecord;
  historyImportRuntime: AnyRecord;
  historyImportFileRuntime: AnyRecord;
  historyImportHostRuntime: AnyRecord;
  historyImportBindHostRuntime: AnyRecord;
  historyRecordActionsRuntime: AnyRecord;
  historyRecordHostRuntime: AnyRecord;
  historyCanaryStorageRuntime: AnyRecord;
  historyToolbarRuntime: AnyRecord;
  historyToolbarHostRuntime: AnyRecord;
  historyToolbarBindHostRuntime: AnyRecord;
  historyToolbarEventsRuntime: AnyRecord;
  historyToolbarEventsHostRuntime: AnyRecord;
  historyModeFilterRuntime: AnyRecord;
  historyModeFilterHostRuntime: AnyRecord;
  historyStartupHostRuntime: AnyRecord;
}

function hasFunction(target: unknown, key: string): boolean {
  if (!target || typeof target !== "object") return false;
  return typeof (target as AnyRecord)[key] === "function";
}

function requireRuntimeFunctions(
  target: unknown,
  functionNames: string[],
  errorMessage: string
): AnyRecord {
  if (!target || typeof target !== "object") {
    throw new Error(errorMessage);
  }
  for (const functionName of functionNames) {
    if (!hasFunction(target, functionName)) {
      throw new Error(errorMessage);
    }
  }
  return target as AnyRecord;
}

export function resolveHistoryRuntimeContracts(
  windowLike: HistoryRuntimeContractWindowLike
): ResolveHistoryRuntimeContractsResult {
  const source = windowLike || {};
  const historyCanaryPolicyRuntime = requireRuntimeFunctions(
    source.CoreHistoryCanaryPolicyRuntime,
    [
      "resolveCanaryPolicySnapshot",
      "resolveStoredPolicyKeys",
      "resolveCanaryPolicyActionPlan",
      "resolveCanaryPolicyActionNotice"
    ],
    "CoreHistoryCanaryPolicyRuntime is required"
  );
  const historyCanaryActionRuntime = requireRuntimeFunctions(
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
  const historyCanarySourceRuntime = requireRuntimeFunctions(
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
  const historyCanaryPanelRuntime = requireRuntimeFunctions(
    source.CoreHistoryCanaryPanelRuntime,
    ["resolveHistoryCanaryPanelHtml", "resolveHistoryCanaryActionName"],
    "CoreHistoryCanaryPanelRuntime is required"
  );
  const historyCanaryHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryCanaryHostRuntime,
    [
      "resolveHistoryCanaryPanelRenderState",
      "applyHistoryCanaryPanelClickAction",
      "applyHistoryCanaryPanelRender"
    ],
    "CoreHistoryCanaryHostRuntime is required"
  );
  const historyAdapterDiagnosticsRuntime = requireRuntimeFunctions(
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
  const historyAdapterHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryAdapterHostRuntime,
    ["resolveHistoryAdapterRecordRenderState"],
    "CoreHistoryAdapterHostRuntime is required"
  );
  const historyBoardRuntime = requireRuntimeFunctions(
    source.CoreHistoryBoardRuntime,
    ["resolveHistoryFinalBoardHtml"],
    "CoreHistoryBoardRuntime is required"
  );
  const historyBurnInRuntime = requireRuntimeFunctions(
    source.CoreHistoryBurnInRuntime,
    [
      "resolveHistoryBurnInSummarySource",
      "resolveHistoryBurnInSummaryState",
      "resolveHistoryBurnInMismatchFocusActionState",
      "resolveHistoryBurnInPanelHtml"
    ],
    "CoreHistoryBurnInRuntime is required"
  );
  const historyBurnInHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryBurnInHostRuntime,
    [
      "resolveHistoryBurnInPanelRenderState",
      "resolveHistoryBurnInMismatchFocusClickState",
      "applyHistoryBurnInSummaryRender"
    ],
    "CoreHistoryBurnInHostRuntime is required"
  );
  const historyCanaryViewRuntime = requireRuntimeFunctions(
    source.CoreHistoryCanaryViewRuntime,
    ["resolveHistoryCanaryViewState"],
    "CoreHistoryCanaryViewRuntime is required"
  );
  const historySummaryRuntime = requireRuntimeFunctions(
    source.CoreHistorySummaryRuntime,
    ["resolveHistorySummaryText"],
    "CoreHistorySummaryRuntime is required"
  );
  const historyStatusRuntime = requireRuntimeFunctions(
    source.CoreHistoryStatusRuntime,
    ["resolveHistoryStatusDisplayState"],
    "CoreHistoryStatusRuntime is required"
  );
  const historyExportRuntime = requireRuntimeFunctions(
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
  const historyQueryRuntime = requireRuntimeFunctions(
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
  const historyLoadRuntime = requireRuntimeFunctions(
    source.CoreHistoryLoadRuntime,
    ["resolveHistoryLoadPipeline"],
    "CoreHistoryLoadRuntime is required"
  );
  const historyLoadHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryLoadHostRuntime,
    ["applyHistoryLoadAndRender", "applyHistoryPagerButtonState", "applyHistoryLoadWithPager"],
    "CoreHistoryLoadHostRuntime is required"
  );
  const historyRecordViewRuntime = requireRuntimeFunctions(
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
  const historyRecordItemRuntime = requireRuntimeFunctions(
    source.CoreHistoryRecordItemRuntime,
    ["resolveHistoryRecordItemHtml"],
    "CoreHistoryRecordItemRuntime is required"
  );
  const historyRecordListHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryRecordListHostRuntime,
    ["applyHistoryRecordListRender"],
    "CoreHistoryRecordListHostRuntime is required"
  );
  const historyImportRuntime = requireRuntimeFunctions(
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
  const historyImportFileRuntime = requireRuntimeFunctions(
    source.CoreHistoryImportFileRuntime,
    [
      "resolveHistoryImportSelectedFile",
      "resolveHistoryImportPayloadText",
      "resolveHistoryImportReadEncoding",
      "resolveHistoryImportInputResetValue"
    ],
    "CoreHistoryImportFileRuntime is required"
  );
  const historyImportHostRuntime = requireRuntimeFunctions(
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
  const historyImportBindHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryImportBindHostRuntime,
    ["bindHistoryImportControls"],
    "CoreHistoryImportBindHostRuntime is required"
  );
  const historyRecordActionsRuntime = requireRuntimeFunctions(
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
  const historyRecordHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryRecordHostRuntime,
    [
      "resolveHistoryRecordReplayHref",
      "applyHistoryRecordExportAction",
      "applyHistoryRecordDeleteAction"
    ],
    "CoreHistoryRecordHostRuntime is required"
  );
  const historyCanaryStorageRuntime = requireRuntimeFunctions(
    source.CoreHistoryCanaryStorageRuntime,
    ["readHistoryStorageValue", "writeHistoryStorageValue"],
    "CoreHistoryCanaryStorageRuntime is required"
  );
  const historyToolbarRuntime = requireRuntimeFunctions(
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
  const historyToolbarHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryToolbarHostRuntime,
    [
      "applyHistoryExportAllAction",
      "applyHistoryMismatchExportAction",
      "applyHistoryClearAllAction"
    ],
    "CoreHistoryToolbarHostRuntime is required"
  );
  const historyToolbarBindHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryToolbarBindHostRuntime,
    ["bindHistoryToolbarActionButtons"],
    "CoreHistoryToolbarBindHostRuntime is required"
  );
  const historyToolbarEventsRuntime = requireRuntimeFunctions(
    source.CoreHistoryToolbarEventsRuntime,
    [
      "resolveHistoryPrevPageState",
      "resolveHistoryNextPageState",
      "resolveHistoryFilterReloadControlIds",
      "shouldHistoryKeywordTriggerReload"
    ],
    "CoreHistoryToolbarEventsRuntime is required"
  );
  const historyToolbarEventsHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryToolbarEventsHostRuntime,
    ["bindHistoryToolbarPagerAndFilterEvents"],
    "CoreHistoryToolbarEventsHostRuntime is required"
  );
  const historyModeFilterRuntime = requireRuntimeFunctions(
    source.CoreHistoryModeFilterRuntime,
    ["resolveHistoryModeFilterOptions"],
    "CoreHistoryModeFilterRuntime is required"
  );
  const historyModeFilterHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryModeFilterHostRuntime,
    ["applyHistoryModeFilterOptionsRender"],
    "CoreHistoryModeFilterHostRuntime is required"
  );
  const historyStartupHostRuntime = requireRuntimeFunctions(
    source.CoreHistoryStartupHostRuntime,
    ["applyHistoryStartup"],
    "CoreHistoryStartupHostRuntime is required"
  );

  return {
    historyCanaryPolicyRuntime,
    historyCanaryActionRuntime,
    historyCanarySourceRuntime,
    historyCanaryPanelRuntime,
    historyCanaryHostRuntime,
    historyAdapterDiagnosticsRuntime,
    historyAdapterHostRuntime,
    historyBoardRuntime,
    historyBurnInRuntime,
    historyBurnInHostRuntime,
    historyCanaryViewRuntime,
    historySummaryRuntime,
    historyStatusRuntime,
    historyExportRuntime,
    historyQueryRuntime,
    historyLoadRuntime,
    historyLoadHostRuntime,
    historyRecordViewRuntime,
    historyRecordItemRuntime,
    historyRecordListHostRuntime,
    historyImportRuntime,
    historyImportFileRuntime,
    historyImportHostRuntime,
    historyImportBindHostRuntime,
    historyRecordActionsRuntime,
    historyRecordHostRuntime,
    historyCanaryStorageRuntime,
    historyToolbarRuntime,
    historyToolbarHostRuntime,
    historyToolbarBindHostRuntime,
    historyToolbarEventsRuntime,
    historyToolbarEventsHostRuntime,
    historyModeFilterRuntime,
    historyModeFilterHostRuntime,
    historyStartupHostRuntime
  };
}

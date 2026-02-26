function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function resolveHistoryLoadPanelContext(input: {
  getElementById?: unknown;
  listElementId?: unknown;
  documentLike?: unknown;
  localHistoryStore?: unknown;
  modeCatalog?: unknown;
  historyAdapterHostRuntime?: unknown;
  historyAdapterDiagnosticsRuntime?: unknown;
  historyRecordViewRuntime?: unknown;
  historyRecordItemRuntime?: unknown;
  historyRecordActionsRuntime?: unknown;
  historyRecordHostRuntime?: unknown;
  historyExportRuntime?: unknown;
  historyRecordListHostRuntime?: unknown;
  historyBoardRuntime?: unknown;
  confirmAction?: unknown;
  navigateToHref?: unknown;
  burnInPanelElementId?: unknown;
  adapterFilterElementId?: unknown;
  historyBurnInHostRuntime?: unknown;
  historyBurnInRuntime?: unknown;
  canaryPanelElementId?: unknown;
  runtime?: unknown;
  readStorageValue?: unknown;
  adapterModeStorageKey?: unknown;
  defaultModeStorageKey?: unknown;
  forceLegacyStorageKey?: unknown;
  historyCanarySourceRuntime?: unknown;
  historyCanaryPolicyRuntime?: unknown;
  historyCanaryViewRuntime?: unknown;
  historyCanaryPanelRuntime?: unknown;
  historyCanaryActionRuntime?: unknown;
  historyCanaryHostRuntime?: unknown;
  writeStorageValue?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  return {
    getElementById: source.getElementById,
    listElementId: typeof source.listElementId === "string" ? source.listElementId : "history-list",
    documentLike: source.documentLike,
    localHistoryStore: source.localHistoryStore,
    modeCatalog: source.modeCatalog,
    historyAdapterHostRuntime: source.historyAdapterHostRuntime,
    historyAdapterDiagnosticsRuntime: source.historyAdapterDiagnosticsRuntime,
    historyRecordViewRuntime: source.historyRecordViewRuntime,
    historyRecordItemRuntime: source.historyRecordItemRuntime,
    historyRecordActionsRuntime: source.historyRecordActionsRuntime,
    historyRecordHostRuntime: source.historyRecordHostRuntime,
    historyExportRuntime: source.historyExportRuntime,
    historyRecordListHostRuntime: source.historyRecordListHostRuntime,
    historyBoardRuntime: source.historyBoardRuntime,
    confirmAction: source.confirmAction,
    navigateToHref: source.navigateToHref,
    burnInPanelElementId:
      typeof source.burnInPanelElementId === "string"
        ? source.burnInPanelElementId
        : "history-burnin-summary",
    adapterFilterElementId:
      typeof source.adapterFilterElementId === "string"
        ? source.adapterFilterElementId
        : "history-adapter-filter",
    historyBurnInHostRuntime: source.historyBurnInHostRuntime,
    historyBurnInRuntime: source.historyBurnInRuntime,
    canaryPanelElementId:
      typeof source.canaryPanelElementId === "string"
        ? source.canaryPanelElementId
        : "history-canary-policy",
    runtime: source.runtime,
    readStorageValue: source.readStorageValue,
    adapterModeStorageKey: source.adapterModeStorageKey,
    defaultModeStorageKey: source.defaultModeStorageKey,
    forceLegacyStorageKey: source.forceLegacyStorageKey,
    historyCanarySourceRuntime: source.historyCanarySourceRuntime,
    historyCanaryPolicyRuntime: source.historyCanaryPolicyRuntime,
    historyCanaryViewRuntime: source.historyCanaryViewRuntime,
    historyCanaryPanelRuntime: source.historyCanaryPanelRuntime,
    historyCanaryActionRuntime: source.historyCanaryActionRuntime,
    historyCanaryHostRuntime: source.historyCanaryHostRuntime,
    writeStorageValue: source.writeStorageValue
  };
}

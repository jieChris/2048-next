(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function resolveHistoryLoadPanelContext(input) {
    var source = toRecord(input);
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

  global.CoreHistoryLoadContextHostRuntime = global.CoreHistoryLoadContextHostRuntime || {};
  global.CoreHistoryLoadContextHostRuntime.resolveHistoryLoadPanelContext =
    resolveHistoryLoadPanelContext;
})(typeof window !== "undefined" ? window : undefined);

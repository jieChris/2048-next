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

  function getNode(getElementById, id) {
    return getElementById ? getElementById(id) : null;
  }

  function applyHistoryBurnInPanelRender(input) {
    var source = toRecord(input);
    var getElementById = asFunction(source.getElementById);
    var panelElementId =
      typeof source.panelElementId === "string" ? source.panelElementId : "history-burnin-summary";
    var adapterFilterElementId =
      typeof source.adapterFilterElementId === "string"
        ? source.adapterFilterElementId
        : "history-adapter-filter";
    var panelElement = getNode(getElementById, panelElementId);
    if (!panelElement) {
      return {
        didRender: false
      };
    }

    var state = toRecord(source.state);
    var historyBurnInHostRuntime = toRecord(source.historyBurnInHostRuntime);
    var applyHistoryBurnInSummaryRender = asFunction(
      historyBurnInHostRuntime.applyHistoryBurnInSummaryRender
    );
    if (!applyHistoryBurnInSummaryRender) {
      return {
        didRender: false
      };
    }

    applyHistoryBurnInSummaryRender({
      panelElement: panelElement,
      summary: source.summary,
      historyBurnInRuntime: source.historyBurnInRuntime,
      adapterFilterElement: getNode(getElementById, adapterFilterElementId),
      setAdapterParityFilter: function (nextValue) {
        state.adapterParityFilter = nextValue;
      },
      loadHistory: source.loadHistory
    });

    return {
      didRender: true
    };
  }

  function applyHistoryCanaryPolicyPanelRender(input) {
    var source = toRecord(input);
    var getElementById = asFunction(source.getElementById);
    var panelElementId =
      typeof source.panelElementId === "string" ? source.panelElementId : "history-canary-policy";
    var panelElement = getNode(getElementById, panelElementId);
    if (!panelElement) {
      return {
        didRender: false
      };
    }

    var historyCanaryHostRuntime = toRecord(source.historyCanaryHostRuntime);
    var applyHistoryCanaryPanelRender = asFunction(
      historyCanaryHostRuntime.applyHistoryCanaryPanelRender
    );
    if (!applyHistoryCanaryPanelRender) {
      return {
        didRender: false
      };
    }

    applyHistoryCanaryPanelRender({
      panelElement: panelElement,
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
      writeStorageValue: source.writeStorageValue,
      loadHistory: source.loadHistory,
      setStatus: source.setStatus
    });

    return {
      didRender: true
    };
  }

  function applyHistoryRecordListPanelRender(input) {
    var source = toRecord(input);
    var getElementById = asFunction(source.getElementById);
    var listElementId = typeof source.listElementId === "string" ? source.listElementId : "history-list";
    var listElement = getNode(getElementById, listElementId);
    if (!listElement) {
      return {
        didRender: false
      };
    }

    var historyRecordListHostRuntime = toRecord(source.historyRecordListHostRuntime);
    var applyHistoryRecordListRender = asFunction(
      historyRecordListHostRuntime.applyHistoryRecordListRender
    );
    if (!applyHistoryRecordListRender) {
      return {
        didRender: false
      };
    }

    var historyBoardRuntime = toRecord(source.historyBoardRuntime);
    var resolveHistoryFinalBoardHtml = asFunction(historyBoardRuntime.resolveHistoryFinalBoardHtml);
    var boardToHtml = resolveHistoryFinalBoardHtml
      ? function (board, width, height) {
          return resolveHistoryFinalBoardHtml(board, width, height);
        }
      : function () {
          return "";
        };

    applyHistoryRecordListRender({
      listElement: listElement,
      result: source.result,
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
      boardToHtml: boardToHtml,
      confirmAction: source.confirmAction,
      setStatus: source.setStatus,
      loadHistory: source.loadHistory,
      navigateToHref: source.navigateToHref
    });

    return {
      didRender: true
    };
  }

  global.CoreHistoryPanelHostRuntime = global.CoreHistoryPanelHostRuntime || {};
  global.CoreHistoryPanelHostRuntime.applyHistoryBurnInPanelRender = applyHistoryBurnInPanelRender;
  global.CoreHistoryPanelHostRuntime.applyHistoryCanaryPolicyPanelRender =
    applyHistoryCanaryPolicyPanelRender;
  global.CoreHistoryPanelHostRuntime.applyHistoryRecordListPanelRender =
    applyHistoryRecordListPanelRender;
})(typeof window !== "undefined" ? window : undefined);

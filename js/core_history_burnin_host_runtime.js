(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function toText(value, fallback) {
    return typeof value === "string" ? value : fallback;
  }

  function createNoopMismatchFocusClickState() {
    return {
      shouldApply: false,
      nextAdapterParityFilter: "",
      nextSelectValue: "",
      shouldReload: false,
      resetPage: false
    };
  }

  function resolveHistoryBurnInPanelRenderState(input) {
    var source = isRecord(input) ? input : {};
    var runtime = toRecord(source.historyBurnInRuntime);
    var resolveHistoryBurnInSummaryState = asFunction(runtime.resolveHistoryBurnInSummaryState);
    var resolveHistoryBurnInPanelHtml = asFunction(runtime.resolveHistoryBurnInPanelHtml);
    if (!resolveHistoryBurnInSummaryState || !resolveHistoryBurnInPanelHtml) {
      return {
        panelHtml: "",
        shouldBindMismatchAction: false
      };
    }

    var summaryState = toRecord(resolveHistoryBurnInSummaryState(source.summary));
    return {
      panelHtml: toText(resolveHistoryBurnInPanelHtml(source.summary, summaryState), ""),
      shouldBindMismatchAction: summaryState.hasSummary === true
    };
  }

  function resolveHistoryBurnInMismatchFocusClickState(input) {
    var source = isRecord(input) ? input : {};
    var runtime = toRecord(source.historyBurnInRuntime);
    var resolveHistoryBurnInMismatchFocusActionState = asFunction(
      runtime.resolveHistoryBurnInMismatchFocusActionState
    );
    if (!resolveHistoryBurnInMismatchFocusActionState) return createNoopMismatchFocusClickState();

    var actionState = toRecord(resolveHistoryBurnInMismatchFocusActionState());
    return {
      shouldApply: actionState.shouldApply === true,
      nextAdapterParityFilter: toText(actionState.nextAdapterParityFilter, ""),
      nextSelectValue: toText(actionState.nextSelectValue, ""),
      shouldReload: actionState.shouldReload === true,
      resetPage: actionState.resetPage === true
    };
  }

  global.CoreHistoryBurnInHostRuntime = global.CoreHistoryBurnInHostRuntime || {};
  global.CoreHistoryBurnInHostRuntime.resolveHistoryBurnInPanelRenderState =
    resolveHistoryBurnInPanelRenderState;
  global.CoreHistoryBurnInHostRuntime.resolveHistoryBurnInMismatchFocusClickState =
    resolveHistoryBurnInMismatchFocusClickState;
})(typeof window !== "undefined" ? window : undefined);

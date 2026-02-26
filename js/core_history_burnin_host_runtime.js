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

  function hasField(target, key) {
    return !!target && typeof target === "object" && key in target;
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function queryNode(node, selector) {
    var querySelector = asFunction(toRecord(node).querySelector);
    if (!querySelector) return null;
    return querySelector.call(node, selector);
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

  function applyHistoryBurnInSummaryRender(input) {
    var source = isRecord(input) ? input : {};
    var panelElement = toRecord(source.panelElement);
    if (!hasField(panelElement, "innerHTML")) {
      return {
        didRender: false,
        didBindMismatchAction: false
      };
    }

    var panelState = resolveHistoryBurnInPanelRenderState({
      summary: source.summary,
      historyBurnInRuntime: source.historyBurnInRuntime
    });
    panelElement.innerHTML = panelState.panelHtml;
    if (panelState.shouldBindMismatchAction !== true) {
      return {
        didRender: true,
        didBindMismatchAction: false
      };
    }

    var setAdapterParityFilter = asFunction(source.setAdapterParityFilter);
    var loadHistory = asFunction(source.loadHistory);
    var adapterFilterElement = toRecord(source.adapterFilterElement);

    var mismatchBtn = queryNode(panelElement, ".history-burnin-focus-mismatch");
    var didBindMismatchAction = bindListener(mismatchBtn, "click", function () {
      var actionState = resolveHistoryBurnInMismatchFocusClickState({
        historyBurnInRuntime: source.historyBurnInRuntime
      });
      if (actionState.shouldApply !== true) return;
      if (hasField(adapterFilterElement, "value")) {
        adapterFilterElement.value = actionState.nextSelectValue;
      }
      if (setAdapterParityFilter) {
        setAdapterParityFilter(actionState.nextAdapterParityFilter);
      }
      if (loadHistory && actionState.shouldReload === true) {
        loadHistory(actionState.resetPage);
      }
    });

    return {
      didRender: true,
      didBindMismatchAction: didBindMismatchAction
    };
  }

  global.CoreHistoryBurnInHostRuntime = global.CoreHistoryBurnInHostRuntime || {};
  global.CoreHistoryBurnInHostRuntime.resolveHistoryBurnInPanelRenderState =
    resolveHistoryBurnInPanelRenderState;
  global.CoreHistoryBurnInHostRuntime.resolveHistoryBurnInMismatchFocusClickState =
    resolveHistoryBurnInMismatchFocusClickState;
  global.CoreHistoryBurnInHostRuntime.applyHistoryBurnInSummaryRender =
    applyHistoryBurnInSummaryRender;
})(typeof window !== "undefined" ? window : undefined);

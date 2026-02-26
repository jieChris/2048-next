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

    if (renderHistory) renderHistory(loadPipeline.listResult);
    if (renderSummary) renderSummary(loadPipeline.listResult);
    if (renderBurnInSummary) renderBurnInSummary(loadPipeline.burnInSummary);
    if (renderCanaryPolicy) renderCanaryPolicy();
    if (setStatus) setStatus("", false);

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

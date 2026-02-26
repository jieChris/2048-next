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

  function applyHistoryFilters(input) {
    var source = toRecord(input);
    var historyFilterHostRuntime = toRecord(source.historyFilterHostRuntime);
    var applyHistoryFilterStateFromInputs = asFunction(
      historyFilterHostRuntime.applyHistoryFilterStateFromInputs
    );
    if (!applyHistoryFilterStateFromInputs) return;
    applyHistoryFilterStateFromInputs({
      state: source.state,
      historyQueryRuntime: source.historyQueryRuntime,
      getElementById: source.getElementById
    });
  }

  function applyHistoryLoadEntry(input) {
    var source = toRecord(input);
    if (!source.localHistoryStore) {
      return {
        didLoad: false,
        missingStore: true
      };
    }

    applyHistoryFilters({
      historyFilterHostRuntime: source.historyFilterHostRuntime,
      state: source.state,
      historyQueryRuntime: source.historyQueryRuntime,
      getElementById: source.getElementById
    });

    var historyLoadHostRuntime = toRecord(source.historyLoadHostRuntime);
    var applyHistoryLoadWithPager = asFunction(historyLoadHostRuntime.applyHistoryLoadWithPager);
    if (!applyHistoryLoadWithPager) {
      return {
        didLoad: false,
        missingStore: false
      };
    }

    applyHistoryLoadWithPager({
      resetPage: source.resetPage,
      state: source.state,
      localHistoryStore: source.localHistoryStore,
      historyLoadRuntime: source.historyLoadRuntime,
      historyQueryRuntime: source.historyQueryRuntime,
      historyBurnInRuntime: source.historyBurnInRuntime,
      burnInMinComparable: source.burnInMinComparable,
      burnInMaxMismatchRate: source.burnInMaxMismatchRate,
      renderHistory: source.renderHistory,
      renderSummary: source.renderSummary,
      renderBurnInSummary: source.renderBurnInSummary,
      renderCanaryPolicy: source.renderCanaryPolicy,
      setStatus: source.setStatus,
      getElementById: source.getElementById,
      prevButtonId: source.prevButtonId,
      nextButtonId: source.nextButtonId
    });

    return {
      didLoad: true,
      missingStore: false
    };
  }

  global.CoreHistoryLoadEntryHostRuntime = global.CoreHistoryLoadEntryHostRuntime || {};
  global.CoreHistoryLoadEntryHostRuntime.applyHistoryLoadEntry = applyHistoryLoadEntry;
})(typeof window !== "undefined" ? window : undefined);

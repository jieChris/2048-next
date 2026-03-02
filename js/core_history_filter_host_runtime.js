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

  function readElementValue(getElementById, id) {
    var element = toRecord(getElementById ? getElementById(id) : null);
    return "value" in element ? element.value : undefined;
  }

  function applyHistoryFilterStateFromInputs(input) {
    var source = toRecord(input);
    var runtime = toRecord(source.historyQueryRuntime);
    var applyHistoryFilterState = asFunction(runtime.applyHistoryFilterState);
    if (!applyHistoryFilterState) {
      return {
        didApply: false
      };
    }

    var getElementById = asFunction(source.getElementById);
    var modeElementId = typeof source.modeElementId === "string" ? source.modeElementId : "history-mode";
    var keywordElementId =
      typeof source.keywordElementId === "string" ? source.keywordElementId : "history-keyword";
    var sortElementId = typeof source.sortElementId === "string" ? source.sortElementId : "history-sort";
    var adapterFilterElementId =
      typeof source.adapterFilterElementId === "string"
        ? source.adapterFilterElementId
        : "history-adapter-filter";
    var burnInWindowElementId =
      typeof source.burnInWindowElementId === "string"
        ? source.burnInWindowElementId
        : "history-burnin-window";
    var sustainedWindowElementId =
      typeof source.sustainedWindowElementId === "string"
        ? source.sustainedWindowElementId
        : "history-sustained-window";
    var minComparableElementId =
      typeof source.minComparableElementId === "string"
        ? source.minComparableElementId
        : "history-burnin-min-comparable";
    var maxMismatchRateElementId =
      typeof source.maxMismatchRateElementId === "string"
        ? source.maxMismatchRateElementId
        : "history-burnin-max-mismatch-rate";

    applyHistoryFilterState(source.state, {
      modeKeyRaw: readElementValue(getElementById, modeElementId),
      keywordRaw: readElementValue(getElementById, keywordElementId),
      sortByRaw: readElementValue(getElementById, sortElementId),
      adapterParityFilterRaw: readElementValue(getElementById, adapterFilterElementId),
      burnInWindowRaw: readElementValue(getElementById, burnInWindowElementId),
      sustainedWindowsRaw: readElementValue(getElementById, sustainedWindowElementId),
      minComparableRaw: readElementValue(getElementById, minComparableElementId),
      maxMismatchRateRaw: readElementValue(getElementById, maxMismatchRateElementId)
    });

    return {
      didApply: true
    };
  }

  global.CoreHistoryFilterHostRuntime = global.CoreHistoryFilterHostRuntime || {};
  global.CoreHistoryFilterHostRuntime.applyHistoryFilterStateFromInputs =
    applyHistoryFilterStateFromInputs;
})(typeof window !== "undefined" ? window : undefined);

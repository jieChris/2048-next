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

  function applyHistoryStatus(input) {
    var source = toRecord(input);
    var runtime = toRecord(source.historyStatusRuntime);
    var resolveHistoryStatusDisplayState = asFunction(runtime.resolveHistoryStatusDisplayState);
    if (!resolveHistoryStatusDisplayState) {
      return {
        didApply: false,
        text: "",
        color: ""
      };
    }

    var statusState = toRecord(
      resolveHistoryStatusDisplayState({
        text: source.text,
        isError: source.isError
      })
    );
    var text = typeof statusState.text === "string" ? statusState.text : "";
    var color = typeof statusState.color === "string" ? statusState.color : "";
    var getElementById = asFunction(source.getElementById);
    var statusElementId =
      typeof source.statusElementId === "string" ? source.statusElementId : "history-status";
    var statusElement = toRecord(getElementById ? getElementById(statusElementId) : null);
    if ("textContent" in statusElement) {
      statusElement.textContent = text;
    }
    var style = toRecord(statusElement.style);
    if ("color" in style) {
      style.color = color;
    }

    return {
      didApply: true,
      text: text,
      color: color
    };
  }

  function applyHistorySummary(input) {
    var source = toRecord(input);
    var runtime = toRecord(source.historySummaryRuntime);
    var resolveHistorySummaryText = asFunction(runtime.resolveHistorySummaryText);
    if (!resolveHistorySummaryText) {
      return {
        didApply: false,
        text: ""
      };
    }

    var result = toRecord(source.result);
    var state = toRecord(source.state);
    var textValue = resolveHistorySummaryText({
      total: result.total,
      page: state.page,
      pageSize: state.pageSize,
      adapterParityFilter: state.adapterParityFilter
    });
    var text = typeof textValue === "string" ? textValue : "";
    var getElementById = asFunction(source.getElementById);
    var summaryElementId =
      typeof source.summaryElementId === "string" ? source.summaryElementId : "history-summary";
    var summaryElement = toRecord(getElementById ? getElementById(summaryElementId) : null);
    if ("textContent" in summaryElement) {
      summaryElement.textContent = text;
    }

    return {
      didApply: true,
      text: text
    };
  }

  global.CoreHistoryViewHostRuntime = global.CoreHistoryViewHostRuntime || {};
  global.CoreHistoryViewHostRuntime.applyHistoryStatus = applyHistoryStatus;
  global.CoreHistoryViewHostRuntime.applyHistorySummary = applyHistorySummary;
})(typeof window !== "undefined" ? window : undefined);

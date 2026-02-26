(function (global) {
  "use strict";

  if (!global) return;

  var HISTORY_STATUS_NORMAL_COLOR = "#4a4a4a";
  var HISTORY_STATUS_ERROR_COLOR = "#c0392b";

  function asStatusInput(input) {
    if (!input || typeof input !== "object") return {};
    return input;
  }

  function asStatusText(value) {
    return typeof value === "string" ? value : "";
  }

  function resolveHistoryStatusDisplayState(input) {
    var opts = asStatusInput(input);
    return {
      text: asStatusText(opts.text),
      color: opts.isError === true ? HISTORY_STATUS_ERROR_COLOR : HISTORY_STATUS_NORMAL_COLOR
    };
  }

  global.CoreHistoryStatusRuntime = global.CoreHistoryStatusRuntime || {};
  global.CoreHistoryStatusRuntime.resolveHistoryStatusDisplayState =
    resolveHistoryStatusDisplayState;
})(typeof window !== "undefined" ? window : undefined);

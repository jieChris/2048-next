(function (global) {
  "use strict";

  if (!global) return;

  function normalizePage(page) {
    var value = Number(page);
    if (!Number.isFinite(value)) return 1;
    return value;
  }

  function resolveHistoryPrevPageState(page) {
    var current = normalizePage(page);
    if (current <= 1) {
      return {
        canGo: false,
        nextPage: current
      };
    }
    return {
      canGo: true,
      nextPage: current - 1
    };
  }

  function resolveHistoryNextPageState(page) {
    var current = normalizePage(page);
    return {
      canGo: true,
      nextPage: current + 1
    };
  }

  function resolveHistoryFilterReloadControlIds() {
    return [
      "history-mode",
      "history-sort",
      "history-adapter-filter",
      "history-burnin-window",
      "history-sustained-window"
    ];
  }

  function shouldHistoryKeywordTriggerReload(key) {
    return key === "Enter";
  }

  global.CoreHistoryToolbarEventsRuntime = global.CoreHistoryToolbarEventsRuntime || {};
  global.CoreHistoryToolbarEventsRuntime.resolveHistoryPrevPageState = resolveHistoryPrevPageState;
  global.CoreHistoryToolbarEventsRuntime.resolveHistoryNextPageState = resolveHistoryNextPageState;
  global.CoreHistoryToolbarEventsRuntime.resolveHistoryFilterReloadControlIds = resolveHistoryFilterReloadControlIds;
  global.CoreHistoryToolbarEventsRuntime.shouldHistoryKeywordTriggerReload = shouldHistoryKeywordTriggerReload;
})(typeof window !== "undefined" ? window : undefined);

(function (global) {
  "use strict";

  if (!global) return;

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function applyHistoryStartup(input) {
    var source = input || {};
    var setStatus = asFunction(source.setStatus);
    var initModeFilter = asFunction(source.initModeFilter);
    var bindToolbarActions = asFunction(source.bindToolbarActions);
    var loadHistory = asFunction(source.loadHistory);

    if (!source.localHistoryStore) {
      if (setStatus) setStatus("本地历史模块未加载", true);
      return {
        started: false,
        missingStore: true
      };
    }

    if (initModeFilter) initModeFilter();
    if (bindToolbarActions) bindToolbarActions();
    if (loadHistory) loadHistory(true);
    return {
      started: true,
      missingStore: false
    };
  }

  global.CoreHistoryStartupHostRuntime = global.CoreHistoryStartupHostRuntime || {};
  global.CoreHistoryStartupHostRuntime.applyHistoryStartup = applyHistoryStartup;
})(typeof window !== "undefined" ? window : undefined);

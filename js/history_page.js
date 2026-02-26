(function () {
  function el(id) {
    return document.getElementById(id);
  }

  var historyRuntimeContractRuntime = window.CoreHistoryRuntimeContractRuntime;
  if (
    !historyRuntimeContractRuntime ||
    typeof historyRuntimeContractRuntime.resolveHistoryRuntimeContracts !== "function"
  ) {
    throw new Error("CoreHistoryRuntimeContractRuntime is required");
  }
  var historyPageHostRuntime = window.CoreHistoryPageHostRuntime;
  if (
    !historyPageHostRuntime ||
    typeof historyPageHostRuntime.resolveHistoryPageDefaults !== "function" ||
    typeof historyPageHostRuntime.resolveHistoryPageEnvironment !== "function" ||
    typeof historyPageHostRuntime.applyHistoryPageApp !== "function"
  ) {
    throw new Error("CoreHistoryPageHostRuntime is required");
  }
  var historyPageDefaults = historyPageHostRuntime.resolveHistoryPageDefaults();
  var historyPageEnvironment = historyPageHostRuntime.resolveHistoryPageEnvironment({
    windowLike: window,
    documentLike: document
  });
  var historyRuntimes = historyRuntimeContractRuntime.resolveHistoryRuntimeContracts(window);

  document.addEventListener("DOMContentLoaded", function () {
    historyPageHostRuntime.applyHistoryPageApp({
      historyPageDefaults: historyPageDefaults,
      historyPageEnvironment: historyPageEnvironment,
      historyRuntimes: historyRuntimes,
      getElementById: el
    });
  });
})();

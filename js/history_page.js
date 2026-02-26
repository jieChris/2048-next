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
    typeof historyPageHostRuntime.applyHistoryPageStatus !== "function" ||
    typeof historyPageHostRuntime.applyHistoryPageLoad !== "function" ||
    typeof historyPageHostRuntime.applyHistoryPageStartup !== "function"
  ) {
    throw new Error("CoreHistoryPageHostRuntime is required");
  }
  var historyPageDefaults = historyPageHostRuntime.resolveHistoryPageDefaults();
  var historyPageEnvironment = historyPageHostRuntime.resolveHistoryPageEnvironment({
    windowLike: window,
    documentLike: document
  });
  var state = historyPageDefaults.state;
  var historyRuntimes = historyRuntimeContractRuntime.resolveHistoryRuntimeContracts(window);

  function setStatus(text, isError) {
    historyPageHostRuntime.applyHistoryPageStatus({
      getElementById: el,
      statusElementId: historyPageDefaults.statusElementId,
      text: text,
      isError: isError,
      historyRuntimes: historyRuntimes
    });
  }

  function loadHistory(resetPage) {
    historyPageHostRuntime.applyHistoryPageLoad({
      resetPage: resetPage,
      localHistoryStore: historyPageEnvironment.localHistoryStore,
      state: state,
      getElementById: el,
      historyRuntimes: historyRuntimes,
      burnInMinComparable: historyPageDefaults.burnInMinComparable,
      burnInMaxMismatchRate: historyPageDefaults.burnInMaxMismatchRate,
      statusElementId: historyPageDefaults.statusElementId,
      summaryElementId: historyPageDefaults.summaryElementId,
      loadHistory: loadHistory,
      setStatus: setStatus,
      prevButtonId: historyPageDefaults.prevButtonId,
      nextButtonId: historyPageDefaults.nextButtonId,
      listElementId: historyPageDefaults.listElementId,
      documentLike: historyPageEnvironment.documentLike,
      modeCatalog: historyPageEnvironment.modeCatalog,
      confirmAction: historyPageEnvironment.confirmAction,
      navigateToHref: historyPageEnvironment.navigateToHref,
      burnInPanelElementId: historyPageDefaults.burnInPanelElementId,
      adapterFilterElementId: historyPageDefaults.adapterFilterElementId,
      canaryPanelElementId: historyPageDefaults.canaryPanelElementId,
      runtime: historyPageEnvironment.runtime,
      adapterModeStorageKey: historyPageDefaults.adapterModeStorageKey,
      defaultModeStorageKey: historyPageDefaults.defaultModeStorageKey,
      forceLegacyStorageKey: historyPageDefaults.forceLegacyStorageKey
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    historyPageHostRuntime.applyHistoryPageStartup({
      localHistoryStore: historyPageEnvironment.localHistoryStore,
      setStatus: setStatus,
      loadHistory: loadHistory,
      historyRuntimes: historyRuntimes,
      getElementById: el,
      modeElementId: historyPageDefaults.modeElementId,
      modeCatalog: historyPageEnvironment.modeCatalog,
      documentLike: historyPageEnvironment.documentLike,
      state: state,
      confirmAction: historyPageEnvironment.confirmAction,
      createDate: historyPageEnvironment.createDate,
      createFileReader: historyPageEnvironment.createFileReader
    });
  });
})();

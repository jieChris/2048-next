(function () {
  function el(id) {
    return document.getElementById(id);
  }

  var state = {
    page: 1,
    pageSize: 30,
    modeKey: "",
    keyword: "",
    sortBy: "ended_desc",
    adapterParityFilter: "all",
    burnInWindow: "200",
    sustainedWindows: "3"
  };
  var BURN_IN_MIN_COMPARABLE = 50;
  var BURN_IN_MAX_MISMATCH_RATE = 1;
  var ADAPTER_MODE_STORAGE_KEY = "engine_adapter_mode";
  var ADAPTER_DEFAULT_STORAGE_KEY = "engine_adapter_default_mode";
  var ADAPTER_FORCE_LEGACY_STORAGE_KEY = "engine_adapter_force_legacy";
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
    typeof historyPageHostRuntime.applyHistoryPageStatus !== "function" ||
    typeof historyPageHostRuntime.applyHistoryPageLoad !== "function" ||
    typeof historyPageHostRuntime.applyHistoryPageStartup !== "function"
  ) {
    throw new Error("CoreHistoryPageHostRuntime is required");
  }
  var historyRuntimes = historyRuntimeContractRuntime.resolveHistoryRuntimeContracts(window);

  function setStatus(text, isError) {
    historyPageHostRuntime.applyHistoryPageStatus({
      getElementById: el,
      statusElementId: "history-status",
      text: text,
      isError: isError,
      historyRuntimes: historyRuntimes
    });
  }

  function loadHistory(resetPage) {
    historyPageHostRuntime.applyHistoryPageLoad({
      resetPage: resetPage,
      localHistoryStore: window.LocalHistoryStore,
      state: state,
      getElementById: el,
      historyRuntimes: historyRuntimes,
      burnInMinComparable: BURN_IN_MIN_COMPARABLE,
      burnInMaxMismatchRate: BURN_IN_MAX_MISMATCH_RATE,
      statusElementId: "history-status",
      summaryElementId: "history-summary",
      loadHistory: loadHistory,
      setStatus: setStatus,
      prevButtonId: "history-prev-page",
      nextButtonId: "history-next-page",
      listElementId: "history-list",
      documentLike: document,
      modeCatalog: window.ModeCatalog,
      confirmAction: window.confirm,
      navigateToHref: function (href) {
        window.location.href = href;
      },
      burnInPanelElementId: "history-burnin-summary",
      adapterFilterElementId: "history-adapter-filter",
      canaryPanelElementId: "history-canary-policy",
      runtime: window.LegacyAdapterRuntime,
      adapterModeStorageKey: ADAPTER_MODE_STORAGE_KEY,
      defaultModeStorageKey: ADAPTER_DEFAULT_STORAGE_KEY,
      forceLegacyStorageKey: ADAPTER_FORCE_LEGACY_STORAGE_KEY
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    historyPageHostRuntime.applyHistoryPageStartup({
      localHistoryStore: window.LocalHistoryStore,
      setStatus: setStatus,
      loadHistory: loadHistory,
      historyRuntimes: historyRuntimes,
      getElementById: el,
      modeElementId: "history-mode",
      modeCatalog: window.ModeCatalog,
      documentLike: document,
      state: state,
      confirmAction: window.confirm,
      createDate: function () {
        return new Date();
      },
      createFileReader: function () {
        return new FileReader();
      }
    });
  });
})();

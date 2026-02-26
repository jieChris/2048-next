function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function hasOwnKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

export function resolveHistoryPageDefaults(input?: unknown): Record<string, unknown> {
  const source = toRecord(input);
  return {
    state: {
      page: 1,
      pageSize: 30,
      modeKey: "",
      keyword: "",
      sortBy: "ended_desc",
      adapterParityFilter: "all",
      burnInWindow: "200",
      sustainedWindows: "3"
    },
    burnInMinComparable:
      typeof source.burnInMinComparable === "number" ? source.burnInMinComparable : 50,
    burnInMaxMismatchRate:
      typeof source.burnInMaxMismatchRate === "number" ? source.burnInMaxMismatchRate : 1,
    adapterModeStorageKey:
      typeof source.adapterModeStorageKey === "string"
        ? source.adapterModeStorageKey
        : "engine_adapter_mode",
    defaultModeStorageKey:
      typeof source.defaultModeStorageKey === "string"
        ? source.defaultModeStorageKey
        : "engine_adapter_default_mode",
    forceLegacyStorageKey:
      typeof source.forceLegacyStorageKey === "string"
        ? source.forceLegacyStorageKey
        : "engine_adapter_force_legacy",
    statusElementId: typeof source.statusElementId === "string" ? source.statusElementId : "history-status",
    summaryElementId: typeof source.summaryElementId === "string" ? source.summaryElementId : "history-summary",
    prevButtonId: typeof source.prevButtonId === "string" ? source.prevButtonId : "history-prev-page",
    nextButtonId: typeof source.nextButtonId === "string" ? source.nextButtonId : "history-next-page",
    listElementId: typeof source.listElementId === "string" ? source.listElementId : "history-list",
    modeElementId: typeof source.modeElementId === "string" ? source.modeElementId : "history-mode",
    burnInPanelElementId:
      typeof source.burnInPanelElementId === "string"
        ? source.burnInPanelElementId
        : "history-burnin-summary",
    adapterFilterElementId:
      typeof source.adapterFilterElementId === "string"
        ? source.adapterFilterElementId
        : "history-adapter-filter",
    canaryPanelElementId:
      typeof source.canaryPanelElementId === "string"
        ? source.canaryPanelElementId
        : "history-canary-policy"
  };
}

export function resolveHistoryPageEnvironment(input?: unknown): Record<string, unknown> {
  const source = toRecord(input);
  const windowLike = toRecord(source.windowLike);
  const locationLike = toRecord(windowLike.location);
  const sourceConfirmAction = asFunction<(message: unknown) => unknown>(source.confirmAction);
  const windowConfirmAction = asFunction<(message: unknown) => unknown>(windowLike.confirm);
  const sourceNavigateToHref = asFunction<(href: unknown) => unknown>(source.navigateToHref);
  const sourceCreateDate = asFunction<() => unknown>(source.createDate);
  const sourceCreateFileReader = asFunction<() => unknown>(source.createFileReader);
  const windowFileReaderCtor = asFunction<() => unknown>(windowLike.FileReader);

  return {
    windowLike,
    documentLike: source.documentLike || windowLike.document,
    localHistoryStore: source.localHistoryStore || windowLike.LocalHistoryStore,
    modeCatalog: source.modeCatalog || windowLike.ModeCatalog,
    runtime: source.runtime || windowLike.LegacyAdapterRuntime,
    confirmAction:
      sourceConfirmAction ||
      windowConfirmAction ||
      function () {
        return false;
      },
    navigateToHref:
      sourceNavigateToHref ||
      function (href: unknown) {
        if ("href" in locationLike) {
          locationLike.href = toText(href);
        }
      },
    createDate:
      sourceCreateDate ||
      function () {
        return new Date();
      },
    createFileReader:
      sourceCreateFileReader ||
      (windowFileReaderCtor
        ? function () {
            return new (windowFileReaderCtor as unknown as new () => unknown)();
          }
        : function () {
            return null;
          })
  };
}

export function resolveHistoryPageStatusInput(input: {
  getElementById?: unknown;
  statusElementId?: unknown;
  text?: unknown;
  isError?: unknown;
  historyStatusRuntime?: unknown;
  historyRuntimes?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const runtimes = toRecord(source.historyRuntimes);
  return {
    getElementById: source.getElementById,
    statusElementId: typeof source.statusElementId === "string" ? source.statusElementId : "history-status",
    text: source.text,
    isError: source.isError,
    historyStatusRuntime: source.historyStatusRuntime || runtimes.historyStatusRuntime
  };
}

export function resolveHistoryPageLoadEntryInput(input: {
  resetPage?: unknown;
  localHistoryStore?: unknown;
  state?: unknown;
  getElementById?: unknown;
  historyRuntimes?: unknown;
  burnInMinComparable?: unknown;
  burnInMaxMismatchRate?: unknown;
  statusElementId?: unknown;
  summaryElementId?: unknown;
  loadHistory?: unknown;
  setStatus?: unknown;
  prevButtonId?: unknown;
  nextButtonId?: unknown;
  listElementId?: unknown;
  documentLike?: unknown;
  modeCatalog?: unknown;
  confirmAction?: unknown;
  navigateToHref?: unknown;
  burnInPanelElementId?: unknown;
  adapterFilterElementId?: unknown;
  canaryPanelElementId?: unknown;
  runtime?: unknown;
  adapterModeStorageKey?: unknown;
  defaultModeStorageKey?: unknown;
  forceLegacyStorageKey?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const runtimes = toRecord(source.historyRuntimes);
  const historyCanaryStorageRuntime = toRecord(runtimes.historyCanaryStorageRuntime);
  const historyLoadContextHostRuntime = toRecord(runtimes.historyLoadContextHostRuntime);
  const resolveHistoryLoadPanelContext = asFunction<(payload: unknown) => unknown>(
    historyLoadContextHostRuntime.resolveHistoryLoadPanelContext
  );

  const historyPanelContext = resolveHistoryLoadPanelContext
    ? resolveHistoryLoadPanelContext({
        getElementById: source.getElementById,
        listElementId: source.listElementId,
        documentLike: source.documentLike,
        localHistoryStore: source.localHistoryStore,
        modeCatalog: source.modeCatalog,
        historyAdapterHostRuntime: runtimes.historyAdapterHostRuntime,
        historyAdapterDiagnosticsRuntime: runtimes.historyAdapterDiagnosticsRuntime,
        historyRecordViewRuntime: runtimes.historyRecordViewRuntime,
        historyRecordItemRuntime: runtimes.historyRecordItemRuntime,
        historyRecordActionsRuntime: runtimes.historyRecordActionsRuntime,
        historyRecordHostRuntime: runtimes.historyRecordHostRuntime,
        historyExportRuntime: runtimes.historyExportRuntime,
        historyRecordListHostRuntime: runtimes.historyRecordListHostRuntime,
        historyBoardRuntime: runtimes.historyBoardRuntime,
        confirmAction: source.confirmAction,
        navigateToHref: source.navigateToHref,
        burnInPanelElementId: source.burnInPanelElementId,
        adapterFilterElementId: source.adapterFilterElementId,
        historyBurnInHostRuntime: runtimes.historyBurnInHostRuntime,
        historyBurnInRuntime: runtimes.historyBurnInRuntime,
        canaryPanelElementId: source.canaryPanelElementId,
        runtime: source.runtime,
        readStorageValue: historyCanaryStorageRuntime.readHistoryStorageValue,
        adapterModeStorageKey: source.adapterModeStorageKey,
        defaultModeStorageKey: source.defaultModeStorageKey,
        forceLegacyStorageKey: source.forceLegacyStorageKey,
        historyCanarySourceRuntime: runtimes.historyCanarySourceRuntime,
        historyCanaryPolicyRuntime: runtimes.historyCanaryPolicyRuntime,
        historyCanaryViewRuntime: runtimes.historyCanaryViewRuntime,
        historyCanaryPanelRuntime: runtimes.historyCanaryPanelRuntime,
        historyCanaryActionRuntime: runtimes.historyCanaryActionRuntime,
        historyCanaryHostRuntime: runtimes.historyCanaryHostRuntime,
        writeStorageValue: historyCanaryStorageRuntime.writeHistoryStorageValue
      })
    : {};

  return {
    resetPage: source.resetPage,
    localHistoryStore: source.localHistoryStore,
    historyFilterHostRuntime: runtimes.historyFilterHostRuntime,
    state: source.state,
    historyQueryRuntime: runtimes.historyQueryRuntime,
    getElementById: source.getElementById,
    historyLoadHostRuntime: runtimes.historyLoadHostRuntime,
    historyLoadRuntime: runtimes.historyLoadRuntime,
    historyBurnInRuntime: runtimes.historyBurnInRuntime,
    burnInMinComparable: source.burnInMinComparable,
    burnInMaxMismatchRate: source.burnInMaxMismatchRate,
    statusElementId: typeof source.statusElementId === "string" ? source.statusElementId : "history-status",
    summaryElementId: typeof source.summaryElementId === "string" ? source.summaryElementId : "history-summary",
    historyViewHostRuntime: runtimes.historyViewHostRuntime,
    historyStatusRuntime: runtimes.historyStatusRuntime,
    historySummaryRuntime: runtimes.historySummaryRuntime,
    historyPanelHostRuntime: runtimes.historyPanelHostRuntime,
    historyPanelContext,
    loadHistory: source.loadHistory,
    setStatus: source.setStatus,
    prevButtonId: typeof source.prevButtonId === "string" ? source.prevButtonId : "history-prev-page",
    nextButtonId: typeof source.nextButtonId === "string" ? source.nextButtonId : "history-next-page"
  };
}

export function resolveHistoryPageStartupInput(input: {
  localHistoryStore?: unknown;
  setStatus?: unknown;
  loadHistory?: unknown;
  historyRuntimes?: unknown;
  getElementById?: unknown;
  modeElementId?: unknown;
  modeCatalog?: unknown;
  documentLike?: unknown;
  state?: unknown;
  confirmAction?: unknown;
  createDate?: unknown;
  createFileReader?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const runtimes = toRecord(source.historyRuntimes);
  return {
    localHistoryStore: source.localHistoryStore,
    setStatus: source.setStatus,
    loadHistory: source.loadHistory,
    historyControlsHostRuntime: runtimes.historyControlsHostRuntime,
    getElementById: source.getElementById,
    modeElementId: typeof source.modeElementId === "string" ? source.modeElementId : "history-mode",
    modeCatalog: source.modeCatalog,
    historyModeFilterRuntime: runtimes.historyModeFilterRuntime,
    historyModeFilterHostRuntime: runtimes.historyModeFilterHostRuntime,
    documentLike: source.documentLike,
    state: source.state,
    historyFilterHostRuntime: runtimes.historyFilterHostRuntime,
    historyQueryRuntime: runtimes.historyQueryRuntime,
    historyExportRuntime: runtimes.historyExportRuntime,
    historyToolbarRuntime: runtimes.historyToolbarRuntime,
    historyToolbarHostRuntime: runtimes.historyToolbarHostRuntime,
    historyToolbarBindHostRuntime: runtimes.historyToolbarBindHostRuntime,
    historyImportRuntime: runtimes.historyImportRuntime,
    historyImportFileRuntime: runtimes.historyImportFileRuntime,
    historyImportHostRuntime: runtimes.historyImportHostRuntime,
    historyImportBindHostRuntime: runtimes.historyImportBindHostRuntime,
    historyToolbarEventsRuntime: runtimes.historyToolbarEventsRuntime,
    historyToolbarEventsHostRuntime: runtimes.historyToolbarEventsHostRuntime,
    confirmAction: source.confirmAction,
    createDate: source.createDate,
    createFileReader: source.createFileReader
  };
}

export function applyHistoryPageApp(input: {
  historyPageDefaults?: unknown;
  historyPageEnvironment?: unknown;
  historyRuntimes?: unknown;
  getElementById?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const historyPageDefaults = toRecord(source.historyPageDefaults);
  const historyPageEnvironment = toRecord(source.historyPageEnvironment);
  const historyRuntimes = toRecord(source.historyRuntimes);
  const state = toRecord(historyPageDefaults.state);
  const getElementById = source.getElementById;

  const setStatus = function (text: unknown, isError: unknown) {
    applyHistoryPageStatus({
      getElementById,
      statusElementId: historyPageDefaults.statusElementId,
      text,
      isError,
      historyRuntimes
    });
  };

  const loadHistory = function (resetPage: unknown) {
    applyHistoryPageLoad({
      resetPage,
      localHistoryStore: historyPageEnvironment.localHistoryStore,
      state,
      getElementById,
      historyRuntimes,
      burnInMinComparable: historyPageDefaults.burnInMinComparable,
      burnInMaxMismatchRate: historyPageDefaults.burnInMaxMismatchRate,
      statusElementId: historyPageDefaults.statusElementId,
      summaryElementId: historyPageDefaults.summaryElementId,
      loadHistory,
      setStatus,
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
  };

  return applyHistoryPageStartup({
    localHistoryStore: historyPageEnvironment.localHistoryStore,
    setStatus,
    loadHistory,
    historyRuntimes,
    getElementById,
    modeElementId: historyPageDefaults.modeElementId,
    modeCatalog: historyPageEnvironment.modeCatalog,
    documentLike: historyPageEnvironment.documentLike,
    state,
    confirmAction: historyPageEnvironment.confirmAction,
    createDate: historyPageEnvironment.createDate,
    createFileReader: historyPageEnvironment.createFileReader
  });
}

export function resolveHistoryPageRuntimes(input: {
  windowLike?: unknown;
  historyRuntimeContractRuntime?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const windowLike = toRecord(source.windowLike);
  const historyRuntimeContractRuntime = toRecord(
    source.historyRuntimeContractRuntime || windowLike.CoreHistoryRuntimeContractRuntime
  );
  const resolveHistoryRuntimeContracts = asFunction<(windowLike: unknown) => unknown>(
    historyRuntimeContractRuntime.resolveHistoryRuntimeContracts
  );
  if (!resolveHistoryRuntimeContracts) {
    throw new Error("CoreHistoryRuntimeContractRuntime is required");
  }

  const result = resolveHistoryRuntimeContracts(windowLike);
  return isRecord(result) ? result : {};
}

export function applyHistoryPageBootstrap(input: {
  windowLike?: unknown;
  documentLike?: unknown;
  getElementById?: unknown;
  historyPageDefaults?: unknown;
  historyPageEnvironment?: unknown;
  historyRuntimes?: unknown;
  historyRuntimeContractRuntime?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const windowLike = toRecord(source.windowLike);
  const documentLike = toRecord(source.documentLike || windowLike.document);
  const sourceHistoryPageDefaults = toRecord(source.historyPageDefaults);
  const historyPageDefaults = hasOwnKeys(sourceHistoryPageDefaults)
    ? sourceHistoryPageDefaults
    : resolveHistoryPageDefaults();
  const sourceHistoryPageEnvironment = toRecord(source.historyPageEnvironment);
  const historyPageEnvironment = hasOwnKeys(sourceHistoryPageEnvironment)
    ? sourceHistoryPageEnvironment
    : resolveHistoryPageEnvironment({
        windowLike,
        documentLike
      });
  const sourceHistoryRuntimes = toRecord(source.historyRuntimes);
  const historyRuntimes = hasOwnKeys(sourceHistoryRuntimes)
    ? sourceHistoryRuntimes
    : resolveHistoryPageRuntimes({
        windowLike,
        historyRuntimeContractRuntime: source.historyRuntimeContractRuntime
      });

  const getElementByIdFromDocument = asFunction<(id: unknown) => unknown>(documentLike.getElementById);
  const getElementById =
    asFunction<(id: unknown) => unknown>(source.getElementById) ||
    function (id: unknown) {
      return getElementByIdFromDocument ? getElementByIdFromDocument.call(documentLike, id) : null;
    };

  const applyPageApp = function () {
    return applyHistoryPageApp({
      historyPageDefaults,
      historyPageEnvironment,
      historyRuntimes,
      getElementById
    });
  };

  const addEventListener = asFunction<(type: unknown, listener: unknown) => unknown>(
    documentLike.addEventListener
  );
  const readyState = typeof documentLike.readyState === "string" ? documentLike.readyState : "";
  if (addEventListener && readyState === "loading") {
    addEventListener.call(documentLike, "DOMContentLoaded", applyPageApp);
    return {
      deferred: true,
      started: false
    };
  }

  const result = applyPageApp();
  return {
    deferred: false,
    started: true,
    result
  };
}

export function applyHistoryPageStatus(input: {
  getElementById?: unknown;
  statusElementId?: unknown;
  text?: unknown;
  isError?: unknown;
  historyStatusRuntime?: unknown;
  historyViewHostRuntime?: unknown;
  historyRuntimes?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const runtimes = toRecord(source.historyRuntimes);
  const historyViewHostRuntime = toRecord(source.historyViewHostRuntime || runtimes.historyViewHostRuntime);
  const applyHistoryStatus = asFunction<(payload: unknown) => unknown>(
    historyViewHostRuntime.applyHistoryStatus
  );
  if (!applyHistoryStatus) {
    return {
      didApply: false
    };
  }

  const payload = resolveHistoryPageStatusInput(source);
  const result = applyHistoryStatus(payload);
  return {
    didApply: true,
    result
  };
}

export function applyHistoryPageLoad(input: {
  resetPage?: unknown;
  localHistoryStore?: unknown;
  state?: unknown;
  getElementById?: unknown;
  historyRuntimes?: unknown;
  burnInMinComparable?: unknown;
  burnInMaxMismatchRate?: unknown;
  statusElementId?: unknown;
  summaryElementId?: unknown;
  loadHistory?: unknown;
  setStatus?: unknown;
  prevButtonId?: unknown;
  nextButtonId?: unknown;
  listElementId?: unknown;
  documentLike?: unknown;
  modeCatalog?: unknown;
  confirmAction?: unknown;
  navigateToHref?: unknown;
  burnInPanelElementId?: unknown;
  adapterFilterElementId?: unknown;
  canaryPanelElementId?: unknown;
  runtime?: unknown;
  adapterModeStorageKey?: unknown;
  defaultModeStorageKey?: unknown;
  forceLegacyStorageKey?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const runtimes = toRecord(source.historyRuntimes);
  const historyLoadEntryHostRuntime = toRecord(runtimes.historyLoadEntryHostRuntime);
  const applyHistoryLoadEntry = asFunction<(payload: unknown) => unknown>(
    historyLoadEntryHostRuntime.applyHistoryLoadEntry
  );
  if (!applyHistoryLoadEntry) {
    return {
      didLoad: false,
      missingRuntime: true
    };
  }

  const payload = resolveHistoryPageLoadEntryInput(source);
  const result = applyHistoryLoadEntry(payload);
  return isRecord(result)
    ? result
    : {
        didLoad: true,
        missingRuntime: false
      };
}

export function applyHistoryPageStartup(input: {
  localHistoryStore?: unknown;
  setStatus?: unknown;
  loadHistory?: unknown;
  historyRuntimes?: unknown;
  getElementById?: unknown;
  modeElementId?: unknown;
  modeCatalog?: unknown;
  documentLike?: unknown;
  state?: unknown;
  confirmAction?: unknown;
  createDate?: unknown;
  createFileReader?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const runtimes = toRecord(source.historyRuntimes);
  const historyStartupHostRuntime = toRecord(runtimes.historyStartupHostRuntime);
  const applyHistoryStartup = asFunction<(payload: unknown) => unknown>(
    historyStartupHostRuntime.applyHistoryStartup
  );
  if (!applyHistoryStartup) {
    return {
      started: false,
      missingRuntime: true
    };
  }

  const payload = resolveHistoryPageStartupInput(source);
  const result = applyHistoryStartup(payload);
  return isRecord(result)
    ? result
    : {
        started: true,
        missingRuntime: false
      };
}

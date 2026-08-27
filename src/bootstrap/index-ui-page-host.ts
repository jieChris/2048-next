function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(
  value: unknown,
): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface IndexUiPageBootstrapResult {
  appliedGlobalBindings: boolean;
  boundDomContentLoaded: boolean;
  startupInvoked: boolean;
}

export interface IndexUiBootstrapResolvers {
  isCompactGameViewport: unknown;
  syncMobileUndoTopButtonAvailability: unknown;
  initMobileUndoTopButton: unknown;
  syncMobileHintUI: unknown;
  initMobileHintToggle: unknown;
  syncMobileTimerboxUI: unknown;
  initMobileTimerboxToggle: unknown;
  requestResponsiveGameRelayout: unknown;
  initThemeSettingsUI: unknown;
  removeLegacyUndoSettingsUI: unknown;
  initTimerModuleSettingsUI: unknown;
  openPracticeBoardFromCurrent: unknown;
  closeReplayModal: unknown;
  exportReplay: unknown;
  openSettingsModal: unknown;
  closeSettingsModal: unknown;
}

export function createIndexUiTryUndoHandler(input: {
  undoActionRuntime?: unknown;
  windowLike?: unknown;
  direction?: unknown;
}): () => boolean {
  const source = toRecord(input);
  const undoActionRuntime = toRecord(source.undoActionRuntime);
  const windowLike = source.windowLike || null;
  const direction =
    typeof source.direction === "number" ? source.direction : -1;

  return function tryUndoFromUi(): boolean {
    const tryTriggerUndoFromContext = asFunction<(payload: unknown) => unknown>(
      toRecord(undoActionRuntime).tryTriggerUndoFromContext,
    );
    if (!tryTriggerUndoFromContext) return false;
    const result = toRecord(
      tryTriggerUndoFromContext({
        windowLike,
        direction,
      }),
    );
    return !!result.didTrigger;
  };
}

function bindGlobalFunction(
  windowRecord: Record<string, unknown>,
  key: string,
  callback: unknown,
): boolean {
  const fn = asFunction<(...args: never[]) => unknown>(callback);
  if (!fn) return false;
  windowRecord[key] = fn;
  return true;
}

function pickExplicitValue<T>(
  source: Record<string, unknown>,
  key: string,
  fallback: T,
): T {
  if (Object.hasOwn(source, key)) {
    return source[key] as T;
  }
  return fallback;
}

function resolveIndexUiBootstrapEnvironment(source: Record<string, unknown>): {
  locationLike: unknown;
  navigatorLike: unknown;
  alertLike: unknown;
  consoleLike: unknown;
  setTimeoutLike: unknown;
  clearTimeoutLike: unknown;
} {
  const windowRecord = toRecord(source.windowLike);
  const globalRecord =
    typeof globalThis === "undefined" ? {} : toRecord(globalThis as unknown);

  return {
    locationLike: pickExplicitValue(
      source,
      "locationLike",
      windowRecord.location || null,
    ),
    navigatorLike: pickExplicitValue(
      source,
      "navigatorLike",
      windowRecord.navigator || globalRecord.navigator || null,
    ),
    alertLike: pickExplicitValue(
      source,
      "alertLike",
      windowRecord.alert || globalRecord.alert || null,
    ),
    consoleLike: pickExplicitValue(
      source,
      "consoleLike",
      windowRecord.console || globalRecord.console || null,
    ),
    setTimeoutLike: pickExplicitValue(
      source,
      "setTimeoutLike",
      windowRecord.setTimeout || globalRecord.setTimeout || null,
    ),
    clearTimeoutLike: pickExplicitValue(
      source,
      "clearTimeoutLike",
      windowRecord.clearTimeout || globalRecord.clearTimeout || null,
    ),
  };
}

export function createIndexUiBootstrapResolvers(input: {
  indexUiPageResolversHostRuntime?: unknown;
  indexUiPageActionsHostRuntime?: unknown;
  coreContracts?: unknown;
  modalContracts?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  locationLike?: unknown;
  navigatorLike?: unknown;
  alertLike?: unknown;
  consoleLike?: unknown;
  setTimeoutLike?: unknown;
  clearTimeoutLike?: unknown;
  tryUndoFromUi?: unknown;
  practiceTransferKey?: unknown;
  practiceTransferSessionKey?: unknown;
  mobileTimerboxCollapsedKey?: unknown;
  mobileUiMaxWidth?: unknown;
  timerboxCollapseMaxWidth?: unknown;
  compactGameViewportMaxWidth?: unknown;
}): IndexUiBootstrapResolvers {
  const source = toRecord(input);
  const coreContracts = toRecord(source.coreContracts);
  const modalContracts = toRecord(source.modalContracts);
  const environment = resolveIndexUiBootstrapEnvironment(source);

  const createIndexUiMobileResolvers = asFunction<
    (payload: unknown) => unknown
  >(
    toRecord(source.indexUiPageResolversHostRuntime)
      .createIndexUiMobileResolvers,
  );
  if (!createIndexUiMobileResolvers) {
    throw new Error("CoreIndexUiPageResolversHostRuntime is required");
  }

  const mobileUiMaxWidth =
    typeof source.mobileUiMaxWidth === "number" &&
    Number.isFinite(source.mobileUiMaxWidth)
      ? source.mobileUiMaxWidth
      : 760;
  const compactGameViewportMaxWidth =
    typeof source.compactGameViewportMaxWidth === "number" &&
    Number.isFinite(source.compactGameViewportMaxWidth)
      ? source.compactGameViewportMaxWidth
      : 980;
  const timerboxCollapseMaxWidth =
    typeof source.timerboxCollapseMaxWidth === "number" &&
    Number.isFinite(source.timerboxCollapseMaxWidth)
      ? source.timerboxCollapseMaxWidth
      : 980;
  const mobileTimerboxCollapsedKey =
    typeof source.mobileTimerboxCollapsedKey === "string" &&
    source.mobileTimerboxCollapsedKey
      ? source.mobileTimerboxCollapsedKey
      : "ui_timerbox_collapsed_mobile_v1";

  const mobileResolvers = toRecord(
    createIndexUiMobileResolvers({
      mobileViewportPageHostRuntime:
        coreContracts.mobileViewportPageHostRuntime,
      mobileViewportRuntime: coreContracts.mobileViewportRuntime,
      mobileTopButtonsPageHostRuntime:
        coreContracts.mobileTopButtonsPageHostRuntime,
      mobileTopButtonsRuntime: coreContracts.mobileTopButtonsRuntime,
      mobileUndoTopAvailabilityHostRuntime:
        coreContracts.mobileUndoTopAvailabilityHostRuntime,
      mobileUndoTopHostRuntime: coreContracts.mobileUndoTopHostRuntime,
      mobileUndoTopRuntime: coreContracts.mobileUndoTopRuntime,
      undoActionRuntime: coreContracts.undoActionRuntime,
      topActionsPageHostRuntime: coreContracts.topActionsPageHostRuntime,
      topActionsRuntime: coreContracts.topActionsRuntime,
      topActionsHostRuntime: coreContracts.topActionsHostRuntime,
      mobileHintPageHostRuntime: coreContracts.mobileHintPageHostRuntime,
      mobileHintModalRuntime: coreContracts.mobileHintModalRuntime,
      mobileHintOpenHostRuntime: coreContracts.mobileHintOpenHostRuntime,
      mobileHintUiHostRuntime: coreContracts.mobileHintUiHostRuntime,
      mobileHintHostRuntime: coreContracts.mobileHintHostRuntime,
      mobileHintRuntime: coreContracts.mobileHintRuntime,
      mobileHintUiRuntime: coreContracts.mobileHintUiRuntime,
      mobileTimerboxPageHostRuntime:
        coreContracts.mobileTimerboxPageHostRuntime,
      mobileTimerboxHostRuntime: coreContracts.mobileTimerboxHostRuntime,
      mobileTimerboxRuntime: coreContracts.mobileTimerboxRuntime,
      responsiveRelayoutHostRuntime:
        coreContracts.responsiveRelayoutHostRuntime,
      responsiveRelayoutRuntime: coreContracts.responsiveRelayoutRuntime,
      documentLike: source.documentLike,
      bodyLike: toRecord(source.documentLike).body || null,
      windowLike: source.windowLike || null,
      navigatorLike: environment.navigatorLike,
      storageRuntime: coreContracts.storageRuntime,
      tryUndoFromUi: source.tryUndoFromUi,
      clearTimeoutLike: environment.clearTimeoutLike,
      setTimeoutLike: environment.setTimeoutLike,
      mobileUiMaxWidth: mobileUiMaxWidth,
      compactGameViewportMaxWidth: compactGameViewportMaxWidth,
      timerboxCollapseMaxWidth: timerboxCollapseMaxWidth,
      fallbackUndoLabel: "撤回",
      hintOverlayId: "mobile-hint-overlay",
      hintDefaultText: "合并数字，合成 2048 方块。",
      hintCollapsedClassName: "mobile-hint-collapsed-content",
      hintIntroHiddenClassName: "mobile-hint-hidden",
      hintIntroSelector: ".above-game .game-intro",
      hintContainerSelector: ".container",
      timerboxStorageKey: mobileTimerboxCollapsedKey,
      timerboxHiddenClassName: "timerbox-hidden-mode",
      timerboxExpandedClassName: "is-mobile-expanded",
      timerboxDefaultCollapsed: true,
      timerboxFallbackHiddenToggleDisplay: "none",
      timerboxFallbackVisibleToggleDisplay: "inline-flex",
      timerboxFallbackHiddenAriaExpanded: "false",
      timerboxFallbackExpandLabel: "展开计时器",
      timerboxFallbackCollapseLabel: "收起计时器",
      timerboxRelayoutDelayMs: 120,
    }),
  );

  const createIndexUiPageActionResolvers = asFunction<
    (payload: unknown) => unknown
  >(
    toRecord(source.indexUiPageActionsHostRuntime)
      .createIndexUiPageActionResolvers,
  );
  if (!createIndexUiPageActionResolvers) {
    throw new Error("CoreIndexUiPageActionsHostRuntime is required");
  }

  const practiceTransferKey =
    typeof source.practiceTransferKey === "string" && source.practiceTransferKey
      ? source.practiceTransferKey
      : "practice_board_transfer_v1";
  const practiceTransferSessionKey =
    typeof source.practiceTransferSessionKey === "string" &&
    source.practiceTransferSessionKey
      ? source.practiceTransferSessionKey
      : "practice_board_transfer_session_v1";
  const pageActionResolvers = toRecord(
    createIndexUiPageActionResolvers({
      settingsModalPageHostRuntime: modalContracts.settingsModalPageHostRuntime,
      settingsModalHostRuntime: modalContracts.settingsModalHostRuntime,
      replayModalRuntime: modalContracts.replayModalRuntime,
      themeSettingsPageHostRuntime: coreContracts.themeSettingsPageHostRuntime,
      themeSettingsHostRuntime: coreContracts.themeSettingsHostRuntime,
      themeSettingsRuntime: coreContracts.themeSettingsRuntime,
      timerModuleSettingsHostRuntime:
        coreContracts.timerModuleSettingsHostRuntime,
      timerModuleSettingsPageHostRuntime:
        coreContracts.timerModuleSettingsPageHostRuntime,
      timerModuleRuntime: coreContracts.timerModuleRuntime,
      practiceTransferPageHostRuntime:
        coreContracts.practiceTransferPageHostRuntime,
      practiceTransferHostRuntime: coreContracts.practiceTransferHostRuntime,
      practiceTransferRuntime: coreContracts.practiceTransferRuntime,
      storageRuntime: coreContracts.storageRuntime,
      mobileViewportRuntime: coreContracts.mobileViewportRuntime,
      replayPageHostRuntime: modalContracts.replayPageHostRuntime,
      replayExportRuntime: modalContracts.replayExportRuntime,
      isCompactGameViewport: mobileResolvers.isCompactGameViewport,
      documentLike: source.documentLike,
      windowLike: source.windowLike || null,
      locationLike: environment.locationLike,
      navigatorLike: environment.navigatorLike,
      alertLike: environment.alertLike,
      consoleLike: environment.consoleLike,
      setTimeoutLike: environment.setTimeoutLike,
      clearTimeoutLike: environment.clearTimeoutLike,
      localStorageKey: practiceTransferKey,
      sessionStorageKey: practiceTransferSessionKey,
    }),
  );

  return {
    isCompactGameViewport: mobileResolvers.isCompactGameViewport,
    syncMobileUndoTopButtonAvailability:
      mobileResolvers.syncMobileUndoTopButtonAvailability,
    initMobileUndoTopButton: mobileResolvers.initMobileUndoTopButton,
    syncMobileHintUI: mobileResolvers.syncMobileHintUI,
    initMobileHintToggle: mobileResolvers.initMobileHintToggle,
    syncMobileTimerboxUI: mobileResolvers.syncMobileTimerboxUI,
    initMobileTimerboxToggle: mobileResolvers.initMobileTimerboxToggle,
    requestResponsiveGameRelayout:
      mobileResolvers.requestResponsiveGameRelayout,
    initThemeSettingsUI: pageActionResolvers.initThemeSettingsUI,
    removeLegacyUndoSettingsUI: pageActionResolvers.removeLegacyUndoSettingsUI,
    initTimerModuleSettingsUI: pageActionResolvers.initTimerModuleSettingsUI,
    openPracticeBoardFromCurrent:
      pageActionResolvers.openPracticeBoardFromCurrent,
    closeReplayModal: pageActionResolvers.closeReplayModal,
    exportReplay: pageActionResolvers.exportReplay,
    openSettingsModal: pageActionResolvers.openSettingsModal,
    closeSettingsModal: pageActionResolvers.closeSettingsModal,
  };
}

export function applyIndexUiPageBootstrap(input: {
  indexUiStartupHostRuntime?: unknown;
  topActionBindingsHostRuntime?: unknown;
  gameOverUndoHostRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  nowMs?: unknown;
  touchGuardWindowMs?: unknown;
  tryUndoFromUi?: unknown;
  exportReplay?: unknown;
  openPracticeBoardFromCurrent?: unknown;
  openSettingsModal?: unknown;
  closeSettingsModal?: unknown;
  initThemeSettingsUI?: unknown;
  removeLegacyUndoSettingsUI?: unknown;
  initTimerModuleSettingsUI?: unknown;
  initMobileHintToggle?: unknown;
  initMobileUndoTopButton?: unknown;
  initMobileTimerboxToggle?: unknown;
  requestResponsiveGameRelayout?: unknown;
  syncMobileTimerboxUI?: unknown;
  syncMobileHintUI?: unknown;
  syncMobileUndoTopButtonAvailability?: unknown;
  closeReplayModal?: unknown;
  prettyTimeRuntime?: unknown;
}): IndexUiPageBootstrapResult {
  const source = toRecord(input);
  const windowRecord = toRecord(source.windowLike);
  const documentRecord = toRecord(source.documentLike);
  const indexUiStartupHostRuntime = toRecord(source.indexUiStartupHostRuntime);
  const applyIndexUiStartup = asFunction<(payload: unknown) => unknown>(
    indexUiStartupHostRuntime.applyIndexUiStartup,
  );
  const getElementByIdRaw = asFunction<(id: string) => unknown>(
    documentRecord.getElementById,
  );
  const getElementById = getElementByIdRaw
    ? (id: string): Record<string, unknown> | null =>
        getElementByIdRaw.call(documentRecord, id) as Record<
          string,
          unknown
        > | null
    : null;
  const addEventListener = asFunction<
    (name: string, listener: (...args: never[]) => unknown) => unknown
  >(documentRecord.addEventListener);
  const formatPrettyTime = asFunction<(value: unknown) => unknown>(
    toRecord(source.prettyTimeRuntime).formatPrettyTime,
  );
  const nowMs = asFunction<() => number>(source.nowMs);
  const touchGuardWindowMs =
    typeof source.touchGuardWindowMs === "number" &&
    Number.isFinite(source.touchGuardWindowMs)
      ? source.touchGuardWindowMs
      : 450;

  let appliedGlobalBindings = false;
  if (
    bindGlobalFunction(
      windowRecord,
      "syncMobileTimerboxUI",
      source.syncMobileTimerboxUI,
    )
  ) {
    appliedGlobalBindings = true;
  }
  if (
    bindGlobalFunction(
      windowRecord,
      "syncMobileHintUI",
      source.syncMobileHintUI,
    )
  ) {
    appliedGlobalBindings = true;
  }
  if (
    bindGlobalFunction(
      windowRecord,
      "syncMobileUndoTopButtonAvailability",
      source.syncMobileUndoTopButtonAvailability,
    )
  ) {
    appliedGlobalBindings = true;
  }
  if (
    bindGlobalFunction(
      windowRecord,
      "openPracticeBoardFromCurrent",
      source.openPracticeBoardFromCurrent,
    )
  ) {
    appliedGlobalBindings = true;
  }
  if (
    bindGlobalFunction(
      windowRecord,
      "closeReplayModal",
      source.closeReplayModal,
    )
  ) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "exportReplay", source.exportReplay)) {
    appliedGlobalBindings = true;
  }
  if (
    bindGlobalFunction(
      windowRecord,
      "openSettingsModal",
      source.openSettingsModal,
    )
  ) {
    appliedGlobalBindings = true;
  }
  if (
    bindGlobalFunction(
      windowRecord,
      "closeSettingsModal",
      source.closeSettingsModal,
    )
  ) {
    appliedGlobalBindings = true;
  }
  if (formatPrettyTime) {
    windowRecord.pretty = (time: unknown): string =>
      String(formatPrettyTime(time));
    appliedGlobalBindings = true;
  }

  let startupInvoked = false;
  let startupCompleted = false;
  const startupHandler = (): void => {
    if (startupCompleted || !applyIndexUiStartup || !getElementById) return;
    startupCompleted = true;
    startupInvoked = true;
    applyIndexUiStartup({
      topActionBindingsHostRuntime: source.topActionBindingsHostRuntime,
      gameOverUndoHostRuntime: source.gameOverUndoHostRuntime,
      getElementById,
      windowLike: source.windowLike || null,
      tryUndo: source.tryUndoFromUi,
      exportReplay: windowRecord.exportReplay,
      openPracticeBoardFromCurrent: windowRecord.openPracticeBoardFromCurrent,
      openSettingsModal: windowRecord.openSettingsModal,
      closeSettingsModal: windowRecord.closeSettingsModal,
      initThemeSettingsUI: source.initThemeSettingsUI,
      removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
      initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
      initMobileHintToggle: source.initMobileHintToggle,
      initMobileUndoTopButton: source.initMobileUndoTopButton,
      initMobileTimerboxToggle: source.initMobileTimerboxToggle,
      requestResponsiveGameRelayout: source.requestResponsiveGameRelayout,
      nowMs: nowMs ? nowMs : (): number => Date.now(),
      touchGuardWindowMs,
    });
  };

  let boundDomContentLoaded = false;
  const readyState = String(
    (documentRecord as { readyState?: unknown }).readyState || "",
  );
  if (!readyState || readyState === "loading") {
    if (!documentRecord.__indexUiPageBootstrapBound && addEventListener) {
      addEventListener.call(documentRecord, "DOMContentLoaded", startupHandler);
      documentRecord.__indexUiPageBootstrapBound = true;
      boundDomContentLoaded = true;
    }
  } else {
    startupHandler();
  }

  return {
    appliedGlobalBindings,
    boundDomContentLoaded,
    startupInvoked,
  };
}

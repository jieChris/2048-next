function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
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
  initHomeGuideSettingsUI: unknown;
  autoStartHomeGuideIfNeeded: unknown;
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
  const direction = typeof source.direction === "number" ? source.direction : -1;

  return function tryUndoFromUi(): boolean {
    const tryTriggerUndoFromContext = asFunction<(payload: unknown) => unknown>(
      toRecord(undoActionRuntime).tryTriggerUndoFromContext
    );
    if (!tryTriggerUndoFromContext) return false;
    const result = toRecord(
      tryTriggerUndoFromContext({
        windowLike,
        direction
      })
    );
    return !!result.didTrigger;
  };
}

function bindGlobalFunction(
  windowRecord: Record<string, unknown>,
  key: string,
  callback: unknown
): boolean {
  const fn = asFunction<(...args: never[]) => unknown>(callback);
  if (!fn) return false;
  windowRecord[key] = fn;
  return true;
}

function pickExplicitValue(source: Record<string, unknown>, key: string, fallback: unknown): unknown {
  if (Object.prototype.hasOwnProperty.call(source, key)) {
    return source[key];
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
  const globalRecord = typeof globalThis !== "undefined" ? toRecord(globalThis as unknown) : {};

  return {
    locationLike: pickExplicitValue(source, "locationLike", windowRecord.location || null),
    navigatorLike: pickExplicitValue(
      source,
      "navigatorLike",
      windowRecord.navigator || globalRecord.navigator || null
    ),
    alertLike: pickExplicitValue(source, "alertLike", windowRecord.alert || globalRecord.alert || null),
    consoleLike: pickExplicitValue(
      source,
      "consoleLike",
      windowRecord.console || globalRecord.console || null
    ),
    setTimeoutLike: pickExplicitValue(
      source,
      "setTimeoutLike",
      windowRecord.setTimeout || globalRecord.setTimeout || null
    ),
    clearTimeoutLike: pickExplicitValue(
      source,
      "clearTimeoutLike",
      windowRecord.clearTimeout || globalRecord.clearTimeout || null
    )
  };
}

export function createIndexUiBootstrapResolvers(input: {
  indexUiPageResolversHostRuntime?: unknown;
  indexUiPageActionsHostRuntime?: unknown;
  coreContracts?: unknown;
  modalContracts?: unknown;
  homeGuideContracts?: unknown;
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
  practiceGuideShownKey?: unknown;
  practiceGuideSeenFlag?: unknown;
  mobileTimerboxCollapsedKey?: unknown;
  mobileUiMaxWidth?: unknown;
  timerboxCollapseMaxWidth?: unknown;
  compactGameViewportMaxWidth?: unknown;
  homeGuideSeenKey?: unknown;
  homeGuidePanelMargin?: unknown;
  homeGuideDefaultPanelHeight?: unknown;
  homeGuideMaxAdvanceLoops?: unknown;
  homeGuideAutoStartDelayMs?: unknown;
}): IndexUiBootstrapResolvers {
  const source = toRecord(input);
  const coreContracts = toRecord(source.coreContracts);
  const modalContracts = toRecord(source.modalContracts);
  const homeGuideContracts = toRecord(source.homeGuideContracts);
  const environment = resolveIndexUiBootstrapEnvironment(source);

  const createIndexUiMobileResolvers = asFunction<(payload: unknown) => unknown>(
    toRecord(source.indexUiPageResolversHostRuntime).createIndexUiMobileResolvers
  );
  if (!createIndexUiMobileResolvers) {
    throw new Error("CoreIndexUiPageResolversHostRuntime is required");
  }

  const mobileUiMaxWidth =
    typeof source.mobileUiMaxWidth === "number" && Number.isFinite(source.mobileUiMaxWidth)
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
    typeof source.mobileTimerboxCollapsedKey === "string" && source.mobileTimerboxCollapsedKey
      ? source.mobileTimerboxCollapsedKey
      : "ui_timerbox_collapsed_mobile_v1";

  const mobileResolvers = toRecord(
    createIndexUiMobileResolvers({
      mobileViewportPageHostRuntime: coreContracts.mobileViewportPageHostRuntime,
      mobileViewportRuntime: coreContracts.mobileViewportRuntime,
      mobileTopButtonsPageHostRuntime: coreContracts.mobileTopButtonsPageHostRuntime,
      mobileTopButtonsRuntime: coreContracts.mobileTopButtonsRuntime,
      mobileUndoTopAvailabilityHostRuntime: coreContracts.mobileUndoTopAvailabilityHostRuntime,
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
      mobileTimerboxPageHostRuntime: coreContracts.mobileTimerboxPageHostRuntime,
      mobileTimerboxHostRuntime: coreContracts.mobileTimerboxHostRuntime,
      mobileTimerboxRuntime: coreContracts.mobileTimerboxRuntime,
      responsiveRelayoutHostRuntime: coreContracts.responsiveRelayoutHostRuntime,
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
      timerboxRelayoutDelayMs: 120
    })
  );

  const createIndexUiPageActionResolvers = asFunction<(payload: unknown) => unknown>(
    toRecord(source.indexUiPageActionsHostRuntime).createIndexUiPageActionResolvers
  );
  if (!createIndexUiPageActionResolvers) {
    throw new Error("CoreIndexUiPageActionsHostRuntime is required");
  }

  const practiceGuideShownKey =
    typeof source.practiceGuideShownKey === "string" && source.practiceGuideShownKey
      ? source.practiceGuideShownKey
      : "practice_guide_shown_v2";
  const practiceGuideSeenFlag =
    typeof source.practiceGuideSeenFlag === "string" && source.practiceGuideSeenFlag
      ? source.practiceGuideSeenFlag
      : "practice_guide_seen_v2=1";
  const practiceTransferKey =
    typeof source.practiceTransferKey === "string" && source.practiceTransferKey
      ? source.practiceTransferKey
      : "practice_board_transfer_v1";
  const practiceTransferSessionKey =
    typeof source.practiceTransferSessionKey === "string" && source.practiceTransferSessionKey
      ? source.practiceTransferSessionKey
      : "practice_board_transfer_session_v1";
  const homeGuideSeenKey =
    typeof source.homeGuideSeenKey === "string" && source.homeGuideSeenKey
      ? source.homeGuideSeenKey
      : "home_guide_seen_v1";
  const homeGuidePanelMargin =
    typeof source.homeGuidePanelMargin === "number" && Number.isFinite(source.homeGuidePanelMargin)
      ? source.homeGuidePanelMargin
      : 12;
  const homeGuideDefaultPanelHeight =
    typeof source.homeGuideDefaultPanelHeight === "number" &&
    Number.isFinite(source.homeGuideDefaultPanelHeight)
      ? source.homeGuideDefaultPanelHeight
      : 160;
  const homeGuideMaxAdvanceLoops =
    typeof source.homeGuideMaxAdvanceLoops === "number" &&
    Number.isFinite(source.homeGuideMaxAdvanceLoops)
      ? source.homeGuideMaxAdvanceLoops
      : 32;
  const homeGuideAutoStartDelayMs =
    typeof source.homeGuideAutoStartDelayMs === "number" &&
    Number.isFinite(source.homeGuideAutoStartDelayMs)
      ? source.homeGuideAutoStartDelayMs
      : 0;

  const pageActionResolvers = toRecord(
    createIndexUiPageActionResolvers({
      settingsModalPageHostRuntime: modalContracts.settingsModalPageHostRuntime,
      settingsModalHostRuntime: modalContracts.settingsModalHostRuntime,
      replayModalRuntime: modalContracts.replayModalRuntime,
      themeSettingsPageHostRuntime: coreContracts.themeSettingsPageHostRuntime,
      themeSettingsHostRuntime: coreContracts.themeSettingsHostRuntime,
      themeSettingsRuntime: coreContracts.themeSettingsRuntime,
      timerModuleSettingsHostRuntime: coreContracts.timerModuleSettingsHostRuntime,
      timerModuleSettingsPageHostRuntime: coreContracts.timerModuleSettingsPageHostRuntime,
      timerModuleRuntime: coreContracts.timerModuleRuntime,
      practiceTransferPageHostRuntime: coreContracts.practiceTransferPageHostRuntime,
      practiceTransferHostRuntime: coreContracts.practiceTransferHostRuntime,
      practiceTransferRuntime: coreContracts.practiceTransferRuntime,
      storageRuntime: coreContracts.storageRuntime,
      homeGuidePageHostRuntime: homeGuideContracts.homeGuidePageHostRuntime,
      homeGuideRuntime: homeGuideContracts.homeGuideRuntime,
      homeGuideDomHostRuntime: homeGuideContracts.homeGuideDomHostRuntime,
      homeGuideHighlightHostRuntime: homeGuideContracts.homeGuideHighlightHostRuntime,
      homeGuidePanelHostRuntime: homeGuideContracts.homeGuidePanelHostRuntime,
      homeGuideDoneNoticeHostRuntime: homeGuideContracts.homeGuideDoneNoticeHostRuntime,
      homeGuideFinishHostRuntime: homeGuideContracts.homeGuideFinishHostRuntime,
      homeGuideStepHostRuntime: homeGuideContracts.homeGuideStepHostRuntime,
      homeGuideStepFlowHostRuntime: homeGuideContracts.homeGuideStepFlowHostRuntime,
      homeGuideStepViewHostRuntime: homeGuideContracts.homeGuideStepViewHostRuntime,
      homeGuideStartHostRuntime: homeGuideContracts.homeGuideStartHostRuntime,
      homeGuideControlsHostRuntime: homeGuideContracts.homeGuideControlsHostRuntime,
      homeGuideSettingsHostRuntime: homeGuideContracts.homeGuideSettingsHostRuntime,
      homeGuideStartupHostRuntime: homeGuideContracts.homeGuideStartupHostRuntime,
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
      guideShownKey: practiceGuideShownKey,
      guideSeenFlag: practiceGuideSeenFlag,
      localStorageKey: practiceTransferKey,
      sessionStorageKey: practiceTransferSessionKey,
      homeGuideSeenKey: homeGuideSeenKey,
      homeGuideMobileUiMaxWidth: mobileUiMaxWidth,
      homeGuidePanelMargin: homeGuidePanelMargin,
      homeGuideDefaultPanelHeight: homeGuideDefaultPanelHeight,
      homeGuideMaxAdvanceLoops: homeGuideMaxAdvanceLoops,
      homeGuideAutoStartDelayMs: homeGuideAutoStartDelayMs
    })
  );

  return {
    isCompactGameViewport: mobileResolvers.isCompactGameViewport,
    syncMobileUndoTopButtonAvailability: mobileResolvers.syncMobileUndoTopButtonAvailability,
    initMobileUndoTopButton: mobileResolvers.initMobileUndoTopButton,
    syncMobileHintUI: mobileResolvers.syncMobileHintUI,
    initMobileHintToggle: mobileResolvers.initMobileHintToggle,
    syncMobileTimerboxUI: mobileResolvers.syncMobileTimerboxUI,
    initMobileTimerboxToggle: mobileResolvers.initMobileTimerboxToggle,
    requestResponsiveGameRelayout: mobileResolvers.requestResponsiveGameRelayout,
    initThemeSettingsUI: pageActionResolvers.initThemeSettingsUI,
    removeLegacyUndoSettingsUI: pageActionResolvers.removeLegacyUndoSettingsUI,
    initTimerModuleSettingsUI: pageActionResolvers.initTimerModuleSettingsUI,
    openPracticeBoardFromCurrent: pageActionResolvers.openPracticeBoardFromCurrent,
    initHomeGuideSettingsUI: pageActionResolvers.initHomeGuideSettingsUI,
    autoStartHomeGuideIfNeeded: pageActionResolvers.autoStartHomeGuideIfNeeded,
    closeReplayModal: pageActionResolvers.closeReplayModal,
    exportReplay: pageActionResolvers.exportReplay,
    openSettingsModal: pageActionResolvers.openSettingsModal,
    closeSettingsModal: pageActionResolvers.closeSettingsModal
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
  initHomeGuideSettingsUI?: unknown;
  autoStartHomeGuideIfNeeded?: unknown;
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
    indexUiStartupHostRuntime.applyIndexUiStartup
  );
  const getElementByIdRaw = asFunction<(id: string) => unknown>(documentRecord.getElementById);
  const getElementById = getElementByIdRaw
    ? function (id: string): unknown {
        return getElementByIdRaw.call(documentRecord, id);
      }
    : null;
  const addEventListener = asFunction<
    (name: string, listener: (...args: never[]) => unknown) => unknown
  >(documentRecord.addEventListener);
  const formatPrettyTime = asFunction<(value: unknown) => unknown>(
    toRecord(source.prettyTimeRuntime).formatPrettyTime
  );
  const nowMs = asFunction<() => number>(source.nowMs);
  const touchGuardWindowMs =
    typeof source.touchGuardWindowMs === "number" && Number.isFinite(source.touchGuardWindowMs)
      ? source.touchGuardWindowMs
      : 450;

  let appliedGlobalBindings = false;
  if (bindGlobalFunction(windowRecord, "syncMobileTimerboxUI", source.syncMobileTimerboxUI)) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "syncMobileHintUI", source.syncMobileHintUI)) {
    appliedGlobalBindings = true;
  }
  if (
    bindGlobalFunction(
      windowRecord,
      "syncMobileUndoTopButtonAvailability",
      source.syncMobileUndoTopButtonAvailability
    )
  ) {
    appliedGlobalBindings = true;
  }
  if (
    bindGlobalFunction(windowRecord, "openPracticeBoardFromCurrent", source.openPracticeBoardFromCurrent)
  ) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "closeReplayModal", source.closeReplayModal)) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "exportReplay", source.exportReplay)) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "openSettingsModal", source.openSettingsModal)) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "closeSettingsModal", source.closeSettingsModal)) {
    appliedGlobalBindings = true;
  }
  if (formatPrettyTime) {
    windowRecord.pretty = function (time: unknown): unknown {
      return formatPrettyTime(time);
    };
    appliedGlobalBindings = true;
  }

  let startupInvoked = false;
  const startupHandler = function (): unknown {
    if (!applyIndexUiStartup || !getElementById) return null;
    startupInvoked = true;
    return applyIndexUiStartup({
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
      initHomeGuideSettingsUI: source.initHomeGuideSettingsUI,
      autoStartHomeGuideIfNeeded: source.autoStartHomeGuideIfNeeded,
      initMobileTimerboxToggle: source.initMobileTimerboxToggle,
      requestResponsiveGameRelayout: source.requestResponsiveGameRelayout,
      nowMs: nowMs
        ? nowMs
        : function (): number {
            return Date.now();
          },
      touchGuardWindowMs
    });
  };

  let boundDomContentLoaded = false;
  if (!documentRecord.__indexUiPageBootstrapBound && addEventListener) {
    addEventListener.call(documentRecord, "DOMContentLoaded", startupHandler);
    documentRecord.__indexUiPageBootstrapBound = true;
    boundDomContentLoaded = true;
  }

  return {
    appliedGlobalBindings,
    boundDomContentLoaded,
    startupInvoked
  };
}

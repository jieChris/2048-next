function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveHomeGuideState(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  return {
    active: false,
    fromSettings: false,
    index: 0,
    steps: [],
    target: null,
    elevated: [],
    panel: null,
    overlay: null
  };
}

export interface IndexUiPageActionResolvers {
  initThemeSettingsUI: () => unknown;
  removeLegacyUndoSettingsUI: () => unknown;
  initTimerModuleSettingsUI: () => unknown;
  openPracticeBoardFromCurrent: () => unknown;
  initHomeGuideSettingsUI: () => unknown;
  autoStartHomeGuideIfNeeded: () => unknown;
  showReplayModal: () => unknown;
  closeReplayModal: () => unknown;
  exportReplay: () => unknown;
  openSettingsModal: () => unknown;
  closeSettingsModal: () => unknown;
}

export function createIndexUiPageActionResolvers(input: {
  settingsModalPageHostRuntime?: unknown;
  settingsModalHostRuntime?: unknown;
  replayModalRuntime?: unknown;
  themeSettingsPageHostRuntime?: unknown;
  themeSettingsHostRuntime?: unknown;
  themeSettingsRuntime?: unknown;
  timerModuleSettingsHostRuntime?: unknown;
  timerModuleSettingsPageHostRuntime?: unknown;
  timerModuleRuntime?: unknown;
  practiceTransferPageHostRuntime?: unknown;
  practiceTransferHostRuntime?: unknown;
  practiceTransferRuntime?: unknown;
  storageRuntime?: unknown;
  homeGuidePageHostRuntime?: unknown;
  homeGuideRuntime?: unknown;
  homeGuideDomHostRuntime?: unknown;
  homeGuideHighlightHostRuntime?: unknown;
  homeGuidePanelHostRuntime?: unknown;
  homeGuideDoneNoticeHostRuntime?: unknown;
  homeGuideFinishHostRuntime?: unknown;
  homeGuideStepHostRuntime?: unknown;
  homeGuideStepFlowHostRuntime?: unknown;
  homeGuideStepViewHostRuntime?: unknown;
  homeGuideStartHostRuntime?: unknown;
  homeGuideControlsHostRuntime?: unknown;
  homeGuideSettingsHostRuntime?: unknown;
  homeGuideStartupHostRuntime?: unknown;
  mobileViewportRuntime?: unknown;
  replayPageHostRuntime?: unknown;
  replayExportRuntime?: unknown;
  isCompactGameViewport?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  locationLike?: unknown;
  navigatorLike?: unknown;
  alertLike?: unknown;
  consoleLike?: unknown;
  setTimeoutLike?: unknown;
  clearTimeoutLike?: unknown;
  guideShownKey?: unknown;
  guideSeenFlag?: unknown;
  localStorageKey?: unknown;
  sessionStorageKey?: unknown;
  homeGuideSeenKey?: unknown;
  homeGuideState?: unknown;
  homeGuideMobileUiMaxWidth?: unknown;
  homeGuidePanelMargin?: unknown;
  homeGuideDefaultPanelHeight?: unknown;
  homeGuideMaxAdvanceLoops?: unknown;
  homeGuideAutoStartDelayMs?: unknown;
}): IndexUiPageActionResolvers {
  const source = toRecord(input);

  const settingsModalPageHostRuntime = toRecord(source.settingsModalPageHostRuntime);
  const createSettingsModalInitResolvers = asFunction<(payload: unknown) => unknown>(
    settingsModalPageHostRuntime.createSettingsModalInitResolvers
  );
  const createSettingsModalActionResolvers = asFunction<(payload: unknown) => unknown>(
    settingsModalPageHostRuntime.createSettingsModalActionResolvers
  );
  if (!createSettingsModalInitResolvers || !createSettingsModalActionResolvers) {
    throw new Error("CoreSettingsModalPageHostRuntime is required");
  }

  const settingsModalInitResolvers = toRecord(
    createSettingsModalInitResolvers({
      themeSettingsPageHostRuntime: source.themeSettingsPageHostRuntime,
      themeSettingsHostRuntime: source.themeSettingsHostRuntime,
      themeSettingsRuntime: source.themeSettingsRuntime,
      timerModuleSettingsHostRuntime: source.timerModuleSettingsHostRuntime,
      timerModuleSettingsPageHostRuntime: source.timerModuleSettingsPageHostRuntime,
      timerModuleRuntime: source.timerModuleRuntime,
      documentLike: source.documentLike || null,
      windowLike: source.windowLike || null,
      retryDelayMs: 60,
      setTimeoutLike: source.setTimeoutLike
    })
  );

  const initThemeSettingsUI = asFunction<() => unknown>(settingsModalInitResolvers.initThemeSettingsUI);
  const removeLegacyUndoSettingsUI = asFunction<() => unknown>(
    settingsModalInitResolvers.removeLegacyUndoSettingsUI
  );
  const initTimerModuleSettingsUI = asFunction<() => unknown>(
    settingsModalInitResolvers.initTimerModuleSettingsUI
  );
  if (!initThemeSettingsUI || !removeLegacyUndoSettingsUI || !initTimerModuleSettingsUI) {
    throw new Error("CoreSettingsModalPageHostRuntime is required");
  }

  const practiceTransferPageHostRuntime = toRecord(source.practiceTransferPageHostRuntime);
  const createPracticeTransferPageActionResolvers = asFunction<(payload: unknown) => unknown>(
    practiceTransferPageHostRuntime.createPracticeTransferPageActionResolvers
  );
  if (!createPracticeTransferPageActionResolvers) {
    throw new Error("CorePracticeTransferPageHostRuntime is required");
  }

  const practiceTransferPageActionResolvers = toRecord(
    createPracticeTransferPageActionResolvers({
      practiceTransferPageHostRuntime: source.practiceTransferPageHostRuntime,
      practiceTransferHostRuntime: source.practiceTransferHostRuntime,
      practiceTransferRuntime: source.practiceTransferRuntime,
      storageRuntime: source.storageRuntime,
      guideShownKey: source.guideShownKey,
      guideSeenFlag: source.guideSeenFlag,
      localStorageKey: source.localStorageKey,
      sessionStorageKey: source.sessionStorageKey,
      documentLike: source.documentLike || null,
      windowLike: source.windowLike || null,
      alertLike: source.alertLike || null
    })
  );

  const openPracticeBoardFromCurrent = asFunction<() => unknown>(
    practiceTransferPageActionResolvers.openPracticeBoardFromCurrent
  );
  if (!openPracticeBoardFromCurrent) {
    throw new Error("CorePracticeTransferPageHostRuntime is required");
  }

  const homeGuideState = resolveHomeGuideState(source.homeGuideState);
  const homeGuideSeenKey =
    typeof source.homeGuideSeenKey === "string" && source.homeGuideSeenKey
      ? source.homeGuideSeenKey
      : "home_guide_seen_v1";

  const homeGuidePageHostRuntime = toRecord(source.homeGuidePageHostRuntime);
  const createHomeGuidePageResolvers = asFunction<(payload: unknown) => unknown>(
    homeGuidePageHostRuntime.createHomeGuidePageResolvers
  );
  const createHomeGuideLifecycleResolvers = asFunction<(payload: unknown) => unknown>(
    homeGuidePageHostRuntime.createHomeGuideLifecycleResolvers
  );
  if (!createHomeGuidePageResolvers || !createHomeGuideLifecycleResolvers) {
    throw new Error("CoreHomeGuidePageHostRuntime is required");
  }

  const homeGuidePageResolvers = toRecord(
    createHomeGuidePageResolvers({
      homeGuideRuntime: source.homeGuideRuntime,
      locationLike: source.locationLike || null,
      isCompactViewport: source.isCompactGameViewport,
      homeGuideDomHostRuntime: source.homeGuideDomHostRuntime,
      homeGuideHighlightHostRuntime: source.homeGuideHighlightHostRuntime,
      homeGuidePanelHostRuntime: source.homeGuidePanelHostRuntime,
      homeGuideDoneNoticeHostRuntime: source.homeGuideDoneNoticeHostRuntime,
      mobileViewportRuntime: source.mobileViewportRuntime,
      documentLike: source.documentLike || null,
      windowLike: source.windowLike || null,
      homeGuideState,
      mobileUiMaxWidth: resolveNumber(source.homeGuideMobileUiMaxWidth, 760),
      panelMargin: resolveNumber(source.homeGuidePanelMargin, 12),
      defaultPanelHeight: resolveNumber(source.homeGuideDefaultPanelHeight, 160),
      setTimeoutLike: source.setTimeoutLike,
      clearTimeoutLike: source.clearTimeoutLike,
      homeGuideFinishHostRuntime: source.homeGuideFinishHostRuntime,
      homeGuideStepHostRuntime: source.homeGuideStepHostRuntime,
      homeGuideStepFlowHostRuntime: source.homeGuideStepFlowHostRuntime,
      homeGuideStepViewHostRuntime: source.homeGuideStepViewHostRuntime,
      homeGuideStartHostRuntime: source.homeGuideStartHostRuntime,
      homeGuideControlsHostRuntime: source.homeGuideControlsHostRuntime,
      storageRuntime: source.storageRuntime,
      seenKey: homeGuideSeenKey,
      maxAdvanceLoops: resolveNumber(source.homeGuideMaxAdvanceLoops, 32)
    })
  );

  const isHomePage = asFunction<() => unknown>(homeGuidePageResolvers.isHomePage);
  const startHomeGuide = asFunction<() => unknown>(homeGuidePageResolvers.startHomeGuide);
  if (
    !isHomePage ||
    !asFunction(homeGuidePageResolvers.getHomeGuideSteps) ||
    !asFunction(homeGuidePageResolvers.ensureHomeGuideDom) ||
    !asFunction(homeGuidePageResolvers.clearHomeGuideHighlight) ||
    !asFunction(homeGuidePageResolvers.elevateHomeGuideTarget) ||
    !asFunction(homeGuidePageResolvers.positionHomeGuidePanel) ||
    !asFunction(homeGuidePageResolvers.isElementVisibleForGuide) ||
    !asFunction(homeGuidePageResolvers.showHomeGuideDoneNotice) ||
    !asFunction(homeGuidePageResolvers.finishHomeGuide) ||
    !asFunction(homeGuidePageResolvers.showHomeGuideStep) ||
    !startHomeGuide
  ) {
    throw new Error("CoreHomeGuidePageHostRuntime is required");
  }

  const homeGuideLifecycleResolvers = toRecord(
    createHomeGuideLifecycleResolvers({
      homeGuidePageHostRuntime: source.homeGuidePageHostRuntime,
      homeGuideSettingsHostRuntime: source.homeGuideSettingsHostRuntime,
      homeGuideStartupHostRuntime: source.homeGuideStartupHostRuntime,
      documentLike: source.documentLike || null,
      windowLike: source.windowLike || null,
      locationLike: source.locationLike || null,
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState,
      isHomePage,
      startHomeGuide,
      storageRuntime: source.storageRuntime,
      seenKey: homeGuideSeenKey,
      setTimeoutLike: source.setTimeoutLike,
      autoStartDelayMs: resolveNumber(source.homeGuideAutoStartDelayMs, 260)
    })
  );

  const initHomeGuideSettingsUI = asFunction<() => unknown>(
    homeGuideLifecycleResolvers.initHomeGuideSettingsUI
  );
  const autoStartHomeGuideIfNeeded = asFunction<() => unknown>(
    homeGuideLifecycleResolvers.autoStartHomeGuideIfNeeded
  );
  if (!initHomeGuideSettingsUI || !autoStartHomeGuideIfNeeded) {
    throw new Error("CoreHomeGuidePageHostRuntime is required");
  }

  const replayPageHostRuntime = toRecord(source.replayPageHostRuntime);
  const createReplayPageActionResolvers = asFunction<(payload: unknown) => unknown>(
    replayPageHostRuntime.createReplayPageActionResolvers
  );
  if (!createReplayPageActionResolvers) {
    throw new Error("CoreReplayPageHostRuntime is required");
  }

  const replayPageActionResolvers = toRecord(
    createReplayPageActionResolvers({
      replayPageHostRuntime: source.replayPageHostRuntime,
      replayModalRuntime: source.replayModalRuntime,
      replayExportRuntime: source.replayExportRuntime,
      documentLike: source.documentLike || null,
      windowLike: source.windowLike || null,
      navigatorLike: source.navigatorLike || null,
      alertLike: source.alertLike || null,
      consoleLike: source.consoleLike || null
    })
  );

  const showReplayModal = asFunction<() => unknown>(replayPageActionResolvers.showReplayModal);
  const closeReplayModal = asFunction<() => unknown>(replayPageActionResolvers.closeReplayModal);
  const exportReplay = asFunction<() => unknown>(replayPageActionResolvers.exportReplay);
  if (!showReplayModal || !closeReplayModal || !exportReplay) {
    throw new Error("CoreReplayPageHostRuntime is required");
  }

  const settingsModalActionResolvers = toRecord(
    createSettingsModalActionResolvers({
      settingsModalPageHostRuntime: source.settingsModalPageHostRuntime,
      settingsModalHostRuntime: source.settingsModalHostRuntime,
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike || null,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initHomeGuideSettingsUI
    })
  );

  const openSettingsModal = asFunction<() => unknown>(settingsModalActionResolvers.openSettingsModal);
  const closeSettingsModal = asFunction<() => unknown>(
    settingsModalActionResolvers.closeSettingsModal
  );
  if (!openSettingsModal || !closeSettingsModal) {
    throw new Error("CoreSettingsModalPageHostRuntime is required");
  }

  return {
    initThemeSettingsUI,
    removeLegacyUndoSettingsUI,
    initTimerModuleSettingsUI,
    openPracticeBoardFromCurrent,
    initHomeGuideSettingsUI,
    autoStartHomeGuideIfNeeded,
    showReplayModal,
    closeReplayModal,
    exportReplay,
    openSettingsModal,
    closeSettingsModal
  };
}

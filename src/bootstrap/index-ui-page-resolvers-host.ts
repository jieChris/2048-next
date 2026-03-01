function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface IndexUiMobileResolvers {
  isGamePageScope: () => boolean;
  isTimerboxMobileScope: () => boolean;
  isPracticePageScope: () => boolean;
  isMobileGameViewport: () => boolean;
  isCompactGameViewport: () => boolean;
  isTimerboxCollapseViewport: () => boolean;
  ensureMobileUndoTopButton: () => unknown;
  ensureMobileHintToggleButton: () => unknown;
  syncMobileUndoTopButtonAvailability: () => unknown;
  initMobileUndoTopButton: () => unknown;
  syncMobileTopActionsPlacement: () => unknown;
  syncPracticeTopActionsPlacement: () => unknown;
  ensureMobileHintModalDom: () => unknown;
  openMobileHintModal: () => unknown;
  closeMobileHintModal: () => unknown;
  syncMobileHintUI: () => unknown;
  initMobileHintToggle: () => unknown;
  syncMobileTimerboxUI: (options?: unknown) => unknown;
  initMobileTimerboxToggle: () => unknown;
  requestResponsiveGameRelayout: () => unknown;
}

export function createIndexUiMobileResolvers(input: {
  mobileViewportPageHostRuntime?: unknown;
  mobileViewportRuntime?: unknown;
  mobileTopButtonsPageHostRuntime?: unknown;
  mobileTopButtonsRuntime?: unknown;
  mobileUndoTopAvailabilityHostRuntime?: unknown;
  mobileUndoTopHostRuntime?: unknown;
  mobileUndoTopRuntime?: unknown;
  undoActionRuntime?: unknown;
  topActionsPageHostRuntime?: unknown;
  topActionsRuntime?: unknown;
  topActionsHostRuntime?: unknown;
  mobileHintPageHostRuntime?: unknown;
  mobileHintModalRuntime?: unknown;
  mobileHintOpenHostRuntime?: unknown;
  mobileHintUiHostRuntime?: unknown;
  mobileHintHostRuntime?: unknown;
  mobileHintRuntime?: unknown;
  mobileHintUiRuntime?: unknown;
  mobileTimerboxPageHostRuntime?: unknown;
  mobileTimerboxHostRuntime?: unknown;
  mobileTimerboxRuntime?: unknown;
  responsiveRelayoutHostRuntime?: unknown;
  responsiveRelayoutRuntime?: unknown;
  documentLike?: unknown;
  bodyLike?: unknown;
  windowLike?: unknown;
  navigatorLike?: unknown;
  storageRuntime?: unknown;
  isGamePageScope?: unknown;
  isPracticePageScope?: unknown;
  isCompactGameViewport?: unknown;
  isTimerboxMobileScope?: unknown;
  isTimerboxCollapseViewport?: unknown;
  tryUndoFromUi?: unknown;
  syncMobileHintUI?: unknown;
  syncMobileTopActionsPlacement?: unknown;
  syncPracticeTopActionsPlacement?: unknown;
  syncMobileUndoTopButtonAvailability?: unknown;
  clearTimeoutLike?: unknown;
  setTimeoutLike?: unknown;
  mobileUiMaxWidth?: unknown;
  compactGameViewportMaxWidth?: unknown;
  timerboxCollapseMaxWidth?: unknown;
  fallbackUndoLabel?: unknown;
  hintOverlayId?: unknown;
  hintDefaultText?: unknown;
  hintCollapsedClassName?: unknown;
  hintIntroHiddenClassName?: unknown;
  hintIntroSelector?: unknown;
  hintContainerSelector?: unknown;
  timerboxStorageKey?: unknown;
  timerboxHiddenClassName?: unknown;
  timerboxExpandedClassName?: unknown;
  timerboxDefaultCollapsed?: unknown;
  timerboxFallbackHiddenToggleDisplay?: unknown;
  timerboxFallbackVisibleToggleDisplay?: unknown;
  timerboxFallbackHiddenAriaExpanded?: unknown;
  timerboxFallbackExpandLabel?: unknown;
  timerboxFallbackCollapseLabel?: unknown;
  timerboxRelayoutDelayMs?: unknown;
}): IndexUiMobileResolvers {
  const source = toRecord(input);
  const mobileViewportPageHostRuntime = toRecord(source.mobileViewportPageHostRuntime);
  const createMobileViewportPageResolvers = asFunction<(payload: unknown) => unknown>(
    mobileViewportPageHostRuntime.createMobileViewportPageResolvers
  );
  if (!createMobileViewportPageResolvers) {
    throw new Error("CoreMobileViewportPageHostRuntime is required");
  }

  const mobileViewportPageResolvers = toRecord(
    createMobileViewportPageResolvers({
      mobileViewportRuntime: source.mobileViewportRuntime,
      bodyLike: source.bodyLike || null,
      windowLike: source.windowLike || null,
      navigatorLike: source.navigatorLike || null,
      mobileUiMaxWidth: source.mobileUiMaxWidth,
      compactGameViewportMaxWidth: source.compactGameViewportMaxWidth,
      timerboxCollapseMaxWidth: source.timerboxCollapseMaxWidth
    })
  );

  const isGamePageScope = asFunction<() => boolean>(mobileViewportPageResolvers.isGamePageScope);
  const isTimerboxMobileScope = asFunction<() => boolean>(
    mobileViewportPageResolvers.isTimerboxMobileScope
  );
  const isPracticePageScope = asFunction<() => boolean>(
    mobileViewportPageResolvers.isPracticePageScope
  );
  const isMobileGameViewport = asFunction<() => boolean>(
    mobileViewportPageResolvers.isMobileGameViewport
  );
  const isCompactGameViewport = asFunction<() => boolean>(
    mobileViewportPageResolvers.isCompactGameViewport
  );
  const isTimerboxCollapseViewport = asFunction<() => boolean>(
    mobileViewportPageResolvers.isTimerboxCollapseViewport
  );

  if (
    !isGamePageScope ||
    !isTimerboxMobileScope ||
    !isPracticePageScope ||
    !isMobileGameViewport ||
    !isCompactGameViewport ||
    !isTimerboxCollapseViewport
  ) {
    throw new Error("CoreMobileViewportPageHostRuntime is required");
  }

  const mobileTopButtonsPageHostRuntime = toRecord(source.mobileTopButtonsPageHostRuntime);
  const createMobileTopButtonsPageResolvers = asFunction<(payload: unknown) => unknown>(
    mobileTopButtonsPageHostRuntime.createMobileTopButtonsPageResolvers
  );
  if (!createMobileTopButtonsPageResolvers) {
    throw new Error("CoreMobileTopButtonsPageHostRuntime is required");
  }

  const mobileTopButtonsPageResolvers = toRecord(
    createMobileTopButtonsPageResolvers({
      mobileTopButtonsRuntime: source.mobileTopButtonsRuntime,
      documentLike: source.documentLike || null,
      isGamePageScope,
      mobileUndoTopAvailabilityHostRuntime: source.mobileUndoTopAvailabilityHostRuntime,
      mobileUndoTopHostRuntime: source.mobileUndoTopHostRuntime,
      mobileUndoTopRuntime: source.mobileUndoTopRuntime,
      undoActionRuntime: source.undoActionRuntime,
      bodyLike: source.bodyLike || null,
      windowLike: source.windowLike || null,
      isCompactGameViewport,
      tryUndoFromUi: source.tryUndoFromUi,
      fallbackLabel: source.fallbackUndoLabel
    })
  );

  const ensureMobileUndoTopButton = asFunction<() => unknown>(
    mobileTopButtonsPageResolvers.ensureMobileUndoTopButton
  );
  const ensureMobileHintToggleButton = asFunction<() => unknown>(
    mobileTopButtonsPageResolvers.ensureMobileHintToggleButton
  );
  const syncMobileUndoTopButtonAvailability = asFunction<() => unknown>(
    mobileTopButtonsPageResolvers.syncMobileUndoTopButtonAvailability
  );
  const initMobileUndoTopButton = asFunction<() => unknown>(
    mobileTopButtonsPageResolvers.initMobileUndoTopButton
  );

  if (
    !ensureMobileUndoTopButton ||
    !ensureMobileHintToggleButton ||
    !syncMobileUndoTopButtonAvailability ||
    !initMobileUndoTopButton
  ) {
    throw new Error("CoreMobileTopButtonsPageHostRuntime is required");
  }

  const topActionsPageHostRuntime = toRecord(source.topActionsPageHostRuntime);
  const createTopActionsPageResolvers = asFunction<(payload: unknown) => unknown>(
    topActionsPageHostRuntime.createTopActionsPageResolvers
  );
  if (!createTopActionsPageResolvers) {
    throw new Error("CoreTopActionsPageHostRuntime is required");
  }

  const topActionsPageResolvers = toRecord(
    createTopActionsPageResolvers({
      topActionsRuntime: source.topActionsRuntime,
      topActionsHostRuntime: source.topActionsHostRuntime,
      documentLike: source.documentLike || null,
      isGamePageScope,
      isPracticePageScope,
      isCompactGameViewport
    })
  );

  const syncMobileTopActionsPlacement = asFunction<() => unknown>(
    topActionsPageResolvers.syncMobileTopActionsPlacement
  );
  const syncPracticeTopActionsPlacement = asFunction<() => unknown>(
    topActionsPageResolvers.syncPracticeTopActionsPlacement
  );
  if (!syncMobileTopActionsPlacement || !syncPracticeTopActionsPlacement) {
    throw new Error("CoreTopActionsPageHostRuntime is required");
  }

  const mobileHintPageHostRuntime = toRecord(source.mobileHintPageHostRuntime);
  const createMobileHintPageResolvers = asFunction<(payload: unknown) => unknown>(
    mobileHintPageHostRuntime.createMobileHintPageResolvers
  );
  if (!createMobileHintPageResolvers) {
    throw new Error("CoreMobileHintPageHostRuntime is required");
  }

  const mobileHintPageResolvers = toRecord(
    createMobileHintPageResolvers({
      mobileHintModalRuntime: source.mobileHintModalRuntime,
      mobileHintOpenHostRuntime: source.mobileHintOpenHostRuntime,
      mobileHintUiHostRuntime: source.mobileHintUiHostRuntime,
      mobileHintHostRuntime: source.mobileHintHostRuntime,
      mobileHintRuntime: source.mobileHintRuntime,
      mobileHintUiRuntime: source.mobileHintUiRuntime,
      documentLike: source.documentLike || null,
      ensureMobileHintToggleButton,
      isGamePageScope,
      isCompactGameViewport,
      overlayId: source.hintOverlayId,
      defaultText: source.hintDefaultText,
      collapsedClassName: source.hintCollapsedClassName,
      introHiddenClassName: source.hintIntroHiddenClassName,
      introSelector: source.hintIntroSelector,
      containerSelector: source.hintContainerSelector
    })
  );

  const ensureMobileHintModalDom = asFunction<() => unknown>(
    mobileHintPageResolvers.ensureMobileHintModalDom
  );
  const openMobileHintModal = asFunction<() => unknown>(mobileHintPageResolvers.openMobileHintModal);
  const closeMobileHintModal = asFunction<() => unknown>(
    mobileHintPageResolvers.closeMobileHintModal
  );
  const syncMobileHintUI = asFunction<() => unknown>(mobileHintPageResolvers.syncMobileHintUI);
  const initMobileHintToggle = asFunction<() => unknown>(
    mobileHintPageResolvers.initMobileHintToggle
  );

  if (
    !ensureMobileHintModalDom ||
    !openMobileHintModal ||
    !closeMobileHintModal ||
    !syncMobileHintUI ||
    !initMobileHintToggle
  ) {
    throw new Error("CoreMobileHintPageHostRuntime is required");
  }

  const mobileTimerboxPageHostRuntime = toRecord(source.mobileTimerboxPageHostRuntime);
  const createMobileTimerboxPageResolvers = asFunction<(payload: unknown) => unknown>(
    mobileTimerboxPageHostRuntime.createMobileTimerboxPageResolvers
  );
  if (!createMobileTimerboxPageResolvers) {
    throw new Error("CoreMobileTimerboxPageHostRuntime is required");
  }

  const mobileTimerboxPageResolvers = toRecord(
    createMobileTimerboxPageResolvers({
      mobileTimerboxHostRuntime: source.mobileTimerboxHostRuntime,
      mobileTimerboxRuntime: source.mobileTimerboxRuntime,
      isTimerboxMobileScope,
      isTimerboxCollapseViewport,
      documentLike: source.documentLike || null,
      storageRuntime: source.storageRuntime,
      windowLike: source.windowLike || null,
      storageKey: source.timerboxStorageKey,
      hiddenClassName: source.timerboxHiddenClassName,
      expandedClassName: source.timerboxExpandedClassName,
      defaultCollapsed: source.timerboxDefaultCollapsed,
      fallbackHiddenToggleDisplay: source.timerboxFallbackHiddenToggleDisplay,
      fallbackVisibleToggleDisplay: source.timerboxFallbackVisibleToggleDisplay,
      fallbackHiddenAriaExpanded: source.timerboxFallbackHiddenAriaExpanded,
      fallbackExpandLabel: source.timerboxFallbackExpandLabel,
      fallbackCollapseLabel: source.timerboxFallbackCollapseLabel,
      responsiveRelayoutHostRuntime: source.responsiveRelayoutHostRuntime,
      responsiveRelayoutRuntime: source.responsiveRelayoutRuntime,
      syncMobileHintUI,
      syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement,
      syncMobileUndoTopButtonAvailability,
      relayoutDelayMs: source.timerboxRelayoutDelayMs,
      clearTimeoutLike: source.clearTimeoutLike,
      setTimeoutLike: source.setTimeoutLike
    })
  );

  const syncMobileTimerboxUI = asFunction<(options?: unknown) => unknown>(
    mobileTimerboxPageResolvers.syncMobileTimerboxUI
  );
  const initMobileTimerboxToggle = asFunction<() => unknown>(
    mobileTimerboxPageResolvers.initMobileTimerboxToggle
  );
  const requestResponsiveGameRelayout = asFunction<() => unknown>(
    mobileTimerboxPageResolvers.requestResponsiveGameRelayout
  );

  if (!syncMobileTimerboxUI || !initMobileTimerboxToggle || !requestResponsiveGameRelayout) {
    throw new Error("CoreMobileTimerboxPageHostRuntime is required");
  }

  return {
    isGamePageScope,
    isTimerboxMobileScope,
    isPracticePageScope,
    isMobileGameViewport,
    isCompactGameViewport,
    isTimerboxCollapseViewport,
    ensureMobileUndoTopButton,
    ensureMobileHintToggleButton,
    syncMobileUndoTopButtonAvailability,
    initMobileUndoTopButton,
    syncMobileTopActionsPlacement,
    syncPracticeTopActionsPlacement,
    ensureMobileHintModalDom,
    openMobileHintModal,
    closeMobileHintModal,
    syncMobileHintUI,
    initMobileHintToggle,
    syncMobileTimerboxUI,
    initMobileTimerboxToggle,
    requestResponsiveGameRelayout
  };
}

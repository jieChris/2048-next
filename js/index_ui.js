// Logic extracted from index.html

var indexUiRuntimeContractRuntime = window.CoreIndexUiRuntimeContractRuntime;
if (
  !indexUiRuntimeContractRuntime ||
  typeof indexUiRuntimeContractRuntime.resolveIndexUiModalRuntimeContracts !== "function" ||
  typeof indexUiRuntimeContractRuntime.resolveIndexUiHomeGuideRuntimeContracts !== "function" ||
  typeof indexUiRuntimeContractRuntime.resolveIndexUiCoreRuntimeContracts !== "function"
) {
  throw new Error("CoreIndexUiRuntimeContractRuntime is required");
}
var indexUiModalRuntimeContracts = indexUiRuntimeContractRuntime.resolveIndexUiModalRuntimeContracts(
  typeof window !== "undefined" ? window : null
);
var modalContracts = indexUiModalRuntimeContracts;
var indexUiHomeGuideRuntimeContracts =
  indexUiRuntimeContractRuntime.resolveIndexUiHomeGuideRuntimeContracts(
    typeof window !== "undefined" ? window : null
  );
var homeGuideContracts = indexUiHomeGuideRuntimeContracts;
var indexUiCoreRuntimeContracts = indexUiRuntimeContractRuntime.resolveIndexUiCoreRuntimeContracts(
  typeof window !== "undefined" ? window : null
);
var coreContracts = indexUiCoreRuntimeContracts;
var indexUiPageHostRuntime = indexUiCoreRuntimeContracts.indexUiPageHostRuntime;
var indexUiPageResolversHostRuntime = indexUiCoreRuntimeContracts.indexUiPageResolversHostRuntime;
var indexUiPageActionsHostRuntime = indexUiCoreRuntimeContracts.indexUiPageActionsHostRuntime;
var tryUndoFromUi = indexUiPageHostRuntime.createIndexUiTryUndoHandler({
  undoActionRuntime: coreContracts.undoActionRuntime,
  windowLike: typeof window !== "undefined" ? window : null,
  direction: -1
});
if (typeof tryUndoFromUi !== "function") {
  throw new Error("CoreIndexUiPageHostRuntime is required");
}

var PRACTICE_TRANSFER_KEY = "practice_board_transfer_v1";
var PRACTICE_TRANSFER_SESSION_KEY = "practice_board_transfer_session_v1";
var PRACTICE_GUIDE_SHOWN_KEY = "practice_guide_shown_v2";
var PRACTICE_GUIDE_SEEN_FLAG = "practice_guide_seen_v2=1";
var MOBILE_TIMERBOX_COLLAPSED_KEY = "ui_timerbox_collapsed_mobile_v1";
var MOBILE_UI_MAX_WIDTH = 760;
var TIMERBOX_COLLAPSE_MAX_WIDTH = 980;
var COMPACT_GAME_VIEWPORT_MAX_WIDTH = 980;
var indexUiMobileResolvers = indexUiPageResolversHostRuntime.createIndexUiMobileResolvers({
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
  documentLike: document,
  bodyLike: document.body,
  windowLike: typeof window !== "undefined" ? window : null,
  navigatorLike: typeof navigator !== "undefined" ? navigator : null,
  storageRuntime: coreContracts.storageRuntime,
  tryUndoFromUi: tryUndoFromUi,
  clearTimeoutLike: clearTimeout,
  setTimeoutLike: setTimeout,
  mobileUiMaxWidth: MOBILE_UI_MAX_WIDTH,
  compactGameViewportMaxWidth: COMPACT_GAME_VIEWPORT_MAX_WIDTH,
  timerboxCollapseMaxWidth: TIMERBOX_COLLAPSE_MAX_WIDTH,
  fallbackUndoLabel: "撤回",
  hintOverlayId: "mobile-hint-overlay",
  hintDefaultText: "合并数字，合成 2048 方块。",
  hintCollapsedClassName: "mobile-hint-collapsed-content",
  hintIntroHiddenClassName: "mobile-hint-hidden",
  hintIntroSelector: ".above-game .game-intro",
  hintContainerSelector: ".container",
  timerboxStorageKey: MOBILE_TIMERBOX_COLLAPSED_KEY,
  timerboxHiddenClassName: "timerbox-hidden-mode",
  timerboxExpandedClassName: "is-mobile-expanded",
  timerboxDefaultCollapsed: true,
  timerboxFallbackHiddenToggleDisplay: "none",
  timerboxFallbackVisibleToggleDisplay: "inline-flex",
  timerboxFallbackHiddenAriaExpanded: "false",
  timerboxFallbackExpandLabel: "展开计时器",
  timerboxFallbackCollapseLabel: "收起计时器",
  timerboxRelayoutDelayMs: 120
});
if (!indexUiMobileResolvers || typeof indexUiMobileResolvers !== "object") {
  throw new Error("CoreIndexUiPageResolversHostRuntime is required");
}
var isCompactGameViewport = indexUiMobileResolvers.isCompactGameViewport;
var syncMobileUndoTopButtonAvailability =
  indexUiMobileResolvers.syncMobileUndoTopButtonAvailability;
var initMobileUndoTopButton = indexUiMobileResolvers.initMobileUndoTopButton;
var syncMobileHintUI = indexUiMobileResolvers.syncMobileHintUI;
var initMobileHintToggle = indexUiMobileResolvers.initMobileHintToggle;
var syncMobileTimerboxUI = indexUiMobileResolvers.syncMobileTimerboxUI;
var initMobileTimerboxToggle = indexUiMobileResolvers.initMobileTimerboxToggle;
var requestResponsiveGameRelayout = indexUiMobileResolvers.requestResponsiveGameRelayout;
var indexUiPageActionResolvers = indexUiPageActionsHostRuntime.createIndexUiPageActionResolvers({
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
  isCompactGameViewport: isCompactGameViewport,
  documentLike: document,
  windowLike: typeof window !== "undefined" ? window : null,
  locationLike: typeof window !== "undefined" ? window.location : null,
  navigatorLike: typeof navigator !== "undefined" ? navigator : null,
  alertLike: typeof alert !== "undefined" ? alert : null,
  consoleLike: typeof console !== "undefined" ? console : null,
  setTimeoutLike: setTimeout,
  clearTimeoutLike: clearTimeout,
  guideShownKey: PRACTICE_GUIDE_SHOWN_KEY,
  guideSeenFlag: PRACTICE_GUIDE_SEEN_FLAG,
  localStorageKey: PRACTICE_TRANSFER_KEY,
  sessionStorageKey: PRACTICE_TRANSFER_SESSION_KEY,
  homeGuideSeenKey: "home_guide_seen_v1",
  homeGuideMobileUiMaxWidth: MOBILE_UI_MAX_WIDTH,
  homeGuidePanelMargin: 12,
  homeGuideDefaultPanelHeight: 160,
  homeGuideMaxAdvanceLoops: 32,
  homeGuideAutoStartDelayMs: 260
});
if (!indexUiPageActionResolvers || typeof indexUiPageActionResolvers !== "object") {
  throw new Error("CoreIndexUiPageActionsHostRuntime is required");
}
var initThemeSettingsUI = indexUiPageActionResolvers.initThemeSettingsUI;
var removeLegacyUndoSettingsUI = indexUiPageActionResolvers.removeLegacyUndoSettingsUI;
var initTimerModuleSettingsUI = indexUiPageActionResolvers.initTimerModuleSettingsUI;
var openPracticeBoardFromCurrent = indexUiPageActionResolvers.openPracticeBoardFromCurrent;
var initHomeGuideSettingsUI = indexUiPageActionResolvers.initHomeGuideSettingsUI;
var autoStartHomeGuideIfNeeded = indexUiPageActionResolvers.autoStartHomeGuideIfNeeded;
var closeReplayModal = indexUiPageActionResolvers.closeReplayModal;
var exportReplay = indexUiPageActionResolvers.exportReplay;
var openSettingsModal = indexUiPageActionResolvers.openSettingsModal;
var closeSettingsModal = indexUiPageActionResolvers.closeSettingsModal;
indexUiPageHostRuntime.applyIndexUiPageBootstrap({
  indexUiStartupHostRuntime: coreContracts.indexUiStartupHostRuntime,
  topActionBindingsHostRuntime: coreContracts.topActionBindingsHostRuntime,
  gameOverUndoHostRuntime: coreContracts.gameOverUndoHostRuntime,
  documentLike: document,
  windowLike: typeof window !== "undefined" ? window : null,
  nowMs: function () {
    return Date.now();
  },
  touchGuardWindowMs: 450,
  tryUndoFromUi: tryUndoFromUi,
  exportReplay: exportReplay,
  closeReplayModal: closeReplayModal,
  openPracticeBoardFromCurrent: openPracticeBoardFromCurrent,
  openSettingsModal: openSettingsModal,
  closeSettingsModal: closeSettingsModal,
  initThemeSettingsUI: initThemeSettingsUI,
  removeLegacyUndoSettingsUI: removeLegacyUndoSettingsUI,
  initTimerModuleSettingsUI: initTimerModuleSettingsUI,
  initMobileHintToggle: initMobileHintToggle,
  initMobileUndoTopButton: initMobileUndoTopButton,
  initHomeGuideSettingsUI: initHomeGuideSettingsUI,
  autoStartHomeGuideIfNeeded: autoStartHomeGuideIfNeeded,
  initMobileTimerboxToggle: initMobileTimerboxToggle,
  requestResponsiveGameRelayout: requestResponsiveGameRelayout,
  syncMobileTimerboxUI: syncMobileTimerboxUI,
  syncMobileHintUI: syncMobileHintUI,
  syncMobileUndoTopButtonAvailability: syncMobileUndoTopButtonAvailability,
  prettyTimeRuntime: coreContracts.prettyTimeRuntime
});

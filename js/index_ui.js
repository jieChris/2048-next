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
var replayModalRuntime = indexUiModalRuntimeContracts.replayModalRuntime;
var replayExportRuntime = indexUiModalRuntimeContracts.replayExportRuntime;
var replayPageHostRuntime = indexUiModalRuntimeContracts.replayPageHostRuntime;
var settingsModalHostRuntime = indexUiModalRuntimeContracts.settingsModalHostRuntime;
var settingsModalPageHostRuntime = indexUiModalRuntimeContracts.settingsModalPageHostRuntime;
var indexUiHomeGuideRuntimeContracts =
  indexUiRuntimeContractRuntime.resolveIndexUiHomeGuideRuntimeContracts(
    typeof window !== "undefined" ? window : null
  );
var homeGuideRuntime = indexUiHomeGuideRuntimeContracts.homeGuideRuntime;
var homeGuideStartupHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideStartupHostRuntime;
var homeGuideSettingsHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideSettingsHostRuntime;
var homeGuidePageHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuidePageHostRuntime;
var homeGuideDomHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideDomHostRuntime;
var homeGuideDoneNoticeHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideDoneNoticeHostRuntime;
var homeGuideHighlightHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideHighlightHostRuntime;
var homeGuidePanelHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuidePanelHostRuntime;
var homeGuideFinishHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideFinishHostRuntime;
var homeGuideStartHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideStartHostRuntime;
var homeGuideControlsHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideControlsHostRuntime;
var homeGuideStepFlowHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideStepFlowHostRuntime;
var homeGuideStepHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideStepHostRuntime;
var homeGuideStepViewHostRuntime = indexUiHomeGuideRuntimeContracts.homeGuideStepViewHostRuntime;
var indexUiCoreRuntimeContracts = indexUiRuntimeContractRuntime.resolveIndexUiCoreRuntimeContracts(
  typeof window !== "undefined" ? window : null
);
var timerModuleRuntime = indexUiCoreRuntimeContracts.timerModuleRuntime;
var timerModuleSettingsHostRuntime = indexUiCoreRuntimeContracts.timerModuleSettingsHostRuntime;
var timerModuleSettingsPageHostRuntime = indexUiCoreRuntimeContracts.timerModuleSettingsPageHostRuntime;
var themeSettingsRuntime = indexUiCoreRuntimeContracts.themeSettingsRuntime;
var themeSettingsHostRuntime = indexUiCoreRuntimeContracts.themeSettingsHostRuntime;
var themeSettingsPageHostRuntime = indexUiCoreRuntimeContracts.themeSettingsPageHostRuntime;
var practiceTransferRuntime = indexUiCoreRuntimeContracts.practiceTransferRuntime;
var practiceTransferHostRuntime = indexUiCoreRuntimeContracts.practiceTransferHostRuntime;
var practiceTransferPageHostRuntime = indexUiCoreRuntimeContracts.practiceTransferPageHostRuntime;
var undoActionRuntime = indexUiCoreRuntimeContracts.undoActionRuntime;
var mobileHintRuntime = indexUiCoreRuntimeContracts.mobileHintRuntime;
var mobileHintUiRuntime = indexUiCoreRuntimeContracts.mobileHintUiRuntime;
var mobileHintModalRuntime = indexUiCoreRuntimeContracts.mobileHintModalRuntime;
var mobileHintOpenHostRuntime = indexUiCoreRuntimeContracts.mobileHintOpenHostRuntime;
var mobileHintUiHostRuntime = indexUiCoreRuntimeContracts.mobileHintUiHostRuntime;
var mobileHintHostRuntime = indexUiCoreRuntimeContracts.mobileHintHostRuntime;
var mobileHintPageHostRuntime = indexUiCoreRuntimeContracts.mobileHintPageHostRuntime;
var mobileTimerboxRuntime = indexUiCoreRuntimeContracts.mobileTimerboxRuntime;
var mobileTimerboxHostRuntime = indexUiCoreRuntimeContracts.mobileTimerboxHostRuntime;
var mobileTimerboxPageHostRuntime = indexUiCoreRuntimeContracts.mobileTimerboxPageHostRuntime;
var mobileUndoTopRuntime = indexUiCoreRuntimeContracts.mobileUndoTopRuntime;
var mobileUndoTopHostRuntime = indexUiCoreRuntimeContracts.mobileUndoTopHostRuntime;
var mobileUndoTopAvailabilityHostRuntime =
  indexUiCoreRuntimeContracts.mobileUndoTopAvailabilityHostRuntime;
var topActionsRuntime = indexUiCoreRuntimeContracts.topActionsRuntime;
var topActionsHostRuntime = indexUiCoreRuntimeContracts.topActionsHostRuntime;
var topActionsPageHostRuntime = indexUiCoreRuntimeContracts.topActionsPageHostRuntime;
var mobileTopButtonsRuntime = indexUiCoreRuntimeContracts.mobileTopButtonsRuntime;
var mobileTopButtonsPageHostRuntime = indexUiCoreRuntimeContracts.mobileTopButtonsPageHostRuntime;
var mobileViewportRuntime = indexUiCoreRuntimeContracts.mobileViewportRuntime;
var mobileViewportPageHostRuntime = indexUiCoreRuntimeContracts.mobileViewportPageHostRuntime;
var storageRuntime = indexUiCoreRuntimeContracts.storageRuntime;
var prettyTimeRuntime = indexUiCoreRuntimeContracts.prettyTimeRuntime;
var responsiveRelayoutRuntime = indexUiCoreRuntimeContracts.responsiveRelayoutRuntime;
var responsiveRelayoutHostRuntime = indexUiCoreRuntimeContracts.responsiveRelayoutHostRuntime;
var topActionBindingsHostRuntime = indexUiCoreRuntimeContracts.topActionBindingsHostRuntime;
var gameOverUndoHostRuntime = indexUiCoreRuntimeContracts.gameOverUndoHostRuntime;
var indexUiStartupHostRuntime = indexUiCoreRuntimeContracts.indexUiStartupHostRuntime;
var indexUiPageHostRuntime = indexUiCoreRuntimeContracts.indexUiPageHostRuntime;
var indexUiPageResolversHostRuntime = indexUiCoreRuntimeContracts.indexUiPageResolversHostRuntime;
var indexUiPageActionsHostRuntime = indexUiCoreRuntimeContracts.indexUiPageActionsHostRuntime;
var tryUndoFromUi = indexUiPageHostRuntime.createIndexUiTryUndoHandler({
  undoActionRuntime: undoActionRuntime,
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
  mobileViewportPageHostRuntime: mobileViewportPageHostRuntime,
  mobileViewportRuntime: mobileViewportRuntime,
  mobileTopButtonsPageHostRuntime: mobileTopButtonsPageHostRuntime,
  mobileTopButtonsRuntime: mobileTopButtonsRuntime,
  mobileUndoTopAvailabilityHostRuntime: mobileUndoTopAvailabilityHostRuntime,
  mobileUndoTopHostRuntime: mobileUndoTopHostRuntime,
  mobileUndoTopRuntime: mobileUndoTopRuntime,
  undoActionRuntime: undoActionRuntime,
  topActionsPageHostRuntime: topActionsPageHostRuntime,
  topActionsRuntime: topActionsRuntime,
  topActionsHostRuntime: topActionsHostRuntime,
  mobileHintPageHostRuntime: mobileHintPageHostRuntime,
  mobileHintModalRuntime: mobileHintModalRuntime,
  mobileHintOpenHostRuntime: mobileHintOpenHostRuntime,
  mobileHintUiHostRuntime: mobileHintUiHostRuntime,
  mobileHintHostRuntime: mobileHintHostRuntime,
  mobileHintRuntime: mobileHintRuntime,
  mobileHintUiRuntime: mobileHintUiRuntime,
  mobileTimerboxPageHostRuntime: mobileTimerboxPageHostRuntime,
  mobileTimerboxHostRuntime: mobileTimerboxHostRuntime,
  mobileTimerboxRuntime: mobileTimerboxRuntime,
  responsiveRelayoutHostRuntime: responsiveRelayoutHostRuntime,
  responsiveRelayoutRuntime: responsiveRelayoutRuntime,
  documentLike: document,
  bodyLike: document.body,
  windowLike: typeof window !== "undefined" ? window : null,
  navigatorLike: typeof navigator !== "undefined" ? navigator : null,
  storageRuntime: storageRuntime,
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
  settingsModalPageHostRuntime: settingsModalPageHostRuntime,
  settingsModalHostRuntime: settingsModalHostRuntime,
  replayModalRuntime: replayModalRuntime,
  themeSettingsPageHostRuntime: themeSettingsPageHostRuntime,
  themeSettingsHostRuntime: themeSettingsHostRuntime,
  themeSettingsRuntime: themeSettingsRuntime,
  timerModuleSettingsHostRuntime: timerModuleSettingsHostRuntime,
  timerModuleSettingsPageHostRuntime: timerModuleSettingsPageHostRuntime,
  timerModuleRuntime: timerModuleRuntime,
  practiceTransferPageHostRuntime: practiceTransferPageHostRuntime,
  practiceTransferHostRuntime: practiceTransferHostRuntime,
  practiceTransferRuntime: practiceTransferRuntime,
  storageRuntime: storageRuntime,
  homeGuidePageHostRuntime: homeGuidePageHostRuntime,
  homeGuideRuntime: homeGuideRuntime,
  homeGuideDomHostRuntime: homeGuideDomHostRuntime,
  homeGuideHighlightHostRuntime: homeGuideHighlightHostRuntime,
  homeGuidePanelHostRuntime: homeGuidePanelHostRuntime,
  homeGuideDoneNoticeHostRuntime: homeGuideDoneNoticeHostRuntime,
  homeGuideFinishHostRuntime: homeGuideFinishHostRuntime,
  homeGuideStepHostRuntime: homeGuideStepHostRuntime,
  homeGuideStepFlowHostRuntime: homeGuideStepFlowHostRuntime,
  homeGuideStepViewHostRuntime: homeGuideStepViewHostRuntime,
  homeGuideStartHostRuntime: homeGuideStartHostRuntime,
  homeGuideControlsHostRuntime: homeGuideControlsHostRuntime,
  homeGuideSettingsHostRuntime: homeGuideSettingsHostRuntime,
  homeGuideStartupHostRuntime: homeGuideStartupHostRuntime,
  mobileViewportRuntime: mobileViewportRuntime,
  replayPageHostRuntime: replayPageHostRuntime,
  replayExportRuntime: replayExportRuntime,
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
  indexUiStartupHostRuntime: indexUiStartupHostRuntime,
  topActionBindingsHostRuntime: topActionBindingsHostRuntime,
  gameOverUndoHostRuntime: gameOverUndoHostRuntime,
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
  prettyTimeRuntime: prettyTimeRuntime
});

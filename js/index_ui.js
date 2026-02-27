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
if (typeof indexUiPageHostRuntime.createIndexUiBootstrapResolvers !== "function") {
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
var indexUiBootstrapResolvers = indexUiPageHostRuntime.createIndexUiBootstrapResolvers({
  indexUiPageResolversHostRuntime: indexUiPageResolversHostRuntime,
  indexUiPageActionsHostRuntime: indexUiPageActionsHostRuntime,
  coreContracts: coreContracts,
  modalContracts: modalContracts,
  homeGuideContracts: homeGuideContracts,
  documentLike: document,
  windowLike: typeof window !== "undefined" ? window : null,
  locationLike: typeof window !== "undefined" ? window.location : null,
  navigatorLike: typeof navigator !== "undefined" ? navigator : null,
  alertLike: typeof alert !== "undefined" ? alert : null,
  consoleLike: typeof console !== "undefined" ? console : null,
  setTimeoutLike: setTimeout,
  clearTimeoutLike: clearTimeout,
  tryUndoFromUi: tryUndoFromUi,
  practiceTransferKey: PRACTICE_TRANSFER_KEY,
  practiceTransferSessionKey: PRACTICE_TRANSFER_SESSION_KEY,
  practiceGuideShownKey: PRACTICE_GUIDE_SHOWN_KEY,
  practiceGuideSeenFlag: PRACTICE_GUIDE_SEEN_FLAG,
  mobileTimerboxCollapsedKey: MOBILE_TIMERBOX_COLLAPSED_KEY,
  mobileUiMaxWidth: MOBILE_UI_MAX_WIDTH,
  timerboxCollapseMaxWidth: TIMERBOX_COLLAPSE_MAX_WIDTH,
  compactGameViewportMaxWidth: COMPACT_GAME_VIEWPORT_MAX_WIDTH,
  homeGuideSeenKey: "home_guide_seen_v1",
  homeGuidePanelMargin: 12,
  homeGuideDefaultPanelHeight: 160,
  homeGuideMaxAdvanceLoops: 32,
  homeGuideAutoStartDelayMs: 260
});
if (!indexUiBootstrapResolvers || typeof indexUiBootstrapResolvers !== "object") {
  throw new Error("CoreIndexUiPageHostRuntime is required");
}
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
  exportReplay: indexUiBootstrapResolvers.exportReplay,
  closeReplayModal: indexUiBootstrapResolvers.closeReplayModal,
  openPracticeBoardFromCurrent: indexUiBootstrapResolvers.openPracticeBoardFromCurrent,
  openSettingsModal: indexUiBootstrapResolvers.openSettingsModal,
  closeSettingsModal: indexUiBootstrapResolvers.closeSettingsModal,
  initThemeSettingsUI: indexUiBootstrapResolvers.initThemeSettingsUI,
  removeLegacyUndoSettingsUI: indexUiBootstrapResolvers.removeLegacyUndoSettingsUI,
  initTimerModuleSettingsUI: indexUiBootstrapResolvers.initTimerModuleSettingsUI,
  initMobileHintToggle: indexUiBootstrapResolvers.initMobileHintToggle,
  initMobileUndoTopButton: indexUiBootstrapResolvers.initMobileUndoTopButton,
  initHomeGuideSettingsUI: indexUiBootstrapResolvers.initHomeGuideSettingsUI,
  autoStartHomeGuideIfNeeded: indexUiBootstrapResolvers.autoStartHomeGuideIfNeeded,
  initMobileTimerboxToggle: indexUiBootstrapResolvers.initMobileTimerboxToggle,
  requestResponsiveGameRelayout: indexUiBootstrapResolvers.requestResponsiveGameRelayout,
  syncMobileTimerboxUI: indexUiBootstrapResolvers.syncMobileTimerboxUI,
  syncMobileHintUI: indexUiBootstrapResolvers.syncMobileHintUI,
  syncMobileUndoTopButtonAvailability: indexUiBootstrapResolvers.syncMobileUndoTopButtonAvailability,
  prettyTimeRuntime: coreContracts.prettyTimeRuntime
});

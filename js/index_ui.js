// Logic extracted from index.html

var replayModalRuntime = window.CoreReplayModalRuntime;
var replayExportRuntime = window.CoreReplayExportRuntime;
var settingsModalHostRuntime = window.CoreSettingsModalHostRuntime;
if (
  !replayModalRuntime ||
  typeof replayModalRuntime.applyReplayModalOpen !== "function" ||
  typeof replayModalRuntime.applyReplayModalClose !== "function" ||
  typeof replayModalRuntime.applySettingsModalOpen !== "function" ||
  typeof replayModalRuntime.applySettingsModalClose !== "function"
) {
  throw new Error("CoreReplayModalRuntime is required");
}
if (
  !replayExportRuntime ||
  typeof replayExportRuntime.applyReplayExport !== "function"
) {
  throw new Error("CoreReplayExportRuntime is required");
}
if (
  !settingsModalHostRuntime ||
  typeof settingsModalHostRuntime.applySettingsModalOpenOrchestration !== "function" ||
  typeof settingsModalHostRuntime.applySettingsModalCloseOrchestration !== "function"
) {
  throw new Error("CoreSettingsModalHostRuntime is required");
}

// Replay Modal Functions
function showReplayModal(title, content, actionName, actionCallback) {
  replayModalRuntime.applyReplayModalOpen({
    documentLike: document,
    title: title,
    content: content,
    actionName: actionName,
    actionCallback: actionCallback,
    closeCallback: window.closeReplayModal
  });
}

window.closeReplayModal = function() {
  replayModalRuntime.applyReplayModalClose({
    documentLike: document
  });
};

window.openSettingsModal = function () {
  settingsModalHostRuntime.applySettingsModalOpenOrchestration({
    replayModalRuntime: replayModalRuntime,
    documentLike: document,
    removeLegacyUndoSettingsUI: removeLegacyUndoSettingsUI,
    initThemeSettingsUI: initThemeSettingsUI,
    initTimerModuleSettingsUI: initTimerModuleSettingsUI,
    initHomeGuideSettingsUI: initHomeGuideSettingsUI
  });
};

window.closeSettingsModal = function () {
  settingsModalHostRuntime.applySettingsModalCloseOrchestration({
    replayModalRuntime: replayModalRuntime,
    documentLike: document
  });
};

window.exportReplay = function() {
  replayExportRuntime.applyReplayExport({
    gameManager: window.game_manager,
    showReplayModal: showReplayModal,
    navigatorLike: navigator,
    documentLike: document,
    alertLike: alert,
    consoleLike: console
  });
};

var PRACTICE_TRANSFER_KEY = "practice_board_transfer_v1";
var PRACTICE_TRANSFER_SESSION_KEY = "practice_board_transfer_session_v1";
var PRACTICE_GUIDE_SHOWN_KEY = "practice_guide_shown_v2";
var PRACTICE_GUIDE_SEEN_FLAG = "practice_guide_seen_v2=1";
var MOBILE_TIMERBOX_COLLAPSED_KEY = "ui_timerbox_collapsed_mobile_v1";
var MOBILE_UI_MAX_WIDTH = 760;
var TIMERBOX_COLLAPSE_MAX_WIDTH = 980;
var COMPACT_GAME_VIEWPORT_MAX_WIDTH = 980;
var mobileRelayoutTimer = null;
var mobileTopActionsState = null;
var practiceTopActionsState = null;
var homeGuideRuntime = window.CoreHomeGuideRuntime;
if (
  !homeGuideRuntime ||
  typeof homeGuideRuntime.resolveHomeGuidePathname !== "function" ||
  typeof homeGuideRuntime.isHomePagePath !== "function" ||
  typeof homeGuideRuntime.buildHomeGuideSteps !== "function" ||
  typeof homeGuideRuntime.buildHomeGuidePanelInnerHtml !== "function" ||
  typeof homeGuideRuntime.buildHomeGuideSettingsRowInnerHtml !== "function" ||
  typeof homeGuideRuntime.readHomeGuideSeenValue !== "function" ||
  typeof homeGuideRuntime.markHomeGuideSeen !== "function" ||
  typeof homeGuideRuntime.shouldAutoStartHomeGuide !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideAutoStart !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideSettingsState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideStepUiState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideStepRenderState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideStepIndexState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideStepTargetState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideElevationPlan !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideBindingState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideControlAction !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideToggleAction !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideLifecycleState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideSessionState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideLayerDisplayState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideFinishState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideTargetScrollState !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideDoneNotice !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuideDoneNoticeStyle !== "function" ||
  typeof homeGuideRuntime.resolveHomeGuidePanelLayout !== "function" ||
  typeof homeGuideRuntime.isHomeGuideTargetVisible !== "function"
) {
  throw new Error("CoreHomeGuideRuntime is required");
}
var timerModuleRuntime = window.CoreTimerModuleRuntime;
if (
  !timerModuleRuntime ||
  typeof timerModuleRuntime.buildTimerModuleSettingsRowInnerHtml !== "function" ||
  typeof timerModuleRuntime.resolveTimerModuleSettingsState !== "function" ||
  typeof timerModuleRuntime.resolveTimerModuleCurrentViewMode !== "function" ||
  typeof timerModuleRuntime.resolveTimerModuleBindingState !== "function" ||
  typeof timerModuleRuntime.resolveTimerModuleViewMode !== "function" ||
  typeof timerModuleRuntime.resolveTimerModuleAppliedViewMode !== "function" ||
  typeof timerModuleRuntime.resolveTimerModuleInitRetryState !== "function"
) {
  throw new Error("CoreTimerModuleRuntime is required");
}
var timerModuleSettingsHostRuntime = window.CoreTimerModuleSettingsHostRuntime;
if (
  !timerModuleSettingsHostRuntime ||
  typeof timerModuleSettingsHostRuntime.applyLegacyUndoSettingsCleanup !== "function" ||
  typeof timerModuleSettingsHostRuntime.ensureTimerModuleSettingsToggle !== "function" ||
  typeof timerModuleSettingsHostRuntime.applyTimerModuleSettingsUi !== "function"
) {
  throw new Error("CoreTimerModuleSettingsHostRuntime is required");
}
var themeSettingsRuntime = window.CoreThemeSettingsRuntime;
if (
  !themeSettingsRuntime ||
  typeof themeSettingsRuntime.formatThemePreviewValue !== "function" ||
  typeof themeSettingsRuntime.resolveThemePreviewTileValues !== "function" ||
  typeof themeSettingsRuntime.resolveThemePreviewLayout !== "function" ||
  typeof themeSettingsRuntime.resolveThemePreviewCssSelectors !== "function" ||
  typeof themeSettingsRuntime.resolveThemeOptions !== "function" ||
  typeof themeSettingsRuntime.resolveThemeSelectLabel !== "function" ||
  typeof themeSettingsRuntime.resolveThemeDropdownToggleState !== "function" ||
  typeof themeSettingsRuntime.resolveThemeBindingState !== "function" ||
  typeof themeSettingsRuntime.resolveThemeOptionValue !== "function" ||
  typeof themeSettingsRuntime.resolveThemeOptionSelectedState !== "function"
) {
  throw new Error("CoreThemeSettingsRuntime is required");
}
var themeSettingsHostRuntime = window.CoreThemeSettingsHostRuntime;
if (
  !themeSettingsHostRuntime ||
  typeof themeSettingsHostRuntime.applyThemeSettingsUi !== "function"
) {
  throw new Error("CoreThemeSettingsHostRuntime is required");
}
var practiceTransferRuntime = window.CorePracticeTransferRuntime;
var practiceTransferHostRuntime = window.CorePracticeTransferHostRuntime;
if (
  !practiceTransferRuntime ||
  typeof practiceTransferRuntime.buildPracticeModeConfigFromCurrent !== "function" ||
  typeof practiceTransferRuntime.hasPracticeGuideSeen !== "function" ||
  typeof practiceTransferRuntime.buildPracticeBoardUrl !== "function" ||
  typeof practiceTransferRuntime.buildPracticeTransferToken !== "function" ||
  typeof practiceTransferRuntime.buildPracticeTransferPayload !== "function" ||
  typeof practiceTransferRuntime.persistPracticeTransferPayload !== "function" ||
  typeof practiceTransferRuntime.createPracticeTransferNavigationPlan !== "function" ||
  typeof practiceTransferRuntime.resolvePracticeTransferPrecheck !== "function"
) {
  throw new Error("CorePracticeTransferRuntime is required");
}
if (
  !practiceTransferHostRuntime ||
  typeof practiceTransferHostRuntime.applyPracticeTransferFromCurrent !== "function"
) {
  throw new Error("CorePracticeTransferHostRuntime is required");
}
var undoActionRuntime = window.CoreUndoActionRuntime;
if (
  !undoActionRuntime ||
  typeof undoActionRuntime.tryTriggerUndo !== "function" ||
  typeof undoActionRuntime.resolveUndoModeIdFromBody !== "function" ||
  typeof undoActionRuntime.resolveUndoModeId !== "function" ||
  typeof undoActionRuntime.isUndoCapableMode !== "function" ||
  typeof undoActionRuntime.resolveUndoCapabilityFromContext !== "function" ||
  typeof undoActionRuntime.isUndoInteractionEnabled !== "function"
) {
  throw new Error("CoreUndoActionRuntime is required");
}
var mobileHintRuntime = window.CoreMobileHintRuntime;
if (!mobileHintRuntime || typeof mobileHintRuntime.collectMobileHintTexts !== "function") {
  throw new Error("CoreMobileHintRuntime is required");
}
var mobileHintUiRuntime = window.CoreMobileHintUiRuntime;
if (
  !mobileHintUiRuntime ||
  typeof mobileHintUiRuntime.syncMobileHintTextBlockVisibility !== "function" ||
  typeof mobileHintUiRuntime.resolveMobileHintDisplayModel !== "function" ||
  typeof mobileHintUiRuntime.resolveMobileHintUiState !== "function"
) {
  throw new Error("CoreMobileHintUiRuntime is required");
}
var mobileHintModalRuntime = window.CoreMobileHintModalRuntime;
if (
  !mobileHintModalRuntime ||
  typeof mobileHintModalRuntime.ensureMobileHintModalDom !== "function"
) {
  throw new Error("CoreMobileHintModalRuntime is required");
}
var mobileHintOpenHostRuntime = window.CoreMobileHintOpenHostRuntime;
if (
  !mobileHintOpenHostRuntime ||
  typeof mobileHintOpenHostRuntime.applyMobileHintModalOpen !== "function"
) {
  throw new Error("CoreMobileHintOpenHostRuntime is required");
}
var mobileHintUiHostRuntime = window.CoreMobileHintUiHostRuntime;
if (
  !mobileHintUiHostRuntime ||
  typeof mobileHintUiHostRuntime.applyMobileHintUiSync !== "function"
) {
  throw new Error("CoreMobileHintUiHostRuntime is required");
}
var mobileHintHostRuntime = window.CoreMobileHintHostRuntime;
if (
  !mobileHintHostRuntime ||
  typeof mobileHintHostRuntime.applyMobileHintToggleInit !== "function"
) {
  throw new Error("CoreMobileHintHostRuntime is required");
}
var mobileTimerboxRuntime = window.CoreMobileTimerboxRuntime;
if (
  !mobileTimerboxRuntime ||
  typeof mobileTimerboxRuntime.resolveStoredMobileTimerboxCollapsed !== "function" ||
  typeof mobileTimerboxRuntime.persistMobileTimerboxCollapsed !== "function" ||
  typeof mobileTimerboxRuntime.getTimerboxToggleIconSvg !== "function" ||
  typeof mobileTimerboxRuntime.resolveMobileTimerboxCollapsedValue !== "function" ||
  typeof mobileTimerboxRuntime.resolveMobileTimerboxDisplayModel !== "function" ||
  typeof mobileTimerboxRuntime.resolveMobileTimerboxAppliedModel !== "function"
) {
  throw new Error("CoreMobileTimerboxRuntime is required");
}
var mobileTimerboxHostRuntime = window.CoreMobileTimerboxHostRuntime;
if (
  !mobileTimerboxHostRuntime ||
  typeof mobileTimerboxHostRuntime.applyMobileTimerboxToggleInit !== "function" ||
  typeof mobileTimerboxHostRuntime.applyMobileTimerboxUiSync !== "function"
) {
  throw new Error("CoreMobileTimerboxHostRuntime is required");
}
var mobileUndoTopRuntime = window.CoreMobileUndoTopRuntime;
if (
  !mobileUndoTopRuntime ||
  typeof mobileUndoTopRuntime.resolveMobileUndoTopButtonDisplayModel !== "function" ||
  typeof mobileUndoTopRuntime.resolveMobileUndoTopAppliedModel !== "function"
) {
  throw new Error("CoreMobileUndoTopRuntime is required");
}
var mobileUndoTopHostRuntime = window.CoreMobileUndoTopHostRuntime;
if (
  !mobileUndoTopHostRuntime ||
  typeof mobileUndoTopHostRuntime.applyMobileUndoTopInit !== "function"
) {
  throw new Error("CoreMobileUndoTopHostRuntime is required");
}
var mobileUndoTopAvailabilityHostRuntime = window.CoreMobileUndoTopAvailabilityHostRuntime;
if (
  !mobileUndoTopAvailabilityHostRuntime ||
  typeof mobileUndoTopAvailabilityHostRuntime.applyMobileUndoTopAvailabilitySync !== "function"
) {
  throw new Error("CoreMobileUndoTopAvailabilityHostRuntime is required");
}
var topActionsRuntime = window.CoreTopActionsRuntime;
if (
  !topActionsRuntime ||
  typeof topActionsRuntime.createGameTopActionsPlacementState !== "function" ||
  typeof topActionsRuntime.createPracticeTopActionsPlacementState !== "function" ||
  typeof topActionsRuntime.syncGameTopActionsPlacement !== "function" ||
  typeof topActionsRuntime.syncPracticeTopActionsPlacement !== "function"
) {
  throw new Error("CoreTopActionsRuntime is required");
}
var mobileTopButtonsRuntime = window.CoreMobileTopButtonsRuntime;
if (
  !mobileTopButtonsRuntime ||
  typeof mobileTopButtonsRuntime.ensureMobileUndoTopButtonDom !== "function" ||
  typeof mobileTopButtonsRuntime.ensureMobileHintToggleButtonDom !== "function"
) {
  throw new Error("CoreMobileTopButtonsRuntime is required");
}
var mobileViewportRuntime = window.CoreMobileViewportRuntime;
if (
  !mobileViewportRuntime ||
  typeof mobileViewportRuntime.isViewportAtMost !== "function" ||
  typeof mobileViewportRuntime.isCompactGameViewport !== "function" ||
  typeof mobileViewportRuntime.isTimerboxCollapseViewport !== "function" ||
  typeof mobileViewportRuntime.isMobileGameViewport !== "function" ||
  typeof mobileViewportRuntime.resolvePageScopeValue !== "function" ||
  typeof mobileViewportRuntime.isGamePageScope !== "function" ||
  typeof mobileViewportRuntime.isPracticePageScope !== "function" ||
  typeof mobileViewportRuntime.isTimerboxMobileScope !== "function"
) {
  throw new Error("CoreMobileViewportRuntime is required");
}
var storageRuntime = window.CoreStorageRuntime;
if (
  !storageRuntime ||
  typeof storageRuntime.resolveStorageByName !== "function" ||
  typeof storageRuntime.safeSetStorageItem !== "function" ||
  typeof storageRuntime.safeReadStorageItem !== "function"
) {
  throw new Error("CoreStorageRuntime is required");
}
var prettyTimeRuntime = window.CorePrettyTimeRuntime;
if (
  !prettyTimeRuntime ||
  typeof prettyTimeRuntime.formatPrettyTime !== "function"
) {
  throw new Error("CorePrettyTimeRuntime is required");
}
var responsiveRelayoutRuntime = window.CoreResponsiveRelayoutRuntime;
if (
  !responsiveRelayoutRuntime ||
  typeof responsiveRelayoutRuntime.resolveResponsiveRelayoutRequest !== "function" ||
  typeof responsiveRelayoutRuntime.applyResponsiveRelayout !== "function"
) {
  throw new Error("CoreResponsiveRelayoutRuntime is required");
}
var responsiveRelayoutHostRuntime = window.CoreResponsiveRelayoutHostRuntime;
if (
  !responsiveRelayoutHostRuntime ||
  typeof responsiveRelayoutHostRuntime.applyResponsiveRelayoutRequest !== "function"
) {
  throw new Error("CoreResponsiveRelayoutHostRuntime is required");
}
var topActionBindingsHostRuntime = window.CoreTopActionBindingsHostRuntime;
if (
  !topActionBindingsHostRuntime ||
  typeof topActionBindingsHostRuntime.applyTopActionBindings !== "function"
) {
  throw new Error("CoreTopActionBindingsHostRuntime is required");
}
var gameOverUndoHostRuntime = window.CoreGameOverUndoHostRuntime;
if (
  !gameOverUndoHostRuntime ||
  typeof gameOverUndoHostRuntime.bindGameOverUndoControl !== "function"
) {
  throw new Error("CoreGameOverUndoHostRuntime is required");
}
var indexUiStartupHostRuntime = window.CoreIndexUiStartupHostRuntime;
if (
  !indexUiStartupHostRuntime ||
  typeof indexUiStartupHostRuntime.applyIndexUiStartup !== "function"
) {
  throw new Error("CoreIndexUiStartupHostRuntime is required");
}
var homeGuideStartupHostRuntime = window.CoreHomeGuideStartupHostRuntime;
if (
  !homeGuideStartupHostRuntime ||
  typeof homeGuideStartupHostRuntime.applyHomeGuideAutoStart !== "function"
) {
  throw new Error("CoreHomeGuideStartupHostRuntime is required");
}
var homeGuideSettingsHostRuntime = window.CoreHomeGuideSettingsHostRuntime;
if (
  !homeGuideSettingsHostRuntime ||
  typeof homeGuideSettingsHostRuntime.applyHomeGuideSettingsUi !== "function"
) {
  throw new Error("CoreHomeGuideSettingsHostRuntime is required");
}
var homeGuideDomHostRuntime = window.CoreHomeGuideDomHostRuntime;
if (
  !homeGuideDomHostRuntime ||
  typeof homeGuideDomHostRuntime.applyHomeGuideDomEnsure !== "function"
) {
  throw new Error("CoreHomeGuideDomHostRuntime is required");
}
var homeGuideDoneNoticeHostRuntime = window.CoreHomeGuideDoneNoticeHostRuntime;
if (
  !homeGuideDoneNoticeHostRuntime ||
  typeof homeGuideDoneNoticeHostRuntime.applyHomeGuideDoneNotice !== "function"
) {
  throw new Error("CoreHomeGuideDoneNoticeHostRuntime is required");
}
var homeGuideHighlightHostRuntime = window.CoreHomeGuideHighlightHostRuntime;
if (
  !homeGuideHighlightHostRuntime ||
  typeof homeGuideHighlightHostRuntime.applyHomeGuideHighlightClear !== "function" ||
  typeof homeGuideHighlightHostRuntime.applyHomeGuideTargetElevation !== "function"
) {
  throw new Error("CoreHomeGuideHighlightHostRuntime is required");
}
var homeGuidePanelHostRuntime = window.CoreHomeGuidePanelHostRuntime;
if (
  !homeGuidePanelHostRuntime ||
  typeof homeGuidePanelHostRuntime.applyHomeGuidePanelPosition !== "function" ||
  typeof homeGuidePanelHostRuntime.resolveHomeGuideTargetVisibility !== "function"
) {
  throw new Error("CoreHomeGuidePanelHostRuntime is required");
}
var homeGuideFinishHostRuntime = window.CoreHomeGuideFinishHostRuntime;
if (
  !homeGuideFinishHostRuntime ||
  typeof homeGuideFinishHostRuntime.applyHomeGuideFinish !== "function"
) {
  throw new Error("CoreHomeGuideFinishHostRuntime is required");
}
var homeGuideStartHostRuntime = window.CoreHomeGuideStartHostRuntime;
if (
  !homeGuideStartHostRuntime ||
  typeof homeGuideStartHostRuntime.applyHomeGuideStart !== "function"
) {
  throw new Error("CoreHomeGuideStartHostRuntime is required");
}
var homeGuideControlsHostRuntime = window.CoreHomeGuideControlsHostRuntime;
if (
  !homeGuideControlsHostRuntime ||
  typeof homeGuideControlsHostRuntime.applyHomeGuideControls !== "function"
) {
  throw new Error("CoreHomeGuideControlsHostRuntime is required");
}
var homeGuideStepFlowHostRuntime = window.CoreHomeGuideStepFlowHostRuntime;
if (
  !homeGuideStepFlowHostRuntime ||
  typeof homeGuideStepFlowHostRuntime.applyHomeGuideStepFlow !== "function"
) {
  throw new Error("CoreHomeGuideStepFlowHostRuntime is required");
}
var homeGuideStepHostRuntime = window.CoreHomeGuideStepHostRuntime;
if (
  !homeGuideStepHostRuntime ||
  typeof homeGuideStepHostRuntime.applyHomeGuideStep !== "function" ||
  typeof homeGuideStepHostRuntime.applyHomeGuideStepOrchestration !== "function"
) {
  throw new Error("CoreHomeGuideStepHostRuntime is required");
}
var homeGuideStepViewHostRuntime = window.CoreHomeGuideStepViewHostRuntime;
if (
  !homeGuideStepViewHostRuntime ||
  typeof homeGuideStepViewHostRuntime.applyHomeGuideStepView !== "function"
) {
  throw new Error("CoreHomeGuideStepViewHostRuntime is required");
}

function tryUndoFromUi() {
  return !!undoActionRuntime.tryTriggerUndo(window.game_manager, -1);
}

function isGamePageScope() {
  return mobileViewportRuntime.isGamePageScope({
    bodyLike: document.body
  });
}

function isTimerboxMobileScope() {
  return mobileViewportRuntime.isTimerboxMobileScope({
    bodyLike: document.body
  });
}

function isPracticePageScope() {
  return mobileViewportRuntime.isPracticePageScope({
    bodyLike: document.body
  });
}

function isMobileGameViewport() {
  return mobileViewportRuntime.isMobileGameViewport({
    windowLike: typeof window !== "undefined" ? window : null,
    navigatorLike: typeof navigator !== "undefined" ? navigator : null,
    maxWidth: MOBILE_UI_MAX_WIDTH
  });
}

function isCompactGameViewport() {
  return mobileViewportRuntime.isCompactGameViewport({
    windowLike: typeof window !== "undefined" ? window : null,
    maxWidth: COMPACT_GAME_VIEWPORT_MAX_WIDTH
  });
}

function isTimerboxCollapseViewport() {
  return mobileViewportRuntime.isTimerboxCollapseViewport({
    windowLike: typeof window !== "undefined" ? window : null,
    maxWidth: TIMERBOX_COLLAPSE_MAX_WIDTH
  });
}

function ensureMobileTopActionsState() {
  if (!isGamePageScope()) return null;
  if (mobileTopActionsState) return mobileTopActionsState;

  mobileTopActionsState = topActionsRuntime.createGameTopActionsPlacementState({
    enabled: true,
    topActionButtons: document.querySelector(".top-action-buttons"),
    restartBtn: document.querySelector(".above-game .restart-button"),
    timerToggleBtn: document.getElementById("timerbox-toggle-btn"),
    createComment: function (text) {
      return document.createComment(text);
    }
  });
  return mobileTopActionsState;
}

function ensurePracticeTopActionsState() {
  if (!isPracticePageScope()) return null;
  if (practiceTopActionsState) return practiceTopActionsState;

  practiceTopActionsState = topActionsRuntime.createPracticeTopActionsPlacementState({
    enabled: true,
    topActionButtons: document.getElementById("practice-stats-actions"),
    restartBtn: document.querySelector(".above-game .restart-button"),
    createComment: function (text) {
      return document.createComment(text);
    }
  });
  return practiceTopActionsState;
}

function ensureMobileUndoTopButton() {
  return mobileTopButtonsRuntime.ensureMobileUndoTopButtonDom({
    isGamePageScope: isGamePageScope(),
    documentLike: document
  });
}

function ensureMobileHintToggleButton() {
  return mobileTopButtonsRuntime.ensureMobileHintToggleButtonDom({
    isGamePageScope: isGamePageScope(),
    documentLike: document
  });
}

function syncMobileTopActionsPlacement() {
  var state = ensureMobileTopActionsState();
  if (!state) return;
  topActionsRuntime.syncGameTopActionsPlacement({
    state: state,
    compactViewport: isCompactGameViewport()
  });
}

function syncPracticeTopActionsPlacement() {
  var state = ensurePracticeTopActionsState();
  if (!state) return;
  topActionsRuntime.syncPracticeTopActionsPlacement({
    state: state,
    compactViewport: isCompactGameViewport()
  });
}

function resolveUndoCapabilityState(gm) {
  return undoActionRuntime.resolveUndoCapabilityFromContext({
    bodyLike: document.body,
    manager: gm || null,
    globalModeConfig:
      typeof window !== "undefined" && window.GAME_MODE_CONFIG
        ? window.GAME_MODE_CONFIG
        : null
  });
}

function syncMobileUndoTopButtonAvailability() {
  mobileUndoTopAvailabilityHostRuntime.applyMobileUndoTopAvailabilitySync({
    isGamePageScope: isGamePageScope,
    ensureMobileUndoTopButton: ensureMobileUndoTopButton,
    isCompactGameViewport: isCompactGameViewport,
    manager: window.game_manager || null,
    resolveUndoCapabilityState: resolveUndoCapabilityState,
    undoActionRuntime: undoActionRuntime,
    mobileUndoTopRuntime: mobileUndoTopRuntime,
    fallbackLabel: "撤回"
  });
}

function ensureMobileHintModalDom() {
  return mobileHintModalRuntime.ensureMobileHintModalDom({
    isGamePageScope: isGamePageScope(),
    documentLike: document
  });
}

function openMobileHintModal() {
  mobileHintOpenHostRuntime.applyMobileHintModalOpen({
    isGamePageScope: isGamePageScope,
    isCompactGameViewport: isCompactGameViewport,
    ensureMobileHintModalDom: ensureMobileHintModalDom,
    mobileHintRuntime: mobileHintRuntime,
    documentLike: document,
    defaultText: "合并数字，合成 2048 方块。"
  });
}

function closeMobileHintModal() {
  var overlay = document.getElementById("mobile-hint-overlay");
  if (overlay) overlay.style.display = "none";
}

function syncMobileHintUI(options) {
  mobileHintUiHostRuntime.applyMobileHintUiSync({
    options: options || {},
    isGamePageScope: isGamePageScope,
    isCompactGameViewport: isCompactGameViewport,
    ensureMobileHintToggleButton: ensureMobileHintToggleButton,
    closeMobileHintModal: closeMobileHintModal,
    mobileHintUiRuntime: mobileHintUiRuntime,
    documentLike: document,
    collapsedClassName: "mobile-hint-collapsed-content",
    introHiddenClassName: "mobile-hint-hidden",
    introSelector: ".above-game .game-intro",
    containerSelector: ".container"
  });
}

function initMobileHintToggle() {
  mobileHintHostRuntime.applyMobileHintToggleInit({
    isGamePageScope: isGamePageScope,
    ensureMobileHintToggleButton: ensureMobileHintToggleButton,
    openMobileHintModal: openMobileHintModal,
    syncMobileHintUI: syncMobileHintUI
  });
}

function initMobileUndoTopButton() {
  mobileUndoTopHostRuntime.applyMobileUndoTopInit({
    isGamePageScope: isGamePageScope,
    ensureMobileUndoTopButton: ensureMobileUndoTopButton,
    tryUndoFromUi: tryUndoFromUi,
    syncMobileUndoTopButtonAvailability: syncMobileUndoTopButtonAvailability
  });
}

function readMobileTimerboxCollapsed() {
  var storage = getStorageByName("localStorage");
  return mobileTimerboxRuntime.resolveStoredMobileTimerboxCollapsed({
    storageLike: storage,
    storageKey: MOBILE_TIMERBOX_COLLAPSED_KEY,
    defaultCollapsed: true
  });
}

function writeMobileTimerboxCollapsed(collapsed) {
  var storage = getStorageByName("localStorage");
  mobileTimerboxRuntime.persistMobileTimerboxCollapsed({
    storageLike: storage,
    storageKey: MOBILE_TIMERBOX_COLLAPSED_KEY,
    collapsed: !!collapsed
  });
}

function getTimerboxToggleIconSvg(collapsed) {
  return mobileTimerboxRuntime.getTimerboxToggleIconSvg(!!collapsed);
}

function syncMobileTimerboxUI(options) {
  mobileTimerboxHostRuntime.applyMobileTimerboxUiSync({
    options: options || {},
    isTimerboxMobileScope: isTimerboxMobileScope,
    isTimerboxCollapseViewport: isTimerboxCollapseViewport,
    getElementById: function (id) {
      return document.getElementById(id);
    },
    readMobileTimerboxCollapsed: readMobileTimerboxCollapsed,
    writeMobileTimerboxCollapsed: writeMobileTimerboxCollapsed,
    mobileTimerboxRuntime: mobileTimerboxRuntime,
    getTimerboxToggleIconSvg: getTimerboxToggleIconSvg,
    hiddenClassName: "timerbox-hidden-mode",
    expandedClassName: "is-mobile-expanded",
    defaultCollapsed: true,
    fallbackHiddenToggleDisplay: "none",
    fallbackVisibleToggleDisplay: "inline-flex",
    fallbackHiddenAriaExpanded: "false",
    fallbackExpandLabel: "展开计时器",
    fallbackCollapseLabel: "收起计时器"
  });
}

function initMobileTimerboxToggle() {
  mobileTimerboxHostRuntime.applyMobileTimerboxToggleInit({
    isTimerboxMobileScope: isTimerboxMobileScope,
    getElementById: function (id) {
      return document.getElementById(id);
    },
    syncMobileTimerboxUI: syncMobileTimerboxUI,
    requestResponsiveGameRelayout: requestResponsiveGameRelayout,
    syncMobileTopActionsPlacement: syncMobileTopActionsPlacement,
    syncPracticeTopActionsPlacement: syncPracticeTopActionsPlacement,
    syncMobileUndoTopButtonAvailability: syncMobileUndoTopButtonAvailability
  });
}

function requestResponsiveGameRelayout() {
  var requestResult = responsiveRelayoutHostRuntime.applyResponsiveRelayoutRequest({
    responsiveRelayoutRuntime: responsiveRelayoutRuntime,
    isTimerboxMobileScope: isTimerboxMobileScope,
    existingTimer: mobileRelayoutTimer,
    delayMs: 120,
    clearTimeoutLike: clearTimeout,
    setTimeoutLike: setTimeout,
    syncMobileHintUI: syncMobileHintUI,
    syncMobileTopActionsPlacement: syncMobileTopActionsPlacement,
    syncPracticeTopActionsPlacement: syncPracticeTopActionsPlacement,
    syncMobileUndoTopButtonAvailability: syncMobileUndoTopButtonAvailability,
    syncMobileTimerboxUI: syncMobileTimerboxUI,
    manager: window.game_manager || null
  });
  mobileRelayoutTimer = requestResult && Object.prototype.hasOwnProperty.call(requestResult, "timerRef")
    ? requestResult.timerRef
    : mobileRelayoutTimer;
}

window.syncMobileTimerboxUI = syncMobileTimerboxUI;
window.syncMobileHintUI = syncMobileHintUI;
window.syncMobileUndoTopButtonAvailability = syncMobileUndoTopButtonAvailability;

function getStorageByName(name) {
  return storageRuntime.resolveStorageByName({
    windowLike: typeof window !== "undefined" ? window : null,
    storageName: name
  });
}

window.openPracticeBoardFromCurrent = function () {
  var localStore = getStorageByName("localStorage");
  var sessionStore = getStorageByName("sessionStorage");
  practiceTransferHostRuntime.applyPracticeTransferFromCurrent({
    manager: window.game_manager || null,
    gameModeConfig:
      window.GAME_MODE_CONFIG && typeof window.GAME_MODE_CONFIG === "object"
        ? window.GAME_MODE_CONFIG
        : null,
    practiceTransferRuntime: practiceTransferRuntime,
    localStorageLike: localStore,
    sessionStorageLike: sessionStore,
    guideShownKey: PRACTICE_GUIDE_SHOWN_KEY,
    guideSeenFlag: PRACTICE_GUIDE_SEEN_FLAG,
    localStorageKey: PRACTICE_TRANSFER_KEY,
    sessionStorageKey: PRACTICE_TRANSFER_SESSION_KEY,
    documentLike: document,
    windowLike: window,
    alertLike: alert
  });
};

// Pretty print time function (Legacy support just in case)
window.pretty = function(time) {
  return prettyTimeRuntime.formatPrettyTime(time);
};

function initThemeSettingsUI() {
  themeSettingsHostRuntime.applyThemeSettingsUi({
    documentLike: document,
    windowLike: typeof window !== "undefined" ? window : null,
    themeSettingsRuntime: themeSettingsRuntime,
    themeManager: typeof window !== "undefined" ? window.ThemeManager : null
  });
}


function removeLegacyUndoSettingsUI() {
  timerModuleSettingsHostRuntime.applyLegacyUndoSettingsCleanup({
    documentLike: document
  });
}

function ensureTimerModuleSettingsDom() {
  return timerModuleSettingsHostRuntime.ensureTimerModuleSettingsToggle({
    documentLike: document,
    timerModuleRuntime: timerModuleRuntime
  });
}

function initTimerModuleSettingsUI() {
  var toggle = ensureTimerModuleSettingsDom();
  var note = document.getElementById("timer-module-view-note");
  timerModuleSettingsHostRuntime.applyTimerModuleSettingsUi({
    toggle: toggle,
    noteElement: note,
    windowLike: window,
    timerModuleRuntime: timerModuleRuntime,
    retryDelayMs: 60,
    scheduleRetry: function (delayMs) {
      setTimeout(initTimerModuleSettingsUI, delayMs);
    },
    syncMobileTimerboxUi:
      typeof window.syncMobileTimerboxUI === "function" ? window.syncMobileTimerboxUI : null
  });
}

var HOME_GUIDE_SEEN_KEY = "home_guide_seen_v1";
var HOME_GUIDE_STATE = {
  active: false,
  fromSettings: false,
  index: 0,
  steps: [],
  target: null,
  elevated: [],
  panel: null,
  overlay: null
};

function isHomePage() {
  var path = homeGuideRuntime.resolveHomeGuidePathname({
    locationLike: typeof window !== "undefined" ? window.location : null
  });
  return !!homeGuideRuntime.isHomePagePath(path);
}

function getHomeGuideSteps() {
  return homeGuideRuntime.buildHomeGuideSteps({
    isCompactViewport: isCompactGameViewport()
  });
}

function ensureHomeGuideDom() {
  return homeGuideDomHostRuntime.applyHomeGuideDomEnsure({
    documentLike: document,
    homeGuideRuntime: homeGuideRuntime,
    homeGuideState: HOME_GUIDE_STATE
  });
}

function clearHomeGuideHighlight() {
  homeGuideHighlightHostRuntime.applyHomeGuideHighlightClear({
    documentLike: document,
    homeGuideState: HOME_GUIDE_STATE
  });
}

function elevateHomeGuideTarget(target) {
  homeGuideHighlightHostRuntime.applyHomeGuideTargetElevation({
    target: target || null,
    homeGuideRuntime: homeGuideRuntime,
    homeGuideState: HOME_GUIDE_STATE
  });
}

function positionHomeGuidePanel() {
  homeGuidePanelHostRuntime.applyHomeGuidePanelPosition({
    homeGuideState: HOME_GUIDE_STATE,
    homeGuideRuntime: homeGuideRuntime,
    mobileViewportRuntime: mobileViewportRuntime,
    windowLike: typeof window !== "undefined" ? window : null,
    mobileUiMaxWidth: MOBILE_UI_MAX_WIDTH,
    margin: 12,
    defaultPanelHeight: 160
  });
}

function isElementVisibleForGuide(node) {
  return homeGuidePanelHostRuntime.resolveHomeGuideTargetVisibility({
    homeGuideRuntime: homeGuideRuntime,
    windowLike: typeof window !== "undefined" ? window : null,
    node: node || null
  });
}

function showHomeGuideDoneNotice() {
  homeGuideDoneNoticeHostRuntime.applyHomeGuideDoneNotice({
    documentLike: document,
    homeGuideRuntime: homeGuideRuntime,
    setTimeoutLike: setTimeout,
    clearTimeoutLike: clearTimeout
  });
}

function finishHomeGuide(markSeen, options) {
  homeGuideFinishHostRuntime.applyHomeGuideFinish({
    homeGuideRuntime: homeGuideRuntime,
    homeGuideState: HOME_GUIDE_STATE,
    markSeen: markSeen,
    options: options || {},
    clearHomeGuideHighlight: clearHomeGuideHighlight,
    storageLike: getStorageByName("localStorage"),
    seenKey: HOME_GUIDE_SEEN_KEY,
    syncHomeGuideSettingsUI:
      typeof window.syncHomeGuideSettingsUI === "function"
        ? window.syncHomeGuideSettingsUI
        : null,
    showHomeGuideDoneNotice: showHomeGuideDoneNotice
  });
}

function showHomeGuideStep(index) {
  var stepResult = homeGuideStepHostRuntime.applyHomeGuideStepOrchestration({
    index: index,
    maxAdvanceLoops: 32,
    stepFlowHostRuntime: homeGuideStepFlowHostRuntime,
    stepViewHostRuntime: homeGuideStepViewHostRuntime,
    documentLike: document,
    windowLike: typeof window !== "undefined" ? window : null,
    homeGuideRuntime: homeGuideRuntime,
    homeGuideState: HOME_GUIDE_STATE,
    mobileViewportRuntime: mobileViewportRuntime,
    mobileUiMaxWidth: MOBILE_UI_MAX_WIDTH,
    isElementVisibleForGuide: isElementVisibleForGuide,
    clearHomeGuideHighlight: clearHomeGuideHighlight,
    elevateHomeGuideTarget: elevateHomeGuideTarget,
    finishHomeGuide: finishHomeGuide,
    positionHomeGuidePanel: positionHomeGuidePanel
  });
  if (stepResult.didAbort || stepResult.didFinish) return;
}

function startHomeGuide(options) {
  var startResult = homeGuideStartHostRuntime.applyHomeGuideStart({
    homeGuideRuntime: homeGuideRuntime,
    homeGuideState: HOME_GUIDE_STATE,
    options: options || {},
    isHomePage: isHomePage,
    getHomeGuideSteps: getHomeGuideSteps,
    ensureHomeGuideDom: ensureHomeGuideDom
  });
  if (!startResult.didStart) return;

  homeGuideControlsHostRuntime.applyHomeGuideControls({
    documentLike: document,
    homeGuideRuntime: homeGuideRuntime,
    homeGuideState: HOME_GUIDE_STATE,
    showHomeGuideStep: showHomeGuideStep,
    finishHomeGuide: finishHomeGuide,
    syncHomeGuideSettingsUI:
      typeof window.syncHomeGuideSettingsUI === "function"
        ? window.syncHomeGuideSettingsUI
        : null
  });
}

function initHomeGuideSettingsUI() {
  homeGuideSettingsHostRuntime.applyHomeGuideSettingsUi({
    documentLike: document,
    windowLike: window,
    homeGuideRuntime: homeGuideRuntime,
    homeGuideState: HOME_GUIDE_STATE,
    isHomePage: isHomePage,
    closeSettingsModal: window.closeSettingsModal,
    startHomeGuide: startHomeGuide
  });
}

function autoStartHomeGuideIfNeeded() {
  homeGuideStartupHostRuntime.applyHomeGuideAutoStart({
    homeGuideRuntime: homeGuideRuntime,
    locationLike: typeof window !== "undefined" ? window.location : null,
    storageLike: getStorageByName("localStorage"),
    seenKey: HOME_GUIDE_SEEN_KEY,
    startHomeGuide: startHomeGuide,
    setTimeoutLike: setTimeout,
    delayMs: 260
  });
}

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    indexUiStartupHostRuntime.applyIndexUiStartup({
      topActionBindingsHostRuntime: topActionBindingsHostRuntime,
      gameOverUndoHostRuntime: gameOverUndoHostRuntime,
      getElementById: function (id) {
        return document.getElementById(id);
      },
      windowLike: window,
      tryUndo: tryUndoFromUi,
      exportReplay: window.exportReplay,
      openPracticeBoardFromCurrent: window.openPracticeBoardFromCurrent,
      openSettingsModal: window.openSettingsModal,
      closeSettingsModal: window.closeSettingsModal,
      initThemeSettingsUI: initThemeSettingsUI,
      removeLegacyUndoSettingsUI: removeLegacyUndoSettingsUI,
      initTimerModuleSettingsUI: initTimerModuleSettingsUI,
      initMobileHintToggle: initMobileHintToggle,
      initMobileUndoTopButton: initMobileUndoTopButton,
      initHomeGuideSettingsUI: initHomeGuideSettingsUI,
      autoStartHomeGuideIfNeeded: autoStartHomeGuideIfNeeded,
      initMobileTimerboxToggle: initMobileTimerboxToggle,
      requestResponsiveGameRelayout: requestResponsiveGameRelayout,
      nowMs: function () {
        return Date.now();
      },
      touchGuardWindowMs: 450
    });
});

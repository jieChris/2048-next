// Logic extracted from index.html

var replayModalRuntime = window.CoreReplayModalRuntime;
var replayExportRuntime = window.CoreReplayExportRuntime;
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
  replayModalRuntime.applySettingsModalOpen({
    documentLike: document
  });
  removeLegacyUndoSettingsUI();
  initThemeSettingsUI();
  initTimerModuleSettingsUI();
  initHomeGuideSettingsUI();
};

window.closeSettingsModal = function () {
  replayModalRuntime.applySettingsModalClose({
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
  typeof mobileTimerboxHostRuntime.applyMobileTimerboxToggleInit !== "function"
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
  if (!isGamePageScope()) return;
  var btn = ensureMobileUndoTopButton();
  if (!btn) return;

  var compact = isCompactGameViewport();
  var gm = window.game_manager;
  var undoCapabilityState = resolveUndoCapabilityState(gm);
  var modeUndoCapable = !!(undoCapabilityState && undoCapabilityState.modeUndoCapable);
  var canUndoNow = !!undoActionRuntime.isUndoInteractionEnabled(gm);
  var displayModel = mobileUndoTopRuntime.resolveMobileUndoTopButtonDisplayModel({
    compactViewport: compact,
    modeUndoCapable: modeUndoCapable,
    canUndoNow: canUndoNow,
    label: "撤回"
  });
  var appliedModel = mobileUndoTopRuntime.resolveMobileUndoTopAppliedModel({
    displayModel: displayModel,
    fallbackLabel: "撤回"
  });

  btn.style.display = appliedModel.buttonDisplay;
  btn.style.pointerEvents = appliedModel.pointerEvents;
  btn.style.opacity = appliedModel.opacity;
  btn.setAttribute("aria-disabled", appliedModel.ariaDisabled);
  if (!appliedModel.shouldApplyLabel) {
    return;
  }
  var label = appliedModel.label;
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
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
  options = options || {};
  if (!isGamePageScope()) return;

  var body = document.body;
  var intro = document.querySelector(".above-game .game-intro");
  if (!body) return;

  var compact = isCompactGameViewport();
  mobileHintUiRuntime.syncMobileHintTextBlockVisibility({
    isGamePageScope: true,
    containerNode: document.querySelector(".container"),
    hidden: compact
  });
  if (intro) {
    intro.classList.toggle("mobile-hint-hidden", compact);
  }

  var btn = ensureMobileHintToggleButton();
  if (!btn) return;
  var displayModel = mobileHintUiRuntime.resolveMobileHintDisplayModel(compact);
  var uiState = mobileHintUiRuntime.resolveMobileHintUiState({
    displayModel: displayModel,
    collapsedClassName: "mobile-hint-collapsed-content"
  });

  if (uiState.collapsedContentEnabled) {
    body.classList.add(uiState.collapsedClassName);
  } else {
    body.classList.remove(uiState.collapsedClassName);
  }
  btn.style.display = uiState.buttonDisplay;

  if (uiState.shouldCloseModal) {
    closeMobileHintModal();
    return;
  }

  var label = uiState.buttonLabel;
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
  btn.setAttribute("aria-expanded", uiState.buttonAriaExpanded);
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
  options = options || {};
  if (!isTimerboxMobileScope()) return;

  var timerBox = document.getElementById("timerbox");
  var toggleBtn = document.getElementById("timerbox-toggle-btn");
  if (!timerBox || !toggleBtn) return;

  var timerModuleHidden = timerBox.classList.contains("timerbox-hidden-mode");
  var collapsible = isTimerboxCollapseViewport();
  if (!collapsible || timerModuleHidden) {
    var hiddenModel = mobileTimerboxRuntime.resolveMobileTimerboxDisplayModel({
      collapsible: false,
      timerModuleHidden: timerModuleHidden,
      collapsed: true
    });
    var hiddenAppliedModel = mobileTimerboxRuntime.resolveMobileTimerboxAppliedModel({
      displayModel: hiddenModel,
      collapsed: true,
      fallbackToggleDisplay: "none",
      fallbackAriaExpanded: "false",
      fallbackLabel: "展开计时器",
      fallbackIconSvg: getTimerboxToggleIconSvg(true)
    });
    toggleBtn.style.display = hiddenAppliedModel.toggleDisplay;
    toggleBtn.setAttribute("aria-expanded", hiddenAppliedModel.ariaExpanded);
    timerBox.classList.remove("is-mobile-expanded");
    return;
  }

  var collapsed = mobileTimerboxRuntime.resolveMobileTimerboxCollapsedValue({
    collapsedOption: typeof options.collapsed === "boolean" ? options.collapsed : null,
    storedCollapsed: readMobileTimerboxCollapsed(),
    defaultCollapsed: true
  });
  var displayModel = mobileTimerboxRuntime.resolveMobileTimerboxDisplayModel({
    collapsible: true,
    timerModuleHidden: false,
    collapsed: collapsed
  });
  var appliedModel = mobileTimerboxRuntime.resolveMobileTimerboxAppliedModel({
    displayModel: displayModel,
    collapsed: collapsed,
    fallbackToggleDisplay: "inline-flex",
    fallbackAriaExpanded: collapsed ? "false" : "true",
    fallbackLabel: collapsed ? "展开计时器" : "收起计时器",
    fallbackIconSvg: getTimerboxToggleIconSvg(collapsed)
  });
  toggleBtn.style.display = appliedModel.toggleDisplay;
  timerBox.classList.toggle("is-mobile-expanded", appliedModel.expanded);
  var label = appliedModel.label;
  toggleBtn.setAttribute("aria-expanded", appliedModel.ariaExpanded);
  toggleBtn.setAttribute("aria-label", label);
  toggleBtn.setAttribute("title", label);
  toggleBtn.innerHTML = appliedModel.iconSvg;
  if (options.persist) {
    writeMobileTimerboxCollapsed(collapsed);
  }
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
  var requestState = responsiveRelayoutRuntime.resolveResponsiveRelayoutRequest({
    isTimerboxMobileScope: isTimerboxMobileScope(),
    hasExistingTimer: !!mobileRelayoutTimer,
    delayMs: 120
  });
  if (!requestState.shouldSchedule) return;
  if (requestState.shouldClearExistingTimer && mobileRelayoutTimer) {
    clearTimeout(mobileRelayoutTimer);
  }
  mobileRelayoutTimer = setTimeout(function () {
    responsiveRelayoutRuntime.applyResponsiveRelayout({
      syncMobileHintUI: syncMobileHintUI,
      syncMobileTopActionsPlacement: syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement: syncPracticeTopActionsPlacement,
      syncMobileUndoTopButtonAvailability: syncMobileUndoTopButtonAvailability,
      syncMobileTimerboxUI: syncMobileTimerboxUI,
      manager: window.game_manager || null
    });
  }, requestState.delayMs);
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

function formatPreviewValue(value) {
  return themeSettingsRuntime.formatThemePreviewValue(value);
}

function initThemeSettingsUI() {
  var originalSelect = document.getElementById("theme-select");
  var previewRoot = document.getElementById("theme-preview-grid");
  var customTrigger = document.getElementById("theme-select-trigger");
  var customOptionsContainer = document.getElementById("theme-select-options");
  var customSelect = document.querySelector(".custom-select");

  if (!originalSelect || !previewRoot || !window.ThemeManager || !customTrigger || !customOptionsContainer || !customSelect) return;

  var themes = themeSettingsRuntime.resolveThemeOptions({
    themes: window.ThemeManager.getThemes()
  });
  var confirmedTheme = window.ThemeManager.getCurrentTheme();
  var previewLayout = themeSettingsRuntime.resolveThemePreviewLayout();

  function ensurePreviewStyleTag() {
    var style = document.getElementById("theme-preview-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "theme-preview-style";
      document.head.appendChild(style);
    }
    return style;
  }

  function ensureDualPreviewGrids() {
    if (previewRoot.__dualPreviewRefs) return previewRoot.__dualPreviewRefs;
    previewRoot.className = previewLayout.containerClassName;
    previewRoot.innerHTML = previewLayout.innerHtml;
    previewRoot.__dualPreviewRefs = {
      pow2: document.getElementById(previewLayout.pow2GridId),
      fib: document.getElementById(previewLayout.fibonacciGridId)
    };
    return previewRoot.__dualPreviewRefs;
  }

  function renderPreviewGrid(gridEl, values) {
    if (!gridEl) return;
    gridEl.innerHTML = "";
    for (var i = 0; i < values.length; i++) {
      var value = values[i];
      var tile = document.createElement("div");
      tile.className = "theme-preview-tile theme-color-" + value;
      tile.textContent = formatPreviewValue(value);
      gridEl.appendChild(tile);
    }
  }

  function renderDualPreviewGrids() {
    var refs = ensureDualPreviewGrids();
    var previewValues = themeSettingsRuntime.resolveThemePreviewTileValues({
      getTileValues: window.ThemeManager && typeof window.ThemeManager.getTileValues === "function"
        ? function (ruleset) {
            return window.ThemeManager.getTileValues(ruleset);
          }
        : null
    });
    var pow2Values = previewValues.pow2Values;
    var fibValues = previewValues.fibonacciValues;
    renderPreviewGrid(refs.pow2, pow2Values);
    renderPreviewGrid(refs.fib, fibValues);
  }

  function getPreviewCss(themeId) {
    if (!window.ThemeManager.getPreviewCss) return "";
    var cssSelectors = themeSettingsRuntime.resolveThemePreviewCssSelectors({
      previewLayout: previewLayout,
      fallbackPow2Selector: "#theme-preview-grid-pow2",
      fallbackFibonacciSelector: "#theme-preview-grid-fib"
    });
    return window.ThemeManager.getPreviewCss(themeId, {
      pow2Selector: cssSelectors.pow2Selector,
      fibSelector: cssSelectors.fibSelector
    });
  }

  function applyPreviewTheme(themeId) {
    var style = ensurePreviewStyleTag();
    style.textContent = getPreviewCss(themeId);
  }

  if (customOptionsContainer.children.length === 0) {
    customOptionsContainer.innerHTML = "";
    themes.forEach(function(theme) {
      var option = document.createElement("div");
      option.className = "custom-option";
      option.textContent = theme.label;
      option.dataset.value = theme.id;
      option.addEventListener("click", function(e) {
        e.stopPropagation();
        var value = this.dataset.value;
        confirmedTheme = value;
        window.ThemeManager.applyTheme(value);
        applyPreviewTheme(value);
        closeDropdown();
      });
      option.addEventListener("mouseenter", function() {
        applyPreviewTheme(this.dataset.value);
      });
      customOptionsContainer.appendChild(option);
    });
  }

  function toggleDropdown(e) {
    if (e) e.stopPropagation();
    var isOpen = customSelect.classList.contains("open");
    var toggleState = themeSettingsRuntime.resolveThemeDropdownToggleState({
      isOpen: isOpen
    });
    if (!toggleState.shouldOpen) {
      closeDropdown();
    } else {
      confirmedTheme = window.ThemeManager.getCurrentTheme();
      customSelect.classList.add("open");
      var selected = customOptionsContainer.querySelector(".custom-option.selected");
      if (selected) {
        customOptionsContainer.scrollTop = selected.offsetTop - customOptionsContainer.offsetTop;
      }
    }
  }

  function closeDropdown() {
    customSelect.classList.remove("open");
    applyPreviewTheme(confirmedTheme);
  }

  var triggerBindingState = themeSettingsRuntime.resolveThemeBindingState({
    alreadyBound: !!customTrigger.__bound
  });
  if (triggerBindingState.shouldBind) {
    customTrigger.addEventListener("click", toggleDropdown);
    customTrigger.__bound = triggerBindingState.boundValue;
  }

  var outsideBindingState = themeSettingsRuntime.resolveThemeBindingState({
    alreadyBound: !!window.__clickOutsideBound
  });
  if (outsideBindingState.shouldBind) {
    document.addEventListener("click", function(e) {
      if (!customSelect.contains(e.target)) {
        closeDropdown();
      }
    });
    window.__clickOutsideBound = outsideBindingState.boundValue;
  }

  var leaveBindingState = themeSettingsRuntime.resolveThemeBindingState({
    alreadyBound: !!customSelect.__mouseleaveBound
  });
  if (leaveBindingState.shouldBind) {
    customSelect.addEventListener("mouseleave", function() {
      if (customSelect.classList.contains("open")) {
        applyPreviewTheme(confirmedTheme);
      }
    });
    customSelect.__mouseleaveBound = leaveBindingState.boundValue;
  }

  function updateCustomSelectUI() {
    var currentThemeId = window.ThemeManager.getCurrentTheme();
    var label = themeSettingsRuntime.resolveThemeSelectLabel({
      themes: themes,
      currentThemeId: currentThemeId,
      fallbackLabel: "选择主题"
    });
    var triggerText = customTrigger.querySelector("span");
    if (triggerText) triggerText.textContent = label;
    var options = customOptionsContainer.querySelectorAll(".custom-option");
    options.forEach(function(opt) {
      var optionValue = themeSettingsRuntime.resolveThemeOptionValue({
        optionLike: opt
      });
      var isSelected = themeSettingsRuntime.resolveThemeOptionSelectedState({
        optionValue: optionValue,
        currentThemeId: currentThemeId
      });
      if (isSelected) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });
  }

  renderDualPreviewGrids();
  updateCustomSelectUI();
  applyPreviewTheme(confirmedTheme);

  var changeSyncBindingState = themeSettingsRuntime.resolveThemeBindingState({
    alreadyBound: !!window.__themeChangeSyncBound
  });
  if (changeSyncBindingState.shouldBind) {
    window.__themeChangeSyncBound = changeSyncBindingState.boundValue;
    window.addEventListener("themechange", function () {
      confirmedTheme = window.ThemeManager.getCurrentTheme();
      updateCustomSelectUI();
      applyPreviewTheme(confirmedTheme);
    });
  }
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

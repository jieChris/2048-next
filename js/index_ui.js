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
var mobileUndoTopRuntime = window.CoreMobileUndoTopRuntime;
if (
  !mobileUndoTopRuntime ||
  typeof mobileUndoTopRuntime.resolveMobileUndoTopButtonDisplayModel !== "function" ||
  typeof mobileUndoTopRuntime.resolveMobileUndoTopAppliedModel !== "function"
) {
  throw new Error("CoreMobileUndoTopRuntime is required");
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
  if (!isGamePageScope() || !isCompactGameViewport()) return;
  var dom = ensureMobileHintModalDom();
  if (!dom || !dom.overlay || !dom.body) return;

  var lines = mobileHintRuntime.collectMobileHintTexts({
    isGamePageScope: isGamePageScope(),
    introNode: document.querySelector(".above-game .game-intro"),
    containerNode: document.querySelector(".container"),
    explainNode: document.querySelector(".game-explanation"),
    defaultText: "合并数字，合成 2048 方块。"
  });
  dom.body.innerHTML = "";
  for (var i = 0; i < lines.length; i++) {
    var p = document.createElement("p");
    p.textContent = lines[i];
    dom.body.appendChild(p);
  }
  dom.overlay.style.display = "flex";
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
  if (!isGamePageScope()) return;
  var btn = ensureMobileHintToggleButton();
  if (!btn) return;

  if (!btn.__mobileHintBound) {
    btn.__mobileHintBound = true;
    btn.addEventListener("click", function (e) {
      if (e) e.preventDefault();
      openMobileHintModal();
    });
  }
  syncMobileHintUI();
}

function initMobileUndoTopButton() {
  if (!isGamePageScope()) return;
  var btn = ensureMobileUndoTopButton();
  if (!btn) return;
  if (!btn.__mobileUndoBound) {
    btn.__mobileUndoBound = true;
    btn.addEventListener("click", function (e) {
      if (e) e.preventDefault();
      tryUndoFromUi();
    });
  }
  syncMobileUndoTopButtonAvailability();
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
  if (!isTimerboxMobileScope()) return;
  var toggleBtn = document.getElementById("timerbox-toggle-btn");
  var timerBox = document.getElementById("timerbox");
  if (!toggleBtn || !timerBox) return;
  if (!toggleBtn.__mobileTimerboxBound) {
    toggleBtn.__mobileTimerboxBound = true;
    toggleBtn.addEventListener("click", function (e) {
      if (e) e.preventDefault();
      var collapsed = timerBox.classList.contains("is-mobile-expanded");
      syncMobileTimerboxUI({ collapsed: collapsed, persist: true });
      requestResponsiveGameRelayout();
    });
  }
  syncMobileTopActionsPlacement();
  syncPracticeTopActionsPlacement();
  syncMobileUndoTopButtonAvailability();
  syncMobileTimerboxUI();
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
  var toggle = document.getElementById("undo-enabled-toggle");
  if (!toggle) return;
  var row = toggle.closest(".settings-row");
  if (row && row.parentNode) {
    row.parentNode.removeChild(row);
  } else {
    toggle.style.display = "none";
  }
}

function ensureTimerModuleSettingsDom() {
  var modal = document.getElementById("settings-modal");
  if (!modal) return null;
  if (document.getElementById("timer-module-view-toggle")) {
    return document.getElementById("timer-module-view-toggle");
  }
  var content = modal.querySelector(".settings-modal-content");
  if (!content) return null;

  var row = document.createElement("div");
  row.className = "settings-row";
  row.innerHTML = timerModuleRuntime.buildTimerModuleSettingsRowInnerHtml();

  var actions = content.querySelector(".replay-modal-actions");
  if (actions && actions.parentNode === content) {
    content.insertBefore(row, actions);
  } else {
    content.appendChild(row);
  }
  return document.getElementById("timer-module-view-toggle");
}

function initTimerModuleSettingsUI() {
  var toggle = ensureTimerModuleSettingsDom();
  var note = document.getElementById("timer-module-view-note");
  var retryState = timerModuleRuntime.resolveTimerModuleInitRetryState({
    hasToggle: !!toggle,
    hasManager: !!window.game_manager,
    retryDelayMs: 60
  });
  if (!toggle) return;
  if (retryState.shouldRetry) {
    setTimeout(initTimerModuleSettingsUI, retryState.retryDelayMs);
    return;
  }

  function sync() {
    var gm = window.game_manager;
    if (!gm) return;
    var view = timerModuleRuntime.resolveTimerModuleCurrentViewMode({
      manager: gm,
      fallbackViewMode: "timer"
    });
    var settingsState = timerModuleRuntime.resolveTimerModuleSettingsState({
      viewMode: view
    });
    toggle.disabled = settingsState.toggleDisabled;
    toggle.checked = settingsState.toggleChecked;
    if (note) {
      note.textContent = settingsState.noteText;
    }
    if (typeof window.syncMobileTimerboxUI === "function") {
      window.syncMobileTimerboxUI();
    }
  }
  window.syncTimerModuleSettingsUI = sync;

  var timerBindingState = timerModuleRuntime.resolveTimerModuleBindingState({
    alreadyBound: !!toggle.__timerViewBound
  });
  if (timerBindingState.shouldBind) {
    toggle.__timerViewBound = timerBindingState.boundValue;
    toggle.addEventListener("change", function () {
      if (!window.game_manager || !window.game_manager.setTimerModuleViewMode) return;
      var nextViewMode = timerModuleRuntime.resolveTimerModuleViewMode({
        checked: !!this.checked
      });
      var appliedViewMode = timerModuleRuntime.resolveTimerModuleAppliedViewMode({
        nextViewMode: nextViewMode,
        checked: !!this.checked
      });
      window.game_manager.setTimerModuleViewMode(
        appliedViewMode
      );
      sync();
    });
  }

  sync();
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
  var overlay = document.getElementById("home-guide-overlay");
  var panel = document.getElementById("home-guide-panel");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "home-guide-overlay";
    overlay.className = "home-guide-overlay";
    overlay.style.display = "none";
    document.body.appendChild(overlay);
  }
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "home-guide-panel";
    panel.className = "home-guide-panel";
    panel.style.display = "none";
    panel.innerHTML = homeGuideRuntime.buildHomeGuidePanelInnerHtml();
    document.body.appendChild(panel);
  }
  HOME_GUIDE_STATE.overlay = overlay;
  HOME_GUIDE_STATE.panel = panel;
  return { overlay: overlay, panel: panel };
}

function clearHomeGuideHighlight() {
  if (HOME_GUIDE_STATE.target && HOME_GUIDE_STATE.target.classList) {
    HOME_GUIDE_STATE.target.classList.remove("home-guide-highlight");
  }
  var scoped = document.querySelectorAll(".home-guide-scope");
  for (var s = 0; s < scoped.length; s++) {
    scoped[s].classList.remove("home-guide-scope");
  }
  if (Array.isArray(HOME_GUIDE_STATE.elevated)) {
    for (var i = 0; i < HOME_GUIDE_STATE.elevated.length; i++) {
      var node = HOME_GUIDE_STATE.elevated[i];
      if (node && node.classList) node.classList.remove("home-guide-elevated");
    }
  }
  HOME_GUIDE_STATE.elevated = [];
  HOME_GUIDE_STATE.target = null;
}

function elevateHomeGuideTarget(target) {
  if (!target || !target.closest) return;
  var elevated = [];
  var topActionButtons = target.closest(".top-action-buttons");
  var headingHost = target.closest(".heading");
  var elevationPlan = homeGuideRuntime.resolveHomeGuideElevationPlan({
    hasTopActionButtonsAncestor: !!topActionButtons,
    hasHeadingAncestor: !!headingHost
  });
  var stackHost = null;
  if (elevationPlan && elevationPlan.hostSelector === ".top-action-buttons") {
    stackHost = topActionButtons;
  } else if (elevationPlan && elevationPlan.hostSelector === ".heading") {
    stackHost = headingHost;
  }
  if (stackHost && stackHost.classList) {
    stackHost.classList.add("home-guide-elevated");
    elevated.push(stackHost);
  }
  if (
    elevationPlan &&
    elevationPlan.shouldScopeTopActions &&
    topActionButtons &&
    topActionButtons.classList
  ) {
    topActionButtons.classList.add("home-guide-scope");
  }
  HOME_GUIDE_STATE.elevated = elevated;
}

function positionHomeGuidePanel() {
  var panel = HOME_GUIDE_STATE.panel;
  var target = HOME_GUIDE_STATE.target;
  if (!panel || !target) return;

  var rect = target.getBoundingClientRect();
  var margin = 12;
  var mobileLayout = mobileViewportRuntime.isViewportAtMost({
    windowLike: window,
    maxWidth: MOBILE_UI_MAX_WIDTH
  });
  var initialLayout = homeGuideRuntime.resolveHomeGuidePanelLayout({
    targetRect: rect,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    panelHeight: 160,
    margin: margin,
    mobileLayout: mobileLayout
  });
  panel.style.maxWidth = initialLayout.panelWidth + "px";
  panel.style.width = initialLayout.panelWidth + "px";
  var panelHeight = panel.offsetHeight || 160;
  var layout = homeGuideRuntime.resolveHomeGuidePanelLayout({
    targetRect: rect,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    panelHeight: panelHeight,
    margin: margin,
    mobileLayout: mobileLayout
  });
  panel.style.maxWidth = layout.panelWidth + "px";
  panel.style.width = layout.panelWidth + "px";
  panel.style.top = layout.top + "px";
  panel.style.left = layout.left + "px";
}

function isElementVisibleForGuide(node) {
  return homeGuideRuntime.isHomeGuideTargetVisible({
    nodeLike: node || null,
    getComputedStyle:
      typeof window !== "undefined" && typeof window.getComputedStyle === "function"
        ? function (el) {
            return window.getComputedStyle(el);
          }
        : null
  });
}

function showHomeGuideDoneNotice() {
  var doneNotice = homeGuideRuntime.resolveHomeGuideDoneNotice({});
  var toast = document.getElementById("home-guide-done-toast");
  if (!toast) {
    var toastStyle = homeGuideRuntime.resolveHomeGuideDoneNoticeStyle();
    toast = document.createElement("div");
    toast.id = "home-guide-done-toast";
    for (var key in toastStyle) {
      if (!Object.prototype.hasOwnProperty.call(toastStyle, key)) continue;
      toast.style[key] = toastStyle[key];
    }
    document.body.appendChild(toast);
  }
  toast.textContent = doneNotice.message;
  toast.style.opacity = "1";
  if (toast.__hideTimer) clearTimeout(toast.__hideTimer);
  toast.__hideTimer = setTimeout(function () {
    toast.style.opacity = "0";
  }, doneNotice.hideDelayMs);
}

function finishHomeGuide(markSeen, options) {
  options = options || {};
  clearHomeGuideHighlight();
  var lifecycleState = homeGuideRuntime.resolveHomeGuideLifecycleState({
    action: "finish"
  });
  var sessionState = homeGuideRuntime.resolveHomeGuideSessionState({
    lifecycleState: lifecycleState
  });
  HOME_GUIDE_STATE.active = sessionState.active;
  HOME_GUIDE_STATE.steps = sessionState.steps;
  HOME_GUIDE_STATE.index = sessionState.index;
  HOME_GUIDE_STATE.fromSettings = sessionState.fromSettings;
  var layerDisplayState = homeGuideRuntime.resolveHomeGuideLayerDisplayState({
    active: HOME_GUIDE_STATE.active
  });
  if (HOME_GUIDE_STATE.overlay) {
    HOME_GUIDE_STATE.overlay.style.display = layerDisplayState.overlayDisplay;
  }
  if (HOME_GUIDE_STATE.panel) {
    HOME_GUIDE_STATE.panel.style.display = layerDisplayState.panelDisplay;
  }
  if (markSeen) {
    homeGuideRuntime.markHomeGuideSeen({
      storageLike: getStorageByName("localStorage"),
      seenKey: HOME_GUIDE_SEEN_KEY
    });
  }
  if (typeof window.syncHomeGuideSettingsUI === "function") {
    window.syncHomeGuideSettingsUI();
  }
  if (options.showDoneNotice) {
    showHomeGuideDoneNotice();
  }
}

function showHomeGuideStep(index) {
  var stepIndexState = homeGuideRuntime.resolveHomeGuideStepIndexState({
    isActive: HOME_GUIDE_STATE.active,
    stepCount: HOME_GUIDE_STATE.steps.length,
    stepIndex: index
  });
  if (stepIndexState.shouldAbort) return;
  if (stepIndexState.shouldFinish) {
    var finishState = homeGuideRuntime.resolveHomeGuideFinishState({
      reason: "completed"
    });
    finishHomeGuide(finishState.markSeen, {
      showDoneNotice: finishState.showDoneNotice
    });
    return;
  }
  index = stepIndexState.resolvedIndex;
  HOME_GUIDE_STATE.index = index;
  clearHomeGuideHighlight();

  var step = HOME_GUIDE_STATE.steps[index];
  var target = document.querySelector(step.selector);
  var targetVisible = !!(target && isElementVisibleForGuide(target));
  var stepTargetState = homeGuideRuntime.resolveHomeGuideStepTargetState({
    hasTarget: !!target,
    targetVisible: targetVisible,
    stepIndex: index
  });
  if (stepTargetState.shouldAdvance) {
    showHomeGuideStep(stepTargetState.nextIndex);
    return;
  }
  if (!target || !targetVisible) {
    showHomeGuideStep(index + 1);
    return;
  }
  HOME_GUIDE_STATE.target = target;
  var targetScrollState = homeGuideRuntime.resolveHomeGuideTargetScrollState({
    isCompactViewport: mobileViewportRuntime.isViewportAtMost({
      windowLike: window,
      maxWidth: MOBILE_UI_MAX_WIDTH
    }),
    canScrollIntoView: !!target.scrollIntoView
  });
  if (targetScrollState.shouldScroll && target.scrollIntoView) {
    target.scrollIntoView({
      block: targetScrollState.block,
      inline: targetScrollState.inline,
      behavior: targetScrollState.behavior
    });
  }
  target.classList.add("home-guide-highlight");
  elevateHomeGuideTarget(target);

  var stepEl = document.getElementById("home-guide-step");
  var titleEl = document.getElementById("home-guide-title");
  var descEl = document.getElementById("home-guide-desc");
  var prevBtn = document.getElementById("home-guide-prev");
  var nextBtn = document.getElementById("home-guide-next");
  var stepRenderState = homeGuideRuntime.resolveHomeGuideStepRenderState({
    step: step || null,
    stepIndex: index,
    stepCount: HOME_GUIDE_STATE.steps.length
  });

  if (stepEl) stepEl.textContent = stepRenderState.stepText;
  if (titleEl) titleEl.textContent = stepRenderState.titleText;
  if (descEl) descEl.textContent = stepRenderState.descText;
  if (prevBtn) prevBtn.disabled = stepRenderState.prevDisabled;
  if (nextBtn) nextBtn.textContent = stepRenderState.nextText;

  window.requestAnimationFrame(positionHomeGuidePanel);
}

function startHomeGuide(options) {
  options = options || {};
  if (!isHomePage()) return;

  var dom = ensureHomeGuideDom();
  var lifecycleState = homeGuideRuntime.resolveHomeGuideLifecycleState({
    action: "start",
    fromSettings: !!options.fromSettings,
    steps: getHomeGuideSteps()
  });
  var sessionState = homeGuideRuntime.resolveHomeGuideSessionState({
    lifecycleState: lifecycleState
  });
  HOME_GUIDE_STATE.active = sessionState.active;
  HOME_GUIDE_STATE.fromSettings = sessionState.fromSettings;
  HOME_GUIDE_STATE.steps = sessionState.steps;
  HOME_GUIDE_STATE.index = sessionState.index;

  var layerDisplayState = homeGuideRuntime.resolveHomeGuideLayerDisplayState({
    active: HOME_GUIDE_STATE.active
  });
  dom.overlay.style.display = layerDisplayState.overlayDisplay;
  dom.panel.style.display = layerDisplayState.panelDisplay;

  var prevBtn = document.getElementById("home-guide-prev");
  var nextBtn = document.getElementById("home-guide-next");
  var skipBtn = document.getElementById("home-guide-skip");

  if (prevBtn) {
    var prevBindingState = homeGuideRuntime.resolveHomeGuideBindingState({
      alreadyBound: !!prevBtn.__homeGuideBound
    });
    if (prevBindingState.shouldBind) {
      prevBtn.__homeGuideBound = prevBindingState.boundValue;
      prevBtn.addEventListener("click", function () {
        var actionState = homeGuideRuntime.resolveHomeGuideControlAction({
          action: "prev",
          stepIndex: HOME_GUIDE_STATE.index
        });
        showHomeGuideStep(actionState.nextStepIndex);
      });
    }
  }
  if (nextBtn) {
    var nextBindingState = homeGuideRuntime.resolveHomeGuideBindingState({
      alreadyBound: !!nextBtn.__homeGuideBound
    });
    if (nextBindingState.shouldBind) {
      nextBtn.__homeGuideBound = nextBindingState.boundValue;
      nextBtn.addEventListener("click", function () {
        var actionState = homeGuideRuntime.resolveHomeGuideControlAction({
          action: "next",
          stepIndex: HOME_GUIDE_STATE.index
        });
        showHomeGuideStep(actionState.nextStepIndex);
      });
    }
  }
  if (skipBtn) {
    var skipBindingState = homeGuideRuntime.resolveHomeGuideBindingState({
      alreadyBound: !!skipBtn.__homeGuideBound
    });
    if (skipBindingState.shouldBind) {
      skipBtn.__homeGuideBound = skipBindingState.boundValue;
      skipBtn.addEventListener("click", function () {
        var actionState = homeGuideRuntime.resolveHomeGuideControlAction({
          action: "skip",
          stepIndex: HOME_GUIDE_STATE.index
        });
        var finishReason = actionState.finishReason;
        var finishState = homeGuideRuntime.resolveHomeGuideFinishState({
          reason: finishReason
        });
        finishHomeGuide(finishState.markSeen, {
          showDoneNotice: finishState.showDoneNotice
        });
      });
    }
  }

  showHomeGuideStep(0);
  if (typeof window.syncHomeGuideSettingsUI === "function") {
    window.syncHomeGuideSettingsUI();
  }
}

function ensureHomeGuideSettingsDom() {
  var modal = document.getElementById("settings-modal");
  if (!modal) return null;
  if (document.getElementById("home-guide-toggle")) {
    return document.getElementById("home-guide-toggle");
  }
  var content = modal.querySelector(".settings-modal-content");
  if (!content) return null;

  var row = document.createElement("div");
  row.className = "settings-row";
  row.innerHTML = homeGuideRuntime.buildHomeGuideSettingsRowInnerHtml();

  var actions = content.querySelector(".replay-modal-actions");
  if (actions && actions.parentNode === content) {
    content.insertBefore(row, actions);
  } else {
    content.appendChild(row);
  }
  return document.getElementById("home-guide-toggle");
}

function initHomeGuideSettingsUI() {
  var toggle = ensureHomeGuideSettingsDom();
  var note = document.getElementById("home-guide-note");
  if (!toggle) return;

  function sync() {
    var uiState = homeGuideRuntime.resolveHomeGuideSettingsState({
      isHomePage: isHomePage(),
      guideActive: HOME_GUIDE_STATE.active,
      fromSettings: HOME_GUIDE_STATE.fromSettings
    });
    toggle.disabled = uiState.toggleDisabled;
    toggle.checked = uiState.toggleChecked;
    if (note) {
      note.textContent = uiState.noteText;
    }
  }

  window.syncHomeGuideSettingsUI = sync;

  var toggleBindingState = homeGuideRuntime.resolveHomeGuideBindingState({
    alreadyBound: !!toggle.__homeGuideBound
  });
  if (toggleBindingState.shouldBind) {
    toggle.__homeGuideBound = toggleBindingState.boundValue;
    toggle.addEventListener("change", function () {
      var toggleAction = homeGuideRuntime.resolveHomeGuideToggleAction({
        checked: !!this.checked,
        isHomePage: isHomePage()
      });
      if (toggleAction.shouldResync) {
        sync();
        return;
      }
      if (toggleAction.shouldStartGuide) {
        if (toggleAction.shouldCloseSettings) {
          window.closeSettingsModal();
        }
        startHomeGuide({ fromSettings: toggleAction.startFromSettings });
      }
    });
  }

  sync();
}

function autoStartHomeGuideIfNeeded() {
  var path = homeGuideRuntime.resolveHomeGuidePathname({
    locationLike: typeof window !== "undefined" ? window.location : null
  });
  var autoStartState = homeGuideRuntime.resolveHomeGuideAutoStart({
    pathname: path,
    storageLike: getStorageByName("localStorage"),
    seenKey: HOME_GUIDE_SEEN_KEY
  });
  if (!autoStartState.shouldAutoStart) return;
  setTimeout(function () {
    startHomeGuide({ fromSettings: false });
  }, 260);
}

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Undo Link
    var undoLink = document.getElementById('undo-link');
    if (undoLink) {
        undoLink.addEventListener('click', function(e) {
            e.preventDefault();
            tryUndoFromUi();
        });
    }

    // Export Replay Button (Top Bar)
    var exportBtn = document.getElementById('top-export-replay-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.exportReplay();
        });
    }

    var practiceBtn = document.getElementById("top-practice-btn");
    if (practiceBtn) {
      practiceBtn.addEventListener("click", function (e) {
        e.preventDefault();
        window.openPracticeBoardFromCurrent();
      });
    }

    var practiceMobileUndoBtn = document.getElementById("practice-mobile-undo-btn");
    if (practiceMobileUndoBtn) {
      practiceMobileUndoBtn.addEventListener("click", function (e) {
        e.preventDefault();
        tryUndoFromUi();
      });
    }


    // Settings Button (Top Bar)
    var settingsBtn = document.getElementById("top-settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", function (e) {
        e.preventDefault();
        window.openSettingsModal();
      });
    }

    var settingsCloseBtn = document.getElementById("settings-close-btn");
    if (settingsCloseBtn) {
      settingsCloseBtn.addEventListener("click", function (e) {
        e.preventDefault();
        window.closeSettingsModal();
      });
    }

    var settingsModal = document.getElementById("settings-modal");
    if (settingsModal) {
      settingsModal.addEventListener("click", function (e) {
        if (e.target === settingsModal) {
          window.closeSettingsModal();
        }
      });
    }

    initThemeSettingsUI();
    removeLegacyUndoSettingsUI();
    initTimerModuleSettingsUI();
    initMobileHintToggle();
    initMobileUndoTopButton();
    initHomeGuideSettingsUI();
    autoStartHomeGuideIfNeeded();

    // Undo Button on Game Over Screen
    var undoBtnGameOver = document.getElementById('undo-btn-gameover');
    if (undoBtnGameOver) {
        var lastUndoTouchAt = 0;
        var handleGameOverUndo = function (e, fromTouch) {
            e.preventDefault();
            if (!fromTouch && (Date.now() - lastUndoTouchAt) < 450) return;
            if (fromTouch) lastUndoTouchAt = Date.now();
            tryUndoFromUi();
        };
        undoBtnGameOver.addEventListener('click', function (e) {
            handleGameOverUndo(e, false);
        });
        undoBtnGameOver.addEventListener('touchend', function (e) {
            handleGameOverUndo(e, true);
        }, { passive: false });
    }

    initMobileTimerboxToggle();
    requestResponsiveGameRelayout();

    if (!window.__responsiveGameRelayoutBound) {
      window.__responsiveGameRelayoutBound = true;
      window.addEventListener("resize", requestResponsiveGameRelayout);
      window.addEventListener("orientationchange", requestResponsiveGameRelayout);
    }


});

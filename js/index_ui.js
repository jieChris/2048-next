// Logic extracted from index.html

// Replay Modal Functions
function showReplayModal(title, content, actionName, actionCallback) {
  var modal = document.getElementById('replay-modal');
  var titleEl = document.getElementById('replay-modal-title');
  var textEl = document.getElementById('replay-textarea');
  var actionBtn = document.getElementById('replay-action-btn');

  if (!modal) return;

  modal.style.display = 'flex';
  titleEl.textContent = title;
  textEl.value = content;
  
  if (actionName) {
    actionBtn.style.display = 'inline-block';
    actionBtn.textContent = actionName;
    actionBtn.onclick = function() {
      actionCallback(textEl.value);
    };
  } else {
    actionBtn.style.display = 'none';
  }
  
  // Bind close button here since it might not be bound if modal was hidden
  var closeBtn = modal.querySelector('.replay-button:not(#replay-action-btn)');
  if(closeBtn) {
      closeBtn.onclick = window.closeReplayModal;
  }
}

window.closeReplayModal = function() {
  var modal = document.getElementById('replay-modal');
  if (modal) {
    modal.style.display = 'none';
  }
};

window.openSettingsModal = function () {
  var modal = document.getElementById("settings-modal");
  if (modal) {
    modal.style.display = "flex";
  }
  removeLegacyUndoSettingsUI();
  initThemeSettingsUI();
  initTimerModuleSettingsUI();
  initHomeGuideSettingsUI();
};

window.closeSettingsModal = function () {
  var modal = document.getElementById("settings-modal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.exportReplay = function() {
   if (window.game_manager) {
     var replay = window.game_manager.serialize();
     
     // Show Modal first so user can see it
     showReplayModal("导出回放", replay, "再次复制", function(text) {
       copyToClipboard(text);
     });
     
     // Auto Copy
     copyToClipboard(replay);
   }
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
  typeof themeSettingsRuntime.resolveThemeOptionSelectedState !== "function"
) {
  throw new Error("CoreThemeSettingsRuntime is required");
}
var practiceTransferRuntime = window.CorePracticeTransferRuntime;
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
var undoActionRuntime = window.CoreUndoActionRuntime;
if (
  !undoActionRuntime ||
  typeof undoActionRuntime.tryTriggerUndo !== "function" ||
  typeof undoActionRuntime.resolveUndoModeIdFromBody !== "function" ||
  typeof undoActionRuntime.resolveUndoModeId !== "function" ||
  typeof undoActionRuntime.isUndoCapableMode !== "function" ||
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

function isUndoCapableMode(gm) {
  var modeId = undoActionRuntime.resolveUndoModeIdFromBody({
    bodyLike: document.body
  });
  return !!undoActionRuntime.isUndoCapableMode({
    modeId: modeId,
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
  var modeUndoCapable = isUndoCapableMode(gm);
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

  btn.style.display = appliedModel && appliedModel.buttonDisplay ? appliedModel.buttonDisplay : "none";
  btn.style.pointerEvents =
    appliedModel && typeof appliedModel.pointerEvents === "string"
      ? appliedModel.pointerEvents
      : "none";
  btn.style.opacity = appliedModel && typeof appliedModel.opacity === "string" ? appliedModel.opacity : "0.45";
  btn.setAttribute(
    "aria-disabled",
    appliedModel && appliedModel.ariaDisabled ? appliedModel.ariaDisabled : "true"
  );
  if (!appliedModel || !appliedModel.shouldApplyLabel) {
    return;
  }
  var label = appliedModel.label || "撤回";
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

  if (uiState && uiState.collapsedContentEnabled) {
    body.classList.add(uiState.collapsedClassName || "mobile-hint-collapsed-content");
  } else {
    body.classList.remove(
      uiState && uiState.collapsedClassName ? uiState.collapsedClassName : "mobile-hint-collapsed-content"
    );
  }
  btn.style.display = uiState && uiState.buttonDisplay ? uiState.buttonDisplay : "none";

  if (!uiState || uiState.shouldCloseModal) {
    closeMobileHintModal();
    return;
  }

  var label = uiState.buttonLabel || "查看提示文本";
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
  btn.setAttribute("aria-expanded", uiState.buttonAriaExpanded || "false");
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
    toggleBtn.style.display =
      hiddenAppliedModel && hiddenAppliedModel.toggleDisplay ? hiddenAppliedModel.toggleDisplay : "none";
    toggleBtn.setAttribute(
      "aria-expanded",
      hiddenAppliedModel && hiddenAppliedModel.ariaExpanded ? hiddenAppliedModel.ariaExpanded : "false"
    );
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
  toggleBtn.style.display = appliedModel && appliedModel.toggleDisplay ? appliedModel.toggleDisplay : "inline-flex";
  timerBox.classList.toggle("is-mobile-expanded", !!(appliedModel && appliedModel.expanded));
  var label = appliedModel && appliedModel.label ? appliedModel.label : "展开计时器";
  toggleBtn.setAttribute(
    "aria-expanded",
    appliedModel && appliedModel.ariaExpanded ? appliedModel.ariaExpanded : (collapsed ? "false" : "true")
  );
  toggleBtn.setAttribute("aria-label", label);
  toggleBtn.setAttribute("title", label);
  toggleBtn.innerHTML =
    appliedModel && appliedModel.iconSvg
      ? appliedModel.iconSvg
      : getTimerboxToggleIconSvg(collapsed);
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
  if (!isTimerboxMobileScope()) return;
  if (mobileRelayoutTimer) clearTimeout(mobileRelayoutTimer);
  mobileRelayoutTimer = setTimeout(function () {
    syncMobileHintUI();
    syncMobileTopActionsPlacement();
    syncPracticeTopActionsPlacement();
    syncMobileUndoTopButtonAvailability();
    syncMobileTimerboxUI();
    var gm = window.game_manager;
    if (gm && gm.actuator && typeof gm.actuator.invalidateLayoutCache === "function") {
      gm.actuator.invalidateLayoutCache();
    }
    if (gm && typeof gm.clearTransientTileVisualState === "function") {
      gm.clearTransientTileVisualState();
    }
    if (gm && typeof gm.actuate === "function") {
      gm.actuate();
    }
  }, 120);
}

window.syncMobileTimerboxUI = syncMobileTimerboxUI;
window.syncMobileHintUI = syncMobileHintUI;
window.syncMobileUndoTopButtonAvailability = syncMobileUndoTopButtonAvailability;

function getStorageByName(name) {
  try {
    return window && window[name] ? window[name] : null;
  } catch (_err) {
    return null;
  }
}

function safeSetStorageItem(storage, key, value) {
  if (!storage || !key) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

function safeReadStorageItem(storage, key) {
  if (!storage || !key) return null;
  try {
    return storage.getItem(key);
  } catch (_err) {
    return null;
  }
}

window.openPracticeBoardFromCurrent = function () {
  var gm = window.game_manager;
  var precheck = practiceTransferRuntime.resolvePracticeTransferPrecheck({
    manager: gm || null
  });
  if (!precheck || !precheck.canOpen || !Array.isArray(precheck.board)) {
    if (precheck && precheck.alertMessage) {
      alert(precheck.alertMessage);
    }
    return;
  }
  var board = precheck.board;

  var localStore = getStorageByName("localStorage");
  var sessionStore = getStorageByName("sessionStorage");
  var cookie = "";
  var windowName = "";
  try {
    cookie = document.cookie || "";
  } catch (_err) {
    cookie = "";
  }
  try {
    windowName = typeof window.name === "string" ? window.name : "";
  } catch (_err) {
    windowName = "";
  }
  var plan = practiceTransferRuntime.createPracticeTransferNavigationPlan({
    gameModeConfig:
      window.GAME_MODE_CONFIG && typeof window.GAME_MODE_CONFIG === "object"
        ? window.GAME_MODE_CONFIG
        : null,
    manager: gm || null,
    board: board,
    localStorageLike: localStore,
    sessionStorageLike: sessionStore,
    guideShownKey: PRACTICE_GUIDE_SHOWN_KEY,
    guideSeenFlag: PRACTICE_GUIDE_SEEN_FLAG,
    cookie: cookie,
    windowName: windowName,
    localStorageKey: PRACTICE_TRANSFER_KEY,
    sessionStorageKey: PRACTICE_TRANSFER_SESSION_KEY
  });
  if (!plan || !plan.openUrl) {
    alert("练习板链接生成失败。");
    return;
  }
  window.open(plan.openUrl, "_blank");
};


function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            alert("回放代码已复制到剪贴板！");
        }).catch(function(err) {
            // Fallback if async failure
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    try {
      var textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";  // Avoid scrolling to bottom
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("回放代码已复制到剪贴板！");
    } catch (err) {
      console.error('Fallback copy failed', err);
      alert("自动复制失败，请手动从文本框复制。");
    }
}

// Pretty print time function (Legacy support just in case)
window.pretty = function(time) {
  if (time < 0) {return "DNF";}
    var bits = time % 1000;
    time = (time - bits) / 1000;
    var secs = time % 60;
    var mins = ((time - secs) / 60) % 60;
    var hours = (time - secs - 60 * mins) / 3600;
    var s = "" + bits;
    if (bits < 10) {s = "0" + s;}
    if (bits < 100) {s = "0" + s;}
    s = secs + "." + s;
    if (secs < 10 && (mins > 0 || hours > 0)) {s = "0" + s;}
    if (mins > 0 || hours > 0) {s = mins + ":" + s;}
    if (mins < 10 && hours > 0) {s = "0" + s;}
    if (hours > 0) {s = hours + ":" + s;}
  return s;
};

function formatPreviewValue(value) {
  return themeSettingsRuntime.formatThemePreviewValue(value);
}

function getCurrentRuleset() {
  if (typeof document !== "undefined" && document.body) {
    var ruleset = document.body.getAttribute("data-ruleset");
    if (ruleset === "fibonacci") return "fibonacci";
  }
  if (window.GAME_MODE_CONFIG && window.GAME_MODE_CONFIG.ruleset === "fibonacci") {
    return "fibonacci";
  }
  return "pow2";
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
    previewRoot.className =
      previewLayout && previewLayout.containerClassName
        ? previewLayout.containerClassName
        : "theme-preview-dual-wrap";
    previewRoot.innerHTML =
      previewLayout && previewLayout.innerHtml
        ? previewLayout.innerHtml
        : "";
    previewRoot.__dualPreviewRefs = {
      pow2: document.getElementById(
        previewLayout && previewLayout.pow2GridId ? previewLayout.pow2GridId : "theme-preview-grid-pow2"
      ),
      fib: document.getElementById(
        previewLayout && previewLayout.fibonacciGridId
          ? previewLayout.fibonacciGridId
          : "theme-preview-grid-fib"
      )
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
    var pow2Values =
      previewValues && Array.isArray(previewValues.pow2Values) ? previewValues.pow2Values : [];
    var fibValues =
      previewValues && Array.isArray(previewValues.fibonacciValues)
        ? previewValues.fibonacciValues
        : [];
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
      pow2Selector:
        cssSelectors && typeof cssSelectors.pow2Selector === "string"
          ? cssSelectors.pow2Selector
          : "#theme-preview-grid-pow2",
      fibSelector:
        cssSelectors && typeof cssSelectors.fibSelector === "string"
          ? cssSelectors.fibSelector
          : "#theme-preview-grid-fib"
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
    if (!(toggleState && toggleState.shouldOpen)) {
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
  if (triggerBindingState && triggerBindingState.shouldBind) {
    customTrigger.addEventListener("click", toggleDropdown);
    customTrigger.__bound = !!triggerBindingState.boundValue;
  }

  var outsideBindingState = themeSettingsRuntime.resolveThemeBindingState({
    alreadyBound: !!window.__clickOutsideBound
  });
  if (outsideBindingState && outsideBindingState.shouldBind) {
    document.addEventListener("click", function(e) {
      if (!customSelect.contains(e.target)) {
        closeDropdown();
      }
    });
    window.__clickOutsideBound = !!outsideBindingState.boundValue;
  }

  var leaveBindingState = themeSettingsRuntime.resolveThemeBindingState({
    alreadyBound: !!customSelect.__mouseleaveBound
  });
  if (leaveBindingState && leaveBindingState.shouldBind) {
    customSelect.addEventListener("mouseleave", function() {
      if (customSelect.classList.contains("open")) {
        applyPreviewTheme(confirmedTheme);
      }
    });
    customSelect.__mouseleaveBound = !!leaveBindingState.boundValue;
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
      var isSelected = themeSettingsRuntime.resolveThemeOptionSelectedState({
        optionValue: opt.dataset ? opt.dataset.value : "",
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
  if (changeSyncBindingState && changeSyncBindingState.shouldBind) {
    window.__themeChangeSyncBound = !!changeSyncBindingState.boundValue;
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
  if (retryState && retryState.shouldRetry) {
    setTimeout(initTimerModuleSettingsUI, retryState.retryDelayMs);
    return;
  }

  function sync() {
    var gm = window.game_manager;
    if (!gm) return;
    var view = gm.getTimerModuleViewMode ? gm.getTimerModuleViewMode() : "timer";
    var settingsState = timerModuleRuntime.resolveTimerModuleSettingsState({
      viewMode: view
    });
    toggle.disabled = !!(settingsState && settingsState.toggleDisabled);
    toggle.checked = !!(settingsState && settingsState.toggleChecked);
    if (note) {
      note.textContent =
        settingsState && settingsState.noteText ? String(settingsState.noteText) : "";
    }
    if (typeof window.syncMobileTimerboxUI === "function") {
      window.syncMobileTimerboxUI();
    }
  }
  window.syncTimerModuleSettingsUI = sync;

  var timerBindingState = timerModuleRuntime.resolveTimerModuleBindingState({
    alreadyBound: !!toggle.__timerViewBound
  });
  if (timerBindingState && timerBindingState.shouldBind) {
    toggle.__timerViewBound = !!timerBindingState.boundValue;
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
    lifecycleState: lifecycleState || null
  });
  HOME_GUIDE_STATE.active = !!(sessionState && sessionState.active);
  HOME_GUIDE_STATE.steps =
    sessionState && Array.isArray(sessionState.steps) ? sessionState.steps : [];
  HOME_GUIDE_STATE.index =
    sessionState && typeof sessionState.index === "number" ? sessionState.index : 0;
  HOME_GUIDE_STATE.fromSettings = !!(sessionState && sessionState.fromSettings);
  var layerDisplayState = homeGuideRuntime.resolveHomeGuideLayerDisplayState({
    active: HOME_GUIDE_STATE.active
  });
  if (HOME_GUIDE_STATE.overlay) {
    HOME_GUIDE_STATE.overlay.style.display =
      layerDisplayState && layerDisplayState.overlayDisplay
        ? layerDisplayState.overlayDisplay
        : "none";
  }
  if (HOME_GUIDE_STATE.panel) {
    HOME_GUIDE_STATE.panel.style.display =
      layerDisplayState && layerDisplayState.panelDisplay
        ? layerDisplayState.panelDisplay
        : "none";
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
  if (stepIndexState && stepIndexState.shouldAbort) return;
  if (stepIndexState && stepIndexState.shouldFinish) {
    var finishState = homeGuideRuntime.resolveHomeGuideFinishState({
      reason: "completed"
    });
    finishHomeGuide(!!finishState.markSeen, {
      showDoneNotice: !!finishState.showDoneNotice
    });
    return;
  }
  index = stepIndexState ? stepIndexState.resolvedIndex : index;
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
  if (stepTargetState && stepTargetState.shouldAdvance) {
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
  if (targetScrollState && targetScrollState.shouldScroll && target.scrollIntoView) {
    target.scrollIntoView({
      block: targetScrollState.block || "center",
      inline: targetScrollState.inline || "nearest",
      behavior: targetScrollState.behavior || "smooth"
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

  if (stepEl) stepEl.textContent = stepRenderState && stepRenderState.stepText
    ? stepRenderState.stepText
    : "";
  if (titleEl) titleEl.textContent = stepRenderState && stepRenderState.titleText
    ? stepRenderState.titleText
    : "";
  if (descEl) descEl.textContent = stepRenderState && stepRenderState.descText
    ? stepRenderState.descText
    : "";
  if (prevBtn) prevBtn.disabled = !!(stepRenderState && stepRenderState.prevDisabled);
  if (nextBtn) nextBtn.textContent = stepRenderState && stepRenderState.nextText
    ? stepRenderState.nextText
    : "";

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
    lifecycleState: lifecycleState || null
  });
  HOME_GUIDE_STATE.active = !!(sessionState && sessionState.active);
  HOME_GUIDE_STATE.fromSettings = !!(sessionState && sessionState.fromSettings);
  HOME_GUIDE_STATE.steps =
    sessionState && Array.isArray(sessionState.steps) ? sessionState.steps : [];
  HOME_GUIDE_STATE.index =
    sessionState && typeof sessionState.index === "number" ? sessionState.index : 0;

  var layerDisplayState = homeGuideRuntime.resolveHomeGuideLayerDisplayState({
    active: HOME_GUIDE_STATE.active
  });
  dom.overlay.style.display =
    layerDisplayState && layerDisplayState.overlayDisplay
      ? layerDisplayState.overlayDisplay
      : "block";
  dom.panel.style.display =
    layerDisplayState && layerDisplayState.panelDisplay
      ? layerDisplayState.panelDisplay
      : "block";

  var prevBtn = document.getElementById("home-guide-prev");
  var nextBtn = document.getElementById("home-guide-next");
  var skipBtn = document.getElementById("home-guide-skip");

  if (prevBtn) {
    var prevBindingState = homeGuideRuntime.resolveHomeGuideBindingState({
      alreadyBound: !!prevBtn.__homeGuideBound
    });
    if (prevBindingState && prevBindingState.shouldBind) {
      prevBtn.__homeGuideBound = !!prevBindingState.boundValue;
      prevBtn.addEventListener("click", function () {
        var actionState = homeGuideRuntime.resolveHomeGuideControlAction({
          action: "prev",
          stepIndex: HOME_GUIDE_STATE.index
        });
        showHomeGuideStep(actionState && typeof actionState.nextStepIndex === "number"
          ? actionState.nextStepIndex
          : HOME_GUIDE_STATE.index - 1);
      });
    }
  }
  if (nextBtn) {
    var nextBindingState = homeGuideRuntime.resolveHomeGuideBindingState({
      alreadyBound: !!nextBtn.__homeGuideBound
    });
    if (nextBindingState && nextBindingState.shouldBind) {
      nextBtn.__homeGuideBound = !!nextBindingState.boundValue;
      nextBtn.addEventListener("click", function () {
        var actionState = homeGuideRuntime.resolveHomeGuideControlAction({
          action: "next",
          stepIndex: HOME_GUIDE_STATE.index
        });
        showHomeGuideStep(actionState && typeof actionState.nextStepIndex === "number"
          ? actionState.nextStepIndex
          : HOME_GUIDE_STATE.index + 1);
      });
    }
  }
  if (skipBtn) {
    var skipBindingState = homeGuideRuntime.resolveHomeGuideBindingState({
      alreadyBound: !!skipBtn.__homeGuideBound
    });
    if (skipBindingState && skipBindingState.shouldBind) {
      skipBtn.__homeGuideBound = !!skipBindingState.boundValue;
      skipBtn.addEventListener("click", function () {
        var actionState = homeGuideRuntime.resolveHomeGuideControlAction({
          action: "skip",
          stepIndex: HOME_GUIDE_STATE.index
        });
        var finishReason =
          actionState && actionState.type === "finish" && typeof actionState.finishReason === "string"
            ? actionState.finishReason
            : "skipped";
        var finishState = homeGuideRuntime.resolveHomeGuideFinishState({
          reason: finishReason
        });
        finishHomeGuide(!!finishState.markSeen, {
          showDoneNotice: !!finishState.showDoneNotice
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
    toggle.disabled = !!(uiState && uiState.toggleDisabled);
    toggle.checked = !!(uiState && uiState.toggleChecked);
    if (note) {
      note.textContent = uiState && uiState.noteText ? String(uiState.noteText) : "";
    }
  }

  window.syncHomeGuideSettingsUI = sync;

  var toggleBindingState = homeGuideRuntime.resolveHomeGuideBindingState({
    alreadyBound: !!toggle.__homeGuideBound
  });
  if (toggleBindingState && toggleBindingState.shouldBind) {
    toggle.__homeGuideBound = !!toggleBindingState.boundValue;
    toggle.addEventListener("change", function () {
      var toggleAction = homeGuideRuntime.resolveHomeGuideToggleAction({
        checked: !!this.checked,
        isHomePage: isHomePage()
      });
      if (toggleAction && toggleAction.shouldResync) {
        sync();
        return;
      }
      if (toggleAction && toggleAction.shouldStartGuide) {
        if (toggleAction.shouldCloseSettings) {
          window.closeSettingsModal();
        }
        startHomeGuide({ fromSettings: !!toggleAction.startFromSettings });
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
  if (!autoStartState || !autoStartState.shouldAutoStart) return;
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

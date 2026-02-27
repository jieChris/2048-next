(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function createIndexUiTryUndoHandler(input) {
    var source = toRecord(input);
    var undoActionRuntime = toRecord(source.undoActionRuntime);
    var windowLike = source.windowLike || null;
    var direction = typeof source.direction === "number" ? source.direction : -1;

    return function tryUndoFromUi() {
      var tryTriggerUndoFromContext = asFunction(
        toRecord(undoActionRuntime).tryTriggerUndoFromContext
      );
      if (!tryTriggerUndoFromContext) return false;
      var result = toRecord(
        tryTriggerUndoFromContext({
          windowLike: windowLike,
          direction: direction
        })
      );
      return !!result.didTrigger;
    };
  }

  function bindGlobalFunction(windowRecord, key, callback) {
    var fn = asFunction(callback);
    if (!fn) return false;
    windowRecord[key] = fn;
    return true;
  }

  function createIndexUiBootstrapResolvers(input) {
    var source = toRecord(input);
    var coreContracts = toRecord(source.coreContracts);
    var modalContracts = toRecord(source.modalContracts);
    var homeGuideContracts = toRecord(source.homeGuideContracts);

    var createIndexUiMobileResolvers = asFunction(
      toRecord(source.indexUiPageResolversHostRuntime).createIndexUiMobileResolvers
    );
    if (!createIndexUiMobileResolvers) {
      throw new Error("CoreIndexUiPageResolversHostRuntime is required");
    }

    var mobileUiMaxWidth =
      typeof source.mobileUiMaxWidth === "number" && isFinite(source.mobileUiMaxWidth)
        ? source.mobileUiMaxWidth
        : 760;
    var compactGameViewportMaxWidth =
      typeof source.compactGameViewportMaxWidth === "number" &&
      isFinite(source.compactGameViewportMaxWidth)
        ? source.compactGameViewportMaxWidth
        : 980;
    var timerboxCollapseMaxWidth =
      typeof source.timerboxCollapseMaxWidth === "number" &&
      isFinite(source.timerboxCollapseMaxWidth)
        ? source.timerboxCollapseMaxWidth
        : 980;
    var mobileTimerboxCollapsedKey =
      typeof source.mobileTimerboxCollapsedKey === "string" && source.mobileTimerboxCollapsedKey
        ? source.mobileTimerboxCollapsedKey
        : "ui_timerbox_collapsed_mobile_v1";

    var mobileResolvers = toRecord(
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
        navigatorLike: source.navigatorLike || null,
        storageRuntime: coreContracts.storageRuntime,
        tryUndoFromUi: source.tryUndoFromUi,
        clearTimeoutLike: source.clearTimeoutLike,
        setTimeoutLike: source.setTimeoutLike,
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

    var createIndexUiPageActionResolvers = asFunction(
      toRecord(source.indexUiPageActionsHostRuntime).createIndexUiPageActionResolvers
    );
    if (!createIndexUiPageActionResolvers) {
      throw new Error("CoreIndexUiPageActionsHostRuntime is required");
    }

    var practiceGuideShownKey =
      typeof source.practiceGuideShownKey === "string" && source.practiceGuideShownKey
        ? source.practiceGuideShownKey
        : "practice_guide_shown_v2";
    var practiceGuideSeenFlag =
      typeof source.practiceGuideSeenFlag === "string" && source.practiceGuideSeenFlag
        ? source.practiceGuideSeenFlag
        : "practice_guide_seen_v2=1";
    var practiceTransferKey =
      typeof source.practiceTransferKey === "string" && source.practiceTransferKey
        ? source.practiceTransferKey
        : "practice_board_transfer_v1";
    var practiceTransferSessionKey =
      typeof source.practiceTransferSessionKey === "string" && source.practiceTransferSessionKey
        ? source.practiceTransferSessionKey
        : "practice_board_transfer_session_v1";
    var homeGuideSeenKey =
      typeof source.homeGuideSeenKey === "string" && source.homeGuideSeenKey
        ? source.homeGuideSeenKey
        : "home_guide_seen_v1";
    var homeGuidePanelMargin =
      typeof source.homeGuidePanelMargin === "number" && isFinite(source.homeGuidePanelMargin)
        ? source.homeGuidePanelMargin
        : 12;
    var homeGuideDefaultPanelHeight =
      typeof source.homeGuideDefaultPanelHeight === "number" &&
      isFinite(source.homeGuideDefaultPanelHeight)
        ? source.homeGuideDefaultPanelHeight
        : 160;
    var homeGuideMaxAdvanceLoops =
      typeof source.homeGuideMaxAdvanceLoops === "number" && isFinite(source.homeGuideMaxAdvanceLoops)
        ? source.homeGuideMaxAdvanceLoops
        : 32;
    var homeGuideAutoStartDelayMs =
      typeof source.homeGuideAutoStartDelayMs === "number" && isFinite(source.homeGuideAutoStartDelayMs)
        ? source.homeGuideAutoStartDelayMs
        : 260;

    var pageActionResolvers = toRecord(
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
        locationLike: source.locationLike || null,
        navigatorLike: source.navigatorLike || null,
        alertLike: source.alertLike || null,
        consoleLike: source.consoleLike || null,
        setTimeoutLike: source.setTimeoutLike,
        clearTimeoutLike: source.clearTimeoutLike,
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

  function applyIndexUiPageBootstrap(input) {
    var source = toRecord(input);
    var windowRecord = toRecord(source.windowLike);
    var documentRecord = toRecord(source.documentLike);
    var indexUiStartupHostRuntime = toRecord(source.indexUiStartupHostRuntime);
    var applyIndexUiStartup = asFunction(indexUiStartupHostRuntime.applyIndexUiStartup);
    var getElementByIdRaw = asFunction(documentRecord.getElementById);
    var getElementById = getElementByIdRaw
      ? function (id) {
          return getElementByIdRaw.call(documentRecord, id);
        }
      : null;
    var addEventListener = asFunction(documentRecord.addEventListener);
    var formatPrettyTime = asFunction(toRecord(source.prettyTimeRuntime).formatPrettyTime);
    var nowMs = asFunction(source.nowMs);
    var touchGuardWindowMs =
      typeof source.touchGuardWindowMs === "number" && isFinite(source.touchGuardWindowMs)
        ? source.touchGuardWindowMs
        : 450;

    var appliedGlobalBindings = false;
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
      windowRecord.pretty = function (time) {
        return formatPrettyTime(time);
      };
      appliedGlobalBindings = true;
    }

    var startupInvoked = false;
    var startupHandler = function () {
      if (!applyIndexUiStartup || !getElementById) return null;
      startupInvoked = true;
      return applyIndexUiStartup({
        topActionBindingsHostRuntime: source.topActionBindingsHostRuntime,
        gameOverUndoHostRuntime: source.gameOverUndoHostRuntime,
        getElementById: getElementById,
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
          : function () {
              return Date.now();
            },
        touchGuardWindowMs: touchGuardWindowMs
      });
    };

    var boundDomContentLoaded = false;
    if (!documentRecord.__indexUiPageBootstrapBound && addEventListener) {
      addEventListener.call(documentRecord, "DOMContentLoaded", startupHandler);
      documentRecord.__indexUiPageBootstrapBound = true;
      boundDomContentLoaded = true;
    }

    return {
      appliedGlobalBindings: appliedGlobalBindings,
      boundDomContentLoaded: boundDomContentLoaded,
      startupInvoked: startupInvoked
    };
  }

  global.CoreIndexUiPageHostRuntime = global.CoreIndexUiPageHostRuntime || {};
  global.CoreIndexUiPageHostRuntime.createIndexUiTryUndoHandler = createIndexUiTryUndoHandler;
  global.CoreIndexUiPageHostRuntime.createIndexUiBootstrapResolvers = createIndexUiBootstrapResolvers;
  global.CoreIndexUiPageHostRuntime.applyIndexUiPageBootstrap = applyIndexUiPageBootstrap;
})(typeof window !== "undefined" ? window : undefined);

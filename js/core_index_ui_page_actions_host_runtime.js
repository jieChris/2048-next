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

  function resolveNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  function resolveHomeGuideState(value) {
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

  function createIndexUiPageActionResolvers(input) {
    var source = toRecord(input);

    var settingsModalPageHostRuntime = toRecord(source.settingsModalPageHostRuntime);
    var createSettingsModalInitResolvers = asFunction(
      settingsModalPageHostRuntime.createSettingsModalInitResolvers
    );
    var createSettingsModalActionResolvers = asFunction(
      settingsModalPageHostRuntime.createSettingsModalActionResolvers
    );
    if (!createSettingsModalInitResolvers || !createSettingsModalActionResolvers) {
      throw new Error("CoreSettingsModalPageHostRuntime is required");
    }

    var settingsModalInitResolvers = toRecord(
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

    var initThemeSettingsUI = asFunction(settingsModalInitResolvers.initThemeSettingsUI);
    var removeLegacyUndoSettingsUI = asFunction(settingsModalInitResolvers.removeLegacyUndoSettingsUI);
    var initTimerModuleSettingsUI = asFunction(settingsModalInitResolvers.initTimerModuleSettingsUI);
    if (!initThemeSettingsUI || !removeLegacyUndoSettingsUI || !initTimerModuleSettingsUI) {
      throw new Error("CoreSettingsModalPageHostRuntime is required");
    }

    var practiceTransferPageHostRuntime = toRecord(source.practiceTransferPageHostRuntime);
    var createPracticeTransferPageActionResolvers = asFunction(
      practiceTransferPageHostRuntime.createPracticeTransferPageActionResolvers
    );
    if (!createPracticeTransferPageActionResolvers) {
      throw new Error("CorePracticeTransferPageHostRuntime is required");
    }

    var practiceTransferPageActionResolvers = toRecord(
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

    var openPracticeBoardFromCurrent = asFunction(
      practiceTransferPageActionResolvers.openPracticeBoardFromCurrent
    );
    if (!openPracticeBoardFromCurrent) {
      throw new Error("CorePracticeTransferPageHostRuntime is required");
    }

    var homeGuideState = resolveHomeGuideState(source.homeGuideState);
    var homeGuideSeenKey =
      typeof source.homeGuideSeenKey === "string" && source.homeGuideSeenKey
        ? source.homeGuideSeenKey
        : "home_guide_seen_v1";

    var homeGuidePageHostRuntime = toRecord(source.homeGuidePageHostRuntime);
    var createHomeGuidePageResolvers = asFunction(homeGuidePageHostRuntime.createHomeGuidePageResolvers);
    var createHomeGuideLifecycleResolvers = asFunction(
      homeGuidePageHostRuntime.createHomeGuideLifecycleResolvers
    );
    if (!createHomeGuidePageResolvers || !createHomeGuideLifecycleResolvers) {
      throw new Error("CoreHomeGuidePageHostRuntime is required");
    }

    var homeGuidePageResolvers = toRecord(
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
        homeGuideState: homeGuideState,
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

    var isHomePage = asFunction(homeGuidePageResolvers.isHomePage);
    var startHomeGuide = asFunction(homeGuidePageResolvers.startHomeGuide);
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

    var homeGuideLifecycleResolvers = toRecord(
      createHomeGuideLifecycleResolvers({
        homeGuidePageHostRuntime: source.homeGuidePageHostRuntime,
        homeGuideSettingsHostRuntime: source.homeGuideSettingsHostRuntime,
        homeGuideStartupHostRuntime: source.homeGuideStartupHostRuntime,
        documentLike: source.documentLike || null,
        windowLike: source.windowLike || null,
        locationLike: source.locationLike || null,
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState: homeGuideState,
        isHomePage: isHomePage,
        startHomeGuide: startHomeGuide,
        storageRuntime: source.storageRuntime,
        seenKey: homeGuideSeenKey,
        setTimeoutLike: source.setTimeoutLike,
        autoStartDelayMs: resolveNumber(source.homeGuideAutoStartDelayMs, 260)
      })
    );

    var initHomeGuideSettingsUI = asFunction(homeGuideLifecycleResolvers.initHomeGuideSettingsUI);
    var autoStartHomeGuideIfNeeded = asFunction(homeGuideLifecycleResolvers.autoStartHomeGuideIfNeeded);
    if (!initHomeGuideSettingsUI || !autoStartHomeGuideIfNeeded) {
      throw new Error("CoreHomeGuidePageHostRuntime is required");
    }

    var replayPageHostRuntime = toRecord(source.replayPageHostRuntime);
    var createReplayPageActionResolvers = asFunction(
      replayPageHostRuntime.createReplayPageActionResolvers
    );
    if (!createReplayPageActionResolvers) {
      throw new Error("CoreReplayPageHostRuntime is required");
    }

    var replayPageActionResolvers = toRecord(
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

    var showReplayModal = asFunction(replayPageActionResolvers.showReplayModal);
    var closeReplayModal = asFunction(replayPageActionResolvers.closeReplayModal);
    var exportReplay = asFunction(replayPageActionResolvers.exportReplay);
    if (!showReplayModal || !closeReplayModal || !exportReplay) {
      throw new Error("CoreReplayPageHostRuntime is required");
    }

    var settingsModalActionResolvers = toRecord(
      createSettingsModalActionResolvers({
        settingsModalPageHostRuntime: source.settingsModalPageHostRuntime,
        settingsModalHostRuntime: source.settingsModalHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike || null,
        removeLegacyUndoSettingsUI: removeLegacyUndoSettingsUI,
        initThemeSettingsUI: initThemeSettingsUI,
        initTimerModuleSettingsUI: initTimerModuleSettingsUI,
        initHomeGuideSettingsUI: initHomeGuideSettingsUI
      })
    );

    var openSettingsModal = asFunction(settingsModalActionResolvers.openSettingsModal);
    var closeSettingsModal = asFunction(settingsModalActionResolvers.closeSettingsModal);
    if (!openSettingsModal || !closeSettingsModal) {
      throw new Error("CoreSettingsModalPageHostRuntime is required");
    }

    return {
      initThemeSettingsUI: initThemeSettingsUI,
      removeLegacyUndoSettingsUI: removeLegacyUndoSettingsUI,
      initTimerModuleSettingsUI: initTimerModuleSettingsUI,
      openPracticeBoardFromCurrent: openPracticeBoardFromCurrent,
      initHomeGuideSettingsUI: initHomeGuideSettingsUI,
      autoStartHomeGuideIfNeeded: autoStartHomeGuideIfNeeded,
      showReplayModal: showReplayModal,
      closeReplayModal: closeReplayModal,
      exportReplay: exportReplay,
      openSettingsModal: openSettingsModal,
      closeSettingsModal: closeSettingsModal
    };
  }

  global.CoreIndexUiPageActionsHostRuntime = global.CoreIndexUiPageActionsHostRuntime || {};
  global.CoreIndexUiPageActionsHostRuntime.createIndexUiPageActionResolvers =
    createIndexUiPageActionResolvers;
})(typeof window !== "undefined" ? window : undefined);

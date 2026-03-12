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

  function resolvePositiveNumber(value, fallback) {
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  function resolveStorageByName(input) {
    var source = toRecord(input);
    var storageRuntime = toRecord(source.storageRuntime);
    var resolveStorage = asFunction(storageRuntime.resolveStorageByName);
    if (!resolveStorage) return null;
    return resolveStorage({
      windowLike: source.windowLike || null,
      storageName: source.storageName
    });
  }

  function applyHomeGuideSettingsPageInit(input) {
    var source = toRecord(input);
    var hostRuntime = toRecord(source.homeGuideSettingsHostRuntime);
    var applySettingsUi = asFunction(hostRuntime.applyHomeGuideSettingsUi);
    if (!applySettingsUi) {
      return {
        hasApplySettingsUiApi: false,
        didApply: false
      };
    }

    applySettingsUi({
      documentLike: source.documentLike,
      windowLike: source.windowLike,
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState: source.homeGuideState,
      isHomePage: source.isHomePage,
      closeSettingsModal: source.closeSettingsModal,
      startHomeGuide: source.startHomeGuide
    });

    return {
      hasApplySettingsUiApi: true,
      didApply: true
    };
  }

  function createHomeGuideLifecycleResolvers(input) {
    var source = toRecord(input);
    var pageHostRuntime = toRecord(source.homeGuidePageHostRuntime);
    var windowLike = source.windowLike || null;
    var locationLike = source.locationLike || toRecord(windowLike).location || null;
    var autoStartDelayMs = resolvePositiveNumber(source.autoStartDelayMs, 260);

    function resolveCloseSettingsModal() {
      var direct = asFunction(source.closeSettingsModal);
      if (direct) return direct;

      var resolver = asFunction(source.resolveCloseSettingsModal);
      if (resolver) {
        var resolved = resolver();
        var callback = asFunction(resolved);
        if (callback) return callback;
      }

      var closeFromWindow = asFunction(toRecord(windowLike).closeSettingsModal);
      if (!closeFromWindow) return null;
      return function () {
        return closeFromWindow.call(windowLike);
      };
    }

    function initHomeGuideSettingsUI() {
      var applySettingsPageInit = asFunction(pageHostRuntime.applyHomeGuideSettingsPageInit);
      if (applySettingsPageInit) {
        return applySettingsPageInit({
          homeGuideSettingsHostRuntime: source.homeGuideSettingsHostRuntime,
          documentLike: source.documentLike,
          windowLike: windowLike,
          homeGuideRuntime: source.homeGuideRuntime,
          homeGuideState: source.homeGuideState,
          isHomePage: source.isHomePage,
          closeSettingsModal: resolveCloseSettingsModal(),
          startHomeGuide: source.startHomeGuide
        });
      }

      return applyHomeGuideSettingsPageInit({
        homeGuideSettingsHostRuntime: source.homeGuideSettingsHostRuntime,
        documentLike: source.documentLike,
        windowLike: windowLike,
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState: source.homeGuideState,
        isHomePage: source.isHomePage,
        closeSettingsModal: resolveCloseSettingsModal(),
        startHomeGuide: source.startHomeGuide
      });
    }

    function autoStartHomeGuideIfNeeded() {
      var applyAutoStartPageFromContext = asFunction(
        pageHostRuntime.applyHomeGuideAutoStartPageFromContext
      );
      if (applyAutoStartPageFromContext) {
        return applyAutoStartPageFromContext({
          homeGuideStartupHostRuntime: source.homeGuideStartupHostRuntime,
          homeGuideRuntime: source.homeGuideRuntime,
          locationLike: locationLike,
          storageRuntime: source.storageRuntime,
          windowLike: windowLike,
          seenKey: source.seenKey,
          startHomeGuide: source.startHomeGuide,
          setTimeoutLike: source.setTimeoutLike,
          delayMs: autoStartDelayMs
        });
      }

      return applyHomeGuideAutoStartPageFromContext({
        homeGuideStartupHostRuntime: source.homeGuideStartupHostRuntime,
        homeGuideRuntime: source.homeGuideRuntime,
        locationLike: locationLike,
        storageRuntime: source.storageRuntime,
        windowLike: windowLike,
        seenKey: source.seenKey,
        startHomeGuide: source.startHomeGuide,
        setTimeoutLike: source.setTimeoutLike,
        delayMs: autoStartDelayMs
      });
    }

    return {
      initHomeGuideSettingsUI: initHomeGuideSettingsUI,
      autoStartHomeGuideIfNeeded: autoStartHomeGuideIfNeeded
    };
  }

  function applyHomeGuideAutoStartPage(input) {
    var source = toRecord(input);
    var startupHostRuntime = toRecord(source.homeGuideStartupHostRuntime);
    var applyAutoStart = asFunction(startupHostRuntime.applyHomeGuideAutoStart);
    if (!applyAutoStart) {
      return {
        hasApplyAutoStartApi: false,
        didApply: false
      };
    }

    applyAutoStart({
      homeGuideRuntime: source.homeGuideRuntime,
      locationLike: source.locationLike,
      storageLike: source.storageLike,
      seenKey: source.seenKey,
      startHomeGuide: source.startHomeGuide,
      setTimeoutLike: source.setTimeoutLike,
      delayMs: source.delayMs
    });

    return {
      hasApplyAutoStartApi: true,
      didApply: true
    };
  }

  function createHomeGuidePageResolvers(input) {
    var source = toRecord(input);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolvePathname = asFunction(homeGuideRuntime.resolveHomeGuidePathname);
    var isHomePagePath = asFunction(homeGuideRuntime.isHomePagePath);
    var buildSteps = asFunction(homeGuideRuntime.buildHomeGuideSteps);
    var resolveCompactViewport = asFunction(source.isCompactViewport);
    var locationLike = source.locationLike || null;
    var documentLike = source.documentLike || null;
    var windowLike = source.windowLike || null;
    var homeGuideState = source.homeGuideState || null;
    var mobileUiMaxWidth =
      typeof source.mobileUiMaxWidth === "number" && Number.isFinite(source.mobileUiMaxWidth)
        ? source.mobileUiMaxWidth
        : 760;
    var panelMargin =
      typeof source.panelMargin === "number" && Number.isFinite(source.panelMargin)
        ? source.panelMargin
        : 12;
    var defaultPanelHeight =
      typeof source.defaultPanelHeight === "number" && Number.isFinite(source.defaultPanelHeight)
        ? source.defaultPanelHeight
        : 160;

    var domHostRuntime = toRecord(source.homeGuideDomHostRuntime);
    var highlightHostRuntime = toRecord(source.homeGuideHighlightHostRuntime);
    var panelHostRuntime = toRecord(source.homeGuidePanelHostRuntime);
    var doneNoticeHostRuntime = toRecord(source.homeGuideDoneNoticeHostRuntime);

    var applyHomeGuideDomEnsure = asFunction(domHostRuntime.applyHomeGuideDomEnsure);
    var applyHomeGuideHighlightClear = asFunction(highlightHostRuntime.applyHomeGuideHighlightClear);
    var applyHomeGuideTargetElevation = asFunction(highlightHostRuntime.applyHomeGuideTargetElevation);
    var applyHomeGuidePanelPosition = asFunction(panelHostRuntime.applyHomeGuidePanelPosition);
    var resolveHomeGuideTargetVisibility = asFunction(panelHostRuntime.resolveHomeGuideTargetVisibility);
    var applyHomeGuideDoneNotice = asFunction(doneNoticeHostRuntime.applyHomeGuideDoneNotice);

    var finishHostRuntime = toRecord(source.homeGuideFinishHostRuntime);
    var stepHostRuntime = toRecord(source.homeGuideStepHostRuntime);
    var startHostRuntime = toRecord(source.homeGuideStartHostRuntime);
    var controlsHostRuntime = toRecord(source.homeGuideControlsHostRuntime);

    var applyHomeGuideFinishFromContext = asFunction(finishHostRuntime.applyHomeGuideFinishFromContext);
    var applyHomeGuideStepOrchestration = asFunction(stepHostRuntime.applyHomeGuideStepOrchestration);
    var applyHomeGuideStart = asFunction(startHostRuntime.applyHomeGuideStart);
    var applyHomeGuideControls = asFunction(controlsHostRuntime.applyHomeGuideControls);

    function resolveSyncHomeGuideSettingsUI() {
      var direct = asFunction(source.syncHomeGuideSettingsUI);
      if (direct) return direct;
      var resolver = asFunction(source.resolveSyncHomeGuideSettingsUI);
      if (resolver) {
        var resolved = resolver();
        return asFunction(resolved);
      }
      var syncFromWindow = asFunction(toRecord(windowLike).syncHomeGuideSettingsUI);
      if (!syncFromWindow) return null;
      return function () {
        return syncFromWindow.call(windowLike);
      };
    }

    function ensureHomeGuideDom() {
      if (!applyHomeGuideDomEnsure) return null;
      return applyHomeGuideDomEnsure({
        documentLike: documentLike,
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState: homeGuideState
      });
    }

    function clearHomeGuideHighlight() {
      if (!applyHomeGuideHighlightClear) return null;
      return applyHomeGuideHighlightClear({
        documentLike: documentLike,
        homeGuideState: homeGuideState
      });
    }

    function elevateHomeGuideTarget(target) {
      if (!applyHomeGuideTargetElevation) return null;
      return applyHomeGuideTargetElevation({
        target: target || null,
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState: homeGuideState
      });
    }

    function positionHomeGuidePanel() {
      if (!applyHomeGuidePanelPosition) return null;
      return applyHomeGuidePanelPosition({
        homeGuideState: homeGuideState,
        homeGuideRuntime: source.homeGuideRuntime,
        mobileViewportRuntime: source.mobileViewportRuntime,
        windowLike: windowLike,
        mobileUiMaxWidth: mobileUiMaxWidth,
        margin: panelMargin,
        defaultPanelHeight: defaultPanelHeight
      });
    }

    function isElementVisibleForGuide(node) {
      if (!resolveHomeGuideTargetVisibility) return false;
      return !!resolveHomeGuideTargetVisibility({
        homeGuideRuntime: source.homeGuideRuntime,
        windowLike: windowLike,
        node: node || null
      });
    }

    function showHomeGuideDoneNotice() {
      if (!applyHomeGuideDoneNotice) return null;
      return applyHomeGuideDoneNotice({
        documentLike: documentLike,
        homeGuideRuntime: source.homeGuideRuntime,
        setTimeoutLike: source.setTimeoutLike,
        clearTimeoutLike: source.clearTimeoutLike
      });
    }

    function finishHomeGuide(markSeen, options) {
      if (!applyHomeGuideFinishFromContext) return null;
      return applyHomeGuideFinishFromContext({
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState: homeGuideState,
        markSeen: markSeen,
        options: options || {},
        clearHomeGuideHighlight: clearHomeGuideHighlight,
        documentLike: documentLike,
        storageRuntime: source.storageRuntime,
        windowLike: windowLike,
        seenKey: source.seenKey,
        syncHomeGuideSettingsUI: resolveSyncHomeGuideSettingsUI(),
        showHomeGuideDoneNotice: showHomeGuideDoneNotice
      });
    }

    function showHomeGuideStep(index) {
      if (!applyHomeGuideStepOrchestration) return null;
      var orchestrationResult = toRecord(
        applyHomeGuideStepOrchestration({
          index: index,
          maxAdvanceLoops: source.maxAdvanceLoops,
          stepFlowHostRuntime: source.homeGuideStepFlowHostRuntime,
          stepViewHostRuntime: source.homeGuideStepViewHostRuntime,
          documentLike: documentLike,
          windowLike: windowLike,
          homeGuideRuntime: source.homeGuideRuntime,
          homeGuideState: homeGuideState,
          mobileViewportRuntime: source.mobileViewportRuntime,
          mobileUiMaxWidth: mobileUiMaxWidth,
          isElementVisibleForGuide: isElementVisibleForGuide,
          clearHomeGuideHighlight: clearHomeGuideHighlight,
          elevateHomeGuideTarget: elevateHomeGuideTarget,
          finishHomeGuide: finishHomeGuide,
          positionHomeGuidePanel: positionHomeGuidePanel
        })
      );
      if (orchestrationResult.didAbort || orchestrationResult.didHitAdvanceLimit) {
        finishHomeGuide(false, { showDoneNotice: false });
      }
      return orchestrationResult;
    }

    function isHomePage() {
      if (!resolvePathname || !isHomePagePath) return false;
      var path = resolvePathname({ locationLike: locationLike });
      return !!isHomePagePath(path);
    }

    function getHomeGuideSteps() {
      if (!buildSteps) return [];
      return buildSteps({
        isCompactViewport: resolveCompactViewport ? !!resolveCompactViewport() : false
      });
    }

    function startHomeGuide(options) {
      if (!applyHomeGuideStart) return null;
      var startResult = toRecord(
        applyHomeGuideStart({
          homeGuideRuntime: source.homeGuideRuntime,
          homeGuideState: homeGuideState,
          options: options || {},
          isHomePage: isHomePage,
          documentLike: documentLike,
          getHomeGuideSteps: getHomeGuideSteps,
          ensureHomeGuideDom: ensureHomeGuideDom
        })
      );
      if (!startResult.didStart) return startResult;
      if (applyHomeGuideControls) {
        applyHomeGuideControls({
          documentLike: documentLike,
          homeGuideRuntime: source.homeGuideRuntime,
          homeGuideState: homeGuideState,
          showHomeGuideStep: showHomeGuideStep,
          finishHomeGuide: finishHomeGuide,
          syncHomeGuideSettingsUI: resolveSyncHomeGuideSettingsUI()
        });
      }
      return startResult;
    }

    return {
      isHomePage: isHomePage,
      getHomeGuideSteps: getHomeGuideSteps,
      ensureHomeGuideDom: ensureHomeGuideDom,
      clearHomeGuideHighlight: clearHomeGuideHighlight,
      elevateHomeGuideTarget: elevateHomeGuideTarget,
      positionHomeGuidePanel: positionHomeGuidePanel,
      isElementVisibleForGuide: isElementVisibleForGuide,
      showHomeGuideDoneNotice: showHomeGuideDoneNotice,
      finishHomeGuide: finishHomeGuide,
      showHomeGuideStep: showHomeGuideStep,
      startHomeGuide: startHomeGuide
    };
  }

  function applyHomeGuideAutoStartPageFromContext(input) {
    var source = toRecord(input);
    var storageLike = resolveStorageByName({
      storageRuntime: source.storageRuntime,
      windowLike: source.windowLike || null,
      storageName: "localStorage"
    });
    var pageResult = applyHomeGuideAutoStartPage({
      homeGuideStartupHostRuntime: source.homeGuideStartupHostRuntime,
      homeGuideRuntime: source.homeGuideRuntime,
      locationLike: source.locationLike,
      storageLike: storageLike,
      seenKey: source.seenKey,
      startHomeGuide: source.startHomeGuide,
      setTimeoutLike: source.setTimeoutLike,
      delayMs: source.delayMs
    });

    return {
      didInvokePageAutoStart: pageResult.didApply,
      localStorageResolved: !!storageLike,
      pageResult: pageResult
    };
  }

  global.CoreHomeGuidePageHostRuntime = global.CoreHomeGuidePageHostRuntime || {};
  global.CoreHomeGuidePageHostRuntime.createHomeGuidePageResolvers =
    createHomeGuidePageResolvers;
  global.CoreHomeGuidePageHostRuntime.createHomeGuideLifecycleResolvers =
    createHomeGuideLifecycleResolvers;
  global.CoreHomeGuidePageHostRuntime.applyHomeGuideSettingsPageInit =
    applyHomeGuideSettingsPageInit;
  global.CoreHomeGuidePageHostRuntime.applyHomeGuideAutoStartPage =
    applyHomeGuideAutoStartPage;
  global.CoreHomeGuidePageHostRuntime.applyHomeGuideAutoStartPageFromContext =
    applyHomeGuideAutoStartPageFromContext;
})(typeof window !== "undefined" ? window : undefined);

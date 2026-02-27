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

  function createIndexUiMobileResolvers(input) {
    var source = toRecord(input);
    var mobileViewportPageHostRuntime = toRecord(source.mobileViewportPageHostRuntime);
    var createMobileViewportPageResolvers = asFunction(
      mobileViewportPageHostRuntime.createMobileViewportPageResolvers
    );
    if (!createMobileViewportPageResolvers) {
      throw new Error("CoreMobileViewportPageHostRuntime is required");
    }

    var mobileViewportPageResolvers = toRecord(
      createMobileViewportPageResolvers({
        mobileViewportRuntime: source.mobileViewportRuntime,
        bodyLike: source.bodyLike || null,
        windowLike: source.windowLike || null,
        navigatorLike: source.navigatorLike || null,
        mobileUiMaxWidth: source.mobileUiMaxWidth,
        compactGameViewportMaxWidth: source.compactGameViewportMaxWidth,
        timerboxCollapseMaxWidth: source.timerboxCollapseMaxWidth
      })
    );

    var isGamePageScope = asFunction(mobileViewportPageResolvers.isGamePageScope);
    var isTimerboxMobileScope = asFunction(mobileViewportPageResolvers.isTimerboxMobileScope);
    var isPracticePageScope = asFunction(mobileViewportPageResolvers.isPracticePageScope);
    var isMobileGameViewport = asFunction(mobileViewportPageResolvers.isMobileGameViewport);
    var isCompactGameViewport = asFunction(mobileViewportPageResolvers.isCompactGameViewport);
    var isTimerboxCollapseViewport = asFunction(
      mobileViewportPageResolvers.isTimerboxCollapseViewport
    );

    if (
      !isGamePageScope ||
      !isTimerboxMobileScope ||
      !isPracticePageScope ||
      !isMobileGameViewport ||
      !isCompactGameViewport ||
      !isTimerboxCollapseViewport
    ) {
      throw new Error("CoreMobileViewportPageHostRuntime is required");
    }

    var mobileTopButtonsPageHostRuntime = toRecord(source.mobileTopButtonsPageHostRuntime);
    var createMobileTopButtonsPageResolvers = asFunction(
      mobileTopButtonsPageHostRuntime.createMobileTopButtonsPageResolvers
    );
    if (!createMobileTopButtonsPageResolvers) {
      throw new Error("CoreMobileTopButtonsPageHostRuntime is required");
    }

    var mobileTopButtonsPageResolvers = toRecord(
      createMobileTopButtonsPageResolvers({
        mobileTopButtonsRuntime: source.mobileTopButtonsRuntime,
        documentLike: source.documentLike || null,
        isGamePageScope: isGamePageScope,
        mobileUndoTopAvailabilityHostRuntime: source.mobileUndoTopAvailabilityHostRuntime,
        mobileUndoTopHostRuntime: source.mobileUndoTopHostRuntime,
        mobileUndoTopRuntime: source.mobileUndoTopRuntime,
        undoActionRuntime: source.undoActionRuntime,
        bodyLike: source.bodyLike || null,
        windowLike: source.windowLike || null,
        isCompactGameViewport: isCompactGameViewport,
        tryUndoFromUi: source.tryUndoFromUi,
        fallbackLabel: source.fallbackUndoLabel
      })
    );

    var ensureMobileUndoTopButton = asFunction(mobileTopButtonsPageResolvers.ensureMobileUndoTopButton);
    var ensureMobileHintToggleButton = asFunction(
      mobileTopButtonsPageResolvers.ensureMobileHintToggleButton
    );
    var syncMobileUndoTopButtonAvailability = asFunction(
      mobileTopButtonsPageResolvers.syncMobileUndoTopButtonAvailability
    );
    var initMobileUndoTopButton = asFunction(mobileTopButtonsPageResolvers.initMobileUndoTopButton);

    if (
      !ensureMobileUndoTopButton ||
      !ensureMobileHintToggleButton ||
      !syncMobileUndoTopButtonAvailability ||
      !initMobileUndoTopButton
    ) {
      throw new Error("CoreMobileTopButtonsPageHostRuntime is required");
    }

    var topActionsPageHostRuntime = toRecord(source.topActionsPageHostRuntime);
    var createTopActionsPageResolvers = asFunction(topActionsPageHostRuntime.createTopActionsPageResolvers);
    if (!createTopActionsPageResolvers) {
      throw new Error("CoreTopActionsPageHostRuntime is required");
    }

    var topActionsPageResolvers = toRecord(
      createTopActionsPageResolvers({
        topActionsRuntime: source.topActionsRuntime,
        topActionsHostRuntime: source.topActionsHostRuntime,
        documentLike: source.documentLike || null,
        isGamePageScope: isGamePageScope,
        isPracticePageScope: isPracticePageScope,
        isCompactGameViewport: isCompactGameViewport
      })
    );

    var syncMobileTopActionsPlacement = asFunction(
      topActionsPageResolvers.syncMobileTopActionsPlacement
    );
    var syncPracticeTopActionsPlacement = asFunction(
      topActionsPageResolvers.syncPracticeTopActionsPlacement
    );
    if (!syncMobileTopActionsPlacement || !syncPracticeTopActionsPlacement) {
      throw new Error("CoreTopActionsPageHostRuntime is required");
    }

    var mobileHintPageHostRuntime = toRecord(source.mobileHintPageHostRuntime);
    var createMobileHintPageResolvers = asFunction(
      mobileHintPageHostRuntime.createMobileHintPageResolvers
    );
    if (!createMobileHintPageResolvers) {
      throw new Error("CoreMobileHintPageHostRuntime is required");
    }

    var mobileHintPageResolvers = toRecord(
      createMobileHintPageResolvers({
        mobileHintModalRuntime: source.mobileHintModalRuntime,
        mobileHintOpenHostRuntime: source.mobileHintOpenHostRuntime,
        mobileHintUiHostRuntime: source.mobileHintUiHostRuntime,
        mobileHintHostRuntime: source.mobileHintHostRuntime,
        mobileHintRuntime: source.mobileHintRuntime,
        mobileHintUiRuntime: source.mobileHintUiRuntime,
        documentLike: source.documentLike || null,
        ensureMobileHintToggleButton: ensureMobileHintToggleButton,
        isGamePageScope: isGamePageScope,
        isCompactGameViewport: isCompactGameViewport,
        overlayId: source.hintOverlayId,
        defaultText: source.hintDefaultText,
        collapsedClassName: source.hintCollapsedClassName,
        introHiddenClassName: source.hintIntroHiddenClassName,
        introSelector: source.hintIntroSelector,
        containerSelector: source.hintContainerSelector
      })
    );

    var ensureMobileHintModalDom = asFunction(mobileHintPageResolvers.ensureMobileHintModalDom);
    var openMobileHintModal = asFunction(mobileHintPageResolvers.openMobileHintModal);
    var closeMobileHintModal = asFunction(mobileHintPageResolvers.closeMobileHintModal);
    var syncMobileHintUI = asFunction(mobileHintPageResolvers.syncMobileHintUI);
    var initMobileHintToggle = asFunction(mobileHintPageResolvers.initMobileHintToggle);

    if (
      !ensureMobileHintModalDom ||
      !openMobileHintModal ||
      !closeMobileHintModal ||
      !syncMobileHintUI ||
      !initMobileHintToggle
    ) {
      throw new Error("CoreMobileHintPageHostRuntime is required");
    }

    var mobileTimerboxPageHostRuntime = toRecord(source.mobileTimerboxPageHostRuntime);
    var createMobileTimerboxPageResolvers = asFunction(
      mobileTimerboxPageHostRuntime.createMobileTimerboxPageResolvers
    );
    if (!createMobileTimerboxPageResolvers) {
      throw new Error("CoreMobileTimerboxPageHostRuntime is required");
    }

    var mobileTimerboxPageResolvers = toRecord(
      createMobileTimerboxPageResolvers({
        mobileTimerboxHostRuntime: source.mobileTimerboxHostRuntime,
        mobileTimerboxRuntime: source.mobileTimerboxRuntime,
        isTimerboxMobileScope: isTimerboxMobileScope,
        isTimerboxCollapseViewport: isTimerboxCollapseViewport,
        documentLike: source.documentLike || null,
        storageRuntime: source.storageRuntime,
        windowLike: source.windowLike || null,
        storageKey: source.timerboxStorageKey,
        hiddenClassName: source.timerboxHiddenClassName,
        expandedClassName: source.timerboxExpandedClassName,
        defaultCollapsed: source.timerboxDefaultCollapsed,
        fallbackHiddenToggleDisplay: source.timerboxFallbackHiddenToggleDisplay,
        fallbackVisibleToggleDisplay: source.timerboxFallbackVisibleToggleDisplay,
        fallbackHiddenAriaExpanded: source.timerboxFallbackHiddenAriaExpanded,
        fallbackExpandLabel: source.timerboxFallbackExpandLabel,
        fallbackCollapseLabel: source.timerboxFallbackCollapseLabel,
        responsiveRelayoutHostRuntime: source.responsiveRelayoutHostRuntime,
        responsiveRelayoutRuntime: source.responsiveRelayoutRuntime,
        syncMobileHintUI: syncMobileHintUI,
        syncMobileTopActionsPlacement: syncMobileTopActionsPlacement,
        syncPracticeTopActionsPlacement: syncPracticeTopActionsPlacement,
        syncMobileUndoTopButtonAvailability: syncMobileUndoTopButtonAvailability,
        relayoutDelayMs: source.timerboxRelayoutDelayMs,
        clearTimeoutLike: source.clearTimeoutLike,
        setTimeoutLike: source.setTimeoutLike
      })
    );

    var syncMobileTimerboxUI = asFunction(mobileTimerboxPageResolvers.syncMobileTimerboxUI);
    var initMobileTimerboxToggle = asFunction(mobileTimerboxPageResolvers.initMobileTimerboxToggle);
    var requestResponsiveGameRelayout = asFunction(
      mobileTimerboxPageResolvers.requestResponsiveGameRelayout
    );

    if (!syncMobileTimerboxUI || !initMobileTimerboxToggle || !requestResponsiveGameRelayout) {
      throw new Error("CoreMobileTimerboxPageHostRuntime is required");
    }

    return {
      isGamePageScope: isGamePageScope,
      isTimerboxMobileScope: isTimerboxMobileScope,
      isPracticePageScope: isPracticePageScope,
      isMobileGameViewport: isMobileGameViewport,
      isCompactGameViewport: isCompactGameViewport,
      isTimerboxCollapseViewport: isTimerboxCollapseViewport,
      ensureMobileUndoTopButton: ensureMobileUndoTopButton,
      ensureMobileHintToggleButton: ensureMobileHintToggleButton,
      syncMobileUndoTopButtonAvailability: syncMobileUndoTopButtonAvailability,
      initMobileUndoTopButton: initMobileUndoTopButton,
      syncMobileTopActionsPlacement: syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement: syncPracticeTopActionsPlacement,
      ensureMobileHintModalDom: ensureMobileHintModalDom,
      openMobileHintModal: openMobileHintModal,
      closeMobileHintModal: closeMobileHintModal,
      syncMobileHintUI: syncMobileHintUI,
      initMobileHintToggle: initMobileHintToggle,
      syncMobileTimerboxUI: syncMobileTimerboxUI,
      initMobileTimerboxToggle: initMobileTimerboxToggle,
      requestResponsiveGameRelayout: requestResponsiveGameRelayout
    };
  }

  global.CoreIndexUiPageResolversHostRuntime = global.CoreIndexUiPageResolversHostRuntime || {};
  global.CoreIndexUiPageResolversHostRuntime.createIndexUiMobileResolvers = createIndexUiMobileResolvers;
})(typeof window !== "undefined" ? window : undefined);

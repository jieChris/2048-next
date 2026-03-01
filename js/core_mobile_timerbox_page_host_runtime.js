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

  function resolveGetElementById(source) {
    var direct = asFunction(source.getElementById);
    if (direct) return direct;
    var documentLike = source.documentLike || null;
    var getElementById = asFunction(toRecord(documentLike).getElementById);
    if (!getElementById) return null;
    return function (id) {
      try {
        return getElementById.call(documentLike, id);
      } catch (_err) {
        return null;
      }
    };
  }

  function createMobileTimerboxPageResolvers(input) {
    var source = toRecord(input);
    var runtime = toRecord(source.mobileTimerboxHostRuntime);
    var responsiveRelayoutHostRuntime = toRecord(source.responsiveRelayoutHostRuntime);
    var getElementById = resolveGetElementById(source);
    var applySyncFromContext = asFunction(runtime.applyMobileTimerboxUiSyncFromContext);
    var applyToggleInit = asFunction(runtime.applyMobileTimerboxToggleInit);
    var applyRelayoutRequestFromContext = asFunction(
      responsiveRelayoutHostRuntime.applyResponsiveRelayoutRequestFromContext
    );
    var fallbackRelayoutRequest = asFunction(source.requestResponsiveGameRelayout);
    var relayoutTimer = Object.prototype.hasOwnProperty.call(source, "initialRelayoutTimer")
      ? source.initialRelayoutTimer
      : null;

    function syncMobileTimerboxUI(options) {
      if (!applySyncFromContext) return null;
      return applySyncFromContext({
        options: options || {},
        isTimerboxMobileScope: source.isTimerboxMobileScope,
        isTimerboxCollapseViewport: source.isTimerboxCollapseViewport,
        getElementById: getElementById,
        storageRuntime: source.storageRuntime,
        windowLike: source.windowLike || null,
        mobileTimerboxRuntime: source.mobileTimerboxRuntime,
        storageKey: source.storageKey,
        hiddenClassName: source.hiddenClassName,
        expandedClassName: source.expandedClassName,
        defaultCollapsed: source.defaultCollapsed,
        fallbackHiddenToggleDisplay: source.fallbackHiddenToggleDisplay,
        fallbackVisibleToggleDisplay: source.fallbackVisibleToggleDisplay,
        fallbackHiddenAriaExpanded: source.fallbackHiddenAriaExpanded,
        fallbackExpandLabel: source.fallbackExpandLabel,
        fallbackCollapseLabel: source.fallbackCollapseLabel
      });
    }

    function requestResponsiveGameRelayout() {
      if (!applyRelayoutRequestFromContext) {
        return fallbackRelayoutRequest ? fallbackRelayoutRequest() : null;
      }
      var requestResult = applyRelayoutRequestFromContext({
        responsiveRelayoutRuntime: source.responsiveRelayoutRuntime,
        isTimerboxMobileScope: source.isTimerboxMobileScope,
        existingTimer: relayoutTimer,
        delayMs: source.relayoutDelayMs,
        clearTimeoutLike: source.clearTimeoutLike,
        setTimeoutLike: source.setTimeoutLike,
        syncMobileHintUI: source.syncMobileHintUI,
        syncMobileTopActionsPlacement: source.syncMobileTopActionsPlacement,
        syncPracticeTopActionsPlacement: source.syncPracticeTopActionsPlacement,
        syncMobileUndoTopButtonAvailability: source.syncMobileUndoTopButtonAvailability,
        syncMobileTimerboxUI: syncMobileTimerboxUI,
        windowLike: source.windowLike || null
      });
      if (requestResult && Object.prototype.hasOwnProperty.call(requestResult, "timerRef")) {
        relayoutTimer = toRecord(requestResult).timerRef;
      }
      return requestResult;
    }

    function initMobileTimerboxToggle() {
      if (!applyToggleInit) return null;
      return applyToggleInit({
        isTimerboxMobileScope: source.isTimerboxMobileScope,
        getElementById: getElementById,
        syncMobileTimerboxUI: syncMobileTimerboxUI,
        requestResponsiveGameRelayout: requestResponsiveGameRelayout,
        syncMobileTopActionsPlacement: source.syncMobileTopActionsPlacement,
        syncPracticeTopActionsPlacement: source.syncPracticeTopActionsPlacement,
        syncMobileUndoTopButtonAvailability: source.syncMobileUndoTopButtonAvailability
      });
    }

    return {
      syncMobileTimerboxUI: syncMobileTimerboxUI,
      initMobileTimerboxToggle: initMobileTimerboxToggle,
      requestResponsiveGameRelayout: requestResponsiveGameRelayout
    };
  }

  global.CoreMobileTimerboxPageHostRuntime = global.CoreMobileTimerboxPageHostRuntime || {};
  global.CoreMobileTimerboxPageHostRuntime.createMobileTimerboxPageResolvers =
    createMobileTimerboxPageResolvers;
})(typeof window !== "undefined" ? window : undefined);

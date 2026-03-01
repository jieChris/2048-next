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

  function resolveScopeValue(value) {
    if (typeof value === "function") {
      return !!value();
    }
    return !!value;
  }

  function resolveDelayMs(value, fallback) {
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  function resolveManagerFromWindow(windowLike) {
    var windowRecord = toRecord(windowLike);
    return windowRecord.game_manager || null;
  }

  function applyResponsiveRelayoutRequest(input) {
    var source = toRecord(input);
    var runtime = toRecord(source.responsiveRelayoutRuntime);
    var resolveRequest = asFunction(runtime.resolveResponsiveRelayoutRequest);
    var applyRelayout = asFunction(runtime.applyResponsiveRelayout);
    var existingTimer = source.existingTimer;
    var fallbackDelay = resolveDelayMs(source.delayMs, 120);
    if (!resolveRequest || !applyRelayout) {
      return {
        didRequest: false,
        shouldSchedule: false,
        shouldClearExistingTimer: false,
        didClearExistingTimer: false,
        didSchedule: false,
        timerRef: existingTimer || null,
        delayMs: fallbackDelay
      };
    }

    var requestState = toRecord(
      resolveRequest({
        isTimerboxMobileScope: resolveScopeValue(source.isTimerboxMobileScope),
        hasExistingTimer: !!existingTimer,
        delayMs: fallbackDelay
      })
    );
    var shouldSchedule = !!requestState.shouldSchedule;
    var shouldClearExistingTimer = !!requestState.shouldClearExistingTimer;
    var delayMs = resolveDelayMs(requestState.delayMs, fallbackDelay);

    var didClearExistingTimer = false;
    if (shouldClearExistingTimer && existingTimer) {
      var clearTimeoutLike = asFunction(source.clearTimeoutLike);
      if (clearTimeoutLike) {
        clearTimeoutLike(existingTimer);
        didClearExistingTimer = true;
      }
    }

    var timerRef = existingTimer || null;
    var didSchedule = false;
    if (shouldSchedule) {
      var setTimeoutLike = asFunction(source.setTimeoutLike);
      if (setTimeoutLike) {
        timerRef = setTimeoutLike(function () {
          applyRelayout({
            syncMobileHintUI: source.syncMobileHintUI,
            syncMobileTopActionsPlacement: source.syncMobileTopActionsPlacement,
            syncPracticeTopActionsPlacement: source.syncPracticeTopActionsPlacement,
            syncMobileUndoTopButtonAvailability: source.syncMobileUndoTopButtonAvailability,
            syncMobileTimerboxUI: source.syncMobileTimerboxUI,
            manager: source.manager || null
          });
        }, delayMs);
        didSchedule = true;
      }
    }

    return {
      didRequest: true,
      shouldSchedule: shouldSchedule,
      shouldClearExistingTimer: shouldClearExistingTimer,
      didClearExistingTimer: didClearExistingTimer,
      didSchedule: didSchedule,
      timerRef: timerRef,
      delayMs: delayMs
    };
  }

  function applyResponsiveRelayoutRequestFromContext(input) {
    var source = toRecord(input);
    var manager = resolveManagerFromWindow(source.windowLike);
    var requestResult = applyResponsiveRelayoutRequest({
      responsiveRelayoutRuntime: source.responsiveRelayoutRuntime,
      isTimerboxMobileScope: source.isTimerboxMobileScope,
      existingTimer: source.existingTimer,
      delayMs: source.delayMs,
      clearTimeoutLike: source.clearTimeoutLike,
      setTimeoutLike: source.setTimeoutLike,
      syncMobileHintUI: source.syncMobileHintUI,
      syncMobileTopActionsPlacement: source.syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement: source.syncPracticeTopActionsPlacement,
      syncMobileUndoTopButtonAvailability: source.syncMobileUndoTopButtonAvailability,
      syncMobileTimerboxUI: source.syncMobileTimerboxUI,
      manager: manager
    });

    return {
      didInvokeRequest: requestResult.didRequest,
      managerResolved: !!manager,
      requestResult: requestResult
    };
  }

  global.CoreResponsiveRelayoutHostRuntime = global.CoreResponsiveRelayoutHostRuntime || {};
  global.CoreResponsiveRelayoutHostRuntime.applyResponsiveRelayoutRequest =
    applyResponsiveRelayoutRequest;
  global.CoreResponsiveRelayoutHostRuntime.applyResponsiveRelayoutRequestFromContext =
    applyResponsiveRelayoutRequestFromContext;
})(typeof window !== "undefined" ? window : undefined);

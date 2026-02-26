(function (global) {
  "use strict";

  if (!global) return;

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function toDelayMs(value, fallback) {
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  function resolveResponsiveRelayoutRequest(input) {
    var source = input || {};
    var scope = !!source.isTimerboxMobileScope;
    if (!scope) {
      return {
        shouldSchedule: false,
        shouldClearExistingTimer: false,
        delayMs: toDelayMs(source.delayMs, 120)
      };
    }

    return {
      shouldSchedule: true,
      shouldClearExistingTimer: !!source.hasExistingTimer,
      delayMs: toDelayMs(source.delayMs, 120)
    };
  }

  function applyResponsiveRelayout(input) {
    var source = input || {};
    var syncFns = [
      asFunction(source.syncMobileHintUI),
      asFunction(source.syncMobileTopActionsPlacement),
      asFunction(source.syncPracticeTopActionsPlacement),
      asFunction(source.syncMobileUndoTopButtonAvailability),
      asFunction(source.syncMobileTimerboxUI)
    ];
    var syncCallCount = 0;
    for (var i = 0; i < syncFns.length; i++) {
      var fn = syncFns[i];
      if (!fn) continue;
      fn();
      syncCallCount++;
    }

    var managerActuated = false;
    var manager = source.manager && typeof source.manager === "object" ? source.manager : null;
    var actuator = manager && typeof manager === "object" ? manager.actuator : null;
    var invalidateLayoutCache =
      actuator && typeof actuator === "object" ? asFunction(actuator.invalidateLayoutCache) : null;
    var clearTransientTileVisualState = manager ? asFunction(manager.clearTransientTileVisualState) : null;
    var actuate = manager ? asFunction(manager.actuate) : null;

    if (invalidateLayoutCache) {
      invalidateLayoutCache.call(actuator);
    }
    if (clearTransientTileVisualState) {
      clearTransientTileVisualState.call(manager);
    }
    if (actuate) {
      actuate.call(manager);
      managerActuated = true;
    }

    return {
      ran: true,
      syncCallCount: syncCallCount,
      managerActuated: managerActuated
    };
  }

  global.CoreResponsiveRelayoutRuntime = global.CoreResponsiveRelayoutRuntime || {};
  global.CoreResponsiveRelayoutRuntime.resolveResponsiveRelayoutRequest =
    resolveResponsiveRelayoutRequest;
  global.CoreResponsiveRelayoutRuntime.applyResponsiveRelayout = applyResponsiveRelayout;
})(typeof window !== "undefined" ? window : undefined);

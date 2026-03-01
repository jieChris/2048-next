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

  function getElementById(documentLike, id) {
    var getter = asFunction(toRecord(documentLike).getElementById);
    if (!getter) return null;
    return getter.call(documentLike, id);
  }

  function resolveRetryDelay(value, fallback) {
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  function applyTimerModuleSettingsPageInit(input) {
    var source = toRecord(input);
    var hostRuntime = toRecord(source.timerModuleSettingsHostRuntime);
    var ensureToggle = asFunction(hostRuntime.ensureTimerModuleSettingsToggle);
    var applyUi = asFunction(hostRuntime.applyTimerModuleSettingsUi);
    if (!ensureToggle || !applyUi) {
      return {
        hasEnsureToggleApi: !!ensureToggle,
        hasApplyUiApi: !!applyUi,
        hasToggle: false,
        hasNoteElement: false,
        didScheduleRetry: false,
        didBindToggle: false,
        didSync: false
      };
    }

    var toggle =
      ensureToggle({
        documentLike: source.documentLike,
        timerModuleRuntime: source.timerModuleRuntime
      }) || null;
    var noteElement = getElementById(source.documentLike, "timer-module-view-note");

    var setTimeoutLike = asFunction(source.setTimeoutLike);
    var reinvokeInit = asFunction(source.reinvokeInit);
    var fallbackRetryDelay = resolveRetryDelay(source.retryDelayMs, 60);

    var hostResult = toRecord(
      applyUi({
        toggle: toggle,
        noteElement: noteElement,
        windowLike: source.windowLike,
        timerModuleRuntime: source.timerModuleRuntime,
        retryDelayMs: fallbackRetryDelay,
        scheduleRetry: function (delayMs) {
          if (!setTimeoutLike || !reinvokeInit) return;
          setTimeoutLike(reinvokeInit, resolveRetryDelay(delayMs, fallbackRetryDelay));
        },
        syncMobileTimerboxUi: source.syncMobileTimerboxUi || null
      })
    );

    return {
      hasEnsureToggleApi: true,
      hasApplyUiApi: true,
      hasToggle: !!toggle,
      hasNoteElement: !!noteElement,
      didScheduleRetry: !!hostResult.didScheduleRetry,
      didBindToggle: !!hostResult.didBindToggle,
      didSync: !!hostResult.didSync
    };
  }

  global.CoreTimerModuleSettingsPageHostRuntime =
    global.CoreTimerModuleSettingsPageHostRuntime || {};
  global.CoreTimerModuleSettingsPageHostRuntime.applyTimerModuleSettingsPageInit =
    applyTimerModuleSettingsPageInit;
})(typeof window !== "undefined" ? window : undefined);

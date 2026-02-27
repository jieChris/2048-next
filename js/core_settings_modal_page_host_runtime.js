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

  function resolveSyncMobileTimerboxUi(source) {
    var direct = asFunction(source.syncMobileTimerboxUi);
    if (direct) return direct;

    var resolver = asFunction(source.resolveSyncMobileTimerboxUi);
    if (resolver) {
      var resolved = resolver();
      var callback = asFunction(resolved);
      if (callback) return callback;
    }

    var windowLike = source.windowLike || null;
    var syncFromWindow = asFunction(toRecord(windowLike).syncMobileTimerboxUI);
    if (!syncFromWindow) return null;
    return function () {
      return syncFromWindow.call(windowLike);
    };
  }

  function createSettingsModalInitResolvers(input) {
    var source = toRecord(input);
    var windowLike = source.windowLike || null;
    var retryDelayMs = resolvePositiveNumber(source.retryDelayMs, 60);
    var setTimeoutLike = asFunction(source.setTimeoutLike);
    var themePageHostRuntime = toRecord(source.themeSettingsPageHostRuntime);
    var timerSettingsHostRuntime = toRecord(source.timerModuleSettingsHostRuntime);
    var timerSettingsPageHostRuntime = toRecord(source.timerModuleSettingsPageHostRuntime);
    var applyThemeSettingsPageInit = asFunction(themePageHostRuntime.applyThemeSettingsPageInit);
    var applyLegacyUndoSettingsCleanup = asFunction(
      timerSettingsHostRuntime.applyLegacyUndoSettingsCleanup
    );
    var applyTimerModuleSettingsPageInit = asFunction(
      timerSettingsPageHostRuntime.applyTimerModuleSettingsPageInit
    );

    function initThemeSettingsUI() {
      if (!applyThemeSettingsPageInit) return null;
      return applyThemeSettingsPageInit({
        themeSettingsHostRuntime: source.themeSettingsHostRuntime,
        themeSettingsRuntime: source.themeSettingsRuntime,
        documentLike: source.documentLike,
        windowLike: windowLike
      });
    }

    function removeLegacyUndoSettingsUI() {
      if (!applyLegacyUndoSettingsCleanup) return null;
      return applyLegacyUndoSettingsCleanup({
        documentLike: source.documentLike
      });
    }

    function initTimerModuleSettingsUI() {
      if (!applyTimerModuleSettingsPageInit) return null;
      return applyTimerModuleSettingsPageInit({
        timerModuleSettingsHostRuntime: source.timerModuleSettingsHostRuntime,
        timerModuleRuntime: source.timerModuleRuntime,
        documentLike: source.documentLike,
        windowLike: windowLike,
        retryDelayMs: retryDelayMs,
        setTimeoutLike: setTimeoutLike,
        reinvokeInit: initTimerModuleSettingsUI,
        syncMobileTimerboxUi: resolveSyncMobileTimerboxUi(source)
      });
    }

    return {
      initThemeSettingsUI: initThemeSettingsUI,
      removeLegacyUndoSettingsUI: removeLegacyUndoSettingsUI,
      initTimerModuleSettingsUI: initTimerModuleSettingsUI
    };
  }

  function createSettingsModalActionResolvers(input) {
    var source = toRecord(input);
    var pageHostRuntime = toRecord(source.settingsModalPageHostRuntime);

    function openSettingsModal() {
      var applyOpen = asFunction(pageHostRuntime.applySettingsModalPageOpen);
      if (applyOpen) {
        return applyOpen({
          settingsModalHostRuntime: source.settingsModalHostRuntime,
          replayModalRuntime: source.replayModalRuntime,
          documentLike: source.documentLike,
          removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
          initThemeSettingsUI: source.initThemeSettingsUI,
          initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
          initHomeGuideSettingsUI: source.initHomeGuideSettingsUI
        });
      }
      return applySettingsModalPageOpen({
        settingsModalHostRuntime: source.settingsModalHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike,
        removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
        initThemeSettingsUI: source.initThemeSettingsUI,
        initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
        initHomeGuideSettingsUI: source.initHomeGuideSettingsUI
      });
    }

    function closeSettingsModal() {
      var applyClose = asFunction(pageHostRuntime.applySettingsModalPageClose);
      if (applyClose) {
        return applyClose({
          settingsModalHostRuntime: source.settingsModalHostRuntime,
          replayModalRuntime: source.replayModalRuntime,
          documentLike: source.documentLike
        });
      }
      return applySettingsModalPageClose({
        settingsModalHostRuntime: source.settingsModalHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike
      });
    }

    return {
      openSettingsModal: openSettingsModal,
      closeSettingsModal: closeSettingsModal
    };
  }

  function applySettingsModalPageOpen(input) {
    var source = toRecord(input);
    var hostRuntime = toRecord(source.settingsModalHostRuntime);
    var applyOpen = asFunction(hostRuntime.applySettingsModalOpenOrchestration);
    if (!applyOpen) {
      return {
        hasApplyOpenApi: false,
        didApply: false
      };
    }

    applyOpen({
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike,
      removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
      initThemeSettingsUI: source.initThemeSettingsUI,
      initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
      initHomeGuideSettingsUI: source.initHomeGuideSettingsUI
    });

    return {
      hasApplyOpenApi: true,
      didApply: true
    };
  }

  function applySettingsModalPageClose(input) {
    var source = toRecord(input);
    var hostRuntime = toRecord(source.settingsModalHostRuntime);
    var applyClose = asFunction(hostRuntime.applySettingsModalCloseOrchestration);
    if (!applyClose) {
      return {
        hasApplyCloseApi: false,
        didApply: false
      };
    }

    applyClose({
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike
    });

    return {
      hasApplyCloseApi: true,
      didApply: true
    };
  }

  global.CoreSettingsModalPageHostRuntime = global.CoreSettingsModalPageHostRuntime || {};
  global.CoreSettingsModalPageHostRuntime.createSettingsModalActionResolvers =
    createSettingsModalActionResolvers;
  global.CoreSettingsModalPageHostRuntime.createSettingsModalInitResolvers =
    createSettingsModalInitResolvers;
  global.CoreSettingsModalPageHostRuntime.applySettingsModalPageOpen = applySettingsModalPageOpen;
  global.CoreSettingsModalPageHostRuntime.applySettingsModalPageClose = applySettingsModalPageClose;
})(typeof window !== "undefined" ? window : undefined);

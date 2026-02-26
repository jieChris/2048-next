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
  global.CoreSettingsModalPageHostRuntime.applySettingsModalPageOpen = applySettingsModalPageOpen;
  global.CoreSettingsModalPageHostRuntime.applySettingsModalPageClose = applySettingsModalPageClose;
})(typeof window !== "undefined" ? window : undefined);

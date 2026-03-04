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

  function invoke(callback) {
    var fn = asFunction(callback);
    if (!fn) return false;
    fn();
    return true;
  }

  function applySettingsModalOpenOrchestration(input) {
    var source = toRecord(input);
    var replayModalRuntime = toRecord(source.replayModalRuntime);
    var applySettingsModalOpen = asFunction(replayModalRuntime.applySettingsModalOpen);

    var didOpen = false;
    if (applySettingsModalOpen) {
      applySettingsModalOpen({
        documentLike: source.documentLike
      });
      didOpen = true;
    }

    var initCallCount = 0;
    if (invoke(source.removeLegacyUndoSettingsUI)) initCallCount += 1;
    if (invoke(source.initThemeSettingsUI)) initCallCount += 1;
    if (invoke(source.initTimerModuleSettingsUI)) initCallCount += 1;
    if (invoke(source.initWinPromptSettingsUI)) initCallCount += 1;
    if (invoke(source.initHomeGuideSettingsUI)) initCallCount += 1;

    return {
      didOpen: didOpen,
      initCallCount: initCallCount
    };
  }

  function applySettingsModalCloseOrchestration(input) {
    var source = toRecord(input);
    var replayModalRuntime = toRecord(source.replayModalRuntime);
    var applySettingsModalClose = asFunction(replayModalRuntime.applySettingsModalClose);

    if (!applySettingsModalClose) {
      return {
        didClose: false
      };
    }

    applySettingsModalClose({
      documentLike: source.documentLike
    });

    return {
      didClose: true
    };
  }

  global.CoreSettingsModalHostRuntime = global.CoreSettingsModalHostRuntime || {};
  global.CoreSettingsModalHostRuntime.applySettingsModalOpenOrchestration =
    applySettingsModalOpenOrchestration;
  global.CoreSettingsModalHostRuntime.applySettingsModalCloseOrchestration =
    applySettingsModalCloseOrchestration;
})(typeof window !== "undefined" ? window : undefined);

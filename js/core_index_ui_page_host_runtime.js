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

  function createIndexUiTryUndoHandler(input) {
    var source = toRecord(input);
    var undoActionRuntime = toRecord(source.undoActionRuntime);
    var windowLike = source.windowLike || null;
    var direction = typeof source.direction === "number" ? source.direction : -1;

    return function tryUndoFromUi() {
      var tryTriggerUndoFromContext = asFunction(
        toRecord(undoActionRuntime).tryTriggerUndoFromContext
      );
      if (!tryTriggerUndoFromContext) return false;
      var result = toRecord(
        tryTriggerUndoFromContext({
          windowLike: windowLike,
          direction: direction
        })
      );
      return !!result.didTrigger;
    };
  }

  function bindGlobalFunction(windowRecord, key, callback) {
    var fn = asFunction(callback);
    if (!fn) return false;
    windowRecord[key] = fn;
    return true;
  }

  function applyIndexUiPageBootstrap(input) {
    var source = toRecord(input);
    var windowRecord = toRecord(source.windowLike);
    var documentRecord = toRecord(source.documentLike);
    var indexUiStartupHostRuntime = toRecord(source.indexUiStartupHostRuntime);
    var applyIndexUiStartup = asFunction(indexUiStartupHostRuntime.applyIndexUiStartup);
    var getElementByIdRaw = asFunction(documentRecord.getElementById);
    var getElementById = getElementByIdRaw
      ? function (id) {
          return getElementByIdRaw.call(documentRecord, id);
        }
      : null;
    var addEventListener = asFunction(documentRecord.addEventListener);
    var formatPrettyTime = asFunction(toRecord(source.prettyTimeRuntime).formatPrettyTime);
    var nowMs = asFunction(source.nowMs);
    var touchGuardWindowMs =
      typeof source.touchGuardWindowMs === "number" && isFinite(source.touchGuardWindowMs)
        ? source.touchGuardWindowMs
        : 450;

    var appliedGlobalBindings = false;
    if (bindGlobalFunction(windowRecord, "syncMobileTimerboxUI", source.syncMobileTimerboxUI)) {
      appliedGlobalBindings = true;
    }
    if (bindGlobalFunction(windowRecord, "syncMobileHintUI", source.syncMobileHintUI)) {
      appliedGlobalBindings = true;
    }
    if (
      bindGlobalFunction(
        windowRecord,
        "syncMobileUndoTopButtonAvailability",
        source.syncMobileUndoTopButtonAvailability
      )
    ) {
      appliedGlobalBindings = true;
    }
    if (
      bindGlobalFunction(windowRecord, "openPracticeBoardFromCurrent", source.openPracticeBoardFromCurrent)
    ) {
      appliedGlobalBindings = true;
    }
    if (bindGlobalFunction(windowRecord, "closeReplayModal", source.closeReplayModal)) {
      appliedGlobalBindings = true;
    }
    if (bindGlobalFunction(windowRecord, "exportReplay", source.exportReplay)) {
      appliedGlobalBindings = true;
    }
    if (bindGlobalFunction(windowRecord, "openSettingsModal", source.openSettingsModal)) {
      appliedGlobalBindings = true;
    }
    if (bindGlobalFunction(windowRecord, "closeSettingsModal", source.closeSettingsModal)) {
      appliedGlobalBindings = true;
    }
    if (formatPrettyTime) {
      windowRecord.pretty = function (time) {
        return formatPrettyTime(time);
      };
      appliedGlobalBindings = true;
    }

    var startupInvoked = false;
    var startupHandler = function () {
      if (!applyIndexUiStartup || !getElementById) return null;
      startupInvoked = true;
      return applyIndexUiStartup({
        topActionBindingsHostRuntime: source.topActionBindingsHostRuntime,
        gameOverUndoHostRuntime: source.gameOverUndoHostRuntime,
        getElementById: getElementById,
        windowLike: source.windowLike || null,
        tryUndo: source.tryUndoFromUi,
        exportReplay: windowRecord.exportReplay,
        openPracticeBoardFromCurrent: windowRecord.openPracticeBoardFromCurrent,
        openSettingsModal: windowRecord.openSettingsModal,
        closeSettingsModal: windowRecord.closeSettingsModal,
        initThemeSettingsUI: source.initThemeSettingsUI,
        removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
        initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
        initMobileHintToggle: source.initMobileHintToggle,
        initMobileUndoTopButton: source.initMobileUndoTopButton,
        initHomeGuideSettingsUI: source.initHomeGuideSettingsUI,
        autoStartHomeGuideIfNeeded: source.autoStartHomeGuideIfNeeded,
        initMobileTimerboxToggle: source.initMobileTimerboxToggle,
        requestResponsiveGameRelayout: source.requestResponsiveGameRelayout,
        nowMs: nowMs
          ? nowMs
          : function () {
              return Date.now();
            },
        touchGuardWindowMs: touchGuardWindowMs
      });
    };

    var boundDomContentLoaded = false;
    if (!documentRecord.__indexUiPageBootstrapBound && addEventListener) {
      addEventListener.call(documentRecord, "DOMContentLoaded", startupHandler);
      documentRecord.__indexUiPageBootstrapBound = true;
      boundDomContentLoaded = true;
    }

    return {
      appliedGlobalBindings: appliedGlobalBindings,
      boundDomContentLoaded: boundDomContentLoaded,
      startupInvoked: startupInvoked
    };
  }

  global.CoreIndexUiPageHostRuntime = global.CoreIndexUiPageHostRuntime || {};
  global.CoreIndexUiPageHostRuntime.createIndexUiTryUndoHandler = createIndexUiTryUndoHandler;
  global.CoreIndexUiPageHostRuntime.applyIndexUiPageBootstrap = applyIndexUiPageBootstrap;
})(typeof window !== "undefined" ? window : undefined);

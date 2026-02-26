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

  function bindWindowListener(windowLike, eventName, handler) {
    var win = toRecord(windowLike);
    var addEventListener = asFunction(win.addEventListener);
    var listener = asFunction(handler);
    if (!addEventListener || !listener) return false;
    addEventListener.call(win, eventName, listener);
    return true;
  }

  function applyIndexUiStartup(input) {
    var source = toRecord(input);
    var getElementById = asFunction(source.getElementById);

    var appliedTopActionBindings = false;
    var topActionBindingsHostRuntime = toRecord(source.topActionBindingsHostRuntime);
    var applyTopActionBindings = asFunction(topActionBindingsHostRuntime.applyTopActionBindings);
    if (applyTopActionBindings && getElementById) {
      applyTopActionBindings({
        getElementById: getElementById,
        tryUndo: source.tryUndo,
        exportReplay: source.exportReplay,
        openPracticeBoardFromCurrent: source.openPracticeBoardFromCurrent,
        openSettingsModal: source.openSettingsModal,
        closeSettingsModal: source.closeSettingsModal
      });
      appliedTopActionBindings = true;
    }

    var initCallCount = 0;
    if (invoke(source.initThemeSettingsUI)) initCallCount += 1;
    if (invoke(source.removeLegacyUndoSettingsUI)) initCallCount += 1;
    if (invoke(source.initTimerModuleSettingsUI)) initCallCount += 1;
    if (invoke(source.initMobileHintToggle)) initCallCount += 1;
    if (invoke(source.initMobileUndoTopButton)) initCallCount += 1;
    if (invoke(source.initHomeGuideSettingsUI)) initCallCount += 1;
    if (invoke(source.autoStartHomeGuideIfNeeded)) initCallCount += 1;

    var appliedGameOverUndoBinding = false;
    var gameOverUndoHostRuntime = toRecord(source.gameOverUndoHostRuntime);
    var bindGameOverUndoControl = asFunction(gameOverUndoHostRuntime.bindGameOverUndoControl);
    if (bindGameOverUndoControl && getElementById) {
      bindGameOverUndoControl({
        getElementById: getElementById,
        tryUndo: source.tryUndo,
        nowMs: source.nowMs,
        touchGuardWindowMs: source.touchGuardWindowMs
      });
      appliedGameOverUndoBinding = true;
    }

    if (invoke(source.initMobileTimerboxToggle)) initCallCount += 1;
    if (invoke(source.requestResponsiveGameRelayout)) initCallCount += 1;

    var boundResponsiveRelayoutListeners = false;
    var windowLike = toRecord(source.windowLike);
    var alreadyBound = !!windowLike.__responsiveGameRelayoutBound;
    if (!alreadyBound) {
      var resizeBound = bindWindowListener(windowLike, "resize", source.requestResponsiveGameRelayout);
      var orientationBound = bindWindowListener(
        windowLike,
        "orientationchange",
        source.requestResponsiveGameRelayout
      );
      if (resizeBound || orientationBound) {
        windowLike.__responsiveGameRelayoutBound = true;
        boundResponsiveRelayoutListeners = true;
      }
    }

    return {
      appliedTopActionBindings: appliedTopActionBindings,
      appliedGameOverUndoBinding: appliedGameOverUndoBinding,
      initCallCount: initCallCount,
      boundResponsiveRelayoutListeners: boundResponsiveRelayoutListeners
    };
  }

  global.CoreIndexUiStartupHostRuntime = global.CoreIndexUiStartupHostRuntime || {};
  global.CoreIndexUiStartupHostRuntime.applyIndexUiStartup = applyIndexUiStartup;
})(typeof window !== "undefined" ? window : undefined);

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

  function resolveScope(source) {
    var scopeResolver = asFunction(source.isGamePageScope);
    return scopeResolver ? !!scopeResolver() : false;
  }

  function createMobileTopButtonsPageResolvers(input) {
    var source = toRecord(input);
    var runtime = toRecord(source.mobileTopButtonsRuntime);
    var availabilityHostRuntime = toRecord(source.mobileUndoTopAvailabilityHostRuntime);
    var mobileUndoTopHostRuntime = toRecord(source.mobileUndoTopHostRuntime);
    var documentLike = source.documentLike || null;
    var ensureUndoTop = asFunction(runtime.ensureMobileUndoTopButtonDom);
    var ensureHintTop = asFunction(runtime.ensureMobileHintToggleButtonDom);
    var applyAvailabilitySyncFromContext = asFunction(
      availabilityHostRuntime.applyMobileUndoTopAvailabilitySyncFromContext
    );
    var applyMobileUndoTopInit = asFunction(mobileUndoTopHostRuntime.applyMobileUndoTopInit);
    var fallbackLabel =
      typeof source.fallbackLabel === "string" && source.fallbackLabel
        ? source.fallbackLabel
        : "撤回";

    function ensureMobileUndoTopButton() {
      if (!ensureUndoTop) return null;
      return ensureUndoTop({
        isGamePageScope: resolveScope(source),
        documentLike: documentLike
      });
    }

    function ensureMobileHintToggleButton() {
      if (!ensureHintTop) return null;
      return ensureHintTop({
        isGamePageScope: resolveScope(source),
        documentLike: documentLike
      });
    }

    function syncMobileUndoTopButtonAvailability() {
      if (!applyAvailabilitySyncFromContext) return null;
      return applyAvailabilitySyncFromContext({
        isGamePageScope: source.isGamePageScope,
        ensureMobileUndoTopButton: ensureMobileUndoTopButton,
        isCompactGameViewport: source.isCompactGameViewport,
        bodyLike: source.bodyLike || null,
        windowLike: source.windowLike || null,
        undoActionRuntime: source.undoActionRuntime,
        mobileUndoTopRuntime: source.mobileUndoTopRuntime,
        fallbackLabel: fallbackLabel
      });
    }

    function initMobileUndoTopButton() {
      if (!applyMobileUndoTopInit) return null;
      return applyMobileUndoTopInit({
        isGamePageScope: source.isGamePageScope,
        ensureMobileUndoTopButton: ensureMobileUndoTopButton,
        tryUndoFromUi: source.tryUndoFromUi,
        syncMobileUndoTopButtonAvailability: syncMobileUndoTopButtonAvailability
      });
    }

    return {
      ensureMobileUndoTopButton: ensureMobileUndoTopButton,
      ensureMobileHintToggleButton: ensureMobileHintToggleButton,
      syncMobileUndoTopButtonAvailability: syncMobileUndoTopButtonAvailability,
      initMobileUndoTopButton: initMobileUndoTopButton
    };
  }

  global.CoreMobileTopButtonsPageHostRuntime = global.CoreMobileTopButtonsPageHostRuntime || {};
  global.CoreMobileTopButtonsPageHostRuntime.createMobileTopButtonsPageResolvers =
    createMobileTopButtonsPageResolvers;
})(typeof window !== "undefined" ? window : undefined);

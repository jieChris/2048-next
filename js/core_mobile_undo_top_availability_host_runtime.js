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

  function setStyleProperty(element, property, value) {
    var style = toRecord(toRecord(element).style);
    style[property] = value;
    return true;
  }

  function setAttribute(element, key, value) {
    var setAttributeFn = asFunction(toRecord(element).setAttribute);
    if (!setAttributeFn) return false;
    try {
      setAttributeFn.call(element, key, value);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function resolveStringValue(value, fallback) {
    return typeof value === "string" ? value : fallback;
  }

  function resolveManagerFromWindow(windowLike) {
    var windowRecord = toRecord(windowLike);
    return windowRecord.game_manager || null;
  }

  function resolveGameModeConfigFromWindow(windowLike) {
    var windowRecord = toRecord(windowLike);
    var gameModeConfig = windowRecord.GAME_MODE_CONFIG;
    if (gameModeConfig && typeof gameModeConfig === "object") {
      return gameModeConfig;
    }
    return null;
  }

  function resolveUndoCapabilityState(source) {
    var resolveUndoCapabilityStateFn = asFunction(source.resolveUndoCapabilityState);
    if (resolveUndoCapabilityStateFn) {
      return toRecord(resolveUndoCapabilityStateFn(source.manager || null));
    }

    var undoActionRuntime = toRecord(source.undoActionRuntime);
    var resolveUndoCapabilityFromContext = asFunction(
      undoActionRuntime.resolveUndoCapabilityFromContext
    );
    if (!resolveUndoCapabilityFromContext) return {};

    return toRecord(
      resolveUndoCapabilityFromContext({
        bodyLike: source.bodyLike || null,
        manager: source.manager || null,
        globalModeConfig: source.globalModeConfig || null
      })
    );
  }

  function applyMobileUndoTopAvailabilitySync(input) {
    var source = toRecord(input);
    var isGamePageScope = asFunction(source.isGamePageScope);
    var inScope = !!(isGamePageScope && isGamePageScope());
    if (!inScope) {
      return {
        isScope: false,
        hasButton: false,
        compactViewport: false,
        modeUndoCapable: false,
        canUndoNow: false,
        didApply: false,
        didApplyLabel: false
      };
    }

    var ensureMobileUndoTopButton = asFunction(source.ensureMobileUndoTopButton);
    var button = ensureMobileUndoTopButton ? ensureMobileUndoTopButton() : null;
    if (!button) {
      return {
        isScope: true,
        hasButton: false,
        compactViewport: false,
        modeUndoCapable: false,
        canUndoNow: false,
        didApply: false,
        didApplyLabel: false
      };
    }

    var isCompactGameViewport = asFunction(source.isCompactGameViewport);
    var compactViewport = !!(isCompactGameViewport && isCompactGameViewport());

    var undoCapabilityState = resolveUndoCapabilityState(source);
    var modeUndoCapable = !!undoCapabilityState.modeUndoCapable;

    var undoActionRuntime = toRecord(source.undoActionRuntime);
    var isUndoInteractionEnabled = asFunction(undoActionRuntime.isUndoInteractionEnabled);
    var canUndoNow = !!(
      isUndoInteractionEnabled && isUndoInteractionEnabled(source.manager || null)
    );

    var mobileUndoTopRuntime = toRecord(source.mobileUndoTopRuntime);
    var resolveDisplayModel = asFunction(mobileUndoTopRuntime.resolveMobileUndoTopButtonDisplayModel);
    var resolveAppliedModel = asFunction(mobileUndoTopRuntime.resolveMobileUndoTopAppliedModel);

    var displayModel = toRecord(
      resolveDisplayModel
        ? resolveDisplayModel({
            compactViewport: compactViewport,
            modeUndoCapable: modeUndoCapable,
            canUndoNow: canUndoNow,
            label: "撤回"
          })
        : null
    );
    var fallbackLabel =
      typeof source.fallbackLabel === "string" && source.fallbackLabel ? source.fallbackLabel : "撤回";
    var appliedModel = toRecord(
      resolveAppliedModel
        ? resolveAppliedModel({
            displayModel: displayModel,
            fallbackLabel: fallbackLabel
          })
        : null
    );

    setStyleProperty(button, "display", resolveStringValue(appliedModel.buttonDisplay, "none"));
    setStyleProperty(
      button,
      "pointerEvents",
      resolveStringValue(appliedModel.pointerEvents, "none")
    );
    setStyleProperty(button, "opacity", resolveStringValue(appliedModel.opacity, "0.45"));
    setAttribute(button, "aria-disabled", resolveStringValue(appliedModel.ariaDisabled, "true"));

    var didApplyLabel = false;
    if (!!appliedModel.shouldApplyLabel) {
      var label = String(appliedModel.label || fallbackLabel);
      setAttribute(button, "aria-label", label);
      setAttribute(button, "title", label);
      didApplyLabel = true;
    }

    return {
      isScope: true,
      hasButton: true,
      compactViewport: compactViewport,
      modeUndoCapable: modeUndoCapable,
      canUndoNow: canUndoNow,
      didApply: true,
      didApplyLabel: didApplyLabel
    };
  }

  function applyMobileUndoTopAvailabilitySyncFromContext(input) {
    var source = toRecord(input);
    var manager = resolveManagerFromWindow(source.windowLike);
    var globalModeConfig = resolveGameModeConfigFromWindow(source.windowLike);
    var syncResult = applyMobileUndoTopAvailabilitySync({
      isGamePageScope: source.isGamePageScope,
      ensureMobileUndoTopButton: source.ensureMobileUndoTopButton,
      isCompactGameViewport: source.isCompactGameViewport,
      bodyLike: source.bodyLike,
      manager: manager,
      globalModeConfig: globalModeConfig,
      resolveUndoCapabilityState: source.resolveUndoCapabilityState,
      undoActionRuntime: source.undoActionRuntime,
      mobileUndoTopRuntime: source.mobileUndoTopRuntime,
      fallbackLabel: source.fallbackLabel
    });

    return {
      didInvokeSync: syncResult.didApply,
      managerResolved: !!manager,
      modeConfigResolved: !!globalModeConfig,
      syncResult: syncResult
    };
  }

  global.CoreMobileUndoTopAvailabilityHostRuntime =
    global.CoreMobileUndoTopAvailabilityHostRuntime || {};
  global.CoreMobileUndoTopAvailabilityHostRuntime.applyMobileUndoTopAvailabilitySync =
    applyMobileUndoTopAvailabilitySync;
  global.CoreMobileUndoTopAvailabilityHostRuntime.applyMobileUndoTopAvailabilitySyncFromContext =
    applyMobileUndoTopAvailabilitySyncFromContext;
})(typeof window !== "undefined" ? window : undefined);

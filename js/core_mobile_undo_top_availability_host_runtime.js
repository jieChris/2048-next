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

    var resolveUndoCapabilityState = asFunction(source.resolveUndoCapabilityState);
    var undoCapabilityState = toRecord(
      resolveUndoCapabilityState ? resolveUndoCapabilityState(source.manager || null) : null
    );
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

  global.CoreMobileUndoTopAvailabilityHostRuntime =
    global.CoreMobileUndoTopAvailabilityHostRuntime || {};
  global.CoreMobileUndoTopAvailabilityHostRuntime.applyMobileUndoTopAvailabilitySync =
    applyMobileUndoTopAvailabilitySync;
})(typeof window !== "undefined" ? window : undefined);

(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_LABEL = "撤回";

  function resolveLabel(value) {
    return typeof value === "string" && value ? value : DEFAULT_LABEL;
  }

  function resolveMobileUndoTopButtonDisplayModel(options) {
    var opts = options || {};
    var shouldShow = !!opts.compactViewport && !!opts.modeUndoCapable;
    var canUndoNow = shouldShow && !!opts.canUndoNow;
    var label = resolveLabel(opts.label);

    if (!shouldShow) {
      return {
        shouldShow: false,
        buttonDisplay: "none",
        pointerEvents: "none",
        opacity: "0.45",
        ariaDisabled: "true",
        label: label
      };
    }

    return {
      shouldShow: true,
      buttonDisplay: "inline-flex",
      pointerEvents: canUndoNow ? "" : "none",
      opacity: canUndoNow ? "" : "0.45",
      ariaDisabled: canUndoNow ? "false" : "true",
      label: label
    };
  }

  function resolveMobileUndoTopAppliedModel(options) {
    var opts = options || {};
    var model = opts.displayModel || null;
    var fallbackLabel = resolveLabel(opts.fallbackLabel);
    var shouldShow = !!(model && model.shouldShow);
    var buttonDisplay =
      model && (model.buttonDisplay === "inline-flex" || model.buttonDisplay === "none")
        ? model.buttonDisplay
        : "none";
    var pointerEvents =
      model && (model.pointerEvents === "" || model.pointerEvents === "none")
        ? model.pointerEvents
        : "none";
    var opacity =
      model && (model.opacity === "" || model.opacity === "0.45") ? model.opacity : "0.45";
    var ariaDisabled =
      model && (model.ariaDisabled === "true" || model.ariaDisabled === "false")
        ? model.ariaDisabled
        : "true";
    var label = model && typeof model.label === "string" && model.label ? model.label : fallbackLabel;
    return {
      shouldShow: shouldShow,
      buttonDisplay: buttonDisplay,
      pointerEvents: pointerEvents,
      opacity: opacity,
      ariaDisabled: ariaDisabled,
      label: label,
      shouldApplyLabel: shouldShow
    };
  }

  global.CoreMobileUndoTopRuntime = global.CoreMobileUndoTopRuntime || {};
  global.CoreMobileUndoTopRuntime.resolveMobileUndoTopButtonDisplayModel =
    resolveMobileUndoTopButtonDisplayModel;
  global.CoreMobileUndoTopRuntime.resolveMobileUndoTopAppliedModel =
    resolveMobileUndoTopAppliedModel;
})(typeof window !== "undefined" ? window : undefined);

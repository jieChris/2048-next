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

  global.CoreMobileUndoTopRuntime = global.CoreMobileUndoTopRuntime || {};
  global.CoreMobileUndoTopRuntime.resolveMobileUndoTopButtonDisplayModel =
    resolveMobileUndoTopButtonDisplayModel;
})(typeof window !== "undefined" ? window : undefined);

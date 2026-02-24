(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_STORAGE_KEY = "ui_timerbox_collapsed_mobile_v1";
  var LABEL_EXPAND = "展开计时器";
  var LABEL_COLLAPSE = "收起计时器";
  var ICON_COLLAPSED =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  var ICON_EXPANDED =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"></polyline></svg>';

  function resolveStorageKey(value) {
    return typeof value === "string" && value ? value : DEFAULT_STORAGE_KEY;
  }

  function resolveStoredMobileTimerboxCollapsed(options) {
    var opts = options || {};
    var fallback = typeof opts.defaultCollapsed === "boolean" ? opts.defaultCollapsed : true;
    var storage = opts.storageLike || null;
    if (!storage || typeof storage.getItem !== "function") return fallback;

    try {
      var raw = storage.getItem(resolveStorageKey(opts.storageKey));
      if (raw === "0") return false;
      if (raw === "1") return true;
      return fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function persistMobileTimerboxCollapsed(options) {
    var opts = options || {};
    var storage = opts.storageLike || null;
    if (!storage || typeof storage.setItem !== "function") return false;

    try {
      storage.setItem(resolveStorageKey(opts.storageKey), opts.collapsed ? "1" : "0");
      return true;
    } catch (_err) {
      return false;
    }
  }

  function getTimerboxToggleIconSvg(collapsed) {
    return collapsed ? ICON_COLLAPSED : ICON_EXPANDED;
  }

  function resolveMobileTimerboxCollapsedValue(options) {
    var opts = options || {};
    if (typeof opts.collapsedOption === "boolean") return opts.collapsedOption;
    if (typeof opts.storedCollapsed === "boolean") return opts.storedCollapsed;
    return typeof opts.defaultCollapsed === "boolean" ? opts.defaultCollapsed : true;
  }

  function resolveMobileTimerboxDisplayModel(options) {
    var opts = options || {};
    var showToggle = !!opts.collapsible && !opts.timerModuleHidden;
    if (!showToggle) {
      return {
        showToggle: false,
        toggleDisplay: "none",
        ariaExpanded: "false",
        label: LABEL_EXPAND,
        iconSvg: ICON_COLLAPSED,
        expanded: false
      };
    }

    var collapsed = typeof opts.collapsed === "boolean" ? opts.collapsed : true;
    var expanded = !collapsed;
    return {
      showToggle: true,
      toggleDisplay: "inline-flex",
      ariaExpanded: expanded ? "true" : "false",
      label: expanded ? LABEL_COLLAPSE : LABEL_EXPAND,
      iconSvg: getTimerboxToggleIconSvg(collapsed),
      expanded: expanded
    };
  }

  function resolveMobileTimerboxAppliedModel(options) {
    var opts = options || {};
    var displayModel = opts.displayModel || null;
    var collapsed = typeof opts.collapsed === "boolean" ? opts.collapsed : true;
    var fallbackToggleDisplay = opts.fallbackToggleDisplay === "inline-flex" ? "inline-flex" : "none";
    var fallbackAriaExpanded = opts.fallbackAriaExpanded === "true" ? "true" : "false";
    var fallbackLabel =
      typeof opts.fallbackLabel === "string" && opts.fallbackLabel
        ? opts.fallbackLabel
        : collapsed
          ? LABEL_EXPAND
          : LABEL_COLLAPSE;
    var fallbackIconSvg =
      typeof opts.fallbackIconSvg === "string" && opts.fallbackIconSvg
        ? opts.fallbackIconSvg
        : getTimerboxToggleIconSvg(collapsed);
    var toggleDisplay =
      displayModel &&
      (displayModel.toggleDisplay === "inline-flex" || displayModel.toggleDisplay === "none")
        ? displayModel.toggleDisplay
        : fallbackToggleDisplay;
    var ariaExpanded =
      displayModel &&
      (displayModel.ariaExpanded === "true" || displayModel.ariaExpanded === "false")
        ? displayModel.ariaExpanded
        : fallbackAriaExpanded;
    var label =
      displayModel && typeof displayModel.label === "string" && displayModel.label
        ? displayModel.label
        : fallbackLabel;
    var iconSvg =
      displayModel && typeof displayModel.iconSvg === "string" && displayModel.iconSvg
        ? displayModel.iconSvg
        : fallbackIconSvg;
    var expanded =
      displayModel && typeof displayModel.expanded === "boolean" ? displayModel.expanded : !collapsed;
    var showToggle =
      displayModel && typeof displayModel.showToggle === "boolean"
        ? displayModel.showToggle
        : toggleDisplay !== "none";
    return {
      showToggle: showToggle,
      toggleDisplay: toggleDisplay,
      ariaExpanded: ariaExpanded,
      label: label,
      iconSvg: iconSvg,
      expanded: expanded
    };
  }

  global.CoreMobileTimerboxRuntime = global.CoreMobileTimerboxRuntime || {};
  global.CoreMobileTimerboxRuntime.resolveStoredMobileTimerboxCollapsed =
    resolveStoredMobileTimerboxCollapsed;
  global.CoreMobileTimerboxRuntime.persistMobileTimerboxCollapsed =
    persistMobileTimerboxCollapsed;
  global.CoreMobileTimerboxRuntime.getTimerboxToggleIconSvg = getTimerboxToggleIconSvg;
  global.CoreMobileTimerboxRuntime.resolveMobileTimerboxCollapsedValue =
    resolveMobileTimerboxCollapsedValue;
  global.CoreMobileTimerboxRuntime.resolveMobileTimerboxDisplayModel =
    resolveMobileTimerboxDisplayModel;
  global.CoreMobileTimerboxRuntime.resolveMobileTimerboxAppliedModel =
    resolveMobileTimerboxAppliedModel;
})(typeof window !== "undefined" ? window : undefined);

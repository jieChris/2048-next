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

  global.CoreMobileTimerboxRuntime = global.CoreMobileTimerboxRuntime || {};
  global.CoreMobileTimerboxRuntime.resolveStoredMobileTimerboxCollapsed =
    resolveStoredMobileTimerboxCollapsed;
  global.CoreMobileTimerboxRuntime.persistMobileTimerboxCollapsed =
    persistMobileTimerboxCollapsed;
  global.CoreMobileTimerboxRuntime.getTimerboxToggleIconSvg = getTimerboxToggleIconSvg;
  global.CoreMobileTimerboxRuntime.resolveMobileTimerboxDisplayModel =
    resolveMobileTimerboxDisplayModel;
})(typeof window !== "undefined" ? window : undefined);

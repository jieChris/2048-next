(function (global) {
  "use strict";

  if (!global) return;

  var FALLBACK_POW2_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
  var FALLBACK_FIB_VALUES = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

  function normalizeValues(value, fallback) {
    if (!Array.isArray(value) || value.length === 0) return fallback.slice();
    var normalized = value.filter(function (item) {
      return typeof item === "number" && Number.isFinite(item);
    });
    return normalized.length > 0 ? normalized : fallback.slice();
  }

  function formatThemePreviewValue(value) {
    var num = typeof value === "number" && Number.isFinite(value) ? value : 0;
    if (num >= 1024 && num % 1024 === 0) {
      return num / 1024 + "K";
    }
    return "" + num;
  }

  function resolveThemePreviewTileValues(options) {
    var opts = options || {};
    var getTileValues = typeof opts.getTileValues === "function" ? opts.getTileValues : null;
    return {
      pow2Values: normalizeValues(getTileValues ? getTileValues("pow2") : null, FALLBACK_POW2_VALUES),
      fibonacciValues: normalizeValues(
        getTileValues ? getTileValues("fibonacci") : null,
        FALLBACK_FIB_VALUES
      )
    };
  }

  function resolveThemeSelectLabel(options) {
    var opts = options || {};
    var themes = Array.isArray(opts.themes) ? opts.themes : [];
    var fallbackLabel = typeof opts.fallbackLabel === "string" && opts.fallbackLabel ? opts.fallbackLabel : "选择主题";
    var currentThemeId = typeof opts.currentThemeId === "string" ? opts.currentThemeId : "";
    for (var i = 0; i < themes.length; i++) {
      var item = themes[i];
      if (!item || item.id !== currentThemeId) continue;
      if (typeof item.label === "string" && item.label) return item.label;
    }
    return fallbackLabel;
  }

  function resolveThemeDropdownToggleState(options) {
    var opts = options || {};
    return {
      shouldOpen: !opts.isOpen
    };
  }

  function resolveThemeBindingState(options) {
    var opts = options || {};
    var alreadyBound = !!opts.alreadyBound;
    return {
      shouldBind: !alreadyBound,
      boundValue: true
    };
  }

  function resolveThemeOptionSelectedState(options) {
    var opts = options || {};
    return String(opts.optionValue || "") === String(opts.currentThemeId || "");
  }

  function resolveThemePreviewLayout() {
    return {
      containerClassName: "theme-preview-dual-wrap",
      innerHtml:
        "<div class='theme-preview-grid-block'>" +
        "<div class='theme-preview-grid-title'>2幂</div>" +
        "<div id='theme-preview-grid-pow2' class='theme-preview-grid'></div>" +
        "</div>" +
        "<div class='theme-preview-grid-block'>" +
        "<div class='theme-preview-grid-title'>Fibonacci</div>" +
        "<div id='theme-preview-grid-fib' class='theme-preview-grid'></div>" +
        "</div>",
      pow2GridId: "theme-preview-grid-pow2",
      fibonacciGridId: "theme-preview-grid-fib",
      pow2Selector: "#theme-preview-grid-pow2",
      fibonacciSelector: "#theme-preview-grid-fib"
    };
  }

  function resolveThemeOptions(options) {
    var opts = options || {};
    var inputThemes = Array.isArray(opts.themes) ? opts.themes : [];
    var result = [];
    for (var i = 0; i < inputThemes.length; i++) {
      var theme = inputThemes[i];
      if (!theme) continue;
      var id = typeof theme.id === "string" ? theme.id : "";
      if (!id) continue;
      var label = typeof theme.label === "string" && theme.label ? theme.label : id;
      result.push({ id: id, label: label });
    }
    return result;
  }

  global.CoreThemeSettingsRuntime = global.CoreThemeSettingsRuntime || {};
  global.CoreThemeSettingsRuntime.formatThemePreviewValue = formatThemePreviewValue;
  global.CoreThemeSettingsRuntime.resolveThemePreviewTileValues = resolveThemePreviewTileValues;
  global.CoreThemeSettingsRuntime.resolveThemeSelectLabel = resolveThemeSelectLabel;
  global.CoreThemeSettingsRuntime.resolveThemeDropdownToggleState = resolveThemeDropdownToggleState;
  global.CoreThemeSettingsRuntime.resolveThemeBindingState = resolveThemeBindingState;
  global.CoreThemeSettingsRuntime.resolveThemeOptionSelectedState = resolveThemeOptionSelectedState;
  global.CoreThemeSettingsRuntime.resolveThemePreviewLayout = resolveThemePreviewLayout;
  global.CoreThemeSettingsRuntime.resolveThemeOptions = resolveThemeOptions;
})(typeof window !== "undefined" ? window : undefined);

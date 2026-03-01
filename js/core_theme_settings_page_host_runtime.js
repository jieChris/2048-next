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

  function applyThemeSettingsPageInit(input) {
    var source = toRecord(input);
    var hostRuntime = toRecord(source.themeSettingsHostRuntime);
    var applyUi = asFunction(hostRuntime.applyThemeSettingsUi);
    if (!applyUi) {
      return {
        hasApplyUiApi: false,
        hasThemeManager: false,
        didApply: false
      };
    }

    var windowLike = toRecord(source.windowLike);
    var themeManager = windowLike.ThemeManager || null;

    applyUi({
      documentLike: source.documentLike,
      windowLike: source.windowLike,
      themeSettingsRuntime: source.themeSettingsRuntime,
      themeManager: themeManager
    });

    return {
      hasApplyUiApi: true,
      hasThemeManager: !!themeManager,
      didApply: true
    };
  }

  global.CoreThemeSettingsPageHostRuntime = global.CoreThemeSettingsPageHostRuntime || {};
  global.CoreThemeSettingsPageHostRuntime.applyThemeSettingsPageInit = applyThemeSettingsPageInit;
})(typeof window !== "undefined" ? window : undefined);

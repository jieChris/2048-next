(function (global) {
  "use strict";

  if (!global) return;

  function resolveCatalogModeWithDefault(catalog, modeKey, defaultModeKey) {
    if (!catalog || typeof catalog.getMode !== "function") return null;
    var key = modeKey && String(modeKey).trim() ? String(modeKey).trim() : defaultModeKey;
    return catalog.getMode(key) || catalog.getMode(defaultModeKey) || null;
  }

  global.CoreModeCatalogRuntime = global.CoreModeCatalogRuntime || {};
  global.CoreModeCatalogRuntime.resolveCatalogModeWithDefault = resolveCatalogModeWithDefault;
})(typeof window !== "undefined" ? window : undefined);

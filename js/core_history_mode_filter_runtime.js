(function (global) {
  "use strict";

  if (!global) return;

  function isObject(value) {
    return !!value && typeof value === "object";
  }

  function resolveHistoryModeFilterOptions(modes) {
    if (!Array.isArray(modes)) return [];

    var options = [];
    for (var i = 0; i < modes.length; i++) {
      var item = modes[i];
      if (!isObject(item)) continue;

      var value = item.key == null ? "" : String(item.key);
      var label = item.label == null ? "" : String(item.label);
      if (!value || !label) continue;

      options.push({ value: value, label: label });
    }
    return options;
  }

  global.CoreHistoryModeFilterRuntime = global.CoreHistoryModeFilterRuntime || {};
  global.CoreHistoryModeFilterRuntime.resolveHistoryModeFilterOptions = resolveHistoryModeFilterOptions;
})(typeof window !== "undefined" ? window : undefined);

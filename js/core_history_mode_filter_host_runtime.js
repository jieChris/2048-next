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

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function applyHistoryModeFilterOptionsRender(input) {
    var source = toRecord(input);
    var selectElement = toRecord(source.selectElement);
    var appendChild = asFunction(selectElement.appendChild);
    if (!appendChild) {
      return {
        didRender: false,
        renderedOptionCount: 0
      };
    }

    var modeCatalog = toRecord(source.modeCatalog);
    var listModes = asFunction(modeCatalog.listModes);
    var modeFilterRuntime = toRecord(source.historyModeFilterRuntime);
    var resolveHistoryModeFilterOptions = asFunction(
      modeFilterRuntime.resolveHistoryModeFilterOptions
    );
    var documentLike = toRecord(source.documentLike);
    var createElement = asFunction(documentLike.createElement);
    if (!listModes || !resolveHistoryModeFilterOptions || !createElement) {
      return {
        didRender: false,
        renderedOptionCount: 0
      };
    }

    var options = toArray(resolveHistoryModeFilterOptions(listModes()));
    var renderedOptionCount = 0;
    for (var i = 0; i < options.length; i += 1) {
      var item = toRecord(options[i]);
      var option = toRecord(createElement.call(documentLike, "option"));
      option.value = toText(item.value);
      option.textContent = toText(item.label);
      appendChild.call(selectElement, option);
      renderedOptionCount += 1;
    }

    return {
      didRender: true,
      renderedOptionCount: renderedOptionCount
    };
  }

  global.CoreHistoryModeFilterHostRuntime = global.CoreHistoryModeFilterHostRuntime || {};
  global.CoreHistoryModeFilterHostRuntime.applyHistoryModeFilterOptionsRender =
    applyHistoryModeFilterOptionsRender;
})(typeof window !== "undefined" ? window : undefined);

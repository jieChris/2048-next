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

  function getElementById(documentLike, id) {
    var getter = asFunction(toRecord(documentLike).getElementById);
    if (!getter) return null;
    return getter.call(documentLike, id);
  }

  function querySelector(node, selector) {
    var query = asFunction(toRecord(node).querySelector);
    if (!query) return null;
    return query.call(node, selector);
  }

  function appendChild(node, child) {
    var append = asFunction(toRecord(node).appendChild);
    if (!append) return;
    append.call(node, child);
  }

  function insertBefore(node, child, anchor) {
    var insert = asFunction(toRecord(node).insertBefore);
    if (!insert) return;
    insert.call(node, child, anchor);
  }

  function removeChild(node, child) {
    var remove = asFunction(toRecord(node).removeChild);
    if (!remove) return false;
    remove.call(node, child);
    return true;
  }

  function createElement(documentLike, tag) {
    var creator = asFunction(toRecord(documentLike).createElement);
    if (!creator) return null;
    return creator.call(documentLike, tag);
  }

  function applyLegacyUndoSettingsCleanup(input) {
    var source = toRecord(input);
    var toggle = getElementById(source.documentLike, "undo-enabled-toggle");
    if (!toggle) {
      return {
        hadToggle: false,
        didRemoveRow: false,
        didHideToggle: false
      };
    }

    var closest = asFunction(toRecord(toggle).closest);
    var row = closest ? closest.call(toggle, ".settings-row") : null;
    var parentNode = toRecord(row).parentNode;
    var didRemoveRow = !!(row && parentNode && removeChild(parentNode, row));
    if (!didRemoveRow) {
      var style = toRecord(toRecord(toggle).style);
      style.display = "none";
      toRecord(toggle).style = style;
    }

    return {
      hadToggle: true,
      didRemoveRow: didRemoveRow,
      didHideToggle: !didRemoveRow
    };
  }

  function ensureTimerModuleSettingsToggle(input) {
    var source = toRecord(input);
    var documentLike = source.documentLike;
    var existingToggle = getElementById(documentLike, "timer-module-view-toggle");
    if (existingToggle) return existingToggle;

    var modal = getElementById(documentLike, "settings-modal");
    if (!modal) return null;
    var content = querySelector(modal, ".settings-modal-content");
    if (!content) return null;

    var row = createElement(documentLike, "div");
    if (!row) return null;
    var rowRecord = toRecord(row);
    rowRecord.className = "settings-row";

    var timerModuleRuntime = toRecord(source.timerModuleRuntime);
    var buildSettingsRow = asFunction(timerModuleRuntime.buildTimerModuleSettingsRowInnerHtml);
    rowRecord.innerHTML = buildSettingsRow ? String(buildSettingsRow()) : "";

    var actions = querySelector(content, ".replay-modal-actions");
    if (actions && toRecord(actions).parentNode === content) {
      insertBefore(content, row, actions);
    } else {
      appendChild(content, row);
    }

    return getElementById(documentLike, "timer-module-view-toggle");
  }

  global.CoreTimerModuleSettingsHostRuntime = global.CoreTimerModuleSettingsHostRuntime || {};
  global.CoreTimerModuleSettingsHostRuntime.applyLegacyUndoSettingsCleanup =
    applyLegacyUndoSettingsCleanup;
  global.CoreTimerModuleSettingsHostRuntime.ensureTimerModuleSettingsToggle =
    ensureTimerModuleSettingsToggle;
})(typeof window !== "undefined" ? window : undefined);

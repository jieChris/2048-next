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

  function resolveBoolean(value) {
    return !!value;
  }

  function resolveText(value) {
    return value == null ? "" : String(value);
  }

  function querySelector(node, selector) {
    var query = asFunction(toRecord(node).querySelector);
    if (!query) return null;
    return query.call(node, selector);
  }

  function getElementById(documentLike, id) {
    var getter = asFunction(toRecord(documentLike).getElementById);
    if (!getter) return null;
    return getter.call(documentLike, id);
  }

  function createElement(documentLike, tagName) {
    var creator = asFunction(toRecord(documentLike).createElement);
    if (!creator) return null;
    return creator.call(documentLike, tagName);
  }

  function appendChild(node, child) {
    var append = asFunction(toRecord(node).appendChild);
    if (!append) return;
    append.call(node, child);
  }

  function insertBefore(node, child, before) {
    var insert = asFunction(toRecord(node).insertBefore);
    if (!insert) return;
    insert.call(node, child, before);
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function removeHomeGuideSettingsTriggerRow(documentLike) {
    var trigger = getElementById(documentLike, "home-guide-trigger-btn");
    var triggerClosest = asFunction(toRecord(trigger).closest);
    var row = triggerClosest && trigger ? triggerClosest.call(trigger, ".settings-row") : null;
    var node = row || trigger;
    if (!node) return false;
    var parentNode = toRecord(node).parentNode;
    var removeChild = asFunction(toRecord(parentNode).removeChild);
    if (!removeChild) return false;
    removeChild.call(parentNode, node);
    return true;
  }

  function ensureHomeGuideSettingsTrigger(input) {
    var source = toRecord(input);
    var documentLike = toRecord(source.documentLike);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var buildRowInnerHtml = asFunction(homeGuideRuntime.buildHomeGuideSettingsRowInnerHtml);
    var existingTrigger = getElementById(documentLike, "home-guide-trigger-btn");
    var existingClosest = asFunction(toRecord(existingTrigger).closest);
    var existingRow = existingClosest && existingTrigger
      ? existingClosest.call(existingTrigger, ".settings-row")
      : null;
    if (existingRow) {
      toRecord(existingRow).innerHTML = resolveText(buildRowInnerHtml ? buildRowInnerHtml() : "");
      return getElementById(documentLike, "home-guide-trigger-btn");
    }

    var modal = getElementById(documentLike, "settings-modal");
    if (!modal) return null;

    var content = querySelector(modal, ".settings-modal-content");
    if (!content) return null;

    var row = createElement(documentLike, "div");
    if (!row) return null;
    var rowRecord = toRecord(row);
    rowRecord.className = "settings-row settings-action-row";
    rowRecord.innerHTML = resolveText(buildRowInnerHtml ? buildRowInnerHtml() : "");

    var toolkitEntry = querySelector(content, "#toolkit-entry-row");
    var actions = querySelector(content, ".replay-modal-actions");
    var anchor = toolkitEntry && toRecord(toolkitEntry).parentNode === content ? toolkitEntry : actions;
    if (anchor && toRecord(anchor).parentNode === content) {
      insertBefore(content, row, anchor);
    } else {
      appendChild(content, row);
    }

    return getElementById(documentLike, "home-guide-trigger-btn");
  }

  function applyHomeGuideSettingsUi(input) {
    var source = toRecord(input);
    removeHomeGuideSettingsTriggerRow(toRecord(source.documentLike));
    var didAssignSync = false;
    if (isRecord(source.windowLike)) {
      source.windowLike.syncHomeGuideSettingsUI = function () {};
      didAssignSync = true;
    }
    return {
      hasToggle: false,
      didBindToggle: false,
      didAssignSync: didAssignSync,
      didSync: false
    };
  }

  global.CoreHomeGuideSettingsHostRuntime = global.CoreHomeGuideSettingsHostRuntime || {};
  global.CoreHomeGuideSettingsHostRuntime.applyHomeGuideSettingsUi = applyHomeGuideSettingsUi;
})(typeof window !== "undefined" ? window : undefined);

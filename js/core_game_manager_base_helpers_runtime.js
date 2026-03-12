function isCoreCallAvailable(coreCallResult) {
  return !!(coreCallResult && coreCallResult.available === true);
}

function resolveCoreObjectCallOrFallback(manager, coreCallResult, fallbackResolver) {
  if (!manager) return null;
  var coreValue = manager.isCoreCallAvailable(coreCallResult)
    ? (coreCallResult.value || {})
    : null;
  if (coreValue) return coreValue;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return null;
}

function resolveCoreBooleanCallOrFallback(manager, coreCallResult, fallbackResolver) {
  if (!manager) return null;
  var coreValue = manager.isCoreCallAvailable(coreCallResult)
    ? !!coreCallResult.value
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return !!fallbackResolver.call(manager);
  return null;
}

function resolveCoreNumericCallOrFallback(manager, coreCallResult, fallbackResolver) {
  if (!manager) return null;
  var coreValue = manager.isCoreCallAvailable(coreCallResult)
    ? (Number(coreCallResult.value) || 0)
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return Number(fallbackResolver.call(manager)) || 0;
  return null;
}

function resolveCoreStringCallOrFallback(manager, coreCallResult, fallbackResolver, allowEmpty) {
  if (!manager) return null;
  var coreValue = null;
  if (manager.isCoreCallAvailable(coreCallResult)) {
    var rawCoreString = coreCallResult.value;
    if (typeof rawCoreString === "string") {
      coreValue = allowEmpty === true ? rawCoreString : (rawCoreString || null);
    }
  }
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return String(fallbackResolver.call(manager));
  return null;
}

function resolveNormalizedCoreValueOrUndefined(manager, coreCallResult, normalizer) {
  if (!manager) return undefined;
  if (!manager.isCoreCallAvailable(coreCallResult)) return undefined;
  if (typeof normalizer !== "function") return coreCallResult.value;
  return normalizer.call(manager, coreCallResult.value);
}

function resolveNormalizedCoreValueOrFallback(
  manager,
  coreCallResult,
  normalizer,
  fallbackResolver
) {
  if (!manager) return undefined;
  var normalized = manager.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer);
  if (typeof normalized !== "undefined" && normalized !== null) return normalized;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return normalized;
}

function resolveNormalizedCoreValueOrFallbackAllowNull(
  manager,
  coreCallResult,
  normalizer,
  fallbackResolver
) {
  if (!manager) return undefined;
  var normalized = manager.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer);
  if (typeof normalized !== "undefined") return normalized;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return normalized;
}

function resolveCoreRawCallValueOrUndefined(manager, coreCallResult) {
  if (!manager) return undefined;
  if (!manager.isCoreCallAvailable(coreCallResult)) return undefined;
  return coreCallResult.value;
}

function tryHandleCoreRawValue(manager, coreCallResult, handler) {
  if (!manager) return false;
  var coreValue = manager.resolveCoreRawCallValueOrUndefined(coreCallResult);
  if (typeof coreValue === "undefined") return false;
  if (typeof handler === "function") {
    handler.call(manager, coreValue);
  }
  return true;
}

function isNonArrayObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isCoreHelperRecordObject(value) {
  return !!value && typeof value === "object";
}

function createCoreModeDefaultsPayload(payload) {
  var source = isCoreHelperRecordObject(payload) ? payload : {};
  return Object.assign(
    {
      defaultModeKey: GameManager.DEFAULT_MODE_KEY
    },
    source
  );
}

function createCoreModeContextPayload(manager, payload) {
  if (!manager) return createCoreModeDefaultsPayload(payload);
  var source = isCoreHelperRecordObject(payload) ? payload : {};
  return manager.createCoreModeDefaultsPayload(
    Object.assign(
      {
        currentModeKey: manager.modeKey,
        currentMode: manager.mode
      },
      source
    )
  );
}

function createUnavailableCoreCallResult() {
  return {
    available: false,
    value: null
  };
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeClonePlain(manager, value, fallback) {
  if (!manager) return fallback;
  try {
    return manager.clonePlain(value);
  } catch (_err) {
    return fallback;
  }
}

function hasOwnKey(target, key) {
  if (!target || (typeof target !== "object" && typeof target !== "function")) return false;
  return Object.prototype.hasOwnProperty.call(target, key);
}

function readOptionValue(manager, options, key, fallbackValue) {
  if (!manager) return fallbackValue;
  if (!isCoreHelperRecordObject(options)) return fallbackValue;
  return manager.hasOwnKey(options, key) ? options[key] : fallbackValue;
}

function normalizeSecondaryTimerValue(rawValue) {
  var value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function isSecondaryTimerPowerOfTwo(rawValue) {
  var value = normalizeSecondaryTimerValue(rawValue);
  if (value === null) return false;
  return (value & (value - 1)) === 0;
}

function getSecondaryTimerParentValues() {
  var slots = Array.isArray(GameManager.TIMER_SLOT_IDS) ? GameManager.TIMER_SLOT_IDS : [];
  var parents = [];
  for (var i = 0; i < slots.length; i++) {
    var value = normalizeSecondaryTimerValue(slots[i]);
    if (value === null) continue;
    if (value < 8192) continue;
    if (!isSecondaryTimerPowerOfTwo(value)) continue;
    parents.push(value);
  }
  return parents;
}

function getSecondaryTimerChildValues(parentValue) {
  var parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null || parent < 8192 || !isSecondaryTimerPowerOfTwo(parent)) return [];
  var children = [];
  var child = Math.floor(parent / 2);
  while (child >= 2048) {
    if (isSecondaryTimerPowerOfTwo(child)) {
      children.push(child);
    }
    child = Math.floor(child / 2);
  }
  return children;
}
function getSecondaryTimerExpandedStateMap(manager) {
  if (!manager) return {};
  if (!isCoreHelperRecordObject(manager.secondaryTimerExpandedByParent)) {
    manager.secondaryTimerExpandedByParent = {};
  }
  return manager.secondaryTimerExpandedByParent;
}

function isSecondaryTimerParentExpanded(manager, parentValue) {
  if (!manager) return false;
  var parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return false;
  var expandedMap = getSecondaryTimerExpandedStateMap(manager);
  return expandedMap[String(parent)] === true;
}

function setSecondaryTimerParentExpanded(manager, parentValue, expanded) {
  if (!manager) return false;
  var parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return false;
  var expandedMap = getSecondaryTimerExpandedStateMap(manager);
  expandedMap[String(parent)] = expanded === true;
  return expandedMap[String(parent)];
}

function toggleSecondaryTimerParentExpanded(manager, parentValue) {
  var current = isSecondaryTimerParentExpanded(manager, parentValue);
  return setSecondaryTimerParentExpanded(manager, parentValue, !current);
}

function collectSecondaryTimerExpandedParents(manager) {
  var out = [];
  if (!manager) return out;
  var parents = getSecondaryTimerParentValues();
  for (var i = 0; i < parents.length; i++) {
    var parent = parents[i];
    if (isSecondaryTimerParentExpanded(manager, parent)) {
      out.push(parent);
    }
  }
  return out;
}

function applySecondaryTimerExpandedParentsState(manager, expandedParents) {
  if (!manager) return;
  var expandedMap = getSecondaryTimerExpandedStateMap(manager);
  for (var key in expandedMap) {
    if (!Object.prototype.hasOwnProperty.call(expandedMap, key)) continue;
    delete expandedMap[key];
  }
  var list = Array.isArray(expandedParents) ? expandedParents : [];
  for (var i = 0; i < list.length; i++) {
    var parent = normalizeSecondaryTimerValue(list[i]);
    if (parent === null) continue;
    expandedMap[String(parent)] = true;
  }
}

function bindSecondaryTimerToggleTarget(manager, element, parentValue) {
  if (!manager || !element || typeof element.addEventListener !== "function") return;
  var parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return;
  var parentText = String(parent);
  if (
    element.getAttribute &&
    element.getAttribute("data-secondary-toggle-bound") === "1" &&
    element.getAttribute("data-secondary-toggle-parent") === parentText
  ) {
    return;
  }
  if (element.setAttribute) {
    element.setAttribute("data-secondary-toggle-bound", "1");
    element.setAttribute("data-secondary-toggle-parent", parentText);
  }
  if (element.style) {
    element.style.cursor = "pointer";
  }
  element.addEventListener("click", function (event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    if (event && typeof event.stopPropagation === "function") event.stopPropagation();
    var expanded = toggleSecondaryTimerParentExpanded(manager, parent);
    refreshSecondaryTimerRowsVisibility(manager);
    if (expanded) {
      if (!manager.callWindowMethod("cappedTimerScroll", [1])) {
        manager.callWindowMethod("updateTimerScroll");
      }
      return;
    }
    if (!manager.callWindowMethod("cappedTimerScroll", [-1])) {
      manager.callWindowMethod("updateTimerScroll");
    }
  });
}

function bindSecondaryTimerParentToggleEvents(manager) {
  if (!manager) return;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  var parents = getSecondaryTimerParentValues();
  for (var i = 0; i < parents.length; i++) {
    var parent = parents[i];
    var row = manager.getTimerRowEl ? manager.getTimerRowEl(parent) : null;
    var timerEl = resolveManagerElementById(manager, "timer" + String(parent));
    var legendEl = null;
    if (row && typeof row.querySelector === "function") {
      legendEl = row.querySelector(".timer-legend-" + String(parent));
      if (!legendEl) legendEl = row.querySelector(".timertile");
    }
    if (!legendEl && timerBox && typeof timerBox.querySelector === "function") {
      legendEl = timerBox.querySelector(".timer-legend-" + String(parent));
    }
    bindSecondaryTimerToggleTarget(manager, row, parent);
    bindSecondaryTimerToggleTarget(manager, legendEl, parent);
    bindSecondaryTimerToggleTarget(manager, timerEl, parent);
  }
}

function resolveSecondaryTimerRowId(parentValue, childValue) {
  return "timer-row-secondary-" + String(parentValue) + "-" + String(childValue);
}

function resolveSecondaryTimerValueId(parentValue, childValue) {
  return "timer-secondary-" + String(parentValue) + "-" + String(childValue);
}

function resolveSecondaryTimerIndentLevel(parentValue, childValue) {
  var parent = normalizeSecondaryTimerValue(parentValue);
  var child = normalizeSecondaryTimerValue(childValue);
  if (parent === null || child === null || parent <= child) return 0;
  var level = 0;
  var cursor = parent;
  while (cursor > child && cursor >= 4096) {
    cursor = Math.floor(cursor / 2);
    level += 1;
    if (level > 32) break;
  }
  return level;
}

function resolveSecondaryTimerLegendFontSize(value) {
  var slotValue = normalizeSecondaryTimerValue(value) || 2048;
  if (slotValue >= 65536) return "12px";
  if (slotValue >= 16384) return "13px";
  if (slotValue >= 1024) return "14px";
  if (slotValue >= 128) return "18px";
  return "22px";
}

function resolveSecondaryTimerWidthByLevel(level) {
  var numericLevel = Number(level);
  if (!Number.isFinite(numericLevel) || numericLevel < 0) numericLevel = 0;
  numericLevel = Math.floor(numericLevel);
  var width = 187 - (numericLevel * 5);
  if (width < 150) width = 150;
  return width;
}

function createSecondaryTimerRowElement(manager, parentValue, childValue) {
  if (!manager) return null;
  var documentLike = resolveManagerDocumentLike(manager);
  if (!(documentLike && typeof documentLike.createElement === "function")) return null;

  var parent = normalizeSecondaryTimerValue(parentValue);
  var child = normalizeSecondaryTimerValue(childValue);
  if (parent === null || child === null) return null;

  var row = documentLike.createElement("div");
  if (!row) return null;

  var rowId = resolveSecondaryTimerRowId(parent, child);
  var valueId = resolveSecondaryTimerValueId(parent, child);
  var level = resolveSecondaryTimerIndentLevel(parent, child);
  var order = parent + (level / 1000);

  row.id = rowId;
  row.className = "timer-row-item timer-secondary-row";
  row.setAttribute("data-secondary-parent", String(parent));
  row.setAttribute("data-secondary-child", String(child));
  row.setAttribute("data-secondary-hidden", "1");
  row.setAttribute("data-timer-order", String(order));
  row.style.display = "none";
  row.style.paddingLeft = String(level * 5) + "px";

  var legend = documentLike.createElement("div");
  legend.className = "timertile timer-secondary-legend timer-legend-" + String(child);
  legend.style.color = "#f9f6f2";
  legend.style.fontSize = resolveSecondaryTimerLegendFontSize(child);
  legend.textContent = String(child);

  var timer = documentLike.createElement("div");
  timer.className = "timertile";
  timer.id = valueId;
  timer.style.marginLeft = "6px";
  var timerWidth = resolveSecondaryTimerWidthByLevel(level);
  timer.style.width = String(timerWidth) + "px";

  row.appendChild(legend);
  row.appendChild(timer);
  row.appendChild(documentLike.createElement("br"));
  row.appendChild(documentLike.createElement("br"));
  return row;
}

function resolveSecondaryTimerContainer(manager) {
  if (!manager) return null;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox) return null;

  // Migrate legacy secondary container nodes back into timerbox.
  var legacyContainer = resolveManagerElementById(manager, "timer-secondary-container");
  if (legacyContainer && legacyContainer.parentNode === timerBox) {
    while (legacyContainer.firstChild) {
      timerBox.insertBefore(legacyContainer.firstChild, legacyContainer);
    }
    timerBox.removeChild(legacyContainer);
  }

  return timerBox;
}

function ensureSecondaryTimerRows(manager) {
  if (!manager) return [];
  var container = resolveSecondaryTimerContainer(manager);
  if (!container) return [];

  var descriptors = [];
  var validRowIds = {};
  var parents = getSecondaryTimerParentValues();

  for (var parentIndex = 0; parentIndex < parents.length; parentIndex++) {
    var parent = parents[parentIndex];
    var children = getSecondaryTimerChildValues(parent);
    for (var childIndex = 0; childIndex < children.length; childIndex++) {
      var child = children[childIndex];
      var rowId = resolveSecondaryTimerRowId(parent, child);
      var valueId = resolveSecondaryTimerValueId(parent, child);
      var row = resolveManagerElementById(manager, rowId);
      var level = resolveSecondaryTimerIndentLevel(parent, child);
      var order = parent + (level / 1000);
      var timerWidth = resolveSecondaryTimerWidthByLevel(level);
      if (!row) {
        row = createSecondaryTimerRowElement(manager, parent, child);
        if (row) container.appendChild(row);
      } else if (row.parentNode !== container) {
        container.appendChild(row);
      }
      if (row) {
        row.setAttribute("data-secondary-parent", String(parent));
        row.setAttribute("data-secondary-child", String(child));
        row.setAttribute("data-timer-order", String(order));
        row.style.paddingLeft = String(level * 5) + "px";
      }
      var timerEl = resolveManagerElementById(manager, valueId);
      if (timerEl) {
        timerEl.style.width = String(timerWidth) + "px";
      }
      descriptors.push({
        parent: parent,
        child: child,
        rowId: rowId,
        valueId: valueId,
        row: row,
        timerEl: timerEl
      });
      validRowIds[rowId] = true;
    }
  }

  for (var rowIndex = container.children.length - 1; rowIndex >= 0; rowIndex--) {
    var childNode = container.children[rowIndex];
    if (!(childNode && childNode.id && childNode.id.indexOf("timer-row-secondary-") === 0)) continue;
    if (validRowIds[childNode.id]) continue;
    container.removeChild(childNode);
  }

  bindSecondaryTimerParentToggleEvents(manager);
  return descriptors;
}

function resolveSecondaryTimerDescriptors(manager) {
  var descriptors = ensureSecondaryTimerRows(manager);
  return Array.isArray(descriptors) ? descriptors : [];
}

function isSecondaryTimerParentReached(manager, parentValue) {
  if (!manager) return false;
  var parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return false;
  var parentTimer = resolveManagerElementById(manager, "timer" + String(parent));
  if (!parentTimer) return false;
  var text = String(parentTimer.textContent || parentTimer.innerText || "").trim();
  return text !== "";
}

function resolveSecondaryTimerParentAnchor(manager, timerBox, parentValue) {
  if (!manager || !timerBox) return null;
  var parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return null;

  var parentRow = manager.getTimerRowEl ? manager.getTimerRowEl(parent) : null;
  if (parentRow && parentRow.parentNode === timerBox) return parentRow;

  var parentTimer = resolveManagerElementById(manager, "timer" + String(parent));
  if (!(parentTimer && parentTimer.parentNode === timerBox)) return null;

  // Legacy pages may not wrap each timer entry with #timer-row-*. In that case,
  // place secondary rows after the timer value and its trailing <br><br>.
  var anchor = parentTimer;
  var cursor = parentTimer.nextSibling;
  var brCount = 0;
  while (cursor) {
    if (cursor.nodeType === 3 && String(cursor.nodeValue || "").trim() === "") {
      cursor = cursor.nextSibling;
      continue;
    }
    if (
      cursor.nodeType === 1 &&
      cursor.tagName &&
      String(cursor.tagName).toLowerCase() === "br" &&
      brCount < 2
    ) {
      anchor = cursor;
      brCount += 1;
      cursor = cursor.nextSibling;
      continue;
    }
    break;
  }
  return anchor;
}

function placeSecondaryTimerRowsNearParents(manager, descriptors) {
  if (!manager) return;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox) return;
  var list = Array.isArray(descriptors) ? descriptors : [];
  var tailByParent = {};

  for (var i = 0; i < list.length; i++) {
    var descriptor = list[i];
    if (!descriptor || !descriptor.row) continue;
    var parent = normalizeSecondaryTimerValue(descriptor.parent);
    if (parent === null) continue;

    var key = String(parent);
    var anchor = tailByParent[key] || resolveSecondaryTimerParentAnchor(manager, timerBox, parent);
    if (!anchor || anchor.parentNode !== timerBox) continue;
    if (anchor.nextSibling !== descriptor.row) {
      timerBox.insertBefore(descriptor.row, anchor.nextSibling);
    }
    tailByParent[key] = descriptor.row;
  }

  var controls = resolveManagerElementById(manager, "timer-scroll-controls");
  if (controls && controls.parentNode === timerBox) {
    timerBox.appendChild(controls);
  }
}

function refreshSecondaryTimerRowsVisibility(manager) {
  if (!manager) return;
  var descriptors = resolveSecondaryTimerDescriptors(manager);
  placeSecondaryTimerRowsNearParents(manager, descriptors);
  for (var i = 0; i < descriptors.length; i++) {
    var descriptor = descriptors[i];
    if (!descriptor || !descriptor.row) continue;
    var visible = isSecondaryTimerParentExpanded(manager, descriptor.parent);
    if (visible) {
      descriptor.row.style.display = "block";
      descriptor.row.removeAttribute("data-secondary-hidden");
      descriptor.row.removeAttribute("data-scroll-hidden");
      continue;
    }
    descriptor.row.style.display = "none";
    descriptor.row.setAttribute("data-secondary-hidden", "1");
    descriptor.row.removeAttribute("data-scroll-hidden");
    descriptor.row.style.visibility = "";
    descriptor.row.style.pointerEvents = "";
  }
  manager.callWindowMethod("updateTimerScroll");
}

function resetSecondaryTimerRowsForSetup(manager) {
  if (!manager) return;
  applySecondaryTimerExpandedParentsState(manager, []);
  var descriptors = resolveSecondaryTimerDescriptors(manager);
  placeSecondaryTimerRowsNearParents(manager, descriptors);
  for (var i = 0; i < descriptors.length; i++) {
    var descriptor = descriptors[i];
    if (!descriptor) continue;
    if (descriptor.timerEl) descriptor.timerEl.textContent = "";
    if (descriptor.row) {
      descriptor.row.style.display = "none";
      descriptor.row.setAttribute("data-secondary-hidden", "1");
      descriptor.row.removeAttribute("data-scroll-hidden");
      descriptor.row.style.visibility = "";
      descriptor.row.style.pointerEvents = "";
    }
  }
}

function stampSecondaryTimersForMergedValue(manager, mergedValue, timeStr) {
  if (!manager) return;
  var merged = normalizeSecondaryTimerValue(mergedValue);
  if (merged === null || merged < 2048) return;
  var descriptors = resolveSecondaryTimerDescriptors(manager);
  var changed = false;
  for (var i = 0; i < descriptors.length; i++) {
    var descriptor = descriptors[i];
    if (!descriptor || !descriptor.timerEl) continue;
    if (descriptor.child !== merged) continue;
    if (!isSecondaryTimerParentReached(manager, descriptor.parent)) continue;
    if (String(descriptor.timerEl.textContent || "") !== "") continue;
    descriptor.timerEl.textContent = String(timeStr || "");
    changed = true;
  }
  if (changed) {
    refreshSecondaryTimerRowsVisibility(manager);
  }
}

function invalidateSecondaryTimersByLimit(manager, limitValue, placeholderText) {
  if (!manager) return false;
  var limit = normalizeSecondaryTimerValue(limitValue);
  if (limit === null || limit < 2048) return false;
  var text = typeof placeholderText === "string" && placeholderText ? placeholderText : "---------";
  var descriptors = resolveSecondaryTimerDescriptors(manager);
  var changed = false;
  for (var i = 0; i < descriptors.length; i++) {
    var descriptor = descriptors[i];
    if (!descriptor || !descriptor.timerEl) continue;
    if (descriptor.parent > limit) continue;
    if (descriptor.child > limit) continue;
    descriptor.timerEl.textContent = text;
    changed = true;
  }
  if (changed) {
    refreshSecondaryTimerRowsVisibility(manager);
  }
  return changed;
}

function collectSecondaryTimerRowsState(manager) {
  var rows = [];
  if (!manager) return rows;
  var descriptors = resolveSecondaryTimerDescriptors(manager);
  for (var i = 0; i < descriptors.length; i++) {
    var descriptor = descriptors[i];
    if (!descriptor || !descriptor.row) continue;
    rows.push({
      parent: descriptor.parent,
      child: descriptor.child,
      time: descriptor.timerEl ? String(descriptor.timerEl.textContent || "") : "",
      display: descriptor.row.style.display || ""
    });
  }
  return rows;
}

function applySecondaryTimerRowsState(manager, rowsState) {
  if (!manager) return;
  var descriptors = resolveSecondaryTimerDescriptors(manager);
  var stateByKey = {};
  var rows = Array.isArray(rowsState) ? rowsState : [];

  for (var i = 0; i < rows.length; i++) {
    var state = rows[i];
    if (!isCoreHelperRecordObject(state)) continue;
    var parent = normalizeSecondaryTimerValue(state.parent);
    var child = normalizeSecondaryTimerValue(state.child);
    if (parent === null || child === null) continue;
    stateByKey[String(parent) + "|" + String(child)] = state;
  }

  for (var descriptorIndex = 0; descriptorIndex < descriptors.length; descriptorIndex++) {
    var descriptor = descriptors[descriptorIndex];
    if (!descriptor) continue;
    var key = String(descriptor.parent) + "|" + String(descriptor.child);
    var rowState = stateByKey[key];
    if (!descriptor.timerEl) continue;
    if (!rowState || typeof rowState.time !== "string") {
      descriptor.timerEl.textContent = "";
      continue;
    }
    descriptor.timerEl.textContent = rowState.time;
  }

  refreshSecondaryTimerRowsVisibility(manager);
}

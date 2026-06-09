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

function resolveNormalizedCoreValueOrFallback(manager, coreCallResult, normalizer, fallbackResolver) {
  return resolveNormalizedCoreValueWithFallbackMode(manager, coreCallResult, normalizer, fallbackResolver, false);
}

function resolveNormalizedCoreValueWithFallbackMode(
  manager,
  coreCallResult,
  normalizer,
  fallbackResolver,
  allowNull
) {
  if (!manager) return undefined;
  var normalized = manager.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer);
  if (allowNull === true) {
    if (typeof normalized !== "undefined") return normalized;
  } else if (typeof normalized !== "undefined" && normalized !== null) {
    return normalized;
  }
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return normalized;
}

function resolveNormalizedCoreValueOrFallbackAllowNull(manager, coreCallResult, normalizer, fallbackResolver) {
  return resolveNormalizedCoreValueWithFallbackMode(manager, coreCallResult, normalizer, fallbackResolver, true);
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

function getSecondaryTimerSlotIds() {
  return Array.isArray(GameManager.TIMER_SLOT_IDS) ? GameManager.TIMER_SLOT_IDS : [];
}

function resolveSecondaryTimerSlotIndexByValue(slotValue) {
  var slots = getSecondaryTimerSlotIds();
  for (var i = 0; i < slots.length; i++) {
    if (Number(slots[i]) === Number(slotValue)) return i;
  }
  return -1;
}

function resolveSecondaryTimerDisplayValueBySlot(manager, slotValue) {
  var slot = normalizeSecondaryTimerValue(slotValue);
  if (slot === null) return null;
  var milestones = manager && Array.isArray(manager.timerMilestones) ? manager.timerMilestones : null;
  var slotIndex = resolveSecondaryTimerSlotIndexByValue(slot);
  if (slotIndex >= 0 && milestones && slotIndex < milestones.length) {
    var mapped = normalizeSecondaryTimerValue(milestones[slotIndex]);
    if (mapped !== null) return mapped;
  }
  return slot;
}

function resolveSecondaryTimerSlotByValue(manager, rawValue) {
  var value = normalizeSecondaryTimerValue(rawValue);
  if (value === null) return null;

  var slotByMilestone = manager && isCoreHelperRecordObject(manager.timerMilestoneSlotByValue)
    ? manager.timerMilestoneSlotByValue
    : null;
  if (slotByMilestone && Object.prototype.hasOwnProperty.call(slotByMilestone, String(value))) {
    var mappedSlot = normalizeSecondaryTimerValue(slotByMilestone[String(value)]);
    if (mappedSlot !== null) return mappedSlot;
  }

  var slotIndex = resolveSecondaryTimerSlotIndexByValue(value);
  if (slotIndex >= 0) return value;

  var milestones = manager && Array.isArray(manager.timerMilestones) ? manager.timerMilestones : null;
  if (milestones) {
    for (var i = 0; i < milestones.length; i++) {
      if (Number(milestones[i]) !== value) continue;
      var slots = getSecondaryTimerSlotIds();
      if (i >= slots.length) break;
      var slotFromIndex = normalizeSecondaryTimerValue(slots[i]);
      if (slotFromIndex !== null) return slotFromIndex;
    }
  }

  return value;
}

function getSecondaryTimerParentValues() {
  var slots = getSecondaryTimerSlotIds();
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

function isSecondaryTimerToggleTargetBound(element, parentText) {
  return !!(
    element &&
    element.getAttribute &&
    element.getAttribute("data-secondary-toggle-bound") === "1" &&
    element.getAttribute("data-secondary-toggle-parent") === parentText
  );
}

function markSecondaryTimerToggleTargetBound(element, parentText) {
  if (!element) return;
  if (element.setAttribute) {
    element.setAttribute("data-secondary-toggle-bound", "1");
    element.setAttribute("data-secondary-toggle-parent", parentText);
  }
  if (element.style) {
    element.style.cursor = "pointer";
  }
}

function stopSecondaryTimerToggleEvent(event) {
  if (event && typeof event.preventDefault === "function") event.preventDefault();
  if (event && typeof event.stopPropagation === "function") event.stopPropagation();
}

function syncSecondaryTimerToggleScroll(manager, expanded) {
  if (!manager) return;
  if (expanded) {
    if (!manager.callWindowMethod("cappedTimerScroll", [1])) {
      manager.callWindowMethod("updateTimerScroll");
    }
    return;
  }
  if (!manager.callWindowMethod("cappedTimerScroll", [-1])) {
    manager.callWindowMethod("updateTimerScroll");
  }
}

function handleSecondaryTimerToggleClick(manager, parent, event) {
  stopSecondaryTimerToggleEvent(event);
  var expanded = toggleSecondaryTimerParentExpanded(manager, parent);
  refreshSecondaryTimerRowsVisibility(manager);
  syncSecondaryTimerToggleScroll(manager, expanded);
}

function bindSecondaryTimerToggleTarget(manager, element, parentValue) {
  if (!manager || !element || typeof element.addEventListener !== "function") return;
  var parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return;
  var parentText = String(parent);
  if (isSecondaryTimerToggleTargetBound(element, parentText)) return;
  markSecondaryTimerToggleTargetBound(element, parentText);
  element.addEventListener("click", function (event) {
    handleSecondaryTimerToggleClick(manager, parent, event);
  });
}

function resolveSecondaryTimerLegendFromRow(row, parent) {
  if (!(row && typeof row.querySelector === "function")) return null;
  var parentText = String(parent);
  var legendEl = row.querySelector(".timer-legend-" + parentText);
  if (!legendEl) legendEl = row.querySelector(".timertile");
  return legendEl;
}

function resolveSecondaryTimerLegendFromTimerBox(timerBox, parent) {
  if (!(timerBox && typeof timerBox.querySelector === "function")) return null;
  return timerBox.querySelector(".timer-legend-" + String(parent));
}

function resolveSecondaryTimerLegendElementForParent(row, timerBox, parent) {
  var legendEl = resolveSecondaryTimerLegendFromRow(row, parent);
  if (legendEl) return legendEl;
  return resolveSecondaryTimerLegendFromTimerBox(timerBox, parent);
}

function bindSecondaryTimerToggleTargetsForParent(manager, parent, row, legendEl, timerEl) {
  bindSecondaryTimerToggleTarget(manager, row, parent);
  bindSecondaryTimerToggleTarget(manager, legendEl, parent);
  bindSecondaryTimerToggleTarget(manager, timerEl, parent);
}

function bindSecondaryTimerParentToggleEvents(manager) {
  if (!manager) return;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  var parents = getSecondaryTimerParentValues();
  for (var i = 0; i < parents.length; i++) {
    var parent = parents[i];
    var row = manager.getTimerRowEl ? manager.getTimerRowEl(parent) : null;
    var timerEl = resolveManagerElementById(manager, "timer" + String(parent));
    var legendEl = resolveSecondaryTimerLegendElementForParent(row, timerBox, parent);
    bindSecondaryTimerToggleTargetsForParent(manager, parent, row, legendEl, timerEl);
  }
}

function resolveSecondaryTimerRowId(parentValue, childValue) {
  return "timer-row-secondary-" + String(parentValue) + "-" + String(childValue);
}

function resolveSecondaryTimerValueId(parentValue, childValue) {
  return "timer-secondary-" + String(parentValue) + "-" + String(childValue);
}

function isValidSecondaryTimerParentValue(parent) {
  if (parent === null) return false;
  if (parent < 8192) return false;
  if (!isSecondaryTimerPowerOfTwo(parent)) return false;
  return true;
}

function isValidSecondaryTimerParentChildPair(parent, child) {
  if (!isValidSecondaryTimerParentValue(parent) || child === null) return false;
  if (child < 2048) return false;
  if (child >= parent) return false;
  if (!isSecondaryTimerPowerOfTwo(child)) return false;
  return true;
}

function parseSecondaryTimerRowIdentity(rawRowId) {
  if (typeof rawRowId !== "string" || !rawRowId) return null;
  var match = /^timer-row-secondary-(\d+)-(\d+)$/.exec(rawRowId);
  if (!match) return null;
  var parent = normalizeSecondaryTimerValue(match[1]);
  var child = normalizeSecondaryTimerValue(match[2]);
  if (!isValidSecondaryTimerParentChildPair(parent, child)) return null;
  return {
    parent: parent,
    child: child
  };
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
  if (slotValue >= 16384) return "11px";
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
  legend.textContent = String(resolveSecondaryTimerDisplayValueBySlot(manager, child) || child);

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

function createSecondaryTimerDescriptorMeta(parent, child) {
  var level = resolveSecondaryTimerIndentLevel(parent, child);
  return {
    rowId: resolveSecondaryTimerRowId(parent, child),
    valueId: resolveSecondaryTimerValueId(parent, child),
    level: level,
    order: parent + (level / 1000),
    timerWidth: resolveSecondaryTimerWidthByLevel(level)
  };
}

function ensureSecondaryTimerDescriptorRow(manager, container, rowId, parent, child) {
  var row = resolveManagerElementById(manager, rowId);
  if (!row) {
    row = createSecondaryTimerRowElement(manager, parent, child);
    if (row) container.appendChild(row);
    return row;
  }
  if (row.parentNode !== container) {
    container.appendChild(row);
  }
  return row;
}

function applySecondaryTimerDescriptorRowRuntimeState(row, parent, child, order, level) {
  if (!row) return;
  row.setAttribute("data-secondary-parent", String(parent));
  row.setAttribute("data-secondary-child", String(child));
  row.setAttribute("data-timer-order", String(order));
  row.style.paddingLeft = String(level * 5) + "px";
}

function resolveSecondaryTimerDescriptorTimerElement(manager, valueId, timerWidth) {
  var timerEl = resolveManagerElementById(manager, valueId);
  if (timerEl) {
    timerEl.style.width = String(timerWidth) + "px";
  }
  return timerEl;
}

function createSecondaryTimerDescriptor(parent, child, meta, row, timerEl) {
  return {
    parent: parent,
    child: child,
    rowId: meta.rowId,
    valueId: meta.valueId,
    row: row,
    timerEl: timerEl
  };
}

function collectSecondaryTimerDescriptorsForParent(manager, container, parent, descriptors, validRowIds) {
  var children = getSecondaryTimerChildValues(parent);
  for (var childIndex = 0; childIndex < children.length; childIndex++) {
    var child = children[childIndex];
    var meta = createSecondaryTimerDescriptorMeta(parent, child);
    var row = ensureSecondaryTimerDescriptorRow(manager, container, meta.rowId, parent, child);
    applySecondaryTimerDescriptorRowRuntimeState(row, parent, child, meta.order, meta.level);
    var timerEl = resolveSecondaryTimerDescriptorTimerElement(manager, meta.valueId, meta.timerWidth);
    descriptors.push(createSecondaryTimerDescriptor(parent, child, meta, row, timerEl));
    validRowIds[meta.rowId] = true;
  }
}

function isSecondaryTimerManagedRowNode(node) {
  return !!(node && parseSecondaryTimerRowIdentity(node.id));
}

function removeStaleSecondaryTimerRows(container, validRowIds) {
  if (!container) return;
  for (var rowIndex = container.children.length - 1; rowIndex >= 0; rowIndex--) {
    var childNode = container.children[rowIndex];
    if (!isSecondaryTimerManagedRowNode(childNode)) continue;
    if (validRowIds[childNode.id]) continue;
    container.removeChild(childNode);
  }
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
    collectSecondaryTimerDescriptorsForParent(manager, container, parent, descriptors, validRowIds);
  }

  removeStaleSecondaryTimerRows(container, validRowIds);

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

function resolveSecondaryTimerParentRowAnchor(manager, timerBox, parent) {
  if (!manager || !timerBox) return null;
  var parentRow = manager.getTimerRowEl ? manager.getTimerRowEl(parent) : null;
  if (parentRow && parentRow.parentNode === timerBox) return parentRow;
  return null;
}

function resolveSecondaryTimerParentTimerAnchor(manager, timerBox, parent) {
  if (!manager || !timerBox) return null;
  var parentTimer = resolveManagerElementById(manager, "timer" + String(parent));
  if (!(parentTimer && parentTimer.parentNode === timerBox)) return null;
  return parentTimer;
}

function isSecondaryTimerWhitespaceNode(node) {
  return node && node.nodeType === 3 && String(node.nodeValue || "").trim() === "";
}

function isSecondaryTimerBreakNode(node) {
  return (
    node &&
    node.nodeType === 1 &&
    node.tagName &&
    String(node.tagName).toLowerCase() === "br"
  );
}

function resolveSecondaryTimerAnchorAfterLegacyBreaks(parentTimer) {
  var anchor = parentTimer;
  var cursor = parentTimer ? parentTimer.nextSibling : null;
  var brCount = 0;
  while (cursor) {
    if (isSecondaryTimerWhitespaceNode(cursor)) {
      cursor = cursor.nextSibling;
      continue;
    }
    if (isSecondaryTimerBreakNode(cursor) && brCount < 2) {
      anchor = cursor;
      brCount += 1;
      cursor = cursor.nextSibling;
      continue;
    }
    break;
  }
  return anchor;
}

function resolveSecondaryTimerParentAnchor(manager, timerBox, parentValue) {
  if (!manager || !timerBox) return null;
  var parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return null;

  var parentRowAnchor = resolveSecondaryTimerParentRowAnchor(manager, timerBox, parent);
  if (parentRowAnchor) return parentRowAnchor;

  var parentTimerAnchor = resolveSecondaryTimerParentTimerAnchor(manager, timerBox, parent);
  if (!parentTimerAnchor) return null;

  // Legacy pages may not wrap each timer entry with #timer-row-*. In that case,
  // place secondary rows after the timer value and its trailing <br><br>.
  return resolveSecondaryTimerAnchorAfterLegacyBreaks(parentTimerAnchor);
}

function resolveSecondaryTimerPlacementInfo(descriptor) {
  if (!descriptor || !descriptor.row) return null;
  var parent = resolveSecondaryTimerPlacementParentValue(descriptor);
  if (parent === null) return null;
  var child = resolveSecondaryTimerPlacementChildValue(descriptor, parent);
  var rowId = resolveSecondaryTimerPlacementDescriptorRowId(descriptor);
  var dedupeKey = resolveSecondaryTimerPlacementDedupeKey(parent, child, rowId);
  return {
    key: String(parent),
    parent: parent,
    row: descriptor.row,
    dedupeKey: dedupeKey
  };
}

function resolveSecondaryTimerPlacementDescriptorRowId(descriptor) {
  if (!descriptor) return "";
  if (typeof descriptor.rowId === "string" && descriptor.rowId) return descriptor.rowId;
  var row = descriptor.row;
  if (row && typeof row.id === "string" && row.id) return row.id;
  return "";
}

function resolveSecondaryTimerPlacementRowNumericAttribute(row, attributeName) {
  if (!(row && typeof row.getAttribute === "function")) return null;
  return normalizeSecondaryTimerValue(row.getAttribute(attributeName));
}

function resolveSecondaryTimerPlacementRowIdentity(row) {
  if (!row) return null;
  return parseSecondaryTimerRowIdentity(row.id);
}

function resolveSecondaryTimerPlacementParentValue(descriptor) {
  if (!descriptor) return null;
  var parent = normalizeSecondaryTimerValue(descriptor.parent);
  if (isValidSecondaryTimerParentValue(parent)) return parent;

  var row = descriptor.row;
  parent = resolveSecondaryTimerPlacementRowNumericAttribute(row, "data-secondary-parent");
  if (isValidSecondaryTimerParentValue(parent)) return parent;

  var rowIdentity = resolveSecondaryTimerPlacementRowIdentity(row);
  parent = rowIdentity ? rowIdentity.parent : null;
  if (!isValidSecondaryTimerParentValue(parent)) return null;
  return parent;
}

function resolveSecondaryTimerPlacementChildValue(descriptor, parent) {
  if (!descriptor) return null;
  var child = normalizeSecondaryTimerValue(descriptor.child);
  if (child === null) {
    var row = descriptor.row;
    child = resolveSecondaryTimerPlacementRowNumericAttribute(row, "data-secondary-child");
    if (child === null) {
      var rowIdentity = resolveSecondaryTimerPlacementRowIdentity(row);
      child = rowIdentity ? rowIdentity.child : null;
    }
  }
  if (!isValidSecondaryTimerParentChildPair(parent, child)) return null;
  return child;
}

function resolveSecondaryTimerPlacementDedupeKey(parent, child, rowId) {
  if (typeof rowId === "string" && rowId) {
    return "row-id:" + String(parent) + ":" + rowId;
  }
  if (child !== null) {
    return "parent-child:" + String(parent) + ":" + String(child);
  }
  return "";
}

function createSecondaryTimerPlacementDebugSnapshot(totalDescriptors) {
  return {
    totalDescriptors: Number(totalDescriptors) || 0,
    validPlacementDescriptors: 0,
    placed: 0,
    skippedDuplicate: 0,
    skippedMissingAnchor: 0,
    dedupeKeyHits: {},
    dedupeStrategyHits: {}
  };
}

function incrementSecondaryTimerPlacementDebugCount(counter, key) {
  if (!(counter && key)) return;
  var current = Number(counter[key]) || 0;
  counter[key] = current + 1;
}

function countSecondaryTimerPlacementDebugKeys(counter) {
  if (!isCoreHelperRecordObject(counter)) return 0;
  var total = 0;
  for (var key in counter) {
    if (!Object.prototype.hasOwnProperty.call(counter, key)) continue;
    total += 1;
  }
  return total;
}

function resolveSecondaryTimerPlacementDebugCounterValue(counter, key) {
  if (!isCoreHelperRecordObject(counter) || !key) return 0;
  return Number(counter[key]) || 0;
}

function resolveSecondaryTimerPlacementDedupeStrategy(dedupeKey) {
  if (typeof dedupeKey !== "string" || !dedupeKey) return "row-reference";
  if (dedupeKey.indexOf("row-id:") === 0) return "row-id";
  if (dedupeKey.indexOf("parent-child:") === 0) return "parent-child";
  return "row-reference";
}

var SECONDARY_TIMER_PLACEMENT_DIAGNOSTIC_FIELDS = [
  "totalDescriptors",
  "validPlacementDescriptors",
  "placed",
  "skippedDuplicate",
  "skippedMissingAnchor",
  "dedupeKeyKinds",
  "rowIdStrategyHits",
  "parentChildStrategyHits",
  "rowReferenceStrategyHits"
];
var SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_KEY = "secondaryTimerPlacement";
var SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_SCHEMA_VERSION = 1;

function createSecondaryTimerPlacementDebugSummaryDefaults() {
  return {
    totalDescriptors: 0,
    validPlacementDescriptors: 0,
    placed: 0,
    skippedDuplicate: 0,
    skippedMissingAnchor: 0,
    dedupeKeyKinds: 0,
    rowIdStrategyHits: 0,
    parentChildStrategyHits: 0,
    rowReferenceStrategyHits: 0
  };
}

function resolveSecondaryTimerPlacementDebugSummaryFromSnapshot(debugSnapshot) {
  var summary = createSecondaryTimerPlacementDebugSummaryDefaults();
  if (!isCoreHelperRecordObject(debugSnapshot)) return summary;
  summary.totalDescriptors = Number(debugSnapshot.totalDescriptors) || 0;
  summary.validPlacementDescriptors = Number(debugSnapshot.validPlacementDescriptors) || 0;
  summary.placed = Number(debugSnapshot.placed) || 0;
  summary.skippedDuplicate = Number(debugSnapshot.skippedDuplicate) || 0;
  summary.skippedMissingAnchor = Number(debugSnapshot.skippedMissingAnchor) || 0;
  summary.dedupeKeyKinds = countSecondaryTimerPlacementDebugKeys(debugSnapshot.dedupeKeyHits);
  summary.rowIdStrategyHits = resolveSecondaryTimerPlacementDebugCounterValue(
    debugSnapshot.dedupeStrategyHits,
    "row-id"
  );
  summary.parentChildStrategyHits = resolveSecondaryTimerPlacementDebugCounterValue(
    debugSnapshot.dedupeStrategyHits,
    "parent-child"
  );
  summary.rowReferenceStrategyHits = resolveSecondaryTimerPlacementDebugCounterValue(
    debugSnapshot.dedupeStrategyHits,
    "row-reference"
  );
  return summary;
}

function markSecondaryTimerPlacementDedupeObserved(debugSnapshot, dedupeKey) {
  if (!debugSnapshot || typeof dedupeKey !== "string" || !dedupeKey) return;
  incrementSecondaryTimerPlacementDebugCount(debugSnapshot.dedupeKeyHits, dedupeKey);
  var strategy = resolveSecondaryTimerPlacementDedupeStrategy(dedupeKey);
  incrementSecondaryTimerPlacementDebugCount(debugSnapshot.dedupeStrategyHits, strategy);
}

function publishSecondaryTimerPlacementDebugSnapshot(manager, debugSnapshot) {
  if (!manager || !debugSnapshot) return;
  manager.secondaryTimerPlacementDebugSnapshot = debugSnapshot;
  manager.secondaryTimerPlacementDebugSummary =
    resolveSecondaryTimerPlacementDebugSummaryFromSnapshot(debugSnapshot);
}

function resolveSecondaryTimerPlacementDebugSummary(manager) {
  if (!manager) return createSecondaryTimerPlacementDebugSummaryDefaults();
  return resolveSecondaryTimerPlacementDebugSummaryFromSnapshot(
    manager.secondaryTimerPlacementDebugSnapshot
  );
}

function resolveSecondaryTimerPlacementDiagnosticMaxDedupeKeys(value) {
  var count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return 0;
  count = Math.floor(count);
  if (count > 20) count = 20;
  return count;
}

function resolveSecondaryTimerPlacementDiagnosticsOptions(options) {
  var source = isCoreHelperRecordObject(options) ? options : {};
  return {
    failureOnly: source.failureOnly !== false,
    failed: source.failed === true,
    includeWhenNoActivity: source.includeWhenNoActivity === true,
    maxDedupeKeys: resolveSecondaryTimerPlacementDiagnosticMaxDedupeKeys(source.maxDedupeKeys)
  };
}

function createSecondaryTimerPlacementDiagnosticsPayload(summary) {
  var payload = {};
  for (var i = 0; i < SECONDARY_TIMER_PLACEMENT_DIAGNOSTIC_FIELDS.length; i++) {
    var field = SECONDARY_TIMER_PLACEMENT_DIAGNOSTIC_FIELDS[i];
    payload[field] = Number(summary[field]) || 0;
  }
  return payload;
}

function shouldIncludeSecondaryTimerPlacementDiagnostics(summary, options) {
  if (options.failureOnly && !options.failed) return false;
  if (!options.includeWhenNoActivity && (Number(summary.validPlacementDescriptors) || 0) <= 0) {
    return false;
  }
  return true;
}

function collectSecondaryTimerPlacementDiagnosticDedupeEntries(manager) {
  if (!manager) return [];
  var snapshot = manager.secondaryTimerPlacementDebugSnapshot;
  var hits = snapshot && isCoreHelperRecordObject(snapshot.dedupeKeyHits)
    ? snapshot.dedupeKeyHits
    : null;
  if (!hits) return [];
  var entries = [];
  for (var key in hits) {
    if (!Object.prototype.hasOwnProperty.call(hits, key)) continue;
    if (typeof key !== "string" || !key) continue;
    entries.push({
      key: key,
      count: Number(hits[key]) || 0
    });
  }
  return entries;
}

function sortSecondaryTimerPlacementDiagnosticDedupeEntries(entries) {
  entries.sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  });
}

function createSecondaryTimerPlacementDiagnosticDedupeKeySamples(entries, maxDedupeKeys) {
  var samples = [];
  if (!Array.isArray(entries) || entries.length <= 0) return samples;
  var limit = Math.min(maxDedupeKeys, entries.length);
  for (var i = 0; i < limit; i++) {
    samples.push(entries[i].key + "#" + String(entries[i].count));
  }
  return samples;
}

function appendSecondaryTimerPlacementDiagnosticDedupeKeySamples(payload, manager, maxDedupeKeys) {
  if (!payload || maxDedupeKeys <= 0 || !manager) return;
  var entries = collectSecondaryTimerPlacementDiagnosticDedupeEntries(manager);
  if (entries.length <= 0) return;
  sortSecondaryTimerPlacementDiagnosticDedupeEntries(entries);
  var samples = createSecondaryTimerPlacementDiagnosticDedupeKeySamples(entries, maxDedupeKeys);
  if (samples.length <= 0) return;
  payload.dedupeKeySamples = samples;
}

function resolveSecondaryTimerPlacementDiagnosticsPayload(manager, options) {
  var summary = resolveSecondaryTimerPlacementDebugSummary(manager);
  var normalizedOptions = resolveSecondaryTimerPlacementDiagnosticsOptions(options);
  if (!shouldIncludeSecondaryTimerPlacementDiagnostics(summary, normalizedOptions)) return null;
  var payload = createSecondaryTimerPlacementDiagnosticsPayload(summary);
  appendSecondaryTimerPlacementDiagnosticDedupeKeySamples(
    payload,
    manager,
    normalizedOptions.maxDedupeKeys
  );
  return payload;
}

function resolveSecondaryTimerPlacementDiagnosticsIndexEntry(manager, options) {
  var payload = resolveSecondaryTimerPlacementDiagnosticsPayload(manager, options);
  if (!payload) return null;
  return {
    key: SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_KEY,
    schemaVersion: SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_SCHEMA_VERSION,
    payload: payload
  };
}

function isSecondaryTimerRowIdLike(rowId) {
  if (typeof rowId !== "string" || !rowId) return false;
  return rowId.indexOf("timer-row-secondary-") === 0;
}

function resolveSecondaryTimerExistingTailAnchorParent(node) {
  if (!node) return null;
  var fromIdentity = parseSecondaryTimerRowIdentity(node.id);
  if (fromIdentity && isValidSecondaryTimerParentValue(fromIdentity.parent)) {
    return fromIdentity.parent;
  }
  var fromAttribute = resolveSecondaryTimerPlacementRowNumericAttribute(node, "data-secondary-parent");
  if (!isValidSecondaryTimerParentValue(fromAttribute)) return null;
  return fromAttribute;
}

function resolveSecondaryTimerExistingTailAnchor(timerBox, parent) {
  if (!(timerBox && timerBox.children)) return null;
  for (var i = timerBox.children.length - 1; i >= 0; i--) {
    var node = timerBox.children[i];
    if (!node) continue;
    if (node.parentNode !== timerBox) continue;
    if (!isSecondaryTimerRowIdLike(node.id)) continue;
    var existingParent = resolveSecondaryTimerExistingTailAnchorParent(node);
    if (existingParent !== parent) continue;
    return node;
  }
  return null;
}

function resolveSecondaryTimerPlacementAnchor(manager, timerBox, tailByParent, placementInfo) {
  if (!placementInfo) return null;
  var anchors = [
    tailByParent[placementInfo.key],
    resolveSecondaryTimerParentAnchor(manager, timerBox, placementInfo.parent),
    resolveSecondaryTimerExistingTailAnchor(timerBox, placementInfo.parent)
  ];
  for (var i = 0; i < anchors.length; i++) {
    var anchor = anchors[i];
    if (anchor && anchor.parentNode === timerBox) {
      return anchor;
    }
  }
  return null;
}

function hasSeenSecondaryTimerPlacementRowReference(seenPlacementRowRefs, row) {
  if (!Array.isArray(seenPlacementRowRefs) || !row) return false;
  for (var i = 0; i < seenPlacementRowRefs.length; i++) {
    if (seenPlacementRowRefs[i] === row) return true;
  }
  return false;
}

function shouldSkipSecondaryTimerPlacementRow(seenPlacementRows, seenPlacementRowRefs, placementInfo, debugSnapshot) {
  if (!placementInfo) return false;
  var dedupeKey = placementInfo.dedupeKey;
  if (dedupeKey && seenPlacementRows) {
    markSecondaryTimerPlacementDedupeObserved(debugSnapshot, dedupeKey);
    if (seenPlacementRows[dedupeKey]) return true;
    seenPlacementRows[dedupeKey] = true;
    return false;
  }
  var row = placementInfo.row;
  if (!row) return false;
  incrementSecondaryTimerPlacementDebugCount(
    debugSnapshot ? debugSnapshot.dedupeStrategyHits : null,
    "row-reference"
  );
  if (hasSeenSecondaryTimerPlacementRowReference(seenPlacementRowRefs, row)) return true;
  if (Array.isArray(seenPlacementRowRefs)) {
    seenPlacementRowRefs.push(row);
  }
  return false;
}

function canPlaceSecondaryTimerRowNearParent(timerBox, anchor) {
  return !!(timerBox && anchor && anchor.parentNode === timerBox);
}

function placeSecondaryTimerRowAfterAnchor(timerBox, anchor, row) {
  if (!timerBox || !anchor || !row) return;
  if (anchor.nextSibling !== row) {
    timerBox.insertBefore(row, anchor.nextSibling);
  }
}

function appendSecondaryTimerScrollControls(manager, timerBox) {
  var controls = resolveManagerElementById(manager, "timer-scroll-controls");
  if (!controls || controls.parentNode !== timerBox) return;
  if (controls.nextSibling !== null) {
    timerBox.appendChild(controls);
  }
}

function applySecondaryTimerHiddenRowState(row) {
  if (!row) return;
  row.style.display = "none";
  row.setAttribute("data-secondary-hidden", "1");
  row.removeAttribute("data-scroll-hidden");
  row.style.visibility = "";
  row.style.pointerEvents = "";
}

function placeSecondaryTimerRowsNearParents(manager, descriptors) {
  if (!manager) return;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox) return;
  var list = Array.isArray(descriptors) ? descriptors : [];
  var debugSnapshot = createSecondaryTimerPlacementDebugSnapshot(list.length);
  var tailByParent = {};
  var seenPlacementRows = {};
  var seenPlacementRowRefs = [];

  for (var i = 0; i < list.length; i++) {
    var placementInfo = resolveSecondaryTimerPlacementInfo(list[i]);
    if (!placementInfo) continue;
    debugSnapshot.validPlacementDescriptors += 1;
    if (shouldSkipSecondaryTimerPlacementRow(seenPlacementRows, seenPlacementRowRefs, placementInfo, debugSnapshot)) {
      debugSnapshot.skippedDuplicate += 1;
      continue;
    }
    var anchor = resolveSecondaryTimerPlacementAnchor(manager, timerBox, tailByParent, placementInfo);
    if (!canPlaceSecondaryTimerRowNearParent(timerBox, anchor)) {
      debugSnapshot.skippedMissingAnchor += 1;
      continue;
    }
    placeSecondaryTimerRowAfterAnchor(timerBox, anchor, placementInfo.row);
    tailByParent[placementInfo.key] = placementInfo.row;
    debugSnapshot.placed += 1;
  }

  publishSecondaryTimerPlacementDebugSnapshot(manager, debugSnapshot);
  appendSecondaryTimerScrollControls(manager, timerBox);
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
    applySecondaryTimerHiddenRowState(descriptor.row);
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
      applySecondaryTimerHiddenRowState(descriptor.row);
    }
  }
}

function canStampSecondaryTimerDescriptor(manager, descriptor, merged) {
  if (!descriptor || !descriptor.timerEl) return false;
  if (descriptor.child !== merged) return false;
  if (!isSecondaryTimerParentReached(manager, descriptor.parent)) return false;
  return String(descriptor.timerEl.textContent || "") === "";
}

function stampSecondaryTimerDescriptor(descriptor, timeStr) {
  descriptor.timerEl.textContent = String(timeStr || "");
}

function stampSecondaryTimerDescriptorsForValue(manager, descriptors, merged, timeStr) {
  var changed = false;
  for (var i = 0; i < descriptors.length; i++) {
    var descriptor = descriptors[i];
    if (!canStampSecondaryTimerDescriptor(manager, descriptor, merged)) continue;
    stampSecondaryTimerDescriptor(descriptor, timeStr);
    changed = true;
  }
  return changed;
}

function stampSecondaryTimersForMergedValue(manager, mergedValue, timeStr) {
  if (!manager) return;
  var merged = resolveSecondaryTimerSlotByValue(manager, mergedValue);
  if (merged === null || merged < 2048) return;
  if (!isSecondaryTimerPowerOfTwo(merged)) return;
  var descriptors = resolveSecondaryTimerDescriptors(manager);
  var changed = stampSecondaryTimerDescriptorsForValue(manager, descriptors, merged, timeStr);
  if (changed) {
    refreshSecondaryTimerRowsVisibility(manager);
  }
}

function resolveSecondaryTimerInvalidationPlaceholderText(placeholderText) {
  return typeof placeholderText === "string" && placeholderText ? placeholderText : "---------";
}

function canInvalidateSecondaryTimerDescriptorByLimit(descriptor, limit) {
  if (!(descriptor && descriptor.timerEl)) return false;
  if (descriptor.parent > limit) return false;
  if (descriptor.child > limit) return false;
  return true;
}

function applySecondaryTimerInvalidationText(descriptor, text) {
  if (!descriptor || !descriptor.timerEl) return false;
  var current = String(descriptor.timerEl.textContent || "");
  if (current === text) return false;
  descriptor.timerEl.textContent = text;
  return true;
}

function invalidateSecondaryTimersByLimit(manager, limitValue, placeholderText) {
  if (!manager) return false;
  var limit = resolveSecondaryTimerSlotByValue(manager, limitValue);
  if (limit === null || limit < 2048) return false;
  var text = resolveSecondaryTimerInvalidationPlaceholderText(placeholderText);
  var descriptors = resolveSecondaryTimerDescriptors(manager);
  var changed = false;
  for (var i = 0; i < descriptors.length; i++) {
    var descriptor = descriptors[i];
    if (!canInvalidateSecondaryTimerDescriptorByLimit(descriptor, limit)) continue;
    if (applySecondaryTimerInvalidationText(descriptor, text)) {
      changed = true;
    }
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

function isSecondaryTimerDisplayTimeText(value) {
  if (typeof value !== "string") return false;
  if (value === "") return true;
  return value.indexOf(":") !== -1 || value.indexOf(".") !== -1 || value === "---------" || value === "DNF";
}
function formatSecondaryTimerDurationMs(value) {
  var raw = Number(value);
  if (!Number.isFinite(raw) || raw < 0) return null;
  var time = Math.floor(raw);
  var bits = time % 1000;
  time = (time - bits) / 1000;
  var secs = time % 60;
  var mins = ((time - secs) / 60) % 60;
  var hours = (time - secs - 60 * mins) / 3600;
  var text = String(bits);
  if (bits < 10) text = "0" + text;
  if (bits < 100) text = "0" + text;
  text = secs + "." + text;
  if (secs < 10 && (mins > 0 || hours > 0)) text = "0" + text;
  if (mins > 0 || hours > 0) text = mins + ":" + text;
  if (mins < 10 && hours > 0) text = "0" + text;
  if (hours > 0) text = hours + ":" + text;
  return text;
}
function resolveSecondaryTimerRowStateDurationMs(state) {
  var msKeys = ["duration_ms", "elapsed_ms", "timer_ms", "time_ms", "durationMs", "elapsedMs", "timerMs", "timeMs"];
  for (var i = 0; i < msKeys.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(state, msKeys[i])) continue;
    var formatted = formatSecondaryTimerDurationMs(state[msKeys[i]]);
    if (formatted !== null) return formatted;
  }
  return null;
}
function normalizeSecondaryTimerRowStateTime(state) {
  if (!isCoreHelperRecordObject(state)) return null;
  var textKeys = ["time", "timerText", "timer_text", "text", "valueText", "value_text"];
  var fallbackText = null;
  for (var i = 0; i < textKeys.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(state, textKeys[i])) continue;
    var rawText = state[textKeys[i]];
    if (typeof rawText !== "string") continue;
    if (isSecondaryTimerDisplayTimeText(rawText)) return rawText;
    if (fallbackText === null) fallbackText = rawText;
  }
  var durationText = resolveSecondaryTimerRowStateDurationMs(state);
  if (durationText !== null) return durationText;
  if (fallbackText !== null) return fallbackText;
  if (Object.prototype.hasOwnProperty.call(state, "time")) return null;
  return "";
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
    if (!isValidSecondaryTimerParentChildPair(parent, child)) continue;
    var time = normalizeSecondaryTimerRowStateTime(state);
    if (time === null) continue;
    stateByKey[String(parent) + "|" + String(child)] = {
      time: time
    };
  }

  for (var descriptorIndex = 0; descriptorIndex < descriptors.length; descriptorIndex++) {
    var descriptor = descriptors[descriptorIndex];
    if (!descriptor) continue;
    var key = String(descriptor.parent) + "|" + String(descriptor.child);
    var rowState = stateByKey[key];
    if (!descriptor.timerEl) continue;
    if (!rowState) {
      descriptor.timerEl.textContent = "";
      continue;
    }
    descriptor.timerEl.textContent = rowState.time;
  }

  refreshSecondaryTimerRowsVisibility(manager);
}

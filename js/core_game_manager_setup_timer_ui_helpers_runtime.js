function hideLegacyStepStatsForSetup(manager) {
  if (!manager) return;
  var legacyTotalEl = resolveManagerElementById(manager, "stats-total");
  if (legacyTotalEl) legacyTotalEl.style.visibility = "hidden";
  var legacyMovesEl = resolveManagerElementById(manager, "stats-moves");
  if (legacyMovesEl) legacyMovesEl.style.visibility = "hidden";
  var legacyUndoEl = resolveManagerElementById(manager, "stats-undo");
  if (legacyUndoEl) legacyUndoEl.style.visibility = "hidden";
}

function normalizeSetupTimerSlotValue(slotValue) {
  var slot = Number(slotValue);
  if (!Number.isInteger(slot) || slot <= 0) return null;
  return slot;
}

function getSetupTimerSlotIds() {
  return Array.isArray(GameManager.TIMER_SLOT_IDS) ? GameManager.TIMER_SLOT_IDS : [];
}

function ensureSetupTimerRowItemClass(row) {
  if (!row) return;
  var existingClass = String(row.className || "");
  if (existingClass.indexOf("timer-row-item") !== -1) return;
  row.className = (existingClass ? existingClass + " " : "") + "timer-row-item";
}

function isSetupWhitespaceTextNode(node) {
  return node && node.nodeType === 3 && String(node.nodeValue || "").trim() === "";
}

function isSetupBreakNode(node) {
  return (
    node &&
    node.nodeType === 1 &&
    node.tagName &&
    String(node.tagName).toLowerCase() === "br"
  );
}

function resolveSetupTimerLegendForSlot(timerEl, timerBox, slot) {
  if (!(timerEl && timerBox)) return null;
  var legend = timerEl.previousElementSibling;
  var expectedLegendClass = "timer-legend-" + String(slot);
  if (
    !(
      legend &&
      legend.parentNode === timerBox &&
      legend.classList &&
      legend.classList.contains("timertile") &&
      String(legend.className || "").indexOf(expectedLegendClass) !== -1
    )
  ) {
    return null;
  }
  return legend;
}

function createSetupTimerRowElement(documentLike, rowId) {
  if (!(documentLike && typeof documentLike.createElement === "function")) return null;
  var row = documentLike.createElement("div");
  if (!row) return null;
  row.id = rowId;
  row.className = "timer-row-item";
  return row;
}

function appendSetupTimerTrailingNodes(row, nextAfterTimer) {
  if (!row) return 0;
  var cursor = nextAfterTimer;
  var movedBr = 0;
  while (cursor && movedBr < 2) {
    if (isSetupWhitespaceTextNode(cursor)) {
      var whitespaceNode = cursor;
      cursor = cursor.nextSibling;
      row.appendChild(whitespaceNode);
      continue;
    }
    if (isSetupBreakNode(cursor)) {
      var brNode = cursor;
      cursor = cursor.nextSibling;
      row.appendChild(brNode);
      movedBr += 1;
      continue;
    }
    break;
  }
  return movedBr;
}

function ensureSetupTimerTrailingBreakNodes(row, documentLike, movedBr) {
  if (!row || !(documentLike && typeof documentLike.createElement === "function")) return;
  var count = Number.isInteger(movedBr) ? movedBr : 0;
  while (count < 2) {
    row.appendChild(documentLike.createElement("br"));
    count += 1;
  }
}

function createSetupTimerRowForSlot(manager, timerBox, documentLike, slot) {
  if (!manager || !timerBox) return;
  var timerEl = resolveManagerElementById(manager, "timer" + String(slot));
  if (!(timerEl && timerEl.parentNode === timerBox)) return;

  var rowId = "timer-row-" + String(slot);
  var row = createSetupTimerRowElement(documentLike, rowId);
  if (!row) return;

  var legend = resolveSetupTimerLegendForSlot(timerEl, timerBox, slot);
  var nextAfterTimer = timerEl.nextSibling;
  timerBox.insertBefore(row, legend || timerEl);
  if (legend) row.appendChild(legend);
  row.appendChild(timerEl);

  var movedBr = appendSetupTimerTrailingNodes(row, nextAfterTimer);
  ensureSetupTimerTrailingBreakNodes(row, documentLike, movedBr);
}

function normalizeLegacyTimerRowsForSetupByRuntime(manager) {
  var runtime = typeof CoreSetupTimerRowNormalizeRuntime !== "undefined" && CoreSetupTimerRowNormalizeRuntime ? CoreSetupTimerRowNormalizeRuntime : (typeof window !== "undefined" && window ? window.CoreSetupTimerRowNormalizeRuntime : null);
  if (!(runtime && typeof runtime.normalizeLegacyTimerRowsForSetup === "function")) return false;
  return runtime.normalizeLegacyTimerRowsForSetup({ manager: manager, timerSlotIds: getSetupTimerSlotIds() }, {
    resolveTimerBox: function (currentManager) { return resolveManagerElementById(currentManager, "timerbox"); },
    resolveDocumentLike: function (currentManager) { return resolveManagerDocumentLike(currentManager); },
    resolveExistingRow: function (currentManager, rowId) { return resolveManagerElementById(currentManager, rowId); },
    ensureRowItemClass: function (row) { ensureSetupTimerRowItemClass(row); },
    createRowForSlot: function (currentManager, timerBox, documentLike, slot) { createSetupTimerRowForSlot(currentManager, timerBox, documentLike, slot); }
  }) === true;
}

function normalizeLegacyTimerRowsForSetupFallback(manager) {
  if (!manager) return;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox) return;
  var slots = getSetupTimerSlotIds();
  var documentLike = resolveManagerDocumentLike(manager);
  if (!(documentLike && typeof documentLike.createElement === "function")) return;
  for (var i = 0; i < slots.length; i++) {
    var slot = normalizeSetupTimerSlotValue(slots[i]);
    if (slot === null) continue;
    var rowId = "timer-row-" + String(slot);
    var existingRow = resolveManagerElementById(manager, rowId);
    if (existingRow) { ensureSetupTimerRowItemClass(existingRow); continue; }
    createSetupTimerRowForSlot(manager, timerBox, documentLike, slot);
  }
}

function normalizeLegacyTimerRowsForSetup(manager) {
  if (!normalizeLegacyTimerRowsForSetupByRuntime(manager)) normalizeLegacyTimerRowsForSetupFallback(manager);
}

function cleanupLegacyTimerboxBreakNodesForSetup(manager) {
  if (!manager) return;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox) return;
  for (var i = timerBox.childNodes.length - 1; i >= 0; i--) {
    var node = timerBox.childNodes[i];
    if (!node) continue;
    if (
      node.nodeType === 1 &&
      node.tagName &&
      String(node.tagName).toLowerCase() === "br"
    ) {
      timerBox.removeChild(node);
    }
  }
}

function resetTimerTextSlotsForSetup(manager) {
  if (!manager) return;
  var timerEl0 = resolveManagerElementById(manager, "timer");
  if (timerEl0) timerEl0.textContent = manager.pretty(0);
  var timerSlots = getSetupTimerSlotIds();
  timerSlots.forEach(function (slotId) {
    var timerEl = resolveManagerElementById(manager, "timer" + slotId);
    if (timerEl) timerEl.textContent = "";
  });
  resetSecondaryTimerRowsForSetup(manager);
}

function createSupportedTimerSlotMapForSetup() {
  var map = {};
  var slots = getSetupTimerSlotIds();
  for (var i = 0; i < slots.length; i++) {
    var slot = Number(slots[i]);
    if (!Number.isInteger(slot) || slot <= 0) continue;
    map[String(slot)] = true;
  }
  return map;
}

function resolveSetupTimerRowSlotId(row) {
  var match = row && row.id ? String(row.id).match(/^timer-row-(\d+)$/) : null;
  if (!match) return null;
  return String(match[1] || "");
}

function resolveSetupTimerValueSlotId(timerEl) {
  var match = timerEl && timerEl.id ? String(timerEl.id).match(/^timer(\d+)$/) : null;
  if (!match) return null;
  return String(match[1] || "");
}

function hideUnsupportedSetupTimerRow(row) {
  if (!row || !row.style) return;
  row.style.display = "none";
  row.style.visibility = "";
  row.style.pointerEvents = "";
  if (typeof row.removeAttribute === "function") {
    row.removeAttribute("data-scroll-hidden");
  }
}

function isSetupTimerLegendNode(element) {
  return (
    element &&
    element.classList &&
    element.classList.contains("timertile") &&
    String(element.className || "").indexOf("timer-legend-") !== -1
  );
}

function hideSetupTimerTrailingBreaks(nextSibling) {
  var cursor = nextSibling;
  var hiddenBr = 0;
  while (cursor && hiddenBr < 2) {
    if (isSetupWhitespaceTextNode(cursor)) {
      cursor = cursor.nextSibling;
      continue;
    }
    if (isSetupBreakNode(cursor)) {
      cursor.style.display = "none";
      hiddenBr += 1;
      cursor = cursor.nextSibling;
      continue;
    }
    break;
  }
}

function hideUnsupportedSetupTimerValue(timerEl) {
  if (!(timerEl && timerEl.style)) return;
  timerEl.style.display = "none";
  var previous = timerEl.previousElementSibling;
  if (isSetupTimerLegendNode(previous)) {
    previous.style.display = "none";
  }
  hideSetupTimerTrailingBreaks(timerEl.nextSibling);
}

function hideUnsupportedSetupTimerRowsByMap(timerBox, supportedMap) {
  if (!timerBox || typeof timerBox.querySelectorAll !== "function") return;
  var rows = timerBox.querySelectorAll("[id^='timer-row-']");
  for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    var row = rows[rowIndex];
    var slotId = resolveSetupTimerRowSlotId(row);
    if (!slotId) continue;
    if (supportedMap[slotId] === true) continue;
    hideUnsupportedSetupTimerRow(row);
  }
}

function hideUnsupportedSetupTimerValuesByMap(timerBox, supportedMap) {
  if (!timerBox || typeof timerBox.querySelectorAll !== "function") return;
  var timerValues = timerBox.querySelectorAll("[id^='timer']");
  for (var timerIndex = 0; timerIndex < timerValues.length; timerIndex++) {
    var timerEl = timerValues[timerIndex];
    var timerSlotId = resolveSetupTimerValueSlotId(timerEl);
    if (!timerSlotId) continue;
    if (supportedMap[timerSlotId] === true) continue;
    hideUnsupportedSetupTimerValue(timerEl);
  }
}

function hideUnsupportedTimerRowsForSetup(manager) {
  if (!manager) return;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox || typeof timerBox.querySelectorAll !== "function") return;

  var supportedMap = createSupportedTimerSlotMapForSetup();
  hideUnsupportedSetupTimerRowsByMap(timerBox, supportedMap);
  hideUnsupportedSetupTimerValuesByMap(timerBox, supportedMap);
}

function repositionCappedTimerContainerForSetup(manager, cappedTimerContainer) {
  if (!manager || !cappedTimerContainer) return;
  var cappedStateForReposition = manager.resolveCappedModeState();
  var anchorTarget = cappedStateForReposition.cappedTargetValue || 2048;
  var anchorRow = manager.getTimerRowEl(anchorTarget);
  if (!anchorRow || !anchorRow.parentNode) return;
  var parent = anchorRow.parentNode;
  if (cappedTimerContainer.parentNode === parent && anchorRow.nextSibling === cappedTimerContainer) return;
  parent.insertBefore(cappedTimerContainer, anchorRow.nextSibling);
}

function createCappedRowVisibilityPlanPayload(cappedState) {
  return {
    isCappedMode: cappedState.isCappedMode,
    isProgressiveCapped64Mode: cappedState.isProgressiveCapped64Mode,
    cappedTargetValue: cappedState.cappedTargetValue,
    timerSlotIds: getSetupTimerSlotIds()
  };
}

function applyCappedRowVisibilityPlanItems(manager, plan) {
  if (!manager || !Array.isArray(plan) || plan.length <= 0) return false;
  for (var p = 0; p < plan.length; p++) {
    var item = plan[p];
    if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
    manager.setTimerRowVisibleState(item.value, !!item.visible, !!item.keepSpace);
  }
  return true;
}

function applyProgressiveCapped64ResetIfNeeded(manager, cappedState) {
  if (!manager || !cappedState) return;
  if (cappedState.isCappedMode && cappedState.isProgressiveCapped64Mode) {
    manager.resetProgressiveCapped64Rows();
  }
}

function resolveCappedRowVisibilityPlanFromCoreValue(manager, cappedState, coreValue) {
  if (!applyCappedRowVisibilityPlanItems(manager, coreValue)) return false;
  applyProgressiveCapped64ResetIfNeeded(manager, cappedState);
  return true;
}

function applyCappedRowVisibilityPlanFromCore(manager, cappedState) {
  if (!manager || !cappedState) return false;
  return resolveCorePayloadCallWith(manager, "callCoreModeRuntime", "resolveCappedRowVisibilityPlan", createCappedRowVisibilityPlanPayload(cappedState), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return resolveCappedRowVisibilityPlanFromCoreValue(currentManager, cappedState, coreValue);
    }, function () {
      return false;
    });
  });
}

function applyCappedRowVisibilityPlanFallback(manager, cappedState) {
  if (!manager || !cappedState) return;
  var timerSlotIds = getSetupTimerSlotIds();
  if (!cappedState.isCappedMode) {
    for (var allIndex = 0; allIndex < timerSlotIds.length; allIndex++) manager.setTimerRowVisibleState(timerSlotIds[allIndex], true, false);
    return;
  }
  if (cappedState.isProgressiveCapped64Mode) {
    for (var progressiveIndex = 0; progressiveIndex < timerSlotIds.length; progressiveIndex++) manager.setTimerRowVisibleState(timerSlotIds[progressiveIndex], false, true);
    manager.resetProgressiveCapped64Rows();
    return;
  }
  for (var cappedIndex = 0; cappedIndex < timerSlotIds.length; cappedIndex++) {
    var value = timerSlotIds[cappedIndex];
    manager.setTimerRowVisibleState(value, value <= cappedState.cappedTargetValue, true);
  }
}

function applyCappedRowVisibilityPlanForSetup(manager, cappedState) {
  if (!manager || !cappedState) return;
  var appliedByCore = applyCappedRowVisibilityPlanFromCore(manager, cappedState);
  if (!appliedByCore) {
    applyCappedRowVisibilityPlanFallback(manager, cappedState);
  }
}

function resetCappedPlaceholderRowsForSetup(manager, cappedStateForReset) {
  if (!manager || !cappedStateForReset || !cappedStateForReset.isCappedMode) return;
  var placeholderValues = manager.getCappedPlaceholderRowValues(cappedStateForReset);
  for (var placeholderValueIndex = 0; placeholderValueIndex < placeholderValues.length; placeholderValueIndex++) {
    var slotId = String(placeholderValues[placeholderValueIndex]);
    var row = manager.getTimerRowEl(slotId);
    var timerEl = resolveManagerElementById(manager, "timer" + slotId);
    if (timerEl) timerEl.textContent = "";
    if (!row) continue;
    var legend = row.querySelector(".timertile");
    if (legend) {
      legend.className = "timertile timer-legend-" + slotId;
      legend.textContent = slotId;
    }
    row.removeAttribute("data-capped-repeat");
  }
}

function resetCappedContainersForSetup(manager, cappedStateForReset, cappedTimerContainer) {
  if (!manager) return;
  manager.cappedMilestoneCount = 0;
  if (cappedTimerContainer) cappedTimerContainer.innerHTML = "";
  var overflowContainer = resolveManagerElementById(manager, "capped-timer-overflow-container");
  if (overflowContainer) overflowContainer.innerHTML = "";
  resetCappedPlaceholderRowsForSetup(manager, cappedStateForReset);
}

function resetTimerUiForSetup(manager) {
  if (!manager) return;
  if (manager.ipsInterval) clearInterval(manager.ipsInterval);
  hideLegacyStepStatsForSetup(manager);
  normalizeLegacyTimerRowsForSetup(manager);
  cleanupLegacyTimerboxBreakNodesForSetup(manager);
  resetTimerTextSlotsForSetup(manager);
  hideUnsupportedTimerRowsForSetup(manager);
  var cappedTimerContainer = resolveManagerElementById(manager, "capped-timer-container");
  repositionCappedTimerContainerForSetup(manager, cappedTimerContainer);
  var cappedState = manager.resolveCappedModeState();
  applyCappedRowVisibilityPlanForSetup(manager, cappedState);
  var cappedStateForReset = manager.resolveCappedModeState();
  resetCappedContainersForSetup(manager, cappedStateForReset, cappedTimerContainer);
  manager.getCappedOverflowContainer(cappedStateForReset);
  manager.callWindowMethod("cappedTimerReset");
}

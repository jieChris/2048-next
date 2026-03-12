function hideLegacyStepStatsForSetup(manager) {
  if (!manager) return;
  var legacyTotalEl = resolveManagerElementById(manager, "stats-total");
  if (legacyTotalEl) legacyTotalEl.style.visibility = "hidden";
  var legacyMovesEl = resolveManagerElementById(manager, "stats-moves");
  if (legacyMovesEl) legacyMovesEl.style.visibility = "hidden";
  var legacyUndoEl = resolveManagerElementById(manager, "stats-undo");
  if (legacyUndoEl) legacyUndoEl.style.visibility = "hidden";
}

function normalizeLegacyTimerRowsForSetup(manager) {
  if (!manager) return;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox) return;

  var slots = Array.isArray(GameManager.TIMER_SLOT_IDS) ? GameManager.TIMER_SLOT_IDS : [];
  var documentLike = resolveManagerDocumentLike(manager);
  if (!(documentLike && typeof documentLike.createElement === "function")) return;

  for (var i = 0; i < slots.length; i++) {
    var slot = Number(slots[i]);
    if (!Number.isInteger(slot) || slot <= 0) continue;

    var rowId = "timer-row-" + String(slot);
    var existingRow = resolveManagerElementById(manager, rowId);
    if (existingRow) {
      var existingClass = String(existingRow.className || "");
      if (existingClass.indexOf("timer-row-item") === -1) {
        existingRow.className = (existingClass ? existingClass + " " : "") + "timer-row-item";
      }
      continue;
    }

    var timerEl = resolveManagerElementById(manager, "timer" + String(slot));
    if (!(timerEl && timerEl.parentNode === timerBox)) continue;

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
      legend = null;
    }

    var row = documentLike.createElement("div");
    row.id = rowId;
    row.className = "timer-row-item";

    var nextAfterTimer = timerEl.nextSibling;
    timerBox.insertBefore(row, legend || timerEl);
    if (legend) row.appendChild(legend);
    row.appendChild(timerEl);

    var cursor = nextAfterTimer;
    var movedBr = 0;
    while (cursor && movedBr < 2) {
      if (cursor.nodeType === 3 && String(cursor.nodeValue || "").trim() === "") {
        var whitespaceNode = cursor;
        cursor = cursor.nextSibling;
        row.appendChild(whitespaceNode);
        continue;
      }
      if (
        cursor.nodeType === 1 &&
        cursor.tagName &&
        String(cursor.tagName).toLowerCase() === "br"
      ) {
        var brNode = cursor;
        cursor = cursor.nextSibling;
        row.appendChild(brNode);
        movedBr += 1;
        continue;
      }
      break;
    }

    while (movedBr < 2) {
      row.appendChild(documentLike.createElement("br"));
      movedBr += 1;
    }
  }
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
  var timerSlots = GameManager.TIMER_SLOT_IDS;
  timerSlots.forEach(function (slotId) {
    var timerEl = resolveManagerElementById(manager, "timer" + slotId);
    if (timerEl) timerEl.textContent = "";
  });
  resetSecondaryTimerRowsForSetup(manager);
}

function createSupportedTimerSlotMapForSetup() {
  var map = {};
  var slots = Array.isArray(GameManager.TIMER_SLOT_IDS) ? GameManager.TIMER_SLOT_IDS : [];
  for (var i = 0; i < slots.length; i++) {
    var slot = Number(slots[i]);
    if (!Number.isInteger(slot) || slot <= 0) continue;
    map[String(slot)] = true;
  }
  return map;
}

function hideUnsupportedTimerRowsForSetup(manager) {
  if (!manager) return;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox || typeof timerBox.querySelectorAll !== "function") return;

  var supportedMap = createSupportedTimerSlotMapForSetup();
  var rows = timerBox.querySelectorAll("[id^='timer-row-']");
  for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    var row = rows[rowIndex];
    var match = row && row.id ? String(row.id).match(/^timer-row-(\d+)$/) : null;
    if (!match) continue;
    var slotId = String(match[1] || "");
    if (supportedMap[slotId] === true) continue;
    row.style.display = "none";
    row.style.visibility = "";
    row.style.pointerEvents = "";
    row.removeAttribute("data-scroll-hidden");
  }

  var timerValues = timerBox.querySelectorAll("[id^='timer']");
  for (var timerIndex = 0; timerIndex < timerValues.length; timerIndex++) {
    var timerEl = timerValues[timerIndex];
    var timerMatch = timerEl && timerEl.id ? String(timerEl.id).match(/^timer(\d+)$/) : null;
    if (!timerMatch) continue;
    var timerSlotId = String(timerMatch[1] || "");
    if (supportedMap[timerSlotId] === true) continue;

    timerEl.style.display = "none";
    var previous = timerEl.previousElementSibling;
    if (
      previous &&
      previous.classList &&
      previous.classList.contains("timertile") &&
      String(previous.className || "").indexOf("timer-legend-") !== -1
    ) {
      previous.style.display = "none";
    }

    var cursor = timerEl.nextSibling;
    var hiddenBr = 0;
    while (cursor && hiddenBr < 2) {
      if (cursor.nodeType === 3 && String(cursor.nodeValue || "").trim() === "") {
        cursor = cursor.nextSibling;
        continue;
      }
      if (
        cursor.nodeType === 1 &&
        cursor.tagName &&
        String(cursor.tagName).toLowerCase() === "br"
      ) {
        cursor.style.display = "none";
        hiddenBr += 1;
        cursor = cursor.nextSibling;
        continue;
      }
      break;
    }
  }
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
    timerSlotIds: GameManager.TIMER_SLOT_IDS
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
  var timerSlotIds = GameManager.TIMER_SLOT_IDS;
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

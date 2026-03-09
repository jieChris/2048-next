function hideLegacyStepStatsForSetup(manager) {
  if (!manager) return;
  var legacyTotalEl = resolveManagerElementById(manager, "stats-total");
  if (legacyTotalEl) legacyTotalEl.style.visibility = "hidden";
  var legacyMovesEl = resolveManagerElementById(manager, "stats-moves");
  if (legacyMovesEl) legacyMovesEl.style.visibility = "hidden";
  var legacyUndoEl = resolveManagerElementById(manager, "stats-undo");
  if (legacyUndoEl) legacyUndoEl.style.visibility = "hidden";
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
  resetTimerTextSlotsForSetup(manager);
  var cappedTimerContainer = resolveManagerElementById(manager, "capped-timer-container");
  repositionCappedTimerContainerForSetup(manager, cappedTimerContainer);
  var cappedState = manager.resolveCappedModeState();
  applyCappedRowVisibilityPlanForSetup(manager, cappedState);
  var cappedStateForReset = manager.resolveCappedModeState();
  resetCappedContainersForSetup(manager, cappedStateForReset, cappedTimerContainer);
  manager.getCappedOverflowContainer(cappedStateForReset);
  manager.callWindowMethod("cappedTimerReset");
}

function resolvePreferredTimerModuleView(manager) {
  if (!manager) return "timer";
  var timerModuleViewMap = manager.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  return resolveCoreStoragePayloadNormalizedCallOrFallback(
    manager,
    "readTimerModuleViewForModeFromMap",
    {
      map: timerModuleViewMap,
      mode: manager.mode
    },
    function (viewByCore) {
      return viewByCore === "hidden" ? "hidden" : (viewByCore === "timer" ? "timer" : undefined);
    },
    function () {
      return resolveTimerModuleViewByMode(timerModuleViewMap, manager.mode);
    }
  );
}

function resolveTimerModuleViewByMode(timerModuleViewMap, mode) {
  var value = timerModuleViewMap && typeof timerModuleViewMap === "object"
    ? timerModuleViewMap[mode]
    : null;
  return value === "hidden" ? "hidden" : "timer";
}

function resolveSetupTimerUiElementById(manager, elementId) {
  return resolveManagerElementById(manager, elementId);
}

function hideLegacyStepStatsLabels(manager) {
  var legacyTotalEl = resolveSetupTimerUiElementById(manager, "stats-total");
  if (legacyTotalEl) legacyTotalEl.style.visibility = "hidden";
  var legacyMovesEl = resolveSetupTimerUiElementById(manager, "stats-moves");
  if (legacyMovesEl) legacyMovesEl.style.visibility = "hidden";
  var legacyUndoEl = resolveSetupTimerUiElementById(manager, "stats-undo");
  if (legacyUndoEl) legacyUndoEl.style.visibility = "hidden";
}

function clearTimerSlotTexts(manager) {
  var timerSlots = GameManager.TIMER_SLOT_IDS;
  timerSlots.forEach(function (slotId) {
    var el = resolveSetupTimerUiElementById(manager, "timer" + slotId);
    if (el) el.textContent = "";
  });
}

function resetTimerSubRowTexts(manager) {
  var sub8k = resolveSetupTimerUiElementById(manager, "timer8192-sub");
  if (sub8k) sub8k.textContent = "";
  var sub16k = resolveSetupTimerUiElementById(manager, "timer16384-sub");
  if (sub16k) sub16k.textContent = "";
  var subContainer = resolveSetupTimerUiElementById(manager, "timer32k-sub-container");
  if (subContainer) subContainer.style.display = "none";
}

function resetTimerBaseUiForSetup(manager) {
  if (!manager) return;
  if (manager.ipsInterval) clearInterval(manager.ipsInterval);
  hideLegacyStepStatsLabels(manager);
  var timerEl0 = resolveSetupTimerUiElementById(manager, "timer");
  if (timerEl0) timerEl0.textContent = manager.pretty(0);
  clearTimerSlotTexts(manager);
  resetTimerSubRowTexts(manager);
}

function repositionCappedTimerContainerForSetup(manager, cappedTimerContainer) {
  if (!manager || !cappedTimerContainer) return;
  var cappedStateForReposition = manager.resolveCappedModeState();
  var anchorTarget = cappedStateForReposition.cappedTargetValue || 2048;
  var anchorRow = manager.getTimerRowEl(anchorTarget);
  if (anchorRow && anchorRow.parentNode) {
    var parent = anchorRow.parentNode;
    if (!(cappedTimerContainer.parentNode === parent && anchorRow.nextSibling === cappedTimerContainer)) {
      parent.insertBefore(cappedTimerContainer, anchorRow.nextSibling);
    }
  }
}

function showAllTimerRowsForSetup(manager) {
  if (!manager) return;
  for (var allIndex = 0; allIndex < GameManager.TIMER_SLOT_IDS.length; allIndex++) {
    manager.setTimerRowVisibleState(GameManager.TIMER_SLOT_IDS[allIndex], true, false);
  }
}

function applyProgressiveCappedRowVisibilityForSetup(manager) {
  if (!manager) return;
  for (var progressiveIndex = 0; progressiveIndex < GameManager.TIMER_SLOT_IDS.length; progressiveIndex++) {
    manager.setTimerRowVisibleState(GameManager.TIMER_SLOT_IDS[progressiveIndex], false, true);
  }
  manager.resetProgressiveCapped64Rows();
}

function applyCappedTargetRowVisibilityForSetup(manager, cappedTargetValue) {
  if (!manager) return;
  for (var cappedIndex = 0; cappedIndex < GameManager.TIMER_SLOT_IDS.length; cappedIndex++) {
    var value = GameManager.TIMER_SLOT_IDS[cappedIndex];
    manager.setTimerRowVisibleState(value, value <= cappedTargetValue, true);
  }
}

function applyCappedRowVisibilityFallbackForSetup(manager, cappedState) {
  if (!manager) return;
  if (!cappedState.isCappedMode) {
    showAllTimerRowsForSetup(manager);
  } else if (cappedState.isProgressiveCapped64Mode) {
    applyProgressiveCappedRowVisibilityForSetup(manager);
  } else {
    applyCappedTargetRowVisibilityForSetup(manager, cappedState.cappedTargetValue);
  }
}

function applyCappedRowVisibilityForSetup(manager, cappedState) {
  if (!manager) return;
  var appliedByCore = resolveCoreModeNormalizedCallOrFallback(
    manager,
    "resolveCappedRowVisibilityPlan",
    {
      isCappedMode: cappedState.isCappedMode,
      isProgressiveCapped64Mode: cappedState.isProgressiveCapped64Mode,
      cappedTargetValue: cappedState.cappedTargetValue,
      timerSlotIds: GameManager.TIMER_SLOT_IDS
    },
    function (coreValue) {
      var plan = coreValue;
      if (!Array.isArray(plan) || plan.length <= 0) return false;
      for (var p = 0; p < plan.length; p++) {
        var item = plan[p];
        if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
        this.setTimerRowVisibleState(item.value, !!item.visible, !!item.keepSpace);
      }
      if (cappedState.isCappedMode && cappedState.isProgressiveCapped64Mode) {
        this.resetProgressiveCapped64Rows();
      }
      return true;
    },
    function () {
      return false;
    }
  );
  if (!appliedByCore) {
    applyCappedRowVisibilityFallbackForSetup(manager, cappedState);
  }
}

function resetCappedPlaceholderTimerRows(manager, cappedStateForReset) {
  if (!manager || !cappedStateForReset || !cappedStateForReset.isCappedMode) return;
  var placeholderValues = manager.getCappedPlaceholderRowValues(cappedStateForReset);
  for (var placeholderValueIndex = 0; placeholderValueIndex < placeholderValues.length; placeholderValueIndex++) {
    var slotId = String(placeholderValues[placeholderValueIndex]);
    var row = manager.getTimerRowEl(slotId);
    var timerEl = resolveSetupTimerUiElementById(manager, "timer" + slotId);
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

function resetCappedTimerContainersForSetup(manager, cappedTimerContainer, cappedStateForReset) {
  if (!manager) return;
  manager.cappedMilestoneCount = 0;
  if (cappedTimerContainer) cappedTimerContainer.innerHTML = "";
  var overflowContainer = resolveSetupTimerUiElementById(manager, "capped-timer-overflow-container");
  if (overflowContainer) overflowContainer.innerHTML = "";
  resetCappedPlaceholderTimerRows(manager, cappedStateForReset);
  manager.getCappedOverflowContainer(cappedStateForReset);
  manager.callWindowMethod("cappedTimerReset");
}

function resetTimerUiForSetup(manager) {
  if (!manager) return;
  resetTimerBaseUiForSetup(manager);
  var cappedTimerContainer = resolveSetupTimerUiElementById(manager, "capped-timer-container");
  repositionCappedTimerContainerForSetup(manager, cappedTimerContainer);
  var cappedState = manager.resolveCappedModeState();
  applyCappedRowVisibilityForSetup(manager, cappedState);
  var cappedStateForReset = manager.resolveCappedModeState();
  resetCappedTimerContainersForSetup(manager, cappedTimerContainer, cappedStateForReset);
}

function resolvePanelTimerDocumentLike(manager) {
  return resolveManagerDocumentLike(manager);
}

function resolvePanelTimerElementById(manager, elementId) {
  return resolveManagerElementById(manager, elementId);
}

function isPanelTimerRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizePanelTimerRecordObject(value, fallback) {
  return isPanelTimerRecordObject(value) ? value : fallback;
}

function openStatsPanel(manager) {
  if (!manager) return;
  var overlay = resolvePanelTimerElementById(manager, "stats-panel-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  manager.updateStatsPanel();
  writeStatsPanelVisibilityFlag(manager, true);
}

function closeStatsPanel(manager) {
  if (!manager) return;
  var overlay = resolvePanelTimerElementById(manager, "stats-panel-overlay");
  if (!overlay) return;
  overlay.style.display = "none";
  writeStatsPanelVisibilityFlag(manager, false);
}

function getTimerModuleViewMode(manager) {
  if (!manager) return "timer";
  return resolveCoreStoragePayloadNormalizedCallOrFallback(
    manager,
    "normalizeTimerModuleViewMode",
    manager.timerModuleView,
    function (viewByCore) {
      return viewByCore === "hidden" ? "hidden" : (viewByCore === "timer" ? "timer" : undefined);
    },
    function () {
      return manager.timerModuleView === "hidden" ? "hidden" : "timer";
    }
  );
}

function normalizeTimerModuleViewValue(view) {
  return view === "hidden" ? "hidden" : "timer";
}

function updateTimerModuleBaseHeightFromElement(manager, timerBox) {
  if (!manager || !timerBox) return;
  var height = Math.max(timerBox.offsetHeight || 0, timerBox.scrollHeight || 0);
  if (height <= 0) return;
  manager.timerModuleBaseHeight = Math.max(manager.timerModuleBaseHeight || 0, height);
}

function applyTimerModuleViewToElement(manager, timerBox, nextView) {
  if (!manager || !timerBox) return;
  manager.timerModuleView = nextView;
  if (nextView === "hidden") timerBox.classList.add("timerbox-hidden-mode");
  else timerBox.classList.remove("timerbox-hidden-mode");
  if (manager.timerModuleBaseHeight > 0) {
    timerBox.style.minHeight = manager.timerModuleBaseHeight + "px";
  }
}

function writeStorageJsonMapWithFallback(manager, key, map) {
  if (!manager) return false;
  return resolveCoreStorageBooleanCallOrFallback(
    manager,
    "writeStorageJsonMapFromContext",
    {
      key: key,
      map: map
    },
    function () {
      var storage = manager.getWebStorageByName("localStorage");
      if (!canWriteToStorage(storage)) return false;
      try {
        storage.setItem(
          key,
          JSON.stringify(manager.isNonArrayObject(map) ? map : {})
        );
        return true;
      } catch (_errWrite) {
        return false;
      }
    }
  );
}

function resolveNextTimerModuleViewMap(manager, map, nextView) {
  if (!manager) return map;
  var baseMap = manager.isNonArrayObject(map) ? map : {};
  var nextMap = resolveCoreStoragePayloadNormalizedCallOrFallback(
    manager,
    "writeTimerModuleViewForModeToMap",
    {
      map: baseMap,
      mode: manager.mode,
      view: nextView
    },
    function (coreValue) {
      return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      return baseMap;
    }
  );
  nextMap = manager.isNonArrayObject(nextMap) ? nextMap : baseMap;
  nextMap[manager.mode] = normalizeTimerModuleViewValue(nextView);
  return nextMap;
}

function persistTimerModuleViewForCurrentMode(manager, nextView) {
  if (!manager) return;
  var map = manager.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  map = resolveNextTimerModuleViewMap(manager, map, nextView);
  writeStorageJsonMapWithFallback(manager, GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY, map);
}

function applyTimerModuleView(manager, view, skipPersist) {
  if (!manager) return;
  var timerBox = resolvePanelTimerElementById(manager, "timerbox");
  if (!timerBox) return;
  updateTimerModuleBaseHeightFromElement(manager, timerBox);
  var next = normalizeTimerModuleViewValue(view);
  applyTimerModuleViewToElement(manager, timerBox, next);
  if (!skipPersist) {
    persistTimerModuleViewForCurrentMode(manager, next);
  }
  manager.callWindowMethod("syncTimerModuleSettingsUI");
}

function setTimerModuleViewMode(manager, view, skipPersist) {
  if (!manager) return;
  manager.applyTimerModuleView(view, !!skipPersist);
}

function resolveActuateStepStats(manager) {
  if (!manager) {
    return {
      totalSteps: 0,
      moveSteps: 0,
      undoSteps: 0
    };
  }
  return manager.computeStepStats();
}

function syncLegacyStepStatsLabels(manager, stepStats) {
  var stats = normalizePanelTimerRecordObject(stepStats, {});
  updateStatsLabelText(manager, "stats-total", "总步数: ", stats.totalSteps);
  updateStatsLabelText(manager, "stats-moves", "移动步数: ", stats.moveSteps);
  updateStatsLabelText(manager, "stats-undo", "撤回步数: ", stats.undoSteps);
}

function syncActuateStatsPanel(manager, stepStats) {
  if (!manager) return;
  var stats = normalizePanelTimerRecordObject(stepStats, {});
  manager.updateStatsPanel(stats.totalSteps, stats.moveSteps, stats.undoSteps);
}

function updateActuateStats(manager) {
  if (!manager) return;
  var stepStats = resolveActuateStepStats(manager);
  syncLegacyStepStatsLabels(manager, stepStats);
  syncActuateStatsPanel(manager, stepStats);
}

function syncActuateTimerView(manager) {
  if (!manager || !manager.timerContainer) return;
  var elapsedMs = resolveActuateElapsedMs(manager);
  manager.timerContainer.textContent = manager.pretty(elapsedMs);
  refreshIpsDisplay(manager, elapsedMs);
}

function resolveActuateElapsedMs(manager) {
  if (!manager) return 0;
  if (manager.timerStatus === 1 && manager.startTime && typeof manager.startTime.getTime === "function") {
    return Date.now() - manager.startTime.getTime();
  }
  return manager.accumulatedTime;
}

function resolveTimerUpdateIntervalMs(manager) {
  if (!manager) return 10;
  return resolveCoreTimerIntervalNumericCallOrFallback(
    manager,
    "resolveTimerUpdateIntervalMs",
    [
      manager.width,
      manager.height
    ],
    function () {
      return resolveTimerUpdateIntervalFallback(manager);
    }
  );
}

function resolveTimerUpdateIntervalFallback(manager) {
  if (!manager) return 10;
  var area = (manager.width || 4) * (manager.height || 4);
  if (area >= 100) return 50;
  if (area >= 64) return 33;
  return 10;
}

function restartTimerInterval(manager) {
  if (!manager) return;
  manager.lastStatsPanelUpdateAt = 0;
  manager.timerID = setInterval(function () {
    handleTimerTick(manager);
  }, manager.timerUpdateIntervalMs);
}

function applyTimerStartState(manager) {
  if (!manager) return;
  manager.timerStatus = 1;
  manager.hasGameStarted = true;
  // Convert accumulated time back to a start timestamp relative to now
  manager.startTime = new Date(Date.now() - (manager.accumulatedTime || 0));
  manager.notifyUndoSettingsStateChanged();
}

function configureAndRestartTimerInterval(manager) {
  if (!manager) return;
  manager.timerUpdateIntervalMs = resolveTimerUpdateIntervalMs(manager);
  restartTimerInterval(manager);
}

function startTimer(manager) {
  if (!manager || manager.timerStatus !== 0) return;
  applyTimerStartState(manager);
  configureAndRestartTimerInterval(manager);
}

function resolveAccumulatedTimeOnStop(manager) {
  if (!manager) return 0;
  if (!manager.startTime || typeof manager.startTime.getTime !== "function") {
    return manager.accumulatedTime || 0;
  }
  return Date.now() - manager.startTime.getTime();
}

function clearTimerIntervalState(manager) {
  if (!manager) return;
  clearInterval(manager.timerID);
  manager.timerID = null;
  manager.timerStatus = 0;
}

function canStopTimer(manager) {
  return !!(manager && manager.timerStatus === 1);
}

function applyTimerStopState(manager) {
  if (!manager) return;
  manager.accumulatedTime = resolveAccumulatedTimeOnStop(manager);
  clearTimerIntervalState(manager);
}

function stopTimer(manager) {
  if (!canStopTimer(manager)) return;
  applyTimerStopState(manager);
}

function formatPrettyTime(manager, time) {
  if (!manager) return "0.000";
  return resolveCorePrettyTimeStringCallOrFallback(
    manager,
    "formatPrettyTime",
    [time],
    function () {
      if (time < 0) {return "DNF";}
      var bits = time % 1000;
      time = (time - bits) / 1000;
      var secs = time % 60;
      var mins = ((time - secs) / 60) % 60;
      var hours = (time - secs - 60 * mins) / 3600;
      var s = "" + bits;
      if (bits < 10) {s = "0" + s;}
      if (bits < 100) {s = "0" + s;}
      s = secs + "." + s;
      if (secs < 10 && (mins > 0 || hours > 0)) {s = "0" + s;}
      if (mins > 0 || hours > 0) {s = mins + ":" + s;}
      if (mins < 10 && hours > 0) {s = "0" + s;}
      if (hours > 0) {s = hours + ":" + s;}
      return s;
    }
  );
}

function resolveCurrentTimerTickTime(manager) {
  if (!manager) return null;
  if (!(manager.startTime && typeof manager.startTime.getTime === "function")) return null;
  return Date.now() - manager.startTime.getTime();
}

function syncTimerTickPrimaryDisplay(manager, time) {
  if (!manager) return;
  manager.time = time;
  var timerEl = resolvePanelTimerElementById(manager, "timer");
  if (timerEl) timerEl.textContent = manager.pretty(time);
  refreshIpsDisplay(manager, time);
}

function shouldRefreshStatsPanelDuringTimerTick(manager, time) {
  if (!manager) return false;
  var overlay = resolvePanelTimerElementById(manager, "stats-panel-overlay");
  if (!(overlay && overlay.style.display !== "none")) return false;
  return !manager.lastStatsPanelUpdateAt || (time - manager.lastStatsPanelUpdateAt) >= 100;
}

function syncTimerTickStatsPanel(manager, time) {
  if (!manager) return;
  if (!shouldRefreshStatsPanelDuringTimerTick(manager, time)) return;
  manager.updateStatsPanel();
  manager.lastStatsPanelUpdateAt = time;
}

function handleTimerTick(manager) {
  if (!manager) return;
  var time = resolveCurrentTimerTickTime(manager);
  if (time === null) return;
  syncTimerTickPrimaryDisplay(manager, time);
  syncTimerTickStatsPanel(manager, time);
}

function normalizeDurationMsValue(rawMs) {
  var ms = Number(rawMs);
  if (!Number.isFinite(ms)) return null;
  ms = Math.floor(ms);
  return ms < 0 ? 0 : ms;
}

function buildDurationCoreInput(manager, nowMs) {
  if (!manager) return null;
  return {
    timerStatus: manager.timerStatus,
    startTimeMs:
      manager.startTime && typeof manager.startTime.getTime === "function"
        ? manager.startTime.getTime()
        : null,
    accumulatedTime: manager.accumulatedTime,
    sessionStartedAt: manager.sessionStartedAt,
    nowMs: nowMs
  };
}

function resolveDurationMsFallback(manager, nowMs) {
  if (!manager) return 0;
  var ms;
  if (manager.timerStatus === 1 && manager.startTime) {
    ms = nowMs - manager.startTime.getTime();
  } else {
    ms = manager.accumulatedTime || 0;
  }
  if (!Number.isFinite(ms) || ms < 0) {
    ms = nowMs - (manager.sessionStartedAt || nowMs);
  }
  return normalizeDurationMsValue(ms);
}

function getDurationMs(manager) {
  if (!manager) return 0;
  var nowMs = Date.now();
  var durationCoreInput = buildDurationCoreInput(manager, nowMs);
  return resolveCoreReplayTimerNormalizedCallOrFallback(
    manager,
    "resolveDurationMs",
    durationCoreInput,
    normalizeDurationMsValue,
    function () {
      return resolveDurationMsFallback(manager, nowMs);
    }
  );
}

function cloneResolvedCappedModeState(state) {
  var source = normalizePanelTimerRecordObject(state, {});
  return {
    isCappedMode: !!source.isCappedMode,
    cappedTargetValue:
      Number.isFinite(source.cappedTargetValue) && Number(source.cappedTargetValue) > 0
        ? Number(source.cappedTargetValue)
        : null,
    isProgressiveCapped64Mode: !!source.isProgressiveCapped64Mode
  };
}

function isCappedModeStateCacheValid(manager, cache) {
  if (!manager) return false;
  return !!(
    cache &&
    cache.modeKey === manager.modeKey &&
    cache.mode === manager.mode &&
    cache.maxTile === manager.maxTile &&
    cache.state &&
    isPanelTimerRecordObject(cache.state)
  );
}

function buildResolveCappedModeStateRuntimeInput(manager) {
  if (!manager) return {};
  return {
    modeKey: manager.modeKey,
    mode: manager.mode,
    maxTile: manager.maxTile
  };
}

function buildResolveCappedModeStateFallback(manager) {
  if (!manager) return null;
  var key = String(manager.modeKey || manager.mode || "");
  var maxTile = Number(manager.maxTile);
  var isCappedModeFallback = key.indexOf("capped") !== -1 && Number.isFinite(maxTile) && maxTile > 0;
  return {
    isCappedMode: isCappedModeFallback,
    cappedTargetValue: isCappedModeFallback ? Number(maxTile) : null,
    // Disable progressive hidden timer rows for 64-capped mode.
    isProgressiveCapped64Mode: false
  };
}

function writeResolvedCappedModeStateCache(manager, resolvedState) {
  if (!manager) return;
  manager.__resolvedCappedModeStateCache = {
    modeKey: manager.modeKey,
    mode: manager.mode,
    maxTile: manager.maxTile,
    state: manager.cloneResolvedCappedModeState(resolvedState)
  };
}

function resolveCappedModeState(manager) {
  if (!manager) return null;
  var cache = manager.__resolvedCappedModeStateCache;
  if (isCappedModeStateCacheValid(manager, cache)) {
    return manager.cloneResolvedCappedModeState(cache.state);
  }

  var resolvedState = resolveCoreModeNormalizedCallOrFallback(
    manager,
    "resolveCappedModeState",
    buildResolveCappedModeStateRuntimeInput(manager),
    function (coreValue) {
      return manager.cloneResolvedCappedModeState(coreValue || {});
    },
    function () {
      return buildResolveCappedModeStateFallback(manager);
    }
  );
  writeResolvedCappedModeStateCache(manager, resolvedState);
  return manager.cloneResolvedCappedModeState(resolvedState);
}

function setTimerRowVisibleState(manager, value, visible, keepSpace) {
  if (!manager) return;
  var row = manager.getTimerRowEl(value);
  if (!row) return;
  row.style.display = "block";
  if (visible) {
    row.style.visibility = "visible";
    row.style.pointerEvents = "";
  } else if (keepSpace) {
    row.style.visibility = "hidden";
    row.style.pointerEvents = "none";
  } else {
    row.style.display = "none";
    row.style.visibility = "";
    row.style.pointerEvents = "";
  }
}

function resolveProgressiveCapped64UnlockedStateFallback(unlockedState) {
  var base = { "16": false, "32": false, "64": false };
  if (!isPanelTimerRecordObject(unlockedState)) return base;
  if (unlockedState["16"] === true) base["16"] = true;
  if (unlockedState["32"] === true) base["32"] = true;
  if (unlockedState["64"] === true) base["64"] = true;
  return base;
}

function resolveProgressiveCapped64UnlockedState(manager, unlockedState) {
  if (!manager) return null;
  return resolveCoreModeNormalizedCallOrFallback(
    manager,
    "createProgressiveCapped64UnlockedState",
    unlockedState,
    function (coreValue) {
      return isPanelTimerRecordObject(coreValue) ? coreValue : null;
    },
    function () {
      return resolveProgressiveCapped64UnlockedStateFallback(unlockedState);
    }
  );
}

function resetProgressiveCapped64Rows(manager) {
  if (!manager) return;
  manager.capped64Unlocked = manager.resolveProgressiveCapped64UnlockedState(manager.capped64Unlocked);
  var values = [16, 32, 64];
  for (var i = 0; i < values.length; i++) {
    manager.setCapped64RowVisible(values[i], false);
  }
}

function normalizePositiveNumericValue(value) {
  var normalized = Number(value);
  if (Number.isFinite(normalized) && normalized > 0) return normalized;
  return null;
}

function resolveCappedTargetValueOrNull(manager, cappedTargetValue) {
  if (!manager) return null;
  var targetValue = normalizePositiveNumericValue(cappedTargetValue);
  if (targetValue !== null) return targetValue;
  var cappedState = manager.resolveCappedModeState();
  return normalizePositiveNumericValue(cappedState.cappedTargetValue);
}

function resolveCappedTimerLegendClassFallback(manager, targetValue) {
  if (!manager) return "timertile";
  var slotId = manager.timerMilestoneSlotByValue
    ? manager.timerMilestoneSlotByValue[String(targetValue)]
    : null;
  return slotId ? ("timertile timer-legend-" + slotId) : "timertile";
}

function getCappedTimerLegendClass(manager, cappedTargetValue) {
  if (!manager) return "timertile";
  var targetValue = manager.resolveCappedTargetValueOrNull(cappedTargetValue);
  return resolveCoreModeStringCallOrFallback(
    manager,
    "resolveCappedTimerLegendClass",
    {
      timerMilestoneSlotByValue: manager.timerMilestoneSlotByValue,
      cappedTargetValue: targetValue
    },
    function () {
      return resolveCappedTimerLegendClassFallback(manager, targetValue);
    }
  );
}

function resolveCappedTimerFontSizeFallback(targetValue) {
  var cap = targetValue;
  if (cap >= 8192) return "13px";
  if (cap >= 1024) return "14px";
  if (cap >= 128) return "18px";
  return "22px";
}

function getCappedTimerFontSize(manager, cappedTargetValue) {
  if (!manager) return resolveCappedTimerFontSizeFallback(2048);
  var targetValue = Number(cappedTargetValue);
  targetValue = manager.resolveCappedTargetValueOrNull(targetValue);
  if (targetValue === null) {
    targetValue = 2048;
  }
  return resolveCoreModeStringCallOrFallback(
    manager,
    "resolveCappedTimerLegendFontSize",
    targetValue,
    function () {
      return resolveCappedTimerFontSizeFallback(targetValue);
    }
  );
}

function normalizeCappedPlaceholderRowValuesCore(coreValues) {
  if (!Array.isArray(coreValues)) return null;
  var normalized = [];
  for (var i = 0; i < coreValues.length; i++) {
    var coreValue = Number(coreValues[i]);
    if (!Number.isInteger(coreValue) || coreValue <= 0) continue;
    normalized.push(coreValue);
  }
  return normalized;
}

function getCappedPlaceholderRowValuesFallback(resolvedCappedState) {
  if (!resolvedCappedState || !resolvedCappedState.isCappedMode) return [];
  var cap = resolvedCappedState.cappedTargetValue;
  var values = [];
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var value = GameManager.TIMER_SLOT_IDS[i];
    if (value > cap) values.push(value);
  }
  return values;
}

function getCappedPlaceholderRowValues(manager, cappedState) {
  if (!manager) return [];
  var resolvedCappedState =
    manager.resolveProvidedCappedModeState(cappedState);
  var normalizedByCore = resolveCoreModeNormalizedCallOrFallback(
    manager,
    "resolveCappedPlaceholderRowValues",
    {
      isCappedMode: resolvedCappedState.isCappedMode,
      cappedTargetValue: resolvedCappedState.cappedTargetValue,
      timerSlotIds: GameManager.TIMER_SLOT_IDS
    },
    function (coreValues) {
      return normalizeCappedPlaceholderRowValuesCore(coreValues) || undefined;
    },
    function () {
      return undefined;
    }
  );
  if (normalizedByCore) return normalizedByCore;
  return getCappedPlaceholderRowValuesFallback(resolvedCappedState);
}

function ensureCappedOverflowContainerElement(manager) {
  var documentLike = resolvePanelTimerDocumentLike(manager);
  if (!documentLike) return null;
  var container = resolvePanelTimerElementById(manager, "capped-timer-overflow-container");
  if (container) return container;
  if (typeof documentLike.createElement !== "function") return null;
  container = documentLike.createElement("div");
  container.id = "capped-timer-overflow-container";
  return container;
}

function mountCappedOverflowContainerAtAnchor(manager, container, resolvedCappedState) {
  if (!manager || !container || !resolvedCappedState) return;
  var values = manager.getCappedPlaceholderRowValues(resolvedCappedState);
  var anchor = values.length ? manager.getTimerRowEl(values[values.length - 1]) : null;
  if (!(anchor && anchor.parentNode)) return;
  if (container.parentNode !== anchor.parentNode || anchor.nextSibling !== container) {
    anchor.parentNode.insertBefore(container, anchor.nextSibling);
  }
}

function getCappedOverflowContainer(manager, cappedState) {
  if (!manager) return null;
  var resolvedCappedState =
    manager.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return null;
  var container = ensureCappedOverflowContainerElement(manager);
  if (!container) return null;
  mountCappedOverflowContainerAtAnchor(manager, container, resolvedCappedState);
  return container;
}

function resolveProvidedCappedModeState(manager, cappedState) {
  if (!manager) return { isCappedMode: false, cappedTargetValue: null, isProgressiveCapped64Mode: false };
  if (isPanelTimerRecordObject(cappedState)) return cappedState;
  return manager.resolveCappedModeState();
}

function setCapped64RowVisible(manager, value, visible) {
  if (!manager) return;
  manager.setTimerRowVisibleState(value, visible, true);
}

function isProgressiveCapped64UnlockValue(value) {
  return value === 16 || value === 32 || value === 64;
}

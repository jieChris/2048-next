function isPanelTimerRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizePanelTimerRecordObject(value, fallbackValue) {
  return isPanelTimerRecordObject(value) ? value : fallbackValue;
}

function openStatsPanel(manager) {
  if (!manager) return;
  var overlay = resolveManagerElementById(manager, "stats-panel-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  manager.updateStatsPanel();
  writeStatsPanelVisibilityFlag(manager, true);
}

function closeStatsPanel(manager) {
  if (!manager) return;
  var overlay = resolveManagerElementById(manager, "stats-panel-overlay");
  if (!overlay) return;
  overlay.style.display = "none";
  writeStatsPanelVisibilityFlag(manager, false);
}

function getTimerModuleViewMode(manager) {
  if (!manager) return "timer";
  var coreCallResult = callCoreStorageRuntime(
    manager,
    "normalizeTimerModuleViewMode",
    manager.timerModuleView,
    false
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    coreCallResult,
    function (viewByCore) {
      return viewByCore === "hidden" ? "hidden" : (viewByCore === "timer" ? "timer" : undefined);
    },
    function () {
      return manager.timerModuleView === "hidden" ? "hidden" : "timer";
    }
  );
}

function updateTimerModuleBaseHeight(manager, timerBox) {
  var height = Math.max(timerBox.offsetHeight || 0, timerBox.scrollHeight || 0);
  if (height > 0) {
    manager.timerModuleBaseHeight = Math.max(manager.timerModuleBaseHeight || 0, height);
  }
}

function resolveNormalizedTimerModuleView(view) {
  return view === "hidden" ? "hidden" : "timer";
}

function applyTimerModuleViewLayout(manager, timerBox, next) {
  manager.timerModuleView = next;
  if (next === "hidden") timerBox.classList.add("timerbox-hidden-mode");
  else timerBox.classList.remove("timerbox-hidden-mode");
  if (manager.timerModuleBaseHeight > 0) {
    timerBox.style.minHeight = manager.timerModuleBaseHeight + "px";
  }
}

function createTimerModuleViewNextMapPayload(manager, baseMap, next) {
  return {
    map: baseMap,
    mode: manager.mode,
    view: next
  };
}

function resolveTimerModuleViewNextMapFromCore(manager, coreCallResult, baseMap) {
  var nextMap = manager.resolveNormalizedCoreValueOrFallback(
    coreCallResult,
    function (coreValue) {
      return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      return baseMap;
    }
  );
  return manager.isNonArrayObject(nextMap) ? nextMap : baseMap;
}

function resolveTimerModuleViewNextMap(manager, next) {
  var map = manager.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  var baseMap = manager.isNonArrayObject(map) ? map : {};
  var coreCallResult = callCoreStorageRuntime(
    manager,
    "writeTimerModuleViewForModeToMap",
    createTimerModuleViewNextMapPayload(manager, baseMap, next),
    false
  );
  return resolveTimerModuleViewNextMapFromCore(manager, coreCallResult, baseMap);
}

function createWriteTimerModuleViewMapPayload(nextMap) {
  return {
    key: GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY,
    map: nextMap
  };
}

function writeTimerModuleViewMapFallback(manager, nextMap) {
  var storage = manager.getWebStorageByName("localStorage");
  if (!canWriteToStorage(storage)) return false;
  try {
    storage.setItem(
      GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY,
      JSON.stringify(manager.isNonArrayObject(nextMap) ? nextMap : {})
    );
    return true;
  } catch (_errWrite) {
    return false;
  }
}

function writeTimerModuleViewMap(manager, nextMap) {
  var writeCoreCallResult = callCoreStorageRuntime(
    manager,
    "writeStorageJsonMapFromContext",
    createWriteTimerModuleViewMapPayload(nextMap),
    true
  );
  return manager.resolveCoreBooleanCallOrFallback(writeCoreCallResult, function () {
    return writeTimerModuleViewMapFallback(manager, nextMap);
  });
}

function persistTimerModuleView(manager, next) {
  var nextMap = resolveTimerModuleViewNextMap(manager, next);
  nextMap[manager.mode] = next === "hidden" ? "hidden" : "timer";
  writeTimerModuleViewMap(manager, nextMap);
}

function applyTimerModuleView(manager, view, skipPersist) {
  if (!manager) return;
  var timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox) return;
  updateTimerModuleBaseHeight(manager, timerBox);
  var next = resolveNormalizedTimerModuleView(view);
  applyTimerModuleViewLayout(manager, timerBox, next);
  if (!skipPersist) {
    persistTimerModuleView(manager, next);
  }
  manager.callWindowMethod("syncTimerModuleSettingsUI");
}

function setTimerModuleViewMode(manager, view, skipPersist) {
  if (!manager) return;
  manager.applyTimerModuleView(view, !!skipPersist);
}

function resolveTimerUpdateIntervalMs(manager) {
  if (!manager) return 10;
  return resolveCoreArgsCallWith(manager, "callCoreTimerIntervalRuntime", "resolveTimerUpdateIntervalMs", [manager.width, manager.height], 10, function (currentManager, coreCallResult) {
    return currentManager.resolveCoreNumericCallOrFallback(coreCallResult, function () {
      var area = (currentManager.width || 4) * (currentManager.height || 4);
      if (area >= 100) return 50;
      if (area >= 64) return 33;
      return 10;
    });
  });
}

function shouldUpdateStatsPanelAtTimerTick(manager, overlay, time) {
  if (!(overlay && overlay.style.display !== "none")) return false;
  if (manager.lastStatsPanelUpdateAt && (time - manager.lastStatsPanelUpdateAt) < 100) return false;
  return true;
}

function executeTimerTick(manager) {
  if (!(manager.startTime && typeof manager.startTime.getTime === "function")) return;
  var time = Date.now() - manager.startTime.getTime();
  manager.time = time;
  var timerEl = resolveManagerElementById(manager, "timer");
  if (timerEl) timerEl.textContent = manager.pretty(time);
  refreshIpsDisplay(manager, time);
  var overlay = resolveManagerElementById(manager, "stats-panel-overlay");
  if (!shouldUpdateStatsPanelAtTimerTick(manager, overlay, time)) return;
  manager.updateStatsPanel();
  manager.lastStatsPanelUpdateAt = time;
}

function startTimer(manager) {
  if (!manager || manager.timerStatus !== 0) return;
  manager.timerStatus = 1;
  manager.hasGameStarted = true;
  // Convert accumulated time back to a start timestamp relative to now
  manager.startTime = new Date(Date.now() - (manager.accumulatedTime || 0));
  manager.notifyUndoSettingsStateChanged();
  manager.timerUpdateIntervalMs = resolveTimerUpdateIntervalMs(manager);
  manager.lastStatsPanelUpdateAt = 0;
  manager.timerID = setInterval(function () {
    executeTimerTick(manager);
  }, manager.timerUpdateIntervalMs);
}

function stopTimer(manager) {
  if (!(manager && manager.timerStatus === 1)) return;
  if (!manager.startTime || typeof manager.startTime.getTime !== "function") {
    manager.accumulatedTime = manager.accumulatedTime || 0;
  } else {
    manager.accumulatedTime = Date.now() - manager.startTime.getTime();
  }
  clearInterval(manager.timerID);
  manager.timerID = null;
  manager.timerStatus = 0;
}

function resolvePrettyTimeFallbackString(rawTime) {
  var time = rawTime;
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

function formatPrettyTime(manager, time) {
  if (!manager) return "0.000";
  return resolveCoreArgsCallWith(
    manager,
    "callCorePrettyTimeRuntime",
    "formatPrettyTime",
    [time],
    "",
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreStringCallOrFallback(coreCallResult, function () {
        return resolvePrettyTimeFallbackString(time);
      });
    }
  );
}

function normalizeDurationMsForReplayTimer(rawMs) {
  var ms = Number(rawMs);
  if (!Number.isFinite(ms)) return null;
  ms = Math.floor(ms);
  return ms < 0 ? 0 : ms;
}

function resolveDurationMsFallbackValue(currentManager, nowMs) {
  var ms;
  if (currentManager.timerStatus === 1 && currentManager.startTime) {
    ms = nowMs - currentManager.startTime.getTime();
  } else {
    ms = currentManager.accumulatedTime || 0;
  }
  if (!Number.isFinite(ms) || ms < 0) {
    ms = nowMs - (currentManager.sessionStartedAt || nowMs);
  }
  return normalizeDurationMsForReplayTimer(ms);
}

function buildDurationMsResolvePayload(manager, nowMs) {
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

function resolveDurationMsFromCoreResult(currentManager, coreCallResult, nowMs) {
  return currentManager.resolveNormalizedCoreValueOrFallback(
    coreCallResult,
    function (rawMs) {
      return normalizeDurationMsForReplayTimer(rawMs);
    },
    function () {
      return resolveDurationMsFallbackValue(currentManager, nowMs);
    }
  );
}

function getDurationMs(manager) {
  if (!manager) return 0;
  var nowMs = Date.now();
  return resolveCorePayloadCallWith(
    manager,
    "callCoreReplayTimerRuntime",
    "resolveDurationMs",
    buildDurationMsResolvePayload(manager, nowMs),
    undefined,
    function (currentManager, coreCallResult) {
      return resolveDurationMsFromCoreResult(currentManager, coreCallResult, nowMs);
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

function isResolvedCappedModeStateCacheHit(manager, cache) {
  return !!(
    cache &&
    cache.modeKey === manager.modeKey &&
    cache.mode === manager.mode &&
    cache.maxTile === manager.maxTile &&
    cache.state &&
    isPanelTimerRecordObject(cache.state)
  );
}

function buildResolvedCappedModeStateFallback(currentManager) {
  var key = String(currentManager.modeKey || currentManager.mode || "");
  var maxTile = Number(currentManager.maxTile);
  var isCappedModeFallback =
    key.indexOf("capped") !== -1 && Number.isFinite(maxTile) && maxTile > 0;
  return {
    isCappedMode: isCappedModeFallback,
    cappedTargetValue: isCappedModeFallback ? Number(maxTile) : null,
    // Disable progressive hidden timer rows for 64-capped mode.
    isProgressiveCapped64Mode: false
  };
}

function resolveResolvedCappedModeStateFromCore(currentManager, coreCallResult) {
  return currentManager.resolveNormalizedCoreValueOrFallback(
    coreCallResult,
    function (coreValue) {
      return currentManager.cloneResolvedCappedModeState(
        normalizePanelTimerRecordObject(coreValue, {})
      );
    },
    function () {
      return buildResolvedCappedModeStateFallback(currentManager);
    }
  );
}

function writeResolvedCappedModeStateCache(manager, resolvedState) {
  manager.__resolvedCappedModeStateCache = {
    modeKey: manager.modeKey,
    mode: manager.mode,
    maxTile: manager.maxTile,
    state: manager.cloneResolvedCappedModeState(resolvedState)
  };
}

function createCappedModeStateResolvePayload(manager) {
  return {
    modeKey: manager.modeKey,
    mode: manager.mode,
    maxTile: manager.maxTile
  };
}

function resolveCappedModeStateFromCore(manager) {
  return resolveCorePayloadCallWith(
    manager,
    "callCoreModeRuntime",
    "resolveCappedModeState",
    createCappedModeStateResolvePayload(manager),
    undefined,
    function (currentManager, coreCallResult) {
      return resolveResolvedCappedModeStateFromCore(currentManager, coreCallResult);
    }
  );
}

function resolveCappedModeState(manager) {
  if (!manager) return null;
  var cache = manager.__resolvedCappedModeStateCache;
  if (isResolvedCappedModeStateCacheHit(manager, cache)) {
    return manager.cloneResolvedCappedModeState(cache.state);
  }
  var resolvedState = resolveCappedModeStateFromCore(manager);
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
  return resolveCorePayloadCallWith(manager, "callCoreModeRuntime", "createProgressiveCapped64UnlockedState", unlockedState, undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizePanelTimerRecordObject(coreValue, null);
    }, function () {
      return resolveProgressiveCapped64UnlockedStateFallback(unlockedState);
    });
  });
}

function resetProgressiveCapped64Rows(manager) {
  if (!manager) return;
  manager.capped64Unlocked = manager.resolveProgressiveCapped64UnlockedState(manager.capped64Unlocked);
  var values = [16, 32, 64];
  for (var i = 0; i < values.length; i++) {
    manager.setCapped64RowVisible(values[i], false);
  }
}

function resolveCappedTargetValueOrNull(manager, cappedTargetValue) {
  if (!manager) return null;
  var targetValue = Number(cappedTargetValue);
  targetValue = (Number.isFinite(targetValue) && targetValue > 0) ? targetValue : null;
  if (targetValue !== null) return targetValue;
  var cappedState = manager.resolveCappedModeState();
  var normalized = Number(cappedState.cappedTargetValue);
  return (Number.isFinite(normalized) && normalized > 0) ? normalized : null;
}

function getCappedTimerLegendClass(manager, cappedTargetValue) {
  if (!manager) return "timertile";
  var targetValue = manager.resolveCappedTargetValueOrNull(cappedTargetValue);
  return resolveCorePayloadCallWith(manager, "callCoreModeRuntime", "resolveCappedTimerLegendClass", {
    timerMilestoneSlotByValue: manager.timerMilestoneSlotByValue,
    cappedTargetValue: targetValue
  }, "", function (currentManager, coreCallResult) {
    return currentManager.resolveCoreStringCallOrFallback(coreCallResult, function () {
      var slotId = currentManager.timerMilestoneSlotByValue ? currentManager.timerMilestoneSlotByValue[String(targetValue)] : null;
      return slotId ? ("timertile timer-legend-" + slotId) : "timertile";
    });
  });
}

function resolveCappedTimerTargetValue(manager, cappedTargetValue) {
  var targetValue = Number(cappedTargetValue);
  targetValue = manager.resolveCappedTargetValueOrNull(targetValue);
  return targetValue === null ? 2048 : targetValue;
}

function resolveCappedTimerFontSizeFallback(targetValue) {
  var cap = Number(targetValue);
  if (!Number.isFinite(cap) || cap <= 0) cap = 2048;
  if (cap >= 8192) return "13px";
  if (cap >= 1024) return "14px";
  if (cap >= 128) return "18px";
  return "22px";
}

function getCappedTimerFontSize(manager, cappedTargetValue) {
  if (!manager) return "22px";
  var targetValue = resolveCappedTimerTargetValue(manager, cappedTargetValue);
  return resolveCorePayloadCallWith(
    manager,
    "callCoreModeRuntime",
    "resolveCappedTimerLegendFontSize",
    targetValue,
    "",
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreStringCallOrFallback(coreCallResult, function () {
        return resolveCappedTimerFontSizeFallback(targetValue);
      });
    }
  );
}

function normalizeCappedPlaceholderRowValues(values) {
  if (!Array.isArray(values)) return undefined;
  var normalized = [];
  for (var i = 0; i < values.length; i++) {
    var coreValue = Number(values[i]);
    if (!Number.isInteger(coreValue) || coreValue <= 0) continue;
    normalized.push(coreValue);
  }
  return normalized;
}

function createCappedPlaceholderRowValuesPayload(resolvedCappedState) {
  return {
    isCappedMode: resolvedCappedState.isCappedMode,
    cappedTargetValue: resolvedCappedState.cappedTargetValue,
    timerSlotIds: GameManager.TIMER_SLOT_IDS
  };
}

function resolveCappedPlaceholderRowValuesFromCore(currentManager, coreCallResult) {
  return currentManager.resolveNormalizedCoreValueOrFallback(
    coreCallResult,
    function (coreValues) {
      return normalizeCappedPlaceholderRowValues(coreValues);
    },
    function () {
      return undefined;
    }
  );
}

function resolveCappedPlaceholderRowValuesByCore(manager, resolvedCappedState) {
  return resolveCorePayloadCallWith(
    manager,
    "callCoreModeRuntime",
    "resolveCappedPlaceholderRowValues",
    createCappedPlaceholderRowValuesPayload(resolvedCappedState),
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCappedPlaceholderRowValuesFromCore(currentManager, coreCallResult);
    }
  );
}

function resolveCappedPlaceholderRowValuesFallback(resolvedCappedState) {
  if (!resolvedCappedState || !resolvedCappedState.isCappedMode) return [];
  var cap = resolvedCappedState.cappedTargetValue;
  var values = [];
  for (var j = 0; j < GameManager.TIMER_SLOT_IDS.length; j++) {
    var value = GameManager.TIMER_SLOT_IDS[j];
    if (value > cap) values.push(value);
  }
  return values;
}

function getCappedPlaceholderRowValues(manager, cappedState) {
  if (!manager) return [];
  var resolvedCappedState = manager.resolveProvidedCappedModeState(cappedState);
  var normalizedByCore = resolveCappedPlaceholderRowValuesByCore(manager, resolvedCappedState);
  if (normalizedByCore) return normalizedByCore;
  return resolveCappedPlaceholderRowValuesFallback(resolvedCappedState);
}

function resolveOrCreateCappedOverflowContainer(manager, documentLike) {
  var container = resolveManagerElementById(manager, "capped-timer-overflow-container");
  if (container) return container;
  if (!(documentLike && typeof documentLike.createElement === "function")) return null;
  container = documentLike.createElement("div");
  if (!container) return null;
  container.id = "capped-timer-overflow-container";
  return container;
}

function mountCappedOverflowContainerAfterAnchor(container, anchor) {
  if (!(container && anchor && anchor.parentNode)) return;
  if (container.parentNode !== anchor.parentNode || anchor.nextSibling !== container) {
    anchor.parentNode.insertBefore(container, anchor.nextSibling);
  }
}

function getCappedOverflowContainer(manager, cappedState) {
  if (!manager) return null;
  var resolvedCappedState = manager.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return null;
  var documentLike = resolveManagerDocumentLike(manager);
  if (!documentLike) return null;
  var container = resolveOrCreateCappedOverflowContainer(manager, documentLike);
  if (!container) return null;
  var values = manager.getCappedPlaceholderRowValues(resolvedCappedState);
  var anchor = values.length ? manager.getTimerRowEl(values[values.length - 1]) : null;
  mountCappedOverflowContainerAfterAnchor(container, anchor);
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

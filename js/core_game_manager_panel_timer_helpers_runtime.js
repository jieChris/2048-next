function isPanelTimerRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizePanelTimerRecordObject(value, fallbackValue) {
  return isPanelTimerRecordObject(value) ? value : fallbackValue;
}

var MIN_TIMER_UPDATE_INTERVAL_MS = 33;
var HIDDEN_TIMER_UPDATE_INTERVAL_MS = 250;
var RANKED_SESSION_ACTIVE_KEY_PREFIX_FOR_TIMER = "ranked_session_active:v1:";

function isDocumentHiddenLike() {
  if (typeof document === "undefined" || !document) return false;
  return !!document.hidden;
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
  else {
    timerBox.classList.remove("timerbox-hidden-mode");
    timerBox.classList.remove("timerbox-leaderboard-mode");
    var root = timerBox.ownerDocument && timerBox.ownerDocument.documentElement;
    if (root && typeof root.removeAttribute === "function") root.removeAttribute("data-initial-timer-leaderboard");
  }
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

function resolveVisibleTimerUpdateIntervalMs(manager) {
  if (!manager) return MIN_TIMER_UPDATE_INTERVAL_MS;
  return resolveCoreArgsCallWith(
    manager,
    "callCoreTimerIntervalRuntime",
    "resolveTimerUpdateIntervalMs",
    [manager.width, manager.height],
    MIN_TIMER_UPDATE_INTERVAL_MS,
    function (currentManager, coreCallResult) {
    return currentManager.resolveCoreNumericCallOrFallback(coreCallResult, function () {
      var area = (currentManager.width || 4) * (currentManager.height || 4);
      if (area >= 100) return 50;
      if (area >= 64) return 33;
      return MIN_TIMER_UPDATE_INTERVAL_MS;
    });
    }
  );
}

function resolveTimerUpdateIntervalMs(manager) {
  var visibleInterval = Math.floor(Number(resolveVisibleTimerUpdateIntervalMs(manager)) || MIN_TIMER_UPDATE_INTERVAL_MS);
  if (visibleInterval < MIN_TIMER_UPDATE_INTERVAL_MS) visibleInterval = MIN_TIMER_UPDATE_INTERVAL_MS;
  if (isDocumentHiddenLike()) return Math.max(visibleInterval, HIDDEN_TIMER_UPDATE_INTERVAL_MS);
  return visibleInterval;
}

function restartTimerIntervalWithCurrentSettings(manager) {
  if (!manager || manager.timerStatus !== 1) return;
  var nextInterval = resolveTimerUpdateIntervalMs(manager);
  if (!Number.isFinite(nextInterval) || nextInterval <= 0) {
    nextInterval = MIN_TIMER_UPDATE_INTERVAL_MS;
  }
  nextInterval = Math.floor(nextInterval);
  if (manager.timerUpdateIntervalMs === nextInterval && manager.timerID) return;
  manager.timerUpdateIntervalMs = nextInterval;
  clearInterval(manager.timerID);
  manager.timerID = setInterval(function () {
    executeTimerTick(manager);
  }, manager.timerUpdateIntervalMs);
}

function bindTimerVisibilityChangeListener(manager) {
  if (!manager || manager._timerVisibilityBound) return;
  if (typeof document === "undefined" || !document || typeof document.addEventListener !== "function") return;
  manager._timerVisibilityBound = true;
  manager._timerVisibilityHandler = function () {
    if (manager && manager.timerFrozen) return;
    restartTimerIntervalWithCurrentSettings(manager);
  };
  document.addEventListener("visibilitychange", manager._timerVisibilityHandler);
}

function shouldUpdateStatsPanelAtTimerTick(manager, overlay, time) {
  if (!(overlay && overlay.style.display !== "none")) return false;
  if (manager.lastStatsPanelUpdateAt && (time - manager.lastStatsPanelUpdateAt) < 100) return false;
  return true;
}

function resolveCoreGameManagerTimerTickRuntime() {
  if (typeof CoreGameManagerTimerTickRuntime !== "undefined" && CoreGameManagerTimerTickRuntime) return CoreGameManagerTimerTickRuntime;
  if (typeof window !== "undefined" && window && window.CoreGameManagerTimerTickRuntime) return window.CoreGameManagerTimerTickRuntime;
  return null;
}

function executeTimerTickFallback(manager, nowMs) {
  if (!(manager.startTime && typeof manager.startTime.getTime === "function")) return;
  if (typeof checkAndHandleMoveTimeout === "function" && checkAndHandleMoveTimeout(manager, nowMs)) {
    return;
  }
  var time = resolveTimerElapsedMs(manager, nowMs);
  manager.time = time;
  var timerEl = resolveManagerElementById(manager, "timer");
  if (timerEl) timerEl.textContent = manager.pretty(time);
  if (typeof updateMoveTimeoutHud === "function") {
    updateMoveTimeoutHud(manager, nowMs);
  }
  refreshIpsDisplay(manager, time);
  var overlay = resolveManagerElementById(manager, "stats-panel-overlay");
  if (!shouldUpdateStatsPanelAtTimerTick(manager, overlay, time)) return;
  manager.updateStatsPanel();
  manager.lastStatsPanelUpdateAt = time;
}

function executeTimerTick(manager) {
  var nowMs = Date.now();
  var runtime = resolveCoreGameManagerTimerTickRuntime();
  if (runtime && typeof runtime.executeTimerTick === "function") {
    return runtime.executeTimerTick(manager, {
      checkAndHandleMoveTimeout: typeof checkAndHandleMoveTimeout === "function" ? checkAndHandleMoveTimeout : undefined,
      resolveTimerElapsedMs: resolveTimerElapsedMs, resolveManagerElementById: resolveManagerElementById,
      updateMoveTimeoutHud: typeof updateMoveTimeoutHud === "function" ? updateMoveTimeoutHud : undefined,
      refreshIpsDisplay: refreshIpsDisplay, shouldUpdateStatsPanelAtTimerTick: shouldUpdateStatsPanelAtTimerTick
    }, nowMs);
  }
  return executeTimerTickFallback(manager, nowMs);
}

function normalizeTimerAnchorMs(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return null;
  var ms = Math.floor(Number(rawValue));
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

function resolveTimerModeKey(manager) {
  return String(manager && (manager.modeKey || manager.mode) || "").trim();
}

function resolveTimerWindowLike(manager) {
  if (manager && typeof manager.getWindowLike === "function") {
    try {
      var windowLike = manager.getWindowLike();
      if (windowLike) return windowLike;
    } catch (_errManagerWindow) {}
  }
  if (typeof window !== "undefined" && window) return window;
  return null;
}

function readTimerActiveRankedSession(manager) {
  var modeKey = resolveTimerModeKey(manager);
  if (!modeKey) return null;
  var windowLike = resolveTimerWindowLike(manager);
  var storage = windowLike && windowLike.localStorage;
  if (!(storage && typeof storage.getItem === "function")) return null;
  try {
    var raw = storage.getItem(RANKED_SESSION_ACTIVE_KEY_PREFIX_FOR_TIMER + modeKey);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!(parsed && typeof parsed === "object")) return null;
    if (parsed.mode_key && String(parsed.mode_key).trim() !== modeKey) return null;
    return parsed;
  } catch (_errStorage) {
    return null;
  }
}

function resolveTimerServerNowMs(manager, nowMs) {
  var activeSession = readTimerActiveRankedSession(manager);
  var issuedAtMs = normalizeTimerAnchorMs(Number(activeSession && activeSession.issued_at) * 1000);
  var receivedAtMs = normalizeTimerAnchorMs(activeSession && activeSession.client_received_at_ms);
  if (issuedAtMs !== null && receivedAtMs !== null) {
    return Math.max(0, issuedAtMs + Math.max(0, nowMs - receivedAtMs));
  }
  var pendingServerMs = normalizeTimerAnchorMs(manager && manager.pendingTimerAnchorServerMs);
  return pendingServerMs !== null ? pendingServerMs : null;
}

function resolveTimerElapsedOffsetMs(manager) {
  var offsetMs = normalizeTimerAnchorMs(manager && manager.timerElapsedOffsetMs);
  if (offsetMs !== null) return offsetMs;
  offsetMs = normalizeTimerAnchorMs(manager && manager.accumulatedTime);
  return offsetMs !== null ? offsetMs : 0;
}

function hasTimerAnchor(manager) {
  return normalizeTimerAnchorMs(manager && manager.timerAnchorLocalMs) !== null;
}

function ensureTimerAnchors(manager, nowMs) {
  if (!manager) return;
  if (!hasTimerAnchor(manager)) {
    manager.timerElapsedOffsetMs = resolveTimerElapsedOffsetMs(manager);
    manager.timerAnchorLocalMs = nowMs;
    var serverNowMs = resolveTimerServerNowMs(manager, nowMs);
    manager.timerAnchorServerMs = serverNowMs !== null ? serverNowMs : nowMs;
  }
  manager.pendingTimerAnchorServerMs = null;
}

function clearActiveTimerAnchors(manager, elapsedMs) {
  if (!manager) return;
  manager.timerElapsedOffsetMs = normalizeTimerAnchorMs(elapsedMs) || 0;
  manager.timerAnchorLocalMs = null;
  manager.timerAnchorServerMs = null;
}

function resolveCoreGameManagerTimerElapsedRuntime() {
  if (typeof CoreGameManagerTimerElapsedRuntime !== "undefined" && CoreGameManagerTimerElapsedRuntime) return CoreGameManagerTimerElapsedRuntime;
  if (typeof window !== "undefined" && window && window.CoreGameManagerTimerElapsedRuntime) return window.CoreGameManagerTimerElapsedRuntime;
  return null;
}

function resolveTimerElapsedFromServerAnchor(manager, nowMs) {
  var anchorServerMs = normalizeTimerAnchorMs(manager.timerAnchorServerMs);
  if (anchorServerMs === null) return null;
  var serverNowMs = resolveTimerServerNowMs(manager, nowMs);
  if (serverNowMs === null) return null;
  var offsetMs = resolveTimerElapsedOffsetMs(manager);
  return Math.max(0, Math.floor(offsetMs + Math.max(0, serverNowMs - anchorServerMs)));
}

function resolveTimerElapsedFromLocalAnchor(manager, nowMs) {
  var anchorLocalMs = normalizeTimerAnchorMs(manager.timerAnchorLocalMs);
  if (anchorLocalMs === null) return null;
  var offsetMs = resolveTimerElapsedOffsetMs(manager);
  return Math.max(0, Math.floor(offsetMs + Math.max(0, nowMs - anchorLocalMs)));
}

function resolveTimerElapsedMsFallback(manager, nowMs) {
  if (!manager) return 0;
  var serverElapsedMs = resolveTimerElapsedFromServerAnchor(manager, nowMs);
  if (serverElapsedMs !== null) return serverElapsedMs;
  var localElapsedMs = resolveTimerElapsedFromLocalAnchor(manager, nowMs);
  if (localElapsedMs !== null) return localElapsedMs;
  if (manager.timerStatus === 1 && manager.startTime && typeof manager.startTime.getTime === "function") {
    return Math.max(0, Math.floor(nowMs - manager.startTime.getTime()));
  }
  return resolveTimerElapsedOffsetMs(manager);
}

function resolveTimerElapsedMs(manager, nowMs) {
  var runtime = resolveCoreGameManagerTimerElapsedRuntime();
  if (runtime && typeof runtime.resolveTimerElapsedMs === "function") {
    return runtime.resolveTimerElapsedMs(manager, nowMs, {
      resolveTimerElapsedOffsetMs: resolveTimerElapsedOffsetMs,
      resolveTimerServerNowMs: resolveTimerServerNowMs
    });
  }
  return resolveTimerElapsedMsFallback(manager, nowMs);
}

function resolveCoreGameManagerTimerStartRuntime() {
  if (typeof CoreGameManagerTimerStartRuntime !== "undefined" && CoreGameManagerTimerStartRuntime) return CoreGameManagerTimerStartRuntime;
  if (typeof window !== "undefined" && window && window.CoreGameManagerTimerStartRuntime) return window.CoreGameManagerTimerStartRuntime;
  return null;
}

function startTimerFallback(manager, nowMs) {
  if (!manager || manager.timerStatus !== 0) return;
  ensureTimerAnchors(manager, nowMs);
  var durationMs = resolveTimerElapsedMs(manager, nowMs);
  manager.timerStatus = 1;
  manager.hasGameStarted = true;
  manager.timerFrozen = false;
  manager.accumulatedTime = durationMs;
  manager.time = durationMs;
  manager.startTime = new Date(nowMs - durationMs);
  manager.notifyUndoSettingsStateChanged();
  manager.lastStatsPanelUpdateAt = 0;
  bindTimerVisibilityChangeListener(manager);
  restartTimerIntervalWithCurrentSettings(manager);
  if (typeof updateMoveTimeoutHud === "function") updateMoveTimeoutHud(manager, nowMs);
}

function startTimer(manager) {
  var nowMs = Date.now(), runtime = resolveCoreGameManagerTimerStartRuntime();
  if (runtime && typeof runtime.startTimer === "function") {
    return runtime.startTimer(manager, {
      bindTimerVisibilityChangeListener: bindTimerVisibilityChangeListener,
      ensureTimerAnchors: ensureTimerAnchors,
      resolveTimerElapsedMs: resolveTimerElapsedMs,
      restartTimerIntervalWithCurrentSettings: restartTimerIntervalWithCurrentSettings,
      updateMoveTimeoutHud: typeof updateMoveTimeoutHud === "function" ? updateMoveTimeoutHud : undefined
    }, nowMs);
  }
  return startTimerFallback(manager, nowMs);
}

function stopTimer(manager) {
  if (!(manager && manager.timerStatus === 1)) return;
  manager.accumulatedTime = resolveTimerElapsedMs(manager, Date.now());
  clearActiveTimerAnchors(manager, manager.accumulatedTime);
  manager.timerFrozen = !!(manager.over || (manager.won && !manager.keepPlaying));
  clearInterval(manager.timerID);
  manager.timerID = null;
  manager.timerStatus = 0;
  if (typeof updateMoveTimeoutHud === "function") {
    updateMoveTimeoutHud(manager, Date.now());
  }
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
  var ms = resolveTimerElapsedMs(currentManager, nowMs);
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
    timerElapsedOffsetMs: manager.timerElapsedOffsetMs,
    timerAnchorLocalMs: manager.timerAnchorLocalMs,
    timerAnchorServerMs: manager.timerAnchorServerMs,
    timerServerNowMs: resolveTimerServerNowMs(manager, nowMs),
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

function resolveCoreGameManagerTimerRowVisibleStateRuntime() {
  if (typeof CoreGameManagerTimerRowVisibleStateRuntime !== "undefined" && CoreGameManagerTimerRowVisibleStateRuntime) return CoreGameManagerTimerRowVisibleStateRuntime;
  if (typeof window !== "undefined" && window && window.CoreGameManagerTimerRowVisibleStateRuntime) return window.CoreGameManagerTimerRowVisibleStateRuntime;
  return null;
}

function applyTimerRowVisibleStyle(row) {
  row.style.display = "block";
  row.style.visibility = "visible";
  row.style.pointerEvents = "";
}

function applyTimerRowHiddenStyle(row, keepSpace) {
  if (keepSpace) {
    row.style.display = "block";
    row.style.visibility = "hidden";
    row.style.pointerEvents = "none";
    return;
  }
  row.style.display = "none";
  row.style.visibility = "";
  row.style.pointerEvents = "";
}

function setTimerRowVisibleStateFallback(manager, value, visible, keepSpace) {
  if (!manager) return;
  var row = manager.getTimerRowEl(value);
  if (!row) return;
  if (row && typeof row.removeAttribute === "function") {
    row.removeAttribute("data-scroll-hidden");
  }
  if (visible) applyTimerRowVisibleStyle(row);
  else applyTimerRowHiddenStyle(row, keepSpace);
}

function setTimerRowVisibleState(manager, value, visible, keepSpace) {
  var runtime = resolveCoreGameManagerTimerRowVisibleStateRuntime();
  if (runtime && typeof runtime.setTimerRowVisibleState === "function") {
    runtime.setTimerRowVisibleState(manager, value, visible, keepSpace);
    return;
  }
  setTimerRowVisibleStateFallback(manager, value, visible, keepSpace);
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

function resolveCappedTimerLegendFontSizeFallback(targetValue) {
  var cap = Number(targetValue);
  if (!Number.isFinite(cap) || cap <= 0) cap = 2048;
  if (cap >= 16384) return "11px";
  if (cap >= 1024) return "14px";
  if (cap >= 128) return "18px";
  return "22px";
}

function getCappedTimerLegendFontSize(manager, cappedTargetValue) {
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
        return resolveCappedTimerLegendFontSizeFallback(targetValue);
      });
    }
  );
}

function getCappedTimerFontSize(manager, cappedTargetValue) {
  return getCappedTimerLegendFontSize(manager, cappedTargetValue);
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

// saved-state storage/sync helpers moved from saved_state runtime to satisfy audit size gate
function readLocalStorageJsonMap(manager, key) {
  if (!manager) return {};
  var coreCallResult = callCoreStorageRuntime(manager, "readStorageJsonMapFromContext", { key: key }, true);
  return manager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (runtimeMap) {
    return manager.isNonArrayObject(runtimeMap) ? runtimeMap : {};
  }, function () {
    var storage = manager.getWebStorageByName("localStorage");
    return readStorageJsonMapFallback(storage, key, function (parsed) {
      return manager.isNonArrayObject(parsed);
    });
  });
}

function writeLocalStorageJsonPayload(manager, key, payload) {
  if (!manager) return false;
  var coreCallResult = callCoreStorageRuntime(manager, "writeStorageJsonPayloadFromContext", { key: key, payload: payload }, true);
  return manager.resolveCoreBooleanCallOrFallback(coreCallResult, function () {
    var storage = manager.getWebStorageByName("localStorage");
    return writeStorageJsonPayloadFallback(storage, key, payload);
  });
}

function readStorageItemSafe(storage, key) {
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    return storage.getItem(key);
  } catch (_err) {
    return null;
  }
}

function parseStorageJsonMap(raw, guardObjectFn) {
  if (!raw) return {};
  try {
    var parsed = JSON.parse(raw);
    if (typeof guardObjectFn === "function" && !guardObjectFn(parsed)) return {};
    return parsed;
  } catch (_err) {
    return {};
  }
}

function readStorageJsonMapFallback(storage, key, guardObjectFn) {
  if (!canReadFromStorage(storage)) return {};
  var raw = readStorageItemSafe(storage, key);
  return parseStorageJsonMap(raw, guardObjectFn);
}

function writeStorageItemSafe(storage, key, value) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

function writeStorageJsonPayloadFallback(storage, key, payload) {
  if (!canWriteToStorage(storage)) return false;
  var serialized = null;
  try {
    serialized = JSON.stringify(payload);
  } catch (_err) {
    serialized = null;
  }
  if (typeof serialized !== "string") return false;
  return writeStorageItemSafe(storage, key, serialized);
}

function resolveSavedStateStorageKeyFallback(manager, keyPrefix, modeKey) {
  if (!manager) return "";
  var key = (typeof modeKey === "string" && modeKey)
    ? modeKey
    : (manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY);
  return (typeof keyPrefix === "string" ? keyPrefix : "") + key;
}

function resolveSavedGameStateStorageKey(manager, keyPrefix, modeKey) {
  if (!manager) return null;
  var coreCallResult = callCoreStorageRuntime(manager, "resolveSavedGameStateStorageKey", manager.createCoreModeContextPayload({
    modeKey: modeKey,
    keyPrefix: typeof keyPrefix === "string" ? keyPrefix : ""
  }), false);
  return manager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (keyByCore) {
    return typeof keyByCore === "string" && keyByCore ? keyByCore : undefined;
  }, function () {
    return resolveSavedStateStorageKeyFallback(manager, keyPrefix, modeKey);
  });
}

function resolveSavedGameStateSyncStorageKey(manager, modeKey) {
  return resolveSavedGameStateStorageKey(manager, GameManager.SAVED_GAME_STATE_SYNC_KEY_PREFIX, modeKey);
}

function normalizeSavedGameStateStoragesFromCore(storagesByCore) {
  return Array.isArray(storagesByCore) ? storagesByCore : undefined;
}

function getSavedGameStateStoragesFallback(manager) {
  var out = [];
  var localStore = manager.getWebStorageByName("localStorage");
  var sessionStore = manager.getWebStorageByName("sessionStorage");
  var mobileSafari = isMobileSafariLikeByManager(manager);
  if (localStore) out.push(localStore);
  if (!mobileSafari && sessionStore && sessionStore !== localStore) out.push(sessionStore);
  return out;
}

function getSavedGameStateStorages(manager) {
  if (!manager) return [];
  var coreCallResult = callCoreStorageRuntime(manager, "getSavedGameStateStoragesFromContext", {}, true);
  return manager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (storagesByCore) {
    return normalizeSavedGameStateStoragesFromCore(storagesByCore);
  }, function () {
    return getSavedGameStateStoragesFallback(manager);
  });
}

function parseSavedPayloadRawObject(manager, raw) {
  if (!manager || !raw) return null;
  try {
    var parsedRaw = JSON.parse(raw);
    return manager.isNonArrayObject(parsedRaw) ? parsedRaw : null;
  } catch (_errParse) {
    return null;
  }
}

function readSavedPayloadFromStorageByKey(manager, store, key) {
  if (!manager || !store) return null;
  var raw = null;
  try {
    raw = store.getItem(key);
  } catch (_errRead) {
    raw = null;
  }
  if (!raw) return null;
  var parsed = parseSavedPayloadRawObject(manager, raw);
  if (parsed) return parsed;
  try {
    store.removeItem(key);
  } catch (_errRemove) {}
  return null;
}

function resolveLatestSavedPayloadBySavedAt(best, nextPayload) {
  if (!nextPayload) return best;
  if (!best) return nextPayload;
  var bestSavedAt = Number(best.saved_at) || 0;
  var nextSavedAt = Number(nextPayload.saved_at) || 0;
  return nextSavedAt >= bestSavedAt ? nextPayload : best;
}

function readSavedPayloadByKeyFallback(manager, stores, key) {
  var targetStores = Array.isArray(stores) ? stores : [];
  var best = null;
  for (var i = 0; i < targetStores.length; i++) {
    var nextPayload = readSavedPayloadFromStorageByKey(manager, targetStores[i], key);
    best = resolveLatestSavedPayloadBySavedAt(best, nextPayload);
  }
  return best;
}

function createReadSavedPayloadByKeyCorePayload(stores, key) {
  return {
    storages: Array.isArray(stores) ? stores : [],
    key: key
  };
}

function normalizeSavedPayloadByKeyFromCore(currentManager, savedByCore) {
  return currentManager.isNonArrayObject(savedByCore)
    ? savedByCore
    : (savedByCore === null ? null : undefined);
}

function readSavedPayloadByKey(manager, key) {
  if (!manager) return null;
  var stores = getSavedGameStateStorages(manager);
  var coreCallResult = callCoreStorageRuntime(manager, "readSavedPayloadByKeyFromStorages", createReadSavedPayloadByKeyCorePayload(stores, key), false);
  return manager.resolveNormalizedCoreValueOrFallbackAllowNull(coreCallResult, function (savedByCore) {
    return normalizeSavedPayloadByKeyFromCore(manager, savedByCore);
  }, function () {
    return readSavedPayloadByKeyFallback(manager, stores, key);
  });
}

function mergeWindowNameSavedPayloadMap(manager, modeKey, payload, map) {
  var nextMap = normalizeSavedStateRecordObject(map, {});
  var key = resolveSavedStateModeKey(manager, modeKey);
  if (!normalizeSavedStateRecordObject(payload, null)) {
    delete nextMap[key];
  } else {
    nextMap[key] = payload;
  }
  return nextMap;
}

function buildWindowNameSavedPayloadString(marker, keptParts, map) {
  var encodedMap = null;
  try {
    encodedMap = encodeURIComponent(JSON.stringify(map));
  } catch (_errEncode) {
    return null;
  }
  if (typeof encodedMap !== "string") return null;
  var nextParts = Array.isArray(keptParts) ? keptParts.slice() : [];
  nextParts.push(marker + encodedMap);
  var nextWindowName = nextParts.join("&");
  return typeof nextWindowName === "string" ? nextWindowName : null;
}

function buildWriteWindowNameSavedPayloadCorePayload(manager, windowLike, modeKey, payload) {
  return Object.assign(
    {},
    manager.createCoreModeContextPayload({
      windowLike: windowLike,
      windowNameKey: GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY,
      modeKey: modeKey
    }),
    { payload: payload }
  );
}

function writeWindowNameSavedPayloadFallback(manager, windowLike, modeKey, payload) {
  if (!windowLike) return false;
  var marker = GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY + "=";
  var raw = readWindowNameRawValue(windowLike);
  var scanned = scanWindowNamePartsByMarker(raw, marker);
  var kept = scanned.keptParts;
  var map = mergeWindowNameSavedPayloadMap(manager, modeKey, payload, scanned.map);
  var nextWindowName = buildWindowNameSavedPayloadString(marker, kept, map);
  if (!nextWindowName) return false;
  try {
    windowLike.name = nextWindowName;
    return true;
  } catch (_errWrite) {
    return false;
  }
}

function writeWindowNameSavedPayload(manager, modeKey, payload) {
  if (!manager) return false;
  var windowLike = manager.getWindowLike();
  var coreCallResult = callCoreStorageRuntime(manager, "writeSavedPayloadToWindowName", buildWriteWindowNameSavedPayloadCorePayload(manager, windowLike, modeKey, payload), false);
  return manager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (writtenByCore) {
    return typeof writtenByCore === "boolean" ? writtenByCore : undefined;
  }, function () {
    return writeWindowNameSavedPayloadFallback(manager, windowLike, modeKey, payload);
  });
}

function resolveSavedStatePathname(windowLike) {
  return (windowLike && windowLike.location && windowLike.location.pathname)
    ? String(windowLike.location.pathname)
    : "";
}

function resolveSaveThrottleUserAgent(manager) {
  if (!(manager && typeof manager.getWindowLike === "function")) return "";
  var windowLike = manager.getWindowLike();
  var navigatorLike = windowLike && windowLike.navigator ? windowLike.navigator : null;
  return navigatorLike && typeof navigatorLike.userAgent === "string"
    ? navigatorLike.userAgent
    : "";
}

function isMobileSafariUserAgent(userAgent) {
  var ua = String(userAgent || "");
  if (!ua) return false;
  if (!/iPhone|iPad|iPod/i.test(ua)) return false;
  if (!/Safari/i.test(ua)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(ua)) return false;
  return true;
}

function isMobileSafariLikeByManager(manager) {
  return isMobileSafariUserAgent(resolveSaveThrottleUserAgent(manager));
}

function resolveSaveGameStateThrottleMs(manager) {
  if (isMobileSafariLikeByManager(manager)) return 900;
  return 350;
}

function resolveSaveGameStateFullPersistIntervalMs(manager) {
  if (isMobileSafariLikeByManager(manager)) return 12000;
  return 5000;
}

function resolveSavedStateSavedAt(saved) {
  var value = Number(saved && saved.saved_at);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

function resolveManagerSavedStateKnownSavedAt(manager) {
  if (!manager) return 0;
  var persistedAt = Number(manager.lastSavedGameStateAt);
  var syncedAt = Number(manager.lastSyncedSavedStateAt);
  var best = Number.isFinite(persistedAt) && persistedAt > 0 ? Math.floor(persistedAt) : 0;
  var synced = Number.isFinite(syncedAt) && syncedAt > 0 ? Math.floor(syncedAt) : 0;
  return synced > best ? synced : best;
}

function rememberSavedStateKnownSavedAt(manager, savedAt) {
  if (!manager) return 0;
  var value = Number(savedAt);
  if (!Number.isFinite(value) || value <= 0) return resolveManagerSavedStateKnownSavedAt(manager);
  var normalized = Math.floor(value);
  if (normalized > (Number(manager.lastSyncedSavedStateAt) || 0)) {
    manager.lastSyncedSavedStateAt = normalized;
  }
  return normalized;
}

function resolvePersistedSavedStateAtForWrite(manager, keyPrefix) {
  if (!manager) return 0;
  var key = resolveSavedGameStateStorageKey(manager, keyPrefix);
  return resolveSavedStateSavedAt(readSavedPayloadByKey(manager, key));
}

function shouldSkipStaleSavedGameStateWrite(manager) {
  if (!manager) return false;
  var gameManagerRuntime = typeof GameManager !== "undefined" && GameManager ? GameManager : null;
  if (!gameManagerRuntime) return false;
  var fullAt = resolvePersistedSavedStateAtForWrite(manager, gameManagerRuntime.SAVED_GAME_STATE_KEY_PREFIX);
  var liteAt = resolvePersistedSavedStateAtForWrite(manager, gameManagerRuntime.SAVED_GAME_STATE_LITE_KEY_PREFIX);
  return Math.max(fullAt, liteAt) > resolveManagerSavedStateKnownSavedAt(manager);
}

function ensureSavedStateSyncClientId(manager) {
  if (!manager) return "";
  if (typeof manager.savedStateSyncClientId === "string" && manager.savedStateSyncClientId) {
    return manager.savedStateSyncClientId;
  }
  if (
    typeof CoreCryptoRandomRuntime !== "undefined" &&
    CoreCryptoRandomRuntime &&
    typeof CoreCryptoRandomRuntime.randomId === "function"
  ) {
    manager.savedStateSyncClientId = CoreCryptoRandomRuntime.randomId("tab", { length: 8 });
    return manager.savedStateSyncClientId;
  }
  manager.savedStateSyncClientId = "tab_" + Date.now().toString(36) + "_00000000";
  return manager.savedStateSyncClientId;
}

function resolveCoreSavedStateSyncPayloadRuntime() {
  if (typeof CoreSavedStateSyncPayloadRuntime !== "undefined" && CoreSavedStateSyncPayloadRuntime) {
    return CoreSavedStateSyncPayloadRuntime;
  }
  if (typeof window !== "undefined" && window && window.CoreSavedStateSyncPayloadRuntime) {
    return window.CoreSavedStateSyncPayloadRuntime;
  }
  return null;
}

function buildSavedStateSyncTrimPayloadFallback(manager) {
  return {
    move_history: [],
    undo_stack: [],
    redo_stack: [],
    replay_compact_log: "",
    session_replay_v3: null,
    replay_string: "",
    ips_input_count:
      manager && Number.isInteger(manager.ipsInputCount) && manager.ipsInputCount >= 0
        ? manager.ipsInputCount
        : 0
  };
}

function buildSavedStateSyncTrimPayload(manager) {
  var runtime = resolveCoreSavedStateSyncPayloadRuntime();
  if (runtime && typeof runtime.buildSavedStateSyncTrimPayload === "function") {
    return runtime.buildSavedStateSyncTrimPayload(manager);
  }
  return buildSavedStateSyncTrimPayloadFallback(manager);
}

function buildSavedStateSyncStatePayload(manager, now) {
  if (!manager) return null;
  var safeNow = Number.isFinite(Number(now)) ? Math.floor(Number(now)) : Date.now();
  return Object.assign(
    {},
    buildSavedGameStateMetaPayload(manager, safeNow),
    buildSavedGameStateCoreStatePayload(manager),
    buildSavedGameStateProgressPayload(manager),
    buildSavedGameStateDirectionLockPayload(manager),
    buildSavedGameStateTimerCorePayload(manager),
    buildSavedStateSyncTrimPayload(manager)
  );
}

function buildSavedStateSyncEventPayload(manager, now) {
  if (!manager) return null;
  var snapshot = buildSavedStateSyncStatePayload(manager, now);
  if (!normalizeSavedStateRecordObject(snapshot, null)) return null;
  return {
    v: GameManager.SAVED_GAME_STATE_VERSION,
    mode_key: manager.modeKey,
    source_client_id: ensureSavedStateSyncClientId(manager),
    saved_at: resolveSavedStateSavedAt(snapshot),
    state: snapshot
  };
}

function parseSavedStateSyncEventPayloadFallback(raw) {
  if (!(typeof raw === "string" && raw)) return null;
  var parsed = null;
  try { parsed = JSON.parse(raw); } catch (_errParse) { return null; }
  if (!normalizeSavedStateRecordObject(parsed, null)) return null;
  var state = normalizeSavedStateRecordObject(parsed.state, null);
  if (!state) return null;
  var savedAt = resolveSavedStateSavedAt(state);
  if (!(savedAt > 0)) savedAt = resolveSavedStateSavedAt(parsed);
  if (!(savedAt > 0)) return null;
  return { sourceClientId: typeof parsed.source_client_id === "string" ? parsed.source_client_id : "", savedAt: savedAt, state: state };
}

function parseSavedStateSyncEventPayload(manager, raw) {
  if (!manager) return null;
  var runtime = resolveCoreSavedStateSyncPayloadRuntime();
  if (runtime && typeof runtime.parseSavedStateSyncEventPayload === "function") {
    return runtime.parseSavedStateSyncEventPayload(raw);
  }
  return parseSavedStateSyncEventPayloadFallback(raw);
}

function resolveSavedStateSyncRestoreDecision(manager, saved) {
  if (!(manager && saved)) return false;
  if (Number(saved.v) !== GameManager.SAVED_GAME_STATE_VERSION) return false;
  if (saved.mode_key !== manager.modeKey) return false;
  if (isSavedStateSizeOrRulesetMismatch(manager, saved)) return false;
  if (isSavedStateBoardInvalidForRestore(manager, saved)) return false;
  return true;
}

function shouldApplySavedStateSync(manager, state, savedAt, sourceClientId) {
  if (!(manager && state)) return false;
  if (!resolveSavedStateSyncRestoreDecision(manager, state)) return false;
  var clientId = ensureSavedStateSyncClientId(manager);
  if (sourceClientId && clientId && sourceClientId === clientId) return false;
  return savedAt > resolveManagerSavedStateKnownSavedAt(manager);
}

function markSkipActuatePersistenceOnce(manager) {
  if (!manager) return;
  manager.skipActuatePersistenceOnce = true;
}

function consumeSkipActuatePersistenceOnce(manager) {
  if (!(manager && manager.skipActuatePersistenceOnce)) return false;
  manager.skipActuatePersistenceOnce = false;
  return true;
}

function applySavedStateSyncSnapshot(manager, state, savedAt) {
  if (!(manager && state)) return false;
  if (!applySavedStateRestore(manager, state)) return false;
  rememberSavedStateKnownSavedAt(manager, savedAt);
  if (typeof manager.updateUndoUiState === "function") {
    manager.updateUndoUiState();
  }
  if (typeof manager.notifyUndoSettingsStateChanged === "function") {
    manager.notifyUndoSettingsStateChanged();
  }
  if (typeof manager.actuate === "function") {
    markSkipActuatePersistenceOnce(manager);
    manager.actuate();
  }
  return true;
}

function resolveSavedStateSyncThrottleMs(manager) {
  if (isMobileSafariLikeByManager(manager)) return 900;
  return 300;
}

function shouldSkipSavedStateSyncPublishByThrottle(manager, now) {
  if (!manager) return true;
  if (!manager.lastSavedStateSyncPublishedAt) return false;
  return (now - manager.lastSavedStateSyncPublishedAt) < resolveSavedStateSyncThrottleMs(manager);
}

function resolveCoreSavedStateSyncPublishRuntime() {
  if (typeof CoreSavedStateSyncPublishRuntime !== "undefined" && CoreSavedStateSyncPublishRuntime) return CoreSavedStateSyncPublishRuntime;
  if (typeof window !== "undefined" && window && window.CoreSavedStateSyncPublishRuntime) return window.CoreSavedStateSyncPublishRuntime;
  return null;
}

function createSavedStateSyncPublishOperations() {
  return {
    buildSavedStateSyncEventPayload: function (manager, now) { return buildSavedStateSyncEventPayload(manager, now); },
    canWriteToStorage: function (storage) { return typeof canWriteToStorage === "function" && canWriteToStorage(storage); },
    rememberSavedStateKnownSavedAt: function (manager, savedAt) { return rememberSavedStateKnownSavedAt(manager, savedAt); },
    resolveSavedGameStateSyncStorageKey: function (manager) { return resolveSavedGameStateSyncStorageKey(manager); },
    shouldSkipSavedStateSyncPublishByThrottle: shouldSkipSavedStateSyncPublishByThrottle,
    shouldUseSavedGameState: function (manager) { return typeof shouldUseSavedGameState === "function" && shouldUseSavedGameState(manager); },
    writeStorageJsonPayload: function (storage, key, payload) { return writeStorageJsonPayloadFallback(storage, key, payload); }
  };
}

function publishSavedStateSyncSnapshotFallback(manager, now) {
  if (!manager) return false;
  if (!shouldUseSavedGameState(manager)) return false;
  if (manager.replayMode) return false;
  if (shouldSkipSavedStateSyncPublishByThrottle(manager, now)) return false;
  var storage = manager.getWebStorageByName("localStorage");
  if (!canWriteToStorage(storage)) return false;
  var key = resolveSavedGameStateSyncStorageKey(manager);
  if (!(typeof key === "string" && key)) return false;
  var eventPayload = buildSavedStateSyncEventPayload(manager, now);
  if (!eventPayload) return false;
  var written = writeStorageJsonPayloadFallback(storage, key, eventPayload);
  if (written) {
    manager.lastSavedStateSyncPublishedAt = now;
    rememberSavedStateKnownSavedAt(manager, eventPayload.saved_at);
  }
  return written;
}

function publishSavedStateSyncSnapshot(manager) {
  if (shouldSkipStaleSavedGameStateWrite(manager)) return false;
  var now = Date.now(), runtime = resolveCoreSavedStateSyncPublishRuntime();
  if (runtime && typeof runtime.publishSavedStateSyncSnapshot === "function") {
    return runtime.publishSavedStateSyncSnapshot(manager, createSavedStateSyncPublishOperations(), now);
  }
  return publishSavedStateSyncSnapshotFallback(manager, now);
}

function handleSavedStateSyncStorageEvent(manager, storageEvent) {
  if (!(manager && storageEvent)) return;
  var syncKey = resolveSavedGameStateSyncStorageKey(manager);
  if (!(typeof syncKey === "string" && syncKey)) return;
  if (storageEvent.key !== syncKey) return;
  if (!(typeof storageEvent.newValue === "string" && storageEvent.newValue)) return;
  var parsed = parseSavedStateSyncEventPayload(manager, storageEvent.newValue);
  if (!parsed) return;
  if (!shouldApplySavedStateSync(manager, parsed.state, parsed.savedAt, parsed.sourceClientId)) return;
  applySavedStateSyncSnapshot(manager, parsed.state, parsed.savedAt);
}

function bindSavedStateSyncStorageListener(manager, windowLike) {
  if (!manager) return;
  if (!(windowLike && typeof windowLike.addEventListener === "function")) return;
  if (manager.savedStateSyncListenerBound) return;
  if (!shouldUseSavedGameState(manager)) return;
  ensureSavedStateSyncClientId(manager);
  windowLike.addEventListener("storage", function (storageEvent) {
    handleSavedStateSyncStorageEvent(manager, storageEvent);
  });
  manager.savedStateSyncListenerBound = true;
}

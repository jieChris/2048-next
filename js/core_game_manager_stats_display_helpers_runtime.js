function normalizeStatsDisplayRecordObject(value, fallbackValue) {
  return isNonArrayObject(value) ? value : fallbackValue;
}

function updateStatsLabelText(manager, elementId, label, value) {
  var el = resolveManagerElementById(manager, elementId);
  if (!el) return;
  el.textContent = label + value;
}

function applyInvalidatedTimerPlaceholders(manager, elementIds) {
  var ids = Array.isArray(elementIds) ? elementIds : [];
  for (var idx = 0; idx < ids.length; idx++) {
    var targetId = ids[idx];
    if (!targetId) continue;
    var targetEl = resolveManagerElementById(manager, String(targetId));
    if (targetEl) targetEl.textContent = "---------";
  }
}

var IPS_WINDOW_MS = 1000;

function normalizeStatsDisplayLanguage(value) {
  var lang = String(value || "").trim().toLowerCase();
  if (lang.indexOf("en") === 0) return "en";
  if (lang.indexOf("zh") === 0) return "zh";
  return "";
}

function resolveCoreStatsPanelCopyRuntimeForDisplay() {
  if (typeof CoreStatsPanelCopyRuntime !== "undefined" && CoreStatsPanelCopyRuntime) return CoreStatsPanelCopyRuntime;
  if (typeof window !== "undefined" && window && window.CoreStatsPanelCopyRuntime) return window.CoreStatsPanelCopyRuntime;
  return null;
}

function resolveStatsDisplayWindowLike(manager) {
  return manager && manager.window ? manager.window : (typeof window !== "undefined" ? window : null);
}

function readStatsDisplayStorageLanguage(windowLike) {
  var storage = windowLike && windowLike.localStorage ? windowLike.localStorage : null;
  return storage && typeof storage.getItem === "function" ? storage.getItem("ui_language_v1") : "";
}

function readStatsDisplayDocumentLanguage(manager) {
  var documentLike = resolveManagerDocumentLike(manager);
  var root = documentLike && documentLike.documentElement;
  return root && typeof root.getAttribute === "function" ? root.getAttribute("data-ui-lang") || root.getAttribute("lang") : "";
}

function createStatsDisplayLanguageSources(manager) {
  var windowLike = resolveStatsDisplayWindowLike(manager);
  var runtime = windowLike && windowLike.UII18N;
  return {
    i18nLanguage: runtime && typeof runtime.getLanguage === "function" ? runtime.getLanguage() : "",
    storageLanguage: readStatsDisplayStorageLanguage(windowLike),
    documentLanguage: readStatsDisplayDocumentLanguage(manager)
  };
}

function resolveStatsDisplayLanguageFallback(sources) {
  return normalizeStatsDisplayLanguage(sources.i18nLanguage) || normalizeStatsDisplayLanguage(sources.storageLanguage) || normalizeStatsDisplayLanguage(sources.documentLanguage) || "zh";
}

function resolveStatsDisplayLanguage(manager) {
  try {
    var sources = createStatsDisplayLanguageSources(manager);
    var runtime = resolveCoreStatsPanelCopyRuntimeForDisplay();
    if (runtime && typeof runtime.resolveStatsPanelLanguage === "function") {
      var fromRuntime = normalizeStatsDisplayLanguage(runtime.resolveStatsPanelLanguage(sources));
      if (fromRuntime) return fromRuntime;
    }
    return resolveStatsDisplayLanguageFallback(sources);
  } catch (_err) {}
  return "zh";
}

function resolveStatsIpsNowMs(rawNowMs) {
  var nowMs = Number(rawNowMs);
  if (Number.isFinite(nowMs) && nowMs >= 0) return Math.floor(nowMs);
  return Date.now();
}

function normalizeStatsIpsInputTime(raw) {
  var value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function pruneStatsIpsInputTimes(rawTimes, nowMs) {
  var minMs = nowMs - IPS_WINDOW_MS;
  var list = Array.isArray(rawTimes) ? rawTimes : [];
  var next = [];
  for (var i = 0; i < list.length; i++) {
    var time = normalizeStatsIpsInputTime(list[i]);
    if (time === null) continue;
    if (time < minMs || time > nowMs + IPS_WINDOW_MS) continue;
    next.push(time);
  }
  return next;
}

function resolveIpsInputTimesForDisplay(manager, nowMs) {
  if (!manager) return [];
  var next = pruneStatsIpsInputTimes(manager.ipsInputTimes, nowMs);
  if (!manager.replayMode) {
    manager.ipsInputTimes = next;
    manager.ipsInputCount = next.length;
  }
  return next;
}

function refreshIpsDisplay(manager, durationMs) {
  if (!manager) return;
  var statsIpsEl = resolveManagerElementById(manager, "stats-ips");
  var cornerIpsEl = manager.cornerIpsEl;
  if (!statsIpsEl && !cornerIpsEl) return;
  var ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms < 0) {
    ms = manager.getDurationMs();
  }
  var nowMs = resolveStatsIpsNowMs();
  var ipsInputCount = resolveIpsInputCount(manager, nowMs);
  var ipsText = resolveIpsDisplayText(manager, ms, ipsInputCount);
  if (statsIpsEl) statsIpsEl.textContent = ipsText;
  if (cornerIpsEl) cornerIpsEl.textContent = ipsText;
}

function createIpsInputCountResolvePayload(manager, nowMs, ipsInputTimes) {
  return {
    replayMode: manager.replayMode,
    replayIndex: manager.replayIndex,
    ipsInputCount: manager.ipsInputCount,
    ipsInputTimes: Array.isArray(ipsInputTimes) ? ipsInputTimes.slice() : [],
    nowMs: nowMs
  };
}

function resolveIpsInputCountFallback(manager, nowMs, ipsInputTimes) {
  if (manager.replayMode) {
    return Number.isInteger(manager.replayIndex) && manager.replayIndex > 0 ? manager.replayIndex : 0;
  }
  if (Array.isArray(ipsInputTimes)) {
    return ipsInputTimes.length;
  }
  var next = pruneStatsIpsInputTimes(manager.ipsInputTimes, nowMs);
  manager.ipsInputTimes = next;
  manager.ipsInputCount = next.length;
  return next.length;
}

function resolveIpsInputCountFromCoreResult(currentManager, coreCallResult, fallbackValue) {
  return currentManager.resolveCoreNumericCallOrFallback(coreCallResult, function () {
    return fallbackValue;
  });
}

function applyResolvedIpsInputCount(manager, resolvedByCore) {
  if (!manager || manager.replayMode) return;
  if (Number.isInteger(resolvedByCore) && resolvedByCore >= 0) {
    manager.ipsInputCount = resolvedByCore;
  }
}

function resolveIpsInputCount(manager, nowMs) {
  if (!manager) return 0;
  var resolvedNowMs = resolveStatsIpsNowMs(nowMs);
  var ipsInputTimes = resolveIpsInputTimesForDisplay(manager, resolvedNowMs);
  var fallbackValue = resolveIpsInputCountFallback(manager, resolvedNowMs, ipsInputTimes);
  var resolvedByCore = resolveCorePayloadCallWith(
    manager,
    "callCoreReplayExecutionRuntime",
    "resolveIpsInputCount",
    createIpsInputCountResolvePayload(manager, resolvedNowMs, ipsInputTimes),
    0,
    function (currentManager, coreCallResult) {
      return resolveIpsInputCountFromCoreResult(currentManager, coreCallResult, fallbackValue);
    }
  );
  applyResolvedIpsInputCount(manager, resolvedByCore);
  return resolvedByCore;
}

function createIpsDisplayResolvePayload(ms, ipsInputCount) {
  var count = Number(ipsInputCount);
  return {
    durationMs: ms,
    ipsInputCount: Number.isFinite(count) && count >= 0 ? count : 0
  };
}

function normalizeIpsDisplayTextFromCore(coreValue) {
  var coreDisplay = normalizeStatsDisplayRecordObject(coreValue, {});
  return typeof coreDisplay.ipsText === "string" && coreDisplay.ipsText ? coreDisplay.ipsText : "";
}

function resolveIpsDisplayTextFallback(ms, ipsInputCount) {
  var count = Number(ipsInputCount);
  var avgIps = Number.isFinite(count) && count >= 0 ? String(Math.floor(count)) : "0";
  return "IPS: " + avgIps;
}

function localizeIpsDisplayText(text, lang) {
  var raw = String(text || "");
  return raw.replace(/^输入\s*[:：]\s*/u, "IPS: ");
}

function resolveIpsDisplayTextByCore(manager, ms, ipsInputCount) {
  return resolveCorePayloadCallWith(manager, "callCoreReplayExecutionRuntime", "resolveIpsDisplayText", createIpsDisplayResolvePayload(ms, ipsInputCount), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeIpsDisplayTextFromCore(coreValue);
    }, function () {
      return "";
    });
  });
}

function resolveIpsDisplayText(manager, ms, ipsInputCount) {
  var lang = resolveStatsDisplayLanguage(manager);
  if (!manager) return localizeIpsDisplayText("IPS: 0", lang);
  var ipsText = resolveIpsDisplayTextByCore(manager, ms, ipsInputCount);
  if (ipsText) return localizeIpsDisplayText(ipsText, lang);
  return localizeIpsDisplayText(resolveIpsDisplayTextFallback(ms, ipsInputCount), lang);
}

function getActualFourRate(manager) {
  if (!manager) return "0.00";
  // Keep old method name for compatibility.
  return manager.getActualSecondaryRate();
}

function setStatsPanelFieldText(fieldId, value) {
  var manager = this && typeof this === "object" ? this : null;
  var element = resolveManagerElementById(manager, fieldId);
  if (element) element.textContent = String(value);
}

function createActualSecondaryRateResolveArgs(manager) {
  return [manager.spawnValueCounts, manager.spawnTable || []];
}

function resolveTotalSpawnCountFallback(manager) {
  if (!manager.spawnValueCounts) return 0;
  var fallbackTotal = 0;
  for (var k in manager.spawnValueCounts) {
    if (manager.hasOwnKey(manager.spawnValueCounts, k)) {
      fallbackTotal += manager.spawnValueCounts[k] || 0;
    }
  }
  return fallbackTotal;
}

function resolveTotalSpawnCountForSecondaryRate(manager) {
  return resolveCoreArgsCallWith(
    manager,
    "callCoreRulesRuntime",
    "getTotalSpawnCount",
    [manager.spawnValueCounts],
    0,
    function (currentManager, totalCallResult) {
      return currentManager.resolveCoreNumericCallOrFallback(totalCallResult, function () {
        return resolveTotalSpawnCountFallback(currentManager);
      });
    }
  );
}

function resolveActualSecondaryRateFallbackText(manager) {
  var pair = manager.getSpawnStatPair();
  var total = resolveTotalSpawnCountForSecondaryRate(manager);
  if (total <= 0) return "0.00";
  return ((resolveSpawnCount(manager, pair.secondary) / total) * 100).toFixed(2);
}

function getActualSecondaryRate(manager) {
  if (!manager) return "0.00";
  return resolveCoreArgsCallWith(
    manager,
    "callCoreRulesRuntime",
    "getActualSecondaryRateText",
    createActualSecondaryRateResolveArgs(manager),
    "",
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreStringCallOrFallback(coreCallResult, function () {
        return resolveActualSecondaryRateFallbackText(currentManager);
      });
    }
  );
}

function finalizeActuatePersistence(manager) {
  if (!manager) return;
  if (typeof consumeSkipActuatePersistenceOnce === "function" && consumeSkipActuatePersistenceOnce(manager)) {
    return;
  }
  if (typeof publishSavedStateSyncSnapshot === "function") {
    publishSavedStateSyncSnapshot(manager);
  }
  var shouldFinalizeAsTerminated = manager.modeKey !== "practice" && (
    !!manager.over ||
    (typeof isTerminalSessionForPersistence === "function" && isTerminalSessionForPersistence(manager))
  );
  if (shouldFinalizeAsTerminated) {
    manager.clearSavedGameState(manager.modeKey);
    manager.tryAutoSubmitOnGameOver();
    return;
  }
  saveGameState(manager);
}

function syncBestScoreBeforeActuate(manager) {
  if (!manager || !manager.scoreManager) return;
  if (manager.replayMode) return;
  var documentLike = resolveManagerDocumentLike(manager);
  var body = documentLike && documentLike.body ? documentLike.body : null;
  if (body && typeof body.getAttribute === "function" && body.getAttribute("data-page") === "replay") {
    return;
  }
  if (manager.scoreManager.get() < manager.score) {
    manager.scoreManager.set(manager.score);
  }
}

function resolveCoreGameManagerActuatorPayloadStateRuntime() {
  if (typeof CoreGameManagerActuatorPayloadStateRuntime !== "undefined" && CoreGameManagerActuatorPayloadStateRuntime) return CoreGameManagerActuatorPayloadStateRuntime;
  if (typeof window !== "undefined" && window && window.CoreGameManagerActuatorPayloadStateRuntime) return window.CoreGameManagerActuatorPayloadStateRuntime;
  return null;
}

function collectActuatorStoneValuesFallback(manager) {
  var stoneValues = [];
  if (manager && manager.stoneValueSet && typeof manager.stoneValueSet === "object") {
    for (var key in manager.stoneValueSet) {
      if (!manager.hasOwnKey(manager.stoneValueSet, key)) continue;
      if (manager.stoneValueSet[key] !== true) continue;
      var value = Number(key);
      if (!Number.isInteger(value)) continue;
      stoneValues.push(value);
    }
  }
  return stoneValues;
}

function createActuatorPayloadStateFallback(manager) {
  return {
    score: manager.score,
    over: manager.over,
    won: manager.won,
    bestScore: manager.scoreManager.get(),
    terminated: isGameTerminated(manager),
    blockedCells: manager.blockedCellsList || [],
    stoneValues: collectActuatorStoneValuesFallback(manager)
  };
}

function createActuatorPayloadState(manager) {
  var runtime = resolveCoreGameManagerActuatorPayloadStateRuntime();
  if (runtime && typeof runtime.createActuatorPayloadState === "function") {
    return runtime.createActuatorPayloadState(manager, {
      isGameTerminated: isGameTerminated
    });
  }
  return createActuatorPayloadStateFallback(manager);
}

function normalizeActuateStatsNumber(value) {
  var num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

function resolveStepStatsFastPath(manager) {
  if (!manager || manager.replayMode) return null;
  return {
    totalSteps: normalizeActuateStatsNumber(Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0),
    moveSteps: normalizeActuateStatsNumber(manager.successfulMoveCount),
    undoSteps: normalizeActuateStatsNumber(manager.undoUsed)
  };
}

function updateActuateStatsAndPanel(manager) {
  if (!manager) return;
  var stepStats = resolveStepStatsFastPath(manager) || manager.computeStepStats();
  var stats = normalizeStatsDisplayRecordObject(stepStats, {});
  updateStatsLabelText(manager, "stats-total", "总步数: ", stats.totalSteps);
  updateStatsLabelText(manager, "stats-moves", "移动步数: ", stats.moveSteps);
  updateStatsLabelText(manager, "stats-undo", "撤回步数: ", stats.undoSteps);
  manager.updateStatsPanel(stats.totalSteps, stats.moveSteps, stats.undoSteps);
}

function resolveActuateElapsedMs(manager) {
  if (!manager) return 0;
  if (typeof manager.getDurationMs === "function") {
    return manager.getDurationMs();
  }
  if (manager.timerStatus === 1 && manager.startTime && typeof manager.startTime.getTime === "function") {
    return Date.now() - manager.startTime.getTime();
  }
  return manager.accumulatedTime;
}

function refreshActuateTimerAndIps(manager) {
  if (!(manager && manager.timerContainer)) return;
  var elapsedMs = resolveActuateElapsedMs(manager);
  manager.timerContainer.textContent = manager.pretty(elapsedMs);
  refreshIpsDisplay(manager, elapsedMs);
}

function actuate(manager) {
  if (!manager) return;
  syncBestScoreBeforeActuate(manager);
  manager.actuator.actuate(manager.grid, createActuatorPayloadState(manager));
  updateActuateStatsAndPanel(manager);
  refreshActuateTimerAndIps(manager);
  finalizeActuatePersistence(manager);
}

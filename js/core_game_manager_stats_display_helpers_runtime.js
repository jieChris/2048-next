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

function refreshIpsDisplay(manager, durationMs) {
  if (!manager) return;
  var statsIpsEl = resolveManagerElementById(manager, "stats-ips");
  var cornerIpsEl = manager.cornerIpsEl;
  if (!statsIpsEl && !cornerIpsEl) return;
  var ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms < 0) {
    ms = manager.getDurationMs();
  }
  var ipsInputCount = resolveIpsInputCount(manager);
  var ipsText = resolveIpsDisplayText(manager, ms, ipsInputCount);
  if (statsIpsEl) statsIpsEl.textContent = ipsText;
  if (cornerIpsEl) cornerIpsEl.textContent = ipsText;
}

function createIpsInputCountResolvePayload(manager) {
  return {
    replayMode: manager.replayMode,
    replayIndex: manager.replayIndex,
    ipsInputCount: manager.ipsInputCount
  };
}

function resolveIpsInputCountFallback(manager) {
  if (manager.replayMode) {
    return Number.isInteger(manager.replayIndex) && manager.replayIndex > 0 ? manager.replayIndex : 0;
  }
  return Number.isInteger(manager.ipsInputCount) && manager.ipsInputCount >= 0
    ? manager.ipsInputCount
    : 0;
}

function resolveIpsInputCountFromCoreResult(currentManager, coreCallResult) {
  return currentManager.resolveCoreNumericCallOrFallback(coreCallResult, function () {
    return resolveIpsInputCountFallback(currentManager);
  });
}

function resolveIpsInputCount(manager) {
  if (!manager) return 0;
  return resolveCorePayloadCallWith(
    manager,
    "callCoreReplayExecutionRuntime",
    "resolveIpsInputCount",
    createIpsInputCountResolvePayload(manager),
    0,
    function (currentManager, coreCallResult) {
      return resolveIpsInputCountFromCoreResult(currentManager, coreCallResult);
    }
  );
}

function createIpsDisplayResolvePayload(ms, ipsInputCount) {
  return {
    durationMs: ms,
    ipsInputCount: ipsInputCount
  };
}

function normalizeIpsDisplayTextFromCore(coreValue) {
  var coreDisplay = normalizeStatsDisplayRecordObject(coreValue, {});
  return typeof coreDisplay.ipsText === "string" && coreDisplay.ipsText ? coreDisplay.ipsText : "";
}

function resolveIpsDisplayTextFallback(ms, ipsInputCount) {
  var seconds = ms / 1000;
  var avgIps = 0;
  if (seconds > 0) {
    avgIps = (ipsInputCount / seconds).toFixed(2);
  }
  return "IPS: " + avgIps;
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
  if (!manager) return "IPS: 0";
  var ipsText = resolveIpsDisplayTextByCore(manager, ms, ipsInputCount);
  if (ipsText) return ipsText;
  return resolveIpsDisplayTextFallback(ms, ipsInputCount);
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
  var shouldFinalizeAsTerminated = manager.modeKey !== "practice_legacy" && isSessionTerminated(manager);
  if (shouldFinalizeAsTerminated) {
    manager.clearSavedGameState(manager.modeKey);
    manager.tryAutoSubmitOnGameOver();
    return;
  }
  saveGameState(manager);
}

function syncBestScoreBeforeActuate(manager) {
  if (!manager || !manager.scoreManager) return;
  if (manager.scoreManager.get() < manager.score) {
    manager.scoreManager.set(manager.score);
  }
}

function createActuatorPayloadState(manager) {
  return {
    score: manager.score,
    over: manager.over,
    won: manager.won,
    bestScore: manager.scoreManager.get(),
    terminated: isGameTerminated(manager),
    blockedCells: manager.blockedCellsList || []
  };
}

function updateActuateStatsAndPanel(manager) {
  if (!manager) return;
  var stepStats = manager.computeStepStats();
  var stats = normalizeStatsDisplayRecordObject(stepStats, {});
  updateStatsLabelText(manager, "stats-total", "总步数: ", stats.totalSteps);
  updateStatsLabelText(manager, "stats-moves", "移动步数: ", stats.moveSteps);
  updateStatsLabelText(manager, "stats-undo", "撤回步数: ", stats.undoSteps);
  manager.updateStatsPanel(stats.totalSteps, stats.moveSteps, stats.undoSteps);
}

function resolveActuateElapsedMs(manager) {
  if (!manager) return 0;
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

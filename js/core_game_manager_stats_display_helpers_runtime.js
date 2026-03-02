function resolveStatsDisplayDocumentLike(manager) {
  return resolveManagerDocumentLike(manager);
}

function resolveStatsDisplayElementById(manager, elementId) {
  return resolveManagerElementById(manager, elementId);
}

function updateStatsLabelText(manager, elementId, label, value) {
  var el = resolveStatsDisplayElementById(manager, elementId);
  if (!el) return;
  el.textContent = label + value;
}

function applyInvalidatedTimerPlaceholders(manager, elementIds) {
  var ids = Array.isArray(elementIds) ? elementIds : [];
  for (var idx = 0; idx < ids.length; idx++) {
    var targetId = ids[idx];
    if (!targetId) continue;
    var targetEl = resolveStatsDisplayElementById(manager, String(targetId));
    if (targetEl) targetEl.textContent = "---------";
  }
}

function refreshIpsDisplay(manager, durationMs) {
  if (!manager) return;
  var statsIpsEl = resolveStatsDisplayElementById(manager, "stats-ips");
  var cornerIpsEl = manager.cornerIpsEl;
  if (!statsIpsEl && !cornerIpsEl) return;
  var ms = resolveIpsDurationMs(manager, durationMs);
  var ipsInputCount = resolveIpsInputCount(manager);
  var ipsText = resolveIpsDisplayText(manager, ms, ipsInputCount);
  applyIpsTextToTargets(statsIpsEl, cornerIpsEl, ipsText);
}

function resolveIpsDurationMs(manager, durationMs) {
  if (!manager) return 0;
  var ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms < 0) {
    return manager.getDurationMs();
  }
  return ms;
}

function resolveIpsInputCountFallback(manager) {
  if (!manager) return 0;
  if (manager.replayMode) {
    return Number.isInteger(manager.replayIndex) && manager.replayIndex > 0 ? manager.replayIndex : 0;
  }
  return Number.isInteger(manager.ipsInputCount) && manager.ipsInputCount >= 0 ? manager.ipsInputCount : 0;
}

function resolveIpsInputCount(manager) {
  if (!manager) return 0;
  return resolveCoreReplayExecutionNumericCallOrFallback(
    manager,
    "resolveIpsInputCount",
    {
      replayMode: manager.replayMode,
      replayIndex: manager.replayIndex,
      ipsInputCount: manager.ipsInputCount
    },
    function () {
      return resolveIpsInputCountFallback(manager);
    }
  );
}

function normalizeIpsTextFromCoreValue(coreValue) {
  var coreDisplay = coreValue || {};
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

function resolveIpsDisplayText(manager, ms, ipsInputCount) {
  if (!manager) return "IPS: 0";
  var ipsText = resolveCoreReplayExecutionNormalizedCallOrFallback(
    manager,
    "resolveIpsDisplayText",
    {
      durationMs: ms,
      ipsInputCount: ipsInputCount
    },
    function (coreValue) {
      return normalizeIpsTextFromCoreValue(coreValue);
    },
    function () {
      return "";
    }
  );
  if (ipsText) return ipsText;
  return resolveIpsDisplayTextFallback(ms, ipsInputCount);
}

function applyIpsTextToTargets(statsIpsEl, cornerIpsEl, ipsText) {
  if (statsIpsEl) statsIpsEl.textContent = ipsText;
  if (cornerIpsEl) cornerIpsEl.textContent = ipsText;
}

function getActualFourRate(manager) {
  if (!manager) return "0.00";
  // Keep old method name for compatibility.
  return manager.getActualSecondaryRate();
}

function setStatsPanelFieldText(fieldId, value) {
  var manager = this && typeof this === "object" ? this : null;
  var element = resolveStatsDisplayElementById(manager, fieldId);
  if (element) element.textContent = String(value);
}

function resolveStatsPanelStepValues(manager, totalSteps, moveSteps, undoSteps) {
  var fallback = manager.computeStepStats();
  return {
    totalSteps: typeof totalSteps === "undefined" ? fallback.totalSteps : totalSteps,
    moveSteps: typeof moveSteps === "undefined" ? fallback.moveSteps : moveSteps,
    undoSteps: typeof undoSteps === "undefined" ? fallback.undoSteps : undoSteps
  };
}

function applyStatsPanelSpawnLabels(manager, pair) {
  var twoLabel = resolveStatsDisplayElementById(manager, "stats-panel-two-label");
  if (twoLabel) twoLabel.textContent = "出" + pair.primary + "数量";
  var fourLabel = resolveStatsDisplayElementById(manager, "stats-panel-four-label");
  if (fourLabel) fourLabel.textContent = "出" + pair.secondary + "数量";
  var rateLabel = resolveStatsDisplayElementById(manager, "stats-panel-four-rate-label");
  if (rateLabel) rateLabel.textContent = "实际出" + pair.secondary + "率";
}

function applyStatsPanelStepFields(manager, stepValues) {
  manager.setStatsPanelFieldText("stats-panel-total", stepValues.totalSteps);
  manager.setStatsPanelFieldText("stats-panel-moves", stepValues.moveSteps);
  manager.setStatsPanelFieldText("stats-panel-undo", stepValues.undoSteps);
}

function applyStatsPanelSpawnFields(manager, pair) {
  manager.setStatsPanelFieldText("stats-panel-two", resolveSpawnCount(manager, pair.primary));
  manager.setStatsPanelFieldText("stats-panel-four", resolveSpawnCount(manager, pair.secondary));
  var rateEl = resolveStatsDisplayElementById(manager, "stats-panel-four-rate");
  if (rateEl) rateEl.textContent = manager.getActualSecondaryRate();
}

function buildStatsPanelUpdateContext(manager, totalSteps, moveSteps, undoSteps) {
  if (!manager) return null;
  return {
    stepValues: resolveStatsPanelStepValues(manager, totalSteps, moveSteps, undoSteps),
    pair: manager.getSpawnStatPair()
  };
}

function applyStatsPanelUpdateContext(manager, context) {
  if (!manager || !context) return;
  applyStatsPanelSpawnLabels(manager, context.pair);
  applyStatsPanelStepFields(manager, context.stepValues);
  applyStatsPanelSpawnFields(manager, context.pair);
}

function resolveTotalSpawnCountFallback(manager) {
  if (!manager || !manager.spawnValueCounts) return 0;
  var fallbackTotal = 0;
  for (var k in manager.spawnValueCounts) {
    if (manager.hasOwnKey(manager.spawnValueCounts, k)) {
      fallbackTotal += manager.spawnValueCounts[k] || 0;
    }
  }
  return fallbackTotal;
}

function resolveActualSecondaryRateText(manager, pair, total) {
  if (!manager) return "0.00";
  if (total <= 0) return "0.00";
  return ((resolveSpawnCount(manager, pair.secondary) / total) * 100).toFixed(2);
}

function getActualSecondaryRate(manager) {
  if (!manager) return "0.00";
  return resolveCoreRulesStringCallOrFallback(
    manager,
    "getActualSecondaryRateText",
    [
      manager.spawnValueCounts,
      manager.spawnTable || []
    ],
    function () {
      var pair = manager.getSpawnStatPair();
      var total = resolveCoreRulesNumericCallOrFallback(
        manager,
        "getTotalSpawnCount",
        [manager.spawnValueCounts],
        function () {
          return resolveTotalSpawnCountFallback(manager);
        }
      );
      return resolveActualSecondaryRateText(manager, pair, total);
    }
  );
}

function shouldFinalizeActuateAsTerminatedSession(manager) {
  if (!manager) return false;
  if (manager.modeKey === "practice_legacy") return false;
  return isSessionTerminated(manager);
}

function handleTerminatedSessionActuatePersistence(manager) {
  if (!manager) return;
  manager.clearSavedGameState(manager.modeKey);
  manager.tryAutoSubmitOnGameOver();
}

function finalizeActuatePersistence(manager) {
  if (!manager) return;
  if (shouldFinalizeActuateAsTerminatedSession(manager)) {
    handleTerminatedSessionActuatePersistence(manager);
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

function buildActuatePayload(manager) {
  if (!manager) return {};
  return {
    score: manager.score,
    over: manager.over,
    won: manager.won,
    bestScore: manager.scoreManager.get(),
    terminated: isGameTerminated(manager),
    blockedCells: manager.blockedCellsList || []
  };
}

function actuate(manager) {
  if (!manager) return;
  syncBestScoreBeforeActuate(manager);
  manager.actuator.actuate(manager.grid, buildActuatePayload(manager));
  updateActuateStats(manager);
  syncActuateTimerView(manager);
  finalizeActuatePersistence(manager);
}

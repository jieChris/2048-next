function buildTimerMilestoneSlotByValueMap(milestones) {
  var map = {};
  var resolvedMilestones = Array.isArray(milestones) ? milestones : [];
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
    var milestone = resolvedMilestones[i];
    if (Number.isInteger(milestone) && milestone > 0) {
      map[String(milestone)] = slotId;
    }
  }
  return map;
}

function resolveTimerMilestones(manager) {
  return manager.getTimerMilestoneValues();
}

function createTimerMilestoneSlotResolveArgs(milestones) {
  return [
    milestones,
    GameManager.TIMER_SLOT_IDS
  ];
}

function normalizeTimerMilestoneSlotMapFromCore(currentManager, coreValue) {
  return currentManager.isNonArrayObject(coreValue) ? coreValue : undefined;
}

function resolveTimerMilestoneSlotByValue(manager, milestones) {
  return resolveCoreArgsCallWith(manager, "callCoreRulesRuntime", "getTimerMilestoneSlotByValue", createTimerMilestoneSlotResolveArgs(milestones), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeTimerMilestoneSlotMapFromCore(currentManager, coreValue);
    }, function () {
      return buildTimerMilestoneSlotByValueMap(milestones);
    });
  });
}

function applyTimerLegendLabels(documentLike, milestones) {
  for (var milestoneIndex = 0; milestoneIndex < GameManager.TIMER_SLOT_IDS.length; milestoneIndex++) {
    var legendSlotId = String(GameManager.TIMER_SLOT_IDS[milestoneIndex]);
    var label = String(milestones[milestoneIndex]);
    var nodes = documentLike.querySelectorAll(".timer-legend-" + legendSlotId);
    for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      nodes[nodeIndex].textContent = label;
    }
  }
}

function initializeTimerMilestones(manager) {
  if (!manager) return;
  manager.timerMilestones = resolveTimerMilestones(manager);
  manager.timerMilestoneSlotByValue = resolveTimerMilestoneSlotByValue(manager, manager.timerMilestones);
  var documentLike = resolveManagerDocumentLike(manager);
  if (!documentLike) return;
  var milestones = manager.timerMilestones || resolveTimerMilestones(manager);
  applyTimerLegendLabels(documentLike, milestones);
  manager.callWindowNamespaceMethod("ThemeManager", "syncTimerLegendStyles");
}

function resetRoundStatsState(manager) {
  if (!manager) return;
  manager.comboStreak = 0;
  manager.successfulMoveCount = 0;
  manager.ipsInputCount = 0;
  manager.ipsInputTimes = [];
  manager.undoUsed = 0;
  manager.lockConsumedAtMoveCount = -1;
  manager.lockedDirectionTurn = null;
  manager.lockedDirection = null;
  manager.spawnValueCounts = {};
  manager.spawnTwos = 0;
  manager.spawnFours = 0;
  manager.itemProgress = 0;
  manager.itemInventory = createEmptyItemInventory();
  manager.nextSpawnSuppressed = false;
  manager.nextSpawnValueOverride = null;
  manager.undoEnabled = manager.loadUndoSettingForMode(manager.mode);
  if (typeof updateItemModeHud === "function") updateItemModeHud(manager);
  if (typeof updateMoveTimeoutHud === "function") updateMoveTimeoutHud(manager, Date.now());
}

function initializeGameManagerCoreFields(manager, size, InputManager, Actuator, ScoreManager) {
  if (!manager) return;
  manager.size = size; // Size of the grid
  manager.width = size;
  manager.height = size;
  manager.inputManager = new InputManager;
  manager.scoreManager = new ScoreManager;
  manager.actuator = new Actuator;
  var documentLike = resolveManagerDocumentLike(manager);
  manager.timerContainer = documentLike
    ? (documentLike.querySelector(".timer-container") || resolveManagerElementById(manager, "timer"))
    : null;
  manager.cornerRateEl = null;
  manager.cornerIpsEl = null;
}

function initializeGameManagerRuntimeState(manager) {
  if (!manager) return;
  manager.startTiles = 2; manager.maxTile = Infinity; manager.mode = detectMode(manager); manager.modeConfig = null;
  manager.ruleset = "pow2"; manager.rankedBucket = "none"; manager.disableSessionSync = false;
  manager.spawnTable = [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  manager.sessionSubmitDone = false; manager.sessionReplayV3 = null; manager.timerModuleView = "timer";
  manager.timerLeaderboardLoadId = 0; manager.timerModuleBaseHeight = 0; manager.timerUpdateIntervalMs = 33;
  manager.lastStatsPanelUpdateAt = 0;
  manager.pendingMoveInput = null; manager.moveInputFlushScheduled = false; manager.lastMoveInputAt = 0;
  manager.allowedDirections = [0, 1, 2, 3]; manager.allowedDirectionSet = { "0": true, "1": true, "2": true, "3": true };
  manager.stoneCellsList = []; manager.stoneValueSet = {};
  manager.itemModeRules = null; manager.itemInventory = createEmptyItemInventory(); manager.itemProgress = 0;
  manager.nextSpawnSuppressed = false; manager.nextSpawnValueOverride = null;
  manager.moveTimeoutMs = null; manager.moveDeadlineAt = null;
  manager.practiceRestartBoardMatrix = null; manager.practiceRestartModeConfig = null;
  manager.noXTriggered = false; manager.noXTriggeredTile = null;
  manager.noXSelectionPending = false; manager.noXPendingDefaultTarget = null;
  manager.timerFrozen = false;
  manager.clientRecordId = "";
  manager.needsRankedCheckpointRestore = false;
  manager.rankCheckpointRestorePending = false;
  manager.rankCheckpointRestoreScheduled = false;
  manager.rankCheckpointApplying = false;
  manager.rankCheckpointSaveConflict = "";
  manager.lastRankedCheckpointSignature = "";
  manager.lastRankedCheckpointSavedAt = 0;
  manager.lastRankedCheckpointSaveError = "";
  manager.singleModePageLockState = null;
}

function resolveCoreGameManagerInputEventsRuntime() {
  if (typeof CoreGameManagerInputEventsRuntime !== "undefined" && CoreGameManagerInputEventsRuntime) {
    return CoreGameManagerInputEventsRuntime;
  }
  if (typeof window !== "undefined" && window && window.CoreGameManagerInputEventsRuntime) {
    return window.CoreGameManagerInputEventsRuntime;
  }
  return null;
}

function bindGameManagerInputEvents(manager) {
  var runtime = resolveCoreGameManagerInputEventsRuntime();
  if (runtime && typeof runtime.bindGameManagerInputEvents === "function") {
    runtime.bindGameManagerInputEvents(manager, {
      handleMoveInput: handleMoveInput
    });
  }
}

function bindGameManagerSavedStatePersistence(manager) {
  if (!manager) return;
  var windowLikeForPersistence = manager.getWindowLike();
  if (!(windowLikeForPersistence && !manager.savedGameStateBound)) return;
  var saveHandler = function () {
    saveGameState(manager, { force: true });
    try {
      if (
        windowLikeForPersistence &&
        windowLikeForPersistence.OnlineLeaderboardRuntime &&
        typeof windowLikeForPersistence.OnlineLeaderboardRuntime.persistRankedCheckpointOnPageHide === "function"
      ) {
        windowLikeForPersistence.OnlineLeaderboardRuntime.persistRankedCheckpointOnPageHide(manager);
      }
    } catch (_errCheckpoint) {}
  };
  windowLikeForPersistence.addEventListener("beforeunload", saveHandler);
  windowLikeForPersistence.addEventListener("pagehide", saveHandler);
  bindSavedStateSyncStorageListener(manager, windowLikeForPersistence);
  manager.savedGameStateBound = true;
}

function initializeGameManagerUi(manager) {
  if (!manager) return;
  manager.setRuntimeUndoStack([]);
  manager.setRuntimeRedoStack([]);
  initCornerStatsUi(manager);
  initStatsPanelUi(manager);
}

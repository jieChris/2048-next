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

function resetRoundStatsStateFallback(manager) {
  if (!manager) return;
  manager.comboStreak = 0; manager.successfulMoveCount = 0;
  manager.validInputCount = 0; manager.invalidInputCount = 0; manager.ipsInputCount = 0;
  manager.ipsInputTimes = [];
  manager.undoUsed = 0; manager.lockConsumedAtMoveCount = -1;
  manager.lockedDirectionTurn = null; manager.lockedDirection = null;
  manager.spawnValueCounts = {};
  manager.spawnTwos = 0; manager.spawnFours = 0; manager.itemProgress = 0;
  manager.itemInventory = createEmptyItemInventory();
  manager.nextSpawnSuppressed = false; manager.nextSpawnValueOverride = null;
  manager.undoEnabled = manager.loadUndoSettingForMode(manager.mode);
  if (typeof updateItemModeHud === "function") updateItemModeHud(manager);
  if (typeof updateMoveTimeoutHud === "function") updateMoveTimeoutHud(manager, Date.now());
}

function resolveCoreGameManagerRuntimeStateRuntime() {
  if (typeof CoreGameManagerRuntimeStateRuntime !== "undefined" && CoreGameManagerRuntimeStateRuntime) {
    return CoreGameManagerRuntimeStateRuntime;
  }
  if (typeof window !== "undefined" && window && window.CoreGameManagerRuntimeStateRuntime) {
    return window.CoreGameManagerRuntimeStateRuntime;
  }
  return null;
}

function resetRoundStatsState(manager) {
  var runtime = resolveCoreGameManagerRuntimeStateRuntime();
  if (runtime && typeof runtime.resetRoundStatsState === "function") {
    runtime.resetRoundStatsState(manager, {
      createEmptyItemInventory: createEmptyItemInventory,
      updateItemModeHud: typeof updateItemModeHud === "function" ? updateItemModeHud : undefined,
      updateMoveTimeoutHud: typeof updateMoveTimeoutHud === "function" ? updateMoveTimeoutHud : undefined,
      nowMs: Date.now()
    });
  } else {
    resetRoundStatsStateFallback(manager);
  }
  var inputEventsRuntime = resolveCoreGameManagerInputEventsRuntime();
  if (inputEventsRuntime && typeof inputEventsRuntime.publishOperationFeedbackReset === "function") {
    inputEventsRuntime.publishOperationFeedbackReset(manager);
  }
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
  var runtime = resolveCoreGameManagerRuntimeStateRuntime();
  if (runtime && typeof runtime.initializeGameManagerRuntimeState === "function") {
    runtime.initializeGameManagerRuntimeState(manager, {
      detectMode: detectMode,
      createEmptyItemInventory: createEmptyItemInventory
    });
  }
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

function resolveCoreGameManagerSavedStatePersistenceBindingRuntime() {
  if (typeof CoreGameManagerSavedStatePersistenceBindingRuntime !== "undefined" && CoreGameManagerSavedStatePersistenceBindingRuntime) {
    return CoreGameManagerSavedStatePersistenceBindingRuntime;
  }
  if (typeof window !== "undefined" && window && window.CoreGameManagerSavedStatePersistenceBindingRuntime) {
    return window.CoreGameManagerSavedStatePersistenceBindingRuntime;
  }
  return null;
}

function bindGameManagerSavedStatePersistenceFallback(manager) {
  if (!manager) return;
  var windowLikeForPersistence = manager.getWindowLike();
  if (!(windowLikeForPersistence && !manager.savedGameStateBound)) return;
  var saveHandler = function () {
    if (manager.singleModePageLockRejected) return;
    saveGameState(manager, { force: true });
    try {
      var rankedRuntime = windowLikeForPersistence && windowLikeForPersistence.OnlineLeaderboardRuntime;
      var persistRankedCheckpoint = rankedRuntime && rankedRuntime.persistRankedCheckpointOnPageHide;
      if (typeof persistRankedCheckpoint === "function") persistRankedCheckpoint(manager);
    } catch (_errCheckpoint) {}
  };
  windowLikeForPersistence.addEventListener("beforeunload", saveHandler);
  windowLikeForPersistence.addEventListener("pagehide", saveHandler);
  bindSavedStateSyncStorageListener(manager, windowLikeForPersistence);
  manager.savedGameStateBound = true;
}
function bindGameManagerSavedStatePersistence(manager) {
  var runtime = resolveCoreGameManagerSavedStatePersistenceBindingRuntime();
  if (runtime && typeof runtime.bindGameManagerSavedStatePersistence === "function") {
    runtime.bindGameManagerSavedStatePersistence(manager, {
      saveGameState: saveGameState,
      bindSavedStateSyncStorageListener: bindSavedStateSyncStorageListener
    });
    return;
  }
  bindGameManagerSavedStatePersistenceFallback(manager);
}

function initializeGameManagerUi(manager) {
  if (!manager) return;
  manager.setRuntimeUndoStack([]);
  manager.setRuntimeRedoStack([]);
  initCornerStatsUi(manager);
  initStatsPanelUi(manager);
}

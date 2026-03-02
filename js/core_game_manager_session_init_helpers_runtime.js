function addInitialTilesWhenNeeded(manager, options, restoredFromSavedState) {
  if (!manager) return;
  var normalizedOptions = normalizeSessionInitOptions(options);
  var skipStartTiles = !!normalizedOptions.skipStartTiles;
  if (skipStartTiles || restoredFromSavedState) return;
  for (var startIndex = 0; startIndex < manager.startTiles; startIndex++) {
    manager.addRandomTile();
  }
}

function isSessionInitRecordObject(value) {
  return !!value && typeof value === "object";
}

function normalizeSessionInitOptions(options) {
  return isSessionInitRecordObject(options) ? options : {};
}

function ensureInitialBoardMatrixWhenNeeded(manager, restoredFromSavedState) {
  if (!manager || restoredFromSavedState) return;
  manager.initialBoardMatrix = manager.getFinalBoardMatrix();
}

function restoreOrInitBoardState(options, hasInputSeed) {
  // Add the initial tiles unless a replay imports an explicit board.
  var restoredFromSavedState = false;
  if (shouldAttemptSavedStateRestoreForManager(this, options, hasInputSeed)) {
    restoredFromSavedState = tryRestoreLatestSavedState(this);
  }
  addInitialTilesWhenNeeded(this, options, restoredFromSavedState);
  ensureInitialBoardMatrixWhenNeeded(this, restoredFromSavedState);
  return restoredFromSavedState;
}

function syncSetupUiAfterStateRestore(manager, preferredTimerModuleView) {
  if (!manager) return;
  refreshSpawnRateDisplay(manager);
  manager.updateUndoUiState();
  manager.notifyUndoSettingsStateChanged();
  manager.applyTimerModuleView(preferredTimerModuleView, true);
}

function resolveSessionChallengeId(manager, options) {
  if (!manager) return null;
  var normalizedOptions = normalizeSessionInitOptions(options);
  var challengeId = typeof normalizedOptions.challengeId === "string" && normalizedOptions.challengeId
    ? normalizedOptions.challengeId
    : null;
  var windowLike = manager.getWindowLike();
  if (
    !challengeId &&
    windowLike &&
    windowLike.GAME_CHALLENGE_CONTEXT &&
    windowLike.GAME_CHALLENGE_CONTEXT.id
  ) {
    challengeId = windowLike.GAME_CHALLENGE_CONTEXT.id;
  }
  return challengeId;
}

function resolveSessionInitDocumentLike(manager) {
  return resolveManagerDocumentLike(manager);
}

function createSessionReplaySnapshot(manager, challengeId) {
  if (!manager) return null;
  return {
    v: 3,
    mode: manager.getLegacyModeFromModeKey(manager.modeKey || manager.mode),
    mode_key: manager.modeKey,
    board_width: manager.width,
    board_height: manager.height,
    ruleset: manager.ruleset,
    undo_enabled: !!manager.modeConfig.undo_enabled,
    mode_family: manager.modeFamily,
    rank_policy: manager.rankPolicy,
    special_rules_snapshot: manager.clonePlain(manager.specialRules || {}),
    challenge_id: challengeId,
    seed: manager.initialSeed,
    actions: []
  };
}

function resetSessionTimerAndInputState(manager) {
  if (!manager) return;
  manager.timerStatus = 0;
  manager.startTime = null;
  manager.timerID = null;
  manager.time = 0;
  manager.accumulatedTime = 0;
  manager.pendingMoveInput = null;
  manager.moveInputFlushScheduled = false;
  manager.lastMoveInputAt = 0;
}

function resetSessionTransientState(manager) {
  if (!manager) return;
  manager.lastSpawn = null;
  manager.forcedSpawn = null;
  manager.reached32k = false;
  manager.isTestMode = false;
  manager.cappedMilestoneCount = 0;
  resetSessionTimerAndInputState(manager);
  manager.sessionStartedAt = Date.now();
  manager.hasGameStarted = false;
}

function initializeSessionSeedState(manager, inputSeed) {
  if (!manager) return false;
  var hasInputSeed = typeof inputSeed !== "undefined";
  if (hasInputSeed) {
    manager.replayIndex = 0;
  }
  manager.initialSeed = hasInputSeed ? inputSeed : Math.random();
  manager.seed = manager.initialSeed;
  manager.replayMode = hasInputSeed;
  if (!hasInputSeed) {
    manager.disableSessionSync = false;
  }
  return hasInputSeed;
}

function resetSessionReplayState(manager) {
  if (!manager) return;
  manager.moveHistory = [];
  manager.replayCompactLog = "";
  manager.initialBoardMatrix = null;
  manager.replayStartBoardMatrix = null;
}

function initializeSessionReplaySnapshotState(manager, options) {
  if (!manager) return;
  manager.sessionSubmitDone = false;
  manager.challengeId = resolveSessionChallengeId(manager, options);
  manager.sessionReplayV3 = createSessionReplaySnapshot(manager, manager.challengeId);
}

function initializeSessionState(manager, inputSeed, options) {
  if (!manager) return false;
  var hasInputSeed = initializeSessionSeedState(manager, inputSeed);
  resetSessionReplayState(manager);
  initializeSessionReplaySnapshotState(manager, options);
  resetSessionTransientState(manager);
  return hasInputSeed;
}

function resolveTimerMilestoneSlotByValueMap(manager, timerMilestones) {
  if (!manager) return {};
  return resolveCoreRulesNormalizedCallOrFallback(
    manager,
    "getTimerMilestoneSlotByValue",
    [
      timerMilestones,
      GameManager.TIMER_SLOT_IDS
    ],
    function (coreValue) {
      return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      return buildTimerMilestoneSlotByValueMapFallback(timerMilestones);
    }
  );
}

function syncTimerMilestonesUi(manager) {
  if (!manager) return;
  if (!resolveSessionInitDocumentLike(manager)) return;
  syncTimerMilestoneLegendLabels(manager);
  manager.callWindowNamespaceMethod("ThemeManager", "syncTimerLegendStyles");
}

function initializeTimerMilestones(manager) {
  if (!manager) return;
  manager.timerMilestones = manager.getTimerMilestoneValues();
  manager.timerMilestoneSlotByValue = resolveTimerMilestoneSlotByValueMap(manager, manager.timerMilestones);
  syncTimerMilestonesUi(manager);
}

function buildTimerMilestoneSlotByValueMapFallback(timerMilestones) {
  var map = {};
  var milestones = Array.isArray(timerMilestones) ? timerMilestones : [];
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
    var milestone = milestones[i];
    if (Number.isInteger(milestone) && milestone > 0) {
      map[String(milestone)] = slotId;
    }
  }
  return map;
}

function syncTimerMilestoneLegendLabels(manager) {
  if (!manager) return;
  var documentLike = resolveSessionInitDocumentLike(manager);
  if (!documentLike) return;
  var milestones = manager.timerMilestones || manager.getTimerMilestoneValues();
  for (var milestoneIndex = 0; milestoneIndex < GameManager.TIMER_SLOT_IDS.length; milestoneIndex++) {
    var legendSlotId = String(GameManager.TIMER_SLOT_IDS[milestoneIndex]);
    var label = String(milestones[milestoneIndex]);
    var nodes = documentLike.querySelectorAll(".timer-legend-" + legendSlotId);
    for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      nodes[nodeIndex].textContent = label;
    }
  }
}

function resetRoundStepStatsState(manager) {
  if (!manager) return;
  manager.comboStreak = 0;
  manager.successfulMoveCount = 0;
  manager.ipsInputCount = 0;
  manager.undoUsed = 0;
}

function resetRoundDirectionLockState(manager) {
  if (!manager) return;
  manager.lockConsumedAtMoveCount = -1;
  manager.lockedDirectionTurn = null;
  manager.lockedDirection = null;
}

function resetRoundSpawnStatsState(manager) {
  if (!manager) return;
  manager.spawnValueCounts = {};
  manager.spawnTwos = 0;
  manager.spawnFours = 0;
}

function resetRoundStatsState(manager) {
  if (!manager) return;
  resetRoundStepStatsState(manager);
  resetRoundDirectionLockState(manager);
  resetRoundSpawnStatsState(manager);
  manager.undoEnabled = manager.loadUndoSettingForMode(manager.mode);
}

function initializeGameManagerCoreFields(manager, size, InputManager, Actuator, ScoreManager) {
  if (!manager) return;
  manager.size = size; // Size of the grid
  manager.width = size;
  manager.height = size;
  manager.inputManager = new InputManager;
  manager.scoreManager = new ScoreManager;
  manager.actuator = new Actuator;
  var documentLike = resolveSessionInitDocumentLike(manager);
  manager.timerContainer = documentLike
    ? (documentLike.querySelector(".timer-container") || resolveManagerElementById(manager, "timer"))
    : null;
  manager.cornerRateEl = null;
  manager.cornerIpsEl = null;
}

function initializeGameManagerRuntimeState(manager) {
  if (!manager) return;
  manager.startTiles = 2;
  manager.maxTile = Infinity;
  manager.mode = detectMode(manager);
  manager.modeConfig = null;
  manager.ruleset = "pow2";
  manager.spawnTable = [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  manager.rankedBucket = "none";
  manager.disableSessionSync = false;
  manager.sessionSubmitDone = false;
  manager.sessionReplayV3 = null;
  manager.timerModuleView = "timer";
  manager.timerLeaderboardLoadId = 0;
  manager.timerModuleBaseHeight = 0;
  manager.timerUpdateIntervalMs = 10;
  manager.lastStatsPanelUpdateAt = 0;
  manager.pendingMoveInput = null;
  manager.moveInputFlushScheduled = false;
  manager.lastMoveInputAt = 0;
  manager.practiceRestartBoardMatrix = null;
  manager.practiceRestartModeConfig = null;
}

function bindGameManagerInputEvents(manager) {
  if (!manager || !manager.inputManager) return;
  var managerForInput = manager;
  manager.inputManager.on("move", function (direction) {
    handleMoveInput(managerForInput, direction);
  });
  manager.inputManager.on("restart", manager.restart.bind(manager));
  manager.inputManager.on("keepPlaying", manager.keepPlaying.bind(manager));
}

function bindGameManagerSavedStatePersistence(manager) {
  if (!manager) return;
  var windowLikeForPersistence = manager.getWindowLike();
  if (!(windowLikeForPersistence && !manager.savedGameStateBound)) return;
  var saveHandler = function () {
    saveGameState(manager, { force: true });
  };
  windowLikeForPersistence.addEventListener("beforeunload", saveHandler);
  windowLikeForPersistence.addEventListener("pagehide", saveHandler);
  manager.savedGameStateBound = true;
}

function initializeGameManagerUi(manager) {
  if (!manager) return;
  manager.undoStack = [];
  initCornerStatsUi(manager);
  initStatsPanelUi(manager);
}

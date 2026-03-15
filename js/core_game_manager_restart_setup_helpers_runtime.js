function restartGame(manager) {
  if (!manager) return;
  if (!confirm("是否确认开始新游戏?")) return;
  manager.actuator.continue();
  manager.undoStack = [];
  manager.redoStack = [];
  manager.clearSavedGameState(manager.modeKey);
  if (manager.modeKey === "practice" && manager.practiceRestartBoardMatrix) {
    if (shouldClearPracticeBoardOnRestart(manager)) {
      restartWithBoard(
        manager,
        createEmptyPracticeBoardMatrix(manager),
        manager.practiceRestartModeConfig || manager.modeConfig,
        { setPracticeRestartBase: true }
      );
      manager.isTestMode = true;
      return;
    }
    restartWithBoard(
      manager,
      manager.practiceRestartBoardMatrix,
      manager.practiceRestartModeConfig || manager.modeConfig,
      { preservePracticeRestartBase: true }
    );
    manager.isTestMode = true;
    return;
  }
  manager.setup(undefined, { disableStateRestore: true });
}

function createEmptyPracticeBoardMatrix(manager) {
  var width = Number.isInteger(manager && manager.width) && manager.width > 0 ? manager.width : 4;
  var height = Number.isInteger(manager && manager.height) && manager.height > 0 ? manager.height : width;
  var board = [];
  for (var y = 0; y < height; y++) {
    var row = [];
    for (var x = 0; x < width; x++) {
      row.push(0);
    }
    board.push(row);
  }
  return board;
}

function areBoardMatricesEqual(boardA, boardB) {
  if (!Array.isArray(boardA) || !Array.isArray(boardB)) return false;
  if (boardA.length !== boardB.length) return false;
  for (var y = 0; y < boardA.length; y++) {
    var rowA = Array.isArray(boardA[y]) ? boardA[y] : [];
    var rowB = Array.isArray(boardB[y]) ? boardB[y] : [];
    if (rowA.length !== rowB.length) return false;
    for (var x = 0; x < rowA.length; x++) {
      if (Number(rowA[x]) !== Number(rowB[x])) return false;
    }
  }
  return true;
}

function shouldClearPracticeBoardOnRestart(manager) {
  if (!manager || manager.modeKey !== "practice") return false;
  if (manager.hasGameStarted) return false;
  if (!Array.isArray(manager.practiceRestartBoardMatrix)) return false;
  return areBoardMatricesEqual(getFinalBoardMatrix(manager), manager.practiceRestartBoardMatrix);
}

function restartWithSeed(manager, seed, modeConfig) {
  if (!manager) return;
  manager.actuator.continue();
  manager.setup(seed, { modeConfig: modeConfig, disableStateRestore: true }); // Force setup with specific seed
}

function createRestartWithBoardSetupArgs(modeConfig, normalizedOptions) {
  return {
    setupSeed: normalizedOptions.asReplay ? 0 : undefined,
    setupOptions: {
      skipStartTiles: true,
      modeConfig: modeConfig,
      disableStateRestore: true
    }
  };
}

function shouldPersistPracticeRestartBase(manager, normalizedOptions) {
  if (!manager) return false;
  if (manager.modeKey !== "practice") return false;
  if (!(normalizedOptions.setPracticeRestartBase || normalizedOptions.preservePracticeRestartBase)) return false;
  return Array.isArray(manager.initialBoardMatrix) && manager.initialBoardMatrix.length === manager.height;
}

function applyPracticeRestartBaseFromCurrentBoard(manager, modeConfig) {
  if (!manager) return;
  manager.practiceRestartBoardMatrix = cloneBoardMatrix(manager.initialBoardMatrix);
  manager.practiceRestartModeConfig = modeConfig
    ? manager.clonePlain(modeConfig)
    : manager.clonePlain(manager.modeConfig);
}

function restartWithBoard(manager, board, modeConfig, options) {
  if (!manager) return;
  var normalizedOptions = isNonArrayObject(options) ? options : {};
  manager.actuator.continue();
  var setupArgs = createRestartWithBoardSetupArgs(modeConfig, normalizedOptions);
  manager.setup(setupArgs.setupSeed, setupArgs.setupOptions);
  setBoardFromMatrix(manager, board);
  if (manager.modeKey === "practice" && !normalizedOptions.asReplay && typeof applyPracticeSetupTimerStateFromBoard === "function") {
    applyPracticeSetupTimerStateFromBoard(manager, board);
  }
  manager.initialBoardMatrix = getFinalBoardMatrix(manager);
  manager.replayStartBoardMatrix = cloneBoardMatrix(manager.initialBoardMatrix);
  if (shouldPersistPracticeRestartBase(manager, normalizedOptions)) {
    applyPracticeRestartBaseFromCurrentBoard(manager, modeConfig);
  }
  manager.actuate();
}

function initializeSetupSeedAndReplayState(manager, inputSeed) {
  if (!manager) return { hasInputSeed: false };
  var hasInputSeed = typeof inputSeed !== "undefined";
  if (hasInputSeed) manager.replayIndex = 0;
  manager.initialSeed = hasInputSeed ? inputSeed : Math.random();
  manager.seed = manager.initialSeed;
  manager.replayMode = hasInputSeed;
  if (!hasInputSeed) manager.disableSessionSync = false;
  return { hasInputSeed: hasInputSeed };
}

function resolveSetupChallengeId(manager, normalizedOptions) {
  if (!manager) return null;
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

function resolveReplayModeTagFromModeKey(modeKey, fallbackMode) {
  var key = typeof modeKey === "string" && modeKey ? modeKey : fallbackMode || "";
  if (key && key.indexOf("capped") !== -1) return "capped";
  if (key && key.indexOf("practice") !== -1) return "practice";
  return "classic";
}

function initializeSetupSessionReplaySnapshot(manager) {
  if (!manager) return;
  manager.sessionReplayV3 = {
    v: 3,
    mode: resolveReplayModeTagFromModeKey(manager.modeKey, manager.mode),
    mode_key: manager.modeKey,
    board_width: manager.width,
    board_height: manager.height,
    ruleset: manager.ruleset,
    undo_enabled: !!manager.modeConfig.undo_enabled,
    mode_family: manager.modeFamily,
    rank_policy: manager.rankPolicy,
    special_rules_snapshot: manager.clonePlain(manager.specialRules || {}),
    challenge_id: manager.challengeId,
    seed: manager.initialSeed,
    actions: []
  };
}

function resetSetupReplayAndSpawnState(manager) {
  manager.moveHistory = [];
  manager.replayCompactLog = "";
  manager.initialBoardMatrix = null;
  manager.replayStartBoardMatrix = null;
  manager.sessionSubmitDone = false;
  manager.lastSpawn = null;
  manager.forcedSpawn = null;
}

function resetSetupTimerAndInputState(manager) {
  manager.timerStatus = 0;
  manager.startTime = null;
  manager.timerID = null;
  manager.time = 0;
  manager.accumulatedTime = 0;
  manager.pendingMoveInput = null;
  manager.moveInputFlushScheduled = false;
  manager.lastMoveInputAt = 0;
  manager.moveDeadlineAt = null;
}

function resetSetupRuntimeState(manager) {
  if (!manager) return;
  resetSetupReplayAndSpawnState(manager);
  manager.reached32k = false;
  manager.isTestMode = false;
  manager.cappedMilestoneCount = 0;
  resetSetupTimerAndInputState(manager);
  manager.sessionStartedAt = Date.now();
  manager.hasGameStarted = false;
}

function normalizeTimerModuleViewByCore(viewByCore) {
  if (viewByCore === "hidden") return "hidden";
  return viewByCore === "timer" ? "timer" : undefined;
}

function resolveTimerModuleViewFallback(timerModuleViewMap, mode) {
  var value = isNonArrayObject(timerModuleViewMap) ? timerModuleViewMap[mode] : null;
  return value === "hidden" ? "hidden" : "timer";
}

function resolvePreferredTimerModuleViewForSetup(manager) {
  if (!manager) return "timer";
  var timerModuleViewMap = manager.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  var timerModuleViewCoreCallResult = callCoreStorageRuntime(manager, "readTimerModuleViewForModeFromMap", {
    map: timerModuleViewMap,
    mode: manager.mode
  }, false);
  return manager.resolveNormalizedCoreValueOrFallback(
    timerModuleViewCoreCallResult,
    function (viewByCore) {
      return normalizeTimerModuleViewByCore(viewByCore);
    },
    function () {
      return resolveTimerModuleViewFallback(timerModuleViewMap, manager.mode);
    }
  );
}

function shouldTryRestoreSavedStateInSetup(manager, hasInputSeed, normalizedOptions) {
  if (!manager) return false;
  var skipStartTiles = !!normalizedOptions.skipStartTiles;
  if (hasInputSeed || skipStartTiles || normalizedOptions.disableStateRestore) return false;
  return shouldUseSavedGameState(manager);
}

function seedInitialTilesAndSnapshotBoard(manager) {
  for (var startIndex = 0; startIndex < manager.startTiles; startIndex++) {
    manager.addRandomTile();
  }
  manager.initialBoardMatrix = manager.getFinalBoardMatrix();
}

function placeStoneTilesForSetup(manager) {
  if (!(manager && manager.grid && Array.isArray(manager.stoneCellsList))) return;
  if (!manager.stoneCellsList.length) return;
  if (!isNonArrayObject(manager.stoneValueSet)) manager.stoneValueSet = {};
  for (var i = 0; i < manager.stoneCellsList.length; i++) {
    var point = manager.stoneCellsList[i];
    if (!isNonArrayObject(point)) continue;
    var x = Number(point.x);
    var y = Number(point.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (x < 0 || x >= manager.width || y < 0 || y >= manager.height) continue;
    if (manager.isBlockedCell(x, y)) continue;
    var cell = { x: x, y: y };
    if (!manager.grid.cellAvailable(cell)) continue;
    var value = resolveStoneMarkerValue(i);
    var tile = new Tile(cell, value);
    tile.isStone = true;
    manager.grid.insertTile(tile);
    manager.stoneValueSet[String(value)] = true;
  }
}

function resolveSetupRestoreAndInitialBoardState(manager, hasInputSeed, normalizedOptions) {
  if (!manager) return { restoredFromSavedState: false };
  var restoredFromSavedState = false;
  var skipStartTiles = !!normalizedOptions.skipStartTiles;
  if (shouldTryRestoreSavedStateInSetup(manager, hasInputSeed, normalizedOptions)) {
    restoredFromSavedState = tryRestoreLatestSavedState(manager);
  }
  if (!skipStartTiles && !restoredFromSavedState) {
    placeStoneTilesForSetup(manager);
    seedInitialTilesAndSnapshotBoard(manager);
  }
  return { restoredFromSavedState: restoredFromSavedState };
}

function finalizeSetupUiAndStatsState(manager, preferredTimerModuleView, restoredFromSavedState) {
  if (!manager) return;
  refreshSpawnRateDisplay(manager);
  manager.updateUndoUiState();
  manager.notifyUndoSettingsStateChanged();
  manager.applyTimerModuleView(preferredTimerModuleView, true);
  manager.actuate();
  if (typeof updateItemModeHud === "function") {
    updateItemModeHud(manager);
  }
  if (typeof resetMoveTimeoutDeadline === "function") {
    resetMoveTimeoutDeadline(manager, Date.now());
  }
  if (
    typeof hasMoveTimeoutMode === "function" &&
    hasMoveTimeoutMode(manager) &&
    !manager.replayMode &&
    manager.timerStatus === 0
  ) {
    manager.startTimer();
  }
  if (typeof updateMoveTimeoutHud === "function") {
    updateMoveTimeoutHud(manager, Date.now());
  }
  if (restoredFromSavedState) {
    manager.updateStatsPanel();
  } else {
    manager.updateStatsPanel(0, 0, 0);
  }
}

function runSetupStateInitialization(manager, inputSeed, setupOptions) {
  if (!manager) return;
  var normalizedOptions = isNonArrayObject(setupOptions) ? setupOptions : {};
  var seedState = initializeSetupSeedAndReplayState(manager, inputSeed);
  resetSetupRuntimeState(manager);
  manager.challengeId = resolveSetupChallengeId(manager, normalizedOptions);
  initializeSetupSessionReplaySnapshot(manager);
  initializeTimerMilestones(manager);
  resetRoundStatsState(manager);
  resetTimerUiForSetup(manager);
  var preferredTimerModuleView = resolvePreferredTimerModuleViewForSetup(manager);
  var restoreState = resolveSetupRestoreAndInitialBoardState(
    manager,
    seedState.hasInputSeed,
    normalizedOptions
  );
  finalizeSetupUiAndStatsState(manager, preferredTimerModuleView, restoreState.restoredFromSavedState);
}

function resolveGlobalSetupModeConfig(manager) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  var modeConfig = windowLike ? windowLike.GAME_MODE_CONFIG : null;
  if (!isNonArrayObject(modeConfig)) return null;
  try {
    return manager.clonePlain(modeConfig);
  } catch (_err) {
    return null;
  }
}

function resolveSetupModeConfig(manager, setupOptions, detectedMode) {
  var optionConfig = setupOptions && setupOptions.modeConfig;
  var globalModeConfig = resolveGlobalSetupModeConfig(manager);
  return optionConfig || globalModeConfig || manager.resolveModeConfig(detectedMode);
}

function setupGame(manager, inputSeed, options) {
  if (!manager) return;
  var setupOptions = isNonArrayObject(options) ? options : {};
  var detectedMode = detectMode(manager);
  var resolvedModeConfig = resolveSetupModeConfig(manager, setupOptions, detectedMode);
  var cfg = manager.normalizeModeConfig(resolvedModeConfig && resolvedModeConfig.key, resolvedModeConfig);
  applySetupModeConfig(manager, cfg);
  manager.grid = new Grid(manager.width, manager.height);
  manager.score = 0;
  manager.over = false;
  manager.won = false;
  manager.keepPlaying = false;
  runSetupStateInitialization(manager, inputSeed, setupOptions);
}

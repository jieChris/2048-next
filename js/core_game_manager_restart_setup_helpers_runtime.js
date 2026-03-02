function confirmRestartGame() {
  return confirm("是否确认开始新游戏?");
}

function isRestartSetupRecordObject(value) {
  return !!value && typeof value === "object";
}

function normalizeRestartSetupOptions(options) {
  return isRestartSetupRecordObject(options) ? options : {};
}

function prepareRestartSessionState(manager) {
  if (!manager) return;
  manager.actuator.continue();
  manager.undoStack = [];
  manager.clearSavedGameState(manager.modeKey);
}

function tryRestartPracticeFromSavedBase(manager) {
  if (!manager) return false;
  if (!(manager.modeKey === "practice_legacy" && manager.practiceRestartBoardMatrix)) return false;
  manager.restartWithBoard(
    manager.practiceRestartBoardMatrix,
    manager.practiceRestartModeConfig || manager.modeConfig,
    { preservePracticeRestartBase: true }
  );
  manager.isTestMode = true;
  return true;
}

function restartWithFreshSetup(manager) {
  if (!manager) return;
  manager.setup(undefined, { disableStateRestore: true });
}

function restartGame(manager) {
  if (!manager) return;
  if (!confirmRestartGame()) return;
  prepareRestartSessionState(manager);
  if (tryRestartPracticeFromSavedBase(manager)) return;
  restartWithFreshSetup(manager);
}

function restartWithSeed(manager, seed, modeConfig) {
  if (!manager) return;
  manager.actuator.continue();
  manager.setup(seed, { modeConfig: modeConfig, disableStateRestore: true }); // Force setup with specific seed
}

function hydrateRestartBoardState(manager, board) {
  if (!manager) return;
  manager.setBoardFromMatrix(board);
  manager.initialBoardMatrix = getFinalBoardMatrix(manager);
  manager.replayStartBoardMatrix = manager.cloneBoardMatrix(manager.initialBoardMatrix);
}

function syncPracticeRestartBase(manager, modeConfig, options) {
  if (!manager) return;
  var normalizedOptions = normalizeRestartSetupOptions(options);
  if (!(manager.modeKey === "practice_legacy" && (normalizedOptions.setPracticeRestartBase || normalizedOptions.preservePracticeRestartBase))) {
    return;
  }
  if (!(Array.isArray(manager.initialBoardMatrix) && manager.initialBoardMatrix.length === manager.height)) {
    return;
  }
  manager.practiceRestartBoardMatrix = manager.cloneBoardMatrix(manager.initialBoardMatrix);
  manager.practiceRestartModeConfig = modeConfig
    ? manager.clonePlain(modeConfig)
    : manager.clonePlain(manager.modeConfig);
}

function resolveRestartWithBoardSetupSeed(options) {
  var normalizedOptions = normalizeRestartSetupOptions(options);
  // Non-replay board restores must keep undo enabled; replay restores keep replay mode.
  return normalizedOptions.asReplay ? 0 : undefined;
}

function buildRestartWithBoardSetupOptions(modeConfig) {
  return {
    skipStartTiles: true,
    modeConfig: modeConfig,
    disableStateRestore: true
  };
}

function restartWithBoard(manager, board, modeConfig, options) {
  if (!manager) return;
  var normalizedOptions = normalizeRestartSetupOptions(options);
  manager.actuator.continue();
  var setupSeed = resolveRestartWithBoardSetupSeed(normalizedOptions);
  var setupOptions = buildRestartWithBoardSetupOptions(modeConfig);
  manager.setup(setupSeed, setupOptions);
  hydrateRestartBoardState(manager, board);
  syncPracticeRestartBase(manager, modeConfig, normalizedOptions);
  manager.actuate();
}

function restartReplaySession(manager, payload, modeConfig, useBoardRestart) {
  if (!manager) return;
  if (useBoardRestart) {
    restartWithBoard(manager, payload, modeConfig, { asReplay: true });
    return;
  }
  restartWithSeed(manager, payload, modeConfig);
}

function resolveGlobalModeConfigOverride(manager) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  var modeConfig = windowLike ? windowLike.GAME_MODE_CONFIG : null;
  if (!isRestartSetupRecordObject(modeConfig)) {
    return null;
  }
  try {
    return manager.clonePlain(modeConfig);
  } catch (_err) {
    return null;
  }
}

function resolveSetupModeConfigSource(manager, setupOptions, detectedMode, globalModeConfig) {
  if (!manager) return null;
  var optionConfig = setupOptions && setupOptions.modeConfig;
  return optionConfig || globalModeConfig || manager.resolveModeConfig(detectedMode);
}

function resolveSetupModeConfig(manager, setupOptions) {
  if (!manager) return null;
  var detectedMode = detectMode(manager);
  var globalModeConfig = resolveGlobalModeConfigOverride(manager);
  var resolvedModeConfig = resolveSetupModeConfigSource(manager, setupOptions, detectedMode, globalModeConfig);
  return manager.normalizeModeConfig(resolvedModeConfig && resolvedModeConfig.key, resolvedModeConfig);
}

function finalizeSetupState(manager, preferredTimerModuleView, restoredFromSavedState) {
  if (!manager) return;
  syncSetupUiAfterStateRestore(manager, preferredTimerModuleView);
  manager.actuate();
  if (restoredFromSavedState) {
    manager.updateStatsPanel();
  } else {
    manager.updateStatsPanel(0, 0, 0);
  }
}

function resetSetupRoundState(manager) {
  if (!manager) return;
  manager.grid = new Grid(manager.width, manager.height);
  manager.score = 0;
  manager.over = false;
  manager.won = false;
  manager.keepPlaying = false;
}

function initializeSetupUiState(manager) {
  if (!manager) return;
  initializeTimerMilestones(manager);
  resetRoundStatsState(manager);
  resetTimerUiForSetup(manager);
}

function resolveSetupRestoreState(manager, setupOptions, hasInputSeed) {
  if (!manager) return createDefaultSetupRestoreState();
  var preferredTimerModuleView = resolvePreferredTimerModuleView(manager);
  var restoredFromSavedState = restoreOrInitBoardState.call(manager, setupOptions, hasInputSeed);
  return {
    preferredTimerModuleView: preferredTimerModuleView,
    restoredFromSavedState: restoredFromSavedState
  };
}

function createDefaultSetupRestoreState() {
  return {
    preferredTimerModuleView: "timer",
    restoredFromSavedState: false
  };
}

function runSetupStateInitialization(manager, inputSeed, setupOptions) {
  if (!manager) return;
  var hasInputSeed = initializeSessionState(manager, inputSeed, setupOptions);
  initializeSetupUiState(manager);
  var restoreState = resolveSetupRestoreState(manager, setupOptions, hasInputSeed);
  finalizeSetupState(manager, restoreState.preferredTimerModuleView, restoreState.restoredFromSavedState);
}

function setupGame(manager, inputSeed, options) {
  if (!manager) return;
  var setupOptions = normalizeRestartSetupOptions(options);
  var cfg = resolveSetupModeConfig(manager, setupOptions);
  applySetupModeConfig(manager, cfg);
  resetSetupRoundState(manager);
  runSetupStateInitialization(manager, inputSeed, setupOptions);
}

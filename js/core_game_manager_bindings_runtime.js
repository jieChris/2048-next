function createGameManagerCoreRuntimeAccessorDefs() {
  return [
  [
    "callCoreStorageRuntime",
    "resolveCoreStorageRuntimeMethod",
    "getCoreGameSettingsStorageRuntime",
    "CoreGameSettingsStorageRuntime"
  ],
  ["callCoreModeRuntime", "resolveCoreModeRuntimeMethod", "getCoreModeRuntime", "CoreModeRuntime"],
  ["callCoreRulesRuntime", "resolveCoreRulesRuntimeMethod", "getCoreRulesRuntime", "CoreRulesRuntime"],
  [
    "callCoreReplayCodecRuntime",
    "resolveCoreReplayCodecRuntimeMethod",
    "getCoreReplayCodecRuntime",
    "CoreReplayCodecRuntime"
  ],
  [
    "callCoreReplayV4ActionsRuntime",
    "resolveCoreReplayV4ActionsRuntimeMethod",
    "getCoreReplayV4ActionsRuntime",
    "CoreReplayV4ActionsRuntime"
  ],
  [
    "callCoreReplayImportRuntime",
    "resolveCoreReplayImportRuntimeMethod",
    "getCoreReplayImportRuntime",
    "CoreReplayImportRuntime"
  ],
  [
    "callCoreReplayExecutionRuntime",
    "resolveCoreReplayExecutionRuntimeMethod",
    "getCoreReplayExecutionRuntime",
    "CoreReplayExecutionRuntime"
  ],
  [
    "callCoreReplayDispatchRuntime",
    "resolveCoreReplayDispatchRuntimeMethod",
    "getCoreReplayDispatchRuntime",
    "CoreReplayDispatchRuntime"
  ],
  [
    "callCoreReplayLifecycleRuntime",
    "resolveCoreReplayLifecycleRuntimeMethod",
    "getCoreReplayLifecycleRuntime",
    "CoreReplayLifecycleRuntime"
  ],
  [
    "callCoreReplayTimerRuntime",
    "resolveCoreReplayTimerRuntimeMethod",
    "getCoreReplayTimerRuntime",
    "CoreReplayTimerRuntime"
  ],
  [
    "callCoreReplayFlowRuntime",
    "resolveCoreReplayFlowRuntimeMethod",
    "getCoreReplayFlowRuntime",
    "CoreReplayFlowRuntime"
  ],
  [
    "callCoreReplayControlRuntime",
    "resolveCoreReplayControlRuntimeMethod",
    "getCoreReplayControlRuntime",
    "CoreReplayControlRuntime"
  ],
  [
    "callCoreReplayLoopRuntime",
    "resolveCoreReplayLoopRuntimeMethod",
    "getCoreReplayLoopRuntime",
    "CoreReplayLoopRuntime"
  ],
  [
    "callCoreReplayLegacyRuntime",
    "resolveCoreReplayLegacyRuntimeMethod",
    "getCoreReplayLegacyRuntime",
    "CoreReplayLegacyRuntime"
  ],
  [
    "callCoreMoveApplyRuntime",
    "resolveCoreMoveApplyRuntimeMethod",
    "getCoreMoveApplyRuntime",
    "CoreMoveApplyRuntime"
  ],
  [
    "callCorePostMoveRecordRuntime",
    "resolveCorePostMoveRecordRuntimeMethod",
    "getCorePostMoveRecordRuntime",
    "CorePostMoveRecordRuntime"
  ],
  [
    "callCorePostUndoRecordRuntime",
    "resolveCorePostUndoRecordRuntimeMethod",
    "getCorePostUndoRecordRuntime",
    "CorePostUndoRecordRuntime"
  ],
  [
    "callCoreUndoRestoreRuntime",
    "resolveCoreUndoRestoreRuntimeMethod",
    "getCoreUndoRestoreRuntime",
    "CoreUndoRestoreRuntime"
  ],
  [
    "callCoreUndoSnapshotRuntime",
    "resolveCoreUndoSnapshotRuntimeMethod",
    "getCoreUndoSnapshotRuntime",
    "CoreUndoSnapshotRuntime"
  ],
  [
    "callCoreUndoStackEntryRuntime",
    "resolveCoreUndoStackEntryRuntimeMethod",
    "getCoreUndoStackEntryRuntime",
    "CoreUndoStackEntryRuntime"
  ],
  [
    "callCoreUndoTileSnapshotRuntime",
    "resolveCoreUndoTileSnapshotRuntimeMethod",
    "getCoreUndoTileSnapshotRuntime",
    "CoreUndoTileSnapshotRuntime"
  ],
  [
    "callCoreUndoTileRestoreRuntime",
    "resolveCoreUndoTileRestoreRuntimeMethod",
    "getCoreUndoTileRestoreRuntime",
    "CoreUndoTileRestoreRuntime"
  ],
  [
    "callCoreUndoRestorePayloadRuntime",
    "resolveCoreUndoRestorePayloadRuntimeMethod",
    "getCoreUndoRestorePayloadRuntime",
    "CoreUndoRestorePayloadRuntime"
  ],
  [
    "callCoreMergeEffectsRuntime",
    "resolveCoreMergeEffectsRuntimeMethod",
    "getCoreMergeEffectsRuntime",
    "CoreMergeEffectsRuntime"
  ],
  [
    "callCoreSpecialRulesRuntime",
    "resolveCoreSpecialRulesRuntimeMethod",
    "getCoreSpecialRulesRuntime",
    "CoreSpecialRulesRuntime"
  ],
  [
    "callCoreGridScanRuntime",
    "resolveCoreGridScanRuntimeMethod",
    "getCoreGridScanRuntime",
    "CoreGridScanRuntime"
  ],
  [
    "callCoreDirectionLockRuntime",
    "resolveCoreDirectionLockRuntimeMethod",
    "getCoreDirectionLockRuntime",
    "CoreDirectionLockRuntime"
  ],
  [
    "callCoreScoringRuntime",
    "resolveCoreScoringRuntimeMethod",
    "getCoreScoringRuntime",
    "CoreScoringRuntime"
  ],
  [
    "callCorePostMoveRuntime",
    "resolveCorePostMoveRuntimeMethod",
    "getCorePostMoveRuntime",
    "CorePostMoveRuntime"
  ],
  [
    "callCorePrettyTimeRuntime",
    "resolveCorePrettyTimeRuntimeMethod",
    "getCorePrettyTimeRuntime",
    "CorePrettyTimeRuntime"
  ],
  [
    "callCoreMovePathRuntime",
    "resolveCoreMovePathRuntimeMethod",
    "getCoreMovePathRuntime",
    "CoreMovePathRuntime"
  ],
  [
    "callCoreMoveScanRuntime",
    "resolveCoreMoveScanRuntimeMethod",
    "getCoreMoveScanRuntime",
    "CoreMoveScanRuntime"
  ],
  [
    "callCoreTimerIntervalRuntime",
    "resolveCoreTimerIntervalRuntimeMethod",
    "getCoreTimerIntervalRuntime",
    "CoreTimerIntervalRuntime"
  ]
];
}


function bindGameManagerPrototypeRuntime() {
GameManager.prototype.encodeReplay128 = function (code) {
  return encodeReplay128(this, code);
};

GameManager.prototype.decodeReplay128 = function (char) {
  return decodeReplay128(this, char);
};

GameManager.prototype.setBoardFromMatrix = function (board) {
  setBoardFromMatrix(this, board);
};

GameManager.prototype.cloneBoardMatrix = function (board) {
  return cloneBoardMatrix(board);
};

GameManager.prototype.resolveCoreObjectCallOrFallback = function (coreCallResult, fallbackResolver) {
  return resolveCoreObjectCallOrFallback(this, coreCallResult, fallbackResolver);
};

GameManager.prototype.isCoreCallAvailable = function (coreCallResult) {
  return isCoreCallAvailable(coreCallResult);
};

GameManager.prototype.resolveCoreBooleanCallOrFallback = function (coreCallResult, fallbackResolver) {
  return resolveCoreBooleanCallOrFallback(this, coreCallResult, fallbackResolver);
};

GameManager.prototype.resolveCoreNumericCallOrFallback = function (coreCallResult, fallbackResolver) {
  return resolveCoreNumericCallOrFallback(this, coreCallResult, fallbackResolver);
};

GameManager.prototype.resolveCoreStringCallOrFallback = function (coreCallResult, fallbackResolver, allowEmpty) {
  return resolveCoreStringCallOrFallback(this, coreCallResult, fallbackResolver, allowEmpty);
};

GameManager.prototype.resolveNormalizedCoreValueOrUndefined = function (coreCallResult, normalizer) {
  return resolveNormalizedCoreValueOrUndefined(this, coreCallResult, normalizer);
};

GameManager.prototype.resolveNormalizedCoreValueOrFallback = function (
  coreCallResult,
  normalizer,
  fallbackResolver
) {
  return resolveNormalizedCoreValueOrFallback(this, coreCallResult, normalizer, fallbackResolver);
};

GameManager.prototype.resolveNormalizedCoreValueOrFallbackAllowNull = function (
  coreCallResult,
  normalizer,
  fallbackResolver
) {
  return resolveNormalizedCoreValueOrFallbackAllowNull(this, coreCallResult, normalizer, fallbackResolver);
};

GameManager.prototype.resolveCoreRawCallValueOrUndefined = function (coreCallResult) {
  return resolveCoreRawCallValueOrUndefined(this, coreCallResult);
};

GameManager.prototype.tryHandleCoreRawValue = function (coreCallResult, handler) {
  return tryHandleCoreRawValue(this, coreCallResult, handler);
};

GameManager.prototype.isNonArrayObject = function (value) {
  return isNonArrayObject(value);
};

GameManager.prototype.createCoreModeDefaultsPayload = function (payload) {
  return createCoreModeDefaultsPayload(payload);
};

GameManager.prototype.createCoreModeContextPayload = function (payload) {
  return createCoreModeContextPayload(this, payload);
};


var GAME_MANAGER_CORE_RUNTIME_ACCESSOR_DEFS = createGameManagerCoreRuntimeAccessorDefs();

GameManager.prototype.resolveSavedGameStateStorageKey = function (keyPrefix, modeKey) {
  return resolveSavedGameStateStorageKey(this, keyPrefix, modeKey);
};

GameManager.prototype.getWebStorageByName = function (name) {
  return getWebStorageByName(name);
};

GameManager.prototype.getWindowLike = function () {
  return getWindowLike();
};

GameManager.prototype.resolveWindowMethod = function (methodName) {
  return resolveWindowMethod(this, methodName);
};

GameManager.prototype.callWindowMethod = function (methodName, args) {
  return callWindowMethod(this, methodName, args);
};

GameManager.prototype.resolveWindowNamespaceMethod = function (namespaceName, methodName) {
  return resolveWindowNamespaceMethod(this, namespaceName, methodName);
};

GameManager.prototype.callWindowNamespaceMethod = function (namespaceName, methodName, args) {
  return callWindowNamespaceMethod(this, namespaceName, methodName, args);
};

GameManager.prototype.requestAnimationFrame = function (callback) {
  return requestAnimationFrameByManager(this, callback);
};

GameManager.prototype.readLocalStorageJsonMap = function (key) {
  return readLocalStorageJsonMap(this, key);
};

GameManager.prototype.writeLocalStorageJsonPayload = function (key, payload) {
  return writeLocalStorageJsonPayload(this, key, payload);
};

GameManager.prototype.getSavedGameStateStorages = function () {
  return getSavedGameStateStorages(this);
};

GameManager.prototype.readSavedPayloadByKey = function (key) {
  return readSavedPayloadByKey(this, key);
};

GameManager.prototype.readWindowNameRaw = function () {
  return readWindowNameRaw(this);
};

GameManager.prototype.resolveWindowNameSavedPayloadMarker = function () {
  return resolveWindowNameSavedPayloadMarker();
};

GameManager.prototype.decodeWindowNameSavedMapPayload = function (encoded) {
  return decodeWindowNameSavedMapPayload(encoded);
};

GameManager.prototype.writeWindowNameSavedPayload = function (modeKey, payload) {
  return writeWindowNameSavedPayload(this, modeKey, payload);
};

GameManager.prototype.clearSavedGameState = function (modeKey) {
  clearSavedGameState(this, modeKey);
};

GameManager.prototype.createSavedDynamicTimerRow = function (rowState, cappedState) {
  return createSavedDynamicTimerRow(this, rowState, cappedState);
};

GameManager.prototype.normalizeCappedRepeatLegendClasses = function (cappedState) {
  normalizeCappedRepeatLegendClasses(this, cappedState);
};


GameManager.prototype.clonePlain = function (value) {
  return clonePlain(value);
};

GameManager.prototype.safeClonePlain = function (value, fallback) {
  return safeClonePlain(this, value, fallback);
};

GameManager.prototype.writeSavedGameStatePayload = function (key, payloadObj) {
  return writeSavedGameStatePayload(this, key, payloadObj);
};

GameManager.prototype.getModeConfigFromCatalog = function (modeKey) {
  return getModeConfigFromCatalog(this, modeKey);
};

registerCoreRuntimeAccessors(GAME_MANAGER_CORE_RUNTIME_ACCESSOR_DEFS);

GameManager.prototype.hasOwnKey = function (target, key) {
  return hasOwnKey(target, key);
};

GameManager.prototype.readOptionValue = function (options, key, fallbackValue) {
  return readOptionValue(this, options, key, fallbackValue);
};

GameManager.prototype.resolveUndoPolicyStateForMode = function (mode, options) {
  return resolveUndoPolicyStateForMode(this, mode, options);
};

GameManager.prototype.resolveLegacyAdapterBridgeMethod = function (methodName) {
  return resolveLegacyAdapterBridgeMethod(this, methodName);
};

GameManager.prototype.getAdapterSessionParitySnapshot = function (readerMethodName, cacheFieldName) {
  return getAdapterSessionParitySnapshot(this, readerMethodName, cacheFieldName);
};

GameManager.prototype.publishAdapterMoveResult = function (meta) {
  return publishAdapterMoveResult(this, meta);
};

GameManager.prototype.getUndoStateFallbackValues = function () {
  return getUndoStateFallbackValues(this);
};

GameManager.prototype.normalizeUndoStackEntry = function (entry) {
  return normalizeUndoStackEntry(this, entry);
};

GameManager.prototype.createUndoTileSnapshot = function (tile, target) {
  return createUndoTileSnapshot(this, tile, target);
};

GameManager.prototype.normalizeSpawnTable = function (spawnTable, ruleset) {
  return normalizeSpawnTable(this, spawnTable, ruleset);
};

GameManager.prototype.normalizeModeConfig = function (modeKey, rawConfig) {
  return normalizeModeConfig(this, modeKey, rawConfig);
};

GameManager.prototype.resolveModeConfig = function (modeId) {
  return resolveModeConfig(this, modeId);
};

GameManager.prototype.normalizeSpecialRules = function (rules) {
  return normalizeSpecialRules(this, rules);
};

GameManager.prototype.isBlockedCell = function (x, y) {
  return isBlockedCell(this, x, y);
};

GameManager.prototype.getLegacyModeFromModeKey = function (modeKey) {
  return getLegacyModeFromModeKey(this, modeKey);
};

GameManager.prototype.isFibonacciMode = function () {
  return isFibonacciMode(this);
};

GameManager.prototype.getTimerMilestoneValues = function () {
  return getTimerMilestoneValues(this);
};

GameManager.prototype.cloneResolvedCappedModeState = function (state) {
  return cloneResolvedCappedModeState(state);
};

GameManager.prototype.resolveCappedModeState = function () {
  return resolveCappedModeState(this);
};

GameManager.prototype.resolveProvidedCappedModeState = function (cappedState) {
  return resolveProvidedCappedModeState(this, cappedState);
};

GameManager.prototype.isCappedMode = function () {
  return this.resolveCappedModeState().isCappedMode;
};

GameManager.prototype.getCappedTargetValue = function () {
  return this.resolveCappedModeState().cappedTargetValue;
};

GameManager.prototype.isProgressiveCapped64Mode = function () {
  return this.resolveCappedModeState().isProgressiveCapped64Mode;
};

GameManager.prototype.getTimerRowEl = function (value) {
  return document.getElementById("timer-row-" + String(value));
};

GameManager.prototype.setTimerRowVisibleState = function (value, visible, keepSpace) {
  setTimerRowVisibleState(this, value, visible, keepSpace);
};

GameManager.prototype.setCapped64RowVisible = function (value, visible) {
  setCapped64RowVisible(this, value, visible);
};

GameManager.prototype.resolveProgressiveCapped64UnlockedState = function (unlockedState) {
  return resolveProgressiveCapped64UnlockedState(this, unlockedState);
};

GameManager.prototype.resetProgressiveCapped64Rows = function () {
  resetProgressiveCapped64Rows(this);
};

GameManager.prototype.isProgressiveCapped64UnlockValue = function (value) {
  return isProgressiveCapped64UnlockValue(value);
};

GameManager.prototype.resolveCappedTargetValueOrNull = function (cappedTargetValue) {
  return resolveCappedTargetValueOrNull(this, cappedTargetValue);
};

GameManager.prototype.getCappedTimerLegendClass = function (cappedTargetValue) {
  return getCappedTimerLegendClass(this, cappedTargetValue);
};

GameManager.prototype.getCappedTimerFontSize = function (cappedTargetValue) {
  return getCappedTimerFontSize(this, cappedTargetValue);
};

GameManager.prototype.getCappedPlaceholderRowValues = function (cappedState) {
  return getCappedPlaceholderRowValues(this, cappedState);
};

GameManager.prototype.getCappedOverflowContainer = function (cappedState) {
  return getCappedOverflowContainer(this, cappedState);
};

GameManager.prototype.openStatsPanel = function () {
  openStatsPanel(this);
};

GameManager.prototype.closeStatsPanel = function () {
  closeStatsPanel(this);
};

GameManager.prototype.getTimerModuleViewMode = function () {
  return getTimerModuleViewMode(this);
};

GameManager.prototype.applyTimerModuleView = function (view, skipPersist) {
  applyTimerModuleView(this, view, skipPersist);
};

GameManager.prototype.setTimerModuleViewMode = function (view, skipPersist) {
  setTimerModuleViewMode(this, view, skipPersist);
};

GameManager.prototype.readUndoPolicyFieldForMode = function (mode, fieldName, fallbackValue) {
  return readUndoPolicyFieldForMode(this, mode, fieldName, fallbackValue);
};

GameManager.prototype.getForcedUndoSettingForMode = function (mode) {
  return getForcedUndoSettingForMode(this, mode);
};

GameManager.prototype.isUndoAllowedByMode = function (mode) {
  return isUndoAllowedByMode(this, mode);
};

GameManager.prototype.isUndoSettingFixedForMode = function (mode) {
  return isUndoSettingFixedForMode(this, mode);
};

GameManager.prototype.resolveUndoPolicyStateForCurrentSessionMode = function (mode) {
  return resolveUndoPolicyStateForCurrentSessionMode(this, mode);
};

GameManager.prototype.canToggleUndoSetting = function (mode) {
  return canToggleUndoSetting(this, mode);
};

GameManager.prototype.notifyUndoSettingsStateChanged = function () {
  notifyUndoSettingsStateChanged(this);
};

GameManager.prototype.loadUndoSettingForMode = function (mode) {
  return loadUndoSettingForMode(this, mode);
};

GameManager.prototype.isUndoInteractionEnabled = function () {
  return isUndoInteractionEnabled(this);
};

GameManager.prototype.updateUndoUiState = function (resolvedState) {
  updateUndoUiState(this, resolvedState);
};

GameManager.prototype.getSpawnStatPair = function () {
  return getSpawnStatPair(this);
};


GameManager.prototype.getActualSecondaryRate = function () {
  return getActualSecondaryRate(this);
};


GameManager.prototype.getActualFourRate = function () {
  return getActualFourRate(this);
};


GameManager.prototype.setStatsPanelFieldText = function (fieldId, value) {
  setStatsPanelFieldText(fieldId, value);
};


GameManager.prototype.updateStatsPanel = function (totalSteps, moveSteps, undoSteps) {
  var context = buildStatsPanelUpdateContext(this, totalSteps, moveSteps, undoSteps);
  applyStatsPanelUpdateContext(this, context);
};

GameManager.prototype.computeStepStats = function () {
  return computeStepStats(this);
};

// Restart the game
GameManager.prototype.restart = function () {
  restartGame(this);
};

GameManager.prototype.restartWithSeed = function (seed, modeConfig) {
  restartWithSeed(this, seed, modeConfig);
};

GameManager.prototype.restartWithBoard = function (board, modeConfig, options) {
  restartWithBoard(this, board, modeConfig, options);
};

GameManager.prototype.restartReplaySession = function (payload, modeConfig, useBoardRestart) {
  restartReplaySession(this, payload, modeConfig, useBoardRestart);
};


// Keep playing after winning
GameManager.prototype.keepPlaying = function () {
  keepPlaying(this);
};


GameManager.prototype.clearTransientTileVisualState = function () {
  clearTransientTileVisualState(this);
};

GameManager.prototype.isGameTerminated = function () {
  return isGameTerminated(this);
};


// Set up the game
GameManager.prototype.setup = function (inputSeed, options) {
  setupGame(this, inputSeed, options);
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  addRandomTile(this);
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  actuate(this);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  move(this, direction);
};

// Start the timer
GameManager.prototype.startTimer = function() {
  startTimer(this);
};

GameManager.prototype.stopTimer = function() {
  stopTimer(this);
};

GameManager.prototype.pretty = function(time) {
  return formatPrettyTime(this, time);
};



// Insert a custom tile (Test Board)
GameManager.prototype.insertCustomTile = function(x, y, value) {
    insertCustomTile(this, x, y, value);
};


GameManager.prototype.getFinalBoardMatrix = function () {
  return getFinalBoardMatrix(this);
};


GameManager.prototype.getDurationMs = function () {
  return getDurationMs(this);
};


GameManager.prototype.serializeV3 = function () {
  return serializeReplayV3(this);
};


GameManager.prototype.tryAutoSubmitOnGameOver = function () {
  tryAutoSubmitOnGameOver(this);
};


GameManager.prototype.isSessionTerminated = function () {
  return isSessionTerminated(this);
};


GameManager.prototype.serialize = function () {
  return serializeReplay(this);
};


GameManager.prototype.applyReplayImportActions = function (payload) {
  applyReplayImportActions(this, payload);
};


GameManager.prototype.import = function (replayString) {
  return importReplay(this, replayString);
};


GameManager.prototype.pause = function () {
  pauseReplay(this);
};


GameManager.prototype.resume = function () {
  resumeReplay(this);
};


GameManager.prototype.setSpeed = function (multiplier) {
  setReplaySpeed(this, multiplier);
};


GameManager.prototype.seek = function (targetIndex) {
  seekReplay(this, targetIndex);
};


GameManager.prototype.step = function (delta) {
  stepReplay(this, delta);
};

}

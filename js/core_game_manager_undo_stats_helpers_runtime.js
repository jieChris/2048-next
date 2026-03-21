function readUndoPolicyFieldForMode(manager, mode, fieldName, fallbackValue) {
  if (!manager) return fallbackValue;
  var state = manager.resolveUndoPolicyStateForMode(mode);
  if (!isUndoStatsRecordObject(state)) return fallbackValue;
  return manager.hasOwnKey(state, fieldName) ? state[fieldName] : fallbackValue;
}

function isUndoStatsRecordObject(value) {
  return !!value && typeof value === "object";
}

function normalizeUndoStatsRecordObject(value, fallbackValue) {
  if (isUndoStatsRecordObject(value)) return value;
  return typeof fallbackValue === "undefined" ? {} : fallbackValue;
}

function resolveUndoPolicyStateSnapshot(manager, resolvedState, mode) {
  if (!manager) return null;
  if (isUndoStatsRecordObject(resolvedState)) return resolvedState;
  return manager.resolveUndoPolicyStateForMode(mode || manager.mode);
}

function getForcedUndoSettingForMode(manager, mode) {
  if (!manager) return null;
  var forced = manager.readUndoPolicyFieldForMode(mode, "forcedUndoSetting", null);
  if (forced === true) return true;
  if (forced === false) return false;
  return null;
}

function isUndoAllowedByMode(manager, mode) {
  if (!manager) return false;
  return !!manager.readUndoPolicyFieldForMode(mode, "isUndoAllowedByMode", false);
}

function isUndoSettingFixedForMode(manager, mode) {
  if (!manager) return false;
  return !!manager.readUndoPolicyFieldForMode(mode, "isUndoSettingFixedForMode", false);
}

function resolveUndoPolicyStateForCurrentSessionMode(manager, mode) {
  if (!manager) return null;
  return manager.resolveUndoPolicyStateForMode(mode, {
    hasGameStarted: !!manager.hasGameStarted
  });
}

function canToggleUndoSetting(manager, mode) {
  if (!manager) return false;
  var state = manager.resolveUndoPolicyStateForCurrentSessionMode(mode);
  return !!(state && state.canToggleUndoSetting);
}

function notifyUndoSettingsStateChanged(manager) {
  if (!manager) return;
  manager.callWindowMethod("syncUndoSettingsUI");
}

function resolveUndoPolicyOptionsSnapshot(manager, options) {
  if (!manager) return { hasGameStarted: false, replayMode: false, undoLimit: null, undoUsed: 0, undoEnabled: false };
  var source = options;
  return {
    hasGameStarted: !!manager.readOptionValue(source, "hasGameStarted", !!manager.hasGameStarted),
    replayMode: !!manager.readOptionValue(source, "replayMode", !!manager.replayMode),
    undoLimit: manager.readOptionValue(source, "undoLimit", manager.undoLimit),
    undoUsed: manager.readOptionValue(source, "undoUsed", manager.undoUsed),
    undoEnabled: manager.readOptionValue(source, "undoEnabled", manager.undoEnabled)
  };
}

function resolveForcedUndoSettingFallbackByMode(modeConfig, targetMode) {
  if (modeConfig && typeof modeConfig.undo_enabled === "boolean") {
    return modeConfig.undo_enabled;
  }
  var modeId = (targetMode || "").toLowerCase();
  if (modeId === "capped" || modeId.indexOf("capped") !== -1) return false;
  if (modeId.indexOf("no_undo") !== -1 || modeId.indexOf("no-undo") !== -1) return false;
  if (modeId.indexOf("undo_only") !== -1 || modeId.indexOf("undo-only") !== -1) return true;
  return null;
}

function createUndoPolicyOptionsPayload(optionsSnapshot) {
  return {
    hasGameStarted: optionsSnapshot.hasGameStarted,
    replayMode: optionsSnapshot.replayMode,
    undoLimit: optionsSnapshot.undoLimit,
    undoUsed: optionsSnapshot.undoUsed,
    undoEnabled: optionsSnapshot.undoEnabled
  };
}

function buildUndoPolicyFallbackInput(forcedUndoSetting, optionsSnapshot) {
  var baseOptions = createUndoPolicyOptionsPayload(optionsSnapshot);
  return Object.assign({ forcedUndoSetting: forcedUndoSetting }, baseOptions);
}

function resolveUndoPolicyFallbackState(fallbackInput) {
  var isUndoAllowedByMode = fallbackInput.forcedUndoSetting !== false;
  var isUndoSettingFixedForMode = fallbackInput.forcedUndoSetting !== null;
  var canToggleUndoSetting = isUndoAllowedByMode && !isUndoSettingFixedForMode && !fallbackInput.hasGameStarted;
  var isUndoInteractionEnabled = !fallbackInput.replayMode && !(fallbackInput.undoLimit !== null && Number(fallbackInput.undoUsed) >= Number(fallbackInput.undoLimit)) && !!(fallbackInput.undoEnabled && isUndoAllowedByMode);
  return {
    forcedUndoSetting: fallbackInput.forcedUndoSetting,
    isUndoAllowedByMode: isUndoAllowedByMode,
    isUndoSettingFixedForMode: isUndoSettingFixedForMode,
    canToggleUndoSetting: canToggleUndoSetting,
    isUndoInteractionEnabled: isUndoInteractionEnabled
  };
}

function createUndoPolicyResolvePayload(targetMode, modeConfig, optionsSnapshot) {
  var baseOptions = createUndoPolicyOptionsPayload(optionsSnapshot);
  return Object.assign({ mode: targetMode, modeConfig: modeConfig }, baseOptions);
}

function resolveUndoPolicyStateFallback(modeConfig, targetMode, optionsSnapshot) {
  var forcedUndoSetting = resolveForcedUndoSettingFallbackByMode(modeConfig || null, targetMode);
  var fallbackInput = buildUndoPolicyFallbackInput(forcedUndoSetting, optionsSnapshot);
  return resolveUndoPolicyFallbackState(fallbackInput);
}

function createUndoPolicyResolveContext(manager, mode, options) {
  var targetMode = mode || manager.mode;
  return {
    targetMode: targetMode,
    modeConfig: manager.resolveModeConfig(targetMode),
    optionsSnapshot: resolveUndoPolicyOptionsSnapshot(manager, options)
  };
}

function normalizeUndoPolicyStateFromCore(computed) {
  return isUndoStatsRecordObject(computed) ? computed : undefined;
}

function resolveUndoPolicyStateForMode(manager, mode, options) {
  if (!manager) return null;
  var context = createUndoPolicyResolveContext(manager, mode, options);
  return resolveCorePayloadCallWith(manager, "callCoreModeRuntime", "resolveUndoPolicyState", createUndoPolicyResolvePayload(context.targetMode, context.modeConfig, context.optionsSnapshot), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (computed) {
      return normalizeUndoPolicyStateFromCore(computed);
    }, function () {
      return resolveUndoPolicyStateFallback(context.modeConfig, context.targetMode, context.optionsSnapshot);
    });
  });
}

function loadUndoSettingForMode(manager, mode) {
  if (!manager) return false;
  var state = manager.resolveUndoPolicyStateForCurrentSessionMode(mode);
  var forced = state ? state.forcedUndoSetting : null;
  if (forced !== null) return forced;
  if (!(state && state.isUndoAllowedByMode)) return false;
  var map = manager.readLocalStorageJsonMap(GameManager.UNDO_SETTINGS_KEY);
  var coreCallResult = callCoreStorageRuntime(manager, "readUndoEnabledForModeFromMap", {
    map: map,
    mode: mode,
    fallbackEnabled: true
  }, false);
  return manager.resolveCoreBooleanCallOrFallback(coreCallResult, function () {
    if (manager.hasOwnKey(map, mode)) return !!map[mode];
    return true;
  });
}

function isUndoInteractionEnabled(manager) {
  if (!manager) return false;
  var state = resolveUndoPolicyStateSnapshot(manager, null, manager.mode);
  return !!(state && state.isUndoInteractionEnabled);
}

function applyUndoLinkUiState(undoLink, canUndo, modeUndoCapable) {
  if (!undoLink) return;
  undoLink.style.display = modeUndoCapable ? "" : "none";
  if (!modeUndoCapable) return;
  undoLink.style.pointerEvents = canUndo ? "" : "none";
  undoLink.style.opacity = canUndo ? "" : "0.45";
}

function applyUndoGameOverButtonUiState(undoBtn, canUndo) {
  if (!undoBtn) return;
  undoBtn.style.display = canUndo ? "inline-block" : "none";
  var lower = undoBtn.parentElement;
  if (!(lower && lower.classList && typeof lower.classList.toggle === "function")) return;
  lower.classList.toggle("has-undo-controls", !!canUndo);
}

function applyPracticeUndoButtonUiState(practiceUndoBtn, canUndo) {
  if (!practiceUndoBtn) return;
  practiceUndoBtn.style.pointerEvents = canUndo ? "" : "none";
  practiceUndoBtn.style.opacity = canUndo ? "" : "0.45";
  practiceUndoBtn.setAttribute("aria-disabled", canUndo ? "false" : "true");
}

function updateUndoUiState(manager, resolvedState) {
  if (!manager) return;
  var state = resolveUndoPolicyStateSnapshot(manager, resolvedState, manager.mode);
  var canUndo = !!(state && state.isUndoInteractionEnabled);
  var modeUndoCapable = !!(state && state.isUndoAllowedByMode);
  applyUndoLinkUiState(resolveManagerElementById(manager, "undo-link"), canUndo, modeUndoCapable);
  applyUndoGameOverButtonUiState(resolveManagerElementById(manager, "undo-btn-gameover"), canUndo);
  applyPracticeUndoButtonUiState(resolveManagerElementById(manager, "practice-mobile-undo-btn"), canUndo);
  manager.callWindowMethod("syncMobileUndoTopButtonAvailability");
}

function normalizeSpawnStatPairFromCore(corePair) {
  var normalizedCorePair = normalizeUndoStatsRecordObject(corePair, {});
  var corePrimary = Number(normalizedCorePair.primary);
  var coreSecondary = Number(normalizedCorePair.secondary);
  if (
    Number.isInteger(corePrimary) &&
    corePrimary > 0 &&
    Number.isInteger(coreSecondary) &&
    coreSecondary > 0
  ) {
    return { primary: corePrimary, secondary: coreSecondary };
  }
  return null;
}

function collectSortedSpawnValuesFromTable(spawnTable) {
  var table = Array.isArray(spawnTable) ? spawnTable : [];
  var values = [];
  for (var i = 0; i < table.length; i++) {
    var item = table[i];
    if (!item || !Number.isInteger(Number(item.value)) || Number(item.value) <= 0) continue;
    var value = Number(item.value);
    if (values.indexOf(value) === -1) values.push(value);
  }
  values.sort(function (a, b) { return a - b; });
  return values;
}

function resolveSpawnStatPairFallbackFromTable(spawnTable) {
  var values = collectSortedSpawnValuesFromTable(spawnTable);
  var primary = values.length > 0 ? values[0] : 2;
  var secondary = values.length > 1 ? values[1] : primary;
  return { primary: primary, secondary: secondary };
}

function getSpawnStatPair(manager) {
  if (!manager) return { primary: 2, secondary: 2 };
  return resolveCoreArgsCallWith(manager, "callCoreRulesRuntime", "getSpawnStatPair", [manager.spawnTable || []], undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (corePair) {
      return normalizeSpawnStatPairFromCore(corePair);
    }, function () {
      return resolveSpawnStatPairFallbackFromTable(currentManager.spawnTable);
    });
  });
}

function resolveStepStatsSourceAndLimit(manager) {
  if (!manager) return { src: null, limit: 0 };
  return {
    src: manager.replayMode ? manager.replayMoves : manager.moveHistory,
    limit: manager.replayMode ? manager.replayIndex : manager.moveHistory.length
  };
}

function normalizeCoreStepStatsRecord(coreValue) {
  var raw = normalizeUndoStatsRecordObject(coreValue, {});
  var coreTotal = Number(raw.totalSteps);
  var coreMoves = Number(raw.moveSteps);
  var coreUndo = Number(raw.undoSteps);
  if (!Number.isFinite(coreTotal) || !Number.isFinite(coreMoves) || !Number.isFinite(coreUndo)) {
    return null;
  }
  return {
    totalSteps: coreTotal,
    moveSteps: coreMoves,
    undoSteps: coreUndo
  };
}

function createCoreStepStatsPayload(src, limit) {
  return {
    actions: src,
    limit: limit
  };
}

function resolveCoreStepStatsFromResult(currentManager, coreCallResult) {
  return currentManager.resolveNormalizedCoreValueOrFallback(
    coreCallResult,
    function (coreValue) {
      return normalizeCoreStepStatsRecord(coreValue);
    },
    function () {
      return null;
    }
  );
}

function resolveCoreStepStats(manager, src, limit) {
  if (!manager) return null;
  return resolveCorePayloadCallWith(manager, "callCoreReplayExecutionRuntime", "computeReplayStepStats", createCoreStepStatsPayload(src, limit), undefined, function (currentManager, coreCallResult) {
    return resolveCoreStepStatsFromResult(currentManager, coreCallResult);
  });
}

function computeFallbackStepStats(manager, src, limit) {
  if (!manager) return { totalSteps: 0, moveSteps: 0, undoSteps: 0 };
  var moveSteps = 0;
  var undoSteps = 0;
  if (src) {
    for (var i = 0; i < limit; i++) {
      var kind = getActionKind(manager, src[i]);
      if (kind === "u") {
        undoSteps++;
        if (moveSteps > 0) moveSteps--;
      } else if (kind === "m") {
        moveSteps++;
      }
    }
  }
  return { totalSteps: src ? limit : 0, moveSteps: moveSteps, undoSteps: undoSteps };
}

function computeStepStats(manager) {
  if (!manager) return { totalSteps: 0, moveSteps: 0, undoSteps: 0 };
  var sourceAndLimit = resolveStepStatsSourceAndLimit(manager);
  var src = sourceAndLimit.src;
  var limit = sourceAndLimit.limit;
  var coreStats = resolveCoreStepStats(manager, src, limit);
  if (coreStats) return coreStats;
  return computeFallbackStepStats(manager, src, limit);
}

function resolveUndoFallbackScoreValue(value) {
  if (Number.isFinite(value) && typeof value === "number") return Number(value);
  return 0;
}

function resolveUndoFallbackNonNegativeInteger(value) {
  return normalizeUndoNonNegativeIntegerOrFallback(value, 0);
}

function resolveUndoFallbackIntegerOrDefault(value, defaultValue) {
  return normalizeUndoIntegerOrFallback(value, defaultValue);
}

function resolveUndoFallbackIntegerOrNull(value) {
  return Number.isInteger(value) ? value : null;
}

function getUndoStateFallbackValues(manager) {
  if (!manager) return {};
  return {
    score: resolveUndoFallbackScoreValue(manager.score),
    comboStreak: resolveUndoFallbackNonNegativeInteger(manager.comboStreak),
    successfulMoveCount: resolveUndoFallbackNonNegativeInteger(manager.successfulMoveCount),
    lockConsumedAtMoveCount: resolveUndoFallbackIntegerOrDefault(manager.lockConsumedAtMoveCount, -1),
    lockedDirectionTurn: resolveUndoFallbackIntegerOrNull(manager.lockedDirectionTurn),
    lockedDirection: resolveUndoFallbackIntegerOrNull(manager.lockedDirection),
    undoUsed: resolveUndoFallbackNonNegativeInteger(manager.undoUsed)
  };
}

function createUndoStackEntryNormalizePayload(source, fallbackState) {
  return {
    entry: source,
    fallbackScore: fallbackState.score,
    fallbackComboStreak: fallbackState.comboStreak,
    fallbackSuccessfulMoveCount: fallbackState.successfulMoveCount,
    fallbackLockConsumedAtMoveCount: fallbackState.lockConsumedAtMoveCount,
    fallbackLockedDirectionTurn: fallbackState.lockedDirectionTurn,
    fallbackLockedDirection: fallbackState.lockedDirection,
    fallbackUndoUsed: fallbackState.undoUsed
  };
}

function normalizeUndoStackEntrySourceByCore(currentManager, coreValue, source) {
  return currentManager.isNonArrayObject(coreValue) ? coreValue : source;
}

function resolveUndoStackEntrySourceByCore(manager, source, fallbackState) {
  if (!manager) return source;
  var sourceByCore = resolveCorePayloadCallWith(
    manager,
    "callCoreUndoStackEntryRuntime",
    "normalizeUndoStackEntry",
    createUndoStackEntryNormalizePayload(source, fallbackState),
    undefined,
    function (currentManager, coreCallResult) {
      return currentManager.resolveNormalizedCoreValueOrUndefined(coreCallResult, function (coreValue) {
        return normalizeUndoStackEntrySourceByCore(currentManager, coreValue, source);
      });
    }
  );
  return typeof sourceByCore !== "undefined" ? sourceByCore : source;
}

function collectUndoStackTiles(manager, source) {
  if (!manager) return [];
  var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
  var tiles = [];
  for (var i = 0; i < rawTiles.length; i++) {
    var item = rawTiles[i];
    if (!manager.isNonArrayObject(item)) continue;
    tiles.push(item);
  }
  return tiles;
}

function normalizeUndoScoreOrFallback(source, fallbackValue) {
  if (Number.isFinite(source.score) && typeof source.score === "number") {
    return Number(source.score);
  }
  return fallbackValue;
}

function normalizeUndoNonNegativeIntegerOrFallback(value, fallbackValue) {
  if (Number.isInteger(value) && value >= 0) {
    return value;
  }
  return fallbackValue;
}

function normalizeUndoIntegerOrFallback(value, fallbackValue) {
  if (Number.isInteger(value)) {
    return value;
  }
  return fallbackValue;
}

function normalizeUndoPositionMap(value) {
  if (!isUndoStatsRecordObject(value)) return null;
  var map = {};
  var hasEntry = false;
  for (var key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    var entry = value[key];
    if (!isUndoStatsRecordObject(entry)) continue;
    if (!Number.isInteger(entry.x) || !Number.isInteger(entry.y)) continue;
    map[key] = { x: entry.x, y: entry.y };
    hasEntry = true;
  }
  return hasEntry ? map : null;
}

function mergeUndoPositionMap(baseMap, extraMap) {
  var merged = normalizeUndoPositionMap(baseMap) || {};
  var source = normalizeUndoPositionMap(extraMap);
  if (!source) return merged;
  for (var key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    merged[key] = source[key];
  }
  return merged;
}

function createNormalizedUndoStackEntry(manager, source, fallbackState, tiles, motionMap) {
  return {
    score: normalizeUndoScoreOrFallback(source, fallbackState.score),
    tiles: tiles,
    comboStreak: normalizeUndoNonNegativeIntegerOrFallback(source.comboStreak, fallbackState.comboStreak),
    successfulMoveCount: normalizeUndoNonNegativeIntegerOrFallback(
      source.successfulMoveCount,
      fallbackState.successfulMoveCount
    ),
    lockConsumedAtMoveCount: normalizeUndoIntegerOrFallback(
      source.lockConsumedAtMoveCount,
      fallbackState.lockConsumedAtMoveCount
    ),
    lockedDirectionTurn: normalizeUndoIntegerOrFallback(source.lockedDirectionTurn, fallbackState.lockedDirectionTurn),
    lockedDirection: normalizeUndoIntegerOrFallback(source.lockedDirection, fallbackState.lockedDirection),
    undoUsed: normalizeUndoNonNegativeIntegerOrFallback(source.undoUsed, fallbackState.undoUsed),
    motionMap: normalizeUndoPositionMap(motionMap)
  };
}

function normalizeUndoStackEntry(manager, entry) {
  if (!manager) return null;
  var fallbackState = manager.getUndoStateFallbackValues();
  var sourceInput = manager.isNonArrayObject(entry) ? entry : {};
  var source = sourceInput;
  source = resolveUndoStackEntrySourceByCore(manager, source, fallbackState);
  var tiles = collectUndoStackTiles(manager, source);
  var motionMap = normalizeUndoPositionMap(source.motionMap) || normalizeUndoPositionMap(sourceInput.motionMap);
  return createNormalizedUndoStackEntry(manager, source, fallbackState, tiles, motionMap);
}

function isValidUndoTileRecord(manager, value) {
  return !!(
    manager &&
    manager.isNonArrayObject(value) &&
    Number.isInteger(value.x) &&
    Number.isInteger(value.y) &&
    Number.isFinite(value.value) &&
    value.previousPosition &&
    manager.isNonArrayObject(value.previousPosition) &&
    Number.isInteger(value.previousPosition.x) &&
    Number.isInteger(value.previousPosition.y)
  );
}

function buildUndoTileSnapshotCorePayload(sourceTile, sourceTarget) {
  return {
    tile: {
      x: sourceTile ? sourceTile.x : null,
      y: sourceTile ? sourceTile.y : null,
      value: sourceTile ? sourceTile.value : null
    },
    target: {
      x: sourceTarget ? sourceTarget.x : null,
      y: sourceTarget ? sourceTarget.y : null
    }
  };
}

function resolveUndoTileSnapshotByCore(manager, sourceTile, sourceTarget) {
  if (!manager) return null;
  return resolveCorePayloadCallWith(
    manager,
    "callCoreUndoTileSnapshotRuntime",
    "createUndoTileSnapshot",
    buildUndoTileSnapshotCorePayload(sourceTile, sourceTarget),
    undefined,
    function (currentManager, coreCallResult) {
      return currentManager.resolveNormalizedCoreValueOrUndefined(coreCallResult, function (computed) {
        if (isValidUndoTileRecord(currentManager, computed)) {
          return computed;
        }
        return null;
      });
    }
  );
}

function buildUndoTileSnapshotFallback(tile, target) {
  if (tile && typeof tile.save === "function") {
    return tile.save(target);
  }
  return {
    x: tile ? tile.x : null,
    y: tile ? tile.y : null,
    value: tile ? tile.value : null,
    previousPosition: {
      x: target ? target.x : null,
      y: target ? target.y : null
    }
  };
}

function createUndoTileSnapshot(manager, tile, target) {
  if (!manager) return null;
  var sourceTile = isUndoStatsRecordObject(tile) ? tile : null;
  var sourceTarget = isUndoStatsRecordObject(target) ? target : null;
  var normalizedByCore = resolveUndoTileSnapshotByCore(manager, sourceTile, sourceTarget);
  if (normalizedByCore) return normalizedByCore;
  return buildUndoTileSnapshotFallback(tile, target);
}

function applyUndoRestoredTiles(manager, undoPayload) {
  if (!manager) return;
  manager.grid.build();
  manager.score = Number.isFinite(undoPayload.score) && typeof undoPayload.score === "number"
    ? Number(undoPayload.score)
    : 0;
  var undoTiles = Array.isArray(undoPayload.tiles) ? undoPayload.tiles : [];
  var gridWidth = manager.grid && Array.isArray(manager.grid.cells) ? manager.grid.cells.length : 0;
  var gridHeight = Number.isInteger(manager.height) && manager.height > 0
    ? manager.height
    : (Number.isInteger(manager.width) && manager.width > 0 ? manager.width : gridWidth);
  for (var undoTileIndex = 0; undoTileIndex < undoTiles.length; undoTileIndex++) {
    var restored = createUndoRestoreTile(manager, undoTiles[undoTileIndex]);
    var x = Number(restored && restored.x);
    var y = Number(restored && restored.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) continue;
    if (!manager.grid.cells[x]) continue;
    var tile = new Tile({ x: restored.x, y: restored.y }, restored.value);
    if (typeof manager.isStoneValue === "function" && manager.isStoneValue(restored.value)) {
      tile.isStone = true;
    }
    tile.previousPosition = {
      x: restored.previousPosition.x,
      y: restored.previousPosition.y
    };
    manager.grid.cells[tile.x][tile.y] = tile;
  }
}

function resolveUndoRestoreDefaultUndoUsed(manager) {
  if (!manager) return 0;
  return Number.isInteger(manager.undoUsed) && manager.undoUsed >= 0 ? manager.undoUsed : 0;
}

function resolveUndoRestoreStateCounterFields(safeRestore, defaultUndoUsed) {
  return {
    comboStreak: normalizeUndoNonNegativeIntegerOrFallback(safeRestore.comboStreak, 0),
    successfulMoveCount: normalizeUndoNonNegativeIntegerOrFallback(safeRestore.successfulMoveCount, 0),
    lockConsumedAtMoveCount: normalizeUndoIntegerOrFallback(safeRestore.lockConsumedAtMoveCount, -1),
    lockedDirectionTurn: Number.isInteger(safeRestore.lockedDirectionTurn) ? safeRestore.lockedDirectionTurn : null,
    lockedDirection: Number.isInteger(safeRestore.lockedDirection) ? safeRestore.lockedDirection : null,
    undoUsed: normalizeUndoNonNegativeIntegerOrFallback(safeRestore.undoUsed, defaultUndoUsed + 1)
  };
}

function resolveUndoRestoreStateStatusFields(safeRestore) {
  return {
    over: typeof safeRestore.over === "boolean" ? safeRestore.over : false,
    won: typeof safeRestore.won === "boolean" ? safeRestore.won : false,
    keepPlaying: typeof safeRestore.keepPlaying === "boolean" ? safeRestore.keepPlaying : false,
    shouldClearMessage: safeRestore.shouldClearMessage !== false
  };
}

function normalizeUndoRestoreStateInput(manager, undoRestore) {
  var safeRestore = normalizeUndoStatsRecordObject(undoRestore, {});
  var defaultUndoUsed = resolveUndoRestoreDefaultUndoUsed(manager);
  var counterFields = resolveUndoRestoreStateCounterFields(safeRestore, defaultUndoUsed);
  var statusFields = resolveUndoRestoreStateStatusFields(safeRestore);
  return {
    comboStreak: counterFields.comboStreak,
    successfulMoveCount: counterFields.successfulMoveCount,
    lockConsumedAtMoveCount: counterFields.lockConsumedAtMoveCount,
    lockedDirectionTurn: counterFields.lockedDirectionTurn,
    lockedDirection: counterFields.lockedDirection,
    undoUsed: counterFields.undoUsed,
    over: statusFields.over,
    won: statusFields.won,
    keepPlaying: statusFields.keepPlaying,
    shouldClearMessage: statusFields.shouldClearMessage
  };
}

function applyUndoRestoreStateFields(manager, normalized) {
  manager.comboStreak = normalized.comboStreak;
  manager.successfulMoveCount = normalized.successfulMoveCount;
  manager.lockConsumedAtMoveCount = normalized.lockConsumedAtMoveCount;
  manager.lockedDirectionTurn = normalized.lockedDirectionTurn;
  manager.lockedDirection = normalized.lockedDirection;
  manager.undoUsed = normalized.undoUsed;
  manager.over = normalized.over;
  manager.won = normalized.won;
  manager.keepPlaying = normalized.keepPlaying;
}

function applyUndoRestoreState(manager, undoRestore) {
  if (!manager) return;
  var normalized = normalizeUndoRestoreStateInput(manager, undoRestore);
  applyUndoRestoreStateFields(manager, normalized);
  if (normalized.shouldClearMessage) {
    manager.actuator.clearMessage(); // Clear Game Over message if present
  }
}

function applyPostUndoRecordArtifacts(manager, postUndoRecord, direction) {
  if (!manager || !postUndoRecord) return;
  if (postUndoRecord.shouldRecordMoveHistory) {
    manager.moveHistory.push(direction);
  }
  if (postUndoRecord.shouldAppendCompactUndo) {
    appendCompactUndo(manager);
  }
  if (postUndoRecord.shouldPushSessionAction && manager.sessionReplayV3) {
    manager.sessionReplayV3.actions.push(
      Array.isArray(postUndoRecord.sessionAction) ? postUndoRecord.sessionAction : ["u"]
    );
  }
}

function canExecuteUndoMove(manager) {
  if (!manager) return false;
  var canUndoOperation = manager.replayMode || manager.isUndoInteractionEnabled();
  var hasRemainingUndoBudget = manager.undoLimit === null || manager.undoUsed < manager.undoLimit;
  return canUndoOperation && hasRemainingUndoBudget && manager.undoStack.length > 0;
}

function ensureRedoStack(manager) {
  if (!manager) return [];
  if (!Array.isArray(manager.redoStack)) manager.redoStack = [];
  return manager.redoStack;
}

function isPracticeBoardPageContext(manager) {
  if (!manager) return false;
  var windowLike = manager.getWindowLike();
  var locationLike = windowLike && windowLike.location ? windowLike.location : null;
  var path = String((locationLike && locationLike.pathname) || "").toLowerCase();
  return path.indexOf("practice_board") !== -1;
}

function isPracticeRedoEnabled(manager) {
  if (!manager || manager.replayMode) return false;
  var modeKey = String(manager.modeKey || manager.mode || "").toLowerCase();
  if (modeKey === "practice") return true;
  return isPracticeBoardPageContext(manager);
}

function buildUndoSnapshotPositionKey(x, y) {
  return String(x) + ":" + String(y);
}

function normalizeUndoSnapshotPosition(value, fallbackX, fallbackY) {
  var source = isUndoStatsRecordObject(value) ? value : null;
  var x = source && Number.isInteger(source.x) ? source.x : fallbackX;
  var y = source && Number.isInteger(source.y) ? source.y : fallbackY;
  return { x: x, y: y };
}

function resolveSnapshotPreviousPositionOverride(previousPositionByCurrentKey, x, y) {
  if (!isUndoStatsRecordObject(previousPositionByCurrentKey)) return null;
  var key = buildUndoSnapshotPositionKey(x, y);
  var override = previousPositionByCurrentKey[key];
  if (!isUndoStatsRecordObject(override)) return null;
  if (!Number.isInteger(override.x) || !Number.isInteger(override.y)) return null;
  return { x: override.x, y: override.y };
}

function resolveUndoStackEntryTilesForPositionMap(manager, entry) {
  if (!manager) return [];
  var source = manager.normalizeUndoStackEntry(entry);
  if (!source) return [];
  return collectUndoStackTiles(manager, source);
}

function resolveUndoTileCurrentPosition(tile) {
  if (!Number.isInteger(tile.x) || !Number.isInteger(tile.y)) return null;
  return { x: tile.x, y: tile.y };
}

function resolveUndoTilePreviousPosition(tile) {
  var source = tile ? tile.previousPosition : null;
  if (!source) return null;
  if (!Number.isInteger(source.x) || !Number.isInteger(source.y)) return null;
  return { x: source.x, y: source.y };
}

function writeUndoSnapshotPositionMapEntry(map, keyPosition, valuePosition, preserveFirstEntry) {
  if (!(map && keyPosition && valuePosition)) return;
  var key = buildUndoSnapshotPositionKey(keyPosition.x, keyPosition.y);
  if (preserveFirstEntry && map[key]) return;
  map[key] = { x: valuePosition.x, y: valuePosition.y };
}

function buildUndoSnapshotPositionMap(manager, entry, keyResolver, valueResolver, preserveFirstEntry) {
  var map = {};
  if (!(manager && typeof keyResolver === "function" && typeof valueResolver === "function")) return map;
  var tiles = resolveUndoStackEntryTilesForPositionMap(manager, entry);
  for (var index = 0; index < tiles.length; index++) {
    var tile = tiles[index];
    if (!isValidUndoTileRecord(manager, tile)) continue;
    var keyPosition = keyResolver(tile);
    if (!keyPosition) continue;
    var valuePosition = valueResolver(tile);
    if (!valuePosition) continue;
    writeUndoSnapshotPositionMapEntry(map, keyPosition, valuePosition, preserveFirstEntry);
  }
  return map;
}

function buildRedoPreviousPositionMapFromUndoEntry(manager, undoEntry) {
  return buildUndoPreviousPositionMapFromRedoEntry(manager, undoEntry);
}

function buildUndoPreviousPositionMapFromRedoEntry(manager, redoEntry) {
  return buildUndoSnapshotPositionMap(
    manager,
    redoEntry,
    resolveUndoTilePreviousPosition,
    resolveUndoTileCurrentPosition,
    true
  );
}

function buildUndoPreviousPositionMapFromUndoEntry(manager, undoEntry) {
  return buildUndoSnapshotPositionMap(
    manager,
    undoEntry,
    resolveUndoTileCurrentPosition,
    resolveUndoTilePreviousPosition,
    false
  );
}

function resolveCurrentUndoSnapshotOptions(options) {
  var opts = normalizeUndoStatsRecordObject(options, {});
  return {
    previousPositionByCurrentKey: normalizeUndoStatsRecordObject(opts.previousPositionByCurrentKey, null),
    motionMap: normalizeUndoPositionMap(opts.motionMap)
  };
}

function createCurrentUndoSnapshotBaseState(fallback) {
  return {
    score: Number(fallback.score) || 0,
    tiles: [],
    comboStreak: Number.isInteger(fallback.comboStreak) ? fallback.comboStreak : 0,
    successfulMoveCount: Number.isInteger(fallback.successfulMoveCount) ? fallback.successfulMoveCount : 0,
    lockConsumedAtMoveCount: Number.isInteger(fallback.lockConsumedAtMoveCount) ? fallback.lockConsumedAtMoveCount : -1,
    lockedDirectionTurn: Number.isInteger(fallback.lockedDirectionTurn) ? fallback.lockedDirectionTurn : null,
    lockedDirection: Number.isInteger(fallback.lockedDirection) ? fallback.lockedDirection : null,
    undoUsed: Number.isInteger(fallback.undoUsed) && fallback.undoUsed >= 0 ? fallback.undoUsed : 0
  };
}

function applyCurrentUndoSnapshotMotionMap(snapshot, motionMap) {
  if (!(snapshot && motionMap)) return;
  snapshot.motionMap = motionMap;
}

function resolveCurrentUndoTilePreviousPosition(previousPositionByCurrentKey, x, y, previousPosition) {
  var override = resolveSnapshotPreviousPositionOverride(previousPositionByCurrentKey, x, y);
  if (override) return override;
  return normalizeUndoSnapshotPosition(previousPosition, x, y);
}

function collectCurrentUndoSnapshotTiles(manager, snapshot, previousPositionByCurrentKey) {
  if (!(manager && snapshot && manager.grid && typeof manager.grid.eachCell === "function")) return;
  manager.grid.eachCell(function (x, y, tile) {
    if (!tile) return;
    var tileSnapshot = manager.createUndoTileSnapshot(tile, { x: x, y: y });
    if (!isValidUndoTileRecord(manager, tileSnapshot)) return;
    tileSnapshot.previousPosition = resolveCurrentUndoTilePreviousPosition(
      previousPositionByCurrentKey,
      x,
      y,
      tileSnapshot.previousPosition
    );
    snapshot.tiles.push(tileSnapshot);
  });
}

function createCurrentUndoStackEntrySnapshot(manager, options) {
  if (!manager) return null;
  var normalizedOptions = resolveCurrentUndoSnapshotOptions(options);
  var fallback = manager.getUndoStateFallbackValues();
  var snapshot = createCurrentUndoSnapshotBaseState(fallback);
  applyCurrentUndoSnapshotMotionMap(snapshot, normalizedOptions.motionMap);
  collectCurrentUndoSnapshotTiles(manager, snapshot, normalizedOptions.previousPositionByCurrentKey);
  return manager.normalizeUndoStackEntry(snapshot);
}

function pushRedoSnapshotBeforeUndo(manager, undoEntry) {
  if (!isPracticeRedoEnabled(manager)) return;
  var previousPositionByCurrentKey = buildRedoPreviousPositionMapFromUndoEntry(manager, undoEntry);
  var snapshot = createCurrentUndoStackEntrySnapshot(manager, {
    previousPositionByCurrentKey: previousPositionByCurrentKey,
    motionMap: buildUndoPreviousPositionMapFromUndoEntry(manager, undoEntry)
  });
  if (!snapshot) return;
  ensureRedoStack(manager).push(snapshot);
}

function canExecuteRedoMove(manager) {
  if (!isPracticeRedoEnabled(manager)) return false;
  return ensureRedoStack(manager).length > 0;
}

function buildRedoRestoreState(manager, entry) {
  var fallback = manager.getUndoStateFallbackValues();
  var source = manager.normalizeUndoStackEntry(entry) || fallback;
  return {
    comboStreak: Number.isInteger(source.comboStreak) && source.comboStreak >= 0 ? source.comboStreak : fallback.comboStreak,
    successfulMoveCount: Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
      ? source.successfulMoveCount
      : fallback.successfulMoveCount,
    lockConsumedAtMoveCount: Number.isInteger(source.lockConsumedAtMoveCount)
      ? source.lockConsumedAtMoveCount
      : fallback.lockConsumedAtMoveCount,
    lockedDirectionTurn: Number.isInteger(source.lockedDirectionTurn) ? source.lockedDirectionTurn : fallback.lockedDirectionTurn,
    lockedDirection: Number.isInteger(source.lockedDirection) ? source.lockedDirection : fallback.lockedDirection,
    undoUsed: Number.isInteger(source.undoUsed) && source.undoUsed >= 0 ? source.undoUsed : fallback.undoUsed,
    over: false,
    won: false,
    keepPlaying: false,
    shouldClearMessage: true,
    shouldStartTimer: manager.timerStatus === 0
  };
}

function executeRedoRestorePipeline(manager) {
  var redoStack = ensureRedoStack(manager);
  var redoEntry = manager.normalizeUndoStackEntry(redoStack.pop());
  if (!redoEntry) return null;

  var undoPreviousPositionByCurrentKey = buildUndoPreviousPositionMapFromRedoEntry(manager, redoEntry);
  undoPreviousPositionByCurrentKey = mergeUndoPositionMap(
    undoPreviousPositionByCurrentKey,
    redoEntry.motionMap
  );
  var undoSnapshot = createCurrentUndoStackEntrySnapshot(manager, {
    previousPositionByCurrentKey: undoPreviousPositionByCurrentKey
  });
  if (undoSnapshot) manager.undoStack.push(undoSnapshot);

  applyUndoRestoredTiles(manager, redoEntry);
  var redoRestore = buildRedoRestoreState(manager, redoEntry);
  applyUndoRestoreState(manager, redoRestore);
  return redoRestore;
}

function shouldStartTimerAfterRedoRestore(manager, redoRestore) {
  return typeof redoRestore.shouldStartTimer === "boolean"
    ? redoRestore.shouldStartTimer
    : manager.timerStatus === 0;
}

function executeUndoRestorePipeline(manager, direction) {
  var prev = manager.normalizeUndoStackEntry(manager.undoStack.pop());
  var undoPayload = computeUndoRestorePayload(manager, prev);
  applyUndoRestoredTiles(manager, undoPayload);
  var undoRestore = computeUndoRestoreState(manager, prev);
  applyUndoRestoreState(manager, undoRestore);
  var postUndoRecord = computePostUndoRecord(manager, direction);
  applyPostUndoRecordArtifacts(manager, postUndoRecord, direction);
  return undoRestore || {};
}

function shouldStartTimerAfterUndoRestore(manager, undoRestore) {
  return typeof undoRestore.shouldStartTimer === "boolean"
    ? undoRestore.shouldStartTimer
    : manager.timerStatus === 0;
}

function handleUndoMove(manager, direction) {
  if (!manager || (direction != -1 && direction != -2)) return false;

  if (direction == -2) {
    if (!canExecuteRedoMove(manager)) {
      return true;
    }
    var redoRestore = executeRedoRestorePipeline(manager);
    if (!redoRestore) return true;
    actuate(manager);
    if (shouldStartTimerAfterRedoRestore(manager, redoRestore)) {
      manager.startTimer();
    }
    return true;
  }

  if (!canExecuteUndoMove(manager)) {
    return true;
  }
  var upcomingUndoEntry = manager.normalizeUndoStackEntry(manager.undoStack[manager.undoStack.length - 1]);
  pushRedoSnapshotBeforeUndo(manager, upcomingUndoEntry);
  var undoRestore = executeUndoRestorePipeline(manager, direction);
  actuate(manager);
  if (shouldStartTimerAfterUndoRestore(manager, undoRestore)) {
    manager.startTimer();
  }
  return true;
}

function buildUndoRestoreStatePayload(manager, prev) {
  return {
    prev: prev || {},
    fallbackUndoUsed: manager.undoUsed,
    timerStatus: manager.timerStatus
  };
}

function createUndoRestoreStateFallback(currentManager, prev) {
  var source = normalizeUndoStatsRecordObject(prev, {});
  var fallbackState = currentManager.getUndoStateFallbackValues();
  var undoBase = Number.isInteger(source.undoUsed) && source.undoUsed >= 0 ? source.undoUsed : fallbackState.undoUsed;
  var successfulMoveCount = Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
    ? source.successfulMoveCount
    : 0;
  return { comboStreak: Number.isInteger(source.comboStreak) && source.comboStreak >= 0 ? source.comboStreak : 0, successfulMoveCount: successfulMoveCount, lockConsumedAtMoveCount: Number.isInteger(source.lockConsumedAtMoveCount) ? source.lockConsumedAtMoveCount : -1, lockedDirectionTurn: Number.isInteger(source.lockedDirectionTurn) ? source.lockedDirectionTurn : null, lockedDirection: Number.isInteger(source.lockedDirection) ? source.lockedDirection : null, undoUsed: undoBase + 1, over: false, won: false, keepPlaying: false, shouldClearMessage: true, shouldStartTimer: currentManager.timerStatus === 0 };
}

function computeUndoRestoreState(manager, prev) {
  if (!manager) return null;
  return resolveCorePayloadCallWith(
    manager,
    "callCoreUndoRestoreRuntime",
    "computeUndoRestoreState",
    buildUndoRestoreStatePayload(manager, prev),
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return createUndoRestoreStateFallback(currentManager, prev);
      });
    }
  );
}

function buildUndoRestoreTileFallback(source, previous) {
  return {
    x: source && Number.isInteger(source.x) ? source.x : null,
    y: source && Number.isInteger(source.y) ? source.y : null,
    value: source && Number.isFinite(source.value) ? Number(source.value) : null,
    previousPosition: {
      x: previous && Number.isInteger(previous.x) ? previous.x : null,
      y: previous && Number.isInteger(previous.y) ? previous.y : null
    }
  };
}

function buildUndoRestoreTileCorePayload(source, previous) {
  return {
    x: source && Number.isInteger(source.x) ? source.x : null,
    y: source && Number.isInteger(source.y) ? source.y : null,
    value: source && Number.isFinite(source.value) ? Number(source.value) : null,
    previousPosition: {
      x: previous && Number.isInteger(previous.x) ? previous.x : null,
      y: previous && Number.isInteger(previous.y) ? previous.y : null
    }
  };
}

function resolveUndoRestoreTileByCore(manager, source, previous, fallback) {
  if (!manager) return null;
  var normalizedByCore = resolveCorePayloadCallWith(
    manager,
    "callCoreUndoTileRestoreRuntime",
    "createUndoRestoreTile",
    buildUndoRestoreTileCorePayload(source, previous),
    undefined,
    function (currentManager, coreCallResult) {
      return currentManager.resolveNormalizedCoreValueOrUndefined(coreCallResult, function (computed) {
        return isValidUndoTileRecord(currentManager, computed) ? computed : null;
      });
    }
  );
  return normalizedByCore || fallback;
}

function createUndoRestoreTile(manager, snapshot) {
  if (!manager) return null;
  var source = manager.isNonArrayObject(snapshot) ? snapshot : {};
  var previous = manager.isNonArrayObject(source.previousPosition) ? source.previousPosition : {};
  var fallback = buildUndoRestoreTileFallback(source, previous);
  return resolveUndoRestoreTileByCore(manager, source, previous, fallback);
}

function createUndoRestorePayloadResolvePayload(prev, fallbackScore) {
  return {
    prev: prev || {},
    fallbackScore: fallbackScore
  };
}

function resolveUndoRestorePayloadFallbackScore(manager, source) {
  if (Number.isFinite(source.score) && typeof source.score === "number") {
    return Number(source.score);
  }
  if (Number.isFinite(manager.score) && typeof manager.score === "number") {
    return Number(manager.score);
  }
  return 0;
}

function resolveUndoRestorePayloadFallbackTiles(manager, source) {
  return collectUndoStackTiles(manager, source);
}

function resolveUndoRestorePayloadFallback(manager, prev) {
  var source = normalizeUndoStatsRecordObject(prev, {});
  return {
    score: resolveUndoRestorePayloadFallbackScore(manager, source),
    tiles: resolveUndoRestorePayloadFallbackTiles(manager, source)
  };
}

function computeUndoRestorePayload(manager, prev) {
  if (!manager) return null;
  return resolveCorePayloadCallWith(
    manager,
    "callCoreUndoRestorePayloadRuntime",
    "computeUndoRestorePayload",
    createUndoRestorePayloadResolvePayload(prev, manager.score),
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return resolveUndoRestorePayloadFallback(currentManager, prev);
      });
    }
  );
}

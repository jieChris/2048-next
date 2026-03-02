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

function resolveForcedUndoSettingForMode(modeConfig, targetMode) {
  var modeCfg = modeConfig || null;
  if (modeCfg && typeof modeCfg.undo_enabled === "boolean") {
    return modeCfg.undo_enabled;
  }
  var modeId = (targetMode || "").toLowerCase();
  if (modeId === "capped" || modeId.indexOf("capped") !== -1) return false;
  if (modeId.indexOf("no_undo") !== -1 || modeId.indexOf("no-undo") !== -1) return false;
  if (modeId.indexOf("undo_only") !== -1 || modeId.indexOf("undo-only") !== -1) return true;
  return null;
}

function buildUndoPolicyStateFallback(rawFallbackInput) {
  var fallbackInput = {
    forcedUndoSetting: rawFallbackInput.forcedUndoSetting,
    hasGameStarted: !!rawFallbackInput.hasGameStarted,
    replayMode: !!rawFallbackInput.replayMode,
    undoLimit: rawFallbackInput.undoLimit,
    undoUsed: rawFallbackInput.undoUsed,
    undoEnabled: !!rawFallbackInput.undoEnabled
  };
  var isUndoAllowedByMode = fallbackInput.forcedUndoSetting !== false;
  var isUndoSettingFixedForMode = fallbackInput.forcedUndoSetting !== null;
  var canToggleUndoSetting =
    isUndoAllowedByMode &&
    !isUndoSettingFixedForMode &&
    !fallbackInput.hasGameStarted;
  var isUndoInteractionEnabled =
    !fallbackInput.replayMode &&
    !(fallbackInput.undoLimit !== null && Number(fallbackInput.undoUsed) >= Number(fallbackInput.undoLimit)) &&
    !!(fallbackInput.undoEnabled && isUndoAllowedByMode);
  return {
    forcedUndoSetting: fallbackInput.forcedUndoSetting,
    isUndoAllowedByMode: isUndoAllowedByMode,
    isUndoSettingFixedForMode: isUndoSettingFixedForMode,
    canToggleUndoSetting: canToggleUndoSetting,
    isUndoInteractionEnabled: isUndoInteractionEnabled
  };
}

function buildUndoPolicyOptionsSnapshot(manager, options) {
  if (!manager) return null;
  var source = options;
  return {
    hasGameStarted: !!manager.readOptionValue(source, "hasGameStarted", !!manager.hasGameStarted),
    replayMode: !!manager.readOptionValue(source, "replayMode", !!manager.replayMode),
    undoLimit: manager.readOptionValue(source, "undoLimit", manager.undoLimit),
    undoUsed: manager.readOptionValue(source, "undoUsed", manager.undoUsed),
    undoEnabled: manager.readOptionValue(source, "undoEnabled", manager.undoEnabled)
  };
}

function buildUndoPolicyRuntimeInput(targetMode, modeConfig, optionsSnapshot) {
  var snapshot = normalizeUndoStatsRecordObject(optionsSnapshot, {});
  return {
    mode: targetMode,
    modeConfig: modeConfig,
    hasGameStarted: snapshot.hasGameStarted,
    replayMode: snapshot.replayMode,
    undoLimit: snapshot.undoLimit,
    undoUsed: snapshot.undoUsed,
    undoEnabled: snapshot.undoEnabled
  };
}

function resolveUndoPolicyStateForMode(manager, mode, options) {
  if (!manager) return null;
  var targetMode = mode || manager.mode;
  var modeConfig = manager.resolveModeConfig(targetMode);
  var optionsSnapshot = buildUndoPolicyOptionsSnapshot(manager, options);

  return resolveCoreModeNormalizedCallOrFallback(
    manager,
    "resolveUndoPolicyState",
    buildUndoPolicyRuntimeInput(targetMode, modeConfig, optionsSnapshot),
    function (computed) {
      return isUndoStatsRecordObject(computed) ? computed : undefined;
    },
    function () {
      return buildUndoPolicyStateFallback({
        forcedUndoSetting: resolveForcedUndoSettingForMode(modeConfig, targetMode),
        hasGameStarted: optionsSnapshot.hasGameStarted,
        replayMode: optionsSnapshot.replayMode,
        undoLimit: optionsSnapshot.undoLimit,
        undoUsed: optionsSnapshot.undoUsed,
        undoEnabled: optionsSnapshot.undoEnabled
      });
    }
  );
}

function resolveUndoEnabledFromModeMap(manager, map, mode) {
  if (!manager) return true;
  return resolveCoreStoragePayloadBooleanCallOrFallback(
    manager,
    "readUndoEnabledForModeFromMap",
    {
      map: map,
      mode: mode,
      fallbackEnabled: true
    },
    function () {
      if (manager.hasOwnKey(map, mode)) return !!map[mode];
      return true;
    }
  );
}

function loadUndoSettingForMode(manager, mode) {
  if (!manager) return false;
  var state = manager.resolveUndoPolicyStateForCurrentSessionMode(mode);
  var forced = state ? state.forcedUndoSetting : null;
  if (forced !== null) return forced;
  if (!(state && state.isUndoAllowedByMode)) return false;
  var map = manager.readLocalStorageJsonMap(GameManager.UNDO_SETTINGS_KEY);
  return resolveUndoEnabledFromModeMap(manager, map, mode);
}

function isUndoInteractionEnabled(manager) {
  if (!manager) return false;
  var state = manager.resolveUndoPolicyStateForMode(manager.mode);
  return !!(state && state.isUndoInteractionEnabled);
}

function resolveUndoStatsElementById(manager, elementId) {
  return resolveManagerElementById(manager, elementId);
}

function applyUndoLinkUiState(manager, canUndo, modeUndoCapable) {
  var undoLink = resolveUndoStatsElementById(manager, "undo-link");
  if (!undoLink) return;
  undoLink.style.display = modeUndoCapable ? "" : "none";
  if (!modeUndoCapable) return;
  undoLink.style.pointerEvents = canUndo ? "" : "none";
  undoLink.style.opacity = canUndo ? "" : "0.45";
}

function applyGameOverUndoButtonUiState(manager, canUndo) {
  var undoBtn = resolveUndoStatsElementById(manager, "undo-btn-gameover");
  if (!undoBtn) return;
  undoBtn.style.display = canUndo ? "inline-block" : "none";
}

function applyPracticeUndoButtonUiState(manager, canUndo) {
  var practiceUndoBtn = resolveUndoStatsElementById(manager, "practice-mobile-undo-btn");
  if (!practiceUndoBtn) return;
  practiceUndoBtn.style.pointerEvents = canUndo ? "" : "none";
  practiceUndoBtn.style.opacity = canUndo ? "" : "0.45";
  practiceUndoBtn.setAttribute("aria-disabled", canUndo ? "false" : "true");
}

function resolveUndoUiStateSnapshot(manager, resolvedState) {
  if (!manager) return null;
  var state = isUndoStatsRecordObject(resolvedState)
    ? resolvedState
    : manager.resolveUndoPolicyStateForMode(manager.mode);
  return {
    canUndo: !!(state && state.isUndoInteractionEnabled),
    modeUndoCapable: !!(state && state.isUndoAllowedByMode)
  };
}

function applyResolvedUndoUiState(manager, stateSnapshot) {
  var snapshot = normalizeUndoStatsRecordObject(stateSnapshot, {});
  var canUndo = !!snapshot.canUndo;
  var modeUndoCapable = !!snapshot.modeUndoCapable;
  applyUndoLinkUiState(manager, canUndo, modeUndoCapable);
  applyGameOverUndoButtonUiState(manager, canUndo);
  applyPracticeUndoButtonUiState(manager, canUndo);
}

function updateUndoUiState(manager, resolvedState) {
  if (!manager) return;
  var stateSnapshot = resolveUndoUiStateSnapshot(manager, resolvedState);
  applyResolvedUndoUiState(manager, stateSnapshot);
  manager.callWindowMethod("syncMobileUndoTopButtonAvailability");
}

function normalizeSpawnStatPairCore(corePair) {
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

function resolveSpawnStatPairFallbackFromTable(spawnTable) {
  var table = Array.isArray(spawnTable) ? spawnTable : [];
  var values = [];
  for (var i = 0; i < table.length; i++) {
    var item = table[i];
    if (!item || !Number.isInteger(Number(item.value)) || Number(item.value) <= 0) continue;
    var value = Number(item.value);
    if (values.indexOf(value) === -1) values.push(value);
  }
  values.sort(function (a, b) { return a - b; });
  var primary = values.length > 0 ? values[0] : 2;
  var secondary = values.length > 1 ? values[1] : primary;
  return { primary: primary, secondary: secondary };
}

function getSpawnStatPair(manager) {
  if (!manager) return { primary: 2, secondary: 2 };
  return resolveCoreRulesNormalizedCallOrFallback(
    manager,
    "getSpawnStatPair",
    [manager.spawnTable || []],
    function (corePair) {
      return normalizeSpawnStatPairCore(corePair);
    },
    function () {
      return resolveSpawnStatPairFallbackFromTable(manager.spawnTable);
    }
  );
}

function normalizeComputeStepStatsCoreValue(coreValue) {
  var raw = normalizeUndoStatsRecordObject(coreValue, {});
  var coreTotal = Number(raw.totalSteps);
  var coreMoves = Number(raw.moveSteps);
  var coreUndo = Number(raw.undoSteps);
  if (
    Number.isFinite(coreTotal) &&
    Number.isFinite(coreMoves) &&
    Number.isFinite(coreUndo)
  ) {
    return {
      totalSteps: coreTotal,
      moveSteps: coreMoves,
      undoSteps: coreUndo
    };
  }
  return null;
}

function computeStepStatsFallback(manager, src, limit) {
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
  return {
    totalSteps: src ? limit : 0,
    moveSteps: moveSteps,
    undoSteps: undoSteps
  };
}

function resolveComputeStepStatsInput(manager) {
  if (!manager) return { limit: 0, src: null };
  return {
    limit: manager.replayMode ? manager.replayIndex : manager.moveHistory.length,
    src: manager.replayMode ? manager.replayMoves : manager.moveHistory
  };
}

function computeStepStats(manager) {
  if (!manager) return { totalSteps: 0, moveSteps: 0, undoSteps: 0 };
  var stepStatsInput = resolveComputeStepStatsInput(manager);
  var limit = stepStatsInput.limit;
  var src = stepStatsInput.src;
  var coreStats = resolveCoreReplayExecutionNormalizedCallOrFallback(
    manager,
    "computeReplayStepStats",
    {
      actions: src,
      limit: limit
    },
    function (coreValue) {
      return normalizeComputeStepStatsCoreValue(coreValue);
    },
    function () {
      return null;
    }
  );
  if (coreStats) return coreStats;
  return computeStepStatsFallback(manager, src, limit);
}

function getUndoStateFallbackValues(manager) {
  if (!manager) return {};
  return {
    score: Number.isFinite(manager.score) && typeof manager.score === "number" ? Number(manager.score) : 0,
    comboStreak: Number.isInteger(manager.comboStreak) && manager.comboStreak >= 0 ? manager.comboStreak : 0,
    successfulMoveCount:
      Number.isInteger(manager.successfulMoveCount) && manager.successfulMoveCount >= 0
        ? manager.successfulMoveCount
        : 0,
    lockConsumedAtMoveCount: Number.isInteger(manager.lockConsumedAtMoveCount) ? manager.lockConsumedAtMoveCount : -1,
    lockedDirectionTurn: Number.isInteger(manager.lockedDirectionTurn) ? manager.lockedDirectionTurn : null,
    lockedDirection: Number.isInteger(manager.lockedDirection) ? manager.lockedDirection : null,
    undoUsed: Number.isInteger(manager.undoUsed) && manager.undoUsed >= 0 ? manager.undoUsed : 0
  };
}

function normalizeUndoStackEntry(manager, entry) {
  if (!manager) return null;
  var fallbackState = manager.getUndoStateFallbackValues();
  var source = manager.isNonArrayObject(entry) ? entry : {};
  var sourceByCore = resolveCoreUndoStackEntryNormalizedCallOrUndefined(
    manager,
    "normalizeUndoStackEntry",
    {
      entry: source,
      fallbackScore: fallbackState.score,
      fallbackComboStreak: fallbackState.comboStreak,
      fallbackSuccessfulMoveCount: fallbackState.successfulMoveCount,
      fallbackLockConsumedAtMoveCount: fallbackState.lockConsumedAtMoveCount,
      fallbackLockedDirectionTurn: fallbackState.lockedDirectionTurn,
      fallbackLockedDirection: fallbackState.lockedDirection,
      fallbackUndoUsed: fallbackState.undoUsed
    },
    function (coreValue) {
      return manager.isNonArrayObject(coreValue) ? coreValue : source;
    }
  );
  if (typeof sourceByCore !== "undefined") {
    source = sourceByCore;
  }
  var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
  var tiles = [];
  for (var i = 0; i < rawTiles.length; i++) {
    var item = rawTiles[i];
    if (!manager.isNonArrayObject(item)) continue;
    tiles.push(item);
  }
  return {
    score: Number.isFinite(source.score) && typeof source.score === "number"
      ? Number(source.score)
      : fallbackState.score,
    tiles: tiles,
    comboStreak: Number.isInteger(source.comboStreak) && source.comboStreak >= 0
      ? source.comboStreak
      : fallbackState.comboStreak,
    successfulMoveCount: Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
      ? source.successfulMoveCount
      : fallbackState.successfulMoveCount,
    lockConsumedAtMoveCount: Number.isInteger(source.lockConsumedAtMoveCount)
      ? source.lockConsumedAtMoveCount
      : fallbackState.lockConsumedAtMoveCount,
    lockedDirectionTurn: Number.isInteger(source.lockedDirectionTurn)
      ? source.lockedDirectionTurn
      : fallbackState.lockedDirectionTurn,
    lockedDirection: Number.isInteger(source.lockedDirection)
      ? source.lockedDirection
      : fallbackState.lockedDirection,
    undoUsed: Number.isInteger(source.undoUsed) && source.undoUsed >= 0
      ? source.undoUsed
      : fallbackState.undoUsed
  };
}

function createUndoTileSnapshot(manager, tile, target) {
  if (!manager) return null;
  var sourceTile = isUndoStatsRecordObject(tile) ? tile : null;
  var sourceTarget = isUndoStatsRecordObject(target) ? target : null;
  var normalizedByCore = resolveCoreUndoTileSnapshotNormalizedCallOrUndefined(
    manager,
    "createUndoTileSnapshot",
    {
      tile: {
        x: sourceTile ? sourceTile.x : null,
        y: sourceTile ? sourceTile.y : null,
        value: sourceTile ? sourceTile.value : null
      },
      target: {
        x: sourceTarget ? sourceTarget.x : null,
        y: sourceTarget ? sourceTarget.y : null
      }
    },
    function (computed) {
      if (
        manager.isNonArrayObject(computed) &&
        computed.previousPosition &&
        manager.isNonArrayObject(computed.previousPosition)
      ) {
        return computed;
      }
      return null;
    }
  );
  if (normalizedByCore) return normalizedByCore;

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

function applyUndoRestoredTiles(manager, undoPayload) {
  if (!manager) return;
  manager.grid.build();
  manager.score = Number.isFinite(undoPayload.score) && typeof undoPayload.score === "number"
    ? Number(undoPayload.score)
    : 0;
  var undoTiles = Array.isArray(undoPayload.tiles) ? undoPayload.tiles : [];
  for (var undoTileIndex = 0; undoTileIndex < undoTiles.length; undoTileIndex++) {
    var restored = createUndoRestoreTile(manager, undoTiles[undoTileIndex]);
    var tile = new Tile({ x: restored.x, y: restored.y }, restored.value);
    tile.previousPosition = {
      x: restored.previousPosition.x,
      y: restored.previousPosition.y
    };
    manager.grid.cells[tile.x][tile.y] = tile;
  }
}

function applyUndoRestoreState(manager, undoRestore) {
  if (!manager) return;
  var safeRestore = normalizeUndoStatsRecordObject(undoRestore, {});
  var normalized = normalizeUndoRestoreState(manager, undoRestore);
  manager.comboStreak = normalized.comboStreak;
  manager.successfulMoveCount = normalized.successfulMoveCount;
  manager.lockConsumedAtMoveCount = normalized.lockConsumedAtMoveCount;
  manager.lockedDirectionTurn = normalized.lockedDirectionTurn;
  manager.lockedDirection = normalized.lockedDirection;
  manager.undoUsed = normalized.undoUsed;
  manager.over = normalized.over;
  manager.won = normalized.won;
  manager.keepPlaying = normalized.keepPlaying;
  if (safeRestore.shouldClearMessage !== false) {
    manager.actuator.clearMessage(); // Clear Game Over message if present
  }
}

function normalizeUndoRestoreState(manager, undoRestore) {
  var safeRestore = normalizeUndoStatsRecordObject(undoRestore, {});
  var defaultUndoUsed = Number.isInteger(manager.undoUsed) && manager.undoUsed >= 0 ? manager.undoUsed : 0;
  return {
    comboStreak: Number.isInteger(safeRestore.comboStreak) && safeRestore.comboStreak >= 0
      ? safeRestore.comboStreak
      : 0,
    successfulMoveCount:
      Number.isInteger(safeRestore.successfulMoveCount) && safeRestore.successfulMoveCount >= 0
        ? safeRestore.successfulMoveCount
        : 0,
    lockConsumedAtMoveCount: Number.isInteger(safeRestore.lockConsumedAtMoveCount)
      ? safeRestore.lockConsumedAtMoveCount
      : -1,
    lockedDirectionTurn: Number.isInteger(safeRestore.lockedDirectionTurn)
      ? safeRestore.lockedDirectionTurn
      : null,
    lockedDirection: Number.isInteger(safeRestore.lockedDirection)
      ? safeRestore.lockedDirection
      : null,
    undoUsed: Number.isInteger(safeRestore.undoUsed) && safeRestore.undoUsed >= 0
      ? safeRestore.undoUsed
      : (defaultUndoUsed + 1),
    over: typeof safeRestore.over === "boolean" ? safeRestore.over : false,
    won: typeof safeRestore.won === "boolean" ? safeRestore.won : false,
    keepPlaying: typeof safeRestore.keepPlaying === "boolean" ? safeRestore.keepPlaying : false
  };
}

function canApplyUndoMove(manager) {
  if (!manager) return false;
  var canUndoOperation = manager.replayMode || manager.isUndoInteractionEnabled();
  var hasRemainingUndoBudget = manager.undoLimit === null || manager.undoUsed < manager.undoLimit;
  return !!(canUndoOperation && hasRemainingUndoBudget && manager.undoStack.length > 0);
}

function restoreUndoStateFromStackEntry(manager, prev) {
  if (!manager) return null;
  var undoPayload = computeUndoRestorePayload(manager, prev);
  applyUndoRestoredTiles(manager, undoPayload);
  var undoRestore = computeUndoRestoreState(manager, prev);
  applyUndoRestoreState(manager, undoRestore);
  return undoRestore;
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

function finalizeUndoMove(manager, undoRestore, direction) {
  if (!manager) return;
  actuate(manager);
  var shouldStartTimerAfterUndo = typeof undoRestore.shouldStartTimer === "boolean"
    ? undoRestore.shouldStartTimer
    : manager.timerStatus === 0;
  if (shouldStartTimerAfterUndo) {
    manager.startTimer();
  }
  manager.publishAdapterMoveResult({
    reason: "undo",
    direction: direction,
    moved: true
  });
}

function handleUndoMove(manager, direction) {
  if (!manager || direction != -1) return false;
  if (!canApplyUndoMove(manager)) {
    return true;
  }

  var prev = manager.normalizeUndoStackEntry(manager.undoStack.pop());
  var undoRestore = restoreUndoStateFromStackEntry(manager, prev) || {};
  var postUndoRecord = computePostUndoRecord(manager, direction);
  applyPostUndoRecordArtifacts(manager, postUndoRecord, direction);
  finalizeUndoMove(manager, undoRestore, direction);
  return true;
}

function computeUndoRestoreState(manager, prev) {
  if (!manager) return null;
  return resolveCoreUndoRestoreObjectCallOrFallback(
    manager,
    "computeUndoRestoreState",
    {
      prev: prev || {},
      fallbackUndoUsed: manager.undoUsed,
      timerStatus: manager.timerStatus
    },
    function () {
      var source = normalizeUndoStatsRecordObject(prev, {});
      var fallbackState = manager.getUndoStateFallbackValues();
      var undoBase = Number.isInteger(source.undoUsed) && source.undoUsed >= 0
        ? source.undoUsed
        : fallbackState.undoUsed;
      return {
        comboStreak: Number.isInteger(source.comboStreak) && source.comboStreak >= 0 ? source.comboStreak : 0,
        successfulMoveCount:
          Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
            ? source.successfulMoveCount
            : 0,
        lockConsumedAtMoveCount: Number.isInteger(source.lockConsumedAtMoveCount) ? source.lockConsumedAtMoveCount : -1,
        lockedDirectionTurn: Number.isInteger(source.lockedDirectionTurn) ? source.lockedDirectionTurn : null,
        lockedDirection: Number.isInteger(source.lockedDirection) ? source.lockedDirection : null,
        undoUsed: undoBase + 1,
        over: false,
        won: false,
        keepPlaying: false,
        shouldClearMessage: true,
        shouldStartTimer: manager.timerStatus === 0
      };
    }
  );
}

function createUndoRestoreTile(manager, snapshot) {
  if (!manager) return null;
  var source = manager.isNonArrayObject(snapshot) ? snapshot : {};
  var previous = manager.isNonArrayObject(source.previousPosition) ? source.previousPosition : {};
  var fallback = {
    x: source.x,
    y: source.y,
    value: source.value,
    previousPosition: {
      x: previous.x,
      y: previous.y
    }
  };

  var normalizedByCore = resolveCoreUndoTileRestoreNormalizedCallOrUndefined(
    manager,
    "createUndoRestoreTile",
    {
      x: source.x,
      y: source.y,
      value: source.value,
      previousPosition: {
        x: previous.x,
        y: previous.y
      }
    },
    function (computed) {
      if (
        manager.isNonArrayObject(computed) &&
        computed.previousPosition &&
        manager.isNonArrayObject(computed.previousPosition)
      ) {
        return computed;
      }
      return null;
    }
  );
  if (normalizedByCore) return normalizedByCore;

  return fallback;
}

function computeUndoRestorePayload(manager, prev) {
  if (!manager) return null;
  return resolveCoreUndoRestorePayloadObjectCallOrFallback(
    manager,
    "computeUndoRestorePayload",
    {
      prev: prev || {},
      fallbackScore: manager.score
    },
    function () {
      var source = normalizeUndoStatsRecordObject(prev, {});
      var score = Number.isFinite(source.score) && typeof source.score === "number"
        ? Number(source.score)
        : (Number.isFinite(manager.score) && typeof manager.score === "number" ? Number(manager.score) : 0);
      var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
      var tiles = [];
      for (var i = 0; i < rawTiles.length; i++) {
        var item = rawTiles[i];
        if (!manager.isNonArrayObject(item)) continue;
        tiles.push(item);
      }
      return {
        score: score,
        tiles: tiles
      };
    }
  );
}

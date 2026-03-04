function isReplayRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizeReplayRecordObject(value, fallback) {
  return isReplayRecordObject(value) ? value : fallback;
}

var V9_VERSE_PNG_CHARSET = [
  " ", "!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?",
  "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O",
  "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\", "]", "^", "_",
  "`", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o",
  "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~",
  "Ç", "ü", "é", "â", "ä", "à", "å", "ç", "ê", "ë", "è", "ï", "î", "ì",
  "Ä", "Å", "É", "æ", "Æ", "ô", "ö", "ò", "û", "ù",
  "ÿ", "Ö", "Ü", "ø", "£", "Ø", "×", "ƒ", "á"
];

var v9VersePngMapDictCache = null;

function resolveReplayPauseStateFallback() {
  return {
    isPaused: true,
    shouldClearInterval: true
  };
}

function normalizeReplayPauseState(manager, state) {
  return manager.isNonArrayObject(state) ? state : {};
}

function normalizeReplayTickToken(value) {
  var token = Number(value);
  if (!Number.isFinite(token) || token < 0) return 0;
  return Math.floor(token);
}

function bumpReplayTickToken(manager) {
  if (!manager) return 0;
  var nextToken = normalizeReplayTickToken(manager.replayTickToken) + 1;
  manager.replayTickToken = nextToken;
  return nextToken;
}

function isReplayTickTokenActive(manager, token) {
  if (!manager) return false;
  return normalizeReplayTickToken(manager.replayTickToken) === normalizeReplayTickToken(token);
}

function pauseReplay(manager) {
  if (!manager) return;
  var state = resolveCorePayloadCallWith(manager, "callCoreReplayTimerRuntime", "computeReplayPauseState", {}, {}, function (currentManager, coreCallResult) {
    return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
      return resolveReplayPauseStateFallback();
    });
  });
  var pauseState = normalizeReplayPauseState(manager, state);
  manager.isPaused = pauseState.isPaused !== false;
  bumpReplayTickToken(manager);
  if (pauseState.shouldClearInterval !== false) {
    clearInterval(manager.replayInterval);
  }
}

function resolveReplayResumeState(manager) {
  var state = resolveCorePayloadCallWith(manager, "callCoreReplayTimerRuntime", "computeReplayResumeState", { replayDelay: manager.replayDelay }, {}, function (currentManager, coreCallResult) {
    return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
      return { isPaused: false, shouldClearInterval: true, delay: manager.replayDelay || 200 };
    });
  });
  return manager.isNonArrayObject(state) ? state : {};
}

function resolveReplayShouldStopAtTick(manager) {
  return resolveCorePayloadCallWith(manager, "callCoreReplayTimerRuntime", "shouldStopReplayAtTick", {
    replayIndex: manager.replayIndex,
    replayMovesLength: manager.replayMoves.length
  }, false, function (currentManager, coreCallResult) {
    return currentManager.resolveCoreBooleanCallOrFallback(coreCallResult, function () {
      return manager.replayIndex >= manager.replayMoves.length;
    });
  });
}

function resolveReplayEndStateAtTick(manager, shouldStopAtTick) {
  if (!shouldStopAtTick) return undefined;
  return resolveCorePayloadCallWith(manager, "callCoreReplayFlowRuntime", "computeReplayEndState", {}, {}, function (currentManager, coreCallResult) {
    return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
      return { shouldPause: true, replayMode: false };
    });
  });
}

function createReplayTickBoundaryPayload(shouldStopAtTick, replayEndState) {
  return {
    shouldStopAtTick: shouldStopAtTick,
    replayEndState: replayEndState
  };
}

function createReplayTickBoundaryFallback(shouldStopAtTick, replayEndState) {
  if (!shouldStopAtTick) {
    return {
      shouldStop: false,
      shouldPause: false,
      shouldApplyReplayMode: false,
      replayMode: true
    };
  }
  return {
    shouldStop: true,
    shouldPause: replayEndState && replayEndState.shouldPause !== false,
    shouldApplyReplayMode: true,
    replayMode: replayEndState && replayEndState.replayMode === true
  };
}

function resolveReplayTickBoundaryPlan(manager, shouldStopAtTick, replayEndState) {
  return resolveCorePayloadCallWith(
    manager,
    "callCoreReplayControlRuntime",
    "planReplayTickBoundary",
    createReplayTickBoundaryPayload(shouldStopAtTick, replayEndState),
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return createReplayTickBoundaryFallback(shouldStopAtTick, replayEndState);
      });
    }
  );
}

function applyReplayTickBoundaryPlan(manager, tickBoundaryPlan) {
  if (!(tickBoundaryPlan && tickBoundaryPlan.shouldStop === true)) return false;
  if (tickBoundaryPlan.shouldPause) {
    pauseReplay(manager);
  }
  if (tickBoundaryPlan.shouldApplyReplayMode) {
    manager.replayMode = tickBoundaryPlan.replayMode;
  }
  return true;
}

function executeReplayIntervalTick(manager, replayTickToken) {
  if (!manager) return;
  if (manager.isPaused) return;
  if (manager.replayMode === false) return;
  if (typeof replayTickToken !== "undefined" && !isReplayTickTokenActive(manager, replayTickToken)) return;
  var shouldStopAtTick = resolveReplayShouldStopAtTick(manager);
  var replayEndState = resolveReplayEndStateAtTick(manager, shouldStopAtTick);
  var tickBoundaryPlan = resolveReplayTickBoundaryPlan(manager, shouldStopAtTick, replayEndState);
  if (applyReplayTickBoundaryPlan(manager, tickBoundaryPlan)) return;
  executePlannedReplayStep(manager);
}

function resumeReplay(manager) {
  if (!manager) return;
  var resumeState = resolveReplayResumeState(manager);
  manager.isPaused = !!resumeState.isPaused;
  if (resumeState.shouldClearInterval !== false) {
    clearInterval(manager.replayInterval);
  }
  var replayTickToken = bumpReplayTickToken(manager);
  manager.replayInterval = setInterval(function () {
    executeReplayIntervalTick(manager, replayTickToken);
  }, resumeState.delay);
}

function createReplaySpeedPayload(manager, multiplier) {
  return {
    multiplier: multiplier,
    isPaused: !!manager.isPaused,
    baseDelay: 200
  };
}

function createReplaySpeedFallback(manager, multiplier) {
  return {
    replayDelay: 200 / multiplier,
    shouldResume: !manager.isPaused
  };
}

function resolveReplaySpeedState(manager, multiplier) {
  if (!manager) return {};
  var state = resolveCorePayloadCallWith(
    manager,
    "callCoreReplayTimerRuntime",
    "computeReplaySpeedState",
    createReplaySpeedPayload(manager, multiplier),
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return createReplaySpeedFallback(currentManager, multiplier);
      });
    }
  );
  return manager.isNonArrayObject(state) ? state : {};
}

function setReplaySpeed(manager, multiplier) {
  if (!manager) return;
  var state = resolveReplaySpeedState(manager, multiplier);
  manager.replayDelay = state.replayDelay;
  if (!state.shouldResume) return;
  resumeReplay(manager);
}

function createReplaySeekTargetNormalizePayload(manager, targetIndex) {
  return {
    targetIndex: targetIndex,
    replayIndex: manager.replayIndex,
    hasReplayMoves: !!manager.replayMoves,
    replayMovesLength: manager.replayMoves ? manager.replayMoves.length : 0
  };
}

function normalizeReplaySeekTargetIndexFromCore(coreValue) {
  var resolved = Number(coreValue);
  return Number.isFinite(resolved) ? resolved : undefined;
}

function normalizeReplaySeekTargetIndexFallback(manager, targetIndex) {
  var nextTargetIndex = Number(targetIndex);
  if (!Number.isFinite(nextTargetIndex)) {
    nextTargetIndex = Number(manager.replayIndex);
  }
  if (!Number.isFinite(nextTargetIndex)) {
    nextTargetIndex = 0;
  }
  nextTargetIndex = Math.floor(nextTargetIndex);
  if (nextTargetIndex < 0) nextTargetIndex = 0;
  if (manager.replayMoves && nextTargetIndex > manager.replayMoves.length) {
    nextTargetIndex = manager.replayMoves.length;
  }
  return nextTargetIndex;
}

function normalizeReplaySeekTargetIndex(manager, targetIndex) {
  return resolveCorePayloadCallWith(manager, "callCoreReplayLifecycleRuntime", "normalizeReplaySeekTarget", createReplaySeekTargetNormalizePayload(manager, targetIndex), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeReplaySeekTargetIndexFromCore(coreValue);
    }, function () {
      return normalizeReplaySeekTargetIndexFallback(currentManager, targetIndex);
    });
  });
}

function createReplaySeekRewindPayload(manager, normalizedTargetIndex) {
  return {
    targetIndex: normalizedTargetIndex,
    replayIndex: manager.replayIndex,
    hasReplayStartBoard: !!manager.replayStartBoardMatrix
  };
}

function createReplaySeekRewindFallback(manager, normalizedTargetIndex) {
  if (!(normalizedTargetIndex < manager.replayIndex)) {
    return {
      shouldRewind: false,
      strategy: "none",
      replayIndexAfterRewind: manager.replayIndex
    };
  }
  return {
    shouldRewind: true,
    strategy: manager.replayStartBoardMatrix ? "board" : "seed",
    replayIndexAfterRewind: 0
  };
}

function resolveReplaySeekRewindPlan(manager, normalizedTargetIndex) {
  var rewindPlan = resolveCorePayloadCallWith(
    manager,
    "callCoreReplayFlowRuntime",
    "planReplaySeekRewind",
    createReplaySeekRewindPayload(manager, normalizedTargetIndex),
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return createReplaySeekRewindFallback(manager, normalizedTargetIndex);
      });
    }
  );
  return manager.isNonArrayObject(rewindPlan) ? rewindPlan : null;
}

function createReplaySeekRestartPayload(manager, normalizedRewindPlan) {
  return {
    shouldRewind: !!(normalizedRewindPlan && normalizedRewindPlan.shouldRewind),
    strategy: normalizedRewindPlan ? normalizedRewindPlan.strategy : "none",
    replayIndexAfterRewind: normalizedRewindPlan ? normalizedRewindPlan.replayIndexAfterRewind : manager.replayIndex
  };
}

function createReplaySeekRestartFallback(manager, normalizedRewindPlan) {
  var shouldRewind = !!(normalizedRewindPlan && normalizedRewindPlan.shouldRewind);
  if (!shouldRewind) {
    return {
      shouldRestartWithBoard: false,
      shouldRestartWithSeed: false,
      shouldApplyReplayIndex: false,
      replayIndex: normalizedRewindPlan ? normalizedRewindPlan.replayIndexAfterRewind : manager.replayIndex
    };
  }
  return {
    shouldRestartWithBoard: normalizedRewindPlan.strategy === "board",
    shouldRestartWithSeed: normalizedRewindPlan.strategy === "seed",
    shouldApplyReplayIndex: true,
    replayIndex: normalizedRewindPlan.replayIndexAfterRewind
  };
}

function resolveReplaySeekRestartPlan(manager, normalizedRewindPlan) {
  return resolveCorePayloadCallWith(
    manager,
    "callCoreReplayFlowRuntime",
    "planReplaySeekRestart",
    createReplaySeekRestartPayload(manager, normalizedRewindPlan),
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return createReplaySeekRestartFallback(currentManager, normalizedRewindPlan);
      });
    }
  );
}

function applyReplaySeekRestartPlan(manager, restartPlan) {
  if (!manager.isNonArrayObject(restartPlan)) return;
  if (restartPlan.shouldRestartWithBoard) {
    restartWithBoard(manager, manager.replayStartBoardMatrix, manager.modeConfig, { asReplay: true });
  }
  if (restartPlan.shouldRestartWithSeed) {
    restartWithSeed(manager, manager.initialSeed, manager.modeConfig);
  }
  if (restartPlan.shouldApplyReplayIndex) {
    manager.replayIndex = restartPlan.replayIndex;
  }
}

function executeReplaySeekSteps(manager, normalizedTargetIndex) {
  while (manager.replayIndex < normalizedTargetIndex) {
    executePlannedReplayStep(manager);
  }
}

function createReplaySeekActuationGuard(manager) {
  var actuator = manager ? manager.actuator : null;
  return {
    originalActuate: manager && typeof manager.actuate === "function" ? manager.actuate : null,
    actuator: actuator,
    hadForceSyncActuate: !!(actuator && actuator.forceSyncActuate === true)
  };
}

function beginReplaySeekActuationGuard(manager, guard) {
  if (!(manager && guard)) return;
  if (guard.actuator && typeof guard.actuator.cancelPendingActuation === "function") {
    guard.actuator.cancelPendingActuation();
  }
  if (guard.originalActuate) manager.actuate = function () {};
}

function restoreReplaySeekActuationGuard(manager, guard) {
  if (!(manager && guard && guard.originalActuate)) return;
  manager.actuate = guard.originalActuate;
  if (guard.actuator) guard.actuator.forceSyncActuate = true;
  if (manager.actuator && typeof manager.actuator.invalidateLayoutCache === "function") {
    manager.actuator.invalidateLayoutCache();
  }
  if (typeof manager.clearTransientTileVisualState === "function") {
    manager.clearTransientTileVisualState();
  }
  manager.actuate();
  if (guard.actuator) guard.actuator.forceSyncActuate = guard.hadForceSyncActuate;
}

function executeReplaySeekWithoutIntermediateActuation(manager, callback) {
  if (!manager || typeof callback !== "function") return;
  var guard = createReplaySeekActuationGuard(manager);
  beginReplaySeekActuationGuard(manager, guard);
  try {
    callback();
  } finally {
    restoreReplaySeekActuationGuard(manager, guard);
  }
}

function seekReplay(manager, targetIndex) {
  if (!manager) return;
  var normalizedTargetIndex = normalizeReplaySeekTargetIndex(manager, targetIndex);
  executeReplaySeekWithoutIntermediateActuation(manager, function () {
    pauseReplay(manager);
    var normalizedRewindPlan = resolveReplaySeekRewindPlan(manager, normalizedTargetIndex);
    var restartPlan = resolveReplaySeekRestartPlan(manager, normalizedRewindPlan);
    applyReplaySeekRestartPlan(manager, restartPlan);
    executeReplaySeekSteps(manager, normalizedTargetIndex);
  });
}

function stepReplay(manager, delta) {
  if (!manager || !manager.replayMoves) return;
  var normalizedDelta = Number(delta);
  if (!Number.isFinite(normalizedDelta)) return;
  normalizedDelta = normalizedDelta > 0 ? Math.floor(normalizedDelta) : Math.ceil(normalizedDelta);
  if (normalizedDelta === 0) return;
  manager.seek(manager.replayIndex + normalizedDelta);
}

function keepPlaying(manager) {
  if (!manager) return;
  manager.keepPlaying = true;
  manager.actuator.continue();
}

function clearTransientTileVisualState(manager) {
  if (!manager || !manager.grid || typeof manager.grid.eachCell !== "function") return;
  manager.grid.eachCell(function (_x, _y, tile) {
    if (!tile) return;
    tile.previousPosition = null;
    tile.mergedFrom = null;
  });
}

function recordPracticeCustomTileActionIfNeeded(manager, x, y, value) {
  if (!manager.replayMode && manager.sessionReplayV3 && manager.modeKey === "practice_legacy") {
    manager.sessionReplayV3.actions.push(["p", x, y, value]);
    appendCompactPracticeAction(manager, x, y, value);
  }
}

function removeCustomTileExistingAtCell(manager, cell) {
  var existingTile = manager.grid.cellContent(cell);
  if (existingTile) {
    manager.grid.removeTile(existingTile);
  }
}

function resolveInvalidatedTimerElementIdsFallback(manager, value) {
  var milestones = manager.timerMilestones || manager.getTimerMilestoneValues();
  var timerSlots = GameManager.TIMER_SLOT_IDS;
  var elementIds = [];
  for (var milestoneIndex = 0; milestoneIndex < timerSlots.length; milestoneIndex++) {
    var milestoneValue = milestones[milestoneIndex];
    var slotId = timerSlots[milestoneIndex];
    if (!(Number.isInteger(milestoneValue) && milestoneValue <= value)) continue;
    elementIds.push("timer" + slotId);
  }
  return elementIds;
}

function applyInvalidatedSubTimersForReached32k(manager, value) {
  if (!(manager.reached32k && !manager.isFibonacciMode())) return;
  if (8192 <= value && value !== 32768) {
    var subTimer8192El = resolveManagerElementById(manager, "timer8192-sub");
    if (subTimer8192El) subTimer8192El.textContent = "---------";
  }
  if (16384 <= value && value !== 32768) {
    var subTimer16384El = resolveManagerElementById(manager, "timer16384-sub");
    if (subTimer16384El) subTimer16384El.textContent = "---------";
  }
}

function createInvalidatedTimerElementIdsPayload(manager, value) {
  return {
    timerMilestones: manager.timerMilestones || manager.getTimerMilestoneValues(),
    timerSlotIds: GameManager.TIMER_SLOT_IDS,
    limit: value,
    reached32k: !!manager.reached32k,
    isFibonacciMode: manager.isFibonacciMode()
  };
}

function normalizeInvalidatedTimerElementIdsFromCore(coreValue) {
  return Array.isArray(coreValue) ? coreValue : [];
}

function resolveInvalidatedTimerElementIdsByCore(manager, value) {
  return resolveCoreArgsCallWith(
    manager,
    "callCoreTimerIntervalRuntime",
    "resolveInvalidatedTimerElementIds",
    [createInvalidatedTimerElementIdsPayload(manager, value)],
    undefined,
    function (currentManager, coreCallResult) {
      return currentManager.resolveNormalizedCoreValueOrUndefined(coreCallResult, function (coreValue) {
        return normalizeInvalidatedTimerElementIdsFromCore(coreValue);
      });
    }
  );
}

function applyInvalidatedTimerPlaceholdersForCustomTile(manager, value) {
  var invalidatedTimerElementIdsByCore = resolveInvalidatedTimerElementIdsByCore(manager, value);
  if (typeof invalidatedTimerElementIdsByCore !== "undefined") {
    applyInvalidatedTimerPlaceholders(manager, invalidatedTimerElementIdsByCore);
    return;
  }
  applyInvalidatedTimerPlaceholders(manager, resolveInvalidatedTimerElementIdsFallback(manager, value));
  applyInvalidatedSubTimersForReached32k(manager, value);
}

function applyCustomTileReached32kState(manager, value) {
  if (value < 32768) return;
  manager.reached32k = true;
  var subContainer = resolveManagerElementById(manager, "timer32k-sub-container");
  if (subContainer) subContainer.style.display = "block";
  var timerRow16 = resolveManagerElementById(manager, "timer-row-16");
  if (timerRow16) timerRow16.style.display = "none";
  var timerRow32 = resolveManagerElementById(manager, "timer-row-32");
  if (timerRow32) timerRow32.style.display = "none";
  if (value !== 32768) return;
  var timeStr = manager.pretty(manager.time);
  var timer32k = resolveManagerElementById(manager, "timer32768");
  if (timer32k && timer32k.textContent === "") {
    timer32k.textContent = timeStr;
  }
}

function insertCustomTile(manager, x, y, value) {
  if (!manager) return;
  if (manager.isBlockedCell(x, y)) throw "Blocked cell cannot be edited";
  var cell = { x: x, y: y };
  removeCustomTileExistingAtCell(manager, cell);
  if (value === 0) {
    recordPracticeCustomTileActionIfNeeded(manager, x, y, value);
    clearTransientTileVisualState(manager); actuate(manager); return;
  }
  var tile = new Tile({ x: x, y: y }, value);
  manager.grid.insertTile(tile);
  applyInvalidatedTimerPlaceholdersForCustomTile(manager, value);
  applyCustomTileReached32kState(manager, value);
  clearTransientTileVisualState(manager);
  actuate(manager);
  recordPracticeCustomTileActionIfNeeded(manager, x, y, value);
}

function readFinalBoardTileValue(manager, x, y) {
  var tile = manager.grid.cellContent({ x: x, y: y });
  return tile ? tile.value : 0;
}

function createFinalBoardMatrixFallback(manager) {
  var rows = [];
  for (var y = 0; y < manager.height; y++) {
    var row = [];
    for (var x = 0; x < manager.width; x++) {
      row.push(readFinalBoardTileValue(manager, x, y));
    }
    rows.push(row);
  }
  return rows;
}

function createFinalBoardMatrixCoreArgs(manager) {
  return [
    manager.width,
    manager.height,
    function (x, y) {
      return readFinalBoardTileValue(manager, x, y);
    }
  ];
}

function getFinalBoardMatrix(manager) {
  if (!manager) return [];
  return resolveCoreArgsCallWith(manager, "callCoreGridScanRuntime", "buildBoardMatrix", createFinalBoardMatrixCoreArgs(manager), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return Array.isArray(coreValue) ? coreValue : null;
    }, function () {
      return createFinalBoardMatrixFallback(currentManager);
    });
  });
}

function createDefaultReplayV3Session(manager) {
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
    seed: manager.initialSeed,
    actions: []
  };
}

function resolveReplayV3SessionSource(manager) {
  var replay = manager.sessionReplayV3 || createDefaultReplayV3Session(manager);
  return normalizeReplayRecordObject(replay, {});
}

function createSerializedReplayV3(manager, source) {
  return {
    v: 3,
    mode: manager.getLegacyModeFromModeKey(source.mode_key || source.mode || manager.modeKey || manager.mode),
    mode_key: source.mode_key || manager.modeKey,
    board_width: source.board_width || manager.width,
    board_height: source.board_height || manager.height,
    ruleset: source.ruleset || manager.ruleset,
    undo_enabled: typeof source.undo_enabled === "boolean" ? source.undo_enabled : !!manager.modeConfig.undo_enabled,
    mode_family: source.mode_family || manager.modeFamily,
    rank_policy: source.rank_policy || manager.rankPolicy,
    special_rules_snapshot: manager.clonePlain(source.special_rules_snapshot || manager.specialRules || {}),
    challenge_id: source.challenge_id || manager.challengeId || null,
    seed: source.seed,
    actions: Array.isArray(source.actions) ? source.actions.slice() : []
  };
}

function serializeReplayV3(manager) {
  if (!manager) return { v: 3, actions: [] };
  var source = resolveReplayV3SessionSource(manager);
  return createSerializedReplayV3(manager, source);
}

function writeAutoSubmitResultRecord(manager, payload) {
  if (!manager) return;
  manager.writeLocalStorageJsonPayload("last_session_submit_result_v1", payload);
}

function resolveAutoSubmitSkippedReason(manager) {
  if (!manager) return "manager_missing";
  if (manager.replayMode) return "replay_mode";
  if (!isSessionTerminated(manager)) return "not_terminated";
  return null;
}

function writeAutoSubmitSkippedResult(manager, skippedReason) {
  writeAutoSubmitResultRecord(manager, {
    at: new Date().toISOString(),
    ok: false,
    skipped: true,
    reason: skippedReason
  });
}

function resolveAutoSubmitParitySnapshot(manager) {
  var parity = {
    report: manager.getAdapterSessionParitySnapshot("readAdapterParityReport", "adapterParityReport"),
    diff: manager.getAdapterSessionParitySnapshot("readAdapterParityABDiff", "adapterParityABDiff")
  };
  return normalizeReplayRecordObject(parity, {});
}

function createAutoSubmitBestTileResolveArgs(manager) {
  return [getFinalBoardMatrix(manager)];
}

function normalizeAutoSubmitBestTileFromCore(rawBestTileValue) {
  var bestValue = Number(rawBestTileValue);
  if (!Number.isFinite(bestValue) || bestValue < 0) return null;
  return bestValue;
}

function resolveAutoSubmitBestTileFallback(currentManager) {
  var best = 0;
  currentManager.grid.eachCell(function (_x, _y, tile) {
    if (tile && tile.value > best) best = tile.value;
  });
  return best;
}

function resolveAutoSubmitBestTileValue(manager) {
  return resolveCoreArgsCallWith(manager, "callCoreGridScanRuntime", "getBestTileValue", createAutoSubmitBestTileResolveArgs(manager), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (rawBestTileValue) {
      return normalizeAutoSubmitBestTileFromCore(rawBestTileValue);
    }, function () {
      return resolveAutoSubmitBestTileFallback(currentManager);
    });
  });
}

function buildAutoSubmitPayloadParityFields(paritySnapshot) {
  return {
    adapter_parity_report_v2: paritySnapshot.report,
    adapter_parity_ab_diff_v2: paritySnapshot.diff,
    adapter_parity_report_v1: paritySnapshot.report,
    adapter_parity_ab_diff_v1: paritySnapshot.diff
  };
}

function buildAutoSubmitPayloadClientFields(windowLike, manager) {
  return {
    client_version: (windowLike && windowLike.GAME_CLIENT_VERSION) || "1.8",
    end_reason: manager.over ? "game_over" : "win_stop"
  };
}

function assignAutoSubmitPayloadFields(target, fields) {
  var fieldKeys = Object.keys(fields);
  for (var fieldIndex = 0; fieldIndex < fieldKeys.length; fieldIndex++) {
    var fieldKey = fieldKeys[fieldIndex];
    target[fieldKey] = fields[fieldKey];
  }
}

function buildAutoSubmitPayloadBase(manager, endedAt, bestTileValue) {
  return {
    mode: manager.getLegacyModeFromModeKey(manager.modeKey || manager.mode),
    mode_key: manager.modeKey, board_width: manager.width, board_height: manager.height,
    ruleset: manager.ruleset, undo_enabled: !!manager.modeConfig.undo_enabled,
    ranked_bucket: manager.rankedBucket, mode_family: manager.modeFamily, rank_policy: manager.rankPolicy,
    challenge_id: manager.challengeId || null,
    special_rules_snapshot: manager.clonePlain(manager.specialRules || {}),
    score: manager.score, best_tile: bestTileValue, duration_ms: getDurationMs(manager),
    final_board: getFinalBoardMatrix(manager), ended_at: endedAt, replay: serializeReplayV3(manager),
    replay_string: serializeReplay(manager)
  };
}

function buildAutoSubmitPayload(manager, endedAt, paritySnapshot) {
  var windowLike = manager.getWindowLike();
  var bestTileValue = resolveAutoSubmitBestTileValue(manager);
  var payload = buildAutoSubmitPayloadBase(manager, endedAt, bestTileValue);
  var parityFields = buildAutoSubmitPayloadParityFields(paritySnapshot);
  var clientFields = buildAutoSubmitPayloadClientFields(windowLike, manager);
  assignAutoSubmitPayloadFields(payload, parityFields);
  assignAutoSubmitPayloadFields(payload, clientFields);
  return payload;
}

function writeAutoSubmitSuccessResult(manager, endedAt, payload, savedRecord) {
  writeAutoSubmitResultRecord(manager, {
    at: endedAt,
    ok: true,
    mode_key: payload.mode_key,
    score: payload.score,
    local_saved: true,
    record_id: savedRecord && savedRecord.id ? savedRecord.id : null
  });
}

function writeAutoSubmitErrorResult(manager, endedAt, payload, error) {
  writeAutoSubmitResultRecord(manager, {
    at: endedAt,
    ok: false,
    mode_key: payload.mode_key,
    score: payload.score,
    error: error && error.message ? error.message : "local_save_failed"
  });
}

function resolveLocalHistorySaveRecord(manager) {
  if (!manager) return null;
  return manager.resolveWindowNamespaceMethod("LocalHistoryStore", "saveRecord");
}

function writeLocalHistoryStoreMissingResult(manager) {
  writeAutoSubmitResultRecord(manager, {
    at: new Date().toISOString(),
    ok: false,
    reason: "local_history_store_missing"
  });
}

function createAutoSubmitExecutionContext(manager) {
  var endedAt = new Date().toISOString();
  var paritySnapshot = resolveAutoSubmitParitySnapshot(manager);
  return {
    endedAt: endedAt,
    payload: buildAutoSubmitPayload(manager, endedAt, paritySnapshot)
  };
}

function executeAutoSubmitWithLocalHistory(manager, localHistorySaveRecord, executionContext) {
  try {
    var savedRecord = localHistorySaveRecord.method.call(localHistorySaveRecord.scope, executionContext.payload);
    writeAutoSubmitSuccessResult(manager, executionContext.endedAt, executionContext.payload, savedRecord);
  } catch (error) {
    writeAutoSubmitErrorResult(manager, executionContext.endedAt, executionContext.payload, error);
  }
}

function tryAutoSubmitOnGameOver(manager) {
  if (!manager || manager.sessionSubmitDone) return;
  var skippedReason = resolveAutoSubmitSkippedReason(manager);
  if (skippedReason) {
    writeAutoSubmitSkippedResult(manager, skippedReason);
    return;
  }
  var localHistorySaveRecord = resolveLocalHistorySaveRecord(manager);
  if (!localHistorySaveRecord) {
    writeLocalHistoryStoreMissingResult(manager);
    return;
  }
  manager.sessionSubmitDone = true;
  var executionContext = createAutoSubmitExecutionContext(manager);
  executeAutoSubmitWithLocalHistory(manager, localHistorySaveRecord, executionContext);
}

function isSessionTerminated(manager) {
  if (!manager) return false;
  return !!(manager.over || (manager.won && !manager.keepPlaying));
}

function v9RplCloneBoardMatrix(board) {
  if (!Array.isArray(board)) return [];
  var cloned = [];
  for (var y = 0; y < board.length; y++) {
    cloned.push(Array.isArray(board[y]) ? board[y].slice() : []);
  }
  return cloned;
}

function isV9RplBoardMatrix(board) {
  if (!Array.isArray(board) || board.length !== 4) return false;
  for (var y = 0; y < 4; y++) {
    if (!Array.isArray(board[y]) || board[y].length !== 4) return false;
    for (var x = 0; x < 4; x++) {
      var value = Number(board[y][x]);
      if (!Number.isInteger(value) || value < 0) return false;
    }
  }
  return true;
}

function isV9RplPowerOfTwo(value) {
  if (!Number.isInteger(value) || value <= 0) return false;
  return (value & (value - 1)) === 0;
}

function resolveV9RplTileExponent(value) {
  if (!Number.isInteger(value) || value < 0) throw "Invalid v9 .rpl tile value";
  if (value === 0) return 0;
  if (!isV9RplPowerOfTwo(value)) throw "v9 .rpl tile must be a power of two";
  var exponent = 0;
  var current = value;
  while (current > 1) {
    current = current / 2;
    exponent += 1;
  }
  if (exponent > 15) throw "v9 .rpl tile exponent too large";
  return exponent;
}

function encodeV9RplBoardMatrix(board) {
  if (!isV9RplBoardMatrix(board)) throw "Invalid v9 .rpl board matrix";
  var encoded = 0n;
  var positionIndex = 0;
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      var exponent = resolveV9RplTileExponent(Number(board[y][x]));
      encoded |= BigInt(exponent & 15) << BigInt(positionIndex * 4);
      positionIndex += 1;
    }
  }
  return encoded;
}

function decodeV9RplBoardEncoded(boardEncoded) {
  var encoded = BigInt.asUintN(64, typeof boardEncoded === "bigint" ? boardEncoded : BigInt(boardEncoded || 0));
  var board = [];
  var positionIndex = 0;
  for (var y = 0; y < 4; y++) {
    var row = [];
    for (var x = 0; x < 4; x++) {
      var exponent = Number((encoded >> BigInt(positionIndex * 4)) & 15n);
      row.push(exponent === 0 ? 0 : Math.pow(2, exponent));
      positionIndex += 1;
    }
    board.push(row);
  }
  return board;
}

function convertInternalDirectionToV9RplMove(direction) {
  if (direction === 3) return 0; // left
  if (direction === 1) return 1; // right
  if (direction === 0) return 2; // up
  if (direction === 2) return 3; // down
  return null;
}

function convertV9RplMoveToInternalDirection(v9Move) {
  if (v9Move === 0) return 3; // left
  if (v9Move === 1) return 1; // right
  if (v9Move === 2) return 0; // up
  if (v9Move === 3) return 2; // down
  return null;
}

function encodeV9RplActionByte(v9Move, spawnPos, spawnValue) {
  if (!Number.isInteger(v9Move) || v9Move < 0 || v9Move > 3) {
    throw "Invalid v9 .rpl move";
  }
  if (!Number.isInteger(spawnPos) || spawnPos < 0 || spawnPos > 15) {
    throw "Invalid v9 .rpl spawn position";
  }
  var spawnBit = spawnValue === 4 ? 1 : (spawnValue === 2 ? 0 : null);
  if (spawnBit === null) throw "Invalid v9 .rpl spawn value";
  return ((v9Move << 5) | (spawnPos << 1) | spawnBit) & 255;
}

function decodeV9RplActionByte(actionByte) {
  var token = Number(actionByte) & 255;
  return {
    v9Move: (token >> 5) & 3,
    spawnPos: (token >> 1) & 15,
    spawnBit: token & 1
  };
}

function collectV9RplCompactLine(line) {
  var compact = [];
  for (var index = 0; index < line.length; index++) {
    if (line[index] > 0) compact.push(line[index]);
  }
  return compact;
}

function mergeV9RplCompactedLine(compact) {
  var merged = [];
  for (var compactIndex = 0; compactIndex < compact.length; compactIndex++) {
    var current = compact[compactIndex];
    var next = compactIndex + 1 < compact.length ? compact[compactIndex + 1] : null;
    if (next !== null && current === next) {
      merged.push(current * 2);
      compactIndex += 1;
    } else {
      merged.push(current);
    }
  }
  return merged;
}

function mergeV9RplLineToLeft(line) {
  var merged = mergeV9RplCompactedLine(collectV9RplCompactLine(line));
  while (merged.length < 4) merged.push(0);
  return merged;
}

function applyV9RplHorizontalMove(board, nextBoard, v9Move) {
  var moved = false;
  for (var y = 0; y < 4; y++) {
    var sourceRow = v9Move === 0 ? board[y].slice() : board[y].slice().reverse();
    var mergedRow = mergeV9RplLineToLeft(sourceRow);
    var targetRow = v9Move === 0 ? mergedRow : mergedRow.reverse();
    for (var x = 0; x < 4; x++) {
      if (nextBoard[y][x] !== targetRow[x]) moved = true;
      nextBoard[y][x] = targetRow[x];
    }
  }
  return moved;
}

function applyV9RplVerticalMove(board, nextBoard, v9Move) {
  var moved = false;
  for (var x = 0; x < 4; x++) {
    var sourceColumn = [board[0][x], board[1][x], board[2][x], board[3][x]];
    if (v9Move === 3) sourceColumn.reverse();
    var mergedColumn = mergeV9RplLineToLeft(sourceColumn);
    if (v9Move === 3) mergedColumn.reverse();
    for (var y = 0; y < 4; y++) {
      if (nextBoard[y][x] !== mergedColumn[y]) moved = true;
      nextBoard[y][x] = mergedColumn[y];
    }
  }
  return moved;
}

function applyV9RplMoveOnBoard(board, v9Move) {
  if (!isV9RplBoardMatrix(board)) throw "Invalid v9 .rpl board matrix";
  var nextBoard = v9RplCloneBoardMatrix(board);
  if (v9Move === 0 || v9Move === 1) {
    return {
      board: nextBoard,
      moved: applyV9RplHorizontalMove(board, nextBoard, v9Move)
    };
  }
  return {
    board: nextBoard,
    moved: applyV9RplVerticalMove(board, nextBoard, v9Move)
  };
}

function applyV9RplSpawnOnBoard(board, spawn) {
  if (!isV9RplBoardMatrix(board)) throw "Invalid v9 .rpl board matrix";
  if (!(spawn && Number.isInteger(spawn.x) && Number.isInteger(spawn.y))) {
    throw "Invalid v9 .rpl spawn coordinates";
  }
  if (spawn.x < 0 || spawn.x > 3 || spawn.y < 0 || spawn.y > 3) {
    throw "Invalid v9 .rpl spawn coordinates";
  }
  if (spawn.value !== 2 && spawn.value !== 4) {
    throw "Invalid v9 .rpl spawn value";
  }
  if (board[spawn.y][spawn.x] !== 0) {
    throw "Invalid v9 .rpl spawn collision";
  }
  board[spawn.y][spawn.x] = spawn.value;
}

function resolveV9RplInitialBoardForExport(manager) {
  if (!manager) throw "Missing manager";
  if (isV9RplBoardMatrix(manager.initialBoardMatrix)) {
    return v9RplCloneBoardMatrix(manager.initialBoardMatrix);
  }
  if (isV9RplBoardMatrix(manager.replayStartBoardMatrix)) {
    return v9RplCloneBoardMatrix(manager.replayStartBoardMatrix);
  }
  var fallbackBoard = getFinalBoardMatrix(manager);
  if (isV9RplBoardMatrix(fallbackBoard)) {
    return v9RplCloneBoardMatrix(fallbackBoard);
  }
  throw "Unable to resolve v9 .rpl initial board";
}

function resolveDecodedReplayActionsFromReplayState(manager) {
  if (!(manager && manager.replayMode && Array.isArray(manager.replayMoves) && Array.isArray(manager.replaySpawns))) {
    return null;
  }
  return {
    replayMoves: manager.replayMoves.slice(),
    replaySpawns: manager.replaySpawns.slice()
  };
}

function resolveDecodedReplayActionsFromCompactLog(manager) {
  if (!(manager && typeof manager.replayCompactLog === "string")) return null;
  var decoded = decodeReplayV4ActionsFromEnvelope(manager, {
    actionsEncoded: manager.replayCompactLog
  });
  return {
    replayMoves: Array.isArray(decoded && decoded.replayMoves) ? decoded.replayMoves : [],
    replaySpawns: Array.isArray(decoded && decoded.replaySpawns) ? decoded.replaySpawns : []
  };
}

function decodeV9RplReplayActionsForExport(manager) {
  return resolveDecodedReplayActionsFromReplayState(manager) ||
    resolveDecodedReplayActionsFromCompactLog(manager) ||
    { replayMoves: [], replaySpawns: [] };
}

function resolveV9RplBoardAfterUndoStep(steps, initialBoard) {
  if (steps.length > 0) steps.pop();
  if (steps.length > 0) {
    return v9RplCloneBoardMatrix(steps[steps.length - 1].boardAfter);
  }
  return v9RplCloneBoardMatrix(initialBoard);
}

function resolveV9RplExportStepSpawn(spawns, index) {
  var spawn = spawns[index];
  if (!(spawn && Number.isInteger(spawn.x) && Number.isInteger(spawn.y))) {
    throw "Missing v9 .rpl spawn data";
  }
  if (spawn.value !== 2 && spawn.value !== 4) {
    throw "Unsupported v9 .rpl spawn value";
  }
  return spawn;
}

function resolveV9RplForwardExportMove(action) {
  if (Array.isArray(action)) throw "v9 .rpl does not support practice actions";
  var v9Move = convertInternalDirectionToV9RplMove(action);
  if (v9Move === null) throw "v9 .rpl does not support this replay action";
  return v9Move;
}

function createV9RplForwardExportStepRecord(boardBefore, boardAfter, v9Move, spawn) {
  return {
    boardBefore: boardBefore,
    boardAfter: v9RplCloneBoardMatrix(boardAfter),
    v9Move: v9Move,
    spawnPos: spawn.x + spawn.y * 4,
    spawnValue: spawn.value
  };
}

function buildV9RplForwardExportStep(currentBoard, action, spawn) {
  var v9Move = resolveV9RplForwardExportMove(action);
  var boardBefore = v9RplCloneBoardMatrix(currentBoard);
  var moveResult = applyV9RplMoveOnBoard(currentBoard, v9Move);
  if (!moveResult.moved) throw "Invalid v9 .rpl move sequence";
  var boardAfter = moveResult.board;
  applyV9RplSpawnOnBoard(boardAfter, spawn);
  return {
    step: createV9RplForwardExportStepRecord(boardBefore, boardAfter, v9Move, spawn),
    boardAfter: boardAfter
  };
}

function buildV9RplExportSteps(initialBoard, replayMoves, replaySpawns) {
  var moves = Array.isArray(replayMoves) ? replayMoves : [];
  var spawns = Array.isArray(replaySpawns) ? replaySpawns : [];
  var currentBoard = v9RplCloneBoardMatrix(initialBoard);
  var steps = [];
  for (var index = 0; index < moves.length; index++) {
    var action = moves[index];
    if (action === -1) {
      currentBoard = resolveV9RplBoardAfterUndoStep(steps, initialBoard);
      continue;
    }
    var spawn = resolveV9RplExportStepSpawn(spawns, index);
    var builtStep = buildV9RplForwardExportStep(currentBoard, action, spawn);
    currentBoard = builtStep.boardAfter;
    steps.push(builtStep.step);
  }
  return steps;
}

function writeV9RplUint64LE(view, byteOffset, value) {
  var encoded = BigInt.asUintN(64, typeof value === "bigint" ? value : BigInt(value || 0));
  for (var byteIndex = 0; byteIndex < 8; byteIndex++) {
    view.setUint8(byteOffset + byteIndex, Number((encoded >> BigInt(byteIndex * 8)) & 255n));
  }
}

function readV9RplUint64LE(view, byteOffset) {
  var encoded = 0n;
  for (var byteIndex = 0; byteIndex < 8; byteIndex++) {
    encoded |= BigInt(view.getUint8(byteOffset + byteIndex)) << BigInt(byteIndex * 8);
  }
  return encoded;
}

function createV9RplPlaceholderRates(v9Move) {
  var rates = [0, 0, 0, 0];
  if (Number.isInteger(v9Move) && v9Move >= 0 && v9Move < 4) {
    rates[v9Move] = 4000000000;
  }
  return rates;
}

function resolveV9RplSentinelValues() {
  return Array.isArray(GameManager.REPLAY_V9_RPL_SENTINEL)
    ? GameManager.REPLAY_V9_RPL_SENTINEL
    : [0, 88, 666666666, 233333333, 314159265, 987654321];
}

function createV9RplSentinelRow() {
  var sentinel = resolveV9RplSentinelValues();
  return {
    boardEncoded: BigInt(Number(sentinel[0]) || 0),
    actionByte: Number(sentinel[1]) & 255,
    rates: [
      Number(sentinel[2]) >>> 0,
      Number(sentinel[3]) >>> 0,
      Number(sentinel[4]) >>> 0,
      Number(sentinel[5]) >>> 0
    ]
  };
}

function writeV9RplRecordRow(view, rowIndex, row) {
  var recordBytes = Number(GameManager.REPLAY_V9_RPL_RECORD_BYTES) || 25;
  var byteOffset = rowIndex * recordBytes;
  writeV9RplUint64LE(view, byteOffset, row.boardEncoded);
  byteOffset += 8;
  view.setUint8(byteOffset, Number(row.actionByte) & 255);
  byteOffset += 1;
  var rates = Array.isArray(row.rates) ? row.rates : [0, 0, 0, 0];
  view.setUint32(byteOffset, Number(rates[0]) >>> 0, true);
  byteOffset += 4;
  view.setUint32(byteOffset, Number(rates[1]) >>> 0, true);
  byteOffset += 4;
  view.setUint32(byteOffset, Number(rates[2]) >>> 0, true);
  byteOffset += 4;
  view.setUint32(byteOffset, Number(rates[3]) >>> 0, true);
}

function readV9RplRecordRow(view, rowIndex) {
  var recordBytes = Number(GameManager.REPLAY_V9_RPL_RECORD_BYTES) || 25;
  var byteOffset = rowIndex * recordBytes;
  return {
    boardEncoded: readV9RplUint64LE(view, byteOffset),
    actionByte: view.getUint8(byteOffset + 8),
    rates: [
      view.getUint32(byteOffset + 9, true),
      view.getUint32(byteOffset + 13, true),
      view.getUint32(byteOffset + 17, true),
      view.getUint32(byteOffset + 21, true)
    ]
  };
}

function isV9RplSentinelRow(row) {
  var sentinelRow = createV9RplSentinelRow();
  return row.boardEncoded === sentinelRow.boardEncoded &&
    row.actionByte === sentinelRow.actionByte &&
    row.rates[0] === sentinelRow.rates[0] &&
    row.rates[1] === sentinelRow.rates[1] &&
    row.rates[2] === sentinelRow.rates[2] &&
    row.rates[3] === sentinelRow.rates[3];
}

function buildV9RplBytesFromSteps(steps) {
  var rows = Array.isArray(steps) ? steps : [];
  var recordBytes = Number(GameManager.REPLAY_V9_RPL_RECORD_BYTES) || 25;
  var rowCount = rows.length + 1;
  var buffer = new ArrayBuffer(recordBytes * rowCount);
  var view = new DataView(buffer);
  for (var index = 0; index < rows.length; index++) {
    var step = rows[index];
    writeV9RplRecordRow(view, index, {
      boardEncoded: encodeV9RplBoardMatrix(step.boardBefore),
      actionByte: encodeV9RplActionByte(step.v9Move, step.spawnPos, step.spawnValue),
      rates: createV9RplPlaceholderRates(step.v9Move)
    });
  }
  writeV9RplRecordRow(view, rows.length, createV9RplSentinelRow());
  return new Uint8Array(buffer);
}

function normalizeV9RplBufferLike(sourceBuffer) {
  if (sourceBuffer instanceof ArrayBuffer) {
    return new Uint8Array(sourceBuffer);
  }
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(sourceBuffer)) {
    return new Uint8Array(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength);
  }
  return null;
}

function assertValidV9RplBytesLength(bytes, recordBytes) {
  if (!(bytes && Number.isInteger(bytes.byteLength))) throw "Invalid .rpl payload";
  if (bytes.byteLength < recordBytes * 2 || bytes.byteLength % recordBytes !== 0) {
    throw "Invalid .rpl payload length";
  }
}

function readV9RplRowsFromBytes(bytes, rowCount) {
  var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  var rows = [];
  for (var rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    rows.push(readV9RplRecordRow(view, rowIndex));
  }
  return rows;
}

function decodeV9RplReplayActionsFromRows(stepRows) {
  var replayMoves = [];
  var replaySpawns = [];
  for (var index = 0; index < stepRows.length; index++) {
    var decodedAction = decodeV9RplActionByte(stepRows[index].actionByte);
    var direction = convertV9RplMoveToInternalDirection(decodedAction.v9Move);
    if (direction === null) throw "Invalid .rpl move";
    replayMoves.push(direction);
    replaySpawns.push({
      x: decodedAction.spawnPos % 4,
      y: Math.floor(decodedAction.spawnPos / 4),
      value: decodedAction.spawnBit === 1 ? 4 : 2
    });
  }
  return { replayMoves: replayMoves, replaySpawns: replaySpawns };
}

function parseV9RplBytes(bytes) {
  var recordBytes = Number(GameManager.REPLAY_V9_RPL_RECORD_BYTES) || 25;
  assertValidV9RplBytesLength(bytes, recordBytes);
  var rowCount = bytes.byteLength / recordBytes;
  var rows = readV9RplRowsFromBytes(bytes, rowCount);
  if (!isV9RplSentinelRow(rows[rowCount - 1])) throw "Invalid .rpl sentinel";
  var stepRows = rows.slice(0, rowCount - 1);
  if (!stepRows.length) throw "Empty .rpl replay";
  var decodedActions = decodeV9RplReplayActionsFromRows(stepRows);
  return {
    initialBoard: decodeV9RplBoardEncoded(stepRows[0].boardEncoded),
    replayMoves: decodedActions.replayMoves,
    replaySpawns: decodedActions.replaySpawns
  };
}

function encodeV9RplBytesToBase64(manager, bytes) {
  var windowLike = manager ? manager.getWindowLike() : null;
  var btoaFn = windowLike && typeof windowLike.btoa === "function"
    ? windowLike.btoa
    : (typeof btoa === "function" ? btoa : null);
  if (typeof btoaFn !== "function") throw "Base64 encoder is unavailable";
  var binary = "";
  var chunkSize = 32768;
  for (var offset = 0; offset < bytes.length; offset += chunkSize) {
    var chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoaFn(binary);
}

function decodeV9RplBase64ToBytes(manager, encodedBase64) {
  var windowLike = manager ? manager.getWindowLike() : null;
  var atobFn = windowLike && typeof windowLike.atob === "function"
    ? windowLike.atob
    : (typeof atob === "function" ? atob : null);
  if (typeof atobFn !== "function") throw "Base64 decoder is unavailable";
  var binary = atobFn(encodedBase64);
  var bytes = new Uint8Array(binary.length);
  for (var index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index) & 255;
  }
  return bytes;
}

function assertV9RplExportModeSupported(manager) {
  if (!manager) throw "Missing manager";
  if (manager.width !== 4 || manager.height !== 4 || manager.isFibonacciMode()) {
    throw "v9 .rpl export only supports 4x4 power-of-two modes";
  }
}

function resolveV9RplExportStepsFromManager(manager, initialBoard) {
  var replayActions = decodeV9RplReplayActionsForExport(manager);
  return buildV9RplExportSteps(
    initialBoard,
    replayActions.replayMoves,
    replayActions.replaySpawns
  );
}

function resolveV9RplReplayPayloadForExport(manager) {
  assertV9RplExportModeSupported(manager);
  var initialBoard = resolveV9RplInitialBoardForExport(manager);
  var steps = resolveV9RplExportStepsFromManager(manager, initialBoard);
  if (!steps.length) throw "No v9-compatible replay steps";
  return {
    initialBoard: initialBoard,
    steps: steps,
    bytes: buildV9RplBytesFromSteps(steps)
  };
}

function buildV9RplExportFilename(manager, stepCount) {
  var now = new Date();
  var year = String(now.getFullYear());
  var month = String(now.getMonth() + 1).padStart(2, "0");
  var day = String(now.getDate()).padStart(2, "0");
  var hour = String(now.getHours()).padStart(2, "0");
  var minute = String(now.getMinutes()).padStart(2, "0");
  var second = String(now.getSeconds()).padStart(2, "0");
  var modeKey = String((manager && manager.modeKey) || "standard_4x4_pow2_no_undo").replace(/[^a-zA-Z0-9_-]/g, "_");
  return "replay_" + modeKey + "_" + year + month + day + "_" + hour + minute + second + "_" + String(stepCount) + ".rpl";
}

function serializeReplayAsV9RplBase64(manager) {
  var payload = resolveV9RplReplayPayloadForExport(manager);
  return String(GameManager.REPLAY_V9_RPL_BASE64_PREFIX || "REPLAY_v9RPL_B64_") +
    encodeV9RplBytesToBase64(manager, payload.bytes);
}

function exportReplayAsV9RplBlob(manager) {
  var payload = resolveV9RplReplayPayloadForExport(manager);
  var windowLike = manager ? manager.getWindowLike() : null;
  var BlobCtor = windowLike && typeof windowLike.Blob === "function"
    ? windowLike.Blob
    : (typeof Blob === "function" ? Blob : null);
  if (typeof BlobCtor !== "function") throw "Blob API is unavailable";
  return {
    blob: new BlobCtor([payload.bytes], { type: "application/octet-stream" }),
    filename: buildV9RplExportFilename(manager, payload.steps.length),
    stepCount: payload.steps.length
  };
}

function resolveV9VerseMoveChunkFromV9Move(v9Move) {
  if (v9Move === 0) return 3;
  if (v9Move === 1) return 1;
  if (v9Move === 2) return 0;
  if (v9Move === 3) return 2;
  return null;
}

function validateV9VerseTokenInput(moveChunk, spawnPos, spawnValue) {
  if (!Number.isInteger(moveChunk) || moveChunk < 0 || moveChunk > 3) {
    throw "Invalid v9 verse move chunk";
  }
  if (!Number.isInteger(spawnPos) || spawnPos < 0 || spawnPos > 15) {
    throw "Invalid v9 verse spawn position";
  }
  if (spawnValue !== 2 && spawnValue !== 4) {
    throw "Invalid v9 verse spawn value";
  }
}

function resolveV9VerseTokenValue(moveChunk, spawnPos, spawnValue) {
  var spawnBit = spawnValue === 4 ? 1 : 0;
  return ((moveChunk & 3) << 5) |
    ((spawnBit & 1) << 4) |
    ((spawnPos & 3) << 2) |
    ((spawnPos >> 2) & 3);
}

function encodeV9VerseToken(moveChunk, spawnPos, spawnValue) {
  validateV9VerseTokenInput(moveChunk, spawnPos, spawnValue);
  var token = resolveV9VerseTokenValue(moveChunk, spawnPos, spawnValue);
  if (token < 0 || token >= V9_VERSE_PNG_CHARSET.length) {
    throw "Invalid v9 verse token";
  }
  return V9_VERSE_PNG_CHARSET[token];
}

function resolveV9VerseStartupSpawns(initialBoard) {
  if (!isV9RplBoardMatrix(initialBoard)) throw "Invalid v9 verse initial board";
  var spawns = [];
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      var value = Number(initialBoard[y][x]);
      if (value === 0) continue;
      if (value !== 2 && value !== 4) {
        throw "v9 verse startup tiles must be 2 or 4";
      }
      spawns.push({ x: x, y: y, value: value });
    }
  }
  if (spawns.length !== 2) {
    throw "v9 verse replay requires exactly 2 startup tiles";
  }
  return spawns;
}

function resolveV9VerseReplayPayloadForExport(manager) {
  var payload = resolveV9RplReplayPayloadForExport(manager);
  var startupSpawns = resolveV9VerseStartupSpawns(payload.initialBoard);
  var tokens = [];
  tokens.push(encodeV9VerseToken(0, startupSpawns[0].x + startupSpawns[0].y * 4, startupSpawns[0].value));
  tokens.push(encodeV9VerseToken(0, startupSpawns[1].x + startupSpawns[1].y * 4, startupSpawns[1].value));
  for (var index = 0; index < payload.steps.length; index++) {
    var step = payload.steps[index];
    var moveChunk = resolveV9VerseMoveChunkFromV9Move(step.v9Move);
    if (!Number.isInteger(moveChunk)) throw "Invalid v9 verse move";
    tokens.push(encodeV9VerseToken(moveChunk, step.spawnPos, step.spawnValue));
  }
  var prefix = String(GameManager.REPLAY_V9_VERSE_PREFIX || "replay_");
  return {
    text: prefix + tokens.join(""),
    stepCount: payload.steps.length
  };
}

function serializeReplayAsV9Verse(manager) {
  return resolveV9VerseReplayPayloadForExport(manager).text;
}

function buildV9VerseExportFilename(manager, stepCount) {
  var rplFilename = buildV9RplExportFilename(manager, stepCount);
  if (/\.rpl$/i.test(rplFilename)) return rplFilename.replace(/\.rpl$/i, ".txt");
  return rplFilename + ".txt";
}

function exportReplayAsV9VerseBlob(manager) {
  var payload = resolveV9VerseReplayPayloadForExport(manager);
  var windowLike = manager ? manager.getWindowLike() : null;
  var BlobCtor = windowLike && typeof windowLike.Blob === "function"
    ? windowLike.Blob
    : (typeof Blob === "function" ? Blob : null);
  if (typeof BlobCtor !== "function") throw "Blob API is unavailable";
  return {
    blob: new BlobCtor([payload.text], { type: "text/plain;charset=utf-8" }),
    filename: buildV9VerseExportFilename(manager, payload.stepCount),
    stepCount: payload.stepCount
  };
}

function resolveV9RplReplayModeConfig(manager) {
  if (!manager) return null;
  return manager.resolveModeConfig("standard_4x4_pow2_no_undo") ||
    manager.resolveModeConfig(manager.modeKey || manager.mode) ||
    manager.modeConfig;
}

function applyV9RplStructuredReplayEnvelope(manager, envelope, replayModeConfig) {
  applyReplayImportActions(manager, {
    replayMoves: envelope.replayMoves,
    replaySpawns: envelope.replaySpawns
  });
  manager.disableSessionSync = true;
  restartWithBoard(manager, envelope.initialBoard, replayModeConfig, { asReplay: true });
}

function parseV9RplBufferLike(sourceBuffer) {
  var bytes = normalizeV9RplBufferLike(sourceBuffer);
  if (!bytes) throw "Invalid .rpl buffer";
  return parseV9RplBytes(bytes);
}

function createV9RplStructuredReplayEnvelope(parsed, replayModeConfig) {
  return {
    kind: "v9rpl",
    modeKey: replayModeConfig.key,
    initialBoard: parsed.initialBoard,
    replayMoves: parsed.replayMoves,
    replaySpawns: parsed.replaySpawns
  };
}

function importV9RplBuffer(manager, sourceBuffer) {
  if (!manager) return false;
  try {
    var parsed = parseV9RplBufferLike(sourceBuffer);
    var replayModeConfig = resolveV9RplReplayModeConfig(manager);
    if (!replayModeConfig) throw "Replay mode config is unavailable";
    var envelope = createV9RplStructuredReplayEnvelope(parsed, replayModeConfig);
    applyV9RplStructuredReplayEnvelope(manager, envelope, replayModeConfig);
    applyImportedReplayUndoState(manager);
    startImportedReplayPlayback(manager);
    return true;
  } catch (e) {
    alert("导入 .rpl 回放出错: " + resolveReplayImportErrorMessage(e));
    return false;
  }
}

function resolveV9RplBase64PayloadBody(trimmed) {
  var prefix = String(GameManager.REPLAY_V9_RPL_BASE64_PREFIX || "REPLAY_v9RPL_B64_");
  if (!(typeof trimmed === "string" && trimmed.indexOf(prefix) === 0)) return null;
  return trimmed.substring(prefix.length);
}

function tryParseV9RplBase64ReplayEnvelope(manager, trimmed) {
  var encodedBase64 = resolveV9RplBase64PayloadBody(trimmed);
  if (encodedBase64 === null) return null;
  if (!encodedBase64) throw "Invalid v9 .rpl payload";
  var bytes = decodeV9RplBase64ToBytes(manager, encodedBase64);
  var parsed = parseV9RplBytes(bytes);
  return createV9RplStructuredReplayEnvelope(parsed, { key: "standard_4x4_pow2_no_undo" });
}

function resolveV9VersePngMapDict() {
  if (v9VersePngMapDictCache) return v9VersePngMapDictCache;
  var nextMap = {};
  for (var index = 0; index < V9_VERSE_PNG_CHARSET.length; index++) {
    nextMap[V9_VERSE_PNG_CHARSET[index]] = index;
  }
  v9VersePngMapDictCache = nextMap;
  return v9VersePngMapDictCache;
}

function startsWithIgnoreCase(text, prefix) {
  if (!(typeof text === "string" && typeof prefix === "string" && prefix)) return false;
  if (text.length < prefix.length) return false;
  return text.substring(0, prefix.length).toLowerCase() === prefix.toLowerCase();
}

function isKnownNonVerseReplayPrefix(trimmed) {
  var knownPrefixes = [
    String(GameManager.REPLAY_V4_PREFIX || "REPLAY_v4C_"),
    String(GameManager.REPLAY_V9_RPL_BASE64_PREFIX || "REPLAY_v9RPL_B64_"),
    String(GameManager.LEGACY_REPLAY_V1_PREFIX || "REPLAY_v1_"),
    String(GameManager.LEGACY_REPLAY_V2_PREFIX || "REPLAY_v2_"),
    String(GameManager.LEGACY_REPLAY_V2S_PREFIX || "REPLAY_v2S_")
  ];
  for (var index = 0; index < knownPrefixes.length; index++) {
    if (startsWithIgnoreCase(trimmed, knownPrefixes[index])) return true;
  }
  return false;
}

function normalizeV9VerseReplayBody(trimmed) {
  if (typeof trimmed !== "string") return null;
  if (isKnownNonVerseReplayPrefix(trimmed)) return null;
  var prefix = String(GameManager.REPLAY_V9_VERSE_PREFIX || "replay_");
  if (trimmed.length < prefix.length) return null;
  if (trimmed.substring(0, prefix.length).toLowerCase() !== prefix.toLowerCase()) return null;
  return trimmed.substring(prefix.length);
}

function decodeV9VerseTokenAt(pngMapDict, body, index) {
  var char = body.charAt(index);
  if (!Object.prototype.hasOwnProperty.call(pngMapDict, char)) {
    throw "Invalid replay char at index " + String(index);
  }
  return Number(pngMapDict[char]);
}

function decodeV9VerseSpawnFromToken(token) {
  var spawnPos = ((token & 3) << 2) + ((token & 15) >> 2);
  return {
    x: spawnPos % 4,
    y: Math.floor(spawnPos / 4),
    value: (((token >> 4) & 1) + 1) === 2 ? 4 : 2
  };
}

function decodeV9VerseMoveChunkFromToken(token) {
  return (token >> 5) & 3;
}

function createEmptyV9RplBoard() {
  return [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
}

function createV9VerseDecodeStartupState(pngMapDict, body) {
  var initialBoard = createEmptyV9RplBoard();
  var firstSpawn = decodeV9VerseSpawnFromToken(decodeV9VerseTokenAt(pngMapDict, body, 0));
  var secondSpawn = decodeV9VerseSpawnFromToken(decodeV9VerseTokenAt(pngMapDict, body, 1));
  applyV9RplSpawnOnBoard(initialBoard, firstSpawn);
  applyV9RplSpawnOnBoard(initialBoard, secondSpawn);
  return {
    initialBoard: initialBoard,
    currentBoard: v9RplCloneBoardMatrix(initialBoard)
  };
}

function decodeV9VerseReplayStepToken(token, index) {
  var moveChunkToV9Move = [2, 1, 3, 0];
  var moveChunk = decodeV9VerseMoveChunkFromToken(token);
  var v9Move = moveChunkToV9Move[moveChunk];
  if (!Number.isInteger(v9Move)) throw "Invalid replay move at index " + String(index);
  return {
    v9Move: v9Move,
    internalDirection: convertV9RplMoveToInternalDirection(v9Move),
    spawn: decodeV9VerseSpawnFromToken(token)
  };
}

function decodeV9VerseReplaySteps(body, pngMapDict, currentBoard) {
  var replayMoves = [];
  var replaySpawns = [];
  for (var index = 2; index < body.length; index++) {
    var token = decodeV9VerseTokenAt(pngMapDict, body, index);
    var decodedStep = decodeV9VerseReplayStepToken(token, index);
    var moveResult = applyV9RplMoveOnBoard(currentBoard, decodedStep.v9Move);
    currentBoard = moveResult.board;
    applyV9RplSpawnOnBoard(currentBoard, decodedStep.spawn);
    replayMoves.push(decodedStep.internalDirection);
    replaySpawns.push(decodedStep.spawn);
  }
  return { replayMoves: replayMoves, replaySpawns: replaySpawns };
}

function decodeV9VerseReplayEnvelope(trimmed) {
  var body = normalizeV9VerseReplayBody(trimmed);
  if (!body) return null;
  if (body.length < 2) throw "Invalid replay payload";
  var pngMapDict = resolveV9VersePngMapDict();
  var startupState = createV9VerseDecodeStartupState(pngMapDict, body);
  var decodedSteps = decodeV9VerseReplaySteps(body, pngMapDict, startupState.currentBoard);
  return {
    kind: "v9rpl",
    modeKey: "standard_4x4_pow2_no_undo",
    initialBoard: startupState.initialBoard,
    replayMoves: decodedSteps.replayMoves,
    replaySpawns: decodedSteps.replaySpawns
  };
}

function serializeReplay(manager) {
  if (!manager) return "{}";
  if (manager.width !== 4 || manager.height !== 4 || manager.isFibonacciMode()) {
    return JSON.stringify(serializeReplayV3(manager));
  }
  var modeCode = GameManager.REPLAY_V4_MODE_KEY_TO_CODE[manager.modeKey] || "C";
  var initialBoard = manager.initialBoardMatrix || getFinalBoardMatrix(manager);
  var encodedBoard = encodeBoardV4(manager, initialBoard);
  return GameManager.REPLAY_V4_PREFIX + modeCode + encodedBoard + (manager.replayCompactLog || "");
}

function applyReplayImportActions(manager, payload) {
  if (!manager) return;
  var source = normalizeReplayRecordObject(payload, {});
  manager.replayMoves = Array.isArray(source.replayMoves) ? source.replayMoves : [];
  if (manager.hasOwnKey(source, "replaySpawns")) {
    manager.replaySpawns = source.replaySpawns;
  }
  if (typeof source.replayMovesV2 === "string") {
    manager.replayMovesV2 = source.replayMovesV2;
  }
}

function isStructuredReplayEnvelope(envelope) {
  return !!envelope && (envelope.kind === "json-v3" || envelope.kind === "v4c" || envelope.kind === "v9rpl");
}

function applyImportedReplayUndoState(manager) {
  var importedUndoEnabled = manager.loadUndoSettingForMode(manager.modeKey);
  var undoState = manager.resolveUndoPolicyStateForMode(manager.mode);
  var forcedUndoSetting = undoState ? undoState.forcedUndoSetting : null;
  if (forcedUndoSetting !== null) {
    manager.undoEnabled = forcedUndoSetting;
  } else {
    manager.undoEnabled = !!importedUndoEnabled;
  }
  manager.updateUndoUiState(manager.resolveUndoPolicyStateForMode(manager.mode, {
    undoEnabled: manager.undoEnabled
  }));
  manager.notifyUndoSettingsStateChanged();
}

function startImportedReplayPlayback(manager) {
  manager.replayIndex = 0;
  manager.replayDelay = 200;
  resumeReplay(manager);
}

function normalizeReplayImportSource(replayString) {
  return (typeof replayString === "string" ? replayString : JSON.stringify(replayString)).trim();
}

function resolveReplayImportErrorMessage(error) {
  return (typeof error === "string" && error) || (error && typeof error.message === "string" && error.message)
    ? ((typeof error === "string" && error) || error.message)
    : String(error);
}

function normalizeReplayImportOptionalString(raw) {
  return typeof raw === "string" && raw ? raw : null;
}

function tryParseJsonV3ReplayEnvelope(manager, trimmed) {
  if (!(typeof trimmed === "string" && trimmed.charAt(0) === "{")) return null;
  var replayObj = JSON.parse(trimmed);
  if (!replayObj) return null;
  if (replayObj.v !== 3) throw "Unsupported JSON replay version";
  if (!Array.isArray(replayObj.actions)) throw "Invalid v3 actions";
  var modeKey = normalizeReplayImportOptionalString(replayObj.mode_key) || normalizeReplayImportOptionalString(replayObj.mode) || manager.modeKey || manager.mode;
  return {
    kind: "json-v3",
    modeKey: modeKey,
    actions: replayObj.actions,
    seed: replayObj.seed,
    specialRulesSnapshot: isReplayRecordObject(replayObj.special_rules_snapshot) ? replayObj.special_rules_snapshot : null,
    modeFamily: normalizeReplayImportOptionalString(replayObj.mode_family),
    rankPolicy: normalizeReplayImportOptionalString(replayObj.rank_policy),
    challengeId: normalizeReplayImportOptionalString(replayObj.challenge_id)
  };
}

function tryParseV4cReplayEnvelope(trimmed) {
  if (typeof trimmed !== "string" || trimmed.indexOf(GameManager.REPLAY_V4_PREFIX) !== 0) {
    return null;
  }
  var body = trimmed.substring(GameManager.REPLAY_V4_PREFIX.length);
  if (body.length < 17) throw "Invalid v4C payload";
  var modeCode = body.charAt(0);
  var replayModeIdV4 = GameManager.REPLAY_V4_MODE_CODE_TO_KEY[modeCode] || null;
  if (!replayModeIdV4) throw "Invalid v4C mode";
  return {
    kind: "v4c",
    modeKey: replayModeIdV4,
    initialBoardEncoded: body.substring(1, 17),
    actionsEncoded: body.substring(17)
  };
}

function createReplayImportEnvelopePayload(manager, trimmed) {
  return {
    trimmedReplayString: trimmed,
    fallbackModeKey: manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY,
    v4Prefix: GameManager.REPLAY_V4_PREFIX
  };
}

function normalizeReplayImportEnvelopeFromCore(currentManager, value) {
  if (value === null) return null;
  return currentManager.isNonArrayObject(value) ? value : undefined;
}

function parseReplayImportEnvelopeFallback(manager, trimmed) {
  var verseEnvelope = decodeV9VerseReplayEnvelope(trimmed);
  if (verseEnvelope) return verseEnvelope;
  var v9Envelope = tryParseV9RplBase64ReplayEnvelope(manager, trimmed);
  if (v9Envelope) return v9Envelope;
  var jsonEnvelope = tryParseJsonV3ReplayEnvelope(manager, trimmed);
  if (jsonEnvelope) return jsonEnvelope;
  return tryParseV4cReplayEnvelope(trimmed);
}

function parseReplayImportEnvelope(manager, trimmed) {
  var verseEnvelope = decodeV9VerseReplayEnvelope(trimmed);
  if (verseEnvelope) return verseEnvelope;
  var v9Envelope = tryParseV9RplBase64ReplayEnvelope(manager, trimmed);
  if (v9Envelope) return v9Envelope;
  var parsedEnvelope = resolveCorePayloadCallWith(manager, "callCoreReplayImportRuntime", "parseReplayImportEnvelope", createReplayImportEnvelopePayload(manager, trimmed), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallbackAllowNull(coreCallResult, function (value) {
      return normalizeReplayImportEnvelopeFromCore(currentManager, value);
    }, function () {
      return parseReplayImportEnvelopeFallback(currentManager, trimmed);
    }, true);
  });
  return normalizeReplayRecordObject(parsedEnvelope, null);
}

function resolveLegacyReplayV2CodeAt(logString, index) {
  var code = logString.charCodeAt(index) - 33;
  if (code < 0 || code > 128) {
    throw "Invalid replay char at index " + index;
  }
  return code;
}

function createLegacyReplayV2EntryFromCode(code) {
  if (code === 128) return { move: -1, spawn: null };
  var dir = (code >> 5) & 3;
  var is4 = (code >> 4) & 1;
  var posIdx = code & 15;
  return {
    move: dir,
    spawn: {
      x: posIdx % 4,
      y: Math.floor(posIdx / 4),
      value: is4 ? 4 : 2
    }
  };
}

function appendLegacyReplayV2Entry(decoded, entry) {
  decoded.replayMoves.push(entry.move);
  decoded.replaySpawns.push(entry.spawn);
}

function decodeLegacyReplayV2Log(logString) {
  var decoded = {
    replayMoves: [],
    replaySpawns: []
  };
  for (var i = 0; i < logString.length; i++) {
    var code = resolveLegacyReplayV2CodeAt(logString, i);
    var entry = createLegacyReplayV2EntryFromCode(code);
    appendLegacyReplayV2Entry(decoded, entry);
  }
  return decoded;
}

function tryDecodeLegacyReplayV1Envelope(trimmed) {
  if (trimmed.indexOf(GameManager.LEGACY_REPLAY_V1_PREFIX) !== 0) return null;
  var v1Parts = trimmed.split("_");
  var seed = parseFloat(v1Parts[2]);
  var movesString = v1Parts[3];
  var replayMovesV1 = movesString.split("").map(function (char) {
    var val = GameManager.LEGACY_REPLAY_V1_REVERSE_MAPPING[char];
    if (val === undefined) throw "Invalid move char: " + char;
    return val;
  });
  return {
    seed: seed,
    replayMoves: replayMovesV1,
    replaySpawns: null
  };
}

function tryDecodeLegacyReplayV2sEnvelope(trimmed) {
  if (trimmed.indexOf(GameManager.LEGACY_REPLAY_V2S_PREFIX) !== 0) return null;
  var rest = trimmed.substring(GameManager.LEGACY_REPLAY_V2S_PREFIX.length);
  var seedSep = rest.indexOf("_");
  if (seedSep < 0) throw "Invalid v2S format";
  var seedS = parseFloat(rest.substring(0, seedSep));
  if (isNaN(seedS)) throw "Invalid v2S seed";
  var logStringS = rest.substring(seedSep + 1);
  var decodedLogS = decodeLegacyReplayV2Log(logStringS);
  return {
    seed: seedS,
    replayMovesV2: logStringS,
    replayMoves: decodedLogS.replayMoves,
    replaySpawns: decodedLogS.replaySpawns
  };
}

function tryDecodeLegacyReplayV2Envelope(trimmed) {
  if (trimmed.indexOf(GameManager.LEGACY_REPLAY_V2_PREFIX) !== 0) return null;
  var logString = trimmed.substring(GameManager.LEGACY_REPLAY_V2_PREFIX.length);
  var decodedLog = decodeLegacyReplayV2Log(logString);
  return {
    seed: 0.123,
    replayMovesV2: logString,
    replayMoves: decodedLog.replayMoves,
    replaySpawns: decodedLog.replaySpawns
  };
}

function normalizeDecodedLegacyReplayFromCore(currentManager, coreValue) {
  return currentManager.isNonArrayObject(coreValue) ? coreValue : undefined;
}

function decodeLegacyReplayEnvelopeFallback(trimmed) {
  var v1Envelope = tryDecodeLegacyReplayV1Envelope(trimmed);
  if (v1Envelope) return v1Envelope;
  var v2sEnvelope = tryDecodeLegacyReplayV2sEnvelope(trimmed);
  if (v2sEnvelope) return v2sEnvelope;
  return tryDecodeLegacyReplayV2Envelope(trimmed);
}

function decodeLegacyReplayEnvelope(manager, trimmed) {
  return resolveCoreArgsCallWith(manager, "callCoreReplayLegacyRuntime", "decodeLegacyReplay", [trimmed], undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeDecodedLegacyReplayFromCore(currentManager, coreValue);
    }, function () { return decodeLegacyReplayEnvelopeFallback(trimmed); });
  });
}

function applyJsonV3ReplayModeConfigFields(manager, envelope, replayModeConfig) {
  var specialRulesSource = isReplayRecordObject(envelope.specialRulesSnapshot)
    ? envelope.specialRulesSnapshot
    : null;
  var specialRulesSnapshot = specialRulesSource ? manager.clonePlain(specialRulesSource) : null;
  if (specialRulesSnapshot) {
    replayModeConfig.special_rules = specialRulesSnapshot;
  }
  if (typeof envelope.modeFamily === "string" && envelope.modeFamily) {
    replayModeConfig.mode_family = envelope.modeFamily;
  }
  if (typeof envelope.rankPolicy === "string" && envelope.rankPolicy) {
    replayModeConfig.rank_policy = envelope.rankPolicy;
  }
}

function applyJsonV3ReplayChallengeId(manager, envelope) {
  if (typeof envelope.challengeId === "string" && envelope.challengeId) {
    manager.challengeId = envelope.challengeId;
  }
}

function applyJsonV3StructuredReplayEnvelope(manager, envelope, replayModeConfig) {
  applyJsonV3ReplayModeConfigFields(manager, envelope, replayModeConfig);
  applyJsonV3ReplayChallengeId(manager, envelope);
  applyReplayImportActions(manager, {
    replayMoves: envelope.actions,
    replaySpawns: null
  });
  manager.disableSessionSync = true;
  restartWithSeed(manager, envelope.seed, replayModeConfig);
}

function decodeReplayV4MoveSpawnFromToken(token) {
  var dir = (token >> 5) & 3;
  var is4 = (token >> 4) & 1;
  var posIdx = token & 15;
  return {
    action: dir,
    spawn: {
      x: posIdx % 4,
      y: Math.floor(posIdx / 4),
      value: is4 ? 4 : 2
    }
  };
}

function createReplayV4EscapedActionResult(action, spawn, nextIndex) {
  return {
    action: action,
    spawn: spawn,
    nextIndex: nextIndex
  };
}

function resolveReplayV4EscapedMove127Result() {
  var decoded127 = decodeReplayV4MoveSpawnFromToken(127);
  return createReplayV4EscapedActionResult(decoded127.action, decoded127.spawn, null);
}

function resolveReplayV4EscapedUndoResult() {
  return createReplayV4EscapedActionResult(-1, null, null);
}

function resolveReplayV4PracticePayloadIndex(actionsEncoded, escapedIndex) {
  var payloadIndex = escapedIndex + 1;
  if (payloadIndex + 1 >= actionsEncoded.length) throw "Invalid v4C practice action";
  return payloadIndex;
}

function resolveReplayV4PracticeActionResult(manager, actionsEncoded, escapedIndex) {
  var payloadIndex = resolveReplayV4PracticePayloadIndex(actionsEncoded, escapedIndex);
  var cell = decodeReplay128(manager, actionsEncoded.charAt(payloadIndex));
  var exp = decodeReplay128(manager, actionsEncoded.charAt(payloadIndex + 1));
  if (cell < 0 || cell > 15) throw "Invalid v4C practice cell";
  return createReplayV4EscapedActionResult(
    ["p", (cell >> 2) & 3, cell & 3, exp === 0 ? 0 : Math.pow(2, exp)],
    null,
    payloadIndex + 2
  );
}

function decodeReplayV4EscapedAction(manager, actionsEncoded, escapedIndex) {
  if (escapedIndex >= actionsEncoded.length) throw "Invalid v4C escape";
  var subtype = decodeReplay128(manager, actionsEncoded.charAt(escapedIndex));
  if (subtype === 0) {
    var move127 = resolveReplayV4EscapedMove127Result();
    move127.nextIndex = escapedIndex + 1;
    return move127;
  }
  if (subtype === 1) {
    var undoAction = resolveReplayV4EscapedUndoResult();
    undoAction.nextIndex = escapedIndex + 1;
    return undoAction;
  }
  if (subtype === 2) {
    return resolveReplayV4PracticeActionResult(manager, actionsEncoded, escapedIndex);
  }
  throw "Unknown v4C escape subtype";
}

function decodeReplayV4ActionAtIndex(manager, actionsEncoded, index) {
  var token = decodeReplay128(manager, actionsEncoded.charAt(index));
  if (token < 127) {
    return {
      decodedAction: decodeReplayV4MoveSpawnFromToken(token),
      nextIndex: index + 1
    };
  }
  var escaped = decodeReplayV4EscapedAction(manager, actionsEncoded, index + 1);
  return {
    decodedAction: escaped,
    nextIndex: escaped.nextIndex
  };
}

function appendReplayV4DecodedAction(replayMoves, replaySpawns, decodedAction) {
  replayMoves.push(decodedAction.action);
  replaySpawns.push(decodedAction.spawn);
}

function decodeReplayV4ActionsFallback(manager, envelope) {
  var replayMoves = [];
  var replaySpawns = [];
  var i = 0;
  while (i < envelope.actionsEncoded.length) {
    var decodedAtIndex = decodeReplayV4ActionAtIndex(manager, envelope.actionsEncoded, i);
    appendReplayV4DecodedAction(replayMoves, replaySpawns, decodedAtIndex.decodedAction);
    i = decodedAtIndex.nextIndex;
  }
  return {
    replayMoves: replayMoves,
    replaySpawns: replaySpawns
  };
}

function decodeReplayV4ActionsFromEnvelope(manager, envelope) {
  return resolveCoreArgsCallWith(
    manager,
    "callCoreReplayV4ActionsRuntime",
    "decodeReplayV4Actions",
    [envelope.actionsEncoded],
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return decodeReplayV4ActionsFallback(currentManager, envelope);
      });
    }
  );
}

function applyV4StructuredReplayEnvelope(manager, envelope, replayModeConfig) {
  var initialBoard = decodeBoardV4(manager, envelope.initialBoardEncoded);
  var decodedV4Actions = decodeReplayV4ActionsFromEnvelope(manager, envelope);
  applyReplayImportActions(manager, {
    replayMoves: decodedV4Actions ? decodedV4Actions.replayMoves : null,
    replaySpawns: Array.isArray(decodedV4Actions && decodedV4Actions.replaySpawns)
      ? decodedV4Actions.replaySpawns
      : []
  });
  manager.disableSessionSync = true;
  restartWithBoard(manager, initialBoard, replayModeConfig, { asReplay: true });
}

function applyStructuredReplayEnvelope(manager, envelope) {
  var replayModeConfig = manager.resolveModeConfig(envelope.modeKey);
  if (!replayModeConfig && envelope.kind === "v9rpl") {
    replayModeConfig = resolveV9RplReplayModeConfig(manager);
  }
  if (replayModeConfig) {
    if (envelope.kind === "json-v3") {
      applyJsonV3StructuredReplayEnvelope(manager, envelope, replayModeConfig);
    } else if (envelope.kind === "v9rpl") {
      applyV9RplStructuredReplayEnvelope(manager, envelope, replayModeConfig);
    } else {
      applyV4StructuredReplayEnvelope(manager, envelope, replayModeConfig);
    }
  }
  applyImportedReplayUndoState(manager);
  startImportedReplayPlayback(manager);
  return true;
}

function applyLegacyReplayEnvelope(manager, decodedLegacy) {
  applyReplayImportActions(manager, {
    replayMovesV2: decodedLegacy.replayMovesV2,
    replayMoves: decodedLegacy.replayMoves,
    replaySpawns: decodedLegacy.replaySpawns
  });
  restartWithSeed(manager, decodedLegacy.seed);
  startImportedReplayPlayback(manager);
  return true;
}

function importReplay(manager, replayString) {
  if (!manager) return false;
  try {
    var trimmed = normalizeReplayImportSource(replayString);
    var envelope = parseReplayImportEnvelope(manager, trimmed);
    if (isStructuredReplayEnvelope(envelope)) return applyStructuredReplayEnvelope(manager, envelope);
    var decodedLegacy = decodeLegacyReplayEnvelope(manager, trimmed);
    if (decodedLegacy) return applyLegacyReplayEnvelope(manager, decodedLegacy);
    throw "Unknown replay version";
  } catch (e) {
    alert("导入回放出错: " + resolveReplayImportErrorMessage(e));
    return false;
  }
}

function resolveReplayActionAtCurrentIndex(manager) {
  if (!manager) {
    return {
      action: undefined,
      spawnAtIndex: undefined
    };
  }
  return {
    action: manager.replayMoves[manager.replayIndex],
    spawnAtIndex: manager.replaySpawns ? manager.replaySpawns[manager.replayIndex] : undefined
  };
}

function createReplayStepLifecyclePayload(manager, action, spawnAtIndex) {
  return {
    action: action,
    hasReplaySpawns: !!manager.replaySpawns,
    spawnAtIndex: spawnAtIndex
  };
}

function resolveReplayStepLifecycleFallback(manager, action, spawnAtIndex) {
  var shouldInjectForcedSpawn = !!manager.replaySpawns && !Array.isArray(action);
  return {
    shouldInjectForcedSpawn: shouldInjectForcedSpawn,
    forcedSpawn: shouldInjectForcedSpawn ? spawnAtIndex : undefined
  };
}

function resolveReplayStepLifecyclePlan(manager, action, spawnAtIndex) {
  if (!manager) return {};
  return resolveCorePayloadCallWith(
    manager,
    "callCoreReplayLifecycleRuntime",
    "planReplayStep",
    createReplayStepLifecyclePayload(manager, action, spawnAtIndex),
    {},
    function (managerForStepPlan, stepPlanCallResult) {
      return managerForStepPlan.resolveCoreObjectCallOrFallback(stepPlanCallResult, function () {
        return resolveReplayStepLifecycleFallback(managerForStepPlan, action, spawnAtIndex);
      });
    }
  );
}

function buildReplayStepExecutionPlanFallback(manager) {
  var currentActionState = resolveReplayActionAtCurrentIndex(manager);
  var stepPlan = resolveReplayStepLifecyclePlan(
    manager,
    currentActionState.action,
    currentActionState.spawnAtIndex
  );
  return {
    action: currentActionState.action,
    shouldInjectForcedSpawn: !!stepPlan.shouldInjectForcedSpawn,
    forcedSpawn: stepPlan.forcedSpawn,
    nextReplayIndex: manager.replayIndex + 1
  };
}

function resolveReplayStepExecutionPlan(manager) {
  if (!manager) return {};
  return resolveCorePayloadCallWith(manager, "callCoreReplayLoopRuntime", "planReplayStepExecution", {
    replayMoves: manager.replayMoves,
    replaySpawns: manager.replaySpawns,
    replayIndex: manager.replayIndex
  }, {}, function (currentManager, coreCallResult) {
    return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
      return buildReplayStepExecutionPlanFallback(currentManager);
    });
  });
}

function applyReplayStepForcedSpawn(manager, stepExecutionPlan) {
  if (!manager || !stepExecutionPlan) return;
  if (stepExecutionPlan.shouldInjectForcedSpawn) {
    manager.forcedSpawn = stepExecutionPlan.forcedSpawn;
  }
}

function resolveReplayActionKindFallback(manager, action) {
  if (!manager) return "x";
  return resolveCorePayloadCallWith(
    manager,
    "callCoreReplayExecutionRuntime",
    "getReplayActionKind",
    action,
    "",
    function (managerForKind, kindCallResult) {
      return managerForKind.resolveCoreStringCallOrFallback(kindCallResult, function () {
        if (action === -1) return "u";
        if (action >= 0 && action <= 3) return "m";
        if (Array.isArray(action) && action.length > 0) return action[0];
        return "x";
      });
    }
  );
}

function resolveReplayExecutionFallbackAction(manager, action) {
  var kind = resolveReplayActionKindFallback(manager, action);
  if (kind === "m") return { kind: "m", dir: Array.isArray(action) ? action[1] : action };
  if (kind === "u") return { kind: "u" };
  if (kind === "p") return { kind: "p", x: action[1], y: action[2], value: action[3] };
  throw "Unknown replay action";
}

function resolveReplayExecutionAction(manager, action) {
  if (!manager) return {};
  return resolveCorePayloadCallWith(manager, "callCoreReplayExecutionRuntime", "resolveReplayExecution", action, undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return currentManager.isNonArrayObject(coreValue) ? coreValue : undefined;
    }, function () { return resolveReplayExecutionFallbackAction(currentManager, action); });
  });
}

function createReplayDispatchPlanFallback(resolvedAction) {
  if (resolvedAction.kind === "m") return { method: "move", args: [resolvedAction.dir] };
  if (resolvedAction.kind === "u") return { method: "move", args: [-1] };
  if (resolvedAction.kind === "p") {
    return {
      method: "insertCustomTile",
      args: [resolvedAction.x, resolvedAction.y, resolvedAction.value]
    };
  }
  throw "Unknown replay action";
}

function resolveReplayDispatchPlan(manager, resolvedAction) {
  if (!manager) return {};
  return resolveCorePayloadCallWith(
    manager,
    "callCoreReplayDispatchRuntime",
    "planReplayDispatch",
    resolvedAction,
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return createReplayDispatchPlanFallback(resolvedAction);
      });
    }
  );
}

function executeReplayDispatchPlan(manager, dispatchPlan) {
  if (!manager) return;
  var dispatchMethod = dispatchPlan && dispatchPlan.method;
  var args = dispatchPlan && Array.isArray(dispatchPlan.args) ? dispatchPlan.args : [];
  if (dispatchMethod === "move") {
    manager.move(args[0]);
    return;
  }
  if (dispatchMethod === "insertCustomTile") {
    insertCustomTile(manager, args[0], args[1], args[2]);
    return;
  }
  throw "Unknown replay action";
}

function executePlannedReplayStep(manager) {
  if (!manager) return;
  var stepExecutionPlan = resolveReplayStepExecutionPlan(manager);
  applyReplayStepForcedSpawn(manager, stepExecutionPlan);
  var resolvedAction = resolveReplayExecutionAction(manager, stepExecutionPlan.action);
  var dispatchPlan = resolveReplayDispatchPlan(manager, resolvedAction);
  executeReplayDispatchPlan(manager, dispatchPlan);
  manager.replayIndex = stepExecutionPlan.nextReplayIndex;
}

function createSpawnValueCountResolveArgs(manager, value) {
  return [manager.spawnValueCounts, value];
}

function applySpawnValueCountByCoreResult(manager, coreValue) {
  var next = coreValue || {};
  if (isReplayRecordObject(next.nextSpawnValueCounts)) {
    manager.spawnValueCounts = next.nextSpawnValueCounts;
  } else if (!manager.spawnValueCounts) {
    manager.spawnValueCounts = {};
  }
  manager.spawnTwos = Number(next.spawnTwos) || 0;
  manager.spawnFours = Number(next.spawnFours) || 0;
}

function applySpawnValueCountFallback(manager, value) {
  if (!manager.spawnValueCounts) manager.spawnValueCounts = {};
  var key = String(value);
  manager.spawnValueCounts[key] = (manager.spawnValueCounts[key] || 0) + 1;
  // Keep legacy fields for compatibility with existing UI hooks.
  manager.spawnTwos = manager.spawnValueCounts["2"] || 0;
  manager.spawnFours = manager.spawnValueCounts["4"] || 0;
}

function recordSpawnValue(manager, value) {
  if (!manager) return;
  if (!resolveCoreArgsCallWith(
    manager,
    "callCoreRulesRuntime",
    "applySpawnValueCount",
    createSpawnValueCountResolveArgs(manager, value),
    false,
    function (currentManager, coreCallResult) {
      return currentManager.tryHandleCoreRawValue(coreCallResult, function (coreValue) {
        applySpawnValueCountByCoreResult(currentManager, coreValue);
      });
    }
  )) applySpawnValueCountFallback(manager, value);
  refreshSpawnRateDisplay(manager);
}

function refreshSpawnRateDisplay(manager) {
  if (!manager) return;
  // Top-left rate: current observed secondary spawn rate.
  // pow2 => 出4率, fibonacci => 出2率
  var text = manager.getActualSecondaryRate();
  var rateEl = resolveManagerElementById(manager, "stats-4-rate");
  if (rateEl) rateEl.textContent = text;
  if (manager.cornerRateEl) manager.cornerRateEl.textContent = text;
}

function resolveDetectedModeBodyAttribute(documentLike) {
  if (!(documentLike && documentLike.body)) return "";
  return documentLike.body.getAttribute("data-mode-id") || "";
}

function resolveDetectedModePathname(windowLike) {
  if (!(windowLike && windowLike.location && windowLike.location.pathname)) return "";
  return String(windowLike.location.pathname);
}

function resolveDetectedModeByPathname(pathname) {
  if (!pathname) return GameManager.DEFAULT_MODE_KEY;
  if (pathname.indexOf("undo_2048") !== -1) return "classic_4x4_pow2_undo";
  if (pathname.indexOf("Practice_board") !== -1) return "practice_legacy";
  if (pathname.indexOf("capped_2048") !== -1) return "capped_4x4_pow2_no_undo";
  if (
    pathname === "/" ||
    /\/$/.test(pathname) ||
    pathname.indexOf("/index.html") !== -1 ||
    pathname.indexOf("index.html") !== -1
  ) {
    return "standard_4x4_pow2_no_undo";
  }
  return "classic_4x4_pow2_undo";
}

function resolveDetectedModeFallback(manager) {
  if (!manager) return GameManager.DEFAULT_MODE_KEY;
  if (manager.mode) return manager.mode;
  var bodyMode = resolveDetectedModeBodyAttribute(resolveManagerDocumentLike(manager));
  if (bodyMode) return bodyMode;
  var pathname = resolveDetectedModePathname(manager.getWindowLike());
  return resolveDetectedModeByPathname(pathname);
}

function detectMode(manager) {
  if (!manager) return GameManager.DEFAULT_MODE_KEY;
  var bodyMode = resolveDetectedModeBodyAttribute(resolveManagerDocumentLike(manager));
  var pathname = resolveDetectedModePathname(manager.getWindowLike());
  return resolveCorePayloadCallWith(manager, "callCoreModeRuntime", "resolveDetectedMode", manager.createCoreModeDefaultsPayload({
    existingMode: manager.mode,
    bodyMode: bodyMode,
    pathname: pathname
  }), "", function (currentManager, coreCallResult) {
    return currentManager.resolveCoreStringCallOrFallback(coreCallResult, function () { return resolveDetectedModeFallback(currentManager); });
  });
}

function encodeReplay128Fallback(code) {
  if (!Number.isInteger(code) || code < 0 || code >= GameManager.REPLAY128_TOTAL) {
    throw "Invalid replay code";
  }
  if (code < GameManager.REPLAY128_ASCII_COUNT) {
    return String.fromCharCode(GameManager.REPLAY128_ASCII_START + code);
  }
  return String.fromCharCode(
    GameManager.REPLAY128_EXTRA_CODES[code - GameManager.REPLAY128_ASCII_COUNT]
  );
}

function encodeReplay128(manager, code) {
  if (!manager) throw "Invalid replay code";
  return resolveCoreArgsCallWith(
    manager,
    "callCoreReplayCodecRuntime",
    "encodeReplay128",
    [code],
    "",
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreStringCallOrFallback(coreCallResult, function () {
        return encodeReplay128Fallback(code);
      });
    }
  );
}

function normalizeDecodedReplay128FromCore(coreValue) {
  var token = Number(coreValue);
  return Number.isInteger(token) && token >= 0 && token < GameManager.REPLAY128_TOTAL
    ? token
    : undefined;
}

function resolveReplay128CharCode(char) {
  if (!char || char.length !== 1) throw "Invalid replay char";
  return char.charCodeAt(0);
}

function decodeReplay128FromAsciiCode(code) {
  if (
    code >= GameManager.REPLAY128_ASCII_START &&
    code < GameManager.REPLAY128_ASCII_START + GameManager.REPLAY128_ASCII_COUNT
  ) {
    return code - GameManager.REPLAY128_ASCII_START;
  }
  return null;
}

function decodeReplay128Fallback(char) {
  var code = resolveReplay128CharCode(char);
  var decodedAscii = decodeReplay128FromAsciiCode(code);
  if (decodedAscii !== null) return decodedAscii;
  var extraIndex = GameManager.REPLAY128_EXTRA_CODES.indexOf(code);
  if (extraIndex >= 0) return GameManager.REPLAY128_ASCII_COUNT + extraIndex;
  throw "Invalid replay char";
}

function decodeReplay128(manager, char) {
  if (!manager) throw "Invalid replay char";
  return resolveCoreArgsCallWith(manager, "callCoreReplayCodecRuntime", "decodeReplay128", [char], undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeDecodedReplay128FromCore(coreValue);
    }, function () { return decodeReplay128Fallback(char); });
  });
}

function createAppendCompactMoveCodePayload(manager, rawCode) {
  return {
    log: manager.replayCompactLog,
    rawCode: rawCode
  };
}

function tryAppendCompactMoveCodeByCore(manager, rawCode) {
  if (!manager) return false;
  return resolveCoreArgsCallWith(
    manager,
    "callCoreReplayCodecRuntime",
    "appendCompactMoveCode",
    [createAppendCompactMoveCodePayload(manager, rawCode)],
    false,
    function (currentManager, coreCallResult) {
      return currentManager.tryHandleCoreRawValue(coreCallResult, function (coreValue) {
        currentManager.replayCompactLog = coreValue;
      });
    }
  );
}

function appendCompactMoveCodeFallback(manager, rawCode) {
  if (!Number.isInteger(rawCode) || rawCode < 0 || rawCode > 127) throw "Invalid move code";
  if (rawCode < 127) {
    manager.replayCompactLog += encodeReplay128(manager, rawCode);
    return;
  }
  manager.replayCompactLog += encodeReplay128(manager, 127) + encodeReplay128(manager, 0);
}

function appendCompactMoveCode(manager, rawCode) {
  if (!manager) return;
  if (tryAppendCompactMoveCodeByCore(manager, rawCode)) return;
  appendCompactMoveCodeFallback(manager, rawCode);
}

function appendCompactUndo(manager) {
  if (!manager) return;
  if (resolveCoreArgsCallWith(
    manager,
    "callCoreReplayCodecRuntime",
    "appendCompactUndo",
    [manager.replayCompactLog],
    false,
    function (currentManager, coreCallResult) {
      return currentManager.tryHandleCoreRawValue(coreCallResult, function (coreValue) {
        currentManager.replayCompactLog = coreValue;
      });
    }
  )) {
    return;
  }
  manager.replayCompactLog += encodeReplay128(manager, 127) + encodeReplay128(manager, 1);
}

function createCompactPracticeActionPayload(manager, x, y, value) {
  return {
    log: manager.replayCompactLog,
    width: manager.width,
    height: manager.height,
    x: x,
    y: y,
    value: value
  };
}

function tryAppendCompactPracticeActionByCore(manager, payload) {
  if (!manager) return false;
  return resolveCoreArgsCallWith(
    manager,
    "callCoreReplayCodecRuntime",
    "appendCompactPracticeAction",
    [payload],
    false,
    function (currentManager, coreCallResult) {
      return currentManager.tryHandleCoreRawValue(coreCallResult, function (coreValue) {
        currentManager.replayCompactLog = coreValue;
      });
    }
  );
}

function validateCompactPracticeActionBoardSize(manager) {
  if (manager.width !== 4 || manager.height !== 4) {
    throw "Compact practice replay only supports 4x4";
  }
}

function validateCompactPracticeActionCoords(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 3 || y < 0 || y > 3) {
    throw "Invalid practice coords";
  }
}

function resolveCompactPracticeActionExponent(value) {
  if (!Number.isInteger(value) || value < 0) throw "Invalid practice value";
  if (value === 0) return 0;
  var lg = Math.log(value) / Math.log(2);
  if (Math.floor(lg) !== lg) throw "Practice value must be power of two";
  if (lg < 0 || lg > 127) throw "Practice value exponent too large";
  return lg;
}

function appendCompactPracticeActionFallback(manager, x, y, value) {
  validateCompactPracticeActionBoardSize(manager);
  validateCompactPracticeActionCoords(x, y);
  var exp = resolveCompactPracticeActionExponent(value);
  var cell = (x << 2) | y;
  manager.replayCompactLog += encodeReplay128(manager, 127) + encodeReplay128(manager, 2);
  manager.replayCompactLog += encodeReplay128(manager, cell) + encodeReplay128(manager, exp);
}

function appendCompactPracticeAction(manager, x, y, value) {
  if (!manager) return;
  if (tryAppendCompactPracticeActionByCore(manager, createCompactPracticeActionPayload(manager, x, y, value))) {
    return;
  }
  appendCompactPracticeActionFallback(manager, x, y, value);
}

function createReplayModePostMoveRecord() {
  return {
    shouldRecordMoveHistory: false,
    compactMoveCode: null,
    shouldPushSessionAction: false,
    sessionAction: null,
    shouldResetLastSpawn: false
  };
}

function resolveCompactMoveCodeFallback(manager, direction) {
  if (!manager || !manager.lastSpawn) return null;
  if (manager.width !== 4 || manager.height !== 4) return null;
  if (manager.isFibonacciMode()) return null;
  if (manager.lastSpawn.value !== 2 && manager.lastSpawn.value !== 4) return null;
  var valBit = manager.lastSpawn.value === 4 ? 1 : 0;
  var posIdx = manager.lastSpawn.x + manager.lastSpawn.y * 4;
  return (direction << 5) | (valBit << 4) | posIdx;
}

function createPostMoveRecordPayload(manager, direction) {
  if (!manager) return {};
  return {
    replayMode: !!manager.replayMode,
    direction: direction,
    lastSpawn: manager.lastSpawn ? {
      x: manager.lastSpawn.x,
      y: manager.lastSpawn.y,
      value: manager.lastSpawn.value
    } : null,
    width: manager.width,
    height: manager.height,
    isFibonacciMode: manager.isFibonacciMode(),
    hasSessionReplayV3: !!manager.sessionReplayV3
  };
}

function createPostMoveRecordFallback(manager, direction) {
  if (!manager) return createReplayModePostMoveRecord();
  if (manager.replayMode) {
    return createReplayModePostMoveRecord();
  }
  var shouldPushSessionAction = !!manager.sessionReplayV3;
  return {
    shouldRecordMoveHistory: true,
    compactMoveCode: resolveCompactMoveCodeFallback(manager, direction),
    shouldPushSessionAction: shouldPushSessionAction,
    sessionAction: shouldPushSessionAction ? ["m", direction] : null,
    shouldResetLastSpawn: true
  };
}

function computePostMoveRecord(manager, direction) {
  if (!manager) return null;
  return resolveCorePayloadCallWith(
    manager,
    "callCorePostMoveRecordRuntime",
    "computePostMoveRecord",
    createPostMoveRecordPayload(manager, direction),
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return createPostMoveRecordFallback(currentManager, direction);
      });
    }
  );
}

function createPostUndoRecordPayload(manager, direction) {
  return {
    replayMode: !!manager.replayMode,
    direction: direction,
    hasSessionReplayV3: !!manager.sessionReplayV3
  };
}

function createReplayModePostUndoRecord() {
  return {
    shouldRecordMoveHistory: false,
    shouldAppendCompactUndo: false,
    shouldPushSessionAction: false,
    sessionAction: null
  };
}

function createPostUndoRecordFallback(manager) {
  if (manager.replayMode) {
    return createReplayModePostUndoRecord();
  }
  var shouldPushSessionAction = !!manager.sessionReplayV3;
  return {
    shouldRecordMoveHistory: true,
    shouldAppendCompactUndo: true,
    shouldPushSessionAction: shouldPushSessionAction,
    sessionAction: shouldPushSessionAction ? ["u"] : null
  };
}

function computePostUndoRecord(manager, direction) {
  if (!manager) return null;
  return resolveCorePayloadCallWith(
    manager,
    "callCorePostUndoRecordRuntime",
    "computePostUndoRecord",
    createPostUndoRecordPayload(manager, direction),
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return createPostUndoRecordFallback(currentManager);
      });
    }
  );
}

function validateReplayV4BoardShape(board) {
  if (!Array.isArray(board) || board.length !== 4) throw "Invalid initial board";
}

function validateReplayV4BoardRow(row) {
  if (!Array.isArray(row) || row.length !== 4) throw "Invalid initial board row";
}

function resolveReplayV4BoardTileExponent(value) {
  if (!Number.isInteger(value) || value < 0) throw "Invalid board tile value";
  if (value === 0) return 0;
  var lg = Math.log(value) / Math.log(2);
  if (Math.floor(lg) !== lg) throw "Board tile is not power of two";
  if (lg < 0 || lg >= GameManager.REPLAY128_TOTAL) throw "Board tile exponent too large";
  return lg;
}

function encodeReplayV4BoardFallback(manager, board) {
  validateReplayV4BoardShape(board);
  var out = "";
  for (var y = 0; y < 4; y++) {
    var row = board[y];
    validateReplayV4BoardRow(row);
    for (var x = 0; x < 4; x++) {
      out += encodeReplay128(manager, resolveReplayV4BoardTileExponent(row[x]));
    }
  }
  return out;
}

function encodeBoardV4(manager, board) {
  if (!manager) throw "Invalid initial board";
  return resolveCoreArgsCallWith(
    manager,
    "callCoreReplayCodecRuntime",
    "encodeBoardV4",
    [board],
    "",
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreStringCallOrFallback(coreCallResult, function () {
        return encodeReplayV4BoardFallback(currentManager, board);
      });
    }
  );
}

function validateEncodedReplayV4Board(encoded) {
  if (typeof encoded !== "string" || encoded.length !== 16) throw "Invalid encoded board";
}

function decodeReplayV4BoardFallback(manager, encoded) {
  validateEncodedReplayV4Board(encoded);
  var rows = [];
  var idx = 0;
  for (var y = 0; y < 4; y++) {
    var row = [];
    for (var x = 0; x < 4; x++) {
      var exp = decodeReplay128(manager, encoded.charAt(idx++));
      row.push(exp === 0 ? 0 : Math.pow(2, exp));
    }
    rows.push(row);
  }
  return rows;
}

function decodeBoardV4(manager, encoded) {
  if (!manager) throw "Invalid encoded board";
  return resolveCoreArgsCallWith(manager, "callCoreReplayCodecRuntime", "decodeBoardV4", [encoded], undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return Array.isArray(coreValue) ? coreValue : undefined;
    }, function () { return decodeReplayV4BoardFallback(currentManager, encoded); });
  });
}

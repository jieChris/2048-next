function isReplayRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizeReplayRecordObject(value, fallback) {
  return isReplayRecordObject(value) ? value : fallback;
}

function resolveReplayPauseStateFallback() {
  return {
    isPaused: true,
    shouldClearInterval: true
  };
}

function normalizeReplayPauseState(manager, state) {
  return manager.isNonArrayObject(state) ? state : {};
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

function executeReplayIntervalTick(manager) {
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
  manager.replayInterval = setInterval(function () {
    executeReplayIntervalTick(manager);
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
    hasReplayMoves: !!manager.replayMoves,
    replayMovesLength: manager.replayMoves ? manager.replayMoves.length : 0
  };
}

function normalizeReplaySeekTargetIndexFromCore(coreValue) {
  var resolved = Number(coreValue);
  return Number.isFinite(resolved) ? resolved : undefined;
}

function normalizeReplaySeekTargetIndexFallback(manager, targetIndex) {
  var nextTargetIndex = targetIndex;
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

function seekReplay(manager, targetIndex) {
  if (!manager) return;
  var normalizedTargetIndex = normalizeReplaySeekTargetIndex(manager, targetIndex);
  pauseReplay(manager);
  var normalizedRewindPlan = resolveReplaySeekRewindPlan(manager, normalizedTargetIndex);
  var restartPlan = resolveReplaySeekRestartPlan(manager, normalizedRewindPlan);
  applyReplaySeekRestartPlan(manager, restartPlan);
  executeReplaySeekSteps(manager, normalizedTargetIndex);
}

function stepReplay(manager, delta) {
  if (!manager || !manager.replayMoves) return;
  seekReplay(manager, manager.replayIndex + delta);
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
  return !!envelope && (envelope.kind === "json-v3" || envelope.kind === "v4c");
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
  var jsonEnvelope = tryParseJsonV3ReplayEnvelope(manager, trimmed);
  if (jsonEnvelope) return jsonEnvelope;
  return tryParseV4cReplayEnvelope(trimmed);
}

function parseReplayImportEnvelope(manager, trimmed) {
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
  if (replayModeConfig) {
    if (envelope.kind === "json-v3") {
      applyJsonV3StructuredReplayEnvelope(manager, envelope, replayModeConfig);
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

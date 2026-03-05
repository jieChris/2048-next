function isMoveInputRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizeMoveInputRecordObject(value, fallback) {
  return isMoveInputRecordObject(value) ? value : fallback;
}

function tryHandleMoveInputImmediately(manager, direction) {
  if (direction == -1) {
    manager.move(direction);
    return true;
  }
  var throttleMs = resolveMoveInputThrottleMs(manager);
  if (throttleMs <= 0) {
    manager.move(direction);
    return true;
  }
  var now = Date.now();
  if (!manager.moveInputFlushScheduled && (now - manager.lastMoveInputAt) >= throttleMs) {
    executeImmediateMoveInput(manager, direction, now);
    return true;
  }
  return false;
}

function queueMoveInputDirection(manager, direction) {
  manager.pendingMoveInput = direction;
  scheduleMoveInputFlush(manager);
}

function handleMoveInput(manager, direction) {
  if (!manager) return;
  if (tryHandleMoveInputImmediately(manager, direction)) return;
  queueMoveInputDirection(manager, direction);
}

function createMoveInputThrottleResolveArgs(manager) {
  return [
    manager.replayMode,
    manager.width,
    manager.height
  ];
}

function resolveMoveInputThrottleMsFallback(currentManager) {
  if (currentManager.replayMode) return 0;
  var area = (currentManager.width || 4) * (currentManager.height || 4);
  if (area >= 100) return 65;
  if (area >= 64) return 45;
  return 0;
}

function resolveMoveInputThrottleMs(manager) {
  if (!manager) return 0;
  return resolveCoreArgsCallWith(
    manager,
    "callCoreTimerIntervalRuntime",
    "resolveMoveInputThrottleMs",
    createMoveInputThrottleResolveArgs(manager),
    0,
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreNumericCallOrFallback(coreCallResult, function () {
        return resolveMoveInputThrottleMsFallback(currentManager);
      });
    }
  );
}

function executeImmediateMoveInput(manager, direction, now) {
  if (!manager) return;
  manager.lastMoveInputAt = now;
  manager.move(direction);
}

function hasPendingMoveInput(manager) {
  return !(manager.pendingMoveInput === null || typeof manager.pendingMoveInput === "undefined");
}

function scheduleMoveInputFlush(manager) {
  if (!manager || manager.moveInputFlushScheduled) return;
  manager.moveInputFlushScheduled = true;
  manager.requestAnimationFrame(function () {
    flushPendingMoveInput(manager);
  });
}

function scheduleDelayedPendingMoveInput(manager, direction, wait) {
  setTimeout(function () {
    if (hasPendingMoveInput(manager)) {
      // Newer input exists; next flush will consume latest direction.
      scheduleMoveInputFlush(manager);
      return;
    }
    executeImmediateMoveInput(manager, direction, Date.now());
  }, wait);
}

function flushPendingMoveInput(manager) {
  if (!manager) return;
  manager.moveInputFlushScheduled = false;
  var direction = manager.pendingMoveInput;
  manager.pendingMoveInput = null;
  if (direction === null || typeof direction === "undefined") return;
  var throttleMs = resolveMoveInputThrottleMs(manager);
  if (throttleMs <= 0) return manager.move(direction);
  var now = Date.now();
  var wait = throttleMs - (now - manager.lastMoveInputAt);
  if (wait <= 0) return executeImmediateMoveInput(manager, direction, now);
  return scheduleDelayedPendingMoveInput(manager, direction, wait);
}

function move(manager, direction) {
  if (!manager) return;
  // 0: up, 1: right, 2:down, 3: left, -1: undo
  if (handleUndoMove(manager, direction)) return;
  if (isGameTerminated(manager)) return;
  var lockedDirection = resolveLockedDirection(manager);
  if (shouldSkipMoveByLockedDirection(manager, direction, lockedDirection)) return;
  var movePlan = buildMovePlan(manager, direction);
  var traversals = buildTraversals(manager, movePlan.vector);
  resetGridMergeStateBeforeMove(manager);
  var moved = processMoveTraversals(manager, movePlan, traversals);
  if (!moved) return;
  finalizeSuccessfulMove(manager, movePlan, direction);
}

function shouldSkipMoveByLockedDirection(manager, direction, lockedDirection) {
  if (!manager) return true;
  if (lockedDirection === null || typeof lockedDirection === "undefined") return false;
  if (Number(direction) !== Number(lockedDirection)) return false;
  manager.lockConsumedAtMoveCount = manager.successfulMoveCount;
  return true;
}

function resetGridMergeStateBeforeMove(manager) {
  if (!manager || !manager.grid || typeof manager.grid.eachCell !== "function") return;
  // Save the current tile positions and remove merger information
  manager.grid.eachCell(function (_x, _y, tile) {
    if (!tile) return;
    tile.mergedFrom = null;
    tile.savePosition();
  });
}

function resolveMoveTraversalContext(manager, movePlan, cell) {
  if (!manager || !movePlan || !cell) return null;
  if (manager.isBlockedCell(cell.x, cell.y)) return null;
  var tile = manager.grid.cellContent(cell);
  if (!tile) return null;
  var positions = findFarthestPosition(manager, cell, movePlan.vector);
  var next = manager.isBlockedCell(positions.next.x, positions.next.y)
    ? null
    : manager.grid.cellContent(positions.next);
  var mergedValue = next ? getMergedValue(manager, tile.value, next.value) : null;
  var interaction = planTileInteraction(manager, cell, positions, next, mergedValue);
  return {
    tile: tile,
    next: next,
    mergedValue: mergedValue,
    interaction: interaction
  };
}

function shouldMergeMoveTraversalContext(context) {
  if (!context || !context.interaction) return false;
  return context.interaction.kind === "merge" &&
    context.next &&
    !context.next.mergedFrom &&
    context.mergedValue !== null;
}

function applyMoveMergeTimerStampEffects(manager, mergeEffects, timeStr) {
  if (!manager || !mergeEffects) return;
  var timerIdsToStamp = Array.isArray(mergeEffects.timerIdsToStamp)
    ? mergeEffects.timerIdsToStamp
    : [];
  for (var timerIndex = 0; timerIndex < timerIdsToStamp.length; timerIndex++) {
    var timerId = timerIdsToStamp[timerIndex];
    var timerEl = resolveManagerElementById(manager, timerId);
    if (!timerEl) continue;
    if (timerId === "timer32768") {
      if (timerEl.innerHTML === "") timerEl.textContent = timeStr;
    } else {
      if (timerEl.textContent === "") timerEl.textContent = timeStr;
    }
  }
}

function applyMoveMergeVisibilityEffects(manager, mergeEffects) {
  if (!manager || !mergeEffects) return;
  if (mergeEffects.showSubTimerContainer) {
    var subContainer = resolveManagerElementById(manager, "timer32k-sub-container");
    if (subContainer) subContainer.style.display = "block";
  }
  var hideTimerRows = Array.isArray(mergeEffects.hideTimerRows) ? mergeEffects.hideTimerRows : [];
  for (var hideIndex = 0; hideIndex < hideTimerRows.length; hideIndex++) {
    var rowEl = resolveManagerElementById(manager, "timer-row-" + String(hideTimerRows[hideIndex]));
    if (rowEl) rowEl.style.display = "none";
  }
}

function applyMergedTileMutation(manager, movePlan, context) {
  var tile = context.tile;
  var next = context.next;
  var interaction = context.interaction;
  var merged = new Tile(interaction.target, context.mergedValue);
  movePlan.undo.tiles.push(manager.createUndoTileSnapshot(tile, interaction.target));
  merged.mergedFrom = [tile, next];
  manager.grid.insertTile(merged);
  manager.grid.removeTile(tile);
  tile.updatePosition(interaction.target);
  manager.score += merged.value;
  return merged;
}

function applyMergedTileEffects(manager, mergedValue, timeStr) {
  applyProgressiveMergeMilestones(manager, mergedValue, timeStr);
  var mergeEffects = computeMergeEffects(manager, mergedValue);
  if (mergeEffects.shouldRecordCappedMilestone) {
    recordCappedMergeMilestone(manager, timeStr);
  }
  if (mergeEffects.shouldSetWon) {
    manager.won = true;
  }
  if (mergeEffects.shouldSetReached32k) {
    manager.reached32k = true;
  }
  applyMoveMergeTimerStampEffects(manager, mergeEffects, timeStr);
  applyMoveMergeVisibilityEffects(manager, mergeEffects);
}

function applyMergedMoveTraversalContext(manager, movePlan, context) {
  if (!manager || !movePlan || !context || !context.interaction || context.mergedValue === null) return false;
  var merged = applyMergedTileMutation(manager, movePlan, context);
  var timeStr = manager.pretty(manager.time);
  applyMergedTileEffects(manager, merged.value, timeStr);
  return context.interaction.moved === true;
}

function applyShiftedMoveTraversalContext(manager, movePlan, context) {
  if (!manager || !movePlan || !context || !context.interaction) return false;
  var tile = context.tile;
  var interaction = context.interaction;
  movePlan.undo.tiles.push(manager.createUndoTileSnapshot(tile, interaction.target));
  manager.grid.cells[tile.x][tile.y] = null;
  manager.grid.cells[interaction.target.x][interaction.target.y] = tile;
  tile.updatePosition(interaction.target);
  return interaction.moved === true;
}

function processMoveTraversalCell(manager, movePlan, cell) {
  var context = resolveMoveTraversalContext(manager, movePlan, cell);
  if (!context) return { handled: false, moved: false };
  if (shouldMergeMoveTraversalContext(context)) return { handled: true, moved: applyMergedMoveTraversalContext(manager, movePlan, context) };
  return { handled: true, moved: applyShiftedMoveTraversalContext(manager, movePlan, context) };
}

function processMoveTraversals(manager, movePlan, traversals) {
  if (!manager || !movePlan || !traversals) return false;
  var moved = false;
  for (var xIndex = 0; xIndex < traversals.x.length; xIndex++) {
    var x = traversals.x[xIndex];
    for (var yIndex = 0; yIndex < traversals.y.length; yIndex++) {
      var cell = { x: x, y: traversals.y[yIndex] };
      var result = processMoveTraversalCell(manager, movePlan, cell);
      if (!result.handled) continue;
      moved = result.moved === true || moved;
    }
  }
  return moved;
}

function appendPostMoveRecordArtifacts(manager, direction) {
  var postMoveRecord = computePostMoveRecord(manager, direction);
  if (postMoveRecord.shouldRecordMoveHistory) manager.moveHistory.push(direction);
  if (Number.isInteger(postMoveRecord.compactMoveCode)) appendCompactMoveCode(manager, postMoveRecord.compactMoveCode);
  if (postMoveRecord.shouldPushSessionAction && manager.sessionReplayV3) {
    manager.sessionReplayV3.actions.push(Array.isArray(postMoveRecord.sessionAction) ? postMoveRecord.sessionAction : ["m", direction]);
  }
  if (postMoveRecord.shouldResetLastSpawn) manager.lastSpawn = null;
}

function applyPostMoveLifecycleEffects(manager, postMoveLifecycle) {
  actuate(manager);
  if (postMoveLifecycle && postMoveLifecycle.shouldStartTimer) {
    manager.startTimer();
  }
}

function finalizeSuccessfulMove(manager, movePlan, direction) {
  if (!manager || !movePlan) return;
  // IPS counts only effective move inputs (invalid directions are excluded).
  updateIpsInputCountAfterMove(manager);
  applyPostMoveScore(manager, movePlan.scoreBeforeMove);
  addRandomTile(manager);
  var hasMovesAvailable = movesAvailable(manager);
  var postMoveLifecycle = resolvePostMoveLifecycle(manager, hasMovesAvailable);
  manager.undoStack.push(manager.normalizeUndoStackEntry(movePlan.undo));
  appendPostMoveRecordArtifacts(manager, direction);
  applyPostMoveLifecycleEffects(manager, postMoveLifecycle);
}

function applyPostMoveScoreFromCoreResult(manager, coreValue) {
  if (!manager) return;
  var scoreResult = normalizeMoveInputRecordObject(coreValue, {});
  if (Number.isFinite(scoreResult.score)) {
    manager.score = Number(scoreResult.score);
  }
  if (Number.isInteger(scoreResult.comboStreak) && scoreResult.comboStreak >= 0) {
    manager.comboStreak = scoreResult.comboStreak;
  }
}

function applyPostMoveScoreFallback(manager, scoreBeforeMove) {
  if (!manager) return;
  var mergeGain = manager.score - scoreBeforeMove;
  if (mergeGain > 0) {
    manager.comboStreak += 1;
    if (manager.comboMultiplier > 1 && manager.comboStreak > 1) {
      var comboBonus = Math.floor(mergeGain * (manager.comboMultiplier - 1) * (manager.comboStreak - 1));
      if (comboBonus > 0) {
        manager.score += comboBonus;
      }
    }
  } else {
    manager.comboStreak = 0;
  }
}

function applyPostMoveScore(manager, scoreBeforeMove) {
  if (!manager) return;
  if (resolveCorePayloadCallWith(manager, "callCoreScoringRuntime", "computePostMoveScore", {
    scoreBeforeMove: scoreBeforeMove,
    scoreAfterMerge: manager.score,
    comboStreak: manager.comboStreak,
    comboMultiplier: manager.comboMultiplier
  }, false, function (currentManager, coreCallResult) {
    return currentManager.tryHandleCoreRawValue(coreCallResult, function (coreValue) {
      applyPostMoveScoreFromCoreResult(currentManager, coreValue);
    });
  })) {
    return;
  }
  applyPostMoveScoreFallback(manager, scoreBeforeMove);
}

function createPostMoveLifecycleDefaultState() {
  return {
    postMoveResult: null,
    shouldStartTimer: false
  };
}

function createPostMoveLifecyclePayload(manager, hasMovesAvailable) {
  return {
    successfulMoveCount: manager.successfulMoveCount,
    hasMovesAvailable: hasMovesAvailable,
    timerStatus: manager.timerStatus
  };
}

function resolvePostMoveLifecycle(manager, hasMovesAvailable) {
  if (!manager) return createPostMoveLifecycleDefaultState();
  return resolveCorePayloadCallWith(manager, "callCorePostMoveRuntime", "computePostMoveLifecycle", createPostMoveLifecyclePayload(manager, hasMovesAvailable), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return applyCorePostMoveLifecycleResult(currentManager, coreValue, hasMovesAvailable);
    }, function () {
      return applyFallbackPostMoveLifecycleResult(currentManager, hasMovesAvailable);
    });
  });
}

function writePostMoveEndTimerText(manager) {
  if (!manager) return;
  var endTimerEl = resolveManagerElementById(manager, "timer");
  if (endTimerEl) endTimerEl.textContent = manager.pretty(manager.accumulatedTime);
}

function applyCorePostMoveSuccessfulMoveCount(manager, postMoveResult) {
  if (Number.isInteger(postMoveResult.successfulMoveCount) && postMoveResult.successfulMoveCount >= 0) {
    manager.successfulMoveCount = postMoveResult.successfulMoveCount;
    return;
  }
  manager.successfulMoveCount += 1;
}

function resolveCorePostMoveOverState(postMoveResult, hasMovesAvailable) {
  return typeof postMoveResult.over === "boolean" ? postMoveResult.over : !hasMovesAvailable;
}

function shouldCorePostMoveEndTimer(postMoveResult, over) {
  return !!(postMoveResult.shouldEndTime || over);
}

function resolveCorePostMoveShouldStartTimer(manager, postMoveResult) {
  if (typeof postMoveResult.shouldStartTimer === "boolean") {
    return postMoveResult.shouldStartTimer;
  }
  return manager.timerStatus === 0 && !manager.over;
}

function applyCorePostMoveLifecycleResult(manager, coreValue, hasMovesAvailable) {
  if (!manager) return createPostMoveLifecycleDefaultState();
  var postMoveResult = normalizeMoveInputRecordObject(coreValue, {});
  applyCorePostMoveSuccessfulMoveCount(manager, postMoveResult);
  manager.over = resolveCorePostMoveOverState(postMoveResult, hasMovesAvailable);
  if (shouldCorePostMoveEndTimer(postMoveResult, manager.over)) {
    manager.stopTimer();
    writePostMoveEndTimerText(manager);
  }
  return {
    postMoveResult: postMoveResult,
    shouldStartTimer: resolveCorePostMoveShouldStartTimer(manager, postMoveResult)
  };
}

function applyFallbackPostMoveLifecycleResult(manager, hasMovesAvailable) {
  if (!manager) {
    return {
      postMoveResult: null,
      shouldStartTimer: false
    };
  }
  manager.successfulMoveCount += 1;
  if (!hasMovesAvailable) {
    manager.over = true;
    manager.stopTimer();
    writePostMoveEndTimerText(manager);
  }
  return {
    postMoveResult: null,
    shouldStartTimer: manager.timerStatus === 0 && !manager.over
  };
}

function buildMoveUndoPayload(manager) {
  if (!manager) return {};
  return {
    score: manager.score,
    comboStreak: manager.comboStreak,
    successfulMoveCount: manager.successfulMoveCount,
    lockConsumedAtMoveCount: manager.lockConsumedAtMoveCount,
    lockedDirectionTurn: manager.lockedDirectionTurn,
    lockedDirection: manager.lockedDirection,
    undoUsed: manager.undoUsed
  };
}

function createDefaultMoveUndoFallback() {
  return {
    score: 0,
    tiles: [],
    comboStreak: 0,
    successfulMoveCount: 0,
    lockConsumedAtMoveCount: null,
    lockedDirectionTurn: null,
    lockedDirection: null,
    undoUsed: 0
  };
}

function createMoveUndoFallbackFromState(undoFallbackState) {
  return {
    score: undoFallbackState.score,
    tiles: [],
    comboStreak: undoFallbackState.comboStreak,
    successfulMoveCount: undoFallbackState.successfulMoveCount,
    lockConsumedAtMoveCount: undoFallbackState.lockConsumedAtMoveCount,
    lockedDirectionTurn: undoFallbackState.lockedDirectionTurn,
    lockedDirection: undoFallbackState.lockedDirection,
    undoUsed: undoFallbackState.undoUsed
  };
}

function buildMoveUndoFallback(manager) {
  if (!manager) return createDefaultMoveUndoFallback();
  var undoFallbackState = manager.getUndoStateFallbackValues();
  return createMoveUndoFallbackFromState(undoFallbackState);
}

function normalizeMoveUndoScore(coreSnapshot, undoFallback) {
  return Number.isFinite(coreSnapshot.score) ? Number(coreSnapshot.score) : undoFallback.score;
}

function normalizeMoveUndoTiles(coreSnapshot) {
  return Array.isArray(coreSnapshot.tiles) ? coreSnapshot.tiles : [];
}

function normalizeMoveUndoCountFields(coreSnapshot, undoFallback) {
  return { comboStreak: Number.isInteger(coreSnapshot.comboStreak) && coreSnapshot.comboStreak >= 0 ? coreSnapshot.comboStreak : undoFallback.comboStreak, successfulMoveCount: Number.isInteger(coreSnapshot.successfulMoveCount) && coreSnapshot.successfulMoveCount >= 0 ? coreSnapshot.successfulMoveCount : undoFallback.successfulMoveCount, lockConsumedAtMoveCount: Number.isInteger(coreSnapshot.lockConsumedAtMoveCount) ? coreSnapshot.lockConsumedAtMoveCount : undoFallback.lockConsumedAtMoveCount, lockedDirectionTurn: Number.isInteger(coreSnapshot.lockedDirectionTurn) ? coreSnapshot.lockedDirectionTurn : undoFallback.lockedDirectionTurn, lockedDirection: Number.isInteger(coreSnapshot.lockedDirection) ? coreSnapshot.lockedDirection : undoFallback.lockedDirection, undoUsed: Number.isInteger(coreSnapshot.undoUsed) && coreSnapshot.undoUsed >= 0 ? coreSnapshot.undoUsed : undoFallback.undoUsed };
}

function normalizeMoveUndoSnapshot(coreValue, undoFallback) {
  var computed = normalizeMoveInputRecordObject(coreValue, {});
  var countFields = normalizeMoveUndoCountFields(computed, undoFallback);
  return {
    score: normalizeMoveUndoScore(computed, undoFallback),
    tiles: normalizeMoveUndoTiles(computed),
    comboStreak: countFields.comboStreak,
    successfulMoveCount: countFields.successfulMoveCount,
    lockConsumedAtMoveCount: countFields.lockConsumedAtMoveCount,
    lockedDirectionTurn: countFields.lockedDirectionTurn,
    lockedDirection: countFields.lockedDirection,
    undoUsed: countFields.undoUsed
  };
}

function resolveMoveUndoSnapshot(manager, undoPayload, undoFallback) {
  if (!manager) return undoFallback;
  return resolveCorePayloadCallWith(manager, "callCoreUndoSnapshotRuntime", "createUndoSnapshot", undoPayload, undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeMoveUndoSnapshot(coreValue, undoFallback);
    }, function () {
      return undoFallback;
    });
  });
}

function buildMovePlan(manager, direction) {
  if (!manager) return null;
  var undoPayload = buildMoveUndoPayload(manager);
  var undoFallback = buildMoveUndoFallback(manager);
  return {
    vector: getVector(manager, direction),
    scoreBeforeMove: manager.score,
    undo: resolveMoveUndoSnapshot(manager, undoPayload, undoFallback)
  };
}

var IPS_WINDOW_MS = 1000;

function resolveIpsNowMs(rawNowMs) {
  var nowMs = Number(rawNowMs);
  if (Number.isFinite(nowMs) && nowMs >= 0) {
    return Math.floor(nowMs);
  }
  return Date.now();
}

function normalizeIpsInputTime(raw) {
  var value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function pruneIpsInputTimes(rawTimes, nowMs) {
  var minMs = nowMs - IPS_WINDOW_MS;
  var list = Array.isArray(rawTimes) ? rawTimes : [];
  var next = [];
  for (var i = 0; i < list.length; i++) {
    var time = normalizeIpsInputTime(list[i]);
    if (time === null) continue;
    if (time < minMs || time > nowMs + IPS_WINDOW_MS) continue;
    next.push(time);
  }
  return next;
}

function ensureManagerIpsInputTimes(manager, nowMs) {
  if (!manager) return [];
  var next = pruneIpsInputTimes(manager.ipsInputTimes, nowMs);
  manager.ipsInputTimes = next;
  return next;
}

function createIpsInputCountPayload(manager) {
  var nowMs = resolveIpsNowMs();
  var ipsInputTimes = ensureManagerIpsInputTimes(manager, nowMs);
  return {
    replayMode: manager.replayMode,
    replayIndex: manager.replayIndex,
    ipsInputCount: manager.ipsInputCount,
    ipsInputTimes: ipsInputTimes.slice(),
    nowMs: nowMs
  };
}

function applyIpsInputCountFromCoreResult(manager, coreValue) {
  var resolved = normalizeMoveInputRecordObject(coreValue, {});
  if (!resolved.shouldRecord) return;
  var nowMs = resolveIpsNowMs(resolved.nowMs);
  if (Array.isArray(resolved.nextIpsInputTimes)) {
    var nextTimes = pruneIpsInputTimes(resolved.nextIpsInputTimes, nowMs);
    manager.ipsInputTimes = nextTimes;
    manager.ipsInputCount = nextTimes.length;
    return;
  }
  ensureManagerIpsInputTimes(manager, nowMs);
  var nextIps = Number(resolved.nextIpsInputCount);
  manager.ipsInputCount = Number.isInteger(nextIps) && nextIps >= 0 ? nextIps : 0;
}

function applyIpsInputCountFallback(manager) {
  if (manager.replayMode) return;
  var nowMs = resolveIpsNowMs();
  var nextTimes = ensureManagerIpsInputTimes(manager, nowMs);
  nextTimes.push(nowMs);
  manager.ipsInputTimes = pruneIpsInputTimes(nextTimes, nowMs);
  manager.ipsInputCount = manager.ipsInputTimes.length;
}

function updateIpsInputCountAfterMove(manager) {
  if (!manager) return;
  if (resolveCorePayloadCallWith(
    manager,
    "callCoreReplayExecutionRuntime",
    "resolveNextIpsInputCount",
    createIpsInputCountPayload(manager),
    false,
    function (currentManager, coreCallResult) {
      return currentManager.tryHandleCoreRawValue(coreCallResult, function (coreValue) {
        applyIpsInputCountFromCoreResult(currentManager, coreValue);
      });
    }
  )) {
    return;
  }
  applyIpsInputCountFallback(manager);
}

function createProgressiveCapped64UnlockPayload(mergedValue, unlockedState, isProgressiveCapped64Mode) {
  return {
    isProgressiveCapped64Mode: isProgressiveCapped64Mode,
    value: mergedValue,
    unlockedState: unlockedState
  };
}

function applyProgressiveCapped64UnlockFromCoreResult(manager, coreValue, unlockedState) {
  var resolved = normalizeMoveInputRecordObject(coreValue, {});
  manager.capped64Unlocked = isMoveInputRecordObject(resolved.nextUnlockedState)
    ? resolved.nextUnlockedState
    : unlockedState;
  var unlockedValue = Number(resolved.unlockedValue);
  if (manager.isProgressiveCapped64UnlockValue(unlockedValue)) {
    manager.setCapped64RowVisible(unlockedValue, true);
  }
}

function applyProgressiveCapped64UnlockByCore(manager, mergedValue, unlockedState, isProgressiveCapped64Mode) {
  if (!manager) return false;
  return resolveCorePayloadCallWith(
    manager,
    "callCoreModeRuntime",
    "resolveProgressiveCapped64Unlock",
    createProgressiveCapped64UnlockPayload(mergedValue, unlockedState, isProgressiveCapped64Mode),
    false,
    function (currentManager, coreCallResult) {
      return currentManager.tryHandleCoreRawValue(coreCallResult, function (coreValue) {
        applyProgressiveCapped64UnlockFromCoreResult(currentManager, coreValue, unlockedState);
      });
    }
  );
}

function applyProgressiveCapped64UnlockFallback(manager, mergedValue, unlockedState, isProgressiveCapped64Mode) {
  if (!manager || !isProgressiveCapped64Mode) return;
  if (!manager.isProgressiveCapped64UnlockValue(mergedValue)) return;
  if (unlockedState[String(mergedValue)]) return;
  unlockedState[String(mergedValue)] = true;
  manager.capped64Unlocked = unlockedState;
  manager.setCapped64RowVisible(mergedValue, true);
}

function stampMergeMilestoneTimer(manager, mergedValue, timeStr) {
  if (!manager || !Number.isInteger(mergedValue) || mergedValue <= 0) return;
  var slotId = manager.timerMilestoneSlotByValue ? manager.timerMilestoneSlotByValue[String(mergedValue)] : null;
  if (!slotId) return;
  var timerMilestoneEl = resolveManagerElementById(manager, "timer" + slotId);
  if (timerMilestoneEl && timerMilestoneEl.textContent === "") {
    timerMilestoneEl.textContent = timeStr;
  }
}

function applyProgressiveMergeMilestones(manager, mergedValue, timeStr) {
  if (!manager || !Number.isInteger(mergedValue) || mergedValue <= 0) return;
  var unlockedState = manager.resolveProgressiveCapped64UnlockedState(manager.capped64Unlocked);
  var milestoneCappedState = manager.resolveCappedModeState();
  var isProgressiveCapped64Mode = !!milestoneCappedState.isProgressiveCapped64Mode;
  if (!applyProgressiveCapped64UnlockByCore(manager, mergedValue, unlockedState, isProgressiveCapped64Mode)) {
    applyProgressiveCapped64UnlockFallback(manager, mergedValue, unlockedState, isProgressiveCapped64Mode);
  }
  stampMergeMilestoneTimer(manager, mergedValue, timeStr);
}

function tryRecordBaseCappedMergeMilestone(manager, cappedState, milestoneCount, timeStr) {
  if (!manager || !cappedState || milestoneCount !== 1) return false;
  var capLabel = String(cappedState.cappedTargetValue || 2048);
  var baseTimerEl = resolveManagerElementById(manager, "timer" + capLabel);
  if (baseTimerEl && baseTimerEl.textContent === "") {
    baseTimerEl.textContent = timeStr;
  }
  return true;
}

function resolveCappedRepeatMilestoneLabel(manager, milestoneCount) {
  if (!manager) return "";
  return resolveCoreArgsCallWith(
    manager,
    "callCoreModeRuntime",
    "formatCappedRepeatLabel",
    [milestoneCount],
    "",
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreStringCallOrFallback(coreCallResult, function () {
        return "x" + String(milestoneCount);
      }, true);
    }
  );
}

function createCappedPlaceholderSlotResolvePayload(milestoneCount, placeholderValues) {
  return {
    repeatCount: milestoneCount,
    placeholderRowValues: placeholderValues
  };
}

function resolveCappedPlaceholderSlotByCore(manager, milestoneCount, placeholderValues) {
  return Number(resolveCorePayloadCallWith(
    manager,
    "callCoreModeRuntime",
    "resolveCappedPlaceholderSlotByRepeatCount",
    createCappedPlaceholderSlotResolvePayload(milestoneCount, placeholderValues),
    undefined,
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreRawCallValueOrUndefined(coreCallResult);
    }
  ));
}

function resolveCappedPlaceholderSlotFallback(milestoneCount, placeholderValues) {
  var placeholderIndex = milestoneCount - 2; // x2 => first placeholder row
  if (placeholderIndex >= 0 && placeholderIndex < placeholderValues.length) {
    return Number(placeholderValues[placeholderIndex]);
  }
  return null;
}

function normalizeCappedPlaceholderSlotValue(slotValue) {
  if (!Number.isInteger(slotValue) || slotValue <= 0) return null;
  return String(slotValue);
}

function resolveCappedPlaceholderSlotValue(manager, cappedState, milestoneCount) {
  if (!manager || !cappedState) return null;
  if (!Number.isInteger(milestoneCount) || milestoneCount < 2) return null;
  var placeholderValues = manager.getCappedPlaceholderRowValues(cappedState);
  var slotValue = resolveCappedPlaceholderSlotByCore(manager, milestoneCount, placeholderValues);
  if (!Number.isInteger(slotValue) || slotValue <= 0) {
    slotValue = resolveCappedPlaceholderSlotFallback(milestoneCount, placeholderValues);
  }
  return normalizeCappedPlaceholderSlotValue(slotValue);
}

function tryWriteCappedPlaceholderMilestoneRow(manager, cappedState, milestoneCount, nextLabel, timeStr) {
  if (!manager || !cappedState) return false;
  var placeholderSlotId = resolveCappedPlaceholderSlotValue(manager, cappedState, milestoneCount);
  if (!placeholderSlotId) return false;
  var row = manager.getTimerRowEl(placeholderSlotId);
  var timerEl = resolveManagerElementById(manager, "timer" + placeholderSlotId);
  if (!row || !timerEl) return false;
  var legend = row.querySelector(".timertile");
  if (legend) {
    legend.className = manager.getCappedTimerLegendClass(cappedState.cappedTargetValue);
    legend.textContent = nextLabel;
    legend.style.fontSize = manager.getCappedTimerFontSize(cappedState.cappedTargetValue);
  }
  row.style.display = ""; row.style.visibility = ""; row.style.pointerEvents = "";
  row.setAttribute("data-capped-repeat", String(milestoneCount));
  timerEl.textContent = timeStr;
  return true;
}

function appendCappedDynamicMilestoneRow(manager, container, cappedState, milestoneCount, nextLabel, timeStr) {
  if (!manager || !container || !cappedState) return false;
  var rowDiv = createSavedDynamicTimerRow(manager, {
    repeat: String(milestoneCount),
    label: nextLabel,
    time: timeStr
  }, cappedState);
  container.appendChild(rowDiv);
  normalizeCappedRepeatLegendClasses(manager, cappedState);
  return true;
}

function tryRecordCappedRepeatMilestone(manager, cappedState, milestoneCount, timeStr) {
  if (!manager || !cappedState) return false;
  var nextLabel = resolveCappedRepeatMilestoneLabel(manager, milestoneCount);
  var wroteToPlaceholder = tryWriteCappedPlaceholderMilestoneRow(
    manager, cappedState, milestoneCount, nextLabel, timeStr
  );
  if (wroteToPlaceholder) return true;
  var container = manager.getCappedOverflowContainer(cappedState);
  return appendCappedDynamicMilestoneRow(
    manager, container, cappedState, milestoneCount, nextLabel, timeStr
  );
}

function recordCappedMergeMilestone(manager, timeStr) {
  if (!manager) return;
  var cappedState = manager.resolveCappedModeState();
  if (!cappedState.isCappedMode) return;
  manager.cappedMilestoneCount += 1;
  var milestoneCount = manager.cappedMilestoneCount;
  if (tryRecordBaseCappedMergeMilestone(manager, cappedState, milestoneCount, timeStr)) return;
  if (tryRecordCappedRepeatMilestone(manager, cappedState, milestoneCount, timeStr)) {
    manager.callWindowMethod("cappedTimerAutoScroll");
  }
}

function createGameTerminatedResolvePayload(manager) {
  return {
    over: manager.over,
    won: manager.won,
    keepPlaying: manager.keepPlaying
  };
}
function resolveGameTerminatedFallback(manager) {
  return !!manager.over || (!!manager.won && !manager.keepPlaying);
}

function isGameTerminated(manager) {
  if (!manager) return false;
  // Replay must follow the recorded action stream; hitting 2048 should not block replay moves.
  if (manager.replayMode) {
    if (!manager.over) return false;
    manager.stopTimer();
    manager.timerEnd = Date.now();
    return true;
  }
  var terminated = resolveCorePayloadCallWith(manager, "callCoreModeRuntime", "isGameTerminatedState", createGameTerminatedResolvePayload(manager), false, function (currentManager, coreCallResult) {
    return currentManager.resolveCoreBooleanCallOrFallback(coreCallResult, function () { return resolveGameTerminatedFallback(currentManager); });
  });
  if (!terminated) return false;
  manager.stopTimer();
  manager.timerEnd = Date.now();
  return true;
}

function resolveForcedReplaySpawn(manager) {
  if (!manager || !manager.replayMode) return null;
  return manager.forcedSpawn || null;
}

function tryInsertForcedReplaySpawn(manager, forcedSpawn) {
  if (!(manager && forcedSpawn)) return false;
  if (!manager.grid.cellAvailable(forcedSpawn) || manager.isBlockedCell(forcedSpawn.x, forcedSpawn.y)) {
    return true;
  }
  var forcedTile = new Tile(forcedSpawn, forcedSpawn.value);
  manager.grid.insertTile(forcedTile);
  recordSpawnValue(manager, forcedSpawn.value);
  manager.forcedSpawn = null;
  return true;
}

function resolveSpawnStepCount(manager) {
  if (!manager) return 0;
  if (manager.replayMode) return manager.replayIndex;
  var moveCount = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
  var spawnCount = resolveRecordedSpawnCount(manager);
  // 新局起手两块需要使用不同随机步进，避免第二块复用第一块同一随机序列位置。
  if (spawnCount < 2) {
    return moveCount + spawnCount;
  }
  return moveCount;
}

function resolveRecordedSpawnCount(manager) {
  if (!(manager && manager.spawnValueCounts)) return 0;
  var counts = manager.spawnValueCounts;
  var total = 0;
  for (var key in counts) {
    if (!manager.hasOwnKey(counts, key)) continue;
    var count = Number(counts[key]);
    if (!Number.isFinite(count) || count <= 0) continue;
    total += Math.floor(count);
  }
  return total;
}

function primeSeededRandomByStepCount(manager, stepCount) {
  if (!manager) return;
  Math.seedrandom(manager.seed);
  for (var i = 0; i < stepCount; i++) {
    Math.random();
  }
}

function insertSeededRandomSpawnTile(manager, available) {
  if (!(manager && Array.isArray(available) && available.length > 0)) return;
  primeSeededRandomByStepCount(manager, resolveSpawnStepCount(manager));
  var value = pickSpawnValue(manager);
  var cell = available[Math.floor(Math.random() * available.length)];
  var tile = new Tile(cell, value);
  manager.grid.insertTile(tile);
  manager.lastSpawn = { x: cell.x, y: cell.y, value: value };
  recordSpawnValue(manager, value);
}

function shouldUseReplaySeededSpawn(manager) {
  return !!(manager && manager.replayMode);
}

function resolveMasterSpawnValueByDefault() {
  return Math.random() < 0.9 ? 2 : 4;
}

function applySpawnTableWeightSummaryItem(summary, item) {
  if (!(summary && item)) return;
  var value = Number(item.value);
  var weight = Number(item.weight);
  if (!Number.isInteger(value) || value <= 0) return;
  if (!(Number.isFinite(weight) && weight > 0)) return;
  summary.totalWeight += weight;
  if (value === 2) summary.twoWeight += weight;
  else if (value === 4) summary.fourWeight += weight;
  else summary.hasNonPow2Value = true;
}

function buildSpawnTableWeightSummary(table) {
  var summary = {
    totalWeight: 0,
    twoWeight: 0,
    fourWeight: 0,
    hasNonPow2Value: false
  };
  var list = Array.isArray(table) ? table : [];
  for (var i = 0; i < list.length; i++) {
    applySpawnTableWeightSummaryItem(summary, list[i]);
  }
  return summary;
}

function isClassicPow2SpawnDistribution(summary) {
  if (!summary || !(summary.totalWeight > 0)) return true;
  if (summary.hasNonPow2Value) return false;
  var fourRate = summary.fourWeight / summary.totalWeight;
  return Math.abs(fourRate - 0.1) < 0.0000001;
}

function shouldUseModeSpawnValue(manager) {
  if (!manager) return false;
  if (typeof manager.isFibonacciMode === "function" && manager.isFibonacciMode()) return true;
  var summary = buildSpawnTableWeightSummary(manager.spawnTable);
  return !isClassicPow2SpawnDistribution(summary);
}

function resolveSpawnValueByCoreRule(manager) {
  if (shouldUseModeSpawnValue(manager)) {
    return pickSpawnValue(manager);
  }
  return resolveMasterSpawnValueByDefault();
}

function shouldUseFilteredModeCellsForSpawn(manager) {
  return !!(manager && Array.isArray(manager.blockedCellsList) && manager.blockedCellsList.length > 0);
}

function pickRandomCellFromAvailableList(available) {
  if (!Array.isArray(available) || !available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function resolveMasterSpawnCell(manager) {
  if (!(manager && manager.grid)) return null;
  if (!shouldUseFilteredModeCellsForSpawn(manager) && typeof manager.grid.randomAvailableCell === "function") {
    return manager.grid.randomAvailableCell();
  }
  return pickRandomCellFromAvailableList(getAvailableCells(manager));
}

function insertMasterRandomSpawnTile(manager) {
  if (!(manager && manager.grid && typeof manager.grid.cellsAvailable === "function")) return;
  if (!manager.grid.cellsAvailable()) return;
  var cell = resolveMasterSpawnCell(manager);
  if (!cell) return;
  var value = resolveSpawnValueByCoreRule(manager);
  var tile = new Tile(cell, value);
  manager.grid.insertTile(tile);
  manager.lastSpawn = { x: cell.x, y: cell.y, value: value };
  recordSpawnValue(manager, value);
}

function addRandomTile(manager) {
  if (!manager) return;
  if (tryInsertForcedReplaySpawn(manager, resolveForcedReplaySpawn(manager))) return;
  if (shouldUseReplaySeededSpawn(manager)) {
    var available = getAvailableCells(manager);
    if (!available.length) return;
    insertSeededRandomSpawnTile(manager, available);
    return;
  }
  insertMasterRandomSpawnTile(manager);
}

function resolveLockedDirectionStateByCore(manager) {
  if (!manager) return undefined;
  return resolveCoreArgsCallWith(manager, "callCoreDirectionLockRuntime", "getLockedDirectionState", [{
    directionLockRules: manager.directionLockRules,
    successfulMoveCount: manager.successfulMoveCount,
    lockConsumedAtMoveCount: manager.lockConsumedAtMoveCount,
    lockedDirectionTurn: manager.lockedDirectionTurn,
    lockedDirection: manager.lockedDirection,
    initialSeed: manager.initialSeed
  }, function (seed) {
    return (new Math.seedrandom(seed))();
  }], undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveCoreRawCallValueOrUndefined(coreCallResult);
  });
}

function resolveActiveLockedDirectionFromCoreState(manager, lockedDirectionStateByCore) {
  if (!manager || typeof lockedDirectionStateByCore === "undefined") return null;
  var state = normalizeMoveInputRecordObject(lockedDirectionStateByCore, {});
  if (Number.isInteger(state.lockedDirection)) {
    manager.lockedDirection = state.lockedDirection;
  }
  if (Number.isInteger(state.lockedDirectionTurn)) {
    manager.lockedDirectionTurn = state.lockedDirectionTurn;
  }
  return Number.isInteger(state.activeDirection) ? state.activeDirection : null;
}

function resolveDirectionLockEveryKMoves(rules) {
  if (!rules) return null;
  var everyKRaw = Number(rules.every_k_moves);
  return Number.isInteger(everyKRaw) && everyKRaw > 0 ? everyKRaw : null;
}

function shouldActivateDirectionLockFallback(manager, everyK) {
  if (!manager || !(Number.isInteger(everyK) && everyK > 0)) return false;
  if (!(manager.successfulMoveCount > 0 && manager.successfulMoveCount % everyK === 0)) return false;
  if (manager.lockConsumedAtMoveCount === manager.successfulMoveCount) return false;
  return true;
}

function refreshFallbackLockedDirection(manager, everyK) {
  if (!manager || !Number.isInteger(everyK) || everyK <= 0) return;
  if (manager.lockedDirectionTurn === manager.successfulMoveCount) return;
  var phase = Math.floor(manager.successfulMoveCount / everyK);
  var rng = new Math.seedrandom(String(manager.initialSeed) + ":lock:" + phase);
  manager.lockedDirection = Math.floor(rng() * 4);
  manager.lockedDirectionTurn = manager.successfulMoveCount;
}

function resolveLockedDirection(manager) {
  if (!manager) return null;
  var lockedDirectionStateByCore = resolveLockedDirectionStateByCore(manager);
  var lockedDirectionFromCore = resolveActiveLockedDirectionFromCoreState(manager, lockedDirectionStateByCore);
  if (lockedDirectionFromCore !== null) return lockedDirectionFromCore;
  var everyK = resolveDirectionLockEveryKMoves(manager.directionLockRules);
  if (!shouldActivateDirectionLockFallback(manager, everyK)) return null;
  refreshFallbackLockedDirection(manager, everyK);
  return manager.lockedDirection;
}

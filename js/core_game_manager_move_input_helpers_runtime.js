function isMoveInputRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizeMoveInputRecordObject(value, fallback) {
  return isMoveInputRecordObject(value) ? value : fallback;
}

function shouldExecuteImmediateMoveInput(manager, now, throttleMs) {
  if (!manager) return false;
  if (manager.moveInputFlushScheduled) return false;
  return (now - manager.lastMoveInputAt) >= throttleMs;
}

function queuePendingMoveInput(manager, direction) {
  if (!manager) return false;
  manager.pendingMoveInput = direction;
  if (manager.moveInputFlushScheduled) return false;
  manager.moveInputFlushScheduled = true;
  return true;
}

function requestMoveInputFlush(manager) {
  if (!manager) return;
  manager.requestAnimationFrame(function () {
    flushPendingMoveInput(manager);
  });
}

function handleMoveInput(manager, direction) {
  if (!manager) return;
  if (direction == -1) {
    manager.move(direction);
    return;
  }

  var throttleMs = resolveMoveInputThrottleMs(manager);
  if (throttleMs <= 0) {
    manager.move(direction);
    return;
  }
  var now = Date.now();
  if (shouldExecuteImmediateMoveInput(manager, now, throttleMs)) {
    executeImmediateMoveInput(manager, direction, now);
    return;
  }
  if (!queuePendingMoveInput(manager, direction)) return;
  requestMoveInputFlush(manager);
}

function resolveMoveInputThrottleMs(manager) {
  if (!manager) return 0;
  return resolveCoreTimerIntervalNumericCallOrFallback(
    manager,
    "resolveMoveInputThrottleMs",
    [
      manager.replayMode,
      manager.width,
      manager.height
    ],
    function () {
      if (manager.replayMode) return 0;
      var area = (manager.width || 4) * (manager.height || 4);
      if (area >= 100) return 65;
      if (area >= 64) return 45;
      return 0;
    }
  );
}

function executeImmediateMoveInput(manager, direction, now) {
  if (!manager) return;
  manager.lastMoveInputAt = now;
  manager.move(direction);
}

function hasPendingMoveInputValue(direction) {
  return !(direction === null || typeof direction === "undefined");
}

function scheduleQueuedPendingMoveInputFlush(manager) {
  if (!manager) return;
  if (manager.moveInputFlushScheduled) return;
  manager.moveInputFlushScheduled = true;
  requestMoveInputFlush(manager);
}

function scheduleDeferredPendingMoveInput(manager, direction, wait) {
  if (!manager) return;
  var self = manager;
  setTimeout(function () {
    if (hasPendingMoveInputValue(self.pendingMoveInput)) {
      // Newer input exists; next flush will consume latest direction.
      scheduleQueuedPendingMoveInputFlush(self);
      return;
    }
    executeImmediateMoveInput(self, direction, Date.now());
  }, wait);
}

function flushPendingMoveInput(manager) {
  if (!manager) return;
  manager.moveInputFlushScheduled = false;
  var direction = manager.pendingMoveInput;
  manager.pendingMoveInput = null;
  if (!hasPendingMoveInputValue(direction)) return;
  var throttleMs = resolveMoveInputThrottleMs(manager);
  if (throttleMs <= 0) {
    manager.move(direction);
    return;
  }
  var now = Date.now();
  var wait = throttleMs - (now - manager.lastMoveInputAt);
  if (wait <= 0) {
    executeImmediateMoveInput(manager, direction, now);
    return;
  }
  scheduleDeferredPendingMoveInput(manager, direction, wait);
}

function applySuccessfulMoveImmediateEffects(manager, movePlan) {
  if (!manager || !movePlan) return;
  // IPS counts only effective move inputs (invalid directions are excluded).
  updateIpsInputCountAfterMove(manager);
  applyPostMoveScore(manager, movePlan.scoreBeforeMove);
  addRandomTile(manager);
}

function resolveSuccessfulMoveLifecycle(manager, movePlan, direction) {
  if (!manager || !movePlan) return null;
  var hasMovesAvailable = movesAvailable(manager);
  var postMoveLifecycle = resolvePostMoveLifecycle(manager, hasMovesAvailable);
  recordPostMoveArtifacts(manager, movePlan, direction);
  return postMoveLifecycle;
}

function finalizeSuccessfulMoveFlow(manager, movePlan, direction) {
  if (!manager || !movePlan) return;
  applySuccessfulMoveImmediateEffects(manager, movePlan);
  var postMoveLifecycle = resolveSuccessfulMoveLifecycle(manager, movePlan, direction);
  finalizeMoveAction(manager, postMoveLifecycle, direction);
}

function prepareMoveExecution(manager, direction) {
  if (!manager) return null;
  if (handleUndoMove(manager, direction)) return null;
  if (isGameTerminated(manager)) return null;
  var lockedDirection = resolveLockedDirection(manager);
  if (shouldBlockMoveByLockedDirection(manager, direction, lockedDirection)) return null;
  var movePlan = buildMovePlan(manager, direction);
  return {
    movePlan: movePlan,
    traversals: buildTraversals(manager, movePlan.vector)
  };
}

function move(manager, direction) {
  if (!manager) return;
  // 0: up, 1: right, 2:down, 3: left, -1: undo
  var executionContext = prepareMoveExecution(manager, direction);
  if (!executionContext) return;
  var movePlan = executionContext.movePlan;
  var traversals = executionContext.traversals;

  // Save the current tile positions and remove merger information
  prepareTilesForMove(manager);
  var moved = executeMoveTraversal(manager, movePlan, traversals);
  if (!moved) return;
  finalizeSuccessfulMoveFlow(manager, movePlan, direction);
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
  if (tryHandleCoreScoringRawValue(
    manager,
    "computePostMoveScore",
    {
      scoreBeforeMove: scoreBeforeMove,
      scoreAfterMerge: manager.score,
      comboStreak: manager.comboStreak,
      comboMultiplier: manager.comboMultiplier
    },
    function (coreValue) {
      var scoreResult = coreValue || {};
      if (Number.isFinite(scoreResult.score)) {
        manager.score = Number(scoreResult.score);
      }
      if (Number.isInteger(scoreResult.comboStreak) && scoreResult.comboStreak >= 0) {
        manager.comboStreak = scoreResult.comboStreak;
      }
    }
  )) {
    return;
  }
  applyPostMoveScoreFallback(manager, scoreBeforeMove);
}

function resolveMoveInputElementById(manager, elementId) {
  return resolveManagerElementById(manager, elementId);
}

function syncTimerTextAfterStop(manager) {
  if (!manager) return;
  var endTimerEl = resolveMoveInputElementById(manager, "timer");
  if (endTimerEl) endTimerEl.textContent = manager.pretty(manager.accumulatedTime);
}

function resolvePostMoveLifecycleFromCore(manager, coreValue, hasMovesAvailable) {
  if (!manager) {
    return {
      postMoveResult: null,
      shouldStartTimer: false
    };
  }
  var postMoveResult = coreValue || {};
  if (Number.isInteger(postMoveResult.successfulMoveCount) && postMoveResult.successfulMoveCount >= 0) {
    manager.successfulMoveCount = postMoveResult.successfulMoveCount;
  } else {
    manager.successfulMoveCount += 1;
  }
  manager.over = typeof postMoveResult.over === "boolean" ? postMoveResult.over : !hasMovesAvailable;
  if (postMoveResult.shouldEndTime || manager.over) {
    manager.stopTimer();
    syncTimerTextAfterStop(manager);
  }
  return {
    postMoveResult: postMoveResult,
    shouldStartTimer:
      typeof postMoveResult.shouldStartTimer === "boolean"
        ? postMoveResult.shouldStartTimer
        : (manager.timerStatus === 0 && !manager.over)
  };
}

function resolvePostMoveLifecycleFallback(manager, hasMovesAvailable) {
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
    syncTimerTextAfterStop(manager);
  }
  return {
    postMoveResult: null,
    shouldStartTimer: manager.timerStatus === 0 && !manager.over
  };
}

function resolvePostMoveLifecycle(manager, hasMovesAvailable) {
  if (!manager) {
    return {
      postMoveResult: null,
      shouldStartTimer: false
    };
  }
  return resolveCorePostMoveNormalizedCallOrFallback(
    manager,
    "computePostMoveLifecycle",
    {
      successfulMoveCount: manager.successfulMoveCount,
      hasMovesAvailable: hasMovesAvailable,
      timerStatus: manager.timerStatus
    },
    function (coreValue) {
      return resolvePostMoveLifecycleFromCore(manager, coreValue, hasMovesAvailable);
    },
    function () {
      return resolvePostMoveLifecycleFallback(manager, hasMovesAvailable);
    }
  );
}

function applyPostMoveRecordArtifacts(manager, postMoveRecord, direction) {
  if (!manager || !postMoveRecord) return;
  if (postMoveRecord.shouldRecordMoveHistory) {
    manager.moveHistory.push(direction);
  }
  if (Number.isInteger(postMoveRecord.compactMoveCode)) {
    appendCompactMoveCode(manager, postMoveRecord.compactMoveCode);
  }
  if (postMoveRecord.shouldPushSessionAction && manager.sessionReplayV3) {
    manager.sessionReplayV3.actions.push(
      Array.isArray(postMoveRecord.sessionAction)
        ? postMoveRecord.sessionAction
        : ["m", direction]
    );
  }
  if (postMoveRecord.shouldResetLastSpawn) {
    manager.lastSpawn = null;
  }
}

function recordPostMoveArtifacts(manager, movePlan, direction) {
  if (!manager || !movePlan) return;
  manager.undoStack.push(manager.normalizeUndoStackEntry(movePlan.undo));
  var postMoveRecord = computePostMoveRecord(manager, direction);
  applyPostMoveRecordArtifacts(manager, postMoveRecord, direction);
}

function finalizeMoveAction(manager, postMoveLifecycle, direction) {
  if (!manager) return;
  actuate(manager);
  if (postMoveLifecycle && postMoveLifecycle.shouldStartTimer) {
    manager.startTimer();
  }
  manager.publishAdapterMoveResult({
    reason: "move",
    direction: direction,
    moved: true
  });
}

function createMoveUndoFallback(manager) {
  if (!manager) {
    return {
      score: 0,
      tiles: [],
      comboStreak: 0,
      successfulMoveCount: 0,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      undoUsed: 0
    };
  }
  var undoFallbackState = manager.getUndoStateFallbackValues();
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

function normalizeMoveUndoSnapshot(coreValue, undoFallback) {
  var computed = coreValue || {};
  return {
    score: Number.isFinite(computed.score) ? Number(computed.score) : undoFallback.score,
    tiles: Array.isArray(computed.tiles) ? computed.tiles : [],
    comboStreak: Number.isInteger(computed.comboStreak) && computed.comboStreak >= 0
      ? computed.comboStreak
      : undoFallback.comboStreak,
    successfulMoveCount: Number.isInteger(computed.successfulMoveCount) && computed.successfulMoveCount >= 0
      ? computed.successfulMoveCount
      : undoFallback.successfulMoveCount,
    lockConsumedAtMoveCount: Number.isInteger(computed.lockConsumedAtMoveCount)
      ? computed.lockConsumedAtMoveCount
      : undoFallback.lockConsumedAtMoveCount,
    lockedDirectionTurn: Number.isInteger(computed.lockedDirectionTurn)
      ? computed.lockedDirectionTurn
      : undoFallback.lockedDirectionTurn,
    lockedDirection: Number.isInteger(computed.lockedDirection)
      ? computed.lockedDirection
      : undoFallback.lockedDirection,
    undoUsed: Number.isInteger(computed.undoUsed) && computed.undoUsed >= 0
      ? computed.undoUsed
      : undoFallback.undoUsed
  };
}

function buildMovePlan(manager, direction) {
  if (!manager) return null;
  var undoPayload = {
      score: manager.score,
      comboStreak: manager.comboStreak,
      successfulMoveCount: manager.successfulMoveCount,
      lockConsumedAtMoveCount: manager.lockConsumedAtMoveCount,
      lockedDirectionTurn: manager.lockedDirectionTurn,
      lockedDirection: manager.lockedDirection,
      undoUsed: manager.undoUsed
    };
  var undoFallback = createMoveUndoFallback(manager);
  return {
    vector: getVector(manager, direction),
    scoreBeforeMove: manager.score,
    undo: resolveCoreUndoSnapshotNormalizedCallOrFallback(
      manager,
      "createUndoSnapshot",
      undoPayload,
      function (coreValue) {
        return normalizeMoveUndoSnapshot(coreValue, undoFallback);
      },
      function () {
        return undoFallback;
      }
    )
  };
}

function prepareTilesForMove(manager) {
  if (!manager || !manager.grid || typeof manager.grid.eachCell !== "function") return;
  manager.grid.eachCell(function (_x, _y, tile) {
    if (!tile) return;
    tile.mergedFrom = null;
    tile.savePosition();
  });
}

function applyIpsInputCountFromCore(manager, coreValue) {
  if (!manager) return;
  var resolved = coreValue || {};
  if (!resolved.shouldRecord) return;
  var nextIps = Number(resolved.nextIpsInputCount);
  manager.ipsInputCount = Number.isInteger(nextIps) && nextIps >= 0 ? nextIps : 0;
}

function applyIpsInputCountFallback(manager) {
  if (!manager || manager.replayMode) return;
  if (!Number.isInteger(manager.ipsInputCount) || manager.ipsInputCount < 0) {
    manager.ipsInputCount = 0;
  }
  manager.ipsInputCount += 1;
}

function updateIpsInputCountAfterMove(manager) {
  if (!manager) return;
  if (tryHandleCoreReplayExecutionRawValue(
    manager,
    "resolveNextIpsInputCount",
    {
      replayMode: manager.replayMode,
      replayIndex: manager.replayIndex,
      ipsInputCount: manager.ipsInputCount
    },
    function (coreValue) {
      applyIpsInputCountFromCore(manager, coreValue);
    }
  )) {
    return;
  }
  applyIpsInputCountFallback(manager);
}

function applyProgressiveUnlockFallback(manager, isProgressiveCapped64Mode, mergedValue, unlockedState) {
  if (!manager) return;
  if (
    isProgressiveCapped64Mode &&
    manager.isProgressiveCapped64UnlockValue(mergedValue) &&
    !unlockedState[String(mergedValue)]
  ) {
    unlockedState[String(mergedValue)] = true;
    manager.capped64Unlocked = unlockedState;
    manager.setCapped64RowVisible(mergedValue, true);
  }
}

function stampMergeMilestoneTimer(manager, mergedValue, timeStr) {
  if (!manager) return;
  var slotId = manager.timerMilestoneSlotByValue ? manager.timerMilestoneSlotByValue[String(mergedValue)] : null;
  if (!slotId) return;
  var timerMilestoneEl = resolveMoveInputElementById(manager, "timer" + slotId);
  if (timerMilestoneEl && timerMilestoneEl.textContent === "") {
    timerMilestoneEl.textContent = timeStr;
  }
}

function applyProgressiveMergeMilestones(manager, mergedValue, timeStr) {
  if (!manager || !Number.isInteger(mergedValue) || mergedValue <= 0) return;
  var unlockedState = manager.resolveProgressiveCapped64UnlockedState(manager.capped64Unlocked);
  var milestoneCappedState = manager.resolveCappedModeState();
  var isProgressiveCapped64Mode = !!milestoneCappedState.isProgressiveCapped64Mode;
  if (tryHandleCoreModeRawValue(
    manager,
    "resolveProgressiveCapped64Unlock",
    {
      isProgressiveCapped64Mode: isProgressiveCapped64Mode,
      value: mergedValue,
      unlockedState: unlockedState
    },
    function (coreValue) {
      var resolved = coreValue || {};
      if (isMoveInputRecordObject(resolved.nextUnlockedState)) {
        this.capped64Unlocked = resolved.nextUnlockedState;
      } else {
        this.capped64Unlocked = unlockedState;
      }
      var unlockedValue = Number(resolved.unlockedValue);
      if (this.isProgressiveCapped64UnlockValue(unlockedValue)) {
        this.setCapped64RowVisible(unlockedValue, true);
      }
    }
  )) {
    // handled by core
  } else {
    applyProgressiveUnlockFallback(manager, isProgressiveCapped64Mode, mergedValue, unlockedState);
  }
  stampMergeMilestoneTimer(manager, mergedValue, timeStr);
}

function resolveCappedPlaceholderSlotValue(manager, milestoneCount, placeholderValues) {
  if (!manager || !Number.isInteger(milestoneCount) || milestoneCount < 2) return null;
  var slotValue = Number(resolveCoreModeRawCallValueOrUndefined(
    manager,
    "resolveCappedPlaceholderSlotByRepeatCount",
    {
      repeatCount: milestoneCount,
      placeholderRowValues: placeholderValues
    }
  ));
  if (!Number.isInteger(slotValue) || slotValue <= 0) {
    var placeholderIndex = milestoneCount - 2; // x2 => first placeholder row
    if (placeholderIndex >= 0 && placeholderIndex < placeholderValues.length) {
      slotValue = Number(placeholderValues[placeholderIndex]);
    }
  }
  return Number.isInteger(slotValue) && slotValue > 0 ? slotValue : null;
}

function tryWriteCappedMilestoneToPlaceholder(manager, cappedState, milestoneCount, nextLabel, timeStr) {
  if (!manager || !cappedState) return false;
  if (!(Number.isInteger(milestoneCount) && milestoneCount >= 2)) return false;
  var placeholderValues = manager.getCappedPlaceholderRowValues(cappedState);
  var slotValue = resolveCappedPlaceholderSlotValue(manager, milestoneCount, placeholderValues);
  if (!Number.isInteger(slotValue) || slotValue <= 0) return false;
  var placeholderSlotId = String(slotValue);
  var row = manager.getTimerRowEl(placeholderSlotId);
  var timerEl = resolveMoveInputElementById(manager, "timer" + placeholderSlotId);
  if (!(row && timerEl)) return false;

  var legend = row.querySelector(".timertile");
  if (legend) {
    legend.className = manager.getCappedTimerLegendClass(cappedState.cappedTargetValue);
    legend.textContent = nextLabel;
    legend.style.fontSize = manager.getCappedTimerFontSize(cappedState.cappedTargetValue);
  }
  row.style.display = "";
  row.style.visibility = "";
  row.style.pointerEvents = "";
  row.setAttribute("data-capped-repeat", String(milestoneCount));
  timerEl.textContent = timeStr;
  return true;
}

function appendCappedMilestoneDynamicRow(manager, container, cappedState, milestoneCount, nextLabel, timeStr) {
  if (!manager || !container || !cappedState) return;
  var rowDiv = manager.createSavedDynamicTimerRow({
    repeat: String(milestoneCount),
    label: nextLabel,
    time: timeStr
  }, cappedState);
  container.appendChild(rowDiv);
  manager.normalizeCappedRepeatLegendClasses(cappedState);
}

function recordCappedMergeMilestone(manager, timeStr) {
  if (!manager) return;
  var cappedState = manager.resolveCappedModeState();
  if (!cappedState.isCappedMode) return;
  manager.cappedMilestoneCount += 1;
  var milestoneCount = manager.cappedMilestoneCount;
  var capLabel = String(cappedState.cappedTargetValue || 2048);
  var baseTimerEl = resolveMoveInputElementById(manager, "timer" + capLabel);
  var container = manager.getCappedOverflowContainer(cappedState);

  if (milestoneCount === 1) {
    if (baseTimerEl && baseTimerEl.textContent === "") {
      baseTimerEl.textContent = timeStr;
    }
    return;
  }

  var nextLabel = resolveCoreModeStringCallOrFallbackWithArgs(
    manager,
    "formatCappedRepeatLabel",
    [milestoneCount],
    function () {
      return "x" + String(milestoneCount);
    },
    true
  );

  // Prefer replacing reserved hidden rows so the timer module height stays stable.
  var wroteToPlaceholder = tryWriteCappedMilestoneToPlaceholder(
    manager,
    cappedState,
    milestoneCount,
    nextLabel,
    timeStr
  );
  if (wroteToPlaceholder) {
    manager.callWindowMethod("cappedTimerAutoScroll");
  } else if (container) {
    appendCappedMilestoneDynamicRow(manager, container, cappedState, milestoneCount, nextLabel, timeStr);
    manager.callWindowMethod("cappedTimerAutoScroll");
  }
}

function applyMergeWinAndReachedState(manager, mergeEffects) {
  if (!manager || !mergeEffects) return;
  if (mergeEffects.shouldSetWon) {
    manager.won = true;
  }
  if (mergeEffects.shouldSetReached32k) {
    manager.reached32k = true;
  }
}

function stampMergeEffectTimers(manager, mergeEffects, timeStr) {
  if (!mergeEffects) return;
  var timerIdsToStamp = Array.isArray(mergeEffects.timerIdsToStamp)
    ? mergeEffects.timerIdsToStamp
    : [];
  for (var timerIndex = 0; timerIndex < timerIdsToStamp.length; timerIndex++) {
    var timerId = timerIdsToStamp[timerIndex];
    var timerEl = resolveMoveInputElementById(manager, timerId);
    if (!timerEl) continue;
    if (timerId === "timer32768") {
      if (timerEl.innerHTML === "") timerEl.textContent = timeStr;
    } else {
      if (timerEl.textContent === "") timerEl.textContent = timeStr;
    }
  }
}

function applyMergeSubTimerVisibility(manager, mergeEffects) {
  if (!mergeEffects || !mergeEffects.showSubTimerContainer) return;
  var subContainer = resolveMoveInputElementById(manager, "timer32k-sub-container");
  if (subContainer) subContainer.style.display = "block";
}

function applyMergeHiddenTimerRows(manager, mergeEffects) {
  if (!mergeEffects) return;
  var hideTimerRows = Array.isArray(mergeEffects.hideTimerRows) ? mergeEffects.hideTimerRows : [];
  for (var hideIndex = 0; hideIndex < hideTimerRows.length; hideIndex++) {
    var rowEl = resolveMoveInputElementById(manager, "timer-row-" + String(hideTimerRows[hideIndex]));
    if (rowEl) rowEl.style.display = "none";
  }
}

function applyMergeOutcomeEffects(manager, mergeEffects, timeStr) {
  if (!manager || !mergeEffects) return;
  applyMergeWinAndReachedState(manager, mergeEffects);
  stampMergeEffectTimers(manager, mergeEffects, timeStr);
  applyMergeSubTimerVisibility(manager, mergeEffects);
  applyMergeHiddenTimerRows(manager, mergeEffects);
}

function applyMergeTileMutation(manager, movePlan, tile, next, interaction, mergedValue) {
  if (!manager || !movePlan || !tile || !next || !interaction || mergedValue === null) return null;
  // We need to save tile since it will get removed
  movePlan.undo.tiles.push(manager.createUndoTileSnapshot(tile, interaction.target));

  var merged = new Tile(interaction.target, mergedValue);
  merged.mergedFrom = [tile, next];

  manager.grid.insertTile(merged);
  manager.grid.removeTile(tile);

  // Converge the two tiles' positions
  tile.updatePosition(interaction.target);

  // Update the score
  manager.score += merged.value;
  return merged;
}

function applyMergeDerivedEffects(manager, mergedValue, timeStr) {
  if (!manager) return;
  applyProgressiveMergeMilestones(manager, mergedValue, timeStr);
  var mergeEffects = computeMergeEffects(manager, mergedValue);
  if (mergeEffects.shouldRecordCappedMilestone) {
    recordCappedMergeMilestone(manager, timeStr);
  }
  applyMergeOutcomeEffects(manager, mergeEffects, timeStr);
}

function executeMergeInteraction(manager, movePlan, tile, next, interaction, mergedValue) {
  if (!manager || !movePlan || !tile || !next || !interaction || mergedValue === null || next.mergedFrom) {
    return false;
  }
  var merged = applyMergeTileMutation(manager, movePlan, tile, next, interaction, mergedValue);
  if (!merged) return false;

  var timeStr = manager.pretty(manager.time);
  applyMergeDerivedEffects(manager, merged.value, timeStr);
  return interaction.moved === true;
}

function executeSlideInteraction(manager, movePlan, tile, interaction) {
  if (!manager || !movePlan || !tile || !interaction) return false;
  movePlan.undo.tiles.push(manager.createUndoTileSnapshot(tile, interaction.target));
  manager.grid.cells[tile.x][tile.y] = null;
  manager.grid.cells[interaction.target.x][interaction.target.y] = tile;
  tile.updatePosition(interaction.target);
  return interaction.moved === true;
}

function processMoveTraversalCell(manager, movePlan, cell) {
  if (!manager || !movePlan || !cell) return false;
  if (manager.isBlockedCell(cell.x, cell.y)) return false;

  var tile = manager.grid.cellContent(cell);
  if (!tile) return false;

  var positions = findFarthestPosition(manager, cell, movePlan.vector);
  var next = manager.isBlockedCell(positions.next.x, positions.next.y)
    ? null
    : manager.grid.cellContent(positions.next);

  var mergedValue = next ? getMergedValue(manager, tile.value, next.value) : null;
  var interaction = planTileInteraction(manager, cell, positions, next, mergedValue);
  if (interaction.kind === "merge" && next && !next.mergedFrom && mergedValue !== null) {
    return executeMergeInteraction(manager, movePlan, tile, next, interaction, mergedValue);
  }
  return executeSlideInteraction(manager, movePlan, tile, interaction);
}

function executeMoveTraversal(manager, movePlan, traversals) {
  if (!manager || !movePlan || !traversals) return false;
  var moved = false;
  for (var xIndex = 0; xIndex < traversals.x.length; xIndex++) {
    var x = traversals.x[xIndex];
    for (var yIndex = 0; yIndex < traversals.y.length; yIndex++) {
      moved = processMoveTraversalCell(manager, movePlan, { x: x, y: traversals.y[yIndex] }) || moved;
    }
  }
  return moved;
}

function shouldBlockMoveByLockedDirection(manager, direction, lockedDirection) {
  if (!manager) return false;
  if (
    lockedDirection === null ||
    typeof lockedDirection === "undefined" ||
    Number(direction) !== Number(lockedDirection)
  ) {
    return false;
  }
  manager.lockConsumedAtMoveCount = manager.successfulMoveCount;
  return true;
}

function resolveIsGameTerminatedState(manager) {
  if (!manager) return false;
  return resolveCoreModeBooleanCallOrFallback(
    manager,
    "isGameTerminatedState",
    {
      over: manager.over,
      won: manager.won,
      keepPlaying: manager.keepPlaying
    },
    function () {
      return !!manager.over || (!!manager.won && !manager.keepPlaying);
    }
  );
}

function applyGameTerminatedSideEffects(manager) {
  if (!manager) return;
  manager.stopTimer();
  manager.timerEnd = Date.now();
}

function isGameTerminated(manager) {
  if (!manager) return false;
  var terminated = resolveIsGameTerminatedState(manager);
  if (!terminated) return false;
  applyGameTerminatedSideEffects(manager);
  return true;
}

function tryInsertForcedReplaySpawn(manager) {
  if (!manager) return false;
  var forcedSpawn = resolveForcedReplaySpawn(manager);
  if (!forcedSpawn) return false;
  if (canInsertForcedReplaySpawn(manager, forcedSpawn)) {
    applyForcedReplaySpawn(manager, forcedSpawn);
  }
  return true;
}

function resolveForcedReplaySpawn(manager) {
  if (!manager) return null;
  if (!manager.replayMode) return null;
  return manager.forcedSpawn || null;
}

function canInsertForcedReplaySpawn(manager, forcedSpawn) {
  if (!manager || !forcedSpawn) return false;
  return manager.grid.cellAvailable(forcedSpawn) && !manager.isBlockedCell(forcedSpawn.x, forcedSpawn.y);
}

function applyForcedReplaySpawn(manager, forcedSpawn) {
  if (!manager || !forcedSpawn) return;
  var forcedTile = new Tile(forcedSpawn, forcedSpawn.value);
  manager.grid.insertTile(forcedTile);
  recordSpawnValue(manager, forcedSpawn.value);
  manager.forcedSpawn = null;
}

function resolveSpawnRandomStepCount(manager) {
  if (!manager) return 0;
  return manager.replayMode ? manager.replayIndex : manager.moveHistory.length;
}

function primeSpawnRandomSource(manager, stepCount) {
  if (!manager) return;
  Math.seedrandom(manager.seed);
  for (var i = 0; i < stepCount; i++) {
    Math.random();
  }
}

function resolveRandomSpawnTilePlan(manager, available) {
  if (!manager || !Array.isArray(available) || available.length <= 0) return null;
  var value = pickSpawnValue(manager);
  var cell = available[Math.floor(Math.random() * available.length)];
  return {
    cell: cell,
    value: value
  };
}

function applyRandomSpawnTilePlan(manager, spawnPlan) {
  if (!manager || !spawnPlan) return;
  var tile = new Tile(spawnPlan.cell, spawnPlan.value);
  manager.grid.insertTile(tile);
  manager.lastSpawn = { x: spawnPlan.cell.x, y: spawnPlan.cell.y, value: spawnPlan.value };
  recordSpawnValue(manager, spawnPlan.value);
}

function insertSeededRandomSpawnTile(manager, available) {
  if (!manager || !Array.isArray(available) || available.length <= 0) return;
  var stepCount = resolveSpawnRandomStepCount(manager);
  primeSpawnRandomSource(manager, stepCount);
  var spawnPlan = resolveRandomSpawnTilePlan(manager, available);
  applyRandomSpawnTilePlan(manager, spawnPlan);
}

function addRandomTile(manager) {
  if (!manager) return;
  if (tryInsertForcedReplaySpawn(manager)) return;

  var available = resolveAvailableCellsForRandomSpawn(manager);
  if (!available.length) return;
  insertSeededRandomSpawnTile(manager, available);
}

function resolveAvailableCellsForRandomSpawn(manager) {
  if (!manager) return [];
  return getAvailableCells(manager);
}

function resolveLockedDirectionFromCore(manager) {
  if (!manager) return null;
  var lockedDirectionStateByCore = resolveCoreDirectionLockRawCallValueOrUndefined(
    manager,
    "getLockedDirectionState",
    [{
      directionLockRules: manager.directionLockRules,
      successfulMoveCount: manager.successfulMoveCount,
      lockConsumedAtMoveCount: manager.lockConsumedAtMoveCount,
      lockedDirectionTurn: manager.lockedDirectionTurn,
      lockedDirection: manager.lockedDirection,
      initialSeed: manager.initialSeed
    }, function (seed) {
      var rng = new Math.seedrandom(seed);
      return rng();
    }]
  );
  if (typeof lockedDirectionStateByCore === "undefined") {
    return null;
  }
  var state = normalizeMoveInputRecordObject(lockedDirectionStateByCore, {});
  if (Number.isInteger(state.lockedDirection)) {
    manager.lockedDirection = state.lockedDirection;
  }
  if (Number.isInteger(state.lockedDirectionTurn)) {
    manager.lockedDirectionTurn = state.lockedDirectionTurn;
  }
  return Number.isInteger(state.activeDirection) ? state.activeDirection : null;
}

function resolveLockedDirectionFallback(manager) {
  if (!manager) return null;
  var rules = manager.directionLockRules;
  var everyK = null;
  if (rules) {
    var everyKRaw = Number(rules.every_k_moves);
    everyK = Number.isInteger(everyKRaw) && everyKRaw > 0 ? everyKRaw : null;
  }
  if (!(Number.isInteger(everyK) && everyK > 0)) {
    return null;
  }
  if (!(manager.successfulMoveCount > 0 && manager.successfulMoveCount % everyK === 0)) {
    return null;
  }
  if (manager.lockConsumedAtMoveCount === manager.successfulMoveCount) {
    return null;
  }
  if (manager.lockedDirectionTurn !== manager.successfulMoveCount) {
    var phase = Math.floor(manager.successfulMoveCount / everyK);
    var rng = new Math.seedrandom(String(manager.initialSeed) + ":lock:" + phase);
    manager.lockedDirection = Math.floor(rng() * 4);
    manager.lockedDirectionTurn = manager.successfulMoveCount;
  }
  return manager.lockedDirection;
}

function resolveLockedDirection(manager) {
  if (!manager) return null;
  var lockedDirectionFromCore = resolveLockedDirectionFromCore(manager);
  if (lockedDirectionFromCore !== null) {
    return lockedDirectionFromCore;
  }
  return resolveLockedDirectionFallback(manager);
}

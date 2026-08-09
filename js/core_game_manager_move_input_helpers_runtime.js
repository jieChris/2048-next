function isMoveInputRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizeMoveInputRecordObject(value, fallback) {
  return isMoveInputRecordObject(value) ? value : fallback;
}

function resolveMoveInputCryptoRandomRuntime() {
  if (typeof CoreCryptoRandomRuntime !== "undefined" && CoreCryptoRandomRuntime) {
    return CoreCryptoRandomRuntime;
  }
  return null;
}

function resolveMoveInputRandomUnitFloat() {
  var runtime = resolveMoveInputCryptoRandomRuntime();
  if (runtime && typeof runtime.randomUnitFloat === "function") {
    return runtime.randomUnitFloat();
  }
  return 0;
}

function resolveMoveInputRandomInt(maxExclusive) {
  var runtime = resolveMoveInputCryptoRandomRuntime();
  if (runtime && typeof runtime.randomInt === "function") {
    return runtime.randomInt(maxExclusive);
  }
  var max = Math.floor(Number(maxExclusive) || 0);
  return max > 0 ? 0 : 0;
}

function createEmptyItemInventory() {
  return { hammer: 0, freeze: 0, boost4: 0 };
}

function ensureItemInventory(manager) {
  if (!manager) return createEmptyItemInventory();
  if (!isMoveInputRecordObject(manager.itemInventory)) {
    manager.itemInventory = createEmptyItemInventory();
  }
  if (!Number.isInteger(manager.itemInventory.hammer) || manager.itemInventory.hammer < 0) {
    manager.itemInventory.hammer = 0;
  }
  if (!Number.isInteger(manager.itemInventory.freeze) || manager.itemInventory.freeze < 0) {
    manager.itemInventory.freeze = 0;
  }
  if (!Number.isInteger(manager.itemInventory.boost4) || manager.itemInventory.boost4 < 0) {
    manager.itemInventory.boost4 = 0;
  }
  return manager.itemInventory;
}

function isItemModeEnabled(manager) {
  return !!(
    manager &&
    manager.itemModeRules &&
    typeof manager.itemModeRules === "object" &&
    manager.itemModeRules.enabled !== false
  );
}

function resolveItemGrantEveryMoves(manager) {
  if (!isItemModeEnabled(manager)) return 0;
  var value = Number(manager.itemModeRules.grantEveryMoves);
  return Number.isInteger(value) && value > 0 ? value : 6;
}

function resolveItemMaxPerType(manager) {
  if (!isItemModeEnabled(manager)) return 0;
  var value = Number(manager.itemModeRules.maxPerItem);
  return Number.isInteger(value) && value > 0 ? value : 3;
}

function applyHudElementStyle(el, topPx) {
  el.className = "mode-status-hud";
  el.style.position = "fixed";
  el.style.right = "10px";
  el.style.top = String(topPx) + "px";
  el.style.zIndex = "1001";
  el.style.padding = "4px 8px";
  el.style.borderRadius = "6px";
  el.style.background = "rgba(119,110,101,0.9)";
  el.style.color = "#f9f6f2";
  el.style.fontSize = "13px";
  el.style.fontWeight = "700";
  el.style.pointerEvents = "none";
  el.style.display = "none";
}

function resolveOrCreateHudElement(manager, id, topPx) {
  if (!manager) return null;
  var documentLike = resolveManagerDocumentLike(manager);
  if (!(documentLike && documentLike.body && typeof documentLike.createElement === "function")) return null;
  var el = resolveManagerElementById(manager, id);
  if (!el) {
    el = documentLike.createElement("div");
    el.id = id;
    documentLike.body.appendChild(el);
  }
  applyHudElementStyle(el, topPx);
  return el;
}

function updateItemModeHud(manager) {
  if (!manager) return;
  var hud = resolveOrCreateHudElement(manager, "item-mode-hud", 34);
  if (!hud) return;
  if (!isItemModeEnabled(manager) || manager.replayMode) {
    hud.style.display = "none";
    return;
  }
  var inventory = ensureItemInventory(manager);
  hud.style.display = "";
  hud.textContent =
    "道具 [1]锤" + inventory.hammer +
    " [2]冻" + inventory.freeze +
    " [3]4" + inventory.boost4;
}

function hasMoveTimeoutMode(manager) {
  var timeout = Number(manager && manager.moveTimeoutMs);
  return Number.isInteger(timeout) && timeout > 0;
}

function resolveMoveTimeoutRemainingMs(manager, nowMs) {
  if (!hasMoveTimeoutMode(manager)) return null;
  var deadline = Number(manager.moveDeadlineAt);
  if (!Number.isFinite(deadline) || deadline <= 0) return null;
  var now = Number.isFinite(nowMs) ? nowMs : Date.now();
  var remaining = Math.floor(deadline - now);
  return remaining > 0 ? remaining : 0;
}

function updateMoveTimeoutHud(manager, nowMs) {
  if (!manager) return;
  var hud = resolveOrCreateHudElement(manager, "move-timeout-hud", 10);
  if (!hud) return;
  if (!hasMoveTimeoutMode(manager) || manager.replayMode || manager.over) {
    hud.style.display = "none";
    return;
  }
  var remaining = resolveMoveTimeoutRemainingMs(manager, nowMs);
  if (remaining === null) {
    hud.style.display = "none";
    return;
  }
  hud.style.display = "";
  hud.textContent = "剩余 " + (remaining / 1000).toFixed(1) + "s";
}

function resetMoveTimeoutDeadline(manager, nowMs) {
  if (!hasMoveTimeoutMode(manager) || manager.replayMode) return;
  var now = Number.isFinite(nowMs) ? nowMs : Date.now();
  manager.moveDeadlineAt = now + Number(manager.moveTimeoutMs);
  updateMoveTimeoutHud(manager, now);
}

function applyMoveTimeoutLoss(manager, nowMs) {
  if (!manager) return;
  manager.over = true;
  manager.stopTimer();
  writePostMoveEndTimerText(manager);
  updateMoveTimeoutHud(manager, nowMs);
  actuate(manager);
}

function checkAndHandleMoveTimeout(manager, nowMs) {
  if (!manager) return false;
  if (!hasMoveTimeoutMode(manager) || manager.replayMode) return false;
  if (manager.over || (manager.won && !manager.keepPlaying)) return false;
  var remaining = resolveMoveTimeoutRemainingMs(manager, nowMs);
  if (remaining === null) return false;
  if (remaining > 0) {
    updateMoveTimeoutHud(manager, nowMs);
    return false;
  }
  applyMoveTimeoutLoss(manager, nowMs);
  return true;
}

function resolveNoXForbiddenTile(manager) {
  if (!(manager && manager.specialRules && typeof manager.specialRules === "object")) return null;
  if (manager.specialRules.no_x_enabled !== true) return null;
  var tile = Number(manager.specialRules.no_x_target);
  if (!Number.isInteger(tile) || tile <= 0) return null;
  return tile;
}

function applyNoXForbiddenTileLoss(manager, mergedValue) {
  if (!manager) return false;
  var forbiddenTile = resolveNoXForbiddenTile(manager);
  if (forbiddenTile === null) return false;
  if (Number(mergedValue) !== forbiddenTile) return false;
  manager.noXTriggered = true;
  manager.noXTriggeredTile = forbiddenTile;
  manager.won = false;
  manager.keepPlaying = false;
  manager.over = true;
  return true;
}

function grantRandomItemCharge(manager) {
  if (!isItemModeEnabled(manager)) return;
  var inventory = ensureItemInventory(manager);
  var maxPerType = resolveItemMaxPerType(manager);
  var itemIds = ["hammer", "freeze", "boost4"];
  var candidates = [];
  for (var i = 0; i < itemIds.length; i++) {
    var key = itemIds[i];
    if (inventory[key] < maxPerType) candidates.push(key);
  }
  if (!candidates.length) return;
  var picked = candidates[resolveMoveInputRandomInt(candidates.length)];
  inventory[picked] += 1;
}

function processItemModeAfterSuccessfulMove(manager) {
  if (!isItemModeEnabled(manager) || manager.replayMode) return;
  if (!Number.isInteger(manager.itemProgress) || manager.itemProgress < 0) manager.itemProgress = 0;
  manager.itemProgress += 1;
  var grantEveryMoves = resolveItemGrantEveryMoves(manager);
  if (grantEveryMoves > 0 && manager.itemProgress % grantEveryMoves === 0) {
    grantRandomItemCharge(manager);
  }
  updateItemModeHud(manager);
}

function consumeItemCharge(manager, key) {
  if (!isItemModeEnabled(manager)) return false;
  var inventory = ensureItemInventory(manager);
  if (!Number.isInteger(inventory[key]) || inventory[key] <= 0) return false;
  inventory[key] -= 1;
  return true;
}

function collectRemovableTilesForHammer(manager) {
  var tiles = [];
  if (!(manager && manager.grid && typeof manager.grid.eachCell === "function")) return tiles;
  manager.grid.eachCell(function (_x, _y, tile) {
    if (!tile) return;
    if (typeof manager.isStoneValue === "function" && manager.isStoneValue(tile.value)) return;
    tiles.push(tile);
  });
  return tiles;
}

function applyHammerEffect(manager) {
  var removable = collectRemovableTilesForHammer(manager);
  if (!removable.length) {
    ensureItemInventory(manager).hammer += 1;
    updateItemModeHud(manager);
    return;
  }
  var target = removable[resolveMoveInputRandomInt(removable.length)];
  manager.grid.removeTile(target);
  actuate(manager);
}

function resolveItemKeyAlias(itemKey) {
  var key = String(itemKey || "");
  if (key === "1") return "hammer";
  if (key === "2") return "freeze";
  if (key === "3") return "boost4";
  return key;
}

function canUseItemNow(manager) {
  if (!manager) return false;
  if (!isItemModeEnabled(manager) || manager.replayMode) return false;
  return !isGameTerminated(manager);
}

function resolveUsableItemKey(itemKey) {
  var key = resolveItemKeyAlias(itemKey);
  if (key !== "hammer" && key !== "freeze" && key !== "boost4") return null;
  return key;
}

function applyItemEffect(manager, key) {
  if (key === "hammer") {
    applyHammerEffect(manager);
    return;
  }
  if (key === "freeze") {
    manager.nextSpawnSuppressed = true;
    return;
  }
  manager.nextSpawnValueOverride = 4;
}

function useItem(manager, itemKey) {
  if (!canUseItemNow(manager)) return;
  var key = resolveUsableItemKey(itemKey);
  if (!key) return;
  if (!consumeItemCharge(manager, key)) {
    updateItemModeHud(manager);
    return;
  }
  applyItemEffect(manager, key);
  updateItemModeHud(manager);
}

function consumeItemSpawnSuppression(manager) {
  if (!isItemModeEnabled(manager) || manager.replayMode) return false;
  if (manager.nextSpawnSuppressed !== true) return false;
  manager.nextSpawnSuppressed = false;
  updateItemModeHud(manager);
  return true;
}

function consumeItemSpawnValueOverride(manager, fallbackValue) {
  if (!isItemModeEnabled(manager) || manager.replayMode) return fallbackValue;
  var override = Number(manager.nextSpawnValueOverride);
  if (!Number.isInteger(override) || override <= 0) return fallbackValue;
  manager.nextSpawnValueOverride = null;
  updateItemModeHud(manager);
  return override;
}

function normalizeMoveInputAttempt(attempt) {
  if (attempt && typeof attempt === "object" && "direction" in attempt) return attempt;
  return { direction: attempt, feedback: null };
}

function isUndoMoveDirection(direction) {
  return direction == -1 || direction == -2;
}

function isRankCheckpointRestoreActive(manager) {
  return !!(manager && (
    manager.rankCheckpointRestorePending === true || manager.rankCheckpointApplying === true
  ));
}

function executeImmediateUndoMoveInput(manager, attempt) {
  manager.pendingMoveInput = null;
  executeImmediateMoveInput(manager, attempt, Date.now());
}

function tryHandleMoveInputImmediately(manager, attempt) {
  if (isUndoMoveDirection(attempt.direction)) {
    executeImmediateUndoMoveInput(manager, attempt);
    return true;
  }
  if (hasPendingMoveInput(manager)) return false;
  var throttleMs = resolveMoveInputThrottleMs(manager);
  if (throttleMs <= 0) {
    executeImmediateMoveInput(manager, attempt, Date.now());
    return true;
  }
  var now = Date.now();
  if (!manager.moveInputFlushScheduled && (now - manager.lastMoveInputAt) >= throttleMs) {
    executeImmediateMoveInput(manager, attempt, now);
    return true;
  }
  return false;
}

function queueMoveInputAttempt(manager, attempt) {
  manager.pendingMoveInput = attempt;
  scheduleMoveInputFlush(manager);
}

function handleMoveInput(manager, attempt) {
  if (!manager) return;
  if (isRankCheckpointRestoreActive(manager)) {
    manager.pendingMoveInput = null;
    return;
  }
  var normalizedAttempt = normalizeMoveInputAttempt(attempt);
  if (tryHandleMoveInputImmediately(manager, normalizedAttempt)) return;
  queueMoveInputAttempt(manager, normalizedAttempt);
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

function resolveOperationFeedbackInputEventsRuntime() {
  if (typeof CoreGameManagerInputEventsRuntime !== "undefined" && CoreGameManagerInputEventsRuntime) {
    return CoreGameManagerInputEventsRuntime;
  }
  if (typeof window !== "undefined" && window && window.CoreGameManagerInputEventsRuntime) {
    return window.CoreGameManagerInputEventsRuntime;
  }
  return null;
}

function publishConfirmedMoveInput(manager, attempt, valid) {
  var runtime = resolveOperationFeedbackInputEventsRuntime();
  if (runtime && typeof runtime.publishConfirmedOperationFeedback === "function") {
    runtime.publishConfirmedOperationFeedback(manager, attempt, valid);
  }
}

function executeImmediateMoveInput(manager, attempt, now) {
  if (!manager || isRankCheckpointRestoreActive(manager)) return false;
  var normalizedAttempt = normalizeMoveInputAttempt(attempt);
  if (!isUndoMoveDirection(normalizedAttempt.direction)) manager.lastMoveInputAt = now;
  var valid = manager.move(normalizedAttempt.direction) === true;
  publishConfirmedMoveInput(manager, normalizedAttempt, valid);
  return valid;
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

function scheduleDelayedPendingMoveInput(manager, attempt, wait) {
  setTimeout(function () {
    if (manager.pendingMoveInput !== attempt) return;
    manager.pendingMoveInput = null;
    executeImmediateMoveInput(manager, attempt, Date.now());
  }, wait);
}

function flushPendingMoveInput(manager) {
  if (!manager) return;
  manager.moveInputFlushScheduled = false;
  var attempt = manager.pendingMoveInput;
  if (attempt === null || typeof attempt === "undefined") return;
  if (isRankCheckpointRestoreActive(manager)) {
    manager.pendingMoveInput = null;
    return;
  }
  var throttleMs = resolveMoveInputThrottleMs(manager);
  var now = Date.now();
  var wait = throttleMs <= 0 ? 0 : throttleMs - (now - manager.lastMoveInputAt);
  if (wait > 0) return scheduleDelayedPendingMoveInput(manager, attempt, wait);
  manager.pendingMoveInput = null;
  return executeImmediateMoveInput(manager, attempt, now);
}

function shouldAbortMoveBeforeUndo(manager) {
  if (!manager) return true;
  if (manager.rankedSetupBlockedUntilSessionReady || isRankCheckpointRestoreActive(manager)) return true;
  if (manager.noXSelectionPending === true) {
    if (typeof ensureNoXSelectionOverlayForManager === "function") {
      ensureNoXSelectionOverlayForManager(manager);
    }
    return true;
  }
  return false;
}

function shouldAbortMoveBeforePlanning(manager, direction) {
  if (!manager.isDirectionAllowed(direction)) return true;
  if (isGameTerminated(manager)) return true;
  if (checkAndHandleMoveTimeout(manager, Date.now())) return true;
  var lockedDirection = resolveLockedDirection(manager);
  if (shouldSkipMoveByLockedDirection(manager, direction, lockedDirection)) return true;
  return false;
}

function resolveUndoMoveHandlerRuntimeForMove() {
  if (typeof CoreGameManagerUndoMoveHandlerRuntime !== "undefined" && CoreGameManagerUndoMoveHandlerRuntime) {
    return CoreGameManagerUndoMoveHandlerRuntime;
  }
  if (typeof window !== "undefined" && window && window.CoreGameManagerUndoMoveHandlerRuntime) {
    return window.CoreGameManagerUndoMoveHandlerRuntime;
  }
  return null;
}

function createUndoMoveOperationsForMove() {
  return {
    actuate: actuate, canExecuteRedoMove: canExecuteRedoMove,
    canExecuteUndoMove: canExecuteUndoMove, executeRedoRestorePipeline: executeRedoRestorePipeline,
    executeUndoRestorePipeline: executeUndoRestorePipeline,
    pushRedoSnapshotBeforeUndo: pushRedoSnapshotBeforeUndo,
    shouldStartTimerAfterRedoRestore: shouldStartTimerAfterRedoRestore,
    shouldStartTimerAfterUndoRestore: shouldStartTimerAfterUndoRestore
  };
}

function executeUndoMoveForMove(manager, direction) {
  if (!isUndoMoveDirection(direction)) return { handled: false, valid: false };
  var runtime = resolveUndoMoveHandlerRuntimeForMove();
  if (runtime && typeof runtime.executeUndoMove === "function") {
    return runtime.executeUndoMove(manager, direction, createUndoMoveOperationsForMove());
  }
  return { handled: handleUndoMove(manager, direction), valid: false };
}

function move(manager, direction) {
  if (shouldAbortMoveBeforeUndo(manager)) return false;
  var undoResult = executeUndoMoveForMove(manager, direction);
  if (undoResult.handled) return undoResult.valid === true;
  if (shouldAbortMoveBeforePlanning(manager, direction)) return false;
  var movePlan = buildMovePlan(manager, direction);
  if (!(movePlan && movePlan.vector)) return false;
  var traversals = buildTraversals(manager, movePlan.vector);
  resetGridMergeStateBeforeMove(manager);
  var moved = processMoveTraversals(manager, movePlan, traversals);
  if (!moved) return false;
  finalizeSuccessfulMove(manager, movePlan, direction);
  return true;
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
  if (!manager) return;
  refreshSecondaryTimerRowsVisibility(manager);
  if (!mergeEffects) return;
  var hideTimerRows = Array.isArray(mergeEffects.hideTimerRows) ? mergeEffects.hideTimerRows : [];
  for (var hideIndex = 0; hideIndex < hideTimerRows.length; hideIndex++) {
    var rowEl = resolveManagerElementById(manager, "timer-row-" + String(hideTimerRows[hideIndex]));
    if (rowEl) rowEl.style.display = "none";
  }
}

function addRuntimeScoreDeltaForMove(manager, delta) {
  if (!manager) return;
  if (typeof manager.addRuntimeScoreDelta === "function") {
    manager.addRuntimeScoreDelta(delta);
    return;
  }
  var baseScore = Number(manager.score);
  var numericDelta = Number(delta);
  manager.score = (Number.isFinite(baseScore) ? baseScore : 0) + (Number.isFinite(numericDelta) ? numericDelta : 0);
}

function setRuntimeScoreForMove(manager, value) {
  if (!manager) return;
  if (typeof manager.setRuntimeScore === "function") {
    manager.setRuntimeScore(value);
    return;
  }
  var next = Number(value);
  manager.score = Number.isFinite(next) ? next : 0;
}

function writeRuntimeGridCellForMove(manager, x, y, tile) {
  if (!manager) return false;
  if (typeof manager.writeRuntimeGridCell === "function") {
    return manager.writeRuntimeGridCell(x, y, tile);
  }
  if (!(manager.grid && Array.isArray(manager.grid.cells) && Array.isArray(manager.grid.cells[x]))) return false;
  manager.grid.cells[x][y] = tile || null;
  return true;
}

function clearRuntimeGridCellForMove(manager, x, y) {
  if (!manager) return false;
  if (typeof manager.clearRuntimeGridCell === "function") {
    return manager.clearRuntimeGridCell(x, y);
  }
  return writeRuntimeGridCellForMove(manager, x, y, null);
}

function pushRuntimeUndoEntryForMove(manager, entry) {
  if (!manager) return;
  if (typeof manager.pushRuntimeUndoStackEntry === "function") {
    manager.pushRuntimeUndoStackEntry(entry);
    return;
  }
  if (!Array.isArray(manager.undoStack)) manager.undoStack = [];
  manager.undoStack.push(entry);
}

function clearRuntimeUndoStackForMove(manager) {
  if (!manager) return;
  if (typeof manager.setRuntimeUndoStack === "function") {
    manager.setRuntimeUndoStack([]);
    return;
  }
  manager.undoStack = [];
}

function resolveUndoHistoryModeConfigForMove(manager) {
  if (!manager) return null;
  try {
    if (typeof manager.resolveModeConfig === "function") {
      var resolved = manager.resolveModeConfig(manager.modeKey || manager.mode || "");
      if (resolved && typeof resolved === "object") return resolved;
    }
  } catch (_err) {}
  return manager.modeConfig && typeof manager.modeConfig === "object"
    ? manager.modeConfig
    : null;
}

function shouldCaptureUndoHistoryForMove(manager) {
  if (!manager) return false;
  if (manager.replayMode && manager.replayRequiresUndoHistory === true) return true;
  var modeConfig = resolveUndoHistoryModeConfigForMove(manager);
  if (modeConfig && typeof modeConfig.undo_enabled === "boolean") {
    return modeConfig.undo_enabled;
  }
  return !!manager.undoEnabled;
}

function clearRuntimeRedoStackForMove(manager) {
  if (!manager) return;
  if (typeof manager.clearRuntimeRedoStack === "function") {
    manager.clearRuntimeRedoStack();
    return;
  }
  manager.redoStack = [];
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
  addRuntimeScoreDeltaForMove(manager, merged.value);
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
  applyNoXForbiddenTileLoss(manager, mergedValue);
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
  clearRuntimeGridCellForMove(manager, tile.x, tile.y);
  writeRuntimeGridCellForMove(manager, interaction.target.x, interaction.target.y, tile);
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
  if (postMoveRecord.shouldRecordMoveHistory) recordSessionReplayV1Move(manager, direction, manager.lastSpawn);
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
  updateIpsInputCountAfterMove(manager);
  applyPostMoveScore(manager, movePlan.scoreBeforeMove);
  resetMoveTimeoutDeadline(manager, Date.now());
  processItemModeAfterSuccessfulMove(manager);
  var forcedOver = !!manager.over;
  if (!forcedOver) addRandomTile(manager);
  if (typeof stampCustomSecondaryTimersForBoard === "function") stampCustomSecondaryTimersForBoard(manager, manager.pretty(manager.time));
  var hasMovesAvailable = forcedOver ? false : movesAvailable(manager);
  var postMoveLifecycle = resolvePostMoveLifecycle(manager, hasMovesAvailable, forcedOver);
  if (shouldCaptureUndoHistoryForMove(manager)) pushRuntimeUndoEntryForMove(manager, manager.normalizeUndoStackEntry(movePlan.undo));
  else clearRuntimeUndoStackForMove(manager);
  clearRuntimeRedoStackForMove(manager);
  appendPostMoveRecordArtifacts(manager, direction);
  applyPostMoveLifecycleEffects(manager, postMoveLifecycle);
}

function applyPostMoveScoreFromCoreResult(manager, coreValue) {
  if (!manager) return;
  var scoreResult = normalizeMoveInputRecordObject(coreValue, {});
  if (Number.isFinite(scoreResult.score)) {
    setRuntimeScoreForMove(manager, Number(scoreResult.score));
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
        addRuntimeScoreDeltaForMove(manager, comboBonus);
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

function createPostMoveLifecyclePayload(manager, hasMovesAvailable, forcedOver) {
  return {
    successfulMoveCount: manager.successfulMoveCount,
    hasMovesAvailable: hasMovesAvailable,
    forcedOver: !!forcedOver,
    timerStatus: manager.timerStatus
  };
}

function resolvePostMoveLifecycle(manager, hasMovesAvailable, forcedOver) {
  if (!manager) return createPostMoveLifecycleDefaultState();
  return resolveCorePayloadCallWith(manager, "callCorePostMoveRuntime", "computePostMoveLifecycle", createPostMoveLifecyclePayload(manager, hasMovesAvailable, forcedOver), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return applyCorePostMoveLifecycleResult(currentManager, coreValue, hasMovesAvailable, forcedOver);
    }, function () {
      return applyFallbackPostMoveLifecycleResult(currentManager, hasMovesAvailable, forcedOver);
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

function resolveCorePostMoveOverState(postMoveResult, hasMovesAvailable, forcedOver) {
  if (typeof postMoveResult.over === "boolean") {
    return !!postMoveResult.over || !!forcedOver;
  }
  return !!forcedOver || !hasMovesAvailable;
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

function applyCorePostMoveLifecycleResult(manager, coreValue, hasMovesAvailable, forcedOver) {
  if (!manager) return createPostMoveLifecycleDefaultState();
  var postMoveResult = normalizeMoveInputRecordObject(coreValue, {});
  applyCorePostMoveSuccessfulMoveCount(manager, postMoveResult);
  manager.over = resolveCorePostMoveOverState(postMoveResult, hasMovesAvailable, forcedOver);
  if (shouldCorePostMoveEndTimer(postMoveResult, manager.over)) {
    manager.stopTimer();
    writePostMoveEndTimerText(manager);
  }
  return {
    postMoveResult: postMoveResult,
    shouldStartTimer: resolveCorePostMoveShouldStartTimer(manager, postMoveResult)
  };
}

function applyFallbackPostMoveLifecycleResult(manager, hasMovesAvailable, forcedOver) {
  if (!manager) {
    return {
      postMoveResult: null,
      shouldStartTimer: false
    };
  }
  manager.successfulMoveCount += 1;
  if (forcedOver || !hasMovesAvailable) {
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

function applyCappedPlaceholderLegendStyle(manager, legend, cappedState, nextLabel) {
  if (!manager || !legend || !cappedState) return;
  legend.className = manager.getCappedTimerLegendClass(cappedState.cappedTargetValue);
  legend.textContent = nextLabel;
  legend.style.fontSize = typeof manager.getCappedTimerLegendFontSize === "function"
    ? manager.getCappedTimerLegendFontSize(cappedState.cappedTargetValue)
    : manager.getCappedTimerFontSize(cappedState.cappedTargetValue);
}

function tryWriteCappedPlaceholderMilestoneRow(manager, cappedState, milestoneCount, nextLabel, timeStr) {
  if (!manager || !cappedState) return false;
  var placeholderSlotId = resolveCappedPlaceholderSlotValue(manager, cappedState, milestoneCount);
  if (!placeholderSlotId) return false;
  var row = manager.getTimerRowEl(placeholderSlotId);
  var timerEl = resolveManagerElementById(manager, "timer" + placeholderSlotId);
  if (!row || !timerEl) return false;
  var legend = row.querySelector(".timertile");
  applyCappedPlaceholderLegendStyle(manager, legend, cappedState, nextLabel);
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
  if (!manager || typeof Math.seedrandom !== "function") return null;
  var rng = new Math.seedrandom(manager.seed);
  for (var i = 0; i < stepCount; i++) {
    rng();
  }
  return rng;
}

function createSeededReplayFallbackRandomSource(manager, stepCount) {
  var cursor = 0;
  var seed = Math.floor(Number(manager && manager.seed) || 0);
  var normalizedStepCount = Math.floor(Number(stepCount) || 0);
  return function () {
    var value = createRankedDeterministicHash(seed, normalizedStepCount, "replay:" + String(cursor));
    cursor += 1;
    return value / 4294967296;
  };
}

function createSeededReplayRandomSource(manager, stepCount) {
  var rng = primeSeededRandomByStepCount(manager, stepCount);
  return typeof rng === "function" ? rng : createSeededReplayFallbackRandomSource(manager, stepCount);
}

function resolveSeededReplaySpawnTableTotalWeight(table) {
  var totalWeight = 0;
  var list = Array.isArray(table) ? table : [];
  for (var i = 0; i < list.length; i++) {
    totalWeight += Number(list[i] && list[i].weight) || 0;
  }
  return totalWeight;
}

function resolveSeededReplaySpawnValueByWeight(table, totalWeight, rng) {
  var list = Array.isArray(table) ? table : [];
  var randomSource = typeof rng === "function" ? rng : function () { return 0; };
  var pick = randomSource() * totalWeight;
  var running = 0;
  for (var index = 0; index < list.length; index++) {
    running += Number(list[index] && list[index].weight) || 0;
    if (pick <= running) return list[index].value;
  }
  return list[list.length - 1].value;
}

function resolveSeededReplaySpawnValue(manager, rng) {
  var table = manager && Array.isArray(manager.spawnTable) ? manager.spawnTable : [];
  if (!table.length) return 2;
  var totalWeight = resolveSeededReplaySpawnTableTotalWeight(table);
  if (totalWeight <= 0) return table[0].value;
  return resolveSeededReplaySpawnValueByWeight(table, totalWeight, rng);
}

function insertSeededRandomSpawnTile(manager, available) {
  if (!(manager && Array.isArray(available) && available.length > 0)) return;
  var randomSource = createSeededReplayRandomSource(manager, resolveSpawnStepCount(manager));
  var value = consumeItemSpawnValueOverride(manager, resolveSeededReplaySpawnValue(manager, randomSource));
  var cell = available[Math.floor(randomSource() * available.length)];
  var tile = new Tile(cell, value);
  manager.grid.insertTile(tile);
  manager.lastSpawn = { x: cell.x, y: cell.y, value: value };
  recordSpawnValue(manager, value);
}

function shouldUseReplaySeededSpawn(manager) {
  return !!(manager && manager.replayMode);
}

function resolveRankedDeterministicSeed(manager) {
  var seed = Math.floor(Number(manager && manager.initialSeed));
  return Number.isInteger(seed) && seed >= 0 ? seed : null;
}

function createRankedDeterministicHash(seed, stepCount, channel) {
  var text = String(Math.floor(seed)) + "|" + String(Math.floor(stepCount)) + "|" + String(channel || "");
  var hash = 0x811c9dc5;
  for (var i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function resolveRankedDeterministicUnitFloat(seed, stepCount, channel) {
  return createRankedDeterministicHash(seed, stepCount, channel) / 4294967296;
}

function resolveRankedSpawnFallbackValue(manager) {
  return (manager && manager.ruleset) === "fibonacci" ? 1 : 2;
}

function resolveRankedSpawnTable(manager) {
  var sustainableTable = resolveSustainableUndoSpawnTable(manager);
  if (sustainableTable) return sustainableTable;
  if (Array.isArray(manager && manager.spawnTable) && manager.spawnTable.length) {
    return manager.spawnTable;
  }
  return (manager && manager.ruleset) === "fibonacci"
    ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
    : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
}

function resolveRankedSpawnWeight(item) {
  return Math.max(0, Math.floor(Number(item && item.weight) || 0));
}

function resolveRankedSpawnValueOrFallback(manager, item) {
  return Math.floor(Number(item && item.value) || 0) || resolveRankedSpawnFallbackValue(manager);
}

function resolveRankedDeterministicSpawnValue(manager, seed, stepCount) {
  var table = resolveRankedSpawnTable(manager);
  var totalWeight = 0;
  for (var i = 0; i < table.length; i++) totalWeight += resolveRankedSpawnWeight(table[i]);
  if (!(totalWeight > 0)) return resolveRankedSpawnFallbackValue(manager);
  var cursor = Math.min(resolveRankedDeterministicUnitFloat(seed, stepCount, "spawn:value"), 0.9999999999999999) * totalWeight;
  var running = 0;
  for (var j = 0; j < table.length; j++) {
    var item = table[j];
    running += resolveRankedSpawnWeight(item);
    if (cursor < running) return resolveRankedSpawnValueOrFallback(manager, item);
  }
  var fallback = table[table.length - 1];
  return resolveRankedSpawnValueOrFallback(manager, fallback);
}

function shouldUseRankedDeterministicSpawn(manager) {
  return !!(
    manager &&
    !manager.replayMode &&
    String(manager.rankPolicy || "").toLowerCase() === "ranked" &&
    resolveRankedDeterministicSeed(manager) !== null
  );
}

function insertRankedDeterministicSpawnTile(manager, available) {
  if (!(manager && Array.isArray(available) && available.length > 0)) return;
  var seed = resolveRankedDeterministicSeed(manager);
  if (seed === null) return;
  var stepCount = resolveSpawnStepCount(manager);
  var cellRoll = resolveRankedDeterministicUnitFloat(seed, stepCount, "spawn:cell");
  var cell = available[Math.min(available.length - 1, Math.floor(cellRoll * available.length))];
  var sustainableValue = resolveSustainableUndoSpawnValue(manager, cell);
  var value = sustainableValue === null
    ? consumeItemSpawnValueOverride(manager, resolveRankedDeterministicSpawnValue(manager, seed, stepCount))
    : sustainableValue;
  var tile = new Tile(cell, value);
  manager.grid.insertTile(tile);
  manager.lastSpawn = { x: cell.x, y: cell.y, value: value };
  recordSpawnValue(manager, value);
}

function resolveMasterSpawnValueByDefault() {
  return resolveMoveInputRandomUnitFloat() < 0.9 ? 2 : 4;
}

function resolveSustainableSpawnBaseValues(manager) {
  return String(manager && manager.ruleset || "").toLowerCase() === "fibonacci"
    ? [1, 2]
    : [2, 4];
}

function hasStandardSustainableSpawnTable(manager) {
  var table = Array.isArray(manager && manager.spawnTable) ? manager.spawnTable : [];
  if (!table.length) return true;
  var baseValues = resolveSustainableSpawnBaseValues(manager);
  var totalWeight = 0;
  var secondaryWeight = 0;
  for (var i = 0; i < table.length; i++) {
    var value = Number(table[i] && table[i].value);
    var weight = Number(table[i] && table[i].weight);
    if (!(Number.isFinite(weight) && weight > 0)) return false;
    if (value !== baseValues[0] && value !== baseValues[1]) return false;
    totalWeight += weight;
    if (value === baseValues[1]) secondaryWeight += weight;
  }
  return totalWeight > 0 && Math.abs(secondaryWeight / totalWeight - 0.1) < 0.0000001;
}

function shouldUseSustainableUndoSpawn(manager) {
  var ruleset = String(manager && manager.ruleset || "").toLowerCase();
  return !!(
    manager &&
    !manager.replayMode &&
    (ruleset === "pow2" || ruleset === "fibonacci") &&
    shouldCaptureUndoHistoryForMove(manager) &&
    hasStandardSustainableSpawnTable(manager) &&
    !(Number.isFinite(Number(manager.maxTile)) && Number(manager.maxTile) > 0)
  );
}

function countBigIntBinaryOnes(value) {
  var count = 0;
  var remaining = value;
  while (remaining > 0n) {
    remaining &= remaining - 1n;
    count += 1;
  }
  return count;
}

function collectSustainableSpawnBoardState(manager) {
  var state = { values: [], playable: 0, minValue: null, valid: true };
  if (!(manager && manager.grid && typeof manager.grid.eachCell === "function")) state.valid = false;
  if (!state.valid) return state;
  manager.grid.eachCell(function (x, y, tile) {
    if (typeof manager.isBlockedCell === "function" && manager.isBlockedCell(x, y)) return;
    state.playable += 1;
    if (!tile) return;
    var value = Number(tile.value);
    if (!Number.isSafeInteger(value) || value <= 0) {
      state.valid = false;
      return;
    }
    state.values.push(value);
    if (state.minValue === null || value < state.minValue) state.minValue = value;
  });
  return state;
}

function isSafePowerOfTwo(value) {
  if (!Number.isSafeInteger(value) || value <= 0) return false;
  var bigValue = BigInt(value);
  return (bigValue & (bigValue - 1n)) === 0n;
}

function resolvePow2CapacitySpawnValue(state) {
  var threshold = state.playable - 1;
  if (!state.valid || threshold < 1 || state.values.length !== threshold) return null;
  var sum = 0n;
  for (var i = 0; i < state.values.length; i++) {
    if (!isSafePowerOfTwo(state.values[i])) return null;
    sum += BigInt(state.values[i]);
  }
  return countBigIntBinaryOnes(sum) === threshold ? state.minValue : null;
}

function resolveSpawnValueCount(manager, value) {
  var counts = manager && manager.spawnValueCounts;
  if (!(counts && typeof counts === "object")) return 0;
  var count = Number(counts[String(value)]);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function resolveUnlockedFibonacciSpawnValues(manager) {
  var values = [];
  var previous = 1;
  var current = 2;
  while (true) {
    var next = previous + current;
    if (!Number.isSafeInteger(next) || resolveSpawnValueCount(manager, next) <= 0) break;
    values.push(next);
    previous = current;
    current = next;
  }
  return values;
}

function resolveUnlockedPow2SpawnValues(manager) {
  var counts = manager && manager.spawnValueCounts;
  var values = [];
  var seen = {};
  if (!(counts && typeof counts === "object")) return values;
  for (var key in counts) {
    if (!Object.prototype.hasOwnProperty.call(counts, key) || !(Number(counts[key]) > 0)) continue;
    var value = Number(key);
    if (value <= 4 || !isSafePowerOfTwo(value) || seen[String(value)]) continue;
    seen[String(value)] = true;
    values.push(value);
  }
  values.sort(function (a, b) { return a - b; });
  return values;
}

function resolveUnlockedSustainableSpawnValues(manager) {
  return String(manager && manager.ruleset || "").toLowerCase() === "fibonacci"
    ? resolveUnlockedFibonacciSpawnValues(manager)
    : resolveUnlockedPow2SpawnValues(manager);
}

function resolveSustainableUndoSpawnTable(manager) {
  if (!shouldUseSustainableUndoSpawn(manager)) return null;
  var baseValues = resolveSustainableSpawnBaseValues(manager);
  var unlocked = resolveUnlockedSustainableSpawnValues(manager);
  if (!unlocked.length) {
    return [{ value: baseValues[0], weight: 90 }, { value: baseValues[1], weight: 10 }];
  }
  var scale = unlocked.length;
  var table = [
    { value: baseValues[0], weight: 87 * scale },
    { value: baseValues[1], weight: 10 * scale }
  ];
  for (var i = 0; i < unlocked.length; i++) table.push({ value: unlocked[i], weight: 3 });
  return table;
}

function buildFibonacciValuesThroughRank(rank) {
  var values = [0, 1, 2];
  for (var currentRank = 3; currentRank <= rank; currentRank++) {
    var next = values[currentRank - 2] + values[currentRank - 1];
    if (!Number.isSafeInteger(next)) return null;
    values[currentRank] = next;
  }
  return values;
}

function resolveFibonacciCapacitySpawnValue(manager, state) {
  var threshold = state.playable - 1;
  if (!state.valid || threshold < 1 || state.values.length !== threshold) return null;
  var highestDirectRank = 2 + resolveUnlockedFibonacciSpawnValues(manager).length;
  var highestFrontierRank = highestDirectRank + 2 * threshold;
  var fibonacciValues = buildFibonacciValuesThroughRank(highestFrontierRank);
  if (!fibonacciValues) return null;
  var boardValues = state.values.slice().sort(function (a, b) { return a - b; });
  for (var i = 0; i < threshold; i++) {
    if (boardValues[i] !== fibonacciValues[highestDirectRank + 2 * (i + 1)]) return null;
  }
  return fibonacciValues[highestDirectRank + 1];
}

function resolveSustainableUndoSpawnValue(manager, cell) {
  if (!shouldUseSustainableUndoSpawn(manager)) return null;
  if (!(cell && Number.isInteger(cell.x) && Number.isInteger(cell.y))) return null;
  if (!(manager.grid && typeof manager.grid.cellContent === "function") || manager.grid.cellContent(cell)) return null;
  var state = collectSustainableSpawnBoardState(manager);
  return String(manager.ruleset || "").toLowerCase() === "fibonacci"
    ? resolveFibonacciCapacitySpawnValue(manager, state)
    : resolvePow2CapacitySpawnValue(state);
}

function resolveSpawnValueByUnitRoll(table, unitRoll, fallbackValue) {
  var list = Array.isArray(table) ? table : [];
  var totalWeight = 0;
  for (var i = 0; i < list.length; i++) totalWeight += Math.max(0, Number(list[i] && list[i].weight) || 0);
  if (!(totalWeight > 0)) return fallbackValue;
  var roll = Number(unitRoll);
  if (!Number.isFinite(roll)) roll = 0;
  roll = Math.max(0, Math.min(roll, 0.9999999999999999));
  var cursor = roll * totalWeight;
  var running = 0;
  for (var j = 0; j < list.length; j++) {
    running += Math.max(0, Number(list[j] && list[j].weight) || 0);
    if (cursor < running) return Number(list[j].value) || fallbackValue;
  }
  return fallbackValue;
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
  var sustainableTable = resolveSustainableUndoSpawnTable(manager);
  if (sustainableTable) {
    var fallbackValue = resolveSustainableSpawnBaseValues(manager)[0];
    return consumeItemSpawnValueOverride(
      manager,
      resolveSpawnValueByUnitRoll(sustainableTable, resolveMoveInputRandomUnitFloat(), fallbackValue)
    );
  }
  if (shouldUseModeSpawnValue(manager)) {
    return consumeItemSpawnValueOverride(manager, pickSpawnValue(manager));
  }
  return consumeItemSpawnValueOverride(manager, resolveMasterSpawnValueByDefault());
}

function shouldUseFilteredModeCellsForSpawn(manager) {
  return !!(manager && Array.isArray(manager.blockedCellsList) && manager.blockedCellsList.length > 0);
}

function pickRandomCellFromAvailableList(available) {
  if (!Array.isArray(available) || !available.length) return null;
  return available[resolveMoveInputRandomInt(available.length)];
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
  var sustainableValue = resolveSustainableUndoSpawnValue(manager, cell);
  var value = sustainableValue === null ? resolveSpawnValueByCoreRule(manager) : sustainableValue;
  var tile = new Tile(cell, value);
  manager.grid.insertTile(tile);
  manager.lastSpawn = { x: cell.x, y: cell.y, value: value };
  recordSpawnValue(manager, value);
}

function addRandomTile(manager) {
  if (!manager) return;
  if (tryInsertForcedReplaySpawn(manager, resolveForcedReplaySpawn(manager))) return;
  if (consumeItemSpawnSuppression(manager)) return;
  if (shouldUseReplaySeededSpawn(manager)) {
    var available = getAvailableCells(manager);
    if (!available.length) return;
    insertSeededRandomSpawnTile(manager, available);
    return;
  }
  if (shouldUseRankedDeterministicSpawn(manager)) {
    var rankedAvailable = getAvailableCells(manager);
    if (!rankedAvailable.length) return;
    insertRankedDeterministicSpawnTile(manager, rankedAvailable);
    return;
  }
  insertMasterRandomSpawnTile(manager);
}

function buildLockedDirectionCoreArgs(manager, availableDirections) {
  return [{
    directionLockRules: manager.directionLockRules,
    successfulMoveCount: manager.successfulMoveCount,
    lockConsumedAtMoveCount: manager.lockConsumedAtMoveCount,
    lockedDirectionTurn: manager.lockedDirectionTurn,
    lockedDirection: manager.lockedDirection,
    initialSeed: manager.initialSeed,
    availableDirections: availableDirections
  }, function (seed) {
    return (new Math.seedrandom(seed))();
  }];
}

function resolveLockedDirectionStateByCore(manager) {
  if (!manager) return undefined;
  var availableDirections = typeof manager.getActiveMoveDirections === "function"
    ? manager.getActiveMoveDirections()
    : [0, 1, 2, 3];
  var args = buildLockedDirectionCoreArgs(manager, availableDirections);
  return resolveCoreArgsCallWith(manager, "callCoreDirectionLockRuntime", "getLockedDirectionState", args, undefined, function (currentManager, coreCallResult) {
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
  var directions = typeof manager.getActiveMoveDirections === "function"
    ? manager.getActiveMoveDirections()
    : [0, 1, 2, 3];
  if (!Array.isArray(directions) || !directions.length) directions = [0, 1, 2, 3];
  var phase = Math.floor(manager.successfulMoveCount / everyK);
  var rng = new Math.seedrandom(String(manager.initialSeed) + ":lock:" + phase);
  manager.lockedDirection = directions[Math.floor(rng() * directions.length)] || directions[0];
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

// saved-state storage/sync helpers moved from saved_state runtime to satisfy audit size gate

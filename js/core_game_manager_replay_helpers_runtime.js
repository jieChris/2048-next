function isReplayRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizeReplayRecordObject(value, fallback) {
  return isReplayRecordObject(value) ? value : fallback;
}

function resolveCoreReplayPayloadObjectCallOrFallback(manager, runtimeMethodName, methodName, payload, fallbackResolver) {
  return resolveCoreObjectPayloadCallOrFallback(manager, runtimeMethodName, methodName, payload, fallbackResolver);
}

function resolveCoreReplayPayloadBooleanCallOrFallback(manager, runtimeMethodName, methodName, payload, fallbackResolver) {
  return resolveCorePayloadCallWith(
    manager,
    runtimeMethodName,
    methodName,
    payload,
    false,
    function (currentManager, coreCallResult) {
      return resolveCoreBooleanCallResult(currentManager, coreCallResult, fallbackResolver);
    }
  );
}

function resolveCoreReplayPayloadNumericCallOrFallback(manager, runtimeMethodName, methodName, payload, fallbackResolver) {
  return resolveCorePayloadCallWith(
    manager,
    runtimeMethodName,
    methodName,
    payload,
    0,
    function (currentManager, coreCallResult) {
      return resolveCoreNumericCallResult(currentManager, coreCallResult, fallbackResolver);
    }
  );
}

function resolveCoreReplayPayloadStringCallOrFallback(
  manager,
  runtimeMethodName,
  methodName,
  payload,
  fallbackResolver,
  allowEmpty
) {
  return resolveCorePayloadCallWith(
    manager,
    runtimeMethodName,
    methodName,
    payload,
    "",
    function (currentManager, coreCallResult) {
      return resolveCoreStringCallResult(
        currentManager,
        coreCallResult,
        fallbackResolver,
        allowEmpty
      );
    }
  );
}

function resolveCoreReplayPayloadNormalizedCallOrFallback(
  manager,
  runtimeMethodName,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCoreNormalizedPayloadCallOrFallback(manager, runtimeMethodName, methodName, payload, normalizer, fallbackResolver);
}

function resolveCoreReplayPayloadNormalizedCallOrFallbackAllowNull(
  manager,
  runtimeMethodName,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCorePayloadCallWith(
    manager,
    runtimeMethodName,
    methodName,
    payload,
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCoreNormalizedCallResult(
        currentManager,
        coreCallResult,
        normalizer,
        fallbackResolver,
        true
      );
    }
  );
}

function tryHandleCoreReplayPayloadRawValue(manager, runtimeMethodName, methodName, payload, handler) {
  return tryHandleCorePayloadRawValue(manager, runtimeMethodName, methodName, payload, handler);
}

function resolveCoreReplayArgsObjectCallOrFallback(manager, runtimeMethodName, methodName, runtimeArgs, fallbackResolver) {
  return resolveCoreArgsCallWith(
    manager,
    runtimeMethodName,
    methodName,
    runtimeArgs,
    {},
    function (currentManager, coreCallResult) {
      return resolveCoreObjectCallResult(currentManager, coreCallResult, fallbackResolver);
    }
  );
}

function resolveCoreReplayArgsStringCallOrFallback(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs,
  fallbackResolver,
  allowEmpty
) {
  return resolveCoreArgsStringCallOrFallback(manager, runtimeMethodName, methodName, runtimeArgs, fallbackResolver, allowEmpty);
}

function resolveCoreReplayArgsNormalizedCallOrFallback(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs,
  normalizer,
  fallbackResolver
) {
  return resolveCoreArgsNormalizedCallOrFallback(manager, runtimeMethodName, methodName, runtimeArgs, normalizer, fallbackResolver);
}

function tryHandleCoreReplayArgsRawValue(manager, runtimeMethodName, methodName, runtimeArgs, handler) {
  return tryHandleCoreArgsRawValue(manager, runtimeMethodName, methodName, runtimeArgs, handler);
}

function getActionKind(manager, action) {
  if (!manager) return "x";
  return resolveCoreReplayPayloadStringCallOrFallback(
    manager,
    "callCoreReplayExecutionRuntime",
    "getReplayActionKind",
    action,
    function () {
      if (action === -1) return "u";
      if (action >= 0 && action <= 3) return "m";
      if (Array.isArray(action) && action.length > 0) return action[0];
      return "x";
    }
  );
}

function resolveCoreReplayTimerNormalizedCallOrFallback(manager, methodName, payload, normalizer, fallbackResolver) {
  return resolveCoreReplayPayloadNormalizedCallOrFallback(manager, "callCoreReplayTimerRuntime", methodName, payload, normalizer, fallbackResolver);
}

function resolveCoreReplayExecutionNumericCallOrFallback(manager, methodName, payload, fallbackResolver) {
  return resolveCoreReplayPayloadNumericCallOrFallback(manager, "callCoreReplayExecutionRuntime", methodName, payload, fallbackResolver);
}

function resolveCoreReplayExecutionNormalizedCallOrFallback(manager, methodName, payload, normalizer, fallbackResolver) {
  return resolveCoreReplayPayloadNormalizedCallOrFallback(manager, "callCoreReplayExecutionRuntime", methodName, payload, normalizer, fallbackResolver);
}

function tryHandleCoreReplayExecutionRawValue(manager, methodName, payload, handler) {
  return tryHandleCoreReplayPayloadRawValue(manager, "callCoreReplayExecutionRuntime", methodName, payload, handler);
}

function tryHandleCoreReplayCodecRawValue(manager, methodName, runtimeArgs, handler) {
  return tryHandleCoreReplayArgsRawValue(manager, "callCoreReplayCodecRuntime", methodName, runtimeArgs, handler);
}

function resolveReplayPauseState(manager) {
  if (!manager) return {};
  var state = resolveCoreReplayPayloadObjectCallOrFallback(
    manager,
    "callCoreReplayTimerRuntime",
    "computeReplayPauseState",
    {},
    function () {
      return {
        isPaused: true,
        shouldClearInterval: true
      };
    }
  );
  return manager.isNonArrayObject(state) ? state : {};
}

function applyReplayPauseState(manager, state) {
  if (!manager) return;
  var pauseState = normalizeReplayRecordObject(state, {});
  manager.isPaused = pauseState.isPaused !== false;
  if (pauseState.shouldClearInterval !== false) {
    clearInterval(manager.replayInterval);
  }
}

function pauseReplay(manager) {
  if (!manager) return;
  var state = resolveReplayPauseState(manager);
  applyReplayPauseState(manager, state);
}

function runReplayTick(manager) {
  if (!manager) return false;
  var shouldStopAtTick = resolveReplayShouldStopAtTick(manager);
  var replayEndState = resolveReplayEndStateForTick(manager, shouldStopAtTick);
  var tickBoundaryPlan = resolveReplayTickBoundaryPlan(manager, shouldStopAtTick, replayEndState);
  if (applyReplayTickBoundaryPlan(manager, tickBoundaryPlan)) return false;
  executePlannedReplayStep(manager);
  return true;
}

function buildReplayTickStopRuntimeInput(manager) {
  if (!manager) return {};
  return {
    replayIndex: manager.replayIndex,
    replayMovesLength: manager.replayMoves.length
  };
}

function resolveReplayShouldStopAtTick(manager) {
  if (!manager) return true;
  return resolveCoreReplayPayloadBooleanCallOrFallback(
    manager,
    "callCoreReplayTimerRuntime",
    "shouldStopReplayAtTick",
    buildReplayTickStopRuntimeInput(manager),
    function () {
      return manager.replayIndex >= manager.replayMoves.length;
    }
  );
}

function resolveReplayEndStateForTick(manager, shouldStopAtTick) {
  if (!manager || !shouldStopAtTick) return undefined;
  return resolveCoreReplayPayloadObjectCallOrFallback(
    manager,
    "callCoreReplayFlowRuntime",
    "computeReplayEndState",
    {},
    function () {
      return {
        shouldPause: true,
        replayMode: false
      };
    }
  );
}

function resolveReplayTickBoundaryPlan(manager, shouldStopAtTick, replayEndState) {
  if (!manager) return null;
  return resolveCoreReplayPayloadObjectCallOrFallback(
    manager,
    "callCoreReplayControlRuntime",
    "planReplayTickBoundary",
    {
      shouldStopAtTick: shouldStopAtTick,
      replayEndState: replayEndState
    },
    function () {
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
  );
}

function applyReplayTickBoundaryPlan(manager, tickBoundaryPlan) {
  if (!manager) return false;
  if (!(tickBoundaryPlan && tickBoundaryPlan.shouldStop === true)) return false;
  if (tickBoundaryPlan.shouldPause) {
    pauseReplay(manager);
  }
  if (tickBoundaryPlan.shouldApplyReplayMode) {
    manager.replayMode = tickBoundaryPlan.replayMode;
  }
  return true;
}

function resolveReplayResumeState(manager) {
  if (!manager) return {};
  var state = resolveCoreReplayPayloadObjectCallOrFallback(
    manager,
    "callCoreReplayTimerRuntime",
    "computeReplayResumeState",
    {
      replayDelay: manager.replayDelay
    },
    function () {
      return {
        isPaused: false,
        shouldClearInterval: true,
        delay: manager.replayDelay || 200
      };
    }
  );
  return manager.isNonArrayObject(state) ? state : {};
}

function applyReplayResumeState(manager, state) {
  if (!manager) return;
  var resumeState = normalizeReplayRecordObject(state, {});
  manager.isPaused = !!resumeState.isPaused;
  clearReplayIntervalOnResumeIfNeeded(manager, resumeState);
  manager.replayInterval = createReplayResumeInterval(manager, resumeState);
}

function clearReplayIntervalOnResumeIfNeeded(manager, resumeState) {
  if (!manager) return;
  if (resumeState.shouldClearInterval !== false) {
    clearInterval(manager.replayInterval);
  }
}

function createReplayResumeInterval(manager, resumeState) {
  if (!manager) return null;
  return setInterval(function () {
    runReplayTick(manager);
  }, resumeState.delay);
}

function resumeReplay(manager) {
  if (!manager) return;
  var state = resolveReplayResumeState(manager);
  applyReplayResumeState(manager, state);
}

function resolveReplaySpeedState(manager, multiplier) {
  if (!manager) return {};
  var state = resolveCoreReplayPayloadObjectCallOrFallback(
    manager,
    "callCoreReplayTimerRuntime",
    "computeReplaySpeedState",
    {
      multiplier: multiplier,
      isPaused: !!manager.isPaused,
      baseDelay: 200
    },
    function () {
      return {
        replayDelay: 200 / multiplier,
        shouldResume: !manager.isPaused
      };
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

function normalizeReplaySeekTarget(manager, targetIndex) {
  if (!manager) return 0;
  return resolveCoreReplayPayloadNormalizedCallOrFallback(
    manager,
    "callCoreReplayLifecycleRuntime",
    "normalizeReplaySeekTarget",
    {
      targetIndex: targetIndex,
      hasReplayMoves: !!manager.replayMoves,
      replayMovesLength: manager.replayMoves ? manager.replayMoves.length : 0
    },
    function (coreValue) {
      var resolved = Number(coreValue);
      return Number.isFinite(resolved) ? resolved : undefined;
    },
    function () {
      return normalizeReplaySeekTargetFallback(manager, targetIndex);
    }
  );
}

function normalizeReplaySeekTargetFallback(manager, targetIndex) {
  if (!manager) return 0;
  var nextTargetIndex = targetIndex;
  if (nextTargetIndex < 0) nextTargetIndex = 0;
  if (manager.replayMoves && nextTargetIndex > manager.replayMoves.length) {
    nextTargetIndex = manager.replayMoves.length;
  }
  return nextTargetIndex;
}

function resolveReplaySeekRestartPlan(manager, targetIndex) {
  if (!manager) return null;
  var rewindPlan = resolveReplaySeekRewindPlan(manager, targetIndex);
  var normalized = normalizeReplaySeekRewindPlan(manager, rewindPlan);
  return resolveCoreReplayPayloadObjectCallOrFallback(
    manager,
    "callCoreReplayFlowRuntime",
    "planReplaySeekRestart",
    buildReplaySeekRestartRuntimeInput(manager, normalized),
    function () {
      return buildReplaySeekRestartFallbackPlan(manager, normalized);
    }
  );
}

function resolveReplaySeekRewindPlan(manager, targetIndex) {
  if (!manager) return null;
  return resolveCoreReplayPayloadObjectCallOrFallback(
    manager,
    "callCoreReplayFlowRuntime",
    "planReplaySeekRewind",
    {
      targetIndex: targetIndex,
      replayIndex: manager.replayIndex,
      hasReplayStartBoard: !!manager.replayStartBoardMatrix
    },
    function () {
      if (!(targetIndex < manager.replayIndex)) {
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
  );
}

function normalizeReplaySeekRewindPlan(manager, rewindPlan) {
  if (!manager) return null;
  return manager.isNonArrayObject(rewindPlan) ? rewindPlan : null;
}

function buildReplaySeekRestartRuntimeInput(manager, normalizedRewindPlan) {
  if (!manager) return {};
  return {
    shouldRewind: !!(normalizedRewindPlan && normalizedRewindPlan.shouldRewind),
    strategy: normalizedRewindPlan ? normalizedRewindPlan.strategy : "none",
    replayIndexAfterRewind: normalizedRewindPlan ? normalizedRewindPlan.replayIndexAfterRewind : manager.replayIndex
  };
}

function buildReplaySeekRestartFallbackPlan(manager, normalizedRewindPlan) {
  if (!manager) return null;
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

function applyReplaySeekRestartPlan(manager, restartPlan) {
  if (!manager || !manager.isNonArrayObject(restartPlan)) return;
  if (restartPlan.shouldRestartWithBoard) {
    restartReplaySession(manager, manager.replayStartBoardMatrix, manager.modeConfig, true);
  }
  if (restartPlan.shouldRestartWithSeed) {
    restartReplaySession(manager, manager.initialSeed, manager.modeConfig, false);
  }
  if (restartPlan.shouldApplyReplayIndex) {
    manager.replayIndex = restartPlan.replayIndex;
  }
}

function prepareReplaySeek(manager, targetIndex) {
  if (!manager) return 0;
  var normalizedTargetIndex = normalizeReplaySeekTarget(manager, targetIndex);
  pauseReplay(manager);
  var restartPlan = resolveReplaySeekRestartPlan(manager, normalizedTargetIndex);
  applyReplaySeekRestartPlan(manager, restartPlan);
  return normalizedTargetIndex;
}

function runReplaySeekStepsToTarget(manager, targetIndex) {
  if (!manager) return;
  while (manager.replayIndex < targetIndex) {
    executePlannedReplayStep(manager);
  }
}

function seekReplay(manager, targetIndex) {
  if (!manager) return;
  var normalizedTargetIndex = prepareReplaySeek(manager, targetIndex);
  runReplaySeekStepsToTarget(manager, normalizedTargetIndex);
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

function buildInvalidatedTimerElementIdsFallback(manager, value) {
  if (!manager) return [];
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

function applyCustomTileSubTimerInvalidationFallback(manager, value) {
  if (!manager) return;
  if (!(manager.reached32k && !manager.isFibonacciMode())) return;
  if (8192 <= value && value !== 32768) {
    var subTimer8192El = resolveReplayElementById(manager, "timer8192-sub");
    if (subTimer8192El) subTimer8192El.textContent = "---------";
  }
  if (16384 <= value && value !== 32768) {
    var subTimer16384El = resolveReplayElementById(manager, "timer16384-sub");
    if (subTimer16384El) subTimer16384El.textContent = "---------";
  }
}

function applyCustomTileInvalidatedTimerPlaceholders(manager, value) {
  if (!manager) return;
  var invalidatedTimerElementIdsByCore = resolveCoreTimerIntervalNormalizedCallOrUndefined(
    manager,
    "resolveInvalidatedTimerElementIds",
    [{
      timerMilestones: manager.timerMilestones || manager.getTimerMilestoneValues(),
      timerSlotIds: GameManager.TIMER_SLOT_IDS,
      limit: value,
      reached32k: !!manager.reached32k,
      isFibonacciMode: manager.isFibonacciMode()
    }],
    function (coreValue) {
      return Array.isArray(coreValue) ? coreValue : [];
    }
  );
  if (typeof invalidatedTimerElementIdsByCore !== "undefined") {
    applyInvalidatedTimerPlaceholders(manager, invalidatedTimerElementIdsByCore);
    return;
  }

  var elementIds = buildInvalidatedTimerElementIdsFallback(manager, value);
  applyInvalidatedTimerPlaceholders(manager, elementIds);
  applyCustomTileSubTimerInvalidationFallback(manager, value);
}

function applyCustomTile32kEffects(manager, value) {
  if (!manager || value < 32768) return;
  manager.reached32k = true;
  applyCustomTile32kUiVisibility(manager);
  if (value === 32768) {
    stampCustomTile32kTimerValue(manager);
  }
}

function applyCustomTile32kUiVisibility(manager) {
  if (!manager) return;
  var subContainer = resolveReplayElementById(manager, "timer32k-sub-container");
  if (subContainer) subContainer.style.display = "block";
  var timerRow16 = resolveReplayElementById(manager, "timer-row-16");
  if (timerRow16) timerRow16.style.display = "none";
  var timerRow32 = resolveReplayElementById(manager, "timer-row-32");
  if (timerRow32) timerRow32.style.display = "none";
}

function stampCustomTile32kTimerValue(manager) {
  if (!manager) return;
  var timeStr = manager.pretty(manager.time);
  var timer32k = resolveReplayElementById(manager, "timer32768");
  if (timer32k && timer32k.textContent === "") {
    timer32k.textContent = timeStr;
  }
}

function assertCustomTileEditable(manager, x, y) {
  if (!manager) return;
  if (manager.isBlockedCell(x, y)) {
    throw "Blocked cell cannot be edited";
  }
}

function removeExistingTileAtCell(manager, cell) {
  if (!manager || !cell) return;
  var existingTile = manager.grid.cellContent(cell);
  if (existingTile) {
    manager.grid.removeTile(existingTile);
  }
}

function applyCustomTileZeroValue(manager, x, y, value) {
  if (!manager) return;
  recordPracticeReplayAction(manager, ["p", x, y, value]);
  clearTransientTileVisualState(manager);
  actuate(manager);
}

function applyCustomTileNonZeroValue(manager, x, y, value) {
  if (!manager) return;
  var tile = new Tile({ x: x, y: y }, value);
  manager.grid.insertTile(tile);
  applyCustomTileInvalidatedTimerPlaceholders(manager, value);
  applyCustomTile32kEffects(manager, value);
  clearTransientTileVisualState(manager);
  actuate(manager);
  recordPracticeReplayAction(manager, ["p", x, y, value]);
}

function insertCustomTile(manager, x, y, value) {
  if (!manager) return;
  assertCustomTileEditable(manager, x, y);
  var cell = { x: x, y: y };
  removeExistingTileAtCell(manager, cell);
  if (value === 0) {
    applyCustomTileZeroValue(manager, x, y, value);
    return;
  }
  applyCustomTileNonZeroValue(manager, x, y, value);
}

function getFinalBoardMatrix(manager) {
  if (!manager) return [];
  return resolveCoreGridScanNormalizedCallOrFallback(
    manager,
    "buildBoardMatrix",
    [
      manager.width,
      manager.height,
      function (x, y) {
        var tile = manager.grid.cellContent({ x: x, y: y });
        return tile ? tile.value : 0;
      }
    ],
    function (coreValue) {
      return Array.isArray(coreValue) ? coreValue : null;
    },
    function () {
      var rows = [];
      for (var y = 0; y < manager.height; y++) {
        var row = [];
        for (var x = 0; x < manager.width; x++) {
          var tile = manager.grid.cellContent({ x: x, y: y });
          row.push(tile ? tile.value : 0);
        }
        rows.push(row);
      }
      return rows;
    }
  );
}

function createReplayV3FallbackSnapshot(manager) {
  if (!manager) return { v: 3, actions: [] };
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

function resolveReplayV3Source(manager) {
  if (!manager) return { v: 3, actions: [] };
  return manager.sessionReplayV3 || createReplayV3FallbackSnapshot(manager);
}

function buildReplayV3Snapshot(manager, replay) {
  if (!manager) return { v: 3, actions: [] };
  var source = normalizeReplayRecordObject(replay, {});
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
  var replay = resolveReplayV3Source(manager);
  return buildReplayV3Snapshot(manager, replay);
}

function resolveAutoSubmitSkipReason(manager) {
  if (!manager) return "manager_missing";
  if (manager.replayMode) return "replay_mode";
  if (!isSessionTerminated(manager)) return "not_terminated";
  return null;
}

function writeAutoSubmitResult(manager, payload) {
  if (!manager) return;
  manager.writeLocalStorageJsonPayload("last_session_submit_result_v1", payload);
}

function writeAutoSubmitSkippedResult(manager, skippedReason) {
  if (!manager || !skippedReason) return;
  writeAutoSubmitResult(manager, {
    at: new Date().toISOString(),
    ok: false,
    skipped: true,
    reason: skippedReason
  });
}

function writeAutoSubmitMissingStoreResult(manager) {
  if (!manager) return;
  writeAutoSubmitResult(manager, {
    at: new Date().toISOString(),
    ok: false,
    reason: "local_history_store_missing"
  });
}

function resolveAdapterParitySnapshotForSubmit(manager) {
  if (!manager) return {};
  return {
    report: manager.getAdapterSessionParitySnapshot("readAdapterParityReport", "adapterParityReport"),
    diff: manager.getAdapterSessionParitySnapshot("readAdapterParityABDiff", "adapterParityABDiff")
  };
}

function resolveBestTileValueForSubmit(manager) {
  if (!manager) return null;
  return resolveCoreGridScanNormalizedCallOrFallback(
    manager,
    "getBestTileValue",
    [getFinalBoardMatrix(manager)],
    function (rawBestTileValue) {
      var bestValue = Number(rawBestTileValue);
      if (!Number.isFinite(bestValue) || bestValue < 0) return null;
      return bestValue;
    },
    function () {
      var best = 0;
      manager.grid.eachCell(function (_x, _y, tile) {
        if (tile && tile.value > best) best = tile.value;
      });
      return best;
    }
  );
}

function buildAutoSubmitPayload(manager, endedAt, parity, bestTileValue, windowLike) {
  if (!manager) return {};
  var paritySnapshot = normalizeReplayRecordObject(parity, {});
  return {
    mode: manager.getLegacyModeFromModeKey(manager.modeKey || manager.mode),
    mode_key: manager.modeKey,
    board_width: manager.width,
    board_height: manager.height,
    ruleset: manager.ruleset,
    undo_enabled: !!manager.modeConfig.undo_enabled,
    ranked_bucket: manager.rankedBucket,
    mode_family: manager.modeFamily,
    rank_policy: manager.rankPolicy,
    challenge_id: manager.challengeId || null,
    special_rules_snapshot: manager.clonePlain(manager.specialRules || {}),
    score: manager.score,
    best_tile: bestTileValue,
    duration_ms: getDurationMs(manager),
    final_board: getFinalBoardMatrix(manager),
    ended_at: endedAt,
    replay: serializeReplayV3(manager),
    replay_string: manager.serialize(),
    adapter_parity_report_v2: paritySnapshot.report,
    adapter_parity_ab_diff_v2: paritySnapshot.diff,
    adapter_parity_report_v1: paritySnapshot.report,
    adapter_parity_ab_diff_v1: paritySnapshot.diff,
    client_version: (windowLike && windowLike.GAME_CLIENT_VERSION) || "1.8",
    end_reason: manager.over ? "game_over" : "win_stop"
  };
}

function writeAutoSubmitSuccessResult(manager, endedAt, payload, savedRecord) {
  if (!manager) return;
  writeAutoSubmitResult(manager, {
    at: endedAt,
    ok: true,
    mode_key: payload.mode_key,
    score: payload.score,
    local_saved: true,
    record_id: savedRecord && savedRecord.id ? savedRecord.id : null
  });
}

function writeAutoSubmitErrorResult(manager, endedAt, payload, error) {
  if (!manager) return;
  writeAutoSubmitResult(manager, {
    at: endedAt,
    ok: false,
    mode_key: payload.mode_key,
    score: payload.score,
    error: error && error.message ? error.message : "local_save_failed"
  });
}

function tryAutoSubmitOnGameOver(manager) {
  if (!manager || manager.sessionSubmitDone) return;
  var skippedReason = resolveAutoSubmitSkipReason(manager);
  if (skippedReason) {
    writeAutoSubmitSkippedResult(manager, skippedReason);
    return;
  }
  var localHistorySaveRecord = manager.resolveWindowNamespaceMethod("LocalHistoryStore", "saveRecord");
  if (!localHistorySaveRecord) {
    writeAutoSubmitMissingStoreResult(manager);
    return;
  }
  manager.sessionSubmitDone = true;
  var endedAt = new Date().toISOString();
  var windowLike = manager.getWindowLike();
  var parity = resolveAdapterParitySnapshotForSubmit(manager);
  var bestTileValue = resolveBestTileValueForSubmit(manager);
  var payload = buildAutoSubmitPayload(manager, endedAt, parity, bestTileValue, windowLike);
  try {
    var savedRecord = localHistorySaveRecord.method.call(localHistorySaveRecord.scope, payload);
    writeAutoSubmitSuccessResult(manager, endedAt, payload, savedRecord);
  } catch (error) {
    writeAutoSubmitErrorResult(manager, endedAt, payload, error);
  }
}

function isSessionTerminated(manager) {
  if (!manager) return false;
  return !!(manager.over || (manager.won && !manager.keepPlaying));
}

function shouldSerializeReplayAsJson(manager) {
  if (!manager) return true;
  return manager.width !== 4 || manager.height !== 4 || manager.isFibonacciMode();
}

function serializeReplayAsV4(manager) {
  if (!manager) return "{}";
  var modeCode = GameManager.REPLAY_V4_MODE_KEY_TO_CODE[manager.modeKey] || "C";
  var initialBoard = manager.initialBoardMatrix || getFinalBoardMatrix(manager);
  var encodedBoard = encodeBoardV4(manager, initialBoard);
  return GameManager.REPLAY_V4_PREFIX + modeCode + encodedBoard + (manager.replayCompactLog || "");
}

function serializeReplay(manager) {
  if (!manager) return "{}";
  if (shouldSerializeReplayAsJson(manager)) {
    return JSON.stringify(serializeReplayV3(manager));
  }
  return serializeReplayAsV4(manager);
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

function normalizeReplayOptionalString(raw) {
  return typeof raw === "string" && raw ? raw : null;
}

function parseJsonReplayImportEnvelopeFallback(manager, trimmed) {
  if (!manager || typeof trimmed !== "string" || trimmed.charAt(0) !== "{") return null;
  var replayObj = JSON.parse(trimmed);
  if (!replayObj) return null;
  if (replayObj.v !== 3) throw "Unsupported JSON replay version";
  var actions = replayObj.actions;
  if (!Array.isArray(actions)) throw "Invalid v3 actions";
  var specialRulesSnapshot =
    isReplayRecordObject(replayObj.special_rules_snapshot)
      ? replayObj.special_rules_snapshot
      : null;
  var modeFamily = normalizeReplayOptionalString(replayObj.mode_family);
  var rankPolicy = normalizeReplayOptionalString(replayObj.rank_policy);
  var challengeId = normalizeReplayOptionalString(replayObj.challenge_id);
  var modeKey =
    normalizeReplayOptionalString(replayObj.mode_key) ||
    normalizeReplayOptionalString(replayObj.mode) ||
    manager.modeKey ||
    manager.mode;
  return {
    kind: "json-v3",
    modeKey: modeKey,
    actions: actions,
    seed: replayObj.seed,
    specialRulesSnapshot: specialRulesSnapshot,
    modeFamily: modeFamily,
    rankPolicy: rankPolicy,
    challengeId: challengeId
  };
}

function parseV4ReplayImportEnvelopeFallback(trimmed) {
  if (typeof trimmed !== "string" || trimmed.indexOf(GameManager.REPLAY_V4_PREFIX) !== 0) return null;
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

function parseReplayImportEnvelope(manager, trimmed) {
  if (!manager) return null;
  return resolveCoreReplayPayloadNormalizedCallOrFallbackAllowNull(
    manager,
    "callCoreReplayImportRuntime",
    "parseReplayImportEnvelope",
    {
      trimmedReplayString: trimmed,
      fallbackModeKey: manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY,
      v4Prefix: GameManager.REPLAY_V4_PREFIX
    },
    function (coreValue) {
      if (coreValue === null) return null;
      return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      var jsonEnvelope = parseJsonReplayImportEnvelopeFallback(manager, trimmed);
      if (jsonEnvelope) return jsonEnvelope;
      return parseV4ReplayImportEnvelopeFallback(trimmed);
    }
  );
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

function decodeReplayV4PracticeActionFromPayload(manager, actionsEncoded, payloadIndex) {
  if (payloadIndex + 1 >= actionsEncoded.length) throw "Invalid v4C practice action";
  var cell = manager.decodeReplay128(actionsEncoded.charAt(payloadIndex));
  var exp = manager.decodeReplay128(actionsEncoded.charAt(payloadIndex + 1));
  if (cell < 0 || cell > 15) throw "Invalid v4C practice cell";
  return {
    action: ["p", (cell >> 2) & 3, cell & 3, exp === 0 ? 0 : Math.pow(2, exp)],
    spawn: null,
    nextIndex: payloadIndex + 2
  };
}

function decodeReplayV4EscapedAction(manager, actionsEncoded, escapedIndex) {
  if (escapedIndex >= actionsEncoded.length) throw "Invalid v4C escape";
  var subtype = manager.decodeReplay128(actionsEncoded.charAt(escapedIndex));
  if (subtype === 0) {
    var decoded127 = decodeReplayV4MoveSpawnFromToken(127);
    return {
      action: decoded127.action,
      spawn: decoded127.spawn,
      nextIndex: escapedIndex + 1
    };
  }
  if (subtype === 1) {
    return {
      action: -1,
      spawn: null,
      nextIndex: escapedIndex + 1
    };
  }
  if (subtype === 2) {
    var payloadIndex = escapedIndex + 1;
    return decodeReplayV4PracticeActionFromPayload(manager, actionsEncoded, payloadIndex);
  }
  throw "Unknown v4C escape subtype";
}

function decodeReplayV4ActionsFallback(manager, actionsEncoded) {
  var replayMoves = [];
  var replaySpawns = [];
  var i = 0;
  while (i < actionsEncoded.length) {
    var token = manager.decodeReplay128(actionsEncoded.charAt(i));
    if (token < 127) {
      var decodedToken = decodeReplayV4MoveSpawnFromToken(token);
      replayMoves.push(decodedToken.action);
      replaySpawns.push(decodedToken.spawn);
      i += 1;
      continue;
    }
    var escaped = decodeReplayV4EscapedAction(manager, actionsEncoded, i + 1);
    replayMoves.push(escaped.action);
    replaySpawns.push(escaped.spawn);
    i = escaped.nextIndex;
  }
  return {
    replayMoves: replayMoves,
    replaySpawns: replaySpawns
  };
}

function decodeReplayV4Actions(manager, actionsEncoded) {
  if (!manager) return null;
  return resolveCoreReplayArgsObjectCallOrFallback(
    manager,
    "callCoreReplayV4ActionsRuntime",
    "decodeReplayV4Actions",
    [actionsEncoded],
    function () {
      return decodeReplayV4ActionsFallback(manager, actionsEncoded);
    }
  );
}

function applyImportedUndoPolicyState(manager) {
  if (!manager) return;
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

function finalizeReplayImportPlayback(manager) {
  if (!manager) return;
  manager.replayIndex = 0;
  manager.replayDelay = 200;
  resumeReplay(manager);
}

function normalizeStructuredReplayEnvelope(parsedEnvelope) {
  return normalizeReplayRecordObject(parsedEnvelope, null);
}

function resolveStructuredReplayImportEnvelope(manager, parsedEnvelope, replayModeConfig) {
  if (!manager || !replayModeConfig) return null;
  return normalizeStructuredReplayEnvelope(parsedEnvelope);
}

function applyReplayModeConfigOverridesFromJsonEnvelope(manager, parsedEnvelope, replayModeConfig) {
  var envelope = resolveStructuredReplayImportEnvelope(manager, parsedEnvelope, replayModeConfig);
  if (!envelope) return;
  var specialRulesSource = normalizeReplayRecordObject(envelope.specialRulesSnapshot, null);
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

function applyReplayChallengeIdFromEnvelope(manager, parsedEnvelope) {
  var envelope = normalizeStructuredReplayEnvelope(parsedEnvelope);
  if (!manager || !envelope) return;
  if (typeof envelope.challengeId === "string" && envelope.challengeId) {
    manager.challengeId = envelope.challengeId;
  }
}

function applyJsonReplayImportActions(manager, parsedEnvelope) {
  var envelope = normalizeStructuredReplayEnvelope(parsedEnvelope);
  if (!manager || !envelope) return;
  applyReplayImportActions(manager, {
    replayMoves: envelope.actions,
    replaySpawns: null
  });
}

function startJsonReplayImportSession(manager, parsedEnvelope, replayModeConfig) {
  var envelope = resolveStructuredReplayImportEnvelope(manager, parsedEnvelope, replayModeConfig);
  if (!envelope) return;
  manager.disableSessionSync = true;
  restartReplaySession(manager, envelope.seed, replayModeConfig, false);
}

function applyJsonStructuredReplayImport(manager, parsedEnvelope, replayModeConfig) {
  var envelope = resolveStructuredReplayImportEnvelope(manager, parsedEnvelope, replayModeConfig);
  if (!envelope) return;
  applyReplayModeConfigOverridesFromJsonEnvelope(manager, envelope, replayModeConfig);
  applyReplayChallengeIdFromEnvelope(manager, envelope);
  applyJsonReplayImportActions(manager, envelope);
  startJsonReplayImportSession(manager, envelope, replayModeConfig);
}

function decodeV4StructuredReplayImportPayload(manager, parsedEnvelope) {
  var envelope = normalizeStructuredReplayEnvelope(parsedEnvelope);
  if (!manager || !envelope) return null;
  var initialBoard = decodeBoardV4(manager, envelope.initialBoardEncoded);
  var decodedV4Actions = decodeReplayV4Actions(manager, envelope.actionsEncoded);
  return {
    initialBoard: initialBoard,
    replayMoves: decodedV4Actions ? decodedV4Actions.replayMoves : null,
    replaySpawns: Array.isArray(decodedV4Actions && decodedV4Actions.replaySpawns)
      ? decodedV4Actions.replaySpawns
      : []
  };
}

function applyV4ReplayImportActions(manager, decodedPayload) {
  if (!manager || !decodedPayload) return;
  applyReplayImportActions(manager, {
    replayMoves: decodedPayload.replayMoves,
    replaySpawns: decodedPayload.replaySpawns
  });
}

function startV4ReplayImportSession(manager, decodedPayload, replayModeConfig) {
  if (!manager || !decodedPayload || !replayModeConfig) return;
  manager.disableSessionSync = true;
  restartReplaySession(manager, decodedPayload.initialBoard, replayModeConfig, true);
}

function applyV4StructuredReplayImport(manager, parsedEnvelope, replayModeConfig) {
  var envelope = resolveStructuredReplayImportEnvelope(manager, parsedEnvelope, replayModeConfig);
  if (!envelope) return;
  var decodedPayload = decodeV4StructuredReplayImportPayload(manager, envelope);
  applyV4ReplayImportActions(manager, decodedPayload);
  startV4ReplayImportSession(manager, decodedPayload, replayModeConfig);
}

function isStructuredReplayEnvelope(parsedEnvelope) {
  var envelope = normalizeStructuredReplayEnvelope(parsedEnvelope);
  if (!envelope) return false;
  return envelope.kind === "json-v3" || envelope.kind === "v4c";
}

function applyStructuredReplayImportByKind(manager, parsedEnvelope, replayModeConfig) {
  var envelope = resolveStructuredReplayImportEnvelope(manager, parsedEnvelope, replayModeConfig);
  if (!envelope) return;
  if (envelope.kind === "json-v3") {
    applyJsonStructuredReplayImport(manager, envelope, replayModeConfig);
    return;
  }
  applyV4StructuredReplayImport(manager, envelope, replayModeConfig);
}

function finalizeStructuredReplayImport(manager) {
  if (!manager) return;
  applyImportedUndoPolicyState(manager);
  finalizeReplayImportPlayback(manager);
}

function applyStructuredReplayImport(manager, parsedEnvelope) {
  var envelope = normalizeStructuredReplayEnvelope(parsedEnvelope);
  if (!manager || !envelope) return false;
  if (!isStructuredReplayEnvelope(envelope)) return false;
  var replayModeConfig = manager.resolveModeConfig(envelope.modeKey);
  applyStructuredReplayImportByKind(manager, envelope, replayModeConfig);
  finalizeStructuredReplayImport(manager);
  return true;
}

function decodeLegacyReplayV2LogFallback(logString) {
  var replayMoves = [];
  var replaySpawns = [];
  for (var i = 0; i < logString.length; i++) {
    var code = logString.charCodeAt(i) - 33;
    if (code < 0 || code > 128) {
      throw "Invalid replay char at index " + i;
    }
    var entry;
    if (code === 128) {
      entry = {
        move: -1,
        spawn: null
      };
    } else {
      var dir = (code >> 5) & 3;
      var is4 = (code >> 4) & 1;
      var posIdx = code & 15;
      entry = {
        move: dir,
        spawn: {
          x: posIdx % 4,
          y: Math.floor(posIdx / 4),
          value: is4 ? 4 : 2
        }
      };
    }
    replayMoves.push(entry.move);
    replaySpawns.push(entry.spawn);
  }
  return {
    replayMoves: replayMoves,
    replaySpawns: replaySpawns
  };
}

function parseLegacyReplayV1Envelope(trimmed) {
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

function parseLegacyReplayV2SEnvelope(trimmed) {
  if (trimmed.indexOf(GameManager.LEGACY_REPLAY_V2S_PREFIX) !== 0) return null;
  var rest = trimmed.substring(GameManager.LEGACY_REPLAY_V2S_PREFIX.length);
  var seedSep = rest.indexOf("_");
  if (seedSep < 0) throw "Invalid v2S format";
  var seedS = parseFloat(rest.substring(0, seedSep));
  if (isNaN(seedS)) throw "Invalid v2S seed";
  var logStringS = rest.substring(seedSep + 1);
  var decodedLogS = decodeLegacyReplayV2LogFallback(logStringS);
  return {
    seed: seedS,
    replayMovesV2: logStringS,
    replayMoves: decodedLogS.replayMoves,
    replaySpawns: decodedLogS.replaySpawns
  };
}

function parseLegacyReplayV2Envelope(trimmed) {
  if (trimmed.indexOf(GameManager.LEGACY_REPLAY_V2_PREFIX) !== 0) return null;
  var logString = trimmed.substring(GameManager.LEGACY_REPLAY_V2_PREFIX.length);
  var decodedLog = decodeLegacyReplayV2LogFallback(logString);
  return {
    seed: 0.123,
    replayMovesV2: logString,
    replayMoves: decodedLog.replayMoves,
    replaySpawns: decodedLog.replaySpawns
  };
}

function decodeLegacyReplayFallback(manager, trimmed) {
  if (!manager) return null;
  var v1Envelope = parseLegacyReplayV1Envelope(trimmed);
  if (v1Envelope) return v1Envelope;
  var v2sEnvelope = parseLegacyReplayV2SEnvelope(trimmed);
  if (v2sEnvelope) return v2sEnvelope;
  return parseLegacyReplayV2Envelope(trimmed);
}

function decodeLegacyReplay(manager, trimmed) {
  if (!manager) return null;
  return resolveCoreReplayArgsNormalizedCallOrFallback(
    manager,
    "callCoreReplayLegacyRuntime",
    "decodeLegacyReplay",
    [trimmed],
    function (coreValue) {
      return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      return decodeLegacyReplayFallback(manager, trimmed);
    }
  );
}

function applyLegacyReplayImportActions(manager, decodedLegacy) {
  if (!manager || !decodedLegacy) return;
  applyReplayImportActions(manager, {
    replayMovesV2: decodedLegacy.replayMovesV2,
    replayMoves: decodedLegacy.replayMoves,
    replaySpawns: decodedLegacy.replaySpawns
  });
}

function startLegacyReplayImportSession(manager, decodedLegacy) {
  if (!manager || !decodedLegacy) return;
  restartWithSeed(manager, decodedLegacy.seed);
}

function applyLegacyReplayImport(manager, decodedLegacy) {
  if (!manager || !decodedLegacy) return false;
  applyLegacyReplayImportActions(manager, decodedLegacy);
  startLegacyReplayImportSession(manager, decodedLegacy);
  finalizeReplayImportPlayback(manager);
  return true;
}

function normalizeReplayImportString(replayString) {
  return (typeof replayString === "string" ? replayString : JSON.stringify(replayString)).trim();
}

function tryApplyStructuredReplayImport(manager, trimmed) {
  if (!manager) return false;
  var parsedEnvelope = parseReplayImportEnvelope(manager, trimmed);
  return applyStructuredReplayImport(manager, parsedEnvelope);
}

function tryApplyLegacyReplayImport(manager, trimmed) {
  if (!manager) return false;
  var decodedLegacy = decodeLegacyReplay(manager, trimmed);
  return applyLegacyReplayImport(manager, decodedLegacy);
}

function tryApplyAnyReplayImportFormat(manager, trimmed) {
  if (!manager) return false;
  if (tryApplyStructuredReplayImport(manager, trimmed)) return true;
  return tryApplyLegacyReplayImport(manager, trimmed);
}

function resolveReplayImportErrorMessage(error) {
  if (typeof error === "string" && error) return error;
  if (error && typeof error.message === "string" && error.message) return error.message;
  return String(error);
}

function notifyReplayImportError(error) {
  alert("导入回放出错: " + resolveReplayImportErrorMessage(error));
}

function importReplay(manager, replayString) {
  if (!manager) return false;
  try {
    var trimmed = normalizeReplayImportString(replayString);
    if (tryApplyAnyReplayImportFormat(manager, trimmed)) return true;
    throw "Unknown replay version";
  } catch (e) {
    notifyReplayImportError(e);
    return false;
  }
}

function resolveReplayStepLifecyclePlan(manager, action, spawnAtIndex) {
  if (!manager) return null;
  return resolveCoreReplayPayloadObjectCallOrFallback(
    manager,
    "callCoreReplayLifecycleRuntime",
    "planReplayStep",
    {
      action: action,
      hasReplaySpawns: !!manager.replaySpawns,
      spawnAtIndex: spawnAtIndex
    },
    function () {
      var shouldInjectForcedSpawn = !!manager.replaySpawns && !Array.isArray(action);
      return {
        shouldInjectForcedSpawn: shouldInjectForcedSpawn,
        forcedSpawn: shouldInjectForcedSpawn ? spawnAtIndex : undefined
      };
    }
  );
}

function buildReplayStepExecutionFallbackPlan(manager) {
  if (!manager) return null;
  var action = manager.replayMoves[manager.replayIndex];
  var spawnAtIndex = manager.replaySpawns ? manager.replaySpawns[manager.replayIndex] : undefined;
  var stepPlan = resolveReplayStepLifecyclePlan(manager, action, spawnAtIndex);
  return {
    action: action,
    shouldInjectForcedSpawn: !!stepPlan.shouldInjectForcedSpawn,
    forcedSpawn: stepPlan.forcedSpawn,
    nextReplayIndex: manager.replayIndex + 1
  };
}

function resolveReplayStepExecutionPlan(manager) {
  if (!manager) return null;
  return resolveCoreReplayPayloadObjectCallOrFallback(
    manager,
    "callCoreReplayLoopRuntime",
    "planReplayStepExecution",
    {
      replayMoves: manager.replayMoves,
      replaySpawns: manager.replaySpawns,
      replayIndex: manager.replayIndex
    },
    function () {
      return buildReplayStepExecutionFallbackPlan(manager);
    }
  );
}

function applyReplayStepForcedSpawn(manager, stepExecutionPlan) {
  if (!manager || !stepExecutionPlan) return;
  if (stepExecutionPlan.shouldInjectForcedSpawn) {
    manager.forcedSpawn = stepExecutionPlan.forcedSpawn;
  }
}

function resolveReplayExecutionAction(manager, action) {
  if (!manager) return null;
  return resolveCoreReplayPayloadNormalizedCallOrFallback(
    manager,
    "callCoreReplayExecutionRuntime",
    "resolveReplayExecution",
    action,
    function (coreValue) {
      return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      var kind = getActionKind(manager, action);
      if (kind === "m") {
        return {
          kind: "m",
          dir: Array.isArray(action) ? action[1] : action
        };
      }
      if (kind === "u") return { kind: "u" };
      if (kind === "p") {
        return {
          kind: "p",
          x: action[1],
          y: action[2],
          value: action[3]
        };
      }
      throw "Unknown replay action";
    }
  );
}

function resolveReplayDispatchPlan(manager, resolved) {
  if (!manager) return null;
  return resolveCoreReplayPayloadObjectCallOrFallback(
    manager,
    "callCoreReplayDispatchRuntime",
    "planReplayDispatch",
    resolved,
    function () {
      if (resolved.kind === "m") return { method: "move", args: [resolved.dir] };
      if (resolved.kind === "u") return { method: "move", args: [-1] };
      if (resolved.kind === "p") {
        return {
          method: "insertCustomTile",
          args: [resolved.x, resolved.y, resolved.value]
        };
      }
      throw "Unknown replay action";
    }
  );
}

function executeReplayDispatchPlan(manager, dispatchPlan) {
  if (!manager) return;
  var dispatchMethod = dispatchPlan && dispatchPlan.method;
  var args = dispatchPlan && Array.isArray(dispatchPlan.args) ? dispatchPlan.args : [];
  if (dispatchMethod === "move") {
    manager.move(args[0]);
  } else if (dispatchMethod === "insertCustomTile") {
    manager.insertCustomTile(args[0], args[1], args[2]);
  } else {
    throw "Unknown replay action";
  }
}

function commitReplayStepExecution(manager, stepExecutionPlan) {
  if (!manager || !stepExecutionPlan) return;
  manager.replayIndex = stepExecutionPlan.nextReplayIndex;
}

function executePlannedReplayStep(manager) {
  if (!manager) return;
  var stepExecutionPlan = resolveReplayStepExecutionPlan(manager);
  applyReplayStepForcedSpawn(manager, stepExecutionPlan);
  var action = stepExecutionPlan.action;
  var resolved = resolveReplayExecutionAction(manager, action);
  var dispatchPlan = resolveReplayDispatchPlan(manager, resolved);
  executeReplayDispatchPlan(manager, dispatchPlan);
  commitReplayStepExecution(manager, stepExecutionPlan);
}

function ensureSpawnValueCounts(manager) {
  if (!manager) return;
  if (!manager.spawnValueCounts) manager.spawnValueCounts = {};
}

function recordSpawnValue(manager, value) {
  if (!manager) return;
  if (tryHandleCoreRulesRawValue(manager, "applySpawnValueCount", [manager.spawnValueCounts, value], function (coreValue) {
    var next = coreValue || {};
    if (isReplayRecordObject(next.nextSpawnValueCounts)) {
      manager.spawnValueCounts = next.nextSpawnValueCounts;
    } else {
      ensureSpawnValueCounts(manager);
    }
    manager.spawnTwos = Number(next.spawnTwos) || 0;
    manager.spawnFours = Number(next.spawnFours) || 0;
  })) {
    refreshSpawnRateDisplay(manager);
    return;
  }
  ensureSpawnValueCounts(manager);
  var key = String(value);
  manager.spawnValueCounts[key] = (manager.spawnValueCounts[key] || 0) + 1;
  // Keep legacy fields for compatibility with existing UI hooks.
  manager.spawnTwos = manager.spawnValueCounts["2"] || 0;
  manager.spawnFours = manager.spawnValueCounts["4"] || 0;
  refreshSpawnRateDisplay(manager);
}

function recordPracticeReplayAction(manager, action) {
  if (!manager) return;
  if (manager.replayMode || !manager.sessionReplayV3 || manager.modeKey !== "practice_legacy") return;
  manager.sessionReplayV3.actions.push(action);
  if (Array.isArray(action) && action[0] === "p") {
    appendCompactPracticeAction(manager, action[1], action[2], action[3]);
  }
}

function refreshSpawnRateDisplay(manager) {
  if (!manager) return;
  // Top-left rate: current observed secondary spawn rate.
  // pow2 => 出4率, fibonacci => 出2率
  var text = manager.getActualSecondaryRate();
  var rateEl = resolveReplayElementById(manager, "stats-4-rate");
  if (rateEl) rateEl.textContent = text;
  if (manager.cornerRateEl) manager.cornerRateEl.textContent = text;
}

function resolveReplayDocumentLike(manager) {
  return resolveManagerDocumentLike(manager);
}

function resolveReplayElementById(manager, elementId) {
  return resolveManagerElementById(manager, elementId);
}

function detectMode(manager) {
  if (!manager) return GameManager.DEFAULT_MODE_KEY;
  var bodyMode = "";
  var documentLike = resolveReplayDocumentLike(manager);
  if (documentLike && documentLike.body) {
    bodyMode = documentLike.body.getAttribute("data-mode-id") || "";
  }
  var pathname = resolveWindowPathname(manager);
  return resolveCoreModeStringCallOrFallback(
    manager,
    "resolveDetectedMode",
    manager.createCoreModeDefaultsPayload({
      existingMode: manager.mode,
      bodyMode: bodyMode,
      pathname: pathname
    }),
    function () {
      if (manager.mode) return manager.mode;
      var fallbackDocumentLike = resolveReplayDocumentLike(manager);
      if (fallbackDocumentLike && fallbackDocumentLike.body) {
        bodyMode = fallbackDocumentLike.body.getAttribute("data-mode-id") || "";
        if (bodyMode) return bodyMode;
      }
      var fallbackPathname = resolveWindowPathname(manager);
      if (!fallbackPathname) return GameManager.DEFAULT_MODE_KEY;
      if (fallbackPathname.indexOf("undo_2048") !== -1) return "classic_4x4_pow2_undo";
      if (fallbackPathname.indexOf("Practice_board") !== -1) return "practice_legacy";
      if (fallbackPathname.indexOf("capped_2048") !== -1) return "capped_4x4_pow2_no_undo";
      if (
        fallbackPathname === "/" ||
        /\/$/.test(fallbackPathname) ||
        fallbackPathname.indexOf("/index.html") !== -1 ||
        fallbackPathname.indexOf("index.html") !== -1
      ) {
        return "standard_4x4_pow2_no_undo";
      }
      return "classic_4x4_pow2_undo";
    }
  );
}

function encodeReplay128(manager, code) {
  if (!manager) throw "Invalid replay code";
  return resolveCoreReplayArgsStringCallOrFallback(
    manager,
    "callCoreReplayCodecRuntime",
    "encodeReplay128",
    [code],
    function () {
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
  );
}

function decodeReplay128(manager, char) {
  if (!manager) throw "Invalid replay char";
  return resolveCoreReplayArgsNormalizedCallOrFallback(
    manager,
    "callCoreReplayCodecRuntime",
    "decodeReplay128",
    [char],
    function (coreValue) {
      var token = Number(coreValue);
      return Number.isInteger(token) && token >= 0 && token < GameManager.REPLAY128_TOTAL
        ? token
        : undefined;
    },
    function () {
      if (!char || char.length !== 1) throw "Invalid replay char";
      var code = char.charCodeAt(0);
      if (
        code >= GameManager.REPLAY128_ASCII_START &&
        code < GameManager.REPLAY128_ASCII_START + GameManager.REPLAY128_ASCII_COUNT
      ) {
        return code - GameManager.REPLAY128_ASCII_START;
      }
      var extraIndex = GameManager.REPLAY128_EXTRA_CODES.indexOf(code);
      if (extraIndex >= 0) return GameManager.REPLAY128_ASCII_COUNT + extraIndex;
      throw "Invalid replay char";
    }
  );
}

function appendCompactMoveCode(manager, rawCode) {
  if (!manager) return;
  if (tryHandleCoreReplayCodecRawValue(manager, "appendCompactMoveCode", [{
    log: manager.replayCompactLog,
    rawCode: rawCode
  }], function (coreValue) {
    manager.replayCompactLog = coreValue;
  })) {
    return;
  }
  if (!Number.isInteger(rawCode) || rawCode < 0 || rawCode > 127) throw "Invalid move code";
  if (rawCode < 127) {
    manager.replayCompactLog += manager.encodeReplay128(rawCode);
    return;
  }
  manager.replayCompactLog += manager.encodeReplay128(127) + manager.encodeReplay128(0);
}

function appendCompactUndo(manager) {
  if (!manager) return;
  if (tryHandleCoreReplayCodecRawValue(manager, "appendCompactUndo", [manager.replayCompactLog], function (coreValue) {
    manager.replayCompactLog = coreValue;
  })) {
    return;
  }
  manager.replayCompactLog += manager.encodeReplay128(127) + manager.encodeReplay128(1);
}

function appendCompactPracticeAction(manager, x, y, value) {
  if (!manager) return;
  if (tryHandleCoreReplayCodecRawValue(manager, "appendCompactPracticeAction", [{
    log: manager.replayCompactLog,
    width: manager.width,
    height: manager.height,
    x: x,
    y: y,
    value: value
  }], function (coreValue) {
    manager.replayCompactLog = coreValue;
  })) {
    return;
  }
  if (manager.width !== 4 || manager.height !== 4) throw "Compact practice replay only supports 4x4";
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 3 || y < 0 || y > 3) {
    throw "Invalid practice coords";
  }
  if (!Number.isInteger(value) || value < 0) throw "Invalid practice value";
  var exp = 0;
  if (value !== 0) {
    var lg = Math.log(value) / Math.log(2);
    if (Math.floor(lg) !== lg) throw "Practice value must be power of two";
    if (lg < 0 || lg > 127) throw "Practice value exponent too large";
    exp = lg;
  }
  var cell = (x << 2) | y;
  manager.replayCompactLog += manager.encodeReplay128(127) + manager.encodeReplay128(2);
  manager.replayCompactLog += manager.encodeReplay128(cell) + manager.encodeReplay128(exp);
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

function resolveCompactMoveCodeFromLastSpawn(manager, direction) {
  if (!manager) return null;
  if (
    !manager.lastSpawn ||
    manager.width !== 4 ||
    manager.height !== 4 ||
    manager.isFibonacciMode() ||
    (manager.lastSpawn.value !== 2 && manager.lastSpawn.value !== 4)
  ) {
    return null;
  }
  var valBit = manager.lastSpawn.value === 4 ? 1 : 0;
  var posIdx = manager.lastSpawn.x + manager.lastSpawn.y * 4;
  return (direction << 5) | (valBit << 4) | posIdx;
}

function buildPostMoveRecordFallback(manager, direction) {
  if (!manager) return null;
  if (manager.replayMode) {
    return createReplayModePostMoveRecord();
  }
  var compactMoveCode = resolveCompactMoveCodeFromLastSpawn(manager, direction);
  var shouldPushSessionAction = !!manager.sessionReplayV3;
  return {
    shouldRecordMoveHistory: true,
    compactMoveCode: compactMoveCode,
    shouldPushSessionAction: shouldPushSessionAction,
    sessionAction: shouldPushSessionAction ? ["m", direction] : null,
    shouldResetLastSpawn: true
  };
}

function computePostMoveRecord(manager, direction) {
  if (!manager) return null;
  return resolveCorePostMoveRecordObjectCallOrFallback(
    manager,
    "computePostMoveRecord",
    {
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
    },
    function () {
      return buildPostMoveRecordFallback(manager, direction);
    }
  );
}

function createReplayModePostUndoRecord() {
  return {
    shouldRecordMoveHistory: false,
    shouldAppendCompactUndo: false,
    shouldPushSessionAction: false,
    sessionAction: null
  };
}

function buildPostUndoRecordFallback(manager) {
  if (!manager) return null;
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
  return resolveCorePostUndoRecordObjectCallOrFallback(
    manager,
    "computePostUndoRecord",
    {
      replayMode: !!manager.replayMode,
      direction: direction,
      hasSessionReplayV3: !!manager.sessionReplayV3
    },
    function () {
      return buildPostUndoRecordFallback(manager);
    }
  );
}

function encodeBoardV4(manager, board) {
  if (!manager) throw "Invalid initial board";
  return resolveCoreReplayArgsStringCallOrFallback(
    manager,
    "callCoreReplayCodecRuntime",
    "encodeBoardV4",
    [board],
    function () {
      if (!Array.isArray(board) || board.length !== 4) throw "Invalid initial board";
      var out = "";
      for (var y = 0; y < 4; y++) {
        if (!Array.isArray(board[y]) || board[y].length !== 4) throw "Invalid initial board row";
        for (var x = 0; x < 4; x++) {
          var value = board[y][x];
          if (!Number.isInteger(value) || value < 0) throw "Invalid board tile value";
          var exp = 0;
          if (value > 0) {
            var lg = Math.log(value) / Math.log(2);
            if (Math.floor(lg) !== lg) throw "Board tile is not power of two";
            exp = lg;
          }
          if (exp < 0 || exp >= GameManager.REPLAY128_TOTAL) throw "Board tile exponent too large";
          out += manager.encodeReplay128(exp);
        }
      }
      return out;
    }
  );
}

function decodeBoardV4(manager, encoded) {
  if (!manager) throw "Invalid encoded board";
  return resolveCoreReplayArgsNormalizedCallOrFallback(
    manager,
    "callCoreReplayCodecRuntime",
    "decodeBoardV4",
    [encoded],
    function (coreValue) {
      return Array.isArray(coreValue) ? coreValue : undefined;
    },
    function () {
      if (typeof encoded !== "string" || encoded.length !== 16) throw "Invalid encoded board";
      var rows = [];
      var idx = 0;
      for (var y = 0; y < 4; y++) {
        var row = [];
        for (var x = 0; x < 4; x++) {
          var exp = manager.decodeReplay128(encoded.charAt(idx++));
          row.push(exp === 0 ? 0 : Math.pow(2, exp));
        }
        rows.push(row);
      }
      return rows;
    }
  );
}

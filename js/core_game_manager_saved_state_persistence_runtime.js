function createSavedStateDiagnosticsIndexEntryOptions() {
  return {
    failureOnly: false,
    includeWhenNoActivity: false,
    maxDedupeKeys: 3,
  };
}

function resolveSavedStateSecondaryPlacementDiagnosticsEntry(manager) {
  if (!manager) return null;
  var options = createSavedStateDiagnosticsIndexEntryOptions();
  if (
    typeof manager.resolveSecondaryTimerPlacementDiagnosticsIndexEntry ===
    "function"
  ) {
    return manager.resolveSecondaryTimerPlacementDiagnosticsIndexEntry(options);
  }
  if (
    typeof resolveSecondaryTimerPlacementDiagnosticsIndexEntry === "function"
  ) {
    return resolveSecondaryTimerPlacementDiagnosticsIndexEntry(
      manager,
      options,
    );
  }
  return null;
}
function isSavedStateDiagnosticsIndexEntry(value) {
  if (!isNonArrayObject(value)) return false;
  if (!(typeof value.key === "string" && value.key)) return false;
  if (
    !Number.isInteger(Number(value.schemaVersion)) ||
    Number(value.schemaVersion) < 1
  )
    return false;
  if (!isNonArrayObject(value.payload)) return false;
  return true;
}

function normalizeSavedStateDiagnosticsIndexEntries(entries) {
  var list = Array.isArray(entries) ? entries : [];
  var normalized = [];
  for (var i = 0; i < list.length; i++) {
    var entry = list[i];
    if (!isSavedStateDiagnosticsIndexEntry(entry)) continue;
    normalized.push({
      key: String(entry.key),
      schemaVersion: Number(entry.schemaVersion),
      payload: entry.payload,
    });
  }
  return normalized;
}
function buildSavedGameStateDiagnosticsPayload(manager) {
  var entries = [];
  var secondaryPlacementEntry =
    resolveSavedStateSecondaryPlacementDiagnosticsEntry(manager);
  if (secondaryPlacementEntry) entries.push(secondaryPlacementEntry);
  return {
    diagnostics_index_entries:
      normalizeSavedStateDiagnosticsIndexEntries(entries),
  };
}

function buildSavedGameStateMetaPayload(manager, now) {
  return {
    v: GameManager.SAVED_GAME_STATE_VERSION,
    saved_at: now,
    terminated: false,
    mode_key: manager.modeKey,
    board_width: manager.width,
    board_height: manager.height,
    ruleset: manager.ruleset,
  };
}

function buildSavedGameStateCoreStatePayload(manager) {
  return {
    board: manager.getFinalBoardMatrix(),
    score: manager.score,
    over: manager.over,
    won: manager.won,
    keep_playing: manager.keepPlaying,
    initial_seed: manager.initialSeed,
    seed: manager.seed,
    client_record_id: resolveManagerClientRecordId(manager),
    spawn_value_counts: manager.spawnValueCounts || {},
    reached_32k: !!manager.reached32k,
    capped_milestone_count: Number.isInteger(manager.cappedMilestoneCount)
      ? manager.cappedMilestoneCount
      : 0,
    capped64_unlocked: manager.capped64Unlocked || null,
  };
}

function resolveCoreNoXSavedStateRuntime(manager) {
  var windowLike =
    manager && manager.getWindowLike ? manager.getWindowLike() : null;
  return windowLike && windowLike.CoreNoXSelectionRuntime
    ? windowLike.CoreNoXSelectionRuntime
    : typeof CoreNoXSelectionRuntime !== "undefined"
      ? CoreNoXSelectionRuntime
      : null;
}
function buildSavedGameStateNoXSelectionPayload(manager) {
  var runtime = resolveCoreNoXSavedStateRuntime(manager);
  return runtime &&
    typeof runtime.buildSavedGameStateNoXSelectionPayload === "function"
    ? runtime.buildSavedGameStateNoXSelectionPayload(manager)
    : {};
}
function applySavedNoXSelectionState(manager, saved) {
  var runtime = resolveCoreNoXSavedStateRuntime(manager);
  if (runtime && typeof runtime.applySavedNoXSelectionState === "function")
    runtime.applySavedNoXSelectionState(manager, saved);
}

function shouldIncludeReplayStringInSavedPayload(manager, now, saveOptions) {
  if (!manager) return false;
  if (saveOptions && saveOptions.force) return true;
  var lastSavedAt = Number(manager.lastReplayStringSavedAt);
  if (!Number.isFinite(lastSavedAt) || lastSavedAt <= 0) return true;
  return now - lastSavedAt >= 8000;
}

function trySerializeReplayForSavedPayloadFallback(manager) {
  try {
    return typeof serializeReplay === "function"
      ? String(serializeReplay(manager) || "")
      : "";
  } catch (_err) {
    return "";
  }
}

function resolveReplayStringForSavedPayloadFallback(manager, now, saveOptions) {
  if (
    !(
      manager &&
      shouldIncludeReplayStringInSavedPayload(manager, now, saveOptions)
    )
  )
    return "";
  var replayString = trySerializeReplayForSavedPayloadFallback(manager);
  if (!replayString && manager.rescueReplayString != null)
    replayString = String(manager.rescueReplayString || "").trim();
  if (replayString) manager.lastReplayStringSavedAt = now;
  return replayString;
}

function resolveReplayStringForSavedPayload(manager, now, saveOptions) {
  var runtime = resolveCoreSavedPayloadReplayStringRuntime();
  if (
    runtime &&
    typeof runtime.resolveReplayStringForSavedPayload === "function"
  ) {
    return runtime.resolveReplayStringForSavedPayload(
      manager,
      now,
      saveOptions,
      {
        serializeReplay:
          typeof serializeReplay === "function" ? serializeReplay : undefined,
      },
    );
  }
  return resolveReplayStringForSavedPayloadFallback(manager, now, saveOptions);
}

function buildSavedGameStateReplayStatePayload(manager, now, saveOptions) {
  return {
    move_history: Array.isArray(manager.moveHistory) ? manager.moveHistory : [],
    ips_input_count:
      Number.isInteger(manager.ipsInputCount) && manager.ipsInputCount >= 0
        ? manager.ipsInputCount
        : 0,
    undo_stack: Array.isArray(manager.undoStack) ? manager.undoStack : [],
    redo_stack: Array.isArray(manager.redoStack) ? manager.redoStack : [],
    replay_compact_log: manager.replayCompactLog || "",
    session_replay_v1: cloneSavedReplaySessionState(
      manager,
      manager.sessionReplayV1,
      null,
    ),
    session_replay_v3: manager.sessionReplayV3 || null,
    replay_string: resolveReplayStringForSavedPayload(
      manager,
      now,
      saveOptions,
    ),
  };
}

function normalizeSavedTimerMs(value) {
  var numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : null;
}

function buildSavedGameStateTimerCorePayload(manager) {
  var isTerminatedState = !!(
    manager.over ||
    (manager.won && !manager.keepPlaying)
  );
  var timerStartedAtMs =
    manager.startTime && typeof manager.startTime.getTime === "function"
      ? manager.startTime.getTime()
      : normalizeSavedTimerMs(manager.timerStartedAtMs);
  return {
    timer_status: isTerminatedState ? 0 : manager.timerStatus === 1 ? 1 : 0,
    duration_ms: manager.getDurationMs(),
    timer_started_at_ms: isTerminatedState ? null : timerStartedAtMs,
    timer_elapsed_offset_ms: isTerminatedState
      ? null
      : normalizeSavedTimerMs(manager.timerElapsedOffsetMs),
    timer_anchor_local_ms: isTerminatedState
      ? null
      : normalizeSavedTimerMs(manager.timerAnchorLocalMs),
    timer_anchor_server_ms: isTerminatedState
      ? null
      : normalizeSavedTimerMs(manager.timerAnchorServerMs),
    has_game_started: !!manager.hasGameStarted,
    timer_frozen: isTerminatedState,
  };
}

function buildSavedGameStateBasePayload(manager, now, saveOptions) {
  return Object.assign(
    {},
    buildSavedGameStateMetaPayload(manager, now),
    buildSavedGameStateCoreStatePayload(manager),
    buildSavedGameStateNoXSelectionPayload(manager),
    buildSavedGameStateReplayStatePayload(manager, now, saveOptions),
    buildSavedGameStateTimerCorePayload(manager),
  );
}

function buildSavedGameStateProgressPayload(manager) {
  return {
    combo_streak: Number.isInteger(manager.comboStreak)
      ? manager.comboStreak
      : 0,
    successful_move_count: Number.isInteger(manager.successfulMoveCount)
      ? manager.successfulMoveCount
      : 0,
    undo_used: Number.isInteger(manager.undoUsed) ? manager.undoUsed : 0,
    valid_input_count: Number.isInteger(manager.validInputCount)
      ? manager.validInputCount
      : 0,
    invalid_input_count: Number.isInteger(manager.invalidInputCount)
      ? manager.invalidInputCount
      : 0,
    challenge_id: manager.challengeId || null,
    ranked_session_token: manager.rankedSessionToken || null,
    spawn_sequence_version: manager.spawnSequenceVersion === 2 ? 2 : 1,
  };
}

function buildSavedGameStateDirectionLockPayload(manager) {
  return {
    lock_consumed_at_move_count: Number.isInteger(
      manager.lockConsumedAtMoveCount,
    )
      ? manager.lockConsumedAtMoveCount
      : -1,
    locked_direction_turn: Number.isInteger(manager.lockedDirectionTurn)
      ? manager.lockedDirectionTurn
      : null,
    locked_direction: Number.isInteger(manager.lockedDirection)
      ? manager.lockedDirection
      : null,
  };
}

function buildSavedGameStateBoardSnapshotPayload(manager) {
  return {
    initial_board_matrix: manager.initialBoardMatrix
      ? cloneBoardMatrix(manager.initialBoardMatrix)
      : manager.getFinalBoardMatrix(),
    replay_start_board_matrix: manager.replayStartBoardMatrix
      ? cloneBoardMatrix(manager.replayStartBoardMatrix)
      : null,
    practice_restart_board_matrix: manager.practiceRestartBoardMatrix
      ? cloneBoardMatrix(manager.practiceRestartBoardMatrix)
      : null,
    practice_restart_mode_config: manager.practiceRestartModeConfig
      ? manager.safeClonePlain(manager.practiceRestartModeConfig, null)
      : null,
  };
}

function buildSavedGameStateTimerSnapshotPayload(
  manager,
  timerSnapshot,
  subState,
) {
  var snapshot = normalizeSavedStateRecordObject(timerSnapshot, {});
  return {
    timer_module_view: manager.getTimerModuleViewMode
      ? manager.getTimerModuleViewMode()
      : "timer",
    custom_secondary_timer_rule_text:
      typeof manager.customSecondaryTimerRuleText === "string"
        ? manager.customSecondaryTimerRuleText
        : "",
    custom_secondary_timer_rule_family:
      String(manager.ruleset || "").toLowerCase() === "fibonacci"
        ? "fibonacci"
        : "pow2",
    timer_fixed_rows: snapshot.timerFixedRowsState || {},
    timer_dynamic_rows_capped: Array.isArray(
      snapshot.timerDynamicRowsCappedState,
    )
      ? snapshot.timerDynamicRowsCappedState
      : [],
    timer_dynamic_rows_overflow: Array.isArray(
      snapshot.timerDynamicRowsOverflowState,
    )
      ? snapshot.timerDynamicRowsOverflowState
      : [],
    timer_secondary_rows: Array.isArray(subState.timer_secondary_rows)
      ? subState.timer_secondary_rows
      : [],
    timer_secondary_expanded_parents: Array.isArray(
      subState.timer_secondary_expanded_parents,
    )
      ? subState.timer_secondary_expanded_parents
      : [],
    timer_sub_8192: subState.timer_sub_8192,
    timer_sub_16384: subState.timer_sub_16384,
    timer_sub_visible: subState.timer_sub_visible,
  };
}
function buildSavedGameStatePayloadFromPersistenceRuntime(manager, now, saveOptions) {
  if (!manager) return null;
  var documentLike = resolveManagerDocumentLike(manager);
  var timerSnapshot = collectSavedTimerDomSnapshotState(manager, documentLike);
  var timerSubState = collectSavedTimerSubState(manager, documentLike);
  var subState = normalizeSavedStateRecordObject(timerSubState, {});
  var basePayload = buildSavedGameStateBasePayload(manager, now, saveOptions);
  return Object.assign(
    basePayload,
    buildSavedGameStateProgressPayload(manager),
    buildSavedGameStateDirectionLockPayload(manager),
    buildSavedGameStateBoardSnapshotPayload(manager),
    buildSavedGameStateTimerSnapshotPayload(manager, timerSnapshot, subState),
    buildSavedGameStateDiagnosticsPayload(manager),
  );
}
function buildPersistSavedPayloadToStoragesCorePayload(
  stores,
  persistKey,
  persistPayload,
) {
  return {
    storages: stores,
    key: persistKey,
    payload: persistPayload,
  };
}
function persistSavedPayloadToStorages(manager, persistKey, persistPayload) {
  if (!manager) return false;
  var stores = getSavedGameStateStorages(manager);
  var coreCallResult = callCoreStorageRuntime(
    manager,
    "writeSavedPayloadToStorages",
    buildPersistSavedPayloadToStoragesCorePayload(
      stores,
      persistKey,
      persistPayload,
    ),
    false,
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    coreCallResult,
    function (persistedByCore) {
      return typeof persistedByCore === "boolean" ? persistedByCore : undefined;
    },
    function () {
      return persistSavedPayloadToStoragesFallback(
        stores,
        persistKey,
        persistPayload,
      );
    },
  );
}
function serializeSavedPayloadForStorage(persistPayload) {
  var serialized = null;
  try {
    serialized = JSON.stringify(persistPayload);
  } catch (_errJson) {
    serialized = null;
  }
  return typeof serialized === "string" ? serialized : null;
}
function writeSerializedPayloadToStores(stores, persistKey, serialized) {
  if (!Array.isArray(stores) || stores.length === 0) return false;
  if (typeof serialized !== "string") return false;
  for (var i = 0; i < stores.length; i++) {
    try {
      stores[i].setItem(persistKey, serialized);
      return true;
    } catch (_errStore) {}
  }
  return false;
}
function persistSavedPayloadToStoragesFallback(
  stores,
  persistKey,
  persistPayload,
) {
  var serialized = serializeSavedPayloadForStorage(persistPayload);
  return writeSerializedPayloadToStores(stores, persistKey, serialized);
}
function buildLiteSavedGameStateMetaPayload(manager, payload) {
  return {
    v: GameManager.SAVED_GAME_STATE_VERSION,
    saved_at: Number(payload.saved_at) || Date.now(),
    terminated: false,
    mode_key: payload.mode_key || manager.modeKey,
    board_width: Number(payload.board_width) || manager.width,
    board_height: Number(payload.board_height) || manager.height,
    ruleset: payload.ruleset || manager.ruleset,
  };
}
function buildLiteSavedGameStateProgressPayload(payload) {
  return {
    reached_32k: !!payload.reached_32k,
    capped_milestone_count: Number.isInteger(payload.capped_milestone_count)
      ? payload.capped_milestone_count
      : 0,
    combo_streak: Number.isInteger(payload.combo_streak)
      ? payload.combo_streak
      : 0,
    successful_move_count: Number.isInteger(payload.successful_move_count)
      ? payload.successful_move_count
      : 0,
    undo_used: Number.isInteger(payload.undo_used) ? payload.undo_used : 0,
    lock_consumed_at_move_count: Number.isInteger(
      payload.lock_consumed_at_move_count,
    )
      ? payload.lock_consumed_at_move_count
      : -1,
    locked_direction_turn: Number.isInteger(payload.locked_direction_turn)
      ? payload.locked_direction_turn
      : null,
    locked_direction: Number.isInteger(payload.locked_direction)
      ? payload.locked_direction
      : null,
    challenge_id: payload.challenge_id || null,
    ranked_session_token: payload.ranked_session_token || null,
    spawn_sequence_version:
      Number(payload.spawn_sequence_version) === 2 ? 2 : 1,
  };
}
function buildLiteSavedGameStateBoardSnapshotPayload(manager, payload) {
  return {
    initial_board_matrix: Array.isArray(payload.initial_board_matrix)
      ? cloneBoardMatrix(payload.initial_board_matrix)
      : manager.initialBoardMatrix
        ? cloneBoardMatrix(manager.initialBoardMatrix)
        : manager.getFinalBoardMatrix(),
    replay_start_board_matrix: Array.isArray(payload.replay_start_board_matrix)
      ? cloneBoardMatrix(payload.replay_start_board_matrix)
      : manager.replayStartBoardMatrix
        ? cloneBoardMatrix(manager.replayStartBoardMatrix)
        : null,
    practice_restart_board_matrix: Array.isArray(
      payload.practice_restart_board_matrix,
    )
      ? cloneBoardMatrix(payload.practice_restart_board_matrix)
      : manager.practiceRestartBoardMatrix
        ? cloneBoardMatrix(manager.practiceRestartBoardMatrix)
        : null,
    practice_restart_mode_config: payload.practice_restart_mode_config
      ? manager.safeClonePlain(payload.practice_restart_mode_config, null)
      : manager.practiceRestartModeConfig
        ? manager.safeClonePlain(manager.practiceRestartModeConfig, null)
        : null,
  };
}
function buildLiteSavedGameStateReplayTrimPayload(manager, payload) {
  return {
    move_history: [],
    undo_stack: [],
    replay_compact_log: "",
    session_replay_v1: cloneSavedReplaySessionState(
      manager,
      payload && payload.session_replay_v1,
      null,
    ),
    session_replay_v3: null,
  };
}
function resolveLiteSavedNumericSeed(value, fallback) {
  var seedValue = Number(value);
  if (Number.isFinite(seedValue)) return seedValue;
  var fallbackSeed = Number(fallback);
  return Number.isFinite(fallbackSeed) ? fallbackSeed : 0;
}
function resolveLiteSavedScore(manager, source) {
  var score = Number(source.score);
  return Math.floor(
    Number.isFinite(score) && score >= 0 ? score : Number(manager.score) || 0,
  );
}
function resolveLiteSavedIpsInputCount(source) {
  var ipsInputCount = Number(source.ips_input_count);
  if (Number.isFinite(ipsInputCount) && ipsInputCount >= 0)
    return Math.floor(ipsInputCount);
  return Array.isArray(source.move_history) ? source.move_history.length : 0;
}
function resolveLiteSavedClientRecordId(manager, source) {
  return typeof source.client_record_id === "string" && source.client_record_id
    ? source.client_record_id
    : resolveManagerClientRecordId(manager);
}
function buildLiteSavedGameStateCoreRestorePayload(manager, payload) {
  var source = normalizeSavedStateRecordObject(payload, {});
  return {
    board: Array.isArray(source.board)
      ? cloneBoardMatrix(source.board)
      : manager.getFinalBoardMatrix(),
    score: resolveLiteSavedScore(manager, source),
    over: !!source.over,
    won: !!source.won,
    keep_playing: !!source.keep_playing,
    initial_seed: resolveLiteSavedNumericSeed(
      source.initial_seed,
      manager.initialSeed,
    ),
    seed: resolveLiteSavedNumericSeed(source.seed, manager.seed),
    client_record_id: resolveLiteSavedClientRecordId(manager, source),
    spawn_value_counts: isNonArrayObject(source.spawn_value_counts)
      ? manager.clonePlain(source.spawn_value_counts)
      : {},
    ips_input_count: resolveLiteSavedIpsInputCount(source),
    capped64_unlocked: isNonArrayObject(source.capped64_unlocked)
      ? manager.safeClonePlain(source.capped64_unlocked, null)
      : null,
  };
}
function buildLiteSavedGameStateDiagnosticsPayload(payload) {
  if (!isNonArrayObject(payload)) {
    return { diagnostics_index_entries: [] };
  }
  return {
    diagnostics_index_entries: normalizeSavedStateDiagnosticsIndexEntries(
      payload.diagnostics_index_entries,
    ),
  };
}
function buildLiteSavedGameStateTimerPayload(payload) {
  var timerStatus = Number(payload.timer_status);
  var isTimerFrozen = !!payload.timer_frozen;
  var timerDurationMs = Number(payload.duration_ms);
  return {
    timer_status: timerStatus === 1 ? 1 : 0,
    timer_frozen: isTimerFrozen,
    duration_ms: Number.isFinite(timerDurationMs)
      ? Math.floor(timerDurationMs)
      : 0,
    timer_started_at_ms: Number.isFinite(Number(payload.timer_started_at_ms))
      ? Math.floor(Number(payload.timer_started_at_ms))
      : null,
    timer_elapsed_offset_ms: Number.isFinite(
      Number(payload.timer_elapsed_offset_ms),
    )
      ? Math.floor(Number(payload.timer_elapsed_offset_ms))
      : null,
    timer_anchor_local_ms: Number.isFinite(
      Number(payload.timer_anchor_local_ms),
    )
      ? Math.floor(Number(payload.timer_anchor_local_ms))
      : null,
    timer_anchor_server_ms: Number.isFinite(
      Number(payload.timer_anchor_server_ms),
    )
      ? Math.floor(Number(payload.timer_anchor_server_ms))
      : null,
    has_game_started: !!payload.has_game_started,
  };
}
function buildLiteSavedGameStatePayloadFallback(manager, payload) {
  if (!manager) return null;
  if (!normalizeSavedStateRecordObject(payload, null)) return null;
  return Object.assign(
    {},
    buildLiteSavedGameStateMetaPayload(manager, payload),
    buildLiteSavedGameStateCoreRestorePayload(manager, payload),
    buildSavedGameStateNoXSelectionPayload(manager),
    buildLiteSavedGameStateProgressPayload(payload),
    buildLiteSavedGameStateBoardSnapshotPayload(manager, payload),
    buildLiteSavedGameStateReplayTrimPayload(manager, payload),
    buildLiteSavedGameStateDiagnosticsPayload(payload),
    buildLiteSavedGameStateTimerPayload(payload),
  );
}
function buildLiteSavedGameStateCoreCallManagerPayload(manager) {
  return {
    savedStateVersion: GameManager.SAVED_GAME_STATE_VERSION,
    modeKey: manager.modeKey,
    width: manager.width,
    height: manager.height,
    ruleset: manager.ruleset,
    score: manager.score,
    initialSeed: manager.initialSeed,
    seed: manager.seed,
    clientRecordId: resolveManagerClientRecordId(manager),
    durationMs: manager.getDurationMs(),
    finalBoardMatrix: manager.getFinalBoardMatrix(),
    initialBoardMatrix: manager.initialBoardMatrix,
    replayStartBoardMatrix: manager.replayStartBoardMatrix,
    practiceRestartBoardMatrix: manager.practiceRestartBoardMatrix,
    practiceRestartModeConfig: manager.practiceRestartModeConfig,
  };
}
function buildLiteSavedGameStateCoreCallSourcePayload(payload) {
  return {
    over: !!(payload && payload.over),
    won: !!(payload && payload.won),
    keepPlaying: !!(payload && payload.keep_playing),
    spawnValueCounts: payload ? payload.spawn_value_counts : null,
    ipsInputCount: payload ? payload.ips_input_count : null,
    capped64Unlocked: payload ? payload.capped64_unlocked : null,
  };
}
function buildLiteSavedGameStateCoreCallPayload(manager, payload) {
  if (!manager) return { payload: payload };
  return Object.assign(
    { payload: payload },
    buildLiteSavedGameStateCoreCallManagerPayload(manager),
    buildLiteSavedGameStateCoreCallSourcePayload(payload),
  );
}
function buildLiteSavedGameStateReplayRestorePayload(manager, payloadSource) {
  return {
    session_replay_v1: cloneSavedReplaySessionState(
      manager,
      payloadSource && payloadSource.session_replay_v1,
      null,
    ),
  };
}
function ensureLiteSavedGameStateRestoreFields(
  manager,
  litePayload,
  payloadSource,
) {
  if (!manager) return null;
  var normalizedLite = normalizeSavedStateRecordObject(litePayload, null);
  if (!normalizedLite) return null;
  return Object.assign(
    {},
    normalizedLite,
    buildLiteSavedGameStateCoreRestorePayload(manager, payloadSource),
    buildLiteSavedGameStateReplayRestorePayload(manager, payloadSource),
  );
}
function buildLiteSavedGameStatePayload(manager, payloadSource) {
  if (!(manager && normalizeSavedStateRecordObject(payloadSource, null)))
    return null;
  var litePayloadCoreCallResult = callCoreStorageRuntime(
    manager,
    "buildLiteSavedGameStatePayload",
    buildLiteSavedGameStateCoreCallPayload(manager, payloadSource),
    false,
  );
  var litePayload = manager.resolveNormalizedCoreValueOrFallback(
    litePayloadCoreCallResult,
    function (litePayloadByCore) {
      return manager.isNonArrayObject(litePayloadByCore)
        ? litePayloadByCore
        : undefined;
    },
    function () {
      return buildLiteSavedGameStatePayloadFallback(manager, payloadSource);
    },
  );
  return ensureLiteSavedGameStateRestoreFields(
    manager,
    litePayload,
    payloadSource,
  );
}
function persistSavedPayloadWithLiteFallbackByRuntime(
  manager,
  key,
  liteKey,
  fullPayload,
  litePayload,
) {
  var runtime =
    typeof CoreSavedPayloadPersistFallbackRuntime !== "undefined" &&
    CoreSavedPayloadPersistFallbackRuntime
      ? CoreSavedPayloadPersistFallbackRuntime
      : typeof window !== "undefined" && window
        ? window.CoreSavedPayloadPersistFallbackRuntime
        : null;
  if (
    !(
      runtime &&
      typeof runtime.persistSavedPayloadWithLiteFallback === "function"
    )
  )
    return null;
  return runtime.persistSavedPayloadWithLiteFallback(
    {
      manager: manager,
      key: key,
      liteKey: liteKey,
      fullPayload: fullPayload,
      litePayload: litePayload,
    },
    {
      persistPayload: function (currentManager, persistKey, persistPayload) {
        return persistSavedPayloadToStorages(
          currentManager,
          persistKey,
          persistPayload,
        );
      },
      clearSavedState: function (currentManager, modeKey) {
        clearSavedGameState(currentManager, modeKey);
      },
    },
  );
}
function persistSavedPayloadWithLiteFallbackFallback(
  manager,
  key,
  liteKey,
  fullPayload,
  litePayload,
) {
  var hasFullPayload = !!normalizeSavedStateRecordObject(fullPayload, null);
  var persisted = false;
  var persistedFull = false;
  if (hasFullPayload) {
    persistedFull = persistSavedPayloadToStorages(manager, key, fullPayload);
    persisted = persistedFull;
    if (!persisted)
      persisted = persistSavedPayloadToStorages(manager, key, litePayload);
  }
  var litePersisted = persistSavedPayloadToStorages(
    manager,
    liteKey,
    litePayload,
  );
  if (!(persisted || litePersisted)) {
    clearSavedGameState(manager, manager.modeKey);
    if (hasFullPayload)
      persisted = persistSavedPayloadToStorages(manager, key, litePayload);
    litePersisted = persistSavedPayloadToStorages(
      manager,
      liteKey,
      litePayload,
    );
  }
  return {
    persisted: !!(persisted || litePersisted),
    persistedFull: !!persistedFull,
  };
}
function persistSavedPayloadWithLiteFallback(
  manager,
  key,
  liteKey,
  fullPayload,
  litePayload,
) {
  var result = persistSavedPayloadWithLiteFallbackByRuntime(
    manager,
    key,
    liteKey,
    fullPayload,
    litePayload,
  );
  return (
    normalizeSavedStateRecordObject(result, null) ||
    persistSavedPayloadWithLiteFallbackFallback(
      manager,
      key,
      liteKey,
      fullPayload,
      litePayload,
    )
  );
}
function persistSavedGameStatePayloadFromPersistenceRuntime(manager, persistPlan) {
  if (!manager || !persistPlan)
    return { persisted: false, persistedFull: false };
  var fullPayload = normalizeSavedStateRecordObject(
    persistPlan.fullPayload,
    null,
  );
  var litePayloadSource = normalizeSavedStateRecordObject(
    persistPlan.litePayloadSource,
    null,
  );
  if (!litePayloadSource) return { persisted: false, persistedFull: false };
  var key = resolveSavedGameStateStorageKey(
    manager,
    GameManager.SAVED_GAME_STATE_KEY_PREFIX,
  );
  var liteKey = resolveSavedGameStateStorageKey(
    manager,
    GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX,
  );
  var litePayload = buildLiteSavedGameStatePayload(manager, litePayloadSource);
  if (!normalizeSavedStateRecordObject(litePayload, null)) {
    return { persisted: false, persistedFull: false };
  }
  var windowNamePayload =
    !!persistPlan.preferFullWindowNamePayload && fullPayload
      ? fullPayload
      : litePayload;
  writeWindowNameSavedPayload(manager, manager.modeKey, windowNamePayload);
  return persistSavedPayloadWithLiteFallback(
    manager,
    key,
    liteKey,
    fullPayload,
    litePayload,
  );
}
function resolveLatestSavedPayloadForRestore(manager) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  var windowNameSavedCandidate = resolveWindowNameSavedCandidate(
    manager,
    windowLike,
  );
  return resolveLatestSavedPayloadForManager(manager, windowNameSavedCandidate);
}
function handleSavedStateRestoreDecisionFailure(manager, restoreDecision) {
  if (!(manager && restoreDecision)) return false;
  if (restoreDecision.canRestore) return false;
  if (restoreDecision.shouldClearSavedState) clearSavedGameState(manager);
  return true;
}
function applySavedStateRestoreFromPersistenceRuntime(manager, saved) {
  if (!(manager && saved)) return false;
  try {
    setBoardFromMatrix(manager, saved.board);
    applySavedManagerCoreState(manager, saved);
    var cappedStateForRestore = manager.resolveCappedModeState();
    applySavedTimerDomState(manager, saved, cappedStateForRestore);
    applySavedTimerPostRestoreState(manager, saved, cappedStateForRestore);
    return true;
  } catch (_err) {
    clearSavedGameState(manager);
    return false;
  }
}
function tryRestoreLatestSavedStateFromPersistenceRuntime(manager) {
  if (!manager) return false;
  var saved = resolveLatestSavedPayloadForRestore(manager);
  if (!manager || !normalizeSavedStateRecordObject(saved, null)) return false;
  var restoreDecision = resolveSavedStateRestoreDecision(manager, saved);
  if (handleSavedStateRestoreDecisionFailure(manager, restoreDecision))
    return false;
  var restored = applySavedStateRestoreFromPersistenceRuntime(manager, saved);
  if (restored) {
    rememberSavedStateKnownSavedAt(manager, resolveSavedStateSavedAt(saved));
  }
  return restored;
}

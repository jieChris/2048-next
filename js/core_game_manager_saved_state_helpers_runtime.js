function readLocalStorageJsonMapFallback(manager, key) {
  if (!manager) return {};
  var storage = manager.getWebStorageByName("localStorage");
  if (!canReadFromStorage(storage)) return {};
  try {
    var raw = storage.getItem(key);
    if (!raw) return {};
    var parsed = JSON.parse(raw);
    return manager.isNonArrayObject(parsed) ? parsed : {};
  } catch (_err) {
    return {};
  }
}

function readLocalStorageJsonMap(manager, key) {
  if (!manager) return {};
  return resolveSavedStateStorageNormalizedCall(
    manager,
    "readStorageJsonMapFromContext",
    { key: key },
    function (runtimeMap) {
      return manager.isNonArrayObject(runtimeMap) ? runtimeMap : {};
    },
    function () {
      return readLocalStorageJsonMapFallback(manager, key);
    }
  );
}

function writeLocalStorageJsonPayload(manager, key, payload) {
  if (!manager) return false;
  return resolveCoreStorageBooleanCallOrFallback(
    manager,
    "writeStorageJsonPayloadFromContext",
    {
      key: key,
      payload: payload
    },
    function () {
      var storage = manager.getWebStorageByName("localStorage");
      if (!canWriteToStorage(storage)) return false;
      var serialized = JSON.stringify(payload);
      if (typeof serialized !== "string") return false;
      try {
        storage.setItem(key, serialized);
        return true;
      } catch (_err) {
        return false;
      }
    }
  );
}

function resolveSavedStateStorageNormalizedCall(
  manager,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCoreStorageNormalizedCallOrFallback(
    manager,
    methodName,
    payload,
    normalizer,
    fallbackResolver
  );
}

function resolveSavedStateStoragePayloadNormalizedCall(
  manager,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCoreStoragePayloadNormalizedCallOrFallback(
    manager,
    methodName,
    payload,
    normalizer,
    fallbackResolver
  );
}

function resolveSavedStateStoragePayloadNormalizedCallAllowNull(
  manager,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCoreStoragePayloadNormalizedCallOrFallbackAllowNull(
    manager,
    methodName,
    payload,
    normalizer,
    fallbackResolver
  );
}

function resolveSavedStateStoragePayloadBooleanCall(
  manager,
  methodName,
  payload,
  fallbackResolver
) {
  return resolveCoreStoragePayloadBooleanCallOrFallback(
    manager,
    methodName,
    payload,
    fallbackResolver
  );
}

function setBoardFromMatrix(manager, board) {
  if (!manager) throw "Invalid board matrix";
  if (!Array.isArray(board) || board.length !== manager.height) throw "Invalid board matrix";
  manager.grid = new Grid(manager.width, manager.height);
  for (var y = 0; y < manager.height; y++) {
    if (!Array.isArray(board[y]) || board[y].length !== manager.width) throw "Invalid board row";
    for (var x = 0; x < manager.width; x++) {
      var value = board[y][x];
      if (!Number.isInteger(value) || value < 0) throw "Invalid board value";
      if (manager.isBlockedCell(x, y) && value !== 0) throw "Blocked cell must stay empty";
      if (value > 0) {
        manager.grid.insertTile(new Tile({ x: x, y: y }, value));
      }
    }
  }
}

function cloneBoardMatrix(board) {
  if (!Array.isArray(board)) return [];
  var out = [];
  for (var y = 0; y < board.length; y++) {
    out.push(Array.isArray(board[y]) ? board[y].slice() : []);
  }
  return out;
}

function resolveSavedGameStateStorageKey(manager, keyPrefix, modeKey) {
  if (!manager) return null;
  return resolveSavedStateStoragePayloadNormalizedCall(
    manager,
    "resolveSavedGameStateStorageKey",
    manager.createCoreModeContextPayload({
      modeKey: modeKey,
      keyPrefix: typeof keyPrefix === "string" ? keyPrefix : ""
    }),
    function (keyByCore) {
      return typeof keyByCore === "string" && keyByCore ? keyByCore : undefined;
    },
    function () {
      var key = (typeof modeKey === "string" && modeKey)
        ? modeKey
        : (manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY);
      return (typeof keyPrefix === "string" ? keyPrefix : "") + key;
    }
  );
}

function getSavedGameStateStoragesFallback(manager) {
  if (!manager) return [];
  var out = [];
  var localStore = manager.getWebStorageByName("localStorage");
  var sessionStore = manager.getWebStorageByName("sessionStorage");
  if (localStore) out.push(localStore);
  if (sessionStore && sessionStore !== localStore) out.push(sessionStore);
  return out;
}

function getSavedGameStateStorages(manager) {
  if (!manager) return [];
  return resolveSavedStateStorageNormalizedCall(
    manager,
    "getSavedGameStateStoragesFromContext",
    {},
    function (storagesByCore) {
      return resolveSavedStateArrayOrUndefined(storagesByCore);
    },
    function () {
      return getSavedGameStateStoragesFallback(manager);
    }
  );
}

function parseSavedPayloadByRaw(manager, raw) {
  if (!manager || !raw) return null;
  try {
    var parsedRaw = JSON.parse(raw);
    return manager.isNonArrayObject(parsedRaw) ? parsedRaw : null;
  } catch (_errParse) {
    return null;
  }
}

function readSavedPayloadByKeyFallback(manager, stores, key) {
  if (!manager) return null;
  var targetStores = Array.isArray(stores) ? stores : [];
  var best = null;
  for (var i = 0; i < targetStores.length; i++) {
    var raw = null;
    try {
      raw = targetStores[i].getItem(key);
    } catch (_errRead) {
      raw = null;
    }
    if (!raw) continue;
    var parsed = parseSavedPayloadByRaw(manager, raw);
    if (!parsed) {
      try {
        targetStores[i].removeItem(key);
      } catch (_errRemove) {}
      continue;
    }
    if (!best) {
      best = parsed;
      continue;
    }
    var bestSavedAt = Number(best.saved_at) || 0;
    var nextSavedAt = Number(parsed.saved_at) || 0;
    best = nextSavedAt >= bestSavedAt ? parsed : best;
  }
  return best;
}

function resolveSavedPayloadAllowNullCoreValue(manager, payloadByCore) {
  if (!manager) return undefined;
  return manager.isNonArrayObject(payloadByCore)
    ? payloadByCore
    : (payloadByCore === null ? null : undefined);
}

function returnUndefinedValue() { return undefined; }
function returnFalseValue() { return false; }
function resolveSavedStateBooleanOrUndefined(value) { return typeof value === "boolean" ? value : undefined; }
function resolveSavedStateObjectOrUndefined(manager, value) {
  return manager && manager.isNonArrayObject(value) ? value : undefined;
}
function resolveSavedStateArrayOrUndefined(value) { return Array.isArray(value) ? value : undefined; }

function readSavedPayloadByKey(manager, key) {
  if (!manager) return null;
  var stores = manager.getSavedGameStateStorages();
  return resolveSavedStateStoragePayloadNormalizedCallAllowNull(
    manager,
    "readSavedPayloadByKeyFromStorages",
    {
      storages: Array.isArray(stores) ? stores : [],
      key: key
    },
    function (savedByCore) {
      return resolveSavedPayloadAllowNullCoreValue(manager, savedByCore);
    },
    function () {
      return readSavedPayloadByKeyFallback(manager, stores, key);
    }
  );
}

function readWindowNameRaw(manager) {
  if (!manager) return "";
  var windowLike = manager.getWindowLike();
  if (!windowLike) return "";
  try {
    return windowLike && typeof windowLike.name === "string" ? windowLike.name : "";
  } catch (_errName) {
    return "";
  }
}

function resolveWindowNameSavedPayloadMarker() {
  return GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY + "=";
}

function decodeWindowNameSavedMapPayload(encoded) {
  if (!encoded) return null;
  try {
    var map = JSON.parse(decodeURIComponent(encoded));
    if (!isSavedStateRecordObject(map)) return null;
    return map;
  } catch (_errParse) {
    return null;
  }
}

function resolveWindowNameSavedPayloadMapAndKeptParts(manager, parts, marker) {
  if (!manager) return { map: {}, kept: [] };
  var kept = [];
  var map = {};
  var lookupMarker = typeof marker === "string" && marker
    ? marker
    : resolveWindowNameSavedPayloadMarker();
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (typeof part === "string" && part && part.indexOf(lookupMarker) === 0) {
      var encoded = part.substring(lookupMarker.length);
      var parsedMap = decodeWindowNameSavedMapPayload(encoded);
      if (manager.isNonArrayObject(parsedMap)) map = parsedMap;
      continue;
    }
    if (!part) continue;
    kept.push(part);
  }
  return {
    map: map,
    kept: kept
  };
}

function writeWindowNameSavedPayloadFallback(manager, windowLike, modeKey, payload) {
  if (!manager || !windowLike) return false;
  var marker = resolveWindowNameSavedPayloadMarker();
  var raw = readWindowNameRaw(manager);
  var parts = raw ? raw.split("&") : [];
  var resolved = resolveWindowNameSavedPayloadMapAndKeptParts(manager, parts, marker);
  var map = resolved.map;
  var key = (typeof modeKey === "string" && modeKey)
    ? modeKey
    : (manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY);
  if (!isSavedStateRecordObject(payload)) {
    delete map[key];
  } else {
    map[key] = payload;
  }
  var encodedMap = null;
  try {
    encodedMap = encodeURIComponent(JSON.stringify(map));
  } catch (_errEncode) {
    return false;
  }
  if (typeof encodedMap !== "string") return false;
  var nextParts = resolved.kept.slice();
  nextParts.push(marker + encodedMap);
  var nextWindowName = nextParts.join("&");
  if (typeof nextWindowName !== "string") return false;
  try {
    windowLike.name = nextWindowName;
    return true;
  } catch (_errWrite) {
    return false;
  }
}

function writeWindowNameSavedPayload(manager, modeKey, payload) {
  if (!manager) return false;
  var windowLike = manager.getWindowLike();
  return resolveSavedStateStoragePayloadNormalizedCall(
    manager,
    "writeSavedPayloadToWindowName",
    Object.assign(
      {},
      manager.createCoreModeContextPayload({
        windowLike: windowLike,
        windowNameKey: GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY,
        modeKey: modeKey
      }),
      { payload: payload }
    ),
    function (writtenByCore) {
      return resolveSavedStateBooleanOrUndefined(writtenByCore);
    },
    function () {
      return writeWindowNameSavedPayloadFallback(manager, windowLike, modeKey, payload);
    }
  );
}

function resolveWindowPathname(manager) {
  var windowLike = manager ? manager.getWindowLike() : null;
  return (windowLike && windowLike.location && windowLike.location.pathname)
    ? String(windowLike.location.pathname)
    : "";
}

function shouldUseSavedGameState(manager) {
  if (!manager) return false;
  var pathname = resolveWindowPathname(manager);
  return resolveSavedStateStoragePayloadBooleanCall(
    manager,
    "shouldUseSavedGameStateFromContext",
    {
      hasWindow: !!manager.getWindowLike(),
      replayMode: manager.replayMode,
      pathname: pathname
    },
    function () {
      if (!manager.getWindowLike()) return false;
      if (manager.replayMode) return false;
      return pathname.indexOf("replay.html") === -1;
    }
  );
}

function saveGameState(manager, options) {
  if (!manager) return;
  return saveGameStateImpl.call(manager, options);
}

function saveGameStateImpl(options) {
  options = normalizeSavedStateOptions(options);
  var now = Date.now();
  if (shouldSkipSaveGameState(this, options, now)) return;
  try {
    commitSavedGameStateAtTimestamp(this, now);
  } catch (_err) {}
}

function removeSavedGameStateKeysFallback(stores, keys) {
  var targetStores = Array.isArray(stores) ? stores : [];
  var targetKeys = Array.isArray(keys) ? keys : [];
  for (var i = 0; i < targetStores.length; i++) {
    for (var k = 0; k < targetKeys.length; k++) {
      try {
        targetStores[i].removeItem(targetKeys[k]);
      } catch (_err) {}
    }
  }
}

function clearSavedGameState(manager, modeKey) {
  if (!manager) return;
  manager.writeWindowNameSavedPayload(modeKey, null);
  if (!shouldUseSavedGameState(manager)) return;
  var keys = [
    manager.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_KEY_PREFIX, modeKey),
    manager.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX, modeKey)
  ];
  var stores = manager.getSavedGameStateStorages();
  if (resolveSavedStateStoragePayloadBooleanCall(
    manager,
    "removeKeysFromStorages",
    {
      storages: stores,
      keys: keys
    },
    returnFalseValue
  )) return;
  removeSavedGameStateKeysFallback(stores, keys);
}

function resolveSavedStateDocumentLike(manager) {
  return resolveManagerDocumentLike(manager);
}

function resolveSavedStateElementById(manager, elementId) {
  return resolveManagerElementById(manager, elementId);
}

function isSavedStateRecordObject(saved) {
  return !!(saved && typeof saved === "object");
}

function normalizeSavedStateRecordObject(value, fallback) {
  return isSavedStateRecordObject(value) ? value : fallback;
}

function normalizeSavedStateOptions(options) {
  return normalizeSavedStateRecordObject(options, {});
}

function createSavedStateElement(documentLike, tagName) {
  if (!documentLike || typeof documentLike.createElement !== "function") return null;
  return documentLike.createElement(tagName);
}

function resolveSavedDynamicTimerRowInfo(rowState) {
  var source = normalizeSavedStateRecordObject(rowState, {});
  return {
    repeat: parseInt(source.repeat, 10),
    labelText: typeof source.label === "string" ? source.label : "",
    timeText: typeof source.time === "string" ? source.time : "",
    labelClass: typeof source.labelClass === "string" ? source.labelClass : "",
    labelFontSize: typeof source.labelFontSize === "string" ? source.labelFontSize : ""
  };
}

function shouldApplySavedDynamicTimerRepeat(rowInfo) {
  return !!(rowInfo && Number.isFinite(rowInfo.repeat) && rowInfo.repeat >= 2);
}

function createSavedDynamicTimerRowContainer(rowInfo, documentLike) {
  var rowDiv = createSavedStateElement(documentLike, "div");
  if (!rowDiv) return null;
  rowDiv.className = "timer-row-item";
  if (shouldApplySavedDynamicTimerRepeat(rowInfo)) {
    rowDiv.setAttribute("data-capped-repeat", String(rowInfo.repeat));
  }
  return rowDiv;
}

function createSavedDynamicTimerLegendElement(manager, rowInfo, resolvedCappedState, documentLike) {
  if (!manager) return null;
  var legend = createSavedStateElement(documentLike, "div");
  if (!legend) return null;
  legend.className = manager.getCappedTimerLegendClass(resolvedCappedState.cappedTargetValue);
  legend.style.cssText =
    "color: #f9f6f2; font-size: " +
    manager.getCappedTimerFontSize(resolvedCappedState.cappedTargetValue) +
    ";";
  legend.textContent = rowInfo.labelText;
  if (!(shouldApplySavedDynamicTimerRepeat(rowInfo) && resolvedCappedState.isCappedMode) && rowInfo.labelClass) {
    legend.className = rowInfo.labelClass;
  }
  if (rowInfo.labelFontSize) legend.style.fontSize = rowInfo.labelFontSize;
  return legend;
}

function createSavedDynamicTimerValueElement(rowInfo, documentLike) {
  var val = createSavedStateElement(documentLike, "div");
  if (!val) return null;
  val.className = "timertile";
  val.style.cssText = "margin-left:6px; width:187px;";
  val.textContent = rowInfo.timeText;
  return val;
}

function appendSavedDynamicTimerRowChildren(rowDiv, legend, val, documentLike) {
  if (!rowDiv || !legend || !val) return false;
  var brTop = createSavedStateElement(documentLike, "br");
  var brBottom = createSavedStateElement(documentLike, "br");
  if (!brTop || !brBottom) return false;
  rowDiv.appendChild(legend);
  rowDiv.appendChild(val);
  rowDiv.appendChild(brTop);
  rowDiv.appendChild(brBottom);
  return true;
}

function createSavedDynamicTimerRow(manager, rowState, cappedState) {
  if (!manager) return null;
  var documentLike = resolveSavedStateDocumentLike(manager);
  if (!documentLike) return null;
  var resolvedCappedState =
    manager.resolveProvidedCappedModeState(cappedState);
  var rowInfo = resolveSavedDynamicTimerRowInfo(rowState);
  var rowDiv = createSavedDynamicTimerRowContainer(rowInfo, documentLike);
  if (!rowDiv) return null;
  var legend = createSavedDynamicTimerLegendElement(manager, rowInfo, resolvedCappedState, documentLike);
  var val = createSavedDynamicTimerValueElement(rowInfo, documentLike);
  if (!appendSavedDynamicTimerRowChildren(rowDiv, legend, val, documentLike)) return null;
  return rowDiv;
}

function normalizeCappedRepeatLegendClasses(manager, cappedState) {
  if (!manager) return;
  var documentLike = resolveSavedStateDocumentLike(manager);
  if (!documentLike || typeof documentLike.querySelectorAll !== "function") return;
  var resolvedCappedState =
    manager.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return;
  var rows = documentLike.querySelectorAll("#timerbox [data-capped-repeat]");
  var legendClass = manager.getCappedTimerLegendClass(resolvedCappedState.cappedTargetValue);
  var fontSize = manager.getCappedTimerFontSize(resolvedCappedState.cappedTargetValue);
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || !row.querySelector) continue;
    var legend = row.querySelector(".timertile");
    if (!legend) continue;
    legend.className = legendClass;
    legend.style.color = "#f9f6f2";
    legend.style.fontSize = fontSize;
  }
  manager.callWindowNamespaceMethod("ThemeManager", "syncTimerLegendStyles");
}

function captureTimerFixedRowsStateForSave(manager) {
  var documentLike = resolveSavedStateDocumentLike(manager);
  if (!documentLike) return {};
  var out = {};
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
    var row = manager.getTimerRowEl(slotId);
    var timerEl = resolveSavedStateElementById(manager, "timer" + slotId);
    if (!row || !timerEl) continue;
    var legend = row.querySelector(".timertile");
    out[slotId] = {
      display: row.style.display || "",
      visibility: row.style.visibility || "",
      pointerEvents: row.style.pointerEvents || "",
      repeat: row.getAttribute("data-capped-repeat") || "",
      timerText: timerEl.textContent || "",
      legendText: legend ? (legend.textContent || "") : "",
      legendClass: legend ? (legend.className || "") : "",
      legendFontSize: legend ? (legend.style.fontSize || "") : ""
    };
  }
  return out;
}

function captureTimerDynamicRowsStateForSave(manager, containerId) {
  var documentLike = resolveSavedStateDocumentLike(manager);
  var out = [];
  if (!documentLike) return out;
  var container = resolveSavedStateElementById(manager, containerId);
  if (!container) return out;
  for (var i = 0; i < container.children.length; i++) {
    var row = container.children[i];
    if (!row || !row.classList || !row.classList.contains("timer-row-item")) continue;
    var tiles = row.querySelectorAll(".timertile");
    var legend = tiles.length > 0 ? tiles[0] : null;
    var timer = tiles.length > 1 ? tiles[1] : null;
    out.push({
      repeat: row.getAttribute("data-capped-repeat") || "",
      label: legend ? (legend.textContent || "") : "",
      labelClass: legend ? (legend.className || "") : "",
      labelFontSize: legend ? (legend.style.fontSize || "") : "",
      time: timer ? (timer.textContent || "") : ""
    });
  }
  return out;
}

function captureTimerSubStateForSave(manager) {
  if (!resolveSavedStateDocumentLike(manager)) {
    return {
      timer_sub_8192: "",
      timer_sub_16384: "",
      timer_sub_visible: false
    };
  }
  var timerSub8192 = resolveSavedStateElementById(manager, "timer8192-sub");
  var timerSub16384 = resolveSavedStateElementById(manager, "timer16384-sub");
  var timerSubContainer = resolveSavedStateElementById(manager, "timer32k-sub-container");
  return {
    timer_sub_8192: (timerSub8192 || {}).textContent || "",
    timer_sub_16384: (timerSub16384 || {}).textContent || "",
    timer_sub_visible: (((timerSubContainer || {}).style) || {}).display === "block"
  };
}

function buildSavedGameStateBasePayload(manager, now) {
  if (!manager) return null;
  return {
    v: GameManager.SAVED_GAME_STATE_VERSION,
    saved_at: now,
    terminated: false,
    mode_key: manager.modeKey,
    board_width: manager.width,
    board_height: manager.height,
    ruleset: manager.ruleset,
    board: manager.getFinalBoardMatrix(),
    score: manager.score,
    over: manager.over,
    won: manager.won,
    keep_playing: manager.keepPlaying,
    initial_seed: manager.initialSeed,
    seed: manager.seed,
    spawn_value_counts: manager.spawnValueCounts ? manager.safeClonePlain(manager.spawnValueCounts, {}) : {},
    reached_32k: !!manager.reached32k,
    capped_milestone_count: Number.isInteger(manager.cappedMilestoneCount) ? manager.cappedMilestoneCount : 0,
    capped64_unlocked: manager.capped64Unlocked ? manager.safeClonePlain(manager.capped64Unlocked, null) : null,
    move_history: manager.moveHistory ? manager.moveHistory.slice() : [],
    ips_input_count: Number.isInteger(manager.ipsInputCount) && manager.ipsInputCount >= 0 ? manager.ipsInputCount : 0,
    undo_stack: manager.undoStack ? manager.safeClonePlain(manager.undoStack, []) : [],
    replay_compact_log: manager.replayCompactLog || "",
    session_replay_v3: manager.sessionReplayV3 ? manager.safeClonePlain(manager.sessionReplayV3, null) : null,
    timer_status: manager.timerStatus === 1 ? 1 : 0,
    duration_ms: manager.getDurationMs(),
    has_game_started: !!manager.hasGameStarted
  };
}

function buildSavedGameStateRoundPayload(manager) {
  if (!manager) return null;
  return {
    combo_streak: Number.isInteger(manager.comboStreak) ? manager.comboStreak : 0,
    successful_move_count: Number.isInteger(manager.successfulMoveCount) ? manager.successfulMoveCount : 0,
    undo_used: Number.isInteger(manager.undoUsed) ? manager.undoUsed : 0,
    challenge_id: manager.challengeId || null
  };
}

function buildSavedGameStateDirectionLockPayload(manager) {
  if (!manager) return null;
  return {
    lock_consumed_at_move_count: Number.isInteger(manager.lockConsumedAtMoveCount) ? manager.lockConsumedAtMoveCount : -1,
    locked_direction_turn: Number.isInteger(manager.lockedDirectionTurn) ? manager.lockedDirectionTurn : null,
    locked_direction: Number.isInteger(manager.lockedDirection) ? manager.lockedDirection : null
  };
}

function buildSavedGameStateBoardSnapshotPayload(manager) {
  if (!manager) return null;
  return {
    initial_board_matrix: manager.initialBoardMatrix ? manager.cloneBoardMatrix(manager.initialBoardMatrix) : manager.getFinalBoardMatrix(),
    replay_start_board_matrix: manager.replayStartBoardMatrix ? manager.cloneBoardMatrix(manager.replayStartBoardMatrix) : null,
    practice_restart_board_matrix: manager.practiceRestartBoardMatrix ? manager.cloneBoardMatrix(manager.practiceRestartBoardMatrix) : null,
    practice_restart_mode_config: manager.practiceRestartModeConfig ? manager.safeClonePlain(manager.practiceRestartModeConfig, null) : null
  };
}

function buildSavedGameStateTimerUiPayload(manager, timerSubState) {
  if (!manager) return null;
  var subState = normalizeSavedStateRecordObject(timerSubState, {});
  return {
    timer_module_view: manager.getTimerModuleViewMode ? manager.getTimerModuleViewMode() : "timer",
    timer_fixed_rows: captureTimerFixedRowsStateForSave(manager),
    timer_dynamic_rows_capped: captureTimerDynamicRowsStateForSave(manager, "capped-timer-container"),
    timer_dynamic_rows_overflow: captureTimerDynamicRowsStateForSave(manager, "capped-timer-overflow-container"),
    timer_sub_8192: subState.timer_sub_8192,
    timer_sub_16384: subState.timer_sub_16384,
    timer_sub_visible: subState.timer_sub_visible
  };
}

function buildSavedGameStatePayload(manager, now) {
  if (!manager) return null;
  var timerSubState = captureTimerSubStateForSave(manager);
  var basePayload = buildSavedGameStateBasePayload(manager, now);
  return Object.assign(
    basePayload,
    buildSavedGameStateRoundPayload(manager),
    buildSavedGameStateDirectionLockPayload(manager),
    buildSavedGameStateBoardSnapshotPayload(manager),
    buildSavedGameStateTimerUiPayload(manager, timerSubState)
  );
}

function buildLiteSavedStateBaseSection(manager, payload) {
  return {
    v: GameManager.SAVED_GAME_STATE_VERSION,
    saved_at: Number(payload.saved_at) || Date.now(),
    terminated: false,
    mode_key: payload.mode_key || manager.modeKey,
    board_width: Number(payload.board_width) || manager.width,
    board_height: Number(payload.board_height) || manager.height,
    ruleset: payload.ruleset || manager.ruleset
  };
}

function buildLiteSavedStateMetaSection(payload) {
  return {
    reached_32k: !!payload.reached_32k,
    capped_milestone_count: Number.isInteger(payload.capped_milestone_count) ? payload.capped_milestone_count : 0,
    capped64_unlocked: null,
    combo_streak: Number.isInteger(payload.combo_streak) ? payload.combo_streak : 0,
    successful_move_count: Number.isInteger(payload.successful_move_count) ? payload.successful_move_count : 0,
    undo_used: Number.isInteger(payload.undo_used) ? payload.undo_used : 0,
    lock_consumed_at_move_count: Number.isInteger(payload.lock_consumed_at_move_count) ? payload.lock_consumed_at_move_count : -1,
    locked_direction_turn: Number.isInteger(payload.locked_direction_turn) ? payload.locked_direction_turn : null,
    locked_direction: Number.isInteger(payload.locked_direction) ? payload.locked_direction : null,
    challenge_id: payload.challenge_id || null
  };
}

function buildLiteSavedStateBoardSection(manager, payload) {
  return {
    initial_board_matrix: Array.isArray(payload.initial_board_matrix)
      ? manager.cloneBoardMatrix(payload.initial_board_matrix)
      : (manager.initialBoardMatrix ? manager.cloneBoardMatrix(manager.initialBoardMatrix) : manager.getFinalBoardMatrix()),
    replay_start_board_matrix: Array.isArray(payload.replay_start_board_matrix)
      ? manager.cloneBoardMatrix(payload.replay_start_board_matrix)
      : (manager.replayStartBoardMatrix ? manager.cloneBoardMatrix(manager.replayStartBoardMatrix) : null),
    practice_restart_board_matrix: Array.isArray(payload.practice_restart_board_matrix)
      ? manager.cloneBoardMatrix(payload.practice_restart_board_matrix)
      : (manager.practiceRestartBoardMatrix ? manager.cloneBoardMatrix(manager.practiceRestartBoardMatrix) : null),
    practice_restart_mode_config: payload.practice_restart_mode_config
      ? manager.safeClonePlain(payload.practice_restart_mode_config, null)
      : (manager.practiceRestartModeConfig ? manager.safeClonePlain(manager.practiceRestartModeConfig, null) : null)
  };
}

function buildLiteSavedStateReplayResetSection() {
  return {
    move_history: [],
    undo_stack: [],
    replay_compact_log: "",
    session_replay_v3: null,
    spawn_value_counts: {}
  };
}

function buildLiteSavedGameStatePayload(manager, payload) {
  if (!manager) return null;
  return resolveSavedStateStoragePayloadNormalizedCall(
    manager,
    "buildLiteSavedGameStatePayload",
    {
      payload: payload,
      savedStateVersion: GameManager.SAVED_GAME_STATE_VERSION,
      modeKey: manager.modeKey,
      width: manager.width,
      height: manager.height,
      ruleset: manager.ruleset,
      score: manager.score,
      initialSeed: manager.initialSeed,
      seed: manager.seed,
      durationMs: manager.getDurationMs(),
      finalBoardMatrix: manager.getFinalBoardMatrix(),
      initialBoardMatrix: manager.initialBoardMatrix,
      replayStartBoardMatrix: manager.replayStartBoardMatrix,
      practiceRestartBoardMatrix: manager.practiceRestartBoardMatrix,
      practiceRestartModeConfig: manager.practiceRestartModeConfig
    },
    function (litePayloadByCore) {
      return resolveSavedStateObjectOrUndefined(manager, litePayloadByCore);
    },
    function () {
      if (!isSavedStateRecordObject(payload)) return null;
      return Object.assign(
        {},
        buildLiteSavedStateBaseSection(manager, payload),
        buildLiteSavedStateMetaSection(payload),
        buildLiteSavedStateBoardSection(manager, payload),
        buildLiteSavedStateReplayResetSection()
      );
    }
  );
}

function resolveSavedGameStateStorageKeys(manager) {
  if (!manager) return null;
  return {
    key: manager.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_KEY_PREFIX),
    liteKey: manager.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX)
  };
}

function buildSavedGameStatePersistContext(manager, payload) {
  if (!manager || !payload) return null;
  var storageKeys = resolveSavedGameStateStorageKeys(manager);
  return {
    payload: payload,
    litePayload: buildLiteSavedGameStatePayload(manager, payload),
    key: storageKeys ? storageKeys.key : null,
    liteKey: storageKeys ? storageKeys.liteKey : null
  };
}

function writeSavedGameStatePrimaryPersist(manager, persistContext) {
  if (!manager || !persistContext) return null;
  manager.writeWindowNameSavedPayload(manager.modeKey, persistContext.litePayload);
  var persisted = manager.writeSavedGameStatePayload(persistContext.key, persistContext.payload);
  if (!persisted) {
    persisted = manager.writeSavedGameStatePayload(persistContext.key, persistContext.litePayload);
  }
  var litePersisted = manager.writeSavedGameStatePayload(persistContext.liteKey, persistContext.litePayload);
  return {
    persisted: !!persisted,
    litePersisted: !!litePersisted
  };
}

function hasAnySavedGameStatePersisted(persistWrites) {
  return !!(persistWrites && (persistWrites.persisted || persistWrites.litePersisted));
}

function writeSavedGameStateQuotaFallbackPersist(manager, persistContext) {
  if (!manager || !persistContext) return null;
  manager.clearSavedGameState(manager.modeKey);
  var persistedAfterQuotaFallback = manager.writeSavedGameStatePayload(persistContext.key, persistContext.litePayload);
  var litePersistedAfterQuotaFallback = manager.writeSavedGameStatePayload(persistContext.liteKey, persistContext.litePayload);
  return {
    persisted: !!persistedAfterQuotaFallback,
    litePersisted: !!litePersistedAfterQuotaFallback
  };
}

function persistSavedGameStatePayload(manager, payload) {
  if (!manager || !payload) return false;
  var persistContext = buildSavedGameStatePersistContext(manager, payload);
  var persistWrites = writeSavedGameStatePrimaryPersist(manager, persistContext);
  if (!hasAnySavedGameStatePersisted(persistWrites)) {
    persistWrites = writeSavedGameStateQuotaFallbackPersist(manager, persistContext);
  }
  return hasAnySavedGameStatePersisted(persistWrites);
}

function shouldClearSavedStateForTerminatedSession(manager) {
  if (!manager) return false;
  if (manager.modeKey === "practice_legacy") return false;
  return isSessionTerminated(manager);
}

function isSaveGameStateThrottled(manager, options, now) {
  if (!manager) return true;
  if (options && options.force) return false;
  if (!manager.lastSavedGameStateAt) return false;
  return now - manager.lastSavedGameStateAt < 150;
}

function shouldSkipSaveGameState(manager, options, now) {
  if (!manager) return true;
  if (!shouldUseSavedGameState(manager)) return true;
  if (shouldClearSavedStateForTerminatedSession(manager)) {
    manager.clearSavedGameState();
    return true;
  }
  return isSaveGameStateThrottled(manager, options, now);
}

function commitSavedGameStateAtTimestamp(manager, now) {
  if (!manager) return false;
  var payload = buildSavedGameStatePayload(manager, now);
  var persistResult = persistSavedGameStatePayload(manager, payload);
  if (!persistResult) return false;
  manager.lastSavedGameStateAt = now;
  return true;
}

function writeSavedGameStatePayload(manager, key, payloadObj) {
  if (!manager) return false;
  var stores = manager.getSavedGameStateStorages();
  return resolveSavedStateStoragePayloadNormalizedCall(
    manager,
    "writeSavedPayloadToStorages",
    {
      storages: stores,
      key: key,
      payload: payloadObj
    },
    function (persistedByCore) {
      return resolveSavedStateBooleanOrUndefined(persistedByCore);
    },
    function () {
      if (!stores || stores.length === 0) return false;
      var serialized = null;
      try {
        serialized = JSON.stringify(payloadObj);
      } catch (_errJson) {
        serialized = null;
      }
      if (typeof serialized !== "string") return false;
      for (var i = 0; i < stores.length; i++) {
        try {
          stores[i].setItem(key, serialized);
          return true;
        } catch (_errStore) {}
      }
      return false;
    }
  );
}

function resolveWindowNameSavedCandidate(manager) {
  if (!manager) return null;
  var windowLikeForSavedCandidate = manager.getWindowLike();
  var windowNameSavedCandidate = resolveSavedStateStoragePayloadNormalizedCallAllowNull(
    manager,
    "readSavedPayloadFromWindowName",
    manager.createCoreModeContextPayload({
      windowLike: windowLikeForSavedCandidate,
      windowNameKey: GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY,
      modeKey: manager.modeKey
    }),
    function (payloadByCore) {
      return resolveSavedPayloadAllowNullCoreValue(manager, payloadByCore);
    },
    returnUndefinedValue
  );
  if (typeof windowNameSavedCandidate !== "undefined") {
    return windowNameSavedCandidate;
  }
  var map = resolveWindowNameSavedMap(manager);
  return resolveSavedPayloadFromWindowNameMap(manager, map);
}

function resolveWindowNameSavedMap(manager) {
  if (!manager) return null;
  var windowNameRaw = manager.readWindowNameRaw();
  var marker = manager.resolveWindowNameSavedPayloadMarker();
  if (!(windowNameRaw && typeof windowNameRaw === "string")) return null;
  var parts = windowNameRaw.split("&");
  var lookupMarker = typeof marker === "string" && marker
    ? marker
    : manager.resolveWindowNameSavedPayloadMarker();
  var encoded = "";
  for (var windowNameIndex = 0; windowNameIndex < parts.length; windowNameIndex++) {
    if (parts[windowNameIndex].indexOf(lookupMarker) === 0) {
      encoded = parts[windowNameIndex].substring(lookupMarker.length);
      break;
    }
  }
  return manager.decodeWindowNameSavedMapPayload(encoded);
}

function resolveSavedPayloadFromWindowNameMap(manager, map) {
  if (!isSavedStateRecordObject(map)) return null;
  var savedKey = manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY;
  var payload = map[savedKey];
  if (isSavedStateRecordObject(payload)) return payload;
  return null;
}

function pickLatestSavedStateCandidate(candidates) {
  var saved = null;
  if (!Array.isArray(candidates)) return saved;
  for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    var nextCandidate = candidates[candidateIndex];
    if (!isSavedStateRecordObject(nextCandidate)) continue;
    if (!isSavedStateRecordObject(saved)) {
      saved = nextCandidate;
      continue;
    }
    var bestAt = Number(saved.saved_at) || 0;
    var nextAt = Number(nextCandidate.saved_at) || 0;
    // Keep the first candidate when timestamps are equal (full > lite > window).
    // This avoids downgrading to lite/window snapshots that may omit replay history.
    if (nextAt > bestAt) saved = nextCandidate;
  }
  return saved;
}

function validateSavedStateCandidate(manager, saved) {
  var result = {
    canRestore: true,
    shouldClearSavedState: true
  };
  if (!manager || !isSavedStateRecordObject(saved)) {
    result.canRestore = false;
    return result;
  }
  if (Number(saved.v) !== GameManager.SAVED_GAME_STATE_VERSION) {
    result.canRestore = false;
  } else if (!!saved.terminated) {
    result.canRestore = false;
  } else if (!!(saved.over || (saved.won && !saved.keep_playing)) && saved.mode_key !== "practice_legacy") {
    result.canRestore = false;
  } else if (saved.mode_key !== manager.modeKey) {
    result.canRestore = false;
    result.shouldClearSavedState = false;
  } else if (Number(saved.board_width) !== manager.width || Number(saved.board_height) !== manager.height) {
    result.canRestore = false;
  } else if (!!saved.ruleset && saved.ruleset !== manager.ruleset) {
    result.canRestore = false;
  } else if (!Array.isArray(saved.board) || saved.board.length !== manager.height) {
    result.canRestore = false;
  }
  return result;
}

function applySavedStateReplayFields(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  manager.moveHistory = Array.isArray(saved.move_history) ? saved.move_history.slice() : [];
  manager.ipsInputCount = Number.isInteger(saved.ips_input_count) && saved.ips_input_count >= 0
    ? saved.ips_input_count
    : manager.moveHistory.length;
  manager.undoStack = Array.isArray(saved.undo_stack) ? saved.undo_stack.slice() : [];
  manager.replayCompactLog = typeof saved.replay_compact_log === "string" ? saved.replay_compact_log : "";
  manager.sessionReplayV3 = isSavedStateRecordObject(saved.session_replay_v3)
    ? manager.clonePlain(saved.session_replay_v3)
    : manager.sessionReplayV3;
  manager.spawnValueCounts = isSavedStateRecordObject(saved.spawn_value_counts)
    ? manager.clonePlain(saved.spawn_value_counts)
    : {};
  manager.spawnTwos = manager.spawnValueCounts["2"] || 0;
  manager.spawnFours = manager.spawnValueCounts["4"] || 0;
}

function applySavedStateBoardSnapshotFields(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  manager.initialBoardMatrix =
    (Array.isArray(saved.initial_board_matrix) && saved.initial_board_matrix.length === manager.height)
      ? manager.cloneBoardMatrix(saved.initial_board_matrix)
      : manager.getFinalBoardMatrix();
  manager.replayStartBoardMatrix =
    (Array.isArray(saved.replay_start_board_matrix) && saved.replay_start_board_matrix.length === manager.height)
      ? manager.cloneBoardMatrix(saved.replay_start_board_matrix)
      : manager.cloneBoardMatrix(manager.initialBoardMatrix);
  manager.practiceRestartBoardMatrix =
    (Array.isArray(saved.practice_restart_board_matrix) && saved.practice_restart_board_matrix.length === manager.height)
      ? manager.cloneBoardMatrix(saved.practice_restart_board_matrix)
      : null;
  manager.practiceRestartModeConfig =
    isSavedStateRecordObject(saved.practice_restart_mode_config)
      ? manager.clonePlain(saved.practice_restart_mode_config)
      : null;
}

function applySavedStateStatusFields(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  manager.score = Number.isInteger(saved.score) && saved.score >= 0 ? saved.score : 0;
  manager.over = !!saved.over;
  manager.won = !!saved.won;
  manager.keepPlaying = !!saved.keep_playing;
}

function applySavedStateSeedAndSessionFields(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  manager.initialSeed = Number.isFinite(saved.initial_seed) ? Number(saved.initial_seed) : manager.initialSeed;
  manager.seed = Number.isFinite(saved.seed) ? Number(saved.seed) : manager.initialSeed;
  manager.reached32k = !!saved.reached_32k;
  manager.cappedMilestoneCount = Number.isInteger(saved.capped_milestone_count) ? saved.capped_milestone_count : 0;
  manager.capped64Unlocked = isSavedStateRecordObject(saved.capped64_unlocked)
    ? manager.clonePlain(saved.capped64_unlocked)
    : manager.capped64Unlocked;
  manager.challengeId = typeof saved.challenge_id === "string" && saved.challenge_id ? saved.challenge_id : null;
  manager.hasGameStarted = !!saved.has_game_started;
  manager.sessionSubmitDone = false;
}

function applySavedStateRoundStateFields(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  manager.comboStreak = Number.isInteger(saved.combo_streak) ? saved.combo_streak : 0;
  manager.successfulMoveCount = Number.isInteger(saved.successful_move_count) ? saved.successful_move_count : 0;
  manager.undoUsed = Number.isInteger(saved.undo_used) ? saved.undo_used : 0;
  manager.lockConsumedAtMoveCount = Number.isInteger(saved.lock_consumed_at_move_count) ? saved.lock_consumed_at_move_count : -1;
  manager.lockedDirectionTurn = Number.isInteger(saved.locked_direction_turn) ? saved.locked_direction_turn : null;
  manager.lockedDirection = Number.isInteger(saved.locked_direction) ? saved.locked_direction : null;
}

function applySavedStateTimerFields(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  manager.accumulatedTime = Number.isFinite(saved.duration_ms) && saved.duration_ms >= 0 ? Math.floor(saved.duration_ms) : 0;
  manager.time = manager.accumulatedTime;
  manager.startTime = null;
  manager.timerStatus = 0;
}

function applySavedStateCoreFields(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  manager.setBoardFromMatrix(saved.board);
  applySavedStateStatusFields(manager, saved);
  applySavedStateSeedAndSessionFields(manager, saved);
  applySavedStateReplayFields(manager, saved);
  applySavedStateRoundStateFields(manager, saved);
  applySavedStateTimerFields(manager, saved);
  applySavedStateBoardSnapshotFields(manager, saved);
}

function applySavedTimerLegendState(manager, row, rowState, legend, cappedStateForRestore) {
  if (!manager || !row || !rowState || !legend) return;
  if (row.getAttribute("data-capped-repeat") && cappedStateForRestore.isCappedMode) {
    legend.className = manager.getCappedTimerLegendClass(cappedStateForRestore.cappedTargetValue);
  } else if (typeof rowState.legendClass === "string" && rowState.legendClass) {
    legend.className = rowState.legendClass;
  }
  if (typeof rowState.legendText === "string") legend.textContent = rowState.legendText;
  legend.style.fontSize = typeof rowState.legendFontSize === "string" ? rowState.legendFontSize : "";
}

function applySavedTimerFixedRowState(manager, documentLike, slotId, rowState, cappedStateForRestore) {
  if (!manager || !rowState || !documentLike) return;
  var row = manager.getTimerRowEl(slotId);
  var timerElBySlot = resolveSavedStateElementById(manager, "timer" + slotId);
  if (!row || !timerElBySlot) return;
  var legend = row.querySelector(".timertile");
  row.style.display = typeof rowState.display === "string" ? rowState.display : "";
  row.style.visibility = typeof rowState.visibility === "string" ? rowState.visibility : "";
  row.style.pointerEvents = typeof rowState.pointerEvents === "string" ? rowState.pointerEvents : "";
  if (typeof rowState.repeat === "string" && rowState.repeat) row.setAttribute("data-capped-repeat", rowState.repeat);
  else row.removeAttribute("data-capped-repeat");
  timerElBySlot.textContent = typeof rowState.timerText === "string" ? rowState.timerText : "";
  applySavedTimerLegendState(manager, row, rowState, legend, cappedStateForRestore);
}

function restoreSavedTimerFixedRows(manager, saved, cappedStateForRestore) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  var documentLike = resolveSavedStateDocumentLike(manager);
  if (!documentLike) return;
  var fixed = saved.timer_fixed_rows;
  if (!isSavedStateRecordObject(fixed)) return;
  for (var fixedIndex = 0; fixedIndex < GameManager.TIMER_SLOT_IDS.length; fixedIndex++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[fixedIndex]);
    var rowState = fixed[slotId];
    if (!rowState) continue;
    applySavedTimerFixedRowState(manager, documentLike, slotId, rowState, cappedStateForRestore);
  }
}

function restoreSavedDynamicTimerRowsIntoContainer(manager, container, rowStates, cappedStateForRestore) {
  if (!manager || !container) return;
  var rows = Array.isArray(rowStates) ? rowStates : [];
  container.innerHTML = "";
  for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    var rowElement = manager.createSavedDynamicTimerRow(rows[rowIndex], cappedStateForRestore);
    if (!rowElement) continue;
    container.appendChild(rowElement);
  }
}

function restoreSavedTimerDynamicRows(manager, saved, cappedStateForRestore) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  var capped = resolveSavedStateElementById(manager, "capped-timer-container");
  if (capped) {
    restoreSavedDynamicTimerRowsIntoContainer(
      manager,
      capped,
      saved.timer_dynamic_rows_capped,
      cappedStateForRestore
    );
  }
  var overflow = manager.getCappedOverflowContainer(cappedStateForRestore);
  if (!overflow) return;
  restoreSavedDynamicTimerRowsIntoContainer(
    manager,
    overflow,
    saved.timer_dynamic_rows_overflow,
    cappedStateForRestore
  );
}

function setTextContentByIdWhenString(manager, elementId, value) {
  if (typeof value !== "string") return;
  var element = resolveSavedStateElementById(manager, elementId);
  if (element) {
    element.textContent = value;
  }
}

function setDisplayByIdWhenBoolean(manager, elementId, value, trueDisplay, falseDisplay) {
  if (typeof value !== "boolean") return;
  var element = resolveSavedStateElementById(manager, elementId);
  if (!element) return;
  element.style.display = value ? trueDisplay : falseDisplay;
}

function restoreSavedTimerSubRows(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  if (!resolveSavedStateDocumentLike(manager)) return;
  setTextContentByIdWhenString(manager, "timer8192-sub", saved.timer_sub_8192);
  setTextContentByIdWhenString(manager, "timer16384-sub", saved.timer_sub_16384);
  setDisplayByIdWhenBoolean(manager, "timer32k-sub-container", saved.timer_sub_visible, "block", "none");
}

function applySavedTimerUiRestorePostEffects(manager, cappedStateForRestore) {
  if (!manager || !cappedStateForRestore) return;
  manager.normalizeCappedRepeatLegendClasses(cappedStateForRestore);
  manager.callWindowMethod("updateTimerScroll");
}

function resolveSavedTimerUiRestoreContext(manager) {
  if (!manager) return null;
  return {
    cappedStateForRestore: manager.resolveCappedModeState()
  };
}

function applySavedTimerRowsRestore(manager, saved, restoreContext) {
  if (!manager || !saved || !restoreContext) return;
  restoreSavedTimerFixedRows(manager, saved, restoreContext.cappedStateForRestore);
  restoreSavedTimerDynamicRows(manager, saved, restoreContext.cappedStateForRestore);
  restoreSavedTimerSubRows(manager, saved);
}

function restoreSavedTimerUiState(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  var restoreContext = resolveSavedTimerUiRestoreContext(manager);
  applySavedTimerRowsRestore(manager, saved, restoreContext);
  applySavedTimerUiRestorePostEffects(manager, restoreContext.cappedStateForRestore);
}

function syncSavedStateTimerDisplay(manager) {
  if (!manager) return;
  var timerEl = resolveSavedStateElementById(manager, "timer");
  if (timerEl) timerEl.textContent = manager.pretty(manager.accumulatedTime);
}

function shouldResumeTimerFromSavedState(manager, saved) {
  if (!manager || !saved) return false;
  if (manager.over || manager.won) return false;
  return saved.timer_status === 1;
}

function finalizeSavedStateRestore(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return;
  manager.timerModuleView = saved.timer_module_view === "hidden" ? "hidden" : "timer";
  syncSavedStateTimerDisplay(manager);
  if (shouldResumeTimerFromSavedState(manager, saved)) {
    manager.startTimer();
  }
}

function shouldAttemptSavedStateRestore(options, hasInputSeed) {
  var skipStartTiles = !!(options && options.skipStartTiles);
  if (hasInputSeed || skipStartTiles) return false;
  if (options && options.disableStateRestore) return false;
  return true;
}

function buildSavedStateCandidates(manager) {
  if (!manager) return [];
  var windowNameSavedCandidate = resolveWindowNameSavedCandidate(manager);
  return [
    manager.readSavedPayloadByKey(manager.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_KEY_PREFIX)),
    manager.readSavedPayloadByKey(manager.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX)),
    windowNameSavedCandidate
  ];
}

function handleInvalidSavedStateCandidate(manager, validateResult) {
  if (!manager) return false;
  var result = normalizeSavedStateRecordObject(validateResult, {});
  if (result.shouldClearSavedState) manager.clearSavedGameState();
  return false;
}

function applySavedStateRestorePipeline(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return false;
  applySavedStateCoreFields(manager, saved);
  restoreSavedTimerUiState(manager, saved);
  finalizeSavedStateRestore(manager, saved);
  return true;
}

function tryRestoreSavedStateCandidate(manager, saved) {
  if (!manager || !isSavedStateRecordObject(saved)) return false;
  var validateResult = validateSavedStateCandidate(manager, saved);
  if (!validateResult.canRestore) {
    return handleInvalidSavedStateCandidate(manager, validateResult);
  }
  try {
    return applySavedStateRestorePipeline(manager, saved);
  } catch (_err) {
    manager.clearSavedGameState();
    return false;
  }
}

function shouldAttemptSavedStateRestoreForManager(manager, options, hasInputSeed) {
  if (!manager) return false;
  if (!shouldAttemptSavedStateRestore(options, hasInputSeed)) return false;
  return shouldUseSavedGameState(manager);
}

function tryRestoreLatestSavedState(manager) {
  if (!manager) return false;
  var candidates = buildSavedStateCandidates(manager);
  var saved = pickLatestSavedStateCandidate(candidates);
  return tryRestoreSavedStateCandidate(manager, saved);
}

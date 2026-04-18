function assertSavedBoardMatrixShape(manager, board) {
  if (!manager) throw "Invalid board matrix";
  if (!Array.isArray(board) || board.length !== manager.height) throw "Invalid board matrix";
}
function assertSavedBoardRowShape(manager, row) {
  if (!Array.isArray(row) || row.length !== manager.width) throw "Invalid board row";
}
function validateSavedBoardCellValue(manager, x, y, value) {
  if (!Number.isInteger(value) || value < 0) throw "Invalid board value";
  if (manager.isBlockedCell(x, y) && value !== 0) throw "Blocked cell must stay empty";
}
function insertSavedBoardTileIfNeeded(manager, x, y, value) {
  if (value <= 0) return;
  var tile = new Tile({ x: x, y: y }, value);
  if (typeof manager.isStoneValue === "function" && manager.isStoneValue(value)) {
    tile.isStone = true;
  }
  manager.grid.insertTile(tile);
}
function applySavedBoardMatrixRow(manager, row, y) {
  assertSavedBoardRowShape(manager, row);
  for (var x = 0; x < manager.width; x++) {
    var value = row[x];
    validateSavedBoardCellValue(manager, x, y, value);
    insertSavedBoardTileIfNeeded(manager, x, y, value);
  }
}
function setBoardFromMatrix(manager, board) {
  assertSavedBoardMatrixShape(manager, board);
  manager.setRuntimeGrid(new Grid(manager.width, manager.height));
  for (var y = 0; y < manager.height; y++) {
    applySavedBoardMatrixRow(manager, board[y], y);
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
function normalizeSavedStateRecordObject(value, fallbackValue) {
  return isNonArrayObject(value) ? value : fallbackValue;
}
function readWindowNameRawValue(windowLike) {
  var raw = "";
  try {
    raw = windowLike && typeof windowLike.name === "string" ? windowLike.name : "";
  } catch (_errName) {
    raw = "";
  }
  return raw;
}
function decodeWindowNamePayloadMap(encoded) {
  if (!encoded) return null;
  try {
    var decodedMap = decodeURIComponent(encoded);
    var parsedMap = JSON.parse(decodedMap);
    return normalizeSavedStateRecordObject(parsedMap, null);
  } catch (_errMapParse) {
    return null;
  }
}
function resolveSavedStateModeKey(manager, modeKey) {
  if (typeof modeKey === "string" && modeKey) return modeKey;
  if (!manager) return GameManager.DEFAULT_MODE_KEY;
  return manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY;
}
function resolveWindowNameLookupMarker(marker) {
  return typeof marker === "string" && marker
    ? marker
    : (GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY + "=");
}
function scanWindowNamePartsByMarker(raw, marker) {
  var lookupMarker = resolveWindowNameLookupMarker(marker);
  var parts = raw ? raw.split("&") : [];
  var keptParts = [];
  var map = {};
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (typeof part === "string" && part && part.indexOf(lookupMarker) === 0) {
      var encoded = part.substring(lookupMarker.length);
      var parsedMap = decodeWindowNamePayloadMap(encoded);
      if (normalizeSavedStateRecordObject(parsedMap, null)) map = parsedMap;
      continue;
    }
    if (!part) continue;
    keptParts.push(part);
  }
  return { keptParts: keptParts, map: map };
}
function resolveWindowNameSavedCandidateFallback(manager, windowLike, marker) {
  if (!manager) return null;
  var windowNameRaw = readWindowNameRawValue(windowLike);
  if (!(windowNameRaw && typeof windowNameRaw === "string")) return null;
  var scanned = scanWindowNamePartsByMarker(windowNameRaw, marker);
  var map = scanned.map;
  if (!normalizeSavedStateRecordObject(map, null)) return null;
  var savedKey = resolveSavedStateModeKey(manager);
  var payload = map[savedKey];
  return normalizeSavedStateRecordObject(payload, null);
}
function buildReadWindowNameSavedCandidateCorePayload(manager, windowLike) {
  return manager.createCoreModeContextPayload({
    windowLike: windowLike,
    windowNameKey: GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY,
    modeKey: manager.modeKey
  });
}
function normalizeWindowNameSavedCandidateFromCore(manager, coreCallResult) {
  return manager.resolveNormalizedCoreValueOrFallbackAllowNull(
    coreCallResult,
    function (payloadByCore) {
      return manager.isNonArrayObject(payloadByCore)
        ? payloadByCore
        : (payloadByCore === null ? null : undefined);
    },
    function () { return undefined; }
  );
}
function resolveWindowNameSavedCandidate(manager, windowLike) {
  if (!manager) return null;
  var windowNameSavedCoreCallResult = callCoreStorageRuntime(
    manager,
    "readSavedPayloadFromWindowName",
    buildReadWindowNameSavedCandidateCorePayload(manager, windowLike),
    false
  );
  var windowNameSavedCandidate = normalizeWindowNameSavedCandidateFromCore(manager, windowNameSavedCoreCallResult);
  if (typeof windowNameSavedCandidate !== "undefined") return windowNameSavedCandidate;
  var marker = GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY + "=";
  return resolveWindowNameSavedCandidateFallback(manager, windowLike, marker);
}
function resolveSavedPayloadRichnessScore(payload) {
  if (!normalizeSavedStateRecordObject(payload, null)) return -1;
  var richnessKeys = [
    "timer_fixed_rows",
    "timer_dynamic_rows_capped",
    "timer_dynamic_rows_overflow",
    "timer_secondary_rows",
    "timer_secondary_expanded_parents",
    "timer_sub_8192",
    "timer_sub_16384",
    "timer_sub_visible"
  ];
  var score = 0;
  for (var keyIndex = 0; keyIndex < richnessKeys.length; keyIndex++) {
    if (Object.prototype.hasOwnProperty.call(payload, richnessKeys[keyIndex])) score += 1;
  }
  return score;
}
function resolveLatestSavedPayloadCandidate(candidates) {
  var best = null;
  if (!Array.isArray(candidates)) return best;
  for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    var nextCandidate = candidates[candidateIndex];
    if (!normalizeSavedStateRecordObject(nextCandidate, null)) continue;
    if (!normalizeSavedStateRecordObject(best, null)) {
      best = nextCandidate;
      continue;
    }
    var bestAt = Number(best.saved_at) || 0;
    var nextAt = Number(nextCandidate.saved_at) || 0;
    if (nextAt > bestAt) {
      best = nextCandidate;
      continue;
    }
    if (nextAt < bestAt) continue;
    if (resolveSavedPayloadRichnessScore(nextCandidate) > resolveSavedPayloadRichnessScore(best)) {
      best = nextCandidate;
    }
  }
  return best;
}
function resolveLatestSavedPayloadForManager(manager, windowNameSavedCandidate) {
  if (!manager) return null;
  var candidates = [
    readSavedPayloadByKey(manager, resolveSavedGameStateStorageKey(manager, GameManager.SAVED_GAME_STATE_KEY_PREFIX)),
    readSavedPayloadByKey(manager, resolveSavedGameStateStorageKey(manager, GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX)),
    windowNameSavedCandidate
  ];
  return resolveLatestSavedPayloadCandidate(candidates);
}
function isSavedStateTerminalForRestore(saved) {
  if (!saved) return false;
  if (!!saved.terminated) return true;
  return !!(saved.over || (saved.won && !saved.keep_playing)) && saved.mode_key !== "practice";
}
function isSavedStateSizeOrRulesetMismatch(manager, saved) {
  if (!(manager && saved)) return true;
  if (Number(saved.board_width) !== manager.width || Number(saved.board_height) !== manager.height) return true;
  if (!!saved.ruleset && saved.ruleset !== manager.ruleset) return true;
  return false;
}

function resolveSavedStateModeConfigForPolicy(manager) {
  if (!manager) return null;
  try {
    if (typeof manager.resolveModeConfig === "function") {
      var resolved = manager.resolveModeConfig(manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY);
      if (normalizeSavedStateRecordObject(resolved, null)) return resolved;
    }
  } catch (_err) {}
  return normalizeSavedStateRecordObject(manager.modeConfig, null);
}

function isSavedStateRestrictedForRankedMode(manager) {
  var modeConfig = resolveSavedStateModeConfigForPolicy(manager);
  if (modeConfig && modeConfig.rank_policy === "ranked") return true;
  return !!(manager && manager.rankPolicy === "ranked");
}

function resolveSavedStateUndoModeConfig(manager) {
  if (!manager) return null;
  try {
    if (typeof manager.resolveModeConfig === "function") {
      var resolved = manager.resolveModeConfig(manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY);
      if (normalizeSavedStateRecordObject(resolved, null)) return resolved;
    }
  } catch (_err) {}
  return normalizeSavedStateRecordObject(manager.modeConfig, null);
}

function shouldRestoreSavedStateUndoHistory(manager) {
  if (!manager) return false;
  var modeConfig = resolveSavedStateUndoModeConfig(manager);
  if (modeConfig && typeof modeConfig.undo_enabled === "boolean") {
    return modeConfig.undo_enabled;
  }
  return !!manager.undoEnabled;
}

function isSavedStateBoardInvalidForRestore(manager, saved) {
  if (!(manager && saved)) return true;
  return !Array.isArray(saved.board) || saved.board.length !== manager.height;
}
function resolveSavedStateRestoreDecision(manager, saved) {
  if (isSavedStateRestrictedForRankedMode(manager)) return { canRestore: false, shouldClearSavedState: false };
  if (Number(saved.v) !== GameManager.SAVED_GAME_STATE_VERSION) return { canRestore: false, shouldClearSavedState: true };
  if (isSavedStateTerminalForRestore(saved)) return { canRestore: false, shouldClearSavedState: true };
  if (saved.mode_key !== manager.modeKey) return { canRestore: false, shouldClearSavedState: false };
  if (isSavedStateSizeOrRulesetMismatch(manager, saved)) return { canRestore: false, shouldClearSavedState: true };
  if (isSavedStateBoardInvalidForRestore(manager, saved)) return { canRestore: false, shouldClearSavedState: true };
  return { canRestore: true, shouldClearSavedState: true };
}
function shouldUseSavedGameState(manager) {
  if (!manager) return false;
  var windowLike = manager.getWindowLike();
  var pathname = resolveSavedStatePathname(windowLike);
  var coreCallResult = callCoreStorageRuntime(manager, "shouldUseSavedGameStateFromContext", {
    hasWindow: !!windowLike,
    replayMode: manager.replayMode,
    pathname: pathname
  }, false);
  return manager.resolveCoreBooleanCallOrFallback(coreCallResult, function () {
    if (!windowLike) return false;
    if (manager.replayMode) return false;
    if (isSavedStateRestrictedForRankedMode(manager)) return false;
    return pathname.indexOf("replay.html") === -1;
  });
}
function shouldClearSavedStateForTerminatedSession(manager) {
  if (!manager) return false;
  return manager.modeKey !== "practice" && isSessionTerminated(manager);
}
function resolveLastFullSavedStatePersistAt(manager) {
  if (!manager) return 0;
  var persistedAt = Number(manager.lastSavedGameStateFullAt);
  var attemptedAt = Number(manager.lastSavedGameStateFullAttemptAt);
  var persisted = Number.isFinite(persistedAt) && persistedAt > 0 ? Math.floor(persistedAt) : 0;
  var attempted = Number.isFinite(attemptedAt) && attemptedAt > 0 ? Math.floor(attemptedAt) : 0;
  return attempted > persisted ? attempted : persisted;
}
function shouldSkipSaveGameStateByThrottle(manager, options, now) {
  if (!manager) return true;
  if (options && options.force) return false;
  if (!manager.lastSavedGameStateAt) return false;
  return (now - manager.lastSavedGameStateAt) < resolveSaveGameStateThrottleMs(manager);
}
function shouldPersistFullSavedGameStatePayload(manager, now, options) {
  if (!manager) return false;
  if (options && (options.force || options.forceFull)) return true;
  var lastFullPersistAt = resolveLastFullSavedStatePersistAt(manager);
  if (!(lastFullPersistAt > 0)) return true;
  return (now - lastFullPersistAt) >= resolveSaveGameStateFullPersistIntervalMs(manager);
}
function buildSavedGameStateLiteSourcePayload(manager, now) {
  if (!manager) return null;
  return Object.assign(
    {},
    buildSavedGameStateMetaPayload(manager, now),
    buildSavedGameStateCoreStatePayload(manager),
    buildSavedGameStateProgressPayload(manager),
    buildSavedGameStateDirectionLockPayload(manager),
    buildSavedGameStateBoardSnapshotPayload(manager),
    buildSavedGameStateTimerCorePayload(manager),
    buildSavedGameStateDiagnosticsPayload(manager)
  );
}
function buildSavedGameStatePersistPlan(manager, now, saveOptions) {
  if (!manager) return null;
  var shouldPersistFull = shouldPersistFullSavedGameStatePayload(manager, now, saveOptions);
  var fullPayload = shouldPersistFull ? buildSavedGameStatePayload(manager, now, saveOptions) : null;
  var litePayloadSource = normalizeSavedStateRecordObject(fullPayload, null)
    || buildSavedGameStateLiteSourcePayload(manager, now);
  if (!normalizeSavedStateRecordObject(litePayloadSource, null)) return null;
  return {
    fullPayload: normalizeSavedStateRecordObject(fullPayload, null),
    litePayloadSource: litePayloadSource,
    preferFullWindowNamePayload: !!(saveOptions && (saveOptions.force || saveOptions.forceFull))
  };
}
function saveGameState(manager, options) {
  if (!manager) return;
  options = normalizeSavedStateRecordObject(options, {});
  var now = Date.now();
  if (!shouldUseSavedGameState(manager)) return;
  if (shouldClearSavedStateForTerminatedSession(manager)) {
    clearSavedGameState(manager);
    return;
  }
  if (shouldSkipSaveGameStateByThrottle(manager, options, now)) return;
  try {
    var persistPlan = buildSavedGameStatePersistPlan(manager, now, options);
    if (!normalizeSavedStateRecordObject(persistPlan, null)) return;
    var persistResult = persistSavedGameStatePayload(manager, persistPlan);
    if (!(persistResult && persistResult.persisted)) return;
    manager.lastSavedGameStateAt = now;
    if (normalizeSavedStateRecordObject(persistPlan.fullPayload, null)) {
      manager.lastSavedGameStateFullAttemptAt = now;
    }
    if (persistResult.persistedFull) {
      manager.lastSavedGameStateFullAt = now;
    }
    rememberSavedStateKnownSavedAt(manager, now);
  } catch (_err) {}
}
function removeSavedKeysFromStoragesFallback(stores, keys) {
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
  writeWindowNameSavedPayload(manager, modeKey, null);
  if (!shouldUseSavedGameState(manager)) return;
  var keys = [
    resolveSavedGameStateStorageKey(manager, GameManager.SAVED_GAME_STATE_KEY_PREFIX, modeKey),
    resolveSavedGameStateStorageKey(manager, GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX, modeKey)
  ];
  var stores = getSavedGameStateStorages(manager);
  var removeCoreCallResult = callCoreStorageRuntime(manager, "removeKeysFromStorages", { storages: stores, keys: keys }, false);
  if (manager.resolveCoreBooleanCallOrFallback(removeCoreCallResult, function () { return false; })) return;
  removeSavedKeysFromStoragesFallback(stores, keys);
}
function normalizeSavedDynamicTimerRowInfo(rowState) {
  var source = normalizeSavedStateRecordObject(rowState, {});
  return {
    repeat: parseInt(source.repeat, 10),
    labelText: typeof source.label === "string" ? source.label : "",
    timeText: typeof source.time === "string" ? source.time : "",
    labelClass: typeof source.labelClass === "string" ? source.labelClass : "",
    labelFontSize: typeof source.labelFontSize === "string" ? source.labelFontSize : ""
  };
}
function shouldApplySavedDynamicTimerRowRepeat(rowInfo) {
  return !!(rowInfo && Number.isFinite(rowInfo.repeat) && rowInfo.repeat >= 2);
}
function createSavedDynamicTimerRowContainer(documentLike, rowInfo, shouldApplyRepeat) {
  var rowDiv = documentLike.createElement("div");
  if (!rowDiv) return null;
  rowDiv.className = "timer-row-item";
  if (shouldApplyRepeat) {
    rowDiv.setAttribute("data-capped-repeat", String(rowInfo.repeat));
  }
  return rowDiv;
}

function createSavedDynamicTimerLegendElement(manager, documentLike, resolvedCappedState, rowInfo, shouldApplyRepeat) {
  var legend = documentLike.createElement("div");
  if (!legend) return null;
  legend.className = manager.getCappedTimerLegendClass(resolvedCappedState.cappedTargetValue);
  legend.style.cssText =
    "color: #f9f6f2; font-size: " +
    manager.getCappedTimerFontSize(resolvedCappedState.cappedTargetValue) +
    ";";
  legend.textContent = rowInfo.labelText;
  if (!(shouldApplyRepeat && resolvedCappedState.isCappedMode) && rowInfo.labelClass) {
    legend.className = rowInfo.labelClass;
  }
  if (rowInfo.labelFontSize) legend.style.fontSize = rowInfo.labelFontSize;
  return legend;
}

function createSavedDynamicTimerValueElement(documentLike, rowInfo) {
  var val = documentLike.createElement("div");
  if (!val) return null;
  val.className = "timertile";
  val.style.cssText = "margin-left:6px; width:187px;";
  val.textContent = rowInfo.timeText;
  return val;
}

function appendSavedDynamicTimerRowChildren(documentLike, rowDiv, legend, val) {
  var brTop = documentLike.createElement("br");
  var brBottom = documentLike.createElement("br");
  if (!brTop || !brBottom) return false;
  rowDiv.appendChild(legend);
  rowDiv.appendChild(val);
  rowDiv.appendChild(brTop);
  rowDiv.appendChild(brBottom);
  return true;
}

function resolveSavedDynamicTimerDocumentLike(manager) {
  if (!manager) return null;
  var documentLike = resolveManagerDocumentLike(manager);
  if (!documentLike) return null;
  if (typeof documentLike.createElement !== "function") return null;
  return documentLike;
}

function resolveSavedDynamicTimerResolvedState(manager, cappedState) {
  return manager.resolveProvidedCappedModeState(cappedState);
}

function createSavedDynamicTimerRow(manager, rowState, cappedState) {
  var documentLike = resolveSavedDynamicTimerDocumentLike(manager);
  if (!documentLike) return null;
  var resolvedCappedState = resolveSavedDynamicTimerResolvedState(manager, cappedState);
  var rowInfo = normalizeSavedDynamicTimerRowInfo(rowState);
  var shouldApplyRepeat = shouldApplySavedDynamicTimerRowRepeat(rowInfo);
  var rowDiv = createSavedDynamicTimerRowContainer(documentLike, rowInfo, shouldApplyRepeat);
  if (!rowDiv) return null;
  var legend = createSavedDynamicTimerLegendElement(manager, documentLike, resolvedCappedState, rowInfo, shouldApplyRepeat);
  if (!legend) return null;
  var val = createSavedDynamicTimerValueElement(documentLike, rowInfo);
  if (!val) return null;
  if (!appendSavedDynamicTimerRowChildren(documentLike, rowDiv, legend, val)) return null;
  return rowDiv;
}

function normalizeCappedRepeatLegendClasses(manager, cappedState) {
  if (!manager) return;
  var documentLike = resolveManagerDocumentLike(manager), resolvedCappedState = manager.resolveProvidedCappedModeState(cappedState);
  if (!documentLike || typeof documentLike.querySelectorAll !== "function") return;
  if (!resolvedCappedState.isCappedMode) return;
  var rows = documentLike.querySelectorAll("#timerbox [data-capped-repeat]");
  var targetValue = resolvedCappedState.cappedTargetValue;
  var legendClass = manager.getCappedTimerLegendClass(targetValue), fontSize = manager.getCappedTimerFontSize(targetValue);
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || !row.querySelector) continue;
    var legend = row.querySelector(".timertile");
    if (!legend) continue;
    legend.className = legendClass;
    legend.style.color = "#f9f6f2"; legend.style.fontSize = fontSize;
  }
  manager.callWindowNamespaceMethod("ThemeManager", "syncTimerLegendStyles");
}

function applySavedTimerFixedRowsState(manager, saved, cappedStateForRestore) {
  if (!manager || !saved) return;
  var fixed = saved.timer_fixed_rows;
  if (!isNonArrayObject(fixed)) return;
  for (var fixedIndex = 0; fixedIndex < GameManager.TIMER_SLOT_IDS.length; fixedIndex++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[fixedIndex]);
    var rowState = fixed[slotId];
    if (!rowState) continue;
    var row = manager.getTimerRowEl(slotId);
    var timerElBySlot = resolveManagerElementById(manager, "timer" + slotId);
    if (!row || !timerElBySlot) continue;
    var legend = row.querySelector(".timertile");
    applySavedTimerRowVisibilityState(row, rowState);
    applySavedTimerRowRepeatState(row, rowState);
    timerElBySlot.textContent = typeof rowState.timerText === "string" ? rowState.timerText : "";
    applySavedTimerRowLegendState(manager, row, legend, rowState, cappedStateForRestore);
  }
}

function isSavedTimerRowScrollManagedHidden(row) {
  if (!(row && typeof row.getAttribute === "function")) return false;
  return row.getAttribute("data-scroll-hidden") === "1";
}

function shouldIgnoreSavedTimerRowDisplay(row, rowState) {
  if (!row || !isNonArrayObject(rowState)) return false;
  if (typeof rowState.display !== "string" || rowState.display !== "none") return false;
  var currentDisplay = row.style && typeof row.style.display === "string" ? row.style.display : "";
  if (currentDisplay === "none" && !isSavedTimerRowScrollManagedHidden(row)) {
    return false;
  }
  return true;
}

function applySavedTimerRowVisibilityState(row, rowState) {
  if (!row) return;
  if (shouldIgnoreSavedTimerRowDisplay(row, rowState)) {
    row.style.visibility = typeof rowState.visibility === "string" ? rowState.visibility : "";
    row.style.pointerEvents = typeof rowState.pointerEvents === "string" ? rowState.pointerEvents : "";
    return;
  }
  row.style.display = typeof rowState.display === "string" ? rowState.display : "";
  row.style.visibility = typeof rowState.visibility === "string" ? rowState.visibility : "";
  row.style.pointerEvents = typeof rowState.pointerEvents === "string" ? rowState.pointerEvents : "";
}

function applySavedTimerRowRepeatState(row, rowState) {
  if (!row) return;
  if (typeof rowState.repeat === "string" && rowState.repeat) {
    row.setAttribute("data-capped-repeat", rowState.repeat);
    return;
  }
  row.removeAttribute("data-capped-repeat");
}

function applySavedTimerRowLegendState(manager, row, legend, rowState, cappedStateForRestore) {
  if (!manager || !row || !legend) return;
  if (row.getAttribute("data-capped-repeat") && cappedStateForRestore.isCappedMode) {
    legend.className = manager.getCappedTimerLegendClass(cappedStateForRestore.cappedTargetValue);
  } else if (typeof rowState.legendClass === "string" && rowState.legendClass) {
    legend.className = rowState.legendClass;
  }
  if (typeof rowState.legendText === "string") legend.textContent = rowState.legendText;
  legend.style.fontSize = typeof rowState.legendFontSize === "string" ? rowState.legendFontSize : "";
}

function applySavedDynamicTimerRowsState(manager, container, rowsState, cappedStateForRestore) {
  if (!manager || !container) return;
  var rows = Array.isArray(rowsState) ? rowsState : [];
  container.innerHTML = "";
  for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    var rowElement = createSavedDynamicTimerRow(manager, rows[rowIndex], cappedStateForRestore);
    if (!rowElement) continue;
    container.appendChild(rowElement);
  }
}

function resolveLegacySavedSecondaryRows(saved) {
  var rows = [];
  if (!saved) return rows;
  if (typeof saved.timer_sub_8192 === "string") {
    rows.push({ parent: 32768, child: 8192, time: saved.timer_sub_8192 });
  }
  if (typeof saved.timer_sub_16384 === "string") {
    rows.push({ parent: 32768, child: 16384, time: saved.timer_sub_16384 });
  }
  return rows;
}

function applySavedTimerSubState(manager, saved) {
  if (!manager || !saved) return;
  // Secondary rows are collapsed by default on each load.
  applySecondaryTimerExpandedParentsState(manager, []);
  var secondaryRows = Array.isArray(saved.timer_secondary_rows)
    ? saved.timer_secondary_rows
    : resolveLegacySavedSecondaryRows(saved);
  applySecondaryTimerRowsState(manager, secondaryRows);
}

function applySavedManagerBaseState(manager, saved) {
  manager.setRuntimeScore(Number.isInteger(saved.score) && saved.score >= 0 ? saved.score : 0);
  manager.over = !!saved.over;
  manager.won = !!saved.won;
  manager.keepPlaying = !!saved.keep_playing;
  manager.initialSeed = Number.isFinite(saved.initial_seed) ? Number(saved.initial_seed) : manager.initialSeed;
  manager.seed = Number.isFinite(saved.seed) ? Number(saved.seed) : manager.initialSeed;
  manager.reached32k = !!saved.reached_32k;
  manager.cappedMilestoneCount = Number.isInteger(saved.capped_milestone_count) ? saved.capped_milestone_count : 0;
  manager.capped64Unlocked = isNonArrayObject(saved.capped64_unlocked)
    ? manager.clonePlain(saved.capped64_unlocked)
    : manager.capped64Unlocked;
  assignManagerClientRecordId(
    manager,
    typeof saved.client_record_id === "string" ? saved.client_record_id : ""
  );
  manager.challengeId = typeof saved.challenge_id === "string" && saved.challenge_id ? saved.challenge_id : null;
  manager.hasGameStarted = !!saved.has_game_started;
  manager.sessionSubmitDone = false;
}

function applySavedManagerReplayState(manager, saved) {
  manager.moveHistory = Array.isArray(saved.move_history) ? saved.move_history.slice() : [];
  manager.ipsInputTimes = [];
  manager.ipsInputCount = Number.isInteger(saved.ips_input_count) && saved.ips_input_count >= 0
    ? saved.ips_input_count
    : manager.moveHistory.length;
  if (shouldRestoreSavedStateUndoHistory(manager)) {
    manager.setRuntimeUndoStack(Array.isArray(saved.undo_stack) ? saved.undo_stack.slice() : []);
    manager.setRuntimeRedoStack(Array.isArray(saved.redo_stack) ? saved.redo_stack.slice() : []);
  } else {
    manager.setRuntimeUndoStack([]);
    manager.setRuntimeRedoStack([]);
  }
  manager.replayCompactLog = typeof saved.replay_compact_log === "string" ? saved.replay_compact_log : "";
  manager.sessionReplayV3 = isNonArrayObject(saved.session_replay_v3)
    ? manager.clonePlain(saved.session_replay_v3)
    : manager.sessionReplayV3;
  manager.spawnValueCounts = isNonArrayObject(saved.spawn_value_counts)
    ? manager.clonePlain(saved.spawn_value_counts)
    : {};
  manager.spawnTwos = manager.spawnValueCounts["2"] || 0;
  manager.spawnFours = manager.spawnValueCounts["4"] || 0;
}

function applySavedManagerProgressState(manager, saved) {
  manager.comboStreak = Number.isInteger(saved.combo_streak) ? saved.combo_streak : 0;
  manager.successfulMoveCount = Number.isInteger(saved.successful_move_count) ? saved.successful_move_count : 0;
  manager.undoUsed = Number.isInteger(saved.undo_used) ? saved.undo_used : 0;
  manager.lockConsumedAtMoveCount = Number.isInteger(saved.lock_consumed_at_move_count) ? saved.lock_consumed_at_move_count : -1;
  manager.lockedDirectionTurn = Number.isInteger(saved.locked_direction_turn) ? saved.locked_direction_turn : null;
  manager.lockedDirection = Number.isInteger(saved.locked_direction) ? saved.locked_direction : null;
}

function applySavedManagerTimerState(manager, saved) {
  manager.accumulatedTime = Number.isFinite(saved.duration_ms) && saved.duration_ms >= 0 ? Math.floor(saved.duration_ms) : 0;
  manager.time = manager.accumulatedTime;
  manager.startTime = null;
  manager.timerStatus = 0;
  manager.timerFrozen = !!saved.timer_frozen;
}

function applySavedManagerBoardSnapshotState(manager, saved) {
  manager.initialBoardMatrix =
    (Array.isArray(saved.initial_board_matrix) && saved.initial_board_matrix.length === manager.height)
      ? cloneBoardMatrix(saved.initial_board_matrix)
      : manager.getFinalBoardMatrix();
  manager.replayStartBoardMatrix =
    (Array.isArray(saved.replay_start_board_matrix) && saved.replay_start_board_matrix.length === manager.height)
      ? cloneBoardMatrix(saved.replay_start_board_matrix)
      : cloneBoardMatrix(manager.initialBoardMatrix);
  manager.practiceRestartBoardMatrix =
    (Array.isArray(saved.practice_restart_board_matrix) && saved.practice_restart_board_matrix.length === manager.height)
      ? cloneBoardMatrix(saved.practice_restart_board_matrix)
      : null;
  manager.practiceRestartModeConfig =
    isNonArrayObject(saved.practice_restart_mode_config)
      ? manager.clonePlain(saved.practice_restart_mode_config)
      : null;
}

function applySavedManagerCoreState(manager, saved) {
  if (!manager || !saved) return;
  applySavedManagerBaseState(manager, saved);
  applySavedManagerReplayState(manager, saved);
  applySavedManagerProgressState(manager, saved);
  applySavedManagerTimerState(manager, saved);
  applySavedManagerBoardSnapshotState(manager, saved);
}

function applySavedTimerPostRestoreState(manager, saved, cappedStateForRestore) {
  if (!manager || !saved) return;
  normalizeCappedRepeatLegendClasses(manager, cappedStateForRestore);
  manager.callWindowMethod("updateTimerScroll");
  manager.timerModuleView = saved.timer_module_view === "hidden" ? "hidden" : "timer";
  manager.timerFrozen = !!saved.timer_frozen;
  var timerEl = resolveManagerElementById(manager, "timer");
  if (timerEl) timerEl.textContent = manager.pretty(manager.accumulatedTime);
  if (!(manager.over || manager.won || manager.timerFrozen) && saved.timer_status === 1) {
    manager.startTimer();
  }
}

function applySavedTimerDomState(manager, saved, cappedStateForRestore) {
  if (!manager || !saved) return;
  var documentLike = resolveManagerDocumentLike(manager);
  if (!documentLike) return;
  applySavedTimerFixedRowsState(manager, saved, cappedStateForRestore);
  var capped = resolveManagerElementById(manager, "capped-timer-container");
  if (capped) {
    applySavedDynamicTimerRowsState(manager, capped, saved.timer_dynamic_rows_capped, cappedStateForRestore);
  }
  var overflow = manager.getCappedOverflowContainer(cappedStateForRestore);
  if (overflow) {
    applySavedDynamicTimerRowsState(manager, overflow, saved.timer_dynamic_rows_overflow, cappedStateForRestore);
  }
  applySavedTimerSubState(manager, saved);
}

function resolveSavedTimerFixedRowLegendState(row) {
  var legend = row ? row.querySelector(".timertile") : null;
  return {
    legendText: legend ? (legend.textContent || "") : "",
    legendClass: legend ? (legend.className || "") : "",
    legendFontSize: legend ? (legend.style.fontSize || "") : ""
  };
}

function resolveSavedTimerFixedRowVisibilityState(row) {
  var state = {
    display: row && row.style ? (row.style.display || "") : "",
    visibility: row && row.style ? (row.style.visibility || "") : "",
    pointerEvents: row && row.style ? (row.style.pointerEvents || "") : ""
  };
  if (isSavedTimerRowScrollManagedHidden(row)) {
    state.display = "";
    state.visibility = "";
    state.pointerEvents = "";
  }
  return state;
}

function buildSavedTimerFixedRowEntry(row, timerEl) {
  var legendState = resolveSavedTimerFixedRowLegendState(row);
  var visibilityState = resolveSavedTimerFixedRowVisibilityState(row);
  return {
    display: visibilityState.display,
    visibility: visibilityState.visibility,
    pointerEvents: visibilityState.pointerEvents,
    repeat: row.getAttribute("data-capped-repeat") || "",
    timerText: timerEl.textContent || "",
    legendText: legendState.legendText,
    legendClass: legendState.legendClass,
    legendFontSize: legendState.legendFontSize
  };
}

function collectSavedTimerFixedRowsState(manager) {
  var timerFixedRowsState = {};
  if (!manager) return timerFixedRowsState;
  for (var timerSlotIndex = 0; timerSlotIndex < GameManager.TIMER_SLOT_IDS.length; timerSlotIndex++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[timerSlotIndex]);
    var row = manager.getTimerRowEl(slotId);
    var timerEl = resolveManagerElementById(manager, "timer" + slotId);
    if (!row || !timerEl) continue;
    timerFixedRowsState[slotId] = buildSavedTimerFixedRowEntry(row, timerEl);
  }
  return timerFixedRowsState;
}

function isSavedDynamicTimerRowElement(row) {
  return !!(row && row.classList && row.classList.contains("timer-row-item"));
}

function resolveSavedDynamicTimerRowState(row) {
  var tiles = row.querySelectorAll(".timertile");
  var legend = tiles.length > 0 ? tiles[0] : null;
  var timer = tiles.length > 1 ? tiles[1] : null;
  return {
    repeat: row.getAttribute("data-capped-repeat") || "",
    label: legend ? (legend.textContent || "") : "",
    labelClass: legend ? (legend.className || "") : "",
    labelFontSize: legend ? (legend.style.fontSize || "") : "",
    time: timer ? (timer.textContent || "") : ""
  };
}

function collectSavedDynamicTimerRowsState(container) {
  var dynamicRowsState = [];
  if (!container) return dynamicRowsState;
  for (var rowIndex = 0; rowIndex < container.children.length; rowIndex++) {
    var row = container.children[rowIndex];
    if (!isSavedDynamicTimerRowElement(row)) continue;
    dynamicRowsState.push(resolveSavedDynamicTimerRowState(row));
  }
  return dynamicRowsState;
}

function resolveLegacySecondaryTimerSubStateFromRows(rows) {
  var state = {
    timer_sub_8192: "",
    timer_sub_16384: "",
    timer_sub_visible: false
  };
  var list = Array.isArray(rows) ? rows : [];
  for (var i = 0; i < list.length; i++) {
    var row = list[i];
    if (!isNonArrayObject(row)) continue;
    if (Number(row.parent) !== 32768) continue;
    var child = Number(row.child);
    if (child === 8192) {
      state.timer_sub_8192 = typeof row.time === "string" ? row.time : "";
      if (row.display === "block") state.timer_sub_visible = true;
    } else if (child === 16384) {
      state.timer_sub_16384 = typeof row.time === "string" ? row.time : "";
      if (row.display === "block") state.timer_sub_visible = true;
    }
  }
  return state;
}

function collectSavedTimerSubState(manager, documentLike) {
  if (!documentLike) {
    return {
      timer_secondary_rows: [],
      timer_secondary_expanded_parents: [],
      timer_sub_8192: "",
      timer_sub_16384: "",
      timer_sub_visible: false
    };
  }
  var secondaryRows = collectSecondaryTimerRowsState(manager);
  var expandedParents = collectSecondaryTimerExpandedParents(manager);
  var legacyState = resolveLegacySecondaryTimerSubStateFromRows(secondaryRows);
  return {
    timer_secondary_rows: secondaryRows,
    timer_secondary_expanded_parents: expandedParents,
    timer_sub_8192: legacyState.timer_sub_8192,
    timer_sub_16384: legacyState.timer_sub_16384,
    timer_sub_visible: legacyState.timer_sub_visible
  };
}

function collectSavedTimerDomSnapshotState(manager, documentLike) {
  var timerSnapshot = {
    timerFixedRowsState: {},
    timerDynamicRowsCappedState: [],
    timerDynamicRowsOverflowState: []
  };
  if (!manager || !documentLike) return timerSnapshot;
  timerSnapshot.timerFixedRowsState = collectSavedTimerFixedRowsState(manager);
  var cappedContainer = resolveManagerElementById(manager, "capped-timer-container");
  if (cappedContainer) {
    timerSnapshot.timerDynamicRowsCappedState = collectSavedDynamicTimerRowsState(cappedContainer);
  }
  var overflowContainer = resolveManagerElementById(manager, "capped-timer-overflow-container");
  if (overflowContainer) {
    timerSnapshot.timerDynamicRowsOverflowState = collectSavedDynamicTimerRowsState(overflowContainer);
  }
  return timerSnapshot;
}

function createSavedStateDiagnosticsIndexEntryOptions() {
  return {
    failureOnly: false,
    includeWhenNoActivity: false,
    maxDedupeKeys: 3
  };
}

function resolveSavedStateSecondaryPlacementDiagnosticsEntry(manager) {
  if (!manager) return null;
  var options = createSavedStateDiagnosticsIndexEntryOptions();
  if (typeof manager.resolveSecondaryTimerPlacementDiagnosticsIndexEntry === "function") {
    return manager.resolveSecondaryTimerPlacementDiagnosticsIndexEntry(options);
  }
  if (typeof resolveSecondaryTimerPlacementDiagnosticsIndexEntry === "function") {
    return resolveSecondaryTimerPlacementDiagnosticsIndexEntry(manager, options);
  }
  return null;
}

function isSavedStateDiagnosticsIndexEntry(value) {
  if (!isNonArrayObject(value)) return false;
  if (!(typeof value.key === "string" && value.key)) return false;
  if (!Number.isInteger(Number(value.schemaVersion)) || Number(value.schemaVersion) < 1) return false;
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
      payload: entry.payload
    });
  }
  return normalized;
}

function buildSavedGameStateDiagnosticsPayload(manager) {
  var entries = [];
  var secondaryPlacementEntry = resolveSavedStateSecondaryPlacementDiagnosticsEntry(manager);
  if (secondaryPlacementEntry) entries.push(secondaryPlacementEntry);
  return {
    diagnostics_index_entries: normalizeSavedStateDiagnosticsIndexEntries(entries)
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
    ruleset: manager.ruleset
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
    capped_milestone_count: Number.isInteger(manager.cappedMilestoneCount) ? manager.cappedMilestoneCount : 0,
    capped64_unlocked: manager.capped64Unlocked || null
  };
}

function shouldIncludeReplayStringInSavedPayload(manager, now, saveOptions) {
  if (!manager) return false;
  if (saveOptions && saveOptions.force) return true;
  var lastSavedAt = Number(manager.lastReplayStringSavedAt);
  if (!Number.isFinite(lastSavedAt) || lastSavedAt <= 0) return true;
  return (now - lastSavedAt) >= 8000;
}

function resolveReplayStringForSavedPayload(manager, now, saveOptions) {
  if (!(manager && shouldIncludeReplayStringInSavedPayload(manager, now, saveOptions))) {
    return "";
  }
  var replayString = "";
  try {
    if (typeof serializeReplay === "function") {
      replayString = String(serializeReplay(manager) || "");
    }
  } catch (_err) {
    replayString = "";
  }
  if (replayString) {
    manager.lastReplayStringSavedAt = now;
  }
  return replayString;
}

function buildSavedGameStateReplayStatePayload(manager, now, saveOptions) {
  return {
    move_history: Array.isArray(manager.moveHistory) ? manager.moveHistory : [],
    ips_input_count: Number.isInteger(manager.ipsInputCount) && manager.ipsInputCount >= 0 ? manager.ipsInputCount : 0,
    undo_stack: Array.isArray(manager.undoStack) ? manager.undoStack : [],
    redo_stack: Array.isArray(manager.redoStack) ? manager.redoStack : [],
    replay_compact_log: manager.replayCompactLog || "",
    session_replay_v3: manager.sessionReplayV3 || null,
    replay_string: resolveReplayStringForSavedPayload(manager, now, saveOptions)
  };
}

function buildSavedGameStateTimerCorePayload(manager) {
  var isTerminatedState = !!(manager.over || (manager.won && !manager.keepPlaying));
  return {
    timer_status: isTerminatedState ? 0 : (manager.timerStatus === 1 ? 1 : 0),
    duration_ms: manager.getDurationMs(),
    has_game_started: !!manager.hasGameStarted,
    timer_frozen: isTerminatedState
  };
}

function buildSavedGameStateBasePayload(manager, now, saveOptions) {
  return Object.assign(
    {},
    buildSavedGameStateMetaPayload(manager, now),
    buildSavedGameStateCoreStatePayload(manager),
    buildSavedGameStateReplayStatePayload(manager, now, saveOptions),
    buildSavedGameStateTimerCorePayload(manager)
  );
}

function buildSavedGameStateProgressPayload(manager) {
  return {
    combo_streak: Number.isInteger(manager.comboStreak) ? manager.comboStreak : 0,
    successful_move_count: Number.isInteger(manager.successfulMoveCount) ? manager.successfulMoveCount : 0,
    undo_used: Number.isInteger(manager.undoUsed) ? manager.undoUsed : 0,
    challenge_id: manager.challengeId || null
  };
}

function buildSavedGameStateDirectionLockPayload(manager) {
  return {
    lock_consumed_at_move_count: Number.isInteger(manager.lockConsumedAtMoveCount) ? manager.lockConsumedAtMoveCount : -1,
    locked_direction_turn: Number.isInteger(manager.lockedDirectionTurn) ? manager.lockedDirectionTurn : null,
    locked_direction: Number.isInteger(manager.lockedDirection) ? manager.lockedDirection : null
  };
}

function buildSavedGameStateBoardSnapshotPayload(manager) {
  return {
    initial_board_matrix: manager.initialBoardMatrix ? cloneBoardMatrix(manager.initialBoardMatrix) : manager.getFinalBoardMatrix(),
    replay_start_board_matrix: manager.replayStartBoardMatrix ? cloneBoardMatrix(manager.replayStartBoardMatrix) : null,
    practice_restart_board_matrix: manager.practiceRestartBoardMatrix ? cloneBoardMatrix(manager.practiceRestartBoardMatrix) : null,
    practice_restart_mode_config: manager.practiceRestartModeConfig ? manager.safeClonePlain(manager.practiceRestartModeConfig, null) : null
  };
}

function buildSavedGameStateTimerSnapshotPayload(manager, timerSnapshot, subState) {
  var snapshot = normalizeSavedStateRecordObject(timerSnapshot, {});
  return {
    timer_module_view: manager.getTimerModuleViewMode ? manager.getTimerModuleViewMode() : "timer",
    timer_fixed_rows: snapshot.timerFixedRowsState || {},
    timer_dynamic_rows_capped: Array.isArray(snapshot.timerDynamicRowsCappedState) ? snapshot.timerDynamicRowsCappedState : [],
    timer_dynamic_rows_overflow: Array.isArray(snapshot.timerDynamicRowsOverflowState) ? snapshot.timerDynamicRowsOverflowState : [],
    timer_secondary_rows: Array.isArray(subState.timer_secondary_rows) ? subState.timer_secondary_rows : [],
    timer_secondary_expanded_parents: Array.isArray(subState.timer_secondary_expanded_parents) ? subState.timer_secondary_expanded_parents : [],
    timer_sub_8192: subState.timer_sub_8192,
    timer_sub_16384: subState.timer_sub_16384,
    timer_sub_visible: subState.timer_sub_visible
  };
}

function buildSavedGameStatePayload(manager, now, saveOptions) {
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
    buildSavedGameStateDiagnosticsPayload(manager)
  );
}

function buildPersistSavedPayloadToStoragesCorePayload(stores, persistKey, persistPayload) {
  return {
    storages: stores,
    key: persistKey,
    payload: persistPayload
  };
}

function persistSavedPayloadToStorages(manager, persistKey, persistPayload) {
  if (!manager) return false;
  var stores = getSavedGameStateStorages(manager);
  var coreCallResult = callCoreStorageRuntime(manager, "writeSavedPayloadToStorages", buildPersistSavedPayloadToStoragesCorePayload(stores, persistKey, persistPayload), false);
  return manager.resolveNormalizedCoreValueOrFallback(
    coreCallResult,
    function (persistedByCore) {
      return typeof persistedByCore === "boolean" ? persistedByCore : undefined;
    },
    function () { return persistSavedPayloadToStoragesFallback(stores, persistKey, persistPayload); }
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

function persistSavedPayloadToStoragesFallback(stores, persistKey, persistPayload) {
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
    ruleset: payload.ruleset || manager.ruleset
  };
}

function buildLiteSavedGameStateProgressPayload(payload) {
  return {
    reached_32k: !!payload.reached_32k,
    capped_milestone_count: Number.isInteger(payload.capped_milestone_count) ? payload.capped_milestone_count : 0,
    combo_streak: Number.isInteger(payload.combo_streak) ? payload.combo_streak : 0,
    successful_move_count: Number.isInteger(payload.successful_move_count) ? payload.successful_move_count : 0,
    undo_used: Number.isInteger(payload.undo_used) ? payload.undo_used : 0,
    lock_consumed_at_move_count: Number.isInteger(payload.lock_consumed_at_move_count) ? payload.lock_consumed_at_move_count : -1,
    locked_direction_turn: Number.isInteger(payload.locked_direction_turn) ? payload.locked_direction_turn : null,
    locked_direction: Number.isInteger(payload.locked_direction) ? payload.locked_direction : null,
    challenge_id: payload.challenge_id || null
  };
}

function buildLiteSavedGameStateBoardSnapshotPayload(manager, payload) {
  return {
    initial_board_matrix: Array.isArray(payload.initial_board_matrix)
      ? cloneBoardMatrix(payload.initial_board_matrix)
      : (manager.initialBoardMatrix ? cloneBoardMatrix(manager.initialBoardMatrix) : manager.getFinalBoardMatrix()),
    replay_start_board_matrix: Array.isArray(payload.replay_start_board_matrix)
      ? cloneBoardMatrix(payload.replay_start_board_matrix)
      : (manager.replayStartBoardMatrix ? cloneBoardMatrix(manager.replayStartBoardMatrix) : null),
    practice_restart_board_matrix: Array.isArray(payload.practice_restart_board_matrix)
      ? cloneBoardMatrix(payload.practice_restart_board_matrix)
      : (manager.practiceRestartBoardMatrix ? cloneBoardMatrix(manager.practiceRestartBoardMatrix) : null),
    practice_restart_mode_config: payload.practice_restart_mode_config
      ? manager.safeClonePlain(payload.practice_restart_mode_config, null)
      : (manager.practiceRestartModeConfig ? manager.safeClonePlain(manager.practiceRestartModeConfig, null) : null)
  };
}

function buildLiteSavedGameStateReplayTrimPayload() {
  return {
    move_history: [],
    undo_stack: [],
    replay_compact_log: "",
    session_replay_v3: null
  };
}

function resolveLiteSavedNumericSeed(value, fallback) {
  var seedValue = Number(value);
  if (Number.isFinite(seedValue)) return seedValue;
  var fallbackSeed = Number(fallback);
  return Number.isFinite(fallbackSeed) ? fallbackSeed : 0;
}

function buildLiteSavedGameStateCoreRestorePayload(manager, payload) {
  var source = normalizeSavedStateRecordObject(payload, {});
  var board = Array.isArray(source.board) ? cloneBoardMatrix(source.board) : manager.getFinalBoardMatrix();
  var score = Number(source.score);
  if (!Number.isFinite(score) || score < 0) score = Number(manager.score) || 0;
  var ipsInputCount = Number(source.ips_input_count);
  if (!Number.isFinite(ipsInputCount) || ipsInputCount < 0) {
    ipsInputCount = Array.isArray(source.move_history) ? source.move_history.length : 0;
  }
  return {
    board: board,
    score: Math.floor(score),
    over: !!source.over,
    won: !!source.won,
    keep_playing: !!source.keep_playing,
    initial_seed: resolveLiteSavedNumericSeed(source.initial_seed, manager.initialSeed),
    seed: resolveLiteSavedNumericSeed(source.seed, manager.seed),
    client_record_id: typeof source.client_record_id === "string" && source.client_record_id
      ? source.client_record_id
      : resolveManagerClientRecordId(manager),
    spawn_value_counts: isNonArrayObject(source.spawn_value_counts) ? manager.clonePlain(source.spawn_value_counts) : {},
    ips_input_count: Math.floor(ipsInputCount),
    capped64_unlocked: isNonArrayObject(source.capped64_unlocked)
      ? manager.safeClonePlain(source.capped64_unlocked, null)
      : null
  };
}

function buildLiteSavedGameStateDiagnosticsPayload(payload) {
  if (!isNonArrayObject(payload)) {
    return { diagnostics_index_entries: [] };
  }
  return {
    diagnostics_index_entries: normalizeSavedStateDiagnosticsIndexEntries(payload.diagnostics_index_entries)
  };
}

function buildLiteSavedGameStatePayloadFallback(manager, payload) {
  if (!manager) return null;
  if (!normalizeSavedStateRecordObject(payload, null)) return null;
  var timerStatus = Number(payload.timer_status);
  var isTimerFrozen = !!payload.timer_frozen;
  var timerDurationMs = Number(payload.duration_ms);
  var hasGameStarted = !!payload.has_game_started;
  return Object.assign(
    {},
    buildLiteSavedGameStateMetaPayload(manager, payload),
    buildLiteSavedGameStateCoreRestorePayload(manager, payload),
    buildLiteSavedGameStateProgressPayload(payload),
    buildLiteSavedGameStateBoardSnapshotPayload(manager, payload),
    buildLiteSavedGameStateReplayTrimPayload(),
    buildLiteSavedGameStateDiagnosticsPayload(payload),
    {
      timer_status: timerStatus === 1 ? 1 : 0,
      timer_frozen: isTimerFrozen,
      duration_ms: Number.isFinite(timerDurationMs) ? Math.floor(timerDurationMs) : 0,
      has_game_started: hasGameStarted
    }
  );
}

function buildLiteSavedGameStateCoreCallPayload(manager, payload) {
  if (!manager) return { payload: payload };
  return {
    payload: payload,
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
    over: !!(payload && payload.over),
    won: !!(payload && payload.won),
    keepPlaying: !!(payload && payload.keep_playing),
    spawnValueCounts: payload ? payload.spawn_value_counts : null,
    ipsInputCount: payload ? payload.ips_input_count : null,
    capped64Unlocked: payload ? payload.capped64_unlocked : null
  };
}

function ensureLiteSavedGameStateRestoreFields(manager, litePayload, payloadSource) {
  if (!manager) return null;
  var normalizedLite = normalizeSavedStateRecordObject(litePayload, null);
  if (!normalizedLite) return null;
  return Object.assign(
    {},
    normalizedLite,
    buildLiteSavedGameStateCoreRestorePayload(manager, payloadSource)
  );
}

function buildLiteSavedGameStatePayload(manager, payloadSource) {
  if (!(manager && normalizeSavedStateRecordObject(payloadSource, null))) return null;
  var litePayloadCoreCallResult = callCoreStorageRuntime(
    manager,
    "buildLiteSavedGameStatePayload",
    buildLiteSavedGameStateCoreCallPayload(manager, payloadSource),
    false
  );
  var litePayload = manager.resolveNormalizedCoreValueOrFallback(litePayloadCoreCallResult, function (litePayloadByCore) {
    return manager.isNonArrayObject(litePayloadByCore) ? litePayloadByCore : undefined;
  }, function () { return buildLiteSavedGameStatePayloadFallback(manager, payloadSource); });
  return ensureLiteSavedGameStateRestoreFields(manager, litePayload, payloadSource);
}

function persistSavedPayloadWithLiteFallback(manager, key, liteKey, fullPayload, litePayload) {
  var hasFullPayload = !!normalizeSavedStateRecordObject(fullPayload, null);
  var persisted = false;
  var persistedFull = false;
  if (hasFullPayload) {
    persistedFull = persistSavedPayloadToStorages(manager, key, fullPayload);
    persisted = persistedFull;
    if (!persisted) {
      persisted = persistSavedPayloadToStorages(manager, key, litePayload);
    }
  }
  var litePersisted = persistSavedPayloadToStorages(manager, liteKey, litePayload);
  if (!(persisted || litePersisted)) {
    clearSavedGameState(manager, manager.modeKey);
    if (hasFullPayload) {
      persisted = persistSavedPayloadToStorages(manager, key, litePayload);
    }
    litePersisted = persistSavedPayloadToStorages(manager, liteKey, litePayload);
  }
  return {
    persisted: !!(persisted || litePersisted),
    persistedFull: !!persistedFull
  };
}

function persistSavedGameStatePayload(manager, persistPlan) {
  if (!manager || !persistPlan) return { persisted: false, persistedFull: false };
  var fullPayload = normalizeSavedStateRecordObject(persistPlan.fullPayload, null);
  var litePayloadSource = normalizeSavedStateRecordObject(persistPlan.litePayloadSource, null);
  if (!litePayloadSource) return { persisted: false, persistedFull: false };
  var key = resolveSavedGameStateStorageKey(manager, GameManager.SAVED_GAME_STATE_KEY_PREFIX);
  var liteKey = resolveSavedGameStateStorageKey(manager, GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX);
  var litePayload = buildLiteSavedGameStatePayload(manager, litePayloadSource);
  if (!normalizeSavedStateRecordObject(litePayload, null)) {
    return { persisted: false, persistedFull: false };
  }
  var windowNamePayload = !!persistPlan.preferFullWindowNamePayload && fullPayload
    ? fullPayload
    : litePayload;
  writeWindowNameSavedPayload(manager, manager.modeKey, windowNamePayload);
  return persistSavedPayloadWithLiteFallback(manager, key, liteKey, fullPayload, litePayload);
}

function resolveLatestSavedPayloadForRestore(manager) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  var windowNameSavedCandidate = resolveWindowNameSavedCandidate(manager, windowLike);
  return resolveLatestSavedPayloadForManager(manager, windowNameSavedCandidate);
}

function handleSavedStateRestoreDecisionFailure(manager, restoreDecision) {
  if (!(manager && restoreDecision)) return false;
  if (restoreDecision.canRestore) return false;
  if (restoreDecision.shouldClearSavedState) clearSavedGameState(manager);
  return true;
}

function applySavedStateRestore(manager, saved) {
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

function tryRestoreLatestSavedState(manager) {
  if (!manager) return false;
  var saved = resolveLatestSavedPayloadForRestore(manager);
  if (!manager || !normalizeSavedStateRecordObject(saved, null)) return false;
  var restoreDecision = resolveSavedStateRestoreDecision(manager, saved);
  if (handleSavedStateRestoreDecisionFailure(manager, restoreDecision)) return false;
  var restored = applySavedStateRestore(manager, saved);
  if (restored) {
    rememberSavedStateKnownSavedAt(manager, resolveSavedStateSavedAt(saved));
  }
  return restored;
}

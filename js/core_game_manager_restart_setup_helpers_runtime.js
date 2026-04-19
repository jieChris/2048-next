var NO_X_FORBIDDEN_TILE_OPTIONS = [1024, 2048, 4096, 8192, 16384, 32768];
var DEFAULT_NO_X_FORBIDDEN_TILE = 8192;

function resolveNoXForbiddenTileOption(rawValue) {
  var value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) return null;
  for (var i = 0; i < NO_X_FORBIDDEN_TILE_OPTIONS.length; i++) {
    if (value === NO_X_FORBIDDEN_TILE_OPTIONS[i]) return value;
  }
  return null;
}

function formatNoXForbiddenTileLabel(value) {
  var resolved = resolveNoXForbiddenTileOption(value);
  if (resolved === null) return "";
  var kilo = Math.round(resolved / 1024);
  return String(kilo) + "k";
}

function isNoXModeConfig(modeConfig) {
  if (!isNonArrayObject(modeConfig)) return false;
  var key = String(modeConfig.key || "").toLowerCase();
  if (key.indexOf("nox_") >= 0 || key.indexOf("no_x") >= 0) return true;
  var specialRules = modeConfig.special_rules;
  if (!isNonArrayObject(specialRules)) return false;
  return specialRules.no_x_enabled === true;
}

function resolveNoXForbiddenTileFromModeConfig(modeConfig) {
  if (!isNonArrayObject(modeConfig) || !isNonArrayObject(modeConfig.special_rules)) return null;
  return resolveNoXForbiddenTileOption(modeConfig.special_rules.no_x_target);
}

function ensureNoXSpecialRulesObject(modeConfig) {
  if (!isNonArrayObject(modeConfig)) return {};
  if (!isNonArrayObject(modeConfig.special_rules)) {
    modeConfig.special_rules = {};
  }
  return modeConfig.special_rules;
}

function applyNoXSelectionToModeConfig(modeConfig, forbiddenTile) {
  if (!isNonArrayObject(modeConfig)) return;
  var rules = ensureNoXSpecialRulesObject(modeConfig);
  rules.no_x_enabled = true;
  rules.no_x_target = forbiddenTile;
}

function setNoXSelectionPendingState(manager, pending) {
  if (!manager) return;
  manager.noXSelectionPending = pending === true;
  var documentLike = resolveManagerDocumentLike(manager);
  if (!(documentLike && documentLike.body && typeof documentLike.body.setAttribute === "function")) return;
  if (manager.noXSelectionPending) {
    documentLike.body.setAttribute("data-no-x-selecting", "1");
  } else if (typeof documentLike.body.removeAttribute === "function") {
    documentLike.body.removeAttribute("data-no-x-selecting");
  }
}

function resolveNoXSelectionOverlayId() {
  return "no-x-selection-overlay";
}

function resolveNoXSelectionDocumentLike(manager, windowLike) {
  var documentLike = resolveManagerDocumentLike(manager);
  if (documentLike) return documentLike;
  if (windowLike && typeof windowLike.getDocumentLike === "function") {
    return windowLike.getDocumentLike() || null;
  }
  return null;
}

function removeNoXSelectionOverlay(manager, windowLike) {
  if (!manager) return;
  resolveNoXSelectionDocumentLike(manager, windowLike);
  var overlay = resolveManagerElementById(manager, resolveNoXSelectionOverlayId());
  if (overlay && overlay.parentNode && typeof overlay.parentNode.removeChild === "function") {
    overlay.parentNode.removeChild(overlay);
  }
}

function applyNoXSelectionToManager(manager, forbiddenTile) {
  if (!manager) return;
  var resolved = resolveNoXForbiddenTileOption(forbiddenTile);
  if (resolved === null) return;
  applyNoXSelectionToModeConfig(manager.modeConfig, resolved);
  if (isNonArrayObject(manager.specialRules)) {
    manager.specialRules.no_x_enabled = true;
    manager.specialRules.no_x_target = resolved;
  }
  var windowLike = manager.getWindowLike ? manager.getWindowLike() : null;
  if (windowLike && isNonArrayObject(windowLike.GAME_MODE_CONFIG)) {
    applyNoXSelectionToModeConfig(windowLike.GAME_MODE_CONFIG, resolved);
  }
  manager.noXPendingDefaultTarget = resolved;
  syncNoXHeaderStateAfterSelection(manager);
}

function syncNoXHeaderStateAfterSelection(manager) {
  if (!manager || typeof manager.getWindowLike !== "function") return;
  var windowLike = manager.getWindowLike();
  if (!windowLike) return;
  var playHeaderRuntime = windowLike.CorePlayHeaderRuntime;
  var playHeaderHostRuntime = windowLike.CorePlayHeaderHostRuntime;
  if (!(playHeaderRuntime && typeof playHeaderRuntime.resolvePlayHeaderState === "function")) return;
  if (!(playHeaderHostRuntime && typeof playHeaderHostRuntime.resolvePlayHeaderFromContext === "function")) return;
  playHeaderHostRuntime.resolvePlayHeaderFromContext({
    modeConfig: manager.modeConfig,
    documentLike: resolveManagerDocumentLike(manager),
    resolveHeaderState: playHeaderRuntime.resolvePlayHeaderState
  });
}

function buildNoXSelectionTitle(windowLike) {
  var lang = "";
  try {
    if (windowLike && windowLike.UII18N && typeof windowLike.UII18N.getLanguage === "function") {
      lang = String(windowLike.UII18N.getLanguage() || "").trim().toLowerCase();
    }
  } catch (_err) {}
  if (lang.indexOf("en") === 0) return "Choose forbidden X";
  return "\u9009\u62e9 NO X \u7684 X";
}

function buildNoXSelectionSubtitle(windowLike) {
  var lang = "";
  try {
    if (windowLike && windowLike.UII18N && typeof windowLike.UII18N.getLanguage === "function") {
      lang = String(windowLike.UII18N.getLanguage() || "").trim().toLowerCase();
    }
  } catch (_err) {}
  if (lang.indexOf("en") === 0) return "Click one option. If X appears, game ends.";
  return "\u70b9\u51fb\u9009\u62e9 1k~32k\uff0c\u82e5\u5408\u6210\u51fa X \u6570\uff0c\u672c\u5c40\u7acb\u5373\u7ed3\u675f\u3002";
}

function createNoXSelectionOptionButton(documentLike, manager, value, selectedValue) {
  var button = documentLike.createElement("button");
  button.type = "button";
  button.setAttribute("data-no-x-value", String(value));
  button.textContent = "NO " + String(formatNoXForbiddenTileLabel(value)).toUpperCase();
  button.style.padding = "10px 12px";
  button.style.borderRadius = "8px";
  button.style.border = value === selectedValue ? "2px solid #8f7a66" : "1px solid #c9bfb1";
  button.style.background = value === selectedValue ? "#f3eee6" : "#fff";
  button.style.color = "#5f574f";
  button.style.fontSize = "16px";
  button.style.fontWeight = "700";
  button.style.cursor = "pointer";
  button.style.transition = "all 0.12s ease";
  button.addEventListener("click", function () {
    applyNoXSelectionToManager(manager, value);
    setNoXSelectionPendingState(manager, false);
    removeNoXSelectionOverlay(manager, manager.getWindowLike ? manager.getWindowLike() : null);
  });
  return button;
}

function ensureNoXSelectionOverlayForManager(manager) {
  if (!manager) return;
  var windowLike = manager.getWindowLike ? manager.getWindowLike() : null;
  var documentLike = resolveNoXSelectionDocumentLike(manager, windowLike);
  if (!(documentLike && documentLike.body && typeof documentLike.createElement === "function")) return;
  removeNoXSelectionOverlay(manager, windowLike);

  if (!isNoXModeConfig(manager.modeConfig) || manager.noXSelectionPending !== true) return;

  var selectedValue = resolveNoXForbiddenTileOption(manager.noXPendingDefaultTarget);
  if (selectedValue === null) selectedValue = resolveNoXForbiddenTileFromModeConfig(manager.modeConfig);
  if (selectedValue === null) selectedValue = DEFAULT_NO_X_FORBIDDEN_TILE;

  var overlay = documentLike.createElement("div");
  overlay.id = resolveNoXSelectionOverlayId();
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "4000";
  overlay.style.background = "rgba(32,24,17,0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";

  var panel = documentLike.createElement("div");
  panel.style.width = "min(520px, 96vw)";
  panel.style.background = "#fbf8f1";
  panel.style.border = "1px solid #d8ccbc";
  panel.style.borderRadius = "12px";
  panel.style.boxShadow = "0 16px 38px rgba(0,0,0,0.25)";
  panel.style.padding = "18px 16px 16px";
  panel.style.boxSizing = "border-box";

  var title = documentLike.createElement("div");
  title.textContent = buildNoXSelectionTitle(windowLike);
  title.style.fontSize = "20px";
  title.style.fontWeight = "700";
  title.style.color = "#5a5249";
  title.style.marginBottom = "6px";
  panel.appendChild(title);

  var subtitle = documentLike.createElement("div");
  subtitle.textContent = buildNoXSelectionSubtitle(windowLike);
  subtitle.style.fontSize = "14px";
  subtitle.style.color = "#7b7167";
  subtitle.style.marginBottom = "14px";
  panel.appendChild(subtitle);

  var grid = documentLike.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
  grid.style.gap = "10px";
  for (var i = 0; i < NO_X_FORBIDDEN_TILE_OPTIONS.length; i++) {
    grid.appendChild(createNoXSelectionOptionButton(documentLike, manager, NO_X_FORBIDDEN_TILE_OPTIONS[i], selectedValue));
  }
  panel.appendChild(grid);

  overlay.appendChild(panel);
  documentLike.body.appendChild(overlay);
}

function resolveSetupNoXModeConfig(manager, modeConfig, setupOptions, inputSeed) {
  if (!isNoXModeConfig(modeConfig)) {
    setNoXSelectionPendingState(manager, false);
    removeNoXSelectionOverlay(manager, manager.getWindowLike ? manager.getWindowLike() : null);
    return modeConfig;
  }

  var selectedFromOptions = resolveNoXForbiddenTileOption(
    setupOptions && setupOptions.noXTarget
  );
  var selectedValue = selectedFromOptions;
  if (selectedValue === null) {
    selectedValue = resolveNoXForbiddenTileFromModeConfig(modeConfig);
  }
  if (selectedValue === null) {
    selectedValue = DEFAULT_NO_X_FORBIDDEN_TILE;
  }

  applyNoXSelectionToModeConfig(modeConfig, selectedValue);
  manager.noXPendingDefaultTarget = selectedValue;

  var shouldRequireSelection =
    !(setupOptions && setupOptions.skipNoXSelection === true) &&
    typeof inputSeed === "undefined";
  setNoXSelectionPendingState(manager, shouldRequireSelection);

  return modeConfig;
}

function restartGame(manager) {
  if (!manager) return;
  if (!confirm("\u662f\u5426\u786e\u8ba4\u5f00\u59cb\u65b0\u6e38\u620f\uff1f")) return;
  manager.actuator.continue();
  manager.setRuntimeUndoStack([]);
  manager.setRuntimeRedoStack([]);
  manager.clearSavedGameState(manager.modeKey);
  if (manager.modeKey === "practice" && manager.practiceRestartBoardMatrix) {
    if (shouldClearPracticeBoardOnRestart(manager)) {
      restartWithBoard(
        manager,
        createEmptyPracticeBoardMatrix(manager),
        manager.practiceRestartModeConfig || manager.modeConfig,
        { setPracticeRestartBase: true }
      );
      manager.isTestMode = true;
      return;
    }
    restartWithBoard(
      manager,
      manager.practiceRestartBoardMatrix,
      manager.practiceRestartModeConfig || manager.modeConfig,
      { preservePracticeRestartBase: true }
    );
    manager.isTestMode = true;
    return;
  }
  manager.setup(undefined, { disableStateRestore: true });
}

function createEmptyPracticeBoardMatrix(manager) {
  var width = Number.isInteger(manager && manager.width) && manager.width > 0 ? manager.width : 4;
  var height = Number.isInteger(manager && manager.height) && manager.height > 0 ? manager.height : width;
  var board = [];
  for (var y = 0; y < height; y++) {
    var row = [];
    for (var x = 0; x < width; x++) {
      row.push(0);
    }
    board.push(row);
  }
  return board;
}

function areBoardMatricesEqual(boardA, boardB) {
  if (!Array.isArray(boardA) || !Array.isArray(boardB)) return false;
  if (boardA.length !== boardB.length) return false;
  for (var y = 0; y < boardA.length; y++) {
    var rowA = Array.isArray(boardA[y]) ? boardA[y] : [];
    var rowB = Array.isArray(boardB[y]) ? boardB[y] : [];
    if (rowA.length !== rowB.length) return false;
    for (var x = 0; x < rowA.length; x++) {
      if (Number(rowA[x]) !== Number(rowB[x])) return false;
    }
  }
  return true;
}

function shouldClearPracticeBoardOnRestart(manager) {
  if (!manager || manager.modeKey !== "practice") return false;
  if (manager.hasGameStarted) return false;
  if (!Array.isArray(manager.practiceRestartBoardMatrix)) return false;
  return areBoardMatricesEqual(getFinalBoardMatrix(manager), manager.practiceRestartBoardMatrix);
}

function restartWithSeed(manager, seed, modeConfig) {
  if (!manager) return;
  manager.actuator.continue();
  manager.setup(seed, { modeConfig: modeConfig, disableStateRestore: true }); // Force setup with specific seed
}

function createRestartWithBoardSetupArgs(modeConfig, normalizedOptions) {
  return {
    setupSeed: normalizedOptions.asReplay ? 0 : undefined,
    setupOptions: {
      skipStartTiles: true,
      modeConfig: modeConfig,
      disableStateRestore: true
    }
  };
}

function shouldPersistPracticeRestartBase(manager, normalizedOptions) {
  if (!manager) return false;
  if (manager.modeKey !== "practice") return false;
  if (!(normalizedOptions.setPracticeRestartBase || normalizedOptions.preservePracticeRestartBase)) return false;
  return Array.isArray(manager.initialBoardMatrix) && manager.initialBoardMatrix.length === manager.height;
}

function applyPracticeRestartBaseFromCurrentBoard(manager, modeConfig) {
  if (!manager) return;
  manager.practiceRestartBoardMatrix = cloneBoardMatrix(manager.initialBoardMatrix);
  manager.practiceRestartModeConfig = modeConfig
    ? manager.clonePlain(modeConfig)
    : manager.clonePlain(manager.modeConfig);
}

function restartWithBoard(manager, board, modeConfig, options) {
  if (!manager) return;
  var normalizedOptions = isNonArrayObject(options) ? options : {};
  manager.actuator.continue();
  var setupArgs = createRestartWithBoardSetupArgs(modeConfig, normalizedOptions);
  manager.setup(setupArgs.setupSeed, setupArgs.setupOptions);
  setBoardFromMatrix(manager, board);
  if (manager.modeKey === "practice" && !normalizedOptions.asReplay && typeof applyPracticeSetupTimerStateFromBoard === "function") {
    applyPracticeSetupTimerStateFromBoard(manager, board);
  }
  manager.initialBoardMatrix = getFinalBoardMatrix(manager);
  manager.replayStartBoardMatrix = cloneBoardMatrix(manager.initialBoardMatrix);
  if (shouldPersistPracticeRestartBase(manager, normalizedOptions)) {
    applyPracticeRestartBaseFromCurrentBoard(manager, modeConfig);
  }
  manager.actuate();
}

function resolveFreshSetupSeed(manager) {
  var cryptoLike = null;
  try {
    var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
    cryptoLike = windowLike && (windowLike.crypto || windowLike.msCrypto) ? (windowLike.crypto || windowLike.msCrypto) : null;
  } catch (_errWindowCrypto) {}
  if (!cryptoLike) {
    try {
      cryptoLike = typeof crypto !== "undefined" ? crypto : null;
    } catch (_errGlobalCrypto) {}
  }
  if (cryptoLike && typeof cryptoLike.getRandomValues === "function" && typeof Uint32Array !== "undefined") {
    try {
      var values = new Uint32Array(2);
      cryptoLike.getRandomValues(values);
      return (values[0] & 2097151) * 4294967296 + (values[1] >>> 0);
    } catch (_errRandomValues) {}
  }
  return Math.random();
}

function resolveSetupRankedSessionContext(manager) {
  if (!manager || manager.rankPolicy !== "ranked") return null;
  var windowLike = manager.getWindowLike ? manager.getWindowLike() : null;
  var context = windowLike && windowLike.GAME_CHALLENGE_CONTEXT ? windowLike.GAME_CHALLENGE_CONTEXT : null;
  if (!context || typeof context !== "object" || Array.isArray(context)) return null;
  var modeKey = typeof manager.modeKey === "string" && manager.modeKey
    ? manager.modeKey
    : (typeof manager.mode === "string" ? manager.mode : "");
  var contextModeKey = typeof context.mode_key === "string" ? context.mode_key.trim() : "";
  if (modeKey && contextModeKey && contextModeKey !== modeKey) return null;
  var challengeId = typeof context.id === "string" ? context.id.trim() : "";
  var seed = Math.floor(Number(context.seed));
  var rankedSessionToken = typeof context.ranked_session_token === "string"
    ? context.ranked_session_token.trim()
    : "";
  if (!challengeId) return null;
  if (!Number.isInteger(seed) || seed < 0) return null;
  return {
    id: challengeId,
    mode_key: contextModeKey || modeKey,
    seed: seed,
    ranked_session_token: rankedSessionToken
  };
}

function initializeSetupSeedAndReplayState(manager, inputSeed) {
  if (!manager) return { hasInputSeed: false, rankedSessionContext: null };
  var hasInputSeed = typeof inputSeed !== "undefined";
  var rankedSessionContext = hasInputSeed ? null : resolveSetupRankedSessionContext(manager);
  if (hasInputSeed && typeof manager.setRuntimeReplayIndex === "function") manager.setRuntimeReplayIndex(0);
  manager.initialSeed = hasInputSeed
    ? inputSeed
    : (rankedSessionContext ? rankedSessionContext.seed : resolveFreshSetupSeed(manager));
  manager.seed = manager.initialSeed;
  manager.replayMode = hasInputSeed;
  if (!hasInputSeed) manager.disableSessionSync = false;
  return {
    hasInputSeed: hasInputSeed,
    rankedSessionContext: rankedSessionContext
  };
}

function resolveSetupChallengeId(manager, normalizedOptions, rankedSessionContext) {
  if (!manager) return null;
  var challengeId = typeof normalizedOptions.challengeId === "string" && normalizedOptions.challengeId
    ? normalizedOptions.challengeId
    : null;
  if (!challengeId && rankedSessionContext && rankedSessionContext.id) {
    challengeId = rankedSessionContext.id;
  }
  var windowLike = manager.getWindowLike();
  if (
    !challengeId &&
    windowLike &&
    windowLike.GAME_CHALLENGE_CONTEXT &&
    windowLike.GAME_CHALLENGE_CONTEXT.id
  ) {
    challengeId = windowLike.GAME_CHALLENGE_CONTEXT.id;
  }
  return challengeId;
}

function resolveSetupRankedSessionToken(rankedSessionContext) {
  return rankedSessionContext && typeof rankedSessionContext.ranked_session_token === "string"
    ? rankedSessionContext.ranked_session_token
    : "";
}

function resolveReplayModeTagFromModeKey(modeKey, fallbackMode) {
  var key = typeof modeKey === "string" && modeKey ? modeKey : fallbackMode || "";
  if (key && key.indexOf("capped") !== -1) return "capped";
  if (key && key.indexOf("practice") !== -1) return "practice";
  return "classic";
}

function initializeSetupSessionReplaySnapshot(manager) {
  if (!manager) return;
  manager.sessionReplayV3 = {
    v: 3,
    mode: resolveReplayModeTagFromModeKey(manager.modeKey, manager.mode),
    mode_key: manager.modeKey,
    board_width: manager.width,
    board_height: manager.height,
    ruleset: manager.ruleset,
    undo_enabled: !!manager.modeConfig.undo_enabled,
    mode_family: manager.modeFamily,
    rank_policy: manager.rankPolicy,
    special_rules_snapshot: manager.clonePlain(manager.specialRules || {}),
    challenge_id: manager.challengeId,
    seed: manager.initialSeed,
    actions: []
  };
  manager.sessionReplayV1 = {
    v: 1,
    mode_key: manager.modeKey,
    ruleset: manager.ruleset,
    board_width: manager.width,
    board_height: manager.height,
    start_unix_ms: Date.now(),
    challenge_id: manager.challengeId || null,
    seed: manager.initialSeed,
    init_tiles: [],
    records: [],
    last_event_at_ms: Date.now(),
    supported: true
  };
}

function resolveReplayV1InitTilesFromBoardMatrix(board, width, height, ruleset) {
  if (!Array.isArray(board) || board.length !== height) return null;
  var fib = String(ruleset || "pow2") === "fibonacci";
  var initTiles = [];
  for (var y = 0; y < height; y++) {
    var row = board[y];
    if (!Array.isArray(row) || row.length !== width) return null;
    for (var x = 0; x < width; x++) {
      var value = Number(row[x]);
      if (value === 0) continue;
      if (fib) {
        if (value !== 1 && value !== 2) return null;
      } else if (value !== 2 && value !== 4) {
        return null;
      }
      initTiles.push({ cellIndex: y * width + x, valueBit: fib ? (value === 2 ? 1 : 0) : (value === 4 ? 1 : 0) });
    }
  }
  return initTiles;
}

function syncSetupSessionReplayV1InitTiles(manager) {
  if (!(manager && manager.sessionReplayV1)) return;
  var board = Array.isArray(manager.initialBoardMatrix) ? manager.initialBoardMatrix : manager.getFinalBoardMatrix();
  var initTiles = resolveReplayV1InitTilesFromBoardMatrix(board, manager.width, manager.height, manager.ruleset);
  manager.sessionReplayV1.mode_key = manager.modeKey;
  manager.sessionReplayV1.ruleset = manager.ruleset;
  manager.sessionReplayV1.board_width = manager.width;
  manager.sessionReplayV1.board_height = manager.height;
  manager.sessionReplayV1.challenge_id = manager.challengeId || null;
  manager.sessionReplayV1.seed = manager.initialSeed;
  manager.sessionReplayV1.init_tiles = Array.isArray(initTiles) ? initTiles : [];
  manager.sessionReplayV1.supported = !!initTiles;
}

function resetSetupReplayAndSpawnState(manager) {
  manager.moveHistory = [];
  manager.replayCompactLog = "";
  manager.initialBoardMatrix = null;
  manager.replayStartBoardMatrix = null;
  manager.rankedSessionToken = "";
  if (typeof assignManagerClientRecordId === "function") {
    assignManagerClientRecordId(manager, "");
  } else {
    manager.clientRecordId = "";
  }
  manager.sessionSubmitDone = false;
  manager.needsRankedCheckpointRestore = false;
  manager.rankCheckpointRestorePending = false;
  manager.rankCheckpointRestoreScheduled = false;
  manager.rankCheckpointApplying = false;
  manager.rankCheckpointSaveConflict = "";
  manager.lastRankedCheckpointSignature = "";
  manager.lastRankedCheckpointSavedAt = 0;
  manager.lastRankedCheckpointSaveError = "";
  manager.lastSpawn = null;
  manager.forcedSpawn = null;
}

function resetSetupTimerAndInputState(manager) {
  manager.timerStatus = 0;
  manager.startTime = null;
  manager.timerID = null;
  manager.time = 0;
  manager.accumulatedTime = 0;
  manager.timerFrozen = false;
  manager.pendingMoveInput = null;
  manager.moveInputFlushScheduled = false;
  manager.lastMoveInputAt = 0;
  manager.moveDeadlineAt = null;
}

function resetSetupRuntimeState(manager) {
  if (!manager) return;
  resetSetupReplayAndSpawnState(manager);
  manager.reached32k = false;
  manager.noXTriggered = false;
  manager.noXTriggeredTile = null;
  manager.isTestMode = false;
  manager.cappedMilestoneCount = 0;
  resetSetupTimerAndInputState(manager);
  manager.sessionStartedAt = Date.now();
  manager.hasGameStarted = false;
}

function normalizeTimerModuleViewByCore(viewByCore) {
  if (viewByCore === "hidden") return "hidden";
  return viewByCore === "timer" ? "timer" : undefined;
}

function resolveTimerModuleViewFallback(timerModuleViewMap, mode) {
  var value = isNonArrayObject(timerModuleViewMap) ? timerModuleViewMap[mode] : null;
  return value === "hidden" ? "hidden" : "timer";
}

function resolvePreferredTimerModuleViewForSetup(manager) {
  if (!manager) return "timer";
  var timerModuleViewMap = manager.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  var timerModuleViewCoreCallResult = callCoreStorageRuntime(manager, "readTimerModuleViewForModeFromMap", {
    map: timerModuleViewMap,
    mode: manager.mode
  }, false);
  return manager.resolveNormalizedCoreValueOrFallback(
    timerModuleViewCoreCallResult,
    function (viewByCore) {
      return normalizeTimerModuleViewByCore(viewByCore);
    },
    function () {
      return resolveTimerModuleViewFallback(timerModuleViewMap, manager.mode);
    }
  );
}

function shouldTryRestoreSavedStateInSetup(manager, hasInputSeed, normalizedOptions) {
  if (!manager) return false;
  var skipStartTiles = !!normalizedOptions.skipStartTiles;
  if (hasInputSeed || skipStartTiles || normalizedOptions.disableStateRestore) return false;
  return shouldUseSavedGameState(manager);
}

function hasRankedCheckpointAuthTokenForSetup(manager) {
  if (!manager || manager.rankPolicy !== "ranked") return false;
  var windowLike = manager.getWindowLike ? manager.getWindowLike() : null;
  try {
    var storage = windowLike && windowLike.localStorage ? windowLike.localStorage : null;
    var token = storage && typeof storage.getItem === "function"
      ? String(storage.getItem("2048_auth_token_v1") || "").trim()
      : "";
    return !!token;
  } catch (_err) {
    return false;
  }
}

function hasRankedCheckpointLocalMirrorForSetup(manager) {
  if (!manager || manager.rankPolicy !== "ranked") return false;
  var windowLike = manager.getWindowLike ? manager.getWindowLike() : null;
  var modeKey = typeof manager.modeKey === "string" && manager.modeKey
    ? manager.modeKey
    : (typeof manager.mode === "string" ? manager.mode : "");
  if (!modeKey) return false;
  try {
    var storage = windowLike && windowLike.localStorage ? windowLike.localStorage : null;
    if (!storage || typeof storage.getItem !== "function") return false;
    var raw = storage.getItem("ranked_checkpoint_local_mirror:v1:" + modeKey);
    return typeof raw === "string" && raw.trim().length > 0;
  } catch (_err) {
    return false;
  }
}

function readRankedCheckpointLocalMirrorSavedStateForSetup(manager) {
  if (!manager || manager.rankPolicy !== "ranked") return null;
  if (hasRankedCheckpointAuthTokenForSetup(manager)) return null;
  var windowLike = manager.getWindowLike ? manager.getWindowLike() : null;
  var modeKey = typeof manager.modeKey === "string" && manager.modeKey
    ? manager.modeKey
    : (typeof manager.mode === "string" ? manager.mode : "");
  if (!modeKey) return null;
  try {
    var storage = windowLike && windowLike.localStorage ? windowLike.localStorage : null;
    if (!storage || typeof storage.getItem !== "function") return null;
    var raw = storage.getItem("ranked_checkpoint_local_mirror:v1:" + modeKey);
    if (!(typeof raw === "string" && raw)) return null;
    var parsed = JSON.parse(raw);
    var uiState = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed.ui_state
      : null;
    var savedState = uiState && typeof uiState === "object" && !Array.isArray(uiState)
      ? uiState.saved_state
      : null;
    if (!(savedState && typeof savedState === "object" && !Array.isArray(savedState))) return null;
    if (String(savedState.mode_key || "").trim() !== modeKey) return null;
    return savedState;
  } catch (_err) {
    return null;
  }
}

function shouldScheduleRankedCheckpointRestoreInSetup(manager, hasInputSeed, normalizedOptions) {
  if (!manager || manager.rankPolicy !== "ranked") return false;
  var skipStartTiles = !!normalizedOptions.skipStartTiles;
  if (hasInputSeed || skipStartTiles || normalizedOptions.disableStateRestore) return false;
  return hasRankedCheckpointAuthTokenForSetup(manager) || hasRankedCheckpointLocalMirrorForSetup(manager);
}

function seedInitialTilesAndSnapshotBoard(manager) {
  for (var startIndex = 0; startIndex < manager.startTiles; startIndex++) {
    manager.addRandomTile();
  }
  manager.initialBoardMatrix = manager.getFinalBoardMatrix();
}

function hasStoneCellsForSetup(manager) {
  return !!(manager && manager.grid && Array.isArray(manager.stoneCellsList) && manager.stoneCellsList.length);
}

function ensureStoneValueSetForSetup(manager) {
  if (!manager) return {};
  if (!isNonArrayObject(manager.stoneValueSet)) manager.stoneValueSet = {};
  return manager.stoneValueSet;
}

function normalizeStoneCellForSetup(point, width, height) {
  if (!isNonArrayObject(point)) return null;
  var x = Number(point.x);
  var y = Number(point.y);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  if (x < 0 || x >= width || y < 0 || y >= height) return null;
  return { x: x, y: y };
}

function canPlaceStoneCellForSetup(manager, cell) {
  if (!(manager && cell)) return false;
  if (manager.isBlockedCell(cell.x, cell.y)) return false;
  return manager.grid.cellAvailable(cell);
}

function insertStoneTileForSetup(manager, stoneValueSet, cell, index) {
  if (!(manager && stoneValueSet && cell)) return;
  var value = resolveStoneMarkerValue(index);
  var tile = new Tile(cell, value);
  tile.isStone = true;
  manager.grid.insertTile(tile);
  stoneValueSet[String(value)] = true;
}

function placeStoneTilesForSetup(manager) {
  if (!hasStoneCellsForSetup(manager)) return;
  var stoneValueSet = ensureStoneValueSetForSetup(manager);
  for (var i = 0; i < manager.stoneCellsList.length; i++) {
    var cell = normalizeStoneCellForSetup(manager.stoneCellsList[i], manager.width, manager.height);
    if (!cell) continue;
    if (!canPlaceStoneCellForSetup(manager, cell)) continue;
    insertStoneTileForSetup(manager, stoneValueSet, cell, i);
  }
}

function resolveSetupRestoreAndInitialBoardState(manager, hasInputSeed, normalizedOptions) {
  if (!manager) return { restoredFromSavedState: false };
  var restoredFromSavedState = false;
  var skipStartTiles = !!normalizedOptions.skipStartTiles;
  if (shouldTryRestoreSavedStateInSetup(manager, hasInputSeed, normalizedOptions)) {
    restoredFromSavedState = tryRestoreLatestSavedState(manager);
  }
  if (!restoredFromSavedState && !hasInputSeed && !skipStartTiles && !normalizedOptions.disableStateRestore) {
    var rankedLocalMirrorSavedState = readRankedCheckpointLocalMirrorSavedStateForSetup(manager);
    if (rankedLocalMirrorSavedState && typeof applySavedStateRestore === "function") {
      restoredFromSavedState = applySavedStateRestore(manager, rankedLocalMirrorSavedState);
    }
  }
  manager.needsRankedCheckpointRestore =
    !restoredFromSavedState &&
    shouldScheduleRankedCheckpointRestoreInSetup(manager, hasInputSeed, normalizedOptions);
  manager.rankCheckpointRestorePending = !!manager.needsRankedCheckpointRestore;
  if (!skipStartTiles && !restoredFromSavedState) {
    placeStoneTilesForSetup(manager);
    seedInitialTilesAndSnapshotBoard(manager);
  }
  return { restoredFromSavedState: restoredFromSavedState };
}

function finalizeSetupUiAndStatsState(manager, preferredTimerModuleView, restoredFromSavedState) {
  if (!manager) return;
  refreshSpawnRateDisplay(manager);
  manager.updateUndoUiState();
  manager.notifyUndoSettingsStateChanged();
  manager.applyTimerModuleView(preferredTimerModuleView, true);
  manager.actuate();
  if (restoredFromSavedState) {
    if (!manager.callWindowMethod("cappedTimerReset")) {
      manager.callWindowMethod("updateTimerScroll");
    }
  }
  if (typeof updateItemModeHud === "function") {
    updateItemModeHud(manager);
  }
  if (typeof resetMoveTimeoutDeadline === "function") {
    resetMoveTimeoutDeadline(manager, Date.now());
  }
  if (
    typeof hasMoveTimeoutMode === "function" &&
    hasMoveTimeoutMode(manager) &&
    !manager.replayMode &&
    manager.timerStatus === 0
  ) {
    manager.startTimer();
  }
  if (typeof updateMoveTimeoutHud === "function") {
    updateMoveTimeoutHud(manager, Date.now());
  }
  if (restoredFromSavedState) {
    manager.updateStatsPanel();
  } else {
    manager.updateStatsPanel(0, 0, 0);
  }
  ensureNoXSelectionOverlayForManager(manager);
}

function runSetupStateInitialization(manager, inputSeed, setupOptions) {
  if (!manager) return;
  var normalizedOptions = isNonArrayObject(setupOptions) ? setupOptions : {};
  var seedState = initializeSetupSeedAndReplayState(manager, inputSeed);
  resetSetupRuntimeState(manager);
  manager.challengeId = resolveSetupChallengeId(manager, normalizedOptions, seedState.rankedSessionContext);
  manager.rankedSessionToken = resolveSetupRankedSessionToken(seedState.rankedSessionContext);
  initializeSetupSessionReplaySnapshot(manager);
  initializeTimerMilestones(manager);
  resetRoundStatsState(manager);
  resetTimerUiForSetup(manager);
  var preferredTimerModuleView = resolvePreferredTimerModuleViewForSetup(manager);
  var restoreState = resolveSetupRestoreAndInitialBoardState(
    manager,
    seedState.hasInputSeed,
    normalizedOptions
  );
  syncSetupSessionReplayV1InitTiles(manager);
  finalizeSetupUiAndStatsState(manager, preferredTimerModuleView, restoreState.restoredFromSavedState);
  try {
    var windowLike = manager.getWindowLike ? manager.getWindowLike() : null;
    if (
      manager.needsRankedCheckpointRestore &&
      windowLike &&
      windowLike.OnlineLeaderboardRuntime &&
      typeof windowLike.OnlineLeaderboardRuntime.scheduleRankedCheckpointRestore === "function"
    ) {
      windowLike.OnlineLeaderboardRuntime.scheduleRankedCheckpointRestore(manager, { reason: "setup" });
    }
  } catch (_errCheckpointRestore) {}
}

function resolveGlobalSetupModeConfig(manager) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  var modeConfig = windowLike ? windowLike.GAME_MODE_CONFIG : null;
  if (!isNonArrayObject(modeConfig)) return null;
  try {
    return manager.clonePlain(modeConfig);
  } catch (_err) {
    return null;
  }
}

function resolveSetupModeConfig(manager, setupOptions, detectedMode) {
  var optionConfig = setupOptions && setupOptions.modeConfig;
  var globalModeConfig = resolveGlobalSetupModeConfig(manager);
  return optionConfig || globalModeConfig || manager.resolveModeConfig(detectedMode);
}

function resolveSingleModePageLockWindowLike(manager) {
  return manager && typeof manager.getWindowLike === "function"
    ? manager.getWindowLike()
    : null;
}

function resolveSingleModePageLocalStorage(manager, windowLike) {
  if (manager && typeof manager.getWebStorageByName === "function") {
    var byManager = manager.getWebStorageByName("localStorage");
    if (byManager) return byManager;
  }
  try {
    return windowLike && windowLike.localStorage ? windowLike.localStorage : null;
  } catch (_err) {
    return null;
  }
}

function resolveSingleModePageSessionStorage(windowLike) {
  try {
    return windowLike && windowLike.sessionStorage ? windowLike.sessionStorage : null;
  } catch (_err) {
    return null;
  }
}

function readSingleModePageStorageItemSafe(storageLike, key) {
  if (!(storageLike && typeof storageLike.getItem === "function")) return null;
  try {
    return storageLike.getItem(key);
  } catch (_err) {
    return null;
  }
}

function writeSingleModePageStorageItemSafe(storageLike, key, value) {
  if (!(storageLike && typeof storageLike.setItem === "function")) return false;
  try {
    storageLike.setItem(key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

function removeSingleModePageStorageItemSafe(storageLike, key) {
  if (!(storageLike && typeof storageLike.removeItem === "function")) return false;
  try {
    storageLike.removeItem(key);
    return true;
  } catch (_err) {
    return false;
  }
}

function resolveSingleModePageLockKeyPrefix() {
  return typeof GameManager.SINGLE_MODE_PAGE_LOCK_KEY_PREFIX === "string" &&
    GameManager.SINGLE_MODE_PAGE_LOCK_KEY_PREFIX
    ? GameManager.SINGLE_MODE_PAGE_LOCK_KEY_PREFIX
    : "playModeSinglePageLock:v1:";
}

function resolveSingleModePageTabIdSessionKey() {
  return typeof GameManager.SINGLE_MODE_PAGE_TAB_ID_SESSION_KEY === "string" &&
    GameManager.SINGLE_MODE_PAGE_TAB_ID_SESSION_KEY
    ? GameManager.SINGLE_MODE_PAGE_TAB_ID_SESSION_KEY
    : "playModeSinglePageTabId:v1";
}

function resolveSingleModePageLockTtlMs() {
  var value = Number(GameManager.SINGLE_MODE_PAGE_LOCK_TTL_MS);
  if (!Number.isFinite(value) || value <= 0) return 12000;
  return Math.floor(value);
}

function resolveSingleModePageHeartbeatMs() {
  var value = Number(GameManager.SINGLE_MODE_PAGE_LOCK_HEARTBEAT_MS);
  if (!Number.isFinite(value) || value <= 0) return 3000;
  return Math.floor(value);
}

function resolveSingleModePageDuplicateMessage() {
  return typeof GameManager.SINGLE_MODE_PAGE_DUPLICATE_MESSAGE === "string" &&
    GameManager.SINGLE_MODE_PAGE_DUPLICATE_MESSAGE
    ? GameManager.SINGLE_MODE_PAGE_DUPLICATE_MESSAGE
    : "\u975e\u6cd5\u64cd\u4f5c\uff1a\u4e00\u4e2a\u6a21\u5f0f\u53ea\u80fd\u5f00\u4e00\u4e2a\u9875\u9762";
}

function resolveSingleModePageDuplicateRedirectUrl() {
  return typeof GameManager.SINGLE_MODE_PAGE_DUPLICATE_REDIRECT_URL === "string" &&
    GameManager.SINGLE_MODE_PAGE_DUPLICATE_REDIRECT_URL
    ? GameManager.SINGLE_MODE_PAGE_DUPLICATE_REDIRECT_URL
    : "modes.html";
}

function resolveSingleModePageLockKey(modeKey) {
  return resolveSingleModePageLockKeyPrefix() + String(modeKey || "");
}

function createSingleModePageLockToken() {
  return "lock_" + Math.random().toString(36).slice(2, 12) + "_" + Date.now().toString(36);
}

function resolveSingleModePageWindowInstanceId(windowLike) {
  if (
    windowLike &&
    typeof windowLike.__playSinglePageWindowInstanceId === "string" &&
    windowLike.__playSinglePageWindowInstanceId
  ) {
    return windowLike.__playSinglePageWindowInstanceId;
  }
  var instanceId = "win_" + Math.random().toString(36).slice(2, 12) + "_" + Date.now().toString(36);
  if (windowLike) {
    windowLike.__playSinglePageWindowInstanceId = instanceId;
  }
  return instanceId;
}

function normalizeSingleModePageLockRecord(value) {
  var source = isNonArrayObject(value) ? value : null;
  if (!source) return null;
  var tabId = typeof source.tab_id === "string" ? source.tab_id : "";
  var token = typeof source.token === "string" ? source.token : "";
  var modeKey = typeof source.mode_key === "string" ? source.mode_key : "";
  var instanceId = typeof source.instance_id === "string" ? source.instance_id : "";
  var updatedAt = Math.floor(Number(source.updated_at) || 0);
  if (!(tabId && token && modeKey && updatedAt > 0)) return null;
  return {
    tabId: tabId,
    token: token,
    modeKey: modeKey,
    instanceId: instanceId,
    updatedAt: updatedAt
  };
}

function readSingleModePageLockRecord(storageLike, lockKey) {
  var raw = readSingleModePageStorageItemSafe(storageLike, lockKey);
  if (!(typeof raw === "string" && raw)) return null;
  var parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (_errParse) {
    return null;
  }
  return normalizeSingleModePageLockRecord(parsed);
}

function writeSingleModePageLockRecord(storageLike, lockKey, tabId, token, modeKey, instanceId, nowMs) {
  var payload = {
    tab_id: tabId,
    token: token,
    mode_key: modeKey,
    instance_id: instanceId,
    updated_at: nowMs
  };
  var serialized = "";
  try {
    serialized = JSON.stringify(payload);
  } catch (_errJson) {
    serialized = "";
  }
  if (!serialized) return false;
  return writeSingleModePageStorageItemSafe(storageLike, lockKey, serialized);
}

function isSingleModePageLockOwnedBy(record, tabId, token, instanceId) {
  if (!record) return false;
  if (record.tabId !== tabId || record.token !== token) return false;
  if (!(typeof record.instanceId === "string" && record.instanceId)) return true;
  return record.instanceId === instanceId;
}

function isSingleModePageLockFresh(record, nowMs, ttlMs) {
  if (!record) return false;
  return (nowMs - record.updatedAt) <= ttlMs;
}

function resolveSingleModePageTabId(windowLike) {
  if (
    windowLike &&
    typeof windowLike.__playSinglePageTabId === "string" &&
    windowLike.__playSinglePageTabId
  ) {
    return windowLike.__playSinglePageTabId;
  }
  var sessionStorageLike = resolveSingleModePageSessionStorage(windowLike);
  var sessionKey = resolveSingleModePageTabIdSessionKey();
  var tabId = readSingleModePageStorageItemSafe(sessionStorageLike, sessionKey);
  if (!(typeof tabId === "string" && tabId)) {
    tabId = "tab_" + Math.random().toString(36).slice(2, 12) + "_" + Date.now().toString(36);
    writeSingleModePageStorageItemSafe(sessionStorageLike, sessionKey, tabId);
  }
  if (!(typeof tabId === "string" && tabId)) {
    tabId = "tab_" + Math.random().toString(36).slice(2, 12) + "_" + Date.now().toString(36);
  }
  if (windowLike) {
    windowLike.__playSinglePageTabId = tabId;
  }
  return tabId;
}

function releaseSingleModePageLockStateObject(lockState) {
  if (!lockState) return;
  var windowLike = lockState.windowLike;
  if (lockState.heartbeatId && windowLike && typeof windowLike.clearInterval === "function") {
    windowLike.clearInterval(lockState.heartbeatId);
    lockState.heartbeatId = 0;
  }
  if (windowLike && typeof windowLike.removeEventListener === "function") {
    if (typeof lockState.beforeUnloadHandler === "function") {
      windowLike.removeEventListener("beforeunload", lockState.beforeUnloadHandler);
    }
    if (typeof lockState.pageHideHandler === "function") {
      windowLike.removeEventListener("pagehide", lockState.pageHideHandler);
    }
    if (typeof lockState.storageHandler === "function") {
      windowLike.removeEventListener("storage", lockState.storageHandler);
    }
  }
  var latest = readSingleModePageLockRecord(lockState.storageLike, lockState.lockKey);
  if (isSingleModePageLockOwnedBy(latest, lockState.tabId, lockState.token, lockState.instanceId)) {
    removeSingleModePageStorageItemSafe(lockState.storageLike, lockState.lockKey);
  }
  if (windowLike && windowLike.__playSinglePageModeLockState === lockState) {
    windowLike.__playSinglePageModeLockState = null;
  }
}

function releaseSingleModePageLock(manager) {
  if (!manager) return;
  if (manager.singleModePageLockState) {
    releaseSingleModePageLockStateObject(manager.singleModePageLockState);
    manager.singleModePageLockState = null;
  }
}

function shouldSkipSingleModePageLock(manager) {
  if (!manager) return true;
  var windowLike = resolveSingleModePageLockWindowLike(manager);
  var pathname = "";
  try {
    pathname = windowLike && windowLike.location && typeof windowLike.location.pathname === "string"
      ? windowLike.location.pathname
      : "";
  } catch (_errPathname) {
    pathname = "";
  }
  var normalizedPath = String(pathname || "").toLowerCase();
  return (
    normalizedPath.indexOf("replay.html") !== -1 ||
    normalizedPath.indexOf("practice_board.html") !== -1
  );
}

function ensureSingleModePageLock(manager) {
  if (!manager) return true;
  if (shouldSkipSingleModePageLock(manager)) {
    releaseSingleModePageLock(manager);
    return true;
  }
  var modeKey = String(manager.modeKey || manager.mode || "");
  if (!modeKey) return true;
  var windowLike = resolveSingleModePageLockWindowLike(manager);
  var storageLike = resolveSingleModePageLocalStorage(manager, windowLike);
  if (!storageLike) return true;

  var managerState = manager.singleModePageLockState;
  if (managerState && managerState.modeKey === modeKey) return true;
  if (managerState && managerState.modeKey !== modeKey) {
    releaseSingleModePageLock(manager);
  }

  var windowState = windowLike && isNonArrayObject(windowLike.__playSinglePageModeLockState)
    ? windowLike.__playSinglePageModeLockState
    : null;
  if (windowState && windowState.modeKey === modeKey) {
    manager.singleModePageLockState = windowState;
    return true;
  }
  if (windowState && windowState.modeKey !== modeKey) {
    releaseSingleModePageLockStateObject(windowState);
  }

  var lockKey = resolveSingleModePageLockKey(modeKey);
  var ttlMs = resolveSingleModePageLockTtlMs();
  var heartbeatMs = resolveSingleModePageHeartbeatMs();
  var nowMs = Date.now();
  var tabId = resolveSingleModePageTabId(windowLike);
  var instanceId = resolveSingleModePageWindowInstanceId(windowLike);
  var token = createSingleModePageLockToken();

  var currentRecord = readSingleModePageLockRecord(storageLike, lockKey);
  if (
    currentRecord &&
    currentRecord.instanceId !== instanceId &&
    isSingleModePageLockFresh(currentRecord, nowMs, ttlMs)
  ) {
    return false;
  }

  if (!writeSingleModePageLockRecord(storageLike, lockKey, tabId, token, modeKey, instanceId, nowMs)) {
    return true;
  }

  var confirmedRecord = readSingleModePageLockRecord(storageLike, lockKey);
  if (!isSingleModePageLockOwnedBy(confirmedRecord, tabId, token, instanceId)) {
    return false;
  }

  var lockState = {
    windowLike: windowLike,
    storageLike: storageLike,
    lockKey: lockKey,
    modeKey: modeKey,
    tabId: tabId,
    token: token,
    instanceId: instanceId,
    heartbeatId: 0,
    beforeUnloadHandler: null,
    pageHideHandler: null,
    storageHandler: null,
    conflictHandled: false
  };

  function releaseCurrentState() {
    releaseSingleModePageLockStateObject(lockState);
    if (manager.singleModePageLockState === lockState) {
      manager.singleModePageLockState = null;
    }
  }

  function handleOwnershipConflict() {
    if (lockState.conflictHandled) return;
    lockState.conflictHandled = true;
    releaseCurrentState();
    handleSingleModePageDuplicate(manager);
  }

  function heartbeatLock() {
    var latest = readSingleModePageLockRecord(storageLike, lockKey);
    if (!isSingleModePageLockOwnedBy(latest, tabId, token, instanceId)) {
      handleOwnershipConflict();
      return;
    }
    writeSingleModePageLockRecord(storageLike, lockKey, tabId, token, modeKey, instanceId, Date.now());
  }

  function onStorageChanged(eventLike) {
    if (!eventLike || eventLike.key !== lockKey) return;
    var latest = readSingleModePageLockRecord(storageLike, lockKey);
    if (!isSingleModePageLockOwnedBy(latest, tabId, token, instanceId)) {
      handleOwnershipConflict();
    }
  }

  lockState.beforeUnloadHandler = releaseCurrentState;
  lockState.pageHideHandler = releaseCurrentState;
  lockState.storageHandler = onStorageChanged;

  if (windowLike && typeof windowLike.addEventListener === "function") {
    windowLike.addEventListener("beforeunload", lockState.beforeUnloadHandler);
    windowLike.addEventListener("pagehide", lockState.pageHideHandler);
    windowLike.addEventListener("storage", lockState.storageHandler);
  }
  if (windowLike && typeof windowLike.setInterval === "function") {
    lockState.heartbeatId = windowLike.setInterval(heartbeatLock, heartbeatMs);
  }

  if (windowLike) {
    windowLike.__playSinglePageModeLockState = lockState;
  }
  manager.singleModePageLockState = lockState;
  return true;
}

function handleSingleModePageDuplicate(manager) {
  var windowLike = resolveSingleModePageLockWindowLike(manager);
  var message = resolveSingleModePageDuplicateMessage();
  if (windowLike && typeof windowLike.alert === "function") {
    windowLike.alert(message);
  }
  var locationLike = windowLike && windowLike.location ? windowLike.location : null;
  if (locationLike) {
    locationLike.href = resolveSingleModePageDuplicateRedirectUrl();
  }
}

function setupGame(manager, inputSeed, options) {
  if (!manager) return;
  var setupOptions = isNonArrayObject(options) ? options : {};
  var detectedMode = detectMode(manager);
  var resolvedModeConfig = resolveSetupModeConfig(manager, setupOptions, detectedMode);
  var cfg = manager.normalizeModeConfig(resolvedModeConfig && resolvedModeConfig.key, resolvedModeConfig);
  cfg = resolveSetupNoXModeConfig(manager, cfg, setupOptions, inputSeed);
  applySetupModeConfig(manager, cfg);
  if (!ensureSingleModePageLock(manager)) {
    handleSingleModePageDuplicate(manager);
    return;
  }
  manager.setRuntimeGrid(new Grid(manager.width, manager.height));
  manager.setRuntimeScore(0);
  manager.over = false;
  manager.won = false;
  manager.keepPlaying = false;
  runSetupStateInitialization(manager, inputSeed, setupOptions);
}

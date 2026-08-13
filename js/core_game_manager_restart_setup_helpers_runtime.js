var restartRandomIdFallbackCounter = 0;

function resolveCoreNoXSelectionRuntime(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  if (windowLike && windowLike.CoreNoXSelectionRuntime) {
    return windowLike.CoreNoXSelectionRuntime;
  }
  if (typeof CoreNoXSelectionRuntime !== "undefined" && CoreNoXSelectionRuntime) {
    return CoreNoXSelectionRuntime;
  }
  return null;
}

function resolveCoreRankedCheckpointLocalMirrorSetupRuntime(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  if (windowLike && windowLike.CoreRankedCheckpointLocalMirrorSetupRuntime) {
    return windowLike.CoreRankedCheckpointLocalMirrorSetupRuntime;
  }
  if (
    typeof CoreRankedCheckpointLocalMirrorSetupRuntime !== "undefined" &&
    CoreRankedCheckpointLocalMirrorSetupRuntime
  ) {
    return CoreRankedCheckpointLocalMirrorSetupRuntime;
  }
  return null;
}

function resolveCoreRankedSessionSetupContextRuntime(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  if (windowLike && windowLike.CoreRankedSessionSetupContextRuntime) {
    return windowLike.CoreRankedSessionSetupContextRuntime;
  }
  if (
    typeof CoreRankedSessionSetupContextRuntime !== "undefined" &&
    CoreRankedSessionSetupContextRuntime
  ) {
    return CoreRankedSessionSetupContextRuntime;
  }
  return null;
}

function resolveCoreSessionReplaySnapshotRuntime(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  if (windowLike && windowLike.CoreSessionReplaySnapshotRuntime) {
    return windowLike.CoreSessionReplaySnapshotRuntime;
  }
  if (typeof CoreSessionReplaySnapshotRuntime !== "undefined" && CoreSessionReplaySnapshotRuntime) {
    return CoreSessionReplaySnapshotRuntime;
  }
  return null;
}

function resolveCoreSetupRestoreInitialBoardStateRuntime(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  if (windowLike && windowLike.CoreSetupRestoreInitialBoardStateRuntime) {
    return windowLike.CoreSetupRestoreInitialBoardStateRuntime;
  }
  if (
    typeof CoreSetupRestoreInitialBoardStateRuntime !== "undefined" &&
    CoreSetupRestoreInitialBoardStateRuntime
  ) {
    return CoreSetupRestoreInitialBoardStateRuntime;
  }
  return null;
}

function resolveCoreSetupStateInitializationRuntime(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  if (windowLike && windowLike.CoreSetupStateInitializationRuntime) {
    return windowLike.CoreSetupStateInitializationRuntime;
  }
  if (typeof CoreSetupStateInitializationRuntime !== "undefined" && CoreSetupStateInitializationRuntime) {
    return CoreSetupStateInitializationRuntime;
  }
  return null;
}

function resolveCoreSetupGameRuntime(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  if (windowLike && windowLike.CoreSetupGameRuntime) return windowLike.CoreSetupGameRuntime;
  return typeof CoreSetupGameRuntime !== "undefined" && CoreSetupGameRuntime ? CoreSetupGameRuntime : null;
}

function resolveCoreResetSetupReplayAndSpawnStateRuntime(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  if (windowLike && windowLike.CoreResetSetupReplayAndSpawnStateRuntime) {
    return windowLike.CoreResetSetupReplayAndSpawnStateRuntime;
  }
  if (
    typeof CoreResetSetupReplayAndSpawnStateRuntime !== "undefined" &&
    CoreResetSetupReplayAndSpawnStateRuntime
  ) {
    return CoreResetSetupReplayAndSpawnStateRuntime;
  }
  return null;
}

function resolveCoreRestartGameRuntime(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  if (windowLike && windowLike.CoreRestartGameRuntime) {
    return windowLike.CoreRestartGameRuntime;
  }
  if (typeof CoreRestartGameRuntime !== "undefined" && CoreRestartGameRuntime) {
    return CoreRestartGameRuntime;
  }
  return null;
}

function ensureNoXSelectionOverlayForManager(manager) {
  var runtime = resolveCoreNoXSelectionRuntime(manager);
  if (runtime && typeof runtime.ensureNoXSelectionOverlayForManager === "function") {
    runtime.ensureNoXSelectionOverlayForManager(manager);
  }
}

function resolveSetupNoXModeConfig(manager, modeConfig, setupOptions, inputSeed) {
  var runtime = resolveCoreNoXSelectionRuntime(manager);
  if (runtime && typeof runtime.resolveSetupNoXModeConfig === "function") {
    return runtime.resolveSetupNoXModeConfig(manager, modeConfig, setupOptions, inputSeed);
  }
  return modeConfig;
}

function normalizeRestartConfirmLanguagePrefix(value) {
  var normalized = String(value || "").toLowerCase();
  if (normalized.indexOf("en") === 0) return "en";
  if (normalized.indexOf("zh") === 0) return "zh";
  return "";
}

function resolveRestartConfirmLanguageFallback(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  try {
    var i18n = windowLike && windowLike.UII18N;
    if (i18n && typeof i18n.getLanguage === "function") {
      var fromI18n = normalizeRestartConfirmLanguagePrefix(i18n.getLanguage());
      if (fromI18n) return fromI18n;
    }
  } catch (_errI18n) {}
  try {
    var storageLike = windowLike && windowLike.localStorage ? windowLike.localStorage : null;
    var fromStorage = storageLike && typeof storageLike.getItem === "function" ? storageLike.getItem("ui_language_v1") : "";
    var storageLang = normalizeRestartConfirmLanguagePrefix(fromStorage);
    if (storageLang) return storageLang;
  } catch (_errStorage) {}
  try {
    var documentLike = typeof resolveManagerDocumentLike === "function" ? resolveManagerDocumentLike(manager) : null;
    var root = documentLike && documentLike.documentElement ? documentLike.documentElement : null;
    var fromRoot = root
      ? (
          (typeof root.getAttribute === "function" && (root.getAttribute("data-ui-lang") || root.getAttribute("lang"))) ||
          root.lang
        )
      : "";
    var rootLang = normalizeRestartConfirmLanguagePrefix(fromRoot);
    if (rootLang) return rootLang;
  } catch (_errRoot) {}
  return "zh";
}

function resolveRestartConfirmLanguage(manager) {
  var runtime = resolveCoreRestartGameRuntime(manager);
  if (runtime && typeof runtime.resolveRestartConfirmLanguage === "function") {
    var language = runtime.resolveRestartConfirmLanguage(manager);
    return language === "en" ? "en" : "zh";
  }
  return resolveRestartConfirmLanguageFallback(manager);
}

function resolveRestartConfirmMessage(manager) {
  return resolveRestartConfirmLanguage(manager) === "en"
    ? "Start a new game?"
    : "\u662f\u5426\u786e\u8ba4\u5f00\u59cb\u65b0\u6e38\u620f\uff1f";
}

function resolveRestartConfirmOperation() {
  if (typeof window !== "undefined" && window && typeof window.confirm === "function") {
    return window.confirm.bind(window);
  }
  if (typeof confirm === "function") {
    if (typeof globalThis !== "undefined" && globalThis && globalThis.confirm === confirm) {
      return confirm.bind(globalThis);
    }
    return confirm;
  }
  return function () { return false; };
}

function resolveRestartConfirmOperationAsync() {
  if (
    typeof window !== "undefined" &&
    window &&
    window.GameDialog &&
    typeof window.GameDialog.confirm === "function"
  ) {
    return function (message) {
      return window.GameDialog.confirm(message, { kind: "confirm" });
    };
  }
  var confirmRestart = resolveRestartConfirmOperation();
  return function (message) {
    return Promise.resolve(confirmRestart(message));
  };
}

function restartGame(manager) {
  var runtime = resolveCoreRestartGameRuntime(manager);
  if (runtime && typeof runtime.restartGameAsync === "function") {
    return runtime.restartGameAsync(manager, {
      confirmRestartAsync: resolveRestartConfirmOperationAsync(),
      resolveRestartConfirmMessage: resolveRestartConfirmMessage,
      shouldClearPracticeBoardOnRestart: shouldClearPracticeBoardOnRestart,
      createEmptyPracticeBoardMatrix: createEmptyPracticeBoardMatrix,
      restartWithBoard: restartWithBoard
    });
  }
  if (runtime && typeof runtime.restartGame === "function") {
    runtime.restartGame(manager, {
      confirmRestart: resolveRestartConfirmOperation(),
      resolveRestartConfirmMessage: resolveRestartConfirmMessage,
      shouldClearPracticeBoardOnRestart: shouldClearPracticeBoardOnRestart,
      createEmptyPracticeBoardMatrix: createEmptyPracticeBoardMatrix,
      restartWithBoard: restartWithBoard
    });
  }
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
  var setupOptions = {
    skipStartTiles: true,
    modeConfig: modeConfig,
    disableStateRestore: true
  };
  if (normalizedOptions.skipNoXSelection === true) setupOptions.skipNoXSelection = true;
  if (normalizedOptions.noXTarget !== undefined) setupOptions.noXTarget = normalizedOptions.noXTarget;
  return {
    setupSeed: normalizedOptions.asReplay ? 0 : undefined,
    setupOptions: setupOptions
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
  if (manager.rankedSetupBlockedUntilSessionReady) return;
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

function normalizeFreshSetupSeedValue(value) {
  var seed = Math.floor(Number(value));
  return Number.isSafeInteger(seed) && seed >= 0 ? seed : null;
}

function resolveRestartCryptoRandomRuntime() {
  if (typeof CoreCryptoRandomRuntime !== "undefined" && CoreCryptoRandomRuntime) {
    return CoreCryptoRandomRuntime;
  }
  return null;
}

function createRestartRandomId(prefix, length) {
  var runtime = resolveRestartCryptoRandomRuntime();
  if (runtime && typeof runtime.randomId === "function") {
    return runtime.randomId(prefix, { length: length || 10 });
  }
  restartRandomIdFallbackCounter = (restartRandomIdFallbackCounter + 1) >>> 0;
  return String(prefix || "id") + "_" + Date.now().toString(36) + "_" +
    restartRandomIdFallbackCounter.toString(36).padStart(length || 10, "0");
}

function resolveFreshSetupCryptoLike(manager) {
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
  return cryptoLike;
}

function resolveCryptoFreshSetupSeed(manager) {
  var runtime = resolveRestartCryptoRandomRuntime();
  if (runtime && typeof runtime.randomSeed === "function") {
    try {
      return normalizeFreshSetupSeedValue(runtime.randomSeed());
    } catch (_errRuntimeRandomSeed) {}
  }
  var cryptoLike = resolveFreshSetupCryptoLike(manager);
  if (cryptoLike && typeof cryptoLike.getRandomValues === "function" && typeof Uint32Array !== "undefined") {
    try {
      var values = new Uint32Array(2);
      cryptoLike.getRandomValues(values);
      return normalizeFreshSetupSeedValue((values[0] & 2097151) * 4294967296 + (values[1] >>> 0));
    } catch (_errRandomValues) {}
  }
  return null;
}

function resolveFreshSetupPerformanceNow(manager) {
  var performanceLike = null;
  try {
    var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
    performanceLike = windowLike && windowLike.performance ? windowLike.performance : null;
  } catch (_errWindowPerformance) {}
  if (!performanceLike) {
    try {
      performanceLike = typeof performance !== "undefined" ? performance : null;
    } catch (_errGlobalPerformance) {}
  }
  if (performanceLike && typeof performanceLike.now === "function") {
    try {
      return Math.max(0, Math.floor(performanceLike.now() * 1000));
    } catch (_errPerformanceNow) {}
  }
  return 0;
}

function resolveFreshSetupSeedCounter(manager) {
  if (!manager) return 0;
  var counter = Math.floor(Number(manager.freshSetupSeedCounter) || 0) + 1;
  manager.freshSetupSeedCounter = counter;
  return counter;
}

function createFallbackFreshSetupSeedFallback(now, perfNow, counter) {
  var mixedHigh = Math.imul((now >>> 0) ^ (counter >>> 0), 2654435761) >>> 0;
  var mixedLow = Math.imul((perfNow >>> 0) ^ ((counter * 2246822519) >>> 0), 3266489917) >>> 0;
  var high = (
    mixedHigh ^
    (Math.floor(now / 4294967296) & 2097151) ^
    (perfNow & 2097151) ^
    (counter & 2097151)
  ) & 2097151;
  var low = (
    mixedLow ^
    (now >>> 0) ^
    ((perfNow * 2654435761) >>> 0) ^
    ((counter * 2246822519) >>> 0)
  ) >>> 0;
  return high * 4294967296 + low;
}

function createFallbackFreshSetupSeed(manager) {
  var now = Math.max(0, Math.floor(Date.now()));
  var perfNow = resolveFreshSetupPerformanceNow(manager);
  var counter = resolveFreshSetupSeedCounter(manager);
  var runtime = resolveCoreRestartGameRuntime();
  if (runtime && typeof runtime.createFallbackFreshSetupSeed === "function") {
    return runtime.createFallbackFreshSetupSeed({ nowMs: now, performanceNowMicros: perfNow, counter: counter });
  }
  return createFallbackFreshSetupSeedFallback(now, perfNow, counter);
}

function resolveFreshSetupSeed(manager) {
  var cryptoSeed = resolveCryptoFreshSetupSeed(manager);
  return cryptoSeed !== null ? cryptoSeed : createFallbackFreshSetupSeed(manager);
}

function resolveSetupRankedSessionContext(manager) {
  var runtime = resolveCoreRankedSessionSetupContextRuntime(manager);
  if (runtime && typeof runtime.resolveSetupRankedSessionContext === "function") {
    return runtime.resolveSetupRankedSessionContext(manager);
  }
  return null;
}

function hasLegalRankedSetupSeed(manager) {
  if (!manager || manager.rankPolicy !== "ranked") return true;
  return !!resolveSetupRankedSessionContext(manager);
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

function readSetupWindowChallengeId(manager) {
  var windowLike = manager.getWindowLike();
  return windowLike && windowLike.GAME_CHALLENGE_CONTEXT && windowLike.GAME_CHALLENGE_CONTEXT.id
    ? windowLike.GAME_CHALLENGE_CONTEXT.id
    : null;
}

function resolveSetupChallengeIdFallback(manager, normalizedOptions, rankedSessionContext) {
  if (!manager) return null;
  var challengeId = typeof normalizedOptions.challengeId === "string" && normalizedOptions.challengeId
    ? normalizedOptions.challengeId
    : null;
  if (!challengeId && rankedSessionContext && rankedSessionContext.id) {
    challengeId = rankedSessionContext.id;
  }
  if (!challengeId) challengeId = readSetupWindowChallengeId(manager);
  return challengeId;
}

function resolveSetupChallengeId(manager, normalizedOptions, rankedSessionContext) {
  var runtime = resolveCoreSetupStateInitializationRuntime(manager);
  if (runtime && typeof runtime.resolveSetupChallengeId === "function") {
    return runtime.resolveSetupChallengeId(manager, normalizedOptions, rankedSessionContext);
  }
  return resolveSetupChallengeIdFallback(manager, normalizedOptions, rankedSessionContext);
}

function resolveSetupRankedSessionToken(rankedSessionContext) {
  return rankedSessionContext && typeof rankedSessionContext.ranked_session_token === "string"
    ? rankedSessionContext.ranked_session_token
    : "";
}

function resolveSetupSpawnSequenceVersion(rankedSessionContext) {
  return Number(rankedSessionContext && rankedSessionContext.spawn_sequence_version) === 2 ? 2 : 1;
}

function initializeSetupSessionReplaySnapshot(manager) {
  var runtime = resolveCoreSessionReplaySnapshotRuntime(manager);
  if (runtime && typeof runtime.initializeSetupSessionReplaySnapshot === "function") {
    runtime.initializeSetupSessionReplaySnapshot(manager);
  }
}

function resolveReplayV1InitTilesFromBoardMatrixFallback(board, width, height, ruleset) {
  if (!Array.isArray(board) || board.length !== height) return null;
  var fib = String(ruleset || "pow2") === "fibonacci";
  var initTiles = [];
  for (var y = 0; y < height; y++) {
    var row = board[y];
    if (!Array.isArray(row) || row.length !== width) return null;
    for (var x = 0; x < width; x++) {
      var value = Number(row[x]);
      if (value === 0) continue;
      if (fib && value !== 1 && value !== 2) return null;
      if (!fib && value !== 2 && value !== 4) return null;
      initTiles.push({ cellIndex: y * width + x, valueBit: fib ? (value === 2 ? 1 : 0) : (value === 4 ? 1 : 0) });
    }
  }
  return initTiles;
}

function resolveReplayV1InitTilesFromBoardMatrix(manager, board, width, height, ruleset) {
  var runtime = resolveCoreSessionReplaySnapshotRuntime(manager);
  if (runtime && typeof runtime.resolveReplayV1InitTilesFromBoardMatrix === "function") {
    return runtime.resolveReplayV1InitTilesFromBoardMatrix({
      board: board,
      width: width,
      height: height,
      ruleset: ruleset
    });
  }
  return resolveReplayV1InitTilesFromBoardMatrixFallback(board, width, height, ruleset);
}

function syncSetupSessionReplayV1InitTiles(manager) {
  if (!(manager && manager.sessionReplayV1)) return;
  var board = Array.isArray(manager.initialBoardMatrix) ? manager.initialBoardMatrix : manager.getFinalBoardMatrix();
  var initTiles = resolveReplayV1InitTilesFromBoardMatrix(manager, board, manager.width, manager.height, manager.ruleset);
  manager.sessionReplayV1.mode_key = manager.modeKey;
  manager.sessionReplayV1.ruleset = manager.ruleset;
  manager.sessionReplayV1.board_width = manager.width;
  manager.sessionReplayV1.board_height = manager.height;
  manager.sessionReplayV1.challenge_id = manager.challengeId || null;
  manager.sessionReplayV1.seed = manager.initialSeed;
  manager.sessionReplayV1.spawn_sequence_version = manager.spawnSequenceVersion === 2 ? 2 : 1;
  manager.sessionReplayV1.init_tiles = Array.isArray(initTiles) ? initTiles : [];
  manager.sessionReplayV1.supported = !!initTiles;
}

function resetSetupReplayAndSpawnState(manager) {
  var runtime = resolveCoreResetSetupReplayAndSpawnStateRuntime(manager);
  if (runtime && typeof runtime.resetSetupReplayAndSpawnState === "function") {
    runtime.resetSetupReplayAndSpawnState(manager, {
      assignManagerClientRecordId:
        typeof assignManagerClientRecordId === "function" ? assignManagerClientRecordId : undefined
    });
  }
}

function resetSetupTimerAndInputStateFallback(manager) {
  if (manager.timerID !== null && typeof manager.timerID !== "undefined" && typeof clearInterval === "function") {
    clearInterval(manager.timerID);
  }
  manager.timerStatus = 0; manager.time = 0; manager.accumulatedTime = 0; manager.timerElapsedOffsetMs = 0;
  manager.startTime = null; manager.timerID = null; manager.timerAnchorLocalMs = null;
  manager.timerAnchorServerMs = null; manager.pendingTimerAnchorServerMs = null; manager.timerUpdateIntervalMs = null;
  manager.timerFrozen = false;
  manager.pendingMoveInput = null;
  manager.moveInputFlushScheduled = false;
  manager.lastMoveInputAt = 0;
  manager.moveDeadlineAt = null;
}

function resetSetupTimerAndInputState(manager) {
  var runtime = resolveCoreSetupStateInitializationRuntime(manager);
  if (runtime && typeof runtime.resetSetupTimerAndInputState === "function") {
    runtime.resetSetupTimerAndInputState(manager, {
      clearInterval: typeof clearInterval === "function" ? clearInterval : undefined
    });
    return;
  }
  resetSetupTimerAndInputStateFallback(manager);
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
  if (shouldForceRankedCheckpointRestoreInSetup(manager)) return false;
  return shouldUseSavedGameState(manager);
}

function readSetupLocationSearch(manager) {
  try {
    var windowLike = manager && manager.getWindowLike ? manager.getWindowLike() : null;
    var search = windowLike && windowLike.location ? String(windowLike.location.search || "") : "";
    return search;
  } catch (_err) {
    return "";
  }
}

function shouldForceRankedCheckpointRestoreInSetupFallback(manager) {
  if (!manager || manager.rankPolicy !== "ranked") return false;
  var search = readSetupLocationSearch(manager);
  if (!search) return false;
  try {
    var params = new URLSearchParams(search);
    return (
      params.get("force_ranked_checkpoint") === "1" ||
      params.get("restore_ranked_checkpoint") === "1"
    );
  } catch (_errParams) {
    return search.indexOf("force_ranked_checkpoint=1") >= 0 || search.indexOf("restore_ranked_checkpoint=1") >= 0;
  }
}

function shouldForceRankedCheckpointRestoreInSetup(manager) {
  var runtime = resolveCoreSetupRestoreInitialBoardStateRuntime(manager);
  if (runtime && typeof runtime.shouldForceRankedCheckpointRestoreInSetup === "function") {
    return runtime.shouldForceRankedCheckpointRestoreInSetup(manager) === true;
  }
  return shouldForceRankedCheckpointRestoreInSetupFallback(manager);
}

function hasRestorableSavedStateForUnseededRankedSetup(manager) {
  if (!manager) return false;
  if (manager.__savedStateRestoreSkippedForCurrentSetup === true) return false;
  if (typeof resolveLatestSavedPayloadForRestore !== "function") return false;
  if (typeof resolveSavedStateRestoreDecision !== "function") return false;
  try {
    var saved = resolveLatestSavedPayloadForRestore(manager);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return false;
    var decision = resolveSavedStateRestoreDecision(manager, saved);
    return !!(decision && decision.canRestore === true);
  } catch (_err) {
    return false;
  }
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
  var runtime = resolveCoreRankedCheckpointLocalMirrorSetupRuntime(manager);
  if (runtime && typeof runtime.hasRankedCheckpointLocalMirrorForSetup === "function") {
    return runtime.hasRankedCheckpointLocalMirrorForSetup(manager);
  }
  return false;
}

function readRankedCheckpointLocalMirrorSavedStateForSetup(manager) {
  var runtime = resolveCoreRankedCheckpointLocalMirrorSetupRuntime(manager);
  if (runtime && typeof runtime.readRankedCheckpointLocalMirrorSavedStateForSetup === "function") {
    return runtime.readRankedCheckpointLocalMirrorSavedStateForSetup(manager);
  }
  return null;
}

function shouldScheduleRankedCheckpointRestoreInSetup(manager, hasInputSeed, normalizedOptions) {
  if (!manager || manager.rankPolicy !== "ranked") return false;
  var skipStartTiles = !!normalizedOptions.skipStartTiles;
  if (hasInputSeed || skipStartTiles || normalizedOptions.disableStateRestore) return false;
  return hasRankedCheckpointLocalMirrorForSetup(manager);
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
  var runtime = resolveCoreSetupRestoreInitialBoardStateRuntime(manager);
  if (runtime && typeof runtime.resolveSetupRestoreAndInitialBoardState === "function") {
    return runtime.resolveSetupRestoreAndInitialBoardState(manager, hasInputSeed, normalizedOptions, {
      shouldTryRestoreSavedStateInSetup: shouldTryRestoreSavedStateInSetup,
      tryRestoreLatestSavedState: typeof tryRestoreLatestSavedState === "function" ? tryRestoreLatestSavedState : undefined,
      shouldForceRankedCheckpointRestoreInSetup: shouldForceRankedCheckpointRestoreInSetup,
      readRankedCheckpointLocalMirrorSavedStateForSetup: readRankedCheckpointLocalMirrorSavedStateForSetup,
      applySavedStateRestore: typeof applySavedStateRestore === "function" ? applySavedStateRestore : undefined,
      shouldScheduleRankedCheckpointRestoreInSetup: shouldScheduleRankedCheckpointRestoreInSetup,
      hasRankedCheckpointAuthTokenForSetup: hasRankedCheckpointAuthTokenForSetup,
      placeStoneTilesForSetup: placeStoneTilesForSetup,
      seedInitialTilesAndSnapshotBoard: seedInitialTilesAndSnapshotBoard
    });
  }
  return { restoredFromSavedState: false };
}

function resolveCoreSetupUiStateRuntime(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  if (windowLike && windowLike.CoreSetupUiStateRuntime) {
    return windowLike.CoreSetupUiStateRuntime;
  }
  if (typeof CoreSetupUiStateRuntime !== "undefined" && CoreSetupUiStateRuntime) {
    return CoreSetupUiStateRuntime;
  }
  return null;
}

function finalizeSetupUiAndStatsState(manager, preferredTimerModuleView, restoredFromSavedState) {
  var runtime = resolveCoreSetupUiStateRuntime(manager);
  if (runtime && typeof runtime.finalizeSetupUiAndStatsState === "function") {
    runtime.finalizeSetupUiAndStatsState(manager, preferredTimerModuleView, restoredFromSavedState);
  }
}

function createSetupStateInitializationOperations() {
  return {
    initializeSetupSeedAndReplayState: initializeSetupSeedAndReplayState,
    resetSetupRuntimeState: resetSetupRuntimeState,
    resolveSetupChallengeId: resolveSetupChallengeId,
    resolveSetupRankedSessionToken: resolveSetupRankedSessionToken,
    resolveSetupSpawnSequenceVersion: resolveSetupSpawnSequenceVersion,
    initializeSetupSessionReplaySnapshot: initializeSetupSessionReplaySnapshot,
    initializeTimerMilestones: typeof initializeTimerMilestones === "function" ? initializeTimerMilestones : undefined,
    resetRoundStatsState: typeof resetRoundStatsState === "function" ? resetRoundStatsState : undefined,
    resetTimerUiForSetup: typeof resetTimerUiForSetup === "function" ? resetTimerUiForSetup : undefined,
    resolvePreferredTimerModuleViewForSetup: resolvePreferredTimerModuleViewForSetup,
    resolveSetupRestoreAndInitialBoardState: resolveSetupRestoreAndInitialBoardState,
    syncSetupSessionReplayV1InitTiles: syncSetupSessionReplayV1InitTiles,
    finalizeSetupUiAndStatsState: finalizeSetupUiAndStatsState
  };
}

function runSetupStateInitialization(manager, inputSeed, setupOptions) {
  var runtime = resolveCoreSetupStateInitializationRuntime(manager);
  if (runtime && typeof runtime.runSetupStateInitialization === "function") {
    runtime.runSetupStateInitialization(manager, inputSeed, setupOptions, createSetupStateInitializationOperations());
  }
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
  return createRestartRandomId("lock", 10);
}

function resolveSingleModePageWindowInstanceId(windowLike) {
  if (
    windowLike &&
    typeof windowLike.__playSinglePageWindowInstanceId === "string" &&
    windowLike.__playSinglePageWindowInstanceId
  ) {
    return windowLike.__playSinglePageWindowInstanceId;
  }
  var instanceId = createRestartRandomId("win", 10);
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

function resolveCoreSingleModePageLockRuntimeForWindow(windowLike) {
  if (windowLike && windowLike.CoreSingleModePageLockRuntime) return windowLike.CoreSingleModePageLockRuntime;
  return typeof CoreSingleModePageLockRuntime !== "undefined" && CoreSingleModePageLockRuntime
    ? CoreSingleModePageLockRuntime
    : null;
}

function resolveSingleModePageTabIdByRuntime(windowLike) {
  var runtime = resolveCoreSingleModePageLockRuntimeForWindow(windowLike);
  if (!(runtime && typeof runtime.resolveSingleModePageTabId === "function")) return "";
  var sessionKey = typeof GameManager !== "undefined" && typeof GameManager.SINGLE_MODE_PAGE_TAB_ID_SESSION_KEY === "string" && GameManager.SINGLE_MODE_PAGE_TAB_ID_SESSION_KEY
    ? GameManager.SINGLE_MODE_PAGE_TAB_ID_SESSION_KEY
    : "playModeSinglePageTabId:v1";
  return runtime.resolveSingleModePageTabId(windowLike, { tabIdSessionKey: sessionKey, createId: createRestartRandomId });
}

function resolveSingleModePageTabIdFallback(windowLike) {
  if (windowLike && typeof windowLike.__playSinglePageTabId === "string" && windowLike.__playSinglePageTabId) return windowLike.__playSinglePageTabId;
  var sessionStorageLike = resolveSingleModePageSessionStorage(windowLike);
  var sessionKey = resolveSingleModePageTabIdSessionKey();
  var tabId = readSingleModePageStorageItemSafe(sessionStorageLike, sessionKey);
  if (!(typeof tabId === "string" && tabId)) {
    tabId = createRestartRandomId("tab", 10);
    writeSingleModePageStorageItemSafe(sessionStorageLike, sessionKey, tabId);
  }
  if (!(typeof tabId === "string" && tabId)) tabId = createRestartRandomId("tab", 10);
  if (windowLike) windowLike.__playSinglePageTabId = tabId;
  return tabId;
}

function resolveSingleModePageTabId(windowLike) {
  var tabId = resolveSingleModePageTabIdByRuntime(windowLike);
  return typeof tabId === "string" && tabId ? tabId : resolveSingleModePageTabIdFallback(windowLike);
}

function resolveCoreSingleModePageLockRuntime(manager) {
  var windowLike = manager && manager.windowLike ? manager.windowLike : resolveSingleModePageLockWindowLike(manager);
  if (windowLike && windowLike.CoreSingleModePageLockRuntime) {
    return windowLike.CoreSingleModePageLockRuntime;
  }
  if (typeof CoreSingleModePageLockRuntime !== "undefined" && CoreSingleModePageLockRuntime) {
    return CoreSingleModePageLockRuntime;
  }
  return null;
}

function createSingleModePageLockRuntimeOptions() {
  return {
    keyPrefix: resolveSingleModePageLockKeyPrefix(),
    tabIdSessionKey: resolveSingleModePageTabIdSessionKey(),
    ttlMs: resolveSingleModePageLockTtlMs(),
    heartbeatMs: resolveSingleModePageHeartbeatMs(),
    createId: createRestartRandomId
  };
}

function releaseSingleModePageLockStateObject(lockState) {
  var runtime = resolveCoreSingleModePageLockRuntime(lockState);
  if (runtime && typeof runtime.releaseSingleModePageLockStateObject === "function") {
    runtime.releaseSingleModePageLockStateObject(lockState);
  }
}

function releaseSingleModePageLock(manager) {
  var runtime = resolveCoreSingleModePageLockRuntime(manager);
  if (runtime && typeof runtime.releaseSingleModePageLock === "function") {
    runtime.releaseSingleModePageLock(manager);
  }
}

function ensureSingleModePageLock(manager) {
  var runtime = resolveCoreSingleModePageLockRuntime(manager);
  if (!(runtime && typeof runtime.ensureSingleModePageLock === "function")) return true;
  return runtime.ensureSingleModePageLock(manager, createSingleModePageLockRuntimeOptions());
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

function clearRankedBlockedBoardView(manager) {
  var actuator = manager && manager.actuator ? manager.actuator : null;
  if (!(actuator && typeof actuator.clearContainer === "function")) return;
  try {
    actuator.clearContainer(actuator.tileContainer || null);
  } catch (_err) {}
}

function normalizeSetupPageIdentity(value) {
  return String(value || "").toLowerCase();
}

function readSetupPageAttribute(elementLike, attributeName) {
  if (!elementLike) return "";
  try {
    if (typeof elementLike.getAttribute === "function") {
      var attributeValue = elementLike.getAttribute(attributeName);
      if (attributeValue) return attributeValue;
    }
  } catch (_errAttribute) {}
  try {
    if (elementLike.dataset && elementLike.dataset.page) return elementLike.dataset.page;
  } catch (_errDataset) {}
  return "";
}

function resolveSetupLocationLike(manager, documentLike) {
  try {
    if (documentLike && documentLike.location) return documentLike.location;
  } catch (_errDocumentLocation) {}
  try {
    var windowLike = manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
    if (windowLike && windowLike.location) return windowLike.location;
  } catch (_errWindowLocation) {}
  return null;
}

function isRankedSeedRequiredForSetup(manager) {
  var documentLike = null;
  try {
    documentLike = typeof resolveManagerDocumentLike === "function" ? resolveManagerDocumentLike(manager) : null;
  } catch (_errDocument) {}
  var body = documentLike && documentLike.body ? documentLike.body : null;
  if (normalizeSetupPageIdentity(readSetupPageAttribute(body, "data-page")) === "replay") return false;
  var locationLike = resolveSetupLocationLike(manager, documentLike);
  var pathname = "";
  try {
    pathname = locationLike && locationLike.pathname ? String(locationLike.pathname) : "";
  } catch (_errPathname) {}
  return normalizeSetupPageIdentity(pathname).indexOf("replay.html") === -1;
}

function shouldBlockRankedSetupWithoutSeed(manager) {
  if (!(manager && manager.rankPolicy === "ranked")) return false;
  var modeKey = "";
  try {
    modeKey = String(manager.modeKey || manager.mode || "");
  } catch (_errModeKey) {}
  var modeConfig = manager.modeConfig && typeof manager.modeConfig === "object" ? manager.modeConfig : null;
  var configRankPolicy = "";
  try {
    configRankPolicy = modeConfig ? String(modeConfig.rank_policy || modeConfig.rankPolicy || "").toLowerCase() : "";
  } catch (_errConfigRankPolicy) {}
  if (configRankPolicy && configRankPolicy !== "ranked") return false;
  var width = Math.floor(Number(manager.width || (modeConfig && modeConfig.board_width)));
  var height = Math.floor(Number(manager.height || (modeConfig && modeConfig.board_height)));
  var isFourByFour =
    (width === 4 && height === 4) ||
    modeKey === "standard_4x4_pow2_no_undo" ||
    modeKey === "classic_4x4_pow2_undo" ||
    modeKey === "capped_4x4_pow2_no_undo";
  if (!isFourByFour) {
    return false;
  }
  if (hasRestorableSavedStateForUnseededRankedSetup(manager)) {
    return false;
  }
  return hasRankedCheckpointAuthTokenForSetup(manager);
}

function createSetupGameOperations() {
  return {
    applySetupModeConfig: function (manager, cfg) { if (typeof applySetupModeConfig === "function") applySetupModeConfig(manager, cfg); },
    clearRankedBlockedBoardView: clearRankedBlockedBoardView,
    createGrid: function (width, height) { return typeof Grid === "function" ? new Grid(width, height) : { width: width, height: height }; },
    detectMode: function (manager) { return typeof detectMode === "function" ? detectMode(manager) : ""; },
    ensureSingleModePageLock: function (manager) { return typeof ensureSingleModePageLock === "function" ? ensureSingleModePageLock(manager) : true; },
    handleSingleModePageDuplicate: function (manager) { if (typeof handleSingleModePageDuplicate === "function") handleSingleModePageDuplicate(manager); },
    hasLegalRankedSetupSeed: function (manager) { return hasLegalRankedSetupSeed(manager); },
    isRankedSeedRequiredForSetup: function (manager) { return isRankedSeedRequiredForSetup(manager); },
    shouldBlockRankedSetupWithoutSeed: function (manager) { return shouldBlockRankedSetupWithoutSeed(manager); },
    isNonArrayObject: function (value) { return typeof isNonArrayObject === "function" ? isNonArrayObject(value) : !!value && typeof value === "object" && !Array.isArray(value); },
    resolveSetupModeConfig: function (manager, setupOptions, detectedMode) { return typeof resolveSetupModeConfig === "function" ? resolveSetupModeConfig(manager, setupOptions, detectedMode) : null; },
    resolveSetupNoXModeConfig: function (manager, cfg, setupOptions, inputSeed) { return typeof resolveSetupNoXModeConfig === "function" ? resolveSetupNoXModeConfig(manager, cfg, setupOptions, inputSeed) : cfg; },
    runSetupStateInitialization: function (manager, inputSeed, setupOptions) { if (typeof runSetupStateInitialization === "function") runSetupStateInitialization(manager, inputSeed, setupOptions); }
  };
}

function setupGameFallback(manager, inputSeed, options) {
  if (!manager) return;
  var setupOptions = isNonArrayObject(options) ? options : {};
  var detectedMode = detectMode(manager);
  var resolvedModeConfig = resolveSetupModeConfig(manager, setupOptions, detectedMode);
  var cfg = manager.normalizeModeConfig(resolvedModeConfig && resolvedModeConfig.key, resolvedModeConfig);
  cfg = resolveSetupNoXModeConfig(manager, cfg, setupOptions, inputSeed);
  applySetupModeConfig(manager, cfg);
  manager.singleModePageLockRejected = false;
  if (
    manager.rankPolicy === "ranked" &&
    isRankedSeedRequiredForSetup(manager) &&
    shouldBlockRankedSetupWithoutSeed(manager) &&
    !hasLegalRankedSetupSeed(manager)
  ) {
    manager.rankedSetupBlockedUntilSessionReady = true;
    manager.rankedSessionToken = "";
    manager.challengeId = null;
    manager.setRuntimeGrid(null);
    clearRankedBlockedBoardView(manager);
    return;
  }
  manager.rankedSetupBlockedUntilSessionReady = false;
  if (!ensureSingleModePageLock(manager)) {
    manager.singleModePageLockRejected = true;
    handleSingleModePageDuplicate(manager);
    return;
  }
  manager.setRuntimeGrid(new Grid(manager.width, manager.height));
  manager.setRuntimeScore(0);
  manager.over = false; manager.won = false; manager.keepPlaying = false;
  runSetupStateInitialization(manager, inputSeed, setupOptions);
}

function setupGame(manager, inputSeed, options) {
  var setupOptions = isNonArrayObject(options) ? options : {};
  var previousSavedStateRestoreSkipped = manager && manager.__savedStateRestoreSkippedForCurrentSetup;
  if (manager) {
    manager.__savedStateRestoreSkippedForCurrentSetup = !!(
      setupOptions.disableStateRestore ||
      setupOptions.skipStartTiles
    );
  }
  var runtime = resolveCoreSetupGameRuntime(manager);
  try {
    if (runtime && typeof runtime.setupGame === "function") {
      return runtime.setupGame(manager, inputSeed, options, createSetupGameOperations());
    }
    return setupGameFallback(manager, inputSeed, options);
  } finally {
    if (manager) {
      if (typeof previousSavedStateRestoreSkipped === "undefined") {
        try {
          delete manager.__savedStateRestoreSkippedForCurrentSetup;
        } catch (_errDelete) {
          manager.__savedStateRestoreSkippedForCurrentSetup = undefined;
        }
      } else {
        manager.__savedStateRestoreSkippedForCurrentSetup = previousSavedStateRestoreSkipped;
      }
    }
  }
}

var V9_VERSE_PNG_CHARSET = [
  " ", "!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?",
  "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O",
  "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\", "]", "^", "_",
  "`", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o",
  "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~",
  "脟", "眉", "茅", "芒", "盲", "脿", "氓", "莽", "锚", "毛", "猫", "茂", "卯", "矛",
  "脛", "脜", "脡", "忙", "脝", "么", "枚", "貌", "没", "霉",
  "每", "脰", "脺", "酶", "拢", "脴", "脳", "茠", "谩"
];

var V9_VERSE_PNG_CHARSET_LEGACY = [
  " ", "!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?",
  "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O",
  "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\", "]", "^", "_",
  "`", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o",
  "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~",
  "\u00C7", "\u00FC", "\u00E9", "\u00E2", "\u00E4", "\u00E0", "\u00E5", "\u00E7",
  "\u00EA", "\u00EB", "\u00E8", "\u00EF", "\u00EE", "\u00EC", "\u00C4", "\u00C5",
  "\u00C9", "\u00E6", "\u00C6", "\u00F4", "\u00F6", "\u00F2", "\u00FB", "\u00F9",
  "\u00FF", "\u00D6", "\u00DC", "\u00F8", "\u00A3", "\u00D8", "\u00D7", "\u0192",
  "\u00E1"
];
var LEGACY_VRS_NEW_CHARSET = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f",
  "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v",
  "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
  "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "\u00C0",
  "\u00C1", "\u00C2", "\u00C3", "\u00C4", "\u00C5", "\u00C6", "\u00C7", "\u00C8",
  "\u00C9", "\u00CA", "\u00CB", "\u00CC", "\u00CD", "\u00CE", "\u00CF", "\u00D0",
  "\u00D1", "\u00D2", "\u00D3", "\u00D4", "\u00D5", "\u00D6", "\u00D7", "\u00D8",
  "\u00D9", "\u00DA", "\u00DB", "\u00DC", "\u00DD", "\u00DE", "\u00DF", "\u00E0",
  "\u00E1", "\u00E2", "\u00E3", "\u00E4", "\u00E5", "\u00E6", "\u00E7", "\u00E8",
  "\u00E9", "\u00EA", "\u00EB", "\u00EC", "\u00ED", "\u00EE", "\u00EF", "\u00F0",
  "\u00F1", "\u00F2", "\u00F3", "\u00F4", "\u00F5", "\u00F6", "\u00F7", "\u00F8",
  "\u00F9", "\u00FA", "\u00FB", "\u00FC", "\u00FD", "\u00FE", "\u00FF", "\u00A4",
  "\u00BE"
];
var v9VersePngMapDictCache = null;
var v9VerseLegacyPngMapDictCache = null;
var v9VerseCorruptionRepairMapCache = null;
var v9VerseCorruptionRepairMaxKeyLength = 0;
var legacyVrsNewCharMapCache = null;
var REPLAY_STATE_HISTORY_WINDOW = 512;
var REPLAY_SEEK_CHECKPOINT_INTERVAL = 64;
var REPLAY_SEEK_TAIL_HISTORY_LENGTH = 16;
var REPLAY_V1_EXT_MODE_KEY = 1;
var REPLAY_V1_EXT_RULESET = 2;
var REPLAY_V1_EXT_CHALLENGE_ID = 3;
var REPLAY_V1_EXT_SEED = 4;
var LEGACY_VRS_VARIANT_CONFIG_MAP = {
  "2x4": { key: "2x4", width: 4, height: 2, modeKey: "board_2x4_pow2_no_undo" },
  "3x3": { key: "3x3", width: 3, height: 3, modeKey: "board_3x3_pow2_no_undo" },
  "3x4": { key: "3x4", width: 4, height: 3, modeKey: "board_3x4_pow2_no_undo" },
  "4x4": { key: "4x4", width: 4, height: 4, modeKey: "standard_4x4_pow2_no_undo" }
};

function isReplayRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizeReplayRecordObject(value, fallback) {
  return isReplayRecordObject(value) ? value : fallback;
}

function resolveReplayV1CodecRuntime(manager) {
  if (!(manager && typeof manager.getWindowLike === "function")) return null;
  var windowLike = manager.getWindowLike();
  if (!(windowLike && isReplayRecordObject(windowLike.CoreReplayCodecRuntime))) return null;
  return windowLike.CoreReplayCodecRuntime;
}

function resolveReplayV1Base64Prefix() {
  return String(GameManager.REPLAY_V1_RPL_BASE64_PREFIX || "REPLAY_v1RPL_B64_");
}

function resolveReplayFibVersePrefix() {
  return String(GameManager.REPLAY_FIB_VERSE_PREFIX || "replay_fib_");
}

function encodeReplayV1Utf8Text(text) {
  var sourceText = typeof text === "string" ? text : String(text == null ? "" : text);
  if (!sourceText) return new Uint8Array(0);
  if (typeof TextEncoder === "function") {
    return new TextEncoder().encode(sourceText);
  }
  var escaped = unescape(encodeURIComponent(sourceText));
  var bytes = new Uint8Array(escaped.length);
  for (var i = 0; i < escaped.length; i++) bytes[i] = escaped.charCodeAt(i) & 255;
  return bytes;
}

function decodeReplayV1Utf8Text(payload) {
  if (!payload) return "";
  var bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
  if (!bytes.length) return "";
  if (typeof TextDecoder === "function") {
    try {
      return new TextDecoder("utf-8").decode(bytes);
    } catch (_err) {}
  }
  var binary = "";
  for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] & 255);
  try {
    return decodeURIComponent(escape(binary));
  } catch (_err2) {
    return binary;
  }
}

function resolveSessionReplayV1DeltaMs(session, nowMs) {
  var lastAt = Number(session && session.last_event_at_ms);
  if (!Number.isFinite(lastAt) || lastAt < 0) lastAt = nowMs;
  var delta = Math.floor(nowMs - lastAt);
  if (!Number.isFinite(delta) || delta < 0) delta = 0;
  session.last_event_at_ms = nowMs;
  return delta;
}

function canRecordSessionReplayV1(manager, session) {
  if (!(session && session.supported)) return false;
  if (!manager || !manager.replayMode) return true;
  return !(Array.isArray(manager.replayMoves) && manager.replayMoves.length > 0);
}

function recordSessionReplayV1Move(manager, direction, spawn) {
  var session = manager && manager.sessionReplayV1;
  if (!canRecordSessionReplayV1(manager, session)) return;
  if (!Number.isInteger(direction) || direction < 0 || direction > 7) return;
  if (!(spawn && Number.isInteger(spawn.x) && Number.isInteger(spawn.y))) return;
  var fib = !!(manager && typeof manager.isFibonacciMode === "function" && manager.isFibonacciMode());
  if (fib) {
    if (spawn.value !== 1 && spawn.value !== 2) return;
  } else if (spawn.value !== 2 && spawn.value !== 4) {
    return;
  }
  if (spawn.x < 0 || spawn.x >= manager.width || spawn.y < 0 || spawn.y >= manager.height) return;
  var nowMs = Date.now();
  session.records.push({
    kind: "move", dir: direction, spawnIndex: spawn.y * manager.width + spawn.x,
    spawnValueBit: fib ? (spawn.value === 2 ? 1 : 0) : (spawn.value === 4 ? 1 : 0), deltaMs: resolveSessionReplayV1DeltaMs(session, nowMs)
  });
}

function recordSessionReplayV1Undo(manager, undoCount) {
  var session = manager && manager.sessionReplayV1;
  if (!canRecordSessionReplayV1(manager, session)) return;
  var count = Number(undoCount);
  if (!Number.isInteger(count) || count <= 0) count = 1;
  var nowMs = Date.now();
  if (count === 1) {
    session.records.push({ kind: "undo1", deltaMs: resolveSessionReplayV1DeltaMs(session, nowMs) });
    return;
  }
  session.records.push({ kind: "undon", undoCount: count, deltaMs: resolveSessionReplayV1DeltaMs(session, nowMs) });
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

function normalizeReplayTickToken(value) {
  var token = Number(value);
  if (!Number.isFinite(token) || token < 0) return 0;
  return Math.floor(token);
}

function bumpReplayTickToken(manager) {
  if (!manager) return 0;
  var nextToken = normalizeReplayTickToken(manager.replayTickToken) + 1;
  manager.replayTickToken = nextToken;
  return nextToken;
}

function isReplayTickTokenActive(manager, token) {
  if (!manager) return false;
  return normalizeReplayTickToken(manager.replayTickToken) === normalizeReplayTickToken(token);
}

function resolveReplayPauseStateFromCore(currentManager, coreCallResult) {
  if (currentManager && typeof currentManager.resolveCoreObjectCallOrFallback === "function") {
    return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, resolveReplayPauseStateFallback);
  }
  var coreValue = coreCallResult && Object.prototype.hasOwnProperty.call(coreCallResult, "value")
    ? coreCallResult.value
    : undefined;
  if (coreValue && typeof coreValue === "object" && !Array.isArray(coreValue)) return coreValue;
  return resolveReplayPauseStateFallback();
}

function applyReplayPauseState(manager, state) {
  var pauseState = normalizeReplayPauseState(manager, state);
  manager.isPaused = pauseState.isPaused !== false;
  bumpReplayTickToken(manager);
  if (pauseState.shouldClearInterval === false) return;
  clearInterval(manager.replayInterval);
}

function pauseReplay(manager) {
  if (!manager) return;
  var state = resolveCorePayloadCallWith(
    manager,
    "callCoreReplayTimerRuntime",
    "computeReplayPauseState",
    {},
    {},
    resolveReplayPauseStateFromCore
  );
  applyReplayPauseState(manager, state);
}

function resolveReplayResumeState(manager) {
  var state = resolveCorePayloadCallWith(manager, "callCoreReplayTimerRuntime", "computeReplayResumeState", { replayDelay: manager.replayDelay }, {}, function (currentManager, coreCallResult) {
    if (currentManager && typeof currentManager.resolveCoreObjectCallOrFallback === "function") {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return { isPaused: false, shouldClearInterval: true, delay: manager.replayDelay || 200 };
      });
    }
    var coreValue = coreCallResult && Object.prototype.hasOwnProperty.call(coreCallResult, "value")
      ? coreCallResult.value
      : undefined;
    if (coreValue && typeof coreValue === "object" && !Array.isArray(coreValue)) return coreValue;
    return { isPaused: false, shouldClearInterval: true, delay: manager.replayDelay || 200 };
  });
  if (manager && typeof manager.isNonArrayObject === "function") {
    return manager.isNonArrayObject(state) ? state : {};
  }
  return state && typeof state === "object" && !Array.isArray(state) ? state : {};
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

function executeReplayIntervalTick(manager, replayTickToken) {
  if (!manager) return;
  if (manager.isPaused) return;
  if (manager.replayMode === false) return;
  if (typeof replayTickToken !== "undefined" && !isReplayTickTokenActive(manager, replayTickToken)) return;
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
  var replayTickToken = bumpReplayTickToken(manager);
  manager.replayInterval = setInterval(function () {
    executeReplayIntervalTick(manager, replayTickToken);
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

function resolveReplaySpeedStateFromCore(currentManager, coreCallResult, manager, multiplier) {
  if (currentManager && typeof currentManager.resolveCoreObjectCallOrFallback === "function") {
    return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
      return createReplaySpeedFallback(currentManager, multiplier);
    });
  }
  var coreValue = coreCallResult && Object.prototype.hasOwnProperty.call(coreCallResult, "value")
    ? coreCallResult.value
    : undefined;
  if (coreValue && typeof coreValue === "object" && !Array.isArray(coreValue)) return coreValue;
  return createReplaySpeedFallback(currentManager || manager, multiplier);
}

function normalizeReplaySpeedState(manager, state) {
  if (manager && typeof manager.isNonArrayObject === "function") {
    return manager.isNonArrayObject(state) ? state : {};
  }
  return state && typeof state === "object" && !Array.isArray(state) ? state : {};
}

function resolveReplaySpeedState(manager, multiplier) {
  if (!manager) return {};
  var state = resolveCorePayloadCallWith(manager, "callCoreReplayTimerRuntime", "computeReplaySpeedState", createReplaySpeedPayload(manager, multiplier), {}, function (currentManager, coreCallResult) {
    return resolveReplaySpeedStateFromCore(currentManager, coreCallResult, manager, multiplier);
  });
  return normalizeReplaySpeedState(manager, state);
}

function setReplaySpeed(manager, multiplier) {
  if (!manager) return;
  var state = resolveReplaySpeedState(manager, multiplier);
  setRuntimeReplayDelayForReplay(manager, state.replayDelay);
  if (!state.shouldResume) return;
  resumeReplay(manager);
}

function createReplaySeekTargetNormalizePayload(manager, targetIndex) {
  return {
    targetIndex: targetIndex,
    replayIndex: manager.replayIndex,
    hasReplayMoves: !!manager.replayMoves,
    replayMovesLength: manager.replayMoves ? manager.replayMoves.length : 0
  };
}

function normalizeReplaySeekTargetIndexFromCore(coreValue) {
  var resolved = Number(coreValue);
  return Number.isFinite(resolved) ? resolved : undefined;
}

function normalizeReplaySeekTargetIndexFallback(manager, targetIndex) {
  var nextTargetIndex = Number(targetIndex);
  if (!Number.isFinite(nextTargetIndex)) {
    nextTargetIndex = Number(manager.replayIndex);
  }
  if (!Number.isFinite(nextTargetIndex)) {
    nextTargetIndex = 0;
  }
  nextTargetIndex = Math.floor(nextTargetIndex);
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
    setRuntimeReplayIndexForReplay(manager, restartPlan.replayIndex);
  }
}

function setRuntimeReplayIndexForReplay(manager, value) {
  if (!manager) return;
  if (typeof manager.setRuntimeReplayIndex === "function") {
    manager.setRuntimeReplayIndex(value);
    return;
  }
  var nextIndex = Number(value);
  manager.replayIndex = Number.isInteger(nextIndex) && nextIndex >= 0 ? nextIndex : 0;
}

function setRuntimeReplayMovesForReplay(manager, replayMoves) {
  if (!manager) return;
  if (typeof manager.setRuntimeReplayMoves === "function") {
    manager.setRuntimeReplayMoves(replayMoves);
    return;
  }
  manager.replayMoves = Array.isArray(replayMoves) ? replayMoves : [];
}

function setRuntimeReplaySpawnsForReplay(manager, replaySpawns) {
  if (!manager) return;
  if (typeof manager.setRuntimeReplaySpawns === "function") {
    manager.setRuntimeReplaySpawns(replaySpawns);
    return;
  }
  manager.replaySpawns = replaySpawns;
}

function setRuntimeReplayMovesV2ForReplay(manager, replayMovesV2) {
  if (!manager) return;
  if (typeof manager.setRuntimeReplayMovesV2 === "function") {
    manager.setRuntimeReplayMovesV2(replayMovesV2);
    return;
  }
  manager.replayMovesV2 = replayMovesV2;
}

function setRuntimeUndoEnabledForReplay(manager, undoEnabled) {
  if (!manager) return;
  if (typeof manager.setRuntimeUndoEnabled === "function") {
    manager.setRuntimeUndoEnabled(undoEnabled);
    return;
  }
  manager.undoEnabled = undoEnabled;
}

function setRuntimeDisableSessionSyncForReplay(manager, disableSessionSync) {
  if (!manager) return;
  if (typeof manager.setRuntimeDisableSessionSync === "function") {
    manager.setRuntimeDisableSessionSync(disableSessionSync);
    return;
  }
  manager.disableSessionSync = disableSessionSync;
}

function setRuntimeReplayDelayForReplay(manager, replayDelay) {
  if (!manager) return;
  if (typeof manager.setRuntimeReplayDelay === "function") {
    manager.setRuntimeReplayDelay(replayDelay);
    return;
  }
  manager.replayDelay = replayDelay;
}

function normalizeReplayStateHistoryIndex(value) {
  var nextIndex = Number(value);
  if (!Number.isFinite(nextIndex)) return -1;
  nextIndex = Math.floor(nextIndex);
  return nextIndex >= 0 ? nextIndex : -1;
}

function ensureReplayStateHistoryStore(manager) {
  if (!manager) return [];
  if (!Array.isArray(manager.replayStateHistory)) manager.replayStateHistory = [];
  return manager.replayStateHistory;
}

function clearReplayStateHistory(manager) {
  if (!manager) return;
  manager.replayStateHistory = [];
  manager.replayStateHistoryMaxIndex = -1;
  manager.replayStateHistoryPruneCursor = 0;
}

function ensureReplaySeekCheckpointStore(manager) {
  if (!manager) return [];
  if (!Array.isArray(manager.replaySeekCheckpointHistory)) manager.replaySeekCheckpointHistory = [];
  return manager.replaySeekCheckpointHistory;
}

function clearReplaySeekCheckpointStore(manager) {
  if (!manager) return;
  manager.replaySeekCheckpointHistory = [];
  manager.replaySeekCheckpointMaxIndex = -1;
}

function resolveReplaySeekCheckpointInterval(manager) {
  if (!manager) return REPLAY_SEEK_CHECKPOINT_INTERVAL;
  var replayMoves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
  if (replayMoves.length >= 50000) return 128;
  if (replayMoves.length >= 10000) return 64;
  return 32;
}

function shouldStoreReplaySeekCheckpointAtIndex(manager, replayIndex) {
  var normalizedIndex = normalizeReplayStateHistoryIndex(replayIndex);
  if (normalizedIndex < 0) return false;
  if (normalizedIndex === 0) return true;
  var replayMoves = Array.isArray(manager && manager.replayMoves) ? manager.replayMoves : [];
  if (replayMoves.length > 0 && normalizedIndex === replayMoves.length) return true;
  var interval = resolveReplaySeekCheckpointInterval(manager);
  if (!(interval > 0)) return false;
  return normalizedIndex % interval === 0;
}

function pruneReplayStateHistoryStore(manager, latestIndex) {
  if (!manager) return;
  var normalizedIndex = normalizeReplayStateHistoryIndex(latestIndex);
  if (normalizedIndex < 0) return;
  var pruneBefore = normalizedIndex - REPLAY_STATE_HISTORY_WINDOW;
  if (pruneBefore <= 0) return;
  var store = ensureReplayStateHistoryStore(manager);
  var cursor = Number.isInteger(manager.replayStateHistoryPruneCursor)
    ? manager.replayStateHistoryPruneCursor
    : 0;
  if (cursor < 0) cursor = 0;
  for (var index = cursor; index < pruneBefore; index++) {
    if (store[index] !== undefined) store[index] = undefined;
  }
  manager.replayStateHistoryPruneCursor = pruneBefore;
}

function cloneReplayStateHistoryEntry(manager, entry) {
  if (!(manager && entry)) return null;
  try {
    return manager.clonePlain(entry);
  } catch (_err) {
    return null;
  }
}

function createReplayStateHistoryEntry(manager) {
  if (!(manager && typeof createCurrentUndoStackEntrySnapshot === "function")) return null;
  var snapshot = createCurrentUndoStackEntrySnapshot(manager, {});
  if (!(snapshot && manager.isNonArrayObject(snapshot))) return null;
  var entry = cloneReplayStateHistoryEntry(manager, snapshot);
  if (!(entry && manager.isNonArrayObject(entry))) return null;
  entry.over = !!manager.over;
  entry.won = !!manager.won;
  entry.keepPlaying = !!manager.keepPlaying;
  entry.shouldClearMessage = true;
  return entry;
}

function storeReplaySeekCheckpointEntry(manager, replayIndex, options) {
  if (!manager) return null;
  var normalizedIndex = normalizeReplayStateHistoryIndex(replayIndex);
  if (normalizedIndex < 0) return null;
  var opts = manager.isNonArrayObject(options) ? options : {};
  if (opts.force !== true && !shouldStoreReplaySeekCheckpointAtIndex(manager, normalizedIndex)) return null;
  var entry = opts.entry || createReplayStateHistoryEntry(manager);
  if (!(entry && manager.isNonArrayObject(entry))) return null;
  entry = cloneReplayStateHistoryEntry(manager, entry);
  if (!(entry && manager.isNonArrayObject(entry))) return null;
  var store = ensureReplaySeekCheckpointStore(manager);
  store[normalizedIndex] = entry;
  if (!Number.isInteger(manager.replaySeekCheckpointMaxIndex) || normalizedIndex > manager.replaySeekCheckpointMaxIndex) {
    manager.replaySeekCheckpointMaxIndex = normalizedIndex;
  }
  return entry;
}

function getReplaySeekCheckpointEntry(manager, replayIndex) {
  if (!manager) return null;
  var normalizedIndex = normalizeReplayStateHistoryIndex(replayIndex);
  if (normalizedIndex < 0) return null;
  var store = ensureReplaySeekCheckpointStore(manager);
  return cloneReplayStateHistoryEntry(manager, store[normalizedIndex]);
}

function resolveNearestReplaySeekCheckpointIndex(manager, replayIndex) {
  if (!manager) return -1;
  var normalizedIndex = normalizeReplayStateHistoryIndex(replayIndex);
  if (normalizedIndex < 0) return -1;
  var store = ensureReplaySeekCheckpointStore(manager);
  if (store[normalizedIndex]) return normalizedIndex;
  var interval = resolveReplaySeekCheckpointInterval(manager);
  if (!(interval > 0)) return store[0] ? 0 : -1;
  var candidate = normalizedIndex - (normalizedIndex % interval);
  for (var index = candidate; index >= 0; index -= interval) {
    if (store[index]) return index;
  }
  return store[0] ? 0 : -1;
}

function storeReplayStateHistoryEntry(manager, replayIndex, options) {
  if (!manager) return null;
  var normalizedIndex = normalizeReplayStateHistoryIndex(replayIndex);
  if (normalizedIndex < 0) return null;
  var opts = manager.isNonArrayObject(options) ? options : {};
  if (opts.allowBypass !== true && shouldBypassReplayStateHistory(manager)) return null;
  var entry = opts.entry || createReplayStateHistoryEntry(manager);
  if (!(entry && manager.isNonArrayObject(entry))) return null;
  var store = ensureReplayStateHistoryStore(manager);
  store[normalizedIndex] = entry;
  if (!Number.isInteger(manager.replayStateHistoryMaxIndex) || normalizedIndex > manager.replayStateHistoryMaxIndex) {
    manager.replayStateHistoryMaxIndex = normalizedIndex;
  }
  pruneReplayStateHistoryStore(manager, normalizedIndex);
  return entry;
}

function getReplayStateHistoryEntry(manager, replayIndex) {
  if (!manager) return null;
  var normalizedIndex = normalizeReplayStateHistoryIndex(replayIndex);
  if (normalizedIndex < 0) return null;
  var store = ensureReplayStateHistoryStore(manager);
  return cloneReplayStateHistoryEntry(manager, store[normalizedIndex]);
}

function initializeReplayStateHistory(manager) {
  clearReplayStateHistory(manager);
  clearReplaySeekCheckpointStore(manager);
  var entry = storeReplayStateHistoryEntry(manager, 0, { allowBypass: true });
  if (entry) storeReplaySeekCheckpointEntry(manager, 0, { entry: entry, force: true });
  return entry;
}

function shouldPrimeReplaySeekCheckpoints(manager) {
  if (!manager) return false;
  var replayMoves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
  return replayMoves.length > REPLAY_SEEK_TAIL_HISTORY_LENGTH;
}

function primeReplaySeekCheckpoints(manager) {
  if (!shouldPrimeReplaySeekCheckpoints(manager)) return;
  var startEntry = getReplayStateHistoryEntry(manager, 0);
  if (!(startEntry && manager.isNonArrayObject(startEntry))) return;
  executeReplaySeekWithoutIntermediateActuation(manager, function () {
    pauseReplay(manager);
    executeReplaySeekSteps(manager, manager.replayMoves.length);
    applyReplayStateHistoryEntry(manager, 0, {
      entry: startEntry
    });
  });
}

function shouldBypassReplayStateHistory(manager) {
  return !!(manager && manager.replayStateHistoryBypass === true);
}

function createReplayStateHistoryBypassGuard(manager) {
  return { hadBypass: shouldBypassReplayStateHistory(manager) };
}

function beginReplayStateHistoryBypass(manager, guard) {
  if (!(manager && guard)) return;
  manager.replayStateHistoryBypass = true;
}

function restoreReplayStateHistoryBypass(manager, guard) {
  if (!(manager && guard)) return;
  manager.replayStateHistoryBypass = guard.hadBypass === true;
}

function executeWithReplayStateHistoryBypass(manager, callback) {
  if (!(manager && typeof callback === "function")) return;
  var guard = createReplayStateHistoryBypassGuard(manager);
  beginReplayStateHistoryBypass(manager, guard);
  try {
    callback();
  } finally {
    restoreReplayStateHistoryBypass(manager, guard);
  }
}

function executeWithReplayStateHistoryCapture(manager, callback) {
  if (!(manager && typeof callback === "function")) return;
  var guard = createReplayStateHistoryBypassGuard(manager);
  manager.replayStateHistoryBypass = false;
  try {
    callback();
  } finally {
    restoreReplayStateHistoryBypass(manager, guard);
  }
}

function collectReplayCurrentTilePositionsByValue(manager) {
  var buckets = {};
  if (!(manager && manager.grid && typeof manager.grid.eachCell === "function")) return buckets;
  manager.grid.eachCell(function (_x, _y, tile) {
    if (!tile) return;
    var key = String(Number(tile.value));
    if (!Array.isArray(buckets[key])) buckets[key] = [];
    buckets[key].push({ x: Number(tile.x), y: Number(tile.y) });
  });
  return buckets;
}

function takeReplayCurrentTilePositionByValueBucket(bucket, targetX, targetY) {
  if (!Array.isArray(bucket) || bucket.length === 0) return null;
  var bestIndex = 0;
  var bestDistance = Number.POSITIVE_INFINITY;
  for (var index = 0; index < bucket.length; index++) {
    var point = bucket[index];
    if (!(point && Number.isInteger(point.x) && Number.isInteger(point.y))) continue;
    var distance = Math.abs(point.x - targetX) + Math.abs(point.y - targetY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  var picked = bucket.splice(bestIndex, 1);
  return picked.length ? picked[0] : null;
}

function createAnimatedReplayBackwardHistoryEntry(manager, targetEntry) {
  var animatedEntry = cloneReplayStateHistoryEntry(manager, targetEntry);
  if (!(manager && animatedEntry && Array.isArray(animatedEntry.tiles))) return animatedEntry;
  var buckets = collectReplayCurrentTilePositionsByValue(manager);
  for (var tileIndex = 0; tileIndex < animatedEntry.tiles.length; tileIndex++) {
    var tile = animatedEntry.tiles[tileIndex];
    if (!(tile && Number.isFinite(tile.value) && Number.isInteger(tile.x) && Number.isInteger(tile.y))) continue;
    var bucket = buckets[String(Number(tile.value))];
    var currentPosition = takeReplayCurrentTilePositionByValueBucket(bucket, tile.x, tile.y);
    if (!currentPosition) continue;
    tile.previousPosition = {
      x: currentPosition.x,
      y: currentPosition.y
    };
  }
  return animatedEntry;
}

function cancelReplayPendingActuation(manager) {
  if (!(manager && manager.actuator && typeof manager.actuator.cancelPendingActuation === "function")) {
    return;
  }
  manager.actuator.cancelPendingActuation();
}

function restoreReplayStateHistoryEntryState(manager, entry) {
  applyUndoRestoredTiles(manager, entry);
  applyUndoRestoreState(manager, entry);
}

function finalizeReplayStateHistoryEntry(manager, normalizedIndex, options) {
  manager.replayMode = true;
  setRuntimeReplayIndexForReplay(manager, normalizedIndex);
  if (options.animate !== true && typeof manager.clearTransientTileVisualState === "function") {
    manager.clearTransientTileVisualState();
  }
  if (manager.actuator && typeof manager.actuator.invalidateLayoutCache === "function") {
    manager.actuator.invalidateLayoutCache();
  }
  manager.actuate();
}

function applyReplayStateHistoryEntry(manager, replayIndex, options) {
  if (!manager) return false;
  var normalizedIndex = normalizeReplayStateHistoryIndex(replayIndex);
  if (normalizedIndex < 0) return false;
  var opts = manager.isNonArrayObject(options) ? options : {};
  var entry = opts.entry || getReplayStateHistoryEntry(manager, normalizedIndex);
  if (!(entry && manager.isNonArrayObject(entry))) return false;
  cancelReplayPendingActuation(manager);
  restoreReplayStateHistoryEntryState(manager, entry);
  finalizeReplayStateHistoryEntry(manager, normalizedIndex, opts);
  return true;
}

function tryRestoreReplayStateHistoryBackward(manager, stepCount) {
  if (!(manager && Array.isArray(manager.replayMoves))) return false;
  var currentIndex = normalizeReplayStateHistoryIndex(manager.replayIndex);
  if (currentIndex <= 0) return false;
  var normalizedStepCount = Math.max(1, Math.floor(Number(stepCount) || 0));
  var targetIndex = Math.max(0, currentIndex - normalizedStepCount);
  var targetEntry = getReplayStateHistoryEntry(manager, targetIndex);
  if (!(targetEntry && manager.isNonArrayObject(targetEntry))) return false;
  if (normalizedStepCount === 1) {
    targetEntry = createAnimatedReplayBackwardHistoryEntry(manager, targetEntry);
  }
  return applyReplayStateHistoryEntry(manager, targetIndex, {
    entry: targetEntry,
    animate: normalizedStepCount === 1
  });
}

function createReplaySeekAnchorPlan(kind, replayIndex, entry, isExact) {
  return {
    kind: kind,
    replayIndex: replayIndex,
    entry: entry || null,
    isExact: isExact === true
  };
}

function resolveExactReplaySeekAnchorPlan(manager, normalizedTargetIndex, currentIndex, preferExecution) {
  if (preferExecution === true && currentIndex >= 0 && currentIndex < normalizedTargetIndex) return null;
  var exactHistoryEntry = getReplayStateHistoryEntry(manager, normalizedTargetIndex);
  if (exactHistoryEntry) {
    return createReplaySeekAnchorPlan("history", normalizedTargetIndex, exactHistoryEntry, true);
  }
  var exactCheckpointEntry = getReplaySeekCheckpointEntry(manager, normalizedTargetIndex);
  if (!exactCheckpointEntry) return null;
  return createReplaySeekAnchorPlan("checkpoint", normalizedTargetIndex, exactCheckpointEntry, true);
}

function resolveReplaySeekCheckpointCandidate(manager, normalizedTargetIndex, bestIndex) {
  var checkpointIndex = resolveNearestReplaySeekCheckpointIndex(manager, normalizedTargetIndex);
  if (checkpointIndex < 0 || checkpointIndex >= normalizedTargetIndex || checkpointIndex <= bestIndex) {
    return null;
  }
  var checkpointEntry = getReplaySeekCheckpointEntry(manager, checkpointIndex);
  if (!checkpointEntry) return null;
  return createReplaySeekAnchorPlan("checkpoint", checkpointIndex, checkpointEntry, false);
}

function resolveReplaySeekBestAnchorPlan(manager, normalizedTargetIndex, currentIndex) {
  var bestPlan = createReplaySeekAnchorPlan("restart", 0, null, false);
  if (currentIndex >= 0 && currentIndex < normalizedTargetIndex) {
    bestPlan = createReplaySeekAnchorPlan("current", currentIndex, null, false);
  }
  var checkpointPlan = resolveReplaySeekCheckpointCandidate(
    manager,
    normalizedTargetIndex,
    bestPlan.replayIndex
  );
  return checkpointPlan || bestPlan;
}

function resolveReplaySeekAnchorPlan(manager, normalizedTargetIndex, options) {
  var opts = manager && manager.isNonArrayObject(options) ? options : {};
  var preferExecution = opts.preferExecution === true;
  var currentIndex = normalizeReplayStateHistoryIndex(manager && manager.replayIndex);
  if (currentIndex === normalizedTargetIndex) {
    return createReplaySeekAnchorPlan("current", currentIndex, null, true);
  }
  var exactPlan = resolveExactReplaySeekAnchorPlan(
    manager,
    normalizedTargetIndex,
    currentIndex,
    preferExecution
  );
  if (exactPlan) return exactPlan;
  return resolveReplaySeekBestAnchorPlan(manager, normalizedTargetIndex, currentIndex);
}

function applyReplaySeekAnchorPlan(manager, normalizedTargetIndex, anchorPlan) {
  if (!manager) return;
  if (!manager.isNonArrayObject(anchorPlan)) return;
  if (anchorPlan.kind === "current") return;
  if ((anchorPlan.kind === "history" || anchorPlan.kind === "checkpoint") && anchorPlan.entry) {
    applyReplayStateHistoryEntry(manager, anchorPlan.replayIndex, {
      entry: anchorPlan.entry
    });
    return;
  }
  var normalizedRewindPlan = resolveReplaySeekRewindPlan(manager, normalizedTargetIndex);
  var restartPlan = resolveReplaySeekRestartPlan(manager, normalizedRewindPlan);
  applyReplaySeekRestartPlan(manager, restartPlan);
}

function executeReplaySeekStepsWithTailHistory(manager, normalizedTargetIndex, anchorPlan) {
  if (!manager) return;
  var anchorIndex = normalizeReplayStateHistoryIndex(anchorPlan && anchorPlan.replayIndex);
  if (anchorIndex < 0) anchorIndex = 0;
  var tailStartIndex = Math.max(anchorIndex, normalizedTargetIndex - REPLAY_SEEK_TAIL_HISTORY_LENGTH);
  executeReplaySeekSteps(manager, tailStartIndex);
  executeWithReplayStateHistoryCapture(manager, function () {
    executeReplaySeekSteps(manager, normalizedTargetIndex);
  });
}

function executeReplaySeekSteps(manager, normalizedTargetIndex) {
  while (manager.replayIndex < normalizedTargetIndex) {
    executePlannedReplayStep(manager);
  }
}

function createReplaySeekActuationGuard(manager) {
  var actuator = manager ? manager.actuator : null;
  return {
    originalActuate: manager && typeof manager.actuate === "function" ? manager.actuate : null,
    actuator: actuator,
    hadForceSyncActuate: !!(actuator && actuator.forceSyncActuate === true)
  };
}

function beginReplaySeekActuationGuard(manager, guard) {
  if (!(manager && guard)) return;
  if (guard.actuator && typeof guard.actuator.cancelPendingActuation === "function") {
    guard.actuator.cancelPendingActuation();
  }
  if (guard.originalActuate) manager.actuate = function () {};
}

function restoreReplaySeekActuationGuard(manager, guard) {
  if (!(manager && guard && guard.originalActuate)) return;
  manager.actuate = guard.originalActuate;
  if (guard.actuator) guard.actuator.forceSyncActuate = true;
  if (manager.actuator && typeof manager.actuator.invalidateLayoutCache === "function") {
    manager.actuator.invalidateLayoutCache();
  }
  if (typeof manager.clearTransientTileVisualState === "function") {
    manager.clearTransientTileVisualState();
  }
  manager.actuate();
  if (guard.actuator) guard.actuator.forceSyncActuate = guard.hadForceSyncActuate;
}

function executeReplaySeekWithoutIntermediateActuation(manager, callback) {
  if (!manager || typeof callback !== "function") return;
  var guard = createReplaySeekActuationGuard(manager);
  beginReplaySeekActuationGuard(manager, guard);
  try {
    executeWithReplayStateHistoryBypass(manager, callback);
  } finally {
    restoreReplaySeekActuationGuard(manager, guard);
  }
}

function seekReplay(manager, targetIndex, options) {
  if (!manager) return;
  var normalizedTargetIndex = normalizeReplaySeekTargetIndex(manager, targetIndex);
  var anchorPlan = resolveReplaySeekAnchorPlan(manager, normalizedTargetIndex, options);
  if (anchorPlan.isExact === true && anchorPlan.kind === "current") return;
  executeReplaySeekWithoutIntermediateActuation(manager, function () {
    pauseReplay(manager);
    applyReplaySeekAnchorPlan(manager, normalizedTargetIndex, anchorPlan);
    if (manager.replayIndex < normalizedTargetIndex) {
      executeReplaySeekStepsWithTailHistory(manager, normalizedTargetIndex, anchorPlan);
    }
  });
  storeReplayStateHistoryEntry(manager, normalizedTargetIndex, { allowBypass: true });
  storeReplaySeekCheckpointEntry(manager, normalizedTargetIndex);
}

function normalizeReplayStepDelta(delta) {
  var normalizedDelta = Number(delta);
  if (!Number.isFinite(normalizedDelta)) return 0;
  normalizedDelta = normalizedDelta > 0 ? Math.floor(normalizedDelta) : Math.ceil(normalizedDelta);
  return normalizedDelta;
}

function shouldUseAnimatedReplayStep(manager, normalizedDelta, options) {
  if (!(options && typeof options === "object" && options.preferAnimatedStep === true)) return false;
  if (normalizedDelta !== 1) return false;
  if (!(manager && manager.replayMode)) return false;
  return Array.isArray(manager.replayMoves);
}

function stepReplay(manager, delta, options) {
  if (!manager || !manager.replayMoves) return;
  var normalizedDelta = normalizeReplayStepDelta(delta);
  if (normalizedDelta === 0) return;
  if (normalizedDelta < 0) {
    pauseReplay(manager);
    if (tryRestoreReplayStateHistoryBackward(manager, Math.abs(normalizedDelta))) return;
  }
  if (shouldUseAnimatedReplayStep(manager, normalizedDelta, options)) {
    if (manager.replayIndex >= manager.replayMoves.length) return;
    pauseReplay(manager);
    executePlannedReplayStep(manager);
    return;
  }
  manager.seek(manager.replayIndex + normalizedDelta, {
    preferExecution: normalizedDelta > 0
  });
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
  if (!manager.replayMode && manager.sessionReplayV3 && manager.modeKey === "practice") {
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

function resolveInvalidatedSecondaryTimerPayloadValue(manager, value) {
  if (typeof resolveSecondaryTimerSlotByValue === "function") {
    return resolveSecondaryTimerSlotByValue(manager, value);
  }
  return value;
}

function createSecondaryTimerPayloadDescriptor(manager, descriptor) {
  if (!descriptor) return null;
  return {
    parent: descriptor.parent,
    child: descriptor.child,
    parentReached: isSecondaryTimerParentReached(manager, descriptor.parent)
  };
}

function createInvalidatedSecondaryTimerElementIdsPayload(manager, value) {
  var descriptors = resolveSecondaryTimerDescriptors(manager);
  var payloadDescriptors = [];
  var normalizedValue = resolveInvalidatedSecondaryTimerPayloadValue(manager, value);
  for (var i = 0; i < descriptors.length; i++) {
    var payloadDescriptor = createSecondaryTimerPayloadDescriptor(manager, descriptors[i]);
    if (!payloadDescriptor) continue;
    payloadDescriptors.push(payloadDescriptor);
  }
  return {
    descriptors: payloadDescriptors,
    value: normalizedValue
  };
}

function resolveInvalidatedSecondaryTimerElementIdsByCore(manager, value) {
  return resolveCoreArgsCallWith(
    manager,
    "callCoreTimerIntervalRuntime",
    "resolveInvalidatedSecondaryTimerElementIds",
    [createInvalidatedSecondaryTimerElementIdsPayload(manager, value)],
    undefined,
    function (currentManager, coreCallResult) {
      return currentManager.resolveNormalizedCoreValueOrUndefined(coreCallResult, function (coreValue) {
        return Array.isArray(coreValue) ? coreValue : [];
      });
    }
  );
}

function resolveInvalidatedSecondaryTimerElementIdsFallback(manager, value) {
  var placedValue = typeof resolveSecondaryTimerSlotByValue === "function"
    ? resolveSecondaryTimerSlotByValue(manager, value)
    : normalizeSecondaryTimerValue(value);
  if (placedValue === null || placedValue < 2048) return [];
  var descriptors = resolveSecondaryTimerDescriptors(manager);
  var elementIds = [];
  for (var i = 0; i < descriptors.length; i++) {
    var descriptor = descriptors[i];
    if (!descriptor || descriptor.child !== placedValue) continue;
    if (normalizeSecondaryTimerValue(descriptor.parent) <= placedValue) continue;
    if (!isSecondaryTimerParentReached(manager, descriptor.parent)) continue;
    elementIds.push(resolveSecondaryTimerValueId(descriptor.parent, descriptor.child));
  }
  return elementIds;
}

function applyInvalidatedSecondaryTimerPlaceholdersForCustomTile(manager, value) {
  var invalidatedIdsByCore = resolveInvalidatedSecondaryTimerElementIdsByCore(manager, value);
  if (typeof invalidatedIdsByCore !== "undefined") {
    applyInvalidatedTimerPlaceholders(manager, invalidatedIdsByCore);
  } else {
    applyInvalidatedTimerPlaceholders(manager, resolveInvalidatedSecondaryTimerElementIdsFallback(manager, value));
  }
}

function syncPracticeRestartBoardSnapshot(manager) {
  if (!manager || manager.modeKey !== "practice" || manager.hasGameStarted) return;
  var boardMatrix = getFinalBoardMatrix(manager);
  manager.initialBoardMatrix = cloneBoardMatrix(boardMatrix);
  manager.replayStartBoardMatrix = cloneBoardMatrix(boardMatrix);
  manager.practiceRestartBoardMatrix = cloneBoardMatrix(boardMatrix);
  manager.practiceRestartModeConfig = manager.modeConfig
    ? manager.clonePlain(manager.modeConfig)
    : null;
}

function collectPracticeBoardMilestoneValues(board) {
  var values = {};
  var rows = Array.isArray(board) ? board : [];
  for (var y = 0; y < rows.length; y++) {
    var row = Array.isArray(rows[y]) ? rows[y] : [];
    for (var x = 0; x < row.length; x++) {
      var value = Number(row[x]);
      if (!Number.isInteger(value) || value <= 0) continue;
      values[String(value)] = value;
    }
  }
  return Object.keys(values)
    .map(function (key) { return values[key]; })
    .sort(function (a, b) { return b - a; });
}

function applyPracticeSetupTimerStateFromBoard(manager, board) {
  if (!manager || manager.modeKey !== "practice") return;
  var values = collectPracticeBoardMilestoneValues(board);
  if (!values.length) {
    refreshSecondaryTimerRowsVisibility(manager);
    return;
  }
  for (var i = 0; i < values.length; i++) {
    var value = values[i];
    applyInvalidatedTimerPlaceholdersForCustomTile(manager, value);
    applyCustomTileReached32kState(manager, value);
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
  } else {
    applyInvalidatedTimerPlaceholders(manager, resolveInvalidatedTimerElementIdsFallback(manager, value));
  }
  var milestone = Number(value);
  if (Number.isInteger(milestone) && milestone >= 2048) {
    var directTimerEl = resolveManagerElementById(manager, "timer" + String(milestone));
    if (directTimerEl && String(directTimerEl.textContent || "") === "") {
      directTimerEl.textContent = "---------";
    }
  }
  applyInvalidatedSecondaryTimerPlaceholdersForCustomTile(manager, value);
  refreshSecondaryTimerRowsVisibility(manager);
}

function applyCustomTile32kTimerUpdate(manager, value) {
  if (value === 32768) {
    var timeStr = manager.pretty(manager.time);
    var timer32k = resolveManagerElementById(manager, "timer32768");
    if (timer32k && timer32k.textContent === "") {
      timer32k.textContent = timeStr;
    }
  } else if (value === 65536) {
    var timeStr64k = manager.pretty(manager.time);
    var timer64k = resolveManagerElementById(manager, "timer65536");
    if (timer64k && timer64k.textContent === "") {
      timer64k.textContent = timeStr64k;
    }
  }
}

function applyCustomTileReached32kState(manager, value) {
  if (value < 32768) {
    refreshSecondaryTimerRowsVisibility(manager);
    return;
  }
  manager.reached32k = true;
  applyCustomTile32kTimerUpdate(manager, value);
  refreshSecondaryTimerRowsVisibility(manager);
}

function insertCustomTileWithValue(manager, x, y, value) {
  var tile = new Tile({ x: x, y: y }, value);
  manager.grid.insertTile(tile);
  applyInvalidatedTimerPlaceholdersForCustomTile(manager, value);
  applyCustomTileReached32kState(manager, value);
  syncPracticeRestartBoardSnapshot(manager);
  clearTransientTileVisualState(manager);
  actuate(manager);
  // Actuate may reset timer row text in practice setup; restore placeholders afterwards.
  applyInvalidatedTimerPlaceholdersForCustomTile(manager, value);
  recordPracticeCustomTileActionIfNeeded(manager, x, y, value);
}

function resolveCustomTileEditPageVariant(manager) {
  var documentLike = resolveManagerDocumentLike(manager);
  var body = documentLike && documentLike.body ? documentLike.body : null;
  if (!body || typeof body.getAttribute !== "function") return "";
  return String(body.getAttribute("data-page-variant") || "").toLowerCase();
}

function resolveCustomTileEditPathname(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function"
    ? manager.getWindowLike()
    : null;
  if (!(windowLike && windowLike.location && windowLike.location.pathname)) return "";
  return String(windowLike.location.pathname).toLowerCase();
}

function shouldLockCustomTileEditAfterStart(manager) {
  if (!manager) return true;
  var pageVariant = resolveCustomTileEditPageVariant(manager);
  if (pageVariant === "pku2048") return true;
  var modeKey = String(manager.modeKey || manager.mode || "").toLowerCase();
  var pathname = resolveCustomTileEditPathname(manager);
  if (pathname.indexOf("practice_board") !== -1) return false;
  if (modeKey === "practice") return false;
  return true;
}

function resolveCustomTileEditMaxTile(manager) {
  if (!manager) return null;
  var modeConfigMaxTile = Number(manager.modeConfig && manager.modeConfig.max_tile);
  if (Number.isFinite(modeConfigMaxTile) && modeConfigMaxTile > 0) {
    return Math.floor(modeConfigMaxTile);
  }
  var managerMaxTile = Number(manager.maxTile);
  if (Number.isFinite(managerMaxTile) && managerMaxTile > 0) {
    return Math.floor(managerMaxTile);
  }
  return null;
}

function insertCustomTile(manager, x, y, value) {
  if (!manager) return;
  if (manager.hasGameStarted && shouldLockCustomTileEditAfterStart(manager)) return;
  if (manager.isBlockedCell(x, y)) throw "Blocked cell cannot be edited";
  var numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 0) return;
  var maxTile = resolveCustomTileEditMaxTile(manager);
  if (Number.isFinite(maxTile) && maxTile > 0 && numericValue > maxTile) return;
  var cell = { x: x, y: y };
  removeCustomTileExistingAtCell(manager, cell);
  if (numericValue === 0) {
    recordPracticeCustomTileActionIfNeeded(manager, x, y, numericValue);
    syncPracticeRestartBoardSnapshot(manager);
    clearTransientTileVisualState(manager); actuate(manager); return;
  }
  insertCustomTileWithValue(manager, x, y, numericValue);
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

function resolveReplayModeTag(modeKey, fallbackMode) {
  var key = typeof modeKey === "string" && modeKey ? modeKey : fallbackMode || "";
  if (key && key.indexOf("capped") !== -1) return "capped";
  if (key && key.indexOf("practice") !== -1) return "practice";
  return "classic";
}

function createDefaultReplayV3Session(manager) {
  return {
    v: 3,
    mode: resolveReplayModeTag(manager.modeKey, manager.mode),
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

function resolveSerializedReplayV3Mode(manager, source) {
  return resolveReplayModeTag(source.mode_key || source.mode, manager.modeKey || manager.mode);
}

function resolveSerializedReplayV3ModeKey(manager, source) {
  return source.mode_key || manager.modeKey;
}

function resolveSerializedReplayV3BoardWidth(manager, source) {
  return source.board_width || manager.width;
}

function resolveSerializedReplayV3BoardHeight(manager, source) {
  return source.board_height || manager.height;
}

function resolveSerializedReplayV3Ruleset(manager, source) {
  return source.ruleset || manager.ruleset;
}

function resolveSerializedReplayV3UndoEnabled(manager, source) {
  return typeof source.undo_enabled === "boolean" ? source.undo_enabled : !!manager.modeConfig.undo_enabled;
}

function resolveSerializedReplayV3ModeFamily(manager, source) {
  return source.mode_family || manager.modeFamily;
}

function resolveSerializedReplayV3RankPolicy(manager, source) {
  return source.rank_policy || manager.rankPolicy;
}

function resolveSerializedReplayV3SpecialRulesSnapshot(manager, source) {
  return manager.clonePlain(source.special_rules_snapshot || manager.specialRules || {});
}

function resolveSerializedReplayV3ChallengeId(manager, source) {
  return source.challenge_id || manager.challengeId || null;
}

function resolveSerializedReplayV3Actions(source) {
  return Array.isArray(source.actions) ? source.actions.slice() : [];
}

function createSerializedReplayV3(manager, source) {
  return {
    v: 3,
    mode: resolveSerializedReplayV3Mode(manager, source),
    mode_key: resolveSerializedReplayV3ModeKey(manager, source),
    board_width: resolveSerializedReplayV3BoardWidth(manager, source),
    board_height: resolveSerializedReplayV3BoardHeight(manager, source),
    ruleset: resolveSerializedReplayV3Ruleset(manager, source),
    undo_enabled: resolveSerializedReplayV3UndoEnabled(manager, source),
    mode_family: resolveSerializedReplayV3ModeFamily(manager, source),
    rank_policy: resolveSerializedReplayV3RankPolicy(manager, source),
    special_rules_snapshot: resolveSerializedReplayV3SpecialRulesSnapshot(manager, source),
    challenge_id: resolveSerializedReplayV3ChallengeId(manager, source),
    seed: source.seed,
    actions: resolveSerializedReplayV3Actions(source)
  };
}

function serializeReplayV3(manager) {
  return {
    v: 1,
    replay_logic_version: "v1",
    replay_string: serializeReplay(manager)
  };
}

function writeAutoSubmitResultRecord(manager, payload) {
  if (!manager) return;
  manager.writeLocalStorageJsonPayload("last_session_submit_result_v1", payload);
}

function resolveAutoSubmitSkippedReason(manager) {
  if (!manager) return "manager_missing";
  if (manager.replayMode) return "replay_mode";
  if (!isTerminalSessionForPersistence(manager)) return "not_game_over";
  return null;
}

function shouldAutoSubmitCompletedWinState(manager) {
  if (!manager || manager.over || !manager.won || manager.keepPlaying) return false;
  var modeConfig = manager.modeConfig && typeof manager.modeConfig === "object" ? manager.modeConfig : null;
  var maxTile = Math.floor(Number(modeConfig && modeConfig.max_tile));
  if (Number.isInteger(maxTile) && maxTile > 0) return true;
  var specialRules = modeConfig && modeConfig.special_rules && typeof modeConfig.special_rules === "object"
    ? modeConfig.special_rules
    : (manager.specialRules && typeof manager.specialRules === "object" ? manager.specialRules : null);
  return !!(specialRules && specialRules.enforce_max_tile === true);
}

function isTerminalSessionForPersistence(manager) {
  if (!manager || manager.replayMode) return false;
  return !!manager.over || shouldAutoSubmitCompletedWinState(manager);
}

function resolveTerminalSessionEndReason(manager) {
  if (!isTerminalSessionForPersistence(manager)) return "";
  return manager.over ? "game_over" : "win_stop";
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
  if (!manager) return {};
  return {};
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
  if (!paritySnapshot) return {};
  return {};
}

function buildAutoSubmitPayloadClientFields(windowLike, manager) {
  var endReason = resolveTerminalSessionEndReason(manager);
  return {
    client_version: (windowLike && windowLike.GAME_CLIENT_VERSION) || "1.8",
    end_reason: endReason || "game_over"
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
  var replayPayload = resolveAutoSubmitReplayPayload(manager);
  return {
    mode: resolveReplayModeTag(manager.modeKey, manager.mode),
    mode_key: manager.modeKey, board_width: manager.width, board_height: manager.height,
    ruleset: manager.ruleset, undo_enabled: !!manager.modeConfig.undo_enabled,
    ranked_bucket: manager.rankedBucket, mode_family: manager.modeFamily, rank_policy: manager.rankPolicy,
    challenge_id: manager.challengeId || null,
    special_rules_snapshot: manager.clonePlain(manager.specialRules || {}),
    score: manager.score, best_tile: bestTileValue, duration_ms: getDurationMs(manager),
    final_board: getFinalBoardMatrix(manager), ended_at: endedAt, replay: replayPayload.replay,
    replay_string: replayPayload.replayString
  };
}

function resolveAutoSubmitRescueReplayString(manager) {
  var replay = manager && manager.rescueReplayString != null ? String(manager.rescueReplayString || "").trim() : "";
  return replay || "";
}

function createAutoSubmitReplayWrapper(replayString) {
  if (!replayString) return null;
  return {
    v: 1,
    replay_logic_version: "v1",
    replay_string: replayString
  };
}

function resolveAutoSubmitReplayString(manager) {
  var replayString = "";
  try {
    replayString = String(serializeReplay(manager) || "").trim();
  } catch (_err) {
    replayString = "";
  }
  return replayString || resolveAutoSubmitRescueReplayString(manager);
}

function resolveAutoSubmitReplayObject(manager, replayString) {
  var replay = null;
  try {
    replay = serializeReplayV3(manager);
  } catch (_err2) {
    replay = null;
  }
  return replay || createAutoSubmitReplayWrapper(replayString);
}

function resolveAutoSubmitReplayPayload(manager) {
  var replayString = resolveAutoSubmitReplayString(manager);
  var replay = resolveAutoSubmitReplayObject(manager, replayString);
  return {
    replay: replay,
    replayString: replayString
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

function isPromiseLike(value) {
  return !!value && typeof value.then === "function";
}

function executeAutoSubmitWithLocalHistory(manager, localHistorySaveRecord, executionContext) {
  try {
    var saveResult = localHistorySaveRecord.method.call(localHistorySaveRecord.scope, executionContext.payload);
    if (isPromiseLike(saveResult)) {
      saveResult.then(function (savedRecord) {
        writeAutoSubmitSuccessResult(manager, executionContext.endedAt, executionContext.payload, savedRecord);
      }).catch(function (error) {
        writeAutoSubmitErrorResult(manager, executionContext.endedAt, executionContext.payload, error);
      });
      return;
    }
    writeAutoSubmitSuccessResult(manager, executionContext.endedAt, executionContext.payload, saveResult);
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
  if (typeof isTerminalSessionForPersistence === "function") {
    return !!isTerminalSessionForPersistence(manager);
  }
  return !!manager.over;
}

function v9RplCloneBoardMatrix(board) {
  if (!Array.isArray(board)) return [];
  var cloned = [];
  for (var y = 0; y < board.length; y++) {
    cloned.push(Array.isArray(board[y]) ? board[y].slice() : []);
  }
  return cloned;
}

function isV9RplBoardMatrix(board) {
  if (!Array.isArray(board) || board.length !== 4) return false;
  for (var y = 0; y < 4; y++) {
    if (!Array.isArray(board[y]) || board[y].length !== 4) return false;
    for (var x = 0; x < 4; x++) {
      var value = Number(board[y][x]);
      if (!Number.isInteger(value) || value < 0) return false;
    }
  }
  return true;
}

function isV9RplPowerOfTwo(value) {
  if (!Number.isInteger(value) || value <= 0) return false;
  return (value & (value - 1)) === 0;
}

function resolveV9RplTileExponent(value) {
  if (!Number.isInteger(value) || value < 0) throw "Invalid v9 .rpl tile value";
  if (value === 0) return 0;
  if (!isV9RplPowerOfTwo(value)) throw "v9 .rpl tile must be a power of two";
  var exponent = 0;
  var current = value;
  while (current > 1) {
    current = current / 2;
    exponent += 1;
  }
  if (exponent > 15) throw "v9 .rpl tile exponent too large";
  return exponent;
}

function encodeV9RplBoardMatrix(board) {
  if (!isV9RplBoardMatrix(board)) throw "Invalid v9 .rpl board matrix";
  var encoded = 0n;
  var positionIndex = 0;
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      var exponent = resolveV9RplTileExponent(Number(board[y][x]));
      encoded |= BigInt(exponent & 15) << BigInt(positionIndex * 4);
      positionIndex += 1;
    }
  }
  return encoded;
}

function decodeV9RplBoardEncoded(boardEncoded) {
  var encoded = BigInt.asUintN(64, typeof boardEncoded === "bigint" ? boardEncoded : BigInt(boardEncoded || 0));
  var board = [];
  var positionIndex = 0;
  for (var y = 0; y < 4; y++) {
    var row = [];
    for (var x = 0; x < 4; x++) {
      var exponent = Number((encoded >> BigInt(positionIndex * 4)) & 15n);
      row.push(exponent === 0 ? 0 : Math.pow(2, exponent));
      positionIndex += 1;
    }
    board.push(row);
  }
  return board;
}

function convertInternalDirectionToV9RplMove(direction) {
  if (direction === 3) return 0; // left
  if (direction === 1) return 1; // right
  if (direction === 0) return 2; // up
  if (direction === 2) return 3; // down
  return null;
}

function convertV9RplMoveToInternalDirection(v9Move) {
  if (v9Move === 0) return 3; // left
  if (v9Move === 1) return 1; // right
  if (v9Move === 2) return 0; // up
  if (v9Move === 3) return 2; // down
  return null;
}

function encodeV9RplActionByte(v9Move, spawnPos, spawnValue) {
  if (!Number.isInteger(v9Move) || v9Move < 0 || v9Move > 3) {
    throw "Invalid v9 .rpl move";
  }
  if (!Number.isInteger(spawnPos) || spawnPos < 0 || spawnPos > 15) {
    throw "Invalid v9 .rpl spawn position";
  }
  var spawnBit = spawnValue === 4 ? 1 : (spawnValue === 2 ? 0 : null);
  if (spawnBit === null) throw "Invalid v9 .rpl spawn value";
  return ((v9Move << 5) | (spawnPos << 1) | spawnBit) & 255;
}

function decodeV9RplActionByte(actionByte) {
  var token = Number(actionByte) & 255;
  return {
    v9Move: (token >> 5) & 3,
    spawnPos: (token >> 1) & 15,
    spawnBit: token & 1
  };
}

function collectV9RplCompactLine(line) {
  var compact = [];
  for (var index = 0; index < line.length; index++) {
    if (line[index] > 0) compact.push(line[index]);
  }
  return compact;
}

function mergeV9RplCompactedLine(compact) {
  var merged = [];
  for (var compactIndex = 0; compactIndex < compact.length; compactIndex++) {
    var current = compact[compactIndex];
    var next = compactIndex + 1 < compact.length ? compact[compactIndex + 1] : null;
    if (next !== null && current === next) {
      merged.push(current * 2);
      compactIndex += 1;
    } else {
      merged.push(current);
    }
  }
  return merged;
}

function mergeV9RplLineToLeft(line) {
  var merged = mergeV9RplCompactedLine(collectV9RplCompactLine(line));
  while (merged.length < 4) merged.push(0);
  return merged;
}

function applyV9RplHorizontalMove(board, nextBoard, v9Move) {
  var moved = false;
  for (var y = 0; y < 4; y++) {
    var sourceRow = v9Move === 0 ? board[y].slice() : board[y].slice().reverse();
    var mergedRow = mergeV9RplLineToLeft(sourceRow);
    var targetRow = v9Move === 0 ? mergedRow : mergedRow.reverse();
    for (var x = 0; x < 4; x++) {
      if (nextBoard[y][x] !== targetRow[x]) moved = true;
      nextBoard[y][x] = targetRow[x];
    }
  }
  return moved;
}

function applyV9RplVerticalMove(board, nextBoard, v9Move) {
  var moved = false;
  for (var x = 0; x < 4; x++) {
    var sourceColumn = [board[0][x], board[1][x], board[2][x], board[3][x]];
    if (v9Move === 3) sourceColumn.reverse();
    var mergedColumn = mergeV9RplLineToLeft(sourceColumn);
    if (v9Move === 3) mergedColumn.reverse();
    for (var y = 0; y < 4; y++) {
      if (nextBoard[y][x] !== mergedColumn[y]) moved = true;
      nextBoard[y][x] = mergedColumn[y];
    }
  }
  return moved;
}

function applyV9RplMoveOnBoard(board, v9Move) {
  if (!isV9RplBoardMatrix(board)) throw "Invalid v9 .rpl board matrix";
  var nextBoard = v9RplCloneBoardMatrix(board);
  if (v9Move === 0 || v9Move === 1) {
    return {
      board: nextBoard,
      moved: applyV9RplHorizontalMove(board, nextBoard, v9Move)
    };
  }
  return {
    board: nextBoard,
    moved: applyV9RplVerticalMove(board, nextBoard, v9Move)
  };
}

function applyV9RplSpawnOnBoard(board, spawn) {
  if (!isV9RplBoardMatrix(board)) throw "Invalid v9 .rpl board matrix";
  if (!(spawn && Number.isInteger(spawn.x) && Number.isInteger(spawn.y))) {
    throw "Invalid v9 .rpl spawn coordinates";
  }
  if (spawn.x < 0 || spawn.x > 3 || spawn.y < 0 || spawn.y > 3) {
    throw "Invalid v9 .rpl spawn coordinates";
  }
  if (spawn.value !== 2 && spawn.value !== 4) {
    throw "Invalid v9 .rpl spawn value";
  }
  if (board[spawn.y][spawn.x] !== 0) {
    throw "Invalid v9 .rpl spawn collision";
  }
  board[spawn.y][spawn.x] = spawn.value;
}

function resolveV9RplInitialBoardForExport(manager) {
  if (!manager) throw "Missing manager";
  if (isV9RplBoardMatrix(manager.initialBoardMatrix)) {
    return v9RplCloneBoardMatrix(manager.initialBoardMatrix);
  }
  if (isV9RplBoardMatrix(manager.replayStartBoardMatrix)) {
    return v9RplCloneBoardMatrix(manager.replayStartBoardMatrix);
  }
  var fallbackBoard = getFinalBoardMatrix(manager);
  if (isV9RplBoardMatrix(fallbackBoard)) {
    return v9RplCloneBoardMatrix(fallbackBoard);
  }
  throw "Unable to resolve v9 .rpl initial board";
}

function resolveDecodedReplayActionsFromReplayState(manager) {
  if (!(manager && manager.replayMode && Array.isArray(manager.replayMoves) && Array.isArray(manager.replaySpawns))) {
    return null;
  }
  return {
    replayMoves: manager.replayMoves.slice(),
    replaySpawns: manager.replaySpawns.slice()
  };
}

function resolveDecodedReplayActionsFromCompactLog(manager) {
  if (!(manager && typeof manager.replayCompactLog === "string")) return null;
  var decoded = decodeReplayV4ActionsFromEnvelope(manager, {
    actionsEncoded: manager.replayCompactLog
  });
  return {
    replayMoves: Array.isArray(decoded && decoded.replayMoves) ? decoded.replayMoves : [],
    replaySpawns: Array.isArray(decoded && decoded.replaySpawns) ? decoded.replaySpawns : []
  };
}

function decodeV9RplReplayActionsForExport(manager) {
  return resolveDecodedReplayActionsFromReplayState(manager) ||
    resolveDecodedReplayActionsFromCompactLog(manager) ||
    { replayMoves: [], replaySpawns: [] };
}

function resolveV9RplBoardAfterUndoStep(steps, initialBoard) {
  if (steps.length > 0) steps.pop();
  if (steps.length > 0) {
    return v9RplCloneBoardMatrix(steps[steps.length - 1].boardAfter);
  }
  return v9RplCloneBoardMatrix(initialBoard);
}

function resolveV9RplExportStepSpawn(spawns, index) {
  var spawn = spawns[index];
  if (!(spawn && Number.isInteger(spawn.x) && Number.isInteger(spawn.y))) {
    throw "Missing v9 .rpl spawn data";
  }
  if (spawn.value !== 2 && spawn.value !== 4) {
    throw "Unsupported v9 .rpl spawn value";
  }
  return spawn;
}

function resolveV9RplForwardExportMove(action) {
  if (Array.isArray(action)) throw "v9 .rpl does not support practice actions";
  var v9Move = convertInternalDirectionToV9RplMove(action);
  if (v9Move === null) throw "v9 .rpl does not support this replay action";
  return v9Move;
}

function createV9RplForwardExportStepRecord(boardBefore, boardAfter, v9Move, spawn) {
  return {
    boardBefore: boardBefore,
    boardAfter: v9RplCloneBoardMatrix(boardAfter),
    v9Move: v9Move,
    spawnPos: spawn.x + spawn.y * 4,
    spawnValue: spawn.value
  };
}

function buildV9RplForwardExportStep(currentBoard, action, spawn) {
  var v9Move = resolveV9RplForwardExportMove(action);
  var boardBefore = v9RplCloneBoardMatrix(currentBoard);
  var moveResult = applyV9RplMoveOnBoard(currentBoard, v9Move);
  if (!moveResult.moved) throw "Invalid v9 .rpl move sequence";
  var boardAfter = moveResult.board;
  applyV9RplSpawnOnBoard(boardAfter, spawn);
  return {
    step: createV9RplForwardExportStepRecord(boardBefore, boardAfter, v9Move, spawn),
    boardAfter: boardAfter
  };
}

function buildV9RplExportSteps(initialBoard, replayMoves, replaySpawns) {
  var moves = Array.isArray(replayMoves) ? replayMoves : [];
  var spawns = Array.isArray(replaySpawns) ? replaySpawns : [];
  var currentBoard = v9RplCloneBoardMatrix(initialBoard);
  var steps = [];
  for (var index = 0; index < moves.length; index++) {
    var action = moves[index];
    if (action === -1) {
      currentBoard = resolveV9RplBoardAfterUndoStep(steps, initialBoard);
      continue;
    }
    var spawn = resolveV9RplExportStepSpawn(spawns, index);
    var builtStep = buildV9RplForwardExportStep(currentBoard, action, spawn);
    currentBoard = builtStep.boardAfter;
    steps.push(builtStep.step);
  }
  return steps;
}

function writeV9RplUint64LE(view, byteOffset, value) {
  var encoded = BigInt.asUintN(64, typeof value === "bigint" ? value : BigInt(value || 0));
  for (var byteIndex = 0; byteIndex < 8; byteIndex++) {
    view.setUint8(byteOffset + byteIndex, Number((encoded >> BigInt(byteIndex * 8)) & 255n));
  }
}

function readV9RplUint64LE(view, byteOffset) {
  var encoded = 0n;
  for (var byteIndex = 0; byteIndex < 8; byteIndex++) {
    encoded |= BigInt(view.getUint8(byteOffset + byteIndex)) << BigInt(byteIndex * 8);
  }
  return encoded;
}

function createV9RplPlaceholderRates(v9Move) {
  var rates = [0, 0, 0, 0];
  if (Number.isInteger(v9Move) && v9Move >= 0 && v9Move < 4) {
    rates[v9Move] = 4000000000;
  }
  return rates;
}

function resolveV9RplSentinelValues() {
  return Array.isArray(GameManager.REPLAY_V9_RPL_SENTINEL)
    ? GameManager.REPLAY_V9_RPL_SENTINEL
    : [0, 88, 666666666, 233333333, 314159265, 987654321];
}

function createV9RplSentinelRow() {
  var sentinel = resolveV9RplSentinelValues();
  return {
    boardEncoded: BigInt(Number(sentinel[0]) || 0),
    actionByte: Number(sentinel[1]) & 255,
    rates: [
      Number(sentinel[2]) >>> 0,
      Number(sentinel[3]) >>> 0,
      Number(sentinel[4]) >>> 0,
      Number(sentinel[5]) >>> 0
    ]
  };
}

function writeV9RplRecordRow(view, rowIndex, row) {
  var recordBytes = Number(GameManager.REPLAY_V9_RPL_RECORD_BYTES) || 25;
  var byteOffset = rowIndex * recordBytes;
  writeV9RplUint64LE(view, byteOffset, row.boardEncoded);
  byteOffset += 8;
  view.setUint8(byteOffset, Number(row.actionByte) & 255);
  byteOffset += 1;
  var rates = Array.isArray(row.rates) ? row.rates : [0, 0, 0, 0];
  view.setUint32(byteOffset, Number(rates[0]) >>> 0, true);
  byteOffset += 4;
  view.setUint32(byteOffset, Number(rates[1]) >>> 0, true);
  byteOffset += 4;
  view.setUint32(byteOffset, Number(rates[2]) >>> 0, true);
  byteOffset += 4;
  view.setUint32(byteOffset, Number(rates[3]) >>> 0, true);
}

function readV9RplRecordRow(view, rowIndex) {
  var recordBytes = Number(GameManager.REPLAY_V9_RPL_RECORD_BYTES) || 25;
  var byteOffset = rowIndex * recordBytes;
  return {
    boardEncoded: readV9RplUint64LE(view, byteOffset),
    actionByte: view.getUint8(byteOffset + 8),
    rates: [
      view.getUint32(byteOffset + 9, true),
      view.getUint32(byteOffset + 13, true),
      view.getUint32(byteOffset + 17, true),
      view.getUint32(byteOffset + 21, true)
    ]
  };
}

function isV9RplSentinelRow(row) {
  var sentinelRow = createV9RplSentinelRow();
  return row.boardEncoded === sentinelRow.boardEncoded &&
    row.actionByte === sentinelRow.actionByte &&
    row.rates[0] === sentinelRow.rates[0] &&
    row.rates[1] === sentinelRow.rates[1] &&
    row.rates[2] === sentinelRow.rates[2] &&
    row.rates[3] === sentinelRow.rates[3];
}

function buildV9RplBytesFromSteps(steps) {
  var rows = Array.isArray(steps) ? steps : [];
  var recordBytes = Number(GameManager.REPLAY_V9_RPL_RECORD_BYTES) || 25;
  var rowCount = rows.length + 1;
  var buffer = new ArrayBuffer(recordBytes * rowCount);
  var view = new DataView(buffer);
  for (var index = 0; index < rows.length; index++) {
    var step = rows[index];
    writeV9RplRecordRow(view, index, {
      boardEncoded: encodeV9RplBoardMatrix(step.boardBefore),
      actionByte: encodeV9RplActionByte(step.v9Move, step.spawnPos, step.spawnValue),
      rates: createV9RplPlaceholderRates(step.v9Move)
    });
  }
  writeV9RplRecordRow(view, rows.length, createV9RplSentinelRow());
  return new Uint8Array(buffer);
}

function normalizeV9RplBufferLike(sourceBuffer) {
  if (sourceBuffer instanceof ArrayBuffer) {
    return new Uint8Array(sourceBuffer);
  }
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(sourceBuffer)) {
    return new Uint8Array(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength);
  }
  return null;
}

function assertValidV9RplBytesLength(bytes, recordBytes) {
  if (!(bytes && Number.isInteger(bytes.byteLength))) throw "Invalid .rpl payload";
  if (bytes.byteLength < recordBytes * 2 || bytes.byteLength % recordBytes !== 0) {
    throw "Invalid .rpl payload length";
  }
}

function readV9RplRowsFromBytes(bytes, rowCount) {
  var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  var rows = [];
  for (var rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    rows.push(readV9RplRecordRow(view, rowIndex));
  }
  return rows;
}

function decodeV9RplReplayActionsFromRows(stepRows) {
  var replayMoves = [];
  var replaySpawns = [];
  for (var index = 0; index < stepRows.length; index++) {
    var decodedAction = decodeV9RplActionByte(stepRows[index].actionByte);
    var direction = convertV9RplMoveToInternalDirection(decodedAction.v9Move);
    if (direction === null) throw "Invalid .rpl move";
    replayMoves.push(direction);
    replaySpawns.push({
      x: decodedAction.spawnPos % 4,
      y: Math.floor(decodedAction.spawnPos / 4),
      value: decodedAction.spawnBit === 1 ? 4 : 2
    });
  }
  return { replayMoves: replayMoves, replaySpawns: replaySpawns };
}

function parseV9RplBytes(bytes) {
  var recordBytes = Number(GameManager.REPLAY_V9_RPL_RECORD_BYTES) || 25;
  assertValidV9RplBytesLength(bytes, recordBytes);
  var rowCount = bytes.byteLength / recordBytes;
  var rows = readV9RplRowsFromBytes(bytes, rowCount);
  if (!isV9RplSentinelRow(rows[rowCount - 1])) throw "Invalid .rpl sentinel";
  var stepRows = rows.slice(0, rowCount - 1);
  if (!stepRows.length) throw "Empty .rpl replay";
  var decodedActions = decodeV9RplReplayActionsFromRows(stepRows);
  return {
    initialBoard: decodeV9RplBoardEncoded(stepRows[0].boardEncoded),
    replayMoves: decodedActions.replayMoves,
    replaySpawns: decodedActions.replaySpawns
  };
}

function encodeV9RplBytesToBase64(manager, bytes) {
  var windowLike = manager ? manager.getWindowLike() : null;
  var btoaFn = windowLike && typeof windowLike.btoa === "function"
    ? windowLike.btoa
    : (typeof btoa === "function" ? btoa : null);
  if (typeof btoaFn !== "function") throw "Base64 encoder is unavailable";
  var binary = "";
  var chunkSize = 32768;
  for (var offset = 0; offset < bytes.length; offset += chunkSize) {
    var chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoaFn(binary);
}

function decodeV9RplBase64ToBytes(manager, encodedBase64) {
  var windowLike = manager ? manager.getWindowLike() : null;
  var atobFn = windowLike && typeof windowLike.atob === "function"
    ? windowLike.atob
    : (typeof atob === "function" ? atob : null);
  if (typeof atobFn !== "function") throw "Base64 decoder is unavailable";
  var binary = atobFn(encodedBase64);
  var bytes = new Uint8Array(binary.length);
  for (var index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index) & 255;
  }
  return bytes;
}

function assertV9RplExportModeSupported(manager) {
  if (!manager) throw "Missing manager";
  if (manager.width !== 4 || manager.height !== 4 || manager.isFibonacciMode()) {
    throw "v9 .rpl export only supports 4x4 power-of-two modes";
  }
}

function resolveV9RplExportStepsFromManager(manager, initialBoard) {
  var replayActions = decodeV9RplReplayActionsForExport(manager);
  return buildV9RplExportSteps(
    initialBoard,
    replayActions.replayMoves,
    replayActions.replaySpawns
  );
}

function resolveV9RplReplayPayloadForExport(manager) {
  assertV9RplExportModeSupported(manager);
  var initialBoard = resolveV9RplInitialBoardForExport(manager);
  var steps = resolveV9RplExportStepsFromManager(manager, initialBoard);
  if (!steps.length) throw "No v9-compatible replay steps";
  return {
    initialBoard: initialBoard,
    steps: steps,
    bytes: buildV9RplBytesFromSteps(steps)
  };
}

function buildV9RplExportFilename(manager, stepCount) {
  var now = new Date();
  var year = String(now.getFullYear());
  var month = String(now.getMonth() + 1).padStart(2, "0");
  var day = String(now.getDate()).padStart(2, "0");
  var hour = String(now.getHours()).padStart(2, "0");
  var minute = String(now.getMinutes()).padStart(2, "0");
  var second = String(now.getSeconds()).padStart(2, "0");
  var modeKey = String((manager && manager.modeKey) || "standard_4x4_pow2_no_undo").replace(/[^a-zA-Z0-9_-]/g, "_");
  return "replay_" + modeKey + "_" + year + month + day + "_" + hour + minute + second + "_" + String(stepCount) + ".rpl";
}

function serializeReplayAsV9RplBase64(manager) {
  return serializeReplay(manager);
}

function resolveV9VerseMoveChunkFromV9Move(v9Move) {
  if (v9Move === 0) return 3;
  if (v9Move === 1) return 1;
  if (v9Move === 2) return 0;
  if (v9Move === 3) return 2;
  return null;
}

function validateV9VerseTokenInput(moveChunk, spawnPos, spawnValue) {
  if (!Number.isInteger(moveChunk) || moveChunk < 0 || moveChunk > 3) {
    throw "Invalid v9 verse move chunk";
  }
  if (!Number.isInteger(spawnPos) || spawnPos < 0 || spawnPos > 15) {
    throw "Invalid v9 verse spawn position";
  }
  if (spawnValue !== 2 && spawnValue !== 4) {
    throw "Invalid v9 verse spawn value";
  }
}

function resolveV9VerseTokenValue(moveChunk, spawnPos, spawnValue) {
  var spawnBit = spawnValue === 4 ? 1 : 0;
  return ((moveChunk & 3) << 5) |
    ((spawnBit & 1) << 4) |
    ((spawnPos & 3) << 2) |
    ((spawnPos >> 2) & 3);
}

function encodeV9VerseToken(moveChunk, spawnPos, spawnValue) {
  validateV9VerseTokenInput(moveChunk, spawnPos, spawnValue);
  var token = resolveV9VerseTokenValue(moveChunk, spawnPos, spawnValue);
  if (token < 0 || token >= V9_VERSE_PNG_CHARSET.length) {
    throw "Invalid v9 verse token";
  }
  return V9_VERSE_PNG_CHARSET[token];
}

function resolveV9VerseStartupSpawns(initialBoard) {
  if (!isV9RplBoardMatrix(initialBoard)) throw "Invalid v9 verse initial board";
  var spawns = [];
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      var value = Number(initialBoard[y][x]);
      if (value === 0) continue;
      if (value !== 2 && value !== 4) {
        throw "v9 verse startup tiles must be 2 or 4";
      }
      spawns.push({ x: x, y: y, value: value });
    }
  }
  if (spawns.length !== 2) {
    throw "v9 verse replay requires exactly 2 startup tiles";
  }
  return spawns;
}

function resolveV9VerseReplayPayloadForExport(manager) {
  var payload = resolveV9RplReplayPayloadForExport(manager);
  var startupSpawns = resolveV9VerseStartupSpawns(payload.initialBoard);
  var tokens = [];
  tokens.push(encodeV9VerseToken(0, startupSpawns[0].x + startupSpawns[0].y * 4, startupSpawns[0].value));
  tokens.push(encodeV9VerseToken(0, startupSpawns[1].x + startupSpawns[1].y * 4, startupSpawns[1].value));
  for (var index = 0; index < payload.steps.length; index++) {
    var step = payload.steps[index];
    var moveChunk = resolveV9VerseMoveChunkFromV9Move(step.v9Move);
    if (!Number.isInteger(moveChunk)) throw "Invalid v9 verse move";
    tokens.push(encodeV9VerseToken(moveChunk, step.spawnPos, step.spawnValue));
  }
  var prefix = String(GameManager.REPLAY_V9_VERSE_PREFIX || "replay_");
  return {
    text: prefix + tokens.join(""),
    stepCount: payload.steps.length
  };
}

function serializeReplayAsV9Verse(manager) {
  return serializeReplay(manager);
}

function buildV9VerseExportFilename(manager, stepCount) {
  var rplFilename = buildV9RplExportFilename(manager, stepCount);
  if (/\.rpl$/i.test(rplFilename)) return rplFilename.replace(/\.rpl$/i, ".txt");
  return rplFilename + ".txt";
}

function exportReplayAsV9VerseBlob(manager) {
  var replayText = serializeReplay(manager);
  var windowLike = manager ? manager.getWindowLike() : null;
  var BlobCtor = windowLike && typeof windowLike.Blob === "function"
    ? windowLike.Blob
    : (typeof Blob === "function" ? Blob : null);
  if (typeof BlobCtor !== "function") throw "Blob API is unavailable";
  return {
    blob: new BlobCtor([replayText], { type: "text/plain;charset=utf-8" }),
    filename: "replay-v1.txt",
    stepCount: 0
  };
}

function resolveV9RplReplayModeConfig(manager) {
  if (!manager) return null;
  return manager.resolveModeConfig("standard_4x4_pow2_no_undo") ||
    manager.resolveModeConfig(manager.modeKey || manager.mode) ||
    manager.modeConfig;
}

function applyV9RplStructuredReplayEnvelope(manager, envelope, replayModeConfig) {
  applyReplayImportActions(manager, {
    replayMoves: envelope.replayMoves,
    replaySpawns: envelope.replaySpawns
  });
  setRuntimeDisableSessionSyncForReplay(manager, true);
  restartWithBoard(manager, envelope.initialBoard, replayModeConfig, { asReplay: true });
}

function applyV1RplStructuredReplayEnvelope(manager, envelope, replayModeConfig) {
  applyReplayImportActions(manager, {
    replayMoves: envelope.replayMoves,
    replaySpawns: envelope.replaySpawns
  });
  setRuntimeDisableSessionSyncForReplay(manager, true);
  restartWithBoard(manager, envelope.initialBoard, replayModeConfig, { asReplay: true });
}

function parseV9RplBufferLike(sourceBuffer) {
  var bytes = normalizeV9RplBufferLike(sourceBuffer);
  if (!bytes) throw "Invalid .rpl buffer";
  return parseV9RplBytes(bytes);
}

function createV9RplStructuredReplayEnvelope(parsed, replayModeConfig) {
  return {
    kind: "v9rpl",
    modeKey: replayModeConfig.key,
    initialBoard: parsed.initialBoard,
    replayMoves: parsed.replayMoves,
    replaySpawns: parsed.replaySpawns
  };
}

function hasReplayV1Magic(bytes) {
  return !!(bytes && bytes.length >= 4 && bytes[0] === 82 && bytes[1] === 80 && bytes[2] === 76 && bytes[3] === 49);
}

function createStructuredReplayEnvelopeFromRplBuffer(manager, sourceBuffer) {
  var bytes = normalizeV9RplBufferLike(sourceBuffer);
  if (!bytes) throw "Invalid .rpl buffer";
  if (!hasReplayV1Magic(bytes)) throw "Only replay v1 (.rpl) is supported";
  var codec = resolveReplayV1CodecRuntime(manager);
  if (!(codec && typeof codec.decodeReplayV1Rpl === "function")) throw "Replay v1 codec unavailable";
  return createReplayV1StructuredReplayEnvelope(manager, codec.decodeReplayV1Rpl(bytes));
}

function importV9RplBuffer(manager, sourceBuffer) {
  if (!manager) return false;
  try {
    return applyStructuredReplayEnvelope(manager, createStructuredReplayEnvelopeFromRplBuffer(manager, sourceBuffer));
  } catch (e) {
    alert("\u5bfc\u5165 .rpl(v1) \u56de\u653e\u51fa\u9519: " + resolveReplayImportErrorMessage(e));
    return false;
  }
}

function resolveV9RplBase64PayloadBody(trimmed) {
  var prefix = String(GameManager.REPLAY_V9_RPL_BASE64_PREFIX || "REPLAY_v9RPL_B64_");
  if (!(typeof trimmed === "string" && trimmed.indexOf(prefix) === 0)) return null;
  return trimmed.substring(prefix.length);
}

function tryParseV9RplBase64ReplayEnvelope(manager, trimmed) {
  var encodedBase64 = resolveV9RplBase64PayloadBody(trimmed);
  if (encodedBase64 === null) return null;
  var bytes = decodeV9RplBase64ToBytes(manager, encodedBase64);
  if (hasReplayV1Magic(bytes)) {
    var codec = resolveReplayV1CodecRuntime(manager);
    if (!(codec && typeof codec.decodeReplayV1Rpl === "function")) throw "Replay v1 codec unavailable";
    return createReplayV1StructuredReplayEnvelope(manager, codec.decodeReplayV1Rpl(bytes));
  }
  return createV9RplStructuredReplayEnvelope(parseV9RplBytes(bytes), resolveV9RplReplayModeConfig(manager));
}

function resolveV9VersePngMapDict() {
  if (v9VersePngMapDictCache) return v9VersePngMapDictCache;
  var nextMap = {};
  for (var index = 0; index < V9_VERSE_PNG_CHARSET.length; index++) {
    nextMap[V9_VERSE_PNG_CHARSET[index]] = index;
  }
  v9VersePngMapDictCache = nextMap;
  return v9VersePngMapDictCache;
}

function resolveV9VerseLegacyPngMapDict() {
  if (v9VerseLegacyPngMapDictCache) return v9VerseLegacyPngMapDictCache;
  var nextMap = {};
  for (var index = 0; index < V9_VERSE_PNG_CHARSET_LEGACY.length; index++) {
    nextMap[V9_VERSE_PNG_CHARSET_LEGACY[index]] = index;
  }
  v9VerseLegacyPngMapDictCache = nextMap;
  return v9VerseLegacyPngMapDictCache;
}

function hasOwnV9VerseChar(pngMapDict, char) {
  return !!(char && Object.prototype.hasOwnProperty.call(pngMapDict, char));
}

function shouldSkipV9VerseAsciiChar(char) {
  if (!char) return true;
  var code = char.charCodeAt(0);
  return code >= 32 && code <= 126;
}

function resolveV9VerseCorruptionRepairDecoder() {
  if (typeof TextDecoder !== "function") return null;
  try {
    return new TextDecoder("gb18030");
  } catch (_error) {}
  try {
    return new TextDecoder("gbk");
  } catch (_fallbackError) {}
  return null;
}

function decodeUtf8BytesAsV9VerseCorruptedText(text, decoder) {
  if (!(typeof text === "string" && text && decoder && typeof TextEncoder === "function")) return "";
  try {
    var decoded = decoder.decode(new TextEncoder().encode(text));
    if (!(typeof decoded === "string" && decoded) || decoded.indexOf("\uFFFD") !== -1) return "";
    return decoded;
  } catch (_error) {
    return "";
  }
}

function createV9VerseRepairSourceCharset() {
  var source = [];
  var seen = {};

  function append(chars) {
    for (var index = 0; index < chars.length; index++) {
      var char = chars[index];
      if (!char || Object.prototype.hasOwnProperty.call(seen, char)) continue;
      seen[char] = true;
      source.push(char);
    }
  }

  append(V9_VERSE_PNG_CHARSET);
  append(V9_VERSE_PNG_CHARSET_LEGACY);
  return source;
}

function resolveV9VerseRepairSourcePriority(sourceText) {
  var currentMap = resolveV9VersePngMapDict();
  var score = 0;
  for (var index = 0; index < sourceText.length; index++) {
    var char = sourceText.charAt(index);
    if (hasOwnV9VerseChar(currentMap, char)) {
      score += 2;
      continue;
    }
    if (shouldSkipV9VerseAsciiChar(char)) score += 1;
  }
  return score;
}

function isValidV9VerseRepairBrokenText(brokenText, sourceText) {
  return !!(
    brokenText &&
    sourceText &&
    brokenText !== sourceText &&
    brokenText.indexOf("\uFFFD") === -1
  );
}

function createV9VerseRepairEntryRecord(sourceText, priority) {
  return {
    value: sourceText,
    priority: priority
  };
}

function resolvePreferredV9VerseRepairEntry(existing, sourceText, priority) {
  if (!(existing && typeof existing === "object")) {
    return createV9VerseRepairEntryRecord(sourceText, priority);
  }
  if (priority > Number(existing.priority)) {
    return createV9VerseRepairEntryRecord(sourceText, priority);
  }
  if (priority === Number(existing.priority) && existing.value !== sourceText) return null;
  return existing;
}

function appendV9VerseRepairEntry(map, brokenText, sourceText) {
  if (!isValidV9VerseRepairBrokenText(brokenText, sourceText)) return;
  var priority = resolveV9VerseRepairSourcePriority(sourceText);
  var existing = Object.prototype.hasOwnProperty.call(map, brokenText) ? map[brokenText] : undefined;
  map[brokenText] = resolvePreferredV9VerseRepairEntry(existing, sourceText, priority);
}

function createEmptyV9VerseRepairRuntime() {
  return {
    map: {},
    maxKeyLength: 0
  };
}

function cacheV9VerseCorruptionRepairRuntime(runtime) {
  v9VerseCorruptionRepairMapCache = runtime.map;
  v9VerseCorruptionRepairMaxKeyLength = runtime.maxKeyLength;
  return {
    map: v9VerseCorruptionRepairMapCache,
    maxKeyLength: v9VerseCorruptionRepairMaxKeyLength
  };
}

function registerV9VerseRepairVariants(nextMap, decoder, sourceText) {
  var oneStep = decodeUtf8BytesAsV9VerseCorruptedText(sourceText, decoder);
  appendV9VerseRepairEntry(nextMap, oneStep, sourceText);
  var twoStep = decodeUtf8BytesAsV9VerseCorruptedText(oneStep, decoder);
  appendV9VerseRepairEntry(nextMap, twoStep, sourceText);
}

function createV9VerseCorruptionRepairEntries(charset, decoder) {
  var nextMap = {};
  for (var firstIndex = 0; firstIndex < charset.length; firstIndex++) {
    var firstChar = charset[firstIndex];
    for (var secondIndex = 0; secondIndex < charset.length; secondIndex++) {
      var secondChar = charset[secondIndex];
      if (shouldSkipV9VerseAsciiChar(firstChar) && shouldSkipV9VerseAsciiChar(secondChar)) continue;
      registerV9VerseRepairVariants(nextMap, decoder, firstChar + secondChar);
    }
  }
  return nextMap;
}

function finalizeV9VerseCorruptionRepairRuntime(nextMap) {
  var runtime = createEmptyV9VerseRepairRuntime();
  var keys = Object.keys(nextMap);
  for (var index = 0; index < keys.length; index++) {
    var key = keys[index];
    var value = nextMap[key];
    if (!(value && typeof value === "object" && typeof value.value === "string" && value.value)) continue;
    runtime.map[key] = value.value;
    if (key.length > runtime.maxKeyLength) runtime.maxKeyLength = key.length;
  }
  return runtime;
}

function buildV9VerseCorruptionRepairMap() {
  if (v9VerseCorruptionRepairMapCache) {
    return {
      map: v9VerseCorruptionRepairMapCache,
      maxKeyLength: v9VerseCorruptionRepairMaxKeyLength
    };
  }
  var decoder = resolveV9VerseCorruptionRepairDecoder();
  if (!decoder) return cacheV9VerseCorruptionRepairRuntime(createEmptyV9VerseRepairRuntime());
  var charset = createV9VerseRepairSourceCharset();
  var nextMap = createV9VerseCorruptionRepairEntries(charset, decoder);
  return cacheV9VerseCorruptionRepairRuntime(finalizeV9VerseCorruptionRepairRuntime(nextMap));
}

function hasUnsupportedV9VerseChars(body, currentMap, legacyMap) {
  for (var index = 0; index < body.length; index++) {
    var char = body.charAt(index);
    if (hasOwnV9VerseChar(currentMap, char) || hasOwnV9VerseChar(legacyMap, char)) continue;
    return true;
  }
  return false;
}

function resolveV9VerseRepairMatch(runtime, body, index) {
  var matchedKey = "";
  var replacement = "";
  var sliceLength = Math.min(runtime.maxKeyLength, body.length - index);
  while (sliceLength > 1) {
    var slice = body.substring(index, index + sliceLength);
    if (Object.prototype.hasOwnProperty.call(runtime.map, slice)) {
      matchedKey = slice;
      replacement = runtime.map[slice];
      break;
    }
    sliceLength -= 1;
  }
  return {
    matchedKey: matchedKey,
    replacement: replacement
  };
}

function repairV9VerseCorruptedBodyOnce(body, runtime) {
  var repaired = "";
  var changed = false;
  for (var index = 0; index < body.length;) {
    var match = resolveV9VerseRepairMatch(runtime, body, index);
    if (!match.matchedKey) { repaired += body.charAt(index); index += 1; continue; }
    repaired += match.replacement;
    index += match.matchedKey.length;
    changed = true;
  }
  return { body: repaired, changed: changed };
}

function repairV9VerseCorruptedBody(body) {
  if (typeof body !== "string" || !body) return body;
  var currentMap = resolveV9VersePngMapDict();
  var legacyMap = resolveV9VerseLegacyPngMapDict();
  if (!hasUnsupportedV9VerseChars(body, currentMap, legacyMap)) return body;
  var runtime = buildV9VerseCorruptionRepairMap();
  if (!runtime.maxKeyLength) return body;
  var nextBody = body;
  for (var pass = 0; pass < 2; pass++) {
    var repaired = repairV9VerseCorruptedBodyOnce(nextBody, runtime);
    if (!repaired.changed) break;
    nextBody = repaired.body;
    if (!hasUnsupportedV9VerseChars(nextBody, currentMap, legacyMap)) break;
  }
  return nextBody;
}

function scanV9VerseSpecialCharsetUsage(body, currentMap, legacyMap) {
  var usage = {
    hasCurrentSpecial: false,
    hasLegacySpecial: false
  };
  for (var index = 0; index < body.length; index++) {
    var char = body.charAt(index);
    if (shouldSkipV9VerseAsciiChar(char)) continue;
    if (hasOwnV9VerseChar(currentMap, char)) usage.hasCurrentSpecial = true;
    if (hasOwnV9VerseChar(legacyMap, char)) usage.hasLegacySpecial = true;
    if (usage.hasCurrentSpecial && usage.hasLegacySpecial) break;
  }
  return usage;
}

function resolveV9VersePngMapDictForBody(body) {
  var currentMap = resolveV9VersePngMapDict();
  if (typeof body !== "string" || !body) return currentMap;
  var legacyMap = resolveV9VerseLegacyPngMapDict();
  var usage = scanV9VerseSpecialCharsetUsage(body, currentMap, legacyMap);
  if (usage.hasLegacySpecial && !usage.hasCurrentSpecial) return legacyMap;
  return currentMap;
}

function resolveLegacyVrsNewCharMap() {
  if (legacyVrsNewCharMapCache) return legacyVrsNewCharMapCache;
  var nextMap = {};
  for (var index = 0; index < LEGACY_VRS_NEW_CHARSET.length; index++) {
    nextMap[LEGACY_VRS_NEW_CHARSET[index]] = index;
  }
  legacyVrsNewCharMapCache = nextMap;
  return legacyVrsNewCharMapCache;
}

function cloneLegacyVrsVariantConfig(config) {
  if (!config) return null;
  return {
    key: config.key,
    width: config.width,
    height: config.height,
    modeKey: config.modeKey
  };
}

function resolveLegacyVrsVariantConfig(variantKey) {
  return cloneLegacyVrsVariantConfig(LEGACY_VRS_VARIANT_CONFIG_MAP[variantKey] || null);
}

function resolveLegacyVrsModeKey(manager, variantConfig) {
  if (!variantConfig) return GameManager.DEFAULT_MODE_KEY;
  var inferred = resolveReplayV1ModeKeyByShape(variantConfig.width, variantConfig.height, false);
  var fallbackModeKey = variantConfig.modeKey || inferred;
  if (!(manager && typeof manager.resolveModeConfig === "function")) return fallbackModeKey;
  if (manager.resolveModeConfig(fallbackModeKey)) return fallbackModeKey;
  if (manager.resolveModeConfig(inferred)) return inferred;
  return manager.modeKey || fallbackModeKey;
}

function createEmptyLegacyVrsBoard(variantConfig) {
  var width = Number(variantConfig && variantConfig.width);
  var height = Number(variantConfig && variantConfig.height);
  var board = [];
  for (var y = 0; y < height; y++) {
    var row = [];
    for (var x = 0; x < width; x++) row.push(0);
    board.push(row);
  }
  return board;
}

function assertLegacyVrsReplayCellInBounds(variantConfig, x, y, label) {
  if (!variantConfig) throw "Replay variant config unavailable";
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw "Invalid " + label + " coordinates";
  if (x < 0 || x >= variantConfig.width || y < 0 || y >= variantConfig.height) {
    throw "Invalid " + label + " coordinates";
  }
}

function setLegacyVrsBoardSpawn(board, spawn, label) {
  if (!Array.isArray(board) || !(spawn && Number.isInteger(spawn.x) && Number.isInteger(spawn.y))) {
    throw "Invalid " + label + " data";
  }
  if (!Array.isArray(board[spawn.y]) || board[spawn.y][spawn.x] !== 0) {
    throw "Invalid " + label + " collision";
  }
  board[spawn.y][spawn.x] = Number(spawn.value);
}

function normalizeLegacyVrsMoveChunk(moveValue, label) {
  var mapping = [0, 2, 3, 1];
  var internalDirection = mapping[moveValue];
  if (!Number.isInteger(internalDirection)) throw "Invalid " + label + " move";
  return internalDirection;
}

function decodeLegacyVrsOldSpawnFromToken(token, variantConfig) {
  var spawnPos = ((token & 3) << 2) + ((token & 15) >> 2);
  var x = spawnPos % 4;
  var y = Math.floor(spawnPos / 4);
  assertLegacyVrsReplayCellInBounds(variantConfig, x, y, "legacy replay spawn");
  return {
    x: x,
    y: y,
    value: (((token >> 4) & 1) + 1) === 2 ? 4 : 2
  };
}

function decodeLegacyVrsOldReplayStepToken(token, variantConfig) {
  return {
    internalDirection: normalizeLegacyVrsMoveChunk((token >> 5) & 3, "legacy replay"),
    spawn: decodeLegacyVrsOldSpawnFromToken(token, variantConfig)
  };
}

function resolveLegacyVrsNewTokenValue(charMap, chunk, chunkIndex) {
  if (!(typeof chunk === "string" && chunk.length === 3)) {
    throw "Invalid VRS token length at index " + String(chunkIndex);
  }
  var value0 = charMap[chunk.charAt(0)];
  var value1 = charMap[chunk.charAt(1)];
  var value2 = charMap[chunk.charAt(2)];
  if (!Number.isInteger(value0) || !Number.isInteger(value1) || !Number.isInteger(value2)) {
    throw "Invalid VRS token at index " + String(chunkIndex);
  }
  return (value0 << 14) + (value1 << 7) + value2;
}

function decodeLegacyVrsNewSpawnFromBinary(binary, variantConfig) {
  var spawnValueBit = (binary >> 2) & 3;
  if (spawnValueBit !== 0 && spawnValueBit !== 1) throw "Invalid VRS spawn value";
  var x = (binary >> 4) & 7;
  var y = (binary >> 7) & 7;
  assertLegacyVrsReplayCellInBounds(variantConfig, x, y, "VRS spawn");
  return {
    x: x,
    y: y,
    value: spawnValueBit === 1 ? 4 : 2
  };
}

function decodeLegacyVrsNewReplayStepBinary(binary, variantConfig) {
  return {
    internalDirection: normalizeLegacyVrsMoveChunk(binary & 3, "VRS"),
    spawn: decodeLegacyVrsNewSpawnFromBinary(binary, variantConfig)
  };
}

function createLegacyVrsReplayEnvelope(manager, variantConfig, initialBoard, replayMoves, replaySpawns) {
  return {
    kind: "v9rpl",
    modeKey: resolveLegacyVrsModeKey(manager, variantConfig),
    initialBoard: initialBoard,
    replayMoves: replayMoves,
    replaySpawns: replaySpawns
  };
}

function parseLegacyVrsStructuredReplayMatch(trimmed) {
  if (!(typeof trimmed === "string" && trimmed)) return null;
  var match = /^(\d+x\d+)-([^_]*)_(.*)$/.exec(trimmed);
  if (!match) return null;
  var variantConfig = resolveLegacyVrsVariantConfig(match[1]);
  if (!variantConfig) return null;
  return {
    variantConfig: variantConfig,
    movesText: typeof match[3] === "string" ? match[3] : ""
  };
}

function createLegacyVrsStructuredDecodeState(variantConfig) {
  return {
    initialBoard: createEmptyLegacyVrsBoard(variantConfig),
    replayMoves: [],
    replaySpawns: [],
    tokenCount: 0
  };
}

function applyLegacyVrsStructuredDecodedStep(state, decodedStep) {
  if (state.tokenCount < 2) {
    setLegacyVrsBoardSpawn(state.initialBoard, decodedStep.spawn, "VRS startup");
  } else {
    state.replayMoves.push(decodedStep.internalDirection);
    state.replaySpawns.push(decodedStep.spawn);
  }
  state.tokenCount += 1;
}

function decodeLegacyVrsStructuredMovesText(variantConfig, movesText) {
  if (movesText.length < 6) throw "Invalid VRS replay payload";
  var charMap = resolveLegacyVrsNewCharMap();
  var state = createLegacyVrsStructuredDecodeState(variantConfig);
  for (var index = 0; index < movesText.length; index += 3) {
    var chunk = movesText.substring(index, index + 3);
    if (chunk.length < 3) break;
    var binary = resolveLegacyVrsNewTokenValue(charMap, chunk, state.tokenCount);
    var decodedStep = decodeLegacyVrsNewReplayStepBinary(binary, variantConfig);
    applyLegacyVrsStructuredDecodedStep(state, decodedStep);
  }
  if (state.tokenCount < 2) throw "Invalid VRS replay payload";
  return state;
}

function decodeLegacyVrsStructuredTextEnvelope(manager, trimmed) {
  var parsed = parseLegacyVrsStructuredReplayMatch(trimmed);
  if (!parsed) return null;
  var decoded = decodeLegacyVrsStructuredMovesText(parsed.variantConfig, parsed.movesText);
  return createLegacyVrsReplayEnvelope(
    manager,
    parsed.variantConfig,
    decoded.initialBoard,
    decoded.replayMoves,
    decoded.replaySpawns
  );
}

function normalizeLegacyVrsOldReplayPayload(trimmed) {
  if (typeof trimmed !== "string" || !trimmed) return null;
  var basePrefix = String(GameManager.REPLAY_V9_VERSE_PREFIX || "replay_");
  var variants = ["2x4", "3x3", "3x4"];
  for (var index = 0; index < variants.length; index++) {
    var variantKey = variants[index];
    var variantPrefix = basePrefix + variantKey;
    if (!startsWithIgnoreCase(trimmed, variantPrefix)) continue;
    return {
      variantKey: variantKey,
      body: trimmed.substring(variantPrefix.length)
    };
  }
  return null;
}

function createLegacyVrsOldVariantStartupBoard(pngMapDict, body, variantConfig) {
  var initialBoard = createEmptyLegacyVrsBoard(variantConfig);
  var firstSpawn = decodeLegacyVrsOldSpawnFromToken(decodeV9VerseTokenAt(pngMapDict, body, 0), variantConfig);
  var secondSpawn = decodeLegacyVrsOldSpawnFromToken(decodeV9VerseTokenAt(pngMapDict, body, 1), variantConfig);
  setLegacyVrsBoardSpawn(initialBoard, firstSpawn, "legacy replay startup");
  setLegacyVrsBoardSpawn(initialBoard, secondSpawn, "legacy replay startup");
  return initialBoard;
}

function decodeLegacyVrsOldVariantReplaySteps(pngMapDict, body, variantConfig) {
  var replayMoves = [];
  var replaySpawns = [];
  for (var bodyIndex = 2; bodyIndex < body.length; bodyIndex++) {
    var token = decodeV9VerseTokenAt(pngMapDict, body, bodyIndex);
    var decodedStep = decodeLegacyVrsOldReplayStepToken(token, variantConfig);
    replayMoves.push(decodedStep.internalDirection);
    replaySpawns.push(decodedStep.spawn);
  }
  return { replayMoves: replayMoves, replaySpawns: replaySpawns };
}

function decodeLegacyVrsOldVariantReplayEnvelope(manager, trimmed) {
  var normalized = normalizeLegacyVrsOldReplayPayload(trimmed);
  if (!normalized) return null;
  var variantConfig = resolveLegacyVrsVariantConfig(normalized.variantKey);
  if (!variantConfig) return null;
  var body = repairV9VerseCorruptedBody(normalized.body);
  if (body.length < 2) throw "Invalid replay payload";
  var pngMapDict = resolveV9VersePngMapDictForBody(body);
  var initialBoard = createLegacyVrsOldVariantStartupBoard(pngMapDict, body, variantConfig);
  var decoded = decodeLegacyVrsOldVariantReplaySteps(pngMapDict, body, variantConfig);
  return createLegacyVrsReplayEnvelope(
    manager,
    variantConfig,
    initialBoard,
    decoded.replayMoves,
    decoded.replaySpawns
  );
}

function startsWithIgnoreCase(text, prefix) {
  if (!(typeof text === "string" && typeof prefix === "string" && prefix)) return false;
  if (text.length < prefix.length) return false;
  return text.substring(0, prefix.length).toLowerCase() === prefix.toLowerCase();
}

function isKnownNonVerseReplayPrefix(trimmed) {
  var knownPrefixes = [
    resolveReplayV1Base64Prefix(),
    resolveReplayFibVersePrefix(),
    String(GameManager.REPLAY_V4_PREFIX || "REPLAY_v4C_"),
    String(GameManager.REPLAY_V9_RPL_BASE64_PREFIX || "REPLAY_v9RPL_B64_")
  ];
  for (var index = 0; index < knownPrefixes.length; index++) {
    if (startsWithIgnoreCase(trimmed, knownPrefixes[index])) return true;
  }
  return false;
}

function normalizeV9VerseReplayBody(trimmed) {
  if (typeof trimmed !== "string") return null;
  if (isKnownNonVerseReplayPrefix(trimmed)) return null;
  var prefix = String(GameManager.REPLAY_V9_VERSE_PREFIX || "replay_");
  if (trimmed.length < prefix.length) return null;
  if (trimmed.substring(0, prefix.length).toLowerCase() !== prefix.toLowerCase()) return null;
  return trimmed.substring(prefix.length);
}

function decodeV9VerseTokenAt(pngMapDict, body, index) {
  var char = body.charAt(index);
  if (!Object.prototype.hasOwnProperty.call(pngMapDict, char)) {
    throw "Invalid replay char at index " + String(index);
  }
  return Number(pngMapDict[char]);
}

function decodeV9VerseSpawnFromToken(token) {
  var spawnPos = ((token & 3) << 2) + ((token & 15) >> 2);
  return {
    x: spawnPos % 4,
    y: Math.floor(spawnPos / 4),
    value: (((token >> 4) & 1) + 1) === 2 ? 4 : 2
  };
}

function decodeFibVerseSpawnFromToken(token) {
  var spawnPos = ((token & 3) << 2) + ((token & 15) >> 2);
  return {
    x: spawnPos % 4,
    y: Math.floor(spawnPos / 4),
    value: (((token >> 4) & 1) + 1) === 2 ? 2 : 1
  };
}

function decodeV9VerseMoveChunkFromToken(token) {
  return (token >> 5) & 3;
}

function createEmptyV9RplBoard() {
  return [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
}

function createV9VerseDecodeStartupState(pngMapDict, body) {
  var initialBoard = createEmptyV9RplBoard();
  var firstSpawn = decodeV9VerseSpawnFromToken(decodeV9VerseTokenAt(pngMapDict, body, 0));
  var secondSpawn = decodeV9VerseSpawnFromToken(decodeV9VerseTokenAt(pngMapDict, body, 1));
  applyV9RplSpawnOnBoard(initialBoard, firstSpawn);
  applyV9RplSpawnOnBoard(initialBoard, secondSpawn);
  return {
    initialBoard: initialBoard,
    currentBoard: v9RplCloneBoardMatrix(initialBoard)
  };
}

function decodeV9VerseReplayStepToken(token, index) {
  var moveChunkToV9Move = [2, 1, 3, 0];
  var moveChunk = decodeV9VerseMoveChunkFromToken(token);
  var v9Move = moveChunkToV9Move[moveChunk];
  if (!Number.isInteger(v9Move)) throw "Invalid replay move at index " + String(index);
  return {
    v9Move: v9Move,
    internalDirection: convertV9RplMoveToInternalDirection(v9Move),
    spawn: decodeV9VerseSpawnFromToken(token)
  };
}

function decodeV9VerseReplaySteps(body, pngMapDict, currentBoard) {
  var replayMoves = [];
  var replaySpawns = [];
  for (var index = 2; index < body.length; index++) {
    var token = decodeV9VerseTokenAt(pngMapDict, body, index);
    var decodedStep = decodeV9VerseReplayStepToken(token, index);
    var moveResult = applyV9RplMoveOnBoard(currentBoard, decodedStep.v9Move);
    currentBoard = moveResult.board;
    applyV9RplSpawnOnBoard(currentBoard, decodedStep.spawn);
    replayMoves.push(decodedStep.internalDirection);
    replaySpawns.push(decodedStep.spawn);
  }
  return { replayMoves: replayMoves, replaySpawns: replaySpawns };
}

function decodeV9VerseReplayEnvelope(trimmed) {
  var body = normalizeV9VerseReplayBody(trimmed);
  if (!body) return null;
  body = repairV9VerseCorruptedBody(body);
  if (body.length < 2) throw "Invalid replay payload";
  var pngMapDict = resolveV9VersePngMapDictForBody(body);
  var startupState = createV9VerseDecodeStartupState(pngMapDict, body);
  var decodedSteps = decodeV9VerseReplaySteps(body, pngMapDict, startupState.currentBoard);
  return {
    kind: "v9rpl",
    modeKey: "standard_4x4_pow2_no_undo",
    initialBoard: startupState.initialBoard,
    replayMoves: decodedSteps.replayMoves,
    replaySpawns: decodedSteps.replaySpawns
  };
}

function normalizeFibVerseReplayBody(trimmed) {
  if (typeof trimmed !== "string") return null;
  var prefix = resolveReplayFibVersePrefix();
  if (trimmed.length < prefix.length) return null;
  if (trimmed.substring(0, prefix.length).toLowerCase() !== prefix.toLowerCase()) return null;
  return trimmed.substring(prefix.length);
}

function createFibVerseDecodeStartupState(pngMapDict, body) {
  var initialBoard = createEmptyV9RplBoard();
  var firstSpawn = decodeFibVerseSpawnFromToken(decodeV9VerseTokenAt(pngMapDict, body, 0));
  var secondSpawn = decodeFibVerseSpawnFromToken(decodeV9VerseTokenAt(pngMapDict, body, 1));
  if (initialBoard[firstSpawn.y][firstSpawn.x] !== 0) throw "Invalid replay startup collision";
  initialBoard[firstSpawn.y][firstSpawn.x] = firstSpawn.value;
  if (initialBoard[secondSpawn.y][secondSpawn.x] !== 0) throw "Invalid replay startup collision";
  initialBoard[secondSpawn.y][secondSpawn.x] = secondSpawn.value;
  return {
    initialBoard: initialBoard
  };
}

function decodeFibVerseReplayStepToken(token, index) {
  var moveChunkToV9Move = [2, 1, 3, 0];
  var moveChunk = decodeV9VerseMoveChunkFromToken(token);
  var v9Move = moveChunkToV9Move[moveChunk];
  if (!Number.isInteger(v9Move)) throw "Invalid replay move at index " + String(index);
  return {
    internalDirection: convertV9RplMoveToInternalDirection(v9Move),
    spawn: decodeFibVerseSpawnFromToken(token)
  };
}

function decodeFibVerseReplaySteps(body, pngMapDict) {
  var replayMoves = [];
  var replaySpawns = [];
  for (var index = 2; index < body.length; index++) {
    var token = decodeV9VerseTokenAt(pngMapDict, body, index);
    var decodedStep = decodeFibVerseReplayStepToken(token, index);
    replayMoves.push(decodedStep.internalDirection);
    replaySpawns.push(decodedStep.spawn);
  }
  return { replayMoves: replayMoves, replaySpawns: replaySpawns };
}

function decodeFibVerseReplayEnvelope(trimmed) {
  var body = normalizeFibVerseReplayBody(trimmed);
  if (!body) return null;
  body = repairV9VerseCorruptedBody(body);
  if (body.length < 2) throw "Invalid replay payload";
  var pngMapDict = resolveV9VersePngMapDictForBody(body);
  var startupState = createFibVerseDecodeStartupState(pngMapDict, body);
  var decodedSteps = decodeFibVerseReplaySteps(body, pngMapDict);
  return {
    kind: "v9rpl",
    modeKey: "fib_4x4_no_undo",
    initialBoard: startupState.initialBoard,
    replayMoves: decodedSteps.replayMoves,
    replaySpawns: decodedSteps.replaySpawns
  };
}

function resolveV1RplBase64PayloadBody(trimmed) {
  var prefix = resolveReplayV1Base64Prefix();
  if (!(typeof trimmed === "string" && trimmed.indexOf(prefix) === 0)) return null;
  return trimmed.substring(prefix.length);
}

function resolveReplayV1ContainsUndo(decoded) {
  if (!decoded) return false;
  if ((Number(decoded.flags) & 2) === 2) return true;
  var records = Array.isArray(decoded.records) ? decoded.records : [];
  for (var i = 0; i < records.length; i++) {
    if (records[i] && (records[i].kind === "undo1" || records[i].kind === "undon")) return true;
  }
  return false;
}

function resolveReplayV1ExtPayload(decoded, extType) {
  var records = Array.isArray(decoded && decoded.records) ? decoded.records : [];
  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    if (!(record && record.kind === "ext")) continue;
    if (Number(record.extType) !== Number(extType)) continue;
    return record.payload || null;
  }
  return null;
}

function resolveReplayV1ModeKeyFromExt(decoded) {
  var payload = resolveReplayV1ExtPayload(decoded, REPLAY_V1_EXT_MODE_KEY);
  var modeKey = decodeReplayV1Utf8Text(payload).trim();
  return modeKey || "";
}

function resolveReplayV1RulesetFromExt(decoded) {
  var payload = resolveReplayV1ExtPayload(decoded, REPLAY_V1_EXT_RULESET);
  var ruleset = decodeReplayV1Utf8Text(payload).trim().toLowerCase();
  return ruleset === "fibonacci" ? "fibonacci" : (ruleset === "pow2" ? "pow2" : "");
}

function resolveReplayV1ModeKeyByShape(width, height, hasUndo) {
  if (width === 4 && height === 4) return hasUndo ? "classic_4x4_pow2_undo" : "standard_4x4_pow2_no_undo";
  if (width === 3 && height === 4) return hasUndo ? "board_3x4_pow2_undo" : "board_3x4_pow2_no_undo";
  if (width === 2 && height === 4) return hasUndo ? "board_2x4_pow2_undo" : "board_2x4_pow2_no_undo";
  if (width === 3 && height === 3) return hasUndo ? "board_3x3_pow2_undo" : "board_3x3_pow2_no_undo";
  return GameManager.DEFAULT_MODE_KEY;
}

function resolveReplayV1ModeKeyFromDecoded(manager, decoded) {
  var extModeKey = resolveReplayV1ModeKeyFromExt(decoded);
  if (extModeKey) {
    if (!(manager && typeof manager.resolveModeConfig === "function")) return extModeKey;
    if (manager.resolveModeConfig(extModeKey)) return extModeKey;
  }
  var width = Number(decoded && decoded.width);
  var height = Number(decoded && decoded.height);
  var inferred = resolveReplayV1ModeKeyByShape(width, height, resolveReplayV1ContainsUndo(decoded));
  if (!(manager && typeof manager.resolveModeConfig === "function")) return inferred;
  return manager.resolveModeConfig(inferred) ? inferred : (manager.modeKey || inferred);
}

function resolveReplayV1RulesetFromModeKey(manager, modeKey, decoded) {
  if (manager && typeof manager.resolveModeConfig === "function") {
    var cfg = manager.resolveModeConfig(modeKey);
    if (cfg && cfg.ruleset === "fibonacci") return "fibonacci";
    if (cfg && cfg.ruleset === "pow2") return "pow2";
  }
  var extRuleset = resolveReplayV1RulesetFromExt(decoded);
  if (extRuleset) return extRuleset;
  return "pow2";
}

function createReplayV1StructuredReplayEnvelope(manager, decoded) {
  var codec = resolveReplayV1CodecRuntime(manager);
  if (!(codec && typeof codec.replayV1InitTilesToBoard === "function")) throw "Replay v1 board codec unavailable";
  if (typeof codec.replayV1RecordsToReplayActions !== "function") throw "Replay v1 action codec unavailable";
  var modeKey = resolveReplayV1ModeKeyFromDecoded(manager, decoded);
  var ruleset = resolveReplayV1RulesetFromModeKey(manager, modeKey, decoded);
  var initialBoard = codec.replayV1InitTilesToBoard(decoded.width, decoded.height, decoded.initTiles || [], ruleset);
  var actions = codec.replayV1RecordsToReplayActions(decoded.records || [], decoded.width, ruleset);
  return { kind: "v1rpl", modeKey: modeKey, initialBoard: initialBoard, replayMoves: actions.replayMoves, replaySpawns: actions.replaySpawns };
}

function parseV1RplBase64ReplayEnvelopeByBody(manager, encodedBase64) {
  if (!encodedBase64) throw "Invalid replay v1 payload";
  var codec = resolveReplayV1CodecRuntime(manager);
  if (!(codec && typeof codec.decodeReplayV1Rpl === "function")) throw "Replay v1 codec unavailable";
  var bytes = decodeV9RplBase64ToBytes(manager, encodedBase64);
  return createReplayV1StructuredReplayEnvelope(manager, codec.decodeReplayV1Rpl(bytes));
}

function tryParseV1RplBase64ReplayEnvelope(manager, trimmed) {
  var body = resolveV1RplBase64PayloadBody(trimmed);
  if (body === null) return null;
  return parseV1RplBase64ReplayEnvelopeByBody(manager, body);
}

function isReplayV4Direction(direction) {
  return Number.isInteger(direction) && direction >= 0 && direction <= 3;
}

function isReplayV4PracticeAction(action) {
  if (!Array.isArray(action) || action.length < 4) return false;
  if (String(action[0]) !== "p") return false;
  var x = Number(action[1]);
  var y = Number(action[2]);
  var value = Number(action[3]);
  if (!Number.isInteger(x) || x < 0 || x > 3) return false;
  if (!Number.isInteger(y) || y < 0 || y > 3) return false;
  if (!Number.isInteger(value) || value < 0) return false;
  if (value === 0) return true;
  var lg = Math.log(value) / Math.log(2);
  return Math.floor(lg) === lg;
}

function isReplayV4CompatibleSessionAction(action) {
  if (action === -1) return true;
  if (typeof action === "number") return isReplayV4Direction(action);
  if (!Array.isArray(action) || !action.length) return false;
  var kind = String(action[0]);
  if (kind === "m") return isReplayV4Direction(Number(action[1]));
  if (kind === "u") return true;
  if (kind === "p") return isReplayV4PracticeAction(action);
  return false;
}

function hasReplayV3IncompatibleActionsForV4(manager) {
  if (!(manager && manager.sessionReplayV3 && Array.isArray(manager.sessionReplayV3.actions))) return false;
  var actions = manager.sessionReplayV3.actions;
  for (var i = 0; i < actions.length; i++) {
    if (!isReplayV4CompatibleSessionAction(actions[i])) return true;
  }
  return false;
}

function shouldSerializeReplayAsV4(manager) {
  if (!manager) return false;
  if (manager.width !== 4 || manager.height !== 4 || manager.isFibonacciMode()) return false;
  if (!GameManager.REPLAY_V4_MODE_KEY_TO_CODE || !GameManager.REPLAY_V4_MODE_KEY_TO_CODE[manager.modeKey]) return false;
  if (hasReplayV3IncompatibleActionsForV4(manager)) return false;
  return true;
}

function resolveReplayV1SessionForSerialize(manager) {
  var session = manager && manager.sessionReplayV1;
  if (!isReplayRecordObject(session)) return null;
  if (!Array.isArray(session.init_tiles) || !Array.isArray(session.records)) return null;
  if (!Number.isInteger(session.board_width) || !Number.isInteger(session.board_height)) return null;
  return session;
}

function shouldSerializeReplayAsV1(manager) {
  var session = resolveReplayV1SessionForSerialize(manager);
  if (!manager || !session || session.supported !== true) return false;
  if (manager.modeKey === "practice") return false;
  return session.board_width === manager.width && session.board_height === manager.height;
}

function appendReplayV1ExtRecord(records, extType, rawValue) {
  var normalized = typeof rawValue === "string" ? rawValue.trim().toLowerCase() : "";
  if (!normalized) return;
  records.push({
    kind: "ext",
    extType: extType,
    payload: encodeReplayV1Utf8Text(normalized)
  });
}

function createReplayV1ExtRecords(session) {
  var records = [];
  appendReplayV1ExtRecord(records, REPLAY_V1_EXT_MODE_KEY, session && session.mode_key);
  var ruleset = typeof session.ruleset === "string" ? session.ruleset.trim().toLowerCase() : "";
  if (ruleset !== "pow2" && ruleset !== "fibonacci") return records;
  appendReplayV1ExtRecord(records, REPLAY_V1_EXT_RULESET, ruleset);
  appendReplayV1ExtRecord(records, REPLAY_V1_EXT_CHALLENGE_ID, session && session.challenge_id);
  var seedValue = Math.floor(Number(session && session.seed));
  if (Number.isInteger(seedValue) && seedValue >= 0) {
    appendReplayV1ExtRecord(records, REPLAY_V1_EXT_SEED, String(seedValue));
  }
  return records;
}

function createReplayV1SerializeInput(session) {
  var startUnixMs = normalizeReplayV1SerializedStartUnixMs(session && session.start_unix_ms);
  var extRecords = createReplayV1ExtRecords(session);
  var sourceRecords = Array.isArray(session.records) ? session.records.slice() : [];
  return {
    width: session.board_width,
    height: session.board_height,
    initTiles: session.init_tiles.slice(),
    records: extRecords.concat(sourceRecords),
    startUnixMs: startUnixMs
  };
}

function normalizeReplayV1SerializedStartUnixMs(rawStartUnixMs) {
  var parsed = Math.floor(Number(rawStartUnixMs));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  if (parsed <= 4294967295) return parsed;
  var seconds = Math.floor(parsed / 1000);
  if (Number.isFinite(seconds) && seconds > 0 && seconds <= 4294967295) {
    return seconds;
  }
  return null;
}

function shouldSerializeReplayAsFibVerse(manager) {
  var session = resolveReplayV1SessionForSerialize(manager);
  if (!manager || !session || session.supported !== true) return false;
  if (manager.width !== 4 || manager.height !== 4) return false;
  if (!(typeof manager.isFibonacciMode === "function" && manager.isFibonacciMode())) return false;
  return Array.isArray(session.init_tiles) && session.init_tiles.length >= 2;
}

function encodeFibVerseToken(moveChunk, spawnPos, spawnValueBit) {
  if (!Number.isInteger(moveChunk) || moveChunk < 0 || moveChunk > 3) throw "Invalid replay move chunk";
  if (!Number.isInteger(spawnPos) || spawnPos < 0 || spawnPos > 15) throw "Invalid replay spawn position";
  if (!Number.isInteger(spawnValueBit) || (spawnValueBit !== 0 && spawnValueBit !== 1)) {
    throw "Invalid replay spawn value bit";
  }
  var token = ((moveChunk & 3) << 5) | ((spawnValueBit & 1) << 4) | ((spawnPos & 3) << 2) | ((spawnPos >> 2) & 3);
  if (token < 0 || token >= V9_VERSE_PNG_CHARSET.length) throw "Invalid replay token";
  return V9_VERSE_PNG_CHARSET[token];
}

function resolveFibVerseStartupTokensFromSession(session) {
  var tiles = Array.isArray(session && session.init_tiles) ? session.init_tiles.slice() : [];
  tiles.sort(function (a, b) {
    return Number(a && a.cellIndex) - Number(b && b.cellIndex);
  });
  var tokens = [];
  for (var i = 0; i < tiles.length; i++) {
    var tile = tiles[i] || {};
    var cellIndex = Number(tile.cellIndex);
    var valueBit = Number(tile.valueBit);
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 15) continue;
    if (!Number.isInteger(valueBit) || (valueBit !== 0 && valueBit !== 1)) continue;
    tokens.push(encodeFibVerseToken(0, cellIndex, valueBit));
    if (tokens.length >= 2) break;
  }
  if (tokens.length < 2) throw "Invalid fibonacci replay startup tiles";
  return tokens;
}

function resolveFibVerseReplayStepRecords(records) {
  var source = Array.isArray(records) ? records : [];
  var effectiveMoves = [];
  for (var i = 0; i < source.length; i++) {
    applyFibVerseReplayRecord(effectiveMoves, source[i]);
  }
  return effectiveMoves;
}

function applyFibVerseReplayRecord(effectiveMoves, record) {
  if (!(record && typeof record === "object")) return;
  if (record.kind === "move") {
    effectiveMoves.push(record);
    return;
  }
  if (record.kind === "undo1") {
    if (effectiveMoves.length > 0) effectiveMoves.pop();
    return;
  }
  if (record.kind !== "undon") return;
  var undoCount = Number(record.undoCount);
  if (!Number.isInteger(undoCount) || undoCount <= 0) return;
  while (undoCount > 0 && effectiveMoves.length > 0) {
    effectiveMoves.pop();
    undoCount -= 1;
  }
}

function resolveFibVerseStepMoveChunk(step) {
  var v9Move = convertInternalDirectionToV9RplMove(step.dir);
  if (!Number.isInteger(v9Move)) throw "Invalid fibonacci replay move";
  var moveChunk = resolveV9VerseMoveChunkFromV9Move(v9Move);
  if (!Number.isInteger(moveChunk)) throw "Invalid fibonacci replay move";
  return moveChunk;
}

function resolveFibVerseStepSpawn(step) {
  var spawnIndex = Number(step.spawnIndex);
  var spawnValueBit = Number(step.spawnValueBit);
  if (!Number.isInteger(spawnIndex) || spawnIndex < 0 || spawnIndex > 15) throw "Invalid fibonacci replay spawn position";
  if (!Number.isInteger(spawnValueBit) || (spawnValueBit !== 0 && spawnValueBit !== 1)) throw "Invalid fibonacci replay spawn value";
  return { spawnIndex: spawnIndex, spawnValueBit: spawnValueBit };
}

function buildFibVerseReplayStepToken(step) {
  var moveChunk = resolveFibVerseStepMoveChunk(step);
  var spawn = resolveFibVerseStepSpawn(step);
  return encodeFibVerseToken(moveChunk, spawn.spawnIndex, spawn.spawnValueBit);
}

function buildFibVerseReplayTokensFromSession(session) {
  var tokens = resolveFibVerseStartupTokensFromSession(session);
  var steps = resolveFibVerseReplayStepRecords(session.records);
  for (var i = 0; i < steps.length; i++) {
    tokens.push(buildFibVerseReplayStepToken(steps[i] || {}));
  }
  return tokens;
}

function serializeReplayAsFibVerse(manager) {
  var session = resolveReplayV1SessionForSerialize(manager);
  if (!session) throw "Replay session unavailable";
  var tokens = buildFibVerseReplayTokensFromSession(session);
  return resolveReplayFibVersePrefix() + tokens.join("");
}

function serializeReplayAsV1RplBase64(manager) {
  var session = resolveReplayV1SessionForSerialize(manager);
  var codec = resolveReplayV1CodecRuntime(manager);
  if (!(session && codec && typeof codec.encodeReplayV1Rpl === "function")) throw "Replay v1 codec unavailable";
  var bytes = codec.encodeReplayV1Rpl(createReplayV1SerializeInput(session));
  return resolveReplayV1Base64Prefix() + encodeV9RplBytesToBase64(manager, bytes);
}

function trySerializeReplayAsFibVerse(manager) {
  if (!shouldSerializeReplayAsFibVerse(manager)) return null;
  try {
    return serializeReplayAsFibVerse(manager);
  } catch (_fibErr) {
    return null;
  }
}

function trySerializeReplayAsV1(manager) {
  if (!shouldSerializeReplayAsV1(manager)) return null;
  try {
    return serializeReplayAsV1RplBase64(manager);
  } catch (_err) {
    return null;
  }
}

function serializeReplayAsV3OrV4(manager) {
  if (!shouldSerializeReplayAsV4(manager)) return JSON.stringify(serializeReplayV3(manager));
  var modeCode = GameManager.REPLAY_V4_MODE_KEY_TO_CODE[manager.modeKey];
  if (!modeCode) return JSON.stringify(serializeReplayV3(manager));
  var initialBoard = manager.initialBoardMatrix || getFinalBoardMatrix(manager);
  var encodedBoard = encodeBoardV4(manager, initialBoard);
  return GameManager.REPLAY_V4_PREFIX + modeCode + encodedBoard + (manager.replayCompactLog || "");
}

function serializeReplay(manager) {
  if (!manager) return "{}";
  var replayV1 = trySerializeReplayAsV1(manager);
  if (replayV1) return replayV1;
  throw "Replay v1 codec unavailable";
}

function syncImportedReplayRuntimeState(manager, source) {
  setRuntimeReplayMovesForReplay(manager, source.replayMoves);
  if (manager.hasOwnKey(source, "replaySpawns")) {
    setRuntimeReplaySpawnsForReplay(manager, source.replaySpawns);
  }
  if (typeof source.replayMovesV2 === "string") {
    setRuntimeReplayMovesV2ForReplay(manager, source.replayMovesV2);
  }
}

function isReplayUndoHistoryAction(replayAction) {
  if (replayAction === -1) return true;
  return Array.isArray(replayAction) && String(replayAction[0]) === "u";
}

function resolveReplayImportRequiresUndoHistory(replayMoves) {
  for (var moveIndex = 0; moveIndex < replayMoves.length; moveIndex++) {
    if (isReplayUndoHistoryAction(replayMoves[moveIndex])) return true;
  }
  return false;
}

function applyReplayImportActions(manager, payload) {
  if (!manager) return;
  var source = normalizeReplayRecordObject(payload, {});
  syncImportedReplayRuntimeState(manager, source);
  var replayMoves = Array.isArray(source.replayMoves) ? source.replayMoves : [];
  manager.replayRequiresUndoHistory = resolveReplayImportRequiresUndoHistory(replayMoves);
}

function isStructuredReplayEnvelope(envelope) {
  return !!(
    envelope &&
    (envelope.kind === "v1rpl" ||
      envelope.kind === "v9rpl" ||
      envelope.kind === "v4c" ||
      envelope.kind === "v3-json")
  );
}

function applyImportedReplayUndoState(manager) {
  var importedUndoEnabled = manager.loadUndoSettingForMode(manager.modeKey);
  var undoState = manager.resolveUndoPolicyStateForMode(manager.mode);
  var forcedUndoSetting = undoState ? undoState.forcedUndoSetting : null;
  if (forcedUndoSetting !== null) {
    setRuntimeUndoEnabledForReplay(manager, forcedUndoSetting);
  } else {
    setRuntimeUndoEnabledForReplay(manager, !!importedUndoEnabled);
  }
  manager.updateUndoUiState(manager.resolveUndoPolicyStateForMode(manager.mode, {
    undoEnabled: manager.undoEnabled
  }));
  manager.notifyUndoSettingsStateChanged();
}

function startImportedReplayPlayback(manager) {
  setRuntimeReplayIndexForReplay(manager, 0);
  initializeReplayStateHistory(manager);
  primeReplaySeekCheckpoints(manager);
  setRuntimeReplayDelayForReplay(manager, 200);
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
    v1RplBase64Prefix: resolveReplayV1Base64Prefix(),
    fibVersePrefix: resolveReplayFibVersePrefix(),
    v4Prefix: GameManager.REPLAY_V4_PREFIX
  };
}

function normalizeReplayImportEnvelopeFromCore(currentManager, value) {
  if (value === null) return null;
  return currentManager.isNonArrayObject(value) ? value : undefined;
}

function normalizeParsedReplayImportEnvelope(manager, parsedEnvelope) {
  if (parsedEnvelope && parsedEnvelope.kind === "v1rpl-b64") {
    return parseV1RplBase64ReplayEnvelopeByBody(manager, parsedEnvelope.encodedBase64);
  }
  return normalizeReplayRecordObject(parsedEnvelope, null);
}

function tryDecodeFibVerseReplayEnvelope(_manager, trimmed) {
  return decodeFibVerseReplayEnvelope(trimmed);
}

function tryDecodeV9VerseReplayEnvelope(_manager, trimmed) {
  return decodeV9VerseReplayEnvelope(trimmed);
}

function tryParseV4cReplayEnvelopeFallback(_manager, trimmed) {
  return tryParseV4cReplayEnvelope(trimmed);
}

var REPLAY_IMPORT_FALLBACK_PARSERS = [
  tryParseV1RplBase64ReplayEnvelope,
  tryParseV9RplBase64ReplayEnvelope,
  decodeLegacyVrsStructuredTextEnvelope,
  decodeLegacyVrsOldVariantReplayEnvelope,
  tryDecodeFibVerseReplayEnvelope,
  tryDecodeV9VerseReplayEnvelope,
  tryParseV4cReplayEnvelopeFallback,
  tryParseReplayV3JsonEnvelope
];

function parseReplayImportEnvelopeFallback(manager, trimmed) {
  for (var index = 0; index < REPLAY_IMPORT_FALLBACK_PARSERS.length; index++) {
    var parsedEnvelope = REPLAY_IMPORT_FALLBACK_PARSERS[index](manager, trimmed);
    if (parsedEnvelope) return parsedEnvelope;
  }
  return null;
}

function parseReplayImportEnvelope(manager, trimmed) {
  var v1Envelope = tryParseV1RplBase64ReplayEnvelope(manager, trimmed);
  if (v1Envelope) return v1Envelope;
  var parsedEnvelope = resolveCorePayloadCallWith(manager, "callCoreReplayImportRuntime", "parseReplayImportEnvelope", createReplayImportEnvelopePayload(manager, trimmed), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallbackAllowNull(coreCallResult, function (value) {
      return normalizeReplayImportEnvelopeFromCore(currentManager, value);
    }, function () {
      return parseReplayImportEnvelopeFallback(currentManager, trimmed);
    }, true);
  });
  var normalizedEnvelope = normalizeParsedReplayImportEnvelope(manager, parsedEnvelope);
  if (normalizedEnvelope) return normalizedEnvelope;
  return parseReplayImportEnvelopeFallback(manager, trimmed);
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
  setRuntimeDisableSessionSyncForReplay(manager, true);
  restartWithBoard(manager, initialBoard, replayModeConfig, { asReplay: true });
}

function resolveReplayV3ModeKeyFromEnvelope(manager, replaySource) {
  var source = normalizeReplayRecordObject(replaySource, {});
  var modeKey = typeof source.mode_key === "string" && source.mode_key ? source.mode_key : "";
  if (modeKey) return modeKey;
  var modeTag = typeof source.mode === "string" ? source.mode.toLowerCase() : "";
  if (modeTag === "practice") return "practice";
  if (modeTag === "capped") return "capped_4x4_pow2_no_undo";
  if (modeTag === "classic") return "classic_4x4_pow2_undo";
  return manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY;
}

function resolveReplayV3ImportSource(manager, parsed) {
  if (Array.isArray(parsed)) return { actions: parsed };
  if (manager && typeof manager.isNonArrayObject === "function" && manager.isNonArrayObject(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  return null;
}

function normalizeReplayV3CustomFourRate(rawRate) {
  var parsed = Number(rawRate);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100) / 100;
}

function resolveReplayV3SpecialRulesSnapshotForEnvelope(source) {
  var snapshot = normalizeReplayRecordObject(source && source.special_rules_snapshot, null);
  if (!snapshot) return null;
  var customFourRate = normalizeReplayV3CustomFourRate(snapshot.custom_spawn_four_rate);
  if (customFourRate === null) return null;
  return { custom_spawn_four_rate: customFourRate };
}

function createReplayV3JsonEnvelope(manager, replaySource) {
  var normalizedSource = normalizeReplayRecordObject(replaySource, {});
  var actions = Array.isArray(normalizedSource.actions) ? normalizedSource.actions.slice() : [];
  var parsedSeed = Number(normalizedSource.seed);
  return {
    kind: "v3-json",
    modeKey: resolveReplayV3ModeKeyFromEnvelope(manager, normalizedSource),
    seed: Number.isFinite(parsedSeed) ? parsedSeed : null,
    actions: actions,
    specialRulesSnapshot: resolveReplayV3SpecialRulesSnapshotForEnvelope(normalizedSource)
  };
}

function tryParseReplayV3JsonEnvelope(manager, trimmed) {
  if (typeof trimmed !== "string" || !trimmed) return null;
  var firstChar = trimmed.charAt(0);
  if (firstChar !== "{" && firstChar !== "[") return null;
  var parsed = JSON.parse(trimmed);
  var replaySource = resolveReplayV3ImportSource(manager, parsed);
  if (!replaySource) throw "Invalid v3 replay payload";
  return createReplayV3JsonEnvelope(manager, replaySource);
}

function applyV3StructuredReplayEnvelope(manager, envelope, replayModeConfig) {
  if (!Number.isFinite(envelope && envelope.seed)) {
    throw "Missing v3 replay seed";
  }
  restartWithSeed(manager, envelope.seed, replayModeConfig);
  applyReplayImportActions(manager, {
    replayMoves: Array.isArray(envelope && envelope.actions) ? envelope.actions : [],
    replaySpawns: null
  });
  setRuntimeDisableSessionSyncForReplay(manager, true);
}

function shouldApplyReplayV3CustomSpawnOverrides(modeConfig, envelope) {
  var modeKey = "";
  if (modeConfig && typeof modeConfig.key === "string") modeKey = modeConfig.key;
  if (!modeKey && envelope && typeof envelope.modeKey === "string") modeKey = envelope.modeKey;
  return modeKey.indexOf("spawn_custom_4x4_pow2") === 0;
}

function resolveReplayV3EnvelopeCustomFourRate(envelope) {
  var source = normalizeReplayRecordObject(envelope, {});
  var snapshot = normalizeReplayRecordObject(source.specialRulesSnapshot || source.special_rules_snapshot, null);
  if (!snapshot) return null;
  return normalizeReplayV3CustomFourRate(snapshot.custom_spawn_four_rate);
}

function cloneReplayModeConfigForImport(modeConfig) {
  var nextConfig = {};
  for (var key in modeConfig) {
    if (Object.prototype.hasOwnProperty.call(modeConfig, key)) nextConfig[key] = modeConfig[key];
  }
  return nextConfig;
}

function createReplayCustomSpawnTableByRate(parsedRate) {
  var twoRate = Math.round((100 - parsedRate) * 100) / 100;
  var spawnTable = [];
  if (twoRate > 0) spawnTable.push({ value: 2, weight: twoRate });
  if (parsedRate > 0) spawnTable.push({ value: 4, weight: parsedRate });
  return spawnTable.length ? spawnTable : [{ value: 2, weight: 100 }];
}

function cloneReplaySpecialRulesForImport(specialRules) {
  var source = normalizeReplayRecordObject(specialRules, {});
  var next = {};
  for (var key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) next[key] = source[key];
  }
  return next;
}

function applyReplayV3CustomFourRateToModeConfig(modeConfig, parsedRate) {
  if (parsedRate === null || !modeConfig) return modeConfig;
  var nextConfig = cloneReplayModeConfigForImport(modeConfig);
  nextConfig.spawn_table = createReplayCustomSpawnTableByRate(parsedRate);
  var nextSpecialRules = cloneReplaySpecialRulesForImport(nextConfig.special_rules);
  nextSpecialRules.custom_spawn_four_rate = parsedRate;
  nextConfig.special_rules = nextSpecialRules;
  return nextConfig;
}

function resolveStructuredReplayModeConfig(manager, envelope) {
  var replayModeConfig = manager.resolveModeConfig(envelope.modeKey);
  if (!replayModeConfig && envelope.kind === "v9rpl") {
    replayModeConfig = resolveV9RplReplayModeConfig(manager);
  }
  if (!replayModeConfig) throw "Replay mode config unavailable";
  if (envelope.kind === "v3-json" && shouldApplyReplayV3CustomSpawnOverrides(replayModeConfig, envelope)) {
    replayModeConfig = applyReplayV3CustomFourRateToModeConfig(
      replayModeConfig,
      resolveReplayV3EnvelopeCustomFourRate(envelope)
    );
  }
  return replayModeConfig;
}

function resolveStructuredReplayEnvelopeApplyHandler(kind) {
  if (kind === "v1rpl") return applyV1RplStructuredReplayEnvelope;
  if (kind === "v9rpl") return applyV9RplStructuredReplayEnvelope;
  if (kind === "v4c") return applyV4StructuredReplayEnvelope;
  if (kind === "v3-json") return applyV3StructuredReplayEnvelope;
  return null;
}

function applyStructuredReplayEnvelopeByKind(manager, envelope, replayModeConfig) {
  var handler = resolveStructuredReplayEnvelopeApplyHandler(envelope && envelope.kind);
  if (!handler) throw "Unsupported replay format";
  handler(manager, envelope, replayModeConfig);
}

function applyStructuredReplayEnvelope(manager, envelope) {
  var replayModeConfig = resolveStructuredReplayModeConfig(manager, envelope);
  applyStructuredReplayEnvelopeByKind(manager, envelope, replayModeConfig);
  applyImportedReplayUndoState(manager);
  startImportedReplayPlayback(manager);
  return true;
}

function importReplay(manager, replayString) {
  if (!manager) return false;
  try {
    var trimmed = normalizeReplayImportSource(replayString);
    var envelope = parseReplayImportEnvelope(manager, trimmed);
    if (isStructuredReplayEnvelope(envelope)) return applyStructuredReplayEnvelope(manager, envelope);
    throw "\u4ec5\u652f\u6301\u56de\u653e v1 \u683c\u5f0f";
  } catch (e) {
    alert("\u5bfc\u5165\u56de\u653e\u51fa\u9519: " + resolveReplayImportErrorMessage(e));
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
        if (action >= 0 && action <= 7) return "m";
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
  setRuntimeReplayIndexForReplay(manager, stepExecutionPlan.nextReplayIndex);
  storeReplayStateHistoryEntry(manager, stepExecutionPlan.nextReplayIndex);
  storeReplaySeekCheckpointEntry(manager, stepExecutionPlan.nextReplayIndex);
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
  // pow2/fibonacci both display observed secondary spawn rate percentage.
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
  if (pathname.indexOf("Practice_board") !== -1) return "practice";
  if (pathname.indexOf("capped_2048") !== -1) return "capped_4x4_pow2_no_undo";
  if (
    pathname === "/" ||
    /\/$/.test(pathname) ||
    pathname.indexOf("/2048.html") !== -1 ||
    pathname.indexOf("2048.html") !== -1 ||
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

function tryHandleReplayCompactLogByCoreResult(currentManager, coreCallResult) {
  return currentManager.tryHandleCoreRawValue(coreCallResult, function (coreValue) {
    currentManager.replayCompactLog = coreValue;
  });
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
      return tryHandleReplayCompactLogByCoreResult(currentManager, coreCallResult);
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
      return tryHandleReplayCompactLogByCoreResult(currentManager, coreCallResult);
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
      return tryHandleReplayCompactLogByCoreResult(currentManager, coreCallResult);
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
  if (!Number.isInteger(direction) || direction < 0 || direction > 3) return null;
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
    rows[rows.length] = row;
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

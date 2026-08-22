(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var STORAGE_TOKEN_KEY = "2048_auth_token_v1";
  var STORAGE_USER_ID_KEY = "2048_auth_userId_v1";
  var STORAGE_NICKNAME_KEY = "2048_auth_nickname_v1";
  var STORAGE_LAST_SUBMIT_KEY = "online_last_submit_signature_v1";
  var STORAGE_PENDING_SCORE_SUBMIT_KEY = "online_pending_score_submit_v1";
  var STORAGE_LAST_RECORD_SUBMIT_KEY = "online_last_record_submit_signature_v1";
  var STORAGE_PENDING_RECORD_SUBMIT_KEY = "online_pending_record_submit_signature_v1";
  var STORAGE_PENDING_RECORD_QUEUE_KEY = "online_pending_record_submit_queue_v1";
  var STORAGE_LAST_RECORD_SUBMIT_RESULT_KEY = "online_last_record_submit_result_v1";
  var STORAGE_LAST_STONE_2K_SUBMIT_KEY = "online_last_stone_2k_submit_signature_v1";
  var STORAGE_PENDING_STONE_2K_SUBMIT_KEY = "online_pending_stone_2k_submit_v1";
  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var BEST_SCORE_STORAGE_KEY_PREFIX = "bestScoreByMode:";
  var SCORE_SUBMIT_PENDING_TTL_MS = 24 * 60 * 60 * 1000;
  var SCORE_SUBMIT_PENDING_RETRY_BASE_MS = 2000;
  var SCORE_SUBMIT_PENDING_RETRY_MAX_MS = 15000;
  var RECORD_SUBMIT_PENDING_TTL_MS = 0;
  var RECORD_SUBMIT_PENDING_QUEUE_LIMIT = 20;
  var RECORD_SUBMIT_PENDING_RETRY_BASE_MS = 2000;
  var RECORD_SUBMIT_PENDING_RETRY_MAX_MS = 15000;
  var RECORD_RESUMABLE_UPLOAD_THRESHOLD_BYTES = 1536 * 1024;
  var RECORD_RESUMABLE_UPLOAD_CHUNK_BYTES = 512 * 1024;
  var STONE_2K_SUBMIT_PENDING_TTL_MS = 24 * 60 * 60 * 1000;
  var STONE_2K_SUBMIT_PENDING_RETRY_BASE_MS = 2000;
  var STONE_2K_SUBMIT_PENDING_RETRY_MAX_MS = 15000;
  var ACCOUNT_BEST_SCORE_SYNC_FETCH_LIMIT = 500;
  var ACCOUNT_BEST_SCORE_SYNC_TTL_MS = 30000;
  var RANKED_CHECKPOINT_SAVE_DEBOUNCE_MS = 1500;
  var RANKED_CHECKPOINT_MIN_SAVE_INTERVAL_MS = 3000;
  var RANKED_CHECKPOINT_LOCAL_MIRROR_KEY_PREFIX = "ranked_checkpoint_local_mirror:v1:";
  var RANKED_CHECKPOINT_CLEAR_MARKER_KEY_PREFIX = "ranked_checkpoint_cleared_at:v1:";
  var RANKED_SESSION_ACTIVE_KEY_PREFIX = "ranked_session_active:v1:";
  var RANKED_SESSION_PREFETCH_KEY_PREFIX = "ranked_session_prefetch:v1:";
  var RANKED_ATTEMPT_SCHEMA_VERSION = 1;
  var RECORD_SCHEMA_VERSION = 1;
  var RANKED_RESTART_SETUP_DEFERRED = { rankedRestartSetupDeferred: true };
  var RANKED_RESTART_ATTEMPT_PERSIST_FAILED = { rankedRestartAttemptPersistFailed: true };
  var BREAKOUT_EASTER_EGG_GAME_URL = "./easter-eggs/breakout/index.html";
  var BREAKOUT_EASTER_EGG_TRIGGER_COUNT = 19;

  function resolveLocalStorage() {
    try {
      if (!global || !global.localStorage) return null;
      return global.localStorage;
    } catch (_err) {
      return null;
    }
  }

  function readLocalStorageItem(key) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.getItem !== "function") return null;
    try {
      return storage.getItem(key);
    } catch (_err) {
      return null;
    }
  }

  function writeLocalStorageItem(key, value) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.setItem !== "function") return false;
    try {
      storage.setItem(key, value);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function removeLocalStorageItem(key) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.removeItem !== "function") return;
    try {
      storage.removeItem(key);
    } catch (_err) {}
  }

  // --- localStorage key migration (old bare keys -> namespaced keys) ---
  (function migrateStorageKeys() {
    var migrations = [
      { oldKey: "token",    newKey: STORAGE_TOKEN_KEY },
      { oldKey: "userId",   newKey: STORAGE_USER_ID_KEY },
      { oldKey: "nickname", newKey: STORAGE_NICKNAME_KEY }
    ];
    try {
      var storage = resolveLocalStorage();
      if (!storage) return;
      for (var i = 0; i < migrations.length; i++) {
        var m = migrations[i];
        var oldVal = readLocalStorageItem(m.oldKey);
        if (oldVal != null && readLocalStorageItem(m.newKey) == null) {
          writeLocalStorageItem(m.newKey, oldVal);
        }
        if (oldVal != null) {
          removeLocalStorageItem(m.oldKey);
        }
      }
    } catch (_err) { /* localStorage unavailable or quota exceeded */ }
  })();
  var DEFAULT_BOARD_LIMIT = 10;
  var DEFAULT_API_TIMEOUT_MS = 12000;
  var MODE_BUCKET_ALIAS = {
    standard: "standard_no_undo",
    standard_no_undo: "standard_no_undo",
    standard_4x4_pow2_no_undo: "standard_no_undo",
    capped_4x4_pow2_no_undo: "capped",
    capped_4x4_pow2_64_no_undo: "capped_64",
    capped_4x4_pow2_1024_no_undo: "capped_1024",
    capped_4x4_pow2_4096_no_undo: "capped_4096",
    capped: "capped",
    capped_64: "capped_64",
    capped_1024: "capped_1024",
    capped_4096: "capped_4096",

    classic_undo: "standard_undo",
    standard_undo: "standard_undo",
    classic_4x4_pow2_undo: "standard_undo",

    pow2_3x3: "pow2_3x3",
    board_3x3_pow2_no_undo: "pow2_3x3",
    board_3x3_pow2_undo: "pow2_3x3_undo",
    pow2_3x3_undo: "pow2_3x3_undo",

    pow2_2x4: "pow2_2x4",
    board_2x4_pow2_no_undo: "pow2_2x4",
    board_2x4_pow2_undo: "pow2_2x4_undo",
    pow2_2x4_undo: "pow2_2x4_undo",

    pow2_3x4: "pow2_3x4",
    board_3x4_pow2_no_undo: "pow2_3x4",
    board_3x4_pow2_undo: "pow2_3x4_undo",
    pow2_3x4_undo: "pow2_3x4_undo",

    pow2_5x5: "pow2_5x5",
    board_5x5_pow2_no_undo: "pow2_5x5",
    pow2_5x5_undo: "pow2_5x5_undo",
    board_5x5_pow2_undo: "pow2_5x5_undo",

    diag_3x3: "diag_3x3",
    diag_3x3_pow2_no_undo: "diag_3x3",
    diag_4x4: "diag_4x4",
    diag_4x4_pow2_no_undo: "diag_4x4",
    diag_3x4: "diag_3x4",
    diag_3x4_pow2_no_undo: "diag_3x4",
    diag_2x4: "diag_2x4",
    diag_2x4_pow2_no_undo: "diag_2x4",

    obstacle_4x4: "obstacle_4x4",
    obstacle_4x4_pow2_no_undo: "obstacle_4x4",

    fib_4x4: "fib_4x4",
    fib_4x4_no_undo: "fib_4x4",
    fib_4x4_undo: "fib_4x4_undo",
    fib_3x3: "fib_3x3",
    fib_3x3_no_undo: "fib_3x3",
    fib_3x3_undo: "fib_3x3_undo",
    fib_4x3: "fib_4x3",
    fib_4x3_no_undo: "fib_4x3",
    fib_4x3_undo: "fib_4x3_undo",
    fib_4x2: "fib_4x2",
    fib_4x2_no_undo: "fib_4x2",
    fib_4x2_undo: "fib_4x2_undo"
  };
  var TIMER_LEADERBOARD_TOP_LIMIT = 10;
  var TIMER_LEADERBOARD_FETCH_LIMIT = 500;
  var TIMER_LEADERBOARD_PERIODS = ["all", "day", "week", "month"];
  var POLL_BASE_INTERVAL_VISIBLE_MS = 5000;
  var POLL_BASE_INTERVAL_HIDDEN_MS = 12000;
  var TIMER_REFRESH_INTERVAL_VISIBLE_MS = 20000;
  var TIMER_REFRESH_INTERVAL_HIDDEN_MS = 90000;
  var MODE_INTRO_REFRESH_INTERVAL_VISIBLE_MS = 45000;
  var MODE_INTRO_REFRESH_INTERVAL_HIDDEN_MS = 180000;
  var POLL_BACKOFF_MAX_MS = 60000;
  var POLL_BACKOFF_MAX_STEP = 4;
  var TIMER_LEADERBOARD_FONT_DELTA_PX = 2;
  var MIN_STEP_TARGET_TILES = [2048, 4096, 8192];
  var TIMER_LEADERBOARD_STORAGE_PREFIX = "timer_leaderboard_cache:v1:";

  // --- shared API utilities (from api_shared_utils.js) ---
  var _u = global.ApiSharedUtils || {};
  var toText = _u.toText || function (v) { return v == null ? "" : String(v); };
  var safeGetStorage = _u.safeGetStorage || function () { return null; };
  var safeSetStorage = _u.safeSetStorage || function () {};
  var safeRemoveStorage = _u.safeRemoveStorage || function () {};
  var buildApiBaseCandidates = _u.buildApiBaseCandidates || function () { return []; };
  var resolveApiTimeoutMs = _u.resolveApiTimeoutMs || function () { return DEFAULT_API_TIMEOUT_MS; };
  var sharedGetAuthToken = _u.getAuthToken || function () { return toText(safeGetStorage(STORAGE_TOKEN_KEY)).trim(); };
  var sharedSetAuthSession = _u.setAuthSession || function (payload) {
    safeSetStorage(STORAGE_TOKEN_KEY, toText(payload && payload.token));
  };
  var sharedClearAuthSession = _u.clearAuthSession || function () {
    safeRemoveStorage(STORAGE_TOKEN_KEY);
    safeRemoveStorage(STORAGE_USER_ID_KEY);
    safeRemoveStorage(STORAGE_NICKNAME_KEY);
  };
  var sharedFetchWithAuth = _u.fetchWithAuth || function (url, requestInit) {
    return callFetch(url, requestInit);
  };
  var callFetch = _u.callFetch || function (url, requestInit) {
    if (!global || typeof global["fetch"] !== "function") {
      return Promise.reject(new Error("fetch_unavailable"));
    }
    return global["fetch"](url, requestInit);
  };

  var apiBases = buildApiBaseCandidates();
  var activeApiBase = apiBases[0];
  var cachedLeaderboard = [];
  var cachedLeaderboardMode = "";
  var timerLeaderboardCacheRows = [];
  var timerLeaderboardCacheMode = "";
  var timerLeaderboardCacheTime = 0;
  var timerLeaderboardCacheByKey = Object.create(null);
  var timerLeaderboardLoadingByKey = Object.create(null);
  var timerLeaderboardRenderedSignature = "";
  var timerLeaderboardLoading = false;
  var timerLeaderboardPeriod = "all";
  var submitLock = false;
  var recordSubmitLock = false;
  var stone2kSubmitLock = false;
  var activeStone2kSubmitSignature = "";
  var modeIntroBound = false;
  var langSyncBound = false;
  var pollingStarted = false;
  var pollingTickTimer = 0;
  var pollingTickRunning = false;
  var pollingFailureCount = 0;
  var pollingLastTimerRefreshTime = 0;
  var pollingLastModeIntroRefreshTime = 0;
  var pollingVisibilityBound = false;
  var pollingUsingScheduler = false;
  var lifecycleSubmitFlushBound = false;
  var authBestScoreSyncBound = false;
  var durableOutboxMigrationPromise = null;
  var schedulerTaskName = "online-leaderboard-main";
  var refreshScheduler = null;
  var rankedCheckpointSaveTimer = 0;
  var rankedSessionExpiredNoticeModeKey = "";
  var rankedSessionExpiredNoticeAt = 0;
  var accountBestScoreSyncPending = Object.create(null);
  var accountBestScoreSyncLastAt = Object.create(null);

  function addPxDelta(sizeLike, deltaPx) {
    var text = toText(sizeLike).trim().toLowerCase();
    var parsed = parseFloat(text);
    var delta = Number(deltaPx);
    if (!Number.isFinite(parsed)) {
      parsed = 14;
    }
    if (!Number.isFinite(delta)) {
      delta = 0;
    }
    var value = parsed + delta;
    if (value < 1) value = 1;
    return String(value) + "px";
  }

  function normalizeLeaderboardNickname(nameLike) {
    return toText(nameLike).trim().replace(/_/g, "");
  }

  function parsePositiveInt(value) {
    var parsed = Math.floor(Number(value) || 0);
    return parsed > 0 ? parsed : 0;
  }

  function buildUserProfileUrl(userId, nickname) {
    var safeUserId = parsePositiveInt(userId);
    if (!safeUserId) return "";
    var params = new global.URLSearchParams();
    params.set("id", String(safeUserId));
    var safeNickname = toText(nickname).trim();
    if (safeNickname) params.set("nickname", safeNickname);
    return "user.html?" + params.toString();
  }

  function byId(id) {
    return global.document.getElementById(id);
  }

function shouldAutoLoadOnlineLeaderboard() {
  if (global.__FORCE_ONLINE_LEADERBOARD__ === true) return true;
  if (global.__DISABLE_ONLINE_LEADERBOARD__ === true) return false;
  return true;
}

  function createEl(tag, className, text) {
    var el = global.document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === "string") el.textContent = text;
    return el;
  }

  function getRefreshScheduler() {
    if (refreshScheduler) return refreshScheduler;
    var runtime = global.RefreshSchedulerRuntime;
    if (!runtime || typeof runtime.getDefaultScheduler !== "function") return null;
    refreshScheduler = runtime.getDefaultScheduler();
    return refreshScheduler;
  }

  function getAuthToken() {
    return toText(sharedGetAuthToken()).trim();
  }

  function getRankedSessionRuntime() {
    return global && global.RankedSessionRuntime ? global.RankedSessionRuntime : null;
  }

  function resolveManagerRankedModeKey(manager) {
    return toText(manager && (manager.modeKey || manager.mode)).trim() || getCurrentModeKey();
  }

  function resolveRankedSessionContextForMode(modeLike) {
    var modeKey = toText(modeLike).trim() || getCurrentModeKey();
    var runtime = getRankedSessionRuntime();
    if (runtime && typeof runtime.getCurrentContext === "function") {
      return runtime.getCurrentContext(modeKey);
    }
    var context = global.GAME_CHALLENGE_CONTEXT;
    if (!context || typeof context !== "object" || Array.isArray(context)) return null;
    if (toText(context.mode_key).trim() && toText(context.mode_key).trim() !== modeKey) return null;
    return context;
  }

  function resolveRankedSessionTokenForManager(manager) {
    var directToken = toText(manager && manager.rankedSessionToken).trim();
    if (directToken) return directToken;
    var context = resolveRankedSessionContextForMode(resolveManagerRankedModeKey(manager));
    return toText(context && context.ranked_session_token).trim();
  }

  function resolveRankedChallengeIdForManager(manager) {
    var directId = toText(manager && manager.challengeId).trim();
    if (directId) return directId;
    var context = resolveRankedSessionContextForMode(resolveManagerRankedModeKey(manager));
    return toText(context && context.id).trim() || toText(context && context.challenge_id).trim();
  }

  function resolveRankedSeedForManager(manager) {
    var directSeed = Math.floor(Number(manager && manager.initialSeed));
    if (Number.isSafeInteger(directSeed) && directSeed >= 0) return directSeed;
    var context = resolveRankedSessionContextForMode(resolveManagerRankedModeKey(manager));
    var contextSeed = Math.floor(Number(context && context.seed));
    return Number.isSafeInteger(contextSeed) && contextSeed >= 0 ? contextSeed : null;
  }

  function normalizeRankedSessionSeed(valueLike) {
    if (valueLike == null || valueLike === "") return null;
    var seed = Math.floor(Number(valueLike));
    return Number.isSafeInteger(seed) && seed >= 0 ? seed : null;
  }

  function normalizeSpawnSequenceVersion(valueLike) {
    return Number(valueLike) === 2 ? 2 : 1;
  }

  function resolveRankedContextChallengeId(context) {
    return toText(context && context.id).trim() || toText(context && context.challenge_id).trim();
  }

  function resolveRankedSubmitContextForManager(manager) {
    if (!shouldUseRankedCheckpoint(manager)) return null;
    var modeKey = resolveManagerRankedModeKey(manager);
    var directToken = toText(manager && manager.rankedSessionToken).trim();
    var directChallengeId = toText(manager && manager.challengeId).trim();
    var directSeed = normalizeRankedSessionSeed(manager && manager.initialSeed);
    var context = resolveRankedSessionContextForMode(modeKey);
    var contextToken = toText(context && context.ranked_session_token).trim();
    var contextChallengeId = resolveRankedContextChallengeId(context);
    var contextSeed = normalizeRankedSessionSeed(context && context.seed);
    var contextSpawnSequenceVersion = normalizeSpawnSequenceVersion(context && context.spawn_sequence_version);
    var directReplaySpawnSequenceVersion = normalizeSpawnSequenceVersion(
      manager && manager.sessionReplayV1 && manager.sessionReplayV1.spawn_sequence_version
    );

    if (directToken) {
      if (directSeed === null) return null;
      if (contextToken && contextToken === directToken && contextSeed !== null && contextSeed !== directSeed) {
        return null;
      }
      if (contextToken && contextToken !== directToken) {
        return {
          modeKey: modeKey,
          challengeId: directChallengeId || null,
          seed: directSeed,
          token: directToken,
          spawnSequenceVersion: directReplaySpawnSequenceVersion
        };
      }
      return {
        modeKey: modeKey,
        challengeId: directChallengeId || contextChallengeId || null,
        seed: directSeed,
        token: directToken,
        spawnSequenceVersion: contextToken === directToken
          ? contextSpawnSequenceVersion
          : directReplaySpawnSequenceVersion
      };
    }

    if (!contextToken || contextSeed === null) return null;
    if (directSeed !== null && directSeed !== contextSeed) return null;
    return {
      modeKey: modeKey,
      challengeId: contextChallengeId || null,
      seed: contextSeed,
      token: contextToken,
      spawnSequenceVersion: contextSpawnSequenceVersion
    };
  }

  function buildRankedVerificationPayload(manager) {
    var rankedContext = resolveRankedSubmitContextForManager(manager);
    if (!rankedContext) return null;
    return {
      random_source: "server_seed",
      replay_format: "v1",
      challenge_id: rankedContext.challengeId,
      seed: rankedContext.seed,
      spawn_sequence_version: rankedContext.spawnSequenceVersion,
      mode_key: rankedContext.modeKey,
      ranked_session_token: rankedContext.token
    };
  }

  function flushRankedAttemptOutbox(options) {
    var runtime = getRankedSessionRuntime();
    if (!runtime || typeof runtime.flushAttemptOutbox !== "function") {
      return Promise.resolve(false);
    }
    return runtime.flushAttemptOutbox(options || {});
  }

  function queueRankedAttemptForManager(manager, eventName, reason) {
    function fail(code) {
      if (manager) manager.rankedAttemptPersistenceError = code;
      return false;
    }
    if (!shouldUseRankedCheckpoint(manager) || manager.rankCheckpointApplying === true) {
      return fail("ranked_attempt_not_applicable");
    }
    if (Math.floor(Number(manager.successfulMoveCount) || 0) <= 0) {
      return fail("ranked_attempt_empty");
    }
    if (eventName === "abandon" && isSessionTerminated(manager)) {
      return fail("ranked_attempt_already_terminal");
    }
    var rankedContext = resolveRankedSubmitContextForManager(manager);
    var challengeId = toText(rankedContext && rankedContext.challengeId).trim().toLowerCase();
    if (!rankedContext || !challengeId) return fail("ranked_context_missing");
    var replayPayload = resolveRecordReplayPayload(manager);
    if (!replayPayload.replayString) return fail("replay_payload_missing");
    var runtime = getRankedSessionRuntime();
    if (!runtime || typeof runtime.enqueueAttempt !== "function") return fail("ranked_runtime_unavailable");
    var attempt = {
      challenge_id: challengeId,
      event: eventName,
      mode_key: rankedContext.modeKey,
      ranked_session_token: rankedContext.token,
      replay_string: replayPayload.replayString,
      attempt_schema_version: RANKED_ATTEMPT_SCHEMA_VERSION
    };
    if (eventName === "abandon") attempt.reason = reason === "navigation" ? "navigation" : "restart";
    var queued = runtime.enqueueAttempt(attempt);
    if (!queued) {
      var runtimeReason = typeof runtime.getLastFailureReason === "function"
        ? toText(runtime.getLastFailureReason()).trim()
        : "";
      return fail(runtimeReason || "attempt_outbox_persist_failed");
    }
    if (manager) manager.rankedAttemptPersistenceError = "";
    runPromiseSafely(function () {
      return flushRankedAttemptOutbox();
    });
    return true;
  }

  function shouldPersistRankedAbandon(manager) {
    return !!(
      shouldUseRankedCheckpoint(manager) &&
      manager.rankCheckpointApplying !== true &&
      Math.floor(Number(manager.successfulMoveCount) || 0) > 0 &&
      !isSessionTerminated(manager)
    );
  }

  function persistRankedAbandonForAction(manager, reason) {
    if (!shouldPersistRankedAbandon(manager)) return true;
    return queueRankedAttemptForManager(manager, "abandon", reason);
  }

  function notifyRankedAttemptPersistenceBlocked(manager) {
    var reasonCode = toText(manager && manager.rankedAttemptPersistenceError).trim() || "attempt_outbox_persist_failed";
    if (typeof global.alert !== "function") return;
    var isEnglish = toText(safeGetStorage(UI_LANG_STORAGE_KEY)).trim().toLowerCase() === "en";
    var reasonCopy = {
      attempt_owner_missing: isEnglish ? "No signed-in player was detected" : "未检测到登录用户",
      attempt_payload_invalid: isEnglish ? "The ranked attempt data is incomplete" : "待上传的排位数据不完整",
      attempt_outbox_write_failed: isEnglish ? "Browser local storage could not be written" : "浏览器本地存储写入失败",
      attempt_outbox_persist_failed: isEnglish ? "The pending upload record could not be saved" : "待上传记录保存失败",
      ranked_attempt_not_applicable: isEnglish ? "The current game is not eligible for ranked persistence" : "当前对局不满足排位记录条件",
      ranked_attempt_empty: isEnglish ? "The current game has no successful moves" : "本局尚无有效移动",
      ranked_attempt_already_terminal: isEnglish ? "The game was already terminal when persistence was attempted" : "保存时本局已经结束",
      ranked_context_missing: isEnglish ? "The ranked session context is missing" : "排位会话信息缺失",
      replay_payload_missing: isEnglish ? "The replay could not be generated" : "本局回放生成失败",
      ranked_runtime_unavailable: isEnglish ? "The ranked upload component is unavailable" : "排位上传组件未初始化"
    }[reasonCode] || (isEnglish ? "Unknown persistence failure" : "未知的本地保存错误");
    global.alert(isEnglish
      ? "Could not save this ranked attempt. Please retry before leaving the game.\nFailure reason: " + reasonCopy + " (" + reasonCode + ").\nIf the result is not uploaded, join QQ group 1103144436 to request a manual import."
      : "暂时无法保存本局排位记录，请重试后再离开游戏。\n失败原因：" + reasonCopy + "（" + reasonCode + "）。\n如果对局最终未正常上传，可以添加QQ群1103144436申请补录成绩。");
  }

  function maybeQueueRankedBeginAttempt(manager) {
    if (!manager || Math.floor(Number(manager.successfulMoveCount) || 0) <= 0) return false;
    var challengeId = resolveRankedChallengeIdForManager(manager).toLowerCase();
    if (!challengeId || manager.rankedAttemptBeginQueuedChallengeId === challengeId) return false;
    if (!queueRankedAttemptForManager(manager, "begin")) return false;
    manager.rankedAttemptBeginQueuedChallengeId = challengeId;
    return true;
  }

  function shouldClearCurrentManagerRankedCheckpointForRecord(manager, payload) {
    if (!shouldUseRankedCheckpoint(manager)) return false;
    var modeKey = toText(payload && payload.mode_key).trim();
    if (!modeKey || toText(manager.modeKey || manager.mode).trim() !== modeKey) return false;
    var submittedToken = toText(payload && payload.ranked_session_token).trim();
    var currentToken = resolveRankedSessionTokenForManager(manager);
    if (!submittedToken) return !currentToken;
    return currentToken === submittedToken;
  }

  function clearActiveRankedSessionForRecordPayload(payload, manager) {
    var modeKey = toText(payload && payload.mode_key).trim();
    if (!modeKey) return false;
    var submittedToken = toText(payload && payload.ranked_session_token).trim();
    var activeSession = readActiveRankedSessionRecord(modeKey);
    var activeToken = toText(activeSession && activeSession.ranked_session_token).trim();
    var managerModeKey = toText(manager && (manager.modeKey || manager.mode)).trim();
    var managerToken = resolveRankedSessionTokenForManager(manager);
    if (
      managerToken &&
      (!managerModeKey || managerModeKey === modeKey) &&
      managerToken !== submittedToken
    ) {
      mirrorActiveRankedSessionFromManager(manager, modeKey);
      return false;
    }
    if (submittedToken && activeToken && activeToken !== submittedToken) return false;
    if (submittedToken && !activeToken) return false;
    if (!submittedToken && activeToken) return false;
    if (
      submittedToken &&
      managerToken === submittedToken &&
      manager &&
      (manager.rankedRestartPreparing === true || manager.rankedRestartBlockedUntilSessionReady === true)
    ) {
      return false;
    }
    removeLocalStorageItem(RANKED_SESSION_ACTIVE_KEY_PREFIX + modeKey);
    if (
      global &&
      global.GAME_CHALLENGE_CONTEXT &&
      toText(global.GAME_CHALLENGE_CONTEXT.mode_key).trim() === modeKey
    ) {
      var contextToken = toText(global.GAME_CHALLENGE_CONTEXT.ranked_session_token).trim();
      if (submittedToken && contextToken && contextToken !== submittedToken) return false;
      if (!submittedToken && contextToken) return false;
      global.GAME_CHALLENGE_CONTEXT = null;
    }
    return true;
  }

  function mirrorActiveRankedSessionFromManager(manager, modeKey) {
    if (!manager || !modeKey) return false;
    var managerModeKey = toText(manager.modeKey || manager.mode).trim();
    if (managerModeKey && managerModeKey !== modeKey) return false;
    var rankedToken = toText(manager.rankedSessionToken).trim();
    var challengeId = toText(manager.challengeId).trim().toLowerCase();
    var seed = normalizeRankedSessionSeed(manager.initialSeed);
    var context = null;
    if (
      global &&
      global.GAME_CHALLENGE_CONTEXT &&
      typeof global.GAME_CHALLENGE_CONTEXT === "object" &&
      !Array.isArray(global.GAME_CHALLENGE_CONTEXT) &&
      (
        !toText(global.GAME_CHALLENGE_CONTEXT.mode_key).trim() ||
        toText(global.GAME_CHALLENGE_CONTEXT.mode_key).trim() === modeKey
      )
    ) {
      context = global.GAME_CHALLENGE_CONTEXT;
    }
    if (!rankedToken && context) rankedToken = toText(context.ranked_session_token).trim();
    if (!challengeId && context) {
      challengeId = (
        toText(context.challenge_id).trim() ||
        toText(context.id).trim()
      ).toLowerCase();
    }
    if (seed === null && context) seed = normalizeRankedSessionSeed(context.seed);
    if (!rankedToken || !challengeId || seed === null) return false;
    var nowSec = Math.floor(Date.now() / 1000);
    writeLocalStorageItem(
      RANKED_SESSION_ACTIVE_KEY_PREFIX + modeKey,
      JSON.stringify({
        mode_key: modeKey,
        challenge_id: challengeId,
        seed: seed,
        ranked_session_token: rankedToken,
        spawn_sequence_version: normalizeSpawnSequenceVersion(
          manager.spawnSequenceVersion || (context && context.spawn_sequence_version)
        ),
        issued_at: nowSec,
        exp: nowSec + 3600,
        owner_user_id: toText(getUserId()).trim() || null,
        client_received_at_ms: Date.now()
      })
    );
    if (global) {
      global.GAME_CHALLENGE_CONTEXT = {
        id: challengeId,
        mode_key: modeKey,
        seed: seed,
        ranked_session_token: rankedToken,
        spawn_sequence_version: normalizeSpawnSequenceVersion(
          manager.spawnSequenceVersion || (context && context.spawn_sequence_version)
        )
      };
    }
    return true;
  }

  function cleanupRankedStateAfterRecordSubmit(manager, payload) {
    var shouldClearCheckpoint = shouldClearCurrentManagerRankedCheckpointForRecord(manager, payload);
    clearActiveRankedSessionForRecordPayload(payload, manager);
    if (shouldClearCheckpoint) {
      clearRankedCheckpointForManager(manager, { keepalive: true }).catch(function () {});
    }
  }

  function shouldSkipRankedSessionPreparationForRestart(manager) {
    return (
      !shouldUseRankedCheckpoint(manager) ||
      (manager && (manager.rankCheckpointApplying === true || manager.replayMode === true)) ||
      !getAuthToken()
    );
  }

  function noteRankedRestartSessionUnavailable(runtime) {
    var reason = "";
    if (runtime && typeof runtime.getLastFailureReason === "function") {
      try {
        reason = toText(runtime.getLastFailureReason()).trim();
      } catch (_errReason) {
        reason = "";
      }
    }
    if (isUnauthorizedSubmitError(reason)) {
      clearAuthSessionOnly();
    }
  }

  function scheduleRankedSessionPrefetchForRestart(modeKey, runtime) {
    if (runtime && typeof runtime.ensurePrefetch === "function") {
      runtime.ensurePrefetch(modeKey).catch(function () {});
    }
  }

  function noteRankedRestartSessionBlocked(runtime) {
    noteRankedRestartSessionUnavailable(runtime);
  }

  function snapshotRankedRestartManagerState(manager) {
    if (!manager) return null;
    return {
      over: manager.over,
      won: manager.won,
      keepPlaying: manager.keepPlaying,
      score: manager.score,
      initialSeed: manager.initialSeed,
      seed: manager.seed,
      rankPolicy: manager.rankPolicy,
      rankedSessionToken: manager.rankedSessionToken,
      spawnSequenceVersion: manager.spawnSequenceVersion,
      challengeId: manager.challengeId,
      hasGameStarted: manager.hasGameStarted,
      successfulMoveCount: manager.successfulMoveCount,
      clientRecordId: manager.clientRecordId,
      grid: manager.grid,
      moveHistory: Array.isArray(manager.moveHistory) ? manager.moveHistory.slice() : manager.moveHistory
    };
  }

  function restoreRankedRestartManagerState(manager, snapshot) {
    if (!manager || !snapshot) return;
    manager.over = snapshot.over;
    manager.won = snapshot.won;
    manager.keepPlaying = snapshot.keepPlaying;
    manager.score = snapshot.score;
    manager.initialSeed = snapshot.initialSeed;
    manager.seed = snapshot.seed;
    manager.rankPolicy = snapshot.rankPolicy;
    manager.rankedSessionToken = snapshot.rankedSessionToken;
    manager.spawnSequenceVersion = normalizeSpawnSequenceVersion(snapshot.spawnSequenceVersion);
    manager.challengeId = snapshot.challengeId;
    manager.hasGameStarted = snapshot.hasGameStarted;
    manager.successfulMoveCount = snapshot.successfulMoveCount;
    manager.clientRecordId = snapshot.clientRecordId;
    manager.grid = snapshot.grid;
    manager.moveHistory = Array.isArray(snapshot.moveHistory) ? snapshot.moveHistory.slice() : snapshot.moveHistory;
  }

  function blockRankedRestartUntilSessionReady(manager, modeKey, runtime, snapshot) {
    noteRankedRestartSessionBlocked(runtime);
    scheduleRankedSessionPrefetchForRestart(modeKey, runtime);
    restoreRankedRestartManagerState(manager, snapshot);
    if (manager) {
      manager.rankedRestartBlockedUntilSessionReady = true;
    }
  }

  function isRankedRestartSetupDeferredError(err) {
    return err === RANKED_RESTART_SETUP_DEFERRED;
  }

  function isRankedRestartAttemptPersistFailedError(err) {
    return err === RANKED_RESTART_ATTEMPT_PERSIST_FAILED;
  }

  function markRankedRestartPreparationDone(manager) {
    if (manager) manager.rankedRestartPreparing = false;
  }

  function continueRankedRestartAfterSetupIntent(manager, originalSetup, setupThisArg, setupArgs, modeKey, runtime, snapshot) {
    Promise.resolve()
      .then(function () {
        return runtime.startNextSession(modeKey);
      })
      .then(
        function (ready) {
          if (!ready) {
            blockRankedRestartUntilSessionReady(manager, modeKey, runtime, snapshot);
            return;
          }
          if (manager) manager.rankedRestartBlockedUntilSessionReady = false;
          if (!(manager && (manager.rankCheckpointApplying === true || manager.replayMode === true))) {
            clearRankedCheckpointForManager(manager, { keepalive: true }).catch(function () {});
          }
          return originalSetup.apply(setupThisArg, setupArgs);
        },
        function () {
          blockRankedRestartUntilSessionReady(manager, modeKey, runtime, snapshot);
        }
      )
      .then(
        function () {
          markRankedRestartPreparationDone(manager);
        },
        function (err) {
          markRankedRestartPreparationDone(manager);
          global.setTimeout(function () {
            throw err;
          }, 0);
        }
      );
  }

  function continueRankedRestartWithoutSetupIntent(manager, modeKey, runtime, snapshot) {
    Promise.resolve()
      .then(function () {
        return runtime.startNextSession(modeKey);
      })
      .then(
        function (ready) {
          if (!ready) {
            blockRankedRestartUntilSessionReady(manager, modeKey, runtime, snapshot);
            return;
          }
          if (manager) manager.rankedRestartBlockedUntilSessionReady = false;
          if (!(manager && (manager.rankCheckpointApplying === true || manager.replayMode === true))) {
            clearRankedCheckpointForManager(manager, { keepalive: true }).catch(function () {});
          }
        },
        function () {
          blockRankedRestartUntilSessionReady(manager, modeKey, runtime, snapshot);
        }
      )
      .then(
        function () {
          markRankedRestartPreparationDone(manager);
        },
        function (err) {
          markRankedRestartPreparationDone(manager);
          global.setTimeout(function () {
            throw err;
          }, 0);
        }
      );
  }

  function isRankedRestartPromiseLike(value) {
    return !!(value && typeof value.then === "function");
  }

  function beginAsyncRankedRestartAfterConfirmation(manager, original, thisArg, args, modeKey, runtime) {
    if (!(manager && typeof manager.setup === "function")) {
      if (!persistRankedAbandonForAction(manager, "restart")) {
        notifyRankedAttemptPersistenceBlocked(manager);
        markRankedRestartPreparationDone(manager);
        return;
      }
      Promise.resolve()
        .then(function () {
          return runtime.startNextSession(modeKey);
        })
        .then(
          function (ready) {
            if (!ready) {
              blockRankedRestartUntilSessionReady(manager, modeKey, runtime, null);
              return;
            }
            if (manager) manager.rankedRestartBlockedUntilSessionReady = false;
            if (!(manager && (manager.rankCheckpointApplying === true || manager.replayMode === true))) {
              clearRankedCheckpointForManager(manager, { keepalive: true }).catch(function () {});
            }
            original.apply(thisArg, args || []);
          },
          function () {
            blockRankedRestartUntilSessionReady(manager, modeKey, runtime, null);
          }
        )
        .then(
          function () {
            markRankedRestartPreparationDone(manager);
          },
          function (err) {
            markRankedRestartPreparationDone(manager);
            global.setTimeout(function () {
              throw err;
            }, 0);
          }
        );
      return;
    }

    var originalSetup = manager.setup;
    var originalClearSavedGameState = typeof manager.clearSavedGameState === "function"
      ? manager.clearSavedGameState
      : null;
    var actuator = manager.actuator && typeof manager.actuator === "object" ? manager.actuator : null;
    var originalActuatorContinue = actuator && typeof actuator.continue === "function"
      ? actuator.continue
      : null;
    var restartSnapshot = snapshotRankedRestartManagerState(manager);
    var abandonRequired = shouldPersistRankedAbandon(manager);
    var setupIntercepted = false;
    var restored = false;
    var clearRestored = false;
    var continueRestored = false;
    var abandonPersisted = false;
    function persistAbandonBeforeRestart() {
      if (abandonPersisted || !abandonRequired) return true;
      abandonPersisted = queueRankedAttemptForManager(manager, "abandon", "restart");
      return abandonPersisted;
    }
    function restoreActuatorContinue() {
      if (!continueRestored && originalActuatorContinue && actuator.continue === rankedRestartActuatorContinueInterceptor) {
        actuator.continue = originalActuatorContinue;
      }
      continueRestored = true;
    }
    function restoreClearSavedGameState() {
      if (!clearRestored && originalClearSavedGameState && manager.clearSavedGameState === rankedRestartClearSavedGameStateInterceptor) {
        manager.clearSavedGameState = originalClearSavedGameState;
      }
      clearRestored = true;
    }
    function restoreSetup() {
      if (!restored && manager.setup === rankedRestartSetupInterceptor) {
        manager.setup = originalSetup;
      }
      restored = true;
      restoreClearSavedGameState();
      restoreActuatorContinue();
    }
    function requirePersistedAbandon() {
      if (persistAbandonBeforeRestart()) return;
      restoreSetup();
      restoreRankedRestartManagerState(manager, restartSnapshot);
      notifyRankedAttemptPersistenceBlocked(manager);
      throw RANKED_RESTART_ATTEMPT_PERSIST_FAILED;
    }
    function rankedRestartActuatorContinueInterceptor() {
      requirePersistedAbandon();
      restoreActuatorContinue();
      return originalActuatorContinue.apply(this, arguments);
    }
    function rankedRestartClearSavedGameStateInterceptor() {
      requirePersistedAbandon();
      restoreClearSavedGameState();
      return originalClearSavedGameState.apply(this, arguments);
    }
    function rankedRestartSetupInterceptor() {
      setupIntercepted = true;
      var setupThisArg = this || manager;
      var setupArgs = Array.prototype.slice.call(arguments);
      requirePersistedAbandon();
      restoreSetup();
      continueRankedRestartAfterSetupIntent(
        manager,
        originalSetup,
        setupThisArg,
        setupArgs,
        modeKey,
        runtime,
        restartSnapshot
      );
      throw RANKED_RESTART_SETUP_DEFERRED;
    }
    manager.setup = rankedRestartSetupInterceptor;
    if (originalClearSavedGameState) {
      manager.clearSavedGameState = rankedRestartClearSavedGameStateInterceptor;
    }
    if (originalActuatorContinue) {
      actuator.continue = rankedRestartActuatorContinueInterceptor;
    }

    var result;
    try {
      result = original.apply(thisArg, args || []);
    } catch (err) {
      restoreSetup();
      if (isRankedRestartSetupDeferredError(err)) {
        return;
      }
      if (isRankedRestartAttemptPersistFailedError(err)) {
        markRankedRestartPreparationDone(manager);
        return;
      }
      markRankedRestartPreparationDone(manager);
      throw err;
    }
    var resultIsPromiseLike = isRankedRestartPromiseLike(result);

    Promise.resolve(result).then(
      function () {
        if (!setupIntercepted) {
          restoreSetup();
          if (!resultIsPromiseLike) {
            continueRankedRestartWithoutSetupIntent(manager, modeKey, runtime, restartSnapshot);
            return;
          }
          markRankedRestartPreparationDone(manager);
        }
      },
      function (err) {
        restoreSetup();
        if (isRankedRestartSetupDeferredError(err)) {
          return;
        }
        if (isRankedRestartAttemptPersistFailedError(err)) {
          markRankedRestartPreparationDone(manager);
          return;
        }
        markRankedRestartPreparationDone(manager);
        global.setTimeout(function () {
          throw err;
        }, 0);
      }
    );
  }

  function beginAsyncRankedRestartBeforeOriginal(manager, original, thisArg, args, modeKey, runtime) {
    Promise.resolve()
      .then(function () {
        return runtime.startNextSession(modeKey);
      })
      .then(
        function (ready) {
          if (!ready) {
            blockRankedRestartUntilSessionReady(manager, modeKey, runtime, null);
            return;
          }
          if (manager) manager.rankedRestartBlockedUntilSessionReady = false;
          if (!(manager && (manager.rankCheckpointApplying === true || manager.replayMode === true))) {
            clearRankedCheckpointForManager(manager, { keepalive: true }).catch(function () {});
          }
          original.apply(thisArg, args || []);
        },
        function () {
          blockRankedRestartUntilSessionReady(manager, modeKey, runtime, null);
        }
      )
      .then(
        function () {
          markRankedRestartPreparationDone(manager);
        },
        function (err) {
          markRankedRestartPreparationDone(manager);
          global.setTimeout(function () {
            throw err;
          }, 0);
        }
      );
  }

  function prepareRankedSessionForRestart(manager) {
    if (shouldSkipRankedSessionPreparationForRestart(manager)) return true;
    var modeKey = resolveManagerRankedModeKey(manager);
    var runtime = getRankedSessionRuntime();
    if (runtime && typeof runtime.promotePrefetchedSession === "function") {
      if (runtime.promotePrefetchedSession(modeKey)) {
        return true;
      }
    }
    return false;
  }

  function beginAsyncRankedRestart(manager, original, thisArg, args, options) {
    if (shouldSkipRankedSessionPreparationForRestart(manager)) return false;
    var modeKey = resolveManagerRankedModeKey(manager);
    var runtime = getRankedSessionRuntime();
    if (!runtime || typeof runtime.startNextSession !== "function") {
      scheduleRankedSessionPrefetchForRestart(modeKey, runtime);
      blockRankedRestartUntilSessionReady(manager, modeKey, runtime, null);
      return true;
    }
    if (manager && manager.rankedRestartPreparing === true) return true;
    if (manager) manager.rankedRestartPreparing = true;
    if (options && options.afterConfirmation === true) {
      beginAsyncRankedRestartAfterConfirmation(manager, original, thisArg, args, modeKey, runtime);
    } else {
      beginAsyncRankedRestartBeforeOriginal(manager, original, thisArg, args, modeKey, runtime);
    }
    return true;
  }

  function getUserId() {
    return toText(safeGetStorage(STORAGE_USER_ID_KEY)).trim();
  }

  function getNickname() {
    return toText(safeGetStorage(STORAGE_NICKNAME_KEY)).trim();
  }

  function saveAuth(payload) {
    var userIdValue = toText(
      payload && (
        payload.userId != null
          ? payload.userId
          : (payload.user_id != null ? payload.user_id : payload.id)
      )
    ).trim();
    sharedSetAuthSession(payload || {});
    if (userIdValue) {
      safeSetStorage(STORAGE_USER_ID_KEY, userIdValue);
    } else {
      safeRemoveStorage(STORAGE_USER_ID_KEY);
    }
    safeSetStorage(STORAGE_NICKNAME_KEY, toText(payload && payload.nickname));
    runPromiseSafely(function () {
      return syncAccountBestScoreForCurrentMode({ force: true });
    });
  }

  function clearAuth() {
    sharedClearAuthSession();
  }

  function clearAuthSessionOnly() {
    sharedClearAuthSession();
  }

  function clearPendingScoreSubmitState() {
    safeRemoveStorage(STORAGE_PENDING_SCORE_SUBMIT_KEY);
  }

  function clearPendingRecordSubmitSignature() {
    safeRemoveStorage(STORAGE_PENDING_RECORD_SUBMIT_KEY);
  }

  function clearPendingRecordSubmitQueue() {
    safeRemoveStorage(STORAGE_PENDING_RECORD_QUEUE_KEY);
  }

  function markRecordSubmitSignatureHandled(signature) {
    var text = toText(signature).trim();
    if (!text) return;
    safeSetStorage(STORAGE_LAST_RECORD_SUBMIT_KEY, text);
  }

  function clearPendingStone2kSubmitState() {
    safeRemoveStorage(STORAGE_PENDING_STONE_2K_SUBMIT_KEY);
  }

  function clonePendingSubmitPayload(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    try {
      return JSON.parse(JSON.stringify(payload));
    } catch (_err) {
      return null;
    }
  }

  function normalizePendingScoreSubmitPayload(rawValue) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return null;
    var payload = clonePendingSubmitPayload(rawValue);
    if (!payload) return null;
    var modeKey = toText(payload.mode_key).trim();
    var score = Math.floor(Number(payload.score) || 0);
    if (!modeKey || !(score > 0)) return null;
    if (!toText(payload.mode).trim()) {
      var modeBucket = resolveLeaderboardMode(modeKey);
      if (modeBucket) payload.mode = modeBucket;
    }
    return payload;
  }

  function normalizePendingRecordSubmitPayload(rawValue) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return null;
    var payload = clonePendingSubmitPayload(rawValue);
    if (!payload) return null;
    var modeKey = toText(payload.mode_key).trim();
    var replayString = toText(payload.replay_string).trim();
    if (!modeKey || !replayString) return null;
    if (!toText(payload.mode).trim()) {
      var modeBucket = resolveLeaderboardMode(modeKey);
      if (modeBucket) payload.mode = modeBucket;
    }
    return payload;
  }

  function buildPendingSubmitState(rawValue, ttlMs, payloadNormalizer) {
    var raw = toText(rawValue).trim();
    if (!raw) return null;
    var now = Date.now();
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        var signature = toText(parsed.signature).trim();
        var createdAt = Math.max(0, Math.floor(Number(parsed.createdAt) || 0));
        var lastAttemptAt = Math.max(0, Math.floor(Number(
          typeof parsed.lastAttemptAt === "undefined" ? createdAt : parsed.lastAttemptAt
        ) || 0));
        var retryCount = Math.max(0, Math.floor(Number(parsed.retryCount) || 0));
        var payload = payloadNormalizer(parsed.payload);
        var ownerUserId = toText(parsed.ownerUserId || parsed.owner_user_id).trim();
        if (!signature) return null;
        if (ttlMs > 0 && createdAt > 0 && now - createdAt > ttlMs) return null;
        return {
          signature: signature,
          payload: payload,
          createdAt: createdAt > 0 ? createdAt : (lastAttemptAt > 0 ? lastAttemptAt : now),
          lastAttemptAt: lastAttemptAt,
          retryCount: retryCount,
          ownerUserId: ownerUserId || ""
        };
      }
    } catch (_err) {
      if (raw.indexOf("|") >= 0) {
        return {
          signature: raw,
          payload: null,
          createdAt: 0,
          lastAttemptAt: 0,
          retryCount: 0,
          ownerUserId: ""
        };
      }
    }
    return null;
  }

  function normalizePendingRecordSubmitStateObject(value) {
    try {
      return buildPendingSubmitState(
        JSON.stringify(value || {}),
        RECORD_SUBMIT_PENDING_TTL_MS,
        normalizePendingRecordSubmitPayload
      );
    } catch (_err) {
      return null;
    }
  }

  function readPendingRecordSubmitQueue() {
    var raw = toText(safeGetStorage(STORAGE_PENDING_RECORD_QUEUE_KEY)).trim();
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(normalizePendingRecordSubmitStateObject)
        .filter(function (state) { return !!(state && state.signature && state.payload); });
    } catch (_err) {
      clearPendingRecordSubmitQueue();
      return [];
    }
  }

  function writePendingRecordSubmitQueue(queue) {
    var list = Array.isArray(queue) ? queue.filter(function (state) {
      return !!(state && state.signature && state.payload);
    }).slice(0, RECORD_SUBMIT_PENDING_QUEUE_LIMIT) : [];
    if (!list.length) {
      clearPendingRecordSubmitQueue();
      return;
    }
    safeSetStorage(STORAGE_PENDING_RECORD_QUEUE_KEY, JSON.stringify(list));
  }

  function enqueuePendingRecordSubmitState(state) {
    var normalized = normalizePendingRecordSubmitStateObject(state);
    if (!normalized || !normalized.payload) return;
    var queue = readPendingRecordSubmitQueue().filter(function (item) {
      return item.signature !== normalized.signature;
    });
    queue.push(normalized);
    writePendingRecordSubmitQueue(queue);
  }

  function enqueuePendingRecordSubmitPayload(signature, payload) {
    var text = toText(signature).trim();
    var normalizedPayload = normalizePendingRecordSubmitPayload(payload);
    if (!text || !normalizedPayload) return;
    enqueuePendingRecordSubmitState({
      signature: text,
      payload: normalizedPayload,
      ownerUserId: toText(getUserId()).trim() || "",
      createdAt: Date.now(),
      lastAttemptAt: 0,
      retryCount: 0
    });
  }

  function promoteNextPendingRecordSubmitState() {
    var queue = readPendingRecordSubmitQueue();
    var next = queue.shift();
    writePendingRecordSubmitQueue(queue);
    if (!next) return null;
    safeSetStorage(STORAGE_PENDING_RECORD_SUBMIT_KEY, JSON.stringify(next));
    return next;
  }

  function promoteAndRetryNextPendingRecordSubmit(options) {
    if (!promoteNextPendingRecordSubmitState()) return;
    var opts = options && typeof options === "object" ? options : {};
    runPromiseSafely(function () {
      return retryPendingRecordSubmit({
        keepalive: opts.keepalive === true,
        forcePendingRetry: true,
        deliverySource: opts.deliverySource
      });
    });
  }

  function readPendingScoreSubmitState() {
    var state = buildPendingSubmitState(
      safeGetStorage(STORAGE_PENDING_SCORE_SUBMIT_KEY),
      SCORE_SUBMIT_PENDING_TTL_MS,
      normalizePendingScoreSubmitPayload
    );
    if (!state) {
      clearPendingScoreSubmitState();
      return null;
    }
    return state;
  }

  function readPendingRecordSubmitState() {
    var state = buildPendingSubmitState(
      safeGetStorage(STORAGE_PENDING_RECORD_SUBMIT_KEY),
      RECORD_SUBMIT_PENDING_TTL_MS,
      normalizePendingRecordSubmitPayload
    );
    if (state) return state;
    clearPendingRecordSubmitSignature();
    return promoteNextPendingRecordSubmitState();
  }

  function readPendingRecordSubmitSignature() {
    var state = readPendingRecordSubmitState();
    return state ? state.signature : "";
  }

  function readPendingStone2kSubmitState() {
    var state = buildPendingSubmitState(
      safeGetStorage(STORAGE_PENDING_STONE_2K_SUBMIT_KEY),
      STONE_2K_SUBMIT_PENDING_TTL_MS,
      normalizePendingStone2kSubmitPayload
    );
    if (!state) {
      clearPendingStone2kSubmitState();
      return null;
    }
    return state;
  }

  function resolvePendingSubmitRetryDelayMs(state, baseDelayMs, maxDelayMs) {
    var retryCount = Math.max(0, Math.floor(Number(state && state.retryCount) || 0));
    var delayMs = Math.max(1, Math.floor(Number(baseDelayMs) || 0)) * Math.pow(2, retryCount);
    if (!Number.isFinite(delayMs) || delayMs <= 0) {
      delayMs = Math.max(1, Math.floor(Number(baseDelayMs) || 0));
    }
    var maxAllowedDelayMs = Math.max(delayMs, Math.floor(Number(maxDelayMs) || 0));
    if (delayMs > maxAllowedDelayMs) delayMs = maxAllowedDelayMs;
    return delayMs;
  }

  function resolvePendingScoreSubmitRetryDelayMs(state) {
    return resolvePendingSubmitRetryDelayMs(
      state,
      SCORE_SUBMIT_PENDING_RETRY_BASE_MS,
      SCORE_SUBMIT_PENDING_RETRY_MAX_MS
    );
  }

  function resolvePendingRecordSubmitRetryDelayMs(state) {
    return resolvePendingSubmitRetryDelayMs(
      state,
      RECORD_SUBMIT_PENDING_RETRY_BASE_MS,
      RECORD_SUBMIT_PENDING_RETRY_MAX_MS
    );
  }

  function resolvePendingStone2kSubmitRetryDelayMs(state) {
    return resolvePendingSubmitRetryDelayMs(
      state,
      STONE_2K_SUBMIT_PENDING_RETRY_BASE_MS,
      STONE_2K_SUBMIT_PENDING_RETRY_MAX_MS
    );
  }

  function shouldDeferPendingSubmitRetry(state, delayResolver) {
    if (!state) return false;
    var lastAttemptAt = Math.max(0, Math.floor(Number(state.lastAttemptAt) || 0));
    if (lastAttemptAt <= 0) return false;
    return (Date.now() - lastAttemptAt) < delayResolver(state);
  }

  function shouldDeferPendingScoreSubmitRetry(state) {
    return shouldDeferPendingSubmitRetry(state, resolvePendingScoreSubmitRetryDelayMs);
  }

  function shouldDeferPendingRecordSubmitRetry(state) {
    return shouldDeferPendingSubmitRetry(state, resolvePendingRecordSubmitRetryDelayMs);
  }

  function shouldDeferPendingStone2kSubmitRetry(state) {
    return shouldDeferPendingSubmitRetry(state, resolvePendingStone2kSubmitRetryDelayMs);
  }

  function writePendingScoreSubmitState(signature, payload, previousState) {
    var text = toText(signature).trim();
    if (!text) {
      clearPendingScoreSubmitState();
      return;
    }
    var normalizedPayload = normalizePendingScoreSubmitPayload(payload);
    if (!normalizedPayload) return;
    var now = Date.now();
    var previous = previousState && toText(previousState.signature).trim() === text ? previousState : null;
    safeSetStorage(
      STORAGE_PENDING_SCORE_SUBMIT_KEY,
      JSON.stringify({
        signature: text,
        payload: normalizedPayload,
        ownerUserId: toText(getUserId()).trim() || "",
        createdAt: previous && Number(previous.createdAt) > 0 ? Math.floor(Number(previous.createdAt)) : now,
        lastAttemptAt: now,
        retryCount: previous ? Math.max(0, Math.floor(Number(previous.retryCount) || 0)) + 1 : 0
      })
    );
  }

  function writePendingRecordSubmitSignature(signature, previousState, payload, options) {
    var text = toText(signature).trim();
    if (!text) {
      clearPendingRecordSubmitSignature();
      return;
    }
    var normalizedPayload = normalizePendingRecordSubmitPayload(
      payload || (previousState ? previousState.payload : null)
    );
    if (!normalizedPayload) return;
    var now = Date.now();
    var previous = previousState && toText(previousState.signature).trim() === text ? previousState : null;
    var durabilityOnly = !!(options && options.durabilityOnly === true);
    var hadPreviousAttempt = !!(previous && Number(previous.lastAttemptAt) > 0);
    safeSetStorage(
      STORAGE_PENDING_RECORD_SUBMIT_KEY,
      JSON.stringify({
        signature: text,
        payload: normalizedPayload,
        ownerUserId: toText(getUserId()).trim() || "",
        createdAt: previous && Number(previous.createdAt) > 0 ? Math.floor(Number(previous.createdAt)) : now,
        lastAttemptAt: durabilityOnly ? (hadPreviousAttempt ? Math.floor(Number(previous.lastAttemptAt)) : 0) : now,
        retryCount: hadPreviousAttempt && !durabilityOnly
          ? Math.max(0, Math.floor(Number(previous.retryCount) || 0)) + 1
          : Math.max(0, Math.floor(Number(previous && previous.retryCount) || 0))
      })
    );
  }

  function writeLastRecordSubmitResult(payload, result, ok) {
    var data = result && typeof result === "object" ? result : {};
    safeSetStorage(
      STORAGE_LAST_RECORD_SUBMIT_RESULT_KEY,
      JSON.stringify({
        ok: ok === true,
        status: Math.floor(Number(data.status) || 0) || null,
        mode_key: toText(payload && payload.mode_key).trim(),
        mode_bucket: toText(payload && (payload.mode_bucket || payload.mode)).trim(),
        code: toText(data.code).trim() || null,
        error: toText(data.error).trim() || null,
        detail: toText(data.detail).trim() || null,
        at: Date.now()
      })
    );
  }

  function isTransientOnlineSubmitErrorText(errorTextLike) {
    var text = toText(errorTextLike).trim().toLowerCase();
    if (!text) return false;
    return (
      text.indexOf("timeout") >= 0 ||
      text.indexOf("network timeout") >= 0 ||
      text.indexOf("network error") >= 0 ||
      text.indexOf("\u8d85\u65f6") >= 0 ||
      text.indexOf("\u7f51\u7edc") >= 0
    );
  }

  function isTransientRecordSubmitErrorText(errorTextLike) {
    return isTransientOnlineSubmitErrorText(errorTextLike);
  }

  function isTransientSubmitResult(result, errorTextLike) {
    if (isTransientOnlineSubmitErrorText(errorTextLike)) return true;
    var status = Math.floor(Number(result && result.status) || 0);
    return status === 408 || status === 429 || status >= 500;
  }

  function getDurableRecordOutbox() {
    var store = global && global.LocalHistoryStore;
    if (!store || typeof store !== "object") return null;
    if (
      typeof store.prepareRecordSubmitAsync !== "function" ||
      typeof store.listSyncCandidatesAsync !== "function" ||
      typeof store.updateRecordAsync !== "function" ||
      typeof store.getByIdAsync !== "function"
    ) return null;
    return store;
  }

  function buildRecordPayloadFromLocalHistory(record) {
    var item = record && typeof record === "object" ? record : {};
    return {
      record_schema_version: Math.max(1, Math.floor(Number(item.record_schema_version) || RECORD_SCHEMA_VERSION)),
      mode: toText(item.mode).trim() || toText(item.ranked_bucket).trim() || undefined,
      mode_key: toText(item.mode_key).trim(),
      mode_bucket: toText(item.mode_bucket || item.ranked_bucket).trim() || undefined,
      ranked_session_token: toText(item.ranked_session_token).trim() || null,
      challenge_id: toText(item.challenge_id).trim() || null,
      initial_seed: Number.isFinite(Number(item.initial_seed)) ? Math.floor(Number(item.initial_seed)) : null,
      seed: Number.isFinite(Number(item.seed)) ? Math.floor(Number(item.seed)) : null,
      ranked_verification: item.ranked_verification && typeof item.ranked_verification === "object"
        ? item.ranked_verification
        : null,
      score: Math.floor(Number(item.score) || 0),
      best_tile: Math.floor(Number(item.best_tile) || 0),
      duration_ms: Math.max(0, Math.floor(Number(item.duration_ms) || 0)),
      ended_at: toText(item.ended_at).trim() || new Date().toISOString(),
      end_reason: toText(item.end_reason).trim() || "game_over",
      final_board: Array.isArray(item.final_board) ? item.final_board : [],
      min_steps_2048: Number.isFinite(Number(item.min_steps_2048)) ? Math.floor(Number(item.min_steps_2048)) : null,
      min_steps_4096: Number.isFinite(Number(item.min_steps_4096)) ? Math.floor(Number(item.min_steps_4096)) : null,
      min_steps_8192: Number.isFinite(Number(item.min_steps_8192)) ? Math.floor(Number(item.min_steps_8192)) : null,
      client_record_id: toText(item.client_record_id).trim() || null,
      replay: item.replay && typeof item.replay === "object" ? item.replay : null,
      replay_string: toText(item.replay_string)
    };
  }

  function resolveRecordSubmitErrorCode(result, fallback) {
    var data = result && typeof result === "object" ? result : {};
    return toText(data.code || data.error || fallback).trim().toUpperCase().replace(/[\s-]+/g, "_");
  }

  function resolveRecordSubmitErrorMessage(result, fallback) {
    var data = result && typeof result === "object" ? result : {};
    return toText(data.detail || data.message || data.error || fallback).trim() || fallback;
  }

  function resolveRecordServerId(result) {
    if (!result || typeof result !== "object") return null;
    var data = result.data && typeof result.data === "object" ? result.data : null;
    return toText(
      result.id ||
      result.record_id ||
      result.server_record_id ||
      (data && (data.id || data.record_id || data.server_record_id))
    ).trim() || null;
  }

  function requireRecordSubmitServerId(result) {
    if (!result || !result.success || resolveRecordServerId(result)) return result;
    return Object.assign({}, result, {
      success: false,
      status: 409,
      code: "SERVER_RECORD_ID_MISSING",
      error: "Server did not confirm the stored record id"
    });
  }

  function resolveDurableRetryIso(uploadAttempts) {
    var retryCount = Math.max(0, Math.floor(Number(uploadAttempts) || 0) - 1);
    var delay = RECORD_SUBMIT_PENDING_RETRY_BASE_MS * Math.pow(2, retryCount);
    delay = Math.min(RECORD_SUBMIT_PENDING_RETRY_MAX_MS, Math.max(RECORD_SUBMIT_PENDING_RETRY_BASE_MS, delay));
    return new Date(Date.now() + delay).toISOString();
  }

  function isDefinitelyInvalidRecordResult(result, code) {
    var status = Math.floor(Number(result && result.status) || 0);
    if (status < 400 || status >= 500) return false;
    return (
      code.indexOf("REPLAY_") === 0 ||
      code === "MISSING_REPLAY" ||
      code === "UNSUPPORTED_MODE" ||
      code === "INVALID_RECORD"
    );
  }

  async function updateDurableRecord(store, record, patch) {
    return store.updateRecordAsync(record.id, patch);
  }

  async function persistRecordPayloadToDurableOutbox(manager, payload) {
    var store = getDurableRecordOutbox();
    if (!store) return null;
    var pendingPersist = manager && manager.recordSubmitPersistPromise;
    if (pendingPersist && typeof pendingPersist.then === "function") return pendingPersist;

    var persistPromise = (async function () {
      var recordId = toText(manager && manager.localHistoryRecordId).trim();
      var record = await store.prepareRecordSubmitAsync(recordId || null, payload);
      if (manager && record && record.id) manager.localHistoryRecordId = record.id;
      return record;
    })();
    if (manager) manager.recordSubmitPersistPromise = persistPromise;
    try {
      return await persistPromise;
    } finally {
      if (manager && manager.recordSubmitPersistPromise === persistPromise) {
        manager.recordSubmitPersistPromise = null;
      }
    }
  }

  async function uploadDurableRecord(store, record, options) {
    var opts = options && typeof options === "object" ? options : {};
    var currentUserId = toText(getUserId()).trim();
    if (!getAuthToken()) {
      return updateDurableRecord(store, record, {
        sync_status: "waiting_auth",
        next_retry_at: null,
        last_error_code: "AUTH_REQUIRED",
        last_error_message: "Login required before upload"
      });
    }
    if (
      toText(record.owner_type).trim() !== "user" ||
      !toText(record.owner_user_id).trim() ||
      toText(record.owner_user_id).trim() !== currentUserId
    ) {
      return updateDurableRecord(store, record, {
        sync_status: "needs_action",
        next_retry_at: null,
        last_error_code: "OWNER_MISMATCH",
        last_error_message: "Local record owner does not match the signed-in account"
      });
    }

    var attempts = Math.max(0, Math.floor(Number(record.upload_attempts) || 0)) + 1;
    var attemptedAt = new Date().toISOString();
    var uploadingRecord = await updateDurableRecord(store, record, {
      sync_status: "pending",
      upload_attempts: attempts,
      last_upload_attempt_at: attemptedAt,
      next_retry_at: null,
      last_error_code: null,
      last_error_message: null
    });
    var payload = buildRecordPayloadFromLocalHistory(uploadingRecord);
    var replayByteSize = Math.max(0, Math.floor(Number(uploadingRecord.replay_byte_size) || 0));
    var useResumableUpload = !!toText(uploadingRecord.upload_task_id).trim() ||
      replayByteSize > RECORD_RESUMABLE_UPLOAD_THRESHOLD_BYTES;
    var result = useResumableUpload
      ? await submitLargeRecord(store, uploadingRecord, payload, opts.deliverySource)
      : await submitRecord(payload, INTERNAL_SUBMIT_TOKEN, {
          keepalive: opts.keepalive === true,
          record: uploadingRecord,
          deliverySource: opts.deliverySource
        });
    if (
      !useResumableUpload &&
      result &&
      (Number(result.status) === 413 || ["REPLAY_TOO_LARGE", "PAYLOAD_TOO_LARGE"].indexOf(
        toText(result.code).trim().toUpperCase()
      ) >= 0)
    ) {
      result = await submitLargeRecord(store, uploadingRecord, payload, opts.deliverySource);
    }

    result = requireRecordSubmitServerId(result);
    var serverRecordId = resolveRecordServerId(result);
    writeLastRecordSubmitResult(payload, result, !!(result && result.success && serverRecordId));
    if (result && result.success && serverRecordId) {
      notifyAchievementUnlocks(result);
      var synced = await updateDurableRecord(store, uploadingRecord, {
        sync_status: "synced",
        server_record_id: serverRecordId,
        next_retry_at: null,
        last_error_code: null,
        last_error_message: null
      });
      refreshLeaderboardsAfterRecordSubmit(payload.mode_key);
      return { success: true, result: result, record: synced };
    }

    var errorText = resolveRecordSubmitErrorMessage(result, "record_submit_failed");
    var code = resolveRecordSubmitErrorCode(result, "RECORD_SUBMIT_FAILED");
    var nextStatus = "needs_action";
    var nextRetryAt = null;
    if (isUnauthorizedSubmitError(result || code)) {
      nextStatus = "waiting_auth";
      clearAuthSessionOnly();
    } else if (isTransientSubmitResult(result, errorText)) {
      nextStatus = "retry_wait";
      nextRetryAt = resolveDurableRetryIso(attempts);
    } else if (isDefinitelyInvalidRecordResult(result, code)) {
      nextStatus = "invalid";
    }
    var failed = await updateDurableRecord(store, uploadingRecord, {
      sync_status: nextStatus,
      next_retry_at: nextRetryAt,
      last_error_code: code,
      last_error_message: errorText
    });
    return { success: false, result: result, record: failed };
  }

  async function migrateLegacyPendingRecordsToDurableOutbox() {
    var store = getDurableRecordOutbox();
    if (!store) return false;
    if (durableOutboxMigrationPromise) return durableOutboxMigrationPromise;
    durableOutboxMigrationPromise = (async function () {
      var states = [];
      var current = buildPendingSubmitState(
        safeGetStorage(STORAGE_PENDING_RECORD_SUBMIT_KEY),
        RECORD_SUBMIT_PENDING_TTL_MS,
        normalizePendingRecordSubmitPayload
      );
      if (current && current.payload) states.push(current);
      var queued = readPendingRecordSubmitQueue();
      for (var i = 0; i < queued.length; i += 1) states.push(queued[i]);
      for (var j = 0; j < states.length; j += 1) {
        var state = states[j];
        var ownerUserId = toText(state.ownerUserId).trim();
        var legacyPayload = Object.assign({}, state.payload, {
          owner_type: ownerUserId ? "user" : "guest",
          owner_user_id: ownerUserId || null,
          owner_key: ownerUserId ? "user:" + ownerUserId : "guest"
        });
        if (!toText(legacyPayload.client_record_id).trim()) {
          legacyPayload.client_record_id = "legacy_pending_" +
            buildReplaySubmitFingerprint(state.signature).replace(/[^a-z0-9]+/gi, "_");
        }
        await store.prepareRecordSubmitAsync(null, legacyPayload);
      }
      if (states.length) {
        clearPendingRecordSubmitSignature();
        clearPendingRecordSubmitQueue();
      }
      return true;
    })().catch(function () {
      durableOutboxMigrationPromise = null;
      return false;
    });
    return durableOutboxMigrationPromise;
  }

  function getLanguage() {
    var raw = toText(safeGetStorage(UI_LANG_STORAGE_KEY)).toLowerCase();
    return raw === "en" ? "en" : "zh";
  }

  function normalizeTimerLeaderboardPeriod(periodLike) {
    var value = toText(periodLike).trim().toLowerCase();
    for (var i = 0; i < TIMER_LEADERBOARD_PERIODS.length; i += 1) {
      if (TIMER_LEADERBOARD_PERIODS[i] === value) return value;
    }
    return "all";
  }

  function getTimerLeaderboardPeriodLabel(periodLike, lang) {
    var period = normalizeTimerLeaderboardPeriod(periodLike);
    if (period === "day") return lang === "en" ? "Daily TOP 10" : "日榜 TOP 10";
    if (period === "week") return lang === "en" ? "Weekly TOP 10" : "周榜 TOP 10";
    if (period === "month") return lang === "en" ? "Monthly TOP 10" : "月榜 TOP 10";
    return "TOP 10";
  }

  function getTimerLeaderboardPeriodTitle(periodLike, lang) {
    var period = normalizeTimerLeaderboardPeriod(periodLike);
    if (period === "day") return lang === "en" ? "Daily leaderboard" : "日榜";
    if (period === "week") return lang === "en" ? "Weekly leaderboard" : "周榜";
    if (period === "month") return lang === "en" ? "Monthly leaderboard" : "月榜";
    return lang === "en" ? "Overall leaderboard" : "总榜";
  }

  function getNextTimerLeaderboardPeriod(periodLike) {
    var period = normalizeTimerLeaderboardPeriod(periodLike);
    var index = TIMER_LEADERBOARD_PERIODS.indexOf(period);
    if (index < 0) index = 0;
    return TIMER_LEADERBOARD_PERIODS[(index + 1) % TIMER_LEADERBOARD_PERIODS.length];
  }

  function resolveLeaderboardMode(modeLike) {
    var key = toText(modeLike).trim().toLowerCase();
    if (!key) return null;
    if (/^board_(?:[6-9]|10)x(?:[6-9]|10)_pow2_(?:no_undo|undo)$/.test(key)) return null;
    return MODE_BUCKET_ALIAS[key] || null;
  }

  function inferModeKeyFromPath() {
    var path = toText(global.location && global.location.pathname).toLowerCase();
    if (path.indexOf("undo_2048") >= 0) return "classic_4x4_pow2_undo";
    if (path.indexOf("capped_2048") >= 0) return "capped_4x4_pow2_no_undo";
    if (path.indexOf("2048.html") >= 0 || path.indexOf("index") >= 0 || path === "/" || path === "/index.html") return "standard_4x4_pow2_no_undo";
    return "";
  }

  function readBodyModeKey() {
    var body = global.document && global.document.body ? global.document.body : null;
    if (!body || typeof body.getAttribute !== "function") return "";
    return toText(body.getAttribute("data-mode-id")).trim();
  }

  function getCurrentModeKey() {
    var manager = global.game_manager;
    if (manager && manager.modeKey) return toText(manager.modeKey).trim();
    if (manager && manager.mode) return toText(manager.mode).trim();
    var bodyModeKey = readBodyModeKey();
    if (bodyModeKey) return bodyModeKey;
    var modeConfigKey = toText(global.GAME_MODE_CONFIG && global.GAME_MODE_CONFIG.key).trim();
    if (modeConfigKey) return modeConfigKey;
    return inferModeKeyFromPath();
  }

  function isLeaderboardModeSupported(modeLike) {
    return !!resolveLeaderboardMode(modeLike);
  }

  function cycleTimerLeaderboardPeriod() {
    timerLeaderboardPeriod = getNextTimerLeaderboardPeriod(timerLeaderboardPeriod);
    updateTimerLeaderboardHeader();
    runPromiseSafely(function () {
      return refreshTimerLeaderboardPanel(false, true);
    });
  }

  function bindTimerLeaderboardSummary(summary) {
    if (!summary || summary.__timerLeaderboardPeriodBound) return;
    summary.__timerLeaderboardPeriodBound = true;
    summary.addEventListener("click", function () {
      cycleTimerLeaderboardPeriod();
    });
    summary.addEventListener("keydown", function (eventLike) {
      var key = toText(eventLike && eventLike.key).toLowerCase();
      if (key !== "enter" && key !== " ") return;
      if (eventLike && typeof eventLike.preventDefault === "function") eventLike.preventDefault();
      cycleTimerLeaderboardPeriod();
    });
  }

  function ensureTimerLeaderboardPanel() {
    var timerBox = byId("timerbox");
    if (!timerBox) return null;

    var panel = byId("timer-leaderboard-panel");
    if (!panel) {
      panel = createEl("div", "timer-leaderboard-panel", "");
      panel.id = "timer-leaderboard-panel";

      var summary = createEl("div", "timer-leaderboard-summary", "");
      summary.id = "timer-leaderboard-summary";
      bindTimerLeaderboardSummary(summary);

      var list = createEl("div", "timer-leaderboard-list", "");
      list.id = "timer-leaderboard-list";

      panel.appendChild(summary);
      panel.appendChild(list);
      timerBox.appendChild(panel);
    } else {
      bindTimerLeaderboardSummary(byId("timer-leaderboard-summary"));
    }

    updateTimerLeaderboardHeader();
    if (byId("timer-leaderboard-list") && !resolveCurrentTimerLeaderboardCacheRows().length) {
      renderTimerLeaderboardPlaceholderRows();
    }
    return panel;
  }

  function updateTimerLeaderboardHeader() {
    var lang = getLanguage();
    var summary = byId("timer-leaderboard-summary");
    if (!summary) return;
    var period = normalizeTimerLeaderboardPeriod(timerLeaderboardPeriod);
    summary.textContent = getTimerLeaderboardPeriodLabel(period, lang);
    summary.classList.toggle("is-period-leaderboard", period !== "all");
    summary.setAttribute("data-label", lang === "en" ? "LEADERBOARD" : "排行榜");
    summary.setAttribute("title", getTimerLeaderboardPeriodTitle(period, lang));
    summary.setAttribute("role", "button");
    summary.setAttribute("tabindex", "0");
    summary.setAttribute("aria-label", getTimerLeaderboardPeriodTitle(period, lang));
    summary.style.cursor = "pointer";
  }

  function resolveRankTileFontSize(rankText) {
    var length = toText(rankText).trim().length;
    if (length <= 1) return "22px";
    if (length === 2) return "18px";
    if (length === 3) return "14px";
    return "12px";
  }

  function resolveFixedNameTileFontSizeFromFirst(topRows, lang) {
    var rows = Array.isArray(topRows) ? topRows : [];
    if (rows.length === 0) return "14px";
    var firstText = formatLeaderboardNameAndScore(rows[0], lang);
    return resolveTimerLeaderboardNameTileFontSize(firstText);
  }

  function resolveTimerLeaderboardNameTileFontSize(text) {
    var length = toText(text).trim().length;
    if (length >= 22) return "10px";
    if (length >= 18) return "11px";
    if (length >= 16) return "12px";
    return "14px";
  }

  function createTimerLeaderboardRowNode() {
    var row = createEl("div", "timer-leaderboard-row", "");
    var rankTile = createEl("div", "timertile timer-leaderboard-rank-tile", "");
    var nameTile = createEl("div", "timertile timer-leaderboard-name-tile", "");
    row.appendChild(rankTile);
    row.appendChild(nameTile);
    row._rankTile = rankTile;
    row._nameTile = nameTile;
    return row;
  }

  function ensureTimerLeaderboardRowNodes(list, count) {
    if (!list) return [];
    var required = Math.max(0, Math.floor(Number(count) || 0));
    while (list.children.length < required) {
      list.appendChild(createTimerLeaderboardRowNode());
    }
    while (list.children.length > required) {
      list.removeChild(list.lastChild);
    }
    var rows = [];
    for (var i = 0; i < list.children.length; i += 1) {
      rows.push(list.children[i]);
    }
    return rows;
  }

  function applyNameTileProfileLink(nameTile, profileUrl) {
    if (!nameTile) return;

    if (!nameTile.__profileClickBound) {
      nameTile.__profileClickBound = true;
      nameTile.addEventListener("click", function () {
        var href = toText(nameTile.getAttribute("data-profile-href")).trim();
        if (!href) return;
        global.location.href = href;
      });
      nameTile.addEventListener("keydown", function (eventLike) {
        var key = toText(eventLike && eventLike.key).toLowerCase();
        if (key !== "enter" && key !== " ") return;
        var href = toText(nameTile.getAttribute("data-profile-href")).trim();
        if (!href) return;
        if (eventLike && typeof eventLike.preventDefault === "function") eventLike.preventDefault();
        global.location.href = href;
      });
    }

    var href = toText(profileUrl).trim();
    if (href) {
      nameTile.classList.add("is-user-link");
      nameTile.setAttribute("data-profile-href", href);
      nameTile.setAttribute("tabindex", "0");
      nameTile.setAttribute("role", "link");
      return;
    }

    nameTile.classList.remove("is-user-link");
    nameTile.removeAttribute("data-profile-href");
    nameTile.removeAttribute("tabindex");
    nameTile.removeAttribute("role");
  }

  function renderTimerLeaderboardNameTileContent(nameTile, nameText, displayParts) {
    if (!nameTile) return;
    var fullText = toText(nameText);
    var parts = displayParts && typeof displayParts === "object" ? displayParts : null;
    if (!parts) {
      nameTile.textContent = fullText;
      nameTile.title = fullText;
      return;
    }

    var nicknameText = toText(parts.nickname);
    var scoreText = toText(parts.score);
    if (!nicknameText || !scoreText) {
      nameTile.textContent = fullText;
      nameTile.title = fullText;
      return;
    }

    nameTile.textContent = "";
    nameTile.title = fullText;

    var nicknameEl = createEl("span", "timer-leaderboard-nickname", nicknameText);
    var separatorEl = createEl("span", "timer-leaderboard-separator", "-");
    var scoreEl = createEl("span", "timer-leaderboard-score", scoreText);

    nameTile.appendChild(nicknameEl);
    nameTile.appendChild(separatorEl);
    nameTile.appendChild(scoreEl);
  }

  function unbindSelfTimerLeaderboardRankTileFlyingEffect(rankTile) {
    if (!rankTile || !rankTile.__timerLeaderboardSelfRankFlyingEffectBinding) return;
    var binding = rankTile.__timerLeaderboardSelfRankFlyingEffectBinding;
    rankTile.__timerLeaderboardSelfRankFlyingEffectBinding = null;
    if (binding && typeof binding.destroy === "function") {
      try {
        binding.destroy();
      } catch (_err) {}
    }
  }

  function bindSelfTimerLeaderboardRankTileFlyingEffect(rankTile) {
    if (!rankTile || rankTile.__timerLeaderboardSelfRankFlyingEffectBinding) return;
    rankTile.__timerLeaderboardSelfRankFlyingEffectBinding = true;
  }

  function unbindSelfTimerLeaderboardRankTileBreakoutEasterEgg(rankTile) {
    if (!rankTile || !rankTile.__timerLeaderboardSelfRankBreakoutEasterEggBinding) return;
    var binding = rankTile.__timerLeaderboardSelfRankBreakoutEasterEggBinding;
    rankTile.__timerLeaderboardSelfRankBreakoutEasterEggBinding = null;
    if (binding && typeof binding.destroy === "function") {
      try {
        binding.destroy();
      } catch (_err) {}
    }
  }

  function bindSelfTimerLeaderboardRankTileBreakoutEasterEgg(rankTile) {
    if (!rankTile || rankTile.__timerLeaderboardSelfRankBreakoutEasterEggBinding) return;
    var runtime = global.CoreBreakoutEasterEggRuntime;
    if (!runtime || typeof runtime.bindBreakoutEasterEgg !== "function") return;
    try {
      rankTile.__timerLeaderboardSelfRankBreakoutEasterEggBinding = runtime.bindBreakoutEasterEgg(rankTile, {
        gameUrl: BREAKOUT_EASTER_EGG_GAME_URL,
        enableClickEffect: true,
        logoAlt: "2048",
        triggerCount: BREAKOUT_EASTER_EGG_TRIGGER_COUNT
      }) || true;
    } catch (_err) {}
  }

  function updateTimerLeaderboardRowNode(row, rankText, nameText, rowClassName, rankClassName, fixedNameFontSize, profileUrl, displayParts) {
    if (!row) return;
    row.className = "timer-leaderboard-row" + (rowClassName ? " " + rowClassName : "");

    var rankTile = row._rankTile;
    var nameTile = row._nameTile;
    if (!rankTile || !nameTile) {
      rankTile = row.querySelector(".timer-leaderboard-rank-tile");
      nameTile = row.querySelector(".timer-leaderboard-name-tile");
      if (!rankTile) {
        rankTile = createEl("div", "timertile timer-leaderboard-rank-tile", "");
        row.insertBefore(rankTile, row.firstChild);
      }
      if (!nameTile) {
        nameTile = createEl("div", "timertile timer-leaderboard-name-tile", "");
        row.appendChild(nameTile);
      }
      row._rankTile = rankTile;
      row._nameTile = nameTile;
    }

    rankTile.className = "timertile timer-leaderboard-rank-tile" + (rankClassName ? " " + rankClassName : "");
    rankTile.textContent = toText(rankText);
    rankTile.style.fontSize = addPxDelta(resolveRankTileFontSize(rankText), TIMER_LEADERBOARD_FONT_DELTA_PX);
    if (rowClassName === "is-self") {
      bindSelfTimerLeaderboardRankTileFlyingEffect(rankTile);
      bindSelfTimerLeaderboardRankTileBreakoutEasterEgg(rankTile);
    } else {
      unbindSelfTimerLeaderboardRankTileFlyingEffect(rankTile);
      unbindSelfTimerLeaderboardRankTileBreakoutEasterEgg(rankTile);
    }

    nameTile.className = "timertile timer-leaderboard-name-tile";
    renderTimerLeaderboardNameTileContent(nameTile, nameText, displayParts);
    nameTile.style.fontSize = addPxDelta(
      resolveTimerLeaderboardNameTileFontSize(nameText) || toText(fixedNameFontSize || "14px"),
      TIMER_LEADERBOARD_FONT_DELTA_PX
    );
    applyNameTileProfileLink(nameTile, profileUrl);
  }

  function resolveLeaderboardDisplayParts(item, lang) {
    var source = item && typeof item === "object" ? item : {};
    var nickname = normalizeLeaderboardNickname(source.nickname);
    if (!nickname) nickname = lang === "en" ? "Anonymous" : "匿名";
    var scoreValue = Math.floor(Number(source.score) || 0);
    var scoreText = String(scoreValue);
    return {
      nickname: nickname,
      score: scoreText,
      text: nickname + "-" + scoreText
    };
  }

  function formatLeaderboardNameAndScore(item, lang) {
    return resolveLeaderboardDisplayParts(item, lang).text;
  }

  function renderTimerLeaderboardRows(topRows, selfEntry) {
    var list = byId("timer-leaderboard-list");
    if (!list) return;

    var lang = getLanguage();
    var rows = Array.isArray(topRows) ? topRows : [];
    var fixedNameFontSize = resolveFixedNameTileFontSizeFromFirst(rows, lang);
    var rowNodes = ensureTimerLeaderboardRowNodes(list, TIMER_LEADERBOARD_TOP_LIMIT + 1);
    var rowCursor = 0;

    for (var i = 0; i < rows.length && i < TIMER_LEADERBOARD_TOP_LIMIT; i += 1) {
      var item = rows[i] || {};
      var displayParts = resolveLeaderboardDisplayParts(item, lang);
      var profileUrl = buildUserProfileUrl(item.user_id, item.nickname);
      var rankClassName = "";
      if (i === 0) rankClassName = "is-top-1";
      else if (i === 1) rankClassName = "is-top-2";
      else if (i === 2) rankClassName = "is-top-3";
      updateTimerLeaderboardRowNode(
        rowNodes[rowCursor],
        String(i + 1),
        displayParts.text,
        "",
        rankClassName,
        fixedNameFontSize,
        profileUrl,
        displayParts
      );
      rowCursor += 1;
    }

    while (rowCursor < TIMER_LEADERBOARD_TOP_LIMIT) {
      var placeholderRankClassName = "";
      if (rowCursor === 0) placeholderRankClassName = "is-top-1";
      else if (rowCursor === 1) placeholderRankClassName = "is-top-2";
      else if (rowCursor === 2) placeholderRankClassName = "is-top-3";
      updateTimerLeaderboardRowNode(
        rowNodes[rowCursor],
        String(rowCursor + 1),
        "--",
        "is-empty",
        placeholderRankClassName,
        fixedNameFontSize,
        ""
      );
      rowCursor += 1;
    }

    var myRankText = "--";
    var myIdentityParts = resolveLeaderboardDisplayParts({
      nickname: getNickname() || (lang === "en" ? "You" : "我"),
      score: 0
    }, lang);

    if (selfEntry) {
      myRankText = String(selfEntry.rank || "--");
      myIdentityParts = resolveLeaderboardDisplayParts(selfEntry, lang);
    }
    var selfProfileUrl = selfEntry ? buildUserProfileUrl(selfEntry.user_id, selfEntry.nickname) : "";

    updateTimerLeaderboardRowNode(
      rowNodes[TIMER_LEADERBOARD_TOP_LIMIT],
      myRankText,
      myIdentityParts.text,
      "is-self",
      "",
      fixedNameFontSize,
      selfProfileUrl,
      myIdentityParts
    );
    if (rows.length > 0) {
      setTimerLeaderboardPanelLoading(false);
    }
  }

  function renderTimerLeaderboardPlaceholderRows() {
    renderTimerLeaderboardRows([], null);
  }

  function hasTimerLeaderboardLoadingRequests() {
    return Object.keys(timerLeaderboardLoadingByKey).length > 0;
  }

  function setTimerLeaderboardPanelLoading(loading) {
    var panel = byId("timer-leaderboard-panel");
    if (!panel || !panel.classList) return;
    var nextLoading = !!loading;
    if (panel.classList.contains("is-loading") !== nextLoading) {
      panel.classList.toggle("is-loading", nextLoading);
    }
    var nextBusy = nextLoading ? "true" : "false";
    if (panel.getAttribute("aria-busy") !== nextBusy) {
      panel.setAttribute("aria-busy", nextBusy);
    }
  }

  function resolveCurrentTimerLeaderboardCacheKey() {
    var modeKey = getCurrentModeKey();
    var period = normalizeTimerLeaderboardPeriod(timerLeaderboardPeriod);
    return modeKey + "|" + period;
  }

  function getTimerLeaderboardCacheEntry(cacheKey) {
    var entry = timerLeaderboardCacheByKey[cacheKey];
    return entry && Array.isArray(entry.rows) ? entry : null;
  }

  function getTimerLeaderboardStorageKey(cacheKey) {
    var key = toText(cacheKey).trim();
    return key ? TIMER_LEADERBOARD_STORAGE_PREFIX + key : "";
  }

  function normalizeTimerLeaderboardStoredEntry(value, cacheKey) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    var key = toText(value.key).trim() || cacheKey;
    if (key !== cacheKey) return null;
    var rows = Array.isArray(value.rows) ? value.rows : [];
    return {
      key: key,
      rows: rows,
      time: Math.max(0, Math.floor(Number(value.time) || 0))
    };
  }

  function readTimerLeaderboardStoredEntry(cacheKey) {
    var storageKey = getTimerLeaderboardStorageKey(cacheKey);
    if (!storageKey) return null;
    var raw = toText(safeGetStorage(storageKey));
    if (!raw) return null;
    try {
      return normalizeTimerLeaderboardStoredEntry(JSON.parse(raw), cacheKey);
    } catch (_err) {
      return null;
    }
  }

  function writeTimerLeaderboardStoredEntry(entry) {
    if (!entry || !entry.key || !Array.isArray(entry.rows)) return;
    var storageKey = getTimerLeaderboardStorageKey(entry.key);
    if (!storageKey) return;
    try {
      safeSetStorage(storageKey, JSON.stringify({
        key: entry.key,
        rows: entry.rows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT),
        time: Math.max(0, Math.floor(Number(entry.time) || Date.now()))
      }));
    } catch (_err) {}
  }

  function getAnyTimerLeaderboardCacheEntry(cacheKey) {
    var entry = getTimerLeaderboardCacheEntry(cacheKey);
    if (entry) return entry;
    entry = readTimerLeaderboardStoredEntry(cacheKey);
    if (entry) {
      timerLeaderboardCacheByKey[cacheKey] = entry;
      return entry;
    }
    return null;
  }

  function resolveCurrentTimerLeaderboardCacheRows() {
    var cacheKey = resolveCurrentTimerLeaderboardCacheKey();
    var entry = getTimerLeaderboardCacheEntry(cacheKey);
    if (entry) return entry.rows;
    if (timerLeaderboardCacheMode === cacheKey) return timerLeaderboardCacheRows;
    return [];
  }

  function renderTimerLeaderboardCacheEntry(entry) {
    var rows = entry && Array.isArray(entry.rows) ? entry.rows : [];
    var key = entry && entry.key ? entry.key : "";
    var selfEntry = resolveSelfRank(rows);
    var selfSignature = selfEntry
      ? [
        toText(selfEntry.rank).trim(),
        toText(selfEntry.user_id).trim(),
        toText(selfEntry.nickname).trim(),
        Math.floor(Number(selfEntry.score) || 0)
      ].join(":")
      : "";
    var signature = key + "|" + rows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT).map(function (row, index) {
      return [
        index,
        toText(row && row.user_id).trim(),
        toText(row && row.nickname).trim(),
        Math.floor(Number(row && row.score) || 0)
      ].join(":");
    }).join(",") + "|self:" + selfSignature;
    timerLeaderboardCacheRows = rows;
    timerLeaderboardCacheMode = key;
    timerLeaderboardCacheTime = entry && Number(entry.time) ? Number(entry.time) : 0;
    setTimerLeaderboardPanelLoading(false);
    if (signature && signature === timerLeaderboardRenderedSignature) return;
    renderTimerLeaderboardRows(rows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT), selfEntry);
    timerLeaderboardRenderedSignature = signature;
    setTimerLeaderboardPanelLoading(false);
  }

  function renderTimerLeaderboardLoadingPlaceholder(cacheKey, allowReplaceVisibleRows) {
    if (cacheKey !== resolveCurrentTimerLeaderboardCacheKey()) return;
    if (!allowReplaceVisibleRows && hasVisibleTimerLeaderboardRows()) {
      setTimerLeaderboardPanelLoading(false);
      return;
    }
    timerLeaderboardRenderedSignature = "";
    renderTimerLeaderboardPlaceholderRows();
    setTimerLeaderboardPanelLoading(true);
  }

  function hasVisibleTimerLeaderboardRows() {
    var list = byId("timer-leaderboard-list");
    if (!list || typeof list.querySelector !== "function") return false;
    var firstNameTile = list.querySelector(
      ".timer-leaderboard-row:not(.is-empty):not(.is-self) .timer-leaderboard-name-tile"
    );
    if (!firstNameTile) return false;
    var text = toText(firstNameTile.textContent).trim();
    return !!text && text !== "--";
  }

  function resolveSelfRank(rows) {
    var list = Array.isArray(rows) ? rows : [];
    var userId = String(Math.floor(Number(getUserId()) || 0));
    if (!userId || userId === "0") return null;

    for (var i = 0; i < list.length; i += 1) {
      var item = list[i] || {};
      if (String(item.user_id || "") === userId) {
        return {
          rank: i + 1,
          user_id: Math.floor(Number(item.user_id) || 0),
          score: Math.floor(Number(item.score) || 0),
          nickname: toText(item.nickname || getNickname() || "")
        };
      }
    }
    return {
      rank: "--",
      user_id: Math.floor(Number(userId) || 0),
      score: 0,
      nickname: getNickname() || ""
    };
  }

  function syncTimerLeaderboardViewMode() {
    var timerBox = byId("timerbox");
    if (!timerBox) return;

    var manager = global.game_manager || {};
    var modeKey = getCurrentModeKey();
    var supported = isLeaderboardModeSupported(modeKey);
    var isHiddenView =
      typeof manager.getTimerModuleViewMode === "function"
        ? toText(manager.getTimerModuleViewMode()) === "hidden"
        : false;
    var enableLeaderboardPanel = supported && isHiddenView;

    timerBox.classList.toggle("timerbox-leaderboard-mode", enableLeaderboardPanel);

  }

  async function apiRequest(path, options) {
    var opts = options || {};
    var method = toText(opts.method || "GET").toUpperCase();
    var lastError = "Network error";
    var requestedTimeoutMs = Math.floor(Number(opts.timeoutMs) || 0);
    var timeoutMs = requestedTimeoutMs > 0 ? requestedTimeoutMs : resolveApiTimeoutMs();

    for (var i = 0; i < apiBases.length; i += 1) {
      var base = apiBases[i];
      var headers = opts.headers && typeof opts.headers === "object" ? Object.assign({}, opts.headers) : {};
      var requestInit = {
        method: method,
        headers: headers,
        credentials: "include"
      };
      if (opts.keepalive === true) {
        requestInit.keepalive = true;
      }
      var timeoutHandle = null;
      var controller = null;
      if (typeof global.AbortController === "function") {
        controller = new global.AbortController();
        requestInit.signal = controller.signal;
      }

      if (opts.auth) {
        var token = getAuthToken();
        if (token) requestInit.headers.Authorization = "Bearer " + token;
      }

      if (opts.rawBody !== undefined) {
        if (!requestInit.headers["Content-Type"] && !requestInit.headers["content-type"]) {
          requestInit.headers["Content-Type"] = "application/octet-stream";
        }
        requestInit.body = opts.rawBody;
      } else if (opts.body !== undefined) {
        requestInit.headers["Content-Type"] = "application/json";
        requestInit.body = JSON.stringify(opts.body);
      }
      var allowFallback = method === "GET" && !requestInit.headers.Authorization;

      try {
        if (controller) {
          timeoutHandle = global.setTimeout(function () {
            try { controller.abort(); } catch (_err) {}
          }, timeoutMs);
        }
        var response = await (opts.auth ? sharedFetchWithAuth(base + path, requestInit) : callFetch(base + path, requestInit));
        if (timeoutHandle) {
          global.clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        var contentType = toText(
          response && response.headers && typeof response.headers.get === "function"
            ? response.headers.get("content-type")
            : ""
        ).toLowerCase();
        var data = null;
        try {
          data = await response.json();
        } catch (_jsonErr) {
          data = null;
        }

        if (!response.ok) {
          if (!data && allowFallback && i < apiBases.length - 1) {
            continue;
          }
          if (data && typeof data === "object") {
            if (typeof data.status === "undefined") data.status = response.status;
            return data;
          }
          return { error: "HTTP " + response.status, status: response.status };
        }

        if (!data || typeof data !== "object") {
          var origin = toText(global.location && global.location.origin).trim().replace(/\/+$/, "");
          var normalizedBase = toText(base).trim().replace(/\/+$/, "");
          var isSameOriginApiBase = !!origin && normalizedBase === origin + "/api";
          if (contentType.indexOf("text/html") >= 0 && isSameOriginApiBase && apiBases.length === 1) {
            return { error: "API not configured" };
          }
          if (allowFallback && i < apiBases.length - 1) {
            continue;
          }
          return { error: "Invalid response format" };
        }

        activeApiBase = base;
        return data;
      } catch (error) {
        if (timeoutHandle) {
          global.clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        var errorName = toText(error && error.name).toLowerCase();
        if (errorName === "aborterror") {
          lastError = "Network timeout";
        } else {
          lastError = "Network error: " + toText(error && error.message);
        }
        if (!allowFallback) break;
      }
    }

    return { error: lastError };
  }

  function register(payload) {
    return apiRequest("/register", { method: "POST", body: payload });
  }

  function login(payload) {
    return apiRequest("/login", { method: "POST", body: payload });
  }

  // Keep raw score/record submission on a private token so the runtime no longer
  // acts as a ready-made console helper for arbitrary POST payloads.
  var INTERNAL_SUBMIT_TOKEN = {};

  function isInternalSubmitToken(token) {
    return token === INTERNAL_SUBMIT_TOKEN;
  }

  function submitScore(scoreOrPayload, modeLike, submitToken, options) {
    if (!isInternalSubmitToken(submitToken)) {
      return Promise.resolve({ success: false, error: "client_submit_api_disabled" });
    }
    var opts = options && typeof options === "object" ? options : {};
    var payload = null;
    if (scoreOrPayload && typeof scoreOrPayload === "object" && !Array.isArray(scoreOrPayload)) {
      payload = Object.assign({}, scoreOrPayload);
    } else {
      var modeKey = toText(modeLike).trim();
      var modeBucket = resolveLeaderboardMode(modeKey);
      payload = { score: scoreOrPayload };
      if (modeKey) payload.mode_key = modeKey;
      if (modeBucket) payload.mode = modeBucket;
    }
    return apiRequest("/score", {
      method: "POST",
      auth: true,
      body: payload,
      keepalive: opts.keepalive === true
    });
  }

  function recordDeliveryHeaders(payload, record, source) {
    return {
      "X-Client-Version": toText((record && record.client_version) || global.GAME_CLIENT_VERSION).trim() || "1.8",
      "X-Record-Mode-Key": toText(payload && payload.mode_key).trim(),
      "X-Client-Record-Id": toText(payload && payload.client_record_id).trim(),
      "X-Record-Delivery-Source": source === "manual" ? "manual" : "automatic"
    };
  }

  function submitRecord(payload, submitToken, options) {
    if (!isInternalSubmitToken(submitToken)) {
      return Promise.resolve({ success: false, error: "client_submit_api_disabled" });
    }
    var opts = options && typeof options === "object" ? options : {};
    return apiRequest("/records", {
      method: "POST",
      auth: true,
      headers: recordDeliveryHeaders(payload, opts.record, opts.deliverySource),
      body: payload,
      keepalive: opts.keepalive === true
    });
  }

  async function sha256UploadBytes(bytes) {
    var cryptoLike = global && global.crypto;
    if (!cryptoLike || !cryptoLike.subtle || typeof cryptoLike.subtle.digest !== "function") return "";
    var digest = await cryptoLike.subtle.digest("SHA-256", bytes);
    return Array.prototype.map.call(new Uint8Array(digest), function (value) {
      return value.toString(16).padStart(2, "0");
    }).join("");
  }

  function recordUploadTaskFromResult(result) {
    var data = result && result.data && typeof result.data === "object" ? result.data : result;
    return data && typeof data === "object" ? data : null;
  }

  async function submitLargeRecord(store, record, payload, deliverySource) {
    if (typeof global.TextEncoder !== "function") {
      return { success: false, status: 409, code: "UPLOAD_CRYPTO_UNAVAILABLE", error: "Large replay upload is unavailable" };
    }
    var replayBytes = new global.TextEncoder().encode(toText(payload && payload.replay_string));
    var replaySha256 = await sha256UploadBytes(replayBytes);
    if (!replaySha256) {
      return { success: false, status: 409, code: "UPLOAD_CRYPTO_UNAVAILABLE", error: "Large replay upload is unavailable" };
    }
    var storedSha256 = toText(record && record.replay_sha256).trim().toLowerCase();
    if (storedSha256 && storedSha256 !== replaySha256) {
      return { success: false, status: 409, code: "LOCAL_REPLAY_HASH_MISMATCH", error: "Local replay hash mismatch" };
    }

    var taskResult = null;
    var taskId = toText(record && record.upload_task_id).trim();
    if (taskId) {
      taskResult = await apiRequest("/records/uploads/" + encodeURIComponent(taskId), { auth: true });
      if (!(taskResult && taskResult.success)) {
        var statusCode = Math.floor(Number(taskResult && taskResult.status) || 0);
        if (statusCode !== 404 && statusCode !== 410) return taskResult;
        taskId = "";
      }
    }
    if (!taskId) {
      taskResult = await apiRequest("/records/uploads", {
        method: "POST",
        auth: true,
        headers: recordDeliveryHeaders(payload, record, deliverySource),
        body: {
          client_record_id: payload.client_record_id,
          mode_key: payload.mode_key,
          replay_sha256: replaySha256,
          replay_byte_size: replayBytes.byteLength,
          chunk_size: RECORD_RESUMABLE_UPLOAD_CHUNK_BYTES
        }
      });
    }
    if (!(taskResult && taskResult.success)) return taskResult;
    var task = recordUploadTaskFromResult(taskResult);
    if (toText(task && task.status).trim() === "completed" && toText(task && task.server_record_id).trim()) {
      return { success: true, id: toText(task.server_record_id).trim(), duplicate: true, upload_task_id: toText(task.upload_task_id).trim() || null };
    }
    taskId = toText(task && task.upload_task_id).trim();
    if (!taskId) return { success: false, status: 503, code: "UPLOAD_TASK_UNAVAILABLE", error: "Upload task unavailable" };
    var chunkSize = Math.max(1, Math.floor(Number(task.chunk_size) || RECORD_RESUMABLE_UPLOAD_CHUNK_BYTES));
    var chunkCount = Math.max(1, Math.floor(Number(task.chunk_count) || Math.ceil(replayBytes.byteLength / chunkSize)));
    var received = {};
    (Array.isArray(task.received_chunks) ? task.received_chunks : []).forEach(function (index) {
      received[Math.floor(Number(index))] = true;
    });
    record = await updateDurableRecord(store, record, {
      upload_task_id: taskId,
      uploaded_chunk_count: Object.keys(received).length
    });

    for (var index = 0; index < chunkCount; index += 1) {
      if (received[index]) continue;
      var chunk = replayBytes.slice(index * chunkSize, Math.min(replayBytes.byteLength, (index + 1) * chunkSize));
      var chunkSha256 = await sha256UploadBytes(chunk);
      var chunkResult = await apiRequest(
        "/records/uploads/" + encodeURIComponent(taskId) + "/chunks/" + index,
        {
          method: "PUT",
          auth: true,
          headers: Object.assign(recordDeliveryHeaders(payload, record, deliverySource), {
            "Content-Type": "application/octet-stream",
            "X-Chunk-Sha256": chunkSha256,
            "X-Chunk-Byte-Size": String(chunk.byteLength)
          }),
          rawBody: chunk
        }
      );
      if (!(chunkResult && chunkResult.success)) return chunkResult;
      received[index] = true;
      record = await updateDurableRecord(store, record, {
        upload_task_id: taskId,
        uploaded_chunk_count: Object.keys(received).length
      });
    }

    var completionPayload = Object.assign({}, payload);
    delete completionPayload.replay_string;
    delete completionPayload.replay;
    return apiRequest("/records/uploads/" + encodeURIComponent(taskId) + "/complete", {
      method: "POST",
      auth: true,
      headers: recordDeliveryHeaders(payload, record, deliverySource),
      body: completionPayload,
      timeoutMs: 5 * 60 * 1000
    });
  }

  function submitStone2kRun(payload, submitToken, options) {
    if (!isInternalSubmitToken(submitToken)) {
      return Promise.resolve({ success: false, error: "client_submit_api_disabled" });
    }
    var opts = options && typeof options === "object" ? options : {};
    return apiRequest("/stone-2k/runs", {
      method: "POST",
      auth: true,
      body: payload,
      keepalive: opts.keepalive === true
    });
  }

  function notifyAchievementUnlocks(result) {
    if (!result || result.success !== true) return;
    var runtime = global.AchievementUnlockToastRuntime;
    if (!runtime || typeof runtime.showAchievementUnlockToasts !== "function") return;
    var data = result.data && typeof result.data === "object" ? result.data : null;
    var achievements = [];
    if (Array.isArray(result.achievements)) achievements = result.achievements;
    else if (data && Array.isArray(data.achievements)) achievements = data.achievements;
    else if (data && data.achievement) achievements = [data];
    if (achievements.length <= 0) return;
    try {
      runtime.showAchievementUnlockToasts(achievements);
    } catch (_err) {}
  }

  function isPlainRecord(value) {
    return !!(value && typeof value === "object" && !Array.isArray(value));
  }

  function resolveRankedCheckpointLocalMirrorModeKey(modeLike) {
    return toText(modeLike).trim() || getCurrentModeKey();
  }

  function resolveRankedCheckpointLocalMirrorStorageKey(modeLike) {
    var modeKey = resolveRankedCheckpointLocalMirrorModeKey(modeLike);
    return modeKey ? RANKED_CHECKPOINT_LOCAL_MIRROR_KEY_PREFIX + modeKey : "";
  }

  function normalizeRankedCheckpointClearOwnerPart(ownerLike) {
    var text = toText(ownerLike).trim().toLowerCase();
    if (!text) return "guest";
    return text.replace(/[^a-z0-9_.:@-]+/g, "_").slice(0, 64) || "guest";
  }

  function resolveRankedCheckpointClearMarkerStorageKey(modeLike) {
    var modeKey = resolveRankedCheckpointLocalMirrorModeKey(modeLike);
    if (!modeKey) return "";
    var userId = toText(getUserId()).trim();
    var ownerPart = userId ? ("user:" + normalizeRankedCheckpointClearOwnerPart(userId)) : "guest";
    return RANKED_CHECKPOINT_CLEAR_MARKER_KEY_PREFIX + ownerPart + ":" + modeKey;
  }

  function normalizeTimestampMs(value) {
    if (value == null || value === "") return 0;
    var numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.floor(numeric < 10000000000 ? numeric * 1000 : numeric);
    }
    var parsed = Date.parse(toText(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function readRankedCheckpointClearMarker(modeLike) {
    var storageKey = resolveRankedCheckpointClearMarkerStorageKey(modeLike);
    if (!storageKey) return {
      clearedAt: 0,
      sessionToken: "",
      clientRecordId: ""
    };
    var raw = readLocalStorageItem(storageKey);
    if (!raw) return {
      clearedAt: 0,
      sessionToken: "",
      clientRecordId: ""
    };
    try {
      var parsed = JSON.parse(raw);
      if (isPlainRecord(parsed)) {
        return {
          clearedAt: normalizeTimestampMs(parsed.cleared_at),
          sessionToken: toText(parsed.ranked_session_token).trim(),
          clientRecordId: toText(parsed.client_record_id).trim()
        };
      }
    } catch (_err) {}
    return {
      clearedAt: normalizeTimestampMs(raw),
      sessionToken: "",
      clientRecordId: ""
    };
  }

  function readRankedCheckpointClearedAt(modeLike) {
    return readRankedCheckpointClearMarker(modeLike).clearedAt;
  }

  function markRankedCheckpointCleared(modeLike, clearedAt, clearContext) {
    var modeKey = resolveRankedCheckpointLocalMirrorModeKey(modeLike);
    var storageKey = resolveRankedCheckpointClearMarkerStorageKey(modeKey);
    if (!modeKey || !storageKey) return false;
    var context = isPlainRecord(clearContext) ? clearContext : {};
    var payload = {
      mode_key: modeKey,
      owner_user_id: toText(getUserId()).trim() || null,
      cleared_at: normalizeTimestampMs(clearedAt) || Date.now(),
      ranked_session_token: toText(context.rankedSessionToken).trim() || null,
      client_record_id: toText(context.clientRecordId).trim() || null
    };
    try {
      writeLocalStorageItem(storageKey, JSON.stringify(payload));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function clearRankedCheckpointClearMarker(modeLike) {
    var storageKey = resolveRankedCheckpointClearMarkerStorageKey(modeLike);
    if (!storageKey) return;
    removeLocalStorageItem(storageKey);
  }

  function resolveRankedCheckpointTimestampMs(checkpointData) {
    if (!isPlainRecord(checkpointData)) return 0;
    var direct =
      normalizeTimestampMs(checkpointData.saved_at) ||
      normalizeTimestampMs(checkpointData.updated_at) ||
      normalizeTimestampMs(checkpointData.created_at);
    if (direct > 0) return direct;
    var uiState = isPlainRecord(checkpointData.ui_state) ? checkpointData.ui_state : null;
    var savedState = uiState && isPlainRecord(uiState.saved_state) ? uiState.saved_state : null;
    return normalizeTimestampMs(savedState && savedState.saved_at);
  }

  function readStoredRankedSessionRecord(storagePrefix, modeLike) {
    var modeKey = resolveRankedCheckpointLocalMirrorModeKey(modeLike);
    if (!modeKey) return null;
    var raw = readLocalStorageItem(storagePrefix + modeKey);
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!isPlainRecord(parsed)) return null;
      if (toText(parsed.mode_key).trim() && toText(parsed.mode_key).trim() !== modeKey) return null;
      var currentUserId = toText(getUserId()).trim();
      if (currentUserId && toText(parsed.owner_user_id).trim() !== currentUserId) return null;
      return parsed;
    } catch (_err) {
      return null;
    }
  }

  function readActiveRankedSessionRecord(modeLike) {
    return readStoredRankedSessionRecord(RANKED_SESSION_ACTIVE_KEY_PREFIX, modeLike);
  }

  function readPrefetchedRankedSessionRecord(modeLike) {
    return readStoredRankedSessionRecord(RANKED_SESSION_PREFETCH_KEY_PREFIX, modeLike);
  }

  function resolveRankedCheckpointSessionId(checkpointData) {
    if (!isPlainRecord(checkpointData)) return "";
    return (
      toText(checkpointData.challenge_id).trim().toLowerCase() ||
      toText(checkpointData.ranked_session_id).trim().toLowerCase()
    );
  }

  function shouldRejectRankedCheckpointForRestore(checkpointData, modeLike) {
    if (!isPlainRecord(checkpointData)) return false;
    var modeKey = resolveRankedCheckpointLocalMirrorModeKey(modeLike || checkpointData.mode_key);
    if (!modeKey) return false;

    var clearMarker = readRankedCheckpointClearMarker(modeKey);
    var clearedAt = clearMarker.clearedAt;
    var checkpointToken = toText(checkpointData.ranked_session_token).trim();
    var checkpointClientRecordId = toText(checkpointData.client_record_id).trim();
    if (clearedAt > 0) {
      if (
        clearMarker.clientRecordId &&
        checkpointClientRecordId &&
        clearMarker.clientRecordId === checkpointClientRecordId
      ) {
        return true;
      }
      if (
        clearMarker.sessionToken &&
        checkpointToken &&
        clearMarker.sessionToken === checkpointToken &&
        !checkpointClientRecordId
      ) {
        return true;
      }
      var checkpointAtForClear = resolveRankedCheckpointTimestampMs(checkpointData);
      if (!(checkpointAtForClear > clearedAt)) return true;
    }

    var hasAuth = !!getAuthToken();
    var activeSession = hasAuth ? readActiveRankedSessionRecord(modeKey) : null;
    if (!activeSession) return false;
    var activeChallengeId = toText(activeSession.challenge_id).trim().toLowerCase();
    var checkpointChallengeId = resolveRankedCheckpointSessionId(checkpointData);
    if (activeChallengeId && checkpointChallengeId) {
      if (activeChallengeId !== checkpointChallengeId) return true;
      var activeSeed = normalizeRankedSessionSeed(activeSession.seed);
      var checkpointSeed = normalizeRankedSessionSeed(checkpointData.initial_seed);
      if (checkpointSeed === null) checkpointSeed = normalizeRankedSessionSeed(checkpointData.seed);
      return activeSeed !== null && checkpointSeed !== null && activeSeed !== checkpointSeed;
    }
    if (checkpointChallengeId) {
      return false;
    }
    var activeToken = toText(activeSession.ranked_session_token).trim();
    if (activeToken && !checkpointToken) return true;
    if (activeToken && checkpointToken && activeToken !== checkpointToken) return true;

    var activeIssuedAt = normalizeTimestampMs(activeSession.issued_at);
    var checkpointAt = resolveRankedCheckpointTimestampMs(checkpointData);
    return activeIssuedAt > 0 && checkpointAt > 0 && checkpointAt < activeIssuedAt;
  }

  function normalizeRankedCheckpointLocalMirrorRecord(rawValue, expectedModeKey) {
    if (!isPlainRecord(rawValue)) return null;
    var modeKey = toText(rawValue.mode_key).trim();
    if (!modeKey) return null;
    if (expectedModeKey && modeKey !== expectedModeKey) return null;
    var replayString = toText(rawValue.replay_string).trim();
    if (!replayString) return null;
    var durationMs = Math.max(0, Math.floor(Number(rawValue.duration_ms) || 0));
    var savedAt = Math.max(0, Math.floor(Number(rawValue.saved_at) || 0));
    return {
      mode: toText(rawValue.mode).trim(),
      mode_key: modeKey,
      ranked_session_token: toText(rawValue.ranked_session_token).trim() || null,
      challenge_id: toText(rawValue.challenge_id).trim() || null,
      initial_seed: normalizeRankedSessionSeed(rawValue.initial_seed),
      seed: normalizeRankedSessionSeed(rawValue.seed),
      spawn_sequence_version: normalizeSpawnSequenceVersion(rawValue.spawn_sequence_version),
      client_record_id: toText(rawValue.client_record_id).trim() || null,
      replay_string: replayString,
      duration_ms: durationMs,
      ui_state: isPlainRecord(rawValue.ui_state) ? Object.assign({}, rawValue.ui_state) : {},
      saved_at: savedAt,
      owner_user_id: toText(rawValue.owner_user_id).trim() || null
    };
  }

  function readRankedCheckpointLocalMirror(modeLike) {
    var modeKey = resolveRankedCheckpointLocalMirrorModeKey(modeLike);
    var storageKey = resolveRankedCheckpointLocalMirrorStorageKey(modeKey);
    if (!modeKey || !storageKey) return null;
    var raw = readLocalStorageItem(storageKey);
    if (!raw) return null;
    var parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_err) {
      removeLocalStorageItem(storageKey);
      return null;
    }
    var record = normalizeRankedCheckpointLocalMirrorRecord(parsed, modeKey);
    if (!record) {
      removeLocalStorageItem(storageKey);
      return null;
    }
    var currentUserId = toText(getUserId()).trim();
    var ownerUserId = toText(record.owner_user_id).trim();
    if (currentUserId) {
      if (!ownerUserId || ownerUserId !== currentUserId) return null;
    } else if (ownerUserId) {
      return null;
    }
    if (shouldRejectRankedCheckpointForRestore(record, modeKey)) {
      removeLocalStorageItem(storageKey);
      return null;
    }
    return record;
  }

  function hasRankedCheckpointLocalMirror(modeLike) {
    return !!readRankedCheckpointLocalMirror(modeLike);
  }

  function clearRankedCheckpointLocalMirror(modeLike) {
    var storageKey = resolveRankedCheckpointLocalMirrorStorageKey(modeLike);
    if (!storageKey) return;
    removeLocalStorageItem(storageKey);
  }

  function buildRankedCheckpointLocalMirrorPayload(manager) {
    if (!shouldUseRankedCheckpoint(manager) || isSessionTerminated(manager)) return null;
    var payload = buildRankedCheckpointPayload(manager, { includeSavedState: false });
    if (!payload) return null;
    return {
      mode: toText(payload.mode).trim(),
      mode_key: toText(payload.mode_key).trim(),
      ranked_session_token: toText(payload.ranked_session_token).trim() || null,
      challenge_id: toText(payload.challenge_id).trim() || null,
      initial_seed: normalizeRankedSessionSeed(payload.initial_seed),
      seed: normalizeRankedSessionSeed(payload.seed),
      spawn_sequence_version: normalizeSpawnSequenceVersion(payload.spawn_sequence_version),
      client_record_id: toText(payload.client_record_id).trim() || null,
      replay_string: toText(payload.replay_string).trim(),
      duration_ms: Math.max(0, Math.floor(Number(payload.duration_ms) || 0)),
      ui_state: isPlainRecord(payload.ui_state) ? Object.assign({}, payload.ui_state) : {},
      saved_at: Date.now(),
      owner_user_id: toText(getUserId()).trim() || null
    };
  }

  function persistRankedCheckpointLocalMirror(manager) {
    if (!shouldUseRankedCheckpoint(manager)) return false;
    var modeKey = resolveRankedCheckpointLocalMirrorModeKey(manager && (manager.modeKey || manager.mode));
    if (!modeKey) return false;
    var payload = buildRankedCheckpointLocalMirrorPayload(manager);
    if (!payload) {
      clearRankedCheckpointLocalMirror(modeKey);
      return false;
    }
    var storageKey = resolveRankedCheckpointLocalMirrorStorageKey(modeKey);
    var serialized;
    try {
      serialized = JSON.stringify(payload);
    } catch (_errSerialize) {
      return false;
    }
    if (!writeLocalStorageItem(storageKey, serialized)) return false;
    return readLocalStorageItem(storageKey) === serialized;
  }

  function buildRankedCheckpointRestoreCandidates(localMirror, remoteCheckpoint) {
    var candidates = [];
    if (remoteCheckpoint) candidates.push({ source: "remote", data: remoteCheckpoint });
    if (localMirror) candidates.push({ source: "local", data: localMirror });
    candidates.sort(function (a, b) {
      var at = resolveRankedCheckpointTimestampMs(a && a.data);
      var bt = resolveRankedCheckpointTimestampMs(b && b.data);
      if (at !== bt) return bt - at;
      if (a.source === "remote" && b.source !== "remote") return -1;
      if (b.source === "remote" && a.source !== "remote") return 1;
      return 0;
    });
    return candidates;
  }

  function restoreRankedCheckpointLocalMirror(manager, checkpointData) {
    var modeKey = toText(manager && (manager.modeKey || manager.mode)).trim();
    var restoreData = normalizeRankedCheckpointLocalMirrorRecord(checkpointData, modeKey);
    if (!restoreData) {
      clearRankedCheckpointLocalMirror(modeKey);
      return false;
    }
    var restored = restoreRankedCheckpointForManager(manager, restoreData);
    if (!restored) return false;
    persistRankedCheckpointLocalMirror(manager);
    return true;
  }

  function shouldUseRankedCheckpoint(manager) {
    return !!(
      manager &&
      !manager.replayMode &&
      toText(manager.rankPolicy).trim().toLowerCase() === "ranked"
    );
  }

  function clearRankedCheckpointSaveTimer() {
    if (!rankedCheckpointSaveTimer) return;
    global.clearTimeout(rankedCheckpointSaveTimer);
    rankedCheckpointSaveTimer = 0;
  }

  function buildRankedCheckpointUiState(manager, options) {
    var opts = isPlainRecord(options) ? options : {};
    var documentLike = global.document || null;
    var timerSnapshot =
      typeof collectSavedTimerDomSnapshotState === "function"
        ? collectSavedTimerDomSnapshotState(manager, documentLike)
        : null;
    var timerSubState =
      typeof collectSavedTimerSubState === "function"
        ? collectSavedTimerSubState(manager, documentLike)
        : null;
    var snapshot = isPlainRecord(timerSnapshot) ? timerSnapshot : {};
    var subState = isPlainRecord(timerSubState) ? timerSubState : {};
    var uiState = {
      has_game_started: !!manager.hasGameStarted,
      timer_status: manager.timerStatus === 1 ? 1 : 0,
      timer_frozen: !!manager.timerFrozen,
      timer_module_view:
        typeof manager.getTimerModuleViewMode === "function"
          ? toText(manager.getTimerModuleViewMode()).trim() || "timer"
          : "timer",
      timer_fixed_rows: snapshot.timerFixedRowsState || {},
      timer_dynamic_rows_capped: Array.isArray(snapshot.timerDynamicRowsCappedState)
        ? snapshot.timerDynamicRowsCappedState
        : [],
      timer_dynamic_rows_overflow: Array.isArray(snapshot.timerDynamicRowsOverflowState)
        ? snapshot.timerDynamicRowsOverflowState
        : [],
      timer_secondary_rows: Array.isArray(subState.timer_secondary_rows)
        ? subState.timer_secondary_rows
        : [],
      timer_secondary_expanded_parents: Array.isArray(subState.timer_secondary_expanded_parents)
        ? subState.timer_secondary_expanded_parents
        : [],
      timer_sub_8192: toText(subState.timer_sub_8192),
      timer_sub_16384: toText(subState.timer_sub_16384),
      timer_sub_visible: !!subState.timer_sub_visible
    };
    if (opts.includeSavedState !== false && typeof buildSavedGameStatePayload === "function") {
      try {
        uiState.saved_state = buildSavedGameStatePayload(manager, Date.now(), {
          force: true,
          forceFull: true
        });
      } catch (_errSavedState) {}
    }
    return uiState;
  }

  function buildRankedCheckpointPayload(manager, options) {
    if (!shouldUseRankedCheckpoint(manager)) return null;
    var opts = isPlainRecord(options) ? options : {};
    var replayPayload = resolveRecordReplayPayload(manager);
    if (!replayPayload.replayString) return null;
    if (!(manager.hasGameStarted || (Array.isArray(manager.moveHistory) && manager.moveHistory.length > 0))) {
      return null;
    }
    var rankedContext = resolveRankedSubmitContextForManager(manager);
    return {
      mode: resolveLeaderboardMode(manager.modeKey || manager.mode),
      mode_key: toText(manager.modeKey || manager.mode).trim(),
      ranked_session_token: rankedContext ? rankedContext.token : null,
      challenge_id: rankedContext ? rankedContext.challengeId : null,
      initial_seed: rankedContext ? rankedContext.seed : null,
      seed: rankedContext ? rankedContext.seed : null,
      spawn_sequence_version: rankedContext ? rankedContext.spawnSequenceVersion : 1,
      ranked_verification: buildRankedVerificationPayload(manager),
      client_record_id: resolveManagerClientRecordIdForSubmit(manager) || null,
      duration_ms: resolveManagerDurationMs(manager),
      replay_string: replayPayload.replayString,
      ui_state: buildRankedCheckpointUiState(manager, {
        includeSavedState: opts.includeSavedState !== false
      })
    };
  }

  function buildRankedCheckpointSignature(manager, payload) {
    var score = Math.floor(Number(manager && manager.score) || 0);
    var moveCount = Array.isArray(manager && manager.moveHistory) ? manager.moveHistory.length : 0;
    return [
      toText(payload && payload.mode_key).trim(),
      toText(payload && payload.client_record_id).trim(),
      score,
      moveCount,
      toText(payload && payload.replay_string).length
    ].join("|");
  }

  function submitRankedCheckpoint(payload, submitToken, requestOptions) {
    if (!isInternalSubmitToken(submitToken)) {
      return Promise.resolve({ success: false, error: "client_submit_api_disabled" });
    }
    var opts = isPlainRecord(requestOptions) ? requestOptions : {};
    return apiRequest("/ranked-checkpoint", {
      method: "POST",
      auth: true,
      body: payload,
      keepalive: opts.keepalive === true
    });
  }

  function loadRankedCheckpoint(modeLike) {
    var modeKey = toText(modeLike).trim();
    if (!modeKey) return Promise.resolve({ success: true, data: null });
    return apiRequest(
      "/ranked-checkpoint?mode_key=" + encodeURIComponent(modeKey),
      { method: "GET", auth: true }
    );
  }

  function deleteRankedCheckpoint(modeLike, submitToken, requestOptions) {
    if (!isInternalSubmitToken(submitToken)) {
      return Promise.resolve({ success: false, error: "client_submit_api_disabled" });
    }
    var modeKey = toText(modeLike).trim();
    if (!modeKey) return Promise.resolve({ success: true, deleted: true });
    var opts = isPlainRecord(requestOptions) ? requestOptions : {};
    return apiRequest(
      "/ranked-checkpoint?mode_key=" + encodeURIComponent(modeKey),
      { method: "DELETE", auth: true, keepalive: opts.keepalive === true }
    );
  }

  function normalizeRankedCheckpointResponseData(result) {
    var data = result && result.data;
    return isPlainRecord(data) ? data : null;
  }

  function createRankedCheckpointTimerRestorePayload(checkpointData) {
    var uiState = isPlainRecord(checkpointData && checkpointData.ui_state)
      ? checkpointData.ui_state
      : {};
    return {
      duration_ms: Math.max(0, Math.floor(Number(checkpointData && checkpointData.duration_ms) || 0)),
      has_game_started: !!uiState.has_game_started,
      timer_status: Number(uiState.timer_status) === 1 ? 1 : 0,
      timer_frozen: !!uiState.timer_frozen,
      timer_module_view: toText(uiState.timer_module_view).trim() || "timer",
      timer_fixed_rows: isPlainRecord(uiState.timer_fixed_rows) ? uiState.timer_fixed_rows : {},
      timer_dynamic_rows_capped: Array.isArray(uiState.timer_dynamic_rows_capped)
        ? uiState.timer_dynamic_rows_capped
        : [],
      timer_dynamic_rows_overflow: Array.isArray(uiState.timer_dynamic_rows_overflow)
        ? uiState.timer_dynamic_rows_overflow
        : [],
      timer_secondary_rows: Array.isArray(uiState.timer_secondary_rows)
        ? uiState.timer_secondary_rows
        : [],
      timer_secondary_expanded_parents: Array.isArray(uiState.timer_secondary_expanded_parents)
        ? uiState.timer_secondary_expanded_parents
        : [],
      timer_sub_8192: toText(uiState.timer_sub_8192),
      timer_sub_16384: toText(uiState.timer_sub_16384),
      timer_sub_visible: !!uiState.timer_sub_visible
    };
  }

  function failRankedCheckpointRestore(manager, reason) {
    if (manager) {
      manager.lastRankedCheckpointRestoreError = toText(reason).trim() || "restore_failed";
    }
    return false;
  }

  function restoreManagerFromRankedCheckpointSavedState(manager, checkpointData) {
    if (!(manager && isPlainRecord(checkpointData))) return false;
    var uiState = isPlainRecord(checkpointData.ui_state) ? checkpointData.ui_state : {};
    var savedState = isPlainRecord(uiState.saved_state) ? uiState.saved_state : null;
    if (!savedState) return false;
    if (toText(savedState.mode_key).trim() !== toText(manager.modeKey).trim()) {
      return failRankedCheckpointRestore(manager, "saved_state_mode_mismatch");
    }
    if (typeof applySavedStateRestore !== "function") {
      return failRankedCheckpointRestore(manager, "saved_state_restore_unavailable");
    }
    if (!applySavedStateRestore(manager, savedState)) {
      return failRankedCheckpointRestore(manager, "saved_state_apply_failed");
    }
    manager.lastRankedCheckpointRestoreError = "";
    return true;
  }

  function applyRankedCheckpointTimerState(manager, checkpointData) {
    if (!manager) return;
    var savedLike = createRankedCheckpointTimerRestorePayload(checkpointData);
    manager.hasGameStarted =
      !!savedLike.has_game_started ||
      (Array.isArray(manager.moveHistory) && manager.moveHistory.length > 0);
    var savedDurationMs = Math.max(0, Math.floor(Number(savedLike.duration_ms) || 0));
    var savedAtMs = Math.max(0, Math.floor(Number(checkpointData && checkpointData.saved_at) || 0));
    var activeElapsedMs = savedDurationMs;
    if (savedLike.timer_status === 1 && savedAtMs > 0) {
      activeElapsedMs += Math.max(0, Date.now() - savedAtMs);
    }
    manager.accumulatedTime = activeElapsedMs;
    manager.time = manager.accumulatedTime;
    manager.startTime = null;
    manager.timerStatus = 0;
    manager.timerFrozen = !!savedLike.timer_frozen;
    manager.timerElapsedOffsetMs = savedDurationMs;
    manager.timerAnchorLocalMs = savedLike.timer_status === 1 && savedAtMs > 0 ? savedAtMs : null;
    manager.timerAnchorServerMs = null;
    if (
      typeof applySavedTimerDomState === "function" &&
      typeof applySavedTimerPostRestoreState === "function" &&
      typeof manager.resolveCappedModeState === "function"
    ) {
      var cappedStateForRestore = manager.resolveCappedModeState();
      applySavedTimerDomState(manager, savedLike, cappedStateForRestore);
      applySavedTimerPostRestoreState(manager, savedLike, cappedStateForRestore);
    } else {
      var timerEl = byId("timer");
      if (timerEl && typeof manager.pretty === "function") {
        timerEl.textContent = manager.pretty(manager.accumulatedTime);
      }
      if (!(manager.over || manager.won || manager.timerFrozen) && savedLike.timer_status === 1) {
        manager.startTimer();
      }
    }
    return true;
  }

  function restoreManagerFromRankedCheckpointReplay(manager, checkpointData) {
    if (!manager) return false;
    if (typeof parseReplayImportEnvelope !== "function") {
      return failRankedCheckpointRestore(manager, "parse_unavailable");
    }
    var replayString = toText(checkpointData && checkpointData.replay_string).trim();
    if (!replayString) return failRankedCheckpointRestore(manager, "replay_missing");
    var normalizedReplay =
      typeof normalizeReplayImportSource === "function"
        ? normalizeReplayImportSource(replayString)
        : replayString;
    var envelope = null;
    try {
      envelope = parseReplayImportEnvelope(manager, normalizedReplay);
    } catch (_errParse) {
      return failRankedCheckpointRestore(manager, "parse_failed");
    }
    if (!(envelope && envelope.kind === "v1rpl" && isPlainRecord(envelope.sessionReplayV1))) {
      return failRankedCheckpointRestore(manager, "envelope_unsupported");
    }
    var replayModeConfig =
      typeof resolveStructuredReplayModeConfig === "function"
        ? resolveStructuredReplayModeConfig(manager, envelope)
        : (typeof manager.resolveModeConfig === "function" ? manager.resolveModeConfig(envelope.modeKey) : null);
    if (!replayModeConfig) return failRankedCheckpointRestore(manager, "mode_config_missing");
    if (toText(replayModeConfig.key || envelope.modeKey).trim() !== toText(manager.modeKey).trim()) {
      return failRankedCheckpointRestore(manager, "mode_key_mismatch");
    }

    var replayMoves = Array.isArray(envelope.replayMoves) ? envelope.replayMoves : [];
    var replaySpawns = Array.isArray(envelope.replaySpawns) ? envelope.replaySpawns : [];
    var restoredSessionReplayV1 = envelope.sessionReplayV1;
    var recordedElapsedMs = Math.max(0, Math.floor(Number(restoredSessionReplayV1.recorded_elapsed_ms) || 0));
    var checkpointDurationMs = Math.max(0, Math.floor(Number(checkpointData.duration_ms) || 0));
    if (checkpointDurationMs < recordedElapsedMs) {
      return failRankedCheckpointRestore(manager, "duration_before_replay");
    }
    var rollbackState = null;
    if (typeof buildSavedGameStatePayload === "function" && typeof applySavedStateRestore === "function") {
      try {
        rollbackState = buildSavedGameStatePayload(manager, Date.now(), {
          force: true,
          forceFull: true
        });
      } catch (_errSnapshot) {
        rollbackState = null;
      }
    }
    if (!isPlainRecord(rollbackState)) {
      manager.needsRankedCheckpointRestore = true;
      manager.rankCheckpointRestorePending = true;
      return failRankedCheckpointRestore(manager, "rollback_snapshot_unavailable");
    }
    var originalActuate = manager.actuate;
    var originalStartTimer = manager.startTimer;
    var rankedIdentity = {
      rankedSessionToken: manager.rankedSessionToken,
      challengeId: manager.challengeId,
      initialSeed: manager.initialSeed,
      seed: manager.seed
    };
    var replayApplied = false;
    var restoreError = "";
    var rollbackSucceeded = true;
    var rollbackTimerWasActive = rollbackState.timer_status === 1;
    manager.rankCheckpointApplying = true;
    manager.actuate = function () {};
    manager.startTimer = function () {};
    try {
      restartWithBoard(manager, envelope.initialBoard, replayModeConfig);
      manager.rankCheckpointApplying = true;
      manager.disableSessionSync = true;
      for (var actionIndex = 0; actionIndex < replayMoves.length; actionIndex++) {
        var action = replayMoves[actionIndex];
        if (action !== -1 && !Number.isInteger(action)) {
          restoreError = "action_invalid";
          break;
        }
        var expectedSpawn = action === -1 ? null : (replaySpawns[actionIndex] || null);
        manager.forcedSpawn = expectedSpawn;
        manager.rankCheckpointReplayExecuting = true;
        try {
          if (manager.move(action) !== true) {
            restoreError = "action_apply_failed";
            break;
          }
          if (expectedSpawn && manager.forcedSpawn !== null) {
            restoreError = "spawn_apply_failed";
            break;
          }
        } finally {
          manager.rankCheckpointReplayExecuting = false;
        }
      }
      if (!restoreError) {
        manager.sessionReplayV1 = restoredSessionReplayV1;
        manager.spawnSequenceVersion = normalizeSpawnSequenceVersion(
          restoredSessionReplayV1.spawn_sequence_version || checkpointData.spawn_sequence_version
        );
        manager.rankedSessionToken = toText(checkpointData.ranked_session_token).trim() || rankedIdentity.rankedSessionToken;
        manager.challengeId = toText(checkpointData.challenge_id).trim() || rankedIdentity.challengeId;
        var checkpointSeed = normalizeRankedSessionSeed(checkpointData.initial_seed);
        if (checkpointSeed === null) checkpointSeed = normalizeRankedSessionSeed(checkpointData.seed);
        manager.initialSeed = checkpointSeed === null ? rankedIdentity.initialSeed : checkpointSeed;
        manager.seed = checkpointSeed === null ? rankedIdentity.seed : checkpointSeed;
        if (typeof manager.serialize !== "function" || toText(manager.serialize()).trim() !== normalizedReplay) {
          restoreError = "replay_prefix_mismatch";
        } else {
          replayApplied = true;
        }
      }
    } catch (_err) {
      restoreError = "replay_apply_failed";
    } finally {
      manager.forcedSpawn = null;
      manager.rankCheckpointReplayExecuting = false;
      if (!replayApplied) {
        try {
          rollbackSucceeded = applySavedStateRestore(manager, rollbackState) === true;
        } catch (_errRollback) {
          rollbackSucceeded = false;
        }
      }
      manager.disableSessionSync = !replayApplied && !rollbackSucceeded;
      manager.rankCheckpointApplying = !replayApplied && !rollbackSucceeded;
      manager.actuate = originalActuate;
      manager.startTimer = originalStartTimer;
    }
    if (!replayApplied) {
      if (rollbackSucceeded && rollbackTimerWasActive && manager.timerStatus === 0) {
        try {
          originalStartTimer.call(manager);
        } catch (_errRestartTimer) {
          rollbackSucceeded = false;
          manager.disableSessionSync = true;
          manager.rankCheckpointApplying = true;
        }
      }
      return failRankedCheckpointRestore(
        manager,
        rollbackSucceeded ? (restoreError || "replay_apply_failed") : "rollback_failed"
      );
    }
    manager.lastRankedCheckpointRestoreError = "";
    return true;
  }

  function restoreRankedCheckpointForManager(manager, checkpointData) {
    if (!manager || !isPlainRecord(checkpointData)) return false;
    if (toText(checkpointData.mode_key).trim() !== toText(manager.modeKey).trim()) return false;
    if (shouldRejectRankedCheckpointForRestore(checkpointData, checkpointData.mode_key)) return false;
    var restored =
      restoreManagerFromRankedCheckpointSavedState(manager, checkpointData) ||
      restoreManagerFromRankedCheckpointReplay(manager, checkpointData);
    if (!restored) return false;
    if (typeof assignManagerClientRecordId === "function") {
      assignManagerClientRecordId(manager, toText(checkpointData.client_record_id).trim());
    } else {
      manager.clientRecordId = toText(checkpointData.client_record_id).trim();
    }
    manager.sessionSubmitDone = false;
    manager.actuate();
    manager.updateUndoUiState();
    manager.notifyUndoSettingsStateChanged();
    manager.updateStatsPanel();
    if (!(isPlainRecord(checkpointData.ui_state) && isPlainRecord(checkpointData.ui_state.saved_state))) {
      if (!applyRankedCheckpointTimerState(manager, checkpointData)) return false;
    }
    var checkpointPayload = buildRankedCheckpointPayload(manager);
    manager.lastRankedCheckpointSignature = checkpointPayload
      ? buildRankedCheckpointSignature(manager, checkpointPayload)
      : "";
    manager.lastRankedCheckpointSavedAt = Date.now();
    manager.rankCheckpointSaveConflict = "";
    manager.lastRankedCheckpointSaveError = "";
    return true;
  }

  function isRankedCheckpointConflictCode(codeLike) {
    var code = toText(codeLike).trim().toUpperCase();
    return (
      code === "CHECKPOINT_SESSION_CONFLICT" ||
      code === "CHECKPOINT_STALE_REPLAY" ||
      code === "CHECKPOINT_REPLAY_CONFLICT"
    );
  }

  function writePendingStone2kSubmitState(signature, previousState, payload) {
    var text = toText(signature).trim();
    if (!text) {
      clearPendingStone2kSubmitState();
      return;
    }
    var normalizedPayload = normalizePendingStone2kSubmitPayload(
      payload || (previousState ? previousState.payload : null)
    );
    if (!normalizedPayload) return;
    var now = Date.now();
    var previous = previousState && toText(previousState.signature).trim() === text ? previousState : null;
    safeSetStorage(
      STORAGE_PENDING_STONE_2K_SUBMIT_KEY,
      JSON.stringify({
        signature: text,
        payload: normalizedPayload,
        ownerUserId: toText(getUserId()).trim() || "",
        createdAt: previous && Number(previous.createdAt) > 0 ? Math.floor(Number(previous.createdAt)) : now,
        lastAttemptAt: now,
        retryCount: previous ? Math.max(0, Math.floor(Number(previous.retryCount) || 0)) + 1 : 0
      })
    );
  }

  function isRankedSessionExpiredCode(codeLike) {
    var code = toText(codeLike).trim().toUpperCase();
    return code === "RANKED_SESSION_EXPIRED" || code.indexOf("RANKED_SESSION_EXPIRED") >= 0;
  }

  function isRankedSessionExpiredResult(result) {
    if (!isPlainRecord(result)) return false;
    if (
      isRankedSessionExpiredCode(result.code) ||
      isRankedSessionExpiredCode(result.error) ||
      isRankedSessionExpiredCode(result.reason) ||
      isRankedSessionExpiredCode(result.message)
    ) {
      return true;
    }
    var data = isPlainRecord(result.data) ? result.data : null;
    return !!(
      data &&
      (
        isRankedSessionExpiredCode(data.code) ||
        isRankedSessionExpiredCode(data.error) ||
        isRankedSessionExpiredCode(data.reason) ||
        isRankedSessionExpiredCode(data.message)
      )
    );
  }

  function notifyRankedSessionExpired(modeKey) {
    var normalizedModeKey = toText(modeKey).trim() || "unknown";
    var now = Date.now();
    if (
      rankedSessionExpiredNoticeModeKey === normalizedModeKey &&
      now - rankedSessionExpiredNoticeAt < 30000
    ) {
      return;
    }
    rankedSessionExpiredNoticeModeKey = normalizedModeKey;
    rankedSessionExpiredNoticeAt = now;
    if (global && typeof global.alert === "function") {
      global.alert(
        getLanguage() === "en"
          ? "This leaderboard game session has expired. Please start a new game."
          : "本次排行榜对局会话已过期，请重新开局。"
      );
    }
  }

  function handleRankedSessionExpired(manager, modeLike) {
    var modeKey = toText(modeLike || (manager && (manager.modeKey || manager.mode))).trim() || getCurrentModeKey();
    clearRankedCheckpointSaveTimer();
    if (modeKey) {
      clearRankedCheckpointLocalMirror(modeKey);
    }
    var runtime = getRankedSessionRuntime();
    if (runtime && modeKey) {
      if (typeof runtime.clearModeSession === "function") {
        runtime.clearModeSession(modeKey);
      } else if (typeof runtime.clearActiveSession === "function") {
        runtime.clearActiveSession(modeKey);
      }
    } else if (
      modeKey &&
      global &&
      global.GAME_CHALLENGE_CONTEXT &&
      toText(global.GAME_CHALLENGE_CONTEXT.mode_key).trim() === modeKey
    ) {
      global.GAME_CHALLENGE_CONTEXT = null;
    }
    if (manager) {
      manager.rankedSessionToken = "";
      manager.needsRankedCheckpointRestore = false;
      manager.rankCheckpointRestorePending = false;
      manager.rankCheckpointRestoreScheduled = false;
      manager.rankCheckpointApplying = false;
      manager.rankCheckpointSaveConflict = "RANKED_SESSION_EXPIRED";
      manager.lastRankedCheckpointSignature = "";
      manager.lastRankedCheckpointSavedAt = 0;
      manager.lastRankedCheckpointSaveError = "RANKED_SESSION_EXPIRED";
      manager.lastRankedCheckpointRestoreError = "RANKED_SESSION_EXPIRED";
    }
    notifyRankedSessionExpired(modeKey);
  }

  async function maybeSaveRankedCheckpoint(manager, options) {
    return false;
  }

  function scheduleRankedCheckpointSave(manager, options) {
    clearRankedCheckpointSaveTimer();
  }

  async function clearRankedCheckpointForManager(manager, options) {
    if (!shouldUseRankedCheckpoint(manager)) return false;
    clearRankedCheckpointSaveTimer();
    manager.rankCheckpointSaveConflict = "";
    manager.lastRankedCheckpointSignature = "";
    manager.lastRankedCheckpointSavedAt = 0;
    manager.lastRankedCheckpointSaveError = "";
    var opts = isPlainRecord(options) ? options : {};
    var modeKey = toText(manager.modeKey || manager.mode).trim();
    markRankedCheckpointCleared(modeKey, Date.now(), {
      rankedSessionToken: resolveRankedSessionTokenForManager(manager),
      clientRecordId: toText(manager.clientRecordId).trim()
    });
    clearRankedCheckpointLocalMirror(modeKey);
    if (!getAuthToken()) return true;
    if (!modeKey) return false;
    var result = await deleteRankedCheckpoint(modeKey, INTERNAL_SUBMIT_TOKEN, {
      keepalive: opts.keepalive === true
    });
    return !!(result && result.success);
  }

  async function maybeRestoreRankedCheckpoint(manager, options) {
    if (!manager) return false;
    if (!manager.needsRankedCheckpointRestore) {
      manager.rankCheckpointRestorePending = false;
      return false;
    }
    if (!shouldUseRankedCheckpoint(manager)) {
      manager.needsRankedCheckpointRestore = false;
      manager.rankCheckpointRestorePending = false;
      return false;
    }
    manager.rankCheckpointRestorePending = true;
    var expectedModeKey = toText(manager.modeKey || manager.mode).trim();
    var localMirror = readRankedCheckpointLocalMirror(expectedModeKey);
    if (toText(manager.modeKey || manager.mode).trim() !== expectedModeKey) {
      manager.rankCheckpointRestorePending = false;
      return false;
    }
    var candidates = buildRankedCheckpointRestoreCandidates(localMirror, null);
    if (!candidates.length) {
      manager.needsRankedCheckpointRestore = false;
      manager.rankCheckpointRestorePending = false;
      return false;
    }
    var restored = false;
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = candidates[i];
      restored = candidate.source === "local"
        ? restoreRankedCheckpointLocalMirror(manager, candidate.data)
        : restoreRankedCheckpointForManager(manager, candidate.data);
      if (restored) break;
    }
    if (restored) {
      manager.needsRankedCheckpointRestore = false;
      manager.rankCheckpointRestorePending = false;
      manager.rankCheckpointSaveConflict = "";
      manager.lastRankedCheckpointSaveError = "";
      persistRankedCheckpointLocalMirror(manager);
    } else {
      manager.needsRankedCheckpointRestore = true;
      manager.rankCheckpointRestorePending = true;
    }
    return restored;
  }

  function scheduleRankedCheckpointRestore(manager, options) {
    if (!manager || !manager.needsRankedCheckpointRestore) return;
    if (manager.rankCheckpointRestoreScheduled === true) return;
    manager.rankCheckpointRestoreScheduled = true;
    var opts = isPlainRecord(options) ? options : {};
    var delayMs = Number(opts.delayMs);
    if (!Number.isFinite(delayMs) || delayMs < 0) delayMs = 0;
    global.setTimeout(function () {
      maybeRestoreRankedCheckpoint(manager, opts).catch(function () {
        manager.needsRankedCheckpointRestore = true;
        manager.rankCheckpointRestorePending = true;
      }).finally(function () {
        manager.rankCheckpointRestoreScheduled = false;
      });
    }, delayMs);
  }

  function persistRankedCheckpointOnPageHide(manager) {
    clearRankedCheckpointSaveTimer();
    if (manager && manager.rankCheckpointRestorePending === true) return false;
    return persistRankedCheckpointLocalMirror(manager);
  }

  function resolveManagerBestTileValue(manager) {
    if (!manager || !manager.grid || typeof manager.grid.eachCell !== "function") return 0;
    var best = 0;
    manager.grid.eachCell(function (_x, _y, tile) {
      var value = Math.floor(Number(tile && tile.value) || 0);
      if (value > best) best = value;
    });
    return best;
  }

  function resolveManagerDurationMs(manager) {
    if (!manager) return 0;
    if (typeof manager.getDurationMs === "function") {
      return Math.floor(Number(manager.getDurationMs()) || 0);
    }
    var startTs = Number(manager.startTimestamp || manager.startTime || 0);
    if (!Number.isFinite(startTs) || startTs <= 0) return 0;
    return Math.max(0, Date.now() - startTs);
  }

  function resolveManagerFinalBoard(manager) {
    if (!manager) return [];
    if (typeof manager.getFinalBoardMatrix === "function") {
      return manager.getFinalBoardMatrix();
    }
    if (manager.grid && typeof manager.grid.serialize === "function") {
      try {
        var serialized = manager.grid.serialize();
        var cells = serialized && serialized.cells;
        if (!Array.isArray(cells)) return [];
        var board = [];
        for (var y = 0; y < cells.length; y += 1) {
          var row = Array.isArray(cells[y]) ? cells[y] : [];
          var outRow = [];
          for (var x = 0; x < row.length; x += 1) {
            var tile = row[x];
            outRow.push(Math.floor(Number(tile && tile.value) || 0));
          }
          board.push(outRow);
        }
        return board;
      } catch (_err) {
        return [];
      }
    }
    return [];
  }

  function resolveRecordReplayPayload(manager) {
    var replayString = "";
    if (typeof manager.serialize === "function") {
      try {
        replayString = toText(manager.serialize()).trim();
      } catch (_err) {
        replayString = "";
      }
    }

    if (!replayString) {
      replayString = toText(manager && manager.rescueReplayString).trim();
    }

    var replayV3 = null;
    if (typeof manager.serializeV3 === "function") {
      try {
        replayV3 = manager.serializeV3();
      } catch (_err2) {
        replayV3 = null;
      }
    }

    if (!replayString && replayV3 != null) {
      try {
        replayString = toText(JSON.stringify(replayV3)).trim();
      } catch (_err3) {
        replayString = "";
      }
    }
    if (!replayV3 && replayString) {
      replayV3 = {
        v: 1,
        replay_logic_version: "v1",
        replay_string: replayString
      };
    }

    return {
      replayV3: replayV3,
      replayString: replayString
    };
  }

  function normalizePositiveStepCount(valueLike) {
    var value = Math.floor(Number(valueLike) || 0);
    return value > 0 ? value : null;
  }

  function resolveRecordTotalMoveSteps(manager) {
    if (!manager) return null;
    var directCount = normalizePositiveStepCount(manager.successfulMoveCount);
    if (directCount !== null) return directCount;
    if (Array.isArray(manager.moveHistory)) {
      return normalizePositiveStepCount(manager.moveHistory.length);
    }
    return null;
  }

  function buildRecordMinStepStats(manager, bestTileValue) {
    var out = {};
    var bestTile = Math.floor(Number(bestTileValue) || 0);
    var totalMoveSteps = resolveRecordTotalMoveSteps(manager);
    for (var i = 0; i < MIN_STEP_TARGET_TILES.length; i += 1) {
      var target = MIN_STEP_TARGET_TILES[i];
      var key = "min_steps_" + String(target);
      if (totalMoveSteps !== null && bestTile >= target) {
        out[key] = totalMoveSteps;
      } else {
        out[key] = null;
      }
    }
    return out;
  }

  function buildRecordSubmitPayload(manager, modeLike, score) {
    if (!manager) return null;
    var modeKey = toText(modeLike || manager.modeKey || manager.mode).trim();
    var modeBucket = resolveLeaderboardMode(modeKey);
    if (!modeKey) return null;

    var replayPayload = resolveRecordReplayPayload(manager);
    if (!replayPayload.replayString) return null;

    var bestTile = resolveManagerBestTileValue(manager);
    var minStepStats = buildRecordMinStepStats(manager, bestTile);
    var clientRecordId = resolveManagerClientRecordIdForSubmit(manager);
    var rankedContext = resolveRankedSubmitContextForManager(manager);
    var rankedVerification = buildRankedVerificationPayload(manager);

    return {
      record_schema_version: RECORD_SCHEMA_VERSION,
      mode: modeBucket || toText(manager.mode).trim() || modeKey,
      mode_key: modeKey,
      mode_bucket: modeBucket || undefined,
      ranked_session_token: rankedContext ? rankedContext.token : null,
      challenge_id: rankedContext ? rankedContext.challengeId : null,
      initial_seed: rankedContext ? rankedContext.seed : null,
      seed: rankedContext ? rankedContext.seed : null,
      ranked_verification: rankedVerification,
      score: Math.floor(Number(score) || 0),
      best_tile: bestTile,
      duration_ms: resolveManagerDurationMs(manager),
      ended_at: new Date().toISOString(),
      end_reason: resolveRecordSubmitEndReason(manager) || "game_over",
      final_board: resolveManagerFinalBoard(manager),
      min_steps_2048: minStepStats.min_steps_2048,
      min_steps_4096: minStepStats.min_steps_4096,
      min_steps_8192: minStepStats.min_steps_8192,
      client_record_id: clientRecordId || null,
      replay: replayPayload.replayV3,
      replay_string: replayPayload.replayString
    };
  }

  function buildScoreSubmitPayload(manager, modeLike, score) {
    var modeKey = toText(modeLike || (manager && (manager.modeKey || manager.mode))).trim();
    var modeBucket = resolveLeaderboardMode(modeKey);
    var bestTile = resolveManagerBestTileValue(manager);
    var minStepStats = buildRecordMinStepStats(manager, bestTile);
    var payload = {
      score: Math.floor(Number(score) || 0),
      min_steps_2048: minStepStats.min_steps_2048,
      min_steps_4096: minStepStats.min_steps_4096,
      min_steps_8192: minStepStats.min_steps_8192
    };
    if (modeKey) payload.mode_key = modeKey;
    if (modeBucket) payload.mode = modeBucket;
    return payload;
  }

  function normalizePendingStone2kSubmitPayload(rawValue) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return null;
    var payload = clonePendingSubmitPayload(rawValue);
    if (!payload) return null;
    var modeKey = toText(payload.mode_key).trim();
    var score = Math.floor(Number(payload.score) || 0);
    if (modeKey !== "capped_4x4_pow2_no_undo" || !(score >= 0)) return null;
    if (!Array.isArray(payload.final_board)) return null;
    return payload;
  }

  function isStone2kStatsMode(manager, modeLike) {
    var key = toText(modeLike || (manager && (manager.modeKey || manager.mode))).trim();
    return key === "capped_4x4_pow2_no_undo";
  }

  function hasStone2kRunProgress(manager) {
    if (!manager) return false;
    return !!(manager.hasGameStarted || (Array.isArray(manager.moveHistory) && manager.moveHistory.length > 0));
  }

  function buildStone2kRunPayload(manager, modeLike, score) {
    if (!manager || !isStone2kStatsMode(manager, modeLike)) return null;
    if (!hasStone2kRunProgress(manager)) return null;
    var bestTile = resolveManagerBestTileValue(manager);
    return {
      mode_key: "capped_4x4_pow2_no_undo",
      score: Math.floor(Number(score) || 0),
      best_tile: bestTile,
      duration_ms: resolveManagerDurationMs(manager),
      ended_at: new Date().toISOString(),
      end_reason: resolveSessionEndReason(manager) || "progress",
      final_board: resolveManagerFinalBoard(manager),
      client_record_id: resolveManagerClientRecordIdForSubmit(manager) || null
    };
  }

  function buildStone2kRunSignature(payload) {
    if (!payload) return "";
    var boardText = "";
    try {
      boardText = JSON.stringify(payload.final_board || []);
    } catch (_err) {
      boardText = "";
    }
    return [
      toText(payload.mode_key).trim(),
      toText(payload.client_record_id).trim(),
      Math.floor(Number(payload.score) || 0),
      Math.floor(Number(payload.best_tile) || 0),
      boardText
    ].join("|");
  }

  function getLeaderboard(limit, modeLike, periodLike) {
    var safeLimit = Number(limit);
    if (!Number.isFinite(safeLimit) || safeLimit <= 0) safeLimit = DEFAULT_BOARD_LIMIT;
    safeLimit = Math.floor(safeLimit);

    var modeKey = toText(modeLike).trim();
    var modeBucket = resolveLeaderboardMode(modeKey || modeLike);
    var period = normalizeTimerLeaderboardPeriod(periodLike);
    var path = "/leaderboard?limit=" + encodeURIComponent(String(safeLimit));
    path += "&period=" + encodeURIComponent(period);
    if (modeKey) {
      path += "&mode_key=" + encodeURIComponent(modeKey);
    }
    if (modeBucket) {
      path += "&mode=" + encodeURIComponent(modeBucket);
    }

    return apiRequest(path, { method: "GET" });
  }

  function getUserInfo(userId) {
    var safeUserId = Math.floor(Number(userId) || 0);
    if (safeUserId <= 0) return Promise.resolve({ error: "无效的用户ID" });
    return apiRequest("/user/" + encodeURIComponent(String(safeUserId)), { method: "GET" });
  }

  function normalizeAccountBestScore(valueLike) {
    var value = Math.floor(Number(valueLike) || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function getAccountBestScoreSyncKey(userIdLike, modeLike) {
    var userId = toText(userIdLike).trim();
    var modeKey = toText(modeLike).trim();
    return userId && modeKey ? userId + "|" + modeKey : "";
  }

  function getAccountBestScoreStorageKey(modeLike) {
    var modeKey = toText(modeLike).trim();
    return modeKey ? BEST_SCORE_STORAGE_KEY_PREFIX + modeKey : "";
  }

  function getAccountBestScoreRecords(userId, modeKey, modeBucket) {
    var safeUserId = Math.floor(Number(userId));
    if (!Number.isFinite(safeUserId) || safeUserId < 0 || !modeKey || !modeBucket) {
      return Promise.resolve({ success: true, data: [] });
    }
    var safeLimit = ACCOUNT_BEST_SCORE_SYNC_FETCH_LIMIT;
    var path = "/user/" + encodeURIComponent(String(safeUserId)) + "/records";
    path += "?page_size=" + encodeURIComponent(String(safeLimit));
    path += "&limit=" + encodeURIComponent(String(safeLimit));
    path += "&page=1";
    path += "&sort_by=score";
    path += "&order=desc";
    path += "&status=active";
    path += "&mode=" + encodeURIComponent(modeBucket);
    path += "&mode_key=" + encodeURIComponent(modeKey);
    return apiRequest(path, { method: "GET", auth: true });
  }

  function resolveAccountBestScoreFromRecords(result, modeKey) {
    if (!result || !result.success || !Array.isArray(result.data)) return null;
    var normalizedModeKey = toText(modeKey).trim().toLowerCase();
    if (!normalizedModeKey) return null;
    var bestScore = 0;
    for (var i = 0; i < result.data.length; i += 1) {
      var item = result.data[i] || {};
      var itemModeKey = toText(item.mode_key || item.modeKey).trim().toLowerCase();
      if (itemModeKey !== normalizedModeKey) continue;
      var score = normalizeAccountBestScore(item.score);
      if (score > bestScore) bestScore = score;
    }
    return bestScore;
  }

  function getVisibleBestScoreContainer(manager) {
    var actuator = manager && manager.actuator ? manager.actuator : null;
    if (actuator && actuator.bestContainer) return actuator.bestContainer;
    if (!global.document || typeof global.document.querySelector !== "function") return null;
    return global.document.querySelector(".best-container");
  }

  function updateVisibleBestScore(manager, bestScore) {
    var scoreText = String(normalizeAccountBestScore(bestScore));
    var actuator = manager && manager.actuator ? manager.actuator : null;
    if (actuator && typeof actuator.updateBestScore === "function" && actuator.bestContainer) {
      actuator.updateBestScore(scoreText);
      return;
    }
    var bestContainer = getVisibleBestScoreContainer(manager);
    if (bestContainer) bestContainer.textContent = scoreText;
  }

  function applyAccountBestScoreToCurrentManager(modeKey, serverBestScore) {
    if (serverBestScore == null) return false;
    var score = normalizeAccountBestScore(serverBestScore);
    var manager = global.game_manager;
    if (!manager || manager.replayMode) return false;
    var currentModeKey = toText(manager.modeKey || manager.mode).trim() || getCurrentModeKey();
    if (currentModeKey && currentModeKey !== modeKey) return false;
    if (!manager.scoreManager || typeof manager.scoreManager.get !== "function" || typeof manager.scoreManager.set !== "function") {
      return false;
    }
    var localBestScore = normalizeAccountBestScore(manager.scoreManager.get());
    if (score === localBestScore) return false;
    manager.scoreManager.set(score);
    var storageKey = getAccountBestScoreStorageKey(modeKey);
    if (storageKey) safeSetStorage(storageKey, String(score));
    updateVisibleBestScore(manager, score);
    return true;
  }

  async function syncAccountBestScoreForCurrentMode(options) {
    var opts = options && typeof options === "object" ? options : {};
    var token = getAuthToken();
    var userId = getUserId();
    var modeKey = getCurrentModeKey();
    var modeBucket = resolveLeaderboardMode(modeKey);
    if (!token || !userId || !modeKey || !modeBucket) return false;

    var syncKey = getAccountBestScoreSyncKey(userId, modeKey);
    if (!syncKey) return false;
    if (accountBestScoreSyncPending[syncKey]) return accountBestScoreSyncPending[syncKey];

    var now = Date.now();
    var lastSyncAt = Number(accountBestScoreSyncLastAt[syncKey] || 0);
    if (opts.force !== true && lastSyncAt > 0 && now - lastSyncAt < ACCOUNT_BEST_SCORE_SYNC_TTL_MS) {
      return false;
    }
    accountBestScoreSyncLastAt[syncKey] = now;

    var promise = (async function () {
      var result = await getAccountBestScoreRecords(userId, modeKey, modeBucket);
      var serverBestScore = resolveAccountBestScoreFromRecords(result, modeKey);
      return applyAccountBestScoreToCurrentManager(modeKey, serverBestScore);
    })();

    accountBestScoreSyncPending[syncKey] = promise;
    try {
      return await promise;
    } catch (_err) {
      return false;
    } finally {
      delete accountBestScoreSyncPending[syncKey];
    }
  }

  function applyToolkitRowText() {
    var row = byId("toolkit-entry-row");
    if (row && row.parentNode) row.parentNode.removeChild(row);
  }

  function ensureToolkitEntryRow() {
    applyToolkitRowText(getLanguage());
  }

  function bindLanguageSync() {
    if (langSyncBound) return;
    langSyncBound = true;

    global.addEventListener("uilanguagechange", function (eventLike) {
      var lang = toText(eventLike && eventLike.detail && eventLike.detail.lang).toLowerCase() === "en" ? "en" : "zh";
      applyToolkitRowText(lang);
      if (typeof global.syncTimerModuleSettingsUI === "function") {
        global.syncTimerModuleSettingsUI();
      }
      updateTimerLeaderboardHeader();
      var rows = resolveCurrentTimerLeaderboardCacheRows();
      renderTimerLeaderboardRows(
        rows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT),
        resolveSelfRank(rows)
      );
    });

    global.addEventListener("storage", function (eventLike) {
      if (!eventLike || eventLike.key !== UI_LANG_STORAGE_KEY) return;
      applyToolkitRowText(getLanguage());
      if (typeof global.syncTimerModuleSettingsUI === "function") {
        global.syncTimerModuleSettingsUI();
      }
      updateTimerLeaderboardHeader();
      var rows = resolveCurrentTimerLeaderboardCacheRows();
      renderTimerLeaderboardRows(
        rows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT),
        resolveSelfRank(rows)
      );
    });
  }

  function bindAuthBestScoreSync() {
    if (authBestScoreSyncBound) return;
    authBestScoreSyncBound = true;

    global.addEventListener("storage", function (eventLike) {
      if (!eventLike) return;
      if (eventLike.key !== STORAGE_TOKEN_KEY && eventLike.key !== STORAGE_USER_ID_KEY) return;
      runPromiseSafely(function () {
        return syncAccountBestScoreForCurrentMode({ force: true });
      });
    });
  }

  function requestAccountBestScoreStartupSync() {
    runPromiseSafely(function () {
      return syncAccountBestScoreForCurrentMode({ force: true });
    });
    if (typeof global.setTimeout === "function") {
      global.setTimeout(function () {
        runPromiseSafely(function () {
          return syncAccountBestScoreForCurrentMode({ force: true });
        });
      }, 0);
    }
  }

  function renderModeIntroLeaderboard(list) {
    var host = byId("mode-intro-leaderboard");
    if (!host) return;
    host.innerHTML = "";
    if (!Array.isArray(list) || list.length === 0) {
      host.textContent = getLanguage() === "en" ? "No online leaderboard data." : "暂无在线排行榜数据";
      return;
    }

    for (var i = 0; i < list.length; i += 1) {
      var item = list[i] || {};
      var row = createEl("div", "mode-intro-leaderboard-row", "");
      row.appendChild(createEl("span", "mode-intro-leaderboard-rank", "#" + String(i + 1)));
      var profileUrl = buildUserProfileUrl(item.user_id, item.nickname);
      var displayNickname = normalizeLeaderboardNickname(item.nickname) || (getLanguage() === "en" ? "Anonymous" : "匿名");
      if (profileUrl) {
        var nickLink = createEl("a", "mode-intro-leaderboard-nick mode-intro-leaderboard-nick-link", displayNickname);
        nickLink.setAttribute("href", profileUrl);
        nickLink.setAttribute("title", displayNickname);
        row.appendChild(nickLink);
      } else {
        row.appendChild(createEl("span", "mode-intro-leaderboard-nick", displayNickname));
      }
      row.appendChild(createEl("span", "mode-intro-leaderboard-score", String(Number(item.score) || 0)));
      host.appendChild(row);
    }
  }

async function refreshLeaderboard(modeLike) {
  var modeKey = toText(modeLike).trim();
  var modeBucket = resolveLeaderboardMode(modeKey || modeLike) || "";
  var cacheKey = modeKey || modeBucket;
    var result = await getLeaderboard(DEFAULT_BOARD_LIMIT, modeKey || modeLike, "all");
    if (!result || !result.success) {
      renderModeIntroLeaderboard([]);
      return false;
    }
    cachedLeaderboard = Array.isArray(result.data) ? result.data : [];
    cachedLeaderboardMode = cacheKey;
    renderModeIntroLeaderboard(cachedLeaderboard);
    return true;
  }

  async function refreshTimerLeaderboardPanel(forceRefresh, preferCached) {
    var timerBox = byId("timerbox");
    if (!timerBox) return true;
    ensureTimerLeaderboardPanel();
    updateTimerLeaderboardHeader();
    syncTimerLeaderboardViewMode();

    var modeKey = getCurrentModeKey();
    var modeBucket = resolveLeaderboardMode(modeKey) || "";
    var period = normalizeTimerLeaderboardPeriod(timerLeaderboardPeriod);
    var cacheKey = modeKey + "|" + period;
    if (!modeBucket) {
      renderTimerLeaderboardPlaceholderRows();
      setTimerLeaderboardPanelLoading(false);
      return true;
    }

    var now = Date.now();
    var cachedEntry = getAnyTimerLeaderboardCacheEntry(cacheKey);
    if (preferCached && cachedEntry) {
      renderTimerLeaderboardCacheEntry(cachedEntry);
    }
    if (preferCached && !cachedEntry) {
      renderTimerLeaderboardLoadingPlaceholder(cacheKey, true);
    }
    var legacyCacheMatchesCurrentKey = !!(
      timerLeaderboardCacheMode === cacheKey &&
      Array.isArray(timerLeaderboardCacheRows) &&
      timerLeaderboardCacheRows.length > 0
    );
    var hasRowsForCurrentCache = !!(
      (
        cachedEntry &&
        Array.isArray(cachedEntry.rows) &&
        cachedEntry.rows.length > 0
      ) ||
      legacyCacheMatchesCurrentKey ||
      hasVisibleTimerLeaderboardRows()
    );
    var keepCachedRowsDuringRefresh = hasRowsForCurrentCache && !preferCached;
    if (
      !forceRefresh &&
      !timerLeaderboardLoadingByKey[cacheKey] &&
      cachedEntry &&
      cachedEntry.rows.length > 0 &&
      now - cachedEntry.time < 12000
    ) {
      renderTimerLeaderboardCacheEntry(cachedEntry);
      return true;
    }

    if (timerLeaderboardLoadingByKey[cacheKey]) {
      if (!keepCachedRowsDuringRefresh) {
        renderTimerLeaderboardLoadingPlaceholder(cacheKey, false);
      }
      return true;
    }
    timerLeaderboardLoadingByKey[cacheKey] = true;
    timerLeaderboardLoading = true;
    if (keepCachedRowsDuringRefresh) {
      setTimerLeaderboardPanelLoading(false);
    } else {
      renderTimerLeaderboardLoadingPlaceholder(cacheKey, false);
    }
    var result = await getLeaderboard(TIMER_LEADERBOARD_FETCH_LIMIT, modeKey, period);
    delete timerLeaderboardLoadingByKey[cacheKey];
    timerLeaderboardLoading = hasTimerLeaderboardLoadingRequests();

    if (!result || !result.success) {
      if (
        cacheKey === resolveCurrentTimerLeaderboardCacheKey() &&
        !keepCachedRowsDuringRefresh &&
        !hasVisibleTimerLeaderboardRows()
      ) {
        renderTimerLeaderboardPlaceholderRows();
        setTimerLeaderboardPanelLoading(false);
      }
      return false;
    }

    var rows = Array.isArray(result.data) ? result.data : [];
    timerLeaderboardCacheByKey[cacheKey] = {
      key: cacheKey,
      rows: rows,
      time: Date.now()
    };
    writeTimerLeaderboardStoredEntry(timerLeaderboardCacheByKey[cacheKey]);
    if (cacheKey === resolveCurrentTimerLeaderboardCacheKey()) {
      renderTimerLeaderboardCacheEntry(timerLeaderboardCacheByKey[cacheKey]);
    }
    return true;
  }

  function refreshLeaderboardsAfterRecordSubmit(modeLike) {
    var modeKey = toText(modeLike).trim() || getCurrentModeKey();
    refreshLeaderboard(modeKey);
    refreshTimerLeaderboardPanel(true);
  }

  function shouldTreatWinStopAsTerminalFallback(manager) {
    if (!manager || manager.over || !manager.won || manager.keepPlaying) return false;
    var modeConfig = manager.modeConfig && typeof manager.modeConfig === "object" ? manager.modeConfig : null;
    var modeKey = toText((modeConfig && modeConfig.key) || manager.modeKey || manager.mode).trim().toLowerCase();
    var isCappedMode = modeKey.indexOf("capped") !== -1;
    var maxTile = Math.floor(Number(modeConfig && modeConfig.max_tile));
    if (isCappedMode && Number.isInteger(maxTile) && maxTile > 0) return true;
    var specialRules = modeConfig && modeConfig.special_rules && typeof modeConfig.special_rules === "object"
      ? modeConfig.special_rules
      : (manager.specialRules && typeof manager.specialRules === "object" ? manager.specialRules : null);
    return !!(specialRules && specialRules.enforce_max_tile === true);
  }

  function isSessionTerminated(manager) {
    if (!manager) return false;
    if (typeof isTerminalSessionForPersistence === "function") {
      return !!isTerminalSessionForPersistence(manager);
    }
    return !!manager.over || shouldTreatWinStopAsTerminalFallback(manager);
  }

  function isUndoEnabledModeForTerminalSubmit(manager) {
    if (!manager) return false;
    var modeConfig = manager.modeConfig && typeof manager.modeConfig === "object" ? manager.modeConfig : null;
    if (modeConfig && modeConfig.undo_enabled === true) return true;
    if (manager.undoEnabled === true) return true;
    var modeKey = toText(manager.modeKey || manager.mode).trim().toLowerCase();
    if (modeKey && modeKey.indexOf("no_undo") < 0 && modeKey.indexOf("_undo") >= 0) return true;
    var modeBucket = toText(manager.rankedBucket || resolveLeaderboardMode(modeKey)).trim().toLowerCase();
    return !!(modeBucket && modeBucket.indexOf("no_undo") < 0 && modeBucket.indexOf("_undo") >= 0);
  }

  function shouldDeferUndoTerminalSubmit(manager, options) {
    var opts = options && typeof options === "object" ? options : {};
    if (opts.allowUndoTerminalSubmit === true) return false;
    return !!(manager && isSessionTerminated(manager) && isUndoEnabledModeForTerminalSubmit(manager));
  }

  function resolveSessionEndReason(manager) {
    if (!manager) return "";
    if (typeof resolveTerminalSessionEndReason === "function") {
      var sharedReason = toText(resolveTerminalSessionEndReason(manager)).trim();
      if (sharedReason) return sharedReason;
    }
    if (manager.over) return "game_over";
    return shouldTreatWinStopAsTerminalFallback(manager) ? "win_stop" : "";
  }

  function resolveRecordSubmitEndReason(manager) {
    return isSessionTerminated(manager) ? "game_over" : "";
  }

  function resolveManagerClientRecordIdForSubmit(manager) {
    var current = toText(manager && manager.clientRecordId).trim();
    if (current) return current;
    if (typeof resolveManagerClientRecordId === "function") {
      return toText(resolveManagerClientRecordId(manager)).trim();
    }
    return "";
  }

  function buildReplaySubmitFingerprint(replayStringLike) {
    var text = toText(replayStringLike);
    if (!text) return "replay:none";
    var hash = 2166136261;
    for (var index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return "replay:" + (hash >>> 0).toString(16) + ":" + String(text.length);
  }

  function buildSubmitSignature(manager, score) {
    var modeKey = manager && manager.modeKey ? String(manager.modeKey) : getCurrentModeKey() || "unknown";
    var seed = manager && manager.initialSeed != null ? String(manager.initialSeed) : "seedless";
    var replayFingerprint = buildReplaySubmitFingerprint("");
    if (manager && typeof manager.serialize === "function") {
      try {
        replayFingerprint = buildReplaySubmitFingerprint(manager.serialize());
      } catch (_err) {
        replayFingerprint = buildReplaySubmitFingerprint("");
      }
    }
    return [modeKey, seed, replayFingerprint, String(score)].join("|");
  }

  function buildRecordSubmitSignature(manager, payload) {
    var modeKey = toText(payload && payload.mode_key).trim() || (manager && manager.modeKey ? String(manager.modeKey) : "unknown");
    var seed = manager && manager.initialSeed != null ? String(manager.initialSeed) : "seedless";
    var score = Math.floor(Number(payload && payload.score) || 0);
    var moveCount = Array.isArray(manager && manager.moveHistory) ? manager.moveHistory.length : 0;
    var replayString = toText(payload && payload.replay_string);
    var rescueReplayString = toText(manager && manager.rescueReplayString).trim();
    var clientRecordId = rescueReplayString && replayString.trim() === rescueReplayString
      ? toText(payload && payload.client_record_id).trim()
      : "";
    var replayFingerprint = buildReplaySubmitFingerprint(replayString);
    return [modeKey, seed, clientRecordId, replayFingerprint, String(score), String(moveCount)].join("|");
  }

  function shouldSkipLegacyScoreSubmit(manager) {
    if (shouldUseRankedCheckpoint(manager)) return true;
    var replayPayload = resolveRecordReplayPayload(manager);
    return !!(replayPayload && replayPayload.replayString);
  }

  function clearPendingScoreSubmitStateForSignature(signature) {
    var text = toText(signature).trim();
    if (!text) return;
    var pendingState = readPendingScoreSubmitState();
    if (pendingState && toText(pendingState.signature).trim() === text) {
      clearPendingScoreSubmitState();
    }
  }

  async function maybeSubmitScoreOnGameOver() {
    var opts = arguments.length > 0 && arguments[0] && typeof arguments[0] === "object" ? arguments[0] : {};
    if (!getAuthToken()) return;

    var manager = opts.manager || global.game_manager;
    if (manager && shouldUseRankedCheckpoint(manager)) {
      if (isSessionTerminated(manager)) {
        var rankedScore = Math.floor(Number(manager.score) || 0);
        if (rankedScore > 0) {
          clearPendingScoreSubmitStateForSignature(buildSubmitSignature(manager, rankedScore));
        }
      }
      return;
    }
    if (!manager || manager.replayMode || !isSessionTerminated(manager)) {
      await retryPendingScoreSubmit(opts);
      return;
    }
    if (shouldDeferUndoTerminalSubmit(manager, opts)) {
      await retryPendingScoreSubmit(opts);
      return;
    }

    var score = Math.floor(Number(manager.score) || 0);
    if (!(score > 0)) {
      await retryPendingScoreSubmit(opts);
      return;
    }

    var submitModeKey = toText(manager.modeKey || manager.mode).trim() || getCurrentModeKey();
    if (!resolveLeaderboardMode(submitModeKey)) {
      await retryPendingScoreSubmit(opts);
      return;
    }
    if (shouldSkipLegacyScoreSubmit(manager)) {
      clearPendingScoreSubmitStateForSignature(buildSubmitSignature(manager, score));
      return;
    }

    await retryPendingScoreSubmit(opts);
    if (submitLock) return;

    var payload = buildScoreSubmitPayload(manager, submitModeKey, score);
    var signature = buildSubmitSignature(manager, score);
    var lastSignature = toText(safeGetStorage(STORAGE_LAST_SUBMIT_KEY));
    var pendingState = readPendingScoreSubmitState();
    var pendingSignature = pendingState ? pendingState.signature : "";
    if (signature && signature === lastSignature) return;
    if (signature && signature === pendingSignature && shouldDeferPendingScoreSubmitRetry(pendingState)) return;

    submitLock = true;
    var result = null;
    try {
      writePendingScoreSubmitState(signature, payload, pendingState);
      result = await submitScore(payload, null, INTERNAL_SUBMIT_TOKEN, {
        keepalive: opts.keepalive === true
      });
    } finally {
      submitLock = false;
    }

    if (result && result.success) {
      safeSetStorage(STORAGE_LAST_SUBMIT_KEY, signature);
      clearPendingScoreSubmitState();
      refreshLeaderboard(submitModeKey);
      refreshTimerLeaderboardPanel(true);
      return;
    }

    var errorText = toText(result && result.error ? result.error : "score_submit_failed");
    if (isUnauthorizedSubmitError(result || errorText)) {
      clearAuthSessionOnly();
      return;
    }
    if (!isTransientSubmitResult(result, errorText)) {
      clearPendingScoreSubmitState();
    }
  }

  async function maybeSubmitRecordOnGameOver() {
    var opts = arguments.length > 0 && arguments[0] && typeof arguments[0] === "object" ? arguments[0] : {};

    var manager = opts.manager || global.game_manager;
    if (!manager || manager.replayMode || !isSessionTerminated(manager)) {
      await retryPendingRecordSubmit(opts);
      return;
    }
    if (shouldDeferUndoTerminalSubmit(manager, opts)) {
      await retryPendingRecordSubmit(opts);
      return;
    }

    var score = Math.floor(Number(manager.score) || 0);
    if (!(score > 0)) {
      await retryPendingRecordSubmit(opts);
      return;
    }

    var modeKey = toText(manager.modeKey || manager.mode).trim() || getCurrentModeKey();
    var payload = buildRecordSubmitPayload(manager, modeKey, score);
    if (!payload) {
      await retryPendingRecordSubmit(opts);
      return;
    }

    var signature = buildRecordSubmitSignature(manager, payload);
    var durableStore = getDurableRecordOutbox();
    if (durableStore) {
      var durableRecord;
      try {
        if (
          manager.sessionSubmitDone !== true &&
          !(manager.sessionSubmitPromise && typeof manager.sessionSubmitPromise.then === "function") &&
          typeof manager.tryAutoSubmitOnGameOver === "function"
        ) {
          manager.tryAutoSubmitOnGameOver();
        }
        if (manager.sessionSubmitPromise && typeof manager.sessionSubmitPromise.then === "function") {
          await manager.sessionSubmitPromise;
        }
        durableRecord = await persistRecordPayloadToDurableOutbox(manager, payload);
      } catch (persistError) {
        writeLastRecordSubmitResult(payload, {
          code: "LOCAL_PERSIST_FAILED",
          error: persistError && persistError.message ? persistError.message : "local_persist_failed"
        }, false);
        return { success: false, code: "LOCAL_PERSIST_FAILED" };
      }
      cleanupRankedStateAfterRecordSubmit(manager, payload);
      if (opts.persistOnly === true) return { success: true, persisted: true, record: durableRecord };
      return retryPendingRecordSubmit({
        keepalive: opts.keepalive === true,
        forcePendingRetry: true,
        recordId: durableRecord && durableRecord.id ? durableRecord.id : null
      });
    }
    var lastSignature = toText(safeGetStorage(STORAGE_LAST_RECORD_SUBMIT_KEY));
    var pendingState = readPendingRecordSubmitState();
    var pendingSignature = pendingState ? pendingState.signature : "";
    if (
      recordSubmitLock &&
      pendingState &&
      toText(pendingState.payload && pendingState.payload.client_record_id).trim() ===
        toText(payload.client_record_id).trim()
    ) return;
    if (signature && signature === lastSignature) return;
    if (signature && signature === pendingSignature && shouldDeferPendingRecordSubmitRetry(pendingState)) return;
    if (signature && pendingSignature && signature !== pendingSignature) {
      enqueuePendingRecordSubmitPayload(signature, payload);
    } else if (signature && !pendingSignature) {
      writePendingRecordSubmitSignature(signature, pendingState, payload, { durabilityOnly: true });
    }
    cleanupRankedStateAfterRecordSubmit(manager, payload);
    await retryPendingRecordSubmit(opts);
  }

  function isUnauthorizedSubmitError(errorLike) {
    var code = "";
    if (errorLike && typeof errorLike === "object") {
      code = toText(errorLike.code || errorLike.error).trim().toUpperCase().replace(/[\s-]+/g, "_");
    } else {
      code = toText(errorLike).trim().toUpperCase().replace(/[\s-]+/g, "_");
    }
    return [
      "ACCOUNT_DELETED",
      "ACCOUNT_INACTIVE",
      "ACCOUNT_PENDING_DELETION",
      "INVALID_TOKEN",
      "SESSION_REVOKED",
      "TOKEN_EXPIRED",
      "TOKEN_REDEEMED",
      "TOKEN_REVOKED",
      "UNAUTHORIZED"
    ].indexOf(code) >= 0;
  }

  async function retryPendingScoreSubmit(options) {
    if (submitLock) return null;
    if (!getAuthToken()) return null;
    var pendingState = readPendingScoreSubmitState();
    if (!pendingState) return null;
    if (!pendingState.payload) {
      clearPendingScoreSubmitState();
      return null;
    }
    var currentUserId = toText(getUserId()).trim();
    if (pendingState.ownerUserId && currentUserId && pendingState.ownerUserId !== currentUserId) {
      clearPendingScoreSubmitState();
      return null;
    }
    var opts = options && typeof options === "object" ? options : {};
    if (opts.forcePendingRetry !== true && shouldDeferPendingScoreSubmitRetry(pendingState)) {
      return null;
    }

    submitLock = true;
    var result = null;
    try {
      writePendingScoreSubmitState(pendingState.signature, pendingState.payload, pendingState);
      result = await submitScore(pendingState.payload, null, INTERNAL_SUBMIT_TOKEN, {
        keepalive: opts.keepalive === true
      });
    } finally {
      submitLock = false;
    }

    if (result && result.success) {
      safeSetStorage(STORAGE_LAST_SUBMIT_KEY, pendingState.signature);
      clearPendingScoreSubmitState();
      refreshLeaderboard(toText(pendingState.payload && pendingState.payload.mode_key).trim() || getCurrentModeKey());
      refreshTimerLeaderboardPanel(true);
      return result;
    }

    var errorText = toText(result && result.error ? result.error : "score_submit_failed");
    if (isUnauthorizedSubmitError(result || errorText)) {
      clearAuthSessionOnly();
      return result;
    }
    if (!isTransientSubmitResult(result, errorText)) {
      clearPendingScoreSubmitState();
    }
    return result;
  }

  async function retryDurablePendingRecordSubmit(options) {
    var store = getDurableRecordOutbox();
    if (!store || recordSubmitLock) return null;
    recordSubmitLock = true;
    try {
      await migrateLegacyPendingRecordsToDurableOutbox();
      var opts = options && typeof options === "object" ? options : {};
      var records = [];
      var recordId = toText(opts.recordId).trim();
      if (recordId) {
        var selected = await store.getByIdAsync(recordId);
        if (selected && selected.sync_status !== "synced") {
          var selectedStatus = toText(selected.sync_status).trim();
          var selectedRetryAt = Date.parse(toText(selected.next_retry_at)) || 0;
          // finalized_local is released only by an explicit history-page retry;
          // automatic scans must leave it untouched until the player confirms it.
          var selectedStatusAllowed = ["pending", "retry_wait", "waiting_auth"].indexOf(selectedStatus) >= 0 ||
            (opts.includeNeedsAction === true && ["needs_action", "finalized_local"].indexOf(selectedStatus) >= 0);
          if (
            selectedStatusAllowed &&
            (opts.forcePendingRetry === true || !selectedRetryAt || selectedRetryAt <= Date.now())
          ) records.push(selected);
        }
      } else {
        records = await store.listSyncCandidatesAsync({
          owner_user_id: toText(getUserId()).trim(),
          statuses: opts.includeNeedsAction === true
            ? ["pending", "retry_wait", "waiting_auth", "needs_action", "finalized_local"]
            : ["pending", "retry_wait", "waiting_auth"],
          include_future_retries: opts.forcePendingRetry === true
        });
      }
      if (!records.length) return null;
      if (opts.all !== true) records = records.slice(0, 1);

      var lastResult = null;
      for (var i = 0; i < records.length; i += 1) {
        var outcome = await uploadDurableRecord(store, records[i], opts);
        lastResult = outcome && outcome.result ? outcome.result : outcome;
        if (!getAuthToken()) break;
      }
      return lastResult;
    } finally {
      recordSubmitLock = false;
    }
  }

  async function retryPendingRecordSubmit(options) {
    if (getDurableRecordOutbox()) return retryDurablePendingRecordSubmit(options);
    return retryLegacyPendingRecordSubmit(options);
  }

  async function retryLegacyPendingRecordSubmit(options) {
    if (recordSubmitLock) return null;
    if (!getAuthToken()) return null;
    var pendingState = readPendingRecordSubmitState();
    if (!pendingState) return null;
    if (!pendingState.payload) {
      clearPendingRecordSubmitSignature();
      return null;
    }
    var currentUserId = toText(getUserId()).trim();
    if (pendingState.ownerUserId && currentUserId && pendingState.ownerUserId !== currentUserId) {
      return null;
    }
    var opts = options && typeof options === "object" ? options : {};
    if (opts.forcePendingRetry !== true && shouldDeferPendingRecordSubmitRetry(pendingState)) {
      return null;
    }

    recordSubmitLock = true;
    var result = null;
    try {
      writePendingRecordSubmitSignature(pendingState.signature, pendingState, pendingState.payload);
      result = await submitRecord(pendingState.payload, INTERNAL_SUBMIT_TOKEN, {
        keepalive: opts.keepalive === true,
        deliverySource: opts.deliverySource
      });
    } finally {
      recordSubmitLock = false;
    }

    result = requireRecordSubmitServerId(result);

    if (result && result.success) {
      notifyAchievementUnlocks(result);
      writeLastRecordSubmitResult(pendingState.payload, result, true);
      safeSetStorage(STORAGE_LAST_RECORD_SUBMIT_KEY, pendingState.signature);
      clearPendingRecordSubmitSignature();
      promoteAndRetryNextPendingRecordSubmit(opts);
      var currentManager = global.game_manager;
      cleanupRankedStateAfterRecordSubmit(currentManager, pendingState.payload);
      refreshLeaderboardsAfterRecordSubmit(pendingState.payload && pendingState.payload.mode_key);
      return result;
    }

    var errorText = toText(result && result.error ? result.error : "record_submit_failed");
    writeLastRecordSubmitResult(pendingState.payload, result, false);
    if (isRankedSessionExpiredResult(result)) {
      return result;
    }
    if (isUnauthorizedSubmitError(result || errorText)) {
      clearAuthSessionOnly();
      return result;
    }
    if (resolveRecordSubmitErrorCode(result, "RECORD_SUBMIT_FAILED") === "SERVER_RECORD_ID_MISSING") {
      return result;
    }
    if (!isTransientSubmitResult(result, errorText)) {
      markRecordSubmitSignatureHandled(pendingState.signature);
      clearPendingRecordSubmitSignature();
      promoteAndRetryNextPendingRecordSubmit(opts);
    }
    return result;
  }

  async function retryPendingStone2kSubmit(options) {
    if (stone2kSubmitLock) return null;
    if (!getAuthToken()) return null;
    var pendingState = readPendingStone2kSubmitState();
    if (!pendingState) return null;
    if (!pendingState.payload) {
      clearPendingStone2kSubmitState();
      return null;
    }
    var currentUserId = toText(getUserId()).trim();
    if (pendingState.ownerUserId && currentUserId && pendingState.ownerUserId !== currentUserId) {
      clearPendingStone2kSubmitState();
      return null;
    }
    var opts = options && typeof options === "object" ? options : {};
    if (opts.forcePendingRetry !== true && shouldDeferPendingStone2kSubmitRetry(pendingState)) {
      return null;
    }

    stone2kSubmitLock = true;
    activeStone2kSubmitSignature = pendingState.signature;
    var result = null;
    try {
      writePendingStone2kSubmitState(pendingState.signature, pendingState, pendingState.payload);
      result = await submitStone2kRun(pendingState.payload, INTERNAL_SUBMIT_TOKEN, {
        keepalive: opts.keepalive === true
      });
    } finally {
      stone2kSubmitLock = false;
      activeStone2kSubmitSignature = "";
    }

    if (result && result.success) {
      safeSetStorage(STORAGE_LAST_STONE_2K_SUBMIT_KEY, pendingState.signature);
      var latestPendingState = readPendingStone2kSubmitState();
      if (!latestPendingState || latestPendingState.signature === pendingState.signature) {
        clearPendingStone2kSubmitState();
      } else {
        runPromiseSafely(function () {
          return retryPendingStone2kSubmit({
            keepalive: opts.keepalive === true,
            forcePendingRetry: true
          });
        });
      }
      return result;
    }

    var errorText = toText(result && result.error ? result.error : "stone_2k_submit_failed");
    if (isUnauthorizedSubmitError(result || errorText)) {
      clearAuthSessionOnly();
      return result;
    }
    if (!isTransientSubmitResult(result, errorText)) {
      clearPendingStone2kSubmitState();
    }
    return result;
  }

  async function maybeSubmitStone2kRun() {
    var opts = arguments.length > 0 && arguments[0] && typeof arguments[0] === "object" ? arguments[0] : {};
    if (!getAuthToken()) return;
    var manager = opts.manager || global.game_manager;
    if (!manager || manager.replayMode) {
      await retryPendingStone2kSubmit(opts);
      return;
    }

    var modeKey = toText(manager.modeKey || manager.mode).trim() || getCurrentModeKey();
    var score = Math.floor(Number(manager.score) || 0);
    var payload = buildStone2kRunPayload(manager, modeKey, score);
    if (!payload) {
      await retryPendingStone2kSubmit(opts);
      return;
    }
    var signature = buildStone2kRunSignature(payload);

    await retryPendingStone2kSubmit(opts);
    if (!getAuthToken()) return;
    if (stone2kSubmitLock) {
      if (!activeStone2kSubmitSignature || activeStone2kSubmitSignature !== signature) {
        writePendingStone2kSubmitState(signature, readPendingStone2kSubmitState(), payload);
      }
      return;
    }

    var lastSignature = toText(safeGetStorage(STORAGE_LAST_STONE_2K_SUBMIT_KEY));
    var pendingState = readPendingStone2kSubmitState();
    var pendingSignature = pendingState ? pendingState.signature : "";
    if (signature && signature === lastSignature) return;
    if (signature && signature === pendingSignature && shouldDeferPendingStone2kSubmitRetry(pendingState)) return;

    stone2kSubmitLock = true;
    activeStone2kSubmitSignature = signature;
    var result = null;
    try {
      writePendingStone2kSubmitState(signature, pendingState, payload);
      result = await submitStone2kRun(payload, INTERNAL_SUBMIT_TOKEN, {
        keepalive: opts.keepalive === true
      });
    } finally {
      stone2kSubmitLock = false;
      activeStone2kSubmitSignature = "";
    }

    if (result && result.success) {
      safeSetStorage(STORAGE_LAST_STONE_2K_SUBMIT_KEY, signature);
      var latestPendingState = readPendingStone2kSubmitState();
      if (!latestPendingState || latestPendingState.signature === signature) {
        clearPendingStone2kSubmitState();
      } else {
        runPromiseSafely(function () {
          return retryPendingStone2kSubmit({
            keepalive: opts.keepalive === true,
            forcePendingRetry: true
          });
        });
      }
      return;
    }

    var errorText = toText(result && result.error ? result.error : "stone_2k_submit_failed");
    if (isUnauthorizedSubmitError(result || errorText)) {
      clearAuthSessionOnly();
      return;
    }
    if (!isTransientSubmitResult(result, errorText)) {
      clearPendingStone2kSubmitState();
    }
  }

  function runPromiseSafely(task) {
    if (typeof task !== "function") return;
    try {
      var maybePromise = task();
      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch(function () {});
      }
    } catch (_err) {}
  }

  function triggerImmediateOnlineSubmit(options) {
    var opts = options && typeof options === "object" ? options : {};
    var manager = opts.manager || global.game_manager;
    if (manager && (manager.rankCheckpointApplying === true || manager.rankCheckpointRestorePending === true)) return;
    runPromiseSafely(function () {
      return maybeSubmitRecordOnGameOver(opts);
    });
    runPromiseSafely(function () {
      return maybeSubmitScoreOnGameOver(opts);
    });
    runPromiseSafely(function () {
      return maybeSubmitStone2kRun(opts);
    });
  }

  function wrapOnlineSubmitHook(manager, methodName, timing) {
    if (!manager || typeof manager[methodName] !== "function") return;
    var original = manager[methodName];
    if (original && original.__onlineImmediateSubmitHooked === true) return;

    var wrapped = function () {
      var currentManager = this || manager;
      if (methodName === "move" && currentManager.rankedRestartBlockedUntilSessionReady === true) {
        return;
      }
      if (timing === "before") {
        var isRestartMethod =
          methodName === "restart" ||
          methodName === "restartWithSeed" ||
          methodName === "restartWithBoard";
        triggerImmediateOnlineSubmit({
          allowUndoTerminalSubmit: isRestartMethod,
          manager: currentManager
        });
        if (
          isRestartMethod
        ) {
          if (methodName === "restart") {
            var rankedRestartRuntime = getRankedSessionRuntime();
            if (rankedRestartRuntime && typeof rankedRestartRuntime.startNextSession === "function") {
              if (
                beginAsyncRankedRestart(
                  currentManager,
                  original,
                  this,
                  Array.prototype.slice.call(arguments),
                  { afterConfirmation: true }
                )
              ) {
                return currentManager;
              }
            } else if (!prepareRankedSessionForRestart(currentManager)) {
              beginAsyncRankedRestart(
                currentManager,
                original,
                this,
                Array.prototype.slice.call(arguments)
              );
              return currentManager;
            }
          } else if (!prepareRankedSessionForRestart(currentManager)) {
            beginAsyncRankedRestart(
              currentManager,
              original,
              this,
              Array.prototype.slice.call(arguments)
            );
            return currentManager;
          }
          if (!(currentManager && (currentManager.rankCheckpointApplying === true || currentManager.replayMode === true))) {
            clearRankedCheckpointForManager(currentManager, { keepalive: true }).catch(function () {});
          }
        }
      }
      var result = original.apply(this, arguments);
      if (timing === "after") {
        if (
          methodName === "tryAutoSubmitOnGameOver" &&
          getDurableRecordOutbox() &&
          result &&
          typeof result.then === "function"
        ) {
          return Promise.resolve(result).then(function (savedRecord) {
            return maybeSubmitRecordOnGameOver({ manager: currentManager, persistOnly: true }).then(function () {
              runPromiseSafely(function () {
                return retryPendingRecordSubmit({ forcePendingRetry: true });
              });
              runPromiseSafely(function () {
                return maybeSubmitScoreOnGameOver({ manager: currentManager });
              });
              runPromiseSafely(function () {
                return maybeSubmitStone2kRun({ manager: currentManager });
              });
              return savedRecord;
            });
          });
        }
        triggerImmediateOnlineSubmit();
        if (
          methodName === "move" &&
          currentManager.rankCheckpointApplying !== true &&
          currentManager.rankCheckpointRestorePending !== true
        ) {
          maybeQueueRankedBeginAttempt(currentManager);
          persistRankedCheckpointLocalMirror(currentManager);
          scheduleRankedCheckpointSave(currentManager, { reason: "move" });
        }
      }
      return result;
    };

    wrapped.__onlineImmediateSubmitHooked = true;
    manager[methodName] = wrapped;
  }

  function bindImmediateOnlineSubmitHooks() {
    var manager = global.game_manager;
    if (!manager || manager.replayMode) return;
    if (manager.needsRankedCheckpointRestore) {
      scheduleRankedCheckpointRestore(manager, { reason: "bind" });
    }
    if (manager.__onlineImmediateSubmitHooksBound === true) return;

    wrapOnlineSubmitHook(manager, "move", "after");
    wrapOnlineSubmitHook(manager, "restart", "before");
    wrapOnlineSubmitHook(manager, "restartWithSeed", "before");
    wrapOnlineSubmitHook(manager, "restartWithBoard", "before");
    wrapOnlineSubmitHook(manager, "tryAutoSubmitOnGameOver", "after");
    manager.__onlineImmediateSubmitHooksBound = true;
  }

  function notifyGameManagerReady(manager) {
    if (!manager || manager.replayMode) return;
    bindImmediateOnlineSubmitHooks();
  }

  function flushTerminalSubmitOnPageHide() {
    runPromiseSafely(function () {
      return flushRankedAttemptOutbox({ keepalive: true });
    });
    var manager = global.game_manager;
    if (!manager || manager.replayMode) return;
    runPromiseSafely(function () {
      return maybeSubmitRecordOnGameOver({ keepalive: true, manager: manager });
    });
    runPromiseSafely(function () {
      return maybeSubmitScoreOnGameOver({ keepalive: true, manager: manager });
    });
    runPromiseSafely(function () {
      return maybeSubmitStone2kRun({ keepalive: true, manager: manager });
    });
  }

  function bindLifecycleSubmitFlush() {
    if (lifecycleSubmitFlushBound) return;
    lifecycleSubmitFlushBound = true;
    global.addEventListener("pagehide", flushTerminalSubmitOnPageHide);
    global.addEventListener("beforeunload", flushTerminalSubmitOnPageHide);
  }

  function bindModeIntroRefresh() {
    if (modeIntroBound) return;
    var introBtn = byId("top-mode-intro-btn");
    if (!introBtn) return;

    modeIntroBound = true;
    introBtn.addEventListener("click", function () {
      var modeKey = getCurrentModeKey();
      var modeBucket = resolveLeaderboardMode(modeKey) || "";
      var cacheKey = modeKey || modeBucket;
      if (cachedLeaderboard.length > 0 && cachedLeaderboardMode === cacheKey) {
        renderModeIntroLeaderboard(cachedLeaderboard);
      } else {
        refreshLeaderboard(modeKey);
      }
    });
  }

  function resolvePollBaseIntervalMs() {
    return global.document.hidden ? POLL_BASE_INTERVAL_HIDDEN_MS : POLL_BASE_INTERVAL_VISIBLE_MS;
  }

  function resolveTimerRefreshIntervalMs() {
    return global.document.hidden ? TIMER_REFRESH_INTERVAL_HIDDEN_MS : TIMER_REFRESH_INTERVAL_VISIBLE_MS;
  }

  function resolveModeIntroRefreshIntervalMs() {
    return global.document.hidden ? MODE_INTRO_REFRESH_INTERVAL_HIDDEN_MS : MODE_INTRO_REFRESH_INTERVAL_VISIBLE_MS;
  }

  function shouldRefreshTimerLeaderboardFromPolling() {
    return !resolveCurrentTimerLeaderboardCacheRows().length && !hasVisibleTimerLeaderboardRows();
  }

  function clearPollingTimer() {
    if (pollingUsingScheduler) return;
    if (!pollingTickTimer) return;
    global.clearTimeout(pollingTickTimer);
    pollingTickTimer = 0;
  }

  function schedulePollingTick(immediate) {
    if (pollingUsingScheduler) return;
    clearPollingTimer();
    var delay = immediate ? 0 : resolvePollBaseIntervalMs();
    if (!immediate && pollingFailureCount > 0) {
      var scale = Math.pow(2, Math.min(pollingFailureCount, POLL_BACKOFF_MAX_STEP));
      delay = Math.min(POLL_BACKOFF_MAX_MS, delay * scale);
    }
    pollingTickTimer = global.setTimeout(runPollingTick, delay);
  }

  function bindPollingVisibilityRefresh() {
    if (pollingVisibilityBound) return;
    pollingVisibilityBound = true;
    global.document.addEventListener("visibilitychange", function () {
      if (!global.document.hidden) {
        pollingFailureCount = 0;
        if (pollingUsingScheduler) {
          var visibilityScheduler = getRefreshScheduler();
          if (visibilityScheduler && typeof visibilityScheduler.wake === "function") {
            visibilityScheduler.wake(schedulerTaskName);
          }
        } else {
          schedulePollingTick(true);
        }
      }
    });
    global.addEventListener("online", function () {
      pollingFailureCount = 0;
      if (pollingUsingScheduler) {
        var onlineScheduler = getRefreshScheduler();
        if (onlineScheduler && typeof onlineScheduler.wake === "function") {
          onlineScheduler.wake(schedulerTaskName);
        }
      } else {
        schedulePollingTick(true);
      }
    });
    global.addEventListener("focus", function () {
      if (pollingUsingScheduler) {
        var focusScheduler = getRefreshScheduler();
        if (focusScheduler && typeof focusScheduler.wake === "function") {
          focusScheduler.wake(schedulerTaskName);
        }
      } else {
        schedulePollingTick(true);
      }
    });
  }

  async function runPollingTick() {
    if (pollingTickRunning) {
      if (!pollingUsingScheduler) {
        schedulePollingTick(false);
      }
      return;
    }
    pollingTickRunning = true;
    var tickFailed = false;
    var now = Date.now();

    try {
      bindImmediateOnlineSubmitHooks();
      ensureToolkitEntryRow();
      bindModeIntroRefresh();
      syncTimerLeaderboardViewMode();
      if (typeof global.syncTimerModuleSettingsUI === "function") {
        global.syncTimerModuleSettingsUI();
      }

      await maybeSubmitRecordOnGameOver();
      await maybeSubmitScoreOnGameOver();
      await maybeSubmitStone2kRun();
      await flushRankedAttemptOutbox();
      await maybeSaveRankedCheckpoint(global.game_manager, {}).catch(function () {});

      if (
        shouldRefreshTimerLeaderboardFromPolling() &&
        now - pollingLastTimerRefreshTime >= resolveTimerRefreshIntervalMs()
      ) {
        pollingLastTimerRefreshTime = now;
        var timerOk = await refreshTimerLeaderboardPanel(false);
        if (!timerOk) tickFailed = true;
      }

      if (byId("mode-intro-leaderboard") && now - pollingLastModeIntroRefreshTime >= resolveModeIntroRefreshIntervalMs()) {
        pollingLastModeIntroRefreshTime = now;
        var introOk = await refreshLeaderboard(getCurrentModeKey());
        if (!introOk) tickFailed = true;
      }
    } catch (_err) {
      tickFailed = true;
    } finally {
      pollingTickRunning = false;
      pollingFailureCount = tickFailed ? Math.min(pollingFailureCount + 1, POLL_BACKOFF_MAX_STEP) : 0;
      if (!pollingUsingScheduler) {
        schedulePollingTick(false);
      }
    }

    if (tickFailed && pollingUsingScheduler) {
      throw new Error("leaderboard_poll_tick_failed");
    }
  }

  function startPolling() {
    if (pollingStarted) return;
    pollingStarted = true;
    bindPollingVisibilityRefresh();

    var scheduler = getRefreshScheduler();
    if (scheduler && typeof scheduler.register === "function") {
      pollingUsingScheduler = true;
      scheduler.register({
        name: schedulerTaskName,
        intervalMs: POLL_BASE_INTERVAL_VISIBLE_MS,
        backgroundIntervalMs: POLL_BASE_INTERVAL_HIDDEN_MS,
        maxBackoffMs: POLL_BACKOFF_MAX_MS,
        immediate: true,
        callback: runPollingTick
      });
      return;
    }

    pollingUsingScheduler = false;
    schedulePollingTick(true);
  }

function init() {
  var allowOnlineAutoload = shouldAutoLoadOnlineLeaderboard();
  bindImmediateOnlineSubmitHooks();
    scheduleRankedCheckpointRestore(global.game_manager, { reason: "init" });
    ensureToolkitEntryRow();
    bindLanguageSync();
    bindAuthBestScoreSync();
    bindLifecycleSubmitFlush();
    bindModeIntroRefresh();
    ensureTimerLeaderboardPanel();
    syncTimerLeaderboardViewMode();
    if (typeof global.syncTimerModuleSettingsUI === "function") {
      global.syncTimerModuleSettingsUI();
    }
    if (!allowOnlineAutoload) return;
    runPromiseSafely(function () {
      return retryPendingRecordSubmit({ deliverySource: "automatic" });
    });
    runPromiseSafely(function () {
      return retryPendingScoreSubmit({ forcePendingRetry: true });
    });
    requestAccountBestScoreStartupSync();
    refreshTimerLeaderboardPanel(true);
    if (byId("mode-intro-leaderboard")) {
      refreshLeaderboard(getCurrentModeKey());
    }
    startPolling();
  }

  global.OnlineLeaderboardRuntime = {
    refreshLeaderboard: refreshLeaderboard,
    refreshTimerLeaderboardPanel: refreshTimerLeaderboardPanel,
    login: login,
    register: register,
    getUserInfo: getUserInfo,
    clearAuth: clearAuth,
    getApiBase: function () { return activeApiBase; },
    saveAuth: saveAuth,
    getAuthToken: getAuthToken,
    getUserId: getUserId,
    getNickname: getNickname,
    resolveLeaderboardMode: resolveLeaderboardMode,
    isLeaderboardModeSupported: isLeaderboardModeSupported,
    syncAccountBestScoreForCurrentMode: syncAccountBestScoreForCurrentMode,
    hasLocalRankedCheckpointMirror: hasRankedCheckpointLocalMirror,
    notifyGameManagerReady: notifyGameManagerReady,
    scheduleRankedCheckpointRestore: scheduleRankedCheckpointRestore,
    persistRankedCheckpointOnPageHide: persistRankedCheckpointOnPageHide,
    retryLocalHistoryRecord: function (recordId, options) {
      var opts = options && typeof options === "object" ? options : {};
      var automatic = opts.deliverySource === "automatic";
      return retryPendingRecordSubmit({
        recordId: recordId,
        forcePendingRetry: !automatic,
        includeNeedsAction: !automatic,
        deliverySource: automatic ? "automatic" : "manual"
      });
    },
    retryAllLocalHistoryRecords: function (options) {
      var opts = options && typeof options === "object" ? options : {};
      var automatic = opts.deliverySource === "automatic";
      return retryPendingRecordSubmit({
        forcePendingRetry: !automatic,
        includeNeedsAction: !automatic,
        all: true,
        deliverySource: automatic ? "automatic" : "manual"
      });
    }
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

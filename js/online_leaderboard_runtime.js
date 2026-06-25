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
  var STORAGE_LAST_STONE_2K_SUBMIT_KEY = "online_last_stone_2k_submit_signature_v1";
  var STORAGE_PENDING_STONE_2K_SUBMIT_KEY = "online_pending_stone_2k_submit_v1";
  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var BEST_SCORE_STORAGE_KEY_PREFIX = "bestScoreByMode:";
  var SCORE_SUBMIT_PENDING_TTL_MS = 24 * 60 * 60 * 1000;
  var SCORE_SUBMIT_PENDING_RETRY_BASE_MS = 2000;
  var SCORE_SUBMIT_PENDING_RETRY_MAX_MS = 15000;
  var RECORD_SUBMIT_PENDING_TTL_MS = 24 * 60 * 60 * 1000;
  var RECORD_SUBMIT_PENDING_RETRY_BASE_MS = 2000;
  var RECORD_SUBMIT_PENDING_RETRY_MAX_MS = 15000;
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
  var RANKED_RESTART_SETUP_DEFERRED = { rankedRestartSetupDeferred: true };

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
    if (!storage || typeof storage.setItem !== "function") return;
    try {
      storage.setItem(key, value);
    } catch (_err) {}
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
    capped: "capped",

    classic_undo: "standard_undo",
    standard_undo: "standard_undo",
    classic_4x4_pow2_undo: "standard_undo",

    pow2_3x3: "pow2_3x3",
    board_3x3_pow2_no_undo: "pow2_3x3",
    board_3x3_pow2_undo: "pow2_3x3",

    pow2_2x4: "pow2_2x4",
    board_2x4_pow2_no_undo: "pow2_2x4",
    board_2x4_pow2_undo: "pow2_2x4",

    pow2_3x4: "pow2_3x4",
    board_3x4_pow2_no_undo: "pow2_3x4",
    board_3x4_pow2_undo: "pow2_3x4",

    fib_3x3: "fib_3x3",
    fib_3x3_no_undo: "fib_3x3",
    fib_3x3_undo: "fib_3x3"
  };
  var TIMER_LEADERBOARD_TOP_LIMIT = 10;
  var TIMER_LEADERBOARD_FETCH_LIMIT = 10;
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
    return toText(safeGetStorage(STORAGE_TOKEN_KEY)).trim();
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
    var seed = Math.floor(Number(valueLike));
    return Number.isSafeInteger(seed) && seed >= 0 ? seed : null;
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
          token: directToken
        };
      }
      return {
        modeKey: modeKey,
        challengeId: directChallengeId || contextChallengeId || null,
        seed: directSeed,
        token: directToken
      };
    }

    if (!contextToken || contextSeed === null) return null;
    if (directSeed !== null && directSeed !== contextSeed) return null;
    return {
      modeKey: modeKey,
      challengeId: contextChallengeId || null,
      seed: contextSeed,
      token: contextToken
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
      mode_key: rankedContext.modeKey,
      ranked_session_token: rankedContext.token
    };
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
    if (submittedToken && hasDistinctPrefetchedRankedSession(modeKey, activeSession)) return false;
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

  function hasDistinctPrefetchedRankedSession(modeKey, activeSession) {
    var prefetched = readPrefetchedRankedSessionRecord(modeKey);
    if (!prefetched) return false;
    var prefetchedToken = toText(prefetched.ranked_session_token).trim();
    var prefetchedChallengeId = toText(prefetched.challenge_id).trim().toLowerCase();
    var prefetchedSeed = normalizeRankedSessionSeed(prefetched.seed);
    if (!prefetchedToken || !prefetchedChallengeId || prefetchedSeed === null) return false;
    var activeToken = toText(activeSession && activeSession.ranked_session_token).trim();
    var activeChallengeId = toText(activeSession && activeSession.challenge_id).trim().toLowerCase();
    var activeSeed = normalizeRankedSessionSeed(activeSession && activeSession.seed);
    if (activeToken && activeToken === prefetchedToken) return false;
    if (activeChallengeId && activeChallengeId === prefetchedChallengeId) return false;
    if (activeSeed !== null && activeSeed === prefetchedSeed) return false;
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
        ranked_session_token: rankedToken
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
    if (isUnauthorizedSubmitErrorText(reason)) {
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

  function beginAsyncRankedRestartAfterConfirmation(manager, original, thisArg, args, modeKey, runtime) {
    if (!(manager && typeof manager.setup === "function")) {
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
    var restartSnapshot = snapshotRankedRestartManagerState(manager);
    var setupIntercepted = false;
    var restored = false;
    function restoreSetup() {
      if (!restored && manager.setup === rankedRestartSetupInterceptor) {
        manager.setup = originalSetup;
      }
      restored = true;
    }
    function rankedRestartSetupInterceptor() {
      setupIntercepted = true;
      var setupThisArg = this || manager;
      var setupArgs = Array.prototype.slice.call(arguments);
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

    var result;
    try {
      result = original.apply(thisArg, args || []);
    } catch (err) {
      restoreSetup();
      if (isRankedRestartSetupDeferredError(err)) {
        return;
      }
      markRankedRestartPreparationDone(manager);
      throw err;
    }

    Promise.resolve(result).then(
      function () {
        if (!setupIntercepted) {
          restoreSetup();
          markRankedRestartPreparationDone(manager);
        }
      },
      function (err) {
        restoreSetup();
        if (isRankedRestartSetupDeferredError(err)) {
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
    safeSetStorage(STORAGE_TOKEN_KEY, toText(payload && payload.token));
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
    safeRemoveStorage(STORAGE_TOKEN_KEY);
    safeRemoveStorage(STORAGE_USER_ID_KEY);
    safeRemoveStorage(STORAGE_NICKNAME_KEY);
    safeRemoveStorage(STORAGE_PENDING_SCORE_SUBMIT_KEY);
    safeRemoveStorage(STORAGE_PENDING_RECORD_SUBMIT_KEY);
    safeRemoveStorage(STORAGE_PENDING_STONE_2K_SUBMIT_KEY);
  }

  function clearAuthSessionOnly() {
    safeRemoveStorage(STORAGE_TOKEN_KEY);
    safeRemoveStorage(STORAGE_USER_ID_KEY);
    safeRemoveStorage(STORAGE_NICKNAME_KEY);
  }

  function clearPendingScoreSubmitState() {
    safeRemoveStorage(STORAGE_PENDING_SCORE_SUBMIT_KEY);
  }

  function clearPendingRecordSubmitSignature() {
    safeRemoveStorage(STORAGE_PENDING_RECORD_SUBMIT_KEY);
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
        var lastAttemptAt = Math.max(0, Math.floor(Number(parsed.lastAttemptAt || createdAt) || 0));
        var retryCount = Math.max(0, Math.floor(Number(parsed.retryCount) || 0));
        var payload = payloadNormalizer(parsed.payload);
        var ownerUserId = toText(parsed.ownerUserId || parsed.owner_user_id).trim();
        if (!signature) return null;
        if (createdAt > 0 && now - createdAt > ttlMs) return null;
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
    if (!state) {
      clearPendingRecordSubmitSignature();
      return null;
    }
    return state;
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

  function writePendingRecordSubmitSignature(signature, previousState, payload) {
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
    safeSetStorage(
      STORAGE_PENDING_RECORD_SUBMIT_KEY,
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
    var signature = key + "|" + rows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT).map(function (row, index) {
      return [
        index,
        toText(row && row.user_id).trim(),
        toText(row && row.nickname).trim(),
        Math.floor(Number(row && row.score) || 0)
      ].join(":");
    }).join(",");
    timerLeaderboardCacheRows = rows;
    timerLeaderboardCacheMode = key;
    timerLeaderboardCacheTime = entry && Number(entry.time) ? Number(entry.time) : 0;
    setTimerLeaderboardPanelLoading(false);
    if (signature && signature === timerLeaderboardRenderedSignature) return;
    renderTimerLeaderboardRows(rows.slice(0, TIMER_LEADERBOARD_TOP_LIMIT), resolveSelfRank(rows));
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
    var timeoutMs = resolveApiTimeoutMs();

    for (var i = 0; i < apiBases.length; i += 1) {
      var base = apiBases[i];
      var headers = opts.headers && typeof opts.headers === "object" ? Object.assign({}, opts.headers) : {};
      var requestInit = {
        method: method,
        headers: headers
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

      if (opts.body !== undefined) {
        requestInit.headers["Content-Type"] = "application/json";
        requestInit.body = JSON.stringify(opts.body);
      }

      try {
        if (controller) {
          timeoutHandle = global.setTimeout(function () {
            try { controller.abort(); } catch (_err) {}
          }, timeoutMs);
        }
        var response = await callFetch(base + path, requestInit);
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
          if (!data && i < apiBases.length - 1) {
            continue;
          }
          if (data && typeof data === "object") {
            return data;
          }
          return { error: "HTTP " + response.status };
        }

        if (!data || typeof data !== "object") {
          var origin = toText(global.location && global.location.origin).trim().replace(/\/+$/, "");
          var normalizedBase = toText(base).trim().replace(/\/+$/, "");
          var isSameOriginApiBase = !!origin && normalizedBase === origin + "/api";
          if (contentType.indexOf("text/html") >= 0 && isSameOriginApiBase && apiBases.length === 1) {
            return { error: "API not configured" };
          }
          if (i < apiBases.length - 1) {
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

  function submitRecord(payload, submitToken, options) {
    if (!isInternalSubmitToken(submitToken)) {
      return Promise.resolve({ success: false, error: "client_submit_api_disabled" });
    }
    var opts = options && typeof options === "object" ? options : {};
    return apiRequest("/records", {
      method: "POST",
      auth: true,
      body: payload,
      keepalive: opts.keepalive === true
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
    if (activeChallengeId && checkpointChallengeId && activeChallengeId === checkpointChallengeId) {
      return false;
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
    var payload = buildRankedCheckpointPayload(manager);
    if (!payload) return null;
    return {
      mode: toText(payload.mode).trim(),
      mode_key: toText(payload.mode_key).trim(),
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
    try {
      writeLocalStorageItem(resolveRankedCheckpointLocalMirrorStorageKey(modeKey), JSON.stringify(payload));
      return true;
    } catch (_err) {
      return false;
    }
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
    if (!restored) {
      clearRankedCheckpointLocalMirror(modeKey);
      return false;
    }
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
    manager.accumulatedTime = Math.max(0, Math.floor(Number(savedLike.duration_ms) || 0));
    manager.time = manager.accumulatedTime;
    manager.startTime = null;
    manager.timerStatus = 0;
    manager.timerFrozen = !!savedLike.timer_frozen;
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
    if (!(envelope && (envelope.kind === "v1rpl" || envelope.kind === "v9rpl" || envelope.kind === "v4c"))) {
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
    var originalActuate = manager.actuate;
    manager.rankCheckpointApplying = true;
    manager.actuate = function () {};
    try {
      restartWithBoard(manager, envelope.initialBoard, replayModeConfig);
      manager.disableSessionSync = true;
      for (var actionIndex = 0; actionIndex < replayMoves.length; actionIndex++) {
        var action = replayMoves[actionIndex];
        if (action === -1) {
          manager.move(-1);
          continue;
        }
        if (!Number.isInteger(action)) return failRankedCheckpointRestore(manager, "action_invalid");
        manager.forcedSpawn = replaySpawns[actionIndex] || null;
        manager.move(action);
      }
    } catch (_err) {
      return failRankedCheckpointRestore(manager, "replay_apply_failed");
    } finally {
      manager.forcedSpawn = null;
      manager.disableSessionSync = false;
      manager.rankCheckpointApplying = false;
      manager.actuate = originalActuate;
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
      applyRankedCheckpointTimerState(manager, checkpointData);
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
          ? "This ranked session has expired. Please start a new ranked game."
          : "本次排位会话已过期，请重新开始排位。"
      );
    }
  }

  function handleRankedSessionExpired(manager, modeLike) {
    var modeKey = toText(modeLike || (manager && (manager.modeKey || manager.mode))).trim() || getCurrentModeKey();
    clearRankedCheckpointSaveTimer();
    clearPendingRecordSubmitSignature();
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
    var restored = false;
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = candidates[i];
      restored = candidate.source === "local"
        ? restoreRankedCheckpointLocalMirror(manager, candidate.data)
        : restoreRankedCheckpointForManager(manager, candidate.data);
      if (restored) break;
    }
    manager.needsRankedCheckpointRestore = false;
    manager.rankCheckpointRestorePending = false;
    if (restored) {
      manager.rankCheckpointSaveConflict = "";
      manager.lastRankedCheckpointSaveError = "";
      persistRankedCheckpointLocalMirror(manager);
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
        manager.needsRankedCheckpointRestore = false;
        manager.rankCheckpointRestorePending = false;
      }).finally(function () {
        manager.rankCheckpointRestoreScheduled = false;
      });
    }, delayMs);
  }

  function persistRankedCheckpointOnPageHide(manager) {
    clearRankedCheckpointSaveTimer();
    persistRankedCheckpointLocalMirror(manager);
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
    var safeUserId = Math.floor(Number(userId) || 0);
    if (safeUserId <= 0 || !modeKey || !modeBucket) {
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
    if (!result || !result.success || !Array.isArray(result.data)) return 0;
    var normalizedModeKey = toText(modeKey).trim().toLowerCase();
    if (!normalizedModeKey) return 0;
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
    var score = normalizeAccountBestScore(serverBestScore);
    if (!(score > 0)) return false;
    var manager = global.game_manager;
    if (!manager || manager.replayMode) return false;
    var currentModeKey = toText(manager.modeKey || manager.mode).trim() || getCurrentModeKey();
    if (currentModeKey && currentModeKey !== modeKey) return false;
    if (!manager.scoreManager || typeof manager.scoreManager.get !== "function" || typeof manager.scoreManager.set !== "function") {
      return false;
    }
    var localBestScore = normalizeAccountBestScore(manager.scoreManager.get());
    if (score <= localBestScore) return false;
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

  function getToolkitCopy(lang) {
    if (lang === "en") {
      return {
        label: "Theme Settings",
        palette: "Theme Settings",
        account: "Account Center"
      };
    }
    return {
      label: "主题设置",
      palette: "主题设置",
      account: "账号中心"
    };
  }

  function applyToolkitRowText(lang) {
    var copy = getToolkitCopy(lang);
    var label = byId("toolkit-entry-label");
    var palette = byId("toolkit-palette-link");
    var account = byId("toolkit-account-link");

    if (label) label.textContent = copy.label;
    if (palette) {
      palette.textContent = copy.palette;
      palette.setAttribute("href", "palette.html");
    }
    if (account) {
      account.textContent = copy.account;
      account.setAttribute("href", "account.html");
    }
  }

  function ensureToolkitEntryRow() {
    var modalContent = global.document.querySelector("#settings-modal .settings-modal-content");
    if (!modalContent) return;

    var row = byId("toolkit-entry-row");
    if (!row) {
      row = createEl("div", "settings-row toolkit-entry-row", "");
      row.id = "toolkit-entry-row";

      var actionWrap = createEl("div", "toolkit-entry-actions", "");
      var palette = createEl("a", "replay-button", "");
      palette.id = "toolkit-palette-link";
      palette.setAttribute("href", "palette.html");
      var account = createEl("a", "replay-button", "");
      account.id = "toolkit-account-link";
      account.setAttribute("href", "account.html");

      actionWrap.appendChild(palette);
      actionWrap.appendChild(account);
      row.appendChild(actionWrap);

      var actionHost = modalContent.querySelector(".replay-modal-actions");
      if (actionHost && actionHost.parentNode === modalContent) {
        modalContent.insertBefore(row, actionHost);
      } else {
        modalContent.appendChild(row);
      }
    }

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
    var maxTile = Math.floor(Number(modeConfig && modeConfig.max_tile));
    if (Number.isInteger(maxTile) && maxTile > 0) return true;
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
    if (isUnauthorizedSubmitErrorText(errorText)) {
      clearAuthSessionOnly();
      return;
    }
    if (!isTransientOnlineSubmitErrorText(errorText)) {
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

    await retryPendingRecordSubmit(opts);
    if (recordSubmitLock) return;

    var lastSignature = toText(safeGetStorage(STORAGE_LAST_RECORD_SUBMIT_KEY));
    var pendingState = readPendingRecordSubmitState();
    var pendingSignature = pendingState ? pendingState.signature : "";
    if (signature && signature === lastSignature) return;
    if (signature && signature === pendingSignature && shouldDeferPendingRecordSubmitRetry(pendingState)) return;
    if (signature && signature !== pendingSignature) {
      writePendingRecordSubmitSignature(signature, pendingState, payload);
    }
    if (!getAuthToken()) return;

    recordSubmitLock = true;
    var result = null;
    try {
      writePendingRecordSubmitSignature(signature, pendingState, payload);
      result = await submitRecord(payload, INTERNAL_SUBMIT_TOKEN, {
        keepalive: opts.keepalive === true
      });
    } finally {
      recordSubmitLock = false;
    }

    if (result && result.success) {
      safeSetStorage(STORAGE_LAST_RECORD_SUBMIT_KEY, signature);
      clearPendingRecordSubmitSignature();
      cleanupRankedStateAfterRecordSubmit(manager, payload);
      refreshLeaderboardsAfterRecordSubmit(payload && payload.mode_key);
      return;
    }

    var errorText = toText(result && result.error ? result.error : "record_submit_failed");
    if (isRankedSessionExpiredResult(result)) {
      clearPendingRecordSubmitSignature();
      handleRankedSessionExpired(manager, modeKey);
      return;
    }
    if (isUnauthorizedSubmitErrorText(errorText)) {
      clearAuthSessionOnly();
      return;
    }
    if (!isTransientRecordSubmitErrorText(errorText)) {
      markRecordSubmitSignatureHandled(signature);
      clearPendingRecordSubmitSignature();
    }
  }

  function isUnauthorizedSubmitErrorText(errorTextLike) {
    var text = toText(errorTextLike).trim().toLowerCase();
    if (!text) return false;
    return text.indexOf("unauthorized") >= 0 || text.indexOf("token") >= 0;
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
    if (isUnauthorizedSubmitErrorText(errorText)) {
      clearAuthSessionOnly();
      return result;
    }
    if (!isTransientOnlineSubmitErrorText(errorText)) {
      clearPendingScoreSubmitState();
    }
    return result;
  }

  async function retryPendingRecordSubmit(options) {
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
      clearPendingRecordSubmitSignature();
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
        keepalive: opts.keepalive === true
      });
    } finally {
      recordSubmitLock = false;
    }

    if (result && result.success) {
      safeSetStorage(STORAGE_LAST_RECORD_SUBMIT_KEY, pendingState.signature);
      clearPendingRecordSubmitSignature();
      var currentManager = global.game_manager;
      cleanupRankedStateAfterRecordSubmit(currentManager, pendingState.payload);
      refreshLeaderboardsAfterRecordSubmit(pendingState.payload && pendingState.payload.mode_key);
      return result;
    }

    var errorText = toText(result && result.error ? result.error : "record_submit_failed");
    if (isRankedSessionExpiredResult(result)) {
      var expiredModeKey = toText(pendingState.payload && pendingState.payload.mode_key).trim() || getCurrentModeKey();
      var expiredManager = global.game_manager;
      if (expiredManager && toText(expiredManager.modeKey || expiredManager.mode).trim() !== expiredModeKey) {
        expiredManager = null;
      }
      clearPendingRecordSubmitSignature();
      handleRankedSessionExpired(expiredManager, expiredModeKey);
      return result;
    }
    if (isUnauthorizedSubmitErrorText(errorText)) {
      clearAuthSessionOnly();
      return result;
    }
    if (!isTransientRecordSubmitErrorText(errorText)) {
      markRecordSubmitSignatureHandled(pendingState.signature);
      clearPendingRecordSubmitSignature();
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
    if (isUnauthorizedSubmitErrorText(errorText)) {
      clearAuthSessionOnly();
      return result;
    }
    if (!isTransientOnlineSubmitErrorText(errorText)) {
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
    if (isUnauthorizedSubmitErrorText(errorText)) {
      clearAuthSessionOnly();
      return;
    }
    if (!isTransientOnlineSubmitErrorText(errorText)) {
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

  function triggerImmediateOnlineSubmit() {
    runPromiseSafely(function () {
      return maybeSubmitRecordOnGameOver();
    });
    runPromiseSafely(function () {
      return maybeSubmitScoreOnGameOver();
    });
    runPromiseSafely(function () {
      return maybeSubmitStone2kRun();
    });
  }

  function wrapOnlineSubmitHook(manager, methodName, timing) {
    if (!manager || typeof manager[methodName] !== "function") return;
    var original = manager[methodName];
    if (original && original.__onlineImmediateSubmitHooked === true) return;

    var wrapped = function () {
      var currentManager = this || manager;
      if (timing === "before") {
        triggerImmediateOnlineSubmit();
        if (
          methodName === "restart" ||
          methodName === "restartWithSeed" ||
          methodName === "restartWithBoard"
        ) {
          if (!prepareRankedSessionForRestart(currentManager)) {
            beginAsyncRankedRestart(
              currentManager,
              original,
              this,
              Array.prototype.slice.call(arguments),
              { afterConfirmation: methodName === "restart" }
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
        triggerImmediateOnlineSubmit();
        if (methodName === "move" && currentManager.rankCheckpointApplying !== true) {
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

  function flushTerminalSubmitOnPageHide() {
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
      return retryPendingRecordSubmit({ forcePendingRetry: true });
    });
    runPromiseSafely(function () {
      return retryPendingScoreSubmit({ forcePendingRetry: true });
    });
    runPromiseSafely(function () {
      return syncAccountBestScoreForCurrentMode({ force: true });
    });
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
    scheduleRankedCheckpointRestore: scheduleRankedCheckpointRestore,
    persistRankedCheckpointOnPageHide: persistRankedCheckpointOnPageHide
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);

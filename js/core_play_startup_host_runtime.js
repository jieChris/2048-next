(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";
  var DEFAULT_INVALID_MODE_REDIRECT_URL = "play.html?mode_key=standard_4x4_pow2_no_undo";
  var DEFAULT_INVALID_MODE_MESSAGE = "\u65e0\u6548\u6a21\u5f0f\uff0c\u5df2\u56de\u9000\u5230\u6807\u51c6\u6a21\u5f0f";
  var DEFAULT_DUPLICATE_MODE_REDIRECT_URL = "modes.html";
  var DEFAULT_DUPLICATE_MODE_MESSAGE_ZH = "\u975e\u6cd5\u64cd\u4f5c\uff1a\u4e00\u4e2a\u6a21\u5f0f\u53ea\u80fd\u5f00\u4e00\u4e2a\u9875\u9762";
  var DEFAULT_DUPLICATE_MODE_MESSAGE_EN = "Illegal operation: each mode can only be open in one page.";
  var DEFAULT_SINGLE_INSTANCE_LOCK_KEY_PREFIX = "playModeSinglePageLock:v1:";
  var DEFAULT_SINGLE_INSTANCE_TAB_ID_SESSION_KEY = "playModeSinglePageTabId:v1";
  var DEFAULT_SINGLE_INSTANCE_TTL_MS = 12000;
  var DEFAULT_SINGLE_INSTANCE_HEARTBEAT_MS = 3000;
  var DEFAULT_BOARD_WIDTH = 4;
  var UI_LANGUAGE_KEY = "ui_language_v1";

  function asPositiveInt(rawValue, fallbackValue) {
    var value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) return fallbackValue;
    return Math.floor(value);
  }

  function getModeKey(modeConfig) {
    if (!modeConfig || typeof modeConfig !== "object") return "";
    if (!Object.prototype.hasOwnProperty.call(modeConfig, "key")) return "";
    var modeKey = modeConfig.key;
    return typeof modeKey === "string" ? modeKey : "";
  }

  function resolveLocalStorage(windowLike) {
    try {
      return windowLike && windowLike.localStorage ? windowLike.localStorage : null;
    } catch (_err) {
      return null;
    }
  }

  function resolveSessionStorage(windowLike) {
    try {
      return windowLike && windowLike.sessionStorage ? windowLike.sessionStorage : null;
    } catch (_err) {
      return null;
    }
  }

  function readStorageItemSafe(storageLike, key) {
    if (!(storageLike && typeof storageLike.getItem === "function")) return null;
    try {
      return storageLike.getItem(key);
    } catch (_err) {
      return null;
    }
  }

  function writeStorageItemSafe(storageLike, key, value) {
    if (!(storageLike && typeof storageLike.setItem === "function")) return false;
    try {
      storageLike.setItem(key, value);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function removeStorageItemSafe(storageLike, key) {
    if (!(storageLike && typeof storageLike.removeItem === "function")) return false;
    try {
      storageLike.removeItem(key);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function readStorageJsonObjectSafe(storageLike, key) {
    var raw = readStorageItemSafe(storageLike, key);
    if (!(typeof raw === "string" && raw)) return null;
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_err) {
      return null;
    }
  }

  function writeStorageJsonObjectSafe(storageLike, key, payload) {
    if (!(payload && typeof payload === "object")) return false;
    var serialized = "";
    try {
      serialized = JSON.stringify(payload);
    } catch (_errJson) {
      serialized = "";
    }
    if (!serialized) return false;
    return writeStorageItemSafe(storageLike, key, serialized);
  }

  function normalizePlayStartupLanguage(value) {
    var lang = String(value || "").trim().toLowerCase();
    if (lang.indexOf("en") === 0) return "en";
    if (lang.indexOf("zh") === 0) return "zh";
    return "";
  }

  function resolvePlayStartupLanguage(windowLike) {
    var lang = "";
    try {
      var i18n = windowLike && windowLike.UII18N ? windowLike.UII18N : null;
      if (i18n && typeof i18n.getLanguage === "function") {
        lang = normalizePlayStartupLanguage(i18n.getLanguage());
        if (lang) return lang;
      }
    } catch (_errI18n) {}
    try {
      lang = normalizePlayStartupLanguage(
        readStorageItemSafe(resolveLocalStorage(windowLike), UI_LANGUAGE_KEY)
      );
      if (lang) return lang;
    } catch (_errStorage) {}
    try {
      var documentLike = windowLike && windowLike.document ? windowLike.document : null;
      if (!documentLike && typeof document !== "undefined") documentLike = document;
      var root = documentLike && documentLike.documentElement ? documentLike.documentElement : null;
      if (root && typeof root.getAttribute === "function") {
        lang = normalizePlayStartupLanguage(
          root.getAttribute("data-ui-lang") || root.getAttribute("lang")
        );
        if (lang) return lang;
      }
    } catch (_errDocument) {}
    return "zh";
  }

  function resolveDuplicateModeMessage(windowLike, configuredMessage) {
    if (typeof configuredMessage === "string" && configuredMessage) return configuredMessage;
    return resolvePlayStartupLanguage(windowLike) === "en"
      ? DEFAULT_DUPLICATE_MODE_MESSAGE_EN
      : DEFAULT_DUPLICATE_MODE_MESSAGE_ZH;
  }

  var startupRandomIdFallbackCounter = 0;

  function createStartupRandomId(prefix) {
    if (
      global &&
      global.CoreCryptoRandomRuntime &&
      typeof global.CoreCryptoRandomRuntime.randomId === "function"
    ) {
      return global.CoreCryptoRandomRuntime.randomId(prefix, { length: 10 });
    }
    startupRandomIdFallbackCounter = (startupRandomIdFallbackCounter + 1) >>> 0;
    return String(prefix || "id") + "_" + Date.now().toString(36) + "_" +
      startupRandomIdFallbackCounter.toString(36).padStart(10, "0");
  }

  function createSinglePageLockToken() {
    return createStartupRandomId("lock");
  }

  function resolveSinglePageWindowInstanceId(windowLike) {
    if (
      windowLike &&
      typeof windowLike.__playSinglePageWindowInstanceId === "string" &&
      windowLike.__playSinglePageWindowInstanceId
    ) {
      return windowLike.__playSinglePageWindowInstanceId;
    }
    var instanceId = createStartupRandomId("win");
    if (windowLike) {
      windowLike.__playSinglePageWindowInstanceId = instanceId;
    }
    return instanceId;
  }

  function normalizeLockRecord(rawValue) {
    var source = rawValue && typeof rawValue === "object" ? rawValue : null;
    if (!source) return null;
    var tabId = typeof source.tab_id === "string" ? source.tab_id : "";
    var token = typeof source.token === "string" ? source.token : "";
    var modeKey = typeof source.mode_key === "string" ? source.mode_key : "";
    var instanceId = typeof source.instance_id === "string" ? source.instance_id : "";
    var updatedAt = Math.floor(Number(source.updated_at) || 0);
    if (!tabId || !token || !modeKey || updatedAt <= 0) return null;
    return {
      tabId: tabId,
      token: token,
      modeKey: modeKey,
      instanceId: instanceId,
      updatedAt: updatedAt
    };
  }

  function readSinglePageLockRecord(storageLike, lockStorageKey) {
    return normalizeLockRecord(readStorageJsonObjectSafe(storageLike, lockStorageKey));
  }

  function isSinglePageLockFresh(lockRecord, nowMs, ttlMs) {
    if (!lockRecord) return false;
    return (nowMs - lockRecord.updatedAt) <= ttlMs;
  }

  function isSinglePageLockOwnedBy(lockRecord, tabId, token, instanceId) {
    if (!lockRecord) return false;
    if (lockRecord.tabId !== tabId || lockRecord.token !== token) return false;
    if (!(typeof lockRecord.instanceId === "string" && lockRecord.instanceId)) return true;
    return lockRecord.instanceId === instanceId;
  }

  function resolveSinglePageTabId(windowLike, sessionTabIdKey) {
    if (
      windowLike &&
      typeof windowLike.__playSinglePageTabId === "string" &&
      windowLike.__playSinglePageTabId
    ) {
      return windowLike.__playSinglePageTabId;
    }
    var sessionStorageLike = resolveSessionStorage(windowLike);
    var sessionKey = String(sessionTabIdKey || DEFAULT_SINGLE_INSTANCE_TAB_ID_SESSION_KEY);
    var tabId = readStorageItemSafe(sessionStorageLike, sessionKey);
    if (!(typeof tabId === "string" && tabId)) {
      tabId = createStartupRandomId("tab");
      writeStorageItemSafe(sessionStorageLike, sessionKey, tabId);
    }
    if (!(typeof tabId === "string" && tabId)) {
      tabId = createStartupRandomId("tab");
    }
    if (windowLike) {
      windowLike.__playSinglePageTabId = tabId;
    }
    return tabId;
  }

  function releaseSinglePageModeLock(lockState) {
    if (!lockState) return;
    if (lockState.heartbeatId && typeof lockState.windowLike.clearInterval === "function") {
      lockState.windowLike.clearInterval(lockState.heartbeatId);
      lockState.heartbeatId = 0;
    }
    if (lockState.windowLike && typeof lockState.windowLike.removeEventListener === "function") {
      if (typeof lockState.beforeUnloadHandler === "function") {
        lockState.windowLike.removeEventListener("beforeunload", lockState.beforeUnloadHandler);
      }
      if (typeof lockState.pageHideHandler === "function") {
        lockState.windowLike.removeEventListener("pagehide", lockState.pageHideHandler);
      }
      if (typeof lockState.storageHandler === "function") {
        lockState.windowLike.removeEventListener("storage", lockState.storageHandler);
      }
    }
    var latest = readSinglePageLockRecord(lockState.storageLike, lockState.lockStorageKey);
    if (isSinglePageLockOwnedBy(latest, lockState.tabId, lockState.token, lockState.instanceId)) {
      removeStorageItemSafe(lockState.storageLike, lockState.lockStorageKey);
    }
    if (
      lockState.windowLike &&
      lockState.windowLike.__playSinglePageModeLockState === lockState
    ) {
      lockState.windowLike.__playSinglePageModeLockState = null;
    }
  }

  function enforceDuplicateModeGuard(windowLike, message, redirectUrl) {
    if (windowLike && typeof windowLike.alert === "function") {
      windowLike.alert(message);
    }
    var locationLike = windowLike && windowLike.location ? windowLike.location : null;
    if (locationLike) {
      locationLike.href = redirectUrl;
    }
  }

  function acquireSinglePageModeLock(options) {
    var opts = options || {};
    var windowLike = opts.windowLike || null;
    var modeKey = typeof opts.modeKey === "string" ? opts.modeKey : "";
    if (!(windowLike && modeKey)) return { ok: true };

    var storageLike = resolveLocalStorage(windowLike);
    if (!storageLike) return { ok: true };

    var existingState =
      windowLike && windowLike.__playSinglePageModeLockState
        ? windowLike.__playSinglePageModeLockState
        : null;
    if (existingState && existingState.modeKey === modeKey) {
      return { ok: true };
    }
    if (existingState) {
      releaseSinglePageModeLock(existingState);
    }

    var lockKeyPrefix = String(opts.lockKeyPrefix || DEFAULT_SINGLE_INSTANCE_LOCK_KEY_PREFIX);
    var lockStorageKey = lockKeyPrefix + modeKey;
    var ttlMs = asPositiveInt(opts.ttlMs, DEFAULT_SINGLE_INSTANCE_TTL_MS);
    var heartbeatMs = asPositiveInt(opts.heartbeatMs, DEFAULT_SINGLE_INSTANCE_HEARTBEAT_MS);
    var nowMs = Date.now();
    var tabId = resolveSinglePageTabId(windowLike, opts.sessionTabIdKey);
    var instanceId = resolveSinglePageWindowInstanceId(windowLike);

    var currentRecord = readSinglePageLockRecord(storageLike, lockStorageKey);
    if (
      currentRecord &&
      currentRecord.instanceId !== instanceId &&
      isSinglePageLockFresh(currentRecord, nowMs, ttlMs)
    ) {
      return { ok: false };
    }

    var token = createSinglePageLockToken();
    var nextRecord = {
      tab_id: tabId,
      token: token,
      mode_key: modeKey,
      instance_id: instanceId,
      updated_at: nowMs
    };
    if (!writeStorageJsonObjectSafe(storageLike, lockStorageKey, nextRecord)) {
      return { ok: true };
    }

    var confirmedRecord = readSinglePageLockRecord(storageLike, lockStorageKey);
    if (!isSinglePageLockOwnedBy(confirmedRecord, tabId, token, instanceId)) {
      return { ok: false };
    }

    var conflictCallback =
      typeof opts.onConflict === "function"
        ? opts.onConflict
        : null;

    var lockState = {
      windowLike: windowLike,
      storageLike: storageLike,
      lockStorageKey: lockStorageKey,
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

    function releaseCurrentLockState() {
      releaseSinglePageModeLock(lockState);
    }

    function handleOwnershipConflict() {
      if (lockState.conflictHandled) return;
      lockState.conflictHandled = true;
      releaseCurrentLockState();
      if (conflictCallback) {
        conflictCallback();
      }
    }

    function heartbeatLock() {
      var latest = readSinglePageLockRecord(storageLike, lockStorageKey);
      if (!isSinglePageLockOwnedBy(latest, tabId, token, instanceId)) {
        handleOwnershipConflict();
        return;
      }
      writeStorageJsonObjectSafe(storageLike, lockStorageKey, {
        tab_id: tabId,
        token: token,
        mode_key: modeKey,
        instance_id: instanceId,
        updated_at: Date.now()
      });
    }

    function onStorageChanged(eventLike) {
      if (!eventLike || eventLike.key !== lockStorageKey) return;
      var latest = readSinglePageLockRecord(storageLike, lockStorageKey);
      if (!isSinglePageLockOwnedBy(latest, tabId, token, instanceId)) {
        handleOwnershipConflict();
      }
    }

    lockState.beforeUnloadHandler = releaseCurrentLockState;
    lockState.pageHideHandler = releaseCurrentLockState;
    lockState.storageHandler = onStorageChanged;

    if (typeof windowLike.addEventListener === "function") {
      windowLike.addEventListener("beforeunload", lockState.beforeUnloadHandler);
      windowLike.addEventListener("pagehide", lockState.pageHideHandler);
      windowLike.addEventListener("storage", lockState.storageHandler);
    }
    if (typeof windowLike.setInterval === "function") {
      lockState.heartbeatId = windowLike.setInterval(heartbeatLock, heartbeatMs);
    }

    windowLike.__playSinglePageModeLockState = lockState;
    return { ok: true };
  }

  function resolvePlayStartupFromContext(options) {
    var opts = options || {};
    var windowLike = opts.windowLike || null;
    var locationLike = windowLike && windowLike.location ? windowLike.location : null;
    var invalidModeRedirectUrl = String(
      opts.invalidModeRedirectUrl || DEFAULT_INVALID_MODE_REDIRECT_URL
    );
    var invalidModeMessage = String(opts.invalidModeMessage || DEFAULT_INVALID_MODE_MESSAGE);
    var duplicateModeRedirectUrl = String(
      opts.duplicateModeRedirectUrl || DEFAULT_DUPLICATE_MODE_REDIRECT_URL
    );
    var duplicateModeMessage = resolveDuplicateModeMessage(windowLike, opts.duplicateModeMessage);
    var defaultModeKey = String(opts.defaultModeKey || DEFAULT_MODE_KEY);
    var defaultBoardWidth = Number(opts.defaultBoardWidth || DEFAULT_BOARD_WIDTH);
    var searchLike = String((locationLike && locationLike.search) || "");

    var entryPlan = opts.resolveEntryPlan({
      searchLike: searchLike,
      modeCatalog: windowLike ? windowLike.ModeCatalog : undefined,
      defaultModeKey: defaultModeKey,
      invalidModeRedirectUrl: invalidModeRedirectUrl
    });
    var startupContext = opts.resolveStartupContext({
      entryPlan: entryPlan,
      invalidModeRedirectUrl: invalidModeRedirectUrl,
      invalidModeMessage: invalidModeMessage,
      resolveModeConfig: opts.resolveModeConfig,
      resolveGuardState: opts.resolveGuardState
    });

    if (!startupContext || startupContext.kind === "abort") {
      var shouldAlert = !!(startupContext && startupContext.shouldAlert);
      var alertMessage = String(
        (startupContext && startupContext.alertMessage) || invalidModeMessage
      );
      var redirectUrl = String(
        (startupContext && startupContext.redirectUrl) || invalidModeRedirectUrl
      );

      if (shouldAlert && windowLike && typeof windowLike.alert === "function") {
        windowLike.alert(alertMessage);
      }
      if (locationLike) {
        locationLike.href = redirectUrl;
      }
      return null;
    }

    var modeConfig = startupContext.modeConfig;
    var singlePageLockResult = acquireSinglePageModeLock({
      windowLike: windowLike,
      modeKey: getModeKey(modeConfig),
      lockKeyPrefix: opts.singleInstanceLockKeyPrefix || DEFAULT_SINGLE_INSTANCE_LOCK_KEY_PREFIX,
      sessionTabIdKey:
        opts.singleInstanceTabIdSessionKey || DEFAULT_SINGLE_INSTANCE_TAB_ID_SESSION_KEY,
      ttlMs: opts.singleInstanceTtlMs || DEFAULT_SINGLE_INSTANCE_TTL_MS,
      heartbeatMs: opts.singleInstanceHeartbeatMs || DEFAULT_SINGLE_INSTANCE_HEARTBEAT_MS,
      onConflict: function () {
        enforceDuplicateModeGuard(windowLike, duplicateModeMessage, duplicateModeRedirectUrl);
      }
    });
    if (!singlePageLockResult || singlePageLockResult.ok !== true) {
      enforceDuplicateModeGuard(windowLike, duplicateModeMessage, duplicateModeRedirectUrl);
      return null;
    }

    var challengeId = String(startupContext.challengeId || "");
    if (windowLike) {
      windowLike.GAME_MODE_CONFIG = modeConfig;
      windowLike.GAME_CHALLENGE_CONTEXT = opts.resolveChallengeContext({
        challengeId: challengeId,
        modeConfig: modeConfig,
        existingContext: windowLike.GAME_CHALLENGE_CONTEXT
      });
    }
    opts.applyHeader(modeConfig);

    var startupPayload = opts.resolveStartupPayload({
      modeConfig: modeConfig,
      inputManagerCtor: opts.inputManagerCtor,
      defaultBoardWidth: defaultBoardWidth
    });
    if (startupPayload) return startupPayload;

    return {
      modeKey: getModeKey(modeConfig),
      modeConfig: modeConfig,
      inputManagerCtor: opts.inputManagerCtor,
      defaultBoardWidth: defaultBoardWidth
    };
  }

  global.CorePlayStartupHostRuntime = global.CorePlayStartupHostRuntime || {};
  global.CorePlayStartupHostRuntime.resolvePlayStartupFromContext = resolvePlayStartupFromContext;
})(typeof window !== "undefined" ? window : undefined);

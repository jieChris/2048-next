function isCoreCallAvailable(coreCallResult) {
  return !!(coreCallResult && coreCallResult.available === true);
}

function resolveCoreObjectCallOrFallback(manager, coreCallResult, fallbackResolver) {
  if (!manager) return null;
  var coreValue = manager.isCoreCallAvailable(coreCallResult)
    ? (coreCallResult.value || {})
    : null;
  if (coreValue) return coreValue;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return null;
}

function resolveCoreBooleanCallOrFallback(manager, coreCallResult, fallbackResolver) {
  if (!manager) return null;
  var coreValue = manager.isCoreCallAvailable(coreCallResult)
    ? !!coreCallResult.value
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return !!fallbackResolver.call(manager);
  return null;
}

function resolveCoreNumericCallOrFallback(manager, coreCallResult, fallbackResolver) {
  if (!manager) return null;
  var coreValue = manager.isCoreCallAvailable(coreCallResult)
    ? (Number(coreCallResult.value) || 0)
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return Number(fallbackResolver.call(manager)) || 0;
  return null;
}

function resolveCoreStringCallOrFallback(manager, coreCallResult, fallbackResolver, allowEmpty) {
  if (!manager) return null;
  var coreValue = null;
  if (manager.isCoreCallAvailable(coreCallResult)) {
    var rawCoreString = coreCallResult.value;
    if (typeof rawCoreString === "string") {
      coreValue = allowEmpty === true ? rawCoreString : (rawCoreString || null);
    }
  }
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return String(fallbackResolver.call(manager));
  return null;
}

function resolveNormalizedCoreValueOrUndefined(manager, coreCallResult, normalizer) {
  if (!manager) return undefined;
  if (!manager.isCoreCallAvailable(coreCallResult)) return undefined;
  if (typeof normalizer !== "function") return coreCallResult.value;
  return normalizer.call(manager, coreCallResult.value);
}

function resolveNormalizedCoreValueOrFallback(
  manager,
  coreCallResult,
  normalizer,
  fallbackResolver
) {
  if (!manager) return undefined;
  var normalized = manager.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer);
  if (typeof normalized !== "undefined" && normalized !== null) return normalized;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return normalized;
}

function resolveNormalizedCoreValueOrFallbackAllowNull(
  manager,
  coreCallResult,
  normalizer,
  fallbackResolver
) {
  if (!manager) return undefined;
  var normalized = manager.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer);
  if (typeof normalized !== "undefined") return normalized;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return normalized;
}

function resolveCoreRawCallValueOrUndefined(manager, coreCallResult) {
  if (!manager) return undefined;
  if (!manager.isCoreCallAvailable(coreCallResult)) return undefined;
  return coreCallResult.value;
}

function tryHandleCoreRawValue(manager, coreCallResult, handler) {
  if (!manager) return false;
  var coreValue = manager.resolveCoreRawCallValueOrUndefined(coreCallResult);
  if (typeof coreValue === "undefined") return false;
  if (typeof handler === "function") {
    handler.call(manager, coreValue);
  }
  return true;
}

function isNonArrayObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function createCoreModeDefaultsPayload(payload) {
  var source = payload && typeof payload === "object" ? payload : {};
  return Object.assign(
    {
      defaultModeKey: GameManager.DEFAULT_MODE_KEY
    },
    source
  );
}

function createCoreModeContextPayload(manager, payload) {
  if (!manager) return createCoreModeDefaultsPayload(payload);
  var source = payload && typeof payload === "object" ? payload : {};
  return manager.createCoreModeDefaultsPayload(
    Object.assign(
      {
        currentModeKey: manager.modeKey,
        currentMode: manager.mode
      },
      source
    )
  );
}

function createUnavailableCoreCallResult() {
  return {
    available: false,
    value: null
  };
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeClonePlain(manager, value, fallback) {
  if (!manager) return fallback;
  try {
    return manager.clonePlain(value);
  } catch (_err) {
    return fallback;
  }
}

function hasOwnKey(target, key) {
  if (!target || (typeof target !== "object" && typeof target !== "function")) return false;
  return Object.prototype.hasOwnProperty.call(target, key);
}

function readOptionValue(manager, options, key, fallbackValue) {
  if (!manager) return fallbackValue;
  if (!options || typeof options !== "object") return fallbackValue;
  return manager.hasOwnKey(options, key) ? options[key] : fallbackValue;
}

function encodeReplay128(manager, code) {
  if (!manager) throw "Invalid replay code";
  var encodeReplay128Core = manager.callCoreReplayCodecRuntime(
    "encodeReplay128",
    [code]
  );
  return manager.resolveCoreStringCallOrFallback(encodeReplay128Core, function () {
    if (!Number.isInteger(code) || code < 0 || code >= GameManager.REPLAY128_TOTAL) {
      throw "Invalid replay code";
    }
    if (code < GameManager.REPLAY128_ASCII_COUNT) {
      return String.fromCharCode(GameManager.REPLAY128_ASCII_START + code);
    }
    return String.fromCharCode(
      GameManager.REPLAY128_EXTRA_CODES[code - GameManager.REPLAY128_ASCII_COUNT]
    );
  });
}

function decodeReplay128(manager, char) {
  if (!manager) throw "Invalid replay char";
  var decodeReplay128Core = manager.callCoreReplayCodecRuntime(
    "decodeReplay128",
    [char]
  );
  return manager.resolveNormalizedCoreValueOrFallback(decodeReplay128Core, function (coreValue) {
    var token = Number(coreValue);
    return Number.isInteger(token) && token >= 0 && token < GameManager.REPLAY128_TOTAL
      ? token
      : undefined;
  }, function () {
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
  });
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

function isBlockedCell(manager, x, y) {
  if (!manager) return false;
  return !!(manager.blockedCellSet && manager.blockedCellSet[x + ":" + y]);
}

function isFibonacciMode(manager) {
  if (!manager) return false;
  return manager.ruleset === "fibonacci";
}

function resolveProvidedCappedModeState(manager, cappedState) {
  if (!manager) return { isCappedMode: false, cappedTargetValue: null, isProgressiveCapped64Mode: false };
  if (cappedState && typeof cappedState === "object") return cappedState;
  return manager.resolveCappedModeState();
}

function setCapped64RowVisible(manager, value, visible) {
  if (!manager) return;
  manager.setTimerRowVisibleState(value, visible, true);
}

function isProgressiveCapped64UnlockValue(value) {
  return value === 16 || value === 32 || value === 64;
}

function resolveSavedGameStateStorageKey(manager, keyPrefix, modeKey) {
  if (!manager) return null;
  var resolveSavedGameStateStorageKeyCore = manager.callCoreStorageRuntime(
    "resolveSavedGameStateStorageKey",
    [manager.createCoreModeContextPayload({
      modeKey: modeKey,
      keyPrefix: typeof keyPrefix === "string" ? keyPrefix : ""
    })]
  );
  return manager.resolveCoreStringCallOrFallback(resolveSavedGameStateStorageKeyCore, function () {
    var key = (typeof modeKey === "string" && modeKey)
      ? modeKey
      : (manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY);
    return (typeof keyPrefix === "string" ? keyPrefix : "") + key;
  });
}

function getWebStorageByName(name) {
  try {
    return (typeof window !== "undefined" && window[name]) ? window[name] : null;
  } catch (_err) {
    return null;
  }
}

function getWindowLike() {
  return typeof window !== "undefined" ? window : null;
}

function canReadFromStorage(storage) {
  return !!(storage && typeof storage.getItem === "function");
}

function canWriteToStorage(storage) {
  return !!(storage && typeof storage.setItem === "function");
}

function resolveWindowMethod(manager, methodName) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  if (!windowLike || typeof methodName !== "string" || !methodName) return null;
  var method = windowLike[methodName];
  if (typeof method !== "function") return null;
  return {
    windowLike: windowLike,
    method: method
  };
}

function callWindowMethod(manager, methodName, args) {
  if (!manager) return false;
  var resolved = resolveWindowMethod(manager, methodName);
  if (!resolved) return false;
  resolved.method.apply(resolved.windowLike, Array.isArray(args) ? args : []);
  return true;
}

function resolveWindowNamespaceMethod(manager, namespaceName, methodName) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  if (!windowLike) return null;
  if (typeof namespaceName !== "string" || !namespaceName) return null;
  if (typeof methodName !== "string" || !methodName) return null;
  var scope = windowLike[namespaceName];
  if (!scope || (typeof scope !== "object" && typeof scope !== "function")) return null;
  var method = scope[methodName];
  if (typeof method !== "function") return null;
  return {
    windowLike: windowLike,
    scope: scope,
    method: method
  };
}

function callWindowNamespaceMethod(manager, namespaceName, methodName, args) {
  if (!manager) return false;
  var resolved = resolveWindowNamespaceMethod(manager, namespaceName, methodName);
  if (!resolved) return false;
  resolved.method.apply(resolved.scope, Array.isArray(args) ? args : []);
  return true;
}

function requestAnimationFrameByManager(manager, callback) {
  if (!manager) return false;
  if (typeof callback !== "function") return false;
  var raf = resolveWindowMethod(manager, "requestAnimationFrame");
  if (raf) {
    raf.method.call(raf.windowLike, callback);
    return true;
  }
  callback();
  return false;
}

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
  var readStorageJsonMapFromContextCore = manager.callCoreStorageRuntime(
    "readStorageJsonMapFromContext",
    [{
      windowLike: manager.getWindowLike(),
      key: key
    }]
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    readStorageJsonMapFromContextCore,
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
  var writeStorageJsonPayloadFromContextCore = manager.callCoreStorageRuntime(
    "writeStorageJsonPayloadFromContext",
    [{
      windowLike: manager.getWindowLike(),
      key: key,
      payload: payload
    }]
  );
  return manager.resolveCoreBooleanCallOrFallback(writeStorageJsonPayloadFromContextCore, function () {
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
  });
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
  var getSavedGameStateStoragesFromContextCore = manager.callCoreStorageRuntime(
    "getSavedGameStateStoragesFromContext",
    [{
      windowLike: manager.getWindowLike()
    }]
  );
  var normalizedByCore = manager.resolveNormalizedCoreValueOrUndefined(
    getSavedGameStateStoragesFromContextCore,
    function (storagesByCore) {
      return Array.isArray(storagesByCore) ? storagesByCore : null;
    }
  );
  if (normalizedByCore) return normalizedByCore;
  return getSavedGameStateStoragesFallback(manager);
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

function readSavedPayloadByKey(manager, key) {
  if (!manager) return null;
  var stores = manager.getSavedGameStateStorages();
  var readSavedPayloadByKeyFromStoragesCore = manager.callCoreStorageRuntime(
    "readSavedPayloadByKeyFromStorages",
    [{
      storages: Array.isArray(stores) ? stores : [],
      key: key
    }]
  );
  var normalizedByCore = manager.resolveNormalizedCoreValueOrUndefined(
    readSavedPayloadByKeyFromStoragesCore,
    function (savedByCore) {
      if (manager.isNonArrayObject(savedByCore)) return savedByCore;
      if (savedByCore === null) return null;
      return undefined;
    }
  );
  if (typeof normalizedByCore !== "undefined") return normalizedByCore;
  return readSavedPayloadByKeyFallback(manager, stores, key);
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
    if (!map || typeof map !== "object") return null;
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
  if (!payload || typeof payload !== "object") {
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
  var writeSavedPayloadToWindowNameCore = manager.callCoreStorageRuntime(
    "writeSavedPayloadToWindowName",
    [Object.assign(
      {},
      manager.createCoreModeContextPayload({
        windowLike: windowLike,
        windowNameKey: GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY,
        modeKey: modeKey
      }),
      { payload: payload }
    )]
  );
  var normalizedByCore = manager.resolveNormalizedCoreValueOrUndefined(
    writeSavedPayloadToWindowNameCore,
    function (writtenByCore) {
      return typeof writtenByCore === "boolean" ? writtenByCore : undefined;
    }
  );
  if (typeof normalizedByCore !== "undefined") return normalizedByCore;
  return writeWindowNameSavedPayloadFallback(manager, windowLike, modeKey, payload);
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
  var shouldUseSavedGameStateCore = manager.callCoreStorageRuntime(
    "shouldUseSavedGameStateFromContext",
    [{
      hasWindow: !!manager.getWindowLike(),
      replayMode: manager.replayMode,
      pathname: pathname
    }]
  );
  return manager.resolveCoreBooleanCallOrFallback(shouldUseSavedGameStateCore, function () {
    if (!manager.getWindowLike()) return false;
    if (manager.replayMode) return false;
    return pathname.indexOf("replay.html") === -1;
  });
}

function saveGameState(manager, options) {
  if (!manager) return;
  return saveGameStateImpl.call(manager, options);
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
  var removeKeysFromStoragesCore = manager.callCoreStorageRuntime(
    "removeKeysFromStorages",
    [{
      storages: stores,
      keys: keys
    }]
  );
  if (manager.resolveCoreBooleanCallOrFallback(removeKeysFromStoragesCore, function () {
    return false;
  })) return;
  removeSavedGameStateKeysFallback(stores, keys);
}

function resolveSavedDynamicTimerRowInfo(rowState) {
  return {
    repeat: parseInt(rowState && rowState.repeat, 10),
    labelText: rowState && typeof rowState.label === "string" ? rowState.label : "",
    timeText: rowState && typeof rowState.time === "string" ? rowState.time : "",
    labelClass: rowState && typeof rowState.labelClass === "string" ? rowState.labelClass : "",
    labelFontSize: rowState && typeof rowState.labelFontSize === "string" ? rowState.labelFontSize : ""
  };
}

function shouldApplySavedDynamicTimerRepeat(rowInfo) {
  return !!(rowInfo && Number.isFinite(rowInfo.repeat) && rowInfo.repeat >= 2);
}

function createSavedDynamicTimerRowContainer(rowInfo) {
  var rowDiv = document.createElement("div");
  rowDiv.className = "timer-row-item";
  if (shouldApplySavedDynamicTimerRepeat(rowInfo)) {
    rowDiv.setAttribute("data-capped-repeat", String(rowInfo.repeat));
  }
  return rowDiv;
}

function createSavedDynamicTimerLegendElement(manager, rowInfo, resolvedCappedState) {
  if (!manager) return null;
  var legend = document.createElement("div");
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

function createSavedDynamicTimerValueElement(rowInfo) {
  var val = document.createElement("div");
  val.className = "timertile";
  val.style.cssText = "margin-left:6px; width:187px;";
  val.textContent = rowInfo.timeText;
  return val;
}

function appendSavedDynamicTimerRowChildren(rowDiv, legend, val) {
  if (!rowDiv || !legend || !val) return;
  rowDiv.appendChild(legend);
  rowDiv.appendChild(val);
  rowDiv.appendChild(document.createElement("br"));
  rowDiv.appendChild(document.createElement("br"));
}

function createSavedDynamicTimerRow(manager, rowState, cappedState) {
  if (!manager) return null;
  var resolvedCappedState =
    manager.resolveProvidedCappedModeState(cappedState);
  var rowInfo = resolveSavedDynamicTimerRowInfo(rowState);
  var rowDiv = createSavedDynamicTimerRowContainer(rowInfo);
  var legend = createSavedDynamicTimerLegendElement(manager, rowInfo, resolvedCappedState);
  var val = createSavedDynamicTimerValueElement(rowInfo);
  appendSavedDynamicTimerRowChildren(rowDiv, legend, val);
  return rowDiv;
}

function normalizeCappedRepeatLegendClasses(manager, cappedState) {
  if (!manager) return;
  if (typeof document === "undefined") return;
  var resolvedCappedState =
    manager.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return;
  var rows = document.querySelectorAll("#timerbox [data-capped-repeat]");
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
  var out = {};
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
    var row = manager.getTimerRowEl(slotId);
    var timerEl = document.getElementById("timer" + slotId);
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

function captureTimerDynamicRowsStateForSave(containerId) {
  var out = [];
  var container = document.getElementById(containerId);
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

function captureTimerSubStateForSave() {
  return {
    timer_sub_8192: (document.getElementById("timer8192-sub") || {}).textContent || "",
    timer_sub_16384: (document.getElementById("timer16384-sub") || {}).textContent || "",
    timer_sub_visible: (((document.getElementById("timer32k-sub-container") || {}).style) || {}).display === "block"
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
  var subState = timerSubState && typeof timerSubState === "object" ? timerSubState : {};
  return {
    timer_module_view: manager.getTimerModuleViewMode ? manager.getTimerModuleViewMode() : "timer",
    timer_fixed_rows: captureTimerFixedRowsStateForSave(manager),
    timer_dynamic_rows_capped: captureTimerDynamicRowsStateForSave("capped-timer-container"),
    timer_dynamic_rows_overflow: captureTimerDynamicRowsStateForSave("capped-timer-overflow-container"),
    timer_sub_8192: subState.timer_sub_8192,
    timer_sub_16384: subState.timer_sub_16384,
    timer_sub_visible: subState.timer_sub_visible
  };
}

function buildSavedGameStatePayload(manager, now) {
  if (!manager) return null;
  var timerSubState = captureTimerSubStateForSave();
  var basePayload = buildSavedGameStateBasePayload(manager, now);
  return Object.assign(
    basePayload,
    buildSavedGameStateRoundPayload(manager),
    buildSavedGameStateDirectionLockPayload(manager),
    buildSavedGameStateBoardSnapshotPayload(manager),
    buildSavedGameStateTimerUiPayload(manager, timerSubState)
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
  var writeSavedPayloadToStoragesCore = manager.callCoreStorageRuntime(
    "writeSavedPayloadToStorages",
    [{
      storages: stores,
      key: key,
      payload: payloadObj
    }]
  );
  var normalizedByCore = manager.resolveNormalizedCoreValueOrUndefined(
    writeSavedPayloadToStoragesCore,
    function (persistedByCore) {
      return typeof persistedByCore === "boolean" ? persistedByCore : undefined;
    }
  );
  if (typeof normalizedByCore !== "undefined") return normalizedByCore;
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

function getModeConfigFromCatalog(manager, modeKey) {
  if (!manager) return null;
  var modeCatalogGetMode = manager.resolveWindowNamespaceMethod("ModeCatalog", "getMode");
  var catalogGetMode = modeCatalogGetMode
    ? function (requestedModeId) {
        return modeCatalogGetMode.method.call(modeCatalogGetMode.scope, requestedModeId);
      }
    : null;

  var resolveModeCatalogConfigCore = manager.callCoreModeRuntime(
    "resolveModeCatalogConfig",
    [{
      modeId: modeKey,
      catalogGetMode: catalogGetMode,
      fallbackModeConfigs: GameManager.FALLBACK_MODE_CONFIGS
    }]
  );
  return manager.resolveNormalizedCoreValueOrFallbackAllowNull(resolveModeCatalogConfigCore, function (coreValue) {
    if (coreValue === null) return null;
    return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
    if (catalogGetMode) {
      return catalogGetMode(modeKey);
    }
    if (GameManager.FALLBACK_MODE_CONFIGS[modeKey]) {
      return manager.clonePlain(GameManager.FALLBACK_MODE_CONFIGS[modeKey]);
    }
    return null;
  });
}

function registerCoreRuntimeMethodResolver(methodName, runtimeGetterName) {
  GameManager.prototype[methodName] = function (coreMethodName) {
    if (!(typeof runtimeGetterName === "string" && runtimeGetterName)) return null;
    if (!(typeof coreMethodName === "string" && coreMethodName)) return null;
    var runtimeGetter = this[runtimeGetterName];
    if (typeof runtimeGetter !== "function") return null;
    var runtime = runtimeGetter.call(this);
    if (!runtime || typeof runtime !== "object") return null;
    var runtimeMethod = runtime[coreMethodName];
    if (typeof runtimeMethod !== "function") return null;
    return function () {
      return runtimeMethod.apply(runtime, arguments);
    };
  };
}

function registerCoreRuntimeGetter(methodName, runtimeName) {
  GameManager.prototype[methodName] = function () {
    var windowLike = this.getWindowLike();
    if (!windowLike || typeof windowLike !== "object") return null;
    if (!(typeof runtimeName === "string" && runtimeName)) return null;
    var runtime = windowLike[runtimeName];
    return runtime && typeof runtime === "object" ? runtime : null;
  };
}

function isValidCoreRuntimeAccessorDef(accessorDef) {
  return !!(Array.isArray(accessorDef) && accessorDef.length >= 4);
}

function registerCoreRuntimeAccessors(accessorDefs) {
  if (!Array.isArray(accessorDefs)) return;
  for (var index = 0; index < accessorDefs.length; index++) {
    var accessorDef = accessorDefs[index];
    if (!isValidCoreRuntimeAccessorDef(accessorDef)) continue;
    var callerMethodName = accessorDef[0];
    var resolverMethodName = accessorDef[1];
    var getterMethodName = accessorDef[2];
    var runtimeName = accessorDef[3];
    registerCoreRuntimeGetter(getterMethodName, runtimeName);
    registerCoreRuntimeMethodResolver(resolverMethodName, getterMethodName);
    registerCoreRuntimeCaller(callerMethodName, resolverMethodName);
  }
}

function writeStatsPanelVisibilityFlag(manager, isOpen) {
  if (!manager) return false;
  var writeStateToStorageCore = manager.callCoreStorageRuntime(
    "writeStorageFlagFromContext",
    [{
      windowLike: manager.getWindowLike(),
      key: GameManager.STATS_PANEL_VISIBLE_KEY,
      enabled: !!isOpen,
      trueValue: "1",
      falseValue: "0"
    }]
  );
  return manager.resolveCoreBooleanCallOrFallback(writeStateToStorageCore, function () {
    var storage = manager.getWebStorageByName("localStorage");
    if (!canWriteToStorage(storage)) return false;
    try {
      storage.setItem(GameManager.STATS_PANEL_VISIBLE_KEY, isOpen ? "1" : "0");
      return true;
    } catch (_err) {
      return false;
    }
  });
}

function ensureCornerStatsElement(elementId) {
  var element = document.getElementById(elementId);
  if (element) return element;
  element = document.createElement("div");
  element.id = elementId;
  if (document.body) document.body.appendChild(element);
  return element;
}

function applyBaseCornerStatsElementStyle(element) {
  if (!element) return;
  element.style.position = "fixed";
  element.style.top = "8px";
  element.style.zIndex = "1000";
  element.style.background = "transparent";
  element.style.color = "#776e65";
  element.style.fontWeight = "bold";
  element.style.fontSize = "27px";
  element.style.pointerEvents = "none";
}

function initCornerStatsUi(manager) {
  if (!manager) return;
  var rateEl = document.getElementById("stats-4-rate");
  var ipsEl = document.getElementById("stats-ips");

  if (rateEl) {
    rateEl.style.visibility = "hidden"; // Preserve layout while moving display to page corner
    manager.cornerRateEl = ensureCornerStatsElement("corner-stats-4-rate");
    applyBaseCornerStatsElementStyle(manager.cornerRateEl);
    manager.cornerRateEl.style.left = "10px";
    manager.cornerRateEl.textContent = "0.00";
  }
  if (ipsEl) {
    ipsEl.style.visibility = "hidden"; // Preserve layout while moving display to page corner
    manager.cornerIpsEl = ensureCornerStatsElement("corner-stats-ips");
    applyBaseCornerStatsElementStyle(manager.cornerIpsEl);
    manager.cornerIpsEl.style.right = "10px";
    manager.cornerIpsEl.textContent = "IPS: 0";
  }
}

function ensureStatsPanelToggleButtonElement() {
  var btn = document.getElementById("stats-panel-toggle");
  if (!btn) {
    btn = document.createElement("a");
    btn.id = "stats-panel-toggle";
  }
  btn.title = "统计";
  btn.setAttribute("aria-label", "统计");
  if (!btn.querySelector("svg")) {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
  }
  btn.className = "top-action-btn stats-panel-toggle";
  return btn;
}

function resolveStatsPanelToggleHostElements() {
  var exportBtn = document.getElementById("top-export-replay-btn");
  var practiceStatsActions = document.getElementById("practice-stats-actions");
  var topActionHost = practiceStatsActions ||
    (exportBtn && exportBtn.parentNode) ||
    document.querySelector(".heading .top-action-buttons") ||
    document.querySelector(".top-action-buttons");
  return {
    exportBtn: exportBtn,
    topActionHost: topActionHost
  };
}

function mountStatsPanelToggleButton(btn, hostElements) {
  if (!btn) return;
  var hostState = hostElements && typeof hostElements === "object" ? hostElements : {};
  var topActionHost = hostState.topActionHost || null;
  var exportBtn = hostState.exportBtn || null;
  if (topActionHost) {
    btn.classList.remove("is-floating");
    if (exportBtn && exportBtn.parentNode === topActionHost) {
      if (btn.parentNode !== topActionHost || btn.nextSibling !== exportBtn) {
        topActionHost.insertBefore(btn, exportBtn);
      }
    } else if (btn.parentNode !== topActionHost) {
      topActionHost.insertBefore(btn, topActionHost.firstChild);
    }
    return;
  }
  if (btn.parentNode !== document.body) {
    document.body.appendChild(btn);
  }
  btn.classList.add("is-floating");
}

function ensureStatsPanelOverlayElement() {
  var overlay = document.getElementById("stats-panel-overlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "stats-panel-overlay";
  overlay.className = "replay-modal-overlay";
  overlay.style.display = "none";
  overlay.innerHTML =
    "<div class='replay-modal-content stats-panel-content'>" +
    "<h3>统计汇总</h3>" +
    "<div class='stats-panel-row'><span>总步数</span><span id='stats-panel-total'>0</span></div>" +
    "<div class='stats-panel-row'><span>移动步数</span><span id='stats-panel-moves'>0</span></div>" +
    "<div class='stats-panel-row'><span>撤回步数</span><span id='stats-panel-undo'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-two-label'>出2数量</span><span id='stats-panel-two'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-four-label'>出4数量</span><span id='stats-panel-four'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-four-rate-label'>实际出4率</span><span id='stats-panel-four-rate'>0.00</span></div>" +
    "<div class='replay-modal-actions'>" +
    "<button id='stats-panel-close' class='replay-button'>关闭</button>" +
    "</div>" +
    "</div>";
  document.body.appendChild(overlay);
  return overlay;
}

function bindStatsPanelToggleButton(btn, manager) {
  if (!btn || !manager) return;
  if (btn.__statsBound) return;
  btn.__statsBound = true;
  btn.addEventListener("click", function (event) {
    event.preventDefault();
    manager.openStatsPanel();
  });
}

function bindStatsPanelCloseButton(manager) {
  if (!manager) return;
  var closeBtn = document.getElementById("stats-panel-close");
  if (!closeBtn || closeBtn.__statsBound) return;
  closeBtn.__statsBound = true;
  closeBtn.addEventListener("click", function () {
    manager.closeStatsPanel();
  });
}

function bindStatsPanelOverlayDismiss(overlay, manager) {
  if (!overlay || !manager) return;
  if (overlay.__statsBound) return;
  overlay.__statsBound = true;
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) manager.closeStatsPanel();
  });
}

function resolveStatsPanelInitialOpenFlag(manager) {
  if (!manager) return false;
  var readStorageFlagFromContextCore = manager.callCoreStorageRuntime(
    "readStorageFlagFromContext",
    [{
      windowLike: manager.getWindowLike(),
      key: GameManager.STATS_PANEL_VISIBLE_KEY,
      trueValue: "1"
    }]
  );
  return manager.resolveCoreBooleanCallOrFallback(readStorageFlagFromContextCore, function () {
    var storage = manager.getWebStorageByName("localStorage");
    if (!canReadFromStorage(storage)) return false;
    try {
      return storage.getItem(GameManager.STATS_PANEL_VISIBLE_KEY) === "1";
    } catch (_err) {
      return false;
    }
  });
}

function applyStatsPanelInitialVisibility(overlay, isOpen) {
  if (!overlay) return;
  overlay.style.display = isOpen ? "flex" : "none";
}

function initStatsPanelUi(manager) {
  if (!manager) return;
  if (typeof document === "undefined" || !document.body) return;
  var btn = ensureStatsPanelToggleButtonElement();
  var hostElements = resolveStatsPanelToggleHostElements();
  mountStatsPanelToggleButton(btn, hostElements);
  var overlay = ensureStatsPanelOverlayElement();
  bindStatsPanelToggleButton(btn, manager);
  bindStatsPanelCloseButton(manager);
  bindStatsPanelOverlayDismiss(overlay, manager);
  var isOpen = resolveStatsPanelInitialOpenFlag(manager);
  applyStatsPanelInitialVisibility(overlay, isOpen);
}

function shouldHandleMoveInputAsUndo(direction) {
  return direction == -1;
}

function shouldBypassMoveInputThrottle(throttleMs) {
  return throttleMs <= 0;
}

function shouldExecuteImmediateMoveInput(manager, now, throttleMs) {
  if (!manager) return false;
  if (manager.moveInputFlushScheduled) return false;
  return (now - manager.lastMoveInputAt) >= throttleMs;
}

function queuePendingMoveInput(manager, direction) {
  if (!manager) return false;
  manager.pendingMoveInput = direction;
  if (manager.moveInputFlushScheduled) return false;
  manager.moveInputFlushScheduled = true;
  return true;
}

function scheduleMoveInputFlush(manager) {
  if (!manager) return;
  manager.requestAnimationFrame(function () {
    flushPendingMoveInput(manager);
  });
}

function handleMoveInput(manager, direction) {
  if (!manager) return;
  if (shouldHandleMoveInputAsUndo(direction)) {
    manager.move(direction);
    return;
  }

  var throttleMs = resolveMoveInputThrottleMs(manager);
  if (shouldBypassMoveInputThrottle(throttleMs)) {
    manager.move(direction);
    return;
  }
  var now = Date.now();
  if (shouldExecuteImmediateMoveInput(manager, now, throttleMs)) {
    executeImmediateMoveInput(manager, direction, now);
    return;
  }
  if (!queuePendingMoveInput(manager, direction)) return;
  scheduleMoveInputFlush(manager);
}

function resolveGridCellAvailableFn(manager) {
  if (manager && manager.grid && typeof manager.grid.cellAvailable === "function") {
    return manager.grid.cellAvailable.bind(manager.grid);
  }
  return function () { return false; };
}

function updateStatsLabelText(elementId, label, value) {
  var el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = label + value;
}

function applyInvalidatedTimerPlaceholders(elementIds) {
  var ids = Array.isArray(elementIds) ? elementIds : [];
  for (var idx = 0; idx < ids.length; idx++) {
    var targetId = ids[idx];
    if (!targetId) continue;
    var targetEl = document.getElementById(String(targetId));
    if (targetEl) targetEl.textContent = "---------";
  }
}

function resolveSpawnCount(manager, value) {
  if (!manager) return 0;
  var getSpawnCountCore = manager.callCoreRulesRuntime(
    "getSpawnCount",
    [manager.spawnValueCounts, value]
  );
  return manager.resolveCoreNumericCallOrFallback(getSpawnCountCore, function () {
    if (!manager.spawnValueCounts) return 0;
    return manager.spawnValueCounts[String(value)] || 0;
  });
}

function resolveTheoreticalMaxTile(manager, width, height, ruleset) {
  if (!manager) return null;
  var getTheoreticalMaxTileCore = manager.callCoreRulesRuntime(
    "getTheoreticalMaxTile",
    [width, height, ruleset]
  );
  return manager.resolveNormalizedCoreValueOrFallbackAllowNull(getTheoreticalMaxTileCore, function (coreValue) {
    if (coreValue === null) return null;
    var tileValue = Number(coreValue);
    return Number.isInteger(tileValue) && tileValue > 0 ? tileValue : undefined;
  }, function () {
    var w = Number(width);
    var h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    var cells = Math.floor(w) * Math.floor(h);
    cells = Number.isInteger(cells) && cells > 0 ? cells : null;
    if (cells === null) return null;
    if (ruleset === "fibonacci") {
      // Fibonacci 4x4 theoretical max: 4181.
      var targetIndex = cells + 2;
      var a = 1;
      var b = 2;
      if (targetIndex <= 1) return 1;
      if (targetIndex === 2) return 2;
      for (var i = 3; i <= targetIndex; i++) {
        var next = a + b;
        a = b;
        b = next;
      }
      return b;
    }
    // Pow2 4x4 theoretical max: 131072.
    return Math.pow(2, cells + 1);
  });
}

function appendCompactMoveCode(manager, rawCode) {
  if (!manager) return;
  var appendCompactMoveCodeCore = manager.callCoreReplayCodecRuntime(
    "appendCompactMoveCode",
    [{
      log: manager.replayCompactLog,
      rawCode: rawCode
    }]
  );
  if (manager.tryHandleCoreRawValue(appendCompactMoveCodeCore, function (coreValue) {
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
  var appendCompactUndoCore = manager.callCoreReplayCodecRuntime(
    "appendCompactUndo",
    [manager.replayCompactLog]
  );
  if (manager.tryHandleCoreRawValue(appendCompactUndoCore, function (coreValue) {
    manager.replayCompactLog = coreValue;
  })) {
    return;
  }
  manager.replayCompactLog += manager.encodeReplay128(127) + manager.encodeReplay128(1);
}

function appendCompactPracticeAction(manager, x, y, value) {
  if (!manager) return;
  var appendCompactPracticeActionCore = manager.callCoreReplayCodecRuntime(
    "appendCompactPracticeAction",
    [{
      log: manager.replayCompactLog,
      width: manager.width,
      height: manager.height,
      x: x,
      y: y,
      value: value
    }]
  );
  if (manager.tryHandleCoreRawValue(appendCompactPracticeActionCore, function (coreValue) {
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
  var computePostMoveRecordCore = manager.callCorePostMoveRecordRuntime(
    "computePostMoveRecord",
    [{
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
    }]
  );
  return manager.resolveCoreObjectCallOrFallback(computePostMoveRecordCore, function () {
    return buildPostMoveRecordFallback(manager, direction);
  });
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
  var computePostUndoRecordCore = manager.callCorePostUndoRecordRuntime(
    "computePostUndoRecord",
    [{
      replayMode: !!manager.replayMode,
      direction: direction,
      hasSessionReplayV3: !!manager.sessionReplayV3
    }]
  );
  return manager.resolveCoreObjectCallOrFallback(computePostUndoRecordCore, function () {
    return buildPostUndoRecordFallback(manager);
  });
}

function computeUndoRestoreState(manager, prev) {
  if (!manager) return null;
  var computeUndoRestoreStateCore = manager.callCoreUndoRestoreRuntime(
    "computeUndoRestoreState",
    [{
      prev: prev || {},
      fallbackUndoUsed: manager.undoUsed,
      timerStatus: manager.timerStatus
    }]
  );
  return manager.resolveCoreObjectCallOrFallback(computeUndoRestoreStateCore, function () {
    var source = prev && typeof prev === "object" ? prev : {};
    var fallbackState = manager.getUndoStateFallbackValues();
    var undoBase = Number.isInteger(source.undoUsed) && source.undoUsed >= 0
      ? source.undoUsed
      : fallbackState.undoUsed;
    return {
      comboStreak: Number.isInteger(source.comboStreak) && source.comboStreak >= 0 ? source.comboStreak : 0,
      successfulMoveCount:
        Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
          ? source.successfulMoveCount
          : 0,
      lockConsumedAtMoveCount: Number.isInteger(source.lockConsumedAtMoveCount) ? source.lockConsumedAtMoveCount : -1,
      lockedDirectionTurn: Number.isInteger(source.lockedDirectionTurn) ? source.lockedDirectionTurn : null,
      lockedDirection: Number.isInteger(source.lockedDirection) ? source.lockedDirection : null,
      undoUsed: undoBase + 1,
      over: false,
      won: false,
      keepPlaying: false,
      shouldClearMessage: true,
      shouldStartTimer: manager.timerStatus === 0
    };
  });
}

function createUndoRestoreTile(manager, snapshot) {
  if (!manager) return null;
  var source = manager.isNonArrayObject(snapshot) ? snapshot : {};
  var previous = manager.isNonArrayObject(source.previousPosition) ? source.previousPosition : {};
  var fallback = {
    x: source.x,
    y: source.y,
    value: source.value,
    previousPosition: {
      x: previous.x,
      y: previous.y
    }
  };

  var createUndoRestoreTileCore = manager.callCoreUndoTileRestoreRuntime(
    "createUndoRestoreTile",
    [{
      x: source.x,
      y: source.y,
      value: source.value,
      previousPosition: {
        x: previous.x,
        y: previous.y
      }
    }]
  );
  var normalizedByCore = manager.resolveNormalizedCoreValueOrUndefined(
    createUndoRestoreTileCore,
    function (computed) {
      if (
        manager.isNonArrayObject(computed) &&
        computed.previousPosition &&
        manager.isNonArrayObject(computed.previousPosition)
      ) {
        return computed;
      }
      return null;
    }
  );
  if (normalizedByCore) return normalizedByCore;

  return fallback;
}

function computeUndoRestorePayload(manager, prev) {
  if (!manager) return null;
  var computeUndoRestorePayloadCore = manager.callCoreUndoRestorePayloadRuntime(
    "computeUndoRestorePayload",
    [{
      prev: prev || {},
      fallbackScore: manager.score
    }]
  );
  return manager.resolveCoreObjectCallOrFallback(computeUndoRestorePayloadCore, function () {
    var source = prev && typeof prev === "object" ? prev : {};
    var score = Number.isFinite(source.score) && typeof source.score === "number"
      ? Number(source.score)
      : (Number.isFinite(manager.score) && typeof manager.score === "number" ? Number(manager.score) : 0);
    var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
    var tiles = [];
    for (var i = 0; i < rawTiles.length; i++) {
      var item = rawTiles[i];
      if (!manager.isNonArrayObject(item)) continue;
      tiles.push(item);
    }
    return {
      score: score,
      tiles: tiles
    };
  });
}

function computeMergeEffects(manager, mergedValue) {
  if (!manager) return null;
  var cappedState = manager.resolveCappedModeState();
  var computeMergeEffectsCore = manager.callCoreMergeEffectsRuntime(
    "computeMergeEffects",
    [{
      mergedValue: mergedValue,
      isCappedMode: !!cappedState.isCappedMode,
      cappedTargetValue: cappedState.cappedTargetValue,
      reached32k: !!manager.reached32k
    }]
  );
  return manager.resolveCoreObjectCallOrFallback(computeMergeEffectsCore, function () {
    var value = Number(mergedValue);
    var cappedTarget = Number(cappedState.cappedTargetValue);
    var cappedMode = !!cappedState.isCappedMode;
    var hasCappedTarget = Number.isFinite(cappedTarget) && cappedTarget > 0;
    var reached32k = !!manager.reached32k;
    var result = {
      shouldRecordCappedMilestone: false,
      shouldSetWon: false,
      shouldSetReached32k: false,
      timerIdsToStamp: [],
      showSubTimerContainer: false,
      hideTimerRows: []
    };

    if (!Number.isInteger(value) || value <= 0) return result;
    if (cappedMode && hasCappedTarget && value === cappedTarget) {
      result.shouldRecordCappedMilestone = true;
    } else if (!cappedMode && value === 2048) {
      result.shouldSetWon = true;
    }
    if (value === 8192) {
      result.timerIdsToStamp.push(reached32k ? "timer8192-sub" : "timer8192");
    }
    if (value === 16384) {
      result.timerIdsToStamp.push(reached32k ? "timer16384-sub" : "timer16384");
    }
    if (value === 32768) {
      result.shouldSetReached32k = true;
      result.timerIdsToStamp.push("timer32768");
      result.showSubTimerContainer = true;
      result.hideTimerRows = [16, 32];
    }
    return result;
  });
}

function buildTraversals(manager, vector) {
  if (!manager) return { x: [], y: [] };
  var buildTraversalsCore = manager.callCoreMovePathRuntime(
    "buildTraversals",
    [manager.width, manager.height, vector]
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    buildTraversalsCore,
    function (runtimeValue) {
      var computed = runtimeValue || {};
      return {
        x: Array.isArray(computed.x) ? computed.x : [],
        y: Array.isArray(computed.y) ? computed.y : []
      };
    },
    function () {
      var axisX = [];
      for (var x = 0; x < manager.width; x++) {
        axisX.push(x);
      }
      var axisY = [];
      for (var y = 0; y < manager.height; y++) {
        axisY.push(y);
      }
      return {
        x: vector.x === 1 ? axisX.reverse() : axisX,
        y: vector.y === 1 ? axisY.reverse() : axisY
      };
    }
  );
}

function findFarthestPosition(manager, cell, vector) {
  if (!manager) return { farthest: cell, next: cell };
  var findFarthestPositionCore = manager.callCoreMovePathRuntime(
    "findFarthestPosition",
    [
      cell,
      vector,
      manager.width,
      manager.height,
      manager.isBlockedCell.bind(manager),
      resolveGridCellAvailableFn(manager)
    ]
  );
  var farthestPositionByCore = manager.resolveNormalizedCoreValueOrUndefined(
    findFarthestPositionCore,
    function (runtimeValue) {
      var computed = runtimeValue || {};
      if (computed.farthest && computed.next) return computed;
      return null;
    }
  );
  if (typeof farthestPositionByCore !== "undefined") {
    var resolvedByCore = farthestPositionByCore;
    if (resolvedByCore) return resolvedByCore;
  }
  var previous;
  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (
    manager.grid.withinBounds(cell) &&
    !manager.isBlockedCell(cell.x, cell.y) &&
    manager.grid.cellAvailable(cell)
  );
  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
}

function pickSpawnValue(manager) {
  if (!manager) return 2;
  var pickSpawnValueCore = manager.callCoreRulesRuntime(
    "pickSpawnValue",
    [manager.spawnTable || [], Math.random]
  );
  return manager.resolveNormalizedCoreValueOrFallback(pickSpawnValueCore, function (coreValue) {
    var value = Number(coreValue);
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }, function () {
    var table = manager.spawnTable || [];
    if (!table.length) return 2;
    var totalWeight = 0;
    for (var i = 0; i < table.length; i++) {
      totalWeight += table[i].weight;
    }
    if (totalWeight <= 0) return table[0].value;
    var pick = Math.random() * totalWeight;
    var running = 0;
    for (var j = 0; j < table.length; j++) {
      running += table[j].weight;
      if (pick <= running) return table[j].value;
    }
    return table[table.length - 1].value;
  });
}

function planTileInteraction(manager, cell, positions, next, mergedValue) {
  if (!manager) return null;
  var planTileInteractionCore = manager.callCoreMoveApplyRuntime(
    "planTileInteraction",
    [{
      cell: cell,
      farthest: positions && positions.farthest ? positions.farthest : { x: 0, y: 0 },
      next: positions && positions.next ? positions.next : { x: 0, y: 0 },
      hasNextTile: !!next,
      nextMergedFrom: !!(next && next.mergedFrom),
      mergedValue: mergedValue
    }]
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    planTileInteractionCore,
    function (coreValue) {
      var computed = coreValue || {};
      var mergeKind = computed.kind === "merge";
      var fallbackTarget = mergeKind ? positions.next : positions.farthest;
      var target = computed.target && Number.isInteger(computed.target.x) && Number.isInteger(computed.target.y)
        ? computed.target
        : fallbackTarget;
      return {
        kind: mergeKind ? "merge" : "move",
        target: target,
        moved: typeof computed.moved === "boolean"
          ? computed.moved
          : !positionsEqual(manager, cell, target)
      };
    },
    function () {
      var shouldMerge = !!next && !next.mergedFrom && Number.isInteger(mergedValue) && mergedValue > 0;
      var targetLegacy = shouldMerge ? positions.next : positions.farthest;
      return {
        kind: shouldMerge ? "merge" : "move",
        target: targetLegacy,
        moved: !positionsEqual(manager, cell, targetLegacy)
      };
    }
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
  var buildLiteSavedGameStatePayloadCore = manager.callCoreStorageRuntime(
    "buildLiteSavedGameStatePayload",
    [{
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
    }]
  );
  var normalizedByCore = manager.resolveNormalizedCoreValueOrUndefined(
    buildLiteSavedGameStatePayloadCore,
    function (litePayloadByCore) {
      return manager.isNonArrayObject(litePayloadByCore) ? litePayloadByCore : null;
    }
  );
  if (normalizedByCore) return normalizedByCore;

  if (!payload || typeof payload !== "object") return null;
  return Object.assign(
    {},
    buildLiteSavedStateBaseSection(manager, payload),
    buildLiteSavedStateMetaSection(payload),
    buildLiteSavedStateBoardSection(manager, payload),
    buildLiteSavedStateReplayResetSection()
  );
}

function movesAvailable(manager) {
  if (!manager) return false;
  var movesAvailableCore = manager.callCoreMoveScanRuntime(
    "movesAvailable",
    [
      getAvailableCells(manager).length,
      tileMatchesAvailable(manager)
    ]
  );
  return manager.resolveCoreBooleanCallOrFallback(movesAvailableCore, function () {
    return getAvailableCells(manager).length > 0 || tileMatchesAvailable(manager);
  });
}

function nextFibonacci(manager, value) {
  if (!manager) return null;
  var nextFibonacciCore = manager.callCoreRulesRuntime("nextFibonacci", [value]);
  return manager.resolveNormalizedCoreValueOrFallbackAllowNull(nextFibonacciCore, function (coreValue) {
    if (coreValue === null) return null;
    var nextValue = Number(coreValue);
    return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : undefined;
  }, function () {
    if (value <= 0) return 1;
    if (value === 1) return 2;
    var a = 1;
    var b = 2;
    while (b < value) {
      var c = a + b;
      a = b;
      b = c;
    }
    if (b !== value) return null;
    return a + b;
  });
}

function getVector(manager, direction) {
  if (!manager) return undefined;
  var getVectorCore = manager.callCoreMovePathRuntime(
    "getVector",
    [direction]
  );
  return manager.resolveNormalizedCoreValueOrFallback(getVectorCore, function (coreValue) {
    if (!manager.isNonArrayObject(coreValue)) return undefined;
    var x = Number(coreValue.x);
    var y = Number(coreValue.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
    return { x: x, y: y };
  }, function () {
    return {
      0: { x: 0,  y: -1 }, // up
      1: { x: 1,  y: 0 },  // right
      2: { x: 0,  y: 1 },  // down
      3: { x: -1, y: 0 }   // left
    }[direction];
  });
}

function getMergedValue(manager, a, b) {
  if (!manager) return null;
  var getMergedValueCore = manager.callCoreRulesRuntime(
    "getMergedValue",
    [
      a,
      b,
      manager.isFibonacciMode() ? "fibonacci" : "pow2",
      manager.maxTile
    ]
  );
  return manager.resolveNormalizedCoreValueOrFallbackAllowNull(getMergedValueCore, function (coreValue) {
    if (coreValue === null) return null;
    var mergedValue = Number(coreValue);
    return Number.isInteger(mergedValue) && mergedValue > 0 ? mergedValue : undefined;
  }, function () {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return null;
    if (!manager.isFibonacciMode()) {
      if (a !== b) return null;
      var mergedPow2 = a * 2;
      if (mergedPow2 > manager.maxTile) return null;
      return mergedPow2;
    }
    if (a === 1 && b === 1) {
      if (2 > manager.maxTile) return null;
      return 2;
    }
    var low = Math.min(a, b);
    var high = Math.max(a, b);
    var next = nextFibonacci(manager, low);
    if (next !== high) return null;
    var mergedFibonacci = low + high;
    if (mergedFibonacci > manager.maxTile) return null;
    return mergedFibonacci;
  });
}

function resolveMoveInputThrottleMs(manager) {
  if (!manager) return 0;
  var resolveMoveInputThrottleMsCore = manager.callCoreTimerIntervalRuntime(
    "resolveMoveInputThrottleMs",
    [
      manager.replayMode,
      manager.width,
      manager.height
    ]
  );
  return manager.resolveCoreNumericCallOrFallback(resolveMoveInputThrottleMsCore, function () {
    if (manager.replayMode) return 0;
    var area = (manager.width || 4) * (manager.height || 4);
    if (area >= 100) return 65;
    if (area >= 64) return 45;
    return 0;
  });
}

function executeImmediateMoveInput(manager, direction, now) {
  if (!manager) return;
  manager.lastMoveInputAt = now;
  manager.move(direction);
}

function dequeuePendingMoveInput(manager) {
  if (!manager) return undefined;
  manager.moveInputFlushScheduled = false;
  var direction = manager.pendingMoveInput;
  manager.pendingMoveInput = null;
  return direction;
}

function hasPendingMoveInputValue(direction) {
  return !(direction === null || typeof direction === "undefined");
}

function hasQueuedPendingMoveInput(manager) {
  if (!manager) return false;
  return hasPendingMoveInputValue(manager.pendingMoveInput);
}

function scheduleQueuedPendingMoveInputFlush(manager) {
  if (!manager) return;
  if (manager.moveInputFlushScheduled) return;
  manager.moveInputFlushScheduled = true;
  manager.requestAnimationFrame(function () {
    flushPendingMoveInput(manager);
  });
}

function resolvePendingMoveInputWaitMs(manager, throttleMs, now) {
  if (!manager) return 0;
  return throttleMs - (now - manager.lastMoveInputAt);
}

function scheduleDeferredPendingMoveInput(manager, direction, wait) {
  if (!manager) return;
  var self = manager;
  setTimeout(function () {
    if (hasQueuedPendingMoveInput(self)) {
      // Newer input exists; next flush will consume latest direction.
      scheduleQueuedPendingMoveInputFlush(self);
      return;
    }
    executeImmediateMoveInput(self, direction, Date.now());
  }, wait);
}

function flushPendingMoveInput(manager) {
  if (!manager) return;
  var direction = dequeuePendingMoveInput(manager);
  if (!hasPendingMoveInputValue(direction)) return;
  var throttleMs = resolveMoveInputThrottleMs(manager);
  if (throttleMs <= 0) {
    manager.move(direction);
    return;
  }
  var now = Date.now();
  var wait = resolvePendingMoveInputWaitMs(manager, throttleMs, now);
  if (wait <= 0) {
    executeImmediateMoveInput(manager, direction, now);
    return;
  }
  scheduleDeferredPendingMoveInput(manager, direction, wait);
}

function refreshIpsDisplay(manager, durationMs) {
  if (!manager) return;
  var statsIpsEl = document.getElementById("stats-ips");
  var cornerIpsEl = manager.cornerIpsEl;
  if (!statsIpsEl && !cornerIpsEl) return;
  var ms = resolveIpsDurationMs(manager, durationMs);
  var ipsInputCount = resolveIpsInputCount(manager);
  var ipsText = resolveIpsDisplayText(manager, ms, ipsInputCount);
  applyIpsTextToTargets(statsIpsEl, cornerIpsEl, ipsText);
}

function resolveIpsDurationMs(manager, durationMs) {
  if (!manager) return 0;
  var ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms < 0) {
    return manager.getDurationMs();
  }
  return ms;
}

function resolveIpsInputCountFallback(manager) {
  if (!manager) return 0;
  if (manager.replayMode) {
    return Number.isInteger(manager.replayIndex) && manager.replayIndex > 0 ? manager.replayIndex : 0;
  }
  return Number.isInteger(manager.ipsInputCount) && manager.ipsInputCount >= 0 ? manager.ipsInputCount : 0;
}

function resolveIpsInputCount(manager) {
  if (!manager) return 0;
  var resolveIpsInputCountCore = manager.callCoreReplayExecutionRuntime(
    "resolveIpsInputCount",
    [{
      replayMode: manager.replayMode,
      replayIndex: manager.replayIndex,
      ipsInputCount: manager.ipsInputCount
    }]
  );
  return manager.resolveCoreNumericCallOrFallback(resolveIpsInputCountCore, function () {
    return resolveIpsInputCountFallback(manager);
  });
}

function normalizeIpsTextFromCoreValue(coreValue) {
  var coreDisplay = coreValue || {};
  return typeof coreDisplay.ipsText === "string" && coreDisplay.ipsText ? coreDisplay.ipsText : "";
}

function resolveIpsDisplayTextFallback(ms, ipsInputCount) {
  var seconds = ms / 1000;
  var avgIps = 0;
  if (seconds > 0) {
    avgIps = (ipsInputCount / seconds).toFixed(2);
  }
  return "IPS: " + avgIps;
}

function resolveIpsDisplayText(manager, ms, ipsInputCount) {
  if (!manager) return "IPS: 0";
  var resolveIpsDisplayTextCore = manager.callCoreReplayExecutionRuntime(
    "resolveIpsDisplayText",
    [{
      durationMs: ms,
      ipsInputCount: ipsInputCount
    }]
  );
  var ipsText = manager.resolveNormalizedCoreValueOrFallback(
    resolveIpsDisplayTextCore,
    function (coreValue) {
      return normalizeIpsTextFromCoreValue(coreValue);
    },
    function () {
      return "";
    }
  );
  if (ipsText) return ipsText;
  return resolveIpsDisplayTextFallback(ms, ipsInputCount);
}

function applyIpsTextToTargets(statsIpsEl, cornerIpsEl, ipsText) {
  if (statsIpsEl) statsIpsEl.textContent = ipsText;
  if (cornerIpsEl) cornerIpsEl.textContent = ipsText;
}

function encodeBoardV4(manager, board) {
  if (!manager) throw "Invalid initial board";
  var encodeBoardV4Core = manager.callCoreReplayCodecRuntime(
    "encodeBoardV4",
    [board]
  );
  return manager.resolveCoreStringCallOrFallback(encodeBoardV4Core, function () {
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
  });
}

function decodeBoardV4(manager, encoded) {
  if (!manager) throw "Invalid encoded board";
  var decodeBoardV4Core = manager.callCoreReplayCodecRuntime(
    "decodeBoardV4",
    [encoded]
  );
  return manager.resolveNormalizedCoreValueOrFallback(decodeBoardV4Core, function (coreValue) {
    return Array.isArray(coreValue) ? coreValue : undefined;
  }, function () {
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
  });
}

function positionsEqual(manager, first, second) {
  if (!manager) return false;
  var positionsEqualCore = manager.callCoreMovePathRuntime(
    "positionsEqual",
    [first, second]
  );
  return manager.resolveCoreBooleanCallOrFallback(positionsEqualCore, function () {
    return first.x === second.x && first.y === second.y;
  });
}

function getAvailableCells(manager) {
  if (!manager) return [];
  var gridCellAvailable = resolveGridCellAvailableFn(manager);
  var getAvailableCellsCore = manager.callCoreGridScanRuntime(
    "getAvailableCells",
    [
      manager.width,
      manager.height,
      manager.isBlockedCell.bind(manager),
      gridCellAvailable
    ]
  );
  return manager.resolveNormalizedCoreValueOrFallback(getAvailableCellsCore, function (coreValue) {
    return Array.isArray(coreValue) ? coreValue : undefined;
  }, function () {
    var out = [];
    for (var x = 0; x < manager.width; x++) {
      for (var y = 0; y < manager.height; y++) {
        if (manager.isBlockedCell(x, y)) continue;
        if (gridCellAvailable({ x: x, y: y })) out.push({ x: x, y: y });
      }
    }
    return out;
  });
}

function tileMatchesAvailable(manager) {
  if (!manager) return false;
  var tileMatchesAvailableCore = manager.callCoreMoveScanRuntime(
    "tileMatchesAvailable",
    [
      manager.width,
      manager.height,
      manager.isBlockedCell.bind(manager),
      function (cell) {
        var tile = manager.grid.cellContent(cell);
        return tile ? tile.value : null;
      },
      function (a, b) {
        return getMergedValue(manager, a, b) !== null;
      }
    ]
  );
  return manager.resolveCoreBooleanCallOrFallback(tileMatchesAvailableCore, function () {
    for (var x = 0; x < manager.width; x++) {
      for (var y = 0; y < manager.height; y++) {
        if (manager.isBlockedCell(x, y)) continue;
        var tile = manager.grid.cellContent({ x: x, y: y });
        if (!tile) continue;
        for (var direction = 0; direction < 4; direction++) {
          var vector = getVector(manager, direction);
          var cell = { x: x + vector.x, y: y + vector.y };
          if (manager.isBlockedCell(cell.x, cell.y)) continue;
          var other = manager.grid.cellContent(cell);
          if (other && getMergedValue(manager, tile.value, other.value) !== null) {
            return true;
          }
        }
      }
    }
    return false;
  });
}

function resolveReplayStepLifecyclePlan(manager, action, spawnAtIndex) {
  if (!manager) return null;
  var planReplayStepCore = manager.callCoreReplayLifecycleRuntime(
    "planReplayStep",
    [{
      action: action,
      hasReplaySpawns: !!manager.replaySpawns,
      spawnAtIndex: spawnAtIndex
    }]
  );
  return manager.resolveCoreObjectCallOrFallback(planReplayStepCore, function () {
    var shouldInjectForcedSpawn = !!manager.replaySpawns && !Array.isArray(action);
    return {
      shouldInjectForcedSpawn: shouldInjectForcedSpawn,
      forcedSpawn: shouldInjectForcedSpawn ? spawnAtIndex : undefined
    };
  });
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
  var planReplayStepExecutionCore = manager.callCoreReplayLoopRuntime(
    "planReplayStepExecution",
    [{
      replayMoves: manager.replayMoves,
      replaySpawns: manager.replaySpawns,
      replayIndex: manager.replayIndex
    }]
  );
  return manager.resolveCoreObjectCallOrFallback(planReplayStepExecutionCore, function () {
    return buildReplayStepExecutionFallbackPlan(manager);
  });
}

function applyReplayStepForcedSpawn(manager, stepExecutionPlan) {
  if (!manager || !stepExecutionPlan) return;
  if (stepExecutionPlan.shouldInjectForcedSpawn) {
    manager.forcedSpawn = stepExecutionPlan.forcedSpawn;
  }
}

function resolveReplayExecutionAction(manager, action) {
  if (!manager) return null;
  var resolveReplayExecutionCore = manager.callCoreReplayExecutionRuntime(
    "resolveReplayExecution",
    [action]
  );
  return manager.resolveNormalizedCoreValueOrFallback(resolveReplayExecutionCore, function (coreValue) {
    return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
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
  });
}

function resolveReplayDispatchPlan(manager, resolved) {
  if (!manager) return null;
  var planReplayDispatchCore = manager.callCoreReplayDispatchRuntime(
    "planReplayDispatch",
    [resolved]
  );
  return manager.resolveCoreObjectCallOrFallback(planReplayDispatchCore, function () {
    if (resolved.kind === "m") return { method: "move", args: [resolved.dir] };
    if (resolved.kind === "u") return { method: "move", args: [-1] };
    if (resolved.kind === "p") {
      return {
        method: "insertCustomTile",
        args: [resolved.x, resolved.y, resolved.value]
      };
    }
    throw "Unknown replay action";
  });
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
  var applySpawnValueCountCore = manager.callCoreRulesRuntime(
    "applySpawnValueCount",
    [manager.spawnValueCounts, value]
  );
  if (manager.tryHandleCoreRawValue(applySpawnValueCountCore, function (coreValue) {
    var next = coreValue || {};
    if (next.nextSpawnValueCounts && typeof next.nextSpawnValueCounts === "object") {
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
  var rateEl = document.getElementById("stats-4-rate");
  if (rateEl) rateEl.textContent = text;
  if (manager.cornerRateEl) manager.cornerRateEl.textContent = text;
}

function detectMode(manager) {
  if (!manager) return GameManager.DEFAULT_MODE_KEY;
  var bodyMode = "";
  if (typeof document !== "undefined" && document.body) {
    bodyMode = document.body.getAttribute("data-mode-id") || "";
  }
  var pathname = resolveWindowPathname(manager);
  var resolveDetectedModeCore = manager.callCoreModeRuntime(
    "resolveDetectedMode",
    [manager.createCoreModeDefaultsPayload({
      existingMode: manager.mode,
      bodyMode: bodyMode,
      pathname: pathname
    })]
  );
  return manager.resolveCoreStringCallOrFallback(resolveDetectedModeCore, function () {
    if (manager.mode) return manager.mode;
    if (typeof document !== "undefined" && document.body) {
      bodyMode = document.body.getAttribute("data-mode-id") || "";
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
  });
}

function resolveForcedUndoSettingForMode(modeConfig, targetMode) {
  var modeCfg = modeConfig || null;
  if (modeCfg && typeof modeCfg.undo_enabled === "boolean") {
    return modeCfg.undo_enabled;
  }
  var modeId = (targetMode || "").toLowerCase();
  if (modeId === "capped" || modeId.indexOf("capped") !== -1) return false;
  if (modeId.indexOf("no_undo") !== -1 || modeId.indexOf("no-undo") !== -1) return false;
  if (modeId.indexOf("undo_only") !== -1 || modeId.indexOf("undo-only") !== -1) return true;
  return null;
}

function buildUndoPolicyStateFallback(rawFallbackInput) {
  var fallbackInput = {
    forcedUndoSetting: rawFallbackInput.forcedUndoSetting,
    hasGameStarted: !!rawFallbackInput.hasGameStarted,
    replayMode: !!rawFallbackInput.replayMode,
    undoLimit: rawFallbackInput.undoLimit,
    undoUsed: rawFallbackInput.undoUsed,
    undoEnabled: !!rawFallbackInput.undoEnabled
  };
  var isUndoAllowedByMode = fallbackInput.forcedUndoSetting !== false;
  var isUndoSettingFixedForMode = fallbackInput.forcedUndoSetting !== null;
  var canToggleUndoSetting =
    isUndoAllowedByMode &&
    !isUndoSettingFixedForMode &&
    !fallbackInput.hasGameStarted;
  var isUndoInteractionEnabled =
    !fallbackInput.replayMode &&
    !(fallbackInput.undoLimit !== null && Number(fallbackInput.undoUsed) >= Number(fallbackInput.undoLimit)) &&
    !!(fallbackInput.undoEnabled && isUndoAllowedByMode);
  return {
    forcedUndoSetting: fallbackInput.forcedUndoSetting,
    isUndoAllowedByMode: isUndoAllowedByMode,
    isUndoSettingFixedForMode: isUndoSettingFixedForMode,
    canToggleUndoSetting: canToggleUndoSetting,
    isUndoInteractionEnabled: isUndoInteractionEnabled
  };
}

function buildUndoPolicyOptionsSnapshot(manager, options) {
  if (!manager) return null;
  var source = options;
  return {
    hasGameStarted: !!manager.readOptionValue(source, "hasGameStarted", !!manager.hasGameStarted),
    replayMode: !!manager.readOptionValue(source, "replayMode", !!manager.replayMode),
    undoLimit: manager.readOptionValue(source, "undoLimit", manager.undoLimit),
    undoUsed: manager.readOptionValue(source, "undoUsed", manager.undoUsed),
    undoEnabled: manager.readOptionValue(source, "undoEnabled", manager.undoEnabled)
  };
}

function buildUndoPolicyRuntimeInput(targetMode, modeConfig, optionsSnapshot) {
  var snapshot = optionsSnapshot && typeof optionsSnapshot === "object" ? optionsSnapshot : {};
  return {
    mode: targetMode,
    modeConfig: modeConfig,
    hasGameStarted: snapshot.hasGameStarted,
    replayMode: snapshot.replayMode,
    undoLimit: snapshot.undoLimit,
    undoUsed: snapshot.undoUsed,
    undoEnabled: snapshot.undoEnabled
  };
}

function resolveUndoPolicyStateForMode(manager, mode, options) {
  if (!manager) return null;
  var targetMode = mode || manager.mode;
  var modeConfig = manager.resolveModeConfig(targetMode);
  var optionsSnapshot = buildUndoPolicyOptionsSnapshot(manager, options);

  var resolveUndoPolicyStateCore = manager.callCoreModeRuntime(
    "resolveUndoPolicyState",
    [buildUndoPolicyRuntimeInput(targetMode, modeConfig, optionsSnapshot)]
  );
  var undoPolicyStateByCore = manager.resolveNormalizedCoreValueOrUndefined(
    resolveUndoPolicyStateCore,
    function (computed) {
      return computed && typeof computed === "object" ? computed : null;
    }
  );
  if (typeof undoPolicyStateByCore !== "undefined") {
    var normalizedCore = undoPolicyStateByCore;
    if (normalizedCore) return normalizedCore;
  }

  return buildUndoPolicyStateFallback({
    forcedUndoSetting: resolveForcedUndoSettingForMode(modeConfig, targetMode),
    hasGameStarted: optionsSnapshot.hasGameStarted,
    replayMode: optionsSnapshot.replayMode,
    undoLimit: optionsSnapshot.undoLimit,
    undoUsed: optionsSnapshot.undoUsed,
    undoEnabled: optionsSnapshot.undoEnabled
  });
}

function resolveLegacyAdapterBridgeMethod(manager, methodName) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  var bridge = resolveLegacyAdapterBridgeForManager(manager, windowLike);
  if (!bridge || typeof methodName !== "string" || !methodName) return null;
  var method = bridge[methodName];
  if (typeof method !== "function") return null;
  return {
    bridge: bridge,
    method: method
  };
}

function resolveLegacyAdapterBridgeForManager(manager, windowLike) {
  if (!manager) return null;
  var hostWindow = windowLike;
  if (!hostWindow || typeof hostWindow !== "object") {
    hostWindow = typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  }
  var bridge = hostWindow && typeof hostWindow === "object" ? hostWindow.__legacyEngine : null;
  if (!(bridge && typeof bridge === "object" && bridge.manager === manager)) {
    bridge = null;
  }
  return bridge;
}

function cacheAdapterSessionParitySnapshot(manager, bridge, cacheFieldName, snapshot) {
  if (!manager || !bridge) return null;
  if (!snapshot || typeof snapshot !== "object") return null;
  var clonedSnapshot = manager.safeClonePlain(snapshot, null);
  if (clonedSnapshot) {
    bridge[cacheFieldName] = clonedSnapshot;
  }
  return clonedSnapshot;
}

function getAdapterSessionParitySnapshot(manager, readerMethodName, cacheFieldName) {
  if (!manager) return null;
  var readerBridgeEntry = manager.resolveLegacyAdapterBridgeMethod(readerMethodName);
  var bridge = readerBridgeEntry ? readerBridgeEntry.bridge : resolveLegacyAdapterBridgeForManager(manager);
  if (!bridge) return null;
  if (readerBridgeEntry) {
    var snapshot = readerBridgeEntry.method.call(readerBridgeEntry.bridge);
    return cacheAdapterSessionParitySnapshot(manager, readerBridgeEntry.bridge, cacheFieldName, snapshot);
  }
  if (bridge[cacheFieldName] && typeof bridge[cacheFieldName] === "object") {
    return manager.safeClonePlain(bridge[cacheFieldName], null);
  }
  return null;
}

function resolveAdapterMoveMetaInput(meta) {
  return meta && typeof meta === "object" ? meta : {};
}

function resolveAdapterBridgeModeKey(manager, bridge) {
  if (bridge && typeof bridge.modeKey === "string" && bridge.modeKey) {
    return bridge.modeKey;
  }
  return manager ? (manager.modeKey || manager.mode || "") : "";
}

function resolveAdapterBridgeMode(manager, bridge) {
  if (bridge && typeof bridge.adapterMode === "string" && bridge.adapterMode) {
    return bridge.adapterMode;
  }
  return "legacy-bridge";
}

function buildAdapterMoveResultDetail(manager, input, modeKey, adapterMode, timestamp) {
  if (!manager) return null;
  return {
    reason: typeof input.reason === "string" && input.reason ? input.reason : "move",
    direction: Number.isInteger(input.direction) ? input.direction : null,
    moved: input.moved === true,
    modeKey: modeKey,
    adapterMode: adapterMode,
    score: Number.isFinite(manager.score) ? Number(manager.score) : 0,
    over: !!manager.over,
    won: !!manager.won,
    replayMode: !!manager.replayMode,
    successfulMoveCount:
      Number.isInteger(manager.successfulMoveCount) && manager.successfulMoveCount >= 0
        ? manager.successfulMoveCount
        : 0,
    undoUsed: Number.isInteger(manager.undoUsed) && manager.undoUsed >= 0 ? manager.undoUsed : 0,
    undoDepth: Array.isArray(manager.undoStack) ? manager.undoStack.length : 0,
    at: timestamp
  };
}

function syncAdapterSnapshotFromMoveResult(manager, bridge, detail, modeKey, adapterMode, timestamp) {
  if (!manager || !bridge || !detail) return;
  var syncAdapterSnapshotBridge = manager.resolveLegacyAdapterBridgeMethod("syncAdapterSnapshot");
  if (!syncAdapterSnapshotBridge) return;
  var snapshot = {
    adapterMode: adapterMode,
    modeKey: modeKey || "unknown",
    updatedAt: timestamp,
    lastMoveResult: detail
  };
  syncAdapterSnapshotBridge.method.call(bridge, snapshot);
  bridge.adapterSnapshot = snapshot;
}

function refreshAdapterParityReportSnapshot(manager, bridge) {
  if (!manager || !bridge) return;
  var readAdapterParityReportBridge = manager.resolveLegacyAdapterBridgeMethod("readAdapterParityReport");
  if (!readAdapterParityReportBridge) return;
  bridge.adapterParityReport = readAdapterParityReportBridge.method.call(bridge);
  var writeStoredAdapterParityReportBridge = manager.resolveLegacyAdapterBridgeMethod("writeStoredAdapterParityReport");
  if (
    bridge.adapterParityReport &&
    writeStoredAdapterParityReportBridge
  ) {
    writeStoredAdapterParityReportBridge.method.call(
      bridge,
      bridge.adapterParityReport,
      bridge.adapterMode
    );
  }
}

function refreshAdapterParityAbDiffSnapshot(manager, bridge) {
  if (!manager || !bridge) return;
  var readAdapterParityABDiffBridge = manager.resolveLegacyAdapterBridgeMethod("readAdapterParityABDiff");
  if (!readAdapterParityABDiffBridge) return;
  bridge.adapterParityABDiff = readAdapterParityABDiffBridge.method.call(bridge);
}

function publishAdapterMoveResult(manager, meta) {
  if (!manager) return false;
  var emitMoveResultBridge = manager.resolveLegacyAdapterBridgeMethod("emitMoveResult");
  if (!emitMoveResultBridge) return false;
  var bridge = emitMoveResultBridge.bridge;
  var timestamp = Date.now();
  var input = resolveAdapterMoveMetaInput(meta);
  var modeKey = resolveAdapterBridgeModeKey(manager, bridge);
  var adapterMode = resolveAdapterBridgeMode(manager, bridge);
  var detail = buildAdapterMoveResultDetail(manager, input, modeKey, adapterMode, timestamp);
  emitMoveResultBridge.method.call(bridge, detail);
  syncAdapterSnapshotFromMoveResult(manager, bridge, detail, modeKey, adapterMode, timestamp);
  refreshAdapterParityReportSnapshot(manager, bridge);
  refreshAdapterParityAbDiffSnapshot(manager, bridge);
  return true;
}

function getUndoStateFallbackValues(manager) {
  if (!manager) return {};
  return {
    score: Number.isFinite(manager.score) && typeof manager.score === "number" ? Number(manager.score) : 0,
    comboStreak: Number.isInteger(manager.comboStreak) && manager.comboStreak >= 0 ? manager.comboStreak : 0,
    successfulMoveCount:
      Number.isInteger(manager.successfulMoveCount) && manager.successfulMoveCount >= 0
        ? manager.successfulMoveCount
        : 0,
    lockConsumedAtMoveCount: Number.isInteger(manager.lockConsumedAtMoveCount) ? manager.lockConsumedAtMoveCount : -1,
    lockedDirectionTurn: Number.isInteger(manager.lockedDirectionTurn) ? manager.lockedDirectionTurn : null,
    lockedDirection: Number.isInteger(manager.lockedDirection) ? manager.lockedDirection : null,
    undoUsed: Number.isInteger(manager.undoUsed) && manager.undoUsed >= 0 ? manager.undoUsed : 0
  };
}

function normalizeUndoStackEntry(manager, entry) {
  if (!manager) return null;
  var fallbackState = manager.getUndoStateFallbackValues();
  var source = manager.isNonArrayObject(entry) ? entry : {};
  var normalizeUndoStackEntryCore = manager.callCoreUndoStackEntryRuntime(
    "normalizeUndoStackEntry",
    [{
      entry: source,
      fallbackScore: fallbackState.score,
      fallbackComboStreak: fallbackState.comboStreak,
      fallbackSuccessfulMoveCount: fallbackState.successfulMoveCount,
      fallbackLockConsumedAtMoveCount: fallbackState.lockConsumedAtMoveCount,
      fallbackLockedDirectionTurn: fallbackState.lockedDirectionTurn,
      fallbackLockedDirection: fallbackState.lockedDirection,
      fallbackUndoUsed: fallbackState.undoUsed
    }]
  );
  var sourceByCore = manager.resolveNormalizedCoreValueOrUndefined(
    normalizeUndoStackEntryCore,
    function (coreValue) {
      return manager.isNonArrayObject(coreValue) ? coreValue : source;
    }
  );
  if (typeof sourceByCore !== "undefined") {
    source = sourceByCore;
  }
  var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
  var tiles = [];
  for (var i = 0; i < rawTiles.length; i++) {
    var item = rawTiles[i];
    if (!manager.isNonArrayObject(item)) continue;
    tiles.push(item);
  }
  return {
    score: Number.isFinite(source.score) && typeof source.score === "number"
      ? Number(source.score)
      : fallbackState.score,
    tiles: tiles,
    comboStreak: Number.isInteger(source.comboStreak) && source.comboStreak >= 0
      ? source.comboStreak
      : fallbackState.comboStreak,
    successfulMoveCount: Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
      ? source.successfulMoveCount
      : fallbackState.successfulMoveCount,
    lockConsumedAtMoveCount: Number.isInteger(source.lockConsumedAtMoveCount)
      ? source.lockConsumedAtMoveCount
      : fallbackState.lockConsumedAtMoveCount,
    lockedDirectionTurn: Number.isInteger(source.lockedDirectionTurn)
      ? source.lockedDirectionTurn
      : fallbackState.lockedDirectionTurn,
    lockedDirection: Number.isInteger(source.lockedDirection)
      ? source.lockedDirection
      : fallbackState.lockedDirection,
    undoUsed: Number.isInteger(source.undoUsed) && source.undoUsed >= 0
      ? source.undoUsed
      : fallbackState.undoUsed
  };
}

function createUndoTileSnapshot(manager, tile, target) {
  if (!manager) return null;
  var createUndoTileSnapshotCore = manager.callCoreUndoTileSnapshotRuntime(
    "createUndoTileSnapshot",
    [{
      tile: {
        x: tile && typeof tile === "object" ? tile.x : null,
        y: tile && typeof tile === "object" ? tile.y : null,
        value: tile && typeof tile === "object" ? tile.value : null
      },
      target: {
        x: target && typeof target === "object" ? target.x : null,
        y: target && typeof target === "object" ? target.y : null
      }
    }]
  );
  var normalizedByCore = manager.resolveNormalizedCoreValueOrUndefined(
    createUndoTileSnapshotCore,
    function (computed) {
      if (
        manager.isNonArrayObject(computed) &&
        computed.previousPosition &&
        manager.isNonArrayObject(computed.previousPosition)
      ) {
        return computed;
      }
      return null;
    }
  );
  if (normalizedByCore) return normalizedByCore;

  if (tile && typeof tile.save === "function") {
    return tile.save(target);
  }
  return {
    x: tile ? tile.x : null,
    y: tile ? tile.y : null,
    value: tile ? tile.value : null,
    previousPosition: {
      x: target ? target.x : null,
      y: target ? target.y : null
    }
  };
}

function collectNormalizedSpawnTableFallbackItems(spawnTable) {
  var normalizedFallbackItems = [];
  if (!(Array.isArray(spawnTable) && spawnTable.length > 0)) return normalizedFallbackItems;
  for (var i = 0; i < spawnTable.length; i++) {
    var item = spawnTable[i];
    if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
    if (!(Number.isFinite(item.weight) && item.weight > 0)) continue;
    normalizedFallbackItems.push({ value: item.value, weight: Number(item.weight) });
  }
  return normalizedFallbackItems;
}

function resolveDefaultSpawnTableByRuleset(ruleset) {
  if (ruleset === "fibonacci") {
    return [{ value: 1, weight: 90 }, { value: 2, weight: 10 }];
  }
  return [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
}

function createModeConfigFallbackBase(manager, modeKey, rawConfig) {
  if (!manager) return null;
  var cfg = rawConfig ? manager.clonePlain(rawConfig) : manager.clonePlain(GameManager.DEFAULT_MODE_CONFIG);
  cfg.key = cfg.key || modeKey || GameManager.DEFAULT_MODE_KEY;
  cfg.board_width = Number.isInteger(cfg.board_width) && cfg.board_width > 0 ? cfg.board_width : 4;
  cfg.board_height = Number.isInteger(cfg.board_height) && cfg.board_height > 0 ? cfg.board_height : cfg.board_width;
  cfg.ruleset = cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  cfg.special_rules = manager.normalizeSpecialRules(cfg.special_rules);
  cfg.undo_enabled = !!cfg.undo_enabled;
  return cfg;
}

function resolveModeConfigMaxTile(manager, cfg) {
  if (!manager || !cfg) return null;
  var hasNumericMaxTile = Number.isInteger(cfg.max_tile) && cfg.max_tile > 0;
  var isCappedKey = typeof cfg.key === "string" && cfg.key.indexOf("capped") !== -1;
  var forceMaxTile = !!cfg.special_rules.enforce_max_tile;
  if (cfg.ruleset === "fibonacci") {
    // Fibonacci modes are uncapped by default; only explicit capped modes should enforce max_tile.
    return (hasNumericMaxTile && (isCappedKey || forceMaxTile)) ? cfg.max_tile : null;
  }
  if (hasNumericMaxTile) return cfg.max_tile;
  return resolveTheoreticalMaxTile(manager, cfg.board_width, cfg.board_height, cfg.ruleset);
}

function normalizeCustomSpawnFourRate(rawRate) {
  var customFourRate = Number(rawRate);
  if (!Number.isFinite(customFourRate)) return null;
  if (customFourRate < 0) customFourRate = 0;
  if (customFourRate > 100) customFourRate = 100;
  return Math.round(customFourRate * 100) / 100;
}

function buildPow2StrictSpawnTableByFourRate(customFourRate) {
  var twoRate = Math.round((100 - customFourRate) * 100) / 100;
  var strictTable = [];
  if (twoRate > 0) strictTable.push({ value: 2, weight: twoRate });
  if (customFourRate > 0) strictTable.push({ value: 4, weight: customFourRate });
  if (!strictTable.length) strictTable.push({ value: 2, weight: 100 });
  return strictTable;
}

function applyModeConfigSpawnTableFallback(manager, cfg) {
  if (!manager || !cfg) return;
  var customFourRate = normalizeCustomSpawnFourRate(cfg.special_rules.custom_spawn_four_rate);
  if (cfg.ruleset === "pow2" && customFourRate !== null) {
    cfg.spawn_table = buildPow2StrictSpawnTableByFourRate(customFourRate);
    cfg.special_rules.custom_spawn_four_rate = customFourRate;
    return;
  }
  cfg.spawn_table = manager.normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
}

function applyModeConfigRankingDefaults(cfg) {
  if (!cfg) return;
  cfg.ranked_bucket = cfg.ranked_bucket || "none";
  cfg.mode_family = cfg.mode_family || (cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2");
  cfg.rank_policy = cfg.rank_policy || (cfg.ranked_bucket !== "none" ? "ranked" : "unranked");
}

function normalizeSpawnTable(manager, spawnTable, ruleset) {
  if (!manager) return resolveDefaultSpawnTableByRuleset(ruleset);
  var normalizeSpawnTableCore = manager.callCoreRulesRuntime(
    "normalizeSpawnTable",
    [spawnTable, ruleset]
  );
  return manager.resolveNormalizedCoreValueOrFallback(normalizeSpawnTableCore, function (coreValue) {
    return Array.isArray(coreValue) ? coreValue : undefined;
  }, function () {
    var normalizedFallbackItems = collectNormalizedSpawnTableFallbackItems(spawnTable);
    if (normalizedFallbackItems.length > 0) return normalizedFallbackItems;
    return resolveDefaultSpawnTableByRuleset(ruleset);
  });
}

function normalizeModeConfig(manager, modeKey, rawConfig) {
  if (!manager) return createModeConfigFallbackBase(null, modeKey, rawConfig);
  var normalizeModeConfigCore = manager.callCoreModeRuntime(
    "normalizeModeConfig",
    [manager.createCoreModeDefaultsPayload({
      modeKey: modeKey,
      rawConfig: rawConfig,
      defaultModeConfig: GameManager.DEFAULT_MODE_CONFIG,
      normalizeSpawnTable: manager.normalizeSpawnTable.bind(manager),
      getTheoreticalMaxTile: function (width, height, ruleset) {
        return resolveTheoreticalMaxTile(manager, width, height, ruleset);
      },
      normalizeSpecialRules: manager.normalizeSpecialRules.bind(manager)
    })]
  );
  return manager.resolveNormalizedCoreValueOrFallback(normalizeModeConfigCore, function (coreValue) {
    return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
    var cfg = createModeConfigFallbackBase(manager, modeKey, rawConfig);
    cfg.max_tile = resolveModeConfigMaxTile(manager, cfg);
    applyModeConfigSpawnTableFallback(manager, cfg);
    applyModeConfigRankingDefaults(cfg);
    return cfg;
  });
}

function normalizeResolvedModeConfigFromCore(manager, coreValue) {
  if (!manager) return null;
  var resolvedByCore = coreValue || {};
  var normalizedModeId =
    typeof resolvedByCore.resolvedModeId === "string" && resolvedByCore.resolvedModeId
      ? resolvedByCore.resolvedModeId
      : GameManager.DEFAULT_MODE_KEY;
  var rawConfig = resolvedByCore.modeConfig;
  if (rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig)) {
    return manager.normalizeModeConfig(normalizedModeId, rawConfig);
  }
  return manager.normalizeModeConfig(GameManager.DEFAULT_MODE_KEY, GameManager.DEFAULT_MODE_CONFIG);
}

function resolveModeConfigFallbackFromCatalog(manager, modeId) {
  if (!manager) return null;
  var byCatalogRaw = manager.getModeConfigFromCatalog(modeId);
  if (byCatalogRaw) return manager.normalizeModeConfig(modeId, byCatalogRaw);
  var mapped = GameManager.LEGACY_ALIAS_TO_MODE_KEY[modeId] || modeId;
  if (mapped && mapped !== modeId) {
    var mappedRaw = manager.getModeConfigFromCatalog(mapped);
    if (mappedRaw) return manager.normalizeModeConfig(mapped, mappedRaw);
  }
  return manager.normalizeModeConfig(GameManager.DEFAULT_MODE_KEY, GameManager.DEFAULT_MODE_CONFIG);
}

function resolveModeConfig(manager, modeId) {
  if (!manager) return null;
  var id = modeId || GameManager.DEFAULT_MODE_KEY;
  var resolveModeConfigFromCatalogCore = manager.callCoreModeRuntime(
    "resolveModeConfigFromCatalog",
    [manager.createCoreModeDefaultsPayload({
      modeId: id,
      getModeConfig: manager.getModeConfigFromCatalog.bind(manager),
      legacyAliasToModeKey: GameManager.LEGACY_ALIAS_TO_MODE_KEY
    })]
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    resolveModeConfigFromCatalogCore,
    function (coreValue) {
      return normalizeResolvedModeConfigFromCore(manager, coreValue);
    },
    function () {
      return resolveModeConfigFallbackFromCatalog(manager, id);
    }
  );
}

function normalizeSpecialRules(manager, rules) {
  if (!manager) return {};
  var normalizeSpecialRulesCore = manager.callCoreModeRuntime(
    "normalizeSpecialRules",
    [rules]
  );
  return manager.resolveNormalizedCoreValueOrFallback(normalizeSpecialRulesCore, function (coreValue) {
    return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
    if (!rules || typeof rules !== "object" || Array.isArray(rules)) return {};
    return manager.clonePlain(rules);
  });
}

function getLegacyModeFromModeKey(manager, modeKey) {
  if (!manager) return "classic";
  var resolveLegacyModeFromModeKeyCore = manager.callCoreModeRuntime(
    "resolveLegacyModeFromModeKey",
    [{
      modeKey: modeKey,
      fallbackModeKey: manager.modeKey,
      mode: manager.mode,
      legacyModeByKey: GameManager.LEGACY_MODE_BY_KEY
    }]
  );
  return manager.resolveCoreStringCallOrFallback(resolveLegacyModeFromModeKeyCore, function () {
    var key = modeKey || manager.modeKey || manager.mode;
    if (GameManager.LEGACY_MODE_BY_KEY[key]) return GameManager.LEGACY_MODE_BY_KEY[key];
    if (key && key.indexOf("capped") !== -1) return "capped";
    if (key && key.indexOf("practice") !== -1) return "practice";
    return "classic";
  });
}

function getTimerMilestoneValues(manager) {
  if (!manager) return GameManager.TIMER_SLOT_IDS.slice();
  var getTimerMilestoneValuesCore = manager.callCoreRulesRuntime(
    "getTimerMilestoneValues",
    [
      manager.isFibonacciMode() ? "fibonacci" : "pow2",
      GameManager.TIMER_SLOT_IDS
    ]
  );
  return manager.resolveNormalizedCoreValueOrFallback(getTimerMilestoneValuesCore, function (coreValue) {
    return Array.isArray(coreValue) ? coreValue : undefined;
  }, function () {
    if (manager.isFibonacciMode()) {
      // 13 slots mapped to Fibonacci milestones.
      return [13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181];
    }
    return GameManager.TIMER_SLOT_IDS.slice();
  });
}

function cloneResolvedCappedModeState(state) {
  var source = state && typeof state === "object" ? state : {};
  return {
    isCappedMode: !!source.isCappedMode,
    cappedTargetValue:
      Number.isFinite(source.cappedTargetValue) && Number(source.cappedTargetValue) > 0
        ? Number(source.cappedTargetValue)
        : null,
    isProgressiveCapped64Mode: !!source.isProgressiveCapped64Mode
  };
}

function isCappedModeStateCacheValid(manager, cache) {
  if (!manager) return false;
  return !!(
    cache &&
    cache.modeKey === manager.modeKey &&
    cache.mode === manager.mode &&
    cache.maxTile === manager.maxTile &&
    cache.state &&
    typeof cache.state === "object"
  );
}

function buildResolveCappedModeStateRuntimeInput(manager) {
  if (!manager) return {};
  return {
    modeKey: manager.modeKey,
    mode: manager.mode,
    maxTile: manager.maxTile
  };
}

function buildResolveCappedModeStateFallback(manager) {
  if (!manager) return null;
  var key = String(manager.modeKey || manager.mode || "");
  var maxTile = Number(manager.maxTile);
  var isCappedModeFallback = key.indexOf("capped") !== -1 && Number.isFinite(maxTile) && maxTile > 0;
  return {
    isCappedMode: isCappedModeFallback,
    cappedTargetValue: isCappedModeFallback ? Number(maxTile) : null,
    // Disable progressive hidden timer rows for 64-capped mode.
    isProgressiveCapped64Mode: false
  };
}

function writeResolvedCappedModeStateCache(manager, resolvedState) {
  if (!manager) return;
  manager.__resolvedCappedModeStateCache = {
    modeKey: manager.modeKey,
    mode: manager.mode,
    maxTile: manager.maxTile,
    state: manager.cloneResolvedCappedModeState(resolvedState)
  };
}

function resolveCappedModeState(manager) {
  if (!manager) return null;
  var cache = manager.__resolvedCappedModeStateCache;
  if (isCappedModeStateCacheValid(manager, cache)) {
    return manager.cloneResolvedCappedModeState(cache.state);
  }

  var resolveCappedModeStateCore = manager.callCoreModeRuntime(
    "resolveCappedModeState",
    [buildResolveCappedModeStateRuntimeInput(manager)]
  );
  var resolvedState = manager.resolveNormalizedCoreValueOrFallback(
    resolveCappedModeStateCore,
    function (coreValue) {
      return manager.cloneResolvedCappedModeState(coreValue || {});
    },
    function () {
      return buildResolveCappedModeStateFallback(manager);
    }
  );
  writeResolvedCappedModeStateCache(manager, resolvedState);
  return manager.cloneResolvedCappedModeState(resolvedState);
}

function setTimerRowVisibleState(manager, value, visible, keepSpace) {
  if (!manager) return;
  var row = manager.getTimerRowEl(value);
  if (!row) return;
  row.style.display = "block";
  if (visible) {
    row.style.visibility = "visible";
    row.style.pointerEvents = "";
  } else if (keepSpace) {
    row.style.visibility = "hidden";
    row.style.pointerEvents = "none";
  } else {
    row.style.display = "none";
    row.style.visibility = "";
    row.style.pointerEvents = "";
  }
}

function resolveProgressiveCapped64UnlockedStateFallback(unlockedState) {
  var base = { "16": false, "32": false, "64": false };
  if (!unlockedState || typeof unlockedState !== "object") return base;
  if (unlockedState["16"] === true) base["16"] = true;
  if (unlockedState["32"] === true) base["32"] = true;
  if (unlockedState["64"] === true) base["64"] = true;
  return base;
}

function resolveProgressiveCapped64UnlockedState(manager, unlockedState) {
  if (!manager) return null;
  var createProgressiveCapped64UnlockedStateCore = manager.callCoreModeRuntime(
    "createProgressiveCapped64UnlockedState",
    [unlockedState]
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    createProgressiveCapped64UnlockedStateCore,
    function (coreValue) {
      return coreValue && typeof coreValue === "object" ? coreValue : null;
    },
    function () {
      return resolveProgressiveCapped64UnlockedStateFallback(unlockedState);
    }
  );
}

function resetProgressiveCapped64Rows(manager) {
  if (!manager) return;
  manager.capped64Unlocked = manager.resolveProgressiveCapped64UnlockedState(manager.capped64Unlocked);
  var values = [16, 32, 64];
  for (var i = 0; i < values.length; i++) {
    manager.setCapped64RowVisible(values[i], false);
  }
}

function normalizePositiveNumericValue(value) {
  var normalized = Number(value);
  if (Number.isFinite(normalized) && normalized > 0) return normalized;
  return null;
}

function resolveCappedTargetValueOrNull(manager, cappedTargetValue) {
  if (!manager) return null;
  var targetValue = normalizePositiveNumericValue(cappedTargetValue);
  if (targetValue !== null) return targetValue;
  var cappedState = manager.resolveCappedModeState();
  return normalizePositiveNumericValue(cappedState.cappedTargetValue);
}

function resolveCappedTimerLegendClassFallback(manager, targetValue) {
  if (!manager) return "timertile";
  var slotId = manager.timerMilestoneSlotByValue
    ? manager.timerMilestoneSlotByValue[String(targetValue)]
    : null;
  return slotId ? ("timertile timer-legend-" + slotId) : "timertile";
}

function getCappedTimerLegendClass(manager, cappedTargetValue) {
  if (!manager) return "timertile";
  var targetValue = manager.resolveCappedTargetValueOrNull(cappedTargetValue);
  var resolveCappedTimerLegendClassCore = manager.callCoreModeRuntime(
    "resolveCappedTimerLegendClass",
    [{
      timerMilestoneSlotByValue: manager.timerMilestoneSlotByValue,
      cappedTargetValue: targetValue
    }]
  );
  return manager.resolveCoreStringCallOrFallback(resolveCappedTimerLegendClassCore, function () {
    return resolveCappedTimerLegendClassFallback(manager, targetValue);
  });
}

function resolveCappedTimerFontSizeFallback(targetValue) {
  var cap = targetValue;
  if (cap >= 8192) return "13px";
  if (cap >= 1024) return "14px";
  if (cap >= 128) return "18px";
  return "22px";
}

function getCappedTimerFontSize(manager, cappedTargetValue) {
  if (!manager) return resolveCappedTimerFontSizeFallback(2048);
  var targetValue = Number(cappedTargetValue);
  targetValue = manager.resolveCappedTargetValueOrNull(targetValue);
  if (targetValue === null) {
    targetValue = 2048;
  }
  var resolveCappedTimerLegendFontSizeCore = manager.callCoreModeRuntime(
    "resolveCappedTimerLegendFontSize",
    [targetValue]
  );
  return manager.resolveCoreStringCallOrFallback(resolveCappedTimerLegendFontSizeCore, function () {
    return resolveCappedTimerFontSizeFallback(targetValue);
  });
}

function normalizeCappedPlaceholderRowValuesCore(coreValues) {
  if (!Array.isArray(coreValues)) return null;
  var normalized = [];
  for (var i = 0; i < coreValues.length; i++) {
    var coreValue = Number(coreValues[i]);
    if (!Number.isInteger(coreValue) || coreValue <= 0) continue;
    normalized.push(coreValue);
  }
  return normalized;
}

function getCappedPlaceholderRowValuesFallback(resolvedCappedState) {
  if (!resolvedCappedState || !resolvedCappedState.isCappedMode) return [];
  var cap = resolvedCappedState.cappedTargetValue;
  var values = [];
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var value = GameManager.TIMER_SLOT_IDS[i];
    if (value > cap) values.push(value);
  }
  return values;
}

function getCappedPlaceholderRowValues(manager, cappedState) {
  if (!manager) return [];
  var resolvedCappedState =
    manager.resolveProvidedCappedModeState(cappedState);
  var resolveCappedPlaceholderRowValuesCore = manager.callCoreModeRuntime(
    "resolveCappedPlaceholderRowValues",
    [{
      isCappedMode: resolvedCappedState.isCappedMode,
      cappedTargetValue: resolvedCappedState.cappedTargetValue,
      timerSlotIds: GameManager.TIMER_SLOT_IDS
    }]
  );
  var normalizedByCore = manager.resolveNormalizedCoreValueOrUndefined(
    resolveCappedPlaceholderRowValuesCore,
    function (coreValues) {
      return normalizeCappedPlaceholderRowValuesCore(coreValues);
    }
  );
  if (normalizedByCore) return normalizedByCore;
  return getCappedPlaceholderRowValuesFallback(resolvedCappedState);
}

function ensureCappedOverflowContainerElement() {
  var container = document.getElementById("capped-timer-overflow-container");
  if (container) return container;
  container = document.createElement("div");
  container.id = "capped-timer-overflow-container";
  return container;
}

function mountCappedOverflowContainerAtAnchor(manager, container, resolvedCappedState) {
  if (!manager || !container || !resolvedCappedState) return;
  var values = manager.getCappedPlaceholderRowValues(resolvedCappedState);
  var anchor = values.length ? manager.getTimerRowEl(values[values.length - 1]) : null;
  if (!(anchor && anchor.parentNode)) return;
  if (container.parentNode !== anchor.parentNode || anchor.nextSibling !== container) {
    anchor.parentNode.insertBefore(container, anchor.nextSibling);
  }
}

function getCappedOverflowContainer(manager, cappedState) {
  if (!manager) return null;
  var resolvedCappedState =
    manager.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return null;
  var container = ensureCappedOverflowContainerElement();
  mountCappedOverflowContainerAtAnchor(manager, container, resolvedCappedState);
  return container;
}

function openStatsPanel(manager) {
  if (!manager) return;
  var overlay = document.getElementById("stats-panel-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  manager.updateStatsPanel();
  writeStatsPanelVisibilityFlag(manager, true);
}

function closeStatsPanel(manager) {
  if (!manager) return;
  var overlay = document.getElementById("stats-panel-overlay");
  if (!overlay) return;
  overlay.style.display = "none";
  writeStatsPanelVisibilityFlag(manager, false);
}

function getTimerModuleViewMode(manager) {
  if (!manager) return "timer";
  var normalizeTimerModuleViewModeCore = manager.callCoreStorageRuntime(
    "normalizeTimerModuleViewMode",
    [manager.timerModuleView]
  );
  return manager.resolveCoreStringCallOrFallback(normalizeTimerModuleViewModeCore, function () {
    return manager.timerModuleView === "hidden" ? "hidden" : "timer";
  });
}

function normalizeTimerModuleViewValue(view) {
  return view === "hidden" ? "hidden" : "timer";
}

function updateTimerModuleBaseHeightFromElement(manager, timerBox) {
  if (!manager || !timerBox) return;
  var height = Math.max(timerBox.offsetHeight || 0, timerBox.scrollHeight || 0);
  if (height <= 0) return;
  manager.timerModuleBaseHeight = Math.max(manager.timerModuleBaseHeight || 0, height);
}

function applyTimerModuleViewToElement(manager, timerBox, nextView) {
  if (!manager || !timerBox) return;
  manager.timerModuleView = nextView;
  if (nextView === "hidden") timerBox.classList.add("timerbox-hidden-mode");
  else timerBox.classList.remove("timerbox-hidden-mode");
  if (manager.timerModuleBaseHeight > 0) {
    timerBox.style.minHeight = manager.timerModuleBaseHeight + "px";
  }
}

function writeStorageJsonMapWithFallback(manager, key, map) {
  if (!manager) return false;
  var writeStorageJsonMapFromContextCore = manager.callCoreStorageRuntime(
    "writeStorageJsonMapFromContext",
    [{
      windowLike: manager.getWindowLike(),
      key: key,
      map: map
    }]
  );
  return manager.resolveCoreBooleanCallOrFallback(writeStorageJsonMapFromContextCore, function () {
    var storage = manager.getWebStorageByName("localStorage");
    if (!canWriteToStorage(storage)) return false;
    try {
      storage.setItem(
        key,
        JSON.stringify(manager.isNonArrayObject(map) ? map : {})
      );
      return true;
    } catch (_errWrite) {
      return false;
    }
  });
}

function resolveNextTimerModuleViewMap(manager, map, nextView) {
  if (!manager) return map;
  var nextMap = map;
  var writeTimerModuleViewForModeToMapCore = manager.callCoreStorageRuntime(
    "writeTimerModuleViewForModeToMap",
    [{
      map: nextMap,
      mode: manager.mode,
      view: nextView
    }]
  );
  if (manager.tryHandleCoreRawValue(writeTimerModuleViewForModeToMapCore, function (coreValue) {
    nextMap = coreValue;
  })) {
    return nextMap;
  }
  nextMap[manager.mode] = normalizeTimerModuleViewValue(nextView);
  return nextMap;
}

function persistTimerModuleViewForCurrentMode(manager, nextView) {
  if (!manager) return;
  var map = manager.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  map = resolveNextTimerModuleViewMap(manager, map, nextView);
  writeStorageJsonMapWithFallback(manager, GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY, map);
}

function applyTimerModuleView(manager, view, skipPersist) {
  if (!manager) return;
  var timerBox = document.getElementById("timerbox");
  if (!timerBox) return;
  updateTimerModuleBaseHeightFromElement(manager, timerBox);
  var next = normalizeTimerModuleViewValue(view);
  applyTimerModuleViewToElement(manager, timerBox, next);
  if (!skipPersist) {
    persistTimerModuleViewForCurrentMode(manager, next);
  }
  manager.callWindowMethod("syncTimerModuleSettingsUI");
}

function setTimerModuleViewMode(manager, view, skipPersist) {
  if (!manager) return;
  manager.applyTimerModuleView(view, !!skipPersist);
}

function readUndoPolicyFieldForMode(manager, mode, fieldName, fallbackValue) {
  if (!manager) return fallbackValue;
  var state = manager.resolveUndoPolicyStateForMode(mode);
  if (!state || typeof state !== "object") return fallbackValue;
  return manager.hasOwnKey(state, fieldName) ? state[fieldName] : fallbackValue;
}

function getForcedUndoSettingForMode(manager, mode) {
  if (!manager) return null;
  var forced = manager.readUndoPolicyFieldForMode(mode, "forcedUndoSetting", null);
  if (forced === true) return true;
  if (forced === false) return false;
  return null;
}

function isUndoAllowedByMode(manager, mode) {
  if (!manager) return false;
  return !!manager.readUndoPolicyFieldForMode(mode, "isUndoAllowedByMode", false);
}

function isUndoSettingFixedForMode(manager, mode) {
  if (!manager) return false;
  return !!manager.readUndoPolicyFieldForMode(mode, "isUndoSettingFixedForMode", false);
}

function resolveUndoPolicyStateForCurrentSessionMode(manager, mode) {
  if (!manager) return null;
  return manager.resolveUndoPolicyStateForMode(mode, {
    hasGameStarted: !!manager.hasGameStarted
  });
}

function canToggleUndoSetting(manager, mode) {
  if (!manager) return false;
  var state = manager.resolveUndoPolicyStateForCurrentSessionMode(mode);
  return !!(state && state.canToggleUndoSetting);
}

function notifyUndoSettingsStateChanged(manager) {
  if (!manager) return;
  manager.callWindowMethod("syncUndoSettingsUI");
}

function resolveUndoEnabledFromModeMap(manager, map, mode) {
  if (!manager) return true;
  var readUndoEnabledForModeFromMapCore = manager.callCoreStorageRuntime(
    "readUndoEnabledForModeFromMap",
    [{
      map: map,
      mode: mode,
      fallbackEnabled: true
    }]
  );
  return manager.resolveCoreBooleanCallOrFallback(readUndoEnabledForModeFromMapCore, function () {
    if (manager.hasOwnKey(map, mode)) return !!map[mode];
    return true;
  });
}

function loadUndoSettingForMode(manager, mode) {
  if (!manager) return false;
  var state = manager.resolveUndoPolicyStateForCurrentSessionMode(mode);
  var forced = state ? state.forcedUndoSetting : null;
  if (forced !== null) return forced;
  if (!(state && state.isUndoAllowedByMode)) return false;
  var map = manager.readLocalStorageJsonMap(GameManager.UNDO_SETTINGS_KEY);
  return resolveUndoEnabledFromModeMap(manager, map, mode);
}

function isUndoInteractionEnabled(manager) {
  if (!manager) return false;
  var state = manager.resolveUndoPolicyStateForMode(manager.mode);
  return !!(state && state.isUndoInteractionEnabled);
}

function applyUndoLinkUiState(canUndo, modeUndoCapable) {
  var undoLink = document.getElementById("undo-link");
  if (!undoLink) return;
  undoLink.style.display = modeUndoCapable ? "" : "none";
  if (!modeUndoCapable) return;
  undoLink.style.pointerEvents = canUndo ? "" : "none";
  undoLink.style.opacity = canUndo ? "" : "0.45";
}

function applyGameOverUndoButtonUiState(canUndo) {
  var undoBtn = document.getElementById("undo-btn-gameover");
  if (!undoBtn) return;
  undoBtn.style.display = canUndo ? "inline-block" : "none";
}

function applyPracticeUndoButtonUiState(canUndo) {
  var practiceUndoBtn = document.getElementById("practice-mobile-undo-btn");
  if (!practiceUndoBtn) return;
  practiceUndoBtn.style.pointerEvents = canUndo ? "" : "none";
  practiceUndoBtn.style.opacity = canUndo ? "" : "0.45";
  practiceUndoBtn.setAttribute("aria-disabled", canUndo ? "false" : "true");
}

function resolveUndoUiStateSnapshot(manager, resolvedState) {
  if (!manager) return null;
  var state = (resolvedState && typeof resolvedState === "object")
    ? resolvedState
    : manager.resolveUndoPolicyStateForMode(manager.mode);
  return {
    canUndo: !!(state && state.isUndoInteractionEnabled),
    modeUndoCapable: !!(state && state.isUndoAllowedByMode)
  };
}

function applyResolvedUndoUiState(stateSnapshot) {
  var snapshot = stateSnapshot && typeof stateSnapshot === "object" ? stateSnapshot : {};
  var canUndo = !!snapshot.canUndo;
  var modeUndoCapable = !!snapshot.modeUndoCapable;
  applyUndoLinkUiState(canUndo, modeUndoCapable);
  applyGameOverUndoButtonUiState(canUndo);
  applyPracticeUndoButtonUiState(canUndo);
}

function updateUndoUiState(manager, resolvedState) {
  if (!manager) return;
  var stateSnapshot = resolveUndoUiStateSnapshot(manager, resolvedState);
  applyResolvedUndoUiState(stateSnapshot);
  manager.callWindowMethod("syncMobileUndoTopButtonAvailability");
}

function normalizeSpawnStatPairCore(corePair) {
  var normalizedCorePair = corePair && typeof corePair === "object" ? corePair : {};
  var corePrimary = Number(normalizedCorePair.primary);
  var coreSecondary = Number(normalizedCorePair.secondary);
  if (
    Number.isInteger(corePrimary) &&
    corePrimary > 0 &&
    Number.isInteger(coreSecondary) &&
    coreSecondary > 0
  ) {
    return { primary: corePrimary, secondary: coreSecondary };
  }
  return null;
}

function resolveSpawnStatPairFallbackFromTable(spawnTable) {
  var table = Array.isArray(spawnTable) ? spawnTable : [];
  var values = [];
  for (var i = 0; i < table.length; i++) {
    var item = table[i];
    if (!item || !Number.isInteger(Number(item.value)) || Number(item.value) <= 0) continue;
    var value = Number(item.value);
    if (values.indexOf(value) === -1) values.push(value);
  }
  values.sort(function (a, b) { return a - b; });
  var primary = values.length > 0 ? values[0] : 2;
  var secondary = values.length > 1 ? values[1] : primary;
  return { primary: primary, secondary: secondary };
}

function getSpawnStatPair(manager) {
  if (!manager) return { primary: 2, secondary: 2 };
  var getSpawnStatPairCore = manager.callCoreRulesRuntime(
    "getSpawnStatPair",
    [manager.spawnTable || []]
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    getSpawnStatPairCore,
    function (corePair) {
      return normalizeSpawnStatPairCore(corePair);
    },
    function () {
      return resolveSpawnStatPairFallbackFromTable(manager.spawnTable);
    }
  );
}

function normalizeComputeStepStatsCoreValue(coreValue) {
  var raw = coreValue && typeof coreValue === "object" ? coreValue : {};
  var coreTotal = Number(raw.totalSteps);
  var coreMoves = Number(raw.moveSteps);
  var coreUndo = Number(raw.undoSteps);
  if (
    Number.isFinite(coreTotal) &&
    Number.isFinite(coreMoves) &&
    Number.isFinite(coreUndo)
  ) {
    return {
      totalSteps: coreTotal,
      moveSteps: coreMoves,
      undoSteps: coreUndo
    };
  }
  return null;
}

function computeStepStatsFallback(manager, src, limit) {
  if (!manager) return { totalSteps: 0, moveSteps: 0, undoSteps: 0 };
  var moveSteps = 0;
  var undoSteps = 0;
  if (src) {
    for (var i = 0; i < limit; i++) {
      var kind = getActionKind(manager, src[i]);
      if (kind === "u") {
        undoSteps++;
        if (moveSteps > 0) moveSteps--;
      } else if (kind === "m") {
        moveSteps++;
      }
    }
  }
  return {
    totalSteps: src ? limit : 0,
    moveSteps: moveSteps,
    undoSteps: undoSteps
  };
}

function resolveComputeStepStatsInput(manager) {
  if (!manager) return { limit: 0, src: null };
  return {
    limit: manager.replayMode ? manager.replayIndex : manager.moveHistory.length,
    src: manager.replayMode ? manager.replayMoves : manager.moveHistory
  };
}

function computeStepStats(manager) {
  if (!manager) return { totalSteps: 0, moveSteps: 0, undoSteps: 0 };
  var stepStatsInput = resolveComputeStepStatsInput(manager);
  var limit = stepStatsInput.limit;
  var src = stepStatsInput.src;
  var computeReplayStepStatsCore = manager.callCoreReplayExecutionRuntime(
    "computeReplayStepStats",
    [{
      actions: src,
      limit: limit
    }]
  );
  var coreStats = manager.resolveNormalizedCoreValueOrFallback(
    computeReplayStepStatsCore,
    function (coreValue) {
      return normalizeComputeStepStatsCoreValue(coreValue);
    },
    function () {
      return null;
    }
  );
  if (coreStats) return coreStats;
  return computeStepStatsFallback(manager, src, limit);
}

function confirmRestartGame() {
  return confirm("是否确认开始新游戏?");
}

function prepareRestartSessionState(manager) {
  if (!manager) return;
  manager.actuator.continue();
  manager.undoStack = [];
  manager.clearSavedGameState(manager.modeKey);
}

function tryRestartPracticeFromSavedBase(manager) {
  if (!manager) return false;
  if (!(manager.modeKey === "practice_legacy" && manager.practiceRestartBoardMatrix)) return false;
  manager.restartWithBoard(
    manager.practiceRestartBoardMatrix,
    manager.practiceRestartModeConfig || manager.modeConfig,
    { preservePracticeRestartBase: true }
  );
  manager.isTestMode = true;
  return true;
}

function restartWithFreshSetup(manager) {
  if (!manager) return;
  manager.setup(undefined, { disableStateRestore: true });
}

function restartGame(manager) {
  if (!manager) return;
  if (!confirmRestartGame()) return;
  prepareRestartSessionState(manager);
  if (tryRestartPracticeFromSavedBase(manager)) return;
  restartWithFreshSetup(manager);
}

function restartWithSeed(manager, seed, modeConfig) {
  if (!manager) return;
  manager.actuator.continue();
  manager.setup(seed, { modeConfig: modeConfig, disableStateRestore: true }); // Force setup with specific seed
}

function hydrateRestartBoardState(manager, board) {
  if (!manager) return;
  manager.setBoardFromMatrix(board);
  manager.initialBoardMatrix = getFinalBoardMatrix(manager);
  manager.replayStartBoardMatrix = manager.cloneBoardMatrix(manager.initialBoardMatrix);
}

function syncPracticeRestartBase(manager, modeConfig, options) {
  if (!manager) return;
  if (!(manager.modeKey === "practice_legacy" && (options.setPracticeRestartBase || options.preservePracticeRestartBase))) {
    return;
  }
  if (!(Array.isArray(manager.initialBoardMatrix) && manager.initialBoardMatrix.length === manager.height)) {
    return;
  }
  manager.practiceRestartBoardMatrix = manager.cloneBoardMatrix(manager.initialBoardMatrix);
  manager.practiceRestartModeConfig = modeConfig
    ? manager.clonePlain(modeConfig)
    : manager.clonePlain(manager.modeConfig);
}

function resolveRestartWithBoardSetupSeed(options) {
  var normalizedOptions = options && typeof options === "object" ? options : {};
  // Non-replay board restores must keep undo enabled; replay restores keep replay mode.
  return normalizedOptions.asReplay ? 0 : undefined;
}

function buildRestartWithBoardSetupOptions(modeConfig) {
  return {
    skipStartTiles: true,
    modeConfig: modeConfig,
    disableStateRestore: true
  };
}

function restartWithBoard(manager, board, modeConfig, options) {
  if (!manager) return;
  var normalizedOptions = options || {};
  manager.actuator.continue();
  var setupSeed = resolveRestartWithBoardSetupSeed(normalizedOptions);
  var setupOptions = buildRestartWithBoardSetupOptions(modeConfig);
  manager.setup(setupSeed, setupOptions);
  hydrateRestartBoardState(manager, board);
  syncPracticeRestartBase(manager, modeConfig, normalizedOptions);
  manager.actuate();
}

function restartReplaySession(manager, payload, modeConfig, useBoardRestart) {
  if (!manager) return;
  if (useBoardRestart) {
    restartWithBoard(manager, payload, modeConfig, { asReplay: true });
    return;
  }
  restartWithSeed(manager, payload, modeConfig);
}

function resolveGlobalModeConfigOverride(manager) {
  if (!manager) return null;
  if (!(typeof window !== "undefined" && window.GAME_MODE_CONFIG && typeof window.GAME_MODE_CONFIG === "object")) {
    return null;
  }
  try {
    return manager.clonePlain(window.GAME_MODE_CONFIG);
  } catch (_err) {
    return null;
  }
}

function resolveSetupModeConfigSource(manager, setupOptions, detectedMode, globalModeConfig) {
  if (!manager) return null;
  var optionConfig = setupOptions && setupOptions.modeConfig;
  return optionConfig || globalModeConfig || manager.resolveModeConfig(detectedMode);
}

function resolveSetupModeConfig(manager, setupOptions) {
  if (!manager) return null;
  var detectedMode = detectMode(manager);
  var globalModeConfig = resolveGlobalModeConfigOverride(manager);
  var resolvedModeConfig = resolveSetupModeConfigSource(manager, setupOptions, detectedMode, globalModeConfig);
  return manager.normalizeModeConfig(resolvedModeConfig && resolvedModeConfig.key, resolvedModeConfig);
}

function applySpecialRulesState(manager) {
  if (!manager) return;
  var computeSpecialRulesStateCore = manager.callCoreSpecialRulesRuntime(
    "computeSpecialRulesState",
    [
      manager.specialRules || {},
      manager.width,
      manager.height,
      manager.clonePlain.bind(manager)
    ]
  );
  var handledByCore = manager.tryHandleCoreRawValue(computeSpecialRulesStateCore, function (coreValue) {
    applySpecialRulesCoreState(manager, coreValue);
  });
  if (handledByCore) return;
  applySpecialRulesFallbackState(manager, manager.specialRules || {});
}

function resolveSpecialRulesBlockedCellSetFromCoreState(state) {
  return state.blockedCellSet && typeof state.blockedCellSet === "object"
    ? state.blockedCellSet
    : {};
}

function resolveSpecialRulesBlockedCellsListFromCoreState(state) {
  return Array.isArray(state.blockedCellsList) ? state.blockedCellsList : [];
}

function resolveSpecialRulesUndoLimitValue(value) {
  return (Number.isInteger(value) && value >= 0)
    ? value
    : null;
}

function resolveSpecialRulesComboMultiplierValue(value) {
  return (Number.isFinite(value) && value > 1)
    ? Number(value)
    : 1;
}

function resolveSpecialRulesDirectionLockRulesValue(manager, value) {
  if (!manager) return null;
  return value && typeof value === "object"
    ? manager.clonePlain(value)
    : null;
}

function applySpecialRulesCoreState(manager, coreValue) {
  if (!manager) return;
  var state = coreValue && typeof coreValue === "object" ? coreValue : {};
  manager.blockedCellSet = resolveSpecialRulesBlockedCellSetFromCoreState(state);
  manager.blockedCellsList = resolveSpecialRulesBlockedCellsListFromCoreState(state);
  manager.undoLimit = resolveSpecialRulesUndoLimitValue(state.undoLimit);
  manager.comboMultiplier = resolveSpecialRulesComboMultiplierValue(state.comboMultiplier);
  manager.directionLockRules = resolveSpecialRulesDirectionLockRulesValue(manager, state.directionLockRules);
}

function resolveBlockedCellPoint(item, width, height) {
  var x = null;
  var y = null;
  if (Array.isArray(item) && item.length >= 2) {
    x = Number(item[0]);
    y = Number(item[1]);
  } else if (item && typeof item === "object") {
    x = Number(item.x);
    y = Number(item.y);
  }
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  if (x < 0 || x >= width || y < 0 || y >= height) return null;
  return { x: x, y: y };
}

function applySpecialRulesBlockedCellsFallback(manager, blockedRaw) {
  if (!manager) return;
  manager.blockedCellSet = {};
  manager.blockedCellsList = [];
  var source = Array.isArray(blockedRaw) ? blockedRaw : [];
  for (var i = 0; i < source.length; i++) {
    var point = resolveBlockedCellPoint(source[i], manager.width, manager.height);
    if (!point) continue;
    manager.blockedCellSet[point.x + ":" + point.y] = true;
    manager.blockedCellsList.push(point);
  }
}

function applySpecialRulesFallbackState(manager, rules) {
  if (!manager) return;
  var safeRules = rules && typeof rules === "object" ? rules : {};
  applySpecialRulesBlockedCellsFallback(manager, safeRules.blocked_cells);
  manager.undoLimit = resolveSpecialRulesUndoLimitValue(safeRules.undo_limit);
  manager.comboMultiplier = resolveSpecialRulesComboMultiplierValue(safeRules.combo_multiplier);
  manager.directionLockRules = resolveSpecialRulesDirectionLockRulesValue(manager, safeRules.direction_lock);
}

function applySetupModeConfig(manager, cfg) {
  if (!manager || !cfg) return;
  applySetupModeConfigCoreFields(manager, cfg);
  applySetupModeConfigRulesAndSpecialState(manager, cfg);
  syncSetupModeScoreManager(manager, cfg);
  syncSetupModeDocumentAttributes(manager, cfg);
  syncSetupModeWindowConfig(manager);
}

function applySetupModeConfigCoreFields(manager, cfg) {
  if (!manager || !cfg) return;
  manager.modeConfig = cfg;
  manager.mode = cfg.key;
  manager.modeKey = cfg.key;
  manager.width = cfg.board_width;
  manager.height = cfg.board_height;
  manager.size = manager.width;
  manager.ruleset = cfg.ruleset;
  manager.maxTile = cfg.max_tile || Infinity;
}

function resolveSetupModeFamily(cfg, rankedBucket) {
  if (!cfg) return "pow2";
  if (cfg.mode_family) return cfg.mode_family;
  return cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
}

function resolveSetupRankPolicy(cfg, rankedBucket) {
  if (!cfg) return "unranked";
  if (cfg.rank_policy) return cfg.rank_policy;
  return rankedBucket !== "none" ? "ranked" : "unranked";
}

function applySetupModeDerivedPolicyFields(manager, cfg) {
  if (!manager || !cfg) return;
  manager.rankedBucket = cfg.ranked_bucket || "none";
  manager.modeFamily = resolveSetupModeFamily(cfg, manager.rankedBucket);
  manager.rankPolicy = resolveSetupRankPolicy(cfg, manager.rankedBucket);
}

function applySetupModeRuleNormalization(manager, cfg) {
  if (!manager || !cfg) return;
  manager.spawnTable = manager.normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
  manager.specialRules = manager.normalizeSpecialRules(cfg.special_rules);
}

function applySetupModeConfigRulesAndSpecialState(manager, cfg) {
  if (!manager || !cfg) return;
  applySetupModeRuleNormalization(manager, cfg);
  applySetupModeDerivedPolicyFields(manager, cfg);
  applySpecialRulesState(manager);
}

function syncSetupModeScoreManager(manager, cfg) {
  if (!manager || !cfg) return;
  if (manager.scoreManager && typeof manager.scoreManager.setModeKey === "function") {
    manager.scoreManager.setModeKey(cfg.key);
  }
}

function syncSetupModeDocumentAttributes(manager, cfg) {
  if (!manager || !cfg) return;
  if (typeof document !== "undefined" && document.body) {
    document.body.setAttribute("data-mode-id", cfg.key);
    document.body.setAttribute("data-ruleset", cfg.ruleset);
    document.body.setAttribute("data-mode-family", manager.modeFamily);
    document.body.setAttribute("data-rank-policy", manager.rankPolicy);
  }
}

function syncSetupModeWindowConfig(manager) {
  if (!manager) return;
  if (typeof window === "undefined") return;
  window.GAME_MODE_CONFIG = manager.clonePlain(manager.modeConfig);
}

function resolveIsGameTerminatedState(manager) {
  if (!manager) return false;
  var isGameTerminatedStateCore = manager.callCoreModeRuntime(
    "isGameTerminatedState",
    [{
      over: manager.over,
      won: manager.won,
      keepPlaying: manager.keepPlaying
    }]
  );
  return manager.resolveCoreBooleanCallOrFallback(isGameTerminatedStateCore, function () {
    return !!manager.over || (!!manager.won && !manager.keepPlaying);
  });
}

function applyGameTerminatedSideEffects(manager) {
  if (!manager) return;
  manager.stopTimer();
  manager.timerEnd = Date.now();
}

function isGameTerminated(manager) {
  if (!manager) return false;
  var terminated = resolveIsGameTerminatedState(manager);
  if (!terminated) return false;
  applyGameTerminatedSideEffects(manager);
  return true;
}

function resolvePreferredTimerModuleView(manager) {
  if (!manager) return "timer";
  var timerModuleViewMap = manager.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  var readTimerModuleViewForModeFromMapCore = manager.callCoreStorageRuntime(
    "readTimerModuleViewForModeFromMap",
    [{
      map: timerModuleViewMap,
      mode: manager.mode
    }]
  );
  return manager.resolveCoreStringCallOrFallback(readTimerModuleViewForModeFromMapCore, function () {
    return resolveTimerModuleViewByMode(timerModuleViewMap, this.mode);
  });
}

function resolveTimerModuleViewByMode(timerModuleViewMap, mode) {
  var value = timerModuleViewMap && typeof timerModuleViewMap === "object"
    ? timerModuleViewMap[mode]
    : null;
  return value === "hidden" ? "hidden" : "timer";
}

function hideLegacyStepStatsLabels() {
  var legacyTotalEl = document.getElementById("stats-total");
  if (legacyTotalEl) legacyTotalEl.style.visibility = "hidden";
  var legacyMovesEl = document.getElementById("stats-moves");
  if (legacyMovesEl) legacyMovesEl.style.visibility = "hidden";
  var legacyUndoEl = document.getElementById("stats-undo");
  if (legacyUndoEl) legacyUndoEl.style.visibility = "hidden";
}

function clearTimerSlotTexts() {
  var timerSlots = GameManager.TIMER_SLOT_IDS;
  timerSlots.forEach(function (slotId) {
    var el = document.getElementById("timer" + slotId);
    if (el) el.textContent = "";
  });
}

function resetTimerSubRowTexts() {
  var sub8k = document.getElementById("timer8192-sub");
  if (sub8k) sub8k.textContent = "";
  var sub16k = document.getElementById("timer16384-sub");
  if (sub16k) sub16k.textContent = "";
  var subContainer = document.getElementById("timer32k-sub-container");
  if (subContainer) subContainer.style.display = "none";
}

function resetTimerBaseUiForSetup(manager) {
  if (!manager) return;
  if (manager.ipsInterval) clearInterval(manager.ipsInterval);
  hideLegacyStepStatsLabels();
  var timerEl0 = document.getElementById("timer");
  if (timerEl0) timerEl0.textContent = manager.pretty(0);
  clearTimerSlotTexts();
  resetTimerSubRowTexts();
}

function repositionCappedTimerContainerForSetup(manager, cappedTimerContainer) {
  if (!manager || !cappedTimerContainer) return;
  var cappedStateForReposition = manager.resolveCappedModeState();
  var anchorTarget = cappedStateForReposition.cappedTargetValue || 2048;
  var anchorRow = manager.getTimerRowEl(anchorTarget);
  if (anchorRow && anchorRow.parentNode) {
    var parent = anchorRow.parentNode;
    if (!(cappedTimerContainer.parentNode === parent && anchorRow.nextSibling === cappedTimerContainer)) {
      parent.insertBefore(cappedTimerContainer, anchorRow.nextSibling);
    }
  }
}

function showAllTimerRowsForSetup(manager) {
  if (!manager) return;
  for (var allIndex = 0; allIndex < GameManager.TIMER_SLOT_IDS.length; allIndex++) {
    manager.setTimerRowVisibleState(GameManager.TIMER_SLOT_IDS[allIndex], true, false);
  }
}

function applyProgressiveCappedRowVisibilityForSetup(manager) {
  if (!manager) return;
  for (var progressiveIndex = 0; progressiveIndex < GameManager.TIMER_SLOT_IDS.length; progressiveIndex++) {
    manager.setTimerRowVisibleState(GameManager.TIMER_SLOT_IDS[progressiveIndex], false, true);
  }
  manager.resetProgressiveCapped64Rows();
}

function applyCappedTargetRowVisibilityForSetup(manager, cappedTargetValue) {
  if (!manager) return;
  for (var cappedIndex = 0; cappedIndex < GameManager.TIMER_SLOT_IDS.length; cappedIndex++) {
    var value = GameManager.TIMER_SLOT_IDS[cappedIndex];
    manager.setTimerRowVisibleState(value, value <= cappedTargetValue, true);
  }
}

function applyCappedRowVisibilityFallbackForSetup(manager, cappedState) {
  if (!manager) return;
  if (!cappedState.isCappedMode) {
    showAllTimerRowsForSetup(manager);
  } else if (cappedState.isProgressiveCapped64Mode) {
    applyProgressiveCappedRowVisibilityForSetup(manager);
  } else {
    applyCappedTargetRowVisibilityForSetup(manager, cappedState.cappedTargetValue);
  }
}

function applyCappedRowVisibilityForSetup(manager, cappedState) {
  if (!manager) return;
  var resolveCappedRowVisibilityPlanCore = manager.callCoreModeRuntime(
    "resolveCappedRowVisibilityPlan",
    [{
      isCappedMode: cappedState.isCappedMode,
      isProgressiveCapped64Mode: cappedState.isProgressiveCapped64Mode,
      cappedTargetValue: cappedState.cappedTargetValue,
      timerSlotIds: GameManager.TIMER_SLOT_IDS
    }]
  );
  var appliedByCore = manager.resolveNormalizedCoreValueOrFallback(
    resolveCappedRowVisibilityPlanCore,
    function (coreValue) {
      var plan = coreValue;
      if (!Array.isArray(plan) || plan.length <= 0) return false;
      for (var p = 0; p < plan.length; p++) {
        var item = plan[p];
        if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
        this.setTimerRowVisibleState(item.value, !!item.visible, !!item.keepSpace);
      }
      if (cappedState.isCappedMode && cappedState.isProgressiveCapped64Mode) {
        this.resetProgressiveCapped64Rows();
      }
      return true;
    },
    function () {
      return false;
    }
  );
  if (!appliedByCore) {
    applyCappedRowVisibilityFallbackForSetup(manager, cappedState);
  }
}

function resetCappedPlaceholderTimerRows(manager, cappedStateForReset) {
  if (!manager || !cappedStateForReset || !cappedStateForReset.isCappedMode) return;
  var placeholderValues = manager.getCappedPlaceholderRowValues(cappedStateForReset);
  for (var placeholderValueIndex = 0; placeholderValueIndex < placeholderValues.length; placeholderValueIndex++) {
    var slotId = String(placeholderValues[placeholderValueIndex]);
    var row = manager.getTimerRowEl(slotId);
    var timerEl = document.getElementById("timer" + slotId);
    if (timerEl) timerEl.textContent = "";
    if (!row) continue;

    var legend = row.querySelector(".timertile");
    if (legend) {
      legend.className = "timertile timer-legend-" + slotId;
      legend.textContent = slotId;
    }
    row.removeAttribute("data-capped-repeat");
  }
}

function resetCappedTimerContainersForSetup(manager, cappedTimerContainer, cappedStateForReset) {
  if (!manager) return;
  manager.cappedMilestoneCount = 0;
  if (cappedTimerContainer) cappedTimerContainer.innerHTML = "";
  var overflowContainer = document.getElementById("capped-timer-overflow-container");
  if (overflowContainer) overflowContainer.innerHTML = "";
  resetCappedPlaceholderTimerRows(manager, cappedStateForReset);
  manager.getCappedOverflowContainer(cappedStateForReset);
  manager.callWindowMethod("cappedTimerReset");
}

function resetTimerUiForSetup(manager) {
  if (!manager) return;
  resetTimerBaseUiForSetup(manager);
  var cappedTimerContainer = document.getElementById("capped-timer-container");
  repositionCappedTimerContainerForSetup(manager, cappedTimerContainer);
  var cappedState = manager.resolveCappedModeState();
  applyCappedRowVisibilityForSetup(manager, cappedState);
  var cappedStateForReset = manager.resolveCappedModeState();
  resetCappedTimerContainersForSetup(manager, cappedTimerContainer, cappedStateForReset);
}

function resolveWindowNameSavedCandidate(manager) {
  if (!manager) return null;
  var windowLikeForSavedCandidate = manager.getWindowLike();
  var readSavedPayloadFromWindowNameCore = manager.callCoreStorageRuntime(
    "readSavedPayloadFromWindowName",
    [manager.createCoreModeContextPayload({
      windowLike: windowLikeForSavedCandidate,
      windowNameKey: GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY,
      modeKey: manager.modeKey
    })]
  );
  var windowNameSavedCandidate = manager.resolveNormalizedCoreValueOrUndefined(
    readSavedPayloadFromWindowNameCore,
    function (payloadByCore) {
      if (manager.isNonArrayObject(payloadByCore)) return payloadByCore;
      if (payloadByCore === null) return null;
      return undefined;
    }
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
  if (!(map && typeof map === "object")) return null;
  var savedKey = manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY;
  var payload = map[savedKey];
  if (payload && typeof payload === "object") return payload;
  return null;
}

function pickLatestSavedStateCandidate(candidates) {
  var saved = null;
  if (!Array.isArray(candidates)) return saved;
  for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    var nextCandidate = candidates[candidateIndex];
    if (!nextCandidate || typeof nextCandidate !== "object") continue;
    if (!saved || typeof saved !== "object") {
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
  if (!manager || !saved || typeof saved !== "object") {
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
  if (!manager || !saved || typeof saved !== "object") return;
  manager.moveHistory = Array.isArray(saved.move_history) ? saved.move_history.slice() : [];
  manager.ipsInputCount = Number.isInteger(saved.ips_input_count) && saved.ips_input_count >= 0
    ? saved.ips_input_count
    : manager.moveHistory.length;
  manager.undoStack = Array.isArray(saved.undo_stack) ? saved.undo_stack.slice() : [];
  manager.replayCompactLog = typeof saved.replay_compact_log === "string" ? saved.replay_compact_log : "";
  manager.sessionReplayV3 = saved.session_replay_v3 && typeof saved.session_replay_v3 === "object"
    ? manager.clonePlain(saved.session_replay_v3)
    : manager.sessionReplayV3;
  manager.spawnValueCounts = saved.spawn_value_counts && typeof saved.spawn_value_counts === "object"
    ? manager.clonePlain(saved.spawn_value_counts)
    : {};
  manager.spawnTwos = manager.spawnValueCounts["2"] || 0;
  manager.spawnFours = manager.spawnValueCounts["4"] || 0;
}

function applySavedStateBoardSnapshotFields(manager, saved) {
  if (!manager || !saved || typeof saved !== "object") return;
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
    (saved.practice_restart_mode_config && typeof saved.practice_restart_mode_config === "object")
      ? manager.clonePlain(saved.practice_restart_mode_config)
      : null;
}

function applySavedStateStatusFields(manager, saved) {
  if (!manager || !saved || typeof saved !== "object") return;
  manager.score = Number.isInteger(saved.score) && saved.score >= 0 ? saved.score : 0;
  manager.over = !!saved.over;
  manager.won = !!saved.won;
  manager.keepPlaying = !!saved.keep_playing;
}

function applySavedStateSeedAndSessionFields(manager, saved) {
  if (!manager || !saved || typeof saved !== "object") return;
  manager.initialSeed = Number.isFinite(saved.initial_seed) ? Number(saved.initial_seed) : manager.initialSeed;
  manager.seed = Number.isFinite(saved.seed) ? Number(saved.seed) : manager.initialSeed;
  manager.reached32k = !!saved.reached_32k;
  manager.cappedMilestoneCount = Number.isInteger(saved.capped_milestone_count) ? saved.capped_milestone_count : 0;
  manager.capped64Unlocked = saved.capped64_unlocked && typeof saved.capped64_unlocked === "object"
    ? manager.clonePlain(saved.capped64_unlocked)
    : manager.capped64Unlocked;
  manager.challengeId = typeof saved.challenge_id === "string" && saved.challenge_id ? saved.challenge_id : null;
  manager.hasGameStarted = !!saved.has_game_started;
  manager.sessionSubmitDone = false;
}

function applySavedStateRoundStateFields(manager, saved) {
  if (!manager || !saved || typeof saved !== "object") return;
  manager.comboStreak = Number.isInteger(saved.combo_streak) ? saved.combo_streak : 0;
  manager.successfulMoveCount = Number.isInteger(saved.successful_move_count) ? saved.successful_move_count : 0;
  manager.undoUsed = Number.isInteger(saved.undo_used) ? saved.undo_used : 0;
  manager.lockConsumedAtMoveCount = Number.isInteger(saved.lock_consumed_at_move_count) ? saved.lock_consumed_at_move_count : -1;
  manager.lockedDirectionTurn = Number.isInteger(saved.locked_direction_turn) ? saved.locked_direction_turn : null;
  manager.lockedDirection = Number.isInteger(saved.locked_direction) ? saved.locked_direction : null;
}

function applySavedStateTimerFields(manager, saved) {
  if (!manager || !saved || typeof saved !== "object") return;
  manager.accumulatedTime = Number.isFinite(saved.duration_ms) && saved.duration_ms >= 0 ? Math.floor(saved.duration_ms) : 0;
  manager.time = manager.accumulatedTime;
  manager.startTime = null;
  manager.timerStatus = 0;
}

function applySavedStateCoreFields(manager, saved) {
  if (!manager || !saved || typeof saved !== "object") return;
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

function applySavedTimerFixedRowState(manager, slotId, rowState, cappedStateForRestore) {
  if (!manager || !rowState) return;
  var row = manager.getTimerRowEl(slotId);
  var timerElBySlot = document.getElementById("timer" + slotId);
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
  if (!manager || !saved || typeof saved !== "object") return;
  var fixed = saved.timer_fixed_rows;
  if (!(fixed && typeof fixed === "object")) return;
  for (var fixedIndex = 0; fixedIndex < GameManager.TIMER_SLOT_IDS.length; fixedIndex++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[fixedIndex]);
    var rowState = fixed[slotId];
    if (!rowState) continue;
    applySavedTimerFixedRowState(manager, slotId, rowState, cappedStateForRestore);
  }
}

function restoreSavedDynamicTimerRowsIntoContainer(manager, container, rowStates, cappedStateForRestore) {
  if (!manager || !container) return;
  var rows = Array.isArray(rowStates) ? rowStates : [];
  container.innerHTML = "";
  for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    container.appendChild(manager.createSavedDynamicTimerRow(rows[rowIndex], cappedStateForRestore));
  }
}

function restoreSavedTimerDynamicRows(manager, saved, cappedStateForRestore) {
  if (!manager || !saved || typeof saved !== "object") return;
  var capped = document.getElementById("capped-timer-container");
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

function setTextContentByIdWhenString(elementId, value) {
  if (typeof value !== "string") return;
  var element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

function setDisplayByIdWhenBoolean(elementId, value, trueDisplay, falseDisplay) {
  if (typeof value !== "boolean") return;
  var element = document.getElementById(elementId);
  if (!element) return;
  element.style.display = value ? trueDisplay : falseDisplay;
}

function restoreSavedTimerSubRows(manager, saved) {
  if (!manager || !saved || typeof saved !== "object") return;
  setTextContentByIdWhenString("timer8192-sub", saved.timer_sub_8192);
  setTextContentByIdWhenString("timer16384-sub", saved.timer_sub_16384);
  setDisplayByIdWhenBoolean("timer32k-sub-container", saved.timer_sub_visible, "block", "none");
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
  if (!manager || !saved || typeof saved !== "object") return;
  var restoreContext = resolveSavedTimerUiRestoreContext(manager);
  applySavedTimerRowsRestore(manager, saved, restoreContext);
  applySavedTimerUiRestorePostEffects(manager, restoreContext.cappedStateForRestore);
}

function syncSavedStateTimerDisplay(manager) {
  if (!manager) return;
  var timerEl = document.getElementById("timer");
  if (timerEl) timerEl.textContent = manager.pretty(manager.accumulatedTime);
}

function shouldResumeTimerFromSavedState(manager, saved) {
  if (!manager || !saved) return false;
  if (manager.over || manager.won) return false;
  return saved.timer_status === 1;
}

function finalizeSavedStateRestore(manager, saved) {
  if (!manager || !saved || typeof saved !== "object") return;
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
  var result = validateResult && typeof validateResult === "object" ? validateResult : {};
  if (result.shouldClearSavedState) manager.clearSavedGameState();
  return false;
}

function applySavedStateRestorePipeline(manager, saved) {
  if (!manager || !saved || typeof saved !== "object") return false;
  applySavedStateCoreFields(manager, saved);
  restoreSavedTimerUiState(manager, saved);
  finalizeSavedStateRestore(manager, saved);
  return true;
}

function tryRestoreSavedStateCandidate(manager, saved) {
  if (!manager || !(saved && typeof saved === "object")) return false;
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

function addInitialTilesWhenNeeded(manager, options, restoredFromSavedState) {
  if (!manager) return;
  var skipStartTiles = !!(options && options.skipStartTiles);
  if (skipStartTiles || restoredFromSavedState) return;
  for (var startIndex = 0; startIndex < manager.startTiles; startIndex++) {
    manager.addRandomTile();
  }
}

function ensureInitialBoardMatrixWhenNeeded(manager, restoredFromSavedState) {
  if (!manager || restoredFromSavedState) return;
  manager.initialBoardMatrix = manager.getFinalBoardMatrix();
}

function restoreOrInitBoardState(options, hasInputSeed) {
  // Add the initial tiles unless a replay imports an explicit board.
  var restoredFromSavedState = false;
  if (shouldAttemptSavedStateRestoreForManager(this, options, hasInputSeed)) {
    restoredFromSavedState = tryRestoreLatestSavedState(this);
  }
  addInitialTilesWhenNeeded(this, options, restoredFromSavedState);
  ensureInitialBoardMatrixWhenNeeded(this, restoredFromSavedState);
  return restoredFromSavedState;
}

function syncSetupUiAfterStateRestore(manager, preferredTimerModuleView) {
  if (!manager) return;
  refreshSpawnRateDisplay(manager);
  manager.updateUndoUiState();
  manager.notifyUndoSettingsStateChanged();
  manager.applyTimerModuleView(preferredTimerModuleView, true);
}

function syncSetupStatsPanelAfterActuate(manager, restoredFromSavedState) {
  if (!manager) return;
  if (restoredFromSavedState) {
    manager.updateStatsPanel();
  } else {
    manager.updateStatsPanel(0, 0, 0);
  }
}

function finalizeSetupState(manager, preferredTimerModuleView, restoredFromSavedState) {
  if (!manager) return;
  syncSetupUiAfterStateRestore(manager, preferredTimerModuleView);
  runSetupActuate(manager);
  syncSetupStatsPanelAfterActuate(manager, restoredFromSavedState);
}

function runSetupActuate(manager) {
  if (!manager) return;
  manager.actuate();
}

function resetSetupRoundState(manager) {
  if (!manager) return;
  manager.grid = new Grid(manager.width, manager.height);
  manager.score = 0;
  manager.over = false;
  manager.won = false;
  manager.keepPlaying = false;
}

function initializeSetupUiState(manager) {
  if (!manager) return;
  initializeTimerMilestones(manager);
  resetRoundStatsState(manager);
  resetTimerUiForSetup(manager);
}

function resolveSetupRestoreState(manager, setupOptions, hasInputSeed) {
  if (!manager) return createDefaultSetupRestoreState();
  var preferredTimerModuleView = resolvePreferredTimerModuleView(manager);
  var restoredFromSavedState = restoreOrInitBoardState.call(manager, setupOptions, hasInputSeed);
  return {
    preferredTimerModuleView: preferredTimerModuleView,
    restoredFromSavedState: restoredFromSavedState
  };
}

function createDefaultSetupRestoreState() {
  return {
    preferredTimerModuleView: "timer",
    restoredFromSavedState: false
  };
}

function createSetupInitializationContext(manager, inputSeed, setupOptions) {
  if (!manager) return null;
  var hasInputSeed = initializeSessionState(manager, inputSeed, setupOptions);
  return {
    hasInputSeed: hasInputSeed,
    setupOptions: setupOptions
  };
}

function resolveSetupRestoreStateFromContext(manager, setupContext) {
  if (!manager || !setupContext) return createDefaultSetupRestoreState();
  return resolveSetupRestoreState(manager, setupContext.setupOptions, setupContext.hasInputSeed);
}

function runSetupStateInitialization(manager, inputSeed, setupOptions) {
  if (!manager) return;
  var setupContext = createSetupInitializationContext(manager, inputSeed, setupOptions);
  initializeSetupUiState(manager);
  var restoreState = resolveSetupRestoreStateFromContext(manager, setupContext);
  finalizeSetupState(manager, restoreState.preferredTimerModuleView, restoreState.restoredFromSavedState);
}

function setupGame(manager, inputSeed, options) {
  if (!manager) return;
  var setupOptions = options && typeof options === "object" ? options : {};
  var cfg = resolveSetupModeConfig(manager, setupOptions);
  applySetupModeConfig(manager, cfg);
  resetSetupRoundState(manager);
  runSetupStateInitialization(manager, inputSeed, setupOptions);
}

function tryInsertForcedReplaySpawn(manager) {
  if (!manager) return false;
  var forcedSpawn = resolveForcedReplaySpawn(manager);
  if (!forcedSpawn) return false;
  if (canInsertForcedReplaySpawn(manager, forcedSpawn)) {
    applyForcedReplaySpawn(manager, forcedSpawn);
  }
  return true;
}

function resolveForcedReplaySpawn(manager) {
  if (!manager) return null;
  if (!manager.replayMode) return null;
  return manager.forcedSpawn || null;
}

function canInsertForcedReplaySpawn(manager, forcedSpawn) {
  if (!manager || !forcedSpawn) return false;
  return manager.grid.cellAvailable(forcedSpawn) && !manager.isBlockedCell(forcedSpawn.x, forcedSpawn.y);
}

function applyForcedReplaySpawn(manager, forcedSpawn) {
  if (!manager || !forcedSpawn) return;
  var forcedTile = new Tile(forcedSpawn, forcedSpawn.value);
  manager.grid.insertTile(forcedTile);
  recordSpawnValue(manager, forcedSpawn.value);
  manager.forcedSpawn = null;
}

function resolveSpawnRandomStepCount(manager) {
  if (!manager) return 0;
  return manager.replayMode ? manager.replayIndex : manager.moveHistory.length;
}

function primeSpawnRandomSource(manager, stepCount) {
  if (!manager) return;
  Math.seedrandom(manager.seed);
  for (var i = 0; i < stepCount; i++) {
    Math.random();
  }
}

function resolveRandomSpawnTilePlan(manager, available) {
  if (!manager || !Array.isArray(available) || available.length <= 0) return null;
  var value = pickSpawnValue(manager);
  var cell = available[Math.floor(Math.random() * available.length)];
  return {
    cell: cell,
    value: value
  };
}

function applyRandomSpawnTilePlan(manager, spawnPlan) {
  if (!manager || !spawnPlan) return;
  var tile = new Tile(spawnPlan.cell, spawnPlan.value);
  manager.grid.insertTile(tile);
  manager.lastSpawn = { x: spawnPlan.cell.x, y: spawnPlan.cell.y, value: spawnPlan.value };
  recordSpawnValue(manager, spawnPlan.value);
}

function insertSeededRandomSpawnTile(manager, available) {
  if (!manager || !Array.isArray(available) || available.length <= 0) return;
  var stepCount = resolveSpawnRandomStepCount(manager);
  primeSpawnRandomSource(manager, stepCount);
  var spawnPlan = resolveRandomSpawnTilePlan(manager, available);
  applyRandomSpawnTilePlan(manager, spawnPlan);
}

function addRandomTile(manager) {
  if (!manager) return;
  if (tryInsertForcedReplaySpawn(manager)) return;

  var available = resolveAvailableCellsForRandomSpawn(manager);
  if (!available.length) return;
  insertSeededRandomSpawnTile(manager, available);
}

function resolveAvailableCellsForRandomSpawn(manager) {
  if (!manager) return [];
  return getAvailableCells(manager);
}

function resolveActuateStepStats(manager) {
  if (!manager) {
    return {
      totalSteps: 0,
      moveSteps: 0,
      undoSteps: 0
    };
  }
  return manager.computeStepStats();
}

function syncLegacyStepStatsLabels(stepStats) {
  var stats = stepStats && typeof stepStats === "object" ? stepStats : {};
  updateStatsLabelText("stats-total", "总步数: ", stats.totalSteps);
  updateStatsLabelText("stats-moves", "移动步数: ", stats.moveSteps);
  updateStatsLabelText("stats-undo", "撤回步数: ", stats.undoSteps);
}

function syncActuateStatsPanel(manager, stepStats) {
  if (!manager) return;
  var stats = stepStats && typeof stepStats === "object" ? stepStats : {};
  manager.updateStatsPanel(stats.totalSteps, stats.moveSteps, stats.undoSteps);
}

function updateActuateStats(manager) {
  if (!manager) return;
  var stepStats = resolveActuateStepStats(manager);
  syncLegacyStepStatsLabels(stepStats);
  syncActuateStatsPanel(manager, stepStats);
}

function syncActuateTimerView(manager) {
  if (!manager || !manager.timerContainer) return;
  var elapsedMs = resolveActuateElapsedMs(manager);
  manager.timerContainer.textContent = manager.pretty(elapsedMs);
  refreshIpsDisplay(manager, elapsedMs);
}

function resolveActuateElapsedMs(manager) {
  if (!manager) return 0;
  if (manager.timerStatus === 1 && manager.startTime && typeof manager.startTime.getTime === "function") {
    return Date.now() - manager.startTime.getTime();
  }
  return manager.accumulatedTime;
}

function shouldFinalizeActuateAsTerminatedSession(manager) {
  if (!manager) return false;
  if (manager.modeKey === "practice_legacy") return false;
  return isSessionTerminated(manager);
}

function handleTerminatedSessionActuatePersistence(manager) {
  if (!manager) return;
  manager.clearSavedGameState(manager.modeKey);
  manager.tryAutoSubmitOnGameOver();
}

function finalizeActuatePersistence(manager) {
  if (!manager) return;
  if (shouldFinalizeActuateAsTerminatedSession(manager)) {
    handleTerminatedSessionActuatePersistence(manager);
    return;
  }
  saveGameState(manager);
}

function syncBestScoreBeforeActuate(manager) {
  if (!manager || !manager.scoreManager) return;
  if (manager.scoreManager.get() < manager.score) {
    manager.scoreManager.set(manager.score);
  }
}

function buildActuatePayload(manager) {
  if (!manager) return {};
  return {
    score: manager.score,
    over: manager.over,
    won: manager.won,
    bestScore: manager.scoreManager.get(),
    terminated: isGameTerminated(manager),
    blockedCells: manager.blockedCellsList || []
  };
}

function actuate(manager) {
  if (!manager) return;
  syncBestScoreBeforeActuate(manager);
  manager.actuator.actuate(manager.grid, buildActuatePayload(manager));
  updateActuateStats(manager);
  syncActuateTimerView(manager);
  finalizeActuatePersistence(manager);
}

function applyUndoRestoredTiles(manager, undoPayload) {
  if (!manager) return;
  manager.grid.build();
  manager.score = Number.isFinite(undoPayload.score) && typeof undoPayload.score === "number"
    ? Number(undoPayload.score)
    : 0;
  var undoTiles = Array.isArray(undoPayload.tiles) ? undoPayload.tiles : [];
  for (var undoTileIndex = 0; undoTileIndex < undoTiles.length; undoTileIndex++) {
    var restored = createUndoRestoreTile(manager, undoTiles[undoTileIndex]);
    var tile = new Tile({ x: restored.x, y: restored.y }, restored.value);
    tile.previousPosition = {
      x: restored.previousPosition.x,
      y: restored.previousPosition.y
    };
    manager.grid.cells[tile.x][tile.y] = tile;
  }
}

function applyUndoRestoreState(manager, undoRestore) {
  if (!manager) return;
  var safeRestore = undoRestore && typeof undoRestore === "object" ? undoRestore : {};
  var normalized = normalizeUndoRestoreState(manager, undoRestore);
  manager.comboStreak = normalized.comboStreak;
  manager.successfulMoveCount = normalized.successfulMoveCount;
  manager.lockConsumedAtMoveCount = normalized.lockConsumedAtMoveCount;
  manager.lockedDirectionTurn = normalized.lockedDirectionTurn;
  manager.lockedDirection = normalized.lockedDirection;
  manager.undoUsed = normalized.undoUsed;
  manager.over = normalized.over;
  manager.won = normalized.won;
  manager.keepPlaying = normalized.keepPlaying;
  if (safeRestore.shouldClearMessage !== false) {
    manager.actuator.clearMessage(); // Clear Game Over message if present
  }
}

function normalizeUndoRestoreState(manager, undoRestore) {
  var safeRestore = undoRestore && typeof undoRestore === "object" ? undoRestore : {};
  var defaultUndoUsed = Number.isInteger(manager.undoUsed) && manager.undoUsed >= 0 ? manager.undoUsed : 0;
  return {
    comboStreak: Number.isInteger(safeRestore.comboStreak) && safeRestore.comboStreak >= 0
      ? safeRestore.comboStreak
      : 0,
    successfulMoveCount:
      Number.isInteger(safeRestore.successfulMoveCount) && safeRestore.successfulMoveCount >= 0
        ? safeRestore.successfulMoveCount
        : 0,
    lockConsumedAtMoveCount: Number.isInteger(safeRestore.lockConsumedAtMoveCount)
      ? safeRestore.lockConsumedAtMoveCount
      : -1,
    lockedDirectionTurn: Number.isInteger(safeRestore.lockedDirectionTurn)
      ? safeRestore.lockedDirectionTurn
      : null,
    lockedDirection: Number.isInteger(safeRestore.lockedDirection)
      ? safeRestore.lockedDirection
      : null,
    undoUsed: Number.isInteger(safeRestore.undoUsed) && safeRestore.undoUsed >= 0
      ? safeRestore.undoUsed
      : (defaultUndoUsed + 1),
    over: typeof safeRestore.over === "boolean" ? safeRestore.over : false,
    won: typeof safeRestore.won === "boolean" ? safeRestore.won : false,
    keepPlaying: typeof safeRestore.keepPlaying === "boolean" ? safeRestore.keepPlaying : false
  };
}

function canApplyUndoMove(manager) {
  if (!manager) return false;
  var canUndoOperation = manager.replayMode || manager.isUndoInteractionEnabled();
  var hasRemainingUndoBudget = manager.undoLimit === null || manager.undoUsed < manager.undoLimit;
  return !!(canUndoOperation && hasRemainingUndoBudget && manager.undoStack.length > 0);
}

function restoreUndoStateFromStackEntry(manager, prev) {
  if (!manager) return null;
  var undoPayload = computeUndoRestorePayload(manager, prev);
  applyUndoRestoredTiles(manager, undoPayload);
  var undoRestore = computeUndoRestoreState(manager, prev);
  applyUndoRestoreState(manager, undoRestore);
  return undoRestore;
}

function applyPostUndoRecordArtifacts(manager, postUndoRecord, direction) {
  if (!manager || !postUndoRecord) return;
  if (postUndoRecord.shouldRecordMoveHistory) {
    manager.moveHistory.push(direction);
  }
  if (postUndoRecord.shouldAppendCompactUndo) {
    appendCompactUndo(manager);
  }
  if (postUndoRecord.shouldPushSessionAction && manager.sessionReplayV3) {
    manager.sessionReplayV3.actions.push(
      Array.isArray(postUndoRecord.sessionAction) ? postUndoRecord.sessionAction : ["u"]
    );
  }
}

function finalizeUndoMove(manager, undoRestore, direction) {
  if (!manager) return;
  actuate(manager);
  var shouldStartTimerAfterUndo = typeof undoRestore.shouldStartTimer === "boolean"
    ? undoRestore.shouldStartTimer
    : manager.timerStatus === 0;
  if (shouldStartTimerAfterUndo) {
    manager.startTimer();
  }
  manager.publishAdapterMoveResult({
    reason: "undo",
    direction: direction,
    moved: true
  });
}

function handleUndoMove(manager, direction) {
  if (!manager || direction != -1) return false;
  if (!canApplyUndoMove(manager)) {
    return true;
  }

  var prev = manager.normalizeUndoStackEntry(manager.undoStack.pop());
  var undoRestore = restoreUndoStateFromStackEntry(manager, prev) || {};
  var postUndoRecord = computePostUndoRecord(manager, direction);
  applyPostUndoRecordArtifacts(manager, postUndoRecord, direction);
  finalizeUndoMove(manager, undoRestore, direction);
  return true;
}

function resolveLockedDirectionFromCore(manager) {
  if (!manager) return null;
  var getLockedDirectionStateCore = manager.callCoreDirectionLockRuntime(
    "getLockedDirectionState",
    [{
      directionLockRules: manager.directionLockRules,
      successfulMoveCount: manager.successfulMoveCount,
      lockConsumedAtMoveCount: manager.lockConsumedAtMoveCount,
      lockedDirectionTurn: manager.lockedDirectionTurn,
      lockedDirection: manager.lockedDirection,
      initialSeed: manager.initialSeed
    }, function (seed) {
      var rng = new Math.seedrandom(seed);
      return rng();
    }]
  );
  var lockedDirectionStateByCore = manager.resolveCoreRawCallValueOrUndefined(getLockedDirectionStateCore);
  if (typeof lockedDirectionStateByCore === "undefined") {
    return null;
  }
  var state = lockedDirectionStateByCore && typeof lockedDirectionStateByCore === "object"
    ? lockedDirectionStateByCore
    : {};
  if (Number.isInteger(state.lockedDirection)) {
    manager.lockedDirection = state.lockedDirection;
  }
  if (Number.isInteger(state.lockedDirectionTurn)) {
    manager.lockedDirectionTurn = state.lockedDirectionTurn;
  }
  return Number.isInteger(state.activeDirection) ? state.activeDirection : null;
}

function resolveLockedDirectionFallback(manager) {
  if (!manager) return null;
  var rules = manager.directionLockRules;
  var everyK = null;
  if (rules) {
    var everyKRaw = Number(rules.every_k_moves);
    everyK = Number.isInteger(everyKRaw) && everyKRaw > 0 ? everyKRaw : null;
  }
  if (!(Number.isInteger(everyK) && everyK > 0)) {
    return null;
  }
  if (!(manager.successfulMoveCount > 0 && manager.successfulMoveCount % everyK === 0)) {
    return null;
  }
  if (manager.lockConsumedAtMoveCount === manager.successfulMoveCount) {
    return null;
  }
  if (manager.lockedDirectionTurn !== manager.successfulMoveCount) {
    var phase = Math.floor(manager.successfulMoveCount / everyK);
    var rng = new Math.seedrandom(String(manager.initialSeed) + ":lock:" + phase);
    manager.lockedDirection = Math.floor(rng() * 4);
    manager.lockedDirectionTurn = manager.successfulMoveCount;
  }
  return manager.lockedDirection;
}

function resolveLockedDirection(manager) {
  if (!manager) return null;
  var lockedDirectionFromCore = resolveLockedDirectionFromCore(manager);
  if (lockedDirectionFromCore !== null) {
    return lockedDirectionFromCore;
  }
  return resolveLockedDirectionFallback(manager);
}

function applyPostMoveScoreFallback(manager, scoreBeforeMove) {
  if (!manager) return;
  var mergeGain = manager.score - scoreBeforeMove;
  if (mergeGain > 0) {
    manager.comboStreak += 1;
    if (manager.comboMultiplier > 1 && manager.comboStreak > 1) {
      var comboBonus = Math.floor(mergeGain * (manager.comboMultiplier - 1) * (manager.comboStreak - 1));
      if (comboBonus > 0) {
        manager.score += comboBonus;
      }
    }
  } else {
    manager.comboStreak = 0;
  }
}

function applyPostMoveScore(manager, scoreBeforeMove) {
  if (!manager) return;
  var computePostMoveScoreCore = manager.callCoreScoringRuntime(
    "computePostMoveScore",
    [{
      scoreBeforeMove: scoreBeforeMove,
      scoreAfterMerge: manager.score,
      comboStreak: manager.comboStreak,
      comboMultiplier: manager.comboMultiplier
    }]
  );
  if (manager.tryHandleCoreRawValue(computePostMoveScoreCore, function (coreValue) {
    var scoreResult = coreValue || {};
    if (Number.isFinite(scoreResult.score)) {
      manager.score = Number(scoreResult.score);
    }
    if (Number.isInteger(scoreResult.comboStreak) && scoreResult.comboStreak >= 0) {
      manager.comboStreak = scoreResult.comboStreak;
    }
  })) {
    return;
  }
  applyPostMoveScoreFallback(manager, scoreBeforeMove);
}

function syncTimerTextAfterStop(manager) {
  if (!manager) return;
  var endTimerEl = document.getElementById("timer");
  if (endTimerEl) endTimerEl.textContent = manager.pretty(manager.accumulatedTime);
}

function resolvePostMoveLifecycleFromCore(manager, coreValue, hasMovesAvailable) {
  if (!manager) {
    return {
      postMoveResult: null,
      shouldStartTimer: false
    };
  }
  var postMoveResult = coreValue || {};
  if (Number.isInteger(postMoveResult.successfulMoveCount) && postMoveResult.successfulMoveCount >= 0) {
    manager.successfulMoveCount = postMoveResult.successfulMoveCount;
  } else {
    manager.successfulMoveCount += 1;
  }
  manager.over = typeof postMoveResult.over === "boolean" ? postMoveResult.over : !hasMovesAvailable;
  if (postMoveResult.shouldEndTime || manager.over) {
    manager.stopTimer();
    syncTimerTextAfterStop(manager);
  }
  return {
    postMoveResult: postMoveResult,
    shouldStartTimer:
      typeof postMoveResult.shouldStartTimer === "boolean"
        ? postMoveResult.shouldStartTimer
        : (manager.timerStatus === 0 && !manager.over)
  };
}

function resolvePostMoveLifecycleFallback(manager, hasMovesAvailable) {
  if (!manager) {
    return {
      postMoveResult: null,
      shouldStartTimer: false
    };
  }
  manager.successfulMoveCount += 1;
  if (!hasMovesAvailable) {
    manager.over = true;
    manager.stopTimer();
    syncTimerTextAfterStop(manager);
  }
  return {
    postMoveResult: null,
    shouldStartTimer: manager.timerStatus === 0 && !manager.over
  };
}

function resolvePostMoveLifecycle(manager, hasMovesAvailable) {
  if (!manager) {
    return {
      postMoveResult: null,
      shouldStartTimer: false
    };
  }
  var computePostMoveLifecycleCore = manager.callCorePostMoveRuntime(
    "computePostMoveLifecycle",
    [{
      successfulMoveCount: manager.successfulMoveCount,
      hasMovesAvailable: hasMovesAvailable,
      timerStatus: manager.timerStatus
    }]
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    computePostMoveLifecycleCore,
    function (coreValue) {
      return resolvePostMoveLifecycleFromCore(manager, coreValue, hasMovesAvailable);
    },
    function () {
      return resolvePostMoveLifecycleFallback(manager, hasMovesAvailable);
    }
  );
}

function applyPostMoveRecordArtifacts(manager, postMoveRecord, direction) {
  if (!manager || !postMoveRecord) return;
  if (postMoveRecord.shouldRecordMoveHistory) {
    manager.moveHistory.push(direction);
  }
  if (Number.isInteger(postMoveRecord.compactMoveCode)) {
    appendCompactMoveCode(manager, postMoveRecord.compactMoveCode);
  }
  if (postMoveRecord.shouldPushSessionAction && manager.sessionReplayV3) {
    manager.sessionReplayV3.actions.push(
      Array.isArray(postMoveRecord.sessionAction)
        ? postMoveRecord.sessionAction
        : ["m", direction]
    );
  }
  if (postMoveRecord.shouldResetLastSpawn) {
    manager.lastSpawn = null;
  }
}

function recordPostMoveArtifacts(manager, movePlan, direction) {
  if (!manager || !movePlan) return;
  manager.undoStack.push(manager.normalizeUndoStackEntry(movePlan.undo));
  var postMoveRecord = computePostMoveRecord(manager, direction);
  applyPostMoveRecordArtifacts(manager, postMoveRecord, direction);
}

function finalizeMoveAction(manager, postMoveLifecycle, direction) {
  if (!manager) return;
  actuate(manager);
  if (postMoveLifecycle && postMoveLifecycle.shouldStartTimer) {
    manager.startTimer();
  }
  manager.publishAdapterMoveResult({
    reason: "move",
    direction: direction,
    moved: true
  });
}

function createMoveUndoFallback(manager) {
  if (!manager) {
    return {
      score: 0,
      tiles: [],
      comboStreak: 0,
      successfulMoveCount: 0,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      undoUsed: 0
    };
  }
  var undoFallbackState = manager.getUndoStateFallbackValues();
  return {
    score: undoFallbackState.score,
    tiles: [],
    comboStreak: undoFallbackState.comboStreak,
    successfulMoveCount: undoFallbackState.successfulMoveCount,
    lockConsumedAtMoveCount: undoFallbackState.lockConsumedAtMoveCount,
    lockedDirectionTurn: undoFallbackState.lockedDirectionTurn,
    lockedDirection: undoFallbackState.lockedDirection,
    undoUsed: undoFallbackState.undoUsed
  };
}

function normalizeMoveUndoSnapshot(coreValue, undoFallback) {
  var computed = coreValue || {};
  return {
    score: Number.isFinite(computed.score) ? Number(computed.score) : undoFallback.score,
    tiles: Array.isArray(computed.tiles) ? computed.tiles : [],
    comboStreak: Number.isInteger(computed.comboStreak) && computed.comboStreak >= 0
      ? computed.comboStreak
      : undoFallback.comboStreak,
    successfulMoveCount: Number.isInteger(computed.successfulMoveCount) && computed.successfulMoveCount >= 0
      ? computed.successfulMoveCount
      : undoFallback.successfulMoveCount,
    lockConsumedAtMoveCount: Number.isInteger(computed.lockConsumedAtMoveCount)
      ? computed.lockConsumedAtMoveCount
      : undoFallback.lockConsumedAtMoveCount,
    lockedDirectionTurn: Number.isInteger(computed.lockedDirectionTurn)
      ? computed.lockedDirectionTurn
      : undoFallback.lockedDirectionTurn,
    lockedDirection: Number.isInteger(computed.lockedDirection)
      ? computed.lockedDirection
      : undoFallback.lockedDirection,
    undoUsed: Number.isInteger(computed.undoUsed) && computed.undoUsed >= 0
      ? computed.undoUsed
      : undoFallback.undoUsed
  };
}

function resolveMoveUndoSnapshot(manager, createUndoSnapshotCore, undoFallback) {
  if (!manager) return undoFallback;
  return manager.resolveNormalizedCoreValueOrFallback(
    createUndoSnapshotCore,
    function (coreValue) {
      return normalizeMoveUndoSnapshot(coreValue, undoFallback);
    },
    function () {
      return undoFallback;
    }
  );
}

function buildMovePlan(manager, direction) {
  if (!manager) return null;
  var createUndoSnapshotCore = manager.callCoreUndoSnapshotRuntime(
    "createUndoSnapshot",
    [{
      score: manager.score,
      comboStreak: manager.comboStreak,
      successfulMoveCount: manager.successfulMoveCount,
      lockConsumedAtMoveCount: manager.lockConsumedAtMoveCount,
      lockedDirectionTurn: manager.lockedDirectionTurn,
      lockedDirection: manager.lockedDirection,
      undoUsed: manager.undoUsed
    }]
  );
  var undoFallback = createMoveUndoFallback(manager);
  return {
    vector: getVector(manager, direction),
    scoreBeforeMove: manager.score,
    undo: resolveMoveUndoSnapshot(manager, createUndoSnapshotCore, undoFallback)
  };
}

function prepareTilesForMove(manager) {
  if (!manager || !manager.grid || typeof manager.grid.eachCell !== "function") return;
  manager.grid.eachCell(function (_x, _y, tile) {
    if (!tile) return;
    tile.mergedFrom = null;
    tile.savePosition();
  });
}

function applyIpsInputCountFromCore(manager, coreValue) {
  if (!manager) return;
  var resolved = coreValue || {};
  if (!resolved.shouldRecord) return;
  var nextIps = Number(resolved.nextIpsInputCount);
  manager.ipsInputCount = Number.isInteger(nextIps) && nextIps >= 0 ? nextIps : 0;
}

function applyIpsInputCountFallback(manager) {
  if (!manager || manager.replayMode) return;
  if (!Number.isInteger(manager.ipsInputCount) || manager.ipsInputCount < 0) {
    manager.ipsInputCount = 0;
  }
  manager.ipsInputCount += 1;
}

function updateIpsInputCountAfterMove(manager) {
  if (!manager) return;
  var resolveNextIpsInputCountCore = manager.callCoreReplayExecutionRuntime(
    "resolveNextIpsInputCount",
    [{
      replayMode: manager.replayMode,
      replayIndex: manager.replayIndex,
      ipsInputCount: manager.ipsInputCount
    }]
  );
  if (manager.tryHandleCoreRawValue(resolveNextIpsInputCountCore, function (coreValue) {
    applyIpsInputCountFromCore(manager, coreValue);
  })) {
    return;
  }
  applyIpsInputCountFallback(manager);
}

function applyProgressiveUnlockFallback(manager, isProgressiveCapped64Mode, mergedValue, unlockedState) {
  if (!manager) return;
  if (
    isProgressiveCapped64Mode &&
    manager.isProgressiveCapped64UnlockValue(mergedValue) &&
    !unlockedState[String(mergedValue)]
  ) {
    unlockedState[String(mergedValue)] = true;
    manager.capped64Unlocked = unlockedState;
    manager.setCapped64RowVisible(mergedValue, true);
  }
}

function stampMergeMilestoneTimer(manager, mergedValue, timeStr) {
  if (!manager) return;
  var slotId = manager.timerMilestoneSlotByValue ? manager.timerMilestoneSlotByValue[String(mergedValue)] : null;
  if (!slotId) return;
  var timerMilestoneEl = document.getElementById("timer" + slotId);
  if (timerMilestoneEl && timerMilestoneEl.textContent === "") {
    timerMilestoneEl.textContent = timeStr;
  }
}

function applyProgressiveMergeMilestones(manager, mergedValue, timeStr) {
  if (!manager || !Number.isInteger(mergedValue) || mergedValue <= 0) return;
  var unlockedState = manager.resolveProgressiveCapped64UnlockedState(manager.capped64Unlocked);
  var milestoneCappedState = manager.resolveCappedModeState();
  var isProgressiveCapped64Mode = !!milestoneCappedState.isProgressiveCapped64Mode;
  var resolveProgressiveCapped64UnlockCore = manager.callCoreModeRuntime(
    "resolveProgressiveCapped64Unlock",
    [{
      isProgressiveCapped64Mode: isProgressiveCapped64Mode,
      value: mergedValue,
      unlockedState: unlockedState
    }]
  );
  if (manager.tryHandleCoreRawValue(resolveProgressiveCapped64UnlockCore, function (coreValue) {
    var resolved = coreValue || {};
    if (resolved.nextUnlockedState && typeof resolved.nextUnlockedState === "object") {
      this.capped64Unlocked = resolved.nextUnlockedState;
    } else {
      this.capped64Unlocked = unlockedState;
    }
    var unlockedValue = Number(resolved.unlockedValue);
    if (this.isProgressiveCapped64UnlockValue(unlockedValue)) {
      this.setCapped64RowVisible(unlockedValue, true);
    }
  })) {
    // handled by core
  } else {
    applyProgressiveUnlockFallback(manager, isProgressiveCapped64Mode, mergedValue, unlockedState);
  }
  stampMergeMilestoneTimer(manager, mergedValue, timeStr);
}

function resolveCappedPlaceholderSlotValue(manager, milestoneCount, placeholderValues) {
  if (!manager || !Number.isInteger(milestoneCount) || milestoneCount < 2) return null;
  var resolvePlaceholderSlotByRepeatCountCore = manager.callCoreModeRuntime(
    "resolveCappedPlaceholderSlotByRepeatCount",
    [{
      repeatCount: milestoneCount,
      placeholderRowValues: placeholderValues
    }]
  );
  var slotValue = Number(manager.resolveCoreRawCallValueOrUndefined(resolvePlaceholderSlotByRepeatCountCore));
  if (!Number.isInteger(slotValue) || slotValue <= 0) {
    var placeholderIndex = milestoneCount - 2; // x2 => first placeholder row
    if (placeholderIndex >= 0 && placeholderIndex < placeholderValues.length) {
      slotValue = Number(placeholderValues[placeholderIndex]);
    }
  }
  return Number.isInteger(slotValue) && slotValue > 0 ? slotValue : null;
}

function tryWriteCappedMilestoneToPlaceholder(manager, cappedState, milestoneCount, nextLabel, timeStr) {
  if (!manager || !cappedState) return false;
  if (!(Number.isInteger(milestoneCount) && milestoneCount >= 2)) return false;
  var placeholderValues = manager.getCappedPlaceholderRowValues(cappedState);
  var slotValue = resolveCappedPlaceholderSlotValue(manager, milestoneCount, placeholderValues);
  if (!Number.isInteger(slotValue) || slotValue <= 0) return false;
  var placeholderSlotId = String(slotValue);
  var row = manager.getTimerRowEl(placeholderSlotId);
  var timerEl = document.getElementById("timer" + placeholderSlotId);
  if (!(row && timerEl)) return false;

  var legend = row.querySelector(".timertile");
  if (legend) {
    legend.className = manager.getCappedTimerLegendClass(cappedState.cappedTargetValue);
    legend.textContent = nextLabel;
    legend.style.fontSize = manager.getCappedTimerFontSize(cappedState.cappedTargetValue);
  }
  row.style.display = "";
  row.style.visibility = "";
  row.style.pointerEvents = "";
  row.setAttribute("data-capped-repeat", String(milestoneCount));
  timerEl.textContent = timeStr;
  return true;
}

function appendCappedMilestoneDynamicRow(manager, container, cappedState, milestoneCount, nextLabel, timeStr) {
  if (!manager || !container || !cappedState) return;
  var rowDiv = manager.createSavedDynamicTimerRow({
    repeat: String(milestoneCount),
    label: nextLabel,
    time: timeStr
  }, cappedState);
  container.appendChild(rowDiv);
  manager.normalizeCappedRepeatLegendClasses(cappedState);
}

function recordCappedMergeMilestone(manager, timeStr) {
  if (!manager) return;
  var cappedState = manager.resolveCappedModeState();
  if (!cappedState.isCappedMode) return;
  manager.cappedMilestoneCount += 1;
  var milestoneCount = manager.cappedMilestoneCount;
  var capLabel = String(cappedState.cappedTargetValue || 2048);
  var baseTimerEl = document.getElementById("timer" + capLabel);
  var container = manager.getCappedOverflowContainer(cappedState);

  if (milestoneCount === 1) {
    if (baseTimerEl && baseTimerEl.textContent === "") {
      baseTimerEl.textContent = timeStr;
    }
    return;
  }

  var formatCappedRepeatLabelCore = manager.callCoreModeRuntime(
    "formatCappedRepeatLabel",
    [milestoneCount]
  );
  var nextLabel = manager.resolveCoreStringCallOrFallback(formatCappedRepeatLabelCore, function () {
    return "x" + String(milestoneCount);
  }, true);

  // Prefer replacing reserved hidden rows so the timer module height stays stable.
  var wroteToPlaceholder = tryWriteCappedMilestoneToPlaceholder(
    manager,
    cappedState,
    milestoneCount,
    nextLabel,
    timeStr
  );
  if (wroteToPlaceholder) {
    manager.callWindowMethod("cappedTimerAutoScroll");
  } else if (container) {
    appendCappedMilestoneDynamicRow(manager, container, cappedState, milestoneCount, nextLabel, timeStr);
    manager.callWindowMethod("cappedTimerAutoScroll");
  }
}

function applyMergeWinAndReachedState(manager, mergeEffects) {
  if (!manager || !mergeEffects) return;
  if (mergeEffects.shouldSetWon) {
    manager.won = true;
  }
  if (mergeEffects.shouldSetReached32k) {
    manager.reached32k = true;
  }
}

function stampMergeEffectTimers(mergeEffects, timeStr) {
  if (!mergeEffects) return;
  var timerIdsToStamp = Array.isArray(mergeEffects.timerIdsToStamp)
    ? mergeEffects.timerIdsToStamp
    : [];
  for (var timerIndex = 0; timerIndex < timerIdsToStamp.length; timerIndex++) {
    var timerId = timerIdsToStamp[timerIndex];
    var timerEl = document.getElementById(timerId);
    if (!timerEl) continue;
    if (timerId === "timer32768") {
      if (timerEl.innerHTML === "") timerEl.textContent = timeStr;
    } else {
      if (timerEl.textContent === "") timerEl.textContent = timeStr;
    }
  }
}

function applyMergeSubTimerVisibility(mergeEffects) {
  if (!mergeEffects || !mergeEffects.showSubTimerContainer) return;
  var subContainer = document.getElementById("timer32k-sub-container");
  if (subContainer) subContainer.style.display = "block";
}

function applyMergeHiddenTimerRows(mergeEffects) {
  if (!mergeEffects) return;
  var hideTimerRows = Array.isArray(mergeEffects.hideTimerRows) ? mergeEffects.hideTimerRows : [];
  for (var hideIndex = 0; hideIndex < hideTimerRows.length; hideIndex++) {
    var rowEl = document.getElementById("timer-row-" + String(hideTimerRows[hideIndex]));
    if (rowEl) rowEl.style.display = "none";
  }
}

function applyMergeOutcomeEffects(manager, mergeEffects, timeStr) {
  if (!manager || !mergeEffects) return;
  applyMergeWinAndReachedState(manager, mergeEffects);
  stampMergeEffectTimers(mergeEffects, timeStr);
  applyMergeSubTimerVisibility(mergeEffects);
  applyMergeHiddenTimerRows(mergeEffects);
}

function applyMergeTileMutation(manager, movePlan, tile, next, interaction, mergedValue) {
  if (!manager || !movePlan || !tile || !next || !interaction || mergedValue === null) return null;
  // We need to save tile since it will get removed
  movePlan.undo.tiles.push(manager.createUndoTileSnapshot(tile, interaction.target));

  var merged = new Tile(interaction.target, mergedValue);
  merged.mergedFrom = [tile, next];

  manager.grid.insertTile(merged);
  manager.grid.removeTile(tile);

  // Converge the two tiles' positions
  tile.updatePosition(interaction.target);

  // Update the score
  manager.score += merged.value;
  return merged;
}

function applyMergeDerivedEffects(manager, mergedValue, timeStr) {
  if (!manager) return;
  applyProgressiveMergeMilestones(manager, mergedValue, timeStr);
  var mergeEffects = computeMergeEffects(manager, mergedValue);
  if (mergeEffects.shouldRecordCappedMilestone) {
    recordCappedMergeMilestone(manager, timeStr);
  }
  applyMergeOutcomeEffects(manager, mergeEffects, timeStr);
}

function executeMergeInteraction(manager, movePlan, tile, next, interaction, mergedValue) {
  if (!manager || !movePlan || !tile || !next || !interaction || mergedValue === null || next.mergedFrom) {
    return false;
  }
  var merged = applyMergeTileMutation(manager, movePlan, tile, next, interaction, mergedValue);
  if (!merged) return false;

  var timeStr = manager.pretty(manager.time);
  applyMergeDerivedEffects(manager, merged.value, timeStr);
  return interaction.moved === true;
}

function executeSlideInteraction(manager, movePlan, tile, interaction) {
  if (!manager || !movePlan || !tile || !interaction) return false;
  movePlan.undo.tiles.push(manager.createUndoTileSnapshot(tile, interaction.target));
  manager.grid.cells[tile.x][tile.y] = null;
  manager.grid.cells[interaction.target.x][interaction.target.y] = tile;
  tile.updatePosition(interaction.target);
  return interaction.moved === true;
}

function processMoveTraversalCell(manager, movePlan, cell) {
  if (!manager || !movePlan || !cell) return false;
  if (manager.isBlockedCell(cell.x, cell.y)) return false;

  var tile = manager.grid.cellContent(cell);
  if (!tile) return false;

  var positions = findFarthestPosition(manager, cell, movePlan.vector);
  var next = manager.isBlockedCell(positions.next.x, positions.next.y)
    ? null
    : manager.grid.cellContent(positions.next);

  var mergedValue = next ? getMergedValue(manager, tile.value, next.value) : null;
  var interaction = planTileInteraction(manager, cell, positions, next, mergedValue);
  if (interaction.kind === "merge" && next && !next.mergedFrom && mergedValue !== null) {
    return executeMergeInteraction(manager, movePlan, tile, next, interaction, mergedValue);
  }
  return executeSlideInteraction(manager, movePlan, tile, interaction);
}

function executeMoveTraversal(manager, movePlan, traversals) {
  if (!manager || !movePlan || !traversals) return false;
  var moved = false;
  for (var xIndex = 0; xIndex < traversals.x.length; xIndex++) {
    var x = traversals.x[xIndex];
    for (var yIndex = 0; yIndex < traversals.y.length; yIndex++) {
      moved = processMoveTraversalCell(manager, movePlan, { x: x, y: traversals.y[yIndex] }) || moved;
    }
  }
  return moved;
}

function shouldBlockMoveByLockedDirection(manager, direction, lockedDirection) {
  if (!manager) return false;
  if (
    lockedDirection === null ||
    typeof lockedDirection === "undefined" ||
    Number(direction) !== Number(lockedDirection)
  ) {
    return false;
  }
  manager.lockConsumedAtMoveCount = manager.successfulMoveCount;
  return true;
}

function applySuccessfulMoveImmediateEffects(manager, movePlan) {
  if (!manager || !movePlan) return;
  // IPS counts only effective move inputs (invalid directions are excluded).
  updateIpsInputCountAfterMove(manager);
  applyPostMoveScore(manager, movePlan.scoreBeforeMove);
  addRandomTile(manager);
}

function resolveSuccessfulMoveLifecycle(manager, movePlan, direction) {
  if (!manager || !movePlan) return null;
  var hasMovesAvailable = movesAvailable(manager);
  var postMoveLifecycle = resolvePostMoveLifecycle(manager, hasMovesAvailable);
  recordPostMoveArtifacts(manager, movePlan, direction);
  return postMoveLifecycle;
}

function finalizeSuccessfulMoveFlow(manager, movePlan, direction) {
  if (!manager || !movePlan) return;
  applySuccessfulMoveImmediateEffects(manager, movePlan);
  var postMoveLifecycle = resolveSuccessfulMoveLifecycle(manager, movePlan, direction);
  finalizeMoveAction(manager, postMoveLifecycle, direction);
}

function prepareMoveExecution(manager, direction) {
  if (!manager) return null;
  if (handleUndoMove(manager, direction)) return null;
  if (isGameTerminated(manager)) return null;
  var lockedDirection = resolveLockedDirection(manager);
  if (shouldBlockMoveByLockedDirection(manager, direction, lockedDirection)) return null;
  var movePlan = buildMovePlan(manager, direction);
  return {
    movePlan: movePlan,
    traversals: buildTraversals(manager, movePlan.vector)
  };
}

function move(manager, direction) {
  if (!manager) return;
  // 0: up, 1: right, 2:down, 3: left, -1: undo
  var executionContext = prepareMoveExecution(manager, direction);
  if (!executionContext) return;
  var movePlan = executionContext.movePlan;
  var traversals = executionContext.traversals;

  // Save the current tile positions and remove merger information
  prepareTilesForMove(manager);
  var moved = executeMoveTraversal(manager, movePlan, traversals);
  if (!moved) return;
  finalizeSuccessfulMoveFlow(manager, movePlan, direction);
}

function resolveTimerUpdateIntervalMs(manager) {
  if (!manager) return 10;
  var resolveTimerUpdateIntervalMsCore = manager.callCoreTimerIntervalRuntime(
    "resolveTimerUpdateIntervalMs",
    [
      manager.width,
      manager.height
    ]
  );
  return manager.resolveCoreNumericCallOrFallback(
    resolveTimerUpdateIntervalMsCore,
    function () {
      return resolveTimerUpdateIntervalFallback(manager);
    }
  );
}

function resolveTimerUpdateIntervalFallback(manager) {
  if (!manager) return 10;
  var area = (manager.width || 4) * (manager.height || 4);
  if (area >= 100) return 50;
  if (area >= 64) return 33;
  return 10;
}

function restartTimerInterval(manager) {
  if (!manager) return;
  manager.lastStatsPanelUpdateAt = 0;
  manager.timerID = setInterval(function () {
    handleTimerTick(manager);
  }, manager.timerUpdateIntervalMs);
}

function applyTimerStartState(manager) {
  if (!manager) return;
  manager.timerStatus = 1;
  manager.hasGameStarted = true;
  // Convert accumulated time back to a start timestamp relative to now
  manager.startTime = new Date(Date.now() - (manager.accumulatedTime || 0));
  manager.notifyUndoSettingsStateChanged();
}

function configureAndRestartTimerInterval(manager) {
  if (!manager) return;
  manager.timerUpdateIntervalMs = resolveTimerUpdateIntervalMs(manager);
  restartTimerInterval(manager);
}

function startTimer(manager) {
  if (!manager || manager.timerStatus !== 0) return;
  applyTimerStartState(manager);
  configureAndRestartTimerInterval(manager);
}

function resolveAccumulatedTimeOnStop(manager) {
  if (!manager) return 0;
  if (!manager.startTime || typeof manager.startTime.getTime !== "function") {
    return manager.accumulatedTime || 0;
  }
  return Date.now() - manager.startTime.getTime();
}

function clearTimerIntervalState(manager) {
  if (!manager) return;
  clearInterval(manager.timerID);
  manager.timerID = null;
  manager.timerStatus = 0;
}

function canStopTimer(manager) {
  return !!(manager && manager.timerStatus === 1);
}

function applyTimerStopState(manager) {
  if (!manager) return;
  manager.accumulatedTime = resolveAccumulatedTimeOnStop(manager);
  clearTimerIntervalState(manager);
}

function stopTimer(manager) {
  if (!canStopTimer(manager)) return;
  applyTimerStopState(manager);
}

function formatPrettyTime(manager, time) {
  if (!manager) return "0.000";
  var formatPrettyTimeCore = manager.callCorePrettyTimeRuntime(
    "formatPrettyTime",
    [time]
  );
  return manager.resolveCoreStringCallOrFallback(formatPrettyTimeCore, function () {
    if (time < 0) {return "DNF";}
    var bits = time % 1000;
    time = (time - bits) / 1000;
    var secs = time % 60;
    var mins = ((time - secs) / 60) % 60;
    var hours = (time - secs - 60 * mins) / 3600;
    var s = "" + bits;
    if (bits < 10) {s = "0" + s;}
    if (bits < 100) {s = "0" + s;}
    s = secs + "." + s;
    if (secs < 10 && (mins > 0 || hours > 0)) {s = "0" + s;}
    if (mins > 0 || hours > 0) {s = mins + ":" + s;}
    if (mins < 10 && hours > 0) {s = "0" + s;}
    if (hours > 0) {s = hours + ":" + s;}
    return s;
  });
}

function resolveCurrentTimerTickTime(manager) {
  if (!manager) return null;
  if (!(manager.startTime && typeof manager.startTime.getTime === "function")) return null;
  return Date.now() - manager.startTime.getTime();
}

function syncTimerTickPrimaryDisplay(manager, time) {
  if (!manager) return;
  manager.time = time;
  var timerEl = document.getElementById("timer");
  if (timerEl) timerEl.textContent = manager.pretty(time);
  refreshIpsDisplay(manager, time);
}

function shouldRefreshStatsPanelDuringTimerTick(manager, time) {
  if (!manager) return false;
  var overlay = document.getElementById("stats-panel-overlay");
  if (!(overlay && overlay.style.display !== "none")) return false;
  return !manager.lastStatsPanelUpdateAt || (time - manager.lastStatsPanelUpdateAt) >= 100;
}

function syncTimerTickStatsPanel(manager, time) {
  if (!manager) return;
  if (!shouldRefreshStatsPanelDuringTimerTick(manager, time)) return;
  manager.updateStatsPanel();
  manager.lastStatsPanelUpdateAt = time;
}

function handleTimerTick(manager) {
  if (!manager) return;
  var time = resolveCurrentTimerTickTime(manager);
  if (time === null) return;
  syncTimerTickPrimaryDisplay(manager, time);
  syncTimerTickStatsPanel(manager, time);
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
    var subTimer8192El = document.getElementById("timer8192-sub");
    if (subTimer8192El) subTimer8192El.textContent = "---------";
  }
  if (16384 <= value && value !== 32768) {
    var subTimer16384El = document.getElementById("timer16384-sub");
    if (subTimer16384El) subTimer16384El.textContent = "---------";
  }
}

function applyCustomTileInvalidatedTimerPlaceholders(manager, value) {
  if (!manager) return;
  var resolveInvalidatedTimerElementIdsCore = manager.callCoreTimerIntervalRuntime(
    "resolveInvalidatedTimerElementIds",
    [{
      timerMilestones: manager.timerMilestones || manager.getTimerMilestoneValues(),
      timerSlotIds: GameManager.TIMER_SLOT_IDS,
      limit: value,
      reached32k: !!manager.reached32k,
      isFibonacciMode: manager.isFibonacciMode()
    }]
  );
  var invalidatedTimerElementIdsByCore = manager.resolveNormalizedCoreValueOrUndefined(
    resolveInvalidatedTimerElementIdsCore,
    function (coreValue) {
      return Array.isArray(coreValue) ? coreValue : [];
    }
  );
  if (typeof invalidatedTimerElementIdsByCore !== "undefined") {
    applyInvalidatedTimerPlaceholders(invalidatedTimerElementIdsByCore);
    return;
  }

  var elementIds = buildInvalidatedTimerElementIdsFallback(manager, value);
  applyInvalidatedTimerPlaceholders(elementIds);
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
  var subContainer = document.getElementById("timer32k-sub-container");
  if (subContainer) subContainer.style.display = "block";
  var timerRow16 = document.getElementById("timer-row-16");
  if (timerRow16) timerRow16.style.display = "none";
  var timerRow32 = document.getElementById("timer-row-32");
  if (timerRow32) timerRow32.style.display = "none";
}

function stampCustomTile32kTimerValue(manager) {
  if (!manager) return;
  var timeStr = manager.pretty(manager.time);
  var timer32k = document.getElementById("timer32768");
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
  var buildBoardMatrixCore = manager.callCoreGridScanRuntime(
    "buildBoardMatrix",
    [
      manager.width,
      manager.height,
      function (x, y) {
        var tile = manager.grid.cellContent({ x: x, y: y });
        return tile ? tile.value : 0;
      }
    ]
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    buildBoardMatrixCore,
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

function normalizeDurationMsValue(rawMs) {
  var ms = Number(rawMs);
  if (!Number.isFinite(ms)) return null;
  ms = Math.floor(ms);
  return ms < 0 ? 0 : ms;
}

function buildDurationCoreInput(manager, nowMs) {
  if (!manager) return null;
  return {
    timerStatus: manager.timerStatus,
    startTimeMs:
      manager.startTime && typeof manager.startTime.getTime === "function"
        ? manager.startTime.getTime()
        : null,
    accumulatedTime: manager.accumulatedTime,
    sessionStartedAt: manager.sessionStartedAt,
    nowMs: nowMs
  };
}

function resolveDurationMsFallback(manager, nowMs) {
  if (!manager) return 0;
  var ms;
  if (manager.timerStatus === 1 && manager.startTime) {
    ms = nowMs - manager.startTime.getTime();
  } else {
    ms = manager.accumulatedTime || 0;
  }
  if (!Number.isFinite(ms) || ms < 0) {
    ms = nowMs - (manager.sessionStartedAt || nowMs);
  }
  return normalizeDurationMsValue(ms);
}

function getDurationMs(manager) {
  if (!manager) return 0;
  var nowMs = Date.now();
  var durationCoreInput = buildDurationCoreInput(manager, nowMs);
  var resolveDurationMsCore = manager.callCoreReplayTimerRuntime(
    "resolveDurationMs",
    [durationCoreInput]
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    resolveDurationMsCore,
    normalizeDurationMsValue,
    function () {
      return resolveDurationMsFallback(manager, nowMs);
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
  var source = replay && typeof replay === "object" ? replay : {};
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
  var getBestTileValueCore = manager.callCoreGridScanRuntime("getBestTileValue", [getFinalBoardMatrix(manager)]);
  return manager.resolveNormalizedCoreValueOrFallback(
    getBestTileValueCore,
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
  var paritySnapshot = parity && typeof parity === "object" ? parity : {};
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
  var source = payload && typeof payload === "object" ? payload : {};
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
    replayObj.special_rules_snapshot && typeof replayObj.special_rules_snapshot === "object"
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
  var parseReplayImportEnvelopeCore = manager.callCoreReplayImportRuntime(
    "parseReplayImportEnvelope",
    [{
      trimmedReplayString: trimmed,
      fallbackModeKey: manager.modeKey || manager.mode || GameManager.DEFAULT_MODE_KEY,
      v4Prefix: GameManager.REPLAY_V4_PREFIX
    }]
  );
  return manager.resolveNormalizedCoreValueOrFallbackAllowNull(parseReplayImportEnvelopeCore, function (coreValue) {
    if (coreValue === null) return null;
    return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
    var jsonEnvelope = parseJsonReplayImportEnvelopeFallback(manager, trimmed);
    if (jsonEnvelope) return jsonEnvelope;
    return parseV4ReplayImportEnvelopeFallback(trimmed);
  });
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
  var decodeReplayV4ActionsCore = manager.callCoreReplayV4ActionsRuntime(
    "decodeReplayV4Actions",
    [actionsEncoded]
  );
  return manager.resolveCoreObjectCallOrFallback(decodeReplayV4ActionsCore, function () {
    return decodeReplayV4ActionsFallback(manager, actionsEncoded);
  });
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

function applyReplayModeConfigOverridesFromJsonEnvelope(manager, parsedEnvelope, replayModeConfig) {
  if (!manager || !parsedEnvelope || !replayModeConfig) return;
  var specialRulesSnapshot =
    !parsedEnvelope.specialRulesSnapshot || typeof parsedEnvelope.specialRulesSnapshot !== "object"
      ? null
      : manager.clonePlain(parsedEnvelope.specialRulesSnapshot);
  if (specialRulesSnapshot) {
    replayModeConfig.special_rules = specialRulesSnapshot;
  }
  if (typeof parsedEnvelope.modeFamily === "string" && parsedEnvelope.modeFamily) {
    replayModeConfig.mode_family = parsedEnvelope.modeFamily;
  }
  if (typeof parsedEnvelope.rankPolicy === "string" && parsedEnvelope.rankPolicy) {
    replayModeConfig.rank_policy = parsedEnvelope.rankPolicy;
  }
}

function applyReplayChallengeIdFromEnvelope(manager, parsedEnvelope) {
  if (!manager || !parsedEnvelope) return;
  if (typeof parsedEnvelope.challengeId === "string" && parsedEnvelope.challengeId) {
    manager.challengeId = parsedEnvelope.challengeId;
  }
}

function applyJsonReplayImportActions(manager, parsedEnvelope) {
  if (!manager || !parsedEnvelope) return;
  applyReplayImportActions(manager, {
    replayMoves: parsedEnvelope.actions,
    replaySpawns: null
  });
}

function startJsonReplayImportSession(manager, parsedEnvelope, replayModeConfig) {
  if (!manager || !parsedEnvelope || !replayModeConfig) return;
  manager.disableSessionSync = true;
  restartReplaySession(manager, parsedEnvelope.seed, replayModeConfig, false);
}

function applyJsonStructuredReplayImport(manager, parsedEnvelope, replayModeConfig) {
  if (!manager || !parsedEnvelope || !replayModeConfig) return;
  applyReplayModeConfigOverridesFromJsonEnvelope(manager, parsedEnvelope, replayModeConfig);
  applyReplayChallengeIdFromEnvelope(manager, parsedEnvelope);
  applyJsonReplayImportActions(manager, parsedEnvelope);
  startJsonReplayImportSession(manager, parsedEnvelope, replayModeConfig);
}

function decodeV4StructuredReplayImportPayload(manager, parsedEnvelope) {
  if (!manager || !parsedEnvelope) return null;
  var initialBoard = decodeBoardV4(manager, parsedEnvelope.initialBoardEncoded);
  var decodedV4Actions = decodeReplayV4Actions(manager, parsedEnvelope.actionsEncoded);
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
  if (!manager || !parsedEnvelope || !replayModeConfig) return;
  var decodedPayload = decodeV4StructuredReplayImportPayload(manager, parsedEnvelope);
  applyV4ReplayImportActions(manager, decodedPayload);
  startV4ReplayImportSession(manager, decodedPayload, replayModeConfig);
}

function isStructuredReplayEnvelope(parsedEnvelope) {
  if (!parsedEnvelope) return false;
  return parsedEnvelope.kind === "json-v3" || parsedEnvelope.kind === "v4c";
}

function applyStructuredReplayImportByKind(manager, parsedEnvelope, replayModeConfig) {
  if (!manager || !parsedEnvelope || !replayModeConfig) return;
  if (parsedEnvelope.kind === "json-v3") {
    applyJsonStructuredReplayImport(manager, parsedEnvelope, replayModeConfig);
    return;
  }
  applyV4StructuredReplayImport(manager, parsedEnvelope, replayModeConfig);
}

function finalizeStructuredReplayImport(manager) {
  if (!manager) return;
  applyImportedUndoPolicyState(manager);
  finalizeReplayImportPlayback(manager);
}

function applyStructuredReplayImport(manager, parsedEnvelope) {
  if (!manager || !parsedEnvelope) return false;
  if (!isStructuredReplayEnvelope(parsedEnvelope)) return false;
  var replayModeConfig = manager.resolveModeConfig(parsedEnvelope.modeKey);
  applyStructuredReplayImportByKind(manager, parsedEnvelope, replayModeConfig);
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
  var decodeLegacyReplayCore = manager.callCoreReplayLegacyRuntime(
    "decodeLegacyReplay",
    [trimmed]
  );
  return manager.resolveNormalizedCoreValueOrFallback(decodeLegacyReplayCore, function (coreValue) {
    return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
    return decodeLegacyReplayFallback(manager, trimmed);
  });
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

function resolveReplayPauseState(manager) {
  if (!manager) return {};
  var computeReplayPauseStateCore = manager.callCoreReplayTimerRuntime(
    "computeReplayPauseState",
    []
  );
  var state = manager.resolveCoreObjectCallOrFallback(computeReplayPauseStateCore, function () {
    return {
      isPaused: true,
      shouldClearInterval: true
    };
  });
  return manager.isNonArrayObject(state) ? state : {};
}

function applyReplayPauseState(manager, state) {
  if (!manager) return;
  var pauseState = state && typeof state === "object" ? state : {};
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
  var shouldStopReplayAtTickCore = manager.callCoreReplayTimerRuntime(
    "shouldStopReplayAtTick",
    [buildReplayTickStopRuntimeInput(manager)]
  );
  return manager.resolveCoreBooleanCallOrFallback(shouldStopReplayAtTickCore, function () {
    return manager.replayIndex >= manager.replayMoves.length;
  });
}

function resolveReplayEndStateForTick(manager, shouldStopAtTick) {
  if (!manager || !shouldStopAtTick) return undefined;
  var computeReplayEndStateCore = manager.callCoreReplayFlowRuntime(
    "computeReplayEndState",
    []
  );
  return manager.resolveCoreObjectCallOrFallback(computeReplayEndStateCore, function () {
    return {
      shouldPause: true,
      replayMode: false
    };
  });
}

function resolveReplayTickBoundaryPlan(manager, shouldStopAtTick, replayEndState) {
  if (!manager) return null;
  var planReplayTickBoundaryCore = manager.callCoreReplayControlRuntime(
    "planReplayTickBoundary",
    [{
      shouldStopAtTick: shouldStopAtTick,
      replayEndState: replayEndState
    }]
  );
  return manager.resolveCoreObjectCallOrFallback(planReplayTickBoundaryCore, function () {
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
  });
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
  var computeReplayResumeStateCore = manager.callCoreReplayTimerRuntime(
    "computeReplayResumeState",
    [{
      replayDelay: manager.replayDelay
    }]
  );
  var state = manager.resolveCoreObjectCallOrFallback(computeReplayResumeStateCore, function () {
    return {
      isPaused: false,
      shouldClearInterval: true,
      delay: manager.replayDelay || 200
    };
  });
  return manager.isNonArrayObject(state) ? state : {};
}

function applyReplayResumeState(manager, state) {
  if (!manager) return;
  var resumeState = state && typeof state === "object" ? state : {};
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
  var computeReplaySpeedStateCore = manager.callCoreReplayTimerRuntime(
    "computeReplaySpeedState",
    [{
      multiplier: multiplier,
      isPaused: !!manager.isPaused,
      baseDelay: 200
    }]
  );
  var state = manager.resolveCoreObjectCallOrFallback(computeReplaySpeedStateCore, function () {
    return {
      replayDelay: 200 / multiplier,
      shouldResume: !manager.isPaused
    };
  });
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
  var normalizeReplaySeekTargetCore = manager.callCoreReplayLifecycleRuntime(
    "normalizeReplaySeekTarget",
    [{
      targetIndex: targetIndex,
      hasReplayMoves: !!manager.replayMoves,
      replayMovesLength: manager.replayMoves ? manager.replayMoves.length : 0
    }]
  );
  return manager.resolveNormalizedCoreValueOrFallback(normalizeReplaySeekTargetCore, function (coreValue) {
    var resolved = Number(coreValue);
    return Number.isFinite(resolved) ? resolved : undefined;
  }, function () {
    return normalizeReplaySeekTargetFallback(manager, targetIndex);
  });
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
  var planReplaySeekRestartCore = manager.callCoreReplayFlowRuntime(
    "planReplaySeekRestart",
    [buildReplaySeekRestartRuntimeInput(manager, normalized)]
  );
  return manager.resolveCoreObjectCallOrFallback(planReplaySeekRestartCore, function () {
    return buildReplaySeekRestartFallbackPlan(manager, normalized);
  });
}

function resolveReplaySeekRewindPlan(manager, targetIndex) {
  if (!manager) return null;
  var planReplaySeekRewindCore = manager.callCoreReplayFlowRuntime(
    "planReplaySeekRewind",
    [{
      targetIndex: targetIndex,
      replayIndex: manager.replayIndex,
      hasReplayStartBoard: !!manager.replayStartBoardMatrix
    }]
  );
  return manager.resolveCoreObjectCallOrFallback(planReplaySeekRewindCore, function () {
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
  });
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

function resolveTotalSpawnCountFallback(manager) {
  if (!manager || !manager.spawnValueCounts) return 0;
  var fallbackTotal = 0;
  for (var k in manager.spawnValueCounts) {
    if (manager.hasOwnKey(manager.spawnValueCounts, k)) {
      fallbackTotal += manager.spawnValueCounts[k] || 0;
    }
  }
  return fallbackTotal;
}

function resolveActualSecondaryRateText(manager, pair, total) {
  if (!manager) return "0.00";
  if (total <= 0) return "0.00";
  return ((resolveSpawnCount(manager, pair.secondary) / total) * 100).toFixed(2);
}

function getActualSecondaryRate(manager) {
  if (!manager) return "0.00";
  var getActualSecondaryRateTextCore = manager.callCoreRulesRuntime(
    "getActualSecondaryRateText",
    [
      manager.spawnValueCounts,
      manager.spawnTable || []
    ]
  );
  return manager.resolveCoreStringCallOrFallback(getActualSecondaryRateTextCore, function () {
    var pair = manager.getSpawnStatPair();
    var getTotalSpawnCountCore = manager.callCoreRulesRuntime(
      "getTotalSpawnCount",
      [manager.spawnValueCounts]
    );
    var total = manager.resolveCoreNumericCallOrFallback(getTotalSpawnCountCore, function () {
      return resolveTotalSpawnCountFallback(manager);
    });
    return resolveActualSecondaryRateText(manager, pair, total);
  });
}

function getActualFourRate(manager) {
  if (!manager) return "0.00";
  // Keep old method name for compatibility.
  return manager.getActualSecondaryRate();
}

function setStatsPanelFieldText(fieldId, value) {
  var element = document.getElementById(fieldId);
  if (element) element.textContent = String(value);
}

function resolveStatsPanelStepValues(manager, totalSteps, moveSteps, undoSteps) {
  var fallback = manager.computeStepStats();
  return {
    totalSteps: typeof totalSteps === "undefined" ? fallback.totalSteps : totalSteps,
    moveSteps: typeof moveSteps === "undefined" ? fallback.moveSteps : moveSteps,
    undoSteps: typeof undoSteps === "undefined" ? fallback.undoSteps : undoSteps
  };
}

function applyStatsPanelSpawnLabels(pair) {
  var twoLabel = document.getElementById("stats-panel-two-label");
  if (twoLabel) twoLabel.textContent = "出" + pair.primary + "数量";
  var fourLabel = document.getElementById("stats-panel-four-label");
  if (fourLabel) fourLabel.textContent = "出" + pair.secondary + "数量";
  var rateLabel = document.getElementById("stats-panel-four-rate-label");
  if (rateLabel) rateLabel.textContent = "实际出" + pair.secondary + "率";
}

function applyStatsPanelStepFields(manager, stepValues) {
  manager.setStatsPanelFieldText("stats-panel-total", stepValues.totalSteps);
  manager.setStatsPanelFieldText("stats-panel-moves", stepValues.moveSteps);
  manager.setStatsPanelFieldText("stats-panel-undo", stepValues.undoSteps);
}

function applyStatsPanelSpawnFields(manager, pair) {
  manager.setStatsPanelFieldText("stats-panel-two", resolveSpawnCount(manager, pair.primary));
  manager.setStatsPanelFieldText("stats-panel-four", resolveSpawnCount(manager, pair.secondary));
  var rateEl = document.getElementById("stats-panel-four-rate");
  if (rateEl) rateEl.textContent = manager.getActualSecondaryRate();
}

function buildStatsPanelUpdateContext(manager, totalSteps, moveSteps, undoSteps) {
  if (!manager) return null;
  return {
    stepValues: resolveStatsPanelStepValues(manager, totalSteps, moveSteps, undoSteps),
    pair: manager.getSpawnStatPair()
  };
}

function applyStatsPanelUpdateContext(manager, context) {
  if (!manager || !context) return;
  applyStatsPanelSpawnLabels(context.pair);
  applyStatsPanelStepFields(manager, context.stepValues);
  applyStatsPanelSpawnFields(manager, context.pair);
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

function resolveSessionChallengeId(manager, options) {
  var challengeId =
    options && typeof options.challengeId === "string" && options.challengeId
      ? options.challengeId
      : null;
  if (!challengeId && typeof window !== "undefined" && window.GAME_CHALLENGE_CONTEXT && window.GAME_CHALLENGE_CONTEXT.id) {
    challengeId = window.GAME_CHALLENGE_CONTEXT.id;
  }
  return challengeId;
}

function createSessionReplaySnapshot(manager, challengeId) {
  if (!manager) return null;
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
    challenge_id: challengeId,
    seed: manager.initialSeed,
    actions: []
  };
}

function resetSessionTimerAndInputState(manager) {
  if (!manager) return;
  manager.timerStatus = 0;
  manager.startTime = null;
  manager.timerID = null;
  manager.time = 0;
  manager.accumulatedTime = 0;
  manager.pendingMoveInput = null;
  manager.moveInputFlushScheduled = false;
  manager.lastMoveInputAt = 0;
}

function resetSessionTransientState(manager) {
  if (!manager) return;
  manager.lastSpawn = null;
  manager.forcedSpawn = null;
  manager.reached32k = false;
  manager.isTestMode = false;
  manager.cappedMilestoneCount = 0;
  resetSessionTimerAndInputState(manager);
  manager.sessionStartedAt = Date.now();
  manager.hasGameStarted = false;
}

function initializeSessionSeedState(manager, inputSeed) {
  if (!manager) return false;
  var hasInputSeed = typeof inputSeed !== "undefined";
  if (hasInputSeed) {
    manager.replayIndex = 0;
  }
  manager.initialSeed = hasInputSeed ? inputSeed : Math.random();
  manager.seed = manager.initialSeed;
  manager.replayMode = hasInputSeed;
  if (!hasInputSeed) {
    manager.disableSessionSync = false;
  }
  return hasInputSeed;
}

function resetSessionReplayState(manager) {
  if (!manager) return;
  manager.moveHistory = [];
  manager.replayCompactLog = "";
  manager.initialBoardMatrix = null;
  manager.replayStartBoardMatrix = null;
}

function initializeSessionReplaySnapshotState(manager, options) {
  if (!manager) return;
  manager.sessionSubmitDone = false;
  manager.challengeId = resolveSessionChallengeId(manager, options);
  manager.sessionReplayV3 = createSessionReplaySnapshot(manager, manager.challengeId);
}

function initializeSessionState(manager, inputSeed, options) {
  if (!manager) return false;
  var hasInputSeed = initializeSessionSeedState(manager, inputSeed);
  resetSessionReplayState(manager);
  initializeSessionReplaySnapshotState(manager, options);
  resetSessionTransientState(manager);
  return hasInputSeed;
}

function resolveTimerMilestoneSlotByValueMap(manager, timerMilestones) {
  if (!manager) return {};
  var getTimerMilestoneSlotByValueCore = manager.callCoreRulesRuntime(
    "getTimerMilestoneSlotByValue",
    [
      timerMilestones,
      GameManager.TIMER_SLOT_IDS
    ]
  );
  return manager.resolveNormalizedCoreValueOrFallback(
    getTimerMilestoneSlotByValueCore,
    function (coreValue) {
      return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      return buildTimerMilestoneSlotByValueMapFallback(timerMilestones);
    }
  );
}

function syncTimerMilestonesUi(manager) {
  if (!manager) return;
  if (typeof document === "undefined") return;
  syncTimerMilestoneLegendLabels(manager);
  manager.callWindowNamespaceMethod("ThemeManager", "syncTimerLegendStyles");
}

function initializeTimerMilestones(manager) {
  if (!manager) return;
  manager.timerMilestones = manager.getTimerMilestoneValues();
  manager.timerMilestoneSlotByValue = resolveTimerMilestoneSlotByValueMap(manager, manager.timerMilestones);
  syncTimerMilestonesUi(manager);
}

function buildTimerMilestoneSlotByValueMapFallback(timerMilestones) {
  var map = {};
  var milestones = Array.isArray(timerMilestones) ? timerMilestones : [];
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
    var milestone = milestones[i];
    if (Number.isInteger(milestone) && milestone > 0) {
      map[String(milestone)] = slotId;
    }
  }
  return map;
}

function syncTimerMilestoneLegendLabels(manager) {
  if (!manager || typeof document === "undefined") return;
  var milestones = manager.timerMilestones || manager.getTimerMilestoneValues();
  for (var milestoneIndex = 0; milestoneIndex < GameManager.TIMER_SLOT_IDS.length; milestoneIndex++) {
    var legendSlotId = String(GameManager.TIMER_SLOT_IDS[milestoneIndex]);
    var label = String(milestones[milestoneIndex]);
    var nodes = document.querySelectorAll(".timer-legend-" + legendSlotId);
    for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      nodes[nodeIndex].textContent = label;
    }
  }
}

function resetRoundStepStatsState(manager) {
  if (!manager) return;
  manager.comboStreak = 0;
  manager.successfulMoveCount = 0;
  manager.ipsInputCount = 0;
  manager.undoUsed = 0;
}

function resetRoundDirectionLockState(manager) {
  if (!manager) return;
  manager.lockConsumedAtMoveCount = -1;
  manager.lockedDirectionTurn = null;
  manager.lockedDirection = null;
}

function resetRoundSpawnStatsState(manager) {
  if (!manager) return;
  manager.spawnValueCounts = {};
  manager.spawnTwos = 0;
  manager.spawnFours = 0;
}

function resetRoundStatsState(manager) {
  if (!manager) return;
  resetRoundStepStatsState(manager);
  resetRoundDirectionLockState(manager);
  resetRoundSpawnStatsState(manager);
  manager.undoEnabled = manager.loadUndoSettingForMode(manager.mode);
}

function getActionKind(manager, action) {
  if (!manager) return "x";
  var getReplayActionKindCore = manager.callCoreReplayExecutionRuntime(
    "getReplayActionKind",
    [action]
  );
  return manager.resolveCoreStringCallOrFallback(getReplayActionKindCore, function () {
    if (action === -1) return "u";
    if (action >= 0 && action <= 3) return "m";
    if (Array.isArray(action) && action.length > 0) return action[0];
    return "x";
  });
}

function registerCoreRuntimeCaller(methodName, resolverMethodName) {
  if (typeof methodName !== "string" || !methodName) return;
  if (typeof resolverMethodName !== "string" || !resolverMethodName) return;
  GameManager.prototype[methodName] = function (coreMethodName, args) {
    var resolver = this[resolverMethodName];
    if (typeof resolver !== "function") {
      return createUnavailableCoreCallResult();
    }
    var runtimeMethod = resolver.call(this, coreMethodName);
    if (typeof runtimeMethod !== "function") {
      return createUnavailableCoreCallResult();
    }
    return {
      available: true,
      value: runtimeMethod.apply(null, Array.isArray(args) ? args : [])
    };
  };
}

function saveGameStateImpl(options) {
  options = options || {};
  var now = Date.now();
  if (shouldSkipSaveGameState(this, options, now)) return;
  try {
    commitSavedGameStateAtTimestamp(this, now);
  } catch (_err) {}
}

function initializeGameManagerCoreFields(manager, size, InputManager, Actuator, ScoreManager) {
  if (!manager) return;
  manager.size = size; // Size of the grid
  manager.width = size;
  manager.height = size;
  manager.inputManager = new InputManager;
  manager.scoreManager = new ScoreManager;
  manager.actuator = new Actuator;
  manager.timerContainer = document.querySelector(".timer-container") || document.getElementById("timer");
  manager.cornerRateEl = null;
  manager.cornerIpsEl = null;
}

function initializeGameManagerRuntimeState(manager) {
  if (!manager) return;
  manager.startTiles = 2;
  manager.maxTile = Infinity;
  manager.mode = detectMode(manager);
  manager.modeConfig = null;
  manager.ruleset = "pow2";
  manager.spawnTable = [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  manager.rankedBucket = "none";
  manager.disableSessionSync = false;
  manager.sessionSubmitDone = false;
  manager.sessionReplayV3 = null;
  manager.timerModuleView = "timer";
  manager.timerLeaderboardLoadId = 0;
  manager.timerModuleBaseHeight = 0;
  manager.timerUpdateIntervalMs = 10;
  manager.lastStatsPanelUpdateAt = 0;
  manager.pendingMoveInput = null;
  manager.moveInputFlushScheduled = false;
  manager.lastMoveInputAt = 0;
  manager.practiceRestartBoardMatrix = null;
  manager.practiceRestartModeConfig = null;
}

function bindGameManagerInputEvents(manager) {
  if (!manager || !manager.inputManager) return;
  var managerForInput = manager;
  manager.inputManager.on("move", function (direction) {
    handleMoveInput(managerForInput, direction);
  });
  manager.inputManager.on("restart", manager.restart.bind(manager));
  manager.inputManager.on("keepPlaying", manager.keepPlaying.bind(manager));
}

function bindGameManagerSavedStatePersistence(manager) {
  if (!manager) return;
  var windowLikeForPersistence = manager.getWindowLike();
  if (!(windowLikeForPersistence && !manager.savedGameStateBound)) return;
  var saveHandler = function () {
    saveGameState(manager, { force: true });
  };
  windowLikeForPersistence.addEventListener("beforeunload", saveHandler);
  windowLikeForPersistence.addEventListener("pagehide", saveHandler);
  manager.savedGameStateBound = true;
}

function initializeGameManagerUi(manager) {
  if (!manager) return;
  manager.undoStack = [];
  initCornerStatsUi(manager);
  initStatsPanelUi(manager);
}

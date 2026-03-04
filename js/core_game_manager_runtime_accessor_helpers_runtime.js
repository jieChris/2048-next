function registerCoreRuntimeMethodResolver(methodName, runtimeGetterName) {
  GameManager.prototype[methodName] = function (coreMethodName) {
    if (!(typeof runtimeGetterName === "string" && runtimeGetterName)) return null;
    if (!(typeof coreMethodName === "string" && coreMethodName)) return null;
    var runtimeGetter = this[runtimeGetterName];
    if (typeof runtimeGetter !== "function") return null;
    var runtime = runtimeGetter.call(this);
    if (!isRuntimeAccessorObject(runtime)) return null;
    var runtimeMethod = runtime[coreMethodName];
    if (typeof runtimeMethod !== "function") return null;
    return function () {
      return runtimeMethod.apply(runtime, arguments);
    };
  };
}

function isRuntimeAccessorObject(value) {
  return !!(value && typeof value === "object");
}

function registerCoreRuntimeGetter(methodName, runtimeName) {
  GameManager.prototype[methodName] = function () {
    var windowLike = this.getWindowLike();
    if (!isRuntimeAccessorObject(windowLike)) return null;
    if (!(typeof runtimeName === "string" && runtimeName)) return null;
    var runtime = windowLike[runtimeName];
    return isRuntimeAccessorObject(runtime) ? runtime : null;
  };
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

function registerCoreRuntimeAccessors(accessorDefs) {
  if (!Array.isArray(accessorDefs)) return;
  for (var index = 0; index < accessorDefs.length; index++) {
    var accessorDef = accessorDefs[index];
    if (!(Array.isArray(accessorDef) && accessorDef.length >= 4)) continue;
    var callerMethodName = accessorDef[0];
    var resolverMethodName = accessorDef[1];
    var getterMethodName = accessorDef[2];
    var runtimeName = accessorDef[3];
    registerCoreRuntimeGetter(getterMethodName, runtimeName);
    registerCoreRuntimeMethodResolver(resolverMethodName, getterMethodName);
    registerCoreRuntimeCaller(callerMethodName, resolverMethodName);
  }
}

function resolveLegacyAdapterBridgeMethod(manager, methodName) {
  if (!manager) return null;
  var bridge = resolveLegacyAdapterBridgeForManager(manager);
  if (!bridge || bridge.manager !== manager) return null;
  if (!(typeof methodName === "string" && methodName.length > 0)) return null;
  var method = bridge[methodName];
  if (typeof method !== "function") return null;
  return {
    bridge: bridge,
    method: method
  };
}

function resolveLegacyAdapterBridgeForManager(manager) {
  if (!manager) return null;
  var hostWindow = typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  var bridge = isRuntimeAccessorObject(hostWindow) ? hostWindow.__legacyEngine : null;
  if (!(isRuntimeAccessorObject(bridge) && bridge.manager === manager)) {
    bridge = null;
  }
  return bridge;
}

function callLegacyAdapterBridgeMethodOnBridge(manager, bridge, methodName, args) {
  if (!manager || !bridge || bridge.manager !== manager) {
    return createUnavailableCoreCallResult();
  }
  if (!(typeof methodName === "string" && methodName.length > 0)) {
    return createUnavailableCoreCallResult();
  }
  var method = bridge[methodName];
  if (typeof method !== "function") return createUnavailableCoreCallResult();
  return {
    available: true,
    value: method.apply(bridge, Array.isArray(args) ? args : [])
  };
}

function resolveAdapterSessionParityBridgeState(manager, readerMethodName) {
  var readerBridgeEntry = manager.resolveLegacyAdapterBridgeMethod(readerMethodName);
  return {
    readerBridgeEntry: readerBridgeEntry,
    bridge: readerBridgeEntry ? readerBridgeEntry.bridge : resolveLegacyAdapterBridgeForManager(manager)
  };
}

function cloneAdapterSessionParitySnapshot(manager, value) {
  if (!isRuntimeAccessorObject(value)) return null;
  return manager.safeClonePlain(value, null);
}

function readAdapterSessionParitySnapshotFromBridge(
  manager,
  bridge,
  readerMethodName,
  cacheFieldName
) {
  var snapshotResult = callLegacyAdapterBridgeMethodOnBridge(manager, bridge, readerMethodName, []);
  if (!snapshotResult.available) return null;
  var clonedSnapshot = cloneAdapterSessionParitySnapshot(manager, snapshotResult.value);
  if (clonedSnapshot) bridge[cacheFieldName] = clonedSnapshot;
  return clonedSnapshot;
}

function readAdapterSessionParitySnapshotFromCache(manager, bridge, cacheFieldName) {
  if (!isRuntimeAccessorObject(bridge[cacheFieldName])) return null;
  return manager.safeClonePlain(bridge[cacheFieldName], null);
}

function getAdapterSessionParitySnapshot(manager, readerMethodName, cacheFieldName) {
  if (!manager) return null;
  var parityBridgeState = resolveAdapterSessionParityBridgeState(manager, readerMethodName);
  var readerBridgeEntry = parityBridgeState.readerBridgeEntry, bridge = parityBridgeState.bridge;
  if (!bridge) return null;
  if (readerBridgeEntry) return readAdapterSessionParitySnapshotFromBridge(manager, readerBridgeEntry.bridge, readerMethodName, cacheFieldName);
  return readAdapterSessionParitySnapshotFromCache(manager, bridge, cacheFieldName);
}

function resolveRuntimeAccessorNonNegativeInteger(value, fallbackValue) {
  return Number.isInteger(value) && value >= 0 ? value : fallbackValue;
}

function resolveAdapterMoveResultSessionId(manager, input) {
  var fromInput = isRuntimeAccessorObject(input) && typeof input.sessionId === "string"
    ? input.sessionId.trim()
    : "";
  if (fromInput) return fromInput;
  if (!manager) return null;
  var fromManager = typeof manager.adapterParitySessionId === "string"
    ? manager.adapterParitySessionId.trim()
    : "";
  return fromManager || null;
}

function buildAdapterMoveResultDetail(manager, input, modeKey, adapterMode, timestamp) {
  if (!manager) return null;
  var sessionId = resolveAdapterMoveResultSessionId(manager, input);
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
    successfulMoveCount: resolveRuntimeAccessorNonNegativeInteger(manager.successfulMoveCount, 0),
    undoUsed: resolveRuntimeAccessorNonNegativeInteger(manager.undoUsed, 0),
    undoDepth: Array.isArray(manager.undoStack) ? manager.undoStack.length : 0,
    sessionId: sessionId,
    at: timestamp
  };
}

function resolveAdapterMoveResultModeKey(manager, bridge) {
  if (bridge && typeof bridge.modeKey === "string" && bridge.modeKey) return bridge.modeKey;
  if (!manager) return "";
  return manager.modeKey || manager.mode || "";
}

function resolveAdapterMoveResultAdapterMode(bridge) {
  if (bridge && typeof bridge.adapterMode === "string" && bridge.adapterMode) return bridge.adapterMode;
  return "legacy-bridge";
}

function buildAdapterSnapshot(adapterMode, modeKey, timestamp, detail) {
  return {
    adapterMode: adapterMode,
    modeKey: modeKey || "unknown",
    sessionId: detail && typeof detail.sessionId === "string" && detail.sessionId
      ? detail.sessionId
      : null,
    updatedAt: timestamp,
    lastMoveResult: detail
  };
}

function syncAdapterSnapshotOnBridge(manager, bridge, snapshot) {
  var syncResult = callLegacyAdapterBridgeMethodOnBridge(
    manager,
    bridge,
    "syncAdapterSnapshot",
    [snapshot]
  );
  if (syncResult.available) {
    bridge.adapterSnapshot = snapshot;
  }
}

function refreshAdapterParityReportCacheOnBridge(manager, bridge) {
  var reportResult = callLegacyAdapterBridgeMethodOnBridge(
    manager,
    bridge,
    "readAdapterParityReport",
    []
  );
  if (!reportResult.available) return;
  bridge.adapterParityReport = reportResult.value;
  if (bridge.adapterParityReport) {
    callLegacyAdapterBridgeMethodOnBridge(
      manager,
      bridge,
      "writeStoredAdapterParityReport",
      [bridge.adapterParityReport, bridge.adapterMode]
    );
  }
}

function refreshAdapterParityABDiffCacheOnBridge(manager, bridge) {
  var abDiffResult = callLegacyAdapterBridgeMethodOnBridge(
    manager,
    bridge,
    "readAdapterParityABDiff",
    []
  );
  if (abDiffResult.available) {
    bridge.adapterParityABDiff = abDiffResult.value;
  }
}

function refreshAdapterParityCachesOnBridge(manager, bridge) {
  refreshAdapterParityReportCacheOnBridge(manager, bridge);
  refreshAdapterParityABDiffCacheOnBridge(manager, bridge);
}

function publishAdapterMoveResult(manager, meta) {
  if (!manager) return false;
  var bridge = resolveLegacyAdapterBridgeForManager(manager);
  if (!bridge) return false;
  var timestamp = Date.now();
  var input = isRuntimeAccessorObject(meta) ? meta : {};
  var modeKey = resolveAdapterMoveResultModeKey(manager, bridge);
  var adapterMode = resolveAdapterMoveResultAdapterMode(bridge);
  var detail = buildAdapterMoveResultDetail(manager, input, modeKey, adapterMode, timestamp);
  var emitResult = callLegacyAdapterBridgeMethodOnBridge(manager, bridge, "emitMoveResult", [detail]);
  if (!emitResult.available) return false;
  var snapshot = buildAdapterSnapshot(adapterMode, modeKey, timestamp, detail);
  syncAdapterSnapshotOnBridge(manager, bridge, snapshot);
  refreshAdapterParityCachesOnBridge(manager, bridge);
  return true;
}

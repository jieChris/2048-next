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

function normalizeRuntimeAccessorObject(value, fallbackValue) {
  return isRuntimeAccessorObject(value) ? value : fallbackValue;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
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

function resolveLegacyAdapterBridgeMethod(manager, methodName) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  var bridge = resolveLegacyAdapterBridgeForManager(manager, windowLike);
  var method = resolveLegacyAdapterBridgeMethodOnBridge(manager, bridge, methodName);
  if (typeof method !== "function") return null;
  return {
    bridge: bridge,
    method: method
  };
}

function resolveLegacyAdapterBridgeForManager(manager, windowLike) {
  if (!manager) return null;
  var hostWindow = normalizeRuntimeAccessorObject(windowLike, null);
  if (!hostWindow) {
    hostWindow = typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  }
  var bridge = isRuntimeAccessorObject(hostWindow) ? hostWindow.__legacyEngine : null;
  if (!(isRuntimeAccessorObject(bridge) && bridge.manager === manager)) {
    bridge = null;
  }
  return bridge;
}

function resolveLegacyAdapterBridgeMethodOnBridge(manager, bridge, methodName) {
  if (!manager || !bridge || bridge.manager !== manager) return null;
  if (!isNonEmptyString(methodName)) return null;
  var method = bridge[methodName];
  return typeof method === "function" ? method : null;
}

function callLegacyAdapterBridgeMethodOnBridge(manager, bridge, methodName, args) {
  var method = resolveLegacyAdapterBridgeMethodOnBridge(manager, bridge, methodName);
  if (typeof method !== "function") return createUnavailableCoreCallResult();
  return {
    available: true,
    value: method.apply(bridge, Array.isArray(args) ? args : [])
  };
}

function cacheAdapterSessionParitySnapshot(manager, bridge, cacheFieldName, snapshot) {
  if (!manager || !bridge) return null;
  if (!isRuntimeAccessorObject(snapshot)) return null;
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
    var snapshotResult = callLegacyAdapterBridgeMethodOnBridge(
      manager,
      readerBridgeEntry.bridge,
      readerMethodName,
      []
    );
    if (!snapshotResult.available) return null;
    return cacheAdapterSessionParitySnapshot(manager, readerBridgeEntry.bridge, cacheFieldName, snapshotResult.value);
  }
  if (isRuntimeAccessorObject(bridge[cacheFieldName])) {
    return manager.safeClonePlain(bridge[cacheFieldName], null);
  }
  return null;
}

function resolveAdapterMoveMetaInput(meta) {
  return normalizeRuntimeAccessorObject(meta, {});
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
  var snapshot = {
    adapterMode: adapterMode,
    modeKey: modeKey || "unknown",
    updatedAt: timestamp,
    lastMoveResult: detail
  };
  var syncResult = callLegacyAdapterBridgeMethodOnBridge(
    manager,
    bridge,
    "syncAdapterSnapshot",
    [snapshot]
  );
  if (!syncResult.available) return;
  bridge.adapterSnapshot = snapshot;
}

function refreshAdapterParityReportSnapshot(manager, bridge) {
  if (!manager || !bridge) return;
  var readResult = callLegacyAdapterBridgeMethodOnBridge(
    manager,
    bridge,
    "readAdapterParityReport",
    []
  );
  if (!readResult.available) return;
  bridge.adapterParityReport = readResult.value;
  if (
    bridge.adapterParityReport &&
    resolveLegacyAdapterBridgeMethodOnBridge(manager, bridge, "writeStoredAdapterParityReport")
  ) {
    callLegacyAdapterBridgeMethodOnBridge(
      manager,
      bridge,
      "writeStoredAdapterParityReport",
      [bridge.adapterParityReport, bridge.adapterMode]
    );
  }
}

function refreshAdapterParityAbDiffSnapshot(manager, bridge) {
  if (!manager || !bridge) return;
  var readResult = callLegacyAdapterBridgeMethodOnBridge(
    manager,
    bridge,
    "readAdapterParityABDiff",
    []
  );
  if (!readResult.available) return;
  bridge.adapterParityABDiff = readResult.value;
}

function publishAdapterMoveResult(manager, meta) {
  if (!manager) return false;
  var bridge = resolveLegacyAdapterBridgeForManager(manager);
  if (!bridge) return false;
  var timestamp = Date.now();
  var input = resolveAdapterMoveMetaInput(meta);
  var modeKey = resolveAdapterBridgeModeKey(manager, bridge);
  var adapterMode = resolveAdapterBridgeMode(manager, bridge);
  var detail = buildAdapterMoveResultDetail(manager, input, modeKey, adapterMode, timestamp);
  var emitResult = callLegacyAdapterBridgeMethodOnBridge(
    manager,
    bridge,
    "emitMoveResult",
    [detail]
  );
  if (!emitResult.available) return false;
  syncAdapterSnapshotFromMoveResult(manager, bridge, detail, modeKey, adapterMode, timestamp);
  refreshAdapterParityReportSnapshot(manager, bridge);
  refreshAdapterParityAbDiffSnapshot(manager, bridge);
  return true;
}

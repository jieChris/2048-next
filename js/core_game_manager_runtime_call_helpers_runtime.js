function callCoreRuntimeWithArgs(manager, runtimeMethodName, methodName, runtimeArgs) {
  if (!manager) return null;
  if (typeof runtimeMethodName !== "string" || !runtimeMethodName) return null;
  var runtimeMethod = manager[runtimeMethodName];
  if (typeof runtimeMethod !== "function") return null;
  var resolvedArgs = Array.isArray(runtimeArgs) ? runtimeArgs : [];
  return runtimeMethod.call(
    manager,
    methodName,
    resolvedArgs
  );
}

function callCoreRuntimeWithPayload(manager, runtimeMethodName, methodName, payload) {
  var payloadArg = typeof payload === "undefined" ? {} : payload;
  return callCoreRuntimeWithArgs(
    manager,
    runtimeMethodName,
    methodName,
    [payloadArg]
  );
}

function resolveCorePayloadCallWith(
  manager,
  runtimeMethodName,
  methodName,
  payload,
  emptyValue,
  resolver
) {
  if (!manager) return emptyValue;
  var coreCallResult = callCoreRuntimeWithPayload(manager, runtimeMethodName, methodName, payload);
  return resolver(manager, coreCallResult);
}

function resolveCoreObjectCallResult(manager, coreCallResult, fallbackResolver) {
  return manager.resolveCoreObjectCallOrFallback(coreCallResult, fallbackResolver);
}

function resolveCoreBooleanCallResult(manager, coreCallResult, fallbackResolver) {
  return manager.resolveCoreBooleanCallOrFallback(coreCallResult, fallbackResolver);
}

function resolveCoreNumericCallResult(manager, coreCallResult, fallbackResolver) {
  return manager.resolveCoreNumericCallOrFallback(coreCallResult, fallbackResolver);
}

function resolveCoreStringCallResult(manager, coreCallResult, fallbackResolver, allowEmpty) {
  return manager.resolveCoreStringCallOrFallback(coreCallResult, fallbackResolver, allowEmpty);
}

function resolveCoreNormalizedCallResult(manager, coreCallResult, normalizer, fallbackResolver, allowNull) {
  if (allowNull) {
    return manager.resolveNormalizedCoreValueOrFallbackAllowNull(
      coreCallResult,
      normalizer,
      fallbackResolver
    );
  }
  return manager.resolveNormalizedCoreValueOrFallback(
    coreCallResult,
    normalizer,
    fallbackResolver
  );
}

function resolveCoreNormalizedCallResultOrUndefined(manager, coreCallResult, normalizer) {
  return manager.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer);
}

function resolveCoreRawCallResultOrUndefined(manager, coreCallResult) {
  return manager.resolveCoreRawCallValueOrUndefined(coreCallResult);
}

function tryHandleCoreRawCallResult(manager, coreCallResult, handler) {
  return manager.tryHandleCoreRawValue(coreCallResult, handler);
}

function resolveCoreObjectPayloadCallOrFallback(
  manager,
  runtimeMethodName,
  methodName,
  payload,
  fallbackResolver
) {
  return resolveCorePayloadCallWith(
    manager,
    runtimeMethodName,
    methodName,
    payload,
    {},
    function (currentManager, coreCallResult) {
      return resolveCoreObjectCallResult(currentManager, coreCallResult, fallbackResolver);
    }
  );
}

function resolveCoreNormalizedPayloadCallOrFallback(
  manager,
  runtimeMethodName,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCorePayloadCallWith(
    manager,
    runtimeMethodName,
    methodName,
    payload,
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCoreNormalizedCallResult(
        currentManager,
        coreCallResult,
        normalizer,
        fallbackResolver,
        false
      );
    }
  );
}

function resolveCoreNormalizedPayloadCallOrUndefined(
  manager,
  runtimeMethodName,
  methodName,
  payload,
  normalizer
) {
  return resolveCorePayloadCallWith(
    manager,
    runtimeMethodName,
    methodName,
    payload,
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCoreNormalizedCallResultOrUndefined(currentManager, coreCallResult, normalizer);
    }
  );
}

function resolveCoreArgsCallWith(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs,
  emptyValue,
  resolver
) {
  if (!manager) return emptyValue;
  var coreCallResult = callCoreRuntimeWithArgs(manager, runtimeMethodName, methodName, runtimeArgs);
  return resolver(manager, coreCallResult);
}

function resolveCoreArgsBooleanCallOrFallback(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs,
  fallbackResolver
) {
  return resolveCoreArgsCallWith(
    manager,
    runtimeMethodName,
    methodName,
    runtimeArgs,
    false,
    function (currentManager, coreCallResult) {
      return resolveCoreBooleanCallResult(currentManager, coreCallResult, fallbackResolver);
    }
  );
}

function resolveCoreArgsNumericCallOrFallback(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs,
  fallbackResolver
) {
  return resolveCoreArgsCallWith(
    manager,
    runtimeMethodName,
    methodName,
    runtimeArgs,
    0,
    function (currentManager, coreCallResult) {
      return resolveCoreNumericCallResult(currentManager, coreCallResult, fallbackResolver);
    }
  );
}

function resolveCoreArgsStringCallOrFallback(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs,
  fallbackResolver,
  allowEmpty
) {
  return resolveCoreArgsCallWith(
    manager,
    runtimeMethodName,
    methodName,
    runtimeArgs,
    "",
    function (currentManager, coreCallResult) {
      return resolveCoreStringCallResult(
        currentManager,
        coreCallResult,
        fallbackResolver,
        allowEmpty
      );
    }
  );
}

function resolveCoreArgsNormalizedCallOrFallback(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs,
  normalizer,
  fallbackResolver
) {
  return resolveCoreArgsCallWith(
    manager,
    runtimeMethodName,
    methodName,
    runtimeArgs,
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCoreNormalizedCallResult(
        currentManager,
        coreCallResult,
        normalizer,
        fallbackResolver,
        false
      );
    }
  );
}

function resolveCoreArgsNormalizedCallOrUndefined(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs,
  normalizer
) {
  return resolveCoreArgsCallWith(
    manager,
    runtimeMethodName,
    methodName,
    runtimeArgs,
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCoreNormalizedCallResultOrUndefined(currentManager, coreCallResult, normalizer);
    }
  );
}

function resolveCoreArgsRawCallValueOrUndefined(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs
) {
  return resolveCoreArgsCallWith(
    manager,
    runtimeMethodName,
    methodName,
    runtimeArgs,
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCoreRawCallResultOrUndefined(currentManager, coreCallResult);
    }
  );
}

function tryHandleCoreArgsRawValue(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs,
  handler
) {
  return resolveCoreArgsCallWith(
    manager,
    runtimeMethodName,
    methodName,
    runtimeArgs,
    false,
    function (currentManager, coreCallResult) {
      return tryHandleCoreRawCallResult(currentManager, coreCallResult, handler);
    }
  );
}

function tryHandleCorePayloadRawValue(
  manager,
  runtimeMethodName,
  methodName,
  payload,
  handler
) {
  return resolveCorePayloadCallWith(
    manager,
    runtimeMethodName,
    methodName,
    payload,
    false,
    function (currentManager, coreCallResult) {
      return tryHandleCoreRawCallResult(currentManager, coreCallResult, handler);
    }
  );
}

function callCoreStorageRuntimeWithPayload(manager, methodName, payload) {
  return callCoreRuntimeWithPayload(
    manager,
    "callCoreStorageRuntime",
    methodName,
    payload
  );
}

function callCoreStorageRuntimeWithWindowContext(manager, methodName, payload) {
  var contextPayload = Object.assign(
    { windowLike: manager ? manager.getWindowLike() : null },
    payload || {}
  );
  return callCoreStorageRuntimeWithPayload(
    manager,
    methodName,
    contextPayload
  );
}

function resolveCoreStoragePayloadCallWith(manager, methodName, payload, emptyValue, resolver) {
  if (!manager) return emptyValue;
  var coreCallResult = callCoreStorageRuntimeWithPayload(manager, methodName, payload);
  return resolver(manager, coreCallResult);
}
function resolveCoreStorageWindowContextCallWith(manager, methodName, payload, emptyValue, resolver) {
  if (!manager) return emptyValue;
  var coreCallResult = callCoreStorageRuntimeWithWindowContext(manager, methodName, payload);
  return resolver(manager, coreCallResult);
}
function resolveCoreStorageNormalizedCallWith(manager, callWith, methodName, payload, normalizer, fallbackResolver, allowNull) {
  return callWith(
    manager,
    methodName,
    payload,
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCoreNormalizedCallResult(
        currentManager,
        coreCallResult,
        normalizer,
        fallbackResolver,
        allowNull === true
      );
    }
  );
}
function resolveCoreStorageBooleanCallWith(manager, callWith, methodName, payload, fallbackResolver) {
  return callWith(
    manager,
    methodName,
    payload,
    false,
    function (currentManager, coreCallResult) {
      return resolveCoreBooleanCallResult(currentManager, coreCallResult, fallbackResolver);
    }
  );
}
function resolveCoreStorageBooleanCallOrFallback(
  manager,
  methodName,
  payload,
  fallbackResolver
) {
  return resolveCoreStorageBooleanCallWith(
    manager,
    resolveCoreStorageWindowContextCallWith,
    methodName,
    payload,
    fallbackResolver
  );
}
function resolveCoreStorageNormalizedCallOrFallback(
  manager,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCoreStorageNormalizedCallWith(
    manager,
    resolveCoreStorageWindowContextCallWith,
    methodName,
    payload,
    normalizer,
    fallbackResolver,
    false
  );
}
function resolveCoreStoragePayloadBooleanCallOrFallback(
  manager,
  methodName,
  payload,
  fallbackResolver
) {
  return resolveCoreStorageBooleanCallWith(
    manager,
    resolveCoreStoragePayloadCallWith,
    methodName,
    payload,
    fallbackResolver
  );
}

function resolveCoreStoragePayloadNormalizedCallOrFallback(
  manager,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCoreStorageNormalizedCallWith(
    manager,
    resolveCoreStoragePayloadCallWith,
    methodName,
    payload,
    normalizer,
    fallbackResolver,
    false
  );
}

function resolveCoreStoragePayloadNormalizedCallOrFallbackAllowNull(
  manager,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCoreStorageNormalizedCallWith(
    manager,
    resolveCoreStoragePayloadCallWith,
    methodName,
    payload,
    normalizer,
    fallbackResolver,
    true
  );
}

function resolveCoreMovePathBooleanCallOrFallback(manager, methodName, runtimeArgs, fallbackResolver) {
  return resolveCoreArgsBooleanCallOrFallback(manager, "callCoreMovePathRuntime", methodName, runtimeArgs, fallbackResolver);
}

function resolveCoreMovePathNormalizedCallOrFallback(manager, methodName, runtimeArgs, normalizer, fallbackResolver) {
  return resolveCoreArgsNormalizedCallOrFallback(manager, "callCoreMovePathRuntime", methodName, runtimeArgs, normalizer, fallbackResolver);
}

function resolveCoreMoveScanBooleanCallOrFallback(manager, methodName, runtimeArgs, fallbackResolver) {
  return resolveCoreArgsBooleanCallOrFallback(manager, "callCoreMoveScanRuntime", methodName, runtimeArgs, fallbackResolver);
}

function resolveCoreGridScanNormalizedCallOrFallback(manager, methodName, runtimeArgs, normalizer, fallbackResolver) {
  return resolveCoreArgsNormalizedCallOrFallback(manager, "callCoreGridScanRuntime", methodName, runtimeArgs, normalizer, fallbackResolver);
}

function resolveCoreTimerIntervalNumericCallOrFallback(manager, methodName, runtimeArgs, fallbackResolver) {
  return resolveCoreArgsNumericCallOrFallback(manager, "callCoreTimerIntervalRuntime", methodName, runtimeArgs, fallbackResolver);
}

function resolveCoreTimerIntervalNormalizedCallOrUndefined(manager, methodName, runtimeArgs, normalizer) {
  return resolveCoreArgsNormalizedCallOrUndefined(manager, "callCoreTimerIntervalRuntime", methodName, runtimeArgs, normalizer);
}

function resolveCorePostMoveRecordObjectCallOrFallback(manager, methodName, payload, fallbackResolver) {
  return resolveCoreObjectPayloadCallOrFallback(manager, "callCorePostMoveRecordRuntime", methodName, payload, fallbackResolver);
}

function resolveCorePostUndoRecordObjectCallOrFallback(manager, methodName, payload, fallbackResolver) {
  return resolveCoreObjectPayloadCallOrFallback(manager, "callCorePostUndoRecordRuntime", methodName, payload, fallbackResolver);
}

function resolveCoreUndoRestoreObjectCallOrFallback(manager, methodName, payload, fallbackResolver) {
  return resolveCoreObjectPayloadCallOrFallback(manager, "callCoreUndoRestoreRuntime", methodName, payload, fallbackResolver);
}

function resolveCoreUndoTileRestoreNormalizedCallOrUndefined(manager, methodName, payload, normalizer) {
  return resolveCoreNormalizedPayloadCallOrUndefined(manager, "callCoreUndoTileRestoreRuntime", methodName, payload, normalizer);
}

function resolveCoreUndoRestorePayloadObjectCallOrFallback(manager, methodName, payload, fallbackResolver) {
  return resolveCoreObjectPayloadCallOrFallback(manager, "callCoreUndoRestorePayloadRuntime", methodName, payload, fallbackResolver);
}

function resolveCoreMergeEffectsObjectCallOrFallback(manager, methodName, payload, fallbackResolver) {
  return resolveCoreObjectPayloadCallOrFallback(manager, "callCoreMergeEffectsRuntime", methodName, payload, fallbackResolver);
}

function resolveCoreMoveApplyNormalizedCallOrFallback(manager, methodName, payload, normalizer, fallbackResolver) {
  return resolveCoreNormalizedPayloadCallOrFallback(manager, "callCoreMoveApplyRuntime", methodName, payload, normalizer, fallbackResolver);
}

function resolveCoreUndoStackEntryNormalizedCallOrUndefined(manager, methodName, payload, normalizer) {
  return resolveCoreNormalizedPayloadCallOrUndefined(manager, "callCoreUndoStackEntryRuntime", methodName, payload, normalizer);
}

function resolveCoreUndoTileSnapshotNormalizedCallOrUndefined(manager, methodName, payload, normalizer) {
  return resolveCoreNormalizedPayloadCallOrUndefined(manager, "callCoreUndoTileSnapshotRuntime", methodName, payload, normalizer);
}

function tryHandleCoreSpecialRulesRawValue(manager, methodName, runtimeArgs, handler) {
  return tryHandleCoreArgsRawValue(manager, "callCoreSpecialRulesRuntime", methodName, runtimeArgs, handler);
}

function resolveCoreDirectionLockRawCallValueOrUndefined(manager, methodName, runtimeArgs) {
  return resolveCoreArgsRawCallValueOrUndefined(manager, "callCoreDirectionLockRuntime", methodName, runtimeArgs);
}

function tryHandleCoreScoringRawValue(manager, methodName, payload, handler) {
  return tryHandleCorePayloadRawValue(manager, "callCoreScoringRuntime", methodName, payload, handler);
}

function resolveCorePostMoveNormalizedCallOrFallback(manager, methodName, payload, normalizer, fallbackResolver) {
  return resolveCoreNormalizedPayloadCallOrFallback(manager, "callCorePostMoveRuntime", methodName, payload, normalizer, fallbackResolver);
}

function resolveCoreUndoSnapshotNormalizedCallOrFallback(manager, methodName, payload, normalizer, fallbackResolver) {
  return resolveCoreNormalizedPayloadCallOrFallback(manager, "callCoreUndoSnapshotRuntime", methodName, payload, normalizer, fallbackResolver);
}

function resolveCorePrettyTimeStringCallOrFallback(manager, methodName, runtimeArgs, fallbackResolver, allowEmpty) {
  return resolveCoreArgsStringCallOrFallback(manager, "callCorePrettyTimeRuntime", methodName, runtimeArgs, fallbackResolver, allowEmpty);
}

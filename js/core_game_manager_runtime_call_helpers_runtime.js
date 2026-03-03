function resolveRuntimeCallResult(manager, runtimeMethodName, methodName, runtimeArgs) {
  if (!manager) return null;
  if (typeof runtimeMethodName !== "string" || !runtimeMethodName) return null;
  var runtimeMethod = manager[runtimeMethodName];
  if (typeof runtimeMethod !== "function") return null;
  var resolvedArgs = Array.isArray(runtimeArgs) ? runtimeArgs : [];
  return runtimeMethod.call(manager, methodName, resolvedArgs);
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
  var payloadArg = typeof payload === "undefined" ? {} : payload;
  var coreCallResult = resolveRuntimeCallResult(manager, runtimeMethodName, methodName, [payloadArg]);
  return resolver(manager, coreCallResult);
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
  var coreCallResult = resolveRuntimeCallResult(manager, runtimeMethodName, methodName, runtimeArgs);
  return resolver(manager, coreCallResult);
}

function callCoreStorageRuntime(manager, methodName, payload, includeWindowContext) {
  if (!manager) return null;
  var resolvedPayload =
    includeWindowContext === true
      ? Object.assign({ windowLike: manager ? manager.getWindowLike() : null }, payload || {})
      : typeof payload === "undefined"
        ? {}
        : payload;
  return resolveRuntimeCallResult(
    manager,
    "callCoreStorageRuntime",
    methodName,
    [resolvedPayload]
  );
}

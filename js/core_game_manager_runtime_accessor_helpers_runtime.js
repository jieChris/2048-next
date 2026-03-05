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

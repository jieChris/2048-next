(function (global) {
  "use strict";

  if (!global) return;

  function hasFunction(target, key) {
    if (!target || typeof target !== "object") return false;
    return typeof target[key] === "function";
  }

  function resolveSimpleBootstrapRuntime(windowLike) {
    var source = windowLike || {};
    var runtime = source.CoreBootstrapRuntime || source.LegacyBootstrapRuntime;
    if (!runtime || typeof runtime !== "object" || !hasFunction(runtime, "startGameOnAnimationFrame")) {
      throw new Error("CoreBootstrapRuntime.startGameOnAnimationFrame is required");
    }
    return runtime;
  }

  global.CoreSimpleRuntimeContractRuntime = global.CoreSimpleRuntimeContractRuntime || {};
  global.CoreSimpleRuntimeContractRuntime.resolveSimpleBootstrapRuntime =
    resolveSimpleBootstrapRuntime;
})(typeof window !== "undefined" ? window : undefined);

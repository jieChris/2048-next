(function (global) {
  "use strict";

  if (!global) return;

  function hasFunction(target, key) {
    if (!target || typeof target !== "object") return false;
    return typeof target[key] === "function";
  }

  function resolveSimpleBootstrapRuntime(windowLike) {
    var source = windowLike || {};
    var runtime = source.LegacyBootstrapRuntime;
    if (!runtime || typeof runtime !== "object" || !hasFunction(runtime, "startGameOnAnimationFrame")) {
      throw new Error("LegacyBootstrapRuntime.startGameOnAnimationFrame is required");
    }
    return runtime;
  }

  global.CoreSimpleRuntimeContractRuntime = global.CoreSimpleRuntimeContractRuntime || {};
  global.CoreSimpleRuntimeContractRuntime.resolveSimpleBootstrapRuntime =
    resolveSimpleBootstrapRuntime;
})(typeof window !== "undefined" ? window : undefined);

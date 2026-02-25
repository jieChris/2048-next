(function (global) {
  "use strict";

  if (!global) return;

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isObject(value) {
    return !!value && typeof value === "object";
  }

  function resolveHistoryCanaryRuntimePolicy(runtime) {
    if (!isObject(runtime)) return null;

    var resolver = runtime.resolveAdapterModePolicy;
    if (typeof resolver !== "function") return null;

    var policy = resolver.call(runtime, {});
    return isPlainObject(policy) ? policy : null;
  }

  function resolveHistoryCanaryRuntimeStoredPolicyKeys(runtime) {
    if (!isObject(runtime)) return null;

    var reader = runtime.readStoredAdapterPolicyKeys;
    if (typeof reader !== "function") return null;

    var result = reader.call(runtime);
    return isPlainObject(result) ? result : null;
  }

  global.CoreHistoryCanarySourceRuntime = global.CoreHistoryCanarySourceRuntime || {};
  global.CoreHistoryCanarySourceRuntime.resolveHistoryCanaryRuntimePolicy =
    resolveHistoryCanaryRuntimePolicy;
  global.CoreHistoryCanarySourceRuntime.resolveHistoryCanaryRuntimeStoredPolicyKeys =
    resolveHistoryCanaryRuntimeStoredPolicyKeys;
})(typeof window !== "undefined" ? window : undefined);

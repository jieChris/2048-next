(function (global) {
  "use strict";

  if (!global) return;

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isObject(value) {
    return !!value && typeof value === "object";
  }

  function readStorageValueByKey(readStorageValue, key) {
    if (typeof readStorageValue !== "function") return null;
    return readStorageValue(String(key || ""));
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

  function resolveHistoryCanaryPolicySnapshotInput(input) {
    var source = isObject(input) ? input : {};
    return {
      runtimePolicy: resolveHistoryCanaryRuntimePolicy(source.runtime),
      defaultModeRaw: readStorageValueByKey(source.readStorageValue, source.defaultModeStorageKey),
      forceLegacyRaw: readStorageValueByKey(source.readStorageValue, source.forceLegacyStorageKey)
    };
  }

  function resolveHistoryCanaryStoredPolicyInput(input) {
    var source = isObject(input) ? input : {};
    return {
      runtimeStoredKeys: resolveHistoryCanaryRuntimeStoredPolicyKeys(source.runtime),
      adapterModeRaw: readStorageValueByKey(source.readStorageValue, source.adapterModeStorageKey),
      defaultModeRaw: readStorageValueByKey(source.readStorageValue, source.defaultModeStorageKey),
      forceLegacyRaw: readStorageValueByKey(source.readStorageValue, source.forceLegacyStorageKey)
    };
  }

  global.CoreHistoryCanarySourceRuntime = global.CoreHistoryCanarySourceRuntime || {};
  global.CoreHistoryCanarySourceRuntime.resolveHistoryCanaryRuntimePolicy =
    resolveHistoryCanaryRuntimePolicy;
  global.CoreHistoryCanarySourceRuntime.resolveHistoryCanaryRuntimeStoredPolicyKeys =
    resolveHistoryCanaryRuntimeStoredPolicyKeys;
  global.CoreHistoryCanarySourceRuntime.resolveHistoryCanaryPolicySnapshotInput =
    resolveHistoryCanaryPolicySnapshotInput;
  global.CoreHistoryCanarySourceRuntime.resolveHistoryCanaryStoredPolicyInput =
    resolveHistoryCanaryStoredPolicyInput;
})(typeof window !== "undefined" ? window : undefined);

(function (global) {
  "use strict";

  if (!global) return;

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isObject(value) {
    return !!value && typeof value === "object";
  }

  function asResolver(value) {
    return typeof value === "function" ? value : null;
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

  function resolveHistoryCanaryPolicyAndStoredState(input) {
    var source = isObject(input) ? input : {};
    var snapshotInput = resolveHistoryCanaryPolicySnapshotInput({
      runtime: source.runtime,
      readStorageValue: source.readStorageValue,
      defaultModeStorageKey: source.defaultModeStorageKey,
      forceLegacyStorageKey: source.forceLegacyStorageKey
    });
    var storedInput = resolveHistoryCanaryStoredPolicyInput({
      runtime: source.runtime,
      readStorageValue: source.readStorageValue,
      adapterModeStorageKey: source.adapterModeStorageKey,
      defaultModeStorageKey: source.defaultModeStorageKey,
      forceLegacyStorageKey: source.forceLegacyStorageKey
    });
    var resolvePolicySnapshot = asResolver(source.resolvePolicySnapshot);
    var resolveStoredPolicy = asResolver(source.resolveStoredPolicy);
    return {
      policy: resolvePolicySnapshot ? resolvePolicySnapshot(snapshotInput) : null,
      stored: resolveStoredPolicy ? resolveStoredPolicy(storedInput) : null
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
  global.CoreHistoryCanarySourceRuntime.resolveHistoryCanaryPolicyAndStoredState =
    resolveHistoryCanaryPolicyAndStoredState;
})(typeof window !== "undefined" ? window : undefined);

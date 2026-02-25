function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function readStorageValueByKey(
  readStorageValue: unknown,
  key: unknown
): unknown {
  if (typeof readStorageValue !== "function") return null;
  return (readStorageValue as (storageKey: unknown) => unknown)(String(key || ""));
}

export function resolveHistoryCanaryRuntimePolicy(runtime: unknown): Record<string, unknown> | null {
  if (!isObject(runtime)) return null;

  const resolver = runtime.resolveAdapterModePolicy;
  if (typeof resolver !== "function") return null;

  const policy = resolver.call(runtime, {});
  return isPlainObject(policy) ? policy : null;
}

export function resolveHistoryCanaryRuntimeStoredPolicyKeys(
  runtime: unknown
): Record<string, unknown> | null {
  if (!isObject(runtime)) return null;

  const reader = runtime.readStoredAdapterPolicyKeys;
  if (typeof reader !== "function") return null;

  const result = reader.call(runtime);
  return isPlainObject(result) ? result : null;
}

export function resolveHistoryCanaryPolicySnapshotInput(input: {
  runtime?: unknown;
  readStorageValue?: unknown;
  defaultModeStorageKey?: unknown;
  forceLegacyStorageKey?: unknown;
}): {
  runtimePolicy: Record<string, unknown> | null;
  defaultModeRaw: unknown;
  forceLegacyRaw: unknown;
} {
  return {
    runtimePolicy: resolveHistoryCanaryRuntimePolicy(input && input.runtime),
    defaultModeRaw: readStorageValueByKey(input && input.readStorageValue, input && input.defaultModeStorageKey),
    forceLegacyRaw: readStorageValueByKey(input && input.readStorageValue, input && input.forceLegacyStorageKey)
  };
}

export function resolveHistoryCanaryStoredPolicyInput(input: {
  runtime?: unknown;
  readStorageValue?: unknown;
  adapterModeStorageKey?: unknown;
  defaultModeStorageKey?: unknown;
  forceLegacyStorageKey?: unknown;
}): {
  runtimeStoredKeys: Record<string, unknown> | null;
  adapterModeRaw: unknown;
  defaultModeRaw: unknown;
  forceLegacyRaw: unknown;
} {
  return {
    runtimeStoredKeys: resolveHistoryCanaryRuntimeStoredPolicyKeys(input && input.runtime),
    adapterModeRaw: readStorageValueByKey(input && input.readStorageValue, input && input.adapterModeStorageKey),
    defaultModeRaw: readStorageValueByKey(input && input.readStorageValue, input && input.defaultModeStorageKey),
    forceLegacyRaw: readStorageValueByKey(input && input.readStorageValue, input && input.forceLegacyStorageKey)
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asResolver(value: unknown): ((input: unknown) => unknown) | null {
  return typeof value === "function" ? (value as (input: unknown) => unknown) : null;
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

export function resolveHistoryCanaryPolicyAndStoredState(input: {
  runtime?: unknown;
  readStorageValue?: unknown;
  adapterModeStorageKey?: unknown;
  defaultModeStorageKey?: unknown;
  forceLegacyStorageKey?: unknown;
  resolvePolicySnapshot?: unknown;
  resolveStoredPolicy?: unknown;
}): {
  policy: unknown;
  stored: unknown;
} {
  const snapshotInput = resolveHistoryCanaryPolicySnapshotInput({
    runtime: input && input.runtime,
    readStorageValue: input && input.readStorageValue,
    defaultModeStorageKey: input && input.defaultModeStorageKey,
    forceLegacyStorageKey: input && input.forceLegacyStorageKey
  });
  const storedInput = resolveHistoryCanaryStoredPolicyInput({
    runtime: input && input.runtime,
    readStorageValue: input && input.readStorageValue,
    adapterModeStorageKey: input && input.adapterModeStorageKey,
    defaultModeStorageKey: input && input.defaultModeStorageKey,
    forceLegacyStorageKey: input && input.forceLegacyStorageKey
  });
  const resolvePolicySnapshot = asResolver(input && input.resolvePolicySnapshot);
  const resolveStoredPolicy = asResolver(input && input.resolveStoredPolicy);
  return {
    policy: resolvePolicySnapshot ? resolvePolicySnapshot(snapshotInput) : null,
    stored: resolveStoredPolicy ? resolveStoredPolicy(storedInput) : null
  };
}

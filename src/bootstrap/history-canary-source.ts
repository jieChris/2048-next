function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
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

export type EngineAdapterMode = "legacy-bridge" | "core-adapter";
export type EngineAdapterModeSource =
  | "explicit"
  | "force-legacy"
  | "global"
  | "query"
  | "storage"
  | "default"
  | "fallback";
export type EngineAdapterForceLegacySource = "input" | "global" | "query" | "storage" | null;

export interface AdapterModeResolverInput {
  explicitMode?: string | null;
  forceLegacy?: boolean | number | string | null;
  globalMode?: string | null;
  queryMode?: string | null;
  storageMode?: string | null;
  defaultMode?: string | null;
}

export interface AdapterModePolicyResolverInput extends AdapterModeResolverInput {
  globalForceLegacy?: boolean | number | string | null;
  queryForceLegacy?: boolean | number | string | null;
  storageForceLegacy?: boolean | number | string | null;
}

export interface EngineAdapterModePolicy {
  effectiveMode: EngineAdapterMode;
  modeSource: EngineAdapterModeSource;
  forceLegacyEnabled: boolean;
  forceLegacySource: EngineAdapterForceLegacySource;
  explicitMode: EngineAdapterMode | null;
  globalMode: EngineAdapterMode | null;
  queryMode: EngineAdapterMode | null;
  storageMode: EngineAdapterMode | null;
  defaultMode: EngineAdapterMode | null;
}

function normalizeAdapterMode(raw: string | null | undefined): EngineAdapterMode | null {
  if (raw === "core" || raw === "core-adapter") return "core-adapter";
  if (raw === "legacy" || raw === "legacy-bridge") return "legacy-bridge";
  return null;
}

function normalizeForceLegacyFlag(raw: boolean | number | string | null | undefined): boolean {
  if (raw === true || raw === 1) return true;
  if (typeof raw !== "string") return false;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on" ||
    normalized === "legacy" ||
    normalized === "legacy-bridge"
  );
}

function resolveForceLegacySource(input: AdapterModePolicyResolverInput): EngineAdapterForceLegacySource {
  if (normalizeForceLegacyFlag(input.forceLegacy)) return "input";
  if (normalizeForceLegacyFlag(input.globalForceLegacy)) return "global";
  if (normalizeForceLegacyFlag(input.queryForceLegacy)) return "query";
  if (normalizeForceLegacyFlag(input.storageForceLegacy)) return "storage";
  return null;
}

export function resolveEngineAdapterModePolicy(
  input: AdapterModePolicyResolverInput
): EngineAdapterModePolicy {
  const explicit = normalizeAdapterMode(input.explicitMode);
  const globalMode = normalizeAdapterMode(input.globalMode);
  const queryMode = normalizeAdapterMode(input.queryMode);
  const storageMode = normalizeAdapterMode(input.storageMode);
  const defaultMode = normalizeAdapterMode(input.defaultMode);
  const forceLegacySource = resolveForceLegacySource(input);
  const forceLegacyEnabled = forceLegacySource !== null;

  if (explicit) {
    return {
      effectiveMode: explicit,
      modeSource: "explicit",
      forceLegacyEnabled,
      forceLegacySource,
      explicitMode: explicit,
      globalMode,
      queryMode,
      storageMode,
      defaultMode
    };
  }

  if (forceLegacySource) {
    return {
      effectiveMode: "legacy-bridge",
      modeSource: "force-legacy",
      forceLegacyEnabled,
      forceLegacySource,
      explicitMode: explicit,
      globalMode,
      queryMode,
      storageMode,
      defaultMode
    };
  }

  if (globalMode) {
    return {
      effectiveMode: globalMode,
      modeSource: "global",
      forceLegacyEnabled,
      forceLegacySource,
      explicitMode: explicit,
      globalMode,
      queryMode,
      storageMode,
      defaultMode
    };
  }

  if (queryMode) {
    return {
      effectiveMode: queryMode,
      modeSource: "query",
      forceLegacyEnabled,
      forceLegacySource,
      explicitMode: explicit,
      globalMode,
      queryMode,
      storageMode,
      defaultMode
    };
  }

  if (storageMode) {
    return {
      effectiveMode: storageMode,
      modeSource: "storage",
      forceLegacyEnabled,
      forceLegacySource,
      explicitMode: explicit,
      globalMode,
      queryMode,
      storageMode,
      defaultMode
    };
  }

  if (defaultMode) {
    return {
      effectiveMode: defaultMode,
      modeSource: "default",
      forceLegacyEnabled,
      forceLegacySource,
      explicitMode: explicit,
      globalMode,
      queryMode,
      storageMode,
      defaultMode
    };
  }

  return {
    effectiveMode: "legacy-bridge",
    modeSource: "fallback",
    forceLegacyEnabled,
    forceLegacySource,
    explicitMode: explicit,
    globalMode,
    queryMode,
    storageMode,
    defaultMode
  };
}

export function resolveEngineAdapterMode(input: AdapterModeResolverInput): EngineAdapterMode {
  return resolveEngineAdapterModePolicy(input).effectiveMode;
}

export interface LegacyEnginePayloadLike {
  adapterMode?: EngineAdapterMode;
}

export function applyAdapterModeToPayload<T extends LegacyEnginePayloadLike>(
  payload: T,
  adapterMode: EngineAdapterMode
): T {
  payload.adapterMode = adapterMode;
  return payload;
}

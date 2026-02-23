export type EngineAdapterMode = "legacy-bridge" | "core-adapter";

export interface AdapterModeResolverInput {
  explicitMode?: string | null;
  globalMode?: string | null;
  queryMode?: string | null;
  storageMode?: string | null;
}

function normalizeAdapterMode(raw: string | null | undefined): EngineAdapterMode | null {
  if (raw === "core" || raw === "core-adapter") return "core-adapter";
  if (raw === "legacy" || raw === "legacy-bridge") return "legacy-bridge";
  return null;
}

export function resolveEngineAdapterMode(input: AdapterModeResolverInput): EngineAdapterMode {
  const explicit = normalizeAdapterMode(input.explicitMode);
  if (explicit) return explicit;

  const globalMode = normalizeAdapterMode(input.globalMode);
  if (globalMode) return globalMode;

  const queryMode = normalizeAdapterMode(input.queryMode);
  if (queryMode) return queryMode;

  const storageMode = normalizeAdapterMode(input.storageMode);
  if (storageMode) return storageMode;

  return "legacy-bridge";
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

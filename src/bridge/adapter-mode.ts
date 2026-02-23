export type EngineAdapterMode = "legacy-bridge" | "core-adapter";

export interface AdapterModeResolverInput {
  explicitMode?: string | null;
  forceLegacy?: boolean | number | string | null;
  globalMode?: string | null;
  queryMode?: string | null;
  storageMode?: string | null;
  defaultMode?: string | null;
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

export function resolveEngineAdapterMode(input: AdapterModeResolverInput): EngineAdapterMode {
  const explicit = normalizeAdapterMode(input.explicitMode);
  if (explicit) return explicit;

  const forceLegacy = normalizeForceLegacyFlag(input.forceLegacy);
  if (forceLegacy) return "legacy-bridge";

  const globalMode = normalizeAdapterMode(input.globalMode);
  if (globalMode) return globalMode;

  const queryMode = normalizeAdapterMode(input.queryMode);
  if (queryMode) return queryMode;

  const storageMode = normalizeAdapterMode(input.storageMode);
  if (storageMode) return storageMode;

  const defaultMode = normalizeAdapterMode(input.defaultMode);
  if (defaultMode) return defaultMode;

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

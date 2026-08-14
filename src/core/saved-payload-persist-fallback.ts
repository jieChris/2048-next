export interface SavedPayloadPersistFallbackInput {
  manager: unknown;
  key: string;
  liteKey: string;
  fullPayload?: unknown;
  litePayload: unknown;
}

export interface SavedPayloadPersistFallbackOperations {
  persistPayload: (manager: unknown, key: string, payload: unknown) => boolean;
  clearSavedState: (manager: unknown, modeKey: unknown) => void;
}

export interface SavedPayloadPersistFallbackResult {
  persisted: boolean;
  persistedFull: boolean;
}

export interface SavedPayloadPersistFallbackRuntime {
  persistSavedPayloadWithLiteFallback: typeof persistSavedPayloadWithLiteFallback;
}

export interface SavedPayloadPersistFallbackWindowLike {
  CoreSavedPayloadPersistFallbackRuntime?: SavedPayloadPersistFallbackRuntime;
}

export interface SavedPayloadPersistFallbackRuntimeInstallOptions {
  windowLike?: SavedPayloadPersistFallbackWindowLike | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveModeKey(manager: unknown): unknown {
  return isRecord(manager) ? manager.modeKey : undefined;
}

export function persistSavedPayloadWithLiteFallback(
  input: SavedPayloadPersistFallbackInput,
  operations: SavedPayloadPersistFallbackOperations
): SavedPayloadPersistFallbackResult {
  const hasFullPayload = isRecord(input.fullPayload);
  let persisted = false;
  let persistedFull = false;
  if (hasFullPayload) {
    persistedFull = operations.persistPayload(input.manager, input.key, input.fullPayload);
    persisted = persistedFull || operations.persistPayload(input.manager, input.key, input.litePayload);
  }
  let litePersisted = operations.persistPayload(input.manager, input.liteKey, input.litePayload);
  if (!(persisted || litePersisted)) {
    operations.clearSavedState(input.manager, resolveModeKey(input.manager));
    if (hasFullPayload) persisted = operations.persistPayload(input.manager, input.key, input.litePayload);
    litePersisted = operations.persistPayload(input.manager, input.liteKey, input.litePayload);
  }
  return {
    persisted: !!(persisted || litePersisted),
    persistedFull: !!persistedFull
  };
}

export function createSavedPayloadPersistFallbackRuntime(): SavedPayloadPersistFallbackRuntime {
  return {
    persistSavedPayloadWithLiteFallback
  };
}

export function installSavedPayloadPersistFallbackRuntime(
  options: SavedPayloadPersistFallbackRuntimeInstallOptions = {}
): SavedPayloadPersistFallbackRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SavedPayloadPersistFallbackWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSavedPayloadPersistFallbackRuntime) {
    target.CoreSavedPayloadPersistFallbackRuntime = createSavedPayloadPersistFallbackRuntime();
  }
  return target.CoreSavedPayloadPersistFallbackRuntime;
}

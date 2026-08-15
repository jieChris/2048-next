export interface SavedPayloadPersistFallbackInput {
  manager: unknown;
  key: string;
  liteKey: string;
  fullPayload?: unknown;
  litePayload: unknown;
}

export interface SavedPayloadPersistFallbackOperations {
  persistPayload: (manager: unknown, key: string, payload: unknown) => boolean;
  removePayload: (manager: unknown, key: string) => void;
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

export function persistSavedPayloadWithLiteFallback(
  input: SavedPayloadPersistFallbackInput,
  operations: SavedPayloadPersistFallbackOperations
): SavedPayloadPersistFallbackResult {
  const hasFullPayload = isRecord(input.fullPayload);
  if (hasFullPayload) {
    const persistedFull = operations.persistPayload(input.manager, input.key, input.fullPayload);
    if (persistedFull) {
      operations.removePayload(input.manager, input.liteKey);
      return { persisted: true, persistedFull: true };
    }
  }

  const litePersisted = operations.persistPayload(input.manager, input.liteKey, input.litePayload);
  return {
    persisted: !!litePersisted,
    persistedFull: false
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

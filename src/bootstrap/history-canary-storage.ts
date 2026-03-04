interface StorageLike {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

function asStorageLike(value: unknown): StorageLike | null {
  if (!value || typeof value !== "object") return null;
  return value as StorageLike;
}

function asKey(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function resolveGlobalStorageLike(): StorageLike | null {
  if (!globalThis || typeof globalThis !== "object") return null;
  const scope = globalThis as unknown as { localStorage?: unknown };
  return asStorageLike(scope.localStorage);
}

function resolveReadStorageInput(storageOrKey: unknown, keyMaybe?: unknown): {
  target: StorageLike;
  storageKey: string;
} | null {
  const explicitTarget = asStorageLike(storageOrKey);
  const explicitKey = asKey(keyMaybe);
  if (explicitTarget && explicitKey) {
    return { target: explicitTarget, storageKey: explicitKey };
  }

  const fallbackTarget = resolveGlobalStorageLike();
  const fallbackKey = asKey(storageOrKey);
  if (!fallbackTarget || !fallbackKey) return null;
  return { target: fallbackTarget, storageKey: fallbackKey };
}

function resolveWriteStorageInput(storageOrKey: unknown, keyOrValue: unknown, valueMaybe?: unknown): {
  target: StorageLike;
  storageKey: string;
  value: unknown;
} | null {
  const explicitTarget = asStorageLike(storageOrKey);
  const explicitKey = asKey(keyOrValue);
  if (explicitTarget && explicitKey) {
    return { target: explicitTarget, storageKey: explicitKey, value: valueMaybe };
  }

  const fallbackTarget = resolveGlobalStorageLike();
  const fallbackKey = asKey(storageOrKey);
  if (!fallbackTarget || !fallbackKey) return null;
  return { target: fallbackTarget, storageKey: fallbackKey, value: keyOrValue };
}

export function readHistoryStorageValue(storageOrKey: unknown, keyMaybe?: unknown): string | null {
  const resolved = resolveReadStorageInput(storageOrKey, keyMaybe);
  if (!resolved || typeof resolved.target.getItem !== "function") return null;
  try {
    return resolved.target.getItem(resolved.storageKey);
  } catch (_error) {
    return null;
  }
}

export function writeHistoryStorageValue(
  storageOrKey: unknown,
  keyOrValue: unknown,
  valueMaybe?: unknown
): boolean {
  const resolved = resolveWriteStorageInput(storageOrKey, keyOrValue, valueMaybe);
  if (!resolved) return false;

  try {
    if (resolved.value === null || resolved.value === undefined || resolved.value === "") {
      if (typeof resolved.target.removeItem !== "function") return false;
      resolved.target.removeItem(resolved.storageKey);
      return true;
    }
    if (typeof resolved.target.setItem !== "function") return false;
    resolved.target.setItem(resolved.storageKey, String(resolved.value));
    return true;
  } catch (_error) {
    return false;
  }
}

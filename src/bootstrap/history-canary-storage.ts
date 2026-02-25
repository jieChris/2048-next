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

export function readHistoryStorageValue(storage: unknown, key: unknown): string | null {
  const target = asStorageLike(storage);
  const storageKey = asKey(key);
  if (!target || !storageKey || typeof target.getItem !== "function") return null;
  try {
    return target.getItem(storageKey);
  } catch (_error) {
    return null;
  }
}

export function writeHistoryStorageValue(storage: unknown, key: unknown, value: unknown): boolean {
  const target = asStorageLike(storage);
  const storageKey = asKey(key);
  if (!target || !storageKey) return false;

  try {
    if (value === null || value === undefined || value === "") {
      if (typeof target.removeItem !== "function") return false;
      target.removeItem(storageKey);
      return true;
    }
    if (typeof target.setItem !== "function") return false;
    target.setItem(storageKey, String(value));
    return true;
  } catch (_error) {
    return false;
  }
}

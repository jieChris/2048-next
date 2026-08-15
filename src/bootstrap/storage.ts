interface WindowLike {
  [key: string]: unknown;
}

interface StorageLike {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): void;
}

export interface ResolveStorageByNameOptions {
  windowLike?: WindowLike | null | undefined;
  storageName?: string | null | undefined;
}

export interface SafeSetStorageItemOptions {
  storageLike?: StorageLike | null | undefined;
  key?: string | null | undefined;
  value?: string | null | undefined;
}

export interface SafeReadStorageItemOptions {
  storageLike?: StorageLike | null | undefined;
  key?: string | null | undefined;
}

export function resolveStorageByName(options: ResolveStorageByNameOptions): StorageLike | null {
  const opts = options || {};
  const host = opts.windowLike || null;
  const name = typeof opts.storageName === "string" ? opts.storageName : "";
  if (!host || !name) return null;
  try {
    const storage = host[name] as StorageLike | null | undefined;
    if (!storage) return null;
    if (typeof storage.getItem === "function" || typeof storage.setItem === "function") {
      return storage;
    }
    return null;
  } catch (_err) {
    return null;
  }
}

export function safeSetStorageItem(options: SafeSetStorageItemOptions): boolean {
  const opts = options || {};
  const storage = opts.storageLike || null;
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!storage || !key || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, typeof opts.value === "string" ? opts.value : String(opts.value || ""));
    return true;
  } catch (_err) {
    return false;
  }
}

export function safeReadStorageItem(options: SafeReadStorageItemOptions): string | null {
  const opts = options || {};
  const storage = opts.storageLike || null;
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!storage || !key || typeof storage.getItem !== "function") return null;
  try {
    return storage.getItem(key);
  } catch (_err) {
    return null;
  }
}

export type StorageName = "localStorage" | "sessionStorage";

export interface StorageHost {
  localStorage?: unknown;
  sessionStorage?: unknown;
}

export interface BrowserStorageAccessOptions {
  windowLike?: StorageHost | null | undefined;
}

export interface BrowserStorageAccess {
  local: () => Storage | null;
  session: () => Storage | null;
}

function isStorageLike(value: unknown): value is Storage {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Storage).getItem === "function" &&
    typeof (value as Storage).setItem === "function" &&
    typeof (value as Storage).removeItem === "function"
  );
}

export function resolveBrowserStorage(
  windowLike: StorageHost | null | undefined,
  storageName: StorageName
): Storage | null {
  if (!windowLike) return null;
  try {
    const storageLike = windowLike[storageName];
    return isStorageLike(storageLike) ? storageLike : null;
  } catch (_err) {
    return null;
  }
}

export function createBrowserStorageAccess(
  options: BrowserStorageAccessOptions = {}
): BrowserStorageAccess {
  const windowLike =
    options.windowLike || (typeof window !== "undefined" ? (window as unknown as StorageHost) : null);
  return {
    local: () => resolveBrowserStorage(windowLike, "localStorage"),
    session: () => resolveBrowserStorage(windowLike, "sessionStorage")
  };
}

export function readStorageValue(storageLike: Storage | null | undefined, key: string): string | null {
  if (!storageLike) return null;
  try {
    return storageLike.getItem(key);
  } catch (_err) {
    return null;
  }
}

export function writeStorageValue(
  storageLike: Storage | null | undefined,
  key: string,
  value: string
): boolean {
  if (!storageLike) return false;
  try {
    storageLike.setItem(key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

export function removeStorageValue(storageLike: Storage | null | undefined, key: string): boolean {
  if (!storageLike) return false;
  try {
    storageLike.removeItem(key);
    return true;
  } catch (_err) {
    return false;
  }
}

interface StorageLike {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): unknown;
}

interface WindowLike {
  localStorage?: StorageLike | null;
}

function resolveLocalStorage(windowLike: unknown): StorageLike | null {
  const win = windowLike as WindowLike | null | undefined;
  if (!win) return null;
  const storage = win.localStorage;
  if (!storage) return null;
  return storage;
}

export function readReplayGuideSeenFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
}): string | null {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return null;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const value = storage.getItem(key);
    return typeof value === "string" ? value : null;
  } catch (_err) {
    return null;
  }
}

export function shouldShowReplayGuideFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  seenValue?: unknown;
}): boolean {
  const opts = options || {};
  const seenValue = typeof opts.seenValue === "string" ? opts.seenValue : "true";
  const stored = readReplayGuideSeenFromContext({
    windowLike: opts.windowLike,
    key: opts.key
  });
  return stored !== seenValue;
}

export function markReplayGuideSeenFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  seenValue?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  const seenValue = typeof opts.seenValue === "string" ? opts.seenValue : "true";
  if (!key) return false;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, seenValue);
    return true;
  } catch (_err) {
    return false;
  }
}

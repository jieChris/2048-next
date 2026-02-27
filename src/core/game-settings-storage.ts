interface StorageLike {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): unknown;
}

interface WindowLike {
  localStorage?: StorageLike | null;
}

type TimerModuleViewMode = "timer" | "hidden";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveLocalStorage(windowLike: unknown): StorageLike | null {
  const win = windowLike as WindowLike | null | undefined;
  if (!win) return null;
  const storage = win.localStorage;
  if (!storage) return null;
  return storage;
}

export function readStorageFlagFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  trueValue?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  const trueValue = typeof opts.trueValue === "string" ? opts.trueValue : "1";
  if (!key) return false;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.getItem !== "function") return false;
  try {
    return storage.getItem(key) === trueValue;
  } catch (_err) {
    return false;
  }
}

export function writeStorageFlagFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  enabled?: unknown;
  trueValue?: unknown;
  falseValue?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  const trueValue = typeof opts.trueValue === "string" ? opts.trueValue : "1";
  const falseValue = typeof opts.falseValue === "string" ? opts.falseValue : "0";
  if (!key) return false;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.setItem !== "function") return false;
  const value = opts.enabled ? trueValue : falseValue;
  try {
    storage.setItem(key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

export function readStorageJsonMapFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
}): Record<string, unknown> {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return {};
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.getItem !== "function") return {};
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return isObjectRecord(parsed) ? parsed : {};
  } catch (_err) {
    return {};
  }
}

export function writeStorageJsonMapFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  map?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return false;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.setItem !== "function") return false;
  const map = isObjectRecord(opts.map) ? opts.map : {};
  try {
    storage.setItem(key, JSON.stringify(map));
    return true;
  } catch (_err) {
    return false;
  }
}

export function writeStorageJsonPayloadFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  payload?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return false;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    const serialized = JSON.stringify(opts.payload);
    if (typeof serialized !== "string") return false;
    storage.setItem(key, serialized);
    return true;
  } catch (_err) {
    return false;
  }
}

function normalizeTimerModuleViewModeFromUnknown(value: unknown): TimerModuleViewMode {
  return value === "hidden" ? "hidden" : "timer";
}

export function normalizeTimerModuleViewMode(value: unknown): TimerModuleViewMode {
  return normalizeTimerModuleViewModeFromUnknown(value);
}

export function readTimerModuleViewForModeFromMap(options: {
  map?: unknown;
  mode?: unknown;
}): TimerModuleViewMode {
  const opts = options || {};
  const map = isObjectRecord(opts.map) ? opts.map : {};
  const mode = typeof opts.mode === "string" ? opts.mode : "";
  if (!mode) return "timer";
  return normalizeTimerModuleViewModeFromUnknown(map[mode]);
}

export function writeTimerModuleViewForModeToMap(options: {
  map?: unknown;
  mode?: unknown;
  view?: unknown;
}): Record<string, unknown> {
  const opts = options || {};
  const map = isObjectRecord(opts.map) ? { ...opts.map } : {};
  const mode = typeof opts.mode === "string" ? opts.mode : "";
  if (!mode) return map;
  map[mode] = normalizeTimerModuleViewModeFromUnknown(opts.view);
  return map;
}

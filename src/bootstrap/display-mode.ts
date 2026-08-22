import { resolveStorageByName, safeReadStorageItem, safeSetStorageItem } from "./storage";

export const DISPLAY_MODE_STORAGE_KEY = "settings_display_mode_v2";
export const LEGACY_NIGHT_BACKGROUND_STORAGE_KEY = "settings_night_background_enabled_v1";

export type DisplayMode = "auto" | "day" | "night";

interface WindowLike {
  matchMedia?: (query: string) => {
    matches?: boolean;
    addEventListener?: (type: string, listener: (event?: unknown) => void) => void;
    addListener?: (listener: (event?: unknown) => void) => void;
  };
  addEventListener?: (type: string, listener: (event?: unknown) => void) => void;
}

interface DocumentLike {
  documentElement?: {
    setAttribute?: (name: string, value: string) => void;
    removeAttribute?: (name: string) => void;
  } | null;
}

function normalizeDisplayMode(value: unknown): DisplayMode | "" {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "auto" || mode === "day" || mode === "night") return mode;
  return "";
}

function resolveWindowLike(windowLike?: WindowLike | null): WindowLike | null {
  if (windowLike) return windowLike;
  return typeof window !== "undefined" ? (window as unknown as WindowLike) : null;
}

function resolveLocalStorage(windowLike: WindowLike | null) {
  if (!windowLike) return null;
  return resolveStorageByName({
    windowLike: windowLike as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
}

/** Reads v2 and performs the one-time legacy boolean migration. */
export function readDisplayModePreference(windowLike?: WindowLike | null): DisplayMode {
  const host = resolveWindowLike(windowLike);
  const storageLike = resolveLocalStorage(host);
  const current = normalizeDisplayMode(
    safeReadStorageItem({ storageLike, key: DISPLAY_MODE_STORAGE_KEY })
  );
  if (current) return current;

  const legacy = safeReadStorageItem({
    storageLike,
    key: LEGACY_NIGHT_BACKGROUND_STORAGE_KEY
  });
  const migrated: DisplayMode = legacy === "1" ? "night" : legacy === "0" ? "day" : "auto";
  if (legacy === "1" || legacy === "0") {
    safeSetStorageItem({ storageLike, key: DISPLAY_MODE_STORAGE_KEY, value: migrated });
  }
  return migrated;
}

export function resolveDisplayMode(windowLike?: WindowLike | null): {
  mode: DisplayMode;
  isNight: boolean;
} {
  const host = resolveWindowLike(windowLike);
  const mode = readDisplayModePreference(host);
  if (mode !== "auto") return { mode, isNight: mode === "night" };
  let prefersDark = false;
  try {
    prefersDark = !!host?.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  } catch (_err) {}
  return { mode, isNight: prefersDark };
}

export function syncDisplayModeAttributes(
  documentLike?: DocumentLike | null,
  windowLike?: WindowLike | null
): { mode: DisplayMode; isNight: boolean } {
  const doc = documentLike || (typeof document !== "undefined" ? (document as unknown as DocumentLike) : null);
  const resolved = resolveDisplayMode(windowLike);
  const root = doc?.documentElement;
  if (root) {
    root.setAttribute?.("data-display-mode", resolved.mode);
    if (resolved.isNight) root.setAttribute?.("data-night-background", "1");
    else root.removeAttribute?.("data-night-background");
  }
  return resolved;
}

export function bindDisplayModeSync(options?: {
  documentLike?: DocumentLike | null;
  windowLike?: WindowLike | null;
  onChange?: (resolved: { mode: DisplayMode; isNight: boolean }) => void;
}): () => void {
  const opts = options || {};
  const host = resolveWindowLike(opts.windowLike);
  const sync = () => {
    const resolved = syncDisplayModeAttributes(opts.documentLike, host);
    opts.onChange?.(resolved);
  };
  sync();
  const listener = () => sync();
  host?.addEventListener?.("storage", listener);
  const media = host?.matchMedia?.("(prefers-color-scheme: dark)");
  if (media?.addEventListener) media.addEventListener("change", listener);
  else media?.addListener?.(listener);
  return () => {
    // Page bootstraps are short-lived; no-op cleanup keeps this helper safe for callers
    // whose test doubles do not implement removeEventListener.
  };
}

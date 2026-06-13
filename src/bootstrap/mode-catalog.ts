export interface ModeCatalogLike {
  getMode?: ((key: string) => unknown) | null | undefined;
}

export function resolveCatalogModeWithDefault(
  catalog: ModeCatalogLike | null | undefined,
  modeKey: string | null | undefined,
  defaultModeKey: string
): Record<string, unknown> | null {
  if (!catalog || typeof catalog.getMode !== "function") return null;
  const key = modeKey && String(modeKey).trim() ? String(modeKey).trim() : defaultModeKey;
  return (
    (catalog.getMode(key) as Record<string, unknown> | null) ||
    (catalog.getMode(defaultModeKey) as Record<string, unknown> | null) ||
    null
  );
}

export interface ModeCatalogRuntime {
  resolveCatalogModeWithDefault: typeof resolveCatalogModeWithDefault;
}

export interface ModeCatalogRuntimeWindowLike {
  CoreModeCatalogRuntime?: ModeCatalogRuntime;
}

export interface ModeCatalogRuntimeInstallOptions {
  windowLike?: ModeCatalogRuntimeWindowLike | null | undefined;
}

export function createModeCatalogRuntime(): ModeCatalogRuntime {
  return {
    resolveCatalogModeWithDefault
  };
}

export function installModeCatalogRuntime(
  options: ModeCatalogRuntimeInstallOptions = {}
): ModeCatalogRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ModeCatalogRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreModeCatalogRuntime) {
    windowLike.CoreModeCatalogRuntime = createModeCatalogRuntime();
  }
  return windowLike.CoreModeCatalogRuntime || null;
}

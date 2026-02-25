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

export const PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY = "custom_spawn_4x4_four_rate_v1";

export interface PlayCustomSpawnHostWindowLike {
  prompt?: ((message?: string, defaultValue?: string) => string | null) | null | undefined;
  alert?: ((message?: string) => void) | null | undefined;
  history?: {
    replaceState?: ((data: unknown, unused: string, url?: string | URL | null) => void) | null | undefined;
  } | null | undefined;
}

export interface PlayCustomSpawnHostStorageRuntimeLike {
  resolveStorageByName: (options: {
    windowLike: unknown;
    storageName: string;
  }) => unknown;
  safeReadStorageItem: (options: {
    storageLike: unknown;
    key: string;
  }) => string | null;
  safeSetStorageItem: (options: {
    storageLike: unknown;
    key: string;
    value: string;
  }) => void;
}

export interface PlayCustomSpawnHostRuntimeLike {
  resolvePlayCustomSpawnModeConfig: (options: {
    modeKey: string;
    modeConfig: unknown;
    searchLike: string;
    pathname: string;
    hash: string;
    readStoredRate: () => string | null;
    writeStoredRate: (rateText: string) => void;
    promptRate: (defaultValueText: string) => string | null;
    alertInvalidInput: () => void;
    replaceUrl: (nextUrl: string) => void;
  }) => {
    modeConfig: unknown;
  } | null;
}

export interface ResolvePlayCustomSpawnModeConfigFromContextOptions {
  modeKey: string;
  modeConfig: unknown;
  searchLike: string;
  pathname: string;
  hash?: string | null | undefined;
  storageKey?: string | null | undefined;
  windowLike?: PlayCustomSpawnHostWindowLike | null | undefined;
  storageRuntimeLike: PlayCustomSpawnHostStorageRuntimeLike;
  playCustomSpawnRuntimeLike: PlayCustomSpawnHostRuntimeLike;
}

export function resolvePlayCustomSpawnModeConfigFromContext(
  options: ResolvePlayCustomSpawnModeConfigFromContextOptions
): unknown {
  const opts = options;
  const storageRuntime = opts.storageRuntimeLike;
  const playCustomSpawnRuntime = opts.playCustomSpawnRuntimeLike;
  const windowLike = opts.windowLike || null;
  const storageKey = String(opts.storageKey || PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY);

  function resolveLocalStorage(): unknown {
    return storageRuntime.resolveStorageByName({
      windowLike,
      storageName: "localStorage"
    });
  }

  const result = playCustomSpawnRuntime.resolvePlayCustomSpawnModeConfig({
    modeKey: String(opts.modeKey || ""),
    modeConfig: opts.modeConfig,
    searchLike: String(opts.searchLike || ""),
    pathname: String(opts.pathname || ""),
    hash: String(opts.hash || ""),
    readStoredRate: () =>
      storageRuntime.safeReadStorageItem({
        storageLike: resolveLocalStorage(),
        key: storageKey
      }),
    writeStoredRate: (rateText) =>
      storageRuntime.safeSetStorageItem({
        storageLike: resolveLocalStorage(),
        key: storageKey,
        value: String(rateText)
      }),
    promptRate: (defaultValueText) => {
      if (windowLike && typeof windowLike.prompt === "function") {
        return windowLike.prompt("请输入 4 率（0-100，可输入小数）", String(defaultValueText));
      }
      return null;
    },
    alertInvalidInput: () => {
      if (windowLike && typeof windowLike.alert === "function") {
        windowLike.alert("输入无效，请输入 0 到 100 的数字。");
      }
    },
    replaceUrl: (nextUrl) => {
      if (
        windowLike &&
        windowLike.history &&
        typeof windowLike.history.replaceState === "function"
      ) {
        try {
          windowLike.history.replaceState(null, "", nextUrl);
        } catch (_err) {}
      }
    }
  });

  return result && "modeConfig" in result ? result.modeConfig : null;
}

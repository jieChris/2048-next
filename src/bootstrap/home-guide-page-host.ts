function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveStorageByName(input: {
  storageRuntime?: unknown;
  windowLike?: unknown;
  storageName?: unknown;
}): unknown {
  const source = toRecord(input);
  const storageRuntime = toRecord(source.storageRuntime);
  const resolveStorage = asFunction<(payload: unknown) => unknown>(
    storageRuntime.resolveStorageByName
  );
  if (!resolveStorage) return null;
  return resolveStorage({
    windowLike: source.windowLike || null,
    storageName: source.storageName
  });
}

export interface HomeGuideSettingsPageInitResult {
  hasApplySettingsUiApi: boolean;
  didApply: boolean;
}

export function applyHomeGuideSettingsPageInit(input: {
  homeGuideSettingsHostRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  isHomePage?: unknown;
  closeSettingsModal?: unknown;
  startHomeGuide?: unknown;
}): HomeGuideSettingsPageInitResult {
  const source = toRecord(input);
  const hostRuntime = toRecord(source.homeGuideSettingsHostRuntime);
  const applySettingsUi = asFunction<(payload: unknown) => unknown>(
    hostRuntime.applyHomeGuideSettingsUi
  );
  if (!applySettingsUi) {
    return {
      hasApplySettingsUiApi: false,
      didApply: false
    };
  }

  applySettingsUi({
    documentLike: source.documentLike,
    windowLike: source.windowLike,
    homeGuideRuntime: source.homeGuideRuntime,
    homeGuideState: source.homeGuideState,
    isHomePage: source.isHomePage,
    closeSettingsModal: source.closeSettingsModal,
    startHomeGuide: source.startHomeGuide
  });

  return {
    hasApplySettingsUiApi: true,
    didApply: true
  };
}

export interface HomeGuideAutoStartPageResult {
  hasApplyAutoStartApi: boolean;
  didApply: boolean;
}

export interface HomeGuideAutoStartPageFromContextResult {
  didInvokePageAutoStart: boolean;
  localStorageResolved: boolean;
  pageResult: HomeGuideAutoStartPageResult;
}

export function applyHomeGuideAutoStartPage(input: {
  homeGuideStartupHostRuntime?: unknown;
  homeGuideRuntime?: unknown;
  locationLike?: unknown;
  storageLike?: unknown;
  seenKey?: unknown;
  startHomeGuide?: unknown;
  setTimeoutLike?: unknown;
  delayMs?: unknown;
}): HomeGuideAutoStartPageResult {
  const source = toRecord(input);
  const startupHostRuntime = toRecord(source.homeGuideStartupHostRuntime);
  const applyAutoStart = asFunction<(payload: unknown) => unknown>(
    startupHostRuntime.applyHomeGuideAutoStart
  );
  if (!applyAutoStart) {
    return {
      hasApplyAutoStartApi: false,
      didApply: false
    };
  }

  applyAutoStart({
    homeGuideRuntime: source.homeGuideRuntime,
    locationLike: source.locationLike,
    storageLike: source.storageLike,
    seenKey: source.seenKey,
    startHomeGuide: source.startHomeGuide,
    setTimeoutLike: source.setTimeoutLike,
    delayMs: source.delayMs
  });

  return {
    hasApplyAutoStartApi: true,
    didApply: true
  };
}

export function applyHomeGuideAutoStartPageFromContext(input: {
  homeGuideStartupHostRuntime?: unknown;
  homeGuideRuntime?: unknown;
  locationLike?: unknown;
  storageRuntime?: unknown;
  windowLike?: unknown;
  seenKey?: unknown;
  startHomeGuide?: unknown;
  setTimeoutLike?: unknown;
  delayMs?: unknown;
}): HomeGuideAutoStartPageFromContextResult {
  const source = toRecord(input);
  const storageLike = resolveStorageByName({
    storageRuntime: source.storageRuntime,
    windowLike: source.windowLike || null,
    storageName: "localStorage"
  });
  const pageResult = applyHomeGuideAutoStartPage({
    homeGuideStartupHostRuntime: source.homeGuideStartupHostRuntime,
    homeGuideRuntime: source.homeGuideRuntime,
    locationLike: source.locationLike,
    storageLike,
    seenKey: source.seenKey,
    startHomeGuide: source.startHomeGuide,
    setTimeoutLike: source.setTimeoutLike,
    delayMs: source.delayMs
  });

  return {
    didInvokePageAutoStart: pageResult.didApply,
    localStorageResolved: !!storageLike,
    pageResult
  };
}

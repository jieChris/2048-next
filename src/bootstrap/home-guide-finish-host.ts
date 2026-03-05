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

function resolveBoolean(value: unknown): boolean {
  return !!value;
}

function resolveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function resolveDisplayValue(value: unknown): string {
  if (value == null) return "none";
  return String(value);
}

function setDisplay(node: unknown, display: string): void {
  const style = toRecord(toRecord(node).style);
  style.display = display;
}

function getElementById(documentLike: unknown, id: string): unknown {
  const getter = asFunction<(value: string) => unknown>(toRecord(documentLike).getElementById);
  if (!getter) return null;
  return (getter as unknown as Function).call(documentLike, id);
}

export interface HomeGuideFinishHostResult {
  didFinish: boolean;
  markedSeen: boolean;
  syncedSettings: boolean;
  showedDoneNotice: boolean;
}

export interface HomeGuideFinishHostContextResult {
  didInvokeFinish: boolean;
  localStorageResolved: boolean;
  finishResult: HomeGuideFinishHostResult;
}

export function applyHomeGuideFinish(input: {
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  markSeen?: unknown;
  options?: unknown;
  clearHomeGuideHighlight?: unknown;
  documentLike?: unknown;
  storageLike?: unknown;
  seenKey?: unknown;
  syncHomeGuideSettingsUI?: unknown;
  showHomeGuideDoneNotice?: unknown;
}): HomeGuideFinishHostResult {
  const source = toRecord(input);
  const homeGuideRuntime = toRecord(source.homeGuideRuntime);

  const resolveLifecycleState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideLifecycleState
  );
  const resolveSessionState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideSessionState
  );
  const resolveLayerDisplayState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideLayerDisplayState
  );

  if (!resolveLifecycleState || !resolveSessionState || !resolveLayerDisplayState) {
    return {
      didFinish: false,
      markedSeen: false,
      syncedSettings: false,
      showedDoneNotice: false
    };
  }

  const clearHomeGuideHighlight = asFunction<() => unknown>(source.clearHomeGuideHighlight);
  if (clearHomeGuideHighlight) {
    clearHomeGuideHighlight();
  }

  const homeGuideState = toRecord(source.homeGuideState);

  const lifecycleState = toRecord(
    resolveLifecycleState({
      action: "finish"
    })
  );

  const sessionState = toRecord(
    resolveSessionState({
      lifecycleState
    })
  );

  homeGuideState.active = resolveBoolean(sessionState.active);
  homeGuideState.steps = Array.isArray(sessionState.steps) ? sessionState.steps : [];
  homeGuideState.index = resolveNumber(sessionState.index, 0);
  homeGuideState.fromSettings = resolveBoolean(sessionState.fromSettings);

  const layerDisplayState = toRecord(
    resolveLayerDisplayState({
      active: resolveBoolean(homeGuideState.active)
    })
  );

  if (homeGuideState.overlay) {
    setDisplay(homeGuideState.overlay, resolveDisplayValue(layerDisplayState.overlayDisplay));
  }
  if (homeGuideState.panel) {
    setDisplay(homeGuideState.panel, resolveDisplayValue(layerDisplayState.panelDisplay));
  }
  const banner = getElementById(source.documentLike, "home-guide-message-banner");
  if (banner) {
    setDisplay(banner, "none");
  }

  const markSeen = resolveBoolean(source.markSeen);
  let markedSeen = false;
  const markHomeGuideSeen = asFunction<(payload: unknown) => unknown>(homeGuideRuntime.markHomeGuideSeen);
  if (markSeen && markHomeGuideSeen) {
    markHomeGuideSeen({
      storageLike: source.storageLike || null,
      seenKey: source.seenKey
    });
    markedSeen = true;
  }

  const syncHomeGuideSettingsUI = asFunction<() => unknown>(source.syncHomeGuideSettingsUI);
  let syncedSettings = false;
  if (syncHomeGuideSettingsUI) {
    syncHomeGuideSettingsUI();
    syncedSettings = true;
  }

  const options = toRecord(source.options);
  const showHomeGuideDoneNotice = asFunction<() => unknown>(source.showHomeGuideDoneNotice);
  let showedDoneNotice = false;
  if (resolveBoolean(options.showDoneNotice) && showHomeGuideDoneNotice) {
    showHomeGuideDoneNotice();
    showedDoneNotice = true;
  }

  return {
    didFinish: true,
    markedSeen,
    syncedSettings,
    showedDoneNotice
  };
}

export function applyHomeGuideFinishFromContext(input: {
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  markSeen?: unknown;
  options?: unknown;
  clearHomeGuideHighlight?: unknown;
  documentLike?: unknown;
  storageRuntime?: unknown;
  windowLike?: unknown;
  seenKey?: unknown;
  syncHomeGuideSettingsUI?: unknown;
  showHomeGuideDoneNotice?: unknown;
}): HomeGuideFinishHostContextResult {
  const source = toRecord(input);
  const storageLike = resolveStorageByName({
    storageRuntime: source.storageRuntime,
    windowLike: source.windowLike || null,
    storageName: "localStorage"
  });
  const finishResult = applyHomeGuideFinish({
    homeGuideRuntime: source.homeGuideRuntime,
    homeGuideState: source.homeGuideState,
    markSeen: source.markSeen,
    options: source.options,
    clearHomeGuideHighlight: source.clearHomeGuideHighlight,
    documentLike: source.documentLike,
    storageLike,
    seenKey: source.seenKey,
    syncHomeGuideSettingsUI: source.syncHomeGuideSettingsUI,
    showHomeGuideDoneNotice: source.showHomeGuideDoneNotice
  });

  return {
    didInvokeFinish: finishResult.didFinish,
    localStorageResolved: !!storageLike,
    finishResult
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolvePositiveNumber(value: unknown, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
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

export interface HomeGuideLifecycleResolvers {
  initHomeGuideSettingsUI: () => unknown;
  autoStartHomeGuideIfNeeded: () => unknown;
}

export function createHomeGuideLifecycleResolvers(input: {
  homeGuidePageHostRuntime?: unknown;
  homeGuideSettingsHostRuntime?: unknown;
  homeGuideStartupHostRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  locationLike?: unknown;
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  isHomePage?: unknown;
  closeSettingsModal?: unknown;
  resolveCloseSettingsModal?: unknown;
  startHomeGuide?: unknown;
  storageRuntime?: unknown;
  seenKey?: unknown;
  setTimeoutLike?: unknown;
  autoStartDelayMs?: unknown;
}): HomeGuideLifecycleResolvers {
  const source = toRecord(input);
  const pageHostRuntime = toRecord(source.homeGuidePageHostRuntime);
  const windowLike = source.windowLike || null;
  const locationLike = source.locationLike || toRecord(windowLike).location || null;
  const autoStartDelayMs = resolvePositiveNumber(source.autoStartDelayMs, 260);

  function resolveCloseSettingsModal(): (() => unknown) | null {
    const direct = asFunction<() => unknown>(source.closeSettingsModal);
    if (direct) return direct;

    const resolver = asFunction<() => unknown>(source.resolveCloseSettingsModal);
    if (resolver) {
      const resolved = resolver();
      const callback = asFunction<() => unknown>(resolved);
      if (callback) return callback;
    }

    const closeFromWindow = asFunction<() => unknown>(toRecord(windowLike).closeSettingsModal);
    if (!closeFromWindow) return null;
    return function (): unknown {
      return closeFromWindow.call(windowLike);
    };
  }

  function initHomeGuideSettingsUI(): unknown {
    const applySettingsPageInit = asFunction<(payload: unknown) => unknown>(
      pageHostRuntime.applyHomeGuideSettingsPageInit
    );
    if (applySettingsPageInit) {
      return applySettingsPageInit({
        homeGuideSettingsHostRuntime: source.homeGuideSettingsHostRuntime,
        documentLike: source.documentLike,
        windowLike,
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState: source.homeGuideState,
        isHomePage: source.isHomePage,
        closeSettingsModal: resolveCloseSettingsModal(),
        startHomeGuide: source.startHomeGuide
      });
    }
    return applyHomeGuideSettingsPageInit({
      homeGuideSettingsHostRuntime: source.homeGuideSettingsHostRuntime,
      documentLike: source.documentLike,
      windowLike,
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState: source.homeGuideState,
      isHomePage: source.isHomePage,
      closeSettingsModal: resolveCloseSettingsModal(),
      startHomeGuide: source.startHomeGuide
    });
  }

  function autoStartHomeGuideIfNeeded(): unknown {
    const applyAutoStartPageFromContext = asFunction<(payload: unknown) => unknown>(
      pageHostRuntime.applyHomeGuideAutoStartPageFromContext
    );
    if (applyAutoStartPageFromContext) {
      return applyAutoStartPageFromContext({
        homeGuideStartupHostRuntime: source.homeGuideStartupHostRuntime,
        homeGuideRuntime: source.homeGuideRuntime,
        locationLike,
        storageRuntime: source.storageRuntime,
        windowLike,
        seenKey: source.seenKey,
        startHomeGuide: source.startHomeGuide,
        setTimeoutLike: source.setTimeoutLike,
        delayMs: autoStartDelayMs
      });
    }
    return applyHomeGuideAutoStartPageFromContext({
      homeGuideStartupHostRuntime: source.homeGuideStartupHostRuntime,
      homeGuideRuntime: source.homeGuideRuntime,
      locationLike,
      storageRuntime: source.storageRuntime,
      windowLike,
      seenKey: source.seenKey,
      startHomeGuide: source.startHomeGuide,
      setTimeoutLike: source.setTimeoutLike,
      delayMs: autoStartDelayMs
    });
  }

  return {
    initHomeGuideSettingsUI,
    autoStartHomeGuideIfNeeded
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

export interface HomeGuidePageResolvers {
  isHomePage: () => boolean;
  getHomeGuideSteps: () => unknown;
  ensureHomeGuideDom: () => unknown;
  clearHomeGuideHighlight: () => unknown;
  elevateHomeGuideTarget: (target?: unknown) => unknown;
  positionHomeGuidePanel: () => unknown;
  isElementVisibleForGuide: (node?: unknown) => boolean;
  showHomeGuideDoneNotice: () => unknown;
  finishHomeGuide: (markSeen?: unknown, options?: unknown) => unknown;
  showHomeGuideStep: (index?: unknown) => unknown;
  startHomeGuide: (options?: unknown) => unknown;
}

export function createHomeGuidePageResolvers(input: {
  homeGuideRuntime?: unknown;
  locationLike?: unknown;
  isCompactViewport?: unknown;
  homeGuideDomHostRuntime?: unknown;
  homeGuideHighlightHostRuntime?: unknown;
  homeGuidePanelHostRuntime?: unknown;
  homeGuideDoneNoticeHostRuntime?: unknown;
  mobileViewportRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  homeGuideState?: unknown;
  mobileUiMaxWidth?: unknown;
  panelMargin?: unknown;
  defaultPanelHeight?: unknown;
  setTimeoutLike?: unknown;
  clearTimeoutLike?: unknown;
  homeGuideFinishHostRuntime?: unknown;
  homeGuideStepHostRuntime?: unknown;
  homeGuideStepFlowHostRuntime?: unknown;
  homeGuideStepViewHostRuntime?: unknown;
  homeGuideStartHostRuntime?: unknown;
  homeGuideControlsHostRuntime?: unknown;
  storageRuntime?: unknown;
  seenKey?: unknown;
  maxAdvanceLoops?: unknown;
  syncHomeGuideSettingsUI?: unknown;
  resolveSyncHomeGuideSettingsUI?: unknown;
}): HomeGuidePageResolvers {
  const source = toRecord(input);
  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const resolvePathname = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuidePathname
  );
  const isHomePagePath = asFunction<(path: unknown) => unknown>(
    homeGuideRuntime.isHomePagePath
  );
  const buildSteps = asFunction<(payload: unknown) => unknown>(homeGuideRuntime.buildHomeGuideSteps);
  const resolveCompactViewport = asFunction<() => boolean>(source.isCompactViewport);
  const locationLike = source.locationLike || null;
  const documentLike = source.documentLike || null;
  const windowLike = source.windowLike || null;
  const homeGuideState = source.homeGuideState || null;
  const mobileUiMaxWidth =
    typeof source.mobileUiMaxWidth === "number" && Number.isFinite(source.mobileUiMaxWidth)
      ? source.mobileUiMaxWidth
      : 760;
  const panelMargin =
    typeof source.panelMargin === "number" && Number.isFinite(source.panelMargin)
      ? source.panelMargin
      : 12;
  const defaultPanelHeight =
    typeof source.defaultPanelHeight === "number" && Number.isFinite(source.defaultPanelHeight)
      ? source.defaultPanelHeight
      : 160;

  const domHostRuntime = toRecord(source.homeGuideDomHostRuntime);
  const highlightHostRuntime = toRecord(source.homeGuideHighlightHostRuntime);
  const panelHostRuntime = toRecord(source.homeGuidePanelHostRuntime);
  const doneNoticeHostRuntime = toRecord(source.homeGuideDoneNoticeHostRuntime);

  const applyHomeGuideDomEnsure = asFunction<(payload: unknown) => unknown>(
    domHostRuntime.applyHomeGuideDomEnsure
  );
  const applyHomeGuideHighlightClear = asFunction<(payload: unknown) => unknown>(
    highlightHostRuntime.applyHomeGuideHighlightClear
  );
  const applyHomeGuideTargetElevation = asFunction<(payload: unknown) => unknown>(
    highlightHostRuntime.applyHomeGuideTargetElevation
  );
  const applyHomeGuidePanelPosition = asFunction<(payload: unknown) => unknown>(
    panelHostRuntime.applyHomeGuidePanelPosition
  );
  const resolveHomeGuideTargetVisibility = asFunction<(payload: unknown) => unknown>(
    panelHostRuntime.resolveHomeGuideTargetVisibility
  );
  const applyHomeGuideDoneNotice = asFunction<(payload: unknown) => unknown>(
    doneNoticeHostRuntime.applyHomeGuideDoneNotice
  );
  const finishHostRuntime = toRecord(source.homeGuideFinishHostRuntime);
  const stepHostRuntime = toRecord(source.homeGuideStepHostRuntime);
  const startHostRuntime = toRecord(source.homeGuideStartHostRuntime);
  const controlsHostRuntime = toRecord(source.homeGuideControlsHostRuntime);

  const applyHomeGuideFinishFromContext = asFunction<(payload: unknown) => unknown>(
    finishHostRuntime.applyHomeGuideFinishFromContext
  );
  const applyHomeGuideStepOrchestration = asFunction<(payload: unknown) => unknown>(
    stepHostRuntime.applyHomeGuideStepOrchestration
  );
  const applyHomeGuideStart = asFunction<(payload: unknown) => unknown>(
    startHostRuntime.applyHomeGuideStart
  );
  const applyHomeGuideControls = asFunction<(payload: unknown) => unknown>(
    controlsHostRuntime.applyHomeGuideControls
  );

  function resolveSyncHomeGuideSettingsUI(): (() => unknown) | null {
    const direct = asFunction<() => unknown>(source.syncHomeGuideSettingsUI);
    if (direct) return direct;
    const resolver = asFunction<() => unknown>(source.resolveSyncHomeGuideSettingsUI);
    if (resolver) {
      const resolved = resolver();
      return asFunction<() => unknown>(resolved);
    }
    const syncFromWindow = asFunction<() => unknown>(toRecord(windowLike).syncHomeGuideSettingsUI);
    if (!syncFromWindow) return null;
    return function (): unknown {
      return syncFromWindow.call(windowLike);
    };
  }

  function ensureHomeGuideDom(): unknown {
    if (!applyHomeGuideDomEnsure) return null;
    return applyHomeGuideDomEnsure({
      documentLike,
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState
    });
  }

  function clearHomeGuideHighlight(): unknown {
    if (!applyHomeGuideHighlightClear) return null;
    return applyHomeGuideHighlightClear({
      documentLike,
      homeGuideState
    });
  }

  function elevateHomeGuideTarget(target?: unknown): unknown {
    if (!applyHomeGuideTargetElevation) return null;
    return applyHomeGuideTargetElevation({
      target: target || null,
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState
    });
  }

  function positionHomeGuidePanel(): unknown {
    if (!applyHomeGuidePanelPosition) return null;
    return applyHomeGuidePanelPosition({
      homeGuideState,
      homeGuideRuntime: source.homeGuideRuntime,
      mobileViewportRuntime: source.mobileViewportRuntime,
      windowLike,
      mobileUiMaxWidth,
      margin: panelMargin,
      defaultPanelHeight
    });
  }

  function isElementVisibleForGuide(node?: unknown): boolean {
    if (!resolveHomeGuideTargetVisibility) return false;
    return !!resolveHomeGuideTargetVisibility({
      homeGuideRuntime: source.homeGuideRuntime,
      windowLike,
      node: node || null
    });
  }

  function showHomeGuideDoneNotice(): unknown {
    if (!applyHomeGuideDoneNotice) return null;
    return applyHomeGuideDoneNotice({
      documentLike,
      homeGuideRuntime: source.homeGuideRuntime,
      setTimeoutLike: source.setTimeoutLike,
      clearTimeoutLike: source.clearTimeoutLike
    });
  }

  function finishHomeGuide(markSeen?: unknown, options?: unknown): unknown {
    if (!applyHomeGuideFinishFromContext) return null;
    return applyHomeGuideFinishFromContext({
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState,
      markSeen,
      options: options || {},
      clearHomeGuideHighlight,
      documentLike,
      storageRuntime: source.storageRuntime,
      windowLike,
      seenKey: source.seenKey,
      syncHomeGuideSettingsUI: resolveSyncHomeGuideSettingsUI(),
      showHomeGuideDoneNotice
    });
  }

  function showHomeGuideStep(index?: unknown): unknown {
    if (!applyHomeGuideStepOrchestration) return null;
    const orchestrationResult = toRecord(
      applyHomeGuideStepOrchestration({
        index,
        maxAdvanceLoops: source.maxAdvanceLoops,
        stepFlowHostRuntime: source.homeGuideStepFlowHostRuntime,
        stepViewHostRuntime: source.homeGuideStepViewHostRuntime,
        documentLike,
        windowLike,
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState,
        mobileViewportRuntime: source.mobileViewportRuntime,
        mobileUiMaxWidth,
        isElementVisibleForGuide,
        clearHomeGuideHighlight,
        elevateHomeGuideTarget,
        finishHomeGuide,
        positionHomeGuidePanel
      })
    );
    if (!!orchestrationResult.didAbort || !!orchestrationResult.didHitAdvanceLimit) {
      finishHomeGuide(false, { showDoneNotice: false });
    }
    return orchestrationResult;
  }

  function startHomeGuide(options?: unknown): unknown {
    if (!applyHomeGuideStart) return null;
    const startResult = toRecord(
      applyHomeGuideStart({
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState,
        options: options || {},
        isHomePage,
        documentLike,
        getHomeGuideSteps,
        ensureHomeGuideDom
      })
    );
    if (!startResult.didStart) return startResult;
    if (applyHomeGuideControls) {
      applyHomeGuideControls({
        documentLike,
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState,
        showHomeGuideStep,
        finishHomeGuide,
        syncHomeGuideSettingsUI: resolveSyncHomeGuideSettingsUI()
      });
    }
    return startResult;
  }

  function isHomePage(): boolean {
    if (!resolvePathname || !isHomePagePath) return false;
    const path = resolvePathname({ locationLike });
    return !!isHomePagePath(path);
  }

  function getHomeGuideSteps(): unknown {
    if (!buildSteps) return [];
    return buildSteps({
      isCompactViewport: resolveCompactViewport ? !!resolveCompactViewport() : false
    });
  }

  return {
    isHomePage,
    getHomeGuideSteps,
    ensureHomeGuideDom,
    clearHomeGuideHighlight,
    elevateHomeGuideTarget,
    positionHomeGuidePanel,
    isElementVisibleForGuide,
    showHomeGuideDoneNotice,
    finishHomeGuide,
    showHomeGuideStep,
    startHomeGuide
  };
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

type AnyRecord = Record<string, unknown>;

type IdResolver = (id: string) => unknown;
type ApplyResolver = (payload: unknown) => unknown;

export interface MobileTimerboxPageResolverOptions {
  mobileTimerboxHostRuntime?: unknown;
  mobileTimerboxRuntime?: unknown;
  responsiveRelayoutHostRuntime?: unknown;
  responsiveRelayoutRuntime?: unknown;
  isTimerboxMobileScope?: unknown;
  isTimerboxCollapseViewport?: unknown;
  getElementById?: unknown;
  documentLike?: unknown;
  storageRuntime?: unknown;
  windowLike?: unknown;
  storageKey?: unknown;
  hiddenClassName?: unknown;
  expandedClassName?: unknown;
  defaultCollapsed?: unknown;
  fallbackHiddenToggleDisplay?: unknown;
  fallbackVisibleToggleDisplay?: unknown;
  fallbackHiddenAriaExpanded?: unknown;
  fallbackExpandLabel?: unknown;
  fallbackCollapseLabel?: unknown;
  syncMobileHintUI?: unknown;
  requestResponsiveGameRelayout?: unknown;
  syncMobileTopActionsPlacement?: unknown;
  syncPracticeTopActionsPlacement?: unknown;
  syncMobileUndoTopButtonAvailability?: unknown;
  relayoutDelayMs?: unknown;
  clearTimeoutLike?: unknown;
  setTimeoutLike?: unknown;
  initialRelayoutTimer?: unknown;
}

export interface MobileTimerboxPageResolvers {
  syncMobileTimerboxUI: (options?: unknown) => unknown;
  initMobileTimerboxToggle: () => unknown;
  requestResponsiveGameRelayout: () => unknown;
}

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): AnyRecord {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveGetElementById(source: AnyRecord): IdResolver | null {
  const direct = asFunction<IdResolver>(source.getElementById);
  if (direct) return direct;
  const documentLike = source.documentLike || null;
  const getElementById = asFunction<IdResolver>(toRecord(documentLike).getElementById);
  if (!getElementById) return null;
  return function (id: string): unknown {
    try {
      return getElementById.call(documentLike, id);
    } catch (_err) {
      return null;
    }
  };
}

export function createMobileTimerboxPageResolvers(
  input: MobileTimerboxPageResolverOptions
): MobileTimerboxPageResolvers {
  const source = toRecord(input);
  const runtime = toRecord(source.mobileTimerboxHostRuntime);
  const responsiveRelayoutHostRuntime = toRecord(source.responsiveRelayoutHostRuntime);
  const getElementById = resolveGetElementById(source);
  const applySyncFromContext = asFunction<ApplyResolver>(runtime.applyMobileTimerboxUiSyncFromContext);
  const applyToggleInit = asFunction<ApplyResolver>(runtime.applyMobileTimerboxToggleInit);
  const applyRelayoutRequestFromContext = asFunction<ApplyResolver>(
    responsiveRelayoutHostRuntime.applyResponsiveRelayoutRequestFromContext
  );
  const fallbackRelayoutRequest = asFunction<() => unknown>(source.requestResponsiveGameRelayout);
  let relayoutTimer = Object.prototype.hasOwnProperty.call(source, "initialRelayoutTimer")
    ? source.initialRelayoutTimer
    : null;

  function syncMobileTimerboxUI(options?: unknown): unknown {
    if (!applySyncFromContext) return null;
    return applySyncFromContext({
      options: options || {},
      isTimerboxMobileScope: source.isTimerboxMobileScope,
      isTimerboxCollapseViewport: source.isTimerboxCollapseViewport,
      getElementById,
      storageRuntime: source.storageRuntime,
      windowLike: source.windowLike || null,
      mobileTimerboxRuntime: source.mobileTimerboxRuntime,
      storageKey: source.storageKey,
      hiddenClassName: source.hiddenClassName,
      expandedClassName: source.expandedClassName,
      defaultCollapsed: source.defaultCollapsed,
      fallbackHiddenToggleDisplay: source.fallbackHiddenToggleDisplay,
      fallbackVisibleToggleDisplay: source.fallbackVisibleToggleDisplay,
      fallbackHiddenAriaExpanded: source.fallbackHiddenAriaExpanded,
      fallbackExpandLabel: source.fallbackExpandLabel,
      fallbackCollapseLabel: source.fallbackCollapseLabel
    });
  }

  function requestResponsiveGameRelayout(): unknown {
    if (!applyRelayoutRequestFromContext) {
      return fallbackRelayoutRequest ? fallbackRelayoutRequest() : null;
    }
    const requestResult = applyRelayoutRequestFromContext({
      responsiveRelayoutRuntime: source.responsiveRelayoutRuntime,
      isTimerboxMobileScope: source.isTimerboxMobileScope,
      existingTimer: relayoutTimer,
      delayMs: source.relayoutDelayMs,
      clearTimeoutLike: source.clearTimeoutLike,
      setTimeoutLike: source.setTimeoutLike,
      syncMobileHintUI: source.syncMobileHintUI,
      syncMobileTopActionsPlacement: source.syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement: source.syncPracticeTopActionsPlacement,
      syncMobileUndoTopButtonAvailability: source.syncMobileUndoTopButtonAvailability,
      syncMobileTimerboxUI,
      windowLike: source.windowLike || null
    });
    if (requestResult && Object.prototype.hasOwnProperty.call(requestResult, "timerRef")) {
      relayoutTimer = toRecord(requestResult).timerRef;
    }
    return requestResult;
  }

  function initMobileTimerboxToggle(): unknown {
    if (!applyToggleInit) return null;
    return applyToggleInit({
      isTimerboxMobileScope: source.isTimerboxMobileScope,
      getElementById,
      syncMobileTimerboxUI,
      requestResponsiveGameRelayout,
      syncMobileTopActionsPlacement: source.syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement: source.syncPracticeTopActionsPlacement,
      syncMobileUndoTopButtonAvailability: source.syncMobileUndoTopButtonAvailability
    });
  }

  return {
    syncMobileTimerboxUI,
    initMobileTimerboxToggle,
    requestResponsiveGameRelayout
  };
}

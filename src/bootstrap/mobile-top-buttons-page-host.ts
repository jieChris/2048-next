type AnyRecord = Record<string, unknown>;

type EnsureButtonResolver = (input: unknown) => unknown;
type ApplyResolver = (payload: unknown) => unknown;

export interface MobileTopButtonsPageResolverOptions {
  mobileTopButtonsRuntime?: unknown;
  documentLike?: unknown;
  isGamePageScope?: (() => boolean) | null;
  mobileUndoTopAvailabilityHostRuntime?: unknown;
  mobileUndoTopHostRuntime?: unknown;
  mobileUndoTopRuntime?: unknown;
  undoActionRuntime?: unknown;
  bodyLike?: unknown;
  windowLike?: unknown;
  isCompactGameViewport?: (() => boolean) | null;
  tryUndoFromUi?: unknown;
  fallbackLabel?: unknown;
}

export interface MobileTopButtonsPageResolvers {
  ensureMobileUndoTopButton: () => unknown;
  ensureMobileHintToggleButton: () => unknown;
  syncMobileUndoTopButtonAvailability: () => unknown;
  initMobileUndoTopButton: () => unknown;
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

function resolveScope(source: AnyRecord): boolean {
  const scopeResolver = asFunction<() => boolean>(source.isGamePageScope);
  return scopeResolver ? !!scopeResolver() : false;
}

export function createMobileTopButtonsPageResolvers(
  input: MobileTopButtonsPageResolverOptions
): MobileTopButtonsPageResolvers {
  const source = toRecord(input);
  const runtime = toRecord(source.mobileTopButtonsRuntime);
  const availabilityHostRuntime = toRecord(source.mobileUndoTopAvailabilityHostRuntime);
  const mobileUndoTopHostRuntime = toRecord(source.mobileUndoTopHostRuntime);
  const documentLike = source.documentLike || null;
  const ensureUndoTop = asFunction<EnsureButtonResolver>(runtime.ensureMobileUndoTopButtonDom);
  const ensureHintTop = asFunction<EnsureButtonResolver>(runtime.ensureMobileHintToggleButtonDom);
  const applyAvailabilitySyncFromContext = asFunction<ApplyResolver>(
    availabilityHostRuntime.applyMobileUndoTopAvailabilitySyncFromContext
  );
  const applyMobileUndoTopInit = asFunction<ApplyResolver>(mobileUndoTopHostRuntime.applyMobileUndoTopInit);
  const fallbackLabel = typeof source.fallbackLabel === "string" && source.fallbackLabel
    ? source.fallbackLabel
    : "撤回";

  function ensureMobileUndoTopButton(): unknown {
    if (!ensureUndoTop) return null;
    return ensureUndoTop({
      isGamePageScope: resolveScope(source),
      documentLike
    });
  }

  function ensureMobileHintToggleButton(): unknown {
    if (!ensureHintTop) return null;
    return ensureHintTop({
      isGamePageScope: resolveScope(source),
      documentLike
    });
  }

  function syncMobileUndoTopButtonAvailability(): unknown {
    if (!applyAvailabilitySyncFromContext) return null;
    return applyAvailabilitySyncFromContext({
      isGamePageScope: source.isGamePageScope,
      ensureMobileUndoTopButton,
      isCompactGameViewport: source.isCompactGameViewport,
      bodyLike: source.bodyLike || null,
      windowLike: source.windowLike || null,
      undoActionRuntime: source.undoActionRuntime,
      mobileUndoTopRuntime: source.mobileUndoTopRuntime,
      fallbackLabel
    });
  }

  function initMobileUndoTopButton(): unknown {
    if (!applyMobileUndoTopInit) return null;
    return applyMobileUndoTopInit({
      isGamePageScope: source.isGamePageScope,
      ensureMobileUndoTopButton,
      tryUndoFromUi: source.tryUndoFromUi,
      syncMobileUndoTopButtonAvailability
    });
  }

  return {
    ensureMobileUndoTopButton,
    ensureMobileHintToggleButton,
    syncMobileUndoTopButtonAvailability,
    initMobileUndoTopButton
  };
}

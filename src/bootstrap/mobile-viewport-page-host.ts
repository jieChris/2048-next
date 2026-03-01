type AnyRecord = Record<string, unknown>;

interface PageScopeOptionsLike {
  bodyLike?: unknown;
}

interface MobileViewportOptionsLike {
  windowLike?: unknown;
  navigatorLike?: unknown;
  maxWidth?: number;
}

type ScopeResolver = (options: PageScopeOptionsLike) => unknown;
type ViewportResolver = (options: MobileViewportOptionsLike) => unknown;

export interface MobileViewportPageResolverOptions {
  mobileViewportRuntime?: unknown;
  bodyLike?: unknown;
  windowLike?: unknown;
  navigatorLike?: unknown;
  mobileUiMaxWidth?: unknown;
  compactGameViewportMaxWidth?: unknown;
  timerboxCollapseMaxWidth?: unknown;
}

export interface MobileViewportPageResolvers {
  isGamePageScope: () => boolean;
  isTimerboxMobileScope: () => boolean;
  isPracticePageScope: () => boolean;
  isMobileGameViewport: () => boolean;
  isCompactGameViewport: () => boolean;
  isTimerboxCollapseViewport: () => boolean;
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

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function createMobileViewportPageResolvers(
  input: MobileViewportPageResolverOptions
): MobileViewportPageResolvers {
  const source = toRecord(input);
  const runtime = toRecord(source.mobileViewportRuntime);
  const bodyLike = source.bodyLike || null;
  const windowLike = source.windowLike || null;
  const navigatorLike = source.navigatorLike || null;
  const mobileUiMaxWidth = toNumber(source.mobileUiMaxWidth, 0);
  const compactGameViewportMaxWidth = toNumber(source.compactGameViewportMaxWidth, 0);
  const timerboxCollapseMaxWidth = toNumber(source.timerboxCollapseMaxWidth, 0);

  const resolveIsGamePageScope = asFunction<ScopeResolver>(runtime.isGamePageScope);
  const resolveIsTimerboxMobileScope = asFunction<ScopeResolver>(runtime.isTimerboxMobileScope);
  const resolveIsPracticePageScope = asFunction<ScopeResolver>(runtime.isPracticePageScope);
  const resolveIsMobileGameViewport = asFunction<ViewportResolver>(runtime.isMobileGameViewport);
  const resolveIsCompactGameViewport = asFunction<ViewportResolver>(
    runtime.isCompactGameViewport
  );
  const resolveIsTimerboxCollapseViewport = asFunction<ViewportResolver>(
    runtime.isTimerboxCollapseViewport
  );

  return {
    isGamePageScope() {
      if (!resolveIsGamePageScope) return false;
      return !!resolveIsGamePageScope({ bodyLike });
    },
    isTimerboxMobileScope() {
      if (!resolveIsTimerboxMobileScope) return false;
      return !!resolveIsTimerboxMobileScope({ bodyLike });
    },
    isPracticePageScope() {
      if (!resolveIsPracticePageScope) return false;
      return !!resolveIsPracticePageScope({ bodyLike });
    },
    isMobileGameViewport() {
      if (!resolveIsMobileGameViewport) return false;
      return !!resolveIsMobileGameViewport({
        windowLike,
        navigatorLike,
        maxWidth: mobileUiMaxWidth
      });
    },
    isCompactGameViewport() {
      if (!resolveIsCompactGameViewport) return false;
      return !!resolveIsCompactGameViewport({
        windowLike,
        maxWidth: compactGameViewportMaxWidth
      });
    },
    isTimerboxCollapseViewport() {
      if (!resolveIsTimerboxCollapseViewport) return false;
      return !!resolveIsTimerboxCollapseViewport({
        windowLike,
        maxWidth: timerboxCollapseMaxWidth
      });
    }
  };
}

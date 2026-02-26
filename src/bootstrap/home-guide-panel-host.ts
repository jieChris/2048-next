function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
}

export interface HomeGuidePanelPositionResult {
  didPosition: boolean;
}

export function applyHomeGuidePanelPosition(input: {
  homeGuideState?: unknown;
  homeGuideRuntime?: unknown;
  mobileViewportRuntime?: unknown;
  windowLike?: unknown;
  mobileUiMaxWidth?: unknown;
  margin?: unknown;
  defaultPanelHeight?: unknown;
}): HomeGuidePanelPositionResult {
  const source = toRecord(input);
  const homeGuideState = toRecord(source.homeGuideState);
  const panel = toRecord(homeGuideState.panel);
  const target = homeGuideState.target;
  if (!panel || !target) {
    return {
      didPosition: false
    };
  }

  const getBoundingClientRect = asFunction<() => unknown>(toRecord(target).getBoundingClientRect);
  if (!getBoundingClientRect) {
    return {
      didPosition: false
    };
  }

  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const resolveHomeGuidePanelLayout = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuidePanelLayout
  );
  if (!resolveHomeGuidePanelLayout) {
    return {
      didPosition: false
    };
  }

  const mobileViewportRuntime = toRecord(source.mobileViewportRuntime);
  const isViewportAtMost = asFunction<(payload: unknown) => unknown>(
    mobileViewportRuntime.isViewportAtMost
  );

  const windowLike = toRecord(source.windowLike);
  const rect = getBoundingClientRect.call(target);
  const margin = resolveNumber(source.margin, 12);
  const defaultPanelHeight = resolveNumber(source.defaultPanelHeight, 160);
  const mobileLayout = !!(
    isViewportAtMost &&
    isViewportAtMost({
      windowLike: source.windowLike,
      maxWidth: resolveNumber(source.mobileUiMaxWidth, 640)
    })
  );

  const initialLayout = toRecord(
    resolveHomeGuidePanelLayout({
      targetRect: rect,
      viewportWidth: resolveNumber(windowLike.innerWidth, 0),
      viewportHeight: resolveNumber(windowLike.innerHeight, 0),
      panelHeight: defaultPanelHeight,
      margin,
      mobileLayout
    })
  );

  const panelStyle = toRecord(panel.style);
  panelStyle.maxWidth = resolveNumber(initialLayout.panelWidth, 0) + "px";
  panelStyle.width = resolveNumber(initialLayout.panelWidth, 0) + "px";

  const panelHeight = resolveNumber(panel.offsetHeight, defaultPanelHeight);
  const layout = toRecord(
    resolveHomeGuidePanelLayout({
      targetRect: rect,
      viewportWidth: resolveNumber(windowLike.innerWidth, 0),
      viewportHeight: resolveNumber(windowLike.innerHeight, 0),
      panelHeight,
      margin,
      mobileLayout
    })
  );

  panelStyle.maxWidth = resolveNumber(layout.panelWidth, 0) + "px";
  panelStyle.width = resolveNumber(layout.panelWidth, 0) + "px";
  panelStyle.top = resolveNumber(layout.top, 0) + "px";
  panelStyle.left = resolveNumber(layout.left, 0) + "px";
  panel.style = panelStyle;

  return {
    didPosition: true
  };
}

export function resolveHomeGuideTargetVisibility(input: {
  homeGuideRuntime?: unknown;
  windowLike?: unknown;
  node?: unknown;
}): boolean {
  const source = toRecord(input);
  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const isHomeGuideTargetVisible = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.isHomeGuideTargetVisible
  );
  if (!isHomeGuideTargetVisible) return false;

  const windowLike = toRecord(source.windowLike);
  const getComputedStyle = asFunction<(node: unknown) => unknown>(windowLike.getComputedStyle);

  return !!isHomeGuideTargetVisible({
    nodeLike: source.node || null,
    getComputedStyle:
      getComputedStyle && source.windowLike
        ? function (el: unknown): unknown {
            return getComputedStyle.call(source.windowLike, el);
          }
        : null
  });
}

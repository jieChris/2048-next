function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
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

function resolveSteps(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function resolveDisplayValue(value: unknown): string {
  if (value == null) return "none";
  return String(value);
}

function setDisplay(node: unknown, display: string): void {
  const style = toRecord(toRecord(node).style);
  style.display = display;
}

function setBodyClassState(documentLike: unknown, className: string, active: boolean): void {
  const body = toRecord(toRecord(documentLike).body);
  if (!body) return;

  const classList = toRecord(body.classList);
  const addClass = asFunction<(name: string) => unknown>(classList.add);
  const removeClass = asFunction<(name: string) => unknown>(classList.remove);
  if (active && addClass) {
    addClass.call(body.classList, className);
    return;
  }
  if (!active && removeClass) {
    removeClass.call(body.classList, className);
    return;
  }

  const rawClassName = String(body.className || "").trim();
  const tokens = rawClassName ? rawClassName.split(/\s+/) : [];
  const nextTokens = tokens.filter((token) => token && token !== className);
  if (active) {
    nextTokens.push(className);
  }
  body.className = nextTokens.join(" ");
}

export interface HomeGuideStartHostResult {
  didStart: boolean;
  hasDom: boolean;
}

export function applyHomeGuideStart(input: {
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  options?: unknown;
  isHomePage?: unknown;
  getHomeGuideSteps?: unknown;
  ensureHomeGuideDom?: unknown;
  documentLike?: unknown;
}): HomeGuideStartHostResult {
  const source = toRecord(input);
  const isHomePage = asFunction<() => unknown>(source.isHomePage);
  if (!isHomePage || !isHomePage()) {
    return {
      didStart: false,
      hasDom: false
    };
  }

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
  const ensureHomeGuideDom = asFunction<() => unknown>(source.ensureHomeGuideDom);
  const getHomeGuideSteps = asFunction<() => unknown>(source.getHomeGuideSteps);

  if (
    !resolveLifecycleState ||
    !resolveSessionState ||
    !resolveLayerDisplayState ||
    !ensureHomeGuideDom ||
    !getHomeGuideSteps
  ) {
    return {
      didStart: false,
      hasDom: false
    };
  }

  const dom = toRecord(ensureHomeGuideDom());
  const options = toRecord(source.options);

  const lifecycleState = toRecord(
    resolveLifecycleState({
      action: "start",
      fromSettings: resolveBoolean(options.fromSettings),
      steps: getHomeGuideSteps()
    })
  );

  const sessionState = toRecord(
    resolveSessionState({
      lifecycleState
    })
  );

  const homeGuideState = toRecord(source.homeGuideState);
  homeGuideState.active = resolveBoolean(sessionState.active);
  homeGuideState.fromSettings = resolveBoolean(sessionState.fromSettings);
  homeGuideState.steps = resolveSteps(sessionState.steps);
  homeGuideState.index = resolveNumber(sessionState.index, 0);

  const layerDisplayState = toRecord(
    resolveLayerDisplayState({
      active: resolveBoolean(homeGuideState.active)
    })
  );

  if (dom.overlay) {
    setDisplay(dom.overlay, resolveDisplayValue(layerDisplayState.overlayDisplay));
  }
  if (dom.panel) {
    setDisplay(dom.panel, resolveDisplayValue(layerDisplayState.panelDisplay));
  }
  setBodyClassState(source.documentLike, "home-guide-active", resolveBoolean(homeGuideState.active));

  return {
    didStart: true,
    hasDom: !!(dom.overlay && dom.panel)
  };
}

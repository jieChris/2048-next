function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveText(value: unknown): string {
  return value == null ? "" : String(value);
}

function resolveBoolean(value: unknown): boolean {
  return !!value;
}

function getElementById(documentLike: unknown, id: string): unknown {
  const getter = asFunction<(value: string) => unknown>(toRecord(documentLike).getElementById);
  if (!getter) return null;
  return (getter as unknown as Function).call(documentLike, id);
}

function querySelector(node: unknown, selector: string): unknown {
  const query = asFunction<(value: string) => unknown>(toRecord(node).querySelector);
  if (!query) return null;
  return (query as unknown as Function).call(node, selector);
}

function createElement(documentLike: unknown, tagName: string): unknown {
  const creator = asFunction<(value: string) => unknown>(toRecord(documentLike).createElement);
  if (!creator) return null;
  return (creator as unknown as Function).call(documentLike, tagName);
}

function appendChild(node: unknown, child: unknown): void {
  const append = asFunction<(value: unknown) => unknown>(toRecord(node).appendChild);
  if (!append) return;
  (append as unknown as Function).call(node, child);
}

function resolveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function setStyleImportant(node: unknown, propertyName: string, value: string): void {
  const style = toRecord(toRecord(node).style);
  const setProperty = asFunction<(name: string, value: string, priority?: string) => unknown>(
    style.setProperty
  );
  if (setProperty) {
    setProperty.call(style, propertyName, value, "important");
    return;
  }
  style[propertyName] = value;
}

function isNightBackgroundEnabled(documentLike: unknown): boolean {
  const documentElement = toRecord(toRecord(documentLike).documentElement);
  const getAttribute = asFunction<(name: string) => unknown>(documentElement.getAttribute);
  if (!getAttribute) return false;
  return resolveText(getAttribute.call(documentElement, "data-night-background")) === "1";
}

function applyGuideTextVisibilityStyles(input: {
  panel?: unknown;
  stepEl?: unknown;
  titleEl?: unknown;
  descEl?: unknown;
  documentLike?: unknown;
}): void {
  const source = toRecord(input);
  const isNightMode = isNightBackgroundEnabled(source.documentLike);
  if (source.panel) {
    setStyleImportant(source.panel, "display", "block");
    setStyleImportant(source.panel, "opacity", "1");
    setStyleImportant(source.panel, "visibility", "visible");
    setStyleImportant(source.panel, "z-index", "3401");
    setStyleImportant(source.panel, "background", isNightMode ? "rgba(24, 36, 56, 0.96)" : "#fffdf8");
    setStyleImportant(
      source.panel,
      "border",
      isNightMode ? "1px solid rgba(181, 198, 221, 0.16)" : "1px solid #d8d4d0"
    );
  }
  if (source.stepEl) {
    setStyleImportant(source.stepEl, "display", "block");
    setStyleImportant(source.stepEl, "color", isNightMode ? "#b8c2d3" : "#8a8178");
  }
  if (source.titleEl) {
    setStyleImportant(source.titleEl, "display", "block");
    setStyleImportant(source.titleEl, "color", isNightMode ? "#ece2d3" : "#5f544a");
  }
  if (source.descEl) {
    setStyleImportant(source.descEl, "display", "block");
    setStyleImportant(source.descEl, "color", isNightMode ? "#d9d0c2" : "#776e65");
  }
}

function ensureGuideMessageBanner(documentLike: unknown, homeGuideRuntime: unknown): unknown {
  let banner = getElementById(documentLike, "home-guide-message-banner");
  if (!banner) {
    const nextBanner = createElement(documentLike, "div");
    if (!nextBanner) return null;
    const bannerRecord = toRecord(nextBanner);
    bannerRecord.id = "home-guide-message-banner";
    bannerRecord.className = "home-guide-message-banner";
    const body = toRecord(toRecord(documentLike).body);
    if (!body) return null;
    appendChild(body, nextBanner);
    banner = nextBanner;
  }

  const hasRequiredNodes =
    !!querySelector(banner, "#home-guide-step") &&
    !!querySelector(banner, "#home-guide-title") &&
    !!querySelector(banner, "#home-guide-desc") &&
    !!querySelector(banner, "#home-guide-prev") &&
    !!querySelector(banner, "#home-guide-next") &&
    !!querySelector(banner, "#home-guide-skip");
  if (hasRequiredNodes) return banner;

  const buildPanelHtml = asFunction<() => unknown>(toRecord(homeGuideRuntime).buildHomeGuidePanelInnerHtml);
  if (!buildPanelHtml) return banner;
  toRecord(banner).innerHTML = resolveText(buildPanelHtml.call(homeGuideRuntime));
  return banner;
}

function applyGuideMessageBanner(input: {
  documentLike?: unknown;
  windowLike?: unknown;
  homeGuideRuntime?: unknown;
  step?: unknown;
}): void {
  const source = toRecord(input);
  const banner = ensureGuideMessageBanner(source.documentLike, source.homeGuideRuntime);
  if (!banner) return;

  const windowLike = toRecord(source.windowLike);
  const viewportWidth = resolveNumber(windowLike.innerWidth, 0);
  const viewportHeight = resolveNumber(windowLike.innerHeight, 0);
  const isNightMode = isNightBackgroundEnabled(source.documentLike);
  const defaultWidth = viewportWidth > 0 ? Math.min(520, Math.max(300, viewportWidth - 24)) : 460;
  const minGap = 10;

  setStyleImportant(banner, "position", "fixed");
  setStyleImportant(banner, "left", "12px");
  setStyleImportant(banner, "top", "12px");
  setStyleImportant(banner, "transform", "none");
  setStyleImportant(banner, "display", "block");
  setStyleImportant(banner, "visibility", "visible");
  setStyleImportant(banner, "opacity", "1");
  setStyleImportant(banner, "z-index", "3401");
  setStyleImportant(banner, "max-width", defaultWidth + "px");
  setStyleImportant(banner, "width", defaultWidth + "px");
  setStyleImportant(banner, "padding", "14px 16px");
  setStyleImportant(banner, "border-radius", "10px");
  setStyleImportant(banner, "background", isNightMode ? "rgba(24, 36, 56, 0.96)" : "#fffdf8");
  setStyleImportant(
    banner,
    "border",
    isNightMode ? "1px solid rgba(181, 198, 221, 0.16)" : "1px solid #d8d4d0"
  );
  setStyleImportant(
    banner,
    "box-shadow",
    isNightMode
      ? "0 20px 42px rgba(1, 4, 12, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
      : "0 8px 28px rgba(0, 0, 0, 0.25)"
  );
  setStyleImportant(banner, "box-sizing", "border-box");
  setStyleImportant(banner, "text-align", "left");
  setStyleImportant(banner, "pointer-events", "auto");
  setStyleImportant(banner, "white-space", "normal");

  const step = toRecord(source.step);
  const selector = typeof step.selector === "string" ? step.selector : "";
  const target = selector ? querySelector(source.documentLike, selector) : null;
  const getRect = asFunction<() => unknown>(toRecord(target).getBoundingClientRect);
  if (!getRect || !viewportWidth || !viewportHeight) return;
  const rect = toRecord(getRect.call(target));
  const targetWidth = resolveNumber(rect.width, 0);
  const targetHeight = resolveNumber(rect.height, 0);
  if (targetWidth <= 0 || targetHeight <= 0) return;

  const bannerWidth = Math.min(defaultWidth, resolveNumber(toRecord(banner).offsetWidth, defaultWidth));
  const bannerHeight = Math.max(64, resolveNumber(toRecord(banner).offsetHeight, 84));
  const targetLeft = resolveNumber(rect.left, 0);
  const targetTop = resolveNumber(rect.top, 0);
  const targetRight = resolveNumber(rect.right, targetLeft + targetWidth);
  const targetBottom = resolveNumber(rect.bottom, targetTop + targetHeight);
  let left = targetLeft + targetWidth / 2 - bannerWidth / 2;
  if (left < minGap) left = minGap;
  if (left + bannerWidth > viewportWidth - minGap) {
    left = viewportWidth - bannerWidth - minGap;
  }
  let top = targetTop - bannerHeight - 14;
  if (top < minGap) {
    top = targetBottom + 14;
  }
  if (top + bannerHeight > viewportHeight - minGap) {
    top = Math.max(minGap, targetTop - bannerHeight - 14);
  }
  if (targetRight <= 0 || targetLeft >= viewportWidth) return;
  setStyleImportant(banner, "left", Math.round(left) + "px");
  setStyleImportant(banner, "top", Math.round(top) + "px");
}

export interface HomeGuideStepViewHostResult {
  didRender: boolean;
  didSchedulePanel: boolean;
}

export function applyHomeGuideStepView(input: {
  documentLike?: unknown;
  windowLike?: unknown;
  homeGuideRuntime?: unknown;
  step?: unknown;
  stepIndex?: unknown;
  stepCount?: unknown;
  positionHomeGuidePanel?: unknown;
}): HomeGuideStepViewHostResult {
  const source = toRecord(input);
  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const resolveHomeGuideStepRenderState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideStepRenderState
  );
  if (!resolveHomeGuideStepRenderState) {
    return {
      didRender: false,
      didSchedulePanel: false
    };
  }

  const stepRenderState = toRecord(
    resolveHomeGuideStepRenderState({
      step: source.step || null,
      stepIndex: source.stepIndex,
      stepCount: source.stepCount
    })
  );

  const panel = ensureGuideMessageBanner(source.documentLike, source.homeGuideRuntime);
  const stepEl = getElementById(source.documentLike, "home-guide-step");
  const titleEl = getElementById(source.documentLike, "home-guide-title");
  const descEl = getElementById(source.documentLike, "home-guide-desc");
  const prevBtn = getElementById(source.documentLike, "home-guide-prev");
  const nextBtn = getElementById(source.documentLike, "home-guide-next");

  applyGuideTextVisibilityStyles({
    panel,
    stepEl,
    titleEl,
    descEl,
    documentLike: source.documentLike
  });

  if (stepEl) toRecord(stepEl).textContent = resolveText(stepRenderState.stepText);
  if (titleEl) toRecord(titleEl).textContent = resolveText(stepRenderState.titleText);
  if (descEl) toRecord(descEl).textContent = resolveText(stepRenderState.descText);
  if (prevBtn) toRecord(prevBtn).disabled = resolveBoolean(stepRenderState.prevDisabled);
  if (nextBtn) toRecord(nextBtn).textContent = resolveText(stepRenderState.nextText);

  applyGuideMessageBanner({
    documentLike: source.documentLike,
    windowLike: source.windowLike,
    homeGuideRuntime: source.homeGuideRuntime,
    step: source.step
  });

  let didSchedulePanel = false;
  const requestAnimationFrame = asFunction<(cb: (...args: never[]) => unknown) => unknown>(
    toRecord(source.windowLike).requestAnimationFrame
  );
  if (requestAnimationFrame) {
    requestAnimationFrame(function () {
      applyGuideMessageBanner({
        documentLike: source.documentLike,
        windowLike: source.windowLike,
        homeGuideRuntime: source.homeGuideRuntime,
        step: source.step
      });
    });
    didSchedulePanel = true;
  }

  return {
    didRender: true,
    didSchedulePanel
  };
}

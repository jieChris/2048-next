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

function applyGuideTextVisibilityStyles(input: {
  panel?: unknown;
  stepEl?: unknown;
  titleEl?: unknown;
  descEl?: unknown;
}): void {
  const source = toRecord(input);
  if (source.panel) {
    setStyleImportant(source.panel, "display", "block");
    setStyleImportant(source.panel, "opacity", "1");
    setStyleImportant(source.panel, "visibility", "visible");
    setStyleImportant(source.panel, "z-index", "3300");
    setStyleImportant(source.panel, "background", "#fffdf8");
    setStyleImportant(source.panel, "border", "1px solid #d8d4d0");
  }
  if (source.stepEl) {
    setStyleImportant(source.stepEl, "display", "block");
    setStyleImportant(source.stepEl, "color", "#8a8178");
  }
  if (source.titleEl) {
    setStyleImportant(source.titleEl, "display", "block");
    setStyleImportant(source.titleEl, "color", "#5f544a");
  }
  if (source.descEl) {
    setStyleImportant(source.descEl, "display", "block");
    setStyleImportant(source.descEl, "color", "#776e65");
  }
}

function ensureGuideMessageBanner(documentLike: unknown): unknown {
  const existing = getElementById(documentLike, "home-guide-message-banner");
  if (existing) return existing;
  const banner = createElement(documentLike, "div");
  if (!banner) return null;
  const bannerRecord = toRecord(banner);
  bannerRecord.id = "home-guide-message-banner";
  const body = toRecord(toRecord(documentLike).body);
  if (!body) return null;
  appendChild(body, banner);
  return banner;
}

function applyGuideMessageBanner(input: {
  documentLike?: unknown;
  windowLike?: unknown;
  step?: unknown;
  stepText?: unknown;
  titleText?: unknown;
  descText?: unknown;
}): void {
  const source = toRecord(input);
  const banner = ensureGuideMessageBanner(source.documentLike);
  if (!banner) return;
  const stepText = resolveText(source.stepText).trim();
  const titleText = resolveText(source.titleText).trim();
  const descText = resolveText(source.descText).trim();
  const message = stepText
    ? stepText + " · " + titleText + "： " + descText
    : titleText + "： " + descText;
  toRecord(banner).textContent = message;
  const windowLike = toRecord(source.windowLike);
  const viewportWidth = resolveNumber(windowLike.innerWidth, 0);
  const viewportHeight = resolveNumber(windowLike.innerHeight, 0);
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
  setStyleImportant(banner, "padding", "10px 12px");
  setStyleImportant(banner, "border-radius", "8px");
  setStyleImportant(banner, "background", "rgba(40, 34, 28, 0.94)");
  setStyleImportant(banner, "color", "#f9f6f2");
  setStyleImportant(banner, "font-size", "18px");
  setStyleImportant(banner, "font-weight", "600");
  setStyleImportant(banner, "line-height", "1.55");
  setStyleImportant(banner, "text-align", "left");
  setStyleImportant(banner, "box-shadow", "0 8px 22px rgba(0,0,0,0.35)");
  setStyleImportant(banner, "pointer-events", "none");
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

function ensureStepPanelStructure(documentLike: unknown, homeGuideRuntime: unknown): void {
  const panel = getElementById(documentLike, "home-guide-panel");
  if (!panel) return;
  const hasRequiredNodes =
    !!querySelector(panel, "#home-guide-step") &&
    !!querySelector(panel, "#home-guide-title") &&
    !!querySelector(panel, "#home-guide-desc") &&
    !!querySelector(panel, "#home-guide-prev") &&
    !!querySelector(panel, "#home-guide-next") &&
    !!querySelector(panel, "#home-guide-skip");
  if (hasRequiredNodes) return;
  const buildPanelHtml = asFunction<() => unknown>(toRecord(homeGuideRuntime).buildHomeGuidePanelInnerHtml);
  if (!buildPanelHtml) return;
  toRecord(panel).innerHTML = resolveText(buildPanelHtml.call(homeGuideRuntime));
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

  ensureStepPanelStructure(source.documentLike, source.homeGuideRuntime);

  const panel = getElementById(source.documentLike, "home-guide-panel");
  const stepEl = getElementById(source.documentLike, "home-guide-step");
  const titleEl = getElementById(source.documentLike, "home-guide-title");
  const descEl = getElementById(source.documentLike, "home-guide-desc");
  const prevBtn = getElementById(source.documentLike, "home-guide-prev");
  const nextBtn = getElementById(source.documentLike, "home-guide-next");

  applyGuideTextVisibilityStyles({
    panel,
    stepEl,
    titleEl,
    descEl
  });

  if (stepEl) toRecord(stepEl).textContent = resolveText(stepRenderState.stepText);
  if (titleEl) toRecord(titleEl).textContent = resolveText(stepRenderState.titleText);
  if (descEl) toRecord(descEl).textContent = resolveText(stepRenderState.descText);
  if (prevBtn) toRecord(prevBtn).disabled = resolveBoolean(stepRenderState.prevDisabled);
  if (nextBtn) toRecord(nextBtn).textContent = resolveText(stepRenderState.nextText);

  applyGuideMessageBanner({
    documentLike: source.documentLike,
    windowLike: source.windowLike,
    step: source.step,
    stepText: stepRenderState.stepText,
    titleText: stepRenderState.titleText,
    descText: stepRenderState.descText
  });

  let didSchedulePanel = false;
  const requestAnimationFrame = asFunction<(cb: (...args: never[]) => unknown) => unknown>(
    toRecord(source.windowLike).requestAnimationFrame
  );
  const positionHomeGuidePanel = asFunction<() => unknown>(source.positionHomeGuidePanel);
  if (requestAnimationFrame && positionHomeGuidePanel) {
    requestAnimationFrame(positionHomeGuidePanel);
    didSchedulePanel = true;
  }

  return {
    didRender: true,
    didSchedulePanel
  };
}

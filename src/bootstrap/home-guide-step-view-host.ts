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

  const stepEl = getElementById(source.documentLike, "home-guide-step");
  const titleEl = getElementById(source.documentLike, "home-guide-title");
  const descEl = getElementById(source.documentLike, "home-guide-desc");
  const prevBtn = getElementById(source.documentLike, "home-guide-prev");
  const nextBtn = getElementById(source.documentLike, "home-guide-next");

  if (stepEl) toRecord(stepEl).textContent = resolveText(stepRenderState.stepText);
  if (titleEl) toRecord(titleEl).textContent = resolveText(stepRenderState.titleText);
  if (descEl) toRecord(descEl).textContent = resolveText(stepRenderState.descText);
  if (prevBtn) toRecord(prevBtn).disabled = resolveBoolean(stepRenderState.prevDisabled);
  if (nextBtn) toRecord(nextBtn).textContent = resolveText(stepRenderState.nextText);

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

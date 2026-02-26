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
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
}

function resolveSteps(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function querySelector(documentLike: unknown, selector: string): unknown {
  const query = asFunction<(value: string) => unknown>(toRecord(documentLike).querySelector);
  if (!query) return null;
  return (query as unknown as Function).call(documentLike, selector);
}

function addClass(element: unknown, className: string): void {
  const classList = toRecord(element).classList;
  const add = asFunction<(value: string) => unknown>(toRecord(classList).add);
  if (!add) return;
  (add as unknown as Function).call(classList, className);
}

export interface HomeGuideStepFlowHostResult {
  shouldAbort: boolean;
  didFinish: boolean;
  shouldAdvance: boolean;
  nextIndex: number;
  shouldRender: boolean;
  stepIndex: number;
  step: unknown;
}

export function applyHomeGuideStepFlow(input: {
  index?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  mobileViewportRuntime?: unknown;
  mobileUiMaxWidth?: unknown;
  isElementVisibleForGuide?: unknown;
  clearHomeGuideHighlight?: unknown;
  elevateHomeGuideTarget?: unknown;
  finishHomeGuide?: unknown;
}): HomeGuideStepFlowHostResult {
  const source = toRecord(input);
  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const homeGuideState = toRecord(source.homeGuideState);
  const mobileViewportRuntime = toRecord(source.mobileViewportRuntime);

  const resolveHomeGuideStepIndexState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideStepIndexState
  );
  const resolveHomeGuideFinishState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideFinishState
  );
  const resolveHomeGuideStepTargetState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideStepTargetState
  );
  const resolveHomeGuideTargetScrollState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideTargetScrollState
  );
  const isViewportAtMost = asFunction<(payload: unknown) => unknown>(
    mobileViewportRuntime.isViewportAtMost
  );
  const isElementVisibleForGuide = asFunction<(node: unknown) => unknown>(
    source.isElementVisibleForGuide
  );
  const clearHomeGuideHighlight = asFunction<() => unknown>(source.clearHomeGuideHighlight);
  const elevateHomeGuideTarget = asFunction<(node: unknown) => unknown>(source.elevateHomeGuideTarget);
  const finishHomeGuide = asFunction<(markSeen: boolean, options: unknown) => unknown>(
    source.finishHomeGuide
  );

  if (
    !resolveHomeGuideStepIndexState ||
    !resolveHomeGuideStepTargetState ||
    !resolveHomeGuideFinishState ||
    !resolveHomeGuideTargetScrollState
  ) {
    return {
      shouldAbort: true,
      didFinish: false,
      shouldAdvance: false,
      nextIndex: 0,
      shouldRender: false,
      stepIndex: 0,
      step: null
    };
  }

  const steps = resolveSteps(homeGuideState.steps);
  const rawIndex = resolveNumber(source.index, 0);
  const stepIndexState = toRecord(
    resolveHomeGuideStepIndexState({
      isActive: resolveBoolean(homeGuideState.active),
      stepCount: steps.length,
      stepIndex: rawIndex
    })
  );
  if (stepIndexState.shouldAbort) {
    return {
      shouldAbort: true,
      didFinish: false,
      shouldAdvance: false,
      nextIndex: 0,
      shouldRender: false,
      stepIndex: 0,
      step: null
    };
  }

  if (stepIndexState.shouldFinish) {
    if (finishHomeGuide) {
      const finishState = toRecord(
        resolveHomeGuideFinishState({
          reason: "completed"
        })
      );
      finishHomeGuide(resolveBoolean(finishState.markSeen), {
        showDoneNotice: resolveBoolean(finishState.showDoneNotice)
      });
    }
    return {
      shouldAbort: false,
      didFinish: true,
      shouldAdvance: false,
      nextIndex: 0,
      shouldRender: false,
      stepIndex: resolveNumber(stepIndexState.resolvedIndex, 0),
      step: null
    };
  }

  const resolvedIndex = resolveNumber(stepIndexState.resolvedIndex, 0);
  homeGuideState.index = resolvedIndex;
  if (clearHomeGuideHighlight) {
    clearHomeGuideHighlight();
  }

  const step = steps[resolvedIndex];
  const stepRecord = toRecord(step);
  const selector = typeof stepRecord.selector === "string" ? stepRecord.selector : "";
  const target = selector ? querySelector(source.documentLike, selector) : null;
  const targetVisible = !!(
    target && isElementVisibleForGuide && isElementVisibleForGuide(target)
  );

  const stepTargetState = toRecord(
    resolveHomeGuideStepTargetState({
      hasTarget: !!target,
      targetVisible: targetVisible,
      stepIndex: resolvedIndex
    })
  );
  if (stepTargetState.shouldAdvance) {
    return {
      shouldAbort: false,
      didFinish: false,
      shouldAdvance: true,
      nextIndex: resolveNumber(stepTargetState.nextIndex, resolvedIndex + 1),
      shouldRender: false,
      stepIndex: resolvedIndex,
      step
    };
  }

  if (!target || !targetVisible) {
    return {
      shouldAbort: false,
      didFinish: false,
      shouldAdvance: true,
      nextIndex: resolvedIndex + 1,
      shouldRender: false,
      stepIndex: resolvedIndex,
      step
    };
  }

  homeGuideState.target = target;

  const canScrollIntoView = !!asFunction<(payload: unknown) => unknown>(toRecord(target).scrollIntoView);
  const targetScrollState = toRecord(
    resolveHomeGuideTargetScrollState({
      isCompactViewport: isViewportAtMost
        ? !!isViewportAtMost({
            windowLike: source.windowLike,
            maxWidth: resolveNumber(source.mobileUiMaxWidth, 640)
          })
        : false,
      canScrollIntoView
    })
  );
  const scrollIntoView = asFunction<(payload: unknown) => unknown>(toRecord(target).scrollIntoView);
  if (targetScrollState.shouldScroll && scrollIntoView) {
    scrollIntoView.call(target, {
      block: targetScrollState.block,
      inline: targetScrollState.inline,
      behavior: targetScrollState.behavior
    });
  }

  addClass(target, "home-guide-highlight");
  if (elevateHomeGuideTarget) {
    elevateHomeGuideTarget(target);
  }

  return {
    shouldAbort: false,
    didFinish: false,
    shouldAdvance: false,
    nextIndex: resolvedIndex,
    shouldRender: true,
    stepIndex: resolvedIndex,
    step
  };
}

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

export interface HomeGuideStepHostResult {
  didAbort: boolean;
  didFinish: boolean;
  didAdvance: boolean;
  nextIndex: number;
  didRender: boolean;
}

export interface HomeGuideStepOrchestrationResult {
  didAbort: boolean;
  didFinish: boolean;
  didRender: boolean;
  didHitAdvanceLimit: boolean;
  finalIndex: number;
  loopCount: number;
}

export function applyHomeGuideStep(input: {
  index?: unknown;
  stepFlowHostRuntime?: unknown;
  stepViewHostRuntime?: unknown;
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
  positionHomeGuidePanel?: unknown;
}): HomeGuideStepHostResult {
  const source = toRecord(input);
  const stepFlowHostRuntime = toRecord(source.stepFlowHostRuntime);
  const stepViewHostRuntime = toRecord(source.stepViewHostRuntime);
  const applyHomeGuideStepFlow = asFunction<(payload: unknown) => unknown>(
    stepFlowHostRuntime.applyHomeGuideStepFlow
  );
  if (!applyHomeGuideStepFlow) {
    return {
      didAbort: true,
      didFinish: false,
      didAdvance: false,
      nextIndex: 0,
      didRender: false
    };
  }

  const flowResult = toRecord(
    applyHomeGuideStepFlow({
      index: source.index,
      documentLike: source.documentLike,
      windowLike: source.windowLike,
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState: source.homeGuideState,
      mobileViewportRuntime: source.mobileViewportRuntime,
      mobileUiMaxWidth: source.mobileUiMaxWidth,
      isElementVisibleForGuide: source.isElementVisibleForGuide,
      clearHomeGuideHighlight: source.clearHomeGuideHighlight,
      elevateHomeGuideTarget: source.elevateHomeGuideTarget,
      finishHomeGuide: source.finishHomeGuide
    })
  );

  if (flowResult.shouldAbort) {
    return {
      didAbort: true,
      didFinish: false,
      didAdvance: false,
      nextIndex: 0,
      didRender: false
    };
  }
  if (flowResult.didFinish) {
    return {
      didAbort: false,
      didFinish: true,
      didAdvance: false,
      nextIndex: 0,
      didRender: false
    };
  }
  if (flowResult.shouldAdvance) {
    return {
      didAbort: false,
      didFinish: false,
      didAdvance: true,
      nextIndex: resolveNumber(flowResult.nextIndex, resolveNumber(source.index, 0) + 1),
      didRender: false
    };
  }
  if (!flowResult.shouldRender) {
    return {
      didAbort: false,
      didFinish: false,
      didAdvance: false,
      nextIndex: 0,
      didRender: false
    };
  }

  const applyHomeGuideStepView = asFunction<(payload: unknown) => unknown>(
    stepViewHostRuntime.applyHomeGuideStepView
  );
  let didRender = false;
  if (applyHomeGuideStepView) {
    const viewResult = toRecord(
      applyHomeGuideStepView({
        documentLike: source.documentLike,
        windowLike: source.windowLike,
        homeGuideRuntime: source.homeGuideRuntime,
        step: flowResult.step || null,
        stepIndex: flowResult.stepIndex,
        stepCount: resolveSteps(toRecord(source.homeGuideState).steps).length,
        positionHomeGuidePanel: source.positionHomeGuidePanel
      })
    );
    didRender = resolveBoolean(viewResult.didRender);
  }

  return {
    didAbort: false,
    didFinish: false,
    didAdvance: false,
    nextIndex: resolveNumber(flowResult.stepIndex, resolveNumber(source.index, 0)),
    didRender
  };
}

export function applyHomeGuideStepOrchestration(input: {
  index?: unknown;
  maxAdvanceLoops?: unknown;
  stepFlowHostRuntime?: unknown;
  stepViewHostRuntime?: unknown;
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
  positionHomeGuidePanel?: unknown;
}): HomeGuideStepOrchestrationResult {
  const source = toRecord(input);
  let nextIndex = resolveNumber(source.index, 0);
  const maxAdvanceLoops = Math.max(1, resolveNumber(source.maxAdvanceLoops, 32));
  let loopCount = 0;

  while (loopCount < maxAdvanceLoops) {
    loopCount += 1;
    const stepResult = applyHomeGuideStep({
      index: nextIndex,
      stepFlowHostRuntime: source.stepFlowHostRuntime,
      stepViewHostRuntime: source.stepViewHostRuntime,
      documentLike: source.documentLike,
      windowLike: source.windowLike,
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState: source.homeGuideState,
      mobileViewportRuntime: source.mobileViewportRuntime,
      mobileUiMaxWidth: source.mobileUiMaxWidth,
      isElementVisibleForGuide: source.isElementVisibleForGuide,
      clearHomeGuideHighlight: source.clearHomeGuideHighlight,
      elevateHomeGuideTarget: source.elevateHomeGuideTarget,
      finishHomeGuide: source.finishHomeGuide,
      positionHomeGuidePanel: source.positionHomeGuidePanel
    });

    if (stepResult.didAbort) {
      return {
        didAbort: true,
        didFinish: false,
        didRender: false,
        didHitAdvanceLimit: false,
        finalIndex: nextIndex,
        loopCount
      };
    }
    if (stepResult.didFinish) {
      return {
        didAbort: false,
        didFinish: true,
        didRender: false,
        didHitAdvanceLimit: false,
        finalIndex: nextIndex,
        loopCount
      };
    }
    if (stepResult.didAdvance) {
      nextIndex = resolveNumber(stepResult.nextIndex, nextIndex + 1);
      continue;
    }

    return {
      didAbort: false,
      didFinish: false,
      didRender: resolveBoolean(stepResult.didRender),
      didHitAdvanceLimit: false,
      finalIndex: resolveNumber(stepResult.nextIndex, nextIndex),
      loopCount
    };
  }

  return {
    didAbort: true,
    didFinish: false,
    didRender: false,
    didHitAdvanceLimit: true,
    finalIndex: nextIndex,
    loopCount
  };
}

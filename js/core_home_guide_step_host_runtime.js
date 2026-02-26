(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function resolveBoolean(value) {
    return !!value;
  }

  function resolveNumber(value, fallback) {
    var parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    return fallback;
  }

  function resolveSteps(value) {
    return Array.isArray(value) ? value : [];
  }

  function applyHomeGuideStep(input) {
    var source = toRecord(input);
    var stepFlowHostRuntime = toRecord(source.stepFlowHostRuntime);
    var stepViewHostRuntime = toRecord(source.stepViewHostRuntime);
    var applyHomeGuideStepFlow = asFunction(stepFlowHostRuntime.applyHomeGuideStepFlow);
    if (!applyHomeGuideStepFlow) {
      return {
        didAbort: true,
        didFinish: false,
        didAdvance: false,
        nextIndex: 0,
        didRender: false
      };
    }

    var flowResult = toRecord(
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

    var applyHomeGuideStepView = asFunction(stepViewHostRuntime.applyHomeGuideStepView);
    var didRender = false;
    if (applyHomeGuideStepView) {
      var viewResult = toRecord(
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
      didRender: didRender
    };
  }

  global.CoreHomeGuideStepHostRuntime = global.CoreHomeGuideStepHostRuntime || {};
  global.CoreHomeGuideStepHostRuntime.applyHomeGuideStep = applyHomeGuideStep;
})(typeof window !== "undefined" ? window : undefined);

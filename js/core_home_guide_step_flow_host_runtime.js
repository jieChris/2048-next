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

  function querySelector(documentLike, selector) {
    var query = asFunction(toRecord(documentLike).querySelector);
    if (!query) return null;
    return query.call(documentLike, selector);
  }

  function addClass(element, className) {
    var classList = toRecord(element).classList;
    var add = asFunction(toRecord(classList).add);
    if (!add) return;
    add.call(classList, className);
  }

  function applyHomeGuideStepFlow(input) {
    var source = toRecord(input);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var homeGuideState = toRecord(source.homeGuideState);
    var mobileViewportRuntime = toRecord(source.mobileViewportRuntime);

    var resolveHomeGuideStepIndexState = asFunction(homeGuideRuntime.resolveHomeGuideStepIndexState);
    var resolveHomeGuideFinishState = asFunction(homeGuideRuntime.resolveHomeGuideFinishState);
    var resolveHomeGuideStepTargetState = asFunction(homeGuideRuntime.resolveHomeGuideStepTargetState);
    var resolveHomeGuideTargetScrollState = asFunction(homeGuideRuntime.resolveHomeGuideTargetScrollState);
    var isViewportAtMost = asFunction(mobileViewportRuntime.isViewportAtMost);
    var isElementVisibleForGuide = asFunction(source.isElementVisibleForGuide);
    var clearHomeGuideHighlight = asFunction(source.clearHomeGuideHighlight);
    var elevateHomeGuideTarget = asFunction(source.elevateHomeGuideTarget);
    var finishHomeGuide = asFunction(source.finishHomeGuide);

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

    var steps = resolveSteps(homeGuideState.steps);
    var rawIndex = resolveNumber(source.index, 0);
    var stepIndexState = toRecord(
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
        var finishState = toRecord(
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

    var resolvedIndex = resolveNumber(stepIndexState.resolvedIndex, 0);
    homeGuideState.index = resolvedIndex;
    if (clearHomeGuideHighlight) {
      clearHomeGuideHighlight();
    }

    var step = steps[resolvedIndex];
    var stepRecord = toRecord(step);
    var selector = typeof stepRecord.selector === "string" ? stepRecord.selector : "";
    var target = selector ? querySelector(source.documentLike, selector) : null;
    var targetVisible = !!(target && isElementVisibleForGuide && isElementVisibleForGuide(target));

    var stepTargetState = toRecord(
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
        step: step
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
        step: step
      };
    }

    homeGuideState.target = target;

    var canScrollIntoView = !!asFunction(toRecord(target).scrollIntoView);
    var targetScrollState = toRecord(
      resolveHomeGuideTargetScrollState({
        isCompactViewport: isViewportAtMost
          ? !!isViewportAtMost({
              windowLike: source.windowLike,
              maxWidth: resolveNumber(source.mobileUiMaxWidth, 640)
            })
          : false,
        canScrollIntoView: canScrollIntoView
      })
    );
    var scrollIntoView = asFunction(toRecord(target).scrollIntoView);
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
      step: step
    };
  }

  global.CoreHomeGuideStepFlowHostRuntime = global.CoreHomeGuideStepFlowHostRuntime || {};
  global.CoreHomeGuideStepFlowHostRuntime.applyHomeGuideStepFlow = applyHomeGuideStepFlow;
})(typeof window !== "undefined" ? window : undefined);

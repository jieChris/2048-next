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

  function resolveText(value) {
    return value == null ? "" : String(value);
  }

  function resolveBoolean(value) {
    return !!value;
  }

  function getElementById(documentLike, id) {
    var getter = asFunction(toRecord(documentLike).getElementById);
    if (!getter) return null;
    return getter.call(documentLike, id);
  }

  function applyHomeGuideStepView(input) {
    var source = toRecord(input);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolveHomeGuideStepRenderState = asFunction(homeGuideRuntime.resolveHomeGuideStepRenderState);
    if (!resolveHomeGuideStepRenderState) {
      return {
        didRender: false,
        didSchedulePanel: false
      };
    }

    var stepRenderState = toRecord(
      resolveHomeGuideStepRenderState({
        step: source.step || null,
        stepIndex: source.stepIndex,
        stepCount: source.stepCount
      })
    );

    var stepEl = getElementById(source.documentLike, "home-guide-step");
    var titleEl = getElementById(source.documentLike, "home-guide-title");
    var descEl = getElementById(source.documentLike, "home-guide-desc");
    var prevBtn = getElementById(source.documentLike, "home-guide-prev");
    var nextBtn = getElementById(source.documentLike, "home-guide-next");

    if (stepEl) toRecord(stepEl).textContent = resolveText(stepRenderState.stepText);
    if (titleEl) toRecord(titleEl).textContent = resolveText(stepRenderState.titleText);
    if (descEl) toRecord(descEl).textContent = resolveText(stepRenderState.descText);
    if (prevBtn) toRecord(prevBtn).disabled = resolveBoolean(stepRenderState.prevDisabled);
    if (nextBtn) toRecord(nextBtn).textContent = resolveText(stepRenderState.nextText);

    var didSchedulePanel = false;
    var requestAnimationFrame = asFunction(toRecord(source.windowLike).requestAnimationFrame);
    var positionHomeGuidePanel = asFunction(source.positionHomeGuidePanel);
    if (requestAnimationFrame && positionHomeGuidePanel) {
      requestAnimationFrame(positionHomeGuidePanel);
      didSchedulePanel = true;
    }

    return {
      didRender: true,
      didSchedulePanel: didSchedulePanel
    };
  }

  global.CoreHomeGuideStepViewHostRuntime = global.CoreHomeGuideStepViewHostRuntime || {};
  global.CoreHomeGuideStepViewHostRuntime.applyHomeGuideStepView = applyHomeGuideStepView;
})(typeof window !== "undefined" ? window : undefined);

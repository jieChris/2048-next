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

  function getElementById(documentLike, id) {
    var getter = asFunction(toRecord(documentLike).getElementById);
    if (!getter) return null;
    return getter.call(documentLike, id);
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function bindStepControl(input) {
    var source = toRecord(input);
    var element = source.element;
    if (!element) return false;

    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolveHomeGuideBindingState = asFunction(homeGuideRuntime.resolveHomeGuideBindingState);
    var resolveHomeGuideControlAction = asFunction(homeGuideRuntime.resolveHomeGuideControlAction);
    var showHomeGuideStep = asFunction(source.showHomeGuideStep);
    if (!resolveHomeGuideBindingState || !resolveHomeGuideControlAction || !showHomeGuideStep) {
      return false;
    }

    var elementRecord = toRecord(element);
    var bindingState = toRecord(
      resolveHomeGuideBindingState({
        alreadyBound: resolveBoolean(elementRecord.__homeGuideBound)
      })
    );
    if (!bindingState.shouldBind) return false;

    elementRecord.__homeGuideBound = bindingState.boundValue;
    return bindListener(element, "click", function () {
      var actionState = toRecord(
        resolveHomeGuideControlAction({
          action: source.action,
          stepIndex: resolveNumber(toRecord(source.homeGuideState).index, 0)
        })
      );
      showHomeGuideStep(resolveNumber(actionState.nextStepIndex, 0));
    });
  }

  function bindSkipControl(input) {
    var source = toRecord(input);
    var element = source.element;
    if (!element) return false;

    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolveHomeGuideBindingState = asFunction(homeGuideRuntime.resolveHomeGuideBindingState);
    var resolveHomeGuideControlAction = asFunction(homeGuideRuntime.resolveHomeGuideControlAction);
    var resolveHomeGuideFinishState = asFunction(homeGuideRuntime.resolveHomeGuideFinishState);
    var finishHomeGuide = asFunction(source.finishHomeGuide);
    if (
      !resolveHomeGuideBindingState ||
      !resolveHomeGuideControlAction ||
      !resolveHomeGuideFinishState ||
      !finishHomeGuide
    ) {
      return false;
    }

    var elementRecord = toRecord(element);
    var bindingState = toRecord(
      resolveHomeGuideBindingState({
        alreadyBound: resolveBoolean(elementRecord.__homeGuideBound)
      })
    );
    if (!bindingState.shouldBind) return false;

    elementRecord.__homeGuideBound = bindingState.boundValue;
    return bindListener(element, "click", function () {
      var actionState = toRecord(
        resolveHomeGuideControlAction({
          action: "skip",
          stepIndex: resolveNumber(toRecord(source.homeGuideState).index, 0)
        })
      );
      var finishState = toRecord(
        resolveHomeGuideFinishState({
          reason: actionState.finishReason
        })
      );
      finishHomeGuide(resolveBoolean(finishState.markSeen), {
        showDoneNotice: resolveBoolean(finishState.showDoneNotice)
      });
      });
  }

  function bindEmergencyExitControls(input) {
    var source = toRecord(input);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolveHomeGuideControlAction = asFunction(homeGuideRuntime.resolveHomeGuideControlAction);
    var showHomeGuideStep = asFunction(source.showHomeGuideStep);
    var finishHomeGuide = asFunction(source.finishHomeGuide);
    if (!finishHomeGuide) return;

    var documentRecord = toRecord(source.documentLike);
    if (
      !resolveBoolean(documentRecord.__homeGuideEscapeBound) &&
      bindListener(source.documentLike, "keydown", function (eventLike) {
        var key = String(toRecord(eventLike).key || "");
        if (key !== "Escape" && key !== "Esc") return;
        if (!resolveBoolean(toRecord(source.homeGuideState).active)) return;
        finishHomeGuide(false, { showDoneNotice: false });
      })
    ) {
      documentRecord.__homeGuideEscapeBound = true;
    }

    var overlay = getElementById(source.documentLike, "home-guide-overlay");
    var overlayRecord = toRecord(overlay);
    if (
      !resolveBoolean(overlayRecord.__homeGuideOverlayDismissBound) &&
      bindListener(overlay, "click", function (eventLike) {
        var eventRecord = toRecord(eventLike);
        if (eventRecord.target !== overlay) return;
        if (!resolveBoolean(toRecord(source.homeGuideState).active)) return;
        if (!showHomeGuideStep || !resolveHomeGuideControlAction) {
          finishHomeGuide(false, { showDoneNotice: false });
          return;
        }
        var actionState = toRecord(
          resolveHomeGuideControlAction({
            action: "next",
            stepIndex: resolveNumber(toRecord(source.homeGuideState).index, 0)
          })
        );
        showHomeGuideStep(resolveNumber(actionState.nextStepIndex, 0));
      })
    ) {
      overlayRecord.__homeGuideOverlayDismissBound = true;
    }
  }

  function applyHomeGuideControls(input) {
    var source = toRecord(input);
    var showHomeGuideStep = asFunction(source.showHomeGuideStep);
    if (!showHomeGuideStep) {
      return {
        didBindControls: false,
        boundControlCount: 0,
        didKickoff: false,
        didSyncSettings: false
      };
    }

    var prevBtn = getElementById(source.documentLike, "home-guide-prev");
    var nextBtn = getElementById(source.documentLike, "home-guide-next");
    var skipBtn = getElementById(source.documentLike, "home-guide-skip");

    var boundControlCount = 0;
    if (
      bindStepControl({
        element: prevBtn,
        action: "prev",
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState: source.homeGuideState,
        showHomeGuideStep: showHomeGuideStep
      })
    ) {
      boundControlCount += 1;
    }
    if (
      bindStepControl({
        element: nextBtn,
        action: "next",
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState: source.homeGuideState,
        showHomeGuideStep: showHomeGuideStep
      })
    ) {
      boundControlCount += 1;
    }
    if (
      bindSkipControl({
        element: skipBtn,
        homeGuideRuntime: source.homeGuideRuntime,
        homeGuideState: source.homeGuideState,
        finishHomeGuide: source.finishHomeGuide
      })
    ) {
      boundControlCount += 1;
    }

    bindEmergencyExitControls({
      documentLike: source.documentLike,
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState: source.homeGuideState,
      showHomeGuideStep: showHomeGuideStep,
      finishHomeGuide: source.finishHomeGuide
    });

    showHomeGuideStep(0);

    var didSyncSettings = false;
    var syncHomeGuideSettingsUI = asFunction(source.syncHomeGuideSettingsUI);
    if (syncHomeGuideSettingsUI) {
      syncHomeGuideSettingsUI();
      didSyncSettings = true;
    }

    return {
      didBindControls: boundControlCount > 0,
      boundControlCount: boundControlCount,
      didKickoff: true,
      didSyncSettings: didSyncSettings
    };
  }

  global.CoreHomeGuideControlsHostRuntime = global.CoreHomeGuideControlsHostRuntime || {};
  global.CoreHomeGuideControlsHostRuntime.applyHomeGuideControls = applyHomeGuideControls;
})(typeof window !== "undefined" ? window : undefined);

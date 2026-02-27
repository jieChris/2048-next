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

  function toNumber(value, fallback) {
    return typeof value === "number" && isFinite(value) ? value : fallback;
  }

  function createMobileViewportPageResolvers(input) {
    var source = toRecord(input);
    var runtime = toRecord(source.mobileViewportRuntime);
    var bodyLike = source.bodyLike || null;
    var windowLike = source.windowLike || null;
    var navigatorLike = source.navigatorLike || null;
    var mobileUiMaxWidth = toNumber(source.mobileUiMaxWidth, 0);
    var compactGameViewportMaxWidth = toNumber(source.compactGameViewportMaxWidth, 0);
    var timerboxCollapseMaxWidth = toNumber(source.timerboxCollapseMaxWidth, 0);

    var resolveIsGamePageScope = asFunction(runtime.isGamePageScope);
    var resolveIsTimerboxMobileScope = asFunction(runtime.isTimerboxMobileScope);
    var resolveIsPracticePageScope = asFunction(runtime.isPracticePageScope);
    var resolveIsMobileGameViewport = asFunction(runtime.isMobileGameViewport);
    var resolveIsCompactGameViewport = asFunction(runtime.isCompactGameViewport);
    var resolveIsTimerboxCollapseViewport = asFunction(runtime.isTimerboxCollapseViewport);

    return {
      isGamePageScope: function () {
        if (!resolveIsGamePageScope) return false;
        return !!resolveIsGamePageScope({ bodyLike: bodyLike });
      },
      isTimerboxMobileScope: function () {
        if (!resolveIsTimerboxMobileScope) return false;
        return !!resolveIsTimerboxMobileScope({ bodyLike: bodyLike });
      },
      isPracticePageScope: function () {
        if (!resolveIsPracticePageScope) return false;
        return !!resolveIsPracticePageScope({ bodyLike: bodyLike });
      },
      isMobileGameViewport: function () {
        if (!resolveIsMobileGameViewport) return false;
        return !!resolveIsMobileGameViewport({
          windowLike: windowLike,
          navigatorLike: navigatorLike,
          maxWidth: mobileUiMaxWidth
        });
      },
      isCompactGameViewport: function () {
        if (!resolveIsCompactGameViewport) return false;
        return !!resolveIsCompactGameViewport({
          windowLike: windowLike,
          maxWidth: compactGameViewportMaxWidth
        });
      },
      isTimerboxCollapseViewport: function () {
        if (!resolveIsTimerboxCollapseViewport) return false;
        return !!resolveIsTimerboxCollapseViewport({
          windowLike: windowLike,
          maxWidth: timerboxCollapseMaxWidth
        });
      }
    };
  }

  global.CoreMobileViewportPageHostRuntime = global.CoreMobileViewportPageHostRuntime || {};
  global.CoreMobileViewportPageHostRuntime.createMobileViewportPageResolvers =
    createMobileViewportPageResolvers;
})(typeof window !== "undefined" ? window : undefined);

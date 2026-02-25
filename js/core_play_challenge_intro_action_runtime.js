(function (global) {
  "use strict";

  if (!global) return;

  function resolvePlayChallengeIntroActionState(options) {
    var opts = options || {};
    var action = String(opts.action || "");

    if (action === "open") {
      return {
        shouldPreventDefault: true,
        shouldApplyDisplay: true,
        nextModalDisplay: "flex"
      };
    }

    if (action === "close") {
      return {
        shouldPreventDefault: true,
        shouldApplyDisplay: true,
        nextModalDisplay: "none"
      };
    }

    if (action === "overlay-click") {
      return {
        shouldPreventDefault: false,
        shouldApplyDisplay: !!opts.eventTargetIsModal,
        nextModalDisplay: "none"
      };
    }

    return {
      shouldPreventDefault: false,
      shouldApplyDisplay: false,
      nextModalDisplay: "none"
    };
  }

  global.CorePlayChallengeIntroActionRuntime =
    global.CorePlayChallengeIntroActionRuntime || {};
  global.CorePlayChallengeIntroActionRuntime.resolvePlayChallengeIntroActionState =
    resolvePlayChallengeIntroActionState;
})(typeof window !== "undefined" ? window : undefined);

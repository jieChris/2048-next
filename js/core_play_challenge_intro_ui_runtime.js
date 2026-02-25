(function (global) {
  "use strict";

  if (!global) return;

  function resolvePlayChallengeIntroUiState(options) {
    var opts = options || {};
    var model = opts.introModel || {};
    var bindEvents = !!model.bindEvents;

    return {
      entryDisplay: model.entryDisplay === "inline-flex" ? "inline-flex" : "none",
      modalDisplay: model.modalDisplay === "flex" ? "flex" : "none",
      titleText: String(model.title || ""),
      descriptionText: String(model.description || ""),
      leaderboardText: String(model.leaderboardText || ""),
      bindIntroClick: bindEvents && !opts.introButtonBound,
      bindCloseClick: bindEvents && !opts.closeButtonBound,
      bindOverlayClick: bindEvents && !opts.modalBound
    };
  }

  global.CorePlayChallengeIntroUiRuntime = global.CorePlayChallengeIntroUiRuntime || {};
  global.CorePlayChallengeIntroUiRuntime.resolvePlayChallengeIntroUiState =
    resolvePlayChallengeIntroUiState;
})(typeof window !== "undefined" ? window : undefined);

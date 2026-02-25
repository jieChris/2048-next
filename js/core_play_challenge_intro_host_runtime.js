(function (global) {
  "use strict";

  if (!global) return;

  function applyDisplay(target, displayValue, useImportant) {
    var style = target && target.style ? target.style : null;
    if (!style) return;
    if (useImportant && typeof style.setProperty === "function") {
      style.setProperty("display", displayValue, "important");
      return;
    }
    style.display = displayValue;
  }

  function resolvePlayChallengeIntroFromContext(options) {
    var opts = options || {};
    var documentLike = opts.documentLike || null;
    if (!documentLike || typeof documentLike.getElementById !== "function") {
      return {
        applied: false,
        hasRequiredElements: false,
        bindIntroClick: false,
        bindCloseClick: false,
        bindOverlayClick: false
      };
    }

    var introBtn = documentLike.getElementById("top-mode-intro-btn");
    var modal = documentLike.getElementById("mode-intro-modal");
    var closeBtn = documentLike.getElementById("mode-intro-close-btn");
    var title = documentLike.getElementById("mode-intro-title");
    var desc = documentLike.getElementById("mode-intro-desc");
    var leaderboard = documentLike.getElementById("mode-intro-leaderboard");
    if (!introBtn || !modal || !closeBtn || !title || !desc) {
      return {
        applied: false,
        hasRequiredElements: false,
        bindIntroClick: false,
        bindCloseClick: false,
        bindOverlayClick: false
      };
    }

    var modeKey = opts.modeConfig && opts.modeConfig.key ? String(opts.modeConfig.key) : "";
    var introModel = opts.resolveIntroModel({
      modeKey: modeKey,
      featureEnabled: !!opts.featureEnabled
    });
    var introUiState = opts.resolveIntroUiState({
      introModel: introModel,
      introButtonBound: !!introBtn.__modeIntroBound,
      closeButtonBound: !!closeBtn.__modeIntroBound,
      modalBound: !!modal.__modeIntroBound
    });

    applyDisplay(introBtn, introUiState.entryDisplay, true);
    applyDisplay(modal, introUiState.modalDisplay, false);
    title.textContent = introUiState.titleText;
    desc.textContent = introUiState.descriptionText;
    if (leaderboard) leaderboard.textContent = introUiState.leaderboardText;

    var openActionState = opts.resolveIntroActionState({
      action: "open"
    });
    var closeActionState = opts.resolveIntroActionState({
      action: "close"
    });

    if (introUiState.bindIntroClick && typeof introBtn.addEventListener === "function") {
      introBtn.__modeIntroBound = true;
      introBtn.addEventListener("click", function (event) {
        if (
          event &&
          openActionState.shouldPreventDefault &&
          typeof event.preventDefault === "function"
        ) {
          event.preventDefault();
        }
        if (openActionState.shouldApplyDisplay) {
          applyDisplay(modal, openActionState.nextModalDisplay, false);
        }
      });
    }

    if (introUiState.bindCloseClick && typeof closeBtn.addEventListener === "function") {
      closeBtn.__modeIntroBound = true;
      closeBtn.addEventListener("click", function (event) {
        if (
          event &&
          closeActionState.shouldPreventDefault &&
          typeof event.preventDefault === "function"
        ) {
          event.preventDefault();
        }
        if (closeActionState.shouldApplyDisplay) {
          applyDisplay(modal, closeActionState.nextModalDisplay, false);
        }
      });
    }

    if (introUiState.bindOverlayClick && typeof modal.addEventListener === "function") {
      modal.__modeIntroBound = true;
      modal.addEventListener("click", function (event) {
        var overlayActionState = opts.resolveIntroActionState({
          action: "overlay-click",
          eventTargetIsModal: !!(event && event.target === modal)
        });
        if (overlayActionState.shouldApplyDisplay) {
          applyDisplay(modal, overlayActionState.nextModalDisplay, false);
        }
      });
    }

    return {
      applied: true,
      hasRequiredElements: true,
      bindIntroClick: !!introUiState.bindIntroClick,
      bindCloseClick: !!introUiState.bindCloseClick,
      bindOverlayClick: !!introUiState.bindOverlayClick
    };
  }

  global.CorePlayChallengeIntroHostRuntime =
    global.CorePlayChallengeIntroHostRuntime || {};
  global.CorePlayChallengeIntroHostRuntime.resolvePlayChallengeIntroFromContext =
    resolvePlayChallengeIntroFromContext;
})(typeof window !== "undefined" ? window : undefined);

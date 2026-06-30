(function (global) {
  "use strict";

  if (!global) return;

  var HIDDEN_CLASS_NAME = "is-hidden";

  function hasClassName(target, className) {
    if (target && target.classList && typeof target.classList.contains === "function") {
      return target.classList.contains(className);
    }
    var current = target && typeof target.className === "string" ? target.className : "";
    return (" " + current + " ").indexOf(" " + className + " ") >= 0;
  }

  function addClassName(target, className) {
    if (target && target.classList && typeof target.classList.add === "function") {
      target.classList.add(className);
      return true;
    }
    if (!target || typeof target.className !== "string") return false;
    if (hasClassName(target, className)) return true;
    var current = target.className.trim();
    target.className = current ? current + " " + className : className;
    return true;
  }

  function removeClassName(target, className) {
    if (target && target.classList && typeof target.classList.remove === "function") {
      target.classList.remove(className);
      return true;
    }
    if (!target || typeof target.className !== "string") return false;
    if (!hasClassName(target, className)) return true;
    target.className = target.className
      .split(/\s+/)
      .filter(function (name) {
        return name && name !== className;
      })
      .join(" ");
    return true;
  }

  function applyDisplay(target, displayValue) {
    var hidden = displayValue === "none";
    var didUpdateClass = hidden
      ? addClassName(target, HIDDEN_CLASS_NAME)
      : removeClassName(target, HIDDEN_CLASS_NAME);
    var style = target && target.style ? target.style : null;
    if (didUpdateClass) {
      if (style && !hidden && style.display === "none") {
        style.display = "";
      }
      return;
    }
    if (!style) return;
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

    applyDisplay(introBtn, introUiState.entryDisplay);
    applyDisplay(modal, introUiState.modalDisplay);
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
          applyDisplay(modal, openActionState.nextModalDisplay);
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
          applyDisplay(modal, closeActionState.nextModalDisplay);
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
          applyDisplay(modal, overlayActionState.nextModalDisplay);
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

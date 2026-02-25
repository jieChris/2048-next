(function (global) {
  "use strict";

  if (!global) return;

  function resolvePlayHeaderFromContext(options) {
    var opts = options || {};
    var documentLike = opts.documentLike || null;
    if (!documentLike || typeof documentLike.getElementById !== "function") {
      return {
        applied: false,
        hasBody: false,
        hasTitle: false,
        hasIntro: false,
        challengeIntroApplied: false
      };
    }

    var body = documentLike.body || null;
    var title = documentLike.getElementById("play-mode-title");
    var intro = documentLike.getElementById("play-mode-intro");
    var headerState = opts.resolveHeaderState(opts.modeConfig || null);

    if (body && typeof body.setAttribute === "function") {
      body.setAttribute("data-mode-id", String(headerState.bodyModeId || ""));
      body.setAttribute("data-ruleset", String(headerState.bodyRuleset || ""));
    }

    if (title) {
      title.textContent = String(headerState.titleText || "");
      if (title.style) {
        title.style.display = String(headerState.titleDisplay || "");
      }
    }

    if (intro) {
      intro.textContent = String(headerState.introText || "");
      if (intro.style) {
        intro.style.display = String(headerState.introDisplay || "");
      }
    }

    var challengeIntroApplied = false;
    if (typeof opts.applyChallengeModeIntro === "function") {
      opts.applyChallengeModeIntro(opts.modeConfig || null);
      challengeIntroApplied = true;
    }

    return {
      applied: true,
      hasBody: !!(body && typeof body.setAttribute === "function"),
      hasTitle: !!title,
      hasIntro: !!intro,
      challengeIntroApplied: challengeIntroApplied
    };
  }

  global.CorePlayHeaderHostRuntime = global.CorePlayHeaderHostRuntime || {};
  global.CorePlayHeaderHostRuntime.resolvePlayHeaderFromContext = resolvePlayHeaderFromContext;
})(typeof window !== "undefined" ? window : undefined);
